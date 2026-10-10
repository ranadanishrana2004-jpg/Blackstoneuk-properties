'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, createContext, useContext } from 'react';
import {
  Moon,
  Sun,
  Menu,
  Heart,
  Search,
  MapPin,
  BedDouble,
  Bath,
  House,
  KeyRound,
  Leaf,
  ShieldCheck,
  Plus,
  Check,
  Building2,
  Phone,
  MessageCircle,
  Mail,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { formatPrice, isAvailable, statusLabel, type Property } from '@/lib/properties';
import { telHref, type ContactInfo } from '@/lib/site';
import { BrandMark, BrandMotion } from '@/components/brand-motion';
export const SavedContext = createContext<{ saved: string[]; toggle: (id: string) => void }>({
  saved: [],
  toggle: () => {},
});
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Blackstone Uk property Ltd home">
      <span className="client-brand-badge">
        <BrandMark />
      </span>
      <span className="client-brand-type">
        <span className="client-brand-name">BLACKSTONE</span>
        <small>UK PROPERTY LTD</small>
      </span>
    </Link>
  );
}
export function Shell({ children, contact }: { children: React.ReactNode; contact: ContactInfo }) {
  const path = usePathname();
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => {
    // The class is already applied by an inline script in <head>, so no flash of the wrong theme.
    setDark(document.documentElement.classList.contains('dark'));
    try {
      setSaved(JSON.parse(localStorage.getItem('bsuk-shortlist') || '[]'));
    } catch {}
  }, []);
  useEffect(() => {
    setMenu(false);
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.07 },
    );
    document.querySelectorAll('.reveal').forEach((e) => observer.observe(e));
    return () => observer.disconnect();
  }, [path]);
  const toggle = (id: string) =>
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      try {
        localStorage.setItem('bsuk-shortlist', JSON.stringify(next));
      } catch {}
      toast(next.includes(id) ? 'Added to your shortlist' : 'Removed from your shortlist');
      return next;
    });
  const links = [
    ['Buy', '/properties?tenure=buy'],
    ['Rent', '/properties?tenure=rent'],
    ['Sell', '/selling'],
    ['Landlords', '/landlords'],
    ['Halal mortgages', '/halal-mortgages'],
    ['Stamp duty', '/stamp-duty'],
    ['About', '/about'],
  ];
  return (
    <SavedContext.Provider value={{ saved, toggle }}>
      <BrandMotion />
      <a href="#main" className="skip">
        Skip to content
      </a>
      <div className="top-strip">
        <span>A MORE PERSONAL APPROACH TO PROPERTY</span>
        <span>
          SALES <i /> LETTINGS <i /> HALAL MORTGAGES
        </span>
      </div>
      <header className="site-header">
        <div className="container nav-row">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            {links.map(([name, url]) => (
              <Link key={name} href={url} className={path === url ? 'active' : ''}>
                {name}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            <button
              className="icon-button"
              aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
              onClick={() => {
                setDark(!dark);
                document.documentElement.classList.toggle('dark', !dark);
                try {
                  localStorage.setItem('bsuk-theme', !dark ? 'dark' : 'light');
                } catch {}
              }}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              className="icon-button shortlist-link"
              href="/shortlist"
              aria-label={`Shortlist, ${saved.length} properties`}
            >
              <Heart size={18} />
              {saved.length > 0 && <span>{saved.length}</span>}
            </Link>
            <Link className="button small nav-valuation" href="/valuation">
              Book a valuation
            </Link>
            <Sheet open={menu} onOpenChange={setMenu}>
              <SheetTrigger asChild>
                <button className="icon-button mobile-menu" aria-label="Open menu">
                  <Menu size={20} />
                </button>
              </SheetTrigger>
              <SheetContent className="mobile-sheet">
                <SheetTitle>Explore Blackstone</SheetTitle>
                <nav aria-label="Mobile navigation">
                  {links.map(([name, url]) => (
                    <Link key={name} href={url} onClick={() => setMenu(false)}>
                      {name}
                    </Link>
                  ))}
                  <Link href="/valuation">Book a valuation</Link>
                  <Link href="/shortlist">Your shortlist</Link>
                  <Link href="/contact">Contact us</Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <div key={path} className="page-transition">
        {children}
      </div>
      <footer>
        <div className="container footer-grid">
          <div>
            <Brand />
            <p>
              A place to belong.
              <br />A partner for every chapter.
            </p>
            <div className="footer-detail">{contact.companyName}</div>
            <address className="footer-contact">
              {contact.phone && (
                <a href={telHref(contact.phone)}>
                  <Phone size={14} /> {contact.phone}
                </a>
              )}
              <a href={'mailto:' + contact.email}>
                <Mail size={14} /> {contact.email}
              </a>
              {contact.address && (
                <span>
                  <MapPin size={14} /> {contact.address}
                </span>
              )}
              {contact.hours && <span>{contact.hours}</span>}
            </address>
          </div>
          <div>
            <h3>Your next move</h3>
            <Link href="/properties?tenure=buy">Find a home to buy</Link>
            <Link href="/properties?tenure=rent">Find a home to rent</Link>
            <Link href="/selling">Sell your property</Link>
            <Link href="/landlords">Let your property</Link>
          </div>
          <div>
            <h3>Here to help</h3>
            <Link href="/halal-mortgages">Halal mortgages</Link>
            <Link href="/valuation">Request a valuation</Link>
            <Link href="/about">Our approach</Link>
            <Link href="/contact">Contact the team</Link>
            <Link href="/stamp-duty">Stamp duty calculator</Link>
          </div>
          <div className="footer-invite">
            <span className="eyebrow">LET'S TALK PROPERTY</span>
            <h3>
              Your next chapter
              <br />
              <em>starts with a conversation.</em>
            </h3>
            <Link className="text-link" href="/contact">
              Make an enquiry
            </Link>
          </div>
        </div>
        <div className="container footer-base">
          <span>
            © {new Date().getFullYear()} {contact.companyName}
          </span>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/cookies">Cookies</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/manage">Team access</Link>
          </div>
        </div>
        <div className="container footer-legal">
          {[
            contact.companyNumber &&
              `Registered in England & Wales, company number ${contact.companyNumber}.`,
            contact.registeredOffice && `Registered office: ${contact.registeredOffice}.`,
            contact.vatNumber && `VAT number ${contact.vatNumber}.`,
            contact.icoNumber && `ICO registration ${contact.icoNumber}.`,
            contact.redressScheme && `Redress scheme: ${contact.redressScheme}.`,
            contact.cmpScheme && `Client money protection: ${contact.cmpScheme}.`,
            contact.financeStatement,
          ]
            .filter(Boolean)
            .map((line) => (
              <p key={String(line)}>{line}</p>
            ))}
        </div>
      </footer>
      {(contact.phone || contact.whatsapp) && (
        <div className="quick-contact" aria-label="Contact us quickly">
          {contact.whatsapp && (
            <a
              href={'https://wa.me/' + contact.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
            >
              <MessageCircle size={20} />
              <span>WhatsApp</span>
            </a>
          )}
          {contact.phone && (
            <a href={telHref(contact.phone)} aria-label={'Call ' + contact.phone}>
              <Phone size={20} />
              <span>Call</span>
            </a>
          )}
        </div>
      )}
      <Toaster position="bottom-right" />
    </SavedContext.Provider>
  );
}
export function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="choice">
      <span>{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([v, t]) => (
            <SelectItem key={v} value={v}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
export function SearchBox() {
  const router = useRouter();
  const [tenure, setTenure] = useState('buy');
  const [location, setLocation] = useState('');
  const [beds, setBeds] = useState('any');
  return (
    <div className="home-search">
      <Tabs value={tenure} onValueChange={setTenure}>
        <TabsList className="search-tabs">
          <TabsTrigger value="buy">Buy a home</TabsTrigger>
          <TabsTrigger value="rent">Rent a home</TabsTrigger>
        </TabsList>
        <TabsContent value={tenure}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              router.push(
                '/properties?' + new URLSearchParams({ tenure, q: location, beds }).toString(),
              );
            }}
            className="search-form"
          >
            <label className="location-input">
              <span>YOUR LOCATION</span>
              <div>
                <MapPin size={18} />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Town, area or postcode"
                  aria-label="Town, area or postcode"
                />
              </div>
            </label>
            <Choice
              label="BEDROOMS"
              value={beds}
              onChange={setBeds}
              options={['any', '1', '2', '3', '4', '5'].map((v) => [
                v,
                v === 'any' ? 'Any bedrooms' : v + '+ bedrooms',
              ])}
            />
            <button className="button" type="submit">
              <Search size={17} />
              Find a property
            </button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export function PropertyCard({ property: p }: { property: Property }) {
  const { saved, toggle } = useContext(SavedContext);
  return (
    <article className="property-card">
      <div className="property-image">
        <Link href={'/properties/' + p.slug} aria-label={'View ' + p.name}>
          <img
            src={p.image}
            alt={p.sample ? p.name + ' — illustrative property' : p.name}
            width={800}
            height={600}
            loading="lazy"
            decoding="async"
          />
        </Link>
        <span className="property-tag">{p.tag}</span>
        {!isAvailable(p.status) && (
          <span className={'status-badge status-' + p.status}>
            {statusLabel(p.status, p.tenure)}
          </span>
        )}
        <button
          className={'save-button ' + (saved.includes(p.id) ? 'is-saved' : '')}
          aria-label={(saved.includes(p.id) ? 'Remove ' : 'Save ') + p.name}
          aria-pressed={saved.includes(p.id)}
          onClick={() => toggle(p.id)}
        >
          <Heart size={18} fill={saved.includes(p.id) ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="property-info">
        <div className="location">
          <MapPin size={13} />
          {p.location}
        </div>
        <Link href={'/properties/' + p.slug}>
          <h3>{p.name}</h3>
        </Link>
        <div className="property-spec">
          <span>
            <BedDouble size={16} />
            {p.beds} beds
          </span>
          <span>
            <Bath size={16} />
            {p.baths} baths
          </span>
          <span>{p.type}</span>
        </div>
        <div className="property-bottom">
          <strong>{formatPrice(p)}</strong>
          <Link
            href={'/properties/' + p.slug}
            className="round-link"
            aria-label={'Explore ' + p.name}
          >
            <Plus size={18} />
          </Link>
        </div>
        {p.sample && (
          <small className="sample-note">Illustrative property · not a live listing</small>
        )}
      </div>
    </article>
  );
}
const services = [
  {
    title: 'Sell with confidence.',
    text: 'A considered approach to presenting your home and supporting your next move.',
    image: '/images/victorian.webp',
    url: '/selling',
    label: 'Selling',
    icon: House,
  },
  {
    title: 'Find your place.',
    text: 'From characterful homes to contemporary spaces. Discover what feels right.',
    image: '/images/country.webp',
    url: '/properties?tenure=buy',
    label: 'Buying',
    icon: Search,
  },
  {
    title: 'Make yourself at home.',
    text: 'Explore places to rent, with a personal approach to finding your next address.',
    image: '/images/apartment.webp',
    url: '/properties?tenure=rent',
    label: 'Renting',
    icon: KeyRound,
  },
  {
    title: 'Your property. Our care.',
    text: 'Letting and property management shaped around you and your investment.',
    image: '/images/interior.webp',
    url: '/landlords',
    label: 'Landlords',
    icon: Building2,
  },
];
export function Home({ featured }: { featured: Property[] }) {
  return (
    <main id="main">
      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow line">EXCEPTIONAL HOMES. PERSONAL CONNECTIONS.</div>
          <h1>
            More than a home.
            <br />
            Your <em>next chapter.</em>
          </h1>
          <p>
            Some places just feel right. Discover thoughtfully selected homes and a more personal
            property experience.
          </p>
          <div className="hero-buttons">
            <Link className="button" href="/properties">
              Explore our collection
            </Link>
            <Link className="text-link" href="/selling">
              Thinking of selling?
            </Link>
          </div>
          <div className="hero-proof">
            <span className="tiny-monogram">B</span>
            <span>
              Distinctive properties.
              <br />
              <b>Thoughtfully matched.</b>
            </span>
          </div>
        </div>
        <div className="hero-art">
          <img
            src="/images/hero.webp"
            alt="Beautiful British home with a landscaped garden — illustrative brand image"
            fetchPriority="high"
          />
          <div className="hero-image-shade" />
          <div className="image-frame" />
          <div className="image-story">
            <span>THE BLACKSTONE PERSPECTIVE</span>
            <h2>
              A place to live.
              <br />
              <em>A place to belong.</em>
            </h2>
          </div>
          <div className="hero-seal">
            <Leaf size={22} />
            <span>
              ROOTED IN
              <br />
              WHAT MATTERS
            </span>
          </div>
        </div>
        <span className="hero-watermark" aria-hidden="true">
          BLACKSTONE
        </span>
      </section>
      <div className="container search-container">
        <SearchBox />
      </div>
      <div className="container promises">
        <span>
          <House />
          Homes with character
        </span>
        <span>
          <ShieldCheck />
          Care at every step
        </span>
        <span>
          <Leaf />
          Halal mortgage enquiries
        </span>
        <span>
          <KeyRound />
          Your next chapter
        </span>
      </div>
      <section className="section container" id="services">
        <div className="section-heading reveal">
          <div>
            <span className="eyebrow line">MADE FOR YOUR NEXT MOVE</span>
            <h2>
              Every chapter.
              <br />
              <em>Expertly considered.</em>
            </h2>
          </div>
          <p>
            Buying, selling, renting or letting.
            <br />A complete property service, with you at its heart.
          </p>
        </div>
        <div className="services-grid">
          {services.map((s, i) => (
            <Link
              className="service-card reveal"
              href={s.url}
              key={s.label}
              style={{ '--delay': i * 70 + 'ms' } as React.CSSProperties}
            >
              <div className="service-photo">
                <img src={s.image} alt={s.label + ' with Blackstone'} loading="lazy" />
                <span className="service-icon">
                  <s.icon size={20} />
                </span>
              </div>
              <div className="service-copy">
                <span className="eyebrow">
                  0{i + 1} / {s.label}
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <span className="service-link">
                  Explore {s.label.toLowerCase()}
                  <span className="service-plus">
                    <Plus size={17} />
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
        <Link className="halal-banner reveal" href="/halal-mortgages">
          <div className="halal-symbol">
            <Leaf size={34} />
          </div>
          <div>
            <span className="eyebrow">HOME FINANCE. ALIGNED WITH YOUR VALUES.</span>
            <h3>
              Halal mortgages. <em>A considered way home.</em>
            </h3>
            <p>
              We only offer Halal mortgage enquiries. Start a conversation about your home-finance
              needs.
            </p>
          </div>
          <span className="button green-light">Explore Halal mortgages</span>
        </Link>
      </section>
      <section className="collection-section">
        <div className="container section">
          <div className="section-heading reveal">
            <div>
              <span className="eyebrow line">THE PROPERTY COLLECTION</span>
              <h2>
                Some places are
                <br />
                <em>worth discovering.</em>
              </h2>
            </div>
            <Link className="text-link" href="/properties">
              Explore all properties
            </Link>
          </div>
          <div className="property-grid">
            {featured.length ? (
              featured.map((p) => <PropertyCard key={p.id} property={p} />)
            ) : (
              <p>
                New properties are being added.{' '}
                <Link href="/contact">Tell us what you are looking for</Link> and we will be in
                touch as soon as something suitable is available.
              </p>
            )}
          </div>
        </div>
      </section>
      <section className="section container about-split">
        <div className="about-image reveal">
          <img src="/images/interior.webp" alt="A beautifully considered interior" loading="lazy" />
          <div className="floating-note">
            <span className="eyebrow">THE DIFFERENCE IS PERSONAL</span>
            <p>
              Good property.
              <br />
              <em>Great relationships.</em>
            </p>
          </div>
        </div>
        <div className="about-copy reveal">
          <span className="eyebrow line">BLACKSTONE UK PROPERTY LTD</span>
          <h2>
            Property is personal.
            <br />
            <em>So are we.</em>
          </h2>
          <p>
            Behind every property is a person, a plan and a possibility. We take the time to
            understand all three.
          </p>
          <p>
            From your first conversation to your next set of keys, our approach is simple:
            thoughtful presentation, clear communication and genuine care for your move.
          </p>
          <div className="values-list">
            <span>
              <Check size={17} />A service shaped around you
            </span>
            <span>
              <Check size={17} />
              Clear, considered communication
            </span>
            <span>
              <Check size={17} />
              Support beyond the first conversation
            </span>
          </div>
          <Link className="button secondary" href="/about">
            Meet the Blackstone approach
          </Link>
        </div>
      </section>
      <section className="editorial-band reveal">
        <div className="container">
          <span className="eyebrow">WHERE LIFE HAPPENS</span>
          <h2>
            The morning light.
            <br />
            The familiar street.
            <br />
            <em>The feeling of home.</em>
          </h2>
          <Link className="button" href="/properties">
            Find your next address
          </Link>
        </div>
      </section>
      <section className="section container steps-section">
        <div className="section-heading reveal">
          <div>
            <span className="eyebrow line">SIMPLICITY AT EVERY STEP</span>
            <h2>
              Your move.
              <br />
              <em>Beautifully supported.</em>
            </h2>
          </div>
          <p>A clear path from possibility to a new beginning.</p>
        </div>
        <div className="steps-grid">
          {[
            [
              '01',
              'Let’s get to know you',
              'Tell us what matters, what you need and where you want to go.',
            ],
            [
              '02',
              'Explore the possibilities',
              'Discover properties and a service tailored to your next move.',
            ],
            [
              '03',
              'Take the next step',
              'Arrange a viewing or valuation, with a team ready to help.',
            ],
          ].map(([n, h, p]) => (
            <div className="reveal" key={n}>
              <span className="step-number">{n}</span>
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
export function CallToAction() {
  return (
    <section className="final-cta">
      <div className="container reveal">
        <span className="eyebrow">A NEW CHAPTER STARTS HERE</span>
        <h2>
          Let's make your next move
          <br />
          <em>something extraordinary.</em>
        </h2>
        <div>
          <Link href="/valuation" className="button">
            Book a property valuation
          </Link>
          <Link href="/contact" className="button secondary">
            Talk to the team
          </Link>
        </div>
      </div>
    </section>
  );
}
