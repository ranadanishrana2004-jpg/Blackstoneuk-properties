import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { query, queryOne } from '@/lib/db';
import { requestPasswordReset, completePasswordReset } from '@/lib/password-reset';
import { authenticate, createSession, sha256 } from '@/lib/server';
import { hashPassword } from '@/lib/password';
import { POST } from '@/app/api/team/password-reset/route';
const tasks = vi.hoisted(() => ({ jobs: [] as Array<() => Promise<void>> }));
vi.mock('next/server', () => ({ after: (job: () => Promise<void>) => tasks.jobs.push(job) }));
const delivery = vi.fn();
let latest = '';
beforeEach(async () => {
  process.env.BREVO_API_KEY = 'mock-only';
  process.env.SITE_URL = 'https://www.bsukproperties.com';
  await query('DELETE FROM password_resets');
  await query('DELETE FROM rate_limits');
  await query('UPDATE users SET password_hash=$1 WHERE email=$2', [
    await hashPassword('OriginalPass12345'),
    'owner@example.com',
  ]);
  tasks.jobs = [];
  latest = '';
  delivery.mockReset();
  delivery.mockImplementation(async (_url, options) => {
    latest = JSON.parse(options.body).textContent;
    return new Response('{}', { status: 201 });
  });
  vi.stubGlobal('fetch', delivery);
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.BREVO_API_KEY;
  delete process.env.SITE_URL;
});
const token = () => latest.match(/#token=([a-f0-9]{64})/)![1];
const req = (body: unknown, origin = 'https://www.bsukproperties.com') =>
  new Request('https://www.bsukproperties.com/api/team/password-reset', {
    method: 'POST',
    headers: {
      origin,
      host: 'www.bsukproperties.com',
      'content-type': 'application/json',
      'x-forwarded-for': '192.0.2.25',
    },
    body: JSON.stringify(body),
  });
it('uses hashed single-use expiring tokens and revokes sessions atomically', async () => {
  await requestPasswordReset('owner@example.com');
  const raw = token();
  const row = await queryOne<{ user_id: string; token_hash: string; expires_at: number }>(
    'SELECT * FROM password_resets',
  );
  expect(row?.token_hash).toBe(sha256(raw));
  expect(row?.expires_at).toBeGreaterThan(Date.now());
  await createSession(row!.user_id);
  const results = await Promise.all([
    completePasswordReset(raw, 'NewPassword12345'),
    completePasswordReset(raw, 'NewPassword12345'),
  ]);
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(await authenticate('owner@example.com', 'NewPassword12345')).not.toBeNull();
  expect(await authenticate('owner@example.com', 'OriginalPass12345')).toBeNull();
  expect(await query('SELECT * FROM sessions WHERE user_id=$1', [row!.user_id])).toHaveLength(0);
});
it('rejects expired, superseded and password-change-invalidated links', async () => {
  await requestPasswordReset('owner@example.com');
  const old = token();
  await requestPasswordReset('owner@example.com');
  expect(await completePasswordReset(old, 'NewPassword12345')).toBe(false);
  await query('UPDATE password_resets SET expires_at=0');
  expect(await completePasswordReset(token(), 'NewPassword12345')).toBe(false);
  await requestPasswordReset('owner@example.com');
  await query('UPDATE users SET password_hash=$1 WHERE email=$2', [
    await hashPassword('ChangedElsewhere123'),
    'owner@example.com',
  ]);
  expect(await completePasswordReset(token(), 'NewPassword12345')).toBe(false);
});
it('invalidates undelivered links and never emails unknown users', async () => {
  await requestPasswordReset('absent@example.com');
  expect(delivery).not.toHaveBeenCalled();
  delivery.mockResolvedValueOnce(new Response('{}', { status: 503 }));
  await requestPasswordReset('owner@example.com');
  expect(await query('SELECT * FROM password_resets')).toHaveLength(0);
});
it('returns identical responses, rejects foreign origins and throttles requests', async () => {
  const known = await POST(req({ action: 'request', email: 'owner@example.com' }));
  const unknown = await POST(req({ action: 'request', email: 'absent@example.com' }));
  expect(await known.json()).toEqual(await unknown.json());
  expect(delivery).not.toHaveBeenCalled();
  for (const job of tasks.jobs) await job();
  expect(delivery).toHaveBeenCalledTimes(1);
  expect(
    (await POST(req({ action: 'request', email: 'owner@example.com' }, 'https://evil.example')))
      .status,
  ).toBe(403);
  expect(
    (await POST(req({ action: 'complete', token: 'bad', password: 'NewPassword12345' }))).status,
  ).toBe(400);
  for (let i = 0; i < 8; i++) await POST(req({ action: 'request', email: 'owner@example.com' }));
  expect((await POST(req({ action: 'request', email: 'owner@example.com' }))).status).toBe(429);
});
it('validates password strength before consuming a valid token', async () => {
  await requestPasswordReset('owner@example.com');
  const raw = token();
  expect((await POST(req({ action: 'complete', token: raw, password: 'weak' }))).status).toBe(400);
  expect(
    (await POST(req({ action: 'complete', token: raw, password: 'ValidPassword123' }))).status,
  ).toBe(200);
  expect(
    (await POST(req({ action: 'complete', token: raw, password: 'ValidPassword123' }))).status,
  ).toBe(400);
});
