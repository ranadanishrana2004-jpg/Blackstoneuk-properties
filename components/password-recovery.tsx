'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PasswordField } from './password-field';
export function PasswordRecovery() {
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    const readLink = () => {
      const incoming = new URLSearchParams(window.location.hash.slice(1)).get('token');
      if (incoming) {
        setToken(incoming);
        setDone(false);
        window.history.replaceState(null, '', window.location.pathname);
      }
      setReady(true);
    };
    readLink();
    window.addEventListener('hashchange', readLink);
    return () => window.removeEventListener('hashchange', readLink);
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError('');
    setMessage('');
    if (token && form.get('password') !== form.get('confirm')) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/team/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          token
            ? { action: 'complete', token, password: form.get('password') }
            : { action: 'request', email: form.get('email') },
        ),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Please try again.');
      setMessage(result.message);
      if (token) {
        setToken('');
        setDone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="container section team-workspace">
      <form className="enquiry-card login-card enquiry-form" onSubmit={submit}>
        <span className="eyebrow">TEAM ACCOUNT RECOVERY</span>
        <h1>
          {done ? 'Password updated' : token ? 'Choose a new password' : 'Forgot your password?'}
        </h1>
        <p>
          {done
            ? 'Sign in again using your new password.'
            : token
              ? 'Use at least 12 characters, including upper-case, lower-case and a number.'
              : 'Enter your team email and we will send you a secure reset link.'}
        </p>
        {ready &&
          !done &&
          (token ? (
            <>
              <PasswordField
                label="New password"
                name="password"
                required
                minLength={12}
                maxLength={200}
                autoComplete="new-password"
              />
              <PasswordField
                label="Confirm password"
                name="confirm"
                required
                minLength={12}
                maxLength={200}
                autoComplete="new-password"
              />
            </>
          ) : (
            <label>
              Email address
              <input
                name="email"
                type="email"
                required
                maxLength={200}
                autoComplete="username"
                placeholder="you@example.com"
              />
            </label>
          ))}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="recovery-message">
            {message}
          </p>
        )}
        {ready && !done && (
          <button className="button" disabled={busy}>
            {busy ? 'Please wait?' : token ? 'Update password' : 'Send reset link'}
          </button>
        )}
        {token && (
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setToken('');
              setError('');
              setMessage('');
            }}
          >
            Request another reset link
          </button>
        )}
        <Link className="text-link" href="/manage">
          Back to sign in
        </Link>
      </form>
    </main>
  );
}
