import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { AccountItem, TransferItem } from '../types/expense';
import { formatCurrency, formatDate } from '../utils/formatters';
import { convertCurrency } from '../utils/calculations';
import { useOverlayClose } from '../hooks/useOverlayClose';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface AccountRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountItem | null;
  transfers: TransferItem[];
}

type Range = 'all' | '30' | '90' | 'year';

interface Row {
  id: string;
  date: string;
  description: string;
  moneyIn: number;
  moneyOut: number;
  signed: number;
  balanceAfter: number | null;
}

/**
 * A per-account transaction register: every logged Transfer that touched
 * this account, newest first, with a running balance worked backward from
 * the account's stated balance. Read-only — it never changes a record.
 */
export const AccountRegisterModal: React.FC<AccountRegisterModalProps> = ({ isOpen, onClose, account, transfers }) => {
  const overlayHandlers = useOverlayClose(onClose);
  useBodyScrollLock(isOpen);
  const [range, setRange] = useState<Range>('all');

  const { rows, movementCount, netIn, netOut } = useMemo(() => {
    if (!account) return { rows: [] as Row[], movementCount: 0, netIn: 0, netOut: 0 };
    const ccy = account.currency;
    const anchor = account.balance;

    // All movements touching this account, newest first.
    const all: Row[] = transfers
      .filter((t) => t.fromAccountId === account.id || t.toAccountId === account.id)
      .map((t) => {
        const isIn = t.toAccountId === account.id;
        const amt = convertCurrency(t.amount, t.currency, ccy);
        let description = t.linkedExpense?.name || t.linkedIncome?.name || t.externalLabel || t.note || '';
        if (!description) {
          const other = isIn ? t.fromAccount?.name : t.toAccount?.name;
          description = other ? `${isIn ? 'From' : 'To'} ${other}` : isIn ? 'Money in' : 'Money out';
        }
        return {
          id: t.id,
          date: t.date,
          description,
          moneyIn: isIn ? amt : 0,
          moneyOut: isIn ? 0 : amt,
          signed: isIn ? amt : -amt,
          balanceAfter: null as number | null,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    // Running balance: anchor at the stated balance (= after the newest
    // movement), then work backward one movement at a time.
    if (anchor != null) {
      let bal = anchor;
      for (const r of all) {
        r.balanceAfter = Math.round(bal * 100) / 100;
        bal -= r.signed;
      }
    }

    const netIn = all.reduce((s, r) => s + r.moneyIn, 0);
    const netOut = all.reduce((s, r) => s + r.moneyOut, 0);

    // Filter the *display* to the chosen range — the running balance was
    // computed over the full history so it stays correct.
    const now = Date.now();
    const cutoff =
      range === '30' ? now - 30 * 864e5 :
      range === '90' ? now - 90 * 864e5 :
      range === 'year' ? new Date(new Date().getFullYear(), 0, 1).getTime() :
      0;
    const rows = cutoff ? all.filter((r) => new Date(r.date).getTime() >= cutoff) : all;

    return { rows, movementCount: all.length, netIn, netOut };
  }, [account, transfers, range]);

  if (!isOpen || !account) return null;

  return (
    <div className="modal-overlay" {...overlayHandlers}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '760px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--ha-line)' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ha-ink)' }}>{account.name} — register</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              {movementCount} logged movement{movementCount === 1 ? '' : 's'}
              {' · '}
              <span style={{ color: 'var(--ha-blue)' }}>{formatCurrency(netIn, account.currency)} in</span>
              {' / '}
              <span style={{ color: 'var(--ha-red)' }}>{formatCurrency(netOut, account.currency)} out</span>
              {account.balance != null && <> · stated balance <strong style={{ color: 'var(--ha-ink)' }}>{formatCurrency(account.balance, account.currency)}</strong></>}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.3rem 0.4rem' }} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '0.85rem 1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '70vh', overflowY: 'auto', overscrollBehavior: 'contain' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {(['all', 'year', '90', '30'] as Range[]).map((r) => (
              <button key={r} className={`ha-chip${range === r ? ' active' : ''}`} style={{ fontSize: '0.76rem' }} onClick={() => setRange(r)}>
                {r === 'all' ? 'All time' : r === 'year' ? 'This year' : `Last ${r} days`}
              </button>
            ))}
          </div>

          {account.balance == null && (
            <p style={{ fontSize: '0.76rem', color: 'var(--ha-muted)', margin: 0 }}>
              Set a balance on this account (edit it) to see a running balance column.
            </p>
          )}

          {rows.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', textAlign: 'center', padding: '2rem' }}>
              No logged movements for this account in this range.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ha-line)', textAlign: 'left', color: 'var(--ha-muted)' }}>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Description</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Out</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>In</th>
                    {account.balance != null && <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Balance</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--ha-line)' }}>
                      <td style={{ padding: '0.45rem 0.6rem', color: 'var(--ha-muted)', whiteSpace: 'nowrap' }}>{formatDate(r.date)}</td>
                      <td style={{ padding: '0.45rem 0.6rem', color: 'var(--ha-ink)' }}>{r.description}</td>
                      <td className="tabular-nums" style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: r.moneyOut ? 'var(--ha-red)' : 'var(--ha-muted)' }}>
                        {r.moneyOut ? formatCurrency(r.moneyOut, account.currency) : '—'}
                      </td>
                      <td className="tabular-nums" style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: r.moneyIn ? 'var(--ha-blue)' : 'var(--ha-muted)' }}>
                        {r.moneyIn ? formatCurrency(r.moneyIn, account.currency) : '—'}
                      </td>
                      {account.balance != null && (
                        <td className="tabular-nums" style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 600, color: 'var(--ha-ink)' }}>
                          {r.balanceAfter != null ? formatCurrency(r.balanceAfter, account.currency) : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ fontSize: '0.72rem', color: 'var(--ha-muted)', margin: 0, lineHeight: 1.5 }}>
            Only movements Tally has logged appear here — transfers, bills marked paid, and income received. Anything you spent that wasn&apos;t imported won&apos;t show. The running balance is anchored to your stated balance and worked backward, so it&apos;s a guide, not the bank&apos;s figure.
          </p>
        </div>
      </div>
    </div>
  );
};
