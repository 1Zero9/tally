'use client';

import { useState, useEffect, useCallback } from 'react';
import { EyeOff } from 'lucide-react';
import type { ExpenseItem, IncomeItem, CurrencyCode, PresetItem, UserProfile, AccountItem, TransferItem, GoalItem, CustomCategoryItem, BudgetItem, MoneyTrailItem, ProjectRecord } from '@/src/types/expense';
import { loadCurrency, saveCurrency } from '@/src/services/storage';
import { updateLiveRates } from '@/src/utils/currencies';
import { calculateSpendingSummary, calculateIncomeSummary } from '@/src/utils/calculations';
import { formatCurrency, formatDate } from '@/src/utils/formatters';
import { Navbar } from '@/src/components/Navbar';
import type { TabId } from '@/src/components/Navbar';
import { TrendChart } from '@/src/components/TrendChart';
import { ExpenseList } from '@/src/components/ExpenseList';
import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { IncomeSection } from '@/src/components/IncomeSection';
import { IncomeModal } from '@/src/components/IncomeModal';
import { PlannedExpensesSection } from '@/src/components/PlannedExpensesSection';
import { UpcomingRenewals } from '@/src/components/UpcomingRenewals';
import { ReportsSection } from '@/src/components/ReportsSection';
import { AdminSection } from '@/src/components/AdminSection';
import { LoginScreen } from '@/src/components/LoginScreen';
import { ExpenseModal } from '@/src/components/ExpenseModal';
import { PresetsModal } from '@/src/components/PresetsModal';
import { ExportImportModal } from '@/src/components/ExportImportModal';
import { CategoryManagerModal } from '@/src/components/CategoryManagerModal';
import { ShareWorkspaceModal } from '@/src/components/ShareWorkspaceModal';
import { ContactVendorModal } from '@/src/components/ContactVendorModal';
import { HelpGuideModal } from '@/src/components/HelpGuideModal';
import { FeedbackModal } from '@/src/components/FeedbackModal';
import { SettingsModal } from '@/src/components/SettingsModal';
import { OverviewDashboard } from '@/src/components/OverviewDashboard';
import { BudgetsSection } from '@/src/components/BudgetsSection';
import { TallyAgent } from '@/src/components/tally-agent/TallyAgent';
import { TallyLogo } from '@/src/components/TallyLogo';
import { AccountsSection } from '@/src/components/AccountsSection';
import { AccountModal } from '@/src/components/AccountModal';
import { MoneyMap } from '@/src/components/MoneyMap';
import { FilesSection } from '@/src/components/FilesSection';
import { MasterLedgerModal } from '@/src/components/MasterLedgerModal';
import { uploadAttachment, base64ToBlob } from '@/src/lib/attachments';
import { TransfersSection } from '@/src/components/TransfersSection';
import { MoneyTrailsSection } from '@/src/components/MoneyTrailsSection';
import { StatementActivitySection } from '@/src/components/StatementActivitySection';
import { ProjectsSection } from '@/src/components/ProjectsSection';
import { TransferModal } from '@/src/components/TransferModal';
import { StatementsSection } from '@/src/components/StatementsSection';
import { StatementImportModal } from '@/src/components/StatementImportModal';
import { StatementReminderBanner } from '@/src/components/StatementReminderBanner';
import { ProgressSection } from '@/src/components/ProgressSection';
import { GoalModal } from '@/src/components/GoalModal';
import { PrivacyBlurOverlay } from '@/src/components/PrivacyBlurOverlay';
import { usePrivacyBlur } from '@/src/hooks/usePrivacyBlur';
import { useSensitiveReveal } from '@/src/hooks/useSensitiveReveal';
import { useIdleLogout } from '@/src/hooks/useIdleLogout';
import { ChangelogModal } from '@/src/components/ChangelogModal';
import { ScanReceiptModal } from '@/src/components/ScanReceiptModal';
import { useActionFeedback } from '@/src/hooks/useActionFeedback';
import { CheckCircle2, AlertTriangle, X as XIcon } from 'lucide-react';

