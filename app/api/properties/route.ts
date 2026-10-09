import { allProperties, jsonError, orderProperties } from '@/lib/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(
      { properties: orderProperties(await allProperties()) },
      {
        headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
      },
    );
  } catch (error) {
    console.error('Properties unavailable', error);
    return jsonError('The property collection is temporarily unavailable. Please try again.', 503);
  }
}
