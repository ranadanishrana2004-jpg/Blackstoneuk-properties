import { query, queryOne } from './db';
import { createHash } from 'node:crypto';
import { sendEnquiryEmail, type EnquiryMail } from './mail';

type Job = { enquiry_id: string; audience: 'team' | 'customer'; attempts: number };
type StoredEnquiry = EnquiryMail & { id: string; property_id: string };

/** Durable per-recipient delivery. Leases allow safe operation across overlapping deploys. */
async function drainJobs(limit: number) {
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
  bsukMailWanted?: boolean;
};

/** Tells the background worker that there may be email to deliver or retry. */
export function markMailWork() {
  runtime.bsukMailWanted = true;
}

/** Called right after queueing mail: delivers a few jobs now and keeps the worker retrying. */
export async function drainOutbox(limit = 10) {
  markMailWork();
  await drainJobs(limit);
}

/**
 * Background retries. The worker only touches the database while work is pending, so an idle site
 * lets a serverless database (Neon) scale to zero instead of being kept awake around the clock.
 */
export function startMailWorker() {
  if (runtime.bsukMailTimer) return;
  runtime.bsukMailWanted = true; // one check shortly after start-up picks up anything left over
  const tick = async () => {
    if (runtime.bsukMailBusy || !runtime.bsukMailWanted) return;
    if (!process.env.BREVO_API_KEY) {
      runtime.bsukMailWanted = false;
      return;
    }
    runtime.bsukMailBusy = true;
    runtime.bsukMailWanted = false;
    try {
      await drainJobs(10);
      const pending = await queryOne(
        "SELECT 1 AS pending FROM mail_outbox WHERE status <> 'sent' AND attempts < 8 LIMIT 1",
      );
      if (pending) runtime.bsukMailWanted = true;
    } catch {
      runtime.bsukMailWanted = true;
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
