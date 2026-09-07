import React from 'react';
import type { TransferItem } from '../types/expense';
import { formatCurrency } from '../utils/formatters';
import { Edit2, Trash2, Plus, ArrowRight, ArrowLeftRight } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { transferKindLabel } from '../utils/transfers';

interface TransfersSectionProps {
  transfers: TransferItem[];
  onEditTransfer: (transfer: TransferItem) => void;
  onDeleteTransfer: (id: string) => void;
  onOpenAddModal: () => void;
}

function sideLabel(account: TransferItem['fromAccount'], externalLabel: string | null | undefined, fallback: string) {
  if (account) return account.name;
  return externalLabel || fallback;
}

export const TransfersSection: React.FC<TransfersSectionProps> = ({
  transfers,
  onEditTransfer,
  onDeleteTransfer,
  onOpenAddModal,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div className="ha-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="ha-badge ha-badge-blue">Money journey</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              Flow
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '600px', marginTop: '0.25rem' }}>
              Log every hop money takes — income landing, moving between accounts, direct debits, and one-off spends like a car repair.
            </p>
          </div>
          <button onClick={onOpenAddModal} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            <Plus size={15} />
            <span>Log transfer</span>
          </button>
        </div>
      </div>

      <CollapsibleSection id="transfers-ledger" title={`Transfers (${transfers.length})`}>
        {transfers.length === 0 ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--ha-muted)' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--ha-blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <ArrowLeftRight size={24} color="var(--ha-blue)" />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.35rem' }}>
              No money movements logged yet
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              Log a transfer — salary landing in an account, a sweep into savings, or a direct debit going out — to start building the money map.
            </p>
            <button onClick={onOpenAddModal} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              <Plus size={15} />
              <span>+ Log first transfer</span>
            </button>
          </div>
        ) : (
          <div>
            {transfers.map((item) => {
              const fromLabel = sideLabel(item.fromAccount, item.externalLabel, item.linkedIncome?.name || 'External');
              const toLabel = sideLabel(item.toAccount, item.externalLabel, item.linkedExpense?.name || 'External');
              const kindLabel = transferKindLabel(item);

              return (
                <div key={item.id} className="ha-ledger-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 320px' }}>
                    <span className="ha-color-marker" style={{ backgroundColor: !item.fromAccount ? 'var(--ha-lime)' : !item.toAccount ? 'var(--ha-red)' : 'var(--ha-blue)' }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.9rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                        <span>{fromLabel}</span>
                        <ArrowRight size={13} color="var(--ha-muted)" />
                        <span>{toLabel}</span>
                        {kindLabel && (
                          <span className="ha-badge" style={{ backgroundColor: '#fdf2e3', color: '#B45309', fontSize: '0.68rem', fontWeight: 700 }}>
                            {kindLabel}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.75rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
                        <span>{item.date}</span>
                        {item.note && (
                          <>
                            <span>•</span>
                            <span style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: '110px' }}>
                    <div className="tabular-nums" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                      {formatCurrency(item.amount, item.currency)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1rem' }}>
                    <button
                      onClick={() => onEditTransfer(item)}
                      className="btn btn-ghost"
                      style={{ padding: '0.35rem 0.45rem' }}
                      title="Edit record"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteTransfer(item.id)}
                      className="btn btn-ghost"
                      style={{ padding: '0.35rem 0.45rem', color: 'var(--ha-red)' }}
                      title="Delete record"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
};
