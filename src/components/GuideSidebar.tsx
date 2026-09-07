'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import type { HelpGuideSection } from '../data/helpGuide';

function sectionMatches(section: HelpGuideSection, query: string): boolean {
  const haystack = `${section.title} ${section.body.join(' ')}`.toLowerCase();
  return haystack.includes(query);
}

interface GuideSidebarProps {
  sections: HelpGuideSection[];
}

export const GuideSidebar: React.FC<GuideSidebarProps> = ({ sections }) => {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  const trimmedQuery = query.trim().toLowerCase();
  const filteredSections = useMemo(() => {
    if (!trimmedQuery) return sections;
    return sections.filter((s) => sectionMatches(s, trimmedQuery));
  }, [sections, trimmedQuery]);

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
    <>
      {/* Desktop sidebar */}
      <aside className="ha-guide-sidebar">
        <div style={{ position: 'sticky', top: '1.5rem' }}>
          <Link
            href="/guide"
            style={{
              display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--ha-muted)',
              textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem', textDecoration: 'none',
            }}
          >
            ← Guide home
          </Link>
          {searchBox}
          <nav aria-label="Guide sections" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {filteredSections.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)' }}>No matching sections.</p>
            ) : (
              filteredSections.map((s) => {
                const href = `/guide/${s.id}`;
                const isActive = pathname === href;
                return (
                  <Link
                    key={s.id}
                    href={href}
                    className="ha-guide-index-link"
                    style={{
                      fontSize: '0.82rem',
                      color: isActive ? 'var(--ha-blue)' : 'var(--ha-ink)',
                      fontWeight: isActive ? 700 : 400,
                      backgroundColor: isActive ? 'var(--ha-blue-light)' : 'transparent',
                      textDecoration: 'none',
                      padding: '0.4rem 0.5rem',
                      borderRadius: 'var(--ha-radius-sm)',
                    }}
                  >
                    {s.title}
                  </Link>
                );
              })
            )}
          </nav>
        </div>
      </aside>

      {/* Mobile nav: search + a jump-to dropdown, since each choice is a full page navigation */}
      <div className="ha-guide-mobile-nav">
        {searchBox}
        <select
          aria-label="Jump to a guide section"
          className="ha-input"
          value={pathname && pathname.startsWith('/guide/') ? pathname : ''}
          onChange={(e) => {
            if (e.target.value) router.push(e.target.value);
          }}
          style={{ fontSize: '0.85rem' }}
        >
          <option value="" disabled>
            Jump to a section…
          </option>
          {filteredSections.map((s) => (
            <option key={s.id} value={`/guide/${s.id}`}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      <style>{`
        .ha-guide-sidebar {
          background-color: var(--ha-white);
          border: 1px solid var(--ha-line);
          border-radius: var(--ha-radius-lg);
          padding: 1.25rem;
        }
        .ha-guide-mobile-nav {
          display: none;
        }
        .ha-guide-index-link:hover {
          background-color: var(--ha-blue-light);
        }
        @media (max-width: 900px) {
          .ha-guide-sidebar {
            display: none;
          }
          .ha-guide-mobile-nav {
            display: block;
            margin-bottom: 1.25rem;
          }
        }
      `}</style>
    </>
  );
};
