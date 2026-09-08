import type { TabId } from '../Navbar';
import type { FeedbackType } from '../../types/expense';

export type AgentStatus = 'idle' | 'thinking' | 'answering' | 'success' | 'error';

export interface AgentAction {
  label: string;
  /** internal navigation target, opened in the app */
  tab?: TabId;
  /** external / guide link, opened in a new tab */
  href?: string;
  /** opens the raise-feedback form inline, optionally pre-set to a kind */
  raise?: FeedbackType;
  /** opens the app's full Feedback backlog modal */
  openFeedback?: boolean;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  /** plain answer text — rendered as paragraphs, never as raw markdown */
  text: string;
  /** optional richer trimmings under the text */
  actions?: AgentAction[];
  /** served from the internal KB rather than a fresh model call */
  cached?: boolean;
  /** this agent turn is an error notice */
  isError?: boolean;
}

export interface AgentSuggestion {
  label: string;
  question: string;
}
