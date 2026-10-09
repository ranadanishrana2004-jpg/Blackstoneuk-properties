import { allProperties, orderProperties } from './server';
import type { Property } from './properties';

/** Public pages should still render if the database is briefly unreachable. */
export async function safeProperties(): Promise<{ items: Property[]; failed: boolean }> {
  try {
    return { items: orderProperties(await allProperties()), failed: false };
  } catch (error) {
    console.error('Could not load properties', error);
    return { items: [], failed: true };
  }
}
