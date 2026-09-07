import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HELP_GUIDE_SECTIONS } from '@/src/data/helpGuide';

export function generateStaticParams() {
  return HELP_GUIDE_SECTIONS.map((section) => ({ slug: section.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = HELP_GUIDE_SECTIONS.find((s) => s.id === slug);
  return { title: section ? `${section.title} — Tally User Guide` : 'Tally User Guide' };
}

export default async function GuideSectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const index = HELP_GUIDE_SECTIONS.findIndex((s) => s.id === slug);
  if (index === -1) notFound();

  const section = HELP_GUIDE_SECTIONS[index];
  const prev = index > 0 ? HELP_GUIDE_SECTIONS[index - 1] : null;
  const next = index < HELP_GUIDE_SECTIONS.length - 1 ? HELP_GUIDE_SECTIONS[index + 1] : null;

  return (
    <div>
      <div className="ha-card" style={{ padding: '1.75rem', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--ha-ink)', fontFamily: 'var(--ha-font-display)', marginBottom: '0.85rem' }}>
          {section.title}
        </h1>
        {section.body.map((line, idx) => (
          <p key={idx} style={{ fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--ha-ink)', marginBottom: '0.85rem' }}>
            {line}
          </p>
        ))}
        {section.screenshots?.map((shot, idx) => (
          <figure key={idx} style={{ margin: '1.25rem 0 0' }}>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        {prev ? (
          <Link href={`/guide/${prev.id}`} className="ha-card ha-card-interactive" style={{ padding: '0.85rem 1.1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
            <ChevronLeft size={16} color="var(--ha-muted)" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--ha-muted)' }}>Previous</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ha-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prev.title}</div>
            </div>
          </Link>
        ) : <div style={{ flex: 1 }} />}
        {next ? (
          <Link href={`/guide/${next.id}`} className="ha-card ha-card-interactive" style={{ padding: '0.85rem 1.1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', flex: 1, minWidth: 0, textAlign: 'right' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--ha-muted)' }}>Next</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ha-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{next.title}</div>
            </div>
            <ChevronRight size={16} color="var(--ha-muted)" style={{ flexShrink: 0 }} />
          </Link>
        ) : <div style={{ flex: 1 }} />}
      </div>
    </div>
  );
}
