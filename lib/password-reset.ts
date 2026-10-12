import { randomBytes } from 'node:crypto';
import { query, queryOne } from './db';
import { sha256 } from './server';
import { hashPassword } from './password';
import { sendMail, escapeHtml } from './mail';
import { siteUrl, COMPANY_NAME, contactEmail } from './site';

export async function requestPasswordReset(email: string) {
  const user = await queryOne<{ id: string; email: string; password_hash: string }>(
    'SELECT id,email,password_hash FROM users WHERE email=$1',
    [email],
  );
  if (!user) return;
  const token = randomBytes(32).toString('hex');
  await query(
    `INSERT INTO password_resets (user_id,token_hash,password_hash,expires_at)
    VALUES ($1,$2,$3,$4) ON CONFLICT (user_id) DO UPDATE SET
    token_hash=EXCLUDED.token_hash,password_hash=EXCLUDED.password_hash,expires_at=EXCLUDED.expires_at`,
    [user.id, sha256(token), user.password_hash, Date.now() + 30 * 60 * 1000],
  );
  // A fragment keeps the bearer token out of server access logs and referrers.
  const url = siteUrl() + '/manage/reset-password#token=' + token;
  const result = await sendMail({
    to: { email: user.email },
    subject: 'Reset your Blackstone team password',
    replyTo: { email: contactEmail(), name: COMPANY_NAME },
    text: `Reset your team password: ${url}\nThis single-use link expires in 30 minutes. If you did not request it, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;background:#faf5f8;color:#35232f;padding:32px"><h1 style="font:28px Georgia">Reset your password</h1><p>Use the button below to set a new password for your Blackstone team account.</p><p><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 22px;background:#96365f;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p><p>This single-use link expires in 30 minutes. If you did not request it, you can safely ignore this email.</p><p>${COMPANY_NAME}</p></div>`,
  });
  if (result !== 'sent') {
    await query('DELETE FROM password_resets WHERE token_hash=$1', [sha256(token)]);
    console.error('Password recovery email was not accepted by mail provider.');
  }
}

export async function completePasswordReset(token: string, password: string) {
  const hash = await hashPassword(password);
  // Consume, change, revoke every session and audit in one atomic statement.
  const result = await queryOne<{ id: string }>(
    `WITH consumed AS (
    DELETE FROM password_resets WHERE token_hash=$1 AND expires_at>$2 RETURNING *
  ), changed AS (
    UPDATE users u SET password_hash=$3 FROM consumed r
    WHERE u.id=r.user_id AND u.password_hash=r.password_hash RETURNING u.id,u.email
  ), revoked AS (DELETE FROM sessions WHERE user_id IN (SELECT id FROM changed)),
  logged AS (INSERT INTO audit_log(at,actor,action,detail)
    SELECT $2,email,'password-reset','All sessions revoked' FROM changed)
  SELECT id FROM changed`,
    [sha256(token), Date.now(), hash],
  );
  return !!result;
}
