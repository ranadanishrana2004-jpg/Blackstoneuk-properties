/** Referral programmes. Shared by the form, API, emails and the workspace so wording never drifts. */
export const REFERRAL_TERMS_VERSION = 'referral-v2';

export type ReferralKind = 'seller-referral' | 'landlord-referral';

export const REFERRALS: Record<
  ReferralKind,
  {
    reward: number;
    title: string;
    short: string;
    path: string;
    person: 'seller' | 'landlord';
    /** The event after which the reward becomes payable. */
    trigger: string;
  }
> = {
  'seller-referral': {
    reward: 100,
    title: 'Seller referral',
    short: 'Refer a seller',
    path: '/refer-a-seller',
    person: 'seller',
    trigger: 'their property sale completes through Blackstone',
  },
  'landlord-referral': {
    reward: 150,
    title: 'Landlord referral',
    short: 'Find a landlord',
    path: '/refer-a-landlord',
    person: 'landlord',
    trigger: 'their property is let through Blackstone and the tenancy begins',
  },
};

export const isReferralKind = (kind: string): kind is ReferralKind => kind in REFERRALS;

export function referralMessage(
  kind: ReferralKind,
  referral: { sellerName: string; sellerEmail: string; address: string },
  message: string,
): string {
  const programme = REFERRALS[kind];
  const who = programme.person === 'seller' ? 'Seller' : 'Landlord';
  return [
    `${who}: ${referral.sellerName}`,
    `${who} email: ${referral.sellerEmail}`,
    `Property: ${referral.address}`,
    `Permission confirmed. Reward: £${programme.reward} payable after ${programme.trigger}. Terms: ${REFERRAL_TERMS_VERSION}.`,
    '',
    message,
  ].join('\n');
}
