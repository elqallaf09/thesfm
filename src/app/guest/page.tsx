'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Heart, Lightbulb, Printer, RefreshCw, Coins, Wallet, Sparkles, Globe, Plus, Trash2, Target, Calendar, Banknote, Goal, ChevronDown, ChevronUp, Languages } from 'lucide-react';
import Link from 'next/link';

interface ItemEntry {
  id: string;
  name: string;
  amount: string;
}

interface GoalEntry {
  id: string;
  goal: string;
  amount: string;
  duration: string;
  durationUnit: DurationUnit;
  notes: string;
}

interface Currency {
  code: string;
  nameAr: string;
  symbol: string;
}

type DurationUnit = 'day' | 'month' | 'year';

const CURRENCIES: Currency[] = [
  { code: 'KWD', nameAr: 'دينار كويتي', symbol: 'د.ك' },
  { code: 'AED', nameAr: 'درهم إماراتي', symbol: 'د.إ' },
  { code: 'SAR', nameAr: 'ريال سعودي', symbol: 'ر.س' },
  { code: 'BHD', nameAr: 'دينار بحريني', symbol: 'د.ب' },
  { code: 'OMR', nameAr: 'ريال عماني', symbol: 'ر.ع.' },
  { code: 'QAR', nameAr: 'ريال قطري', symbol: 'ر.ق' },
  { code: 'USD', nameAr: 'دولار أمريكي', symbol: '$' },
  { code: 'EUR', nameAr: 'يورو', symbol: '€' },
  { code: 'GBP', nameAr: 'جنيه إسترليني', symbol: '£' },
];

const INVESTMENT_EXAMPLES = [
  { name: 'صناديق الاستثمار', nameEn: 'Investment funds', icon: '📊' },
  { name: 'الأسهم', nameEn: 'Stocks', icon: '📈' },
  { name: 'العقارات', nameEn: 'Real estate', icon: '🏠' },
  { name: 'الذهب', nameEn: 'Gold', icon: '🥇' },
  { name: 'السندات', nameEn: 'Bonds', icon: '📜' },
];

const SAVINGS_EXAMPLES = [
  { name: 'صندوق الطوارئ', nameEn: 'Emergency fund', icon: '🚨' },
  { name: 'حساب التوفير', nameEn: 'Savings account', icon: '🏦' },
  { name: 'شهادات الإدخار', nameEn: 'Savings certificates', icon: '📋' },
];

const EXPENSES_EXAMPLES = [
  { name: 'الإيجار', nameEn: 'Rent', icon: '🏠' },
  { name: 'الطعام والشراب', nameEn: 'Food & Drinks', icon: '🍔' },
  { name: 'المواصلات', nameEn: 'Transportation', icon: '🚌' },
  { name: 'الكهرباء والماء', nameEn: 'Utilities', icon: '💡' },
];

