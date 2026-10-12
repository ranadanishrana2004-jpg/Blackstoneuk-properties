'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PasswordField } from './password-field';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Choice } from './property-platform';
import { PROPERTY_TYPES, formatPrice, statusLabel, type Property } from '@/lib/properties';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'staff';
  created_at?: number;
};
type Enquiry = {
  id: string;
  kind: string;
  name: string;
  email: string;
  phone: string;
  postcode: string;
  message: string;
  property_id: string;
  status: string;
  notes: string;
  email_status: string;
  created_at: number;
};
type Desk = {
  user: User;
  enquiries: Enquiry[];
  total: number;
  page: number;
  pageSize: number;
  stats: { total: number; new: number; halal: number } | null;
  properties: Property[];
  users: User[];
  audit: { at: number; actor: string; action: string; detail: string }[];
};

const KIND_LABELS: Record<string, string> = {
  general: 'General',
  valuation: 'Valuation',
  viewing: 'Viewing',
  'halal-mortgage': 'Halal mortgage',
  landlord: 'Landlord',
};

const emptyProperty = (): Property => ({
  id: crypto.randomUUID(),
  slug: '',
  name: '',
  location: '',
  postcode: '',
  price: 0,
  tenure: 'buy',
  type: 'Detached',
  beds: 3,
  baths: 2,
  area: 0,
  image: '/images/hero.webp',
  images: ['/images/hero.webp'],
  tag: 'New to the collection',
  description: '',
  features: [],
  sample: false,
  status: 'available',
  featured: false,
  epc: '',
  councilTaxBand: '',
  tenureType: '',
  availableFrom: '',
  furnished: '',
  floorplan: '',
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

const post = (payload: unknown) =>
  api<{ saved: true }>('/api/team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export function TeamWorkspace() {
  const [booting, setBooting] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [desk, setDesk] = useState<Desk | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [edit, setEdit] = useState<Property | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const loadSequence = useRef(0);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    const params = new URLSearchParams({ status, q: query, page: String(page) });
    const result = await api<Desk>('/api/team?' + params.toString());
    if (sequence === loadSequence.current) setDesk(result);
  }, [status, query, page]);

  useEffect(() => {
    api<{ authenticated: boolean; configured: boolean }>('/api/team/session')
      .then((session) => {
        setConfigured(session.configured);
        if (session.authenticated) return load();
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBooting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce searching so we do not query on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (desk) load().catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, query, page]);

  async function run<T>(
    action: () => Promise<T>,
    success = 'Changes saved',
  ): Promise<T | undefined> {
    setBusy(true);
    setError('');
    try {
      const result = await action();
      await load();
      toast(success);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setBusy(false);
    }
  }

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      await api('/api/team/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError('');
    try {
      await api('/api/team/session', { method: 'DELETE' });
      ++loadSequence.current;
      setDesk(null);
      setSelected(null);
      setEdit(null);
      setPasswordOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign out. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function saveProperty(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    const property = {
      ...edit,
      slug: slugify(edit.slug || edit.name),
      features: edit.features.map((feature) => feature.trim()).filter(Boolean),
    };
    if (property.tenure !== 'rent') delete property.deposit;
    if (await run(() => post({ action: 'save-property', property }))) setEdit(null);
  }

  async function upload(file: File): Promise<string | null> {
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.set('file', file);
      return (await api<{ url: string }>('/api/team/upload', { method: 'POST', body: form })).url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  const set = <K extends keyof Property>(key: K, value: Property[K]) =>
    setEdit((current) => (current ? { ...current, [key]: value } : current));

  const isOwner = desk?.user.role === 'owner';
  const pages = desk ? Math.max(1, Math.ceil(desk.total / desk.pageSize)) : 1;

  return (
    <main id="main" className="container section team-workspace">
      <span className="eyebrow">BLACKSTONE · TEAM WORKSPACE</span>
      <div className="section-heading">
        <h1>{desk ? 'Your property desk.' : 'Welcome back.'}</h1>
        {desk && (
          <div className="team-actions">
            <span className="team-user">
              {desk.user.name} · {desk.user.role}
            </span>
            <button className="button secondary" onClick={() => setPasswordOpen(true)}>
              Change password
            </button>
            <button className="button secondary" onClick={signOut} disabled={busy}>
              Sign out
            </button>
          </div>
        )}
      </div>

      {booting ? (
        <p>Opening your workspace…</p>
      ) : !desk ? (
        <form className="enquiry-card login-card" onSubmit={login}>
          <h2>Team sign-in</h2>
          <p>Manage your property collection and enquiries.</p>
          {!configured && (
            <p className="form-error" role="alert">
              No team accounts exist yet. Set ADMIN_EMAIL and ADMIN_PASSWORD on the server and
              restart.
            </p>
          )}
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required maxLength={200} />
          </label>
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            required
            maxLength={200}
          />
          <Link className="text-link forgot-password" href="/manage/reset-password">
            Forgot password?
          </Link>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : (
        <>
          <div className="dashboard-stats">
            <div>
              <b>{desk.properties.filter((p) => p.status !== 'archived').length}</b>
              <span>Visible properties</span>
            </div>
            <div>
              <b>{desk.stats?.new ?? 0}</b>
              <span>New enquiries</span>
            </div>
            <div>
              <b>{desk.stats?.halal ?? 0}</b>
              <span>Halal mortgage enquiries</span>
            </div>
            <div>
              <b>{desk.stats?.total ?? 0}</b>
              <span>All enquiries</span>
            </div>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}

          <Tabs defaultValue="enquiries">
            <TabsList className="search-tabs">
              <TabsTrigger value="enquiries">Enquiries</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              {isOwner && <TabsTrigger value="team">Team</TabsTrigger>}
              {isOwner && <TabsTrigger value="activity">Activity</TabsTrigger>}
            </TabsList>

            <TabsContent value="enquiries">
              <div className="team-filters">
                <input
                  aria-label="Search enquiries"
                  placeholder="Search reference, name, email, postcode or type"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Choice
                  label="STATUS"
                  value={status}
                  onChange={(v) => {
                    setStatus(v);
                    setPage(1);
                  }}
                  options={['all', 'new', 'contacted', 'closed'].map((v) => [
                    v,
                    v === 'all' ? 'All enquiries' : v,
                  ])}
                />
                <a className="button secondary" href="/api/team/export">
                  Export CSV
                </a>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Enquiry</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {desk.enquiries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        {e.name}
                        <small>{e.email}</small>
                      </TableCell>
                      <TableCell>{KIND_LABELS[e.kind] ?? e.kind}</TableCell>
                      <TableCell>
                        {new Date(e.created_at).toLocaleString('en-GB', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </TableCell>
                      <TableCell>
                        <span className="status-chip">{e.status}</span>
                      </TableCell>
                      <TableCell>
                        <button className="text-link" onClick={() => setSelected(e)}>
                          Open enquiry
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!desk.enquiries.length && (
                <div className="empty-state">
                  <h3>
                    {query || status !== 'all'
                      ? 'No matching enquiries.'
                      : 'No enquiries here yet.'}
                  </h3>
                  <p>
                    {query || status !== 'all'
                      ? 'Try a different search or clear your filters.'
                      : 'Submitted enquiries will appear in this workspace.'}
                  </p>
                  {(query || status !== 'all') && (
                    <button
                      className="button secondary"
                      onClick={() => {
                        setSearch('');
                        setQuery('');
                        setStatus('all');
                        setPage(1);
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
              {pages > 1 && (
                <div className="pager">
                  <button
                    className="button secondary"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {pages}
                  </span>
                  <button
                    className="button secondary"
                    disabled={page >= pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="properties">
              <div className="team-filters">
                <p>Manage listings, photography and availability.</p>
                <button
                  className="button"
                  onClick={() => {
                    setError('');
                    setEdit(emptyProperty());
                  }}
                >
                  Add a property
                </button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {desk.properties.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.name}
                        <small>
                          {p.location}
                          {p.sample ? ' · Sample' : ''}
                          {p.featured ? ' · Featured' : ''}
                        </small>
                      </TableCell>
                      <TableCell>{formatPrice(p)}</TableCell>
                      <TableCell>{p.tenure === 'rent' ? 'To let' : 'For sale'}</TableCell>
                      <TableCell>{statusLabel(p.status, p.tenure)}</TableCell>
                      <TableCell>
                        <button
                          className="text-link"
                          onClick={() => {
                            setError('');
                            setEdit({ ...emptyProperty(), ...p });
                          }}
                        >
                          Edit property
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            {isOwner && (
              <TabsContent value="team">
                <TeamPanel desk={desk} busy={busy} onRun={run} />
              </TabsContent>
            )}

            {isOwner && (
              <TabsContent value="activity">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Who</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {desk.audit.map((entry, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {new Date(entry.at).toLocaleString('en-GB', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </TableCell>
                        <TableCell>{entry.actor}</TableCell>
                        <TableCell>
                          {entry.action}
                          {entry.detail && <small>{entry.detail}</small>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="team-dialog">
          <DialogTitle>{selected?.name}</DialogTitle>
          <DialogDescription>
            {selected && (KIND_LABELS[selected.kind] ?? selected.kind)} · BSUK-
            {selected?.id.slice(0, 8).toUpperCase()}
          </DialogDescription>
          {selected && (
            <>
              <dl className="enquiry-details">
                <dt>Email</dt>
                <dd>
                  <a href={'mailto:' + selected.email}>{selected.email}</a>
                </dd>
                <dt>Phone</dt>
                <dd>
                  {selected.phone ? (
                    <a href={'tel:' + selected.phone}>{selected.phone}</a>
                  ) : (
                    'Not provided'
                  )}
                </dd>
                <dt>Postcode</dt>
                <dd>{selected.postcode || 'Not provided'}</dd>
                <dt>Property</dt>
                <dd>
                  {desk?.properties.find((p) => p.id === selected.property_id)?.name ||
                    selected.property_id ||
                    'General enquiry'}
                </dd>
                <dt>Notification email</dt>
                <dd>
                  {selected.email_status}
                  {['failed', 'skipped', 'pending'].includes(selected.email_status) && (
                    <button
                      type="button"
                      className="text-link"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await run(
                            () => post({ action: 'retry-email', id: selected.id }),
                            'Notification retry queued',
                          )
                        ) {
                          setSelected(null);
                        }
                      }}
                    >
                      Retry notifications
                    </button>
                  )}
                </dd>
              </dl>
              <p className="enquiry-message">{selected.message}</p>
              <Choice
                label="ENQUIRY STATUS"
                value={selected.status}
                onChange={(v) => setSelected({ ...selected, status: v })}
                options={['new', 'contacted', 'closed'].map((v) => [v, v])}
              />
              <label>
                Internal notes
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={selected.notes}
                  onChange={(e) => setSelected({ ...selected, notes: e.target.value })}
                />
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  className="button"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await run(() =>
                        post({
                          action: 'enquiry-update',
                          id: selected.id,
                          status: selected.status,
                          notes: selected.notes,
                        }),
                      )
                    )
                      setSelected(null);
                  }}
                >
                  Save
                </button>
                {isOwner && (
                  <button
                    className="button secondary danger"
                    disabled={busy}
                    onClick={async () => {
                      if (!confirm('Permanently delete this enquiry? This cannot be undone.'))
                        return;
                      if (
                        await run(
                          () => post({ action: 'enquiry-delete', id: selected.id }),
                          'Enquiry deleted',
                        )
                      )
                        setSelected(null);
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent className="team-dialog property-editor">
          <DialogTitle>{edit?.name || 'New property'}</DialogTitle>
          <DialogDescription>
            Update listing details. Archive a listing to remove it from the public collection.
          </DialogDescription>
          {edit && (
            <form onSubmit={saveProperty} className="enquiry-form">
              <div className="form-grid">
                <label>
                  Property name
                  <input
                    required
                    maxLength={120}
                    value={edit.name}
                    onChange={(e) => {
                      set('name', e.target.value);
                      if (!edit.slug || edit.slug === slugify(edit.name))
                        set('slug', slugify(e.target.value));
                    }}
                  />
                </label>
                <label>
                  URL slug
                  <input
                    required
                    maxLength={100}
                    value={edit.slug}
                    onChange={(e) => set('slug', e.target.value)}
                  />
                </label>
                <label>
                  Location
                  <input
                    required
                    maxLength={120}
                    value={edit.location}
                    onChange={(e) => set('location', e.target.value)}
                  />
                </label>
                <label>
                  Postcode
                  <input
                    maxLength={20}
                    value={edit.postcode}
                    onChange={(e) => set('postcode', e.target.value)}
                  />
                </label>
                <label>
                  {edit.tenure === 'rent' ? 'Rent (£ pcm)' : 'Price (£)'}
                  <input
                    type="number"
                    min={1}
                    required
                    value={edit.price || ''}
                    onChange={(e) => set('price', Number(e.target.value))}
                  />
                </label>
                <label>
                  Bedrooms
                  <input
                    type="number"
                    min={0}
                    required
                    value={edit.beds}
                    onChange={(e) => set('beds', Number(e.target.value))}
                  />
                </label>
                <label>
                  Bathrooms
                  <input
                    type="number"
                    min={0}
                    required
                    value={edit.baths}
                    onChange={(e) => set('baths', Number(e.target.value))}
                  />
                </label>
                <label>
                  Area (sq ft)
                  <input
                    type="number"
                    min={0}
                    required
                    value={edit.area}
                    onChange={(e) => set('area', Number(e.target.value))}
                  />
                </label>
                <label>
                  Listing label
                  <input
                    maxLength={60}
                    value={edit.tag}
                    onChange={(e) => set('tag', e.target.value)}
                  />
                </label>
                <Choice
                  label="TENURE"
                  value={edit.tenure}
                  onChange={(v) => set('tenure', v as 'buy' | 'rent')}
                  options={[
                    ['buy', 'For sale'],
                    ['rent', 'To let'],
                  ]}
                />
                <Choice
                  label="PROPERTY TYPE"
                  value={edit.type}
                  onChange={(v) => set('type', v)}
                  options={PROPERTY_TYPES.map((v) => [v, v])}
                />
                <Choice
                  label="STATUS"
                  value={edit.status}
                  onChange={(v) => set('status', v)}
                  options={[
                    ['available', 'Available'],
                    ['under-offer', 'Under offer'],
                    ['let-agreed', 'Let agreed'],
                    ['archived', 'Archived (hidden)'],
                  ]}
                />
                <Choice
                  label="EPC RATING"
                  value={edit.epc || 'none'}
                  onChange={(v) => set('epc', v === 'none' ? '' : v)}
                  options={[
                    ['none', 'Not set'],
                    ...['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((v) => [v, v] as [string, string]),
                  ]}
                />
                <Choice
                  label="COUNCIL TAX BAND"
                  value={edit.councilTaxBand || 'none'}
                  onChange={(v) => set('councilTaxBand', v === 'none' ? '' : v)}
                  options={[
                    ['none', 'Not set'],
                    ...['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(
                      (v) => [v, v] as [string, string],
                    ),
                  ]}
                />
                {edit.tenure === 'buy' ? (
                  <Choice
                    label="TENURE TYPE"
                    value={edit.tenureType || 'none'}
                    onChange={(v) => set('tenureType', v === 'none' ? '' : v)}
                    options={[
                      ['none', 'Not set'],
                      ['freehold', 'Freehold'],
                      ['leasehold', 'Leasehold'],
                      ['share-of-freehold', 'Share of freehold'],
                    ]}
                  />
                ) : (
                  <>
                    <label>
                      Deposit (£)
                      <input
                        type="number"
                        min={0}
                        value={edit.deposit ?? ''}
                        onChange={(e) =>
                          set('deposit', e.target.value === '' ? undefined : Number(e.target.value))
                        }
                      />
                    </label>
                    <label>
                      Available from
                      <input
                        type="date"
                        value={edit.availableFrom || ''}
                        onChange={(e) => set('availableFrom', e.target.value)}
                      />
                    </label>
                    <Choice
                      label="FURNISHING"
                      value={edit.furnished || 'none'}
                      onChange={(v) => set('furnished', v === 'none' ? '' : v)}
                      options={[
                        ['none', 'Not set'],
                        ['furnished', 'Furnished'],
                        ['part-furnished', 'Part furnished'],
                        ['unfurnished', 'Unfurnished'],
                      ]}
                    />
                  </>
                )}
              </div>

              <label>
                Description
                <textarea
                  rows={4}
                  minLength={30}
                  maxLength={10000}
                  required
                  value={edit.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </label>
              <label>
                Features (one per line)
                <textarea
                  rows={3}
                  value={edit.features.join('\n')}
                  onChange={(e) => set('features', e.target.value.split('\n'))}
                />
              </label>

              <div className="image-manager">
                <p className="image-label">Photography. The first image is the cover.</p>
                <div className="image-grid">
                  {edit.images.map((src, i) => (
                    <figure key={src + i}>
                      {}
                      <img src={src} alt={`Photo ${i + 1}`} />
                      <figcaption>
                        {i > 0 && (
                          <button
                            type="button"
                            className="text-link"
                            onClick={() => {
                              const next = [...edit.images];
                              [next[0], next[i]] = [next[i], next[0]];
                              setEdit({ ...edit, images: next, image: next[0] });
                            }}
                          >
                            Make cover
                          </button>
                        )}
                        {edit.images.length > 1 && (
                          <button
                            type="button"
                            className="text-link"
                            onClick={() => {
                              const next = edit.images.filter((_, n) => n !== i);
                              setEdit({ ...edit, images: next, image: next[0] });
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </figcaption>
                    </figure>
                  ))}
                </div>
                <label className="button secondary upload-button">
                  {busy ? 'Uploading…' : 'Upload photos'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? []);
                      e.target.value = '';
                      const urls: string[] = [];
                      for (const file of files) {
                        const url = await upload(file);
                        if (url) urls.push(url);
                      }
                      if (urls.length) {
                        setEdit((current) => {
                          if (!current) return current;
                          // Replace the placeholder cover once a real photo is uploaded.
                          const existing = current.images.filter(
                            (src) => src !== '/images/hero.webp' || urls.length === 0,
                          );
                          const images = [...existing, ...urls].slice(0, 20);
                          return { ...current, images, image: images[0] };
                        });
                      }
                    }}
                  />
                </label>
                <p className="form-footnote">JPEG, PNG or WebP, up to 4 MB each.</p>
              </div>

              <div className="consent-row">
                <Checkbox
                  id="featured"
                  checked={!!edit.featured}
                  onCheckedChange={(v) => set('featured', v === true)}
                />
                <label htmlFor="featured">Feature this property first on the website</label>
              </div>
              <div className="consent-row">
                <Checkbox
                  id="sample-property"
                  checked={edit.sample}
                  onCheckedChange={(v) => set('sample', v === true)}
                />
                <label htmlFor="sample-property">
                  Illustrative sample property (not a live listing)
                </label>
              </div>

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="dialog-actions">
                <button className="button" disabled={busy}>
                  {busy ? 'Saving…' : 'Save property'}
                </button>
                {isOwner && desk?.properties.some((p) => p.id === edit.id) && (
                  <button
                    type="button"
                    className="button secondary danger"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        !confirm(
                          `Permanently delete "${edit.name}"? Archive it instead to keep a record.`,
                        )
                      )
                        return;
                      if (
                        await run(
                          () => post({ action: 'delete-property', id: edit.id }),
                          'Property deleted',
                        )
                      )
                        setEdit(null);
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <PasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </main>
  );
}

function TeamPanel({
  desk,
  busy,
  onRun,
}: {
  desk: Desk;
  busy: boolean;
  onRun: <T>(action: () => Promise<T>, success?: string) => Promise<T | undefined>;
}) {
  const [role, setRole] = useState('staff');
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Manage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {desk.users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                {u.name}
                <small>{u.email}</small>
              </TableCell>
              <TableCell>{u.role}</TableCell>
              <TableCell>
                {u.id !== desk.user.id && (
                  <button
                    className="text-link"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`Remove ${u.name}? They will no longer be able to sign in.`)) {
                        onRun(
                          () => post({ action: 'user-delete', id: u.id }),
                          'Team member removed',
                        );
                      }
                    }}
                  >
                    Remove
                  </button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <form
        className="enquiry-card enquiry-form team-member-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          const ok = await onRun(
            () =>
              post({
                action: 'user-create',
                user: {
                  email: data.get('email'),
                  name: data.get('name'),
                  password: data.get('password'),
                  role,
                },
              }),
            'Team member added',
          );
          if (ok) {
            form.reset();
            setRole('staff');
          }
        }}
      >
        <h3>Add a team member</h3>
        <p className="team-help">
          Give your colleague access to properties and enquiries. Choose Staff for day-to-day work.
        </p>
        <div className="form-grid">
          <label>
            Full name
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              placeholder="Full name"
              autoComplete="off"
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              required
              maxLength={200}
              autoComplete="off"
              placeholder="colleague@example.com"
            />
          </label>
          <label>
            Temporary password
            <input
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={200}
              autoComplete="new-password"
            />
          </label>
          <Choice
            label="ROLE"
            value={role}
            onChange={setRole}
            options={[
              ['staff', 'Staff (cannot delete)'],
              ['owner', 'Owner (full access)'],
            ]}
          />
        </div>
        <p className="form-footnote">
          At least 12 characters with upper-case, lower-case and a number.
        </p>
        <button className="button" disabled={busy}>
          {busy ? 'Adding team member?' : 'Add team member'}
        </button>
      </form>
    </>
  );
}

function PasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="team-dialog">
        <DialogTitle>Change your password</DialogTitle>
        <DialogDescription>
          Use at least 12 characters with upper-case, lower-case and a number.
        </DialogDescription>
        <form
          className="enquiry-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            setBusy(true);
            setError('');
            try {
              await post({
                action: 'change-password',
                current: data.get('current'),
                password: data.get('password'),
              });
              toast('Password changed');
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to change password.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Current password
            <input name="current" type="password" required autoComplete="current-password" />
          </label>
          <label>
            New password
            <input
              name="password"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
