import { after } from 'next/server';
import { z } from 'zod';
import { sameOrigin, jsonError, rateLimit, sha256 } from '@/lib/server';
import { queryOne } from '@/lib/db';
import { passwordSchema } from '@/lib/validation';
import { requestPasswordReset, completePasswordReset } from '@/lib/password-reset';
const accepted = () =>
  Response.json(
    {
      message:
        'If an account exists for this email, a reset link will arrive shortly. Check your inbox and spam folder.',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError('Request origin not allowed.', 403);
  try {
    if (!(await rateLimit(request, 'password-recovery', 10)))
      return jsonError('Too many requests. Please try again in 15 minutes.', 429);
    const raw = await request.text();
    if (raw.length > 2000) return jsonError('Invalid request.');
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return jsonError('Invalid request.');
    }
    if (body?.action === 'request') {
      const email = z.string().trim().toLowerCase().email().max(200).safeParse(body.email);
      if (!email.success) return jsonError('Enter a valid email address.');
      if (!process.env.BREVO_API_KEY)
        return jsonError(
          'Password recovery email is temporarily unavailable. Please contact your team owner.',
          503,
        );
      const key = sha256('recovery-email:' + email.data + ':' + Math.floor(Date.now() / 900000));
      const limit = await queryOne<{ count: number }>(
        `INSERT INTO rate_limits(key,count,expires_at) VALUES($1,1,$2)
        ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 RETURNING count`,
        [key, Date.now() + 900000],
      );
      if (limit && limit.count <= 3)
        after(async () => {
          try {
            await requestPasswordReset(email.data);
          } catch {
            console.error('Password recovery could not be completed.');
          }
        });
      return accepted();
    }
    if (body?.action === 'complete') {
      if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token))
        return jsonError('This reset link is invalid or expired. Request a new one.');
      const password = passwordSchema.safeParse(body.password);
      if (!password.success) return jsonError(password.error.issues[0].message);
      if (!(await completePasswordReset(body.token, password.data)))
        return jsonError('This reset link is invalid or expired. Request a new one.');
      return Response.json(
        { message: 'Password updated. Sign in with your new password.' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return jsonError('Invalid request.');
  } catch {
    return jsonError('Password recovery is temporarily unavailable. Please try again.', 503);
  }
}
