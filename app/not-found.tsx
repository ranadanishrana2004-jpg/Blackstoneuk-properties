import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="main" className="container section empty-state">
      <span className="eyebrow">A DIFFERENT ADDRESS</span>
      <h1>
        This page has moved
        <br />
        <em>out of reach.</em>
      </h1>
      <p>Explore the collection or return home to find your next step.</p>
      <Link className="button" href="/">
        Back to Blackstone
      </Link>
    </main>
  );
}
