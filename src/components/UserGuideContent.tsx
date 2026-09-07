'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Search, X } from 'lucide-react';
import { TallyLogo } from './TallyLogo';
import { CollapsibleSection } from './CollapsibleSection';
import type { HelpGuideSection } from '../data/helpGuide';

interface QuickLink {
  label: string;
  targetId: string;
}

const QUICK_LINKS: QuickLink[] = [
  { label: 'Add an expense', targetId: 'expenses' },
  { label: 'Import a statement', targetId: 'statements' },
  { label: 'Set a budget', targetId: 'budgets' },
  { label: 'Invite your partner', targetId: 'sharing' },
  { label: 'Export your data', targetId: 'export' },
  { label: 'Ask Tally a question', targetId: 'ask' },
];

function sectionMatches(section: HelpGuideSection, query: string): boolean {
  const haystack = `${section.title} ${section.body.join(' ')}`.toLowerCase();
  return haystack.includes(query);
}

interface UserGuideContentProps {
  sections: HelpGuideSection[];
  version: string;
}

export const UserGuideContent: React.FC<UserGuideContentProps> = ({ sections, version }) => {
  const [query, setQuery] = useState('');

  const trimmedQuery = query.trim().toLowerCase();
  const filteredSections = useMemo(() => {
    if (!trimmedQuery) return sections;
    return sections.filter((s) => sectionMatches(s, trimmedQuery));
  }, [sections, trimmedQuery]);

  const indexList = (
    <nav aria-label="Guide sections" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      {filteredSections.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)' }}>No matching sections.</p>
      ) : (
        filteredSections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            style={{
              fontSize: '0.82rem',
              color: 'var(--ha-ink)',
              textDecoration: 'none',
              padding: '0.4rem 0.5rem',
              borderRadius: 'var(--ha-radius-sm)',
            }}
            className="ha-guide-index-link"
          >
            {s.title}
          </a>
        ))
      )}
    </nav>
  );

  const searchBox = (
    <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
      <Search size={15} color="var(--ha-muted)" style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the guide"
        aria-label="Search the guide"
        className="ha-input"
        style={{ paddingLeft: '2.1rem', paddingRight: query ? '2rem' : '0.85rem', fontSize: '0.85rem' }}
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          aria-label="Clear search"
          title="Clear search"
          style={{
            position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: 'var(--ha-muted)', cursor: 'pointer', padding: '0.2rem',
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );

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
        <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--ha-ink)', fontFamily: 'var(--ha-font-display)', letterSpacing: '-0.01em', marginBottom: '0.35rem' }}>
          User guide
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginBottom: '1.5rem' }}>
          Last updated: v{version}
        </p>

        <div className="ha-guide-layout">
          <aside className="ha-guide-sidebar">
            <div style={{ position: 'sticky', top: '1.5rem' }}>
              {searchBox}
              {indexList}
            </div>
          </aside>

          <div className="ha-guide-mobile-index">
            <CollapsibleSection id="guide-mobile-index" title="Search & jump to a section" defaultOpen={false}>
              <div style={{ padding: '0 1.25rem 1.25rem' }}>
                {searchBox}
                {indexList}
              </div>
            </CollapsibleSection>
          </div>

          <div>
            <div className="ha-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--ha-ink)', marginBottom: '0.75rem' }}>
                A full walkthrough of everything you can do in Tally. This same content also powers the
                in-app Help guide and the &quot;Ask Tally&quot; assistant&apos;s answers to how-to
                questions, so it&apos;s always kept in sync with what the app can actually do.
              </p>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--ha-ink)', marginBottom: '1rem' }}>
                Looking for architecture, the data model, or the API reference instead? See the{' '}
                <a href="/technical-overview" style={{ color: 'var(--ha-blue)' }}>Technical Overview</a>.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {QUICK_LINKS.map((q) => (
                  <a
                    key={q.targetId}
                    href={`#${q.targetId}`}
                    className="ha-chip"
                    style={{ fontSize: '0.8rem', textDecoration: 'none', color: 'var(--ha-blue)', border: '1px solid var(--ha-blue)' }}
                  >
                    {q.label}
                  </a>
                ))}
              </div>
            </div>

            {filteredSections.length === 0 ? (
              <div className="ha-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.88rem' }}>
                No sections match &quot;{query.trim()}&quot;. Try a different search term.
              </div>
            ) : (
              filteredSections.map((section) => (
                <div key={section.id} id={section.id} className="ha-card" style={{ padding: '1.75rem', marginBottom: '1.25rem', scrollMarginTop: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ha-ink)', fontFamily: 'var(--ha-font-display)', marginBottom: '0.75rem' }}>
                    {section.title}
                  </h2>
                  {section.body.map((line, idx) => (
                    <p key={idx} style={{ fontSize: '0.88rem', lineHeight: 1.65, color: 'var(--ha-ink)', marginBottom: '0.75rem' }}>
                      {line}
                    </p>
                  ))}
                  {section.screenshots?.map((shot, idx) => (
                    <figure key={idx} style={{ margin: '1rem 0 0' }}>
                      <div style={{ position: 'relative', width: '100%', aspectRatio: '1440 / 900', borderRadius: 'var(--ha-radius-md)', border: '1px solid var(--ha-line)', overflow: 'hidden' }}>
                        <Image
                          src={shot.src}
                          alt={shot.alt}
                          fill
                          style={{ objectFit: 'cover', objectPosition: 'top' }}
                          sizes="(max-width: 900px) 100vw, 900px"
                        />
                      </div>
                      <figcaption style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', marginTop: '0.4rem' }}>
                        {shot.caption}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginTop: '1.5rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
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
        .ha-guide-sidebar {
          background-color: var(--ha-white);
          border: 1px solid var(--ha-line);
          border-radius: var(--ha-radius-lg);
          padding: 1.25rem;
        }
        .ha-guide-mobile-index {
          display: none;
        }
        .ha-guide-index-link:hover {
          background-color: var(--ha-blue-light);
        }
        @media (max-width: 900px) {
          .ha-guide-layout {
            grid-template-columns: 1fr;
          }
          .ha-guide-sidebar {
            display: none;
          }
          .ha-guide-mobile-index {
            display: block;
            margin-bottom: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
};
