/**
 * Central site configuration. Everything that differs between environments, or that the
 * business must confirm before launch (phone, address, regulatory wording),
 * comes from environment variables so it can be changed in Render without a code change.
 * Legal identity is taken from the client-supplied certificate. Optional details left unset are not displayed.
 */

const clean = (value: string | undefined) => (value ?? '').trim();

export type ContactInfo = {
  companyName: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  /** The office address split into display lines, e.g. street, road, town and postcode. */
  addressLines: string[];
  /** Public website host without protocol, e.g. www.bsukproperties.com. */
  website: string;
  hours: string;
  companyNumber: string;
  registeredOffice: string;
  vatNumber: string;
  icoNumber: string;
  redressScheme: string;
  cmpScheme: string;
  financeStatement: string;
};

export const COMPANY_NAME = 'Blackstone UK Properties Ltd';
// Company number supplied on the client's certificate of incorporation.
export const COMPANY_NUMBER = '17493466';

// Office details supplied by the client. The phone is fixed in code and always shown as written;
// OFFICE_ADDRESS may still be overridden by the environment variable of the same name.
export const OFFICE_PHONE = '0800 043 7867';
export const OFFICE_STREET = 'Flexspace Office 46, Manchester Road';
export const OFFICE_TOWN = 'Bolton';
export const OFFICE_POSTCODE = 'BL3 2NZ';
export const OFFICE_ADDRESS = `${OFFICE_STREET}, ${OFFICE_TOWN} ${OFFICE_POSTCODE}`;

export function siteUrl(): string {
  return clean(process.env.SITE_URL).replace(/\/$/, '') || 'http://localhost:3000';
}

export const DEFAULT_WEBSITE = 'www.bsukproperties.com';

/** The public site host for display, falling back to the company domain in local development. */
export function websiteHost(): string {
  try {
    const host = new URL(siteUrl()).host;
    if (host && !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) return host;
  } catch {}
  return DEFAULT_WEBSITE;
}

export function contactEmail(): string {
  return clean(process.env.CONTACT_EMAIL) || 'info@bsukproperties.com';
}

/** Read on the server and passed to client components as props. */
export function getContact(): ContactInfo {
  const address = clean(process.env.OFFICE_ADDRESS) || OFFICE_ADDRESS;
  return {
    companyName: COMPANY_NAME,
    email: contactEmail(),
    phone: OFFICE_PHONE,
    whatsapp: clean(process.env.WHATSAPP_NUMBER).replace(/[^\d]/g, ''),
    address,
    addressLines: address
      .split(',')
      .map((line) => line.trim())
      .filter(Boolean),
    website: websiteHost(),
    hours: clean(process.env.OPENING_HOURS),
    companyNumber: COMPANY_NUMBER,
    registeredOffice: clean(process.env.REGISTERED_OFFICE),
    vatNumber: clean(process.env.VAT_NUMBER),
    icoNumber: clean(process.env.ICO_NUMBER),
    redressScheme: clean(process.env.REDRESS_SCHEME),
    cmpScheme: clean(process.env.CMP_SCHEME),
    financeStatement: clean(process.env.FINANCE_STATEMENT),
  };
}

export function telHref(phone: string): string {
  return 'tel:' + phone.replace(/[^\d+]/g, '');
}

/** A Google Maps search link for an address. */
export function mapsHref(address: string): string {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
}
