import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PropertyDetail } from '@/components/property-pages';
import { formatPrice } from '@/lib/properties';
import { propertyBySlug } from '@/lib/server';
import { COMPANY_NAME, getContact, siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await propertyBySlug(slug);
    if (!p) return { title: 'Property not found', robots: { index: false } };
    const description =
      `${p.beds} bedroom ${p.type.toLowerCase()} in ${p.location}, ${formatPrice(p)}. ${p.description}`.slice(
        0,
        200,
      );
    return {
      title: `${p.name}, ${p.location}`,
      ...(p.sample ? { robots: { index: false, follow: true } } : {}),
      description,
      alternates: { canonical: `/properties/${p.slug}` },
      openGraph: { title: p.name, description, type: 'website', images: [{ url: p.image }] },
    };
  } catch {
    return { title: 'Property collection' };
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  let property;
  try {
    property = await propertyBySlug(slug);
  } catch (error) {
    console.error('Property page failed', error);
    return (
      <main id="main" className="container section">
        <h1>Temporarily unavailable.</h1>
        <p>Please try again shortly.</p>
      </main>
    );
  }
  if (!property) notFound();

  const absolute = (src: string) => (src.startsWith('http') ? src : siteUrl() + src);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.name,
    url: `${siteUrl()}/properties/${property.slug}`,
    description: property.description,
    image: property.images.map(absolute),
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: 'GBP',
      availability:
        property.status === 'available'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
      seller: { '@type': 'RealEstateAgent', name: COMPANY_NAME },
    },
    about: {
      '@type': 'Residence',
      address: {
        '@type': 'PostalAddress',
        addressLocality: property.location,
        postalCode: property.postcode,
        addressCountry: 'GB',
      },
      numberOfBedrooms: property.beds,
      numberOfBathroomsTotal: property.baths,
      floorSize: { '@type': 'QuantitativeValue', value: property.area, unitCode: 'FTK' },
    },
  };

  return (
    <>
      {!property.sample && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      <PropertyDetail property={property} contact={getContact()} />
    </>
  );
}
