import { Suspense } from 'react';
import { Catalog } from '@/components/property-pages';
import { safeProperties } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your shortlist', robots: { index: false, follow: true } };

export default async function Page() {
  const { items } = await safeProperties();
  return (
    <Suspense>
      <Catalog shortlist initial={items} />
    </Suspense>
  );
}
