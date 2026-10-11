/**
 * Transactional email through Brevo (https://developers.brevo.com/reference/sendtransacemail).
 * Without BREVO_API_KEY nothing is sent and the caller is told, so the site keeps working
 * and enquiries are still safely stored.
 */
import { COMPANY_NAME, contactEmail, getContact, siteUrl } from './site';

export type MailResult = 'sent' | 'skipped' | 'failed';

const KIND_LABELS: Record<string, string> = {
  general: 'General enquiry',
  valuation: 'Valuation request',
  viewing: 'Viewing enquiry',
  'halal-mortgage': 'Halal mortgage enquiry',
  landlord: 'Landlord enquiry',
};

export const kindLabel = (kind: string) => KIND_LABELS[kind] ?? kind;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type Message = {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
  replyTo?: { email: string; name?: string };
  deliveryKey?: string;
};

export async function sendMail(message: Message): Promise<MailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return 'skipped';
  const sender = { name: COMPANY_NAME, email: process.env.MAIL_FROM || contactEmail() };
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender,
        to: [message.to],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
        ...(message.deliveryKey ? { headers: { idempotencyKey: message.deliveryKey } } : {}),
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error('Brevo rejected the email', response.status);
      return 'failed';
    }
    return 'sent';
  } catch (error) {
    console.error('Brevo request failed', error);
    return 'failed';
  }
}

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f1ec;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden">
<tr><td style="background:#1c1c1c;color:#e8d9b5;padding:22px 28px;font-size:13px;letter-spacing:.18em">BLACKSTONE UK PROPERTIES LTD</td></tr>
<tr><td style="padding:28px"><h1 style="font:600 22px Georgia,serif;margin:0 0 16px">${escapeHtml(title)}</h1>${body}</td></tr>
<tr><td style="padding:16px 28px;background:#faf8f4;font-size:12px;color:#6b6b6b">${escapeHtml(COMPANY_NAME)} · ${escapeHtml(siteUrl())}</td></tr>
</table></td></tr></table></body></html>`;
}

export type EnquiryMail = {
  reference: string;
  kind: string;
  name: string;
  email: string;
  phone: string;
  postcode: string;
  message: string;
  propertyName?: string;
  deliveryKey?: string;
};

export async function sendEnquiryEmail(
  enquiry: EnquiryMail,
  audience: 'team' | 'customer',
): Promise<MailResult> {
  const label = kindLabel(enquiry.kind);
  const rows: [string, string][] = [
    ['Reference', enquiry.reference],
    ['Type', label],
    ['Name', enquiry.name],
    ['Email', enquiry.email],
    ['Phone', enquiry.phone || 'Not provided'],
    ['Postcode', enquiry.postcode || 'Not provided'],
    ...(enquiry.propertyName ? ([['Property', enquiry.propertyName]] as [string, string][]) : []),
  ];
  const table = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b6b6b;font-size:13px">${escapeHtml(k)}</td><td style="padding:6px 0;font-size:14px">${escapeHtml(v)}</td></tr>`,
    )
    .join('');

  if (audience === 'team')
    return sendMail({
      deliveryKey: enquiry.deliveryKey,
      to: { email: process.env.NOTIFY_EMAIL || contactEmail(), name: COMPANY_NAME },
      replyTo: { email: enquiry.email, name: enquiry.name },
      subject: `New ${label.toLowerCase()} — ${enquiry.name} (${enquiry.reference})`,
      html: layout(
        `New ${label.toLowerCase()}`,
        `<table role="presentation" cellpadding="0" cellspacing="0">${table}</table>
       <p style="margin:18px 0 6px;color:#6b6b6b;font-size:13px">Message</p>
       <p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(enquiry.message)}</p>
       <p style="margin:22px 0 0"><a href="${escapeHtml(siteUrl())}/manage" style="color:#7a5c1e">Open the team workspace</a></p>`,
      ),
      text: `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${enquiry.message}\n\n${siteUrl()}/manage`,
    });

  const contact = getContact();
  const reach = [contact.phone && `Phone: ${contact.phone}`, `Email: ${contact.email}`]
    .filter(Boolean)
    .join(' · ');
  const finance =
    enquiry.kind === 'halal-mortgage'
      ? '<p style="font-size:13px;color:#6b6b6b;line-height:1.6">This is an initial enquiry only. It is not a finance application, quotation or approval, and no product has been recommended.</p>'
      : '';
  return sendMail({
    deliveryKey: enquiry.deliveryKey,
    to: { email: enquiry.email, name: enquiry.name },
    replyTo: { email: contact.email, name: COMPANY_NAME },
    subject: `We have received your enquiry (${enquiry.reference})`,
    html: layout(
      `Thank you, ${enquiry.name.split(' ')[0]}`,
      `<p style="font-size:15px;line-height:1.6">We have received your ${escapeHtml(label.toLowerCase())} and a member of the team will be in touch.</p>
       <p style="font-size:15px">Your reference is <strong>${escapeHtml(enquiry.reference)}</strong>.</p>
       ${finance}
       <p style="font-size:13px;color:#6b6b6b">${escapeHtml(reach)}</p>`,
    ),
    text: `Thank you ${enquiry.name}. We have received your ${label.toLowerCase()}. Your reference is ${enquiry.reference}.\n${reach}`,
  });
}
