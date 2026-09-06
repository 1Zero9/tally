import React from 'react';
import Link from 'next/link';
import type { UserProfile } from '../types/expense';
import { X, Sparkles, Plus, UserPlus, Download, Bell, Mail, ShieldCheck, Landmark, ArrowLeftRight, Target, Activity, CalendarClock, UserCog, FileSpreadsheet, ScanLine, BookOpen, Lock, HelpCircle } from 'lucide-react';
import { HELP_GUIDE_SECTIONS } from '../data/helpGuide';
import { useOverlayClose } from '../hooks/useOverlayClose';
import { useModalA11y } from '../hooks/useModalA11y';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  ask: <Sparkles size={16} color="var(--ha-blue)" />,
  expenses: <Plus size={16} color="var(--ha-blue)" />,
  assign: <UserCog size={16} color="var(--ha-blue)" />,
  scan: <ScanLine size={16} color="var(--ha-blue)" />,
  accounts: <Landmark size={16} color="var(--ha-blue)" />,
  statements: <FileSpreadsheet size={16} color="var(--ha-blue)" />,
  flow: <ArrowLeftRight size={16} color="var(--ha-blue)" />,
  goals: <Target size={16} color="var(--ha-blue)" />,
  planned: <CalendarClock size={16} color="var(--ha-blue)" />,
  moneymap: <Activity size={16} color="var(--ha-blue)" />,
  renewals: <Bell size={16} color="var(--ha-blue)" />,
  vendor: <Mail size={16} color="var(--ha-blue)" />,
  sharing: <UserPlus size={16} color="var(--ha-blue)" />,
  privacy: <Lock size={16} color="var(--ha-blue)" />,
  faq: <HelpCircle size={16} color="var(--ha-blue)" />,
  export: <Download size={16} color="var(--ha-blue)" />,
  admin: <ShieldCheck size={16} color="var(--ha-red)" />,
};

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ isOpen, onClose, currentUser }) => {
  const overlayHandlers = useOverlayClose(onClose);
  const { dialogRef, dialogProps } = useModalA11y(isOpen, onClose);
  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'ADMIN';
  const visibleSections = HELP_GUIDE_SECTIONS.filter((s) => !s.adminOnly || isAdmin);

  return (
    <div className="modal-overlay" {...overlayHandlers}>
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--ha-line)',
        }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              Help guide
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              A quick tour of what you can do in Tally
            </p>
          </div>

          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {visibleSections.map((section) => (
            <div key={section.id} style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: 'var(--ha-radius-sm)',
                backgroundColor: 'var(--ha-blue-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {SECTION_ICONS[section.id]}
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.3rem' }}>
                  {section.title}
                </h4>
                {section.body.map((line, idx) => (
                  <p key={idx} style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', lineHeight: 1.5, marginBottom: idx < section.body.length - 1 ? '0.4rem' : 0 }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--ha-line)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <Link
            href="/guide"
            target="_blank"
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--ha-blue)',
              textDecoration: 'none',
            }}
          >
            <BookOpen size={14} />
            <span>Read the full user guide</span>
          </Link>
          <p style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', textAlign: 'center', margin: 0 }}>
            Still stuck? Reach out to whoever set up your household workspace.
          </p>
        </div>
      </div>
    </div>
  );
};
