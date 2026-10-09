import { Suspense } from 'react';
import { ContactPage } from '@/components/property-pages';
import { getContact } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Book a property valuation',
  description: 'Request a personal property valuation from Blackstone UK Property Ltd.',
  alternates: { canonical: '/valuation' },
};

export default function Page() {
  return (
    <Suspense>
      <ContactPage valuation contact={getContact()} />
    </Suspense>
  );
}
