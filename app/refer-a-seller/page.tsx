import Link from 'next/link';
import { EnquiryForm, Intro } from '@/components/property-pages';
export const metadata = { title: 'Refer a seller · Earn £100' };
export default function ReferralPage() {
  return (
    <main id="main">
      <Intro
        eyebrow="GOOD CONNECTIONS DESERVE A THANK YOU"
        title="Their next chapter."
        emphasis="A £100 thank you for you."
        text="Know someone thinking of selling? Introduce them to Blackstone and earn £100 when their property sale completes through us."
      />
      <section className="container referral-layout section">
        <div className="referral-story">
          <span className="referral-reward">
            £100<small>ON SALE COMPLETION</small>
          </span>
          <h2>
            A thoughtful introduction.
            <br />
            <em>A rewarding connection.</em>
          </h2>
          <ol className="referral-steps">
            <li>
              <strong>Make the introduction</strong>
              <p>
                Ask the seller’s permission, then share your details and theirs using this form.
              </p>
            </li>
            <li>
              <strong>We take it from here</strong>
              <p>Our team contacts the seller and keeps your referral on record.</p>
            </li>
            <li>
              <strong>Celebrate their completed sale</strong>
              <p>
                When the property sale completes through Blackstone, the team arranges your £100
                reward.
              </p>
            </li>
          </ol>
          <p className="form-footnote">
            Submitting a referral does not trigger a payment. The team will confirm your referral
            and arrange payment after completion. Please do not send bank details in this form.
          </p>
          <Link className="text-link" href="/contact">
            Speak to our team →
          </Link>
        </div>
        <EnquiryForm kind="seller-referral" heading="Make a personal introduction." />
      </section>
    </main>
  );
}
