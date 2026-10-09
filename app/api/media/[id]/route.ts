import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) return new Response('Not found', { status: 404 });
  try {
    const row = await queryOne<{ content_type: string; data: Uint8Array }>(
      'SELECT content_type, data FROM media WHERE id = $1',
      [id],
    );
    if (!row) return new Response('Not found', { status: 404 });
    return new Response(new Uint8Array(row.data), {
      headers: {
        'Content-Type': row.content_type,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Media unavailable', error);
    return new Response('Unavailable', { status: 503 });
  }
}
