import { ServicePage } from '@/components/property-pages';

export const metadata = {
  title: 'Our approach',
  description:
    'Meet the thinking behind Blackstone UK Properties Ltd: listen first, consider every detail, build lasting connections.',
  alternates: { canonical: '/about' },
};

export default function Page() {
  return <ServicePage type="about" />;
}
