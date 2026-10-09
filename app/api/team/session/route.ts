import {
  audit,
  authenticate,
  clientIp,
  createSession,
  destroySession,
  getUser,
  isRateLimited,
  jsonError,
  recordFailure,
  sameOrigin,
  sessionCookie,
} from '@/lib/server';
import { queryOne } from '@/lib/db';

const MAX_FAILURES = 8;

export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    const anyUser = user ? true : !!(await queryOne('SELECT 1 AS present FROM users LIMIT 1'));
    return Response.json(
      { authenticated: !!user, user, configured: anyUser },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Session check failed', error);
    return jsonError('Team access is temporarily unavailable.', 503);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError('Request origin not allowed.', 403);
  try {
    const raw = await request.text();
    if (raw.length > 1000) return jsonError('Invalid request.');
    let body: { email?: unknown; password?: unknown };
    try {
      body = JSON.parse(raw);
    } catch {
      return jsonError('Invalid request.');
    }
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      return jsonError('Enter your email and password.');
    }

    const ip = clientIp(request);
    const subject = `${ip}|${body.email.trim().toLowerCase()}`;
    if (
      (await isRateLimited('login', ip, MAX_FAILURES * 3)) ||
      (await isRateLimited('login', subject, MAX_FAILURES))
    ) {
      return jsonError('Too many attempts. Please wait 15 minutes before trying again.', 429);
    }

    const user = await authenticate(body.email, body.password);
    if (!user) {
      await recordFailure('login', ip);
      await recordFailure('login', subject);
      return jsonError('Email or password not recognised.', 401);
    }

    const token = await createSession(user.id);
    await audit(user.email, 'sign-in');
    return Response.json(
      { authenticated: true, user },
      { headers: { 'Set-Cookie': sessionCookie(request, token), 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Sign-in failed', error);
    return jsonError('Sign-in is temporarily unavailable.', 503);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return jsonError('Request origin not allowed.', 403);
  try {
    const user = await getUser(request);
    await destroySession(request);
    if (user) await audit(user.email, 'sign-out');
  } catch (error) {
    console.error('Sign-out failed', error);
  }
  return Response.json(
    { authenticated: false },
    { headers: { 'Set-Cookie': sessionCookie(request, '', 0), 'Cache-Control': 'no-store' } },
  );
}
