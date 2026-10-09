import { ServicePage } from '@/components/property-pages';

export const metadata = {
  title: 'Lettings and property management',
  description:
    'Tenant finding and property management for landlords, shaped around your investment.',
  alternates: { canonical: '/landlords' },
};

export default function Page() {
  return <ServicePage type="landlords" />;
}
