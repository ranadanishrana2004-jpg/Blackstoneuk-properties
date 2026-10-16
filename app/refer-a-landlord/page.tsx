import { ReferralPage } from '@/components/referral-page';

export const metadata = {
  title: 'Refer a landlord · Earn £150',
  description:
    'Introduce a landlord to Blackstone UK Properties Ltd and earn £150 once their property is let through us. Terms apply.',
  alternates: { canonical: '/refer-a-landlord' },
};

export default function Page() {
  return <ReferralPage kind="landlord-referral" />;
}
