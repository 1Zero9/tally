import React from 'react';
import { X, Receipt, ArrowLeftRight, Repeat, FileSpreadsheet, Layers, RotateCcw } from 'lucide-react';
import { useOverlayClose } from '../hooks/useOverlayClose';
import { useModalA11y } from '../hooks/useModalA11y';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  points: React.ReactNode[];
}

const SECTIONS: Section[] = [
  {
    id: 'records',
    title: 'Three kinds of record',
    icon: <Receipt size={16} color="var(--ha-blue)" />,
    points: [
      <><strong>Expense</strong> — money spent: a bill, a subscription, a one-off cost. Counts toward spend, budgets and category totals.</>,
      <><strong>Income</strong> — money arriving. Counts toward &ldquo;money in&rdquo;.</>,
      <><strong>Transfer</strong> — money moving between accounts. On its own it is neither spend nor income.</>,
    ],
  },
  {
    id: 'internal',
    title: 'Internal vs external',
    icon: <ArrowLeftRight size={16} color="var(--ha-blue)" />,
    points: [
      <>A transfer with a <em>From</em> and a <em>To</em> that are both your accounts is <strong>internal</strong> — just moving money around. It never counts as spend. This covers sweeping to savings, topping up Revolut, and <strong>paying a credit card</strong> (shown as &ldquo;Card payment&rdquo;).</>,
      <>A transfer with one side set to <strong>External</strong> is real money entering or leaving the household.</>,
      <>Paying down a card or loan is a transfer into that account — <strong>never an expense</strong> (the spending already happened when you used the card).</>,
    ],
  },
  {
    id: 'bills',
    title: 'Bill vs one-off',
    icon: <Repeat size={16} color="var(--ha-blue)" />,
    points: [
      <><strong>Bill</strong> = recurring (mobile, electricity, a subscription). Shows in the Bills renewal schedule.</>,
      <><strong>One-off</strong> = a single incidental cost. Shows in Spending only, never the Bills schedule.</>,
      <>From a statement: use <strong>Add as expense</strong> for a one-off, <strong>Add as bill</strong> for a subscription.</>,
    ],
  },
  {
    id: 'statements',
    title: 'Statements — record once',
    icon: <FileSpreadsheet size={16} color="var(--ha-blue)" />,
    points: [
      <>Every real movement appears on <strong>two statements</strong> — the account it left and the account it arrived in.</>,
      <>Record it once, then <strong>Ignore</strong> the matching row when you process the other statement.</>,
      <>A card payment shows as &minus;€X on your current account and +€X on the card. That is one Card payment transfer, not two entries.</>,
    ],
  },
  {
    id: 'lenses',
    title: 'Lenses never change totals',
    icon: <Layers size={16} color="var(--ha-blue)" />,
    points: [
      <><strong>Money Trails</strong>, <strong>Home Projects</strong>, <strong>Progress</strong>, <strong>Money Map</strong>, <strong>Reports</strong> and <strong>Insights</strong> all read the ledger.</>,
      <>They never add or change a number — they are just different views of what you have already recorded. Deleting a trail or a project never touches an expense or transfer.</>,
    ],
  },
  {
    id: 'undo',
    title: 'Everything from a statement is undoable',
    icon: <RotateCcw size={16} color="var(--ha-blue)" />,
    points: [
      <>Per row inside the import review, or across all imports from the <strong>Statement activity</strong> list on the Flow tab.</>,
      <>Undo removes any bill, transfer or income the row created and sends it back to &ldquo;needs review&rdquo;.</>,
    ],
  },
];

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  const overlayHandlers = useOverlayClose(onClose);
  const { dialogRef, dialogProps } = useModalA11y(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" {...overlayHandlers}>
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--ha-line)' }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>How Tally works</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              The handful of rules that make the whole thing click
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {SECTIONS.map((section) => (
            <div key={section.id} style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: 'var(--ha-radius-sm)', backgroundColor: 'var(--ha-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {section.icon}
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.35rem' }}>{section.title}</h4>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {section.points.map((p, i) => (
                    <li key={i} style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', lineHeight: 1.5 }}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
