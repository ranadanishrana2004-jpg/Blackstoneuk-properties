import { Home } from '@/components/property-platform';
import { safeProperties } from '@/lib/data';
import { isAvailable } from '@/lib/properties';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { items } = await safeProperties();
  // Featured listings come first (see orderProperties), then the newest available homes.
  const featured = items.filter((p) => isAvailable(p.status)).slice(0, 3);
  return <Home featured={featured} />;
}
