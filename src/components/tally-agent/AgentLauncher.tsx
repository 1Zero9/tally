import React from 'react';
import Image from 'next/image';
import type { AgentStatus } from './types';

interface AgentLauncherProps {
  onClick: () => void;
  status: AgentStatus;
  hidden?: boolean;
}

/**
 * The floating fifth Tally mark, bottom-right. The mascot itself is the
 * button — no enclosing coloured circle. A very slow idle drift; a slower
 * pulse while thinking. All motion is disabled app-wide under
 * prefers-reduced-motion (see globals.css).
 */
export const AgentLauncher: React.FC<AgentLauncherProps> = ({ onClick, status, hidden }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Open Tally, your finance assistant"
    className={`ha-agent-launcher${status === 'thinking' ? ' is-thinking' : ''}`}
    data-hidden={hidden ? 'true' : undefined}
  >
    <span className="ha-agent-launcher-img">
      <Image src="/tally-agent.png" alt="" fill sizes="60px" style={{ objectFit: 'contain' }} priority />
    </span>
  </button>
);
