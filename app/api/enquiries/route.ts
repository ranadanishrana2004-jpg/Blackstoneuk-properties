import { query, queryOne } from '@/lib/db';
import { kindLabel, sendEnquiryEmails } from '@/lib/mail';
import { allProperties, jsonError, rateLimit, sameOrigin } from '@/lib/server';
import { CONSENT_VERSION, enquirySchema } from '@/lib/validation';

const MAX_BODY = 16_000;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError('Request origin not allowed.', 403);
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY) {
    return jsonError('Request too large.', 413);
  }

  try {
    const body = await request.text();
    if (body.length > MAX_BODY) return jsonError('Request too large.', 413);

    let value: unknown;
    try {
      value = JSON.parse(body);
    } catch {
      return jsonError('Invalid request.');
    }

    const parsed = enquirySchema.safeParse(value);
    if (!parsed.success) return jsonError('Please check your name, email, message and consent.');
    const data = parsed.data;

    // Bots fill the hidden field; pretend success so they learn nothing.
    if (data.website) {
      return Response.json(
        { reference: 'BSUK-' + data.requestId.slice(0, 8).toUpperCase(), saved: true },
        { status: 201 },
      );
    }

    if (!(await rateLimit(request, 'enquiry', 10))) {
      return jsonError('Too many requests. Please try again in 15 minutes.', 429);
    }

    const reference = 'BSUK-' + data.requestId.slice(0, 8).toUpperCase();
    const inserted = await query(
      `INSERT INTO enquiries
         (id, kind, name, email, phone, postcode, message, property_id, status, created_at, consent_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'new',$9,$10)
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [
        data.requestId,
        data.kind,
        data.name,
        data.email,
        data.phone,
        data.postcode,
        data.message,
        data.propertyId,
        Date.now(),
        CONSENT_VERSION,
      ],
    );

    // Only email on the first save, so a retried request cannot send duplicates.
    if (inserted.length) {
      let propertyName: string | undefined;
      if (data.propertyId) {
        const property = (await allProperties(true)).find((p) => p.id === data.propertyId);
        propertyName = property?.name;
      }
      const result = await sendEnquiryEmails({
        reference,
        kind: data.kind,
        name: data.name,
        email: data.email,
        phone: data.phone,
        postcode: data.postcode,
        message: data.message,
        propertyName,
      }).catch(() => 'failed' as const);
      await queryOne('UPDATE enquiries SET email_status = $1 WHERE id = $2', [
        result,
        data.requestId,
      ]);
      if (result === 'failed')
        console.error(`Email notification failed for ${reference} (${kindLabel(data.kind)})`);
    }

    return Response.json({ reference, saved: true }, { status: 201 });
  } catch (error) {
    console.error('Enquiry could not be saved', error);
    return jsonError(
      'We could not save your enquiry. Your details are still in the form; please try again.',
      503,
    );
  }
}
