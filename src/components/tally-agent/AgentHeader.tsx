import React from 'react';
import Image from 'next/image';
import { Minus, X } from 'lucide-react';

interface AgentHeaderProps {
  onClose: () => void;
  onMinimise: () => void;
}

export const AgentHeader: React.FC<AgentHeaderProps> = ({ onClose, onMinimise }) => (
  <header className="ha-agent-header">
    <Image src="/tally-agent2.png" alt="" width={29} height={30} className="ha-agent-header-mark" />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ha-ink)', lineHeight: 1.2 }}>Tally</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>Your finance assistant</div>
    </div>
    <button type="button" className="ha-agent-icon-btn" onClick={onMinimise} aria-label="Minimise assistant">
      <Minus size={16} />
    </button>
    <button type="button" className="ha-agent-icon-btn" onClick={onClose} aria-label="Close assistant">
      <X size={16} />
    </button>
  </header>
);
