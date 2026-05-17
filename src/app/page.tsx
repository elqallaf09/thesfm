'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Heart, Lightbulb, Printer, RefreshCw, Coins, Wallet, Sparkles, Globe, Plus, Trash2, Target, Calendar, Banknote, Goal, ChevronDown, ChevronUp, Languages, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';
import { IncomeSourcesForm } from '@/components/income/IncomeSourcesForm';
import { INCOME_CATEGORIES } from '@/lib/income-categories';

interface SalaryBreakdown {
  expenses: number;
  savings: number;
  investment: number;
  charity: number;
}

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

interface Advice {
  category: string;
  tip: string;
  icon: string;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
  nameAr: string;
}

type TickerCategory = 'global' | 'gulf' | 'asia' | 'europe' | 'crypto' | 'metals';

interface MarketTickerItem {
  nameAr: string;
  nameEn: string;
  value: string;
  change: string;
  positive: boolean;
}

const MARKET_TICKERS: Record<TickerCategory, MarketTickerItem[]> = {
  global: [
    { nameAr: 'داو جونز', nameEn: 'Dow Jones', value: '39,806.77', change: '+0.32%', positive: true },
    { nameAr: 'ناسداك', nameEn: 'Nasdaq', value: '16,340.87', change: '+0.58%', positive: true },
    { nameAr: 'إس آند بي 500', nameEn: 'S&P 500', value: '5,308.13', change: '-0.12%', positive: false },
    { nameAr: 'فوتسي العالمي', nameEn: 'FTSE All-World', value: '518.42', change: '+0.21%', positive: true },
  ],
  gulf: [
    { nameAr: 'بورصة الكويت', nameEn: 'Boursa Kuwait', value: '7,421.35', change: '+0.44%', positive: true },
    { nameAr: 'تداول السعودية', nameEn: 'Saudi Tadawul', value: '12,184.90', change: '-0.18%', positive: false },
    { nameAr: 'سوق دبي المالي', nameEn: 'Dubai Financial Market', value: '4,083.61', change: '+0.27%', positive: true },
    { nameAr: 'بورصة قطر', nameEn: 'Qatar Exchange', value: '10,242.15', change: '+0.09%', positive: true },
  ],
  asia: [
    { nameAr: 'نيكي 225', nameEn: 'Nikkei 225', value: '38,787.38', change: '+0.73%', positive: true },
    { nameAr: 'هانغ سنغ', nameEn: 'Hang Seng', value: '19,636.22', change: '-0.31%', positive: false },
    { nameAr: 'شنغهاي المركب', nameEn: 'Shanghai Composite', value: '3,154.03', change: '+0.16%', positive: true },
    { nameAr: 'سينسكس الهند', nameEn: 'BSE Sensex', value: '74,221.06', change: '+0.48%', positive: true },
  ],
  europe: [
    { nameAr: 'فوتسي 100', nameEn: 'FTSE 100', value: '8,421.02', change: '+0.24%', positive: true },
    { nameAr: 'داكس ألمانيا', nameEn: 'DAX', value: '18,704.42', change: '+0.37%', positive: true },
    { nameAr: 'كاك 40', nameEn: 'CAC 40', value: '8,167.50', change: '-0.11%', positive: false },
    { nameAr: 'يورو ستوكس 50', nameEn: 'Euro Stoxx 50', value: '5,083.15', change: '+0.19%', positive: true },
  ],
  crypto: [
    { nameAr: 'بيتكوين', nameEn: 'Bitcoin', value: '$67,240', change: '+1.42%', positive: true },
    { nameAr: 'إيثريوم', nameEn: 'Ethereum', value: '$3,118', change: '+0.86%', positive: true },
    { nameAr: 'بي إن بي', nameEn: 'BNB', value: '$588.40', change: '-0.40%', positive: false },
    { nameAr: 'سولانا', nameEn: 'Solana', value: '$153.30', change: '+2.10%', positive: true },
  ],
  metals: [
    { nameAr: 'ذهب فوري', nameEn: 'Spot Gold', value: '$2,356.70', change: '+0.29%', positive: true },
    { nameAr: 'فضة فورية', nameEn: 'Spot Silver', value: '$28.18', change: '+0.51%', positive: true },
    { nameAr: 'ذهب الكويت 24 قيراط', nameEn: 'Kuwait Gold 24K', value: '23.18 د.ك', change: '+0.18%', positive: true },
    { nameAr: 'فضة الكويت', nameEn: 'Kuwait Silver', value: '0.28 د.ك', change: '-0.07%', positive: false },
  ],
};

const CURRENCIES: Currency[] = [
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', nameAr: 'دينار كويتي' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', nameAr: 'درهم إماراتي' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', nameAr: 'ريال سعودي' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب', nameAr: 'دينار بحريني' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.', nameAr: 'ريال عماني' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', nameAr: 'ريال قطري' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.أ', nameAr: 'دينار أردني' },
  { code: 'USD', name: 'US Dollar', symbol: '$', nameAr: 'دولار أمريكي' },
  { code: 'EUR', name: 'Euro', symbol: '€', nameAr: 'يورو' },
  { code: 'GBP', name: 'British Pound', symbol: '£', nameAr: 'جنيه إسترليني' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', nameAr: 'جنيه مصري' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', nameAr: 'ليرة تركية' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', nameAr: 'روبية هندية' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', nameAr: 'روبية باكستانية' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', nameAr: 'ين ياباني' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', nameAr: 'يوان صيني' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', nameAr: 'دولار كندي' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', nameAr: 'دولار أسترالي' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', nameAr: 'فرنك سويسري' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', nameAr: 'ريال برازيلي' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', nameAr: 'راند جنوب أفريقي' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', nameAr: 'نيرا نيجيري' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', nameAr: 'درهم مغربي' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', nameAr: 'وون كوري' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', nameAr: 'رينجيت ماليزي' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', nameAr: 'دولار سنغافوري' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', nameAr: 'روبية إندونيسية' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', nameAr: 'بيزو فلبيني' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', nameAr: 'باهت تايلاندي' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', nameAr: 'دينار عراقي' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', nameAr: 'ليرة لبنانية' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', nameAr: 'روبل روسي' },
];

const INVESTMENT_EXAMPLES = [
  { name: 'صناديق الاستثمار', nameEn: 'Investment funds', icon: '📊' },
  { name: 'الأسهم', nameEn: 'Stocks', icon: '📈' },
  { name: 'العقارات', nameEn: 'Real estate', icon: '🏠' },
  { name: 'الذهب', nameEn: 'Gold', icon: '🥇' },
  { name: 'السندات', nameEn: 'Bonds', icon: '📜' },
  { name: 'التأمين التكافلي', nameEn: 'Takaful insurance', icon: '🛡️' },
  { name: 'المتاجرة', nameEn: 'Trading', icon: '🛒' },
  { name: 'المشاريع الصغيرة', nameEn: 'Small businesses', icon: '🏪' },
  { name: 'التعليم والدورات', nameEn: 'Education & courses', icon: '📚' },
  { name: 'التقنيات الحديثة', nameEn: 'Modern technology', icon: '💻' },
];

const SAVINGS_EXAMPLES = [
  { name: 'صندوق الطوارئ', nameEn: 'Emergency fund', icon: '🚨' },
  { name: 'حساب التوفير', nameEn: 'Savings account', icon: '🏦' },
  { name: 'شهادات الإدخار', nameEn: 'Savings certificates', icon: '📋' },
  { name: 'إيجار شقة', nameEn: 'Apartment rent', icon: '🏢' },
  { name: 'سيارة جديدة', nameEn: 'New car', icon: '🚗' },
  { name: 'جهاز كهربائي', nameEn: 'Appliance', icon: '📺' },
  { name: 'رحلة سياحية', nameEn: 'Travel', icon: '✈️' },
  { name: 'جهاز جوال', nameEn: 'Mobile phone', icon: '📱' },
  { name: 'تجديد أثاث', nameEn: 'Furniture renewal', icon: '🪑' },
  { name: 'زواج أو خطوبة', nameEn: 'Wedding/Engagement', icon: '💍' },
];

const EXPENSES_EXAMPLES = [
  { name: 'الإيجار', nameEn: 'Rent', icon: '🏠' },
  { name: 'الطعام والشراب', nameEn: 'Food & Drinks', icon: '🍔' },
  { name: 'المواصلات', nameEn: 'Transportation', icon: '🚌' },
  { name: 'الكهرباء والماء', nameEn: 'Utilities', icon: '💡' },
  { name: 'الاتصالات', nameEn: 'Communications', icon: '📱' },
  { name: 'الملابس', nameEn: 'Clothing', icon: '👔' },
  { name: 'الرعاية الصحية', nameEn: 'Healthcare', icon: '🏥' },
  { name: 'الملاهي', nameEn: 'Entertainment', icon: '🎮' },
];

