import React from 'react';
import Image from 'next/image';
import { AgentSuggestions, suggestionsForArea } from './AgentSuggestions';

interface AgentWelcomeProps {
  firstName: string;
  area?: string;
  onPick: (question: string) => void;
  disabled?: boolean;
}

export const AgentWelcome: React.FC<AgentWelcomeProps> = ({ firstName, area, onPick, disabled }) => (
  <div className="ha-agent-welcome">
    <Image src="/tally-agent2.png" alt="" width={44} height={46} className="ha-agent-welcome-mark" />
    <h2 className="ha-agent-welcome-title">Hi {firstName}</h2>
    <p className="ha-agent-welcome-sub">What can I help you with?</p>
    <AgentSuggestions suggestions={suggestionsForArea(area)} onPick={onPick} disabled={disabled} />
  </div>
);
