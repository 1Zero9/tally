import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { LAUNCHER_POS_KEY, LAUNCHER_SIZE_DESKTOP, LAUNCHER_SIZE_MOBILE, type AgentStatus } from './types';

interface AgentLauncherProps {
  onClick: () => void;
  status: AgentStatus;
  hidden?: boolean;
  /** A one-off prompt to show in a bubble by the launcher, or null. */
  nudge?: string | null;
  onNudgeOpen?: () => void;
  onNudgeDismiss?: () => void;
  onNudgeDisable?: () => void;
}

const STORAGE_KEY = LAUNCHER_POS_KEY;
const EDGE_MARGIN = 12;
const CORNER_INSET = 16; // matches the CSS default right/bottom of 1rem
const DRAG_THRESHOLD = 4; // px moved before it counts as a drag, not a tap

type Pos = { left: number; top: number };

function launcherSize(): number {
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches) return LAUNCHER_SIZE_MOBILE;
  return LAUNCHER_SIZE_DESKTOP;
}

/** The untransformed top-left the button sits at with no saved position. */
function defaultCornerPos(): Pos {
  const size = launcherSize();
  return {
    left: window.innerWidth - size - CORNER_INSET,
    top: window.innerHeight - size - CORNER_INSET,
  };
}

// The quick-hide privacy button lives at the bottom-left and sits above the
// launcher, so the launcher must never be dropped on top of it — otherwise
// a tap "on Tally" actually hits the panic button and blurs the screen.
const PANIC_KEEPOUT = 96;

function clampToViewport(p: Pos): Pos {
  const size = launcherSize();
  const maxLeft = Math.max(EDGE_MARGIN, window.innerWidth - size - EDGE_MARGIN);
  const maxTop = Math.max(EDGE_MARGIN, window.innerHeight - size - EDGE_MARGIN);
  let left = Math.min(Math.max(EDGE_MARGIN, p.left), maxLeft);
  let top = Math.min(Math.max(EDGE_MARGIN, p.top), maxTop);

  // Keep clear of the bottom-left panic button.
  const overlapsPanic = left < PANIC_KEEPOUT && top + size > window.innerHeight - PANIC_KEEPOUT;
  if (overlapsPanic) {
    const pushedRight = Math.min(PANIC_KEEPOUT, maxLeft);
    const pushedUp = Math.max(EDGE_MARGIN, window.innerHeight - PANIC_KEEPOUT - size);
    // Move it whichever way needs the smaller nudge.
    if (pushedRight - left <= top - pushedUp) left = pushedRight;
    else top = pushedUp;
  }
  return { left, top };
}

/**
 * The floating Tally mascot — the character itself is the button, no
 * backing disc. It bobs and wobbles gently on a loop (faster while
 * thinking), does a one-off wobble when it wants attention, and can pop a
 * prompt in a bubble beside it. Drag it anywhere; where you drop it is
 * remembered per browser. All idle motion is disabled app-wide under
 * prefers-reduced-motion (see globals.css).
 */
export const AgentLauncher: React.FC<AgentLauncherProps> = ({
  onClick,
  status,
  hidden,
  nudge,
  onNudgeOpen,
  onNudgeDismiss,
  onNudgeDisable,
}) => {
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  const [wobbling, setWobbling] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const posRef = useRef<Pos | null>(null);
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);

  const applyPos = useCallback((next: Pos | null) => {
    posRef.current = next;
    setPos(next);
  }, []);

  // Restore a saved position on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.left === 'number' && typeof parsed?.top === 'number') {
          applyPos(clampToViewport(parsed));
        }
      }
    } catch {
      /* private mode / blocked storage — fall back to the default corner */
    }
  }, [applyPos]);

  // Keep it on-screen if the window is resized.
  useEffect(() => {
    const onResize = () => {
      if (posRef.current) applyPos(clampToViewport(posRef.current));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [applyPos]);

  // One-shot wobble whenever a fresh nudge arrives.
  useEffect(() => {
    if (!nudge) return;
    setWobbling(true);
    const t = window.setTimeout(() => setWobbling(false), 850);
    return () => window.clearTimeout(t);
  }, [nudge]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    // Work from the button's untransformed top-left (its idle bob is a CSS
    // transform, so getBoundingClientRect would be a few px off). Don't pin
    // `pos` yet — only a real drag should stop it hugging the CSS corner.
    const base = posRef.current ?? defaultCornerPos();
    drag.current = { dx: e.clientX - base.left, dy: e.clientY - base.top, moved: false };
    btnRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const next = clampToViewport({ left: e.clientX - d.dx, top: e.clientY - d.dy });
    if (!d.moved) {
      const from = posRef.current ?? defaultCornerPos();
      if (Math.abs(next.left - from.left) > DRAG_THRESHOLD || Math.abs(next.top - from.top) > DRAG_THRESHOLD) {
        d.moved = true;
        setDragging(true);
      }
    }
    if (d.moved) applyPos(next);
  }, [applyPos]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    btnRef.current?.releasePointerCapture?.(e.pointerId);
    if (!d) return;
    if (!d.moved) {
      onClick();
      return;
    }
    setDragging(false);
    if (posRef.current) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current)); } catch { /* ignore */ }
    }
  }, [onClick]);

  // Where the bubble sits relative to the mascot.
  let place = 'above-right';
  if (typeof window !== 'undefined') {
    const p = pos ?? defaultCornerPos();
    const size = launcherSize();
    const vertical = p.top < 160 ? 'below' : 'above';
    const horizontal = p.left + size / 2 < window.innerWidth / 2 ? 'left' : 'right';
    place = `${vertical}-${horizontal}`;
  }

  return (
    <div
      className="ha-agent-launcher-wrap"
      data-hidden={hidden ? 'true' : undefined}
      style={pos ? { left: pos.left, top: pos.top, right: 'auto', bottom: 'auto' } : undefined}
    >
      {nudge && (
        <div className="ha-agent-nudge" data-place={place} role="status">
          <button type="button" className="ha-agent-nudge-body" onClick={onNudgeOpen}>
            {nudge}
          </button>
          <div className="ha-agent-nudge-actions">
            <button type="button" className="ha-agent-nudge-mute" onClick={onNudgeDisable}>
              Don&apos;t remind me
            </button>
            <button type="button" className="ha-agent-nudge-x" onClick={onNudgeDismiss} aria-label="Dismiss">
              ×
            </button>
          </div>
        </div>
      )}

      <button
        ref={btnRef}
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        aria-label="Open Tally, your finance assistant (drag to move)"
        className={`ha-agent-launcher${status === 'thinking' ? ' is-thinking' : ''}${wobbling ? ' is-nudging' : ''}`}
        data-dragging={dragging ? 'true' : undefined}
      >
        <span className="ha-agent-launcher-img">
          <Image src="/tally-agent2.png" alt="" fill sizes="104px" style={{ objectFit: 'contain' }} priority />
        </span>
      </button>
    </div>
  );
};
