import React, { useEffect, useRef, useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import type { TabId } from '../Navbar';
import type { FeedbackType } from '../../types/expense';
import { AgentHeader } from './AgentHeader';
import { AgentWelcome } from './AgentWelcome';
import { AgentConversation } from './AgentConversation';
import { AgentComposer } from './AgentComposer';
import { useTallyAgent } from './useTallyAgent';
import { LAUNCHER_POS_KEY, LAUNCHER_SIZE_DESKTOP } from './types';

interface AgentPanelProps {
  firstName: string;
  area?: string;
  onClose: () => void;
  onNavigate: (tab: TabId) => void;
  onOpenFeedback: () => void;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({
  firstName,
  area,
  onClose,
  onNavigate,
  onOpenFeedback,
}) => {
  const { messages, status, ask, reset, noteFeedbackLogged, isBusy } = useTallyAgent({ area });
  const [raising, setRaising] = useState<FeedbackType | null>(null);
  const [anchor, setAnchor] = useState<React.CSSProperties>();
  const panelRef = useRef<HTMLDivElement>(null);

  // Open from the corner the (draggable) launcher currently sits in, so the
  // panel feels connected to where you clicked. Mobile keeps its CSS bottom
  // sheet (no inline anchor).
  useEffect(() => {
    const compute = () => {
      if (window.matchMedia('(max-width: 640px)').matches) {
        setAnchor(undefined);
        return;
      }
      let lp: { left: number; top: number } | null = null;
      try {
        const raw = localStorage.getItem(LAUNCHER_POS_KEY);
        if (raw) {
          const p = JSON.parse(raw);
          if (typeof p?.left === 'number' && typeof p?.top === 'number') lp = p;
        }
      } catch { /* default corner */ }

      const s = LAUNCHER_SIZE_DESKTOP;
      const cx = lp ? lp.left + s / 2 : window.innerWidth - s / 2 - 16;
      const cy = lp ? lp.top + s / 2 : window.innerHeight - s / 2 - 16;
      const onLeft = cx < window.innerWidth / 2;
      const onTop = cy < window.innerHeight / 2;
      setAnchor({
        left: onLeft ? '1.25rem' : 'auto',
        right: onLeft ? 'auto' : 'max(1.25rem, env(safe-area-inset-right))',
        top: onTop ? '1.25rem' : 'auto',
        bottom: onTop ? 'auto' : 'max(1.25rem, env(safe-area-inset-bottom))',
      });
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (raising) setRaising(null);
        else onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, raising]);

  useEffect(() => {
    // move focus into the panel when it opens
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLTextAreaElement>('.ha-agent-composer-input')?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, []);

  const handleNavigate = (tab: TabId) => {
    onNavigate(tab);
    onClose();
  };

  const empty = messages.length === 0;
  const showWelcome = empty && !raising;

  return (
    <div
      className="ha-agent-panel"
      role="dialog"
      aria-label="Tally assistant"
      ref={panelRef}
      style={anchor}
    >
      <AgentHeader onClose={onClose} onMinimise={onClose} />

      <div className="ha-agent-body">
        {showWelcome ? (
          <AgentWelcome firstName={firstName} area={area} onPick={ask} disabled={isBusy} />
        ) : (
          <AgentConversation
            messages={messages}
            status={status}
            area={area}
            raising={raising}
            onNavigate={handleNavigate}
            onOpenFeedback={() => {
              onOpenFeedback();
              onClose();
            }}
            onRaise={setRaising}
            onFeedbackSubmitted={(kind, title) => {
              setRaising(null);
              noteFeedbackLogged(kind, title);
            }}
            onFeedbackCancel={() => setRaising(null)}
          />
        )}
      </div>

      <div className="ha-agent-footer">
        <div className="ha-agent-footer-row">
          <button
            type="button"
            className="ha-agent-raise-link"
            onClick={() => setRaising('BUG')}
          >
            <MessageSquarePlus size={13} /> Raise a bug, feature or idea
          </button>
          {!empty && (
            <button type="button" className="ha-agent-raise-link" onClick={reset}>
              New chat
            </button>
          )}
        </div>
        <AgentComposer onSend={ask} disabled={isBusy} />
      </div>
    </div>
  );
};
