import { query, queryOne } from './db';
import { createHash } from 'node:crypto';
import { sendEnquiryEmail, type EnquiryMail } from './mail';

type Job = { enquiry_id: string; audience: 'team' | 'customer'; attempts: number };
type StoredEnquiry = EnquiryMail & { id: string; property_id: string };

/** Durable per-recipient delivery. Leases allow safe operation across overlapping deploys. */
export async function drainOutbox(limit = 10) {
  if (!process.env.BREVO_API_KEY) return;
  for (let i = 0; i < limit; i++) {
    const now = Date.now();
    const token = crypto.randomUUID();
    const job = await queryOne<Job>(
      `UPDATE mail_outbox SET lease_token=$1, lease_until=$2,
      attempts=attempts+1 WHERE (enquiry_id,audience) = (
        SELECT enquiry_id,audience FROM mail_outbox
        WHERE status <> 'sent' AND attempts < 8 AND next_attempt <= $3 AND lease_until <= $3
        ORDER BY next_attempt FOR UPDATE SKIP LOCKED LIMIT 1
      ) RETURNING enquiry_id,audience,attempts`,
      [token, now + 60_000, now],
    );
    if (!job) break;
    const enquiry = await queryOne<StoredEnquiry>('SELECT * FROM enquiries WHERE id=$1', [
      job.enquiry_id,
    ]);
    if (!enquiry) continue;
    const listing = enquiry.property_id
      ? await queryOne<{ data: string }>('SELECT data FROM listings WHERE id=$1', [
          enquiry.property_id,
        ])
      : null;
    const result = await sendEnquiryEmail(
      {
        ...enquiry,
        deliveryKey: createHash('md5')
          .update(`${job.enquiry_id}:${job.audience}`)
          .digest('hex')
          .replace(/^(........)(....)(....)(....)(............)$/, '$1-$2-$3-$4-$5'),
        reference: 'BSUK-' + enquiry.id.slice(0, 8).toUpperCase(),
        propertyName: listing ? JSON.parse(listing.data).name : undefined,
      },
      job.audience,
    );
    await query(
      `UPDATE mail_outbox SET status=$1, lease_until=0, lease_token=NULL, next_attempt=$2
      WHERE enquiry_id=$3 AND audience=$4 AND lease_token=$5`,
      [
        result === 'sent' ? 'sent' : 'failed',
        Date.now() + Math.min(3600_000, 30_000 * 2 ** (job.attempts - 1)),
        job.enquiry_id,
        job.audience,
        token,
      ],
    );
    await query(
      `UPDATE enquiries SET email_status=CASE
      WHEN NOT EXISTS (SELECT 1 FROM mail_outbox WHERE enquiry_id=$1 AND status <> 'sent') THEN 'sent'
      WHEN EXISTS (SELECT 1 FROM mail_outbox WHERE enquiry_id=$1 AND attempts >= 8 AND status <> 'sent') THEN 'failed'
      ELSE 'queued' END WHERE id=$1`,
      [job.enquiry_id],
    );
  }
}

const runtime = globalThis as unknown as {
  bsukMailTimer?: ReturnType<typeof setInterval>;
  bsukMailBusy?: boolean;
};
export function startMailWorker() {
  if (runtime.bsukMailTimer) return;
  const tick = async () => {
    if (runtime.bsukMailBusy) return;
    runtime.bsukMailBusy = true;
    try {
      await drainOutbox();
    } catch {
      console.error('Email queue processing interrupted; will retry.');
    } finally {
      runtime.bsukMailBusy = false;
    }
  };
  runtime.bsukMailTimer = setInterval(() => {
    void tick();
  }, 30_000);
  runtime.bsukMailTimer.unref();
}
