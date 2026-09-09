import type { TabId } from '../Navbar';

const GENERAL = [
  'Ask me where your money went this month',
  'Need a hand with a statement?',
  "Want to know what's going out this week?",
  'Ask me how much you spend on subscriptions',
  'Not sure what a screen does? Ask me',
  'Ask me where you could cut back',
];

const BY_AREA: Partial<Record<TabId, string[]>> = {
  reports: ['Ask me to compare this month with last', 'Ask me your biggest expenses'],
  all: ['Ask me this category’s monthly total', 'Ask me what’s overdue'],
  calendar: ['Ask me what bills are due this week'],
  accounts: ['Ask me how to add an account', 'Ask what happens if you delete an account'],
  flow: ['Ask me what counts as a transfer'],
  goals: ['Ask me how much you’ve saved this year'],
  files: ['Ask me where your imported statements are'],
};

/** Pick a random prompt, biased toward one relevant to the current tab. */
export function pickNudgePrompt(tab: TabId): string {
  const area = BY_AREA[tab] ?? [];
  const pool = Math.random() < 0.55 && area.length ? area : GENERAL;
  return pool[Math.floor(Math.random() * pool.length)];
}
