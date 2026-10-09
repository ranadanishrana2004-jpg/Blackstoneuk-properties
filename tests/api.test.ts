import { describe, expect, it } from 'vitest';
import { POST as postEnquiry } from '@/app/api/enquiries/route';
import { GET as getProperties } from '@/app/api/properties/route';
import { DELETE as signOut, GET as getSession, POST as signIn } from '@/app/api/team/session/route';
import { GET as getTeam, POST as postTeam } from '@/app/api/team/route';
import { GET as exportCsv } from '@/app/api/team/export/route';
import { POST as upload } from '@/app/api/team/upload/route';
import { GET as getMedia } from '@/app/api/media/[id]/route';

const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'Sup3rSecretPassw0rd';

function req(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    cookie?: string;
    origin?: string | null;
    raw?: BodyInit;
  } = {},
) {
  const headers: Record<string, string> = {
    host: 'localhost:3000',
    'x-forwarded-for': '203.0.113.9',
  };
  if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
  if (init.cookie) headers.cookie = init.cookie;
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  return new Request(ORIGIN + path, {
    method: init.method ?? 'GET',
    headers,
    body: init.raw ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });
}

const enquiry = (overrides: Record<string, unknown> = {}) => ({
  requestId: crypto.randomUUID(),
  kind: 'general',
  name: 'Test Person',
  email: 'test@example.com',
  message: 'I would like to talk about a property please.',
  consent: true,
  ...overrides,
});

async function login(): Promise<string> {
  const res = await signIn(
    req('/api/team/session', {
      method: 'POST',
      body: { email: 'owner@example.com', password: PASSWORD },
    }),
  );
  expect(res.status).toBe(200);
  return res.headers.get('set-cookie')!.split(';')[0];
}

