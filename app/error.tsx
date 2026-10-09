'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="container section empty-state">
      <span className="eyebrow">SOMETHING WENT WRONG</span>
      <h1>
        We could not load this page.
        <br />
        <em>Please try again.</em>
      </h1>
      <p>If the problem continues, contact the team and we will help directly.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
