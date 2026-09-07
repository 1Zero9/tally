import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TallyLogo } from '@/src/components/TallyLogo';
import { GuideSidebar } from '@/src/components/GuideSidebar';
import { HELP_GUIDE_SECTIONS } from '@/src/data/helpGuide';

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--ha-paper)' }}>
      <header style={{ borderBottom: '1px solid var(--ha-line)', backgroundColor: 'var(--ha-white)', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
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

      <main style={{ maxWidth: '1180px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        <div className="ha-guide-layout">
          <GuideSidebar sections={HELP_GUIDE_SECTIONS} />
          <div>{children}</div>
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginTop: '1.5rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
          <Link href="/about" style={{ color: 'var(--ha-muted)' }}>About Tally</Link>
          <Link href="/privacy" style={{ color: 'var(--ha-muted)' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: 'var(--ha-muted)' }}>Terms &amp; Disclaimer</Link>
          <Link href="/ai-transparency" style={{ color: 'var(--ha-muted)' }}>AI Transparency</Link>
          <Link href="/technical-overview" style={{ color: 'var(--ha-muted)' }}>Technical Overview</Link>
        </div>
      </main>

      <style>{`
        .ha-guide-layout {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 1.5rem;
          align-items: start;
        }
        .ha-guide-layout > * {
          min-width: 0;
        }
        @media (max-width: 900px) {
          .ha-guide-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
