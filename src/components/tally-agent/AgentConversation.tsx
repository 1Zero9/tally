import React, { useEffect, useRef } from 'react';
import type { TabId } from '../Navbar';
import type { FeedbackType } from '../../types/expense';
import type { AgentMessage as AgentMessageT, AgentStatus } from './types';
import { AgentMessage } from './AgentMessage';
import { AgentFeedbackForm } from './AgentFeedbackForm';

interface AgentConversationProps {
  messages: AgentMessageT[];
  status: AgentStatus;
  area?: string;
  raising: FeedbackType | null;
  onNavigate: (tab: TabId) => void;
  onOpenFeedback: () => void;
  onRaise: (kind: FeedbackType) => void;
  onFeedbackSubmitted: (kind: FeedbackType, title: string) => void;
  onFeedbackCancel: () => void;
}

export const AgentConversation: React.FC<AgentConversationProps> = ({
  messages,
  status,
  area,
  raising,
  onNavigate,
  onOpenFeedback,
  onRaise,
  onFeedbackSubmitted,
  onFeedbackCancel,
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, status, raising]);

  return (
    <div className="ha-agent-convo">
      {messages.map((m) => (
        <AgentMessage
          key={m.id}
          message={m}
          onNavigate={onNavigate}
          onOpenFeedback={onOpenFeedback}
          onRaise={onRaise}
        />
      ))}

      {status === 'thinking' && (
        <div className="ha-agent-msg ha-agent-msg-agent">
          <div className="ha-agent-typing" aria-label="Tally is thinking">
            <span /><span /><span />
          </div>
        </div>
      )}

      {raising && (
        <AgentFeedbackForm
          defaultKind={raising}
          area={area}
          onSubmitted={onFeedbackSubmitted}
          onCancel={onFeedbackCancel}
        />
      )}

      <div ref={endRef} />
    </div>
  );
};
