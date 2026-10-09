import { HalalPage } from '@/components/property-pages';
import { getContact } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Halal mortgage enquiries',
  description:
    'Start a Halal home-finance enquiry with Blackstone UK Property Ltd. An initial conversation only, not a finance application.',
  alternates: { canonical: '/halal-mortgages' },
};

export default function Page() {
  return <HalalPage contact={getContact()} />;
}
