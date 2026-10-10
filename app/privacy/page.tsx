import { getContact } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Privacy notice',
  description:
    'How Blackstone UK Property Ltd collects, uses and protects your personal information.',
  alternates: { canonical: '/privacy' },
};

export default function Page() {
  const c = getContact();
  return (
    <main id="main" className="container section legal-page">
      <span className="eyebrow">YOUR INFORMATION</span>
      <h1>Privacy notice.</h1>
      <p>Last updated: October 2026.</p>

      <h2>Who we are</h2>
      <p>
        {c.companyName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is the controller of the personal
        information you give us through this website.
        {c.companyNumber ? ` Company number ${c.companyNumber}.` : ''}
        {c.registeredOffice ? ` Registered office: ${c.registeredOffice}.` : ''}
        {c.icoNumber ? ` ICO registration number ${c.icoNumber}.` : ''} You can contact us at{' '}
        <a href={'mailto:' + c.email}>{c.email}</a>.
      </p>

      <h2>What we collect</h2>
      <p>
        When you send an enquiry we collect your name, email address, optional phone number and
        postcode, the message you write, the type of enquiry, any property you asked about, and the
        time and consent version. Please do not include bank details, identity documents or other
        sensitive financial information in a message.
      </p>

      <h2>Why we use it, and our legal basis</h2>
      <p>
        We use these details to reply to your enquiry and to arrange valuations, viewings or a
        conversation about Halal home finance. Our lawful bases are taking steps at your request
        before entering into a contract, and our legitimate interest in responding to people who
        contact us. We do not use enquiries for marketing unless you separately agree, and we do not
        sell your information.
      </p>

      <h2>Who we share it with</h2>
      <p>
        We use trusted service providers to run the website and send email: Render (website
        hosting), Neon (database storage) and Brevo (email delivery). They process data on our
        instructions. If your enquiry is about Halal home finance, we may need to share the details
        you provide with a regulated finance provider or adviser, and we will tell you before we do
        so.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep enquiries only as long as needed to deal with them and for a reasonable period
        afterwards, normally no longer than 24 months, unless the law requires us to keep records
        longer or you become a client.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask us to access, correct or delete your information, to restrict or object to its
        use, and to receive a copy of it. Contact us at <a href={'mailto:' + c.email}>{c.email}</a>.
        If you are unhappy with how we handle your data you can complain to the Information
        Commissioner&rsquo;s Office at <a href="https://ico.org.uk">ico.org.uk</a>.
      </p>

      <h2>Cookies and browser storage</h2>
      <p>
        We do not use advertising or analytics cookies. See our{' '}
        <a href="/cookies">cookie information</a>.
      </p>
    </main>
  );
}
