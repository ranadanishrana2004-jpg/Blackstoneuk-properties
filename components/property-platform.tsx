'use client';
import Link from 'next/link';
import { SocialLinks } from './social-links';
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
  Plus,
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
import { ReferralWidget } from '@/components/referral-widget';
export const SavedContext = createContext<{ saved: string[]; toggle: (id: string) => void }>({
  saved: [],
  toggle: () => {},
});
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Blackstone UK Properties Ltd home">
      <span className="client-brand-badge">
        <BrandMark />
      </span>
      <span className="client-brand-type">
        <span className="client-brand-name">BLACKSTONE</span>
        <small>UK PROPERTIES LTD</small>
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
                  <Link href="/valuation" onClick={() => setMenu(false)}>
                    Book a valuation
                  </Link>
                  <Link href="/shortlist" onClick={() => setMenu(false)}>
                    Your shortlist
                  </Link>
                  <Link href="/contact" onClick={() => setMenu(false)}>
                    Contact us
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <div key={path} className="page-transition">
        {children}
      </div>
      {!path.startsWith('/manage') &&
        !['/refer-a-seller', '/refer-a-landlord', '/referral-terms'].includes(path) && (
          <aside className="referral-banner container">
            <div>
              <span className="eyebrow">SELLING OR RENTING. A LITTLE THANK YOU.</span>
              <h2>Know a seller or a landlord?</h2>
              <p>
                Refer a seller and earn <strong>£100</strong>, or introduce a landlord and earn{' '}
                <strong>£150</strong>. <Link href="/referral-terms">Terms apply.</Link>
              </p>
            </div>
            <div className="referral-banner-rewards">
              <Link className="button" href="/refer-a-seller">
                Refer a seller · £100
              </Link>
              <Link className="button secondary" href="/refer-a-landlord">
                Find a landlord · £150
              </Link>
            </div>
          </aside>
        )}
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
            <SocialLinks />
          </div>
          <div>
            <h3>Your next move</h3>
            <Link href="/properties?tenure=buy">Find a home to buy</Link>
            <Link href="/properties?tenure=rent">Find a home to rent</Link>
            <Link href="/selling">Sell your property</Link>
            <Link href="/properties?newHomes=1">Discover new homes</Link>
            <Link href="/refer-a-seller">Refer a seller · Earn £100</Link>
            <Link href="/refer-a-landlord">Find a landlord · Earn £150</Link>
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
            <Link href="/referral-terms">Referral terms</Link>
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
      <ReferralWidget />
      {!path.startsWith('/manage') && (contact.phone || contact.whatsapp || contact.email) && (
        <div className="quick-contact" aria-label="Contact us quickly">
          {contact.whatsapp && (
            <a
              href={'https://wa.me/' + contact.whatsapp}
              className="quick-whatsapp"
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
          {contact.email && (
            <a
              className="quick-email"
              href={'mailto:' + contact.email}
              aria-label={'Email us at ' + contact.email}
            >
              <Mail size={20} />
              <span>Email us</span>
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
export function PropertyCard({
  property: p,
  detailed = false,
}: {
  property: Property;
  detailed?: boolean;
}) {
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
        <div className="card-price">
          <strong>{formatPrice(p)}</strong>
          <small>{statusLabel(p.status, p.tenure)}</small>
        </div>
        <div className="location">
          <MapPin size={13} />
          {p.location}
        </div>
        <Link href={'/properties/' + p.slug}>
          <h3>{p.name}</h3>
        </Link>
        {p.newHome && <span className="new-home-label">New-build home</span>}
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
        {detailed && <p className="card-description">{p.description}</p>}
        <div className="property-bottom">
          <span className="card-agent">
            BLACKSTONE <small>UK PROPERTIES LTD</small>
          </span>
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
    <main id="main" className="portal-home">
      <section className="portal-hero container">
        <img
          className="portal-hero-photo"
          src="/images/hero.webp"
          alt="British home and landscaped gardens — illustrative photography"
          fetchPriority="high"
        />
        <div className="portal-hero-shade" />
        <div className="portal-hero-content">
          <span className="eyebrow">A MORE PERSONAL APPROACH TO PROPERTY</span>
          <h1>
            Find your place.
            <br />
            <em>Love your next chapter.</em>
          </h1>
          <p>Homes to buy and rent. A team to help you move.</p>
          <SearchBox />
          <div className="hero-quick-links">
            <Link href="/valuation">
              What could your home be worth? <span>Book a valuation →</span>
            </Link>
            <Link href="/shortlist">
              <Heart size={15} /> Your saved homes
            </Link>
          </div>
        </div>
      </section>
      <div className="container portal-paths">
        {[
          ['Buy a home', 'Find a place of your own', '/properties?tenure=buy'],
          ['Rent a home', 'Make your next move', '/properties?tenure=rent'],
          ['Sell your property', 'Start with a valuation', '/valuation'],
          ['Let your property', 'Support for landlords', '/landlords'],
        ].map(([title, text, href], i) => (
          <Link href={href} key={href}>
            <span className="path-number">0{i + 1}</span>
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
      <section className="container section portal-featured">
        <div className="section-heading reveal">
          <div>
            <span className="eyebrow line">THE BLACKSTONE COLLECTION</span>
            <h2>
              Homes worth <em>discovering.</em>
            </h2>
          </div>
          <Link className="text-link" href="/properties">
            View all properties →
          </Link>
        </div>
        <div className="property-grid">
          {featured.length ? (
            featured.map((p) => <PropertyCard key={p.id} property={p} />)
          ) : (
            <p>
              New properties are being added.{' '}
              <Link href="/contact">Tell us what you are looking for.</Link>
            </p>
          )}
        </div>
      </section>
      <section className="container portal-valuation reveal">
        <div>
          <span className="eyebrow">YOUR NEXT MOVE STARTS HERE</span>
          <h2>
            A fresh perspective.
            <br />
            <em>On your home's potential.</em>
          </h2>
          <p>
            Thinking of selling or letting? Book a personal property valuation and discuss the next
            step with our team.
          </p>
          <Link className="button" href="/valuation">
            Book a property valuation →
          </Link>
        </div>
        <img
          src="/images/interior.webp"
          alt="Light-filled living space — illustrative interior"
          loading="lazy"
        />
      </section>
      <section className="container section">
        <div className="section-heading reveal">
          <div>
            <span className="eyebrow line">A HOME FOR EVERY CHAPTER</span>
            <h2>
              Search your <em>way.</em>
            </h2>
          </div>
          <p>Start with the kind of home you have in mind.</p>
        </div>
        <div className="discovery-grid">
          {[
            ['Detached homes', 'Space to grow', 'Detached', 'country'],
            ['Apartments', 'A different view of everyday', 'Apartment', 'apartment'],
            ['Characterful terraces', 'A place with personality', 'Terraced', 'victorian'],
          ].map(([title, text, type, image]) => (
            <Link
              className="discovery-card reveal"
              key={type}
              href={'/properties?' + new URLSearchParams({ tenure: 'buy', type }).toString()}
            >
              <img
                src={'/images/' + image + '.webp'}
                alt={title + ' — illustrative photography'}
                loading="lazy"
              />
              <div>
                <small>{text}</small>
                <h3>
                  {title} <span>↗</span>
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="portal-support">
        <div className="container section">
          <div className="section-heading reveal">
            <div>
              <span className="eyebrow line">MORE THAN A PROPERTY SEARCH</span>
              <h2>
                Every move.<em> Made simpler.</em>
              </h2>
            </div>
          </div>
          <div className="portal-tools">
            <Link href="/halal-mortgages" className="portal-tool halal-tool reveal">
              <Leaf />
              <span className="eyebrow">ALIGNED WITH YOUR VALUES</span>
              <h3>Halal mortgages</h3>
              <p>
                We only offer Halal mortgage enquiries. Talk to us about your home-finance needs.
              </p>
              <span className="text-link">Explore Halal home finance →</span>
            </Link>
            <Link href="/stamp-duty" className="portal-tool reveal">
              <House />
              <span className="eyebrow">PLAN YOUR MOVE</span>
              <h3>Stamp duty calculator</h3>
              <p>Explore the potential stamp duty cost of your next property purchase.</p>
              <span className="text-link">Calculate stamp duty →</span>
            </Link>
            <Link href="/contact" className="portal-tool reveal">
              <MessageCircle />
              <span className="eyebrow">PERSONAL SUPPORT</span>
              <h3>Let's find your next home</h3>
              <p>Tell us what matters to you. Our team can help you take the next step.</p>
              <span className="text-link">Speak to the team →</span>
            </Link>
          </div>
        </div>
      </section>
      <section className="container section" id="services">
        <div className="section-heading reveal">
          <div>
            <span className="eyebrow line">WITH YOU, FROM THE START</span>
            <h2>
              Your property.<em> Our personal attention.</em>
            </h2>
          </div>
          <Link href="/about" className="text-link">
            Get to know Blackstone →
          </Link>
        </div>
        <div className="services-grid">
          {services.map((s) => (
            <Link className="service-card reveal" href={s.url} key={s.label}>
              <div className="service-photo">
                <img src={s.image} alt={s.label + ' with Blackstone'} loading="lazy" />
              </div>
              <div className="service-copy">
                <span className="eyebrow">{s.label}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <span className="service-link">
                  Explore {s.label.toLowerCase()} <Plus size={17} />
                </span>
              </div>
            </Link>
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
