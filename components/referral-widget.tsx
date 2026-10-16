'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { REFERRALS } from '@/lib/referrals';

const HIDDEN_ON = ['/manage', '/refer-a-seller', '/refer-a-landlord', '/referral-terms'];

/**
 * A compact, always-present entry point to the referral programmes.
 * Sits at the right edge on every public page and expands into a small card. The close button
 * only hides it until the page is reloaded or the site is visited again, so the offer always
 * comes back.
 */
export function ReferralWidget() {
  const path = usePathname();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  if (hidden || HIDDEN_ON.some((prefix) => path.startsWith(prefix))) return null;

  const dismiss = () => {
    setOpen(false);
    setHidden(true);
  };

  const seller = REFERRALS['seller-referral'];
  const landlord = REFERRALS['landlord-referral'];

  return (
    <div className="referral-fab" ref={root} data-open={open}>
      {open && (
        <div
          id="referral-fab-panel"
          className="referral-fab-panel"
          role="dialog"
          aria-label="Refer and earn"
        >
          <span className="eyebrow">REFER &amp; EARN</span>
          <h2>Know someone on the move?</h2>
          <p>Introduce them to Blackstone and we will say thank you.</p>
          <Link className="fab-option fab-option-seller" href={seller.path}>
            <span>
              <b>{seller.short}</b>
              <small>When their sale completes</small>
            </span>
            <strong>£{seller.reward}</strong>
          </Link>
          <Link className="fab-option fab-option-landlord" href={landlord.path}>
            <span>
              <b>{landlord.short}</b>
              <small>When their property is let</small>
            </span>
            <strong>£{landlord.reward}</strong>
          </Link>
          <Link className="fab-terms" href="/referral-terms">
            Terms &amp; conditions apply
          </Link>
        </div>
      )}
      <div className="referral-fab-anchor">
        <button
          type="button"
          className="referral-fab-badge"
          aria-expanded={open}
          aria-controls="referral-fab-panel"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="fab-badge-top">
            REFER
            <br />
            &amp; EARN
          </span>
          <span className="fab-badge-amount">
            <small>up to</small>£{landlord.reward}
          </span>
        </button>
        <button
          type="button"
          className="referral-fab-close"
          aria-label="Hide referral offers"
          onClick={dismiss}
        >
          ×
        </button>
      </div>
    </div>
  );
}
