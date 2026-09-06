import React, { useState, useEffect } from 'react';
import type { ExpenseItem, ExpenseCategory, BillingCycle, CurrencyCode, UserProfile, AccountItem, GoalItem, CustomCategoryItem } from '../types/expense';
import { getCategoryMeta } from '../data/categories';
import { CategorySelect } from './CategorySelect';
import { PRESETS } from '../data/presets';
import { CURRENCIES } from '../utils/currencies';
import { formatCurrency } from '../utils/formatters';
import { X, ArrowRightLeft, Loader2 } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

const PAYMENT_METHODS = [
  'SEPA Direct Debit',
  'Standing Order',
  'Debit Card',
  'Credit Card',
  'Bank Transfer',
  'Cash',
  'PayPal',
  'Cheque',
  'Other',
];

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Omit<ExpenseItem, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string) => Promise<boolean>;
  editingExpense?: ExpenseItem | null;
  initialPresetId?: string | null;
  initialCategory?: string | null;
  initialIsPending?: boolean;
  draftExpense?: Partial<ExpenseItem> | null;
  users?: UserProfile[];
  currentUserId?: string;
  accounts?: AccountItem[];
  goals?: GoalItem[];
  customCategories?: CustomCategoryItem[];
  onCategoryCreated?: (category: CustomCategoryItem) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingExpense,
  initialPresetId,
  initialCategory,
  initialIsPending,
  draftExpense,
  users = [],
  currentUserId,
  accounts = [],
  goals = [],
  customCategories = [],
  onCategoryCreated,
}) => {
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [category, setCategory] = useState<ExpenseCategory>('utilities');
  const [nextRenewalDate, setNextRenewalDate] = useState('');
  const [isPaidThisCycle, setIsPaidThisCycle] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('SEPA Direct Debit');
  const [assignedUserId, setAssignedUserId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [usageRating, setUsageRating] = useState<'high' | 'medium' | 'low'>('high');
  const [isVariable, setIsVariable] = useState(false);
  const [paymentAccountId, setPaymentAccountId] = useState<string>('');
  const [isPending, setIsPending] = useState(false);
  const [linkedGoalId, setLinkedGoalId] = useState<string>('');
  const [isBill, setIsBill] = useState(true);
  // Only ever set from an existing record or a receipt-scan draft that
  // applied a live currency conversion — no form control edits these, they
  // just carry through unchanged so the original-currency caption survives
  // a later edit instead of being wiped.
  const [originalAmount, setOriginalAmount] = useState<number | null>(null);
  const [originalCurrency, setOriginalCurrency] = useState<CurrencyCode | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState<string | null>(null);
  const [reimbursementExpected, setReimbursementExpected] = useState<number | string>('');
  const [reimbursementReceived, setReimbursementReceived] = useState<number | string>('');
  const [reimbursementReceivedDate, setReimbursementReceivedDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingExpense) {
      setName(editingExpense.name);
      setVendor(editingExpense.vendor || '');
      setAmount(editingExpense.amount);
      setCurrency(editingExpense.currency || 'EUR');
      setBillingCycle(editingExpense.billingCycle);
      setCategory(editingExpense.category);
      setNextRenewalDate(editingExpense.nextRenewalDate || '');
      setIsPaidThisCycle(!!editingExpense.isPaidThisCycle);
      setPaymentMethod(editingExpense.paymentMethod || 'SEPA Direct Debit');
      setAssignedUserId(editingExpense.createdById || currentUserId || '');
      setNotes(editingExpense.notes || '');
      setContractEndDate(editingExpense.contractEndDate || '');
      setVendorEmail(editingExpense.vendorEmail || '');
      setUsageRating(editingExpense.usageRating || 'high');
      setIsVariable(!!editingExpense.isVariable);
      setPaymentAccountId(editingExpense.paymentAccountId || '');
      setIsPending(!!editingExpense.isPending);
      setLinkedGoalId(editingExpense.linkedGoalId || '');
      setIsBill(typeof editingExpense.isBill === 'boolean' ? editingExpense.isBill : editingExpense.billingCycle !== 'once');
      setOriginalAmount(editingExpense.originalAmount ?? null);
      setOriginalCurrency(editingExpense.originalCurrency ?? null);
      setExchangeRate(editingExpense.exchangeRate ?? null);
      setRateDate(editingExpense.rateDate ?? null);
      setReimbursementExpected(editingExpense.reimbursementExpected ?? '');
      setReimbursementReceived(editingExpense.reimbursementReceived ?? '');
      setReimbursementReceivedDate(editingExpense.reimbursementReceivedDate ?? '');
    } else if (initialPresetId) {
      const preset = PRESETS.find((p) => p.id === initialPresetId);
      if (preset) {
        setName(preset.name);
        setVendor('');
        setAmount(preset.defaultAmount);
        setCurrency('EUR');
        setBillingCycle(preset.defaultCycle);
        setCategory(preset.category);
        setNextRenewalDate(new Date().toISOString().split('T')[0]);
        setIsPaidThisCycle(false);
        setPaymentMethod(preset.defaultPaymentMethod);
        setAssignedUserId(currentUserId || '');
        setNotes(preset.description || '');
        setIsVariable(preset.category === 'shopping');
        setPaymentAccountId('');
        setIsPending(false);
        setLinkedGoalId('');
        setIsBill(preset.defaultCycle !== 'once');
        setOriginalAmount(null);
        setOriginalCurrency(null);
        setExchangeRate(null);
        setRateDate(null);
        setReimbursementExpected('');
        setReimbursementReceived('');
        setReimbursementReceivedDate('');
      }
    } else if (draftExpense) {
      setName(draftExpense.name || '');
      setVendor(draftExpense.vendor || '');
      setAmount(draftExpense.amount ?? '');
      setCurrency(draftExpense.currency || 'EUR');
      setBillingCycle(draftExpense.billingCycle || 'monthly');
      setCategory(draftExpense.category || 'utilities');
      setNextRenewalDate(draftExpense.nextRenewalDate || new Date().toISOString().split('T')[0]);
      setIsPaidThisCycle(!!draftExpense.isPaidThisCycle);
      setPaymentMethod(draftExpense.paymentMethod || 'SEPA Direct Debit');
      setAssignedUserId(currentUserId || '');
      setNotes(draftExpense.notes || '');
      setContractEndDate('');
      setVendorEmail('');
      setUsageRating('high');
      setIsVariable(false);
      setPaymentAccountId('');
      setIsPending(false);
      setLinkedGoalId('');
      setIsBill((draftExpense.billingCycle || 'monthly') !== 'once');
      setOriginalAmount(draftExpense.originalAmount ?? null);
      setOriginalCurrency(draftExpense.originalCurrency ?? null);
      setExchangeRate(draftExpense.exchangeRate ?? null);
      setRateDate(draftExpense.rateDate ?? null);
      setReimbursementExpected(draftExpense.reimbursementExpected ?? '');
      setReimbursementReceived(draftExpense.reimbursementReceived ?? '');
      setReimbursementReceivedDate(draftExpense.reimbursementReceivedDate ?? '');
    } else {
      setName('');
      setVendor('');
      setAmount('');
      setCurrency('EUR');
      setBillingCycle('monthly');
      setCategory((initialCategory as ExpenseCategory) || 'utilities');
      setNextRenewalDate(new Date().toISOString().split('T')[0]);
      setIsPaidThisCycle(false);
      setPaymentMethod('SEPA Direct Debit');
      setAssignedUserId(currentUserId || '');
      setNotes('');
      setContractEndDate('');
      setVendorEmail('');
      setUsageRating('high');
      setIsVariable((initialCategory as ExpenseCategory) === 'shopping');
      setPaymentAccountId('');
      setIsPending(!!initialIsPending);
      setLinkedGoalId('');
      setIsBill(true);
      setOriginalAmount(null);
      setOriginalCurrency(null);
      setExchangeRate(null);
      setRateDate(null);
      setReimbursementExpected('');
      setReimbursementReceived('');
      setReimbursementReceivedDate('');
    }
  }, [editingExpense, initialPresetId, initialCategory, initialIsPending, draftExpense, currentUserId, isOpen]);

  const { dialogRef, dialogProps } = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;
    const numAmount = Number(amount) || 0;

    const resolvedNextRenewalDate = nextRenewalDate || new Date().toISOString().split('T')[0];
    const resolvedRenewalDay = Number(resolvedNextRenewalDate.split('-')[2]) || 1;

    const catInfo = getCategoryMeta(category, customCategories);

    setIsSaving(true);
    const ok = await onSave(
      {
        name: name.trim(),
        vendor: vendor.trim() || undefined,
        amount: numAmount,
        currency,
        billingCycle,
        category,
        icon: catInfo?.icon || 'Zap',
        color: catInfo?.color || '#3155D9',
        renewalDay: resolvedRenewalDay,
        nextRenewalDate: resolvedNextRenewalDate,
        isPaidThisCycle,
        paymentMethod: paymentMethod.trim() || 'SEPA Direct Debit',
        isActive: !isPending,
        isPending,
        notes: notes.trim(),
        contractEndDate: contractEndDate || undefined,
        vendorEmail: vendorEmail.trim() || undefined,
        usageRating,
        isVariable,
        paymentAccountId: paymentAccountId || null,
        linkedGoalId: linkedGoalId || null,
        createdById: assignedUserId || null,
        isBill,
        originalAmount,
        originalCurrency,
        exchangeRate,
        rateDate,
        reimbursementExpected: reimbursementExpected !== '' ? Number(reimbursementExpected) : null,
        reimbursementReceived: reimbursementReceived !== '' ? Number(reimbursementReceived) : null,
        reimbursementReceivedDate: reimbursementReceivedDate || null,
      },
      editingExpense?.id
    );
    setIsSaving(false);
    if (ok) onClose();
  };

  const currencySymbol = CURRENCIES[currency]?.symbol || '€';

  return (
    <div className="modal-overlay">
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.9rem 1.5rem',
          borderBottom: '1px solid var(--ha-line)',
          position: 'sticky',
          top: 0,
          backgroundColor: 'var(--ha-white)',
          zIndex: 2,
          borderTopLeftRadius: 'var(--ha-radius-lg)',
          borderTopRightRadius: 'var(--ha-radius-lg)',
        }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              {editingExpense ? 'Edit expense' : 'Add expense'}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              {draftExpense && !editingExpense
                ? 'Review the details read from your screenshot before saving'
                : 'Record household bill, subscription, college, school or sports cost'}
            </p>
          </div>

          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.1rem 1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Amount first & largest input with visible currency prefix */}
          <div>
            <label htmlFor="expense-amount" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.3rem' }}>
              Amount *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{
                position: 'absolute',
                left: '1rem',
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--ha-muted)',
                pointerEvents: 'none',
              }}>
                {currencySymbol}
              </span>
              <input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="ha-input ha-input-large"
                style={{ paddingLeft: '2.5rem' }}
                autoFocus
              />
            </div>
            {originalAmount != null && originalCurrency && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--ha-muted)' }}>
                <ArrowRightLeft size={12} style={{ flexShrink: 0 }} />
                <span>
                  Originally {formatCurrency(originalAmount, originalCurrency)}
                  {exchangeRate != null && rateDate ? `, converted at ${exchangeRate.toFixed(4)} on ${rateDate}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Expense Name & Billing Cycle */}
          <div className="ha-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem' }}>
            <div>
              <label htmlFor="expense-name" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Description / Item Name *
              </label>
              <input
                id="expense-name"
                type="text"
                required
                placeholder="e.g. College Tuition, Netflix, Electricity, GAA Club"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="ha-input"
              />
            </div>

            <div>
              <label htmlFor="expense-billing-cycle" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Billing cycle
              </label>
              <select
                id="expense-billing-cycle"
                value={billingCycle}
                onChange={(e) => {
                  const cycle = e.target.value as BillingCycle;
                  setBillingCycle(cycle);
                  setIsBill(cycle !== 'once');
                }}
                className="ha-input"
              >
                <option value="once">One-off (single payment)</option>
                <option value="monthly">Monthly</option>
                <option value="termly">Termly (3 terms/year)</option>
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          {/* Category selection */}
          <div>
            <label htmlFor="expense-category" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
              Category
            </label>
            <CategorySelect
              id="expense-category"
              value={category}
              onChange={(id) => setCategory(id as ExpenseCategory)}
              customCategories={customCategories}
              onCategoryCreated={(cat) => onCategoryCreated?.(cat)}
            />
          </div>

          {/* Bill/contract vs one-off spending toggle */}
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            cursor: 'pointer',
            padding: '0.6rem 0.75rem',
            borderRadius: 'var(--ha-radius-sm)',
            border: '1px solid var(--ha-line)',
            backgroundColor: isBill ? 'var(--ha-blue-light)' : '#fafaf7',
          }}>
            <input
              type="checkbox"
              checked={isBill}
              onChange={(e) => setIsBill(e.target.checked)}
              style={{ marginTop: '2px' }}
            />
            <span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block' }}>
                Recurring bill / contract
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>
                Shows up in Bills (mobile, electric, gas, subscriptions…). Turn off for incidental one-off spending like a coffee or a repair — it&apos;ll still count in Spending, just not Bills.
              </span>
            </span>
          </label>

          {/* Pending / not-yet-required toggle */}
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            cursor: 'pointer',
            padding: '0.6rem 0.75rem',
            borderRadius: 'var(--ha-radius-sm)',
            border: '1px solid var(--ha-line)',
            backgroundColor: isPending ? '#fdf2e3' : '#fafaf7',
          }}>
            <input
              type="checkbox"
              checked={isPending}
              onChange={(e) => setIsPending(e.target.checked)}
              style={{ marginTop: '2px' }}
            />
            <span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block' }}>
                Planned — not required yet
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>
                Saves this to a separate Planned list only. It won&apos;t count towards totals, bills or insights until you activate it.
              </span>
            </span>
          </label>

          {goals.length > 0 && (
            <div>
              <label htmlFor="expense-linked-goal" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Link to a savings goal (optional)
              </label>
              <select
                id="expense-linked-goal"
                value={linkedGoalId}
                onChange={(e) => setLinkedGoalId(e.target.value)}
                className="ha-input"
              >
                <option value="">Not linked</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.72rem', color: 'var(--ha-muted)', marginTop: '0.3rem' }}>
                {isPending
                  ? 'Shows savings progress towards this cost right on the Planned list.'
                  : "Handy for a cheaper annual/lump-sum bill you can't cover all at once — link a mini goal here and top it up monthly until it's covered. Progress shows right on this ledger row."}
              </p>
            </div>
          )}

          {/* Member Assignment & Renewal Day */}
          <div className="ha-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem' }}>
            {users.length > 0 && (
              <div>
                <label htmlFor="expense-assigned-user" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                  Assigned Household Member
                </label>
                <select
                  id="expense-assigned-user"
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="ha-input"
                >
                  <option value="">Household (Shared)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="expense-next-renewal-date" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                {billingCycle === 'once' ? 'Payment date' : 'Next due date'}
              </label>
              <input
                id="expense-next-renewal-date"
                type="date"
                required
                value={nextRenewalDate}
                onChange={(e) => setNextRenewalDate(e.target.value)}
                className="ha-input tabular-nums"
              />
            </div>
          </div>

          {/* Paid this cycle & variable amount toggles */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {!isPending && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--ha-radius-sm)',
                border: '1px solid var(--ha-line)',
                backgroundColor: isPaidThisCycle ? 'var(--ha-blue-light)' : '#fafaf7',
                width: 'fit-content',
              }}>
                <input
                  type="checkbox"
                  checked={isPaidThisCycle}
                  onChange={(e) => setIsPaidThisCycle(e.target.checked)}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                  {billingCycle === 'once' ? 'Paid' : 'Paid this cycle'}
                </span>
              </label>
            )}

            {billingCycle !== 'once' && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--ha-radius-sm)',
                border: '1px solid var(--ha-line)',
                backgroundColor: isVariable ? 'var(--ha-blue-light)' : '#fafaf7',
                width: 'fit-content',
              }}
                title="For bills that change each cycle, like electric, gas or shopping — lets you quickly update just the amount from the ledger"
              >
                <input
                  type="checkbox"
                  checked={isVariable}
                  onChange={(e) => setIsVariable(e.target.checked)}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                  This amount varies each cycle
                </span>
              </label>
            )}
          </div>

          {/* Payment Method & Contract End Date */}
          <div className="ha-form-grid-2" style={{ display: 'grid', gridTemplateColumns: billingCycle === 'once' ? '1fr' : '1.4fr 1fr', gap: '1rem' }}>
            <div>
              <label htmlFor="expense-payment-method" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Payment method
              </label>
              <select
                id="expense-payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="ha-input"
              >
                {!PAYMENT_METHODS.includes(paymentMethod) && paymentMethod && (
                  <option value={paymentMethod}>{paymentMethod}</option>
                )}
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {billingCycle !== 'once' && (
              <div>
                <label htmlFor="expense-contract-end-date" style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Contract end date (optional)
                </label>
                <input
                  id="expense-contract-end-date"
                  type="date"
                  value={contractEndDate}
                  onChange={(e) => setContractEndDate(e.target.value)}
                  className="ha-input"
                  style={{ fontSize: '0.82rem' }}
                />
              </div>
            )}
          </div>

          {accounts.length > 0 && (
            <div>
              <label htmlFor="expense-payment-account" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Paid from account (optional)
              </label>
              <select
                id="expense-payment-account"
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
                className="ha-input"
              >
                <option value="">Not linked</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}{a.institution ? ` — ${a.institution}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Partial reimbursement / insurance claim */}
          <div>
            <label htmlFor="expense-reimbursement-expected" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
              Reimbursement / claim expected (optional)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', maxWidth: '220px' }}>
              <span style={{ position: 'absolute', left: '0.85rem', fontSize: '0.9rem', color: 'var(--ha-muted)', pointerEvents: 'none' }}>
                {currencySymbol}
              </span>
              <input
                id="expense-reimbursement-expected"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={reimbursementExpected}
                onChange={(e) => setReimbursementExpected(e.target.value)}
                className="ha-input"
                style={{ paddingLeft: '1.7rem', fontSize: '0.85rem' }}
              />
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--ha-muted)', marginTop: '0.3rem' }}>
              e.g. a health insurance claim on a doctor visit — once you mark it received below, only the net cost counts toward Spending and Budgets. Until then, the full amount still counts, since it&apos;s genuinely out of pocket.
            </p>

            {reimbursementExpected !== '' && Number(reimbursementExpected) > 0 && (
              <div className="ha-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.6rem' }}>
                <div>
                  <label htmlFor="expense-reimbursement-received" style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Amount received (leave blank until it arrives)
                  </label>
                  <input
                    id="expense-reimbursement-received"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={reimbursementReceived}
                    onChange={(e) => {
                      const value = e.target.value;
                      setReimbursementReceived(value);
                      if (value !== '' && Number(value) > 0 && !reimbursementReceivedDate) {
                        setReimbursementReceivedDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className="ha-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
                {reimbursementReceived !== '' && Number(reimbursementReceived) > 0 && (
                  <div>
                    <label htmlFor="expense-reimbursement-received-date" style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', display: 'block', marginBottom: '0.35rem' }}>
                      Received date
                    </label>
                    <input
                      id="expense-reimbursement-received-date"
                      type="date"
                      value={reimbursementReceivedDate}
                      onChange={(e) => setReimbursementReceivedDate(e.target.value)}
                      className="ha-input tabular-nums"
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Vendor name & email (for contract-review outreach) */}
          <div className="ha-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label htmlFor="expense-vendor" style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Vendor / provider name (optional)
              </label>
              <input
                id="expense-vendor"
                type="text"
                placeholder="e.g. Vodafone, Allianz — if different from the item name"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="ha-input"
                style={{ fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label htmlFor="expense-vendor-email" style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Vendor / provider email (optional)
              </label>
              <input
                id="expense-vendor-email"
                type="email"
                placeholder="e.g. support@provider.com"
                value={vendorEmail}
                onChange={(e) => setVendorEmail(e.target.value)}
                className="ha-input"
                style={{ fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label htmlFor="expense-notes" style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', display: 'block', marginBottom: '0.35rem' }}>
              Notes (optional)
            </label>
            <input
              id="expense-notes"
              type="text"
              placeholder="e.g. Semester 1 fee, Year 2 college student contribution, Friday coaching"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="ha-input"
              style={{ fontSize: '0.82rem' }}
            />
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginLeft: '-1.5rem',
            marginRight: '-1.5rem',
            padding: '0.85rem 1.5rem',
            borderTop: '1px solid var(--ha-line)',
            position: 'sticky',
            bottom: 0,
            backgroundColor: 'var(--ha-white)',
            zIndex: 2,
            borderBottomLeftRadius: 'var(--ha-radius-lg)',
            borderBottomRightRadius: 'var(--ha-radius-lg)',
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 size={15} className="spin" /> : null}
              {isSaving ? 'Saving…' : editingExpense ? 'Save changes' : 'Add expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
