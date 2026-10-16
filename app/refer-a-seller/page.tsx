import { ReferralPage } from '@/components/referral-page';

export const metadata = {
  title: 'Refer a seller · Earn £100',
  description:
    'Introduce someone selling their home to Blackstone UK Properties Ltd and earn £100 when the sale completes. Terms apply.',
  alternates: { canonical: '/refer-a-seller' },
};

export default function Page() {
  return <ReferralPage kind="seller-referral" />;
}
