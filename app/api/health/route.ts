import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Render's health check. By default it only proves the web process is up, so a database outage
 * (or a serverless database that is asleep) can never make Render restart a healthy app.
 * Use /api/health?db=1 for a manual end-to-end check including the database.
 */
export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get('db') !== '1') {
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    await queryOne('SELECT 1 AS ok');
    return Response.json(
      { status: 'ok', database: 'ok' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ status: 'ok', database: 'unavailable' }, { status: 503 });
  }
}