const ARABIC_ADVICE: Advice[] = [
  { category: 'المصروفات', tip: 'حاول الالتزام بـ 70% من مدخولك للمصروفات الأساسية. قلل من المصاريف غير الضرورية', icon: '💰' },
  { category: 'المدخرات', tip: 'لا تلمس مدخراتك في الطوارئ. اجعلها في حساب منفصل يصعب الوصول إليه', icon: '🏦' },
  { category: 'الاستثمار', tip: 'ابدأ بالاستثمار مبكراً حتى لو بمبالغ صغيرة. الفائدة المركبة تعمل لصالحك', icon: '📈' },
  { category: 'الأعمال الخيرية', tip: 'الصدقة تطفئ غضب الرب وتبارك في الرزق. حتى المبلغ الصغير له قيمة', icon: '🤲' },
  { category: 'الدين', tip: 'إذا كنت مديناً، اعمل على سداد الديون أولاً قبل التفكير في الاستثمار', icon: '⚖️' },
  { category: 'التأمين', tip: 'تأكد من وجود تأمين صحي وتأمين حياة يحميك وعائلتك', icon: '🛡️' },
  { category: 'التقاعد', tip: 'خصص نسبة من دخلك للتقاعد مبكراً. كلما بدأت أبكر كلما كان أفضل', icon: '🌴' },
  { category: 'التعليم', tip: 'استثمر في تطوير مهاراتك التعليمية. المعرفة أفضل استثمار', icon: '📚' },
];

const ENGLISH_ADVICE: Advice[] = [
  { category: 'Expenses', tip: 'Try to stick to 70% of your income for essential expenses. Reduce unnecessary spending', icon: '💰' },
  { category: 'Savings', tip: 'Do not touch your savings in emergencies. Keep them in a separate account that is hard to access', icon: '🏦' },
  { category: 'Investment', tip: 'Start investing early even with small amounts. Compound interest works in your favor', icon: '📈' },
  { category: 'Charitable works', tip: 'Charity extinguishes the anger of the Lord and blesses the provision. Even a small amount has value', icon: '🤲' },
  { category: 'Debt', tip: 'If you are in debt, work on paying off debts first before thinking about investing', icon: '⚖️' },
  { category: 'Insurance', tip: 'Make sure you have health insurance and life insurance to protect you and your family', icon: '🛡️' },
  { category: 'Retirement', tip: 'Allocate a portion of your income for retirement early. The earlier you start, the better', icon: '🌴' },
  { category: 'Education', tip: 'Invest in developing your educational skills. Knowledge is the best investment', icon: '📚' },
];

const COUNTRY_DIAL_CODES = [
  { code: '+965', name: 'Kuwait', nameAr: 'الكويت' },
  { code: '+966', name: 'Saudi Arabia', nameAr: 'السعودية' },
  { code: '+971', name: 'UAE', nameAr: 'الإمارات' },
  { code: '+973', name: 'Bahrain', nameAr: 'البحرين' },
  { code: '+968', name: 'Oman', nameAr: 'عُمان' },
  { code: '+974', name: 'Qatar', nameAr: 'قطر' },
  { code: '+962', name: 'Jordan', nameAr: 'الأردن' },
  { code: '+961', name: 'Lebanon', nameAr: 'لبنان' },
  { code: '+964', name: 'Iraq', nameAr: 'العراق' },
  { code: '+20', name: 'Egypt', nameAr: 'مصر' },
  { code: '+1', name: 'USA/Canada', nameAr: 'أمريكا/كندا' },
  { code: '+44', name: 'UK', nameAr: 'بريطانيا' },
  { code: '+33', name: 'France', nameAr: 'فرنسا' },
  { code: '+49', name: 'Germany', nameAr: 'ألمانيا' },
  { code: '+91', name: 'India', nameAr: 'الهند' },
  { code: '+92', name: 'Pakistan', nameAr: 'باكستان' },
];

type DurationUnit = 'day' | 'month' | 'year';

export default function HomePage() {
  return (
    <AuthGate>
      {({ userId, username, incomeTotal }) => (
        <SalaryManager userId={userId} username={username} incomeTotal={incomeTotal} />
      )}
    </AuthGate>
  );
}

interface AuthGateProps {
  children: (props: { userId: string; username: string; incomeTotal: number }) => ReactNode;
}

function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useAuth();
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [username, setUsername] = useState('');
  const [hasIncomeSources, setHasIncomeSources] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const loadUserData = useCallback(async () => {
    if (user) {
      localStorage.removeItem('guest_session');
      setIsGuest(false);
    }

    if (!user && !isGuest) {
      setCheckingProfile(false);
      return;
    }

    // Guest: skip DB, go straight to app
    if (isGuest) {
      setUsername('ضيف');
      setCheckingProfile(false);
      return;
    }

    setCheckingProfile(true);
    const [{ data: profile }, { data: sources }] = await Promise.all([
      supabase.from('profiles').select('username, display_name').eq('id', user!.id).maybeSingle(),
      supabase.from('monthly_income_sources').select('amount').eq('user_id', user!.id),
    ]);

    setUsername(profile?.display_name || profile?.username || user!.user_metadata?.username || '');
    const total = (sources || []).reduce((sum, source) => sum + Number(source.amount || 0), 0);
    setIncomeTotal(total);
    setHasIncomeSources((sources || []).length > 0);
    setCheckingProfile(false);
  }, [user, isGuest]);

  useEffect(() => {
    const guestSession = localStorage.getItem('guest_session');
    if (guestSession === 'true') {
      setIsGuest(true);
    }
    loadUserData();
  }, [loadUserData]);

  if (loading || checkingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#f7faf7_0%,_#eef6ef_42%,_#dfeee7_100%)]">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  // Not logged in and not guest → show login
  if (!user && !isGuest) return <AuthForm />;

  // Logged-in user with no income sources → show income setup
  if (!isGuest && !hasIncomeSources) {
    return <IncomeSourcesForm userId={user!.id} username={username} onComplete={loadUserData} />;
  }

  // Guest or logged-in user with income → show main app
  return <>{children({ userId: user?.id || '', username, incomeTotal })}</>;
}

interface SalaryManagerProps {
  userId: string;
  username: string;
  incomeTotal: number;
}

