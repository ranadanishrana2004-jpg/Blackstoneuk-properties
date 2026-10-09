/**
 * Central site configuration. Everything that differs between environments, or that the
 * business must confirm before launch (phone, address, company number, regulatory wording),
 * comes from environment variables so it can be changed in Render without a code change.
 * Nothing here is invented: anything left unset is simply not displayed.
 */

const clean = (value: string | undefined) => (value ?? '').trim();

export type ContactInfo = {
  companyName: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  hours: string;
  companyNumber: string;
  registeredOffice: string;
  vatNumber: string;
  icoNumber: string;
  redressScheme: string;
  cmpScheme: string;
  financeStatement: string;
};

export const COMPANY_NAME = 'Blackstone UK Property Ltd';

export function siteUrl(): string {
  return clean(process.env.SITE_URL).replace(/\/$/, '') || 'http://localhost:3000';
}

export function contactEmail(): string {
  return clean(process.env.CONTACT_EMAIL) || 'info@bsukproperties.com';
}

/** Read on the server and passed to client components as props. */
export function getContact(): ContactInfo {
  return {
    companyName: COMPANY_NAME,
    email: contactEmail(),
    phone: clean(process.env.CONTACT_PHONE),
    whatsapp: clean(process.env.WHATSAPP_NUMBER).replace(/[^\d]/g, ''),
    address: clean(process.env.OFFICE_ADDRESS),
    hours: clean(process.env.OPENING_HOURS),
    companyNumber: clean(process.env.COMPANY_NUMBER),
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
