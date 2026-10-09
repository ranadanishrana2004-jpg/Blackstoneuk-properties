import { z } from 'zod';

export const ENQUIRY_KINDS = [
  'general',
  'valuation',
  'viewing',
  'halal-mortgage',
  'landlord',
] as const;
export const CONSENT_VERSION = '2026-10-privacy-v2';

export const enquirySchema = z.object({
  kind: z.enum(ENQUIRY_KINDS),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30).optional().default(''),
  postcode: z.string().trim().max(20).optional().default(''),
  message: z.string().trim().min(10).max(3000),
  propertyId: z.string().max(100).optional().default(''),
  consent: z.literal(true),
  website: z.string().max(200).optional().default(''),
  requestId: z.string().uuid(),
});

const imagePath = z
  .string()
  .max(500)
  .refine(
    (s) =>
      /^\/images\/[a-zA-Z0-9._-]+$/.test(s) ||
      /^\/api\/media\/[a-f0-9-]{36}$/.test(s) ||
      /^https:\/\//.test(s),
    'Use an uploaded image, a local image path or an HTTPS URL',
  );

const optionalChoice = <T extends [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal('')])
    .optional()
    .default('');

export const propertySchema = z.object({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'The URL slug can only use lowercase letters, numbers and hyphens',
    ),
  name: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  postcode: z.string().trim().max(20),
  price: z.number().finite().positive().max(100_000_000),
  tenure: z.enum(['buy', 'rent']),
  type: z.enum(['Detached', 'Semi-detached', 'Terraced', 'Apartment', 'Bungalow']),
  beds: z.number().int().min(0).max(30),
  baths: z.number().int().min(0).max(30),
  area: z.number().int().min(0).max(100_000),
  image: imagePath,
  images: z.array(imagePath).min(1).max(20),
  tag: z.string().max(60),
  description: z.string().trim().min(30).max(10_000),
  features: z.array(z.string().max(200)).max(20),
  sample: z.boolean(),
  status: z.enum(['available', 'under-offer', 'let-agreed', 'archived']),
  featured: z.boolean().optional().default(false),
  epc: optionalChoice(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
  councilTaxBand: optionalChoice(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']),
  tenureType: optionalChoice(['freehold', 'leasehold', 'share-of-freehold']),
  deposit: z.number().finite().min(0).max(1_000_000).optional(),
  availableFrom: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')])
    .optional()
    .default(''),
  furnished: optionalChoice(['furnished', 'part-furnished', 'unfurnished']),
  floorplan: z
    .union([imagePath, z.literal('')])
    .optional()
    .default(''),
});

export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(200)
  .refine(
    (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p),
    'Use upper-case, lower-case and a number',
  );

export const userSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: z.string().trim().min(2).max(100),
  password: passwordSchema,
  role: z.enum(['owner', 'staff']).default('staff'),
});
