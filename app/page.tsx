'use client';

import { useState, useEffect, useCallback } from 'react';
import { EyeOff } from 'lucide-react';
import type { ExpenseItem, IncomeItem, CurrencyCode, PresetItem, UserProfile, AccountItem, TransferItem, GoalItem, CustomCategoryItem, BudgetItem } from '@/src/types/expense';
import { loadCurrency, saveCurrency } from '@/src/services/storage';
import { updateLiveRates } from '@/src/utils/currencies';
import { calculateSpendingSummary, calculateIncomeSummary } from '@/src/utils/calculations';
import { Navbar, SPENDING_TABS } from '@/src/components/Navbar';
import type { TabId } from '@/src/components/Navbar';
import { CategoryBreakdownChart } from '@/src/components/CategoryBreakdownChart';
import { TrendChart } from '@/src/components/TrendChart';
import { ExpenseList } from '@/src/components/ExpenseList';
import { IncomeSection } from '@/src/components/IncomeSection';
import { IncomeModal } from '@/src/components/IncomeModal';
import { AiTechSection } from '@/src/components/AiTechSection';
import { UtilitiesSection } from '@/src/components/UtilitiesSection';
import { EducationSection } from '@/src/components/EducationSection';
import { BigTicketSection } from '@/src/components/BigTicketSection';
import { InsuranceSection } from '@/src/components/InsuranceSection';
import { PlannedExpensesSection } from '@/src/components/PlannedExpensesSection';
import { UpcomingRenewals } from '@/src/components/UpcomingRenewals';
import { OptimizationInsights } from '@/src/components/OptimizationInsights';
import { MoneyFlowInsights } from '@/src/components/MoneyFlowInsights';
import { ReportsSection } from '@/src/components/ReportsSection';
import { AdminSection } from '@/src/components/AdminSection';
import { LoginScreen } from '@/src/components/LoginScreen';
import { ExpenseModal } from '@/src/components/ExpenseModal';
import { PresetsModal } from '@/src/components/PresetsModal';
import { ExportImportModal } from '@/src/components/ExportImportModal';
import { ShareWorkspaceModal } from '@/src/components/ShareWorkspaceModal';
import { ContactVendorModal } from '@/src/components/ContactVendorModal';
import { HelpGuideModal } from '@/src/components/HelpGuideModal';
import { BugLogModal } from '@/src/components/BugLogModal';
import { SettingsModal } from '@/src/components/SettingsModal';
import { OverviewDashboard } from '@/src/components/OverviewDashboard';
import { BudgetsSection } from '@/src/components/BudgetsSection';
import { AssistantBox } from '@/src/components/AssistantBox';
import { TallyLogo } from '@/src/components/TallyLogo';
import { AccountsSection } from '@/src/components/AccountsSection';
import { AccountModal } from '@/src/components/AccountModal';
import { MoneyMap } from '@/src/components/MoneyMap';
import { CustomMoneyMap } from '@/src/components/CustomMoneyMap';
import { TransfersSection } from '@/src/components/TransfersSection';
import { TransferModal } from '@/src/components/TransferModal';
import { StatementsSection } from '@/src/components/StatementsSection';
import { StatementImportModal } from '@/src/components/StatementImportModal';
import { StatementReminderBanner } from '@/src/components/StatementReminderBanner';
import { GoalsSection } from '@/src/components/GoalsSection';
import { GoalModal } from '@/src/components/GoalModal';
import { PrivacyBlurOverlay } from '@/src/components/PrivacyBlurOverlay';
import { usePrivacyBlur } from '@/src/hooks/usePrivacyBlur';
import { useSensitiveReveal } from '@/src/hooks/useSensitiveReveal';
import { useIdleLogout } from '@/src/hooks/useIdleLogout';
import { ChangelogModal } from '@/src/components/ChangelogModal';
import { ScanReceiptModal } from '@/src/components/ScanReceiptModal';

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
  const [customCategories, setCustomCategories] = useState<CustomCategoryItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [moneyMapView, setMoneyMapView] = useState<'auto' | 'custom'>('auto');

  const SPENDING_CHIPS: { id: TabId; label: string }[] = [
    { id: 'all', label: 'All spending' },
    { id: 'ai-tech', label: 'AI & tech' },
    { id: 'utilities', label: 'Utilities & bills' },
    { id: 'education', label: 'Colleges & sports' },
    { id: 'big-ticket', label: 'Mortgage & loans' },
    { id: 'insurance', label: 'Insurance & motor' },
  ];

  // Users & Auth
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isBugLogModalOpen, setIsBugLogModalOpen] = useState(false);
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
    try {
      // 1. Fetch Users
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

      // 2. Fetch Expenses from PostgreSQL
      const expRes = await fetch('/api/expenses');
      const expData = await expRes.json();
      if (expData.status === 'ok' && Array.isArray(expData.expenses)) {
        setExpenses(expData.expenses);
      }

      // 3. Fetch Income from PostgreSQL
      const incRes = await fetch('/api/income');
      const incData = await incRes.json();
      if (incData.status === 'ok' && Array.isArray(incData.incomes)) {
        setIncomes(incData.incomes);
      }

      // 4. Fetch Accounts from PostgreSQL
      const accRes = await fetch('/api/accounts');
      const accData = await accRes.json();
      if (accData.status === 'ok' && Array.isArray(accData.accounts)) {
        setAccounts(accData.accounts);
        setEncryptionConfigured(!!accData.encryptionConfigured);
      }

      // 5. Fetch Transfers from PostgreSQL
      const transRes = await fetch('/api/transfers');
      const transData = await transRes.json();
      if (transData.status === 'ok' && Array.isArray(transData.transfers)) {
        setTransfers(transData.transfers);
      }

      // 6. Fetch Goals from PostgreSQL
      const goalRes = await fetch('/api/goals');
      const goalData = await goalRes.json();
      if (goalData.status === 'ok' && Array.isArray(goalData.goals)) {
        setGoals(goalData.goals);
      }

      // 7. Fetch household-defined custom Categories
      const catRes = await fetch('/api/categories');
      const catData = await catRes.json();
      if (catData.status === 'ok' && Array.isArray(catData.categories)) {
        setCustomCategories(catData.categories);
      }

      // 8. Fetch per-category budgets
      const budgetRes = await fetch('/api/budgets');
      const budgetData = await budgetRes.json();
      if (budgetData.status === 'ok' && Array.isArray(budgetData.budgets)) {
        setBudgets(budgetData.budgets);
      }

      // 9. Refresh live currency rates (self-healing cache, falls back to
      // the hardcoded defaults in currencies.ts on any failure below).
      const rateRes = await fetch('/api/exchange-rate-cache');
      const rateData = await rateRes.json();
      if (rateData.status === 'ok' && rateData.rates) {
        updateLiveRates(rateData.rates);
      }
    } catch (err) {
      console.error('Failed to load from database:', err);
    }
  }, []);

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
    // Optimistic update
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isActive: updatedActive } : e))
    );

    try {
      await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isActive: updatedActive }),
      });
    } catch (err) {
      console.error('Failed to update status in DB:', err);
      fetchDatabaseData();
    }
  };

  // Activate a planned/pending expense — it starts counting towards totals, bills and insights
  const handleActivatePending = async (id: string) => {
    const item = expenses.find((e) => e.id === id);
    if (!item) return;

    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isPending: false, isActive: true } : e))
    );

    try {
      await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isPending: false, isActive: true }),
      });
    } catch (err) {
      console.error('Failed to activate planned expense in DB:', err);
      fetchDatabaseData();
    }
  };

  // Toggle paid/unpaid status with PostgreSQL sync
  const handleTogglePaid = async (id: string) => {
    const item = expenses.find((e) => e.id === id);
    if (!item) return;

    const updatedPaid = !item.isPaidThisCycle;
    // Optimistic update
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isPaidThisCycle: updatedPaid } : e))
    );

    try {
      await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isPaidThisCycle: updatedPaid }),
      });
    } catch (err) {
      console.error('Failed to update paid status in DB:', err);
      fetchDatabaseData();
    }
  };

  // Save new or edited expense with PostgreSQL sync
  const handleSaveExpense = async (
    expenseData: Omit<ExpenseItem, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      // Optimistic update
      setExpenses((prev) =>
        prev.map((item) =>
          item.id === existingId
            ? { ...item, ...expenseData, updatedAt: new Date().toISOString() }
            : item
        )
      );

      try {
        await fetch('/api/expenses', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...expenseData, id: existingId }),
        });
      } catch (err) {
        console.error('Failed to update expense in DB:', err);
        fetchDatabaseData();
      }
    } else {
      const tempId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const newItem: ExpenseItem = {
        ...expenseData,
        id: tempId,
        createdById: expenseData.createdById || currentUser?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Optimistic update
      setExpenses((prev) => [newItem, ...prev]);

      try {
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...expenseData, createdById: expenseData.createdById || currentUser?.id }),
        });
        const data = await res.json();
        if (data.status === 'ok' && data.expense) {
          setExpenses((prev) =>
            prev.map((e) => (e.id === tempId ? data.expense : e))
          );
          if (data.possibleDuplicate) {
            const d = data.possibleDuplicate;
            setDuplicateWarning(
              `This looks similar to an existing ${d.type} — "${d.label}" on ${d.date}. Both have been kept in case they're genuinely separate.`
            );
          }
        }
      } catch (err) {
        console.error('Failed to create expense in DB:', err);
        fetchDatabaseData();
      }
    }
  };

  // Duplicate an expense
  const handleDuplicateExpense = async (item: ExpenseItem) => {
    const duplicatedData = {
      ...item,
      name: `${item.name} (Copy)`,
      createdById: currentUser?.id,
    };

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatedData),
      });
      const data = await res.json();
      if (data.status === 'ok' && data.expense) {
        setExpenses((prev) => [data.expense, ...prev]);
      }
    } catch (err) {
      console.error('Failed to duplicate expense in DB:', err);
    }
  };

  // Delete an expense
  const handleDeleteExpense = async (id: string) => {
    const item = expenses.find((e) => e.id === id);
    if (!window.confirm(`Remove "${item?.name || 'this record'}"?`)) return;

    // Optimistic delete
    setExpenses((prev) => prev.filter((e) => e.id !== id));

    try {
      await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete expense from DB:', err);
      fetchDatabaseData();
    }
  };

  const handleCategoryCreated = (category: CustomCategoryItem) => {
    setCustomCategories((prev) => (prev.some((c) => c.id === category.id) ? prev : [...prev, category]));
  };

  const handleSaveBudget = async (category: string, monthlyLimit: number) => {
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, monthlyLimit, currency }),
      });
      const data = await res.json();
      if (data.status === 'ok' && data.budget) {
        setBudgets((prev) => {
          const existingIndex = prev.findIndex((b) => b.category === category);
          if (existingIndex === -1) return [...prev, data.budget];
          const next = [...prev];
          next[existingIndex] = data.budget;
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to save budget:', err);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    try {
      await fetch(`/api/budgets?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete budget from DB:', err);
      fetchDatabaseData();
    }
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

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presetExpense),
      });
      const data = await res.json();
      if (data.status === 'ok' && data.expense) {
        setExpenses((prev) => [data.expense, ...prev]);
      }
    } catch (err) {
      console.error('Failed to add preset to DB:', err);
    }
  };

  // Quick update amount for variable bills (electric, gas, shopping, etc.)
  const handleQuickUpdateAmount = async (expense: ExpenseItem, newAmount: number) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === expense.id ? { ...e, amount: newAmount } : e))
    );

    try {
      await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expense, amount: newAmount }),
      });
    } catch (err) {
      console.error('Failed to quick-update amount in DB:', err);
      fetchDatabaseData();
    }
  };

  // Toggle income active/paused status with PostgreSQL sync
  const handleToggleIncomeActive = async (id: string) => {
    const item = incomes.find((i) => i.id === id);
    if (!item) return;

    const updatedActive = !item.isActive;
    setIncomes((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isActive: updatedActive } : i))
    );

    try {
      await fetch('/api/income', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isActive: updatedActive }),
      });
    } catch (err) {
      console.error('Failed to update income status in DB:', err);
      fetchDatabaseData();
    }
  };

  const handleToggleIncomeReceived = async (id: string) => {
    const item = incomes.find((i) => i.id === id);
    if (!item) return;

    const updatedReceived = !item.isReceivedThisCycle;
    setIncomes((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isReceivedThisCycle: updatedReceived } : i))
    );

    try {
      await fetch('/api/income', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isReceivedThisCycle: updatedReceived }),
      });
    } catch (err) {
      console.error('Failed to update income received status in DB:', err);
      fetchDatabaseData();
    }
  };

  // Marking income received with the actual amount/date (which may differ
  // from the income's usual figure — e.g. a fluctuating salary). Unlike the
  // plain toggle above, this always refetches afterward since the server
  // creates a real linked Transfer that "this month's real total" now
  // depends on (see getIncomeMonthlyContribution in calculations.ts).
  const handleMarkIncomeReceived = async (id: string, actualAmount: number, receivedDate: string) => {
    const item = incomes.find((i) => i.id === id);
    if (!item) return;

    setIncomes((prev) => prev.map((i) => (i.id === id ? { ...i, isReceivedThisCycle: true } : i)));

    try {
      await fetch('/api/income', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isReceivedThisCycle: true, receivedAmount: actualAmount, receivedDate }),
      });
    } catch (err) {
      console.error('Failed to mark income received in DB:', err);
    } finally {
      fetchDatabaseData();
    }
  };

  // Save new or edited income with PostgreSQL sync
  const handleSaveIncome = async (
    incomeData: Omit<IncomeItem, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      setIncomes((prev) =>
        prev.map((item) =>
          item.id === existingId
            ? { ...item, ...incomeData, updatedAt: new Date().toISOString() }
            : item
        )
      );

      try {
        await fetch('/api/income', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...incomeData, id: existingId }),
        });
      } catch (err) {
        console.error('Failed to update income in DB:', err);
        fetchDatabaseData();
      }
    } else {
      const tempId = `inc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const newItem: IncomeItem = {
        ...incomeData,
        id: tempId,
        createdById: incomeData.createdById || currentUser?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setIncomes((prev) => [newItem, ...prev]);

      try {
        const res = await fetch('/api/income', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...incomeData, createdById: incomeData.createdById || currentUser?.id }),
        });
        const data = await res.json();
        if (data.status === 'ok' && data.income) {
          setIncomes((prev) =>
            prev.map((i) => (i.id === tempId ? data.income : i))
          );
        }
      } catch (err) {
        console.error('Failed to create income in DB:', err);
        fetchDatabaseData();
      }
    }
  };

  // Delete an income record
  const handleDeleteIncome = async (id: string) => {
    const item = incomes.find((i) => i.id === id);
    if (!window.confirm(`Remove "${item?.name || 'this income source'}"?`)) return;

    setIncomes((prev) => prev.filter((i) => i.id !== id));

    try {
      await fetch(`/api/income?id=${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete income from DB:', err);
      fetchDatabaseData();
    }
  };

  // Save new or edited account with PostgreSQL sync
  const handleSaveAccount = async (data: Record<string, unknown>, existingId?: string) => {
    try {
      const res = await fetch('/api/accounts', {
        method: existingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existingId ? { ...data, id: existingId } : data),
      });
      const resData = await res.json();
      if (resData.status === 'ok' && resData.account) {
        setAccounts((prev) =>
          existingId
            ? prev.map((a) => (a.id === existingId ? resData.account : a))
            : [...prev, resData.account]
        );
        fetchDatabaseData();
      }
    } catch (err) {
      console.error('Failed to save account:', err);
    }
  };

  // Delete an account
  const handleDeleteAccount = async (id: string) => {
    const item = accounts.find((a) => a.id === id);
    if (!window.confirm(`Remove "${item?.name || 'this account'}"? Linked expenses/income will be unlinked.`)) return;

    setAccounts((prev) => prev.filter((a) => a.id !== id));

    try {
      await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' });
      fetchDatabaseData();
    } catch (err) {
      console.error('Failed to delete account from DB:', err);
      fetchDatabaseData();
    }
  };

  // Save new or edited transfer with PostgreSQL sync
  const handleSaveTransfer = async (data: Record<string, unknown>, existingId?: string) => {
    try {
      const res = await fetch('/api/transfers', {
        method: existingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existingId ? { ...data, id: existingId } : data),
      });
      const resData = await res.json();
      if (resData.status === 'ok' && resData.transfer) {
        setTransfers((prev) =>
          existingId
            ? prev.map((t) => (t.id === existingId ? resData.transfer : t))
            : [resData.transfer, ...prev]
        );
        if (resData.possibleDuplicate) {
          const d = resData.possibleDuplicate;
          setDuplicateWarning(
            `This looks similar to an existing ${d.type} — "${d.label}" on ${d.date}. Both have been kept in case they're genuinely separate.`
          );
        }
        fetchDatabaseData();
      }
    } catch (err) {
      console.error('Failed to save transfer:', err);
    }
  };

  // Delete a transfer
  const handleDeleteTransfer = async (id: string) => {
    if (!window.confirm('Remove this transfer record?')) return;

    setTransfers((prev) => prev.filter((t) => t.id !== id));

    try {
      await fetch(`/api/transfers?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete transfer from DB:', err);
      fetchDatabaseData();
    }
  };

  // Save new or edited goal with PostgreSQL sync
  const handleSaveGoal = async (data: Record<string, unknown>, existingId?: string) => {
    try {
      const res = await fetch('/api/goals', {
        method: existingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existingId ? { ...data, id: existingId } : data),
      });
      const resData = await res.json();
      if (resData.status === 'ok' && resData.goal) {
        setGoals((prev) =>
          existingId
            ? prev.map((g) => (g.id === existingId ? resData.goal : g))
            : [...prev, resData.goal]
        );
        fetchDatabaseData();
      }
    } catch (err) {
      console.error('Failed to save goal:', err);
    }
  };

  // Delete a goal
  const handleDeleteGoal = async (id: string) => {
    const item = goals.find((g) => g.id === id);
    if (!window.confirm(`Remove "${item?.name || 'this goal'}"?`)) return;

    setGoals((prev) => prev.filter((g) => g.id !== id));

    try {
      await fetch(`/api/goals?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete goal from DB:', err);
      fetchDatabaseData();
    }
  };

  // Scroll to and focus the Ask Tally input
  const handleFocusAsk = () => {
    const input = document.getElementById('ask-tally-input');
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
    }
  };

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
          if (tab === 'ai-tech') setSelectedCategory('ai-tech');
          else if (tab === 'utilities') setSelectedCategory('utilities');
          else if (tab === 'education') setSelectedCategory('education');
          else if (tab === 'big-ticket') setSelectedCategory('big-ticket');
          else if (tab === 'insurance') setSelectedCategory('insurance');
          else setSelectedCategory(null);
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
        onOpenBugLog={() => setIsBugLogModalOpen(true)}
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

        {/* Ask Bar — the "Google box" for this household's spending. Only on
            Overview: every other tab is a task page that shouldn't have to
            scroll past a greeting to get to its own content. The desktop
            nav's "Ask Tally" icon button still opens the same assistant
            from anywhere. */}
        {activeTab === 'overview' && (
          <div className={`ha-ask-wrap${hasData ? '' : ' is-empty'}`} style={{ padding: hasData ? '0.5rem 0 2rem' : '3rem 0 2.5rem' }}>
            <h2 className="ha-greeting" style={{
              textAlign: 'center',
              fontFamily: 'var(--ha-font-display)',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--ha-ink)',
              marginBottom: '1.25rem',
            }}>
              {timeGreeting}, {firstName}
            </h2>
            <AssistantBox currency={currency} hasData={hasData} />
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
              if (cat === 'ai-tech') setActiveTab('ai-tech');
              else if (cat === 'utilities') setActiveTab('utilities');
              else if (cat === 'education') setActiveTab('education');
              else if (cat === 'big-ticket') setActiveTab('big-ticket');
              else if (cat === 'insurance') setActiveTab('insurance');
              else {
                setSelectedCategory(cat);
                setActiveTab('all');
              }
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

        {/* Spending Sub-Tab Chips */}
        {SPENDING_TABS.includes(activeTab) && (
          <div className="ha-page-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {SPENDING_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => {
                  setActiveTab(chip.id);
                  setSelectedCategory(chip.id === 'all' ? null : chip.id);
                }}
                className={`ha-chip${activeTab === chip.id ? ' active' : ''}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab View Routing */}
        {activeTab === 'all' && (
          <>
            {/* Category Distribution Breakdown */}
            {hasData && (
              <CategoryBreakdownChart
                expenses={liveExpenses}
                currency={currency}
                customCategories={customCategories}
              />
            )}

            {hasData && (
              <TrendChart
                currency={currency}
                metric="spending"
                title="Spending over time"
                subtitle="Built from bills marked paid and logged transfers — grows as you go"
              />
            )}

            <BudgetsSection
              expenses={liveExpenses}
              customCategories={customCategories}
              currency={currency}
              budgets={budgets}
              onSaveBudget={handleSaveBudget}
              onDeleteBudget={handleDeleteBudget}
              onCategoryCreated={handleCategoryCreated}
            />

            {/* Complete Household Ledger */}
            <ExpenseList
              expenses={liveExpenses}
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

        {activeTab === 'utilities' && (
          <UtilitiesSection
            expenses={liveExpenses}
            currency={currency}
            onEditExpense={(item) => {
              setEditingExpense(item);
              setIsAddModalOpen(true);
            }}
            onOpenAddModal={() => {
              setEditingExpense(null);
              setInitialPresetId(null);
              setInitialCategory('utilities');
              setIsAddModalOpen(true);
            }}
            onOpenAddPreset={(presetId) => {
              setEditingExpense(null);
              setInitialPresetId(presetId);
              setIsAddModalOpen(true);
            }}
          />
        )}

        {activeTab === 'big-ticket' && (
          <BigTicketSection
            expenses={liveExpenses}
            currency={currency}
            onEditExpense={(item) => {
              setEditingExpense(item);
              setIsAddModalOpen(true);
            }}
            onOpenAddModal={() => {
              setEditingExpense(null);
              setInitialPresetId(null);
              setInitialCategory('big-ticket');
              setIsAddModalOpen(true);
            }}
            onOpenAddPreset={(presetId) => {
              setEditingExpense(null);
              setInitialPresetId(presetId);
              setIsAddModalOpen(true);
            }}
          />
        )}

        {activeTab === 'insurance' && (
          <InsuranceSection
            expenses={liveExpenses}
            currency={currency}
            onEditExpense={(item) => {
              setEditingExpense(item);
              setIsAddModalOpen(true);
            }}
            onOpenAddModal={() => {
              setEditingExpense(null);
              setInitialPresetId(null);
              setInitialCategory('insurance');
              setIsAddModalOpen(true);
            }}
            onOpenAddPreset={(presetId) => {
              setEditingExpense(null);
              setInitialPresetId(presetId);
              setIsAddModalOpen(true);
            }}
          />
        )}

        {activeTab === 'education' && (
          <EducationSection
            expenses={liveExpenses}
            currency={currency}
            onEditExpense={(item) => {
              setEditingExpense(item);
              setIsAddModalOpen(true);
            }}
            onOpenAddModal={(cat) => {
              setEditingExpense(null);
              setInitialPresetId(null);
              setInitialCategory(cat || 'education');
              setIsAddModalOpen(true);
            }}
            onOpenAddPreset={(presetId) => {
              setEditingExpense(null);
              setInitialPresetId(presetId);
              setIsAddModalOpen(true);
            }}
          />
        )}

        {activeTab === 'ai-tech' && (
          <AiTechSection
            expenses={liveExpenses}
            currency={currency}
            onToggleActive={handleToggleActive}
            onEditExpense={(item) => {
              setEditingExpense(item);
              setIsAddModalOpen(true);
            }}
            onOpenAddPreset={(presetId) => {
              setEditingExpense(null);
              setInitialPresetId(presetId);
              setIsAddModalOpen(true);
            }}
            onOpenAddModal={() => {
              setEditingExpense(null);
              setInitialPresetId(null);
              setInitialCategory('ai-tech');
              setIsAddModalOpen(true);
            }}
          />
        )}

        {activeTab === 'calendar' && (
          <>
            {liveExpenses.some((e) => e.isBill !== false) && (
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

        {activeTab === 'insights' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <MoneyFlowInsights />
            <OptimizationInsights
              expenses={liveExpenses}
              currency={currency}
            />
          </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div className="ha-segmented" style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--ha-line)', padding: '2px', borderRadius: 'var(--ha-radius-sm)' }}>
                <button
                  onClick={() => setMoneyMapView('auto')}
                  className={`ha-chip${moneyMapView === 'auto' ? ' active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  Auto map
                </button>
                <button
                  onClick={() => setMoneyMapView('custom')}
                  className={`ha-chip${moneyMapView === 'custom' ? ' active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  My map
                </button>
              </div>
            </div>

            {moneyMapView === 'auto' ? (
              <MoneyMap
                incomes={incomes}
                expenses={liveExpenses}
                accounts={accounts}
                transfers={transfers}
                currency={currency}
                customCategories={customCategories}
              />
            ) : (
              <CustomMoneyMap accounts={accounts} currency={currency} />
            )}
          </div>
        )}

        {activeTab === 'flow' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <StatementsSection
              expenses={liveExpenses}
              incomes={incomes}
              accounts={accounts}
              householdCurrency={currency}
              onExpensesChanged={fetchDatabaseData}
              customCategories={customCategories}
              onCategoryCreated={handleCategoryCreated}
            />
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
          </div>
        )}

        {activeTab === 'goals' && (
          <GoalsSection
            goals={goals}
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

      {/* Quick-hide panic button — always on top, instantly blurs the screen */}
      {!isPrivacyBlurred && (
        <button
          onClick={hidePrivacyNow}
          title="Hide screen now"
          aria-label="Hide screen now"
          style={{
            position: 'fixed',
            bottom: '1.25rem',
            right: '1.25rem',
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
          setEditingExpense(mergedExpense);
          setIsAddModalOpen(true);
        }}
        onUseNew={(draft) => {
          setEditingExpense(null);
          setInitialPresetId(null);
          setInitialCategory(null);
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
          above); the Flow tab's own "Import statement" button uses its own
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

      {/* Bug Log Modal */}
      <BugLogModal
        isOpen={isBugLogModalOpen}
        onClose={() => setIsBugLogModalOpen(false)}
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
        onSignOutEverywhere={handleSignOutEverywhere}
      />
    </div>
  );
}
