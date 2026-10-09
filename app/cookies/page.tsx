export const metadata = { title: 'Cookie information' };
export default function Page() {
  return (
    <main id="main" className="container section legal-page">
      <span className="eyebrow">BROWSER PREFERENCES</span>
      <h1>Cookie information.</h1>
      <h2>A considered approach to storage</h2>
      <p>
        This website uses browser storage to remember light/dark mode and a shortlist on your
        device. The team workspace uses an essential, HTTP-only session cookie after sign-in. No
        advertising pixels or analytics cookies have been added.
      </p>
      <p>
        You can remove saved preferences and your shortlist through your browser’s site-data
        controls. Team sign-out clears the sign-in cookie.
      </p>
    </main>
  );
}