export default function TallyPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = checking
  const [idleLogoutNotice, setIdleLogoutNotice] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [encryptionConfigured, setEncryptionConfigured] = useState(false);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [trails, setTrails] = useState<MoneyTrailItem[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  // Bumped after every fetchDatabaseData() — lets self-fetching sections
  // (e.g. Statement activity) know app data changed and re-pull.
  const [dataVersion, setDataVersion] = useState(0);
  const [customCategories, setCustomCategories] = useState<CustomCategoryItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { feedback, dismissFeedback, runMutation, showFeedback } = useActionFeedback();
  // True only until the very first fetchDatabaseData() completes — not on
  // every later mutation-triggered refetch — so ExpenseList can show a
  // real loading state on initial load without flashing on every save.
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [spendingAnalysisView, setSpendingAnalysisView] = useState<'history' | 'limits'>('history');

  // Users & Auth
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [isMasterLedgerOpen, setIsMasterLedgerOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [changelogVariant, setChangelogVariant] = useState<'desktop' | 'mobile'>('desktop');
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [initialPresetId, setInitialPresetId] = useState<string | null>(null);
  const [initialCategory, setInitialCategory] = useState<string | null>(null);
  const [forceIsPending, setForceIsPending] = useState(false);
  const [draftExpense, setDraftExpense] = useState<Partial<ExpenseItem> | null>(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanInitialImage, setScanInitialImage] = useState<{ dataUrl: string; base64: string; mimeType: string } | null>(null);
  // Set when the Add-expense modal was opened from a receipt scan — the
  // image is attached to the expense once it's saved (best-effort).
  const [pendingScanImage, setPendingScanImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeItem | null>(null);
  const [contactVendorExpense, setContactVendorExpense] = useState<ExpenseItem | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<TransferItem | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  const { isBlurred: isPrivacyBlurred, reveal: revealPrivacyBlur, toggle: togglePrivacyBlur, blurNow: hidePrivacyNow } = usePrivacyBlur();
  const { isRevealed: isSensitiveRevealed, reveal: revealSensitive } = useSensitiveReveal();

  // Fetch users & expenses from Prisma PostgreSQL API
  const fetchDatabaseData = useCallback(async () => {
    // 1. Fetch Users + confirm auth — this one stays blocking (a stale or
    // dead session means nothing else below can succeed either), but is
    // itself wrapped so a bare network hiccup here doesn't abandon the
    // rest of the load, matching every other resource below.
    try {
      const userRes = await fetch('/api/users');
      if (userRes.status === 401) {
        // The Edge middleware can't validate sessions (no Prisma access
        // there), so it keeps refreshing a cookie that may already be dead
        // server-side (e.g. removed from the household, or "sign out
        // everywhere" from another device). Once a real API route confirms
        // 401, drop the client's stale signed-in state immediately instead
        // of leaving it to bounce confusingly on some later action.
        try {
          localStorage.removeItem('tally_user');
        } catch {}
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        setIsAuthenticated(false);
        setCurrentUser(null);
        return;
      }
      const userData = await userRes.json();
      if (userData.status === 'ok' && Array.isArray(userData.users)) {
        setUsers(userData.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }

    // 2-9. Every other resource loads independently — one endpoint failing
    // (network error, bad JSON, a non-ok API response) must not prevent
    // the rest from loading, so each gets its own try/catch rather than
    // one shared block that aborts on the first thrown error.
    const failed: string[] = [];

    const loadResource = async (label: string, url: string, onData: (data: Record<string, unknown>) => void) => {
      try {
        const res = await fetch(url);
        const data = (await res.json()) as Record<string, unknown>;
        if (data.status === 'ok') {
          onData(data);
        } else {
          failed.push(label);
        }
      } catch (err) {
        console.error(`Failed to load ${label}:`, err);
        failed.push(label);
      }
    };

    await Promise.all([
      loadResource('expenses', '/api/expenses', (data) => {
        if (Array.isArray(data.expenses)) setExpenses(data.expenses as ExpenseItem[]);
      }),
      loadResource('income', '/api/income', (data) => {
        if (Array.isArray(data.incomes)) setIncomes(data.incomes as IncomeItem[]);
      }),
      loadResource('accounts', '/api/accounts', (data) => {
        if (Array.isArray(data.accounts)) {
          setAccounts(data.accounts as AccountItem[]);
          setEncryptionConfigured(!!data.encryptionConfigured);
        }
      }),
      loadResource('transfers', '/api/transfers', (data) => {
        if (Array.isArray(data.transfers)) setTransfers(data.transfers as TransferItem[]);
      }),
      loadResource('goals', '/api/goals', (data) => {
        if (Array.isArray(data.goals)) setGoals(data.goals as GoalItem[]);
      }),
      loadResource('trails', '/api/trails', (data) => {
        if (Array.isArray(data.trails)) setTrails(data.trails as MoneyTrailItem[]);
      }),
      loadResource('projects', '/api/projects', (data) => {
        if (Array.isArray(data.projects)) setProjects(data.projects as ProjectRecord[]);
      }),
      loadResource('categories', '/api/categories', (data) => {
        if (Array.isArray(data.categories)) setCustomCategories(data.categories as CustomCategoryItem[]);
      }),
      loadResource('budgets', '/api/budgets', (data) => {
        if (Array.isArray(data.budgets)) setBudgets(data.budgets as BudgetItem[]);
      }),
      // Self-healing exchange-rate cache — falls back to the hardcoded
      // defaults in currencies.ts, so its own failure doesn't need to be
      // surfaced in the "some data failed to load" banner below.
      loadResource('exchange rates', '/api/exchange-rate-cache', (data) => {
        if (data.rates) updateLiveRates(data.rates as Partial<Record<CurrencyCode, number>>);
      }),
    ]);

    if (failed.length > 0) {
      const visibleFailures = failed.filter((label) => label !== 'exchange rates');
      if (visibleFailures.length > 0) {
        showFeedback({
          type: 'error',
          message: `Some data failed to load: ${visibleFailures.join(', ')} — try refreshing.`,
        });
      }
    }

    setIsInitialLoading(false);
    setDataVersion((v) => v + 1);
  }, [showFeedback]);

  // Check auth on load
  useEffect(() => {
    setCurrency(loadCurrency());

    // Check localStorage first for instant display
    try {
      const savedUserStr = localStorage.getItem('tally_user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser && savedUser.id) {
          setIsAuthenticated(true);
          setCurrentUser(savedUser);
        }
      }
    } catch {}

    // Verify session with server
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 'authenticated' && data.user) {
          setIsAuthenticated(true);
          setCurrentUser(data.user);
          try {
            localStorage.setItem('tally_user', JSON.stringify(data.user));
          } catch {}
          fetchDatabaseData();
        } else {
          const hasLocal = typeof window !== 'undefined' && localStorage.getItem('tally_user');
          if (!hasLocal) {
            setIsAuthenticated(false);
          } else {
            fetchDatabaseData();
          }
        }
      })
      .catch(() => {
        const hasLocal = typeof window !== 'undefined' && localStorage.getItem('tally_user');
        if (!hasLocal) {
          setIsAuthenticated(false);
        } else {
          fetchDatabaseData();
        }
      });
  }, [fetchDatabaseData]);

  useEffect(() => {
    saveCurrency(currency);
  }, [currency]);

  // Paste (Ctrl/Cmd+V) or drag-and-drop a screenshot anywhere in the app to
  // scan a bill — skips the manual "Scan bill" button for the common case.
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadImageFile = (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] || '';
        setScanInitialImage({ dataUrl, base64, mimeType: file.type });
        setIsScanModalOpen(true);
      };
      reader.readAsDataURL(file);
    };

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            loadImageFile(file);
          }
          return;
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        e.preventDefault();
        loadImageFile(file);
      }
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [isAuthenticated]);

  const handleLoginSuccess = (user: UserProfile) => {
    try {
      localStorage.setItem('tally_user', JSON.stringify(user));
    } catch {}
    setIdleLogoutNotice(null);
    setIsAuthenticated(true);
    setCurrentUser(user);
    fetchDatabaseData();
  };

  const handleLogout = async () => {
    if (!window.confirm('Log out of Tally?')) return;
    try {
      localStorage.removeItem('tally_user');
    } catch {}
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const handleSignOutEverywhere = async () => {
    if (!window.confirm('Sign out of every device, including this one? You will need to sign in again with a fresh code.')) return;
    try {
      localStorage.removeItem('tally_user');
    } catch {}
    try {
      await fetch('/api/auth/sessions', { method: 'DELETE' });
    } catch {}
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // Signs out automatically after a long stretch of genuine inactivity
  // (no mouse/keyboard/touch/scroll input) — separate from the much shorter
  // privacy blur, and from the 30-day "remember me" session cookie.
  const handleIdleLogout = useCallback(() => {
    try {
      localStorage.removeItem('tally_user');
    } catch {}
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setIdleLogoutNotice("You were signed out after a while of inactivity. Sign in again to continue.");
    setIsAuthenticated(false);
    setCurrentUser(null);
  }, []);

  useIdleLogout(isAuthenticated === true, handleIdleLogout);

  // Planned/pending expenses stand alone and must not affect any totals, bills or insights.
  const liveExpenses = expenses.filter((e) => !e.isPending);
  const plannedExpenses = expenses.filter((e) => e.isPending);

  // Compute spend analytics summary
  const summary = calculateSpendingSummary(liveExpenses, currency, customCategories);
  const incomeSummary = calculateIncomeSummary(incomes, transfers, currency);
  const hasData = liveExpenses.length > 0 || incomes.length > 0;
  const firstName = currentUser?.name?.split(' ')[0] || 'there';
  const greetingHour = new Date().getHours();
  const timeGreeting = greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening';

  // Toggle active/pause status with PostgreSQL sync
  const handleToggleActive = async (id: string) => {
    const item = expenses.find((e) => e.id === id);
    if (!item) return;
    const updatedActive = !item.isActive;
    await runMutation(
      () => fetch('/api/expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, isActive: updatedActive }) }),
      {
        key: id,
        optimistic: () => setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, isActive: updatedActive } : e))),
        rollback: () => setExpenses((prev) => prev.map((e) => (e.id === id ? item : e))),
        errorMessage: 'Failed to update status — please try again.',
      }
    );
  };

  // Activate a planned/pending expense — it starts counting towards totals, bills and insights
  const handleActivatePending = async (id: string) => {
    const item = expenses.find((e) => e.id === id);
    if (!item) return;
    await runMutation(
      () => fetch('/api/expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, isPending: false, isActive: true }) }),
      {
        key: id,
        optimistic: () => setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, isPending: false, isActive: true } : e))),
        rollback: () => setExpenses((prev) => prev.map((e) => (e.id === id ? item : e))),
        errorMessage: 'Failed to activate planned expense — please try again.',
      }
    );
  };

  // Toggle paid/unpaid status with PostgreSQL sync
  const handleTogglePaid = async (id: string) => {
    const item = expenses.find((e) => e.id === id);
    if (!item) return;
    const updatedPaid = !item.isPaidThisCycle;
    await runMutation(
      () => fetch('/api/expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, isPaidThisCycle: updatedPaid }) }),
      {
        key: id,
        optimistic: () => setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, isPaidThisCycle: updatedPaid } : e))),
        rollback: () => setExpenses((prev) => prev.map((e) => (e.id === id ? item : e))),
        errorMessage: 'Failed to update paid status — please try again.',
      }
    );
  };

  // Save new or edited expense with PostgreSQL sync. Returns whether it
  // actually succeeded, so the modal knows whether to close or stay open.
  const handleSaveExpense = async (
    expenseData: Omit<ExpenseItem, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ): Promise<boolean> => {
    if (existingId) {
      const previous = expenses.find((item) => item.id === existingId);
      const result = await runMutation(
        () => fetch('/api/expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...expenseData, id: existingId }) }),
        {
          optimistic: () => setExpenses((prev) => prev.map((item) => (item.id === existingId ? { ...item, ...expenseData, updatedAt: new Date().toISOString() } : item))),
          rollback: () => { if (previous) setExpenses((prev) => prev.map((item) => (item.id === existingId ? previous : item))); },
          errorMessage: 'Failed to update expense — please try again.',
        }
      );
      if (result.ok && pendingScanImage) {
        const ext = pendingScanImage.mimeType.split('/')[1] || 'jpg';
        void uploadAttachment(
          base64ToBlob(pendingScanImage.base64, pendingScanImage.mimeType),
          `receipt-${new Date().toISOString().slice(0, 10)}.${ext}`,
          'expense',
          existingId,
        );
        setPendingScanImage(null);
      }
      return result.ok;
    }

    const tempId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newItem: ExpenseItem = {
      ...expenseData,
      id: tempId,
      createdById: expenseData.createdById || currentUser?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = await runMutation<{ expense: ExpenseItem; possibleDuplicate?: { type: string; label: string; date: string } }>(
      () => fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...expenseData, createdById: expenseData.createdById || currentUser?.id }) }),
      {
        optimistic: () => setExpenses((prev) => [newItem, ...prev]),
        rollback: () => setExpenses((prev) => prev.filter((e) => e.id !== tempId)),
        errorMessage: 'Failed to create expense — please try again.',
        onSuccess: (data) => {
          setExpenses((prev) => prev.map((e) => (e.id === tempId ? data.expense : e)));
          if (data.possibleDuplicate) {
            const d = data.possibleDuplicate;
            setDuplicateWarning(`This looks similar to an existing ${d.type} — "${d.label}" on ${formatDate(d.date)}. Both have been kept in case they're genuinely separate.`);
          }
          if (pendingScanImage && data.expense?.id) {
            const ext = pendingScanImage.mimeType.split('/')[1] || 'jpg';
            void uploadAttachment(
              base64ToBlob(pendingScanImage.base64, pendingScanImage.mimeType),
              `receipt-${new Date().toISOString().slice(0, 10)}.${ext}`,
              'expense',
              data.expense.id,
            );
            setPendingScanImage(null);
          }
        },
      }
    );
    return result.ok;
  };

  // Duplicate an expense
  const handleDuplicateExpense = async (item: ExpenseItem) => {
    const duplicatedData = { ...item, name: `${item.name} (Copy)`, createdById: currentUser?.id };
    await runMutation<{ expense: ExpenseItem }>(
      () => fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(duplicatedData) }),
      {
        errorMessage: 'Failed to duplicate expense — please try again.',
        onSuccess: (data) => setExpenses((prev) => [data.expense, ...prev]),
      }
    );
  };

  // Delete an expense
  const handleDeleteExpense = async (id: string) => {
    const item = expenses.find((e) => e.id === id);
    if (!item) return;
    if (!window.confirm(`Remove "${item.name || 'this record'}"?`)) return;
    await runMutation(
      () => fetch(`/api/expenses?id=${id}`, { method: 'DELETE' }),
      {
        key: id,
        optimistic: () => setExpenses((prev) => prev.filter((e) => e.id !== id)),
        rollback: () => setExpenses((prev) => [item, ...prev]),
        errorMessage: 'Failed to delete expense — please try again.',
      }
    );
  };

  const handleCategoryCreated = (category: CustomCategoryItem) => {
    setCustomCategories((prev) => (prev.some((c) => c.id === category.id) ? prev : [...prev, category]));
  };

  const handleSaveBudget = async (category: string, monthlyLimit: number) => {
    await runMutation<{ budget: BudgetItem }>(
      () => fetch('/api/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, monthlyLimit, currency }) }),
      {
        errorMessage: 'Failed to save budget — please try again.',
        onSuccess: (data) => setBudgets((prev) => {
          const existingIndex = prev.findIndex((b) => b.category === category);
          if (existingIndex === -1) return [...prev, data.budget];
          const next = [...prev];
          next[existingIndex] = data.budget;
          return next;
        }),
      }
    );
  };

  const handleDeleteBudget = async (id: string) => {
    const item = budgets.find((b) => b.id === id);
    await runMutation(
      () => fetch(`/api/budgets?id=${id}`, { method: 'DELETE' }),
      {
        key: id,
        optimistic: () => setBudgets((prev) => prev.filter((b) => b.id !== id)),
        rollback: () => { if (item) setBudgets((prev) => [...prev, item]); },
        errorMessage: 'Failed to delete budget — please try again.',
      }
    );
  };

  // Add from catalog preset
  const handleAddFromPreset = async (preset: PresetItem) => {
    const now = new Date();
    const nextRenewalDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const presetExpense = {
      name: preset.name,
      amount: preset.defaultAmount,
      currency: 'EUR' as CurrencyCode,
      billingCycle: preset.defaultCycle,
      category: preset.category,
      icon: preset.icon,
      color: preset.color,
      renewalDay: 1,
      nextRenewalDate,
      paymentMethod: preset.defaultPaymentMethod,
      isActive: true,
      notes: preset.description,
      usageRating: 'high' as const,
      createdById: currentUser?.id,
    };
    await runMutation<{ expense: ExpenseItem }>(
      () => fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(presetExpense) }),
      {
        errorMessage: `Failed to add "${preset.name}" — please try again.`,
        onSuccess: (data) => setExpenses((prev) => [data.expense, ...prev]),
      }
    );
  };

  // Quick update amount for variable bills (electric, gas, shopping, etc.)
  const handleQuickUpdateAmount = async (expense: ExpenseItem, newAmount: number) => {
    await runMutation(
      () => fetch('/api/expenses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...expense, amount: newAmount }) }),
      {
        key: expense.id,
        optimistic: () => setExpenses((prev) => prev.map((e) => (e.id === expense.id ? { ...e, amount: newAmount } : e))),
        rollback: () => setExpenses((prev) => prev.map((e) => (e.id === expense.id ? expense : e))),
        errorMessage: 'Failed to update amount — please try again.',
      }
    );
  };

  // Toggle income active/paused status with PostgreSQL sync
  const handleToggleIncomeActive = async (id: string) => {
    const item = incomes.find((i) => i.id === id);
    if (!item) return;
    const updatedActive = !item.isActive;
    await runMutation(
      () => fetch('/api/income', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, isActive: updatedActive }) }),
      {
        key: id,
        optimistic: () => setIncomes((prev) => prev.map((i) => (i.id === id ? { ...i, isActive: updatedActive } : i))),
        rollback: () => setIncomes((prev) => prev.map((i) => (i.id === id ? item : i))),
        errorMessage: 'Failed to update income status — please try again.',
      }
    );
  };

  const handleToggleIncomeReceived = async (id: string) => {
    const item = incomes.find((i) => i.id === id);
    if (!item) return;
    const updatedReceived = !item.isReceivedThisCycle;
    await runMutation(
      () => fetch('/api/income', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, isReceivedThisCycle: updatedReceived }) }),
      {
        key: id,
        optimistic: () => setIncomes((prev) => prev.map((i) => (i.id === id ? { ...i, isReceivedThisCycle: updatedReceived } : i))),
        rollback: () => setIncomes((prev) => prev.map((i) => (i.id === id ? item : i))),
        errorMessage: 'Failed to update income received status — please try again.',
      }
    );
  };

  // Marking income received with the actual amount/date (which may differ
  // from the income's usual figure — e.g. a fluctuating salary). Unlike the
  // plain toggle above, this always refetches on success since the server
  // creates a real linked Transfer that "this month's real total" now
  // depends on (see getIncomeMonthlyContribution in calculations.ts).
  const handleMarkIncomeReceived = async (id: string, actualAmount: number, receivedDate: string) => {
    const item = incomes.find((i) => i.id === id);
    if (!item) return;
    await runMutation(
      () => fetch('/api/income', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, isReceivedThisCycle: true, receivedAmount: actualAmount, receivedDate }) }),
      {
        key: id,
        optimistic: () => setIncomes((prev) => prev.map((i) => (i.id === id ? { ...i, isReceivedThisCycle: true } : i))),
        rollback: () => setIncomes((prev) => prev.map((i) => (i.id === id ? item : i))),
        errorMessage: 'Failed to mark income received — please try again.',
        onSuccess: () => fetchDatabaseData(),
      }
    );
  };

  // Save new or edited income with PostgreSQL sync. Returns whether it
  // actually succeeded, so the modal knows whether to close or stay open.
  const handleSaveIncome = async (
    incomeData: Omit<IncomeItem, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ): Promise<boolean> => {
    if (existingId) {
      const previous = incomes.find((item) => item.id === existingId);
      const result = await runMutation(
        () => fetch('/api/income', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...incomeData, id: existingId }) }),
        {
          optimistic: () => setIncomes((prev) => prev.map((item) => (item.id === existingId ? { ...item, ...incomeData, updatedAt: new Date().toISOString() } : item))),
          rollback: () => { if (previous) setIncomes((prev) => prev.map((item) => (item.id === existingId ? previous : item))); },
          errorMessage: 'Failed to update income — please try again.',
        }
      );
      return result.ok;
    }

    const tempId = `inc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newItem: IncomeItem = {
      ...incomeData,
      id: tempId,
      createdById: incomeData.createdById || currentUser?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = await runMutation<{ income: IncomeItem }>(
      () => fetch('/api/income', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...incomeData, createdById: incomeData.createdById || currentUser?.id }) }),
      {
        optimistic: () => setIncomes((prev) => [newItem, ...prev]),
        rollback: () => setIncomes((prev) => prev.filter((i) => i.id !== tempId)),
        errorMessage: 'Failed to create income — please try again.',
        onSuccess: (data) => setIncomes((prev) => prev.map((i) => (i.id === tempId ? data.income : i))),
      }
    );
    return result.ok;
  };

  // Delete an income record
  const handleDeleteIncome = async (id: string) => {
    const item = incomes.find((i) => i.id === id);
    if (!item) return;
    if (!window.confirm(`Remove "${item.name || 'this income source'}"?`)) return;
    await runMutation(
      () => fetch(`/api/income?id=${id}`, { method: 'DELETE' }),
      {
        key: id,
        optimistic: () => setIncomes((prev) => prev.filter((i) => i.id !== id)),
        rollback: () => setIncomes((prev) => [item, ...prev]),
        errorMessage: 'Failed to delete income — please try again.',
      }
    );
  };

  // Save new or edited account with PostgreSQL sync. Returns whether it
  // actually succeeded, so the modal knows whether to close or stay open.
  const handleSaveAccount = async (data: Record<string, unknown>, existingId?: string): Promise<boolean> => {
    const result = await runMutation<{ account: AccountItem }>(
      () => fetch('/api/accounts', { method: existingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(existingId ? { ...data, id: existingId } : data) }),
      {
        errorMessage: existingId ? 'Failed to update account — please try again.' : 'Failed to create account — please try again.',
        onSuccess: (resData) => {
          setAccounts((prev) => (existingId ? prev.map((a) => (a.id === existingId ? resData.account : a)) : [...prev, resData.account]));
          fetchDatabaseData();
        },
      }
    );
    return result.ok;
  };

  // Delete an account
  const handleDeleteAccount = async (id: string) => {
    const item = accounts.find((a) => a.id === id);
    if (!item) return;
    if (!window.confirm(`Remove "${item.name || 'this account'}"? Linked expenses/income will be unlinked.`)) return;
    await runMutation(
      () => fetch(`/api/accounts?id=${id}`, { method: 'DELETE' }),
      {
        key: id,
        optimistic: () => setAccounts((prev) => prev.filter((a) => a.id !== id)),
        rollback: () => setAccounts((prev) => [...prev, item]),
        errorMessage: 'Failed to delete account — please try again.',
        onSuccess: () => fetchDatabaseData(), // other entities' local state may reference the now-deleted account
      }
    );
  };

  // Save new or edited transfer with PostgreSQL sync. Returns whether it
  // actually succeeded, so the modal knows whether to close or stay open.
  const handleSaveTransfer = async (data: Record<string, unknown>, existingId?: string): Promise<boolean> => {
    const result = await runMutation<{ transfer: TransferItem; possibleDuplicate?: { type: string; label: string; date: string } }>(
      () => fetch('/api/transfers', { method: existingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(existingId ? { ...data, id: existingId } : data) }),
      {
        errorMessage: existingId ? 'Failed to update transfer — please try again.' : 'Failed to create transfer — please try again.',
        onSuccess: (resData) => {
          setTransfers((prev) => (existingId ? prev.map((t) => (t.id === existingId ? resData.transfer : t)) : [resData.transfer, ...prev]));
          if (resData.possibleDuplicate) {
            const d = resData.possibleDuplicate;
            setDuplicateWarning(`This looks similar to an existing ${d.type} — "${d.label}" on ${formatDate(d.date)}. Both have been kept in case they're genuinely separate.`);
          }
          fetchDatabaseData();
        },
      }
    );
    return result.ok;
  };

  // Delete a transfer
  const handleDeleteTransfer = async (id: string) => {
    const item = transfers.find((t) => t.id === id);
    if (!window.confirm('Remove this transfer record?')) return;
    await runMutation(
      () => fetch(`/api/transfers?id=${id}`, { method: 'DELETE' }),
      {
        key: id,
        optimistic: () => setTransfers((prev) => prev.filter((t) => t.id !== id)),
        rollback: () => { if (item) setTransfers((prev) => [item, ...prev]); },
        errorMessage: 'Failed to delete transfer — please try again.',
      }
    );
  };

  // Save new or edited goal with PostgreSQL sync. Returns whether it
  // actually succeeded, so the modal knows whether to close or stay open.
  const handleSaveGoal = async (data: Record<string, unknown>, existingId?: string): Promise<boolean> => {
    const result = await runMutation<{ goal: GoalItem }>(
      () => fetch('/api/goals', { method: existingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(existingId ? { ...data, id: existingId } : data) }),
      {
        errorMessage: existingId ? 'Failed to update goal — please try again.' : 'Failed to create goal — please try again.',
        onSuccess: (resData) => {
          setGoals((prev) => (existingId ? prev.map((g) => (g.id === existingId ? resData.goal : g)) : [...prev, resData.goal]));
          fetchDatabaseData();
        },
      }
    );
    return result.ok;
  };

  // Delete a goal
  const handleDeleteGoal = async (id: string) => {
    const item = goals.find((g) => g.id === id);
    if (!item) return;
    if (!window.confirm(`Remove "${item.name || 'this goal'}"?`)) return;
    await runMutation(
      () => fetch(`/api/goals?id=${id}`, { method: 'DELETE' }),
      {
        key: id,
        optimistic: () => setGoals((prev) => prev.filter((g) => g.id !== id)),
        rollback: () => setGoals((prev) => [...prev, item]),
        errorMessage: 'Failed to delete goal — please try again.',
      }
    );
  };

  // The top-bar "Ask Tally" shortcut opens the floating Tally Agent panel —
  // available from any tab, unlike the Overview-only Ask box.
  const handleFocusAsk = () => setIsAgentOpen(true);

  // Show loading spinner while checking auth
  if (isAuthenticated === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--ha-paper)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ margin: '0 auto 0.75rem', display: 'flex', justifyContent: 'center' }}>
            <TallyLogo size={36} />
          </div>
          <p style={{ color: 'var(--ha-muted)', fontSize: '0.85rem' }}>Loading Tally...</p>
        </div>
      </div>
    );
  }

  // If unauthenticated, show Logon Screen
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} notice={idleLogoutNotice} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Sticky Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'all') setSelectedCategory(null);
        }}
        onOpenAddModal={() => {
          setEditingExpense(null);
          setInitialPresetId(null);
          setInitialCategory(null);
          setIsAddModalOpen(true);
        }}
        onOpenScanModal={() => {
          setScanInitialImage(null);
          setIsScanModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        onFocusAsk={handleFocusAsk}
        onLogout={handleLogout}
        currentUser={currentUser}
        isPrivacyBlurred={isPrivacyBlurred}
        onTogglePrivacyBlur={togglePrivacyBlur}
        onOpenChangelog={(variant) => { setChangelogVariant(variant ?? 'desktop'); setIsChangelogModalOpen(true); }}
      />

      <PrivacyBlurOverlay
        isBlurred={isPrivacyBlurred}
        onReveal={revealPrivacyBlur}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
      {/* Main Container Content */}
      <main className="ha-main" style={{
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: '1.75rem 1.5rem',
        flex: 1,
      }}>
        {duplicateWarning && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: 'var(--ha-radius-sm)',
            backgroundColor: '#fdf2e3',
            border: '1px solid #f6dfb8',
            color: '#7C4A0B',
            fontSize: '0.85rem',
          }}>
            <span>{duplicateWarning}</span>
            <button onClick={() => setDuplicateWarning(null)} className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', color: '#7C4A0B', flexShrink: 0 }}>
              Dismiss
            </button>
          </div>
        )}

        {/* Overview greeting. Questions about spending or how to use Tally
            go through the floating Tally Agent (bottom-right on every
            screen, and the "Ask Tally" button in the top bar). */}
        {activeTab === 'overview' && (
          <div style={{ padding: hasData ? '0.5rem 0 1.5rem' : '2.5rem 0 2rem' }}>
            <h2 className="ha-greeting" style={{
              textAlign: 'center',
              fontFamily: 'var(--ha-font-display)',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--ha-ink)',
            }}>
              {timeGreeting}, {firstName}
            </h2>
          </div>
        )}

        {/* Always visible on the home page, even with zero data yet — this
            is a primary entry point (statement import), not just a
            once-a-month nag once there's already an established ledger. */}
        {activeTab === 'overview' && (
          <StatementReminderBanner onOpenStatements={() => setIsStatementModalOpen(true)} />
        )}

        {/* Overview Dashboard */}
        {activeTab === 'overview' && hasData && (
          <OverviewDashboard
            expenses={liveExpenses}
            summary={summary}
            incomeSummary={incomeSummary}
            currency={currency}
            accounts={accounts}
            customCategories={customCategories}
            onEditExpense={(item) => {
              setEditingExpense(item);
              setInitialCategory(null);
              setInitialPresetId(null);
              setIsAddModalOpen(true);
            }}
            onFilterCategory={(cat) => {
              setSelectedCategory(cat);
              setActiveTab('all');
            }}
            onOpenAddIncome={() => {
              setEditingIncome(null);
              setIsIncomeModalOpen(true);
            }}
            onViewAllSpending={() => {
              setSelectedCategory(null);
              setActiveTab('all');
            }}
            onViewAllBills={() => setActiveTab('calendar')}
            plannedExpenses={plannedExpenses}
            onViewPlanned={() => setActiveTab('planned')}
            isSensitiveRevealed={isSensitiveRevealed}
            onRevealSensitive={revealSensitive}
            onViewAccounts={() => setActiveTab('accounts')}
          />
        )}

        {/* Tab View Routing */}
        {activeTab === 'all' && (
          <>
            <div className="ha-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <span className="ha-badge ha-badge-blue">Household costs</span>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1, marginTop: '0.55rem' }}>Spending</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', marginTop: '0.25rem' }}>Your recurring bills and one-off expenses.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--ha-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Monthly committed</div>
                    <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 750, color: 'var(--ha-ink)' }}>{formatCurrency(summary.monthlyTotal, currency)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>{summary.activeCount} active expense{summary.activeCount === 1 ? '' : 's'}</div>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setEditingExpense(null);
                      setInitialPresetId(null);
                      setInitialCategory(null);
                      setIsAddModalOpen(true);
                    }}
                  >
                    Add expense
                  </button>
                </div>
              </div>
            </div>

            {/* The expense list is the primary working surface. Filter it by
                category with the picker in its own toolbar. */}
            <CollapsibleSection
              id="spending-expenses"
              title={`Expenses (${liveExpenses.length})`}
              defaultOpen
              className="ha-card"
              style={{ marginBottom: '2.5rem' }}
            >
              <ExpenseList
                bare
                expenses={liveExpenses}
                isLoading={isInitialLoading}
                currency={currency}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                customCategories={customCategories}
                onToggleActive={handleToggleActive}
                onTogglePaid={handleTogglePaid}
                onEditExpense={(item) => {
                  setEditingExpense(item);
                  setInitialCategory(null);
                  setInitialPresetId(null);
                  setIsAddModalOpen(true);
                }}
                onDuplicateExpense={handleDuplicateExpense}
                onDeleteExpense={handleDeleteExpense}
                onOpenAddModal={() => {
                  setEditingExpense(null);
                  setInitialPresetId(null);
                  setInitialCategory(null);
                  setIsAddModalOpen(true);
                }}
                onOpenPresetsModal={() => setIsPresetsModalOpen(true)}
                onQuickUpdateAmount={handleQuickUpdateAmount}
                onContactVendor={(item) => setContactVendorExpense(item)}
              />
            </CollapsibleSection>

            <section className="ha-card" style={{ padding: '1.5rem', marginBottom: '2.5rem' }} aria-labelledby="spending-analysis-heading">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <div>
                  <h2 id="spending-analysis-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ha-ink)' }}>Understand your spending</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '0.2rem' }}>Spending over time and category limits. For the full breakdown of committed spend by category, see Reports → Committed.</p>
                </div>
                <div className="ha-page-tabs" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto' }} role="tablist" aria-label="Spending analysis">
                  {([
                    ['history', 'Over time'],
                    ['limits', 'Category limits'],
                  ] as const).map(([id, label]) => (
                    <button key={id} className={`ha-chip${spendingAnalysisView === id ? ' active' : ''}`} onClick={() => setSpendingAnalysisView(id)} role="tab" aria-selected={spendingAnalysisView === id}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {spendingAnalysisView === 'history' && (
                hasData
                  ? <TrendChart currency={currency} metric="spending" title="Spending over time" subtitle="Built from bills marked paid and logged transfers — grows as you go" bare />
                  : <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)' }}>Spending history will appear after you begin recording payments.</p>
              )}
              {spendingAnalysisView === 'limits' && (
                <BudgetsSection expenses={liveExpenses} customCategories={customCategories} currency={currency} budgets={budgets} onSaveBudget={handleSaveBudget} onDeleteBudget={handleDeleteBudget} onCategoryCreated={handleCategoryCreated} bare />
              )}
            </section>
          </>
        )}

        {activeTab === 'income' && (
          <>
            {incomes.length > 0 && (
              <TrendChart
                currency={currency}
                metric="income"
                title="Income over time"
                subtitle="Built from income marked received and logged transfers — grows as you go"
              />
            )}
            <IncomeSection
              incomes={incomes}
              currency={currency}
              onToggleActive={handleToggleIncomeActive}
              onToggleReceived={handleToggleIncomeReceived}
              onMarkReceived={handleMarkIncomeReceived}
              onEditIncome={(item) => {
                setEditingIncome(item);
                setIsIncomeModalOpen(true);
              }}
              onDeleteIncome={handleDeleteIncome}
              onOpenAddModal={() => {
                setEditingIncome(null);
                setIsIncomeModalOpen(true);
              }}
              isSensitiveRevealed={isSensitiveRevealed}
              onRevealSensitive={revealSensitive}
            />
          </>
        )}

        {activeTab === 'calendar' && (
          <>
            {liveExpenses.some((e) => e.isBill !== false && e.billingCycle !== 'once') && (
              <TrendChart
                currency={currency}
                metric="spending"
                title="Bills paid over time"
                subtitle="Only counts recurring bills & contracts marked paid — not one-off spending"
                billsOnly
              />
            )}
            <UpcomingRenewals
              expenses={liveExpenses}
              currency={currency}
              onEditExpense={(item) => {
                setEditingExpense(item);
                setIsAddModalOpen(true);
              }}
            />
          </>
        )}

        {activeTab === 'reports' && (
          <ReportsSection
            currency={currency}
            expenses={liveExpenses}
            customCategories={customCategories}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsSection
            accounts={accounts}
            transfers={transfers}
            currency={currency}
            encryptionConfigured={encryptionConfigured}
            onEditAccount={(item) => {
              setEditingAccount(item);
              setIsAccountModalOpen(true);
            }}
            onDeleteAccount={handleDeleteAccount}
            onOpenAddModal={() => {
              setEditingAccount(null);
              setIsAccountModalOpen(true);
            }}
          />
        )}

        {activeTab === 'moneymap' && (
          <MoneyMap
            incomes={incomes}
            expenses={liveExpenses}
            accounts={accounts}
            transfers={transfers}
            currency={currency}
            customCategories={customCategories}
          />
        )}

        {activeTab === 'files' && <FilesSection onNavigate={setActiveTab} />}

        {activeTab === 'flow' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div className="ha-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span className="ha-badge ha-badge-blue">Money activity</span>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1, marginTop: '0.55rem' }}>
                    Transactions
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '650px', marginTop: '0.25rem' }}>
                    Import statements, review what Tally logged, and record money moving into, out of, or between your accounts.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setIsMasterLedgerOpen(true)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    Household ledger
                  </button>
                  <button
                    onClick={() => {
                      setEditingTransfer(null);
                      setIsTransferModalOpen(true);
                    }}
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    Log transfer
                  </button>
                </div>
              </div>
              <div className="ha-page-tabs" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.25rem' }} aria-label="Transaction sections">
                {[
                  ['statement-imports', 'Statements'],
                  ['statement-activity', 'Statement activity'],
                  ['transaction-ledger', 'Transactions'],
                  ['money-trails', 'Money trails'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className="ha-chip"
                    onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <StatementsSection
              expenses={liveExpenses}
              incomes={incomes}
              accounts={accounts}
              householdCurrency={currency}
              onExpensesChanged={fetchDatabaseData}
              customCategories={customCategories}
              onCategoryCreated={handleCategoryCreated}
              members={users}
            />
            <StatementActivitySection reloadSignal={dataVersion} onChanged={fetchDatabaseData} />
            <TransfersSection
              transfers={transfers}
              onEditTransfer={(item) => {
                setEditingTransfer(item);
                setIsTransferModalOpen(true);
              }}
              onDeleteTransfer={handleDeleteTransfer}
              onOpenAddModal={() => {
                setEditingTransfer(null);
                setIsTransferModalOpen(true);
              }}
            />
            <MoneyTrailsSection
              trails={trails}
              transfers={transfers}
              currency={currency}
              onChanged={fetchDatabaseData}
            />
          </div>
        )}

        {activeTab === 'goals' && (
          <ProgressSection
            goals={goals}
            expenses={expenses}
            accounts={accounts}
            transfers={transfers}
            currency={currency}
            onEditGoal={(item) => {
              setEditingGoal(item);
              setIsGoalModalOpen(true);
            }}
            onDeleteGoal={handleDeleteGoal}
            onOpenAddModal={() => {
              setEditingGoal(null);
              setIsGoalModalOpen(true);
            }}
          />
        )}

        {activeTab === 'planned' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <PlannedExpensesSection
              expenses={expenses}
              currency={currency}
              customCategories={customCategories}
              onEditExpense={(item) => {
                setEditingExpense(item);
                setInitialCategory(null);
                setInitialPresetId(null);
                setIsAddModalOpen(true);
              }}
              onOpenAddModal={() => {
                setEditingExpense(null);
                setInitialPresetId(null);
                setInitialCategory(null);
                setIsAddModalOpen(true);
                setForceIsPending(true);
              }}
              onActivate={handleActivatePending}
            />
            <ProjectsSection
              projects={projects}
              expenses={expenses}
              transfers={transfers}
              currency={currency}
              onChanged={fetchDatabaseData}
            />
          </div>
        )}

        {activeTab === 'admin' && (
          <AdminSection
            users={users}
            currentUser={currentUser}
            onRefreshUsers={fetchDatabaseData}
            onOpenAddModalWithCategory={(cat) => {
              setEditingExpense(null);
              setInitialPresetId(null);
              setInitialCategory(cat);
              setIsAddModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Editorial Footer */}
      <footer style={{
        borderTop: '1px solid var(--ha-line)',
        backgroundColor: 'var(--ha-paper)',
        padding: '1.25rem 1.5rem',
        color: 'var(--ha-muted)',
        fontSize: '0.8rem',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            Tally — Your household, in balance.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="/privacy" style={{ color: 'var(--ha-muted)' }}>Privacy</a>
            <a href="/terms" style={{ color: 'var(--ha-muted)' }}>Terms</a>
            <a href="/ai-transparency" style={{ color: 'var(--ha-muted)' }}>AI Transparency</a>
            <span>
              Authenticated as <strong>{currentUser?.name || 'Stephen'}</strong> ({currentUser?.role || 'ADMIN'})
            </span>
          </div>
        </div>
      </footer>
      </PrivacyBlurOverlay>

      {/* Save feedback toast — success briefly, error until dismissed */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '1.25rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.7rem 1rem',
            borderRadius: 'var(--ha-radius-sm)',
            boxShadow: 'var(--ha-shadow-elevated)',
            maxWidth: 'min(90vw, 420px)',
            backgroundColor: feedback.type === 'success' ? 'var(--ha-blue-light)' : 'var(--ha-red-tint)',
            color: feedback.type === 'success' ? 'var(--ha-blue)' : 'var(--ha-red)',
            border: `1px solid ${feedback.type === 'success' ? 'var(--ha-blue)' : 'var(--ha-red)'}`,
            fontSize: '0.85rem',
          }}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          ) : (
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          )}
          <span style={{ flex: 1 }}>{feedback.message}</span>
          <button
            onClick={dismissFeedback}
            title="Dismiss"
            aria-label="Dismiss"
            className="ha-icon-btn"
            style={{ color: 'inherit', flexShrink: 0 }}
          >
            <XIcon size={16} />
          </button>
        </div>
      )}

      {/* Quick-hide panic button — always on top, instantly blurs the screen.
          Sits bottom-LEFT so it never collides with the Tally Agent launcher
          in the bottom-right corner. */}
      {!isPrivacyBlurred && (
        <button
          onClick={hidePrivacyNow}
          title="Hide screen now"
          aria-label="Hide screen now"
          style={{
            position: 'fixed',
            bottom: '1.25rem',
            left: '1.25rem',
            zIndex: 100,
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--ha-ink)',
            color: 'var(--ha-white)',
            border: 'none',
            boxShadow: 'var(--ha-shadow-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <EyeOff size={20} />
        </button>
      )}

      {/* Tally Agent — floating assistant, available from every tab and
          kept visible above the privacy screen. */}
      <TallyAgent
        open={isAgentOpen}
        onOpenChange={setIsAgentOpen}
        firstName={firstName}
        activeTab={activeTab}
        onNavigate={setActiveTab}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        blurred={isPrivacyBlurred}
      />

      {/* Household master ledger */}
      <MasterLedgerModal
        isOpen={isMasterLedgerOpen}
        onClose={() => setIsMasterLedgerOpen(false)}
        accounts={accounts}
        transfers={transfers}
        currency={currency}
      />

      {/* Changelog / What's New Modal */}
      <ChangelogModal
        isOpen={isChangelogModalOpen}
        onClose={() => setIsChangelogModalOpen(false)}
        variant={changelogVariant}
      />

      {/* Add / Edit Expense Modal */}
      <ExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingExpense(null);
          setInitialPresetId(null);
          setInitialCategory(null);
          setDraftExpense(null);
          setForceIsPending(false);
          setPendingScanImage(null);
        }}
        onSave={handleSaveExpense}
        editingExpense={editingExpense}
        initialPresetId={initialPresetId}
        initialCategory={initialCategory}
        initialIsPending={forceIsPending}
        draftExpense={draftExpense}
        users={users}
        currentUserId={currentUser?.id}
        accounts={accounts}
        goals={goals}
        customCategories={customCategories}
        onCategoryCreated={handleCategoryCreated}
      />

      {/* Scan a bill screenshot */}
      <ScanReceiptModal
        isOpen={isScanModalOpen}
        onClose={() => {
          setIsScanModalOpen(false);
          setScanInitialImage(null);
        }}
        initialImage={scanInitialImage}
        householdCurrency={currency}
        onUseMatch={(mergedExpense) => {
          setDraftExpense(null);
          setInitialPresetId(null);
          setInitialCategory(null);
          if (scanInitialImage) setPendingScanImage({ base64: scanInitialImage.base64, mimeType: scanInitialImage.mimeType });
          setEditingExpense(mergedExpense);
          setIsAddModalOpen(true);
        }}
        onUseNew={(draft) => {
          setEditingExpense(null);
          setInitialPresetId(null);
          setInitialCategory(null);
          if (scanInitialImage) setPendingScanImage({ base64: scanInitialImage.base64, mimeType: scanInitialImage.mimeType });
          setDraftExpense(draft);
          setIsAddModalOpen(true);
        }}
      />

      {/* Add / Edit Income Modal */}
      <IncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => {
          setIsIncomeModalOpen(false);
          setEditingIncome(null);
        }}
        onSave={handleSaveIncome}
        editingIncome={editingIncome}
        users={users}
        currentUserId={currentUser?.id}
        accounts={accounts}
      />

      {/* Add / Edit Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setEditingAccount(null);
        }}
        onSave={handleSaveAccount}
        editingAccount={editingAccount}
        encryptionConfigured={encryptionConfigured}
      />

      {/* Add / Edit Transfer Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setEditingTransfer(null);
        }}
        onSave={handleSaveTransfer}
        editingTransfer={editingTransfer}
        accounts={accounts}
        expenses={expenses}
        incomes={incomes}
      />

      {/* Add / Edit Goal Modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={handleSaveGoal}
        editingGoal={editingGoal}
        accounts={accounts}
      />

      {/* Import a statement — the home-page entry point (StatementReminderBanner
          above); the Transactions tab's own "Import statement" button uses its own
          separate instance inside StatementsSection. */}
      <StatementImportModal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        expenses={liveExpenses}
        incomes={incomes}
        accounts={accounts}
        householdCurrency={currency}
        onImported={fetchDatabaseData}
        onExpensesChanged={fetchDatabaseData}
        customCategories={customCategories}
        onCategoryCreated={handleCategoryCreated}
        members={users}
      />

      {/* Popular Presets Modal */}
      <PresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        expenses={expenses}
        onAddFromPreset={handleAddFromPreset}
      />

      {/* Export / Backup Modal */}
      <ExportImportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        expenses={expenses}
        customCategories={customCategories}
      />

      {/* Share Workspace Modal */}
      <ShareWorkspaceModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        currentUser={currentUser}
        onMembersUpdated={fetchDatabaseData}
      />

      {/* Contact Vendor Modal */}
      <ContactVendorModal
        expense={contactVendorExpense}
        onClose={() => setContactVendorExpense(null)}
      />

      {/* Help Guide Modal */}

      <HelpGuideModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        currentUser={currentUser}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />

      {/* Settings & Preferences Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        onOpenPresetsModal={() => setIsPresetsModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
        onSignOutEverywhere={handleSignOutEverywhere}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categoryRows={customCategories}
        expenses={expenses}
        onChanged={fetchDatabaseData}
      />
    </div>
  );
}
