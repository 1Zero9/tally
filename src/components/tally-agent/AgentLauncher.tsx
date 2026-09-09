import React from 'react';
import Image from 'next/image';
import type { AgentStatus } from './types';

interface AgentLauncherProps {
  onClick: () => void;
  status: AgentStatus;
  hidden?: boolean;
}

/**
 * The floating Tally mascot, bottom-right — the character itself is the
 * button, no backing disc. It bobs and wobbles gently on a loop (faster
 * while thinking). All motion is disabled app-wide under
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
      <Image src="/tally-agent2.png" alt="" fill sizes="104px" style={{ objectFit: 'contain' }} priority />
    </span>
  </button>
);
