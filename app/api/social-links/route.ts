import { query, queryOne } from '@/lib/db';
import { requireUser, jsonError, audit } from '@/lib/server';
import { socialLinksSchema, emptySocialLinks } from '@/lib/social-links';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const row = await queryOne<{ value: string }>('SELECT value FROM meta WHERE key=$1', [
      'social-links',
    ]);
    const data = socialLinksSchema.safeParse(row ? JSON.parse(row.value) : emptySocialLinks);
    return Response.json(data.success ? data.data : emptySocialLinks, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return jsonError('Social settings unavailable.', 503);
  }
}
export async function POST(request: Request) {
  const guard = await requireUser(request, { mutating: true, owner: true });
  if ('response' in guard) return guard.response;
  try {
    const raw = await request.text();
    if (raw.length > 2000) return jsonError('Request too large.', 413);
    const parsed = socialLinksSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return jsonError('Use valid Facebook and Instagram HTTPS profile links.');
    await query(
      'INSERT INTO meta(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',
      ['social-links', JSON.stringify(parsed.data)],
    );
    await audit(guard.user.email, 'social-links-updated');
    return Response.json({ saved: true });
  } catch {
    return jsonError('Unable to save social links. Please try again.', 503);
  }
}
