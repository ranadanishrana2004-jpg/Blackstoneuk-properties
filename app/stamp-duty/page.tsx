import { Intro } from '@/components/property-pages';
import { StampDutyCalculator } from '@/components/stamp-duty';

export const metadata = {
  title: 'Stamp duty calculator',
  description:
    'Estimate Stamp Duty Land Tax for a home purchase in England and Northern Ireland, including first-time buyer relief and surcharges.',
  alternates: { canonical: '/stamp-duty' },
};

export default function Page() {
  return (
    <main id="main">
      <Intro
        eyebrow="BUYING GUIDE"
        title="Stamp duty,"
        emphasis="without the guesswork."
        text="Estimate the Stamp Duty Land Tax on your next home so you can plan the full cost of your move."
      />
      <section className="container section">
        <StampDutyCalculator />
      </section>
    </main>
  );
}
