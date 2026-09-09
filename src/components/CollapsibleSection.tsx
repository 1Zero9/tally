import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}

const STORAGE_PREFIX = 'tally_collapsible_';

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id,
  title,
  subtitle,
  right,
  defaultOpen = true,
  children,
  className,
  style,
  bodyStyle,
}) => {
  const storageKey = `${STORAGE_PREFIX}${id}`;
  const [open, setOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored !== null) setOpen(stored === '1');
    } catch {
      // localStorage unavailable — fall back to defaultOpen
    }
    setHydrated(true);
  }, [storageKey]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        // ignore write failures (private browsing, quota, etc.)
      }
      return next;
    });
  };

  return (
    <div id={id} className={className ?? 'ha-card'} style={{ overflow: 'hidden', opacity: hydrated ? 1 : 0.98, scrollMarginTop: '9rem', ...style }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1rem 1.5rem',
          background: 'none',
          border: 'none',
          borderBottom: open ? '1px solid var(--ha-line)' : 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <ChevronDown
            size={16}
            color="var(--ha-muted)"
            style={{ flexShrink: 0, transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s ease' }}
          />
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '0.15rem' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {right && (
          <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
            {right}
          </div>
        )}
      </button>

      {open && <div style={bodyStyle}>{children}</div>}
    </div>
  );
};
