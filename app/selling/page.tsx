import { ServicePage } from '@/components/property-pages';

export const metadata = {
  title: 'Sell your property',
  description:
    'A considered approach to selling your home, from a personal valuation to the keys changing hands.',
  alternates: { canonical: '/selling' },
};

export default function Page() {
  return <ServicePage type="selling" />;
}
