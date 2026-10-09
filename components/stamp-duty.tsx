'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { calculateSdlt, FIRST_TIME_BUYER_LIMIT } from '@/lib/sdlt';

const gbp = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);

export function StampDutyCalculator() {
  const [price, setPrice] = useState('350000');
  const [firstTimeBuyer, setFirstTimeBuyer] = useState(false);
  const [additionalProperty, setAdditionalProperty] = useState(false);
  const [nonUkResident, setNonUkResident] = useState(false);

  const amount = Number(price.replace(/[^\d]/g, '')) || 0;
  const result = calculateSdlt({
    price: amount,
    firstTimeBuyer,
    additionalProperty,
    nonUkResident,
  });

  return (
    <div className="calculator">
      <form className="enquiry-card enquiry-form" onSubmit={(e) => e.preventDefault()}>
        <span className="eyebrow">PURCHASE DETAILS</span>
        <label>
          Purchase price (£)
          <input
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
            aria-describedby="sdlt-help"
          />
        </label>
        <div className="consent-row">
          <Checkbox
            id="ftb"
            checked={firstTimeBuyer}
            onCheckedChange={(v) => setFirstTimeBuyer(v === true)}
          />
          <label htmlFor="ftb">I am a first-time buyer</label>
        </div>
        <div className="consent-row">
          <Checkbox
            id="additional"
            checked={additionalProperty}
            onCheckedChange={(v) => setAdditionalProperty(v === true)}
          />
          <label htmlFor="additional">This is an additional property or second home</label>
        </div>
        <div className="consent-row">
          <Checkbox
            id="nonres"
            checked={nonUkResident}
            onCheckedChange={(v) => setNonUkResident(v === true)}
          />
          <label htmlFor="nonres">I am not resident in the UK for tax purposes</label>
        </div>
        <p id="sdlt-help" className="form-footnote">
          First-time buyer relief applies up to {gbp(FIRST_TIME_BUYER_LIMIT)} and not to additional
          properties.
        </p>
      </form>

      <div className="enquiry-card calculator-result" role="status" aria-live="polite">
        <span className="eyebrow">YOUR ESTIMATE</span>
        <div className="calculator-total">{gbp(result.total)}</div>
        <p>
          Effective rate {(result.effectiveRate * 100).toFixed(2)}%
          {result.firstTimeBuyerApplies ? ' · first-time buyer relief applied' : ''}
        </p>
        <dl className="fact-grid">
          <div>
            <dt>Standard rates</dt>
            <dd>{gbp(result.base)}</dd>
          </div>
          {result.additional > 0 && (
            <div>
              <dt>Additional property surcharge (5%)</dt>
              <dd>{gbp(result.additional)}</dd>
            </div>
          )}
          {result.nonResident > 0 && (
            <div>
              <dt>Non-UK resident surcharge (2%)</dt>
              <dd>{gbp(result.nonResident)}</dd>
            </div>
          )}
        </dl>
        <p className="form-footnote">
          Guide only, for residential purchases in England and Northern Ireland using rates from 1
          April 2025. Wales and Scotland have different taxes. Always confirm the figure with your
          conveyancer or on GOV.UK before relying on it.
        </p>
        <Link className="text-link" href="/contact">
          Talk to the team about your move
        </Link>
      </div>
    </div>
  );
}
