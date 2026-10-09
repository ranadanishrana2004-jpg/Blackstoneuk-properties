import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from '@/lib/csv';
import { escapeHtml } from '@/lib/mail';
import { hashPassword, verifyPassword } from '@/lib/password';
import { calculateSdlt } from '@/lib/sdlt';
import { propertySchema } from '@/lib/validation';
import { seedProperties } from '@/lib/seed-properties';

const base = { firstTimeBuyer: false, additionalProperty: false, nonUkResident: false };

describe('stamp duty', () => {
  it('matches the standard residential rates', () => {
    expect(calculateSdlt({ ...base, price: 125_000 }).total).toBe(0);
    expect(calculateSdlt({ ...base, price: 300_000 }).total).toBe(5_000);
    expect(calculateSdlt({ ...base, price: 500_000 }).total).toBe(15_000);
    expect(calculateSdlt({ ...base, price: 1_250_000 }).total).toBe(0 + 2_500 + 33_750 + 32_500);
  });
  it('applies first-time buyer relief up to £500,000 only', () => {
    expect(calculateSdlt({ ...base, firstTimeBuyer: true, price: 300_000 }).total).toBe(0);
    expect(calculateSdlt({ ...base, firstTimeBuyer: true, price: 400_000 }).total).toBe(5_000);
    expect(calculateSdlt({ ...base, firstTimeBuyer: true, price: 600_000 }).total).toBe(
      calculateSdlt({ ...base, price: 600_000 }).total,
    );
  });
  it('adds the surcharges on the whole price', () => {
    expect(calculateSdlt({ ...base, additionalProperty: true, price: 300_000 }).total).toBe(
      5_000 + 15_000,
    );
    expect(calculateSdlt({ ...base, nonUkResident: true, price: 300_000 }).total).toBe(
      5_000 + 6_000,
    );
  });
});

describe('passwords', () => {
  it('verifies correct passwords only', async () => {
    const hash = await hashPassword('Correct-Horse-9');
    expect(await verifyPassword('Correct-Horse-9', hash)).toBe(true);
    expect(await verifyPassword('correct-horse-9', hash)).toBe(false);
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
  });
});

describe('helpers', () => {
  it('escapes HTML for emails', () => {
    expect(escapeHtml('<script>"x"&\'</script>')).toBe(
      '&lt;script&gt;&quot;x&quot;&amp;&#39;&lt;/script&gt;',
    );
  });
  it('neutralises CSV formulas and quotes', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(toCsv(['a'], [['x'], ['y']])).toBe('a\r\nx\r\ny\r\n');
  });
  it('accepts every seed property under the current schema', () => {
    for (const property of seedProperties) {
      expect(propertySchema.safeParse(property).success, property.slug).toBe(true);
    }
  });
});
