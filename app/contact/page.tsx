import { Suspense } from 'react';
import { ContactPage } from '@/components/property-pages';
import { getContact } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Contact us',
  description:
    'Speak to the Blackstone UK Property Ltd team about buying, selling, renting or letting.',
  alternates: { canonical: '/contact' },
};

export default function Page() {
  return (
    <Suspense>
      <ContactPage contact={getContact()} />
    </Suspense>
  );
}