function SalaryManager({ userId, username, incomeTotal }: SalaryManagerProps) {
  const router = useRouter();
  const isGuest = !userId;
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const isArabic = language === 'ar';
  const text = {
    title: isArabic ? 'المدير المالي الذكي' : 'Smart Financial Manager',
    subtitle: isArabic ? 'اختر طريقة توزيع دخلك أو أدخل خطتك يدوياً ليتم تحليلها بذكاء' : 'Choose an income split or enter your own plan for smart analysis',
    langLabel: isArabic ? 'اللغة' : 'Language',
    salaryTitle: isArabic ? 'أدخل مدخولك الشهري' : 'Enter your monthly income',
    salaryDesc: isArabic ? 'تم احتساب دخلك من أنواع المدخول التي أدخلتها، ويمكنك إضافة مدخول آخر عند الحاجة' : 'Your income is calculated from saved income sources, and you can add extra income if needed',
    currency: isArabic ? 'اختر العملة' : 'Choose currency',
    monthlySalary: isArabic ? 'إجمالي أنواع الدخل' : 'Total income sources',
    otherIncome: isArabic ? 'مدخول آخر' : 'Other income',
    totalIncome: isArabic ? 'إجمالي الدخل' : 'Total income',
    distributionMethod: isArabic ? 'طريقة توزيع الدخل' : 'Income distribution method',
    plan70: isArabic ? '70% مصروفات | 20% مدخرات | 10% استثمار' : '70% expenses | 20% savings | 10% investment',
    plan60Savings: isArabic ? '60% مصروفات | 30% مدخرات | 10% استثمار' : '60% expenses | 30% savings | 10% investment',
    plan60Invest: isArabic ? '60% مصروفات | 20% مدخرات | 20% استثمار' : '60% expenses | 20% savings | 20% investment',
    manualPlan: isArabic ? 'إدخال يدوي مع تحليل ذكي' : 'Manual entry with smart analysis',
    manualDesc: isArabic ? 'أدخل المدخول + المدخول الآخر ثم عبئ المصروفات والمدخرات والاستثمار يدوياً' : 'Enter income + other income, then manually fill expenses, savings, and investment',
    manualExpenses: isArabic ? 'مصروفات يدوية' : 'Manual expenses',
    manualSavings: isArabic ? 'مدخرات يدوية' : 'Manual savings',
    manualInvestment: isArabic ? 'استثمار يدوي' : 'Manual investment',
    aiBestChoice: isArabic ? 'تحليل ذكي' : 'Smart analysis',
    placeholder: isArabic ? 'مثال: 5000' : 'Example: 5000',
    charityTitle: isArabic ? 'الأعمال الخيرية' : 'Charitable works',
    charityDesc: isArabic ? 'خصص نسبة من مدخولك للأعمال الخيرية' : 'Allocate a percentage of your income for charitable works',
    charityToggle: isArabic ? 'تفعيل الأعمال الخيرية' : 'Enable charitable works',
    charityPercent: isArabic ? 'نسبة الأعمال الخيرية' : 'Charity percentage',
    profileBtn: isArabic ? 'الملف الشخصي' : 'Profile',
    investmentTypesBtn: isArabic ? 'أنواع الاستثمار' : 'Investment',
    savingsTypesBtn: isArabic ? 'أنواع الإدخار' : 'Savings',
    expensesInfoBtn: isArabic ? 'ماهي المصروفات' : 'Expenses',
    phoneCountryCode: isArabic ? 'رمز الدولة' : 'Country code',
    phoneNumber: isArabic ? 'رقم الهاتف' : 'Phone number',
    newPassword: isArabic ? 'كلمة المرور الجديدة' : 'New password',
    newPasswordHint: isArabic ? 'اتركه فارغاً إذا كنت لا تريد تغيير كلمة المرور' : 'Leave empty if you do not want to change password',
    incomeSourcesTitle: isArabic ? 'مصادر الدخل الحالية' : 'Current income sources',
    updateIncome: isArabic ? 'تعديل المدخول الشهري' : 'Update monthly income',
    durationUnitDay: isArabic ? 'يوم' : 'day',
    durationUnitMonth: isArabic ? 'شهر' : 'month',
    durationUnitYear: isArabic ? 'سنة' : 'year',
    calculationDetails: isArabic ? 'تفاصيل العمليات الحسابية السابقة' : 'Previous calculation details',
    profileTitle: isArabic ? 'الملف الشخصي' : 'Profile',
    profileName: isArabic ? 'اسم المستخدم' : 'Username',
    profileEmail: isArabic ? 'البريد الإلكتروني' : 'Email',
    profileAge: isArabic ? 'العمر' : 'Age',
    profileTotalIncome: isArabic ? 'إجمالي الدخل' : 'Total income',
    profileSave: isArabic ? 'حفظ التغييرات' : 'Save changes',
    profileSaved: isArabic ? 'تم الحفظ بنجاح' : 'Saved successfully',
    profileError: isArabic ? 'حدث خطأ في الحفظ' : 'Error saving',
    logout: isArabic ? 'تسجيل الخروج' : 'Sign out',
    expenseNamePlaceholder: isArabic ? 'اسم المصروف' : 'Expense name',
    savingNamePlaceholder: isArabic ? 'اسم المدخرة' : 'Saving name',
    investmentNamePlaceholder: isArabic ? 'اسم الاستثمار' : 'Investment name',
    amountPlaceholder: isArabic ? 'المبلغ' : 'Amount',
    goalNamePlaceholder: isArabic ? 'مثال: شراء سيارة' : 'Example: Buy a car',
    notesPlaceholder: isArabic ? 'ملاحظات' : 'Notes',
    sumExpenses: isArabic ? 'مجموع المصروفات' : 'Total expenses',
    sumSavings: isArabic ? 'مجموع المدخرات' : 'Total savings',
    sumInvestment: isArabic ? 'مجموع الاستثمار' : 'Total investment',
    noOperations: isArabic ? 'لا توجد عمليات مسجلة' : 'No recorded operations',
    charityTypes: isArabic ? 'أنواع الأعمال الخيرية' : 'Charity types',
    charitySadaqah: isArabic ? 'صدقة' : 'Sadaqah',
    charityZakat: isArabic ? 'زكاة' : 'Zakat',
    charitySacrifice: isArabic ? 'أضحية' : 'Sacrifice',
    charityExpiation: isArabic ? 'كفارة' : 'Expiation',
    charityOther: isArabic ? 'أعمال خيرية أخرى' : 'Other charity',
    selectedCharities: isArabic ? 'المختارة' : 'Selected',
    salaryDetails: isArabic ? 'تفاصيل المدخول الشهري' : 'Monthly income details',
    totalSalary: isArabic ? 'إجمالي المدخول' : 'Total income',
    expenses: isArabic ? 'المصروفات' : 'Expenses',
    savings: isArabic ? 'المدخرات' : 'Savings',
    investment: isArabic ? 'الاستثمار' : 'Investment',
    charity: isArabic ? 'الأعمال الخيرية' : 'Charitable works',
    addExpense: isArabic ? 'إضافة مصروف' : 'Add expense',
    addSaving: isArabic ? 'إضافة مدخرة' : 'Add saving',
    addInvestment: isArabic ? 'إضافة استثمار' : 'Add investment',
    aiSavings: isArabic ? 'أمثلة للمدخرات:' : 'Savings examples:',
    aiInvestment: isArabic ? 'أمثلة للاستثمار:' : 'Investment examples:',
    aiExpenses: isArabic ? 'أمثلة للمصروفات:' : 'Expenses examples:',
    goalsTitle: isArabic ? 'الأهداف المالية' : 'Financial goals',
    goalsDesc: isArabic ? 'حدد أهدافك المالية ومبالغها ومدتها' : 'Define your financial goals, amounts, and duration',
    addGoal: isArabic ? 'إضافة هدف جديد' : 'Add new goal',
    goal: isArabic ? 'الهدف' : 'Goal',
    amount: isArabic ? 'المبلغ المطلوب' : 'Required amount',
    duration: isArabic ? 'المدة' : 'Duration',
    notes: isArabic ? 'ملاحظات' : 'Notes',
    noGoals: isArabic ? 'لم تضف أي أهداف بعد' : 'No goals added yet',
    noGoalsHint: isArabic ? 'اضغط على الزر أعلاه لإضافة هدف جديد' : 'Click the button above to add a new goal',
    adviceTitle: isArabic ? 'نصيحتنا لك' : 'Our advice to you',
    adviceDesc: isArabic ? 'نصائح مالية مخصصة بناءً على مدخولك' : 'Personalized financial tips based on your income',
    randomAdvice: isArabic ? 'احصل على نصيحة عشوائية' : 'Get a random tip',
    print: isArabic ? 'طباعة / تصدير' : 'Print / Export',
    reset: isArabic ? 'إعادة تعيين' : 'Reset',
    footer: isArabic ? 'المدير المالي الذكي - يساعدك على اتخاذ قرارات مالية أوضح' : 'Smart Financial Manager - helping you make clearer financial decisions',
    tickerTitle: isArabic ? 'مؤشرات الأسواق' : 'Market watch',
    tickerType: isArabic ? 'نوع البورصة' : 'Market type',
    globalMarkets: isArabic ? 'بورصات العالم' : 'Global markets',
    gulfMarkets: isArabic ? 'بورصات الخليج' : 'Gulf markets',
    asianMarkets: isArabic ? 'البورصات الآسيوية' : 'Asian markets',
    europeanMarkets: isArabic ? 'البورصات الأوروبية' : 'European markets',
    cryptoMarkets: isArabic ? 'العملات الرقمية' : 'Cryptocurrencies',
    metalsMarkets: isArabic ? 'الذهب والفضة' : 'Gold and silver',
    livePrices: isArabic ? 'أسعار مباشرة من مزود خارجي' : 'Live prices from external provider',
    loadingPrices: isArabic ? 'جار تحديث الأسعار المباشرة' : 'Updating live prices',
    fallbackPrices: isArabic ? 'بيانات احتياطية عند تعذر الاتصال' : 'Fallback data when provider is unavailable',
    refreshPrices: isArabic ? 'تحديث الأسعار' : 'Refresh prices',
    goalSuggestion: isArabic ? 'اقتراح للهدف' : 'Goal suggestion',
    warningExceeded: isArabic ? 'تحذير: تجاوزت النسبة المحددة' : 'Warning: You exceeded the specified ratio',
    warningManual: isArabic ? 'أدخلت مبالغ أعلى من النسب المقترحة. تأكد من صحة المدخول أو راجع خطة الإنفاق.' : 'You entered amounts higher than suggested ratios. Verify your income or review your spending plan.',
  };

  const [salary, setSalary] = useState<string>(incomeTotal ? String(incomeTotal) : '');
  const [salaryNumber, setSalaryNumber] = useState<number>(incomeTotal || 0);
  const [otherIncome, setOtherIncome] = useState<string>('');
  const [otherIncomeNumber, setOtherIncomeNumber] = useState<number>(0);
  const [distributionMethod, setDistributionMethod] = useState<'70-20-10' | '60-30-10' | '60-20-20' | 'manual'>('70-20-10');
  const [manualExpenses, setManualExpenses] = useState<string>('');
  const [manualSavings, setManualSavings] = useState<string>('');
  const [manualInvestment, setManualInvestment] = useState<string>('');
  const [includeCharity, setIncludeCharity] = useState<boolean>(false);
  const [showAdvice, setShowAdvice] = useState<boolean>(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('KWD');
  const [tickerCategory, setTickerCategory] = useState<TickerCategory>('gulf');
  const [liveTickerItems, setLiveTickerItems] = useState<MarketTickerItem[]>(MARKET_TICKERS.gulf);
  const [tickerLoading, setTickerLoading] = useState<boolean>(true);
  const [tickerIsLive, setTickerIsLive] = useState<boolean>(false);
  const [randomAdvice, setRandomAdvice] = useState<Advice | null>(null);
  const [manualWarning, setManualWarning] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [profileData, setProfileData] = useState<{ display_name?: string; email?: string; age?: number; phone_country_code?: string; phone_number?: string }>({});
  const [profileSaving, setProfileSaving] = useState<boolean>(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [editingIncomeSources, setEditingIncomeSources] = useState<boolean>(false);
  const [incomeSourceAmounts, setIncomeSourceAmounts] = useState<Record<string, string>>({});
  const [incomeSourcesLoading, setIncomeSourcesLoading] = useState<boolean>(false);
  const [selectedCharityTypes, setSelectedCharityTypes] = useState<string[]>([]);
  const [charityPercentages, setCharityPercentages] = useState<Record<string, number>>({});
  const CHARITY_TYPE_OPTIONS = ['sadaqah', 'zakat', 'sacrifice', 'expiation', 'other'];
  const [totalCharityPercentage, setTotalCharityPercentage] = useState<number>(0);
  const [expenseItems, setExpenseItems] = useState<ItemEntry[]>([]);
  const [savingsItems, setSavingsItems] = useState<ItemEntry[]>([]);
  const [investmentItems, setInvestmentItems] = useState<ItemEntry[]>([]);
  const [expensesExpanded, setExpensesExpanded] = useState<boolean>(false);
  const [savingsExpanded, setSavingsExpanded] = useState<boolean>(false);
  const [investmentExpanded, setInvestmentExpanded] = useState<boolean>(false);
  const [goals, setGoals] = useState<GoalEntry[]>([]);
  const [breakdown, setBreakdown] = useState<SalaryBreakdown>({ expenses: 0, savings: 0, investment: 0, charity: 0 });

  const getCurrentCurrency = () => CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];
  const generateId = () => Math.random().toString(36).substr(2, 9);
  const totalIncome = salaryNumber + otherIncomeNumber;
  const tickerItems = liveTickerItems.length > 0 ? liveTickerItems : MARKET_TICKERS[tickerCategory];
  const tickerStatus = tickerLoading ? text.loadingPrices : tickerIsLive ? text.livePrices : text.fallbackPrices;
  const tickerOptions: { value: TickerCategory; label: string }[] = [
    { value: 'global', label: text.globalMarkets },
    { value: 'gulf', label: text.gulfMarkets },
    { value: 'asia', label: text.asianMarkets },
    { value: 'europe', label: text.europeanMarkets },
    { value: 'crypto', label: text.cryptoMarkets },
    { value: 'metals', label: text.metalsMarkets },
  ];

  const fetchTickerData = useCallback(async () => {
    setTickerLoading(true);
    try {
      const response = await fetch(`/api/market-ticker?category=${tickerCategory}`);
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setLiveTickerItems(Array.isArray(data.items) && data.items.length > 0 ? data.items : MARKET_TICKERS[tickerCategory]);
      setTickerIsLive(Boolean(data.live));
    } catch {
      setLiveTickerItems(MARKET_TICKERS[tickerCategory]);
      setTickerIsLive(false);
    } finally {
      setTickerLoading(false);
    }
  }, [tickerCategory]);

  const calculateBreakdown = useCallback(() => {
    const baseAmount = salaryNumber + otherIncomeNumber;
    if (baseAmount <= 0) { setBreakdown({ expenses: 0, savings: 0, investment: 0, charity: 0 }); return; }
    let expenses = 0, savings = 0, investment = 0, charity = 0;
    if (distributionMethod === 'manual') {
      expenses = parseFloat(manualExpenses.replace(/[^\d.]/g, '')) || 0;
      savings = parseFloat(manualSavings.replace(/[^\d.]/g, '')) || 0;
      investment = parseFloat(manualInvestment.replace(/[^\d.]/g, '')) || 0;
    } else {
      const ratios = { '70-20-10': { expenses: 0.7, savings: 0.2, investment: 0.1 }, '60-30-10': { expenses: 0.6, savings: 0.3, investment: 0.1 }, '60-20-20': { expenses: 0.6, savings: 0.2, investment: 0.2 } }[distributionMethod];
      expenses = baseAmount * ratios.expenses;
      savings = baseAmount * ratios.savings;
      investment = baseAmount * ratios.investment;
    }
    if (includeCharity && totalCharityPercentage > 0) {
      charity = baseAmount * (totalCharityPercentage / 100);
      expenses = expenses * (1 - totalCharityPercentage / 100);
      savings = savings * (1 - totalCharityPercentage / 100);
      investment = investment * (1 - totalCharityPercentage / 100);
    }
    setBreakdown({ expenses: Math.round(expenses * 100) / 100, savings: Math.round(savings * 100) / 100, investment: Math.round(investment * 100) / 100, charity: Math.round(charity * 100) / 100 });
  }, [salaryNumber, otherIncomeNumber, includeCharity, totalCharityPercentage, distributionMethod, manualExpenses, manualSavings, manualInvestment]);

  useEffect(() => { calculateBreakdown(); }, [calculateBreakdown]);
  useEffect(() => { fetchTickerData(); }, [fetchTickerData]);
  useEffect(() => { setSalary(incomeTotal ? String(incomeTotal) : ''); setSalaryNumber(incomeTotal || 0); }, [incomeTotal]);
  useEffect(() => { const num = parseFloat(salary.replace(/[^\d.]/g, '')); setSalaryNumber(isNaN(num) ? 0 : num); }, [salary]);
  useEffect(() => { const num = parseFloat(otherIncome.replace(/[^\d.]/g, '')); setOtherIncomeNumber(isNaN(num) ? 0 : num); }, [otherIncome]);

  // Auto-save only for logged-in users
  useEffect(() => {
    if (!userId) return;
    const timeout = setTimeout(() => { saveExpenseItems(userId); }, 2000);
    return () => clearTimeout(timeout);
  }, [expenseItems, userId]);

  useEffect(() => {
    if (!userId) return;
    const timeout = setTimeout(() => { saveSavingsItems(userId); }, 2000);
    return () => clearTimeout(timeout);
  }, [savingsItems, userId]);

  useEffect(() => {
    if (!userId) return;
    const timeout = setTimeout(() => { saveInvestmentItems(userId); }, 2000);
    return () => clearTimeout(timeout);
  }, [investmentItems, userId]);

  useEffect(() => {
    if (!userId) return;
    const timeout = setTimeout(() => { saveGoals(userId); }, 2000);
    return () => clearTimeout(timeout);
  }, [goals, userId]);

  useEffect(() => {
    if (userId) { loadUserItems(userId); }
  }, [userId]);

  const formatCurrency = (amount: number) => {
    const decimals = ['JPY', 'KRW', 'VND', 'IDR'].includes(selectedCurrency) ? 0 : 2;
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount);
  };

  const getManualAnalysis = () => {
    if (distributionMethod !== 'manual') return '';
    if (totalIncome <= 0) return isArabic ? 'أدخل المدخول لبدء التحليل.' : 'Enter income to start analysis.';
    const expenses = parseFloat(manualExpenses.replace(/[^\d.]/g, '')) || 0;
    const savings = parseFloat(manualSavings.replace(/[^\d.]/g, '')) || 0;
    const investment = parseFloat(manualInvestment.replace(/[^\d.]/g, '')) || 0;
    const plannedTotal = expenses + savings + investment;
    if (plannedTotal === 0) return isArabic ? 'املأ المصروفات والمدخرات والاستثمار.' : 'Fill expenses, savings, and investment.';
    const difference = totalIncome - plannedTotal;
    const balanceNote = difference > 0 ? (isArabic ? `يوجد مبلغ غير موزع: ${formatCurrency(difference)} ${getCurrentCurrency().symbol}.` : `Unallocated: ${formatCurrency(difference)} ${getCurrentCurrency().symbol}.`) : difference < 0 ? (isArabic ? `الخطة تتجاوز دخلك بـ ${formatCurrency(Math.abs(difference))} ${getCurrentCurrency().symbol}.` : `Plan exceeds income by ${formatCurrency(Math.abs(difference))} ${getCurrentCurrency().symbol}.`) : (isArabic ? 'تم توزيع كامل الدخل.' : 'Full income allocated.');
    return balanceNote;
  };

  const getRandomAdvice = () => {
    const adviceList = isArabic ? ARABIC_ADVICE : ENGLISH_ADVICE;
    setRandomAdvice(adviceList[Math.floor(Math.random() * adviceList.length)]);
    setShowAdvice(true);
  };

  const handlePrint = () => window.print();

  const handleReset = () => {
    setSalary(''); setSalaryNumber(0); setOtherIncome(''); setOtherIncomeNumber(0);
    setDistributionMethod('70-20-10'); setManualExpenses(''); setManualSavings(''); setManualInvestment('');
    setIncludeCharity(false); setSelectedCharityTypes([]); setCharityPercentages({}); setTotalCharityPercentage(0);
    setShowAdvice(false); setRandomAdvice(null); setExpenseItems([]); setSavingsItems([]);
    setInvestmentItems([]); setGoals([]); setExpensesExpanded(false); setSavingsExpanded(false); setInvestmentExpanded(false); setManualWarning(false);
  };

  const addExpenseItem = () => { setExpenseItems([...expenseItems, { id: generateId(), name: '', amount: '' }]); setExpensesExpanded(true); };
  const addSavingsItem = () => { setSavingsItems([...savingsItems, { id: generateId(), name: '', amount: '' }]); setSavingsExpanded(true); };
  const addInvestmentItem = () => { setInvestmentItems([...investmentItems, { id: generateId(), name: '', amount: '' }]); setInvestmentExpanded(true); };
  const updateExpenseItem = (id: string, field: 'name' | 'amount', value: string) => setExpenseItems(expenseItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  const updateSavingsItem = (id: string, field: 'name' | 'amount', value: string) => setSavingsItems(savingsItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  const updateInvestmentItem = (id: string, field: 'name' | 'amount', value: string) => setInvestmentItems(investmentItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  const removeExpenseItem = (id: string) => setExpenseItems(expenseItems.filter(item => item.id !== id));
  const removeSavingsItem = (id: string) => setSavingsItems(savingsItems.filter(item => item.id !== id));
  const removeInvestmentItem = (id: string) => setInvestmentItems(investmentItems.filter(item => item.id !== id));

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('display_name, email, age, phone_country_code, phone_number').eq('id', uid).maybeSingle();
    if (data) setProfileData({ display_name: data.display_name || '', email: data.email || '', age: data.age || undefined, phone_country_code: data.phone_country_code || '', phone_number: data.phone_number || '' });
  };

  const loadCurrentIncomeSources = async (uid: string) => {
    setIncomeSourcesLoading(true);
    const { data } = await supabase.from('monthly_income_sources').select('id, category, label, amount').eq('user_id', uid);
    if (data) {
      const amounts: Record<string, string> = {};
      data.forEach(source => { amounts[source.category] = String(source.amount); });
      setIncomeSourceAmounts(amounts);
    }
    setIncomeSourcesLoading(false);
  };

  const saveProfile = async (uid: string) => {
    setProfileSaving(true); setProfileMessage(null);
    if (newPassword.trim()) {
      if (newPassword !== confirmNewPassword) { setProfileMessage({ type: 'error', text: isArabic ? 'كلمة المرور وتأكيدها غير متطابقين' : 'Passwords do not match' }); setProfileSaving(false); return; }
      if (newPassword.length < 6) { setProfileMessage({ type: 'error', text: isArabic ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters' }); setProfileSaving(false); return; }
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) { setProfileMessage({ type: 'error', text: passwordError.message }); setProfileSaving(false); return; }
    }
    const { error } = await supabase.from('profiles').update({ display_name: profileData.display_name, email: profileData.email, age: profileData.age, phone_country_code: profileData.phone_country_code, phone_number: profileData.phone_number }).eq('id', uid);
    if (error) { setProfileMessage({ type: 'error', text: text.profileError }); } else { setProfileMessage({ type: 'success', text: text.profileSaved }); setNewPassword(''); setConfirmNewPassword(''); }
    setProfileSaving(false);
  };

  const saveIncomeSources = async (uid: string) => {
    setProfileSaving(true); setProfileMessage(null);
    await supabase.from('monthly_income_sources').delete().eq('user_id', uid);
    const rows = INCOME_CATEGORIES.map(category => ({ user_id: uid, category: category.id, label: category.nameAr, amount: parseFloat((incomeSourceAmounts[category.id] || '').replace(/[^\d.]/g, '')) || 0 })).filter(row => row.amount > 0);
    const { error } = await supabase.from('monthly_income_sources').insert(rows);
    if (error) { setProfileMessage({ type: 'error', text: error.message }); } else { const newTotal = rows.reduce((sum, row) => sum + row.amount, 0); setSalary(String(newTotal)); setSalaryNumber(newTotal); setProfileMessage({ type: 'success', text: text.profileSaved }); setEditingIncomeSources(false); }
    setProfileSaving(false);
  };

  const loadUserItems = async (uid: string) => {
    const [expensesRes, savingsRes, investmentsRes, goalsRes] = await Promise.all([
      supabase.from('expense_items').select('id, name, amount').eq('user_id', uid),
      supabase.from('savings_items').select('id, name, amount').eq('user_id', uid),
      supabase.from('investment_items').select('id, name, amount').eq('user_id', uid),
      supabase.from('financial_goals').select('id, goal, amount, duration, duration_unit, notes').eq('user_id', uid),
    ]);
    if (expensesRes.data) setExpenseItems(expensesRes.data.map(item => ({ id: item.id, name: item.name, amount: String(item.amount) })));
    if (savingsRes.data) setSavingsItems(savingsRes.data.map(item => ({ id: item.id, name: item.name, amount: String(item.amount) })));
    if (investmentsRes.data) setInvestmentItems(investmentsRes.data.map(item => ({ id: item.id, name: item.name, amount: String(item.amount) })));
    if (goalsRes.data) setGoals(goalsRes.data.map(item => ({ id: item.id, goal: item.goal, amount: String(item.amount), duration: item.duration || '', durationUnit: (item.duration_unit as DurationUnit) || 'month', notes: item.notes || '' })));
  };

  const saveExpenseItems = async (uid: string) => {
    await supabase.from('expense_items').delete().eq('user_id', uid);
    const rows = expenseItems.filter(item => item.name.trim() && item.amount).map(item => ({ user_id: uid, name: item.name, amount: parseFloat(item.amount.replace(/[^\d.]/g, '')) || 0 }));
    if (rows.length > 0) await supabase.from('expense_items').insert(rows);
  };

  const saveSavingsItems = async (uid: string) => {
    await supabase.from('savings_items').delete().eq('user_id', uid);
    const rows = savingsItems.filter(item => item.name.trim() && item.amount).map(item => ({ user_id: uid, name: item.name, amount: parseFloat(item.amount.replace(/[^\d.]/g, '')) || 0 }));
    if (rows.length > 0) await supabase.from('savings_items').insert(rows);
  };

  const saveInvestmentItems = async (uid: string) => {
    await supabase.from('investment_items').delete().eq('user_id', uid);
    const rows = investmentItems.filter(item => item.name.trim() && item.amount).map(item => ({ user_id: uid, name: item.name, amount: parseFloat(item.amount.replace(/[^\d.]/g, '')) || 0 }));
    if (rows.length > 0) await supabase.from('investment_items').insert(rows);
  };

  const saveGoals = async (uid: string) => {
    await supabase.from('financial_goals').delete().eq('user_id', uid);
    const rows = goals.filter(item => item.goal.trim()).map(item => ({ user_id: uid, goal: item.goal, amount: parseFloat(item.amount.replace(/[^\d.]/g, '')) || 0, duration: item.duration, duration_unit: item.durationUnit, notes: item.notes }));
    if (rows.length > 0) await supabase.from('financial_goals').insert(rows);
  };

  const addGoal = () => setGoals([...goals, { id: generateId(), goal: '', amount: '', duration: '', durationUnit: 'month', notes: '' }]);
  const updateGoal = (id: string, field: keyof GoalEntry, value: string) => setGoals(goals.map(goal => goal.id === id ? { ...goal, [field]: value } : goal));
  const removeGoal = (id: string) => setGoals(goals.filter(goal => goal.id !== id));

  const getAIAdvice = (): string => {
    if (totalIncome === 0) return isArabic ? 'أدخل مدخولك للحصول على نصائح مالية مخصصة' : 'Enter your income to get personalized financial tips';
    const currency = getCurrentCurrency();
    const incomeInCurrency = `${formatCurrency(totalIncome)} ${currency.symbol}`;
    if (['KWD', 'BHD', 'OMR'].includes(selectedCurrency)) {
      if (totalIncome < 500) return isArabic ? `مدخولك ${incomeInCurrency} جيد. ركز على تقليل المصاريف وبحث عن فرص إضافية.` : `Your income of ${incomeInCurrency} is good. Focus on reducing expenses.`;
      if (totalIncome < 1500) return isArabic ? `مدخولك ${incomeInCurrency} ممتاز. استثمر في صندوق طوارئ.` : `Your income of ${incomeInCurrency} is excellent. Build an emergency fund.`;
      return isArabic ? `مدخولك ${incomeInCurrency} عالي. فكر في استشارات مالية متخصصة.` : `Your income of ${incomeInCurrency} is very high. Consider specialized financial consulting.`;
    }
    if (totalIncome < 2000) return isArabic ? `مع مدخولك ${incomeInCurrency}، ركز على تقليل المصاريف.` : `With your income of ${incomeInCurrency}, focus on reducing expenses.`;
    if (totalIncome < 5000) return isArabic ? `مدخولك ${incomeInCurrency} جيد. ابدأ صندوق طوارئ لـ 3-6 أشهر.` : `Your income of ${incomeInCurrency} is good. Start an emergency fund for 3-6 months.`;
    return isArabic ? `مدخولك ${incomeInCurrency} ممتاز! فكر في استشارة مالية متخصصة.` : `Your income of ${incomeInCurrency} is excellent! Consider specialized financial consulting.`;
  };

  const getGoalSuggestion = (goal: GoalEntry): string => {
    if (!goal.amount || !goal.duration || totalIncome === 0) return '';
    const amount = parseFloat(goal.amount.replace(/[^\d.]/g, '')) || 0;
    if (amount <= 0) return '';
    const durationNum = parseInt(goal.duration.replace(/[^\d]/g, ''), 10) || 1;
    let durationMonths = goal.durationUnit === 'day' ? durationNum / 30 : goal.durationUnit === 'year' ? durationNum * 12 : durationNum;
    const monthlyRequired = amount / durationMonths;
    const savingsPerMonth = distributionMethod === 'manual' ? parseFloat(manualSavings.replace(/[^\d.]/g, '')) || 0 : totalIncome * 0.2;
    const suggestion = isArabic ? `المبلغ الشهري المطلوب: ${formatCurrency(monthlyRequired)} ${getCurrentCurrency().symbol}. ` : `Monthly needed: ${formatCurrency(monthlyRequired)} ${getCurrentCurrency().symbol}. `;
    if (monthlyRequired > savingsPerMonth) { return suggestion + (isArabic ? `يتجاوز مدخراتك. حاول تقليل المصروفات.` : `Exceeds your savings. Try reducing expenses.`); }
    return suggestion + (isArabic ? `لديك فائض شهري قدره ${formatCurrency(savingsPerMonth - monthlyRequired)}.` : `Monthly surplus: ${formatCurrency(savingsPerMonth - monthlyRequired)}.`);
  };

  return (
    <main dir={isArabic ? 'rtl' : 'ltr'} className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,_#f7faf7_0%,_#eef6ef_42%,_#dfeee7_100%)] px-4 py-6">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(120deg,rgba(0,96,72,0.10)_0,rgba(0,96,72,0.10)_1px,transparent_1px,transparent_42px)]" />
      <div className="relative max-w-5xl mx-auto space-y-6">
        {/* Ticker */}
        <div className="overflow-hidden rounded-[1.75rem] border border-emerald-900/10 bg-white/85 shadow-[0_18px_70px_rgba(0,66,54,0.12)] backdrop-blur-2xl">
          <div className="flex flex-col gap-3 border-b border-emerald-900/10 bg-emerald-950 px-4 py-3 text-white md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c4a35a] shadow-[0_0_18px_rgba(196,163,90,0.8)]" />
              <div>
                <p className="text-sm font-bold">{text.tickerTitle}</p>
                <p className="text-xs text-emerald-100/75">{tickerStatus}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={fetchTickerData} className="h-10 rounded-xl text-emerald-50 hover:bg-white/10">
                <RefreshCw className={`h-4 w-4 ${tickerLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Select value={tickerCategory} onValueChange={(value) => setTickerCategory(value as TickerCategory)}>
                <SelectTrigger className="h-10 w-[190px] border-white/15 bg-white/10 text-white [&>span]:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tickerOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/education/investments')} className="h-10 rounded-xl text-emerald-50 hover:bg-white/10 text-sm">{text.investmentTypesBtn}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/education/savings')} className="h-10 rounded-xl text-emerald-50 hover:bg-white/10 text-sm">{text.savingsTypesBtn}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/education/expenses')} className="h-10 rounded-xl text-emerald-50 hover:bg-white/10 text-sm">{text.expensesInfoBtn}</Button>
              {!isGuest && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { loadProfile(userId); loadCurrentIncomeSources(userId); setShowProfile(!showProfile); }} className="h-10 rounded-xl text-emerald-50 hover:bg-white/10 text-sm">
                  <User className="h-4 w-4 me-1" />{text.profileBtn}
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={() => { localStorage.removeItem('guest_session'); supabase.auth.signOut(); }} className="h-10 rounded-xl text-emerald-50 hover:bg-white/10 text-sm">{text.logout}</Button>
            </div>
          </div>
          <div className="relative flex overflow-hidden bg-white/80 py-3">
            <div className="flex min-w-full shrink-0 animate-[ticker_26s_linear_infinite] items-center gap-4 px-4">
              {[...tickerItems, ...tickerItems].map((item, index) => (
                <div key={`${item.nameEn}-${index}`} className="flex shrink-0 items-center gap-3 rounded-full border border-emerald-900/10 bg-white px-4 py-2 text-sm shadow-sm">
                  <span className="font-bold text-emerald-950">{isArabic ? item.nameAr : item.nameEn}</span>
                  <span className="font-mono text-slate-700" dir="ltr">{item.value}</span>
                  <span className={`font-mono text-xs font-bold ${item.positive ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">{item.change}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2 text-center md:text-start">
              <h1 className="text-4xl font-bold tracking-tight text-emerald-800 flex items-center justify-center gap-3 md:justify-start">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg"><Calculator className="w-7 h-7" /></span>
                {text.title}
              </h1>
              <p className="text-muted-foreground text-lg">{text.subtitle}</p>
              {isGuest && (
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-amber-600 font-medium">{isArabic ? '🔒 أنت تتصفح كضيف - البيانات لن تُحفظ' : '🔒 Guest mode - data will not be saved'}</p>
                  <Button
                    onClick={() => { localStorage.removeItem('guest_session'); window.location.reload(); }}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm px-4"
                  >
                    {isArabic ? '🔑 تسجيل الدخول / إنشاء حساب' : '🔑 Login / Register'}
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-slate-900/5 p-2">
              {username && <span className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-800">{username}</span>}
              <Languages className="h-5 w-5 text-emerald-700" />
              <Select value={language} onValueChange={(value) => setLanguage(value as 'ar' | 'en')}>
                <SelectTrigger className="h-10 w-[150px] border-white/70 bg-white/80"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Profile Card - only for logged in */}
        {showProfile && !isGuest && (
          <Card className="border-emerald-200">
            <CardHeader className="bg-emerald-50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-emerald-700"><User className="w-6 h-6" />{text.profileTitle}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{text.profileName}</Label>
                  <Input value={profileData.display_name || ''} onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{text.profileEmail}</Label>
                  <div className="h-10 flex items-center px-3 bg-slate-100 rounded-md border"><span className="text-sm">{profileData.email || '-'}</span></div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{text.newPassword}</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={text.newPasswordHint} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'}</Label>
                <Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} dir="ltr" />
              </div>
              {profileMessage && <div className={`p-3 rounded-lg text-sm ${profileMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{profileMessage.text}</div>}
              <Button onClick={() => saveProfile(userId)} disabled={profileSaving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                {profileSaving ? '...' : (isArabic ? 'حفظ التغييرات' : 'Save changes')}
              </Button>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-emerald-700">{text.incomeSourcesTitle}</h3>
                  <Button variant="outline" size="sm" onClick={() => { if (!editingIncomeSources) loadCurrentIncomeSources(userId); setEditingIncomeSources(!editingIncomeSources); }} className="border-emerald-300">
                    <Coins className="w-4 h-4 me-1" />{text.updateIncome}
                  </Button>
                </div>
                {editingIncomeSources && (
                  <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
                    {incomeSourcesLoading ? <p className="text-center py-4">...</p> : (
                      <>
                        {INCOME_CATEGORIES.map(category => (
                          <div key={category.id} className="flex gap-3 items-center">
                            <span className="flex-1 text-sm font-medium">{category.nameAr}</span>
                            <Input type="text" value={incomeSourceAmounts[category.id] || ''} onChange={(e) => setIncomeSourceAmounts({ ...incomeSourceAmounts, [category.id]: e.target.value })} placeholder="0.00" className="w-32 h-8 text-sm" dir="ltr" />
                          </div>
                        ))}
                        <Button onClick={() => saveIncomeSources(userId)} disabled={profileSaving} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                          {profileSaving ? '...' : text.profileSave}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Salary Input */}
        <Card className="border-emerald-200">
          <CardHeader className="bg-emerald-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-emerald-700"><Coins className="w-6 h-6" />{text.salaryTitle}</CardTitle>
            <CardDescription>{text.salaryDesc}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-lg font-medium flex items-center gap-2"><Globe className="w-5 h-5" />{text.currency}</Label>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="h-12 text-lg"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {CURRENCIES.map(currency => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <span className="flex items-center gap-2"><span className="font-bold min-w-[60px]">{currency.symbol}</span><span>{currency.nameAr}</span><span className="text-muted-foreground text-sm">({currency.code})</span></span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{text.monthlySalary}</Label>
                <div className="flex items-center gap-2 h-14 rounded-xl border border-input bg-background px-4">
                  <span className="text-muted-foreground font-medium text-lg">{getCurrentCurrency().symbol}</span>
                  <input
                    type="text"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-xl font-bold outline-none text-center"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{text.otherIncome}</Label>
                <div className="flex items-center gap-2 h-14 rounded-xl border border-input bg-background px-4">
                  <span className="text-muted-foreground font-medium text-lg">{getCurrentCurrency().symbol}</span>
                  <input
                    type="text"
                    value={otherIncome}
                    onChange={(e) => setOtherIncome(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-xl font-bold outline-none text-center"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-center">
              <span className="text-sm text-emerald-700">{text.totalIncome}</span>
              <p className="text-3xl font-bold text-emerald-800">{formatCurrency(totalIncome)} {getCurrentCurrency().symbol}</p>
            </div>
            <div className="space-y-3">
              <Label className="text-lg font-medium">{text.distributionMethod}</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {[{ value: '70-20-10', label: text.plan70 }, { value: '60-30-10', label: text.plan60Savings }, { value: '60-20-20', label: text.plan60Invest }, { value: 'manual', label: text.manualPlan }].map(option => (
                  <button key={option.value} type="button" onClick={() => setDistributionMethod(option.value as typeof distributionMethod)} className={`rounded-2xl border p-4 text-start text-sm font-semibold transition-all ${distributionMethod === option.value ? 'border-emerald-500 bg-emerald-600 text-white shadow-lg' : 'border-slate-200 bg-white/80 text-slate-700 hover:border-emerald-300'}`}>{option.label}</button>
                ))}
              </div>
            </div>
            {distributionMethod === 'manual' && (
              <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                <p className="text-sm text-amber-800">{text.manualDesc}</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2"><Label>{text.manualExpenses}</Label><Input value={manualExpenses} onChange={(e) => setManualExpenses(e.target.value)} placeholder="0.00" dir="ltr" /></div>
                  <div className="space-y-2"><Label>{text.manualSavings}</Label><Input value={manualSavings} onChange={(e) => setManualSavings(e.target.value)} placeholder="0.00" dir="ltr" /></div>
                  <div className="space-y-2"><Label>{text.manualInvestment}</Label><Input value={manualInvestment} onChange={(e) => setManualInvestment(e.target.value)} placeholder="0.00" dir="ltr" /></div>
                </div>
                <div className="rounded-xl border border-amber-300 bg-white/80 p-3 text-sm text-amber-900"><strong>{text.aiBestChoice}: </strong>{getManualAnalysis()}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charity */}
        <Card className="border-rose-200">
          <CardHeader className="bg-rose-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-rose-700"><Heart className="w-6 h-6" />{text.charityTitle}</CardTitle>
            <CardDescription>{text.charityDesc}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-medium cursor-pointer">{text.charityToggle}</Label>
              <Switch checked={includeCharity} onCheckedChange={setIncludeCharity} />
            </div>
            {includeCharity && (
              <div className="space-y-3">
                <Label className="font-medium">{text.charityPercent}: {totalCharityPercentage}%</Label>
                <div className="space-y-2 pt-2">
                  <Label className="font-medium">{text.charityTypes}</Label>
                  <div className="flex flex-wrap gap-2">
                    {CHARITY_TYPE_OPTIONS.map(type => (
                      <button key={type} type="button" onClick={() => {
                        if (selectedCharityTypes.includes(type)) {
                          setSelectedCharityTypes(selectedCharityTypes.filter(t => t !== type));
                          const newP = { ...charityPercentages }; delete newP[type]; setCharityPercentages(newP);
                          setTotalCharityPercentage(Object.values({ ...charityPercentages, [type]: 0 }).reduce((a, b) => a + b, 0) - (charityPercentages[type] || 0));
                        } else {
                          setSelectedCharityTypes([...selectedCharityTypes, type]);
                          setCharityPercentages({ ...charityPercentages, [type]: 0 });
                        }
                      }} className={`px-3 py-2 text-sm rounded-xl border transition-all ${selectedCharityTypes.includes(type) ? 'bg-rose-600 text-white border-rose-600' : 'bg-white border-slate-200 hover:border-rose-300'}`}>
                        {type === 'sadaqah' ? text.charitySadaqah : type === 'zakat' ? text.charityZakat : type === 'sacrifice' ? text.charitySacrifice : type === 'expiation' ? text.charityExpiation : text.charityOther}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedCharityTypes.map(type => (
                  <div key={type} className="space-y-2 p-3 bg-rose-50/50 rounded-lg">
                    <div className="flex justify-between"><span className="text-sm font-medium">{type === 'sadaqah' ? text.charitySadaqah : type === 'zakat' ? text.charityZakat : type === 'sacrifice' ? text.charitySacrifice : type === 'expiation' ? text.charityExpiation : text.charityOther}</span><span className="text-sm font-bold text-rose-600">{charityPercentages[type] || 0}%</span></div>
                    <Slider value={[charityPercentages[type] || 0]} onValueChange={(value) => { const newP = { ...charityPercentages, [type]: value[0] }; setCharityPercentages(newP); setTotalCharityPercentage(Math.min(Object.values(newP).reduce((a, b) => a + b, 0), 20)); }} max={Math.max(20 - totalCharityPercentage + (charityPercentages[type] || 0), 1)} min={0} step={0.5} className="py-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Salary Details */}
        <Card className="border-emerald-200">
          <CardHeader className="bg-emerald-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-emerald-700"><Wallet className="w-6 h-6" />{text.salaryDetails}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="p-4 bg-emerald-50 rounded-xl border-2 border-emerald-300 text-center">
              <span className="text-sm text-emerald-600">{text.totalSalary}</span>
              <p className="text-3xl font-bold text-emerald-700">{formatCurrency(totalIncome)} {getCurrentCurrency().symbol}</p>
            </div>

            {/* Expenses */}
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setExpensesExpanded(!expensesExpanded)}>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-500" /><span className="font-semibold text-green-700">{text.expenses}</span></div>
                <div className="flex items-center gap-2"><span className="text-xl font-bold text-green-800">{formatCurrency(breakdown.expenses)} {getCurrentCurrency().symbol}</span>{expensesExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</div>
              </div>
              <Button onClick={addExpenseItem} variant="ghost" size="sm" className="w-full mt-2 text-green-600 hover:bg-green-100"><Plus className="w-4 h-4 ms-1" /> {text.addExpense}</Button>
              {expensesExpanded && (
                <div className="mt-3 space-y-3">
                  <div className="p-3 bg-green-100/50 rounded-lg">
                    <p className="text-xs font-semibold text-green-600 mb-2">{text.aiExpenses}</p>
                    <div className="flex flex-wrap gap-1">
                      {EXPENSES_EXAMPLES.map((ex, i) => <button key={i} onClick={() => setExpenseItems([...expenseItems, { id: generateId(), name: language === 'ar' ? ex.name : ex.nameEn, amount: '' }])} className="px-2 py-1 text-xs bg-white rounded-full border border-green-200 hover:bg-green-50">{ex.icon} {language === 'ar' ? ex.name : ex.nameEn}</button>)}
                    </div>
                  </div>
                  {expenseItems.map(item => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <Input placeholder={text.expenseNamePlaceholder} value={item.name} onChange={(e) => updateExpenseItem(item.id, 'name', e.target.value)} className="flex-1 h-8 text-sm" />
                      <Input placeholder={text.amountPlaceholder} type="text" value={item.amount} onChange={(e) => updateExpenseItem(item.id, 'amount', e.target.value)} className="w-32 h-8 text-sm" dir="ltr" />
                      <Button variant="ghost" size="icon" onClick={() => removeExpenseItem(item.id)} className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Savings */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setSavingsExpanded(!savingsExpanded)}>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-500" /><span className="font-semibold text-blue-700">{text.savings}</span></div>
                <div className="flex items-center gap-2"><span className="text-xl font-bold text-blue-800">{formatCurrency(breakdown.savings)} {getCurrentCurrency().symbol}</span>{savingsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</div>
              </div>
              <Button onClick={addSavingsItem} variant="ghost" size="sm" className="w-full mt-2 text-blue-600 hover:bg-blue-100"><Plus className="w-4 h-4 ms-1" /> {text.addSaving}</Button>
              {savingsExpanded && (
                <div className="mt-3 space-y-3">
                  <div className="p-3 bg-blue-100/50 rounded-lg">
                    <p className="text-xs font-semibold text-blue-600 mb-2">{text.aiSavings}</p>
                    <div className="flex flex-wrap gap-1">
                      {SAVINGS_EXAMPLES.map((ex, i) => <button key={i} onClick={() => setSavingsItems([...savingsItems, { id: generateId(), name: language === 'ar' ? ex.name : ex.nameEn, amount: '' }])} className="px-2 py-1 text-xs bg-white rounded-full border border-blue-200 hover:bg-blue-50">{ex.icon} {language === 'ar' ? ex.name : ex.nameEn}</button>)}
                    </div>
                  </div>
                  {savingsItems.map(item => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <Input placeholder={text.savingNamePlaceholder} value={item.name} onChange={(e) => updateSavingsItem(item.id, 'name', e.target.value)} className="flex-1 h-8 text-sm" />
                      <Input placeholder={text.amountPlaceholder} type="text" value={item.amount} onChange={(e) => updateSavingsItem(item.id, 'amount', e.target.value)} className="w-32 h-8 text-sm" dir="ltr" />
                      <Button variant="ghost" size="icon" onClick={() => removeSavingsItem(item.id)} className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Investment */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setInvestmentExpanded(!investmentExpanded)}>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-amber-500" /><span className="font-semibold text-amber-700">{text.investment}</span></div>
                <div className="flex items-center gap-2"><span className="text-xl font-bold text-amber-800">{formatCurrency(breakdown.investment)} {getCurrentCurrency().symbol}</span>{investmentExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</div>
              </div>
              <Button onClick={addInvestmentItem} variant="ghost" size="sm" className="w-full mt-2 text-amber-600 hover:bg-amber-100"><Plus className="w-4 h-4 ms-1" /> {text.addInvestment}</Button>
              {investmentExpanded && (
                <div className="mt-3 space-y-3">
                  <div className="p-3 bg-amber-100/50 rounded-lg">
                    <p className="text-xs font-semibold text-amber-600 mb-2">{text.aiInvestment}</p>
                    <div className="flex flex-wrap gap-1">
                      {INVESTMENT_EXAMPLES.map((ex, i) => <button key={i} onClick={() => setInvestmentItems([...investmentItems, { id: generateId(), name: language === 'ar' ? ex.name : ex.nameEn, amount: '' }])} className="px-2 py-1 text-xs bg-white rounded-full border border-amber-200 hover:bg-amber-50">{ex.icon} {language === 'ar' ? ex.name : ex.nameEn}</button>)}
                    </div>
                  </div>
                  {investmentItems.map(item => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <Input placeholder={text.investmentNamePlaceholder} value={item.name} onChange={(e) => updateInvestmentItem(item.id, 'name', e.target.value)} className="flex-1 h-8 text-sm" />
                      <Input placeholder={text.amountPlaceholder} type="text" value={item.amount} onChange={(e) => updateInvestmentItem(item.id, 'amount', e.target.value)} className="w-32 h-8 text-sm" dir="ltr" />
                      <Button variant="ghost" size="icon" onClick={() => removeInvestmentItem(item.id)} className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Charity display */}
            {includeCharity && breakdown.charity > 0 && (
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-rose-500" /><span className="font-semibold text-rose-700">{text.charity}</span><span className="text-rose-600 font-bold">{totalCharityPercentage}%</span></div>
                  <span className="text-xl font-bold text-rose-800">{formatCurrency(breakdown.charity)} {getCurrentCurrency().symbol}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card className="border-purple-200">
          <CardHeader className="bg-purple-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-purple-700"><Target className="w-6 h-6" />{text.goalsTitle}</CardTitle>
            <CardDescription>{text.goalsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <Button onClick={addGoal} variant="outline" className="w-full border-purple-300 hover:bg-purple-100"><Plus className="w-5 h-5 ms-2" />{text.addGoal}</Button>
            {goals.map(goal => (
              <div key={goal.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground"><Target className="w-3 h-3 inline me-1" />{text.goal}</Label><Input placeholder={text.goalNamePlaceholder} value={goal.goal} onChange={(e) => updateGoal(goal.id, 'goal', e.target.value)} className="h-10" /></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground"><Banknote className="w-3 h-3 inline me-1" />{text.amount}</Label><Input placeholder="0.00" type="text" value={goal.amount} onChange={(e) => updateGoal(goal.id, 'amount', e.target.value)} className="h-10" dir="ltr" /></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground"><Calendar className="w-3 h-3 inline me-1" />{text.duration}</Label>
                    <div className="flex gap-1">
                      <Input placeholder="0" type="number" value={goal.duration} onChange={(e) => updateGoal(goal.id, 'duration', e.target.value)} className="h-10 w-20" dir="ltr" />
                      <Select value={goal.durationUnit} onValueChange={(value) => updateGoal(goal.id, 'durationUnit', value)}>
                        <SelectTrigger className="h-10 w-24"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="day">{text.durationUnitDay}</SelectItem><SelectItem value="month">{text.durationUnitMonth}</SelectItem><SelectItem value="year">{text.durationUnitYear}</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">{text.notes}</Label><Input placeholder={text.notesPlaceholder} value={goal.notes} onChange={(e) => updateGoal(goal.id, 'notes', e.target.value)} className="h-10" /></div>
                  <div className="flex items-end"><Button variant="ghost" size="icon" onClick={() => removeGoal(goal.id)} className="h-10 w-10 text-red-500"><Trash2 className="w-4 h-4" /></Button></div>
                </div>
                {goal.amount && goal.duration && totalIncome > 0 && (
                  <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs font-semibold text-purple-600 mb-1">{text.goalSuggestion}</p>
                    <p className="text-sm text-purple-800">{getGoalSuggestion(goal)}</p>
                  </div>
                )}
              </div>
            ))}
            {goals.length === 0 && <div className="text-center py-8 text-muted-foreground"><Goal className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>{text.noGoals}</p><p className="text-sm">{text.noGoalsHint}</p></div>}
          </CardContent>
        </Card>

        {/* Advice */}
        <Card className="border-purple-200">
          <CardHeader className="bg-purple-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-purple-700"><Sparkles className="w-6 h-6" />{text.adviceTitle}</CardTitle>
            <CardDescription>{text.adviceDesc}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200"><p className="text-lg leading-relaxed text-purple-900">{getAIAdvice()}</p></div>
            <Button onClick={getRandomAdvice} variant="outline" className="w-full border-purple-300 hover:bg-purple-100"><Lightbulb className="w-5 h-5 ms-2" />{text.randomAdvice}</Button>
            {showAdvice && randomAdvice && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{randomAdvice.icon}</span>
                  <div><h4 className="font-bold text-amber-800 mb-1">{randomAdvice.category}</h4><p className="text-amber-900">{randomAdvice.tip}</p></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button onClick={handlePrint} variant="outline" size="lg" className="border-emerald-300 hover:bg-emerald-50"><Printer className="w-5 h-5 ms-2" />{text.print}</Button>
          <Button onClick={handleReset} variant="outline" size="lg" className="border-slate-300 hover:bg-slate-50"><RefreshCw className="w-5 h-5 ms-2" />{text.reset}</Button>
        </div>

        <div className="mt-8 pt-8 border-t border-emerald-200 text-center text-sm text-muted-foreground">
          <p className="mb-1">{text.footer}</p>
          <div className="flex items-center justify-center gap-2">
            <span className="w-24 h-px bg-emerald-300"></span>
            <span className="text-emerald-600 font-medium">powered by M.Q</span>
            <span className="w-24 h-px bg-emerald-300"></span>
          </div>
        </div>
      </div>
    </main>
  );
}
