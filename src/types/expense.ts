export type BuiltinExpenseCategory =
  | 'entertainment'  // Netflix, Spotify, Apple TV+, Disney+, YouTube
  | 'ai-tech'        // ChatGPT Plus, Claude Pro, Cursor, Midjourney, Copilot, Cloud
  | 'utilities'      // Electricity, Gas/Heating, Water, Broadband, Mobile
  | 'housing'        // Rent/Mortgage, Property Tax, Insurance, TV Licence
  | 'education'      // College Tuition, School Fees, Uniforms, Books, Lunches
  | 'lifestyle'      // Sports Club, Gym, Coaching, Activities, Health
  | 'shopping'       // Groceries & general shopping — one lump total, not itemized
  | 'big-ticket'     // Mortgage, car/personal loan repayments, holidays & other big purchases
  | 'insurance';     // Car/life/health insurance, motor tax, NCT & vehicle renewals

// A household-defined custom category's id is a Prisma cuid — an arbitrary
// string. The `(string & {})` branded-union trick keeps autocomplete for the
// 9 built-ins while still accepting any custom category id without a cast.
export type ExpenseCategory = BuiltinExpenseCategory | (string & {});

export interface CustomCategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  createdById?: string | null;
  createdAt?: string | Date;
}

export type IncomeCategory = 'salary' | 'freelance' | 'rental' | 'benefits' | 'other';

export type BillingCycle = 'monthly' | 'annual' | 'quarterly' | 'weekly' | 'termly' | 'once';

export type CurrencyCode = 'EUR' | 'GBP' | 'USD' | 'CAD' | 'AUD' | 'JPY';

export type UserRole = 'ADMIN' | 'MEMBER' | 'BACKUP_ADMIN';

export type AccountType =
  | 'CHECKING'
  | 'SAVINGS'
  | 'CREDIT_UNION'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'PAYPAL'
  | 'LOAN'
  | 'INVESTMENT'
  | 'OTHER';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    expenses: number;
  };
}

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  rateAgainstEUR: number;
  label: string;
}

