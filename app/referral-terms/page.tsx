import Link from 'next/link';
import { getContact } from '@/lib/site';
import { REFERRALS, REFERRAL_TERMS_VERSION } from '@/lib/referrals';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Referral terms and conditions',
  description: 'Terms and conditions of the Blackstone seller and landlord referral rewards.',
  alternates: { canonical: '/referral-terms' },
};

export default function Page() {
  const c = getContact();
  const seller = REFERRALS['seller-referral'];
  const landlord = REFERRALS['landlord-referral'];
  return (
    <main id="main" className="container section legal-page">
      <span className="eyebrow">REFERRAL REWARDS</span>
      <h1>Referral terms and conditions.</h1>
      <p>
        Version {REFERRAL_TERMS_VERSION} · Last updated October 2026. These terms apply to the
        referral rewards offered by {c.companyName} (“Blackstone”).
      </p>

      <h2>The rewards</h2>
      <p>
        <strong>Seller referral: £{seller.reward}</strong>, payable after the referred seller’s
        property sale completes through Blackstone.
        <br />
        <strong>Landlord referral: £{landlord.reward}</strong>, payable after the referred
        landlord’s property is let through Blackstone and the tenancy begins.
      </p>

      <h2>Who can refer</h2>
      <ul>
        <li>You must be aged 18 or over and resident in the United Kingdom.</li>
        <li>
          Blackstone staff, their immediate family, and other estate agents or professionals
          referring in the course of business are not eligible.
        </li>
        <li>
          You must have the permission of the person you are introducing to share their details and
          for Blackstone to contact them.
        </li>
      </ul>

      <h2>What qualifies</h2>
      <ul>
        <li>
          The person and property must be new to Blackstone. If we have already been in contact
          about the same property within the previous 12 months, or they are already a client, the
          referral does not qualify.
        </li>
        <li>
          Only the first valid referral received for a property counts. One reward is payable per
          property.
        </li>
        <li>
          The referred property must be in an area Blackstone serves and be instructed to
          Blackstone, with sale completion or the start of the tenancy taking place through us.
        </li>
        <li>
          No reward is payable if the instruction is withdrawn, the sale or tenancy does not
          complete, or the sale or let is completed through another agent.
        </li>
      </ul>

      <h2>How and when we pay</h2>
      <p>
        We will confirm your referral by email. Your reward is arranged after the qualifying event
        and once Blackstone has received its fees for the transaction, normally within 30 days.
        Rewards are paid by bank transfer, so please do not send bank details through the website
        form; we will contact you securely. You are responsible for any tax that may be due on your
        reward.
      </p>

      <h2>General</h2>
      <ul>
        <li>
          Submitting a referral is not an application for, or a guarantee of, any reward and does
          not create employment, agency or partnership between you and Blackstone.
        </li>
        <li>
          Blackstone may decline a referral that appears fraudulent, misleading or made without the
          referred person’s permission.
        </li>
        <li>
          We may change or withdraw the referral programme at any time. Changes do not affect
          rewards already confirmed for qualifying referrals.
        </li>
        <li>
          Personal data is handled as described in our <Link href="/privacy">privacy notice</Link>.
          We use the referred person’s details only to contact them about the referral and, if they
          choose, to provide our services.
        </li>
        <li>These terms are governed by the laws of England and Wales.</li>
      </ul>

      <p>
        Questions about these terms: <a href={'mailto:' + c.email}>{c.email}</a>.
      </p>
    </main>
  );
}
