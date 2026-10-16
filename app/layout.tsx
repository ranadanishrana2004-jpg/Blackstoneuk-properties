import type { Metadata, Viewport } from 'next';
import './globals.css';
import './pages.css';
import './brand-motion.css';
import './portal.css';
import './referral.css';
import { Shell } from '@/components/property-platform';
import { COMPANY_NAME, getContact, siteUrl } from '@/lib/site';

const description =
  'Distinctive homes to buy and rent, personal valuations and Halal mortgage enquiries. Blackstone UK Properties Ltd: a more personal approach to property.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${COMPANY_NAME} | A place to belong`,
    template: `%s | ${COMPANY_NAME}`,
  },
  description,
  applicationName: COMPANY_NAME,
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    siteName: COMPANY_NAME,
    locale: 'en_GB',
    title: `${COMPANY_NAME} | A place to belong`,
    description,
    images: [
      { url: '/images/hero.webp', width: 1200, height: 800, alt: 'A welcoming British home' },
    ],
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8f4' },
    { media: '(prefers-color-scheme: dark)', color: '#121212' },
  ],
};

// Applies the saved theme before first paint so there is no light/dark flash.
const themeScript = `try{if(localStorage.getItem('bsuk-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function Layout({ children }: { children: React.ReactNode }) {
  const contact = getContact();
  const organisation = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: COMPANY_NAME,
    legalName: COMPANY_NAME,
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'Companies House company number',
      value: contact.companyNumber,
    },
    url: siteUrl(),
    email: contact.email,
    ...(contact.phone ? { telephone: contact.phone } : {}),
    ...(contact.address
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: contact.address,
            addressCountry: 'GB',
          },
        }
      : {}),
    areaServed: 'GB',
  };
  return (
    <html lang="en-GB" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organisation).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      <body>
        <Shell contact={contact}>{children}</Shell>
      </body>
    </html>
  );
}
