import { query } from '@/lib/db';
import { audit, jsonError, requireUser } from '@/lib/server';

const MAX_BYTES = 4 * 1024 * 1024;

/** Only raster images, identified from their magic bytes rather than the client's claim. */
function detectType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return 'image/png';
  const tag = (offset: number) => String.fromCharCode(...bytes.slice(offset, offset + 4));
  if (tag(0) === 'RIFF' && tag(8) === 'WEBP') return 'image/webp';
  return null;
}

export async function POST(request: Request) {
  const guard = await requireUser(request, { mutating: true });
  if ('response' in guard) return guard.response;

  try {
    if (Number(request.headers.get('content-length') || 0) > MAX_BYTES + 10_000) {
      return jsonError('Images must be smaller than 4 MB.', 413);
    }
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return jsonError('Choose an image to upload.');
    if (file.size > MAX_BYTES) return jsonError('Images must be smaller than 4 MB.', 413);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectType(bytes);
    if (!type) return jsonError('Upload a JPEG, PNG or WebP image.');

    const id = crypto.randomUUID();
    await query('INSERT INTO media (id, content_type, data, created_at) VALUES ($1,$2,$3,$4)', [
      id,
      type,
      Buffer.from(bytes),
      Date.now(),
    ]);
    await audit(guard.user.email, 'upload-image', id);
    return Response.json({ url: `/api/media/${id}` }, { status: 201 });
  } catch (error) {
    console.error('Upload failed', error);
    return jsonError('The image could not be uploaded. Please try again.', 503);
  }
}
