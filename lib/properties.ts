export type Tenure = 'buy' | 'rent';
export type PropertyStatus =
  'available' | 'under-offer' | 'let-agreed' | 'sstc' | 'sold' | 'archived';

export type Property = {
  id: string;
  slug: string;
  name: string;
  location: string;
  postcode: string;
  price: number;
  tenure: Tenure;
  type: string;
  beds: number;
  baths: number;
  area: number;
  image: string;
  images: string[];
  tag: string;
  description: string;
  features: string[];
  sample: boolean;
  status: string;
  featured?: boolean;
  newHome?: boolean;
  /** Energy Performance Certificate band, A–G. */
  epc?: string;
  /** Council tax band, A–H. */
  councilTaxBand?: string;
  /** freehold | leasehold | share-of-freehold (sales). */
  tenureType?: string;
  /** Tenancy deposit in pounds (lettings). */
  deposit?: number;
  /** ISO date, e.g. 2026-11-01 (lettings). */
  availableFrom?: string;
  /** furnished | part-furnished | unfurnished (lettings). */
  furnished?: string;
  floorplan?: string;
};

export const PROPERTY_TYPES = ['Detached', 'Semi-detached', 'Terraced', 'Apartment', 'Bungalow'];

export const formatPrice = (p: Pick<Property, 'price' | 'tenure'>) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(p.price) + (p.tenure === 'rent' ? ' pcm' : '');

export const statusLabel = (status: string, tenure: Tenure): string => {
  if (status === 'sold') return 'Sold';
  if (status === 'sstc') return 'Sold STC';
  if (status === 'under-offer') return 'Under offer';
  if (status === 'let-agreed') return 'Let agreed';
  if (status === 'archived') return 'Archived';
  return tenure === 'rent' ? 'To let' : 'For sale';
};

export const isAvailable = (status: string) => status === 'available';
