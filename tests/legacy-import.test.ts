import { describe, expect, it } from 'vitest';
import pg from 'pg';
import { query } from '@/lib/db';
import { importLegacyData } from '@/lib/legacy-import';

// Runs only when a source database is supplied, e.g.
//   LEGACY_TEST_URL=postgresql://... npx vitest run tests/legacy-import.test.ts
describe.skipIf(!process.env.LEGACY_TEST_URL)('legacy import', () => {
  it('copies data into an empty database once and is idempotent', async () => {
    process.env.LEGACY_DATABASE_URL = process.env.LEGACY_TEST_URL;
    // Simulate the owner the app bootstraps from ADMIN_EMAIL: same email as a migrated account.
    const source = new pg.Pool({
      connectionString: process.env.LEGACY_TEST_URL!.replace(/[&?]channel_binding=require/, ''),
    });
    const owner = (
      await source.query("SELECT email, password_hash FROM users WHERE role = 'owner' LIMIT 1")
    ).rows[0];
    await source.end();
    await query(
      "INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES ('bootstrap', $1, 'Owner', 'owner', 'scrypt$00$00', 1)",
      [owner.email],
    );
    await importLegacyData();
    const counts = async () => ({
      users: (await query('SELECT id FROM users')).length,
      listings: (await query('SELECT id FROM listings')).length,
      media: (await query('SELECT id FROM media')).length,
      enquiries: (await query('SELECT id FROM enquiries')).length,
    });
    const first = await counts();
    expect(first.listings).toBeGreaterThanOrEqual(5);
    expect(first.media).toBeGreaterThanOrEqual(1);
    expect(first.users).toBeGreaterThanOrEqual(1);
    const migrated = await query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE email = $1',
      [owner.email],
    );
    expect(migrated).toHaveLength(1);
    expect(migrated[0].password_hash).toBe(owner.password_hash);
    await importLegacyData(); // second run is a no-op
    expect(await counts()).toEqual(first);
    const real = await query('SELECT data FROM listings WHERE data NOT LIKE \'%"sample":true%\'');
    expect(real.length).toBeGreaterThanOrEqual(1);
  });
});
