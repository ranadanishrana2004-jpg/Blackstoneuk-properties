'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Keep the client's original artwork; CSS frames only the relevant logo regions.
export function BrandMark() {
  return (
    <span className="client-monogram" aria-hidden="true">
      <img src="/images/blackstone-brand-reference.jpeg" alt="" width="1142" height="1600" />
    </span>
  );
}

function Curtain() {
  return (
    <div className="brand-curtain" aria-hidden="true">
      <div className="brand-curtain-content">
        <div className="brand-clock">
          <svg className="brand-clock-ring" viewBox="0 0 200 200">
            <circle className="clock-track" cx="100" cy="100" r="94" />
            <circle className="clock-progress" cx="100" cy="100" r="94" pathLength="100" />
          </svg>
          <BrandMark />
        </div>
        <span className="brand-curtain-caption">BLACKSTONE UK PROPERTY LTD</span>
      </div>
    </div>
  );
}

function RouteCurtain() {
  const pathname = usePathname();
  const search = useSearchParams();
  // Animate committed navigation, including Buy/Rent query changes and history.
  // Do not intercept links or delay forms, downloads, external links or the router.
  return <Curtain key={`${pathname}?${search.toString()}`} />;
}

export function BrandMotion() {
  return (
    <Suspense fallback={<Curtain />}>
      <RouteCurtain />
    </Suspense>
  );
}
