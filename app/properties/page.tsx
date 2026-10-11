import { Suspense } from 'react';
import { Catalog } from '@/components/property-pages';
import { safeProperties } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Properties for sale and to rent',
  description:
    'Browse homes to buy and rent with Blackstone UK Properties Ltd. Filter by location, bedrooms, price and property type.',
  alternates: { canonical: '/properties' },
};

export default async function Page() {
  const { items, failed } = await safeProperties();
  return (
    <Suspense
      fallback={
        <main id="main" className="container section">
          Loading the collection…
        </main>
      }
    >
      {failed ? (
        <main id="main" className="container section">
          <h1>Our collection is temporarily unavailable.</h1>
          <p>Please try again in a few minutes, or contact the team and we will help directly.</p>
        </main>
      ) : (
        <Catalog initial={items} />
      )}
    </Suspense>
  );
}
