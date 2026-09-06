import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AccountItem, CurrencyCode, MapEdgeItem, MapNodeItem } from '../types/expense';
import { CURRENCY_LIST } from '../utils/currencies';
import { formatCurrency } from '../utils/formatters';
import { getErrorMessage } from '../lib/errors';
import { Plus, Link2, X, Trash2, MousePointer2 } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

interface CustomMoneyMapProps {
  accounts: AccountItem[];
  currency: CurrencyCode;
}

const CANVAS_W = 1200;
const CANVAS_H = 680;
const NODE_R = 38;
const EDGE_COLOR = '#7C5CFC';
const EDGE_COLOR_HOVER = '#5433D6';
const NODE_COLORS = ['#3155D9', '#3AA76D', '#D8443C', '#7C5CFC', '#E08E0B', '#0EA5A5'];
const DEFAULT_NODE_COLOR = NODE_COLORS[0];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function truncateLabel(label: string): string {
  return label.length > 16 ? `${label.slice(0, 14)}…` : label;
}

interface DragState {
  id: string;
  startClientX: number;
  startClientY: number;
  origX: number;
  origY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
}

async function apiCall<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = await res.json();
  if (data.status !== 'ok') {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

interface NodeFormModalProps {
  mode: 'add' | 'edit';
  accounts: AccountItem[];
  initial?: MapNodeItem;
  onClose: () => void;
  onSubmit: (data: { label: string; accountId: string | null; color: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const NodeFormModal: React.FC<NodeFormModalProps> = ({ mode, accounts, initial, onClose, onSubmit, onDelete }) => {
  const [label, setLabel] = useState(initial?.label || '');
  const [accountId, setAccountId] = useState(initial?.accountId || '');
  const [color, setColor] = useState(initial?.color || DEFAULT_NODE_COLOR);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const { dialogRef, dialogProps } = useModalA11y(true, onClose);

  const handleAccountSelect = (id: string) => {
    setAccountId(id);
    if (id) {
      const acc = accounts.find((a) => a.id === id);
      if (acc) setLabel(acc.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setIsSaving(true);
    setError('');
    try {
      await onSubmit({ label: label.trim(), accountId: accountId || null, color });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save'));
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--ha-line)',
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
            {mode === 'add' ? 'Add object' : 'Edit object'}
          </h3>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {accounts.length > 0 && (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Link to an existing account (optional)
              </label>
              <select value={accountId} onChange={(e) => handleAccountSelect(e.target.value)} className="ha-input">
                <option value="">Not linked — custom object</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}{a.institution ? ` — ${a.institution}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
              Label *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Car Loan — Credit Union"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="ha-input"
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.5rem' }}>
              Color
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {NODE_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: color === c ? '3px solid var(--ha-ink)' : '1px solid var(--ha-line)',
                    cursor: 'pointer',
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {error && (
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-red)' }}>{error}</p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.25rem', paddingTop: '1rem', borderTop: '1px solid var(--ha-line)' }}>
            {mode === 'edit' && onDelete ? (
              <button type="button" onClick={onDelete} className="btn btn-destructive" style={{ fontSize: '0.8rem' }}>
                <Trash2 size={14} />
                Delete
              </button>
            ) : <span />}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
              <button type="submit" disabled={isSaving} className="btn btn-primary">
                {isSaving ? 'Saving…' : mode === 'add' ? 'Add' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EdgeFormModalProps {
  edge: MapEdgeItem;
  fromLabel: string;
  toLabel: string;
  defaultCurrency: CurrencyCode;
  onClose: () => void;
  onSubmit: (data: { label: string | null; amount: number | null; currency: CurrencyCode | null }) => Promise<void>;
  onDelete: () => Promise<void>;
}

const EdgeFormModal: React.FC<EdgeFormModalProps> = ({ edge, fromLabel, toLabel, defaultCurrency, onClose, onSubmit, onDelete }) => {
  const [label, setLabel] = useState(edge.label || '');
  const [amount, setAmount] = useState<number | string>(edge.amount ?? '');
  const [edgeCurrency, setEdgeCurrency] = useState<CurrencyCode>(edge.currency || defaultCurrency);
  const [isSaving, setIsSaving] = useState(false);
  const { dialogRef, dialogProps } = useModalA11y(true, onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({
        label: label.trim() || null,
        amount: Number(amount) > 0 ? Number(amount) : null,
        currency: Number(amount) > 0 ? edgeCurrency : null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--ha-line)',
        }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ha-ink)' }}>Edit connection</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              {fromLabel} → {toLabel}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
              Label (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly repayment"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="ha-input"
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Amount (optional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="ha-input"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Currency
              </label>
              <select value={edgeCurrency} onChange={(e) => setEdgeCurrency(e.target.value as CurrencyCode)} className="ha-input">
                {CURRENCY_LIST.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.25rem', paddingTop: '1rem', borderTop: '1px solid var(--ha-line)' }}>
            <button type="button" onClick={onDelete} className="btn btn-destructive" style={{ fontSize: '0.8rem' }}>
              <Trash2 size={14} />
              Remove
            </button>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
              <button type="submit" disabled={isSaving} className="btn btn-primary">
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CustomMoneyMap: React.FC<CustomMoneyMapProps> = ({ accounts, currency }) => {
  const [nodes, setNodes] = useState<MapNodeItem[]>([]);
  const [edges, setEdges] = useState<MapEdgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const dragState = useRef<DragState | null>(null);

  const loadMap = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await apiCall<{ nodes: MapNodeItem[]; edges: MapEdgeItem[] }>('/api/map');
      setNodes(data.nodes);
      setEdges(data.edges);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load your map'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  const handleAddNode = async ({ label, accountId, color }: { label: string; accountId: string | null; color: string }) => {
    const col = nodes.length % 5;
    const row = Math.floor(nodes.length / 5);
    const data = await apiCall<{ node: MapNodeItem }>('/api/map/nodes', {
      method: 'POST',
      body: JSON.stringify({ label, accountId, color, x: 130 + col * 220, y: 100 + row * 160 }),
    });
    setNodes((prev) => [...prev, data.node]);
    setIsAddOpen(false);
  };

  const handleEditNode = async (id: string, { label, accountId, color }: { label: string; accountId: string | null; color: string }) => {
    const data = await apiCall<{ node: MapNodeItem }>(`/api/map/nodes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ label, color }),
    });
    void accountId;
    setNodes((prev) => prev.map((n) => (n.id === id ? data.node : n)));
    setEditingNodeId(null);
  };

  const handleDeleteNode = async (id: string) => {
    if (!window.confirm('Remove this object and all its connections?')) return;
    await apiCall(`/api/map/nodes/${id}`, { method: 'DELETE' });
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.fromNodeId !== id && e.toNodeId !== id));
    setEditingNodeId(null);
  };

  const persistNodePosition = useCallback(async (id: string, x: number, y: number) => {
    try {
      await apiCall(`/api/map/nodes/${id}`, { method: 'PATCH', body: JSON.stringify({ x, y }) });
    } catch {
      // best-effort — position stays as dragged locally even if this fails
    }
  }, []);

  const createEdge = async (fromNodeId: string, toNodeId: string) => {
    try {
      const data = await apiCall<{ edge: MapEdgeItem }>('/api/map/edges', {
        method: 'POST',
        body: JSON.stringify({ fromNodeId, toNodeId }),
      });
      setEdges((prev) => [...prev, data.edge]);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to connect those objects'));
    }
  };

  const handleEditEdge = async (id: string, payload: { label: string | null; amount: number | null; currency: CurrencyCode | null }) => {
    const data = await apiCall<{ edge: MapEdgeItem }>(`/api/map/edges/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    setEdges((prev) => prev.map((e) => (e.id === id ? data.edge : e)));
    setEditingEdgeId(null);
  };

  const handleDeleteEdge = async (id: string) => {
    await apiCall(`/api/map/edges/${id}`, { method: 'DELETE' });
    setEdges((prev) => prev.filter((e) => e.id !== id));
    setEditingEdgeId(null);
  };

  const handleConnectClick = (id: string) => {
    if (!connectFromId) {
      setConnectFromId(id);
      return;
    }
    if (connectFromId === id) {
      setConnectFromId(null);
      return;
    }
    createEdge(connectFromId, id);
    setConnectFromId(null);
  };

  const handlePointerDown = (node: MapNodeItem, e: React.PointerEvent<SVGGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      id: node.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: node.x,
      origY: node.y,
      lastX: node.x,
      lastY: node.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    const drag = dragState.current;
    if (!drag || connectMode) return;
    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    if (!drag.moved) return;
    const newX = clamp(drag.origX + dx, NODE_R, CANVAS_W - NODE_R);
    const newY = clamp(drag.origY + dy, NODE_R, CANVAS_H - NODE_R);
    drag.lastX = newX;
    drag.lastY = newY;
    setNodes((prev) => prev.map((n) => (n.id === drag.id ? { ...n, x: newX, y: newY } : n)));
  };

  const handlePointerUp = (node: MapNodeItem) => {
    const drag = dragState.current;
    dragState.current = null;
    if (!drag) return;

    if (connectMode) {
      handleConnectClick(node.id);
      return;
    }

    if (drag.moved) {
      persistNodePosition(drag.id, drag.lastX, drag.lastY);
    } else {
      setEditingNodeId(node.id);
    }
  };

  const nodeById = (id: string) => nodes.find((n) => n.id === id);
  const editingNode = editingNodeId ? nodeById(editingNodeId) : null;
  const editingEdge = editingEdgeId ? edges.find((e) => e.id === editingEdgeId) : null;

  return (
    <div className="ha-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ha-ink)' }}>My map</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--ha-muted)', maxWidth: '520px', marginTop: '0.2rem' }}>
            Sketch your own picture of where money goes — add any object, link it to an account if you like, then connect and drag things around.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setIsAddOpen(true)} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            <Plus size={14} />
            Add object
          </button>
          <button
            onClick={() => { setConnectMode((v) => !v); setConnectFromId(null); }}
            className={connectMode ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ fontSize: '0.8rem' }}
          >
            <Link2 size={14} />
            {connectMode ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </div>

      {connectMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--ha-blue)',
          backgroundColor: 'var(--ha-blue-light)', padding: '0.6rem 0.85rem', borderRadius: 'var(--ha-radius-sm)', marginBottom: '1rem',
        }}>
          <MousePointer2 size={14} />
          {connectFromId ? 'Now click the object it points to.' : 'Click an object to start a connection, then click another to link them.'}
        </div>
      )}

      {error && (
        <div style={{ fontSize: '0.82rem', color: 'var(--ha-red)', marginBottom: '1rem' }}>{error}</div>
      )}

      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.85rem' }}>Loading your map…</div>
      ) : nodes.length === 0 ? (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--ha-muted)' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--ha-blue-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
          }}>
            <Plus size={24} color="var(--ha-blue)" />
          </div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.35rem' }}>
            Nothing here yet
          </h4>
          <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto', lineHeight: 1.5 }}>
            Add your first object — an account, a loan, an income source — then add more and connect them.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--ha-line)', borderRadius: 'var(--ha-radius-md)' }}>
          <svg width={CANVAS_W} height={CANVAS_H} style={{ display: 'block', touchAction: 'none' }}>
            <defs>
              <marker id="cm-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" fill={EDGE_COLOR} />
              </marker>
            </defs>

            {edges.map((edge) => {
              const from = nodeById(edge.fromNodeId);
              const to = nodeById(edge.toNodeId);
              if (!from || !to) return null;
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const ux = dx / dist;
              const uy = dy / dist;
              const startX = from.x + ux * NODE_R;
              const startY = from.y + uy * NODE_R;
              const endX = to.x - ux * (NODE_R + 4);
              const endY = to.y - uy * (NODE_R + 4);
              const midX = (startX + endX) / 2;
              const midY = (startY + endY) / 2;
              const isHovered = hoveredEdgeId === edge.id;

              return (
                <g key={edge.id}>
                  <line
                    x1={startX} y1={startY} x2={endX} y2={endY}
                    stroke={isHovered ? EDGE_COLOR_HOVER : EDGE_COLOR}
                    strokeWidth={isHovered ? 3 : 2}
                    markerEnd="url(#cm-arrow)"
                    onMouseEnter={() => setHoveredEdgeId(edge.id)}
                    onMouseLeave={() => setHoveredEdgeId(null)}
                    onClick={() => setEditingEdgeId(edge.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  {(edge.label || edge.amount) && (
                    <g onClick={() => setEditingEdgeId(edge.id)} style={{ cursor: 'pointer' }}>
                      <rect x={midX - 45} y={midY - 11} width="90" height="20" rx="10" fill="var(--ha-white)" stroke={EDGE_COLOR} strokeWidth="1" />
                      <text x={midX} y={midY + 4} textAnchor="middle" fontSize="10.5" fontWeight={700} fill={EDGE_COLOR}>
                        {edge.amount ? `${formatCurrency(edge.amount, edge.currency || currency)}` : truncateLabel(edge.label || '')}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {nodes.map((node) => {
              const isConnectSource = connectFromId === node.id;
              const color = node.color || DEFAULT_NODE_COLOR;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onPointerDown={(e) => handlePointerDown(node, e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={() => handlePointerUp(node)}
                  style={{ cursor: connectMode ? 'pointer' : 'grab' }}
                >
                  <circle
                    r={NODE_R}
                    fill="var(--ha-white)"
                    stroke={color}
                    strokeWidth={isConnectSource ? 4 : 2.5}
                    strokeDasharray={isConnectSource ? '5,3' : undefined}
                  />
                  <foreignObject x={-NODE_R} y={-NODE_R} width={NODE_R * 2} height={NODE_R * 2} style={{ pointerEvents: 'none' }}>
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, color, textAlign: 'center', padding: '3px' }}>
                      {truncateLabel(node.label)}
                    </div>
                  </foreignObject>
                  {node.account?.institution && (
                    <text x={0} y={NODE_R + 15} textAnchor="middle" fontSize="9.5" fill="var(--ha-muted)">
                      {truncateLabel(node.account.institution)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {isAddOpen && (
        <NodeFormModal
          mode="add"
          accounts={accounts}
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleAddNode}
        />
      )}

      {editingNode && (
        <NodeFormModal
          mode="edit"
          accounts={accounts}
          initial={editingNode}
          onClose={() => setEditingNodeId(null)}
          onSubmit={(data) => handleEditNode(editingNode.id, data)}
          onDelete={() => handleDeleteNode(editingNode.id)}
        />
      )}

      {editingEdge && (
        <EdgeFormModal
          edge={editingEdge}
          fromLabel={nodeById(editingEdge.fromNodeId)?.label || 'Unknown'}
          toLabel={nodeById(editingEdge.toNodeId)?.label || 'Unknown'}
          defaultCurrency={currency}
          onClose={() => setEditingEdgeId(null)}
          onSubmit={(data) => handleEditEdge(editingEdge.id, data)}
          onDelete={() => handleDeleteEdge(editingEdge.id)}
        />
      )}
    </div>
  );
};
