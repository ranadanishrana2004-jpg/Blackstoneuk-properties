'use client';
import { useEffect, useState } from 'react';
function Facebook() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 22v-9h3l.5-4H14V7c0-1 .3-2 2-2h2V1.5A24 24 0 0 0 15 1c-3 0-5 2-5 5v3H7v4h3v9z" />
    </svg>
  );
}
function Instagram() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" />
    </svg>
  );
}
import { emptySocialLinks, socialLinksSchema } from '@/lib/social-links';
export function SocialLinks() {
  const [links, setLinks] = useState(emptySocialLinks);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/social-links', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const parsed = socialLinksSchema.safeParse(data);
        if (parsed.success) setLinks(parsed.data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  if (!links.facebook && !links.instagram) return null;
  return (
    <nav className="social-links" aria-label="Follow Blackstone">
      {links.facebook && (
        <a
          href={links.facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Blackstone on Facebook (opens in a new tab)"
        >
          <Facebook />
          <span>Facebook</span>
        </a>
      )}
      {links.instagram && (
        <a
          href={links.instagram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Blackstone on Instagram (opens in a new tab)"
        >
          <Instagram />
          <span>Instagram</span>
        </a>
      )}
    </nav>
  );
}
export function SocialSettings() {
  const [links, setLinks] = useState(emptySocialLinks);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    fetch('/api/social-links')
      .then(async (r) => {
        if (!r.ok) throw Error('Could not load social links. Refresh to retry.');
        setLinks(socialLinksSchema.parse(await r.json()));
        setReady(true);
      })
      .catch(() => setMessage('Could not load social links. Refresh to retry.'));
  }, []);
  return (
    <form
      className="enquiry-form social-settings"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        try {
          const r = await fetch('/api/social-links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(links),
          });
          const data = await r.json();
          if (!r.ok) throw Error(data.error);
          setMessage('Social links saved. They will appear on the next website page load.');
        } catch (e) {
          setMessage(e instanceof Error ? e.message : 'Unable to save.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Social profiles</h2>
      <p>Add your official Properties pages. Leave a field blank to hide that icon.</p>
      <div className="form-grid">
        <label>
          Facebook URL
          <input
            type="url"
            maxLength={500}
            value={links.facebook}
            disabled={!ready}
            placeholder="https://www.facebook.com/your-page"
            onChange={(e) => setLinks({ ...links, facebook: e.target.value })}
          />
        </label>
        <label>
          Instagram URL
          <input
            type="url"
            maxLength={500}
            value={links.instagram}
            disabled={!ready}
            placeholder="https://www.instagram.com/your-profile"
            onChange={(e) => setLinks({ ...links, instagram: e.target.value })}
          />
        </label>
      </div>
      {message && <p role="status">{message}</p>}
      <button className="button" disabled={!ready || busy}>
        {busy ? 'Saving…' : 'Save social links'}
      </button>
    </form>
  );
}
