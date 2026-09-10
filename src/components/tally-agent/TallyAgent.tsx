'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { TabId } from '../Navbar';
import { AgentLauncher, INTRO_SPIN_DONE_MS } from './AgentLauncher';
import { AgentPanel } from './AgentPanel';
import { pickNudgePrompt } from './nudgePrompts';

interface TallyAgentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firstName: string;
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
  onOpenFeedback: () => void;
  /** The privacy screen is up — the whole agent goes inert: launcher
   *  hidden, panel forced closed, no nudge. The assistant can surface
   *  household figures, so it must not be reachable over the blur. */
  blurred?: boolean;
}

const NUDGE_OFF_KEY = 'tally.agentNudgeOff';
const NUDGE_FIRST_MIN = 8_000;
const NUDGE_GAP_MIN = 14 * 60_000;
const NUDGE_GAP_MAX = 26 * 60_000;
const NUDGE_MAX_PER_SESSION = 2;
const NUDGE_VISIBLE_MS = 7_000;

// One-time "welcome" bubble, shown just after Tally's on-load spin.
const WELCOME_AFTER_MS = INTRO_SPIN_DONE_MS + 250;
const WELCOME_VISIBLE_MS = 8_000;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * The Tally Agent — the fifth tally mark, come alive. A subtle floating
 * launcher on every screen; clicking it opens a right-side assistant panel
 * (a near-full sheet on mobile). Every so often it gives a playful whirl and
 * pops a one-line prompt in a bubble, so it doesn't get forgotten —
 * capped, dismissable, and switch-off-able.
 */
export const TallyAgent: React.FC<TallyAgentProps> = ({
  open,
  onOpenChange,
  firstName,
  activeTab,
  onNavigate,
  onOpenFeedback,
  blurred = false,
}) => {
  const launcherWasFocused = useRef(false);
  const [nudge, setNudge] = useState<string | null>(null);

  const openRef = useRef(open);
  const activeTabRef = useRef(activeTab);
  const blurredRef = useRef(blurred);
  const firstNameRef = useRef(firstName);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { blurredRef.current = blurred; }, [blurred]);
  useEffect(() => { firstNameRef.current = firstName; }, [firstName]);

  // Privacy screen went up — hide any bubble and close the panel so the
  // assistant (which can echo household figures) isn't left open over the
  // blur. The launcher itself is hidden further down while blurred.
  useEffect(() => {
    if (blurred) {
      setNudge(null);
      if (open) onOpenChange(false);
    }
  }, [blurred, open, onOpenChange]);

  const requestOpen = () => {
    if (blurredRef.current) return;
    launcherWasFocused.current = true;
    onOpenChange(true);
  };

  // Return focus to the launcher when the panel closes.
  useEffect(() => {
    if (!open && launcherWasFocused.current) {
      launcherWasFocused.current = false;
      document.querySelector<HTMLButtonElement>('.ha-agent-launcher')?.focus();
    }
  }, [open]);

  // Clear the bubble as soon as the panel opens.
  useEffect(() => {
    if (open) setNudge(null);
  }, [open]);

  // One-time welcome bubble, timed to land just after Tally's on-load
  // spin. Fires once per page load; skipped if reminders are muted, the
  // panel is already open, the privacy screen is up, or the tab is hidden.
  useEffect(() => {
    try {
      if (localStorage.getItem(NUDGE_OFF_KEY) === '1') return;
    } catch { /* storage blocked — carry on */ }

    let hideTimer: number;
    const showTimer = window.setTimeout(() => {
      if (openRef.current || blurredRef.current || document.hidden) return;
      const name = firstNameRef.current;
      const greeting = name && name !== 'there' ? `Welcome, ${name}` : 'Welcome';
      setNudge(`${greeting} — I'm here to help whenever you need a hand.`);
      hideTimer = window.setTimeout(() => setNudge(null), WELCOME_VISIBLE_MS);
    }, WELCOME_AFTER_MS);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  // Occasional attention nudge.
  useEffect(() => {
    try {
      if (localStorage.getItem(NUDGE_OFF_KEY) === '1') return;
    } catch { /* storage blocked — just proceed */ }

    let shown = 0;
    let scheduleTimer: number;
    let hideTimer: number;

    const fire = () => {
      if (shown >= NUDGE_MAX_PER_SESSION) return;
      try {
        if (localStorage.getItem(NUDGE_OFF_KEY) === '1') return;
      } catch { /* storage blocked */ }
      if (openRef.current || blurredRef.current || document.hidden) {
        scheduleTimer = window.setTimeout(fire, 10_000);
        return;
      }
      shown += 1;
      setNudge(pickNudgePrompt(activeTabRef.current));
      hideTimer = window.setTimeout(() => setNudge(null), NUDGE_VISIBLE_MS);
      if (shown < NUDGE_MAX_PER_SESSION) {
        scheduleTimer = window.setTimeout(fire, rand(NUDGE_GAP_MIN, NUDGE_GAP_MAX));
      }
    };

    scheduleTimer = window.setTimeout(fire, NUDGE_FIRST_MIN + rand(0, 4_000));

    return () => {
      window.clearTimeout(scheduleTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  // While a bubble is up, the next real interaction outside it dismisses it.
  useEffect(() => {
    if (!nudge) return;
    const dismiss = (e: Event) => {
      const target = e.target as HTMLElement | null;
      // Clicks on the launcher / bubble itself are handled by their own
      // buttons — don't let them self-dismiss through this path.
      if (target?.closest?.('.ha-agent-launcher-wrap')) return;
      setNudge(null);
    };
    // Defer so the click that could have *triggered* the bubble doesn't
    // instantly close it.
    const t = window.setTimeout(() => {
      window.addEventListener('pointerdown', dismiss);
      window.addEventListener('keydown', dismiss);
    }, 400);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', dismiss);
    };
  }, [nudge]);

  const disableNudges = () => {
    try { localStorage.setItem(NUDGE_OFF_KEY, '1'); } catch { /* ignore */ }
    setNudge(null);
  };

  return (
    <>
      <AgentLauncher
        status={open ? 'answering' : 'idle'}
        hidden={open || blurred}
        nudge={nudge}
        onNudgeOpen={() => {
          setNudge(null);
          requestOpen();
        }}
        onNudgeDismiss={() => setNudge(null)}
        onNudgeDisable={disableNudges}
        onClick={requestOpen}
      />

      {open && !blurred && (
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