describe('public API', () => {
  it('lists the seeded sample properties', async () => {
    const res = await getProperties();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.properties.length).toBeGreaterThanOrEqual(4);
  });

  it('stores an enquiry once and is idempotent on retries', async () => {
    const body = enquiry();
    const first = await postEnquiry(req('/api/enquiries', { method: 'POST', body }));
    expect(first.status).toBe(201);
    expect((await first.json()).reference).toMatch(/^BSUK-[A-F0-9]{8}$/);
    const again = await postEnquiry(req('/api/enquiries', { method: 'POST', body }));
    expect(again.status).toBe(201);

    const cookie = await login();
    const team = await (await getTeam(req('/api/team', { cookie }))).json();
    expect(team.enquiries.filter((e: { id: string }) => e.id === body.requestId)).toHaveLength(1);
  });

  it('rejects invalid input, foreign origins and silently drops bots', async () => {
    expect(
      (await postEnquiry(req('/api/enquiries', { method: 'POST', body: { name: 'x' } }))).status,
    ).toBe(400);
    expect(
      (
        await postEnquiry(
          req('/api/enquiries', {
            method: 'POST',
            body: enquiry(),
            origin: 'https://evil.example',
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (await postEnquiry(req('/api/enquiries', { method: 'POST', body: enquiry(), origin: null })))
        .status,
    ).toBe(403);
    const bot = enquiry({ website: 'http://spam.example' });
    expect((await postEnquiry(req('/api/enquiries', { method: 'POST', body: bot }))).status).toBe(
      201,
    );
    const cookie = await login();
    const team = await (await getTeam(req('/api/team', { cookie }))).json();
    expect(team.enquiries.some((e: { id: string }) => e.id === bot.requestId)).toBe(false);
  });
});

describe('team workspace', () => {
  it('requires authentication', async () => {
    expect((await getTeam(req('/api/team'))).status).toBe(401);
    expect(
      (
        await postTeam(
          req('/api/team', { method: 'POST', body: { action: 'delete-property', id: 'p1' } }),
        )
      ).status,
    ).toBe(401);
    expect((await exportCsv(req('/api/team/export'))).status).toBe(401);
  });

  it('rejects a wrong password and a forged cookie', async () => {
    const bad = await signIn(
      req('/api/team/session', {
        method: 'POST',
        body: { email: 'owner@example.com', password: 'wrong-password-123' },
      }),
    );
    expect(bad.status).toBe(401);
    const forged = await getTeam(req('/api/team', { cookie: 'bsuk_session=' + 'a'.repeat(64) }));
    expect(forged.status).toBe(401);
  });

  it('signs out by revoking the session on the server', async () => {
    const cookie = await login();
    expect((await getTeam(req('/api/team', { cookie }))).status).toBe(200);
    await signOut(req('/api/team/session', { method: 'DELETE', cookie }));
    expect((await getTeam(req('/api/team', { cookie }))).status).toBe(401);
    const session = await (await getSession(req('/api/team/session', { cookie }))).json();
    expect(session.authenticated).toBe(false);
  });

  it('blocks cross-origin writes even with a valid session', async () => {
    const cookie = await login();
    const res = await postTeam(
      req('/api/team', {
        method: 'POST',
        cookie,
        origin: 'https://evil.example',
        body: { action: 'delete-property', id: 'p1' },
      }),
    );
    expect(res.status).toBe(403);
  });

  it('manages enquiry status, notes and properties', async () => {
    const cookie = await login();
    const body = enquiry({ kind: 'halal-mortgage' });
    await postEnquiry(req('/api/enquiries', { method: 'POST', body }));
    const update = await postTeam(
      req('/api/team', {
        method: 'POST',
        cookie,
        body: {
          action: 'enquiry-update',
          id: body.requestId,
          status: 'contacted',
          notes: 'Called back',
        },
      }),
    );
    expect(update.status).toBe(200);
    const team = await (await getTeam(req('/api/team?status=contacted', { cookie }))).json();
    const row = team.enquiries.find((e: { id: string }) => e.id === body.requestId);
    expect(row).toMatchObject({ status: 'contacted', notes: 'Called back' });

    const original = team.properties.find((p: { id: string }) => p.id === 'p2');
    const changed = {
      ...original,
      id: 'qa-property',
      slug: 'qa-property',
      name: 'QA property',
      status: 'under-offer',
      epc: 'C',
      featured: true,
    };
    expect(
      (
        await postTeam(
          req('/api/team', {
            method: 'POST',
            cookie,
            body: { action: 'save-property', property: changed },
          }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await postTeam(
          req('/api/team', {
            method: 'POST',
            cookie,
            body: { action: 'save-property', property: { ...changed, price: -1 } },
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await postTeam(
          req('/api/team', {
            method: 'POST',
            cookie,
            body: {
              action: 'save-property',
              property: { ...changed, id: 'other', image: 'javascript:alert(1)' },
            },
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await postTeam(
          req('/api/team', {
            method: 'POST',
            cookie,
            body: { action: 'save-property', property: { ...changed, id: 'other' } },
          }),
        )
      ).status,
    ).toBe(409);

    const list = await (await getProperties()).json();
    expect(list.properties.find((p: { id: string }) => p.id === 'qa-property')).toMatchObject({
      status: 'under-offer',
      featured: true,
    });

    await postTeam(
      req('/api/team', {
        method: 'POST',
        cookie,
        body: { action: 'delete-property', id: 'qa-property' },
      }),
    );
    const after = await (await getProperties()).json();
    expect(after.properties.some((p: { id: string }) => p.id === 'qa-property')).toBe(false);
  });

  it('exports CSV with formula injection neutralised', async () => {
    const cookie = await login();
    await postEnquiry(
      req('/api/enquiries', {
        method: 'POST',
        body: enquiry({ name: '=HYPERLINK("http://x","y")' }),
      }),
    );
    const res = await exportCsv(req('/api/team/export', { cookie }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    const text = await res.text();
    expect(text).toContain(`"'=HYPERLINK(""http://x"",""y"")"`);
  });

  it('lets an owner add staff, who cannot delete data', async () => {
    const cookie = await login();
    const create = await postTeam(
      req('/api/team', {
        method: 'POST',
        cookie,
        body: {
          action: 'user-create',
          user: {
            email: 'staff@example.com',
            name: 'Staff Member',
            password: 'Another1Strong',
            role: 'staff',
          },
        },
      }),
    );
    expect(create.status).toBe(200);
    const weak = await postTeam(
      req('/api/team', {
        method: 'POST',
        cookie,
        body: {
          action: 'user-create',
          user: { email: 'weak@example.com', name: 'Weak Pass', password: 'short', role: 'staff' },
        },
      }),
    );
    expect(weak.status).toBe(400);

    const staffLogin = await signIn(
      req('/api/team/session', {
        method: 'POST',
        body: { email: 'staff@example.com', password: 'Another1Strong' },
      }),
    );
    const staffCookie = staffLogin.headers.get('set-cookie')!.split(';')[0];
    const denied = await postTeam(
      req('/api/team', {
        method: 'POST',
        cookie: staffCookie,
        body: { action: 'delete-property', id: 'p1' },
      }),
    );
    expect(denied.status).toBe(403);
    const team = await (await getTeam(req('/api/team', { cookie: staffCookie }))).json();
    expect(team.users).toEqual([]);
  });

  it('uploads real images only and serves them back', async () => {
    const cookie = await login();
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const good = new FormData();
    good.set('file', new File([png], 'photo.png', { type: 'image/png' }));
    const ok = await upload(req('/api/team/upload', { method: 'POST', cookie, raw: good }));
    expect(ok.status).toBe(201);
    const { url } = await ok.json();
    const served = await getMedia(req(url), {
      params: Promise.resolve({ id: url.split('/').pop() }),
    });
    expect(served.status).toBe(200);
    expect(served.headers.get('content-type')).toBe('image/png');

    const bad = new FormData();
    bad.set('file', new File(['<svg onload=alert(1)>'], 'x.png', { type: 'image/png' }));
    expect(
      (await upload(req('/api/team/upload', { method: 'POST', cookie, raw: bad }))).status,
    ).toBe(400);
  });
});
