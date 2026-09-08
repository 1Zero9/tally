import { useCallback, useRef, useState } from 'react';
import { getErrorMessage } from '../../lib/errors';
import type { FeedbackType } from '../../types/expense';
import type { AgentMessage, AgentStatus } from './types';

let seq = 0;
const nextId = () => `m${Date.now()}_${seq++}`;

/** Rough "is the user trying to report something" sniff, used only to offer
 *  the raise-feedback shortcut — never to suppress a real answer. */
function looksLikeFeedback(text: string): boolean {
  return /\b(bug|broken|not working|doesn'?t work|feature request|feature idea|suggestion|suggest|please add|it would be good if|can you add|there'?s a problem|glitch)\b/i.test(
    text
  );
}

interface UseTallyAgentOptions {
  /** current tab, sent as lightweight context and used to tag raised feedback */
  area?: string;
}

export function useTallyAgent({ area }: UseTallyAgentOptions = {}) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const inFlight = useRef(false);

  const reset = useCallback(() => {
    setMessages([]);
    setStatus('idle');
  }, []);

  const ask = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || inFlight.current) return;
      inFlight.current = true;

      const userMsg: AgentMessage = { id: nextId(), role: 'user', text: question };
      setMessages((m) => [...m, userMsg]);
      setStatus('thinking');

      try {
        const res = await fetch('/api/assistant/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, area }),
        });
        const data = await res.json();
        if (data.status !== 'ok') throw new Error(data.message || 'Failed to get an answer');

        const agentMsg: AgentMessage = {
          id: nextId(),
          role: 'agent',
          text: String(data.answer || '').trim() || "I couldn't find an answer to that.",
          cached: !!data.cached,
          actions: looksLikeFeedback(question)
            ? [
                { label: 'Report a bug', raise: 'BUG' as FeedbackType },
                { label: 'Request a feature', raise: 'FEATURE' as FeedbackType },
                { label: 'Share an idea', raise: 'IDEA' as FeedbackType },
              ]
            : undefined,
        };
        setMessages((m) => [...m, agentMsg]);
        setStatus('success');
      } catch (err: unknown) {
        setMessages((m) => [
          ...m,
          {
            id: nextId(),
            role: 'agent',
            text: getErrorMessage(err, 'I couldn’t get an answer right now. Try again in a moment.'),
            isError: true,
          },
        ]);
        setStatus('error');
      } finally {
        inFlight.current = false;
      }
    },
    [area]
  );

  /** Adds a small agent confirmation line after feedback is logged. */
  const noteFeedbackLogged = useCallback((kind: FeedbackType, title: string) => {
    const word = kind === 'BUG' ? 'bug' : kind === 'FEATURE' ? 'feature request' : 'idea';
    setMessages((m) => [
      ...m,
      {
        id: nextId(),
        role: 'agent',
        text: `Logged your ${word}: “${title}”. It's now in your Feedback backlog with the rest.`,
        actions: [{ label: 'Open Feedback backlog', openFeedback: true }],
      },
    ]);
  }, []);

  return { messages, status, ask, reset, noteFeedbackLogged, isBusy: status === 'thinking' };
}
