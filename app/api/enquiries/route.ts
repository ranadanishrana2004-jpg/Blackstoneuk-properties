import { query } from '@/lib/db';
import { drainOutbox } from '@/lib/outbox';
import { jsonError, rateLimit, sameOrigin } from '@/lib/server';
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
    await query(
      `WITH saved AS (INSERT INTO enquiries
         (id, kind, name, email, phone, postcode, message, property_id, status, created_at, consent_version, email_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'new',$9,$10,'queued')
       ON CONFLICT (id) DO NOTHING RETURNING id)
       INSERT INTO mail_outbox (enquiry_id, audience)
       SELECT saved.id, audience FROM saved CROSS JOIN (VALUES ('team'), ('customer')) AS recipients(audience)
       ON CONFLICT DO NOTHING`,
      [
        data.requestId,
        data.kind,
        data.name,
        data.email,
        data.phone,
        data.postcode,
        data.kind === 'seller-referral' && data.referral
          ? `Seller: ${data.referral.sellerName}
Seller email: ${data.referral.sellerEmail}
Property: ${data.referral.address}
Seller permission confirmed. Reward: £100 after sale completion through Blackstone. Terms: referral-v1.

${data.message}`
          : data.message,
        data.propertyId,
        Date.now(),
        CONSENT_VERSION,
      ],
    );

    // Persistence succeeds independently of delivery. The in-process worker retries failures.
    await drainOutbox(2).catch(() => console.error('Enquiry queued for email retry.'));

    return Response.json({ reference, saved: true }, { status: 201 });
  } catch (error) {
    console.error('Enquiry could not be saved', error);
    return jsonError(
      'We could not save your enquiry. Your details are still in the form; please try again.',
      503,
    );
  }
}
