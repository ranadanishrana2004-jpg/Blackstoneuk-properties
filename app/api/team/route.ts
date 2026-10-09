import { query, queryOne } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import {
  allProperties,
  audit,
  authenticate,
  jsonError,
  orderProperties,
  requireUser,
} from '@/lib/server';
import { passwordSchema, propertySchema, userSchema } from '@/lib/validation';

const PAGE_SIZE = 25;
const STATUSES = ['new', 'contacted', 'closed'];

export async function GET(request: Request) {
  const guard = await requireUser(request);
  if ('response' in guard) return guard.response;
  const { user } = guard;

  try {
    const params = new URL(request.url).searchParams;
    const status = params.get('status') || 'all';
    const search = (params.get('q') || '').trim().slice(0, 100);
    const page = Math.max(1, Number(params.get('page')) || 1);

    const where: string[] = [];
    const values: unknown[] = [];
    if (STATUSES.includes(status)) {
      values.push(status);
      where.push(`status = $${values.length}`);
    }
    if (search) {
      values.push('%' + search.replace(/[\\%_]/g, (c) => '\\' + c) + '%');
      where.push(
        `(name ILIKE $${values.length} OR email ILIKE $${values.length} OR kind ILIKE $${values.length} OR postcode ILIKE $${values.length})`,
      );
    }
    const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [enquiries, totalRow, stats, properties] = await Promise.all([
      query(
        `SELECT * FROM enquiries ${clause} ORDER BY created_at DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
        values,
      ),
      queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM enquiries ${clause}`, values),
      queryOne<{ total: number; new: number; halal: number }>(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'new')::int AS new,
                COUNT(*) FILTER (WHERE kind = 'halal-mortgage')::int AS halal
         FROM enquiries`,
      ),
      allProperties(true),
    ]);

    const owner = user.role === 'owner';
    const [users, log] = owner
      ? await Promise.all([
          query('SELECT id, email, name, role, created_at FROM users ORDER BY created_at'),
          query('SELECT at, actor, action, detail FROM audit_log ORDER BY id DESC LIMIT 60'),
        ])
      : [[], []];

    return Response.json(
      {
        user,
        enquiries,
        total: totalRow?.total ?? 0,
        page,
        pageSize: PAGE_SIZE,
        stats,
        properties: orderProperties(properties),
        users,
        audit: log,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Team workspace unavailable', error);
    return jsonError('The team workspace is temporarily unavailable.', 503);
  }
}

export async function POST(request: Request) {
  const guard = await requireUser(request, { mutating: true });
  if ('response' in guard) return guard.response;
  const { user } = guard;

  try {
    const raw = await request.text();
    if (raw.length > 40_000) return jsonError('Request too large.', 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      return jsonError('Invalid request.');
    }

    switch (body.action) {
      case 'enquiry-update': {
        if (typeof body.id !== 'string') return jsonError('Invalid update.');
        const status = body.status;
        const notes = typeof body.notes === 'string' ? body.notes.slice(0, 5000) : undefined;
        if (status !== undefined && (typeof status !== 'string' || !STATUSES.includes(status))) {
          return jsonError('Invalid status.');
        }
        await query(
          `UPDATE enquiries SET status = COALESCE($1, status), notes = COALESCE($2, notes) WHERE id = $3`,
          [status ?? null, notes ?? null, body.id],
        );
        await audit(user.email, 'enquiry-update', `${body.id} ${status ?? ''}`.trim());
        return Response.json({ saved: true });
      }

      case 'enquiry-delete': {
        if (user.role !== 'owner') return jsonError('Only an owner can delete enquiries.', 403);
        if (typeof body.id !== 'string') return jsonError('Invalid request.');
        await query('DELETE FROM enquiries WHERE id = $1', [body.id]);
        await audit(user.email, 'enquiry-delete', body.id);
        return Response.json({ saved: true });
      }

      case 'save-property': {
        const parsed = propertySchema.safeParse(body.property);
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          return jsonError(
            `${issue?.path.join('.') || 'Property'}: ${issue?.message || 'check the details.'}`,
          );
        }
        const p = parsed.data;
        const clash = await queryOne('SELECT id FROM listings WHERE slug = $1 AND id <> $2', [
          p.slug,
          p.id,
        ]);
        if (clash) return jsonError('This property URL is already used.', 409);
        await query(
          `INSERT INTO listings (id, slug, data, updated_at) VALUES ($1,$2,$3,$4)
           ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
          [p.id, p.slug, JSON.stringify(p), Date.now()],
        );
        await audit(user.email, 'save-property', `${p.name} (${p.status})`);
        return Response.json({ saved: true });
      }

      case 'delete-property': {
        if (user.role !== 'owner') return jsonError('Only an owner can delete properties.', 403);
        if (typeof body.id !== 'string') return jsonError('Invalid request.');
        await query('DELETE FROM listings WHERE id = $1', [body.id]);
        await audit(user.email, 'delete-property', body.id);
        return Response.json({ saved: true });
      }

      case 'user-create': {
        if (user.role !== 'owner') return jsonError('Only an owner can add team members.', 403);
        const parsed = userSchema.safeParse(body.user);
        if (!parsed.success)
          return jsonError(parsed.error.issues[0]?.message || 'Check the details.');
        const u = parsed.data;
        const exists = await queryOne('SELECT id FROM users WHERE email = $1', [u.email]);
        if (exists) return jsonError('A team member with this email already exists.', 409);
        await query(
          'INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
          [
            crypto.randomUUID(),
            u.email,
            u.name,
            u.role,
            await hashPassword(u.password),
            Date.now(),
          ],
        );
        await audit(user.email, 'user-create', `${u.email} (${u.role})`);
        return Response.json({ saved: true });
      }

      case 'user-delete': {
        if (user.role !== 'owner') return jsonError('Only an owner can remove team members.', 403);
        if (typeof body.id !== 'string') return jsonError('Invalid request.');
        if (body.id === user.id) return jsonError('You cannot remove your own account.');
        const target = await queryOne<{ email: string }>('SELECT email FROM users WHERE id = $1', [
          body.id,
        ]);
        if (!target) return jsonError('Team member not found.', 404);
        await query('DELETE FROM users WHERE id = $1', [body.id]);
        await audit(user.email, 'user-delete', target.email);
        return Response.json({ saved: true });
      }

      case 'change-password': {
        const current = typeof body.current === 'string' ? body.current : '';
        const next = passwordSchema.safeParse(body.password);
        if (!next.success)
          return jsonError(next.error.issues[0]?.message || 'Choose a stronger password.');
        if (!(await authenticate(user.email, current)))
          return jsonError('Your current password is incorrect.', 403);
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [
          await hashPassword(next.data),
          user.id,
        ]);
        await audit(user.email, 'change-password');
        return Response.json({ saved: true });
      }

      default:
        return jsonError('Unknown action.');
    }
  } catch (error) {
    console.error('Team update failed', error);
    return jsonError('Unable to save. Please try again.', 503);
  }
}
