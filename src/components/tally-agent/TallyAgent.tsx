'use client';

import React, { useEffect, useRef } from 'react';
import type { TabId } from '../Navbar';
import { AgentLauncher } from './AgentLauncher';
import { AgentPanel } from './AgentPanel';

interface TallyAgentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firstName: string;
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
  onOpenFeedback: () => void;
}

/**
 * The Tally Agent — the fifth tally mark, come alive. A subtle floating
 * launcher bottom-right on every screen; clicking it opens a right-side
 * assistant panel (a near-full sheet on mobile). Wired to the existing
 * /api/assistant/ask endpoint; no new model plumbing.
 */
export const TallyAgent: React.FC<TallyAgentProps> = ({
  open,
  onOpenChange,
  firstName,
  activeTab,
  onNavigate,
  onOpenFeedback,
}) => {
  const launcherWasFocused = useRef(false);

  // Return focus to the launcher when the panel closes.
  useEffect(() => {
    if (!open && launcherWasFocused.current) {
      launcherWasFocused.current = false;
      document.querySelector<HTMLButtonElement>('.ha-agent-launcher')?.focus();
    }
  }, [open]);

  return (
    <>
      <AgentLauncher
        status={open ? 'answering' : 'idle'}
        hidden={open}
        onClick={() => {
          launcherWasFocused.current = true;
          onOpenChange(true);
        }}
      />

      {open && (
        <>
          <div className="ha-agent-scrim" aria-hidden="true" />
          <AgentPanel
            firstName={firstName}
            area={activeTab}
            onClose={() => onOpenChange(false)}
            onNavigate={onNavigate}
            onOpenFeedback={onOpenFeedback}
          />
        </>
      )}
    </>
  );
};
