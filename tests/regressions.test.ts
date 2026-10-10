import { afterEach, expect, it, vi } from 'vitest';
import { POST as signIn, GET as session } from '@/app/api/team/session/route';
import { POST as team, GET as desk } from '@/app/api/team/route';
import { POST as enquiry } from '@/app/api/enquiries/route';
import { query, queryOne } from '@/lib/db';
import { drainOutbox } from '@/lib/outbox';
import sitemap from '@/app/sitemap';
const req = (path: string, body?: unknown, cookie = '') =>
  new Request('http://localhost:3000' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      cookie,
      'content-type': 'application/json',
      'x-forwarded-for': '192.0.2.88',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
const login = async (password = 'Sup3rSecretPassw0rd') =>
  (await signIn(req('/api/team/session', { email: 'owner@example.com', password }))).headers
    .get('set-cookie')!
    .split(';')[0];
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.BREVO_API_KEY;
});
it('atomically changes password and revokes other sessions while keeping the current one', async () => {
  const first = await login(),
    second = await login();
  expect(
    (
      await team(
        req(
          '/api/team',
          {
            action: 'change-password',
            current: 'Sup3rSecretPassw0rd',
            password: 'ChangedPassw0rd123',
          },
          first,
        ),
      )
    ).status,
  ).toBe(200);
  expect(
    (await (await session(req('/api/team/session', undefined, second))).json()).authenticated,
  ).toBe(false);
  expect(
    (await (await session(req('/api/team/session', undefined, first))).json()).authenticated,
  ).toBe(true);
  expect(
    (
      await signIn(
        req('/api/team/session', { email: 'owner@example.com', password: 'Sup3rSecretPassw0rd' }),
      )
    ).status,
  ).toBe(401);
});
it('retries only failed recipient delivery and searches the customer reference', async () => {
  process.env.BREVO_API_KEY = 'mock-only';
  const mock = vi.fn().mockImplementation(async () => new Response('{}', { status: 201 }));
  mock.mockImplementationOnce(async () => new Response('{}', { status: 503 }));
  vi.stubGlobal('fetch', mock);
  const id = crypto.randomUUID();
  const body = {
    requestId: id,
    kind: 'general',
    name: 'Queue Test',
    email: 'queue@example.com',
    message: 'Synthetic test enquiry, no real delivery.',
    consent: true,
  };
  const response = await enquiry(req('/api/enquiries', body));
  expect(response.status).toBe(201);
  const result = await response.json();
  expect(mock).toHaveBeenCalledTimes(2);
  expect(
    (
      await queryOne<{ email_status: string }>('SELECT email_status FROM enquiries WHERE id=$1', [
        id,
      ])
    )?.email_status,
  ).toBe('queued');
  await query('UPDATE mail_outbox SET next_attempt=0 WHERE enquiry_id=$1', [id]);
  await Promise.all([drainOutbox(), drainOutbox()]);
  expect(mock).toHaveBeenCalledTimes(3);
  expect(
    (
      await queryOne<{ email_status: string }>('SELECT email_status FROM enquiries WHERE id=$1', [
        id,
      ])
    )?.email_status,
  ).toBe('sent');
  await enquiry(req('/api/enquiries', body));
  expect(mock).toHaveBeenCalledTimes(3);
  const cookie = await login('ChangedPassw0rd123');
  const search = await (
    await desk(req('/api/team?q=' + result.reference, undefined, cookie))
  ).json();
  expect(search.total).toBe(1);
  expect(search.enquiries[0].id).toBe(id);
});
it('keeps sample property pages out of the sitemap', async () => {
  const entries = await sitemap();
  expect(entries.some((x) => x.url.includes('/properties/the-skyline-apartment'))).toBe(false);
  expect(entries.some((x) => x.url.endsWith('/properties'))).toBe(true);
});
