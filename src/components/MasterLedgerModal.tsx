import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { AccountItem, TransferItem, CurrencyCode } from '../types/expense';
import { formatCurrency, formatDate } from '../utils/formatters';
import { convertCurrency } from '../utils/calculations';
import { useOverlayClose } from '../hooks/useOverlayClose';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface MasterLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountItem[];
  transfers: TransferItem[];
  currency: CurrencyCode;
}

type Range = 'all' | '30' | '90' | 'year';

interface Row {
  id: string;
  date: string;
  description: string;
  account: string;
  moneyIn: number;
  moneyOut: number;
  signed: number;
  balanceAfter: number | null;
}

/**
 * The household's master ledger — every logged movement of money into or
 * out of the household, across all accounts, newest first, with money-in /
 * money-out columns and a running household balance. Transfers between your
 * own accounts are excluded (they don't change the household total — see a
 * specific account's register for those). Read-only.
 */
export const MasterLedgerModal: React.FC<MasterLedgerModalProps> = ({ isOpen, onClose, accounts, transfers, currency }) => {
  const overlayHandlers = useOverlayClose(onClose);
  useBodyScrollLock(isOpen);
  const [range, setRange] = useState<Range>('all');
  const [query, setQuery] = useState('');

  const householdBalance = useMemo(
    () => accounts.reduce((s, a) => s + convertCurrency(a.balance ?? 0, a.currency, currency), 0),
    [accounts, currency],
  );
  const anyBalanceUnset = accounts.some((a) => a.balance == null);

  const { rows, totalIn, totalOut } = useMemo(() => {
    const all: Row[] = transfers
      .filter((t) => {
        const hasFrom = !!t.fromAccountId;
        const hasTo = !!t.toAccountId;
        return hasFrom !== hasTo; // exactly one side external → money in or out of the household
      })
      .map((t) => {
        const isIn = !t.fromAccountId && !!t.toAccountId;
        const amt = convertCurrency(t.amount, t.currency, currency);
        const account = (isIn ? t.toAccount?.name : t.fromAccount?.name) || '—';
        const description =
          t.linkedIncome?.name || t.linkedExpense?.name || t.externalLabel || t.note || (isIn ? 'Money in' : 'Money out');
        return {
          id: t.id,
          date: t.date,
          description,
          account,
          moneyIn: isIn ? amt : 0,
          moneyOut: isIn ? 0 : amt,
          signed: isIn ? amt : -amt,
          balanceAfter: null as number | null,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    // Running balance: anchor at the current household balance (= after the
    // newest movement), then work backward one movement at a time.
    let bal = householdBalance;
    for (const r of all) {
      r.balanceAfter = Math.round(bal * 100) / 100;
      bal -= r.signed;
    }

    const totalIn = all.reduce((s, r) => s + r.moneyIn, 0);
    const totalOut = all.reduce((s, r) => s + r.moneyOut, 0);

    const now = Date.now();
    const cutoff =
      range === '30' ? now - 30 * 864e5 :
      range === '90' ? now - 90 * 864e5 :
      range === 'year' ? new Date(new Date().getFullYear(), 0, 1).getTime() :
      0;
    const q = query.trim().toLowerCase();
    const rows = all.filter((r) => {
      if (cutoff && new Date(r.date).getTime() < cutoff) return false;
      if (q && !(r.description.toLowerCase().includes(q) || r.account.toLowerCase().includes(q))) return false;
      return true;
    });

    return { rows, totalIn, totalOut };
  }, [transfers, currency, householdBalance, range, query]);

  if (!isOpen) return null;

  const net = totalIn - totalOut;

  return (
    <div className="modal-overlay" {...overlayHandlers}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '860px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--ha-line)' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ha-ink)' }}>Household ledger</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              <span style={{ color: 'var(--ha-blue)' }}>{formatCurrency(totalIn, currency)} in</span>
              {' / '}
              <span style={{ color: 'var(--ha-red)' }}>{formatCurrency(totalOut, currency)} out</span>
              {' · net '}
              <strong style={{ color: net >= 0 ? 'var(--ha-blue)' : 'var(--ha-red)' }}>{net >= 0 ? '+' : ''}{formatCurrency(net, currency)}</strong>
              {' · household balance '}
              <strong style={{ color: householdBalance >= 0 ? 'var(--ha-ink)' : 'var(--ha-red)' }}>{formatCurrency(householdBalance, currency)}</strong>
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.3rem 0.4rem' }} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '0.85rem 1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '72vh', overflowY: 'auto', overscrollBehavior: 'contain' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(['all', 'year', '90', '30'] as Range[]).map((r) => (
                <button key={r} className={`ha-chip${range === r ? ' active' : ''}`} style={{ fontSize: '0.76rem' }} onClick={() => setRange(r)}>
                  {r === 'all' ? 'All time' : r === 'year' ? 'This year' : `Last ${r} days`}
                </button>
              ))}
            </div>
            <input
              className="ha-input"
              placeholder="Search description or account"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', minWidth: '220px' }}
            />
          </div>

          {anyBalanceUnset && (
            <p style={{ fontSize: '0.74rem', color: 'var(--ha-muted)', margin: 0 }}>
              Some accounts have no balance set, so the household balance and the running column below are incomplete.
            </p>
          )}

          {rows.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', textAlign: 'center', padding: '2rem' }}>
              No money-in or money-out movements in this range.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ha-line)', textAlign: 'left', color: 'var(--ha-muted)' }}>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Description</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Account</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Out</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>In</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--ha-line)' }}>
                      <td style={{ padding: '0.45rem 0.6rem', color: 'var(--ha-muted)', whiteSpace: 'nowrap' }}>{formatDate(r.date)}</td>
                      <td style={{ padding: '0.45rem 0.6rem', color: 'var(--ha-ink)' }}>{r.description}</td>
                      <td style={{ padding: '0.45rem 0.6rem', color: 'var(--ha-muted)' }}>{r.account}</td>
                      <td className="tabular-nums" style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: r.moneyOut ? 'var(--ha-red)' : 'var(--ha-muted)' }}>
                        {r.moneyOut ? formatCurrency(r.moneyOut, currency) : '—'}
                      </td>
                      <td className="tabular-nums" style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: r.moneyIn ? 'var(--ha-blue)' : 'var(--ha-muted)' }}>
                        {r.moneyIn ? formatCurrency(r.moneyIn, currency) : '—'}
                      </td>
                      <td className="tabular-nums" style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 600, color: (r.balanceAfter ?? 0) < 0 ? 'var(--ha-red)' : 'var(--ha-ink)' }}>
                        {r.balanceAfter != null ? formatCurrency(r.balanceAfter, currency) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ fontSize: '0.72rem', color: 'var(--ha-muted)', margin: 0, lineHeight: 1.5 }}>
            Every logged movement of money into or out of the household. Transfers between your own accounts aren&apos;t here — they don&apos;t change the household total; open a specific account&apos;s register for those. Only logged activity is included, and the running balance is anchored to the sum of your stated account balances, so treat it as a guide, not a bank statement.
          </p>
        </div>
      </div>
    </div>
  );
};
