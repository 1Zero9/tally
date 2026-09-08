import React from 'react';
import type { AgentSuggestion } from './types';

interface AgentSuggestionsProps {
  suggestions: AgentSuggestion[];
  onPick: (question: string) => void;
  disabled?: boolean;
}

export const AgentSuggestions: React.FC<AgentSuggestionsProps> = ({ suggestions, onPick, disabled }) => (
  <div className="ha-agent-suggestions">
    {suggestions.map((s) => (
      <button
        key={s.label}
        type="button"
        className="ha-agent-chip"
        onClick={() => onPick(s.question)}
        disabled={disabled}
      >
        {s.label}
      </button>
    ))}
  </div>
);

/**
 * Starter prompts. The first few flex to the tab the user opened the
 * assistant from; the rest are always-useful staples.
 */
export function suggestionsForArea(area: string | undefined): AgentSuggestion[] {
  const byArea: Record<string, AgentSuggestion[]> = {
    reports: [
      { label: 'Where did my money go this month?', question: 'Where did my money go this month?' },
      { label: 'Compare this month with last month', question: 'How does my spending this month compare with last month?' },
    ],
    insights: [
      { label: 'Where can I reduce spending?', question: 'Where can I reduce spending?' },
      { label: 'Show my biggest expenses', question: 'What are my biggest expenses?' },
    ],
    accounts: [
      { label: 'How do I add an account?', question: 'How do I add an account?' },
      { label: 'What happens if I delete an account?', question: 'What happens if I delete an account?' },
    ],
    moneymap: [{ label: 'What does the Money Map show?', question: 'What does the Money Map screen show me?' }],
    flow: [{ label: 'What counts as a transfer?', question: 'What counts as a transfer in Tally?' }],
    goals: [{ label: 'How much have I saved this year?', question: 'How much have I saved this year?' }],
  };

  const contextual = byArea[area || ''] || [
    { label: 'Where did my money go this month?', question: 'Where did my money go this month?' },
    { label: 'Show my biggest expenses', question: 'What are my biggest expenses?' },
  ];

  return [
    ...contextual,
    { label: 'How much am I spending on subscriptions?', question: 'How much am I spending on subscriptions each month?' },
    { label: 'Help me with Tally', question: 'What can Tally help me do?' },
  ].slice(0, 4);
}
