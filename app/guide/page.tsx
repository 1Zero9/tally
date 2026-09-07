import Link from 'next/link';
import { HELP_GUIDE_SECTIONS } from '@/src/data/helpGuide';
import { APP_VERSION } from '@/src/data/changelog';

export const metadata = {
  title: 'User Guide — Tally',
};

const QUICK_LINKS: { label: string; targetId: string }[] = [
  { label: 'Add an expense', targetId: 'expenses' },
  { label: 'Import a statement', targetId: 'statements' },
  { label: 'Set a budget', targetId: 'budgets' },
  { label: 'Invite your partner', targetId: 'sharing' },
  { label: 'Export your data', targetId: 'export' },
  { label: 'Ask Tally a question', targetId: 'ask' },
];

export default function GuidePage() {
  return (
    <div>
      <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--ha-ink)', fontFamily: 'var(--ha-font-display)', letterSpacing: '-0.01em', marginBottom: '0.35rem' }}>
        User guide
      </h1>
      <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginBottom: '1.5rem' }}>
        Last updated: v{APP_VERSION}
      </p>

      <div className="ha-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--ha-ink)', marginBottom: '0.75rem' }}>
          A full walkthrough of everything you can do in Tally, one topic per page. This same
          content also powers the in-app Help guide and the &quot;Ask Tally&quot; assistant&apos;s
          answers to how-to questions, so it&apos;s always kept in sync with what the app can
          actually do.
        </p>
        <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--ha-ink)', marginBottom: '1rem' }}>
          New to Tally? See <Link href="/about" style={{ color: 'var(--ha-blue)' }}>what it is</Link> first.
          Looking for architecture, the data model, or the API reference instead? See the{' '}
          <a href="/technical-overview" style={{ color: 'var(--ha-blue)' }}>Technical Overview</a>.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {QUICK_LINKS.map((q) => (
            <Link
              key={q.targetId}
              href={`/guide/${q.targetId}`}
              className="ha-chip"
              style={{ fontSize: '0.8rem', textDecoration: 'none', color: 'var(--ha-blue)', border: '1px solid var(--ha-blue)' }}
            >
              {q.label}
            </Link>
          ))}
        </div>
      </div>

      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ha-ink)', fontFamily: 'var(--ha-font-display)', marginBottom: '0.85rem' }}>
        Browse all topics
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {HELP_GUIDE_SECTIONS.map((section) => (
          <Link
            key={section.id}
            href={`/guide/${section.id}`}
            className="ha-card ha-card-interactive"
            style={{ padding: '1.1rem', textDecoration: 'none', display: 'block' }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.35rem' }}>
              {section.title}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {section.body[0]}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