export default function GuestPage() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const isArabic = language === 'ar';

  const text = {
    title: isArabic ? 'الوضع التجريبي' : 'Guest Mode',
    subtitle: isArabic ? 'يمكنك تجربة التطبيق بدون تسجيل. البيانات لن تُحفظ.' : 'Try the app without registration. Data will not be saved.',
    langLabel: isArabic ? 'اللغة' : 'Language',
    salaryTitle: isArabic ? 'أدخل مدخولك الشهري' : 'Enter your monthly income',
    salaryDesc: isArabic ? 'جرّب وضع التوزيع بدون حفظ' : 'Try distribution mode without saving',
    currency: isArabic ? 'اختر العملة' : 'Choose currency',
    monthlySalary: isArabic ? 'دخل本职' : 'Main income',
    otherIncome: isArabic ? 'دخل آخر' : 'Other income',
    totalIncome: isArabic ? 'إجمالي الدخل' : 'Total income',
    distributionMethod: isArabic ? 'طريقة التوزيع' : 'Distribution method',
    plan70: isArabic ? '70% مصروفات | 20% مدخرات | 10% استثمار' : '70% expenses | 20% savings | 10% investment',
    plan60Savings: isArabic ? '60% مصروفات | 30% مدخرات | 10% استثمار' : '60% expenses | 30% savings | 10% investment',
    plan60Invest: isArabic ? '60% مصروفات | 20% مدخرات | 20% استثمار' : '60% expenses | 20% savings | 20% investment',
    placeholder: isArabic ? 'مثال: 5000' : 'Example: 5000',
    charityTitle: isArabic ? 'الأعمال الخيرية' : 'Charitable works',
    charityDesc: isArabic ? 'خصص نسبة من مدخولك للأعمال الخيرية' : 'Allocate a percentage of your income for charitable works',
    charityToggle: isArabic ? 'تفعيل الأعمال الخيرية' : 'Enable charitable works',
    charityPercent: isArabic ? 'نسبة الأعمال الخيرية' : 'Charity percentage',
    expenses: isArabic ? 'المصروفات' : 'Expenses',
    savings: isArabic ? 'المدخرات' : 'Savings',
    investment: isArabic ? 'الاستثمار' : 'Investment',
    addExpense: isArabic ? 'إضافة مصروف' : 'Add expense',
    addSaving: isArabic ? 'إضافة مدخرة' : 'Add saving',
    addInvestment: isArabic ? 'إضافة استثمار' : 'Add investment',
    aiSavings: isArabic ? 'أمثلة للمدخرات:' : 'Savings examples:',
    aiInvestment: isArabic ? 'أمثلة للاستثمار:' : 'Investment examples:',
    aiExpenses: isArabic ? 'أمثلة للمصروفات:' : 'Expenses examples:',
    goalsTitle: isArabic ? 'الأهداف المالية' : 'Financial goals',
    goalsDesc: isArabic ? 'حدد أهدافك المالية ومبالغها ومدتها' : 'Define your financial goals, amounts, and duration',
    addGoal: isArabic ? 'إضافة هدف جديد' : 'Add new goal',
    noGoals: isArabic ? 'لم تضف أي أهداف بعد' : 'No goals added yet',
    adviceTitle: isArabic ? 'نصيحة سريعة' : 'Quick tip',
    print: isArabic ? 'طباعة' : 'Print',
    reset: isArabic ? 'إعادة تعيين' : 'Reset',
    footer: isArabic ? 'الوضعية التجريبية - للتعرف على التطبيق فقط' : 'Guest mode - for demonstration only',
    loginToSave: isArabic ? 'سجّل دخولك لحفظ بياناتك' : 'Login to save your data',
    backToLogin: isArabic ? 'العودة لتسجيل الدخول' : 'Back to login',
    goal: isArabic ? 'الهدف' : 'Goal',
    amount: isArabic ? 'المبلغ المطلوب' : 'Required amount',
    duration: isArabic ? 'المدة' : 'Duration',
    notes: isArabic ? 'ملاحظات' : 'Notes',
    durationUnitDay: isArabic ? 'يوم' : 'day',
    durationUnitMonth: isArabic ? 'شهر' : 'month',
    durationUnitYear: isArabic ? 'سنة' : 'year',
    expenseNamePlaceholder: isArabic ? 'اسم المصروف' : 'Expense name',
    savingNamePlaceholder: isArabic ? 'اسم المدخرة' : 'Saving name',
    investmentNamePlaceholder: isArabic ? 'اسم الاستثمار' : 'Investment name',
    amountPlaceholder: isArabic ? 'المبلغ' : 'Amount',
    goalNamePlaceholder: isArabic ? 'مثال: شراء سيارة' : 'Example: Buy a car',
    goalDurationPlaceholder: isArabic ? 'مثال: 6 أشهر' : 'Example: 6 months',
    notesPlaceholder: isArabic ? 'ملاحظات' : 'Notes',
  };

  const [salary, setSalary] = useState<string>('');
  const [salaryNumber, setSalaryNumber] = useState<number>(0);
  const [otherIncome, setOtherIncome] = useState<string>('');
  const [otherIncomeNumber, setOtherIncomeNumber] = useState<number>(0);
  const [distributionMethod, setDistributionMethod] = useState<'70-20-10' | '60-30-10' | '60-20-20'>('70-20-10');
  const [includeCharity, setIncludeCharity] = useState<boolean>(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('KWD');
  const [charityPercentage, setCharityPercentage] = useState<number>(10);

  const [expenseItems, setExpenseItems] = useState<ItemEntry[]>([]);
  const [savingsItems, setSavingsItems] = useState<ItemEntry[]>([]);
  const [investmentItems, setInvestmentItems] = useState<ItemEntry[]>([]);

  const [expensesExpanded, setExpensesExpanded] = useState<boolean>(false);
  const [savingsExpanded, setSavingsExpanded] = useState<boolean>(false);
  const [investmentExpanded, setInvestmentExpanded] = useState<boolean>(false);

  const [goals, setGoals] = useState<GoalEntry[]>([]);

  const [breakdown, setBreakdown] = useState({ expenses: 0, savings: 0, investment: 0, charity: 0 });

  const getCurrentCurrency = () => {
    return CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);
  const totalIncome = salaryNumber + otherIncomeNumber;

  const calculateBreakdown = useCallback(() => {
    const baseAmount = salaryNumber + otherIncomeNumber;
    if (baseAmount <= 0) {
      setBreakdown({ expenses: 0, savings: 0, investment: 0, charity: 0 });
      return;
    }

    let expenses = 0;
    let savings = 0;
    let investment = 0;
    let charity = 0;

    const ratios = {
      '70-20-10': { expenses: 0.7, savings: 0.2, investment: 0.1 },
      '60-30-10': { expenses: 0.6, savings: 0.3, investment: 0.1 },
      '60-20-20': { expenses: 0.6, savings: 0.2, investment: 0.2 },
    }[distributionMethod];

    expenses = baseAmount * ratios.expenses;
    savings = baseAmount * ratios.savings;
    investment = baseAmount * ratios.investment;

    if (includeCharity && charityPercentage > 0) {
      charity = baseAmount * (charityPercentage / 100);
      expenses = expenses * (1 - charityPercentage / 100);
      savings = savings * (1 - charityPercentage / 100);
      investment = investment * (1 - charityPercentage / 100);
    }

    setBreakdown({
      expenses: Math.round(expenses * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      investment: Math.round(investment * 100) / 100,
      charity: Math.round(charity * 100) / 100,
    });
  }, [salaryNumber, otherIncomeNumber, includeCharity, charityPercentage, distributionMethod]);

  // Effects
  useEffect(() => {
    const num = parseFloat(salary.replace(/[^\d.]/g, ''));
    setSalaryNumber(isNaN(num) ? 0 : num);
  }, [salary]);

  useEffect(() => {
    const num = parseFloat(otherIncome.replace(/[^\d.]/g, ''));
    setOtherIncomeNumber(isNaN(num) ? 0 : num);
  }, [otherIncome]);

  useEffect(() => {
    calculateBreakdown();
  }, [calculateBreakdown]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handlePrint = () => window.print();

  const handleReset = () => {
    setSalary('');
    setSalaryNumber(0);
    setOtherIncome('');
    setOtherIncomeNumber(0);
    setDistributionMethod('70-20-10');
    setIncludeCharity(false);
    setCharityPercentage(10);
    setExpenseItems([]);
    setSavingsItems([]);
    setInvestmentItems([]);
    setGoals([]);
    setExpensesExpanded(false);
    setSavingsExpanded(false);
    setInvestmentExpanded(false);
  };

  const addExpenseItem = () => setExpenseItems([...expenseItems, { id: generateId(), name: '', amount: '' }]);
  const addSavingsItem = () => setSavingsItems([...savingsItems, { id: generateId(), name: '', amount: '' }]);
  const addInvestmentItem = () => setInvestmentItems([...investmentItems, { id: generateId(), name: '', amount: '' }]);

  const updateExpenseItem = (id: string, field: 'name' | 'amount', value: string) => {
    setExpenseItems(expenseItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  const updateSavingsItem = (id: string, field: 'name' | 'amount', value: string) => {
    setSavingsItems(savingsItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  const updateInvestmentItem = (id: string, field: 'name' | 'amount', value: string) => {
    setInvestmentItems(investmentItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeExpenseItem = (id: string) => setExpenseItems(expenseItems.filter(item => item.id !== id));
  const removeSavingsItem = (id: string) => setSavingsItems(savingsItems.filter(item => item.id !== id));
  const removeInvestmentItem = (id: string) => setInvestmentItems(investmentItems.filter(item => item.id !== id));

  const addGoal = () => setGoals([...goals, { id: generateId(), goal: '', amount: '', duration: '', durationUnit: 'month', notes: '' }]);
  const updateGoal = (id: string, field: keyof GoalEntry, value: string) => {
    setGoals(goals.map(goal => goal.id === id ? { ...goal, [field]: value } : goal));
  };
  const removeGoal = (id: string) => setGoals(goals.filter(goal => goal.id !== id));

  return (
    <main dir={isArabic ? 'rtl' : 'ltr'} className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,_#f7faf7_0%,_#eef6ef_42%,_#dfeee7_100%)] px-4 py-6 dark:bg-[linear-gradient(135deg,_#07110d_0%,_#0d1d16_48%,_#111827_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(120deg,rgba(0,96,72,0.10)_0,rgba(0,96,72,0.10)_1px,transparent_1px,transparent_42px),linear-gradient(160deg,rgba(187,151,82,0.12)_0,rgba(187,151,82,0.12)_1px,transparent_1px,transparent_68px)] dark:opacity-20" />

      <div className="relative max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2 text-center md:text-start">
              <h1 className="text-3xl font-bold tracking-tight text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-3 md:justify-start">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl overflow-hidden shadow-lg shadow-emerald-700/20">
                  <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=100&h=100&fit=crop" alt="Calculator" className="w-full h-full object-cover" />
                </span>
                {text.title}
              </h1>
              <p className="text-muted-foreground text-lg">{text.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-slate-900/5 p-2 dark:bg-white/10">
              <Languages className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{text.langLabel}</span>
              <Select value={language} onValueChange={(value) => setLanguage(value as 'ar' | 'en')}>
                <SelectTrigger className="h-10 w-[150px] border-white/70 bg-white/80 dark:border-white/10 dark:bg-slate-900/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link href="/">
              <Button variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                {text.backToLogin}
              </Button>
            </Link>
          </div>
        </div>

        {/* Salary Input Card */}
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardHeader className="bg-emerald-50 dark:bg-emerald-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Coins className="w-6 h-6" />
              {text.salaryTitle}
            </CardTitle>
            <CardDescription>{text.salaryDesc}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-lg font-medium flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {text.currency}
              </Label>
              <Select value={selectedCurrency} onValueChange={(v) => setSelectedCurrency(v)}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <span className="flex items-center gap-2">
                        <span className="font-bold min-w-[60px]">{currency.symbol}</span>
                        <span>{currency.nameAr}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-lg font-medium">{text.monthlySalary}</Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder={text.placeholder}
                    className="text-xl font-bold text-center h-14 text-input text-lg"
                    dir="ltr"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    {getCurrentCurrency().symbol}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-lg font-medium">{text.otherIncome}</Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={otherIncome}
                    onChange={(e) => setOtherIncome(e.target.value)}
                    placeholder={text.placeholder}
                    className="text-xl font-bold text-center h-14 text-input text-lg"
                    dir="ltr"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    {getCurrentCurrency().symbol}
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-center dark:border-emerald-800 dark:bg-emerald-900/30">
              <span className="text-sm text-emerald-700 dark:text-emerald-300">{text.totalIncome}</span>
              <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-200">
                {formatCurrency(totalIncome)} {getCurrentCurrency().symbol}
              </p>
            </div>
            <div className="space-y-3">
              <Label className="text-lg font-medium">{text.distributionMethod}</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { value: '70-20-10', label: text.plan70 },
                  { value: '60-30-10', label: text.plan60Savings },
                  { value: '60-20-20', label: text.plan60Invest },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDistributionMethod(option.value as typeof distributionMethod)}
                    className={`rounded-2xl border p-4 text-start text-sm font-semibold transition-all ${distributionMethod === option.value
                      ? 'border-emerald-500 bg-emerald-600 text-white shadow-lg shadow-emerald-700/20'
                      : 'border-slate-200 bg-white/80 text-slate-700 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charity Section */}
        <Card className="border-rose-200 dark:border-rose-800">
          <CardHeader className="bg-rose-50 dark:bg-rose-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <Heart className="w-6 h-6" />
              {text.charityTitle}
            </CardTitle>
            <CardDescription>{text.charityDesc}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-medium cursor-pointer">{text.charityToggle}</Label>
              <Switch checked={includeCharity} onCheckedChange={setIncludeCharity} />
            </div>
            {includeCharity && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <Label>{text.charityPercent}: {charityPercentage}%</Label>
                <Slider
                  value={[charityPercentage]}
                  onValueChange={(v) => setCharityPercentage(v[0])}
                  max={20}
                  min={0}
                  step={1}
                  className="py-2"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Breakdown Cards */}
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardHeader className="bg-emerald-50 dark:bg-emerald-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Wallet className="w-6 h-6" />
              {text.totalIncome}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 text-center">
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(totalIncome)} {getCurrentCurrency().symbol}
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500" />
                  <span className="font-semibold text-green-700 dark:text-green-400">{text.expenses}</span>
                </div>
                <span className="text-xl font-bold text-green-800 dark:text-green-300">
                  {formatCurrency(breakdown.expenses)} {getCurrentCurrency().symbol}
                </span>
              </div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500" />
                  <span className="font-semibold text-blue-700 dark:text-blue-400">{text.savings}</span>
                </div>
                <span className="text-xl font-bold text-blue-800 dark:text-blue-300">
                  {formatCurrency(breakdown.savings)} {getCurrentCurrency().symbol}
                </span>
              </div>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-500" />
                  <span className="font-semibold text-amber-700 dark:text-amber-400">{text.investment}</span>
                </div>
                <span className="text-xl font-bold text-amber-800 dark:text-amber-300">
                  {formatCurrency(breakdown.investment)} {getCurrentCurrency().symbol}
                </span>
              </div>
            </div>
            {includeCharity && breakdown.charity > 0 && (
              <div className="p-4 bg-rose-50 dark:bg-rose-900/30 rounded-xl border border-rose-200 dark:border-rose-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-rose-500" />
                    <span className="font-semibold text-rose-700 dark:text-rose-400">{text.charityTitle}</span>
                  </div>
                  <span className="text-xl font-bold text-rose-800 dark:text-rose-300">
                    {formatCurrency(breakdown.charity)} {getCurrentCurrency().symbol}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button onClick={handlePrint} variant="outline" size="lg" className="border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900">
            <Printer className="w-5 h-5 ms-2" />
            {text.print}
          </Button>
          <Button onClick={handleReset} variant="outline" size="lg" className="border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <RefreshCw className="w-5 h-5 ms-2" />
            {text.reset}
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>{text.footer}</p>
        </div>
      </div>
    </main>
  );
}
