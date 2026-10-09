import { toCsv } from '@/lib/csv';
import { query } from '@/lib/db';
import { audit, jsonError, requireUser } from '@/lib/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireUser(request);
  if ('response' in guard) return guard.response;
  try {
    const rows = await query<Record<string, string | number>>(
      'SELECT * FROM enquiries ORDER BY created_at DESC',
    );
    const csv = toCsv(
      [
        'Reference',
        'Received',
        'Type',
        'Name',
        'Email',
        'Phone',
        'Postcode',
        'Property',
        'Status',
        'Notes',
        'Message',
      ],
      rows.map((e) => [
        'BSUK-' + String(e.id).slice(0, 8).toUpperCase(),
        new Date(Number(e.created_at)).toISOString(),
        e.kind,
        e.name,
        e.email,
        e.phone,
        e.postcode,
        e.property_id,
        e.status,
        e.notes,
        e.message,
      ]),
    );
    await audit(guard.user.email, 'export-enquiries', `${rows.length} rows`);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="bsuk-enquiries-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Export failed', error);
    return jsonError('The export is temporarily unavailable.', 503);
  }
}
