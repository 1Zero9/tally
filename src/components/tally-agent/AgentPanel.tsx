import React, { useEffect, useRef, useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import type { TabId } from '../Navbar';
import type { FeedbackType } from '../../types/expense';
import { AgentHeader } from './AgentHeader';
import { AgentWelcome } from './AgentWelcome';
import { AgentConversation } from './AgentConversation';
import { AgentComposer } from './AgentComposer';
import { useTallyAgent } from './useTallyAgent';

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
  const panelRef = useRef<HTMLDivElement>(null);

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
