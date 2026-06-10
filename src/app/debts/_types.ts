// Types for debts/page
export type Lang = 'ar' | 'en' | 'fr';
export type DebtStatus = 'active' | 'paid' | 'paused';
export type InterestType = 'none' | 'annual' | 'monthly';

export type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  creditor_name: string | null;
  original_amount: number | string;
  remaining_amount: number | string;
  calculated_remaining_amount?: number | string | null;
  total_paid_amount?: number | string | null;
  total_interest_paid?: number | string | null;
  total_principal_paid?: number | string | null;
  last_calculated_at?: string | null;
  currency: string;
  start_date: string;
  first_payment_date?: string | null;
  monthly_payment: number | string;
  interest_rate: number | string | null;
  interest_type: InterestType | string | null;
  payment_day: number | string | null;
  notes: string | null;
  auto_add_to_expenses: boolean | null;
  status: DebtStatus | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DebtPaymentRow = {
  id: string;
  user_id: string;
  debt_id: string;
  payment_date: string;
  amount: number | string;
  interest_amount: number | string | null;
  principal_amount: number | string | null;
  currency: string | null;
  expense_id: string | null;
};

export type DebtForm = {
  id?: string;
  name: string;
  creditorName: string;
  originalAmount: string;
  remainingAmount: string;
  currency: string;
  startDate: string;
  firstPaymentDate: string;
  monthlyPayment: string;
  interestRate: string;
  interestType: InterestType;
  paymentDay: string;
  notes: string;
  autoAddToExpenses: boolean;
  status: DebtStatus;
};

