import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Link2,
  PlusCircle,
  Tag,
  EyeOff,
  Loader2,
  RotateCcw,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Edit2,
  Landmark,
  Copy,
  RefreshCw,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react';
import type { ExpenseItem, IncomeItem, StatementTransactionItem, CurrencyCode, AccountItem, AccountType, ExpenseCategory, CustomCategoryItem } from '../types/expense';
import { formatCurrency } from '../utils/formatters';
import { parseCsv, guessColumns, parseAmount, parseDateFlexible, detectRecurringCycle, type ColumnGuess, type DetectedBillingCycle } from '../lib/statementMatching';
import type { StatementAccountInfo } from '../lib/ai';
import { CategorySelect } from './CategorySelect';
import { useModalA11y } from '../hooks/useModalA11y';

type FieldMatch = 'match' | 'mismatch' | 'not_set' | 'no_data';

interface StatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: ExpenseItem[];
  incomes: IncomeItem[];
  accounts: AccountItem[];
  householdCurrency: CurrencyCode;
  onImported: () => void;
  onExpensesChanged?: () => void;
  initialImportId?: string | null;
  customCategories?: CustomCategoryItem[];
  onCategoryCreated?: (category: CustomCategoryItem) => void;
}

type Step = 'upload' | 'map' | 'review';
type ReviewFilter = 'needs_review' | 'matched' | 'ignored' | 'duplicate' | 'all';
type ReviewSort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'merchant-asc' | 'status';

interface PreparedRow {
  date: string;
  rawDescription: string;
  amount: number;
  direction: 'DEBIT' | 'CREDIT';
}

interface TxGroup {
  key: string;
  label: string;
  items: StatementTransactionItem[];
  // Set only when every UNMATCHED item in the group shares an identical
  // amount and the dates between them are regularly spaced — a real
  // candidate for "one recurring bill" instead of N one-off expenses.
  detectedCycle: DetectedBillingCycle | null;
}

const FILTERS: { id: ReviewFilter; label: string }[] = [
  { id: 'needs_review', label: 'Needs review' },
  { id: 'matched', label: 'Matched' },
  { id: 'ignored', label: 'Ignored' },
  { id: 'duplicate', label: 'Duplicates' },
  { id: 'all', label: 'All' },
];

const SORTS: { id: ReviewSort; label: string }[] = [
  { id: 'date-desc', label: 'Newest first' },
  { id: 'date-asc', label: 'Oldest first' },
  { id: 'amount-desc', label: 'Amount: highest first' },
  { id: 'amount-asc', label: 'Amount: lowest first' },
  { id: 'merchant-asc', label: 'Merchant A–Z' },
  { id: 'status', label: 'Needs review first' },
];

const STATUS_SORT_ORDER: Record<StatementTransactionItem['status'], number> = {
  UNMATCHED: 0,
  DUPLICATE: 1,
  MATCHED: 2,
  IGNORED: 3,
};

const MATCHED_FIELD_LABELS: Record<string, string> = {
  accountNumber: 'account number',
  routingNumber: 'sort code',
  iban: 'IBAN',
  bic: 'BIC',
};

