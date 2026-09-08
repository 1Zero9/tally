import React, { useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';

interface AgentComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

/** Enter sends, Shift+Enter makes a new line. Auto-grows to a few lines. */
export const AgentComposer: React.FC<AgentComposerProps> = ({ onSend, disabled }) => {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  };

  const send = () => {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue('');
    requestAnimationFrame(() => {
      if (ref.current) ref.current.style.height = 'auto';
    });
  };

  return (
    <div className="ha-agent-composer">
      <textarea
        ref={ref}
        className="ha-agent-composer-input"
        placeholder="Ask Tally anything…"
        value={value}
        rows={1}
        onChange={(e) => {
          setValue(e.target.value);
          grow();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      <button
        type="button"
        className="ha-agent-send"
        onClick={send}
        disabled={!value.trim() || disabled}
        aria-label="Send"
      >
        <ArrowUp size={16} />
      </button>
    </div>
  );
};
