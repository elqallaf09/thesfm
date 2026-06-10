// Auto-extracted types for projects/[id]/page

export type Lang = 'ar' | 'en' | 'fr';
export type TabId = 'overview' | 'feasibility' | 'financial' | 'tasks' | 'documents' | 'kpis' | 'ai' | 'pitchDeck';
export type RiskLevel = 'low' | 'medium' | 'high';
export type FeasibilitySection = 'market' | 'technical' | 'financial' | 'legal';
export type FeasibilityStatus = 'feasible' | 'needs_review' | 'high_risk';

export type ProjectRow = {
  id: string;
  user_id: string;
  name: string | null;
  emoji?: string | null;
  budget?: string | number | null;
  timeline?: string | null;
  duration_unit?: string | null;
  steps?: unknown;
  notes?: Record<string, any> | string | null;
  created_at?: string | null;
};

export type SavingsRow = { amount?: string | number | null };

export type FeasibilityForm = {
  market: Record<string, string>;
  technical: Record<string, string>;
  financial: Record<string, string>;
  legal: Record<string, string>;
};

export type FeasibilityStudyRow = {
  id: string;
  market_data: Record<string, string> | null;
  technical_data: Record<string, string> | null;
  financial_data: Record<string, string> | null;
  legal_data: Record<string, string> | null;
  feasibility_score: number | null;
  feasibility_status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProjectExpenseRow = {
  id: string;
  user_id?: string | null;
  project_id?: string | null;
  title: string | null;
  amount: number | string | null;
  currency: string | null;
  expense_date: string | null;
  category: string | null;
  payment_method: string | null;
  notes: string | null;
  receipt_url?: string | null;
  ai_analysis?: ProjectExpenseAiAnalysis | null;
  paid_from_personal_budget?: boolean | null;
  personal_expense_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProjectExpenseForm = {
  title: string;
  amount: string;
  currency: string;
  expenseDate: string;
  category: string;
  paymentMethod: string;
  notes: string;
  receiptFile: File | null;
  paidFromPersonalBudget: boolean;
};

export type ProjectExpenseReceiptAnalysis = {
  extracted: {
    title?: string | null;
    vendorName?: string | null;
    amount?: number | null;
    currency?: string | null;
    invoiceDate?: string | null;
    category?: string | null;
    notes?: string | null;
  };
  confidence?: {
    invoiceNumber?: number;
    amount?: number;
    currency?: number;
    invoiceDate?: number;
  };
  warnings?: string[];
  summary?: string | null;
};

export type ProjectExpenseAiAnalysis = {
  source?: 'ai' | 'rules';
  summary?: string;
  necessity?: string;
  category?: string;
  budgetImpact?: string;
  amountLevel?: 'low' | 'normal' | 'high' | 'unknown';
  fundingReadinessImpact?: string;
  suggestedAction?: 'approve' | 'review' | 'reduce' | 'move_category' | 'attach_document';
  warnings?: string[];
  budget?: {
    plannedBudget?: number | null;
    existingExpenses?: number;
    expenseAmount?: number;
    remainingAfterExpense?: number | null;
    percentageUsed?: number | null;
    categoryWarning?: string | null;
  };
};

export type ProjectIncomeRow = {
  id: string;
  user_id?: string | null;
  project_id?: string | null;
  title: string | null;
  amount: number | string | null;
  currency: string | null;
  income_date: string | null;
  category: string | null;
  source: string | null;
  description: string | null;
  notes: string | null;
  transferred_to_personal_income?: boolean | null;
  personal_income_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProjectIncomeForm = {
  title: string;
  amount: string;
  currency: string;
  incomeDate: string;
  category: string;
  source: string;
  description: string;
  notes: string;
  transferredToPersonalIncome: boolean;
};

export type MoneyFormatter = (value: number, currency?: string | null) => string;
export type CurrencyAmountRow = {
  amount: number | string | null;
  currency?: string | null;
};

export type DeleteTarget =
  | { type: 'income'; row: ProjectIncomeRow }
  | { type: 'expense'; row: ProjectExpenseRow };