function joinFieldLabels(fields: string[]): string {
  const labels = fields.map((f) => MATCHED_FIELD_LABELS[f] || f);
  if (labels.length <= 1) return labels.join('');
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

const CYCLE_LABELS: Record<DetectedBillingCycle, string> = {
  weekly: 'weekly',
  monthly: 'monthly',
  quarterly: 'quarterly',
  annual: 'annual',
};

// A statement with this many repeat-merchant groups is unwieldy to scroll
// through fully expanded, so those groups start collapsed automatically.
const AUTO_COLLAPSE_GROUP_THRESHOLD = 4;

/** Keys of every repeat-merchant (multi-row) group among a set of rows. */
function multiItemGroupKeys(items: StatementTransactionItem[]): string[] {
  const counts = new Map<string, number>();
  for (const t of items) {
    const key = t.normalizedDescription || t.rawDescription;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
}

const ACCOUNT_TYPES: { id: AccountType; label: string }[] = [
  { id: 'CHECKING', label: 'Current' },
  { id: 'SAVINGS', label: 'Savings' },
  { id: 'CREDIT_UNION', label: 'Credit union' },
  { id: 'CREDIT_CARD', label: 'Credit card' },
  { id: 'DEBIT_CARD', label: 'Debit card' },
  { id: 'PAYPAL', label: 'PayPal' },
  { id: 'LOAN', label: 'Loan' },
  { id: 'INVESTMENT', label: 'Investment' },
  { id: 'OTHER', label: 'Other' },
];

export const StatementImportModal: React.FC<StatementImportModalProps> = ({
  isOpen,
  onClose,
  expenses,
  incomes,
  accounts,
  householdCurrency,
  onImported,
  onExpensesChanged,
  initialImportId,
  customCategories = [],
  onCategoryCreated,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [label, setLabel] = useState('');
  const [accountId, setAccountId] = useState('');
  const [importAccount, setImportAccount] = useState<{ id: string; name: string; institution?: string | null } | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [dateCol, setDateCol] = useState<number | null>(null);
  const [descCol, setDescCol] = useState<number | null>(null);
  const [amountMode, setAmountMode] = useState<'single' | 'split'>('single');
  const [amountCol, setAmountCol] = useState<number | null>(null);
  const [debitCol, setDebitCol] = useState<number | null>(null);
  const [creditCol, setCreditCol] = useState<number | null>(null);
  const [positiveMeans, setPositiveMeans] = useState<'out' | 'in'>('out');
  const [parseError, setParseError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [importId, setImportId] = useState<string | null>(null);
  const [importLabel, setImportLabel] = useState('');
  const [importBalances, setImportBalances] = useState<{ openingBalance: number | null; closingBalance: number | null } | null>(null);
  const [isRenamingImport, setIsRenamingImport] = useState(false);
  const [renameLabelInput, setRenameLabelInput] = useState('');
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [transactions, setTransactions] = useState<StatementTransactionItem[]>([]);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('needs_review');
  const [reviewSort, setReviewSort] = useState<ReviewSort>('date-desc');
  const [isRechecking, setIsRechecking] = useState(false);
  const [recheckResult, setRecheckResult] = useState<string | null>(null);
  const [treatGroupAsRecurring, setTreatGroupAsRecurring] = useState<Record<string, boolean>>({});
  const [busyTxId, setBusyTxId] = useState<string | null>(null);
  const [linkingTxId, setLinkingTxId] = useState<string | null>(null);
  const [selectedExpenseId, setSelectedExpenseId] = useState<Record<string, string>>({});
  const [linkingIncomeTxId, setLinkingIncomeTxId] = useState<string | null>(null);
  const [selectedIncomeId, setSelectedIncomeId] = useState<Record<string, string>>({});
  const [categorizingTxId, setCategorizingTxId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Record<string, ExpenseCategory | ''>>({});
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [loggingTransferTxId, setLoggingTransferTxId] = useState<string | null>(null);
  const [renamingTxId, setRenamingTxId] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState<Record<string, string>>({});
  const [categorizingGroupKey, setCategorizingGroupKey] = useState<string | null>(null);
  const [selectedGroupCategory, setSelectedGroupCategory] = useState<Record<string, ExpenseCategory | ''>>({});
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [busyGroupKey, setBusyGroupKey] = useState<string | null>(null);
  const [aiRows, setAiRows] = useState<PreparedRow[] | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [accountInfo, setAccountInfo] = useState<StatementAccountInfo | null>(null);
  const [accountMatch, setAccountMatch] = useState<{ accountNumber: FieldMatch; routingNumber: FieldMatch; iban: FieldMatch; bic: FieldMatch } | null>(null);
  const [savingField, setSavingField] = useState<'accountNumber' | 'routingNumber' | 'iban' | 'bic' | null>(null);
  const [savedFields, setSavedFields] = useState<{ accountNumber?: boolean; routingNumber?: boolean; iban?: boolean; bic?: boolean }>({});
  const [matchCandidates, setMatchCandidates] = useState<{ accountId: string; accountName: string; matchedFields: string[] }[]>([]);
  const [autoMatchedAccountId, setAutoMatchedAccountId] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountInstitution, setNewAccountInstitution] = useState('');
  const [newAccountType, setNewAccountType] = useState<AccountType>('CHECKING');
  const [isSavingNewAccount, setIsSavingNewAccount] = useState(false);
  const [newAccountError, setNewAccountError] = useState('');
  const [pendingNewAccount, setPendingNewAccount] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadedInitialRef = useRef(false);

  const reset = useCallback(() => {
    setStep('upload');
    setFileName('');
    setLabel('');
    setAccountId('');
    setImportAccount(null);
    setHeaders([]);
    setRows([]);
    setDateCol(null);
    setDescCol(null);
    setAmountMode('single');
    setAmountCol(null);
    setDebitCol(null);
    setCreditCol(null);
    setPositiveMeans('out');
    setParseError('');
    setIsSubmitting(false);
    setSubmitError('');
    setImportId(null);
    setImportLabel('');
    setImportBalances(null);
    setIsRenamingImport(false);
    setRenameLabelInput('');
    setIsSavingRename(false);
    setTransactions([]);
    setReviewFilter('needs_review');
    setReviewSort('date-desc');
    setIsRechecking(false);
    setRecheckResult(null);
    setTreatGroupAsRecurring({});
    setBusyTxId(null);
    setLinkingTxId(null);
    setSelectedExpenseId({});
    setLinkingIncomeTxId(null);
    setSelectedIncomeId({});
    setCategorizingTxId(null);
    setSelectedCategory({});
    setNoteInput({});
    setLoggingTransferTxId(null);
    setRenamingTxId(null);
    setNicknameInput({});
    setCategorizingGroupKey(null);
    setSelectedGroupCategory({});
    setCollapsedGroups(new Set());
    setBusyGroupKey(null);
    setAiRows(null);
    setIsExtracting(false);
    setAccountInfo(null);
    setAccountMatch(null);
    setSavingField(null);
    setSavedFields({});
    setMatchCandidates([]);
    setAutoMatchedAccountId(null);
    setIsCreatingAccount(false);
    setNewAccountName('');
    setNewAccountInstitution('');
    setNewAccountType('CHECKING');
    setIsSavingNewAccount(false);
    setNewAccountError('');
    setPendingNewAccount(null);
    loadedInitialRef.current = false;
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const requestClose = () => {
    const hasUnsavedData = step === 'map' && (aiRows !== null ? aiRows.length > 0 : rows.length > 0);
    if (hasUnsavedData && !confirm('Discard this import? The transactions read from your file will be lost.')) {
      return;
    }
    handleClose();
  };

  const { dialogRef, dialogProps } = useModalA11y(isOpen, requestClose);

  // Sets the loaded rows and, for a large statement (several repeat
  // merchants), starts those groups collapsed rather than dumping
  // everything expanded — a manual "Collapse/Expand all" toggle still
  // overrides this either way.
  const applyLoadedTransactions = (loaded: StatementTransactionItem[]) => {
    setTransactions(loaded);
    const unresolved = loaded.filter((t) => t.status === 'UNMATCHED');
    const groupKeys = multiItemGroupKeys(unresolved);
    setCollapsedGroups(groupKeys.length >= AUTO_COLLAPSE_GROUP_THRESHOLD ? new Set(groupKeys) : new Set());
  };

  useEffect(() => {
    if (isOpen && initialImportId && !loadedInitialRef.current) {
      loadedInitialRef.current = true;
      setIsLoadingReview(true);
      fetch(`/api/statements/${initialImportId}/transactions`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'ok') {
            setImportId(initialImportId);
            setImportLabel(data.import?.label || 'Statement import');
            setImportAccount(data.import?.account || null);
            setImportBalances({
              openingBalance: data.import?.openingBalance ?? null,
              closingBalance: data.import?.closingBalance ?? null,
            });
            applyLoadedTransactions(data.transactions || []);
            setStep('review');
          }
        })
        .finally(() => setIsLoadingReview(false));
    }
  }, [isOpen, initialImportId]);

  const loadText = (text: string, name?: string) => {
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      setParseError("Could not find any data rows in that file. Make sure it's a CSV export with a header row.");
      return;
    }
    const [headerRow, ...dataRows] = parsed;
    const g: ColumnGuess = guessColumns(headerRow);
    setHeaders(headerRow);
    setRows(dataRows);
    setDateCol(g.dateIndex);
    setDescCol(g.descriptionIndex);
    if (g.debitIndex !== null || g.creditIndex !== null) {
      setAmountMode('split');
      setDebitCol(g.debitIndex);
      setCreditCol(g.creditIndex);
    } else {
      setAmountMode('single');
      setAmountCol(g.amountIndex);
    }
    setParseError('');
    setLabel(name ? name.replace(/\.[^.]+$/, '') : `Statement — ${new Date().toLocaleDateString('en-GB')}`);
    setStep('map');
  };

  const extractFromFile = async (fileBase64: string, mimeType: string, name: string) => {
    setIsExtracting(true);
    setParseError('');
    try {
      const res = await fetch('/api/statements/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, mimeType }),
      });
      const data = await res.json();
      if (data.status !== 'ok') {
        setParseError(data.message || 'Failed to read that file.');
        return;
      }
      const extracted: PreparedRow[] = (data.transactions || []).map(
        (t: { date: string; rawDescription: string; amount: number; direction: 'DEBIT' | 'CREDIT' }) => ({
          date: t.date,
          rawDescription: t.rawDescription,
          amount: t.amount,
          direction: t.direction,
        })
      );
      setAiRows(extracted);
      setAccountInfo(data.accountInfo || null);
      setHeaders([]);
      setRows([]);
      setLabel(name.replace(/\.[^.]+$/, '') || `Statement — ${new Date().toLocaleDateString('en-GB')}`);
      setStep('map');
    } catch {
      setParseError('Failed to read that file. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setParseError('');

    const lowerName = file.name.toLowerCase();
    const isCsv = file.type === 'text/csv' || lowerName.endsWith('.csv');
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (isCsv) {
      const reader = new FileReader();
      reader.onload = () => loadText(String(reader.result || ''), file.name);
      reader.readAsText(file);
      return;
    }

    if (isPdf || isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        const base64 = dataUrl.split(',')[1] || '';
        const mimeType = file.type || (isPdf ? 'application/pdf' : 'image/png');
        void extractFromFile(base64, mimeType, file.name);
      };
      reader.readAsDataURL(file);
      return;
    }

    setParseError('Unsupported file type. Please upload a CSV, PDF, or photo/screenshot of your statement.');
  };

  const preparedRows: PreparedRow[] = useMemo(() => {
    if (aiRows) return aiRows;
    if (descCol === null) return [];
    const out: PreparedRow[] = [];
    for (const row of rows) {
      const rawDescription = (row[descCol] || '').trim();
      if (!rawDescription) continue;
      const date = dateCol !== null ? parseDateFlexible(row[dateCol] || '') : null;
      if (!date) continue;

      let amount: number | null = null;
      let direction: 'DEBIT' | 'CREDIT' = 'DEBIT';

      if (amountMode === 'single') {
        if (amountCol === null) continue;
        const raw = parseAmount(row[amountCol] || '');
        if (raw === null || raw === 0) continue;
        const isPositive = raw > 0;
        direction = (isPositive && positiveMeans === 'out') || (!isPositive && positiveMeans === 'in') ? 'DEBIT' : 'CREDIT';
        amount = Math.abs(raw);
      } else {
        const debitRaw = debitCol !== null ? parseAmount(row[debitCol] || '') : null;
        const creditRaw = creditCol !== null ? parseAmount(row[creditCol] || '') : null;
        if (debitRaw) {
          amount = Math.abs(debitRaw);
          direction = 'DEBIT';
        } else if (creditRaw) {
          amount = Math.abs(creditRaw);
          direction = 'CREDIT';
        } else {
          continue;
        }
      }

      if (amount === null) continue;
      out.push({ date, rawDescription, amount, direction });
    }
    return out;
  }, [aiRows, rows, dateCol, descCol, amountMode, amountCol, debitCol, creditCol, positiveMeans]);

  const canImport = aiRows !== null
    ? true
    : dateCol !== null && descCol !== null && (amountMode === 'single' ? amountCol !== null : debitCol !== null || creditCol !== null);

  // The candidate that was actually auto-selected, if the currently
  // selected account still is the one auto-matching picked (the user
  // hasn't overridden it since) — used to show which fields matched.
  const matchedWinner = autoMatchedAccountId && accountId === autoMatchedAccountId
    ? matchCandidates.find((c) => c.accountId === autoMatchedAccountId) || null
    : null;

  // Cross-references the statement's extracted account details against
  // EVERY account already saved in the household, so the right one can be
  // suggested (or auto-selected, when unambiguous) before the user has to
  // manually pick anything. Runs once per extracted statement, not on every
  // accountId change — a manual selection is never fought once made (see
  // the `prev || …` guard below).
  useEffect(() => {
    setMatchCandidates([]);
    setAutoMatchedAccountId(null);
    if (step !== 'map' || !accountInfo) return;
    const { accountNumber, sortCode, iban, bic } = accountInfo;
    if (!accountNumber && !sortCode && !iban && !bic) return;
    let cancelled = false;
    fetch('/api/accounts/match-statement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountNumber, sortCode, iban, bic }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || data.status !== 'ok') return;
        const candidates: { accountId: string; accountName: string; matchedFields: string[] }[] = data.candidates || [];
        setMatchCandidates(candidates);
        // A single matched field (e.g. just a sort code, often shared across
        // many accounts at the same bank) is a much weaker signal than
        // several fields matching at once — so only auto-select when the
        // top candidate clearly beats the runner-up on matched-field count,
        // not merely whenever there happens to be exactly one candidate.
        const isClearWinner =
          candidates.length === 1 ||
          (candidates.length > 1 && candidates[0].matchedFields.length > candidates[1].matchedFields.length);
        if (isClearWinner && candidates.length > 0) {
          setAccountId((prev) => prev || candidates[0].accountId);
          setAutoMatchedAccountId(candidates[0].accountId);
        }
      })
      .catch(() => { if (!cancelled) setMatchCandidates([]); });
    return () => { cancelled = true; };
  }, [accountInfo, step]);

  useEffect(() => {
    setSavedFields({});
    if (
      step !== 'map' || !accountId || !accountInfo ||
      (!accountInfo.accountNumber && !accountInfo.sortCode && !accountInfo.iban && !accountInfo.bic)
    ) {
      setAccountMatch(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/accounts/${accountId}/compare-statement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountNumber: accountInfo.accountNumber,
        sortCode: accountInfo.sortCode,
        iban: accountInfo.iban,
        bic: accountInfo.bic,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setAccountMatch(
          data.status === 'ok'
            ? { accountNumber: data.accountNumber, routingNumber: data.routingNumber, iban: data.iban, bic: data.bic }
            : null
        );
      })
      .catch(() => { if (!cancelled) setAccountMatch(null); });
    return () => { cancelled = true; };
  }, [accountId, accountInfo, step]);

  const saveAccountField = async (field: 'accountNumber' | 'routingNumber' | 'iban' | 'bic', value: string) => {
    if (!accountId) return;
    setSavingField(field);
    try {
      const res = await fetch('/api/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accountId, [field]: value }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setSavedFields((prev) => ({ ...prev, [field]: true }));
        setAccountMatch((prev) => (prev ? { ...prev, [field]: 'match' } : prev));
      }
    } finally {
      setSavingField(null);
    }
  };

  useEffect(() => {
    if (pendingNewAccount && accounts.some((a) => a.id === pendingNewAccount.id)) {
      setPendingNewAccount(null);
    }
  }, [accounts, pendingNewAccount]);

  const openCreateAccount = () => {
    setNewAccountName(accountInfo?.bankName || '');
    setNewAccountInstitution(accountInfo?.bankName || '');
    setNewAccountType('CHECKING');
    setNewAccountError('');
    setIsCreatingAccount(true);
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      setNewAccountError('Give the account a name first.');
      return;
    }
    setIsSavingNewAccount(true);
    setNewAccountError('');
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAccountName.trim(),
          institution: newAccountInstitution.trim(),
          type: newAccountType,
          currency: householdCurrency,
          isActive: true,
          ...(accountInfo?.accountNumber ? { accountNumber: accountInfo.accountNumber } : {}),
          ...(accountInfo?.sortCode ? { routingNumber: accountInfo.sortCode } : {}),
          ...(accountInfo?.iban ? { iban: accountInfo.iban } : {}),
          ...(accountInfo?.bic ? { bic: accountInfo.bic } : {}),
        }),
      });
      const data = await res.json();
      if (data.status !== 'ok') {
        setNewAccountError(data.message || 'Failed to create that account.');
        return;
      }
      setPendingNewAccount({ id: data.account.id, name: data.account.name });
      setAccountId(data.account.id);
      setIsCreatingAccount(false);
      setSavedFields((prev) => ({
        ...prev,
        ...(accountInfo?.accountNumber ? { accountNumber: true } : {}),
        ...(accountInfo?.sortCode ? { routingNumber: true } : {}),
        ...(accountInfo?.iban ? { iban: true } : {}),
        ...(accountInfo?.bic ? { bic: true } : {}),
      }));
      onExpensesChanged?.();
    } catch {
      setNewAccountError('Failed to create that account. Please try again.');
    } finally {
      setIsSavingNewAccount(false);
    }
  };

  const handleImport = async () => {
    if (preparedRows.length === 0) {
      setSubmitError("No valid rows found with the selected columns — double check your mapping.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          fileName,
          accountId: accountId || null,
          transactions: preparedRows.map((r) => ({ ...r, currency: householdCurrency })),
          openingBalance: accountInfo?.openingBalance ?? null,
          closingBalance: accountInfo?.closingBalance ?? null,
          statementPeriod: accountInfo?.statementPeriod ?? null,
        }),
      });
      const data = await res.json();
      if (data.status !== 'ok') {
        setSubmitError(data.message || 'Failed to import statement.');
        return;
      }
      setImportId(data.import.id);
      setImportLabel(data.import.label);
      setImportAccount(accounts.find((a) => a.id === accountId) || null);
      setImportBalances({
        openingBalance: data.import.openingBalance ?? null,
        closingBalance: data.import.closingBalance ?? null,
      });
      applyLoadedTransactions(data.transactions);
      setStep('review');
      onImported();
    } catch {
      setSubmitError('Failed to import statement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolveTx = async (txId: string, action: string, extra?: Record<string, unknown>) => {
    if (!importId) return;
    setBusyTxId(txId);
    try {
      const res = await fetch(`/api/statements/${importId}/transactions/${txId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, learnAlias: true, ...extra }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setTransactions((prev) => prev.map((t) => (t.id === txId || (action === 'rename_merchant' && t.normalizedDescription === data.transaction.normalizedDescription) ? { ...t, vendorName: data.transaction.vendorName ?? t.vendorName, ...(t.id === txId ? data.transaction : {}) } : t)));
        setLinkingTxId(null);
        setLinkingIncomeTxId(null);
        setCategorizingTxId(null);
        setLoggingTransferTxId(null);
        setRenamingTxId(null);
        if (['categorize', 'confirm', 'link_expense', 'link_income', 'log_transfer'].includes(action)) {
          onExpensesChanged?.();
        }
      }
    } finally {
      setBusyTxId(null);
    }
  };

  const handleStartRenameImport = () => {
    setRenameLabelInput(importLabel);
    setIsRenamingImport(true);
  };

  const handleSaveRenameImport = async () => {
    if (!importId || !renameLabelInput.trim()) return;
    setIsSavingRename(true);
    try {
      const res = await fetch(`/api/statements/${importId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: renameLabelInput.trim() }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setImportLabel(data.import.label);
        setIsRenamingImport(false);
        onImported();
      }
    } finally {
      setIsSavingRename(false);
    }
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const resolveGroup = async (group: TxGroup, action: 'ignore' | 'log_transfer') => {
    setBusyGroupKey(group.key);
    try {
      const unmatched = group.items.filter((t) => t.status === 'UNMATCHED');
      await Promise.all(
        unmatched.map((tx) =>
          resolveTx(tx.id, action, action === 'log_transfer' ? { vendorName: tx.vendorName || tx.rawDescription } : undefined)
        )
      );
    } finally {
      setBusyGroupKey(null);
    }
  };

  const resolveGroupCategorize = async (group: TxGroup, category: ExpenseCategory) => {
    setBusyGroupKey(group.key);
    try {
      const unmatched = group.items.filter((t) => t.status === 'UNMATCHED');
      await Promise.all(
        unmatched.map((tx) =>
          resolveTx(tx.id, 'categorize', { category, vendorName: tx.vendorName || tx.rawDescription })
        )
      );
      setCategorizingGroupKey(null);
    } finally {
      setBusyGroupKey(null);
    }
  };

  const resolveGroupAsRecurring = async (group: TxGroup, category: ExpenseCategory) => {
    if (!importId) return;
    setBusyGroupKey(group.key);
    try {
      const unmatched = group.items.filter((t) => t.status === 'UNMATCHED');
      const res = await fetch(`/api/statements/${importId}/transactions/group-resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txIds: unmatched.map((t) => t.id),
          category,
          vendorName: group.items.find((t) => t.vendorName)?.vendorName || group.label,
        }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        const updatedById = new Map<string, StatementTransactionItem>(
          data.transactions.map((t: StatementTransactionItem) => [t.id, t])
        );
        setTransactions((prev) => prev.map((t) => updatedById.get(t.id) || t));
        setCategorizingGroupKey(null);
        onExpensesChanged?.();
      } else {
        alert(data.message || 'Failed to create recurring bill');
      }
    } finally {
      setBusyGroupKey(null);
    }
  };

  const handleRecheck = async () => {
    if (!importId) return;
    setIsRechecking(true);
    setRecheckResult(null);
    try {
      const res = await fetch(`/api/statements/${importId}/recheck`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'ok') {
        const updatedById = new Map<string, StatementTransactionItem>(
          data.transactions.map((t: StatementTransactionItem) => [t.id, t])
        );
        setTransactions((prev) => prev.map((t) => updatedById.get(t.id) || t));
        setRecheckResult(
          data.changedCount > 0
            ? `Updated ${data.changedCount} row${data.changedCount === 1 ? '' : 's'} — a rename or new bill probably matched something that couldn't be recognized before.`
            : 'Nothing changed — everything still unresolved looks the same as before.'
        );
      } else {
        setRecheckResult(data.message || 'Failed to recheck matches');
      }
    } finally {
      setIsRechecking(false);
    }
  };

  if (!isOpen) return null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isExtracting) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const filteredTransactions = transactions.filter((t) => {
    if (reviewFilter === 'all') return true;
    if (reviewFilter === 'matched') return t.status === 'MATCHED';
    if (reviewFilter === 'ignored') return t.status === 'IGNORED';
    if (reviewFilter === 'duplicate') return t.status === 'DUPLICATE';
    return t.status === 'UNMATCHED';
  });

  const needsReviewCount = transactions.filter((t) => t.status === 'UNMATCHED').length;
  const matchedCount = transactions.filter((t) => t.status === 'MATCHED').length;
  const ignoredCount = transactions.filter((t) => t.status === 'IGNORED').length;
  const duplicateCount = transactions.filter((t) => t.status === 'DUPLICATE').length;

  // Reconciliation: closingBalance - openingBalance should equal the sum of
  // every logged row's signed amount, regardless of status — a row still
  // counts even if IGNORED or flagged DUPLICATE, since it was genuinely
  // present in the source document either way. Only computable when the
  // statement itself stated both balances (PDF/photo imports via AI
  // extraction) — a CSV export has no such header, so this stays null.
  const reconciliation = (() => {
    if (!importBalances || importBalances.openingBalance == null || importBalances.closingBalance == null) return null;
    const loggedTotal = transactions.reduce((sum, t) => sum + (t.direction === 'CREDIT' ? t.amount : -t.amount), 0);
    const expectedTotal = importBalances.closingBalance - importBalances.openingBalance;
    const difference = expectedTotal - loggedTotal;
    return { loggedTotal, expectedTotal, difference, reconciled: Math.abs(difference) < 0.01 };
  })();

  // Sorting is applied to the flat list before grouping, so both which
  // group appears first (its first-encountered item under this sort) and
  // the order of items within a group follow the chosen sort.
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    switch (reviewSort) {
      case 'date-asc': return a.date.localeCompare(b.date);
      case 'amount-desc': return b.amount - a.amount;
      case 'amount-asc': return a.amount - b.amount;
      case 'merchant-asc': return (a.vendorName || a.normalizedDescription || a.rawDescription).localeCompare(b.vendorName || b.normalizedDescription || b.rawDescription);
      case 'status': return STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
      case 'date-desc':
      default:
        return b.date.localeCompare(a.date);
    }
  });

  const groupedTransactions: TxGroup[] = (() => {
    const map = new Map<string, StatementTransactionItem[]>();
    for (const tx of sortedTransactions) {
      const key = tx.normalizedDescription || tx.rawDescription;
      const arr = map.get(key);
      if (arr) arr.push(tx); else map.set(key, [tx]);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const unmatched = items.filter((t) => t.status === 'UNMATCHED');
      const sameAmount = unmatched.length >= 3 && unmatched.every((t) => t.amount === unmatched[0].amount && t.direction === 'DEBIT');
      const detectedCycle = sameAmount ? detectRecurringCycle(unmatched.map((t) => t.date)) : null;
      return { key, label: items[0].vendorName || key, items, detectedCycle };
    });
  })();

  const visibleMultiGroupKeys = groupedTransactions.filter((g) => g.items.length > 1).map((g) => g.key);
  const allVisibleGroupsCollapsed = visibleMultiGroupKeys.length > 0 && visibleMultiGroupKeys.every((k) => collapsedGroups.has(k));

  return (
    <div className="modal-overlay">
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: step === 'review' ? '760px' : '540px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.1rem 1.5rem',
          borderBottom: '1px solid var(--ha-line)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {step === 'review' && isRenamingImport ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  autoFocus
                  className="ha-input"
                  value={renameLabelInput}
                  onChange={(e) => setRenameLabelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRenameImport();
                    if (e.key === 'Escape') setIsRenamingImport(false);
                  }}
                  style={{ fontSize: '1.1rem', fontWeight: 700, padding: '0.3rem 0.5rem', maxWidth: '260px' }}
                />
                <button
                  onClick={handleSaveRenameImport}
                  disabled={isSavingRename || !renameLabelInput.trim()}
                  className="btn btn-primary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                >
                  {isSavingRename ? <Loader2 size={12} className="spin" /> : 'Save'}
                </button>
                <button onClick={() => setIsRenamingImport(false)} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {step === 'review' ? importLabel || 'Review statement' : 'Import a statement'}
                {step === 'review' && (
                  <button
                    onClick={handleStartRenameImport}
                    className="ha-icon-btn"
                    title="Rename this statement"
                    style={{ padding: '0.2rem' }}
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </h3>
            )}
            <p style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              {step === 'upload' && 'Upload a bank or credit-card statement — CSV, PDF, or a photo — to cross-check against your bills.'}
              {step === 'map' && (aiRows ? `${aiRows.length} transaction${aiRows.length === 1 ? '' : 's'} found — check the details below before importing.` : `${rows.length} rows found — tell us which columns are which.`)}
              {step === 'review' && (importAccount ? `${importAccount.name}${importAccount.institution ? ` — ${importAccount.institution}` : ''} · Confirm matches, link forgotten payments, or ignore what you don't need.` : 'Confirm matches, link forgotten payments, or ignore what you don\'t need.')}
            </p>
          </div>
          <button onClick={requestClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {step === 'upload' && (
            <>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => !isExtracting && fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--ha-line)',
                  borderRadius: 'var(--ha-radius-lg)',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  cursor: isExtracting ? 'default' : 'pointer',
                  backgroundColor: '#fafaf7',
                  opacity: isExtracting ? 0.75 : 1,
                }}
              >
                {isExtracting ? (
                  <>
                    <Loader2 size={30} color="var(--ha-muted)" className="spin" style={{ marginBottom: '0.6rem' }} />
                    <div style={{ fontWeight: 600, color: 'var(--ha-ink)', fontSize: '0.95rem' }}>
                      Reading your statement…
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '0.35rem' }}>
                      This can take a few seconds for PDFs with lots of transactions
                    </div>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={30} color="var(--ha-muted)" style={{ marginBottom: '0.6rem' }} />
                    <div style={{ fontWeight: 600, color: 'var(--ha-ink)', fontSize: '0.95rem' }}>
                      Drop a CSV, PDF, or photo here
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '0.35rem' }}>
                      or click to choose a file — CSV works best, but a PDF export or a clear photo of a paper statement works too
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,.pdf,application/pdf,image/*"
                  style={{ display: 'none' }}
                  disabled={isExtracting}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && !isExtracting) handleFile(file);
                    e.target.value = '';
                  }}
                />
              </div>
              {parseError && (
                <div style={{
                  backgroundColor: 'var(--ha-red-tint)',
                  border: '1px solid var(--ha-red)',
                  borderRadius: 'var(--ha-radius-sm)',
                  padding: '0.75rem 1rem',
                  color: 'var(--ha-red)',
                  fontSize: '0.85rem',
                }}>
                  {parseError}
                </div>
              )}
            </>
          )}

          {step === 'map' && (
            <>
              {matchedWinner && (
                <p style={{
                  fontSize: '0.8rem', color: 'var(--ha-blue)', backgroundColor: 'var(--ha-blue-light)',
                  borderRadius: 'var(--ha-radius-md)', padding: '0.6rem 0.75rem', margin: '0 0 1rem', lineHeight: 1.45,
                }}>
                  <CheckCircle2 size={14} style={{ verticalAlign: '-2px', marginRight: '0.35rem' }} />
                  Matched to <strong>{matchedWinner.accountName}</strong> — {joinFieldLabels(matchedWinner.matchedFields)} match{matchedWinner.matchedFields.length === 1 ? 'es' : ''}. Not right? Pick a different account below.
                </p>
              )}
              {matchCandidates.length > 1 && !accountId && (
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', margin: '0 0 0.4rem' }}>
                    Could be one of these saved accounts:
                  </p>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {matchCandidates.map((c) => (
                      <button
                        key={c.accountId}
                        type="button"
                        onClick={() => setAccountId(c.accountId)}
                        className="ha-chip"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        title={`${joinFieldLabels(c.matchedFields)} match`}
                      >
                        {c.accountName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.3rem' }}>
                    Label for this import
                  </label>
                  <input className="ha-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. AIB Credit Card — September" />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.3rem' }}>
                    Which account is this?
                  </label>
                  {(accounts.length > 0 || pendingNewAccount) ? (
                    <select className="ha-input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                      <option value="">Not sure / mixed</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}{a.institution ? ` — ${a.institution}` : ''}</option>
                      ))}
                      {pendingNewAccount && !accounts.some((a) => a.id === pendingNewAccount.id) && (
                        <option key={pendingNewAccount.id} value={pendingNewAccount.id}>{pendingNewAccount.name}</option>
                      )}
                    </select>
                  ) : (
                    <p style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', margin: '0.4rem 0' }}>
                      No accounts saved yet.
                    </p>
                  )}
                  {!isCreatingAccount && (
                    <button
                      type="button"
                      onClick={openCreateAccount}
                      className="btn btn-ghost"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0', marginTop: '0.3rem' }}
                    >
                      <Landmark size={12} /> {accounts.length > 0 ? 'Add a new account' : 'Add your first account'}
                    </button>
                  )}
                </div>
              </div>

              {isCreatingAccount && (
                <div style={{
                  border: '1px solid var(--ha-line)',
                  borderRadius: 'var(--ha-radius-md)',
                  padding: '0.85rem 1rem',
                  backgroundColor: '#fafaf7',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                    New account
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', display: 'block', marginBottom: '0.25rem' }}>
                        Account name
                      </label>
                      <input
                        className="ha-input"
                        style={{ fontSize: '0.85rem' }}
                        value={newAccountName}
                        onChange={(e) => setNewAccountName(e.target.value)}
                        placeholder="e.g. Main Current Account"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', display: 'block', marginBottom: '0.25rem' }}>
                        Type
                      </label>
                      <select
                        className="ha-input"
                        style={{ fontSize: '0.85rem' }}
                        value={newAccountType}
                        onChange={(e) => setNewAccountType(e.target.value as AccountType)}
                      >
                        {ACCOUNT_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Institution
                    </label>
                    <input
                      className="ha-input"
                      style={{ fontSize: '0.85rem' }}
                      value={newAccountInstitution}
                      onChange={(e) => setNewAccountInstitution(e.target.value)}
                      placeholder="e.g. AIB, Revolut, PayPal"
                    />
                  </div>
                  {(accountInfo?.accountNumber || accountInfo?.sortCode || accountInfo?.iban || accountInfo?.bic) && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--ha-muted)', margin: 0 }}>
                      The {joinFieldLabels([
                        accountInfo.accountNumber && 'accountNumber',
                        accountInfo.sortCode && 'routingNumber',
                        accountInfo.iban && 'iban',
                        accountInfo.bic && 'bic',
                      ].filter((f): f is string => !!f))} found on this statement will be saved to the new account, encrypted.
                    </p>
                  )}
                  {newAccountError && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--ha-red)' }}>{newAccountError}</div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleCreateAccount}
                      disabled={isSavingNewAccount}
                      className="btn btn-primary"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem' }}
                    >
                      {isSavingNewAccount ? <Loader2 size={13} className="spin" /> : <Landmark size={13} />}
                      {isSavingNewAccount ? 'Creating…' : 'Create account'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsCreatingAccount(false); setNewAccountError(''); }}
                      className="btn btn-ghost"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {accountInfo && (accountInfo.bankName || accountInfo.accountHolderName || accountInfo.accountNumber || accountInfo.sortCode || accountInfo.iban || accountInfo.statementPeriod || accountInfo.openingBalance != null || accountInfo.closingBalance != null) && (
                <div style={{
                  border: '1px solid var(--ha-line)',
                  borderRadius: 'var(--ha-radius-md)',
                  padding: '0.85rem 1rem',
                  backgroundColor: '#fafaf7',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                    Account details found on statement
                  </div>

                  {(accountInfo.bankName || accountInfo.accountHolderName) && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--ha-muted)' }}>
                      {[accountInfo.bankName, accountInfo.accountHolderName].filter(Boolean).join(' — ')}
                    </div>
                  )}

                  {accountInfo.accountNumber && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--ha-muted)' }}>Account no.</span>
                      <span style={{ fontWeight: 600, color: 'var(--ha-ink)' }}>{accountInfo.accountNumber}</span>
                      {accountMatch?.accountNumber === 'match' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--ha-blue)', fontWeight: 600, fontSize: '0.75rem' }}>
                          <CheckCircle2 size={13} /> Matches saved account
                        </span>
                      )}
                      {accountMatch?.accountNumber === 'mismatch' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--ha-red)', fontWeight: 600, fontSize: '0.75rem' }}>
                          <AlertTriangle size={13} /> Doesn&apos;t match the saved account number
                        </span>
                      )}
                      {accountMatch?.accountNumber === 'not_set' && !savedFields.accountNumber && (
                        <button
                          type="button"
                          onClick={() => saveAccountField('accountNumber', accountInfo.accountNumber!)}
                          disabled={savingField === 'accountNumber'}
                          className="btn btn-ghost"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                        >
                          {savingField === 'accountNumber' ? 'Saving…' : `Save to ${accounts.find((a) => a.id === accountId)?.name || 'account'}`}
                        </button>
                      )}
                      {savedFields.accountNumber && (
                        <span style={{ color: 'var(--ha-blue)', fontSize: '0.75rem', fontWeight: 600 }}>Saved</span>
                      )}
                    </div>
                  )}

                  {accountInfo.sortCode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--ha-muted)' }}>Sort code</span>
                      <span style={{ fontWeight: 600, color: 'var(--ha-ink)' }}>{accountInfo.sortCode}</span>
                      {accountMatch?.routingNumber === 'match' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--ha-blue)', fontWeight: 600, fontSize: '0.75rem' }}>
                          <CheckCircle2 size={13} /> Matches saved account
                        </span>
                      )}
                      {accountMatch?.routingNumber === 'mismatch' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--ha-red)', fontWeight: 600, fontSize: '0.75rem' }}>
                          <AlertTriangle size={13} /> Doesn&apos;t match the saved sort code
                        </span>
                      )}
                      {accountMatch?.routingNumber === 'not_set' && !savedFields.routingNumber && (
                        <button
                          type="button"
                          onClick={() => saveAccountField('routingNumber', accountInfo.sortCode!)}
                          disabled={savingField === 'routingNumber'}
                          className="btn btn-ghost"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                        >
                          {savingField === 'routingNumber' ? 'Saving…' : `Save to ${accounts.find((a) => a.id === accountId)?.name || 'account'}`}
                        </button>
                      )}
                      {savedFields.routingNumber && (
                        <span style={{ color: 'var(--ha-blue)', fontSize: '0.75rem', fontWeight: 600 }}>Saved</span>
                      )}
                    </div>
                  )}

                  {accountInfo.iban && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--ha-muted)' }}>IBAN</span>
                      <span style={{ fontWeight: 600, color: 'var(--ha-ink)' }}>{accountInfo.iban}</span>
                      {accountMatch?.iban === 'match' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--ha-blue)', fontWeight: 600, fontSize: '0.75rem' }}>
                          <CheckCircle2 size={13} /> Matches saved account
                        </span>
                      )}
                      {accountMatch?.iban === 'mismatch' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--ha-red)', fontWeight: 600, fontSize: '0.75rem' }}>
                          <AlertTriangle size={13} /> Doesn&apos;t match the saved IBAN
                        </span>
                      )}
                      {accountMatch?.iban === 'not_set' && !savedFields.iban && (
                        <button
                          type="button"
                          onClick={() => saveAccountField('iban', accountInfo.iban!)}
                          disabled={savingField === 'iban'}
                          className="btn btn-ghost"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                        >
                          {savingField === 'iban' ? 'Saving…' : `Save to ${accounts.find((a) => a.id === accountId)?.name || 'account'}`}
                        </button>
                      )}
                      {savedFields.iban && (
                        <span style={{ color: 'var(--ha-blue)', fontSize: '0.75rem', fontWeight: 600 }}>Saved</span>
                      )}
                    </div>
                  )}

                  {accountInfo.bic && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--ha-muted)' }}>BIC / SWIFT</span>
                      <span style={{ fontWeight: 600, color: 'var(--ha-ink)' }}>{accountInfo.bic}</span>
                      {accountMatch?.bic === 'match' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--ha-blue)', fontWeight: 600, fontSize: '0.75rem' }}>
                          <CheckCircle2 size={13} /> Matches saved account
                        </span>
                      )}
                      {accountMatch?.bic === 'mismatch' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--ha-red)', fontWeight: 600, fontSize: '0.75rem' }}>
                          <AlertTriangle size={13} /> Doesn&apos;t match the saved BIC
                        </span>
                      )}
                      {accountMatch?.bic === 'not_set' && !savedFields.bic && (
                        <button
                          type="button"
                          onClick={() => saveAccountField('bic', accountInfo.bic!)}
                          disabled={savingField === 'bic'}
                          className="btn btn-ghost"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                        >
                          {savingField === 'bic' ? 'Saving…' : `Save to ${accounts.find((a) => a.id === accountId)?.name || 'account'}`}
                        </button>
                      )}
                      {savedFields.bic && (
                        <span style={{ color: 'var(--ha-blue)', fontSize: '0.75rem', fontWeight: 600 }}>Saved</span>
                      )}
                    </div>
                  )}

                  {(accountInfo.statementPeriod || accountInfo.openingBalance != null || accountInfo.closingBalance != null) && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--ha-muted)' }}>
                      {accountInfo.statementPeriod}
                      {(accountInfo.openingBalance != null || accountInfo.closingBalance != null) && (
                        <span>
                          {accountInfo.statementPeriod ? ' · ' : ''}
                          {accountInfo.openingBalance != null ? formatCurrency(accountInfo.openingBalance, householdCurrency) : '—'}
                          {' → '}
                          {accountInfo.closingBalance != null ? formatCurrency(accountInfo.closingBalance, householdCurrency) : '—'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {aiRows ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--ha-muted)' }}>
                  <span><strong style={{ color: 'var(--ha-ink)' }}>{preparedRows.length}</strong> transaction{preparedRows.length === 1 ? '' : 's'} read from the file and ready to import.</span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.3rem' }}>
                        Date column
                      </label>
                      <select className="ha-input" value={dateCol ?? ''} onChange={(e) => setDateCol(e.target.value === '' ? null : Number(e.target.value))}>
                        <option value="">— Select —</option>
                        {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.3rem' }}>
                        Description column
                      </label>
                      <select className="ha-input" value={descCol ?? ''} onChange={(e) => setDescCol(e.target.value === '' ? null : Number(e.target.value))}>
                        <option value="">— Select —</option>
                        {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--ha-ink)', cursor: 'pointer' }}>
                        <input type="radio" checked={amountMode === 'single'} onChange={() => setAmountMode('single')} />
                        Single amount column
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--ha-ink)', cursor: 'pointer' }}>
                        <input type="radio" checked={amountMode === 'split'} onChange={() => setAmountMode('split')} />
                        Separate debit/credit columns
                      </label>
                    </div>

                    {amountMode === 'single' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <select className="ha-input" value={amountCol ?? ''} onChange={(e) => setAmountCol(e.target.value === '' ? null : Number(e.target.value))}>
                          <option value="">— Amount column —</option>
                          {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                        </select>
                        <select className="ha-input" value={positiveMeans} onChange={(e) => setPositiveMeans(e.target.value as 'out' | 'in')}>
                          <option value="out">Positive = money out</option>
                          <option value="in">Positive = money in</option>
                        </select>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <select className="ha-input" value={debitCol ?? ''} onChange={(e) => setDebitCol(e.target.value === '' ? null : Number(e.target.value))}>
                          <option value="">— Debit (out) column —</option>
                          {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                        </select>
                        <select className="ha-input" value={creditCol ?? ''} onChange={(e) => setCreditCol(e.target.value === '' ? null : Number(e.target.value))}>
                          <option value="">— Credit (in) column —</option>
                          {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--ha-muted)' }}>
                    {canImport ? (
                      <span><strong style={{ color: 'var(--ha-ink)' }}>{preparedRows.length}</strong> of {rows.length} rows look valid and ready to import.</span>
                    ) : (
                      'Select the columns above to preview how many rows will import.'
                    )}
                  </div>
                </>
              )}

              {canImport && preparedRows.length > 0 && (
                <div style={{ border: '1px solid var(--ha-line)', borderRadius: 'var(--ha-radius-md)', overflow: 'hidden' }}>
                  {preparedRows.slice(0, 4).map((r, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', gap: '0.75rem',
                      padding: '0.5rem 0.75rem', fontSize: '0.78rem',
                      borderBottom: i < 3 ? '1px solid var(--ha-line)' : 'none',
                      backgroundColor: '#fafaf7',
                    }}>
                      <span style={{ color: 'var(--ha-muted)', flexShrink: 0 }}>{r.date}</span>
                      <span style={{ color: 'var(--ha-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{r.rawDescription}</span>
                      <span style={{ color: r.direction === 'DEBIT' ? 'var(--ha-red)' : 'var(--ha-blue)', fontWeight: 600, flexShrink: 0 }}>
                        {r.direction === 'DEBIT' ? '−' : '+'}{formatCurrency(r.amount, householdCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {submitError && (
                <div style={{
                  backgroundColor: 'var(--ha-red-tint)', border: '1px solid var(--ha-red)',
                  borderRadius: 'var(--ha-radius-sm)', padding: '0.75rem 1rem', color: 'var(--ha-red)', fontSize: '0.85rem',
                }}>
                  {submitError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between' }}>
                <button
                  onClick={() => { setAiRows(null); setHeaders([]); setRows([]); setAccountInfo(null); setAccountMatch(null); setStep('upload'); }}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={!canImport || preparedRows.length === 0 || isSubmitting}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem' }}
                >
                  {isSubmitting ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
                  {isSubmitting ? 'Importing…' : `Import ${preparedRows.length} transactions`}
                </button>
              </div>
            </>
          )}

          {step === 'review' && (
            <>
              {isLoadingReview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '2rem', justifyContent: 'center', color: 'var(--ha-muted)' }}>
                  <Loader2 size={16} className="spin" /> Loading…
                </div>
              ) : (
                <>
                  {reconciliation && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--ha-radius-sm)',
                      backgroundColor: reconciliation.reconciled ? 'var(--ha-lime-tint)' : '#fdf2e3',
                      border: `1px solid ${reconciliation.reconciled ? 'var(--ha-lime)' : '#f6dfb8'}`,
                      fontSize: '0.8rem',
                      color: reconciliation.reconciled ? 'var(--ha-ink)' : '#7C4A0B',
                    }}>
                      {reconciliation.reconciled ? <CheckCircle2 size={15} color="var(--ha-lime)" style={{ flexShrink: 0 }} /> : <AlertTriangle size={15} color="#B45309" style={{ flexShrink: 0 }} />}
                      <span>
                        {reconciliation.reconciled
                          ? `${transactions.length} rows imported, balance reconciles.`
                          : `${transactions.length} rows imported, ${formatCurrency(Math.abs(reconciliation.difference), householdCurrency)} unaccounted for against the statement's stated balance.`}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {FILTERS.map((f) => {
                        const count = f.id === 'needs_review' ? needsReviewCount : f.id === 'matched' ? matchedCount : f.id === 'ignored' ? ignoredCount : f.id === 'duplicate' ? duplicateCount : transactions.length;
                        const active = reviewFilter === f.id;
                        return (
                          <button
                            key={f.id}
                            onClick={() => setReviewFilter(f.id)}
                            className="ha-chip"
                            style={{
                              fontSize: '0.78rem',
                              backgroundColor: active ? 'var(--ha-blue)' : 'var(--ha-white)',
                              color: active ? 'var(--ha-white)' : 'var(--ha-ink)',
                              border: '1px solid var(--ha-line)',
                              cursor: 'pointer',
                            }}
                          >
                            {f.label} <span style={{ opacity: 0.75 }}>({count})</span>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <select
                        value={reviewSort}
                        onChange={(e) => setReviewSort(e.target.value as ReviewSort)}
                        className="ha-input"
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.55rem' }}
                        title="Sort order"
                      >
                        {SORTS.map((s) => (
                          <option key={s.id} value={s.id}>Sort: {s.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleRecheck}
                        disabled={isRechecking || needsReviewCount === 0}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem', whiteSpace: 'nowrap' }}
                        title="Re-run matching on everything still unresolved — picks up any rename or new bill added since these rows were imported"
                      >
                        {isRechecking ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />} Recheck matches
                      </button>
                      {visibleMultiGroupKeys.length > 0 && (
                        <button
                          onClick={() => setCollapsedGroups(allVisibleGroupsCollapsed ? new Set() : new Set(visibleMultiGroupKeys))}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem', whiteSpace: 'nowrap' }}
                          title="Collapse or expand every repeat-merchant group in this list — handy on a large statement"
                        >
                          {allVisibleGroupsCollapsed ? <ChevronsUpDown size={13} /> : <ChevronsDownUp size={13} />}
                          {allVisibleGroupsCollapsed ? ' Expand all' : ' Collapse all'}
                        </button>
                      )}
                    </div>
                  </div>

                  {recheckResult && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {recheckResult}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', maxHeight: '440px', overflowY: 'auto' }}>
                    {filteredTransactions.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ha-muted)', fontSize: '0.85rem' }}>
                        Nothing here.
                      </div>
                    )}

                    {groupedTransactions.map((group) => {
                      const isMultiple = group.items.length > 1;
                      const isCollapsed = isMultiple && collapsedGroups.has(group.key);
                      const isGroupBusy = busyGroupKey === group.key;
                      const groupHasUnmatched = group.items.some((t) => t.status === 'UNMATCHED');
                      const groupTotal = group.items.reduce(
                        (sum, t) => sum + (t.direction === 'DEBIT' ? -t.amount : t.amount),
                        0
                      );
                      const groupCurrency = group.items[0].currency;

                      return (
                        <div key={group.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {isMultiple && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.5rem',
                                padding: '0.45rem 0.75rem',
                                borderRadius: 'var(--ha-radius-sm)',
                                backgroundColor: '#f0f0ec',
                                flexWrap: 'wrap',
                              }}
                            >
                              <button
                                onClick={() => toggleGroup(group.key)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  color: 'var(--ha-ink)',
                                  padding: 0,
                                  minWidth: 0,
                                }}
                              >
                                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.label}</span>
                                <span style={{ fontWeight: 500, color: 'var(--ha-muted)', flexShrink: 0 }}>× {group.items.length}</span>
                              </button>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                <span
                                  className="tabular-nums"
                                  style={{ fontSize: '0.82rem', fontWeight: 700, color: groupTotal < 0 ? 'var(--ha-red)' : 'var(--ha-blue)' }}
                                >
                                  {groupTotal < 0 ? '−' : '+'}{formatCurrency(Math.abs(groupTotal), groupCurrency)}
                                </span>
                                {groupHasUnmatched && (
                                  <>
                                    <button
                                      disabled={isGroupBusy}
                                      onClick={() => setCategorizingGroupKey(categorizingGroupKey === group.key ? null : group.key)}
                                      className="btn btn-secondary"
                                      style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem' }}
                                    >
                                      {isGroupBusy ? <Loader2 size={11} className="spin" /> : <Tag size={11} />} Add all as expense
                                    </button>
                                    <button
                                      disabled={isGroupBusy}
                                      onClick={() => resolveGroup(group, 'log_transfer')}
                                      className="btn btn-secondary"
                                      style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem' }}
                                    >
                                      {isGroupBusy ? <Loader2 size={11} className="spin" /> : <PlusCircle size={11} />} Log all
                                    </button>
                                    <button
                                      disabled={isGroupBusy}
                                      onClick={() => resolveGroup(group, 'ignore')}
                                      className="btn btn-ghost"
                                      style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem' }}
                                    >
                                      <EyeOff size={11} /> Ignore all
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {isMultiple && categorizingGroupKey === group.key && (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                borderRadius: 'var(--ha-radius-sm)',
                                backgroundColor: '#f0f0ec',
                              }}
                            >
                              {group.detectedCycle && (
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--ha-ink)', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={!!treatGroupAsRecurring[group.key]}
                                    onChange={(e) => setTreatGroupAsRecurring((prev) => ({ ...prev, [group.key]: e.target.checked }))}
                                    style={{ marginTop: '2px', flexShrink: 0 }}
                                  />
                                  <span>
                                    These {group.items.filter((t) => t.status === 'UNMATCHED').length} rows are the same amount, spaced about {CYCLE_LABELS[group.detectedCycle]} apart — treat as <strong>one recurring bill</strong> instead of separate one-offs
                                  </span>
                                </label>
                              )}
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--ha-muted)' }}>
                                  Category for all {group.items.filter((t) => t.status === 'UNMATCHED').length} unmatched:
                                </span>
                                <CategorySelect
                                  className="ha-input"
                                  style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                                  value={selectedGroupCategory[group.key] ?? group.items[0].suggestedCategory ?? ''}
                                  onChange={(id) => setSelectedGroupCategory((prev) => ({ ...prev, [group.key]: id as ExpenseCategory }))}
                                  customCategories={customCategories}
                                  onCategoryCreated={(cat) => onCategoryCreated?.(cat)}
                                  placeholderOption="— Choose a category —"
                                />
                                <button
                                  disabled={!(selectedGroupCategory[group.key] || group.items[0].suggestedCategory) || isGroupBusy}
                                  onClick={() => {
                                    const category = (selectedGroupCategory[group.key] || group.items[0].suggestedCategory) as ExpenseCategory;
                                    if (treatGroupAsRecurring[group.key] && group.detectedCycle) {
                                      resolveGroupAsRecurring(group, category);
                                    } else {
                                      resolveGroupCategorize(group, category);
                                    }
                                  }}
                                  className="btn btn-primary"
                                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                >
                                  {isGroupBusy ? <Loader2 size={12} className="spin" /> : <Tag size={12} />}
                                  {treatGroupAsRecurring[group.key] && group.detectedCycle ? ' Add as recurring bill' : ' Add all'}
                                </button>
                                <button onClick={() => setCategorizingGroupKey(null)} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem' }}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {!isCollapsed && group.items.map((tx) => {
                      const isBusy = busyTxId === tx.id;
                      const isRecurringFlag = !!tx.notes?.startsWith('Appears more than once');
                      return (
                        <div key={tx.id} style={{
                          border: '1px solid var(--ha-line)',
                          borderRadius: 'var(--ha-radius-md)',
                          padding: '0.75rem 0.9rem',
                          backgroundColor: tx.status === 'MATCHED' ? 'var(--ha-blue-light)' : tx.status === 'IGNORED' ? '#f4f4f2' : tx.status === 'DUPLICATE' ? '#f3f0fa' : isRecurringFlag ? '#fdf2e3' : '#fafaf7',
                          opacity: isBusy ? 0.6 : 1,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              {renamingTxId === tx.id ? (
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '2px' }}>
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="e.g. Smyths Toy Shop"
                                    value={nicknameInput[tx.id] ?? tx.vendorName ?? ''}
                                    onChange={(e) => setNicknameInput((prev) => ({ ...prev, [tx.id]: e.target.value }))}
                                    className="ha-input"
                                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}
                                  />
                                  <button
                                    disabled={isBusy || !(nicknameInput[tx.id] ?? tx.vendorName ?? '').trim()}
                                    onClick={() => resolveTx(tx.id, 'rename_merchant', { vendorName: nicknameInput[tx.id] })}
                                    className="btn btn-primary"
                                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', flexShrink: 0 }}
                                  >
                                    {isBusy ? <Loader2 size={11} className="spin" /> : <CheckCircle2 size={11} />}
                                  </button>
                                  <button onClick={() => setRenamingTxId(null)} className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.3rem 0.4rem', flexShrink: 0 }}>
                                    <X size={11} />
                                  </button>
                                </div>
                              ) : (
                                <div
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
                                  onClick={() => { setRenamingTxId(tx.id); setNicknameInput((prev) => ({ ...prev, [tx.id]: tx.vendorName ?? '' })); }}
                                  title="Give this merchant a nickname"
                                >
                                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ha-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {tx.vendorName || tx.rawDescription}
                                  </span>
                                  <Edit2 size={11} color="var(--ha-muted)" style={{ flexShrink: 0 }} />
                                </div>
                              )}
                              <div style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
                                {tx.date}
                                {tx.vendorName && tx.vendorName !== tx.rawDescription && <span> • {tx.rawDescription}</span>}
                                {tx.notes && <span> • {tx.notes}</span>}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div className="tabular-nums" style={{ fontSize: '0.95rem', fontWeight: 700, color: tx.direction === 'DEBIT' ? 'var(--ha-red)' : 'var(--ha-blue)' }}>
                                {tx.direction === 'DEBIT' ? '−' : '+'}{formatCurrency(tx.amount, tx.currency)}
                              </div>
                            </div>
                          </div>

                          {tx.status === 'MATCHED' && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--ha-blue)', fontWeight: 600 }}>
                                <CheckCircle2 size={13} />
                                {tx.matchedExpense ? `Matched: ${tx.matchedExpense.name}` : tx.matchedTransfer ? `Logged: ${tx.matchedTransfer.externalLabel || 'one-off payment'}` : 'Matched'}
                              </div>
                              <button
                                disabled={isBusy}
                                onClick={() => resolveTx(tx.id, 'reset')}
                                className="btn btn-ghost"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              >
                                <RotateCcw size={12} /> Undo
                              </button>
                            </div>
                          )}

                          {tx.status === 'IGNORED' && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--ha-muted)' }}>
                                <EyeOff size={13} /> Ignored
                              </div>
                              <button
                                disabled={isBusy}
                                onClick={() => resolveTx(tx.id, 'reset')}
                                className="btn btn-ghost"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              >
                                <RotateCcw size={12} /> Undo
                              </button>
                            </div>
                          )}

                          {tx.status === 'DUPLICATE' && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#6D4FC7', fontWeight: 600 }}>
                                <Copy size={13} /> Likely duplicate — already imported, skipped automatically
                              </div>
                              <button
                                disabled={isBusy}
                                onClick={() => resolveTx(tx.id, 'reset')}
                                className="btn btn-ghost"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                title="Not actually a duplicate — move back to Needs review"
                              >
                                <RotateCcw size={12} /> Not a duplicate
                              </button>
                            </div>
                          )}

                          {tx.status === 'UNMATCHED' && (
                            <div style={{ marginTop: '0.6rem' }}>
                              {isRecurringFlag && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#B45309', fontWeight: 600, marginBottom: '0.4rem' }}>
                                  <AlertTriangle size={12} /> Recurring but untracked
                                </div>
                              )}

                              {tx.matchedExpense && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--ha-ink)', marginBottom: '0.3rem' }}>
                                  Possible match: <strong>{tx.matchedExpense.name}</strong>
                                  {typeof tx.matchConfidence === 'number' && <span style={{ color: 'var(--ha-muted)' }}> ({Math.round(tx.matchConfidence * 100)}% confident)</span>}
                                </div>
                              )}
                              {!tx.matchedExpense && tx.matchedTransfer && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--ha-ink)', marginBottom: '0.3rem' }}>
                                  Possible match: transfer <strong>{tx.matchedTransfer.externalLabel || 'logged payment'}</strong>
                                  {typeof tx.matchConfidence === 'number' && <span style={{ color: 'var(--ha-muted)' }}> ({Math.round(tx.matchConfidence * 100)}% confident)</span>}
                                </div>
                              )}
                              {(tx.matchedExpense || tx.matchedTransfer) && (typeof tx.matchConfidence !== 'number' || tx.matchConfidence < 0.9) && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--ha-muted)', marginBottom: '0.5rem' }}>
                                  Just a guess — pick whichever button below is actually right. Corrections are remembered for next time.
                                </div>
                              )}

                              {linkingTxId === tx.id ? (
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <select
                                    className="ha-input"
                                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                                    value={selectedExpenseId[tx.id] || ''}
                                    onChange={(e) => setSelectedExpenseId((prev) => ({ ...prev, [tx.id]: e.target.value }))}
                                  >
                                    <option value="">— Choose a bill —</option>
                                    {expenses.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                                  </select>
                                  <button
                                    disabled={!selectedExpenseId[tx.id] || isBusy}
                                    onClick={() => resolveTx(tx.id, 'link_expense', { expenseId: selectedExpenseId[tx.id] })}
                                    className="btn btn-primary"
                                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                  >
                                    Link
                                  </button>
                                  <button onClick={() => setLinkingTxId(null)} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem' }}>
                                    Cancel
                                  </button>
                                </div>
                              ) : linkingIncomeTxId === tx.id ? (
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <select
                                    className="ha-input"
                                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                                    value={selectedIncomeId[tx.id] || ''}
                                    onChange={(e) => setSelectedIncomeId((prev) => ({ ...prev, [tx.id]: e.target.value }))}
                                  >
                                    <option value="">— Choose an income —</option>
                                    {incomes.map((inc) => <option key={inc.id} value={inc.id}>{inc.name}</option>)}
                                  </select>
                                  <button
                                    disabled={!selectedIncomeId[tx.id] || isBusy}
                                    onClick={() => resolveTx(tx.id, 'link_income', { incomeId: selectedIncomeId[tx.id] })}
                                    className="btn btn-primary"
                                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                  >
                                    Link
                                  </button>
                                  <button onClick={() => setLinkingIncomeTxId(null)} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem' }}>
                                    Cancel
                                  </button>
                                </div>
                              ) : categorizingTxId === tx.id ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  <CategorySelect
                                    className="ha-input"
                                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                                    value={selectedCategory[tx.id] ?? tx.suggestedCategory ?? ''}
                                    onChange={(id) => setSelectedCategory((prev) => ({ ...prev, [tx.id]: id as ExpenseCategory }))}
                                    customCategories={customCategories}
                                    onCategoryCreated={(cat) => onCategoryCreated?.(cat)}
                                    placeholderOption="— Choose a category —"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Add a note (optional) — e.g. full brake replacement, follow-up due in 6mo"
                                    value={noteInput[tx.id] ?? ''}
                                    onChange={(e) => setNoteInput((prev) => ({ ...prev, [tx.id]: e.target.value }))}
                                    className="ha-input"
                                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                                  />
                                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <button
                                      disabled={!(selectedCategory[tx.id] || tx.suggestedCategory) || isBusy}
                                      onClick={() => resolveTx(tx.id, 'categorize', {
                                        category: selectedCategory[tx.id] || tx.suggestedCategory,
                                        vendorName: tx.vendorName || tx.rawDescription,
                                        notes: noteInput[tx.id]?.trim() || undefined,
                                      })}
                                      className="btn btn-primary"
                                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                    >
                                      {isBusy ? <Loader2 size={12} className="spin" /> : <Tag size={12} />} Log as expense
                                    </button>
                                    <button onClick={() => setCategorizingTxId(null)} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem' }}>
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : loggingTransferTxId === tx.id ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  <input
                                    type="text"
                                    placeholder="Add a note (optional)"
                                    value={noteInput[tx.id] ?? ''}
                                    onChange={(e) => setNoteInput((prev) => ({ ...prev, [tx.id]: e.target.value }))}
                                    className="ha-input"
                                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                                  />
                                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <button
                                      disabled={isBusy}
                                      onClick={() => resolveTx(tx.id, 'log_transfer', {
                                        vendorName: tx.vendorName || tx.rawDescription,
                                        notes: noteInput[tx.id]?.trim() || undefined,
                                      })}
                                      className="btn btn-primary"
                                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                    >
                                      {isBusy ? <Loader2 size={12} className="spin" /> : <PlusCircle size={12} />} Log as transfer
                                    </button>
                                    <button onClick={() => setLoggingTransferTxId(null)} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem' }}>
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : tx.direction === 'CREDIT' ? (
                                // Money in — the only real destinations are the household's
                                // Income records, or an unlinked "log as transfer" for a
                                // one-off credit (a refund, a gift) that isn't tracked income.
                                // "Link to a bill" / "Add as expense" are expense-side concepts
                                // that don't apply here.
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  {(tx.matchedExpense || tx.matchedTransfer) && (
                                    <button
                                      disabled={isBusy}
                                      onClick={() => resolveTx(tx.id, 'confirm')}
                                      className="btn btn-secondary"
                                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', color: 'var(--ha-blue)', borderColor: 'var(--ha-blue)' }}
                                    >
                                      {isBusy ? <Loader2 size={12} className="spin" /> : <CheckCircle2 size={12} />} Yes, that&apos;s right
                                    </button>
                                  )}
                                  <button
                                    disabled={isBusy}
                                    onClick={() => setLinkingIncomeTxId(tx.id)}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                  >
                                    <Link2 size={12} /> {(tx.matchedExpense || tx.matchedTransfer) ? 'No, link a different income' : 'Link to income'}
                                  </button>
                                  <button
                                    disabled={isBusy}
                                    onClick={() => setLoggingTransferTxId(tx.id)}
                                    className="btn btn-ghost"
                                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                  >
                                    <PlusCircle size={12} /> Log as transfer
                                  </button>
                                  <button
                                    disabled={isBusy}
                                    onClick={() => resolveTx(tx.id, 'ignore')}
                                    className="btn btn-ghost"
                                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                  >
                                    <EyeOff size={12} /> Ignore
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  {(tx.matchedExpense || tx.matchedTransfer) && (
                                    <button
                                      disabled={isBusy}
                                      onClick={() => resolveTx(tx.id, 'confirm')}
                                      className="btn btn-secondary"
                                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', color: 'var(--ha-blue)', borderColor: 'var(--ha-blue)' }}
                                    >
                                      {isBusy ? <Loader2 size={12} className="spin" /> : <CheckCircle2 size={12} />} Yes, that&apos;s right
                                    </button>
                                  )}
                                  <button
                                    disabled={isBusy}
                                    onClick={() => setLinkingTxId(tx.id)}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                  >
                                    <Link2 size={12} /> {(tx.matchedExpense || tx.matchedTransfer) ? 'No, link a different bill' : 'Link to a bill'}
                                  </button>
                                  <button
                                    disabled={isBusy}
                                    onClick={() => setCategorizingTxId(tx.id)}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                  >
                                    <Tag size={12} /> Add as expense
                                  </button>
                                  <button
                                    disabled={isBusy}
                                    onClick={() => setLoggingTransferTxId(tx.id)}
                                    className="btn btn-ghost"
                                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                  >
                                    <PlusCircle size={12} /> Log as transfer
                                  </button>
                                  <button
                                    disabled={isBusy}
                                    onClick={() => resolveTx(tx.id, 'ignore')}
                                    className="btn btn-ghost"
                                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                  >
                                    <EyeOff size={12} /> Ignore
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleClose} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
