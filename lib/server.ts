/**
 * Server-only helpers: request guards, rate limiting, sessions, audit log, property access.
 */
import { createHash, randomBytes } from 'node:crypto';
import { query, queryOne } from './db';
import { verifyPassword } from './password';
import type { Property } from './properties';

export const SESSION_COOKIE = 'bsuk_session';
const SESSION_HOURS = 8;

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export function jsonError(message: string, status = 400, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return request.headers.get('cf-connecting-ip') || forwarded || 'unknown';
}

/** Behind Render's proxy the request URL may be internal, so compare against the Host header. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const allowed = new Set<string>();
    if (host) allowed.add(host);
    if (process.env.SITE_URL) allowed.add(new URL(process.env.SITE_URL).host);
    return allowed.has(new URL(origin).host);
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- rate limiting */

const WINDOW_MS = 15 * 60 * 1000;

async function rateKey(scope: string, subject: string) {
  return sha256(`${scope}:${subject}:${Math.floor(Date.now() / WINDOW_MS)}`);
}

/** Counts this attempt and returns true while the caller is still within the limit. */
export async function rateLimit(request: Request, scope: string, max: number): Promise<boolean> {
  const key = await rateKey(scope, clientIp(request));
  const row = await queryOne<{ count: number }>(
    `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, 1, $2)
     ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1
     RETURNING count`,
    [key, Date.now() + WINDOW_MS],
  );
  if (Math.random() < 0.02)
    await query('DELETE FROM rate_limits WHERE expires_at < $1', [Date.now()]);
  return !!row && row.count <= max;
}

/** Read-only check used for logins, where only failed attempts are counted. */
export async function isRateLimited(scope: string, subject: string, max: number) {
  const row = await queryOne<{ count: number }>('SELECT count FROM rate_limits WHERE key = $1', [
    await rateKey(scope, subject),
  ]);
  return !!row && row.count >= max;
}

export async function recordFailure(scope: string, subject: string) {
  await query(
    `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, 1, $2)
     ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1`,
    [await rateKey(scope, subject), Date.now() + WINDOW_MS],
  );
}

/* ---------------------------------------------------------------- sessions */

export type SessionUser = { id: string; email: string; name: string; role: 'owner' | 'staff' };

function readCookie(request: Request, name: string): string | undefined {
  return request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(name + '='))
    ?.slice(name.length + 1);
}

function isHttps(request: Request): boolean {
  const proto = request.headers.get('x-forwarded-proto');
  return proto
    ? proto.split(',')[0].trim() === 'https'
    : new URL(request.url).protocol === 'https:';
}

export function sessionCookie(
  request: Request,
  token: string,
  maxAgeSeconds = SESSION_HOURS * 3600,
) {
  return [
    `${SESSION_COOKIE}=${token}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    isHttps(request) ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
  const user = await queryOne<{
    id: string;
    email: string;
    name: string;
    role: 'owner' | 'staff';
    password_hash: string;
  }>('SELECT id, email, name, role, password_hash FROM users WHERE email = $1', [
    email.trim().toLowerCase(),
  ]);
  // Verify against a dummy hash when the user does not exist so timing does not reveal accounts.
  const stored =
    user?.password_hash ?? 'scrypt$00000000000000000000000000000000$' + '00'.repeat(64);
  const ok = await verifyPassword(password, stored);
  if (!user || !ok) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  await query(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES ($1,$2,$3,$4)',
    [sha256(token), userId, now, now + SESSION_HOURS * 3600 * 1000],
  );
  if (Math.random() < 0.05) await query('DELETE FROM sessions WHERE expires_at < $1', [now]);
  return token;
}

export async function getUser(request: Request): Promise<SessionUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return queryOne<SessionUser>(
    `SELECT u.id, u.email, u.name, u.role FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > $2`,
    [sha256(token), Date.now()],
  );
}

export async function destroySession(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
}

export async function changePasswordAndRevokeSessions(
  request: Request,
  userId: string,
  hash: string,
) {
  const token = readCookie(request, SESSION_COOKIE);
  await query(
    `WITH changed AS (UPDATE users SET password_hash=$3 WHERE id=$1 RETURNING id)
    DELETE FROM sessions WHERE user_id IN (SELECT id FROM changed) AND token_hash <> $2`,
    [userId, token ? sha256(token) : '', hash],
  );
}

/** Guard for team endpoints. Mutating requests must also come from this site. */
export async function requireUser(
  request: Request,
  options: { mutating?: boolean; owner?: boolean } = {},
): Promise<{ user: SessionUser } | { response: Response }> {
  if (options.mutating && !sameOrigin(request)) {
    return { response: jsonError('Request origin not allowed.', 403) };
  }
  const user = await getUser(request);
  if (!user) return { response: jsonError('Sign in to continue.', 401) };
  if (options.owner && user.role !== 'owner') {
    return { response: jsonError('Only an owner can do that.', 403) };
  }
  return { user };
}

export async function audit(actor: string, action: string, detail = '') {
  await query('INSERT INTO audit_log (at, actor, action, detail) VALUES ($1,$2,$3,$4)', [
    Date.now(),
    actor,
    action,
    detail.slice(0, 500),
  ]);
}

/* ---------------------------------------------------------------- properties */

function parseProperty(raw: string): Property | null {
  try {
    return JSON.parse(raw) as Property;
  } catch {
    return null;
  }
}

export async function allProperties(includeArchived = false): Promise<Property[]> {
  const rows = await query<{ data: string }>('SELECT data FROM listings ORDER BY updated_at DESC');
  const items = rows.map((row) => parseProperty(row.data)).filter((p): p is Property => !!p);
  return includeArchived ? items : items.filter((p) => p.status !== 'archived');
}

export async function propertyBySlug(slug: string): Promise<Property | null> {
  const rows = await query<{ data: string }>('SELECT data FROM listings WHERE slug = $1', [slug]);
  const property = rows[0] ? parseProperty(rows[0].data) : null;
  return property && property.status !== 'archived' ? property : null;
}

/** Featured first, then newest. Keeps the order stable for the catalogue and the home page. */
export function orderProperties(items: Property[]): Property[] {
  return [...items].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
}
