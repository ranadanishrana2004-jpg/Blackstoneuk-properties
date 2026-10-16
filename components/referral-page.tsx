import Link from 'next/link';
import { EnquiryForm, Intro } from '@/components/property-pages';
import { REFERRALS, type ReferralKind } from '@/lib/referrals';

const COPY: Record<
  ReferralKind,
  {
    eyebrow: string;
    title: string;
    emphasis: string;
    text: string;
    heading: [string, string];
    steps: [string, string][];
    formHeading: string;
  }
> = {
  'seller-referral': {
    eyebrow: 'GOOD CONNECTIONS DESERVE A THANK YOU',
    title: 'Their next chapter.',
    emphasis: 'A £100 thank you for you.',
    text: 'Know someone thinking of selling? Introduce them to Blackstone and earn £100 when their property sale completes through us.',
    heading: ['A thoughtful introduction.', 'A rewarding connection.'],
    steps: [
      [
        'Make the introduction',
        'Ask the seller’s permission, then share your details and theirs using this form.',
      ],
      ['We take it from here', 'Our team contacts the seller and keeps your referral on record.'],
      [
        'Celebrate their completed sale',
        'When the property sale completes through Blackstone, the team arranges your £100 reward.',
      ],
    ],
    formHeading: 'Make a personal introduction.',
  },
  'landlord-referral': {
    eyebrow: 'SELLING OR RENTING. EVERYONE WINS.',
    title: 'Know a landlord?',
    emphasis: 'A £150 thank you for you.',
    text: 'Introduce a landlord who wants help letting or managing their property and earn £150 once their property is let through Blackstone.',
    heading: ['A trusted introduction.', 'A generous thank you.'],
    steps: [
      [
        'Introduce the landlord',
        'Ask the landlord’s permission, then share your details and theirs using this form.',
      ],
      [
        'We look after them',
        'Our lettings team contacts the landlord, discusses their property and keeps your referral on record.',
      ],
      [
        'Celebrate the let',
        'Once their property is let through Blackstone and the tenancy begins, the team arranges your £150 reward.',
      ],
    ],
    formHeading: 'Introduce a landlord.',
  },
};

export function ReferralPage({ kind }: { kind: ReferralKind }) {
  const copy = COPY[kind];
  const programme = REFERRALS[kind];
  return (
    <main id="main">
      <Intro eyebrow={copy.eyebrow} title={copy.title} emphasis={copy.emphasis} text={copy.text} />
      <section className="container referral-layout section">
        <div className="referral-story">
          <nav className="referral-switch" aria-label="Choose a referral programme">
            {(Object.keys(REFERRALS) as ReferralKind[]).map((k) => (
              <Link key={k} href={REFERRALS[k].path} aria-current={k === kind ? 'page' : undefined}>
                {REFERRALS[k].short} · £{REFERRALS[k].reward}
              </Link>
            ))}
          </nav>
          <span className="referral-reward">
            £{programme.reward}
            <small>
              {kind === 'seller-referral' ? 'ON SALE COMPLETION' : 'ONCE THE PROPERTY IS LET'}
            </small>
          </span>
          <h2>
            {copy.heading[0]}
            <br />
            <em>{copy.heading[1]}</em>
          </h2>
          <ol className="referral-steps">
            {copy.steps.map(([title, body]) => (
              <li key={title}>
                <strong>{title}</strong>
                <p>{body}</p>
              </li>
            ))}
          </ol>
          <p className="form-footnote">
            Submitting a referral does not trigger a payment. The team will confirm your referral
            and arrange payment after the qualifying event. Please do not send bank details in this
            form. <Link href="/referral-terms">Terms and conditions apply.</Link>
          </p>
          <Link className="text-link" href="/contact">
            Speak to our team →
          </Link>
        </div>
        <EnquiryForm kind={kind} heading={copy.formHeading} />
      </section>
    </main>
  );
}
