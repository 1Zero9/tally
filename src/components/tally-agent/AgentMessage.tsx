import React from 'react';
import { ArrowUpRight, ExternalLink, Sparkles } from 'lucide-react';
import type { TabId } from '../Navbar';
import type { FeedbackType } from '../../types/expense';
import type { AgentMessage as AgentMessageT } from './types';

interface AgentMessageProps {
  message: AgentMessageT;
  onNavigate: (tab: TabId) => void;
  onOpenFeedback: () => void;
  onRaise: (kind: FeedbackType) => void;
}

/**
 * User turns are compact right-aligned bubbles. Agent turns are not bubbles
 * at all — text paragraphs with optional native action buttons underneath,
 * so a response can feel like part of Tally rather than a chat transcript.
 */
export const AgentMessage: React.FC<AgentMessageProps> = ({ message, onNavigate, onOpenFeedback, onRaise }) => {
  if (message.role === 'user') {
    return (
      <div className="ha-agent-msg ha-agent-msg-user">
        <div className="ha-agent-bubble">{message.text}</div>
      </div>
    );
  }

  const paras = message.text.split(/\n{2,}/).filter(Boolean);

  return (
    <div className={`ha-agent-msg ha-agent-msg-agent${message.isError ? ' is-error' : ''}`}>
      {paras.map((p, i) => (
        <p key={i} className="ha-agent-para">{p}</p>
      ))}

      {message.cached && (
        <p className="ha-agent-cached">
          <Sparkles size={11} /> Answered from a previous question
        </p>
      )}

      {message.actions && message.actions.length > 0 && (
        <div className="ha-agent-msg-actions">
          {message.actions.map((a, i) => {
            if (a.href) {
              return (
                <a key={i} href={a.href} target="_blank" rel="noopener noreferrer" className="ha-agent-action">
                  {a.label} <ExternalLink size={12} />
                </a>
              );
            }
            return (
              <button
                key={i}
                type="button"
                className="ha-agent-action"
                onClick={() => {
                  if (a.openFeedback) onOpenFeedback();
                  else if (a.raise) onRaise(a.raise);
                  else if (a.tab) onNavigate(a.tab);
                }}
              >
                {a.label} <ArrowUpRight size={12} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
