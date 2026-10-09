import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Used by Render's health check: confirms the app is up and can reach the database. */
export async function GET() {
  try {
    await queryOne('SELECT 1 AS ok');
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'database-unavailable' }, { status: 503 });
  }
}
