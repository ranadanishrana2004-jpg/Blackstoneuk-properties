/**
 * Stamp Duty Land Tax for residential purchases in England and Northern Ireland.
 * Rates in force from 1 April 2025. Wales (LTT) and Scotland (LBTT) use different taxes.
 * This is an estimate for guidance only and must be confirmed by a conveyancer.
 */
export type SdltInput = {
  price: number;
  firstTimeBuyer: boolean;
  additionalProperty: boolean;
  nonUkResident: boolean;
};

type Band = { upTo: number; rate: number };

const STANDARD: Band[] = [
  { upTo: 125_000, rate: 0 },
  { upTo: 250_000, rate: 0.02 },
  { upTo: 925_000, rate: 0.05 },
  { upTo: 1_500_000, rate: 0.1 },
  { upTo: Infinity, rate: 0.12 },
];

const FIRST_TIME_BUYER: Band[] = [
  { upTo: 300_000, rate: 0 },
  { upTo: 500_000, rate: 0.05 },
];

export const FIRST_TIME_BUYER_LIMIT = 500_000;
export const ADDITIONAL_PROPERTY_SURCHARGE = 0.05;
export const NON_RESIDENT_SURCHARGE = 0.02;

function banded(price: number, bands: Band[]): number {
  let tax = 0;
  let lower = 0;
  for (const band of bands) {
    if (price > lower) tax += (Math.min(price, band.upTo) - lower) * band.rate;
    lower = band.upTo;
    if (price <= band.upTo) break;
  }
  return tax;
}

export function calculateSdlt(input: SdltInput) {
  const price = Math.max(0, Math.floor(input.price));
  const firstTimeBuyerApplies =
    input.firstTimeBuyer && !input.additionalProperty && price <= FIRST_TIME_BUYER_LIMIT;
  const base = banded(price, firstTimeBuyerApplies ? FIRST_TIME_BUYER : STANDARD);
  const additional =
    input.additionalProperty && price >= 40_000 ? price * ADDITIONAL_PROPERTY_SURCHARGE : 0;
  const nonResident = input.nonUkResident ? price * NON_RESIDENT_SURCHARGE : 0;
  const total = Math.round(base + additional + nonResident);
  return {
    base: Math.round(base),
    additional: Math.round(additional),
    nonResident: Math.round(nonResident),
    total,
    effectiveRate: price ? total / price : 0,
    firstTimeBuyerApplies,
  };
}
