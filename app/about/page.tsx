import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Users, ArrowLeftRight, Sparkles, ShieldCheck, ScanLine, Landmark, ArrowLeftRight as FlowIcon, PieChart } from 'lucide-react';
import { TallyLogo } from '@/src/components/TallyLogo';

export const metadata = {
  title: 'About — Tally',
};

const FEATURES: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    icon: <Users size={20} color="var(--ha-blue)" />,
    title: 'One shared ledger, not five spreadsheets',
    body: 'Everyone in the household sees the same accounts, bills, income, and goals — no copy-pasting numbers between people.',
  },
  {
    icon: <ArrowLeftRight size={20} color="var(--ha-blue)" />,
    title: 'Real money movements, not guesses',
    body: 'Log actual transfers and reconcile them against real bank statements — CSV, PDF, or just a photo — so your numbers match what actually happened.',
  },
  {
    icon: <Sparkles size={20} color="var(--ha-blue)" />,
    title: 'AI that works for you, on demand',
    body: 'Ask a plain-English question, scan a receipt, or run a money-flow analysis whenever you want — always using only your own household\'s data.',
  },
  {
    icon: <ShieldCheck size={20} color="var(--ha-blue)" />,
    title: 'Every number is traceable',
    body: 'Nothing is a black-box estimate — every figure ties back to a real bill, transfer, or statement row you can click into and check.',
  },
];

const STEPS: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    icon: <Landmark size={22} color="var(--ha-blue)" />,
    title: 'Add your accounts and bills',
    body: 'Bank accounts, cards, loans, subscriptions, and income — or import a statement and let Tally read it for you.',
  },
  {
    icon: <FlowIcon size={22} color="var(--ha-blue)" />,
    title: 'Log the real money movements',
    body: 'Every transfer in, out, and between accounts — reconciled against real statements, not projected from bills alone.',
  },
  {
    icon: <PieChart size={22} color="var(--ha-blue)" />,
    title: 'See the real picture',
    body: 'A dashboard, a money map, and reports built from what actually happened — plus AI insights on where you could save.',
  },
];

const SCREENSHOTS: { src: string; alt: string }[] = [
  { src: '/about/overview.png', alt: 'Tally Overview dashboard' },
  { src: '/about/money-map.png', alt: 'Tally Money Map showing the real journey of money in and out' },
  { src: '/about/reports.png', alt: 'Tally Reports tab with a spending trends chart' },
  { src: '/about/add-expense.png', alt: 'Tally Add expense form' },
];

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--ha-paper)' }}>
      <header style={{ borderBottom: '1px solid var(--ha-line)', backgroundColor: 'var(--ha-white)', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--ha-ink)' }}>
            <TallyLogo size={26} />
            <span style={{ fontWeight: 700, fontFamily: 'var(--ha-font-display)' }}>Tally</span>
          </Link>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', color: 'var(--ha-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            <ArrowLeft size={14} />
            Back to app
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: '780px', margin: '0 auto', padding: '4.5rem 1.5rem 2.5rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
          <TallyLogo size={56} />
        </div>
        <h1 style={{
          fontSize: 'clamp(2.2rem, 5vw, 3rem)', fontWeight: 700, color: 'var(--ha-ink)',
          fontFamily: 'var(--ha-font-display)', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '1rem',
        }}>
          Your household, in balance.
        </h1>
        <p style={{ fontSize: '1.15rem', lineHeight: 1.6, color: 'var(--ha-muted)', marginBottom: '2rem' }}>
          A shared household ledger for expenses, income, accounts, and the real journey your
          money takes — plus AI-assisted insights, always on your own data, only when you ask.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary" style={{ fontSize: '0.9rem', padding: '0.75rem 1.5rem', textDecoration: 'none' }}>
            Sign in
          </Link>
          <Link href="/guide" className="btn btn-secondary" style={{ fontSize: '0.9rem', padding: '0.75rem 1.5rem', textDecoration: 'none' }}>
            See the full guide
          </Link>
        </div>
      </section>

      {/* Screenshot gallery */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem 3.5rem' }}>
        <div className="ha-about-gallery">
          {SCREENSHOTS.map((shot) => (
            <div key={shot.src} style={{ position: 'relative', aspectRatio: '1440 / 900', borderRadius: 'var(--ha-radius-lg)', border: '1px solid var(--ha-line)', overflow: 'hidden', boxShadow: 'var(--ha-shadow)' }}>
              <Image src={shot.src} alt={shot.alt} fill style={{ objectFit: 'cover', objectPosition: 'top' }} sizes="(max-width: 700px) 90vw, 520px" />
            </div>
          ))}
        </div>
      </section>

      {/* Why Tally */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem 3.5rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--ha-ink)', fontFamily: 'var(--ha-font-display)', textAlign: 'center', marginBottom: '2rem' }}>
          Most budgeting apps ask you to trust category totals. Tally shows you the real thing.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="ha-card" style={{ padding: '1.5rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: 'var(--ha-radius-sm)', backgroundColor: 'var(--ha-blue-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem',
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.4rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--ha-muted)' }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem 3.5rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--ha-ink)', fontFamily: 'var(--ha-font-display)', textAlign: 'center', marginBottom: '2rem' }}>
          How it works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {STEPS.map((s, idx) => (
            <div key={s.title} style={{ textAlign: 'center' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--ha-white)', border: '1px solid var(--ha-line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: 'var(--ha-shadow)',
              }}>
                {s.icon}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ha-blue)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
                Step {idx + 1}
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.4rem' }}>{s.title}</h3>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--ha-muted)' }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: '640px', margin: '0 auto', padding: '0 1.5rem 4.5rem', textAlign: 'center' }}>
        <div className="ha-card" style={{ padding: '2.5rem 2rem' }}>
          <ScanLine size={28} color="var(--ha-blue)" style={{ marginBottom: '0.85rem' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.6rem' }}>
            Tally is invite-only
          </h2>
          <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--ha-muted)', marginBottom: '1.5rem' }}>
            It&apos;s built for one household at a time, not open signup. If you&apos;ve been sent this
            page, ask whoever set up your household&apos;s workspace to invite you by email —
            otherwise, if you already have an account, sign in below.
          </p>
          <Link href="/" className="btn btn-primary" style={{ fontSize: '0.9rem', padding: '0.75rem 1.75rem', textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </section>

      <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', paddingBottom: '2.5rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
        <Link href="/guide" style={{ color: 'var(--ha-muted)' }}>User Guide</Link>
        <Link href="/privacy" style={{ color: 'var(--ha-muted)' }}>Privacy Policy</Link>
        <Link href="/terms" style={{ color: 'var(--ha-muted)' }}>Terms &amp; Disclaimer</Link>
        <Link href="/technical-overview" style={{ color: 'var(--ha-muted)' }}>Technical Overview</Link>
      </div>

      <style>{`
        .ha-about-gallery {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }
        @media (max-width: 700px) {
          .ha-about-gallery {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
