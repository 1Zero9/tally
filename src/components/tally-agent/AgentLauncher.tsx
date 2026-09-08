import React from 'react';
import Image from 'next/image';
import type { AgentStatus } from './types';

interface AgentLauncherProps {
  onClick: () => void;
  status: AgentStatus;
  hidden?: boolean;
}

/**
 * The floating Tally mascot, bottom-right. The character sits on a soft disc
 * for contrast and gently pulses (a faster pulse while thinking). All motion
 * is disabled app-wide under prefers-reduced-motion (see globals.css).
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
      <Image src="/tally-agent2.png" alt="" fill sizes="48px" style={{ objectFit: 'contain' }} priority />
    </span>
  </button>
);
