import { getContact } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Website terms',
  description: 'Terms of use for the Blackstone UK Properties Ltd website.',
  alternates: { canonical: '/terms' },
};

export default function Page() {
  const c = getContact();
  return (
    <main id="main" className="container section legal-page">
      <span className="eyebrow">WEBSITE TERMS</span>
      <h1>Terms of use.</h1>
      <p>Last updated: October 2026.</p>

      <h2>About this website</h2>
      <p>
        This website is operated by {c.companyName}, registered in England and Wales under company
        number {c.companyNumber}. By using it you agree to these terms. Property details are
        provided in good faith for guidance and do not form part of any offer or contract. Prices,
        availability and descriptions can change without notice, and you should verify the details
        with us before making any decision.
      </p>

      <h2>Enquiries are not applications</h2>
      <p>
        Submitting an enquiry does not book a viewing, valuation or appointment and is not a finance
        application, quotation, approval or recommendation. Appointments are confirmed only when
        agreed with the team. Halal mortgage enquiries are initial conversations; any provider,
        product terms, eligibility and fees must be confirmed before you proceed.
      </p>

      <h2>Calculators</h2>
      <p>
        Tools such as the stamp duty calculator give estimates only. Always confirm figures with a
        qualified conveyancer or on GOV.UK.
      </p>

      <h2>Photography and content</h2>
      <p>
        Images and text on this website belong to us or our licensors. Properties marked
        &ldquo;illustrative&rdquo; are examples and are not live listings. You may not copy or reuse
        website content without our written permission.
      </p>

      <h2>Liability</h2>
      <p>
        We take care to keep this website accurate and available, but we cannot guarantee it will be
        uninterrupted or error-free. Nothing in these terms limits liability that cannot be limited
        by law.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href={'mailto:' + c.email}>{c.email}</a>.
      </p>
    </main>
  );
}