export interface ExpenseItem {
  id: string;
  name: string;
  vendor?: string;
  amount: number;
  currency: CurrencyCode;
  billingCycle: BillingCycle;
  category: ExpenseCategory;
  icon: string;
  color: string;
  renewalDay: number;
  nextRenewalDate: string;
  isPaidThisCycle: boolean;
  lastPaidAt?: string | null;
  paymentMethod: string;
  isActive: boolean;
  isPending?: boolean;
  notes?: string;
  contractEndDate?: string;
  vendorEmail?: string;
  usageRating?: 'high' | 'medium' | 'low';
  isVariable?: boolean;
  isPreset?: boolean;
  isBill?: boolean;
  originalAmount?: number | null;
  originalCurrency?: CurrencyCode | null;
  exchangeRate?: number | null;
  rateDate?: string | null;
  reimbursementExpected?: number | null;
  reimbursementReceived?: number | null;
  reimbursementReceivedDate?: string | null;
  paymentAccountId?: string | null;
  paymentAccount?: AccountSummary | null;
  linkedGoalId?: string | null;
  linkedGoal?: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    currency: CurrencyCode;
    targetDate?: string | null;
  } | null;
  createdById?: string | null;
  createdBy?: {
    id: string;
    name: string;
    role: UserRole;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface IncomeItem {
  id: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
  frequency: BillingCycle;
  nextPayDate?: string;
  category: IncomeCategory;
  isActive: boolean;
  notes?: string;
  isReceivedThisCycle?: boolean;
  lastReceivedAt?: string | null;
  depositAccountId?: string | null;
  depositAccount?: AccountSummary | null;
  createdById?: string | null;
  createdBy?: {
    id: string;
    name: string;
    role: UserRole;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountSummary {
  id: string;
  name: string;
  type: AccountType;
  institution?: string | null;
}

export interface AccountItem {
  id: string;
  name: string;
  institution?: string | null;
  type: AccountType;
  currency: CurrencyCode;
  notes?: string | null;
  isActive: boolean;

  balance?: number | null;
  balanceAsOf?: string | null;

  hasAccountNumber: boolean;
  hasRoutingNumber: boolean;
  hasIban: boolean;
  hasBic: boolean;
  hasLoginUsername: boolean;
  hasLoginPassword: boolean;
  hasLoginUrl: boolean;
  hasSecurityNotes: boolean;

  originalAmount?: number | null;
  interestRate?: number | null;
  termMonths?: number | null;
  payoffDate?: string | null;

  createdById?: string | null;
  createdBy?: {
    id: string;
    name: string;
    role: UserRole;
  } | null;
  _count?: {
    expenses: number;
    incomes: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export type MapNodeKind = 'ACCOUNT' | 'CUSTOM';

export interface MapNodeItem {
  id: string;
  label: string;
  kind: MapNodeKind;
  color?: string | null;
  x: number;
  y: number;
  accountId?: string | null;
  account?: AccountSummary | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MapEdgeItem {
  id: string;
  label?: string | null;
  amount?: number | null;
  currency?: CurrencyCode | null;
  fromNodeId: string;
  toNodeId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransferItem {
  id: string;
  amount: number;
  currency: CurrencyCode;
  date: string;
  note?: string | null;
  externalLabel?: string | null;

  fromAccountId?: string | null;
  fromAccount?: AccountSummary | null;

  toAccountId?: string | null;
  toAccount?: AccountSummary | null;

  linkedExpenseId?: string | null;
  linkedExpense?: { id: string; name: string } | null;

  linkedIncomeId?: string | null;
  linkedIncome?: { id: string; name: string } | null;

  createdById?: string | null;
  createdBy?: {
    id: string;
    name: string;
    role: UserRole;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: CurrencyCode;
  targetDate?: string | null;
  notes?: string | null;
  isActive: boolean;

  linkedAccountId?: string | null;
  linkedAccount?: AccountSummary | null;

  createdById?: string | null;
  createdBy?: {
    id: string;
    name: string;
    role: UserRole;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export type StatementTxStatus = 'UNMATCHED' | 'MATCHED' | 'IGNORED' | 'DUPLICATE';
export type StatementTxDirection = 'DEBIT' | 'CREDIT';

export interface StatementTransactionItem {
  id: string;
  importId: string;
  date: string;
  rawDescription: string;
  normalizedDescription: string;
  amount: number;
  currency: CurrencyCode;
  direction: StatementTxDirection;
  status: StatementTxStatus;
  matchConfidence?: number | null;
  notes?: string | null;
  suggestedCategory?: ExpenseCategory | null;
  vendorName?: string | null;

  matchedExpenseId?: string | null;
  matchedExpense?: { id: string; name: string; vendor?: string | null; category: ExpenseCategory } | null;

  matchedTransferId?: string | null;
  matchedTransfer?: { id: string; externalLabel?: string | null; linkedIncome?: { id: string; name: string } | null } | null;

  createdAt?: string;
  updatedAt?: string;
}

export interface StatementImportSummary {
  id: string;
  label: string;
  fileName?: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string; role: UserRole } | null;
  accountId?: string | null;
  account?: AccountSummary | null;
  total: number;
  matched: number;
  unmatched: number;
  ignored: number;
  duplicate: number;
  openingBalance?: number | null;
  closingBalance?: number | null;
  statementPeriod?: string | null;
}

export interface IncomeSummary {
  monthlyTotal: number;
  annualTotal: number;
  activeCount: number;
}

export interface BudgetItem {
  id: string;
  category: string;
  monthlyLimit: number;
  currency: CurrencyCode;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityLabel?: string | null;
  actorId?: string | null;
  actorName: string;
  createdAt: string;
}

export interface DatabaseBackupRecord {
  id: string;
  createdById?: string;
  recordCount: number;
  notes?: string;
  isAutomatic: boolean;
  createdAt: string;
}

export interface CategoryInfo {
  id: ExpenseCategory;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export interface PresetItem {
  id: string;
  name: string;
  defaultAmount: number;
  category: ExpenseCategory;
  defaultCycle: BillingCycle;
  color: string;
  icon: string;
  description: string;
  defaultPaymentMethod: string;
  popular: boolean;
  notes?: string;
}

export type BugSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BugStatus = 'OPEN' | 'FIXED';

export interface BugReportItem {
  id: string;
  title: string;
  description?: string | null;
  area?: string | null;
  severity: BugSeverity;
  status: BugStatus;
  createdById?: string | null;
  createdBy?: {
    id: string;
    name: string;
    role: UserRole;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpendingSummary {
  monthlyTotal: number;
  annualTotal: number;
  weeklyTotal: number;
  dailyAverage: number;
  activeCount: number;
  pausedCount: number;
  pausedMonthlySavings: number;
  topCategory: {
    category: ExpenseCategory;
    name: string;
    amount: number;
    percentage: number;
  } | null;
  aiTechMonthly: number;
  utilitiesMonthly: number;
  streamingMonthly: number;
  housingMonthly: number;
  educationMonthly: number;
  lifestyleMonthly: number;
  shoppingMonthly: number;
}

export type HistoryPeriod = '1' | '3' | '6' | '12' | 'all';
export type ChartType = 'bar' | 'line' | 'pie';

export interface MonthlyHistoryPoint {
  month: string;
  label: string;
  spending: number;
  income: number;
}

export interface HistoryResponse {
  months: MonthlyHistoryPoint[];
  hasAnyHistory: boolean;
}
