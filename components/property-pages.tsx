'use client';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useContext, useRef } from 'react';
import {
  LayoutGrid,
  List,
  Heart,
  BedDouble,
  Bath,
  Expand,
  Check,
  Leaf,
  Search,
  MapPin,
  ShieldCheck,
  Phone,
  Mail,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Choice, PropertyCard, CallToAction, SavedContext } from './property-platform';
import { formatPrice, isAvailable, statusLabel, type Property } from '@/lib/properties';
import { telHref, type ContactInfo } from '@/lib/site';

export function Intro({
  eyebrow,
  title,
  emphasis,
  text,
}: {
  eyebrow: string;
  title: string;
  emphasis: string;
  text?: string;
}) {
  return (
    <section className="page-intro container">
      <span className="eyebrow line">{eyebrow}</span>
      <h1>
        {title}
        <br />
        <em>{emphasis}</em>
      </h1>
      {text && <p>{text}</p>}
    </section>
  );
}
export function Catalog({
  shortlist = false,
  initial,
}: {
  shortlist?: boolean;
  initial: Property[];
}) {
  const params = useSearchParams();
  const router = useRouter();
  const { saved } = useContext(SavedContext);
  const items = initial;
  const [q, setQ] = useState(params.get('q') || '');
  const [tenure, setTenure] = useState(params.get('tenure') || 'all');
  const [beds, setBeds] = useState(params.get('beds') || 'any');
  const [price, setPrice] = useState(params.get('price') || 'any');
  const [type, setType] = useState(params.get('type') || 'all');
  const [sort, setSort] = useState('featured');
  const [view, setView] = useState<'list' | 'grid'>('list');
  useEffect(() => {
    setQ(params.get('q') || '');
    setTenure(params.get('tenure') || 'all');
    setBeds(params.get('beds') || 'any');
    setPrice(params.get('price') || 'any');
    setType(params.get('type') || 'all');
  }, [params]);
  const filtered = items.filter(
    (p) =>
      (!shortlist || saved.includes(p.id)) &&
      (tenure === 'all' || p.tenure === tenure) &&
      (!q ||
        (p.location + ' ' + p.name + ' ' + p.postcode)
          .toLowerCase()
          .includes(q.toLowerCase().trim())) &&
      (beds === 'any' || p.beds >= Number(beds)) &&
      (price === 'any' || p.price <= Number(price)) &&
      (type === 'all' || p.type === type),
  );
  if (sort === 'low') filtered.sort((a, b) => a.price - b.price);
  if (sort === 'high') filtered.sort((a, b) => b.price - a.price);
  if (sort === 'new') filtered.reverse();
  function apply() {
    router.replace(
      (shortlist ? '/shortlist' : '/properties') +
        '?' +
        new URLSearchParams({ q, tenure, beds, price, type }).toString(),
      { scroll: false },
    );
  }
  function reset() {
    setQ('');
    setTenure('all');
    setBeds('any');
    setPrice('any');
    setType('all');
    router.replace(shortlist ? '/shortlist' : '/properties', { scroll: false });
  }
  return (
    <main id="main" className="portal-catalog">
      <div className="container catalog-heading">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          {shortlist ? 'Saved homes' : 'Property search'}
        </nav>
        <span className="eyebrow">THE BLACKSTONE COLLECTION</span>
        <h1>
          {shortlist
            ? 'Your saved homes'
            : tenure === 'rent'
              ? 'Properties to rent'
              : tenure === 'buy'
                ? 'Properties for sale'
                : 'Find your next home'}
          {q.trim() && !shortlist ? <em> in {q.trim()}</em> : '.'}
        </h1>
        <p>
          {shortlist
            ? 'Your favourites, saved on this browser for your next visit.'
            : 'Choose your location, budget and the space you need.'}
        </p>
      </div>
      <section className="container catalog">
        <form
          className="catalog-filters"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <label className="location-input">
            <span>LOCATION</span>
            <div>
              <MapPin size={17} />
              <input
                aria-label="Search location"
                placeholder="Town, area or postcode"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </label>
          <Choice
            label="I'M LOOKING TO"
            value={tenure}
            onChange={(v) => {
              setTenure(v);
              setPrice('any');
            }}
            options={[
              ['all', 'Buy or rent'],
              ['buy', 'Buy a home'],
              ['rent', 'Rent a home'],
            ]}
          />
          <Choice
            label="BEDROOMS"
            value={beds}
            onChange={setBeds}
            options={['any', '1', '2', '3', '4', '5'].map((v) => [
              v,
              v === 'any' ? 'Any bedrooms' : v + '+ bedrooms',
            ])}
          />
          <Choice
            label="MAXIMUM PRICE"
            value={price}
            onChange={setPrice}
            options={(tenure === 'rent'
              ? ['any', '1000', '1500', '2000', '3000']
              : ['any', '250000', '500000', '750000', '1000000', '2000000']
            ).map((v) => [
              v,
              v === 'any'
                ? 'Any price'
                : '£' + Number(v).toLocaleString() + (tenure === 'rent' ? ' pcm' : ''),
            ])}
          />
          <Choice
            label="PROPERTY TYPE"
            value={type}
            onChange={setType}
            options={['all', 'Detached', 'Semi-detached', 'Terraced', 'Apartment', 'Bungalow'].map(
              (v) => [v, v === 'all' ? 'Any type' : v],
            )}
          />
          <button className="button">
            <Search size={16} />
            Search
          </button>
        </form>
        <div className="results-bar">
          <div className="view-switch" role="group" aria-label="Property view">
            <button
              aria-label="List view"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              <List size={18} />
            </button>
            <button
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
          <p role="status">
            {`${filtered.length} ${filtered.length === 1 ? 'property' : 'properties'} to discover`}
          </p>
          <button className="text-link" onClick={reset}>
            Reset filters
          </button>
          <Choice
            label="SORT BY"
            value={sort}
            onChange={setSort}
            options={[
              ['featured', 'Featured first'],
              ['low', 'Price: low to high'],
              ['high', 'Price: high to low'],
            ]}
          />
        </div>
        {filtered.length ? (
          <div className={view === 'list' ? 'property-results-list' : 'property-grid'}>
            {filtered.map((p) => (
              <PropertyCard key={p.id} property={p} detailed={view === 'list'} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Heart size={32} />
            <h2>{shortlist ? 'Your collection starts here.' : 'A different search, perhaps?'}</h2>
            <p>
              {shortlist
                ? 'Tap the heart on a property to keep it here.'
                : 'Try a nearby area, fewer bedrooms or a wider price range.'}
            </p>
            {shortlist ? (
              <Link className="button" href="/properties">
                Discover properties
              </Link>
            ) : (
              <button className="button" onClick={reset}>
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>
      <CallToAction />
    </main>
  );
}

export function EnquiryForm({
  kind = 'general',
  propertyId = '',
  heading = 'Let’s start a conversation.',
}: {
  kind?: string;
  propertyId?: string;
  heading?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [consent, setConsent] = useState(false);
  const requestId = useRef('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!consent) {
      setError('Please agree to being contacted about your enquiry.');
      return;
    }
    const data = new FormData(e.currentTarget);
    requestId.current ||= crypto.randomUUID();
    setBusy(true);
    try {
      const r = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          propertyId,
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone') || '',
          postcode: data.get('postcode') || '',
          message: data.get('message'),
          website: data.get('website') || '',
          consent: true,
          requestId: requestId.current,
        }),
      });
      const result = (await r.json()) as { error: string; reference: string };
      if (!r.ok) throw Error(result.error || 'Unable to save your request.');
      setReference(result.reference);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save your request. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="enquiry-card" id="enquiry">
      <span className="eyebrow">A PERSONAL CONVERSATION</span>
      <h2>{heading}</h2>
      {reference ? (
        <div className="success-state" role="status">
          <Check size={34} />
          <h3>Your enquiry is saved.</h3>
          <p>
            Reference <strong>{reference}</strong>
          </p>
          <p>
            Keep this reference for your conversation with the team. This is an enquiry, not a
            confirmed appointment or finance application.
          </p>
          <Link href="/" className="text-link">
            Return home
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="enquiry-form">
          <div className="form-grid">
            <label>
              Full name
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                placeholder="Your full name"
              />
            </label>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={200}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Phone number <small>(optional)</small>
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={30}
                placeholder="Your contact number"
              />
            </label>
            <label>
              Postcode {kind === 'valuation' ? '' : <small>(optional)</small>}
              <input
                name="postcode"
                autoComplete="postal-code"
                required={kind === 'valuation'}
                maxLength={20}
                placeholder="Property or search area"
              />
            </label>
          </div>
          <label>
            {kind === 'halal-mortgage'
              ? 'How can we help with your Halal mortgage enquiry?'
              : 'Tell us a little more'}
            <textarea
              name="message"
              required
              minLength={10}
              maxLength={3000}
              rows={4}
              placeholder={
                kind === 'valuation'
                  ? 'Your property type, number of bedrooms and preferred time for a conversation.'
                  : kind === 'halal-mortgage'
                    ? 'Tell us whether you are buying your first home, moving home or exploring your options. Please do not include financial documents or account details.'
                    : 'What are you looking for, and when would you like to move?'
              }
            />
          </label>
          <label className="honeypot" aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <div className="consent-row">
            <Checkbox
              id={'consent-' + kind}
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
            />
            <label htmlFor={'consent-' + kind}>
              I agree to be contacted about this enquiry. Read our{' '}
              <Link href="/privacy">privacy information</Link>.
            </label>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button" type="submit" disabled={busy}>
            {busy ? 'Saving your enquiry…' : 'Send enquiry'}
          </button>
          <p className="form-footnote">
            Your request is securely saved for the team. Please avoid sharing sensitive financial
            information.
          </p>
        </form>
      )}
    </div>
  );
}

export function PropertyDetail({
  property: p,
  contact,
}: {
  property: Property;
  contact: ContactInfo;
}) {
  const { saved, toggle } = useContext(SavedContext);
  const [gallery, setGallery] = useState(false);
  const [index, setIndex] = useState(0);
  return (
    <main id="main" className="detail-page">
      <div className="container">
        <div className="breadcrumbs">
          <Link href={'/properties?tenure=' + p.tenure}>
            ← {p.tenure === 'rent' ? 'Properties to rent' : 'Properties for sale'}
          </Link>
          <span>/</span>
          {p.name}
        </div>
        <div className="detail-title">
          <div>
            <span className="eyebrow">
              {p.location} · {p.postcode}
            </span>
            <h1>{p.name}</h1>
          </div>
          <div>
            <div className="detail-price">{formatPrice(p)}</div>
            <span>
              {statusLabel(p.status, p.tenure)} · {p.type}
            </span>
          </div>
        </div>
        <div className={'detail-gallery ' + (p.images.length > 1 ? 'gallery-mosaic' : '')}>
          <img
            src={p.image}
            alt={p.sample ? p.name + ' — illustrative property' : p.name}
            width={1200}
            height={800}
            fetchPriority="high"
          />
          {p.images.length > 1 && (
            <div className="gallery-preview">
              {p.images.slice(1, 3).map((src, i) => (
                <button
                  key={src + i}
                  aria-label={'View photo ' + (i + 2)}
                  onClick={() => {
                    setIndex(i + 1);
                    setGallery(true);
                  }}
                >
                  <img src={src} alt={p.name + ' photo ' + (i + 2)} loading="lazy" />
                </button>
              ))}
            </div>
          )}
          {!isAvailable(p.status) && (
            <span className={'status-badge status-' + p.status}>
              {statusLabel(p.status, p.tenure)}
            </span>
          )}
          <button className="button gallery-button" onClick={() => setGallery(true)}>
            <Expand size={16} />
            View {p.images.length > 1 ? 'gallery' : 'image'}
          </button>
          <button
            className="save-button"
            aria-label="Save property"
            aria-pressed={saved.includes(p.id)}
            onClick={() => toggle(p.id)}
          >
            <Heart size={20} fill={saved.includes(p.id) ? 'currentColor' : 'none'} />
          </button>
        </div>
        {p.sample && (
          <p className="sample-alert">
            Illustrative property: photography, price and details are examples, not a live listing.
            You can enquire about similar homes.
          </p>
        )}
        <nav className="detail-navigation" aria-label="Property information">
          <a href="#overview">Overview</a>
          <a href="#key-information">Key information</a>
          <a href="#features">Features</a>
          <a href="#property-enquiry">
            {p.sample ? 'Enquire about similar homes' : 'Arrange a viewing'} →
          </a>
        </nav>
        <div className="detail-columns">
          <div>
            <div className="detail-specs">
              <span>
                <BedDouble />
                {p.beds} bedrooms
              </span>
              <span>
                <Bath />
                {p.baths} bathrooms
              </span>
              <span>
                <Expand />
                {p.area.toLocaleString()} sq ft
              </span>
            </div>
            <section className="detail-section" id="overview">
              <span className="eyebrow">A CLOSER LOOK</span>
              <h2>
                A place to imagine
                <br />
                <em>your next chapter.</em>
              </h2>
              <p>{p.description}</p>
            </section>
            <section className="detail-section" id="key-information">
              <h3>Key information</h3>
              <dl className="fact-grid">
                {[
                  ['Property type', p.type],
                  p.tenure === 'buy' && p.tenureType
                    ? ['Tenure', p.tenureType.replace(/-/g, ' ')]
                    : null,
                  p.epc ? ['EPC rating', p.epc] : null,
                  p.councilTaxBand ? ['Council tax band', p.councilTaxBand] : null,
                  p.tenure === 'rent' && p.deposit
                    ? ['Deposit', '£' + p.deposit.toLocaleString('en-GB')]
                    : null,
                  p.tenure === 'rent' && p.availableFrom
                    ? [
                        'Available from',
                        new Date(p.availableFrom).toLocaleDateString('en-GB', {
                          dateStyle: 'long',
                        }),
                      ]
                    : null,
                  p.tenure === 'rent' && p.furnished
                    ? ['Furnishing', p.furnished.replace(/-/g, ' ')]
                    : null,
                ]
                  .filter((row): row is string[] => !!row)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>
              {p.floorplan && (
                <a
                  className="text-link"
                  href={p.floorplan}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View floorplan
                </a>
              )}
            </section>
            <section className="detail-section" id="features">
              <h3>Key features</h3>
              <div className="feature-list">
                {p.features.map((f) => (
                  <span key={f}>
                    <Check size={17} />
                    {f}
                  </span>
                ))}
              </div>
            </section>
            {(contact.phone || contact.whatsapp) && (
              <div className="detail-contact">
                {contact.phone && (
                  <a className="button secondary" href={telHref(contact.phone)}>
                    Call {contact.phone}
                  </a>
                )}
                {contact.whatsapp && (
                  <a
                    className="button secondary"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent('Hello, I am interested in ' + p.name + ' (' + p.postcode + ').')}`}
                  >
                    WhatsApp us
                  </a>
                )}
              </div>
            )}
            <div className="finance-callout">
              <Leaf />
              <div>
                <h3>Looking for Halal home finance?</h3>
                <p>Explore our dedicated Halal mortgage enquiry service.</p>
                <Link href="/halal-mortgages" className="text-link">
                  Halal mortgages
                </Link>
              </div>
            </div>
          </div>
          <div id="property-enquiry" className="detail-enquiry">
            <EnquiryForm
              kind="viewing"
              propertyId={p.id}
              heading={p.sample ? 'Enquire about similar homes.' : 'Arrange your viewing.'}
            />
          </div>
        </div>
      </div>
      <Dialog open={gallery} onOpenChange={setGallery}>
        <DialogContent className="gallery-modal">
          <DialogTitle>{p.name}</DialogTitle>
          <DialogDescription>
            {p.sample ? 'Illustrative property photography' : 'Property gallery'} · {index + 1} of{' '}
            {p.images.length}
          </DialogDescription>
          <img src={p.images[index]} alt={p.name + ' image ' + (index + 1)} />
          <div className="gallery-controls">
            <button
              className="button secondary"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              Previous
            </button>
            <button
              className="button secondary"
              disabled={index === p.images.length - 1}
              onClick={() => setIndex(index + 1)}
            >
              Next
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

const serviceContent: Record<
  string,
  {
    label: string;
    title: string;
    emphasis: string;
    intro: string;
    image: string;
    cta: string;
    href: string;
    sections: [string, string][];
  }
> = {
  selling: {
    label: 'SELL WITH BLACKSTONE',
    title: 'A remarkable home.',
    emphasis: 'A considered sale.',
    intro:
      'Your home deserves more than a listing. Thoughtful presentation, a clear plan and personal support help make your next move feel right.',
    image: '/images/hero.webp',
    cta: 'Book a property valuation',
    href: '/valuation',
    sections: [
      [
        'A personal valuation',
        'Start with a conversation about your property, your plans and what matters to you.',
      ],
      [
        'Presentation with purpose',
        'Considered photography, compelling details and a clear presentation of what makes your home special.',
      ],
      [
        'Support throughout your move',
        'Stay informed as interest develops, viewings take place and your next chapter comes closer.',
      ],
    ],
  },
  landlords: {
    label: 'LETTINGS & PROPERTY MANAGEMENT',
    title: 'Your investment.',
    emphasis: 'Personally cared for.',
    intro:
      'A property service built around the way you want to let. Talk to us about finding tenants, ongoing management and the support your property needs.',
    image: '/images/interior.webp',
    cta: 'Discuss your property',
    href: '/contact?kind=landlord',
    sections: [
      [
        'Find your next tenant',
        'Present your property thoughtfully and discuss the right letting approach for your plans.',
      ],
      [
        'Choose the support you need',
        'From tenant-finding to ongoing management, agree a service tailored to your property.',
      ],
      [
        'Keep the conversation open',
        'Clear communication and an attentive approach to the everyday needs of your property.',
      ],
    ],
  },
  about: {
    label: 'BLACKSTONE UK PROPERTY LTD',
    title: 'Built around property.',
    emphasis: 'Centred on people.',
    intro:
      'We believe every move deserves care, clarity and a personal connection. That is the thinking behind Blackstone Uk property Ltd.',
    image: '/images/hero.webp',
    cta: 'Meet your next property partner',
    href: '/contact',
    sections: [
      [
        'Listen first',
        'Your plans shape our approach. We start by understanding what matters to you.',
      ],
      [
        'Consider every detail',
        'From presentation to communication, the small details create a better experience.',
      ],
      [
        'Build lasting connections',
        'Property is about more than a transaction. It is about the people and possibilities behind it.',
      ],
    ],
  },
};
export function ServicePage({ type }: { type: string }) {
  const s = serviceContent[type];
  return (
    <main id="main">
      <section className="container service-hero">
        <div>
          <span className="eyebrow line">{s.label}</span>
          <h1>
            {s.title}
            <br />
            <em>{s.emphasis}</em>
          </h1>
          <p>{s.intro}</p>
          <Link href={s.href} className="button">
            {s.cta}
          </Link>
        </div>
        <img src={s.image} alt="A thoughtfully presented home" />
      </section>
      <section className="container section">
        <div className="steps-grid">
          {s.sections.map(([h, p], i) => (
            <div className="reveal" key={h}>
              <span className="step-number">0{i + 1}</span>
              <h3>{h}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>
      <CallToAction />
    </main>
  );
}

export function HalalPage({ contact }: { contact: ContactInfo }) {
  return (
    <main id="main">
      <section className="container service-hero halal-hero">
        <div>
          <span className="eyebrow line">HALAL MORTGAGES ONLY</span>
          <h1>
            A place to call home.
            <br />
            <em>Values to stand by.</em>
          </h1>
          <p>
            Your home-finance journey should reflect what matters to you. Our mortgage enquiries are
            exclusively for Halal home finance.
          </p>
          <a className="button" href="#enquiry">
            Start your Halal mortgage enquiry
          </a>
          <div className="halal-promise">
            <Leaf size={20} />A dedicated conversation. A considered next step.
          </div>
        </div>
        <div className="halal-art">
          <img src="/images/hero.webp" alt="Welcoming British home and garden" />
          <div className="halal-art-note">
            <Leaf size={28} />
            <h3>
              Home.
              <br />
              <em>On your terms.</em>
            </h3>
          </div>
        </div>
      </section>
      <section className="container section finance-grid">
        <div>
          <span className="eyebrow line">LET'S UNDERSTAND YOUR PLANS</span>
          <h2>
            Your questions.
            <br />
            <em>A personal conversation.</em>
          </h2>
          <p className="lead-copy">
            Whether you are exploring your first home or planning your next move, tell us what you
            need. The team can discuss the appropriate next step for your enquiry.
          </p>
          <Accordion type="single" collapsible className="faqs">
            <AccordionItem value="one">
              <AccordionTrigger>Do you offer conventional mortgages?</AccordionTrigger>
              <AccordionContent>
                No. Blackstone Uk property Ltd only accepts Halal mortgage enquiries.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="two">
              <AccordionTrigger>What information should I provide?</AccordionTrigger>
              <AccordionContent>
                Your name, contact details and a short description of your plans are enough to
                start. Please do not upload bank statements, identity documents or other sensitive
                financial information.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="three">
              <AccordionTrigger>Does submitting this form apply for finance?</AccordionTrigger>
              <AccordionContent>
                No. This is an initial enquiry only. It is not a finance application, quotation,
                approval or recommendation of a particular product.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className="finance-note">
            <ShieldCheck size={22} />
            <p>
              Provider, product terms, eligibility and any fees must be confirmed before you
              proceed. No approval or Sharia certification of a specific product is implied by this
              page.
            </p>
            {contact.financeStatement && <p>{contact.financeStatement}</p>}
          </div>
        </div>
        <EnquiryForm kind="halal-mortgage" heading="Let's talk Halal home finance." />
      </section>
    </main>
  );
}
export function ContactPage({
  valuation = false,
  contact,
}: {
  valuation?: boolean;
  contact: ContactInfo;
}) {
  const params = useSearchParams();
  const kind = valuation ? 'valuation' : params.get('kind') === 'landlord' ? 'landlord' : 'general';
  return (
    <main id="main">
      <Intro
        eyebrow={valuation ? 'YOUR PROPERTY. A FRESH PERSPECTIVE.' : 'CONTACT BLACKSTONE'}
        title={valuation ? 'What could your' : 'A conversation today.'}
        emphasis={valuation ? 'next chapter look like?' : 'A new chapter tomorrow.'}
        text={
          valuation
            ? 'Tell us about your home and your plans. Request a personal property valuation with Blackstone Uk property Ltd.'
            : 'Buying, selling, renting or letting — tell us what you have in mind, and let’s take the next step together.'
        }
      />
      <section className="container contact-layout">
        <div className="contact-editorial">
          <img src="/images/interior.webp" alt="Elegant home interior" />
          <div>
            <span className="eyebrow">HERE FOR YOUR NEXT MOVE</span>
            <h2>
              A personal service.
              <br />
              <em>From the very start.</em>
            </h2>
            <p>
              We aim to reply to every enquiry promptly. An appointment is confirmed only once you
              have agreed a time with the team.
            </p>
            <ul className="contact-list">
              {contact.phone && (
                <li>
                  <Phone size={16} /> <a href={telHref(contact.phone)}>{contact.phone}</a>
                </li>
              )}
              <li>
                <Mail size={16} /> <a href={'mailto:' + contact.email}>{contact.email}</a>
              </li>
              {contact.address && (
                <li>
                  <MapPin size={16} /> {contact.address}
                </li>
              )}
              {contact.hours && <li>{contact.hours}</li>}
            </ul>
            <Link href="/halal-mortgages" className="text-link">
              Enquiring about Halal mortgages?
            </Link>
          </div>
        </div>
        <EnquiryForm
          kind={kind}
          heading={valuation ? 'Tell us about your property.' : 'How can we help?'}
        />
      </section>
    </main>
  );
}
