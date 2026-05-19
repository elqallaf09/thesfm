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
  const [smartPanel, setSmartPanel] = useState<string>('');
  const [smartText, setSmartText] = useState<string>('');
  const [userProjects, setUserProjects] = useState<Array<{id:string;name:string;emoji:string;budget:string}>>([]);

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
  const [percentCalc, setPercentCalc] = useState<number>(10);
  const [percentAmount, setPercentAmount] = useState<string>('');

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

  const handlePrint = () => {
    const cur = getCurrentCurrency().symbol;
    const date = new Date().toLocaleDateString('ar-SA');
    const sr = totalIncome > 0 ? (breakdown.savings / totalIncome * 100).toFixed(0) : '0';
    const er = totalIncome > 0 ? (breakdown.expenses / totalIncome * 100).toFixed(0) : '0';
    const ir = totalIncome > 0 ? (breakdown.investment / totalIncome * 100).toFixed(0) : '0';
    const score = Math.min(100, Math.round(
      (Number(sr)>=20?30:Number(sr)>=10?20:10)+
      (Number(er)<=50?25:Number(er)<=65?15:5)+
      (Number(ir)>=10?25:Number(ir)>=5?15:5)+
      (goals.length>0?10:0)+(expenseItems.length>0?10:0)
    ));
    const scoreColor = score>=75?'#2d8a4e':score>=50?'#c4a35a':'#c0392b';
    const ms = breakdown.savings + breakdown.investment;
    const yearlyGrowth = formatCurrency(ms * 12);
    const totalExpActual = expenseItems.reduce((s,i)=>s+(parseFloat(i.amount.replace(/[^\d.]/g,''))||0),0);

    const expRows = expenseItems.length > 0 ? expenseItems.map(i => {
      const amt = parseFloat(i.amount.replace(/[^\d.]/g,''))||0;
      return '<tr><td>' + (i.name||'—') + '</td><td class="num">' + formatCurrency(amt) + ' ' + cur + '</td></tr>';
    }).join('') : '<tr><td colspan="2" class="empty">لا توجد بنود</td></tr>';

    const savRows = savingsItems.length > 0 ? savingsItems.map(i => {
      const amt = parseFloat(i.amount.replace(/[^\d.]/g,''))||0;
      return '<tr><td>' + (i.name||'—') + '</td><td class="num green">' + formatCurrency(amt) + ' ' + cur + '</td></tr>';
    }).join('') : '<tr><td colspan="2" class="empty">لا توجد بنود</td></tr>';

    const invRows = investmentItems.length > 0 ? investmentItems.map(i => {
      const amt = parseFloat(i.amount.replace(/[^\d.]/g,''))||0;
      return '<tr><td>' + (i.name||'—') + '</td><td class="num green">' + formatCurrency(amt) + ' ' + cur + '</td></tr>';
    }).join('') : '<tr><td colspan="2" class="empty">لا توجد بنود</td></tr>';

    const goalRows = goals.length > 0 ? goals.map(g => {
      const amt = parseFloat(g.amount.replace(/[^\d.]/g,''))||0;
      const mons = ms > 0 && amt > 0 ? Math.ceil(amt/ms) : 0;
      const unitLabel = g.durationUnit==='year'?'سنة':g.durationUnit==='day'?'يوم':'شهر';
      return '<tr><td>' + (g.goal||'—') + '</td><td class="num">' + formatCurrency(amt) + ' ' + cur + '</td><td class="num">' + (mons>0?mons+' شهر':'—') + '</td></tr>';
    }).join('') : '<tr><td colspan="3" class="empty">لا توجد أهداف</td></tr>';

    const insightsList = [
      Number(sr)>=20 ? '✅ معدل ادخار ممتاز (' + sr + '%) أعلى من المتوسط' : '⚠️ ادخارك (' + sr + '%) أقل من المثالي 20%',
      Number(er)<=60 ? '✅ نسبة إنفاق معقولة (' + er + '%)' : '🔴 مصروفاتك مرتفعة (' + er + '%) - راجعها',
      Number(ir)>=10 ? '📈 استثمارك (' + ir + '%) يبني ثروتك' : '💡 زيادة استثمارك ولو 5% ترفع ثروتك',
      goals.length>0 ? '🎯 لديك ' + goals.length + ' هدف مالي - استمر!' : '🎯 أضف أهدافاً مالية لتتبع تقدمك',
    ].map(t => '<li>' + t + '</li>').join('');

    const html = '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تقرير مالي SFM</title><style>' +
      '*{margin:0;padding:0;box-sizing:border-box}' +
      'body{font-family:Arial,sans-serif;background:#fff;color:#2d1a0a;font-size:13px;direction:rtl}' +
      '.page{max-width:820px;margin:0 auto;padding:32px}' +
      '.header{background:linear-gradient(135deg,#7f5c48,#4a2e1a);color:#fff;padding:28px 32px;border-radius:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center}' +
      '.header-left h1{font-size:22px;color:#f0d080;margin-bottom:4px}' +
      '.header-left p{color:rgba(255,255,255,0.6);font-size:11px;margin-top:2px}' +
      '.score-circle{width:80px;height:80px;border-radius:50%;border:4px solid ' + scoreColor + ';display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,0.1)}' +
      '.score-num{font-size:24px;font-weight:bold;color:#fff}' +
      '.score-label{font-size:9px;color:rgba(255,255,255,0.6)}' +
      '.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}' +
      '.kpi{background:rgba(196,163,90,0.06);border:1px solid rgba(196,163,90,0.25);border-radius:12px;padding:14px;text-align:center}' +
      '.kpi-label{font-size:10px;color:rgba(45,26,10,0.5);margin-bottom:4px}' +
      '.kpi-value{font-size:18px;font-weight:bold;color:#7f5c48}' +
      '.section{margin-bottom:18px;border:1px solid rgba(196,163,90,0.25);border-radius:12px;overflow:hidden}' +
      '.section-title{background:rgba(196,163,90,0.08);padding:10px 16px;font-weight:bold;color:#7f5c48;font-size:13px;border-bottom:1px solid rgba(196,163,90,0.15)}' +
      'table{width:100%;border-collapse:collapse}' +
      'td{padding:8px 16px;border-bottom:1px solid rgba(196,163,90,0.1);font-size:12px;color:rgba(45,26,10,0.75)}' +
      'tr:last-child td{border-bottom:none}' +
      '.num{text-align:left;font-weight:bold;color:#5c3d2a}' +
      '.green{color:#2d8a4e}' +
      '.empty{text-align:center;color:rgba(45,26,10,0.3);padding:12px}' +
      '.insights{padding:14px 16px}' +
      '.insights ul{list-style:none;space-y:4px}' +
      '.insights li{padding:5px 0;font-size:12px;color:rgba(45,26,10,0.8);border-bottom:0.5px solid rgba(196,163,90,0.1)}' +
      '.insights li:last-child{border:none}' +
      '.footer{margin-top:28px;padding-top:14px;border-top:1px solid rgba(196,163,90,0.25);text-align:center;color:rgba(45,26,10,0.35);font-size:10px}' +
      '@page{margin:1.5cm}' +
      '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}' +
      '</style></head><body><div class="page">' +
      '<div class="header"><div class="header-left"><h1>📊 التقرير المالي الشهري</h1><p>المدير المالي الذكي — SFM</p><p>التاريخ: ' + date + ' | المستخدم: ' + (username||'المستخدم') + '</p></div>' +
      '<div class="score-circle"><div class="score-num">' + score + '</div><div class="score-label">الصحة المالية</div></div></div>' +
      '<div class="kpi-grid">' +
      '<div class="kpi"><div class="kpi-label">إجمالي الدخل</div><div class="kpi-value">' + formatCurrency(totalIncome) + ' ' + cur + '</div></div>' +
      '<div class="kpi"><div class="kpi-label">نسبة الادخار</div><div class="kpi-value" style="color:' + (Number(sr)>=20?'#2d8a4e':'#c4a35a') + '">' + sr + '%</div></div>' +
      '<div class="kpi"><div class="kpi-label">نسبة الاستثمار</div><div class="kpi-value" style="color:' + (Number(ir)>=10?'#2d8a4e':'#c4a35a') + '">' + ir + '%</div></div>' +
      '<div class="kpi"><div class="kpi-label">نمو سنوي متوقع</div><div class="kpi-value" style="color:#2d8a4e">' + yearlyGrowth + ' ' + cur + '</div></div>' +
      '</div>' +
      '<div class="section"><div class="section-title">💰 توزيع الدخل الشهري</div><table>' +
      '<tr><td>إجمالي الدخل</td><td class="num" style="color:#c4a35a">' + formatCurrency(totalIncome) + ' ' + cur + '</td></tr>' +
      '<tr><td>المصروفات (' + er + '%)</td><td class="num">' + formatCurrency(breakdown.expenses) + ' ' + cur + '</td></tr>' +
      '<tr><td>المدخرات (' + sr + '%)</td><td class="num green">' + formatCurrency(breakdown.savings) + ' ' + cur + '</td></tr>' +
      '<tr><td>الاستثمار (' + ir + '%)</td><td class="num green">' + formatCurrency(breakdown.investment) + ' ' + cur + '</td></tr>' +
      (breakdown.charity>0?'<tr><td>الأعمال الخيرية</td><td class="num">' + formatCurrency(breakdown.charity) + ' ' + cur + '</td></tr>':'') +
      '</table></div>' +
      '<div class="section"><div class="section-title">🛒 المصروفات</div><table>' + expRows + '<tr><td style="font-weight:bold">الإجمالي الفعلي</td><td class="num" style="color:#c4a35a">' + formatCurrency(totalExpActual) + ' ' + cur + '</td></tr></table></div>' +
      '<div class="section"><div class="section-title">🏦 المدخرات</div><table>' + savRows + '</table></div>' +
      '<div class="section"><div class="section-title">📈 الاستثمارات</div><table>' + invRows + '</table></div>' +
      '<div class="section"><div class="section-title">🎯 الأهداف المالية</div><table><tr><th style="text-align:right;padding:8px 16px;font-size:11px;color:#7f5c48">الهدف</th><th style="text-align:left;padding:8px 16px;font-size:11px;color:#7f5c48">المبلغ</th><th style="text-align:left;padding:8px 16px;font-size:11px;color:#7f5c48">المدة</th></tr>' + goalRows + '</table></div>' +
      '<div class="section"><div class="section-title">⚡ التحليل الذكي</div><div class="insights"><ul>' + insightsList + '</ul></div></div>' +
      '<div class="footer"><p>المدير المالي الذكي — يساعدك على اتخاذ قرارات مالية أوضح</p><p style="color:#c4a35a;margin-top:4px">powered by M.Q | ' + date + '</p></div>' +
      '</div><script>window.onload=function(){window.print();}<\/script></body></html>';

    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const runSmartAnalysis = (type: string) => {
    if (smartPanel === type) { setSmartPanel(''); setSmartText(''); return; }
    setSmartPanel(type);
    const cur = getCurrentCurrency().symbol;
    const sr = totalIncome > 0 ? breakdown.savings / totalIncome * 100 : 0;
    const er = totalIncome > 0 ? breakdown.expenses / totalIncome * 100 : 0;
    const ir = totalIncome > 0 ? breakdown.investment / totalIncome * 100 : 0;
    const ms = breakdown.savings + breakdown.investment;
    const score = Math.min(100, Math.round((sr>=20?30:sr>=10?20:10)+(er<=50?25:er<=65?15:5)+(ir>=10?25:ir>=5?15:5)+(goals.length>0?10:0)+(expenseItems.length>0?10:0)));
    if (type === 'analysis') {
      setSmartText([
        '📊 التحليل المالي الشامل',
        '━━━━━━━━━━━━━━━━━━━━',
        '',
        `💰 الدخل الشهري: ${formatCurrency(totalIncome)} ${cur}`,
        '',
        '📈 توزيع دخلك:',
        `  • المصروفات: ${formatCurrency(breakdown.expenses)} (${er.toFixed(0)}%) ${er>65?'⚠️ مرتفعة':'✅ معقولة'}`,
        `  • المدخرات: ${formatCurrency(breakdown.savings)} (${sr.toFixed(0)}%) ${sr>=20?'✅ ممتازة':sr>=10?'👍 جيدة':'⚠️ منخفضة'}`,
        `  • الاستثمار: ${formatCurrency(breakdown.investment)} (${ir.toFixed(0)}%) ${ir>=10?'✅ صحي':'💡 يحتاج زيادة'}`,
        '',
        '🎯 التوصيات:',
        sr<10 ? `  • ارفع ادخارك إلى 10% على الأقل (+${formatCurrency(totalIncome*0.1-breakdown.savings)} ${cur})` : '',
        er>65 ? `  • قلل مصروفاتك بـ ${formatCurrency(breakdown.expenses-totalIncome*0.6)} ${cur} شهرياً` : '',
        ir===0 ? `  • ابدأ باستثمار 5% من دخلك = ${formatCurrency(totalIncome*0.05)} ${cur}/شهر` : '',
        goals.length===0 ? '  • أضف أهدافاً مالية لتتبع تقدمك' : `  • لديك ${goals.length} هدف - ${ms>0?'متوقع تحقيقها خلال '+Math.ceil((goals.reduce((s,g)=>s+(parseFloat(g.amount.replace(/[^\d.]/g,''))||0),0))/ms)+' شهر':'ابدأ الادخار'}`,
        '',
        `⚡ الصحة المالية: ${score}/100 ${score>=75?'ممتاز 🌟':score>=50?'جيد 👍':'يحتاج تحسين ⚠️'}`,
      ].filter(Boolean).join('\n'));
    } else if (type === 'assessment') {
      setSmartText([
        '📊 تقييم وضعك المالي',
        '━━━━━━━━━━━━━━━━━━━━',
        '',
        `🏆 التقييم الكلي: ${score}/100`,
        '',
        '✅ نقاط قوتك:',
        sr>=10 ? `  • ادخار جيد ${sr.toFixed(0)}%` : '',
        ir>0 ? `  • استثمار نشط ${ir.toFixed(0)}%` : '',
        goals.length>0 ? `  • ${goals.length} هدف مالي محدد` : '',
        er<=60 ? `  • نسبة إنفاق معقولة ${er.toFixed(0)}%` : '',
        totalIncome>0 ? '' : '  • أدخل بياناتك للحصول على تقييم دقيق',
        '',
        '⚠️ نقاط الضعف:',
        sr<10 ? `  • الادخار أقل من المثالي (هدف: 20%)` : '',
        ir===0 ? '  • لا يوجد استثمار' : '',
        goals.length===0 ? '  • لا توجد أهداف مالية' : '',
        er>65 ? `  • المصروفات مرتفعة (${er.toFixed(0)}%)` : '',
        '',
        '🚀 خطة التحسين:',
        `  1. ${sr<20?`زد ادخارك بـ 2% كل شهر`:'حافظ على ادخارك الممتاز'}`,
        `  2. ${ir<10?`خصص 5-10% للاستثمار`:'نوّع محفظتك الاستثمارية'}`,
        `  3. ${goals.length===0?'أضف أهدافاً مالية واضحة':'راجع تقدمك نحو أهدافك شهرياً'}`,
      ].filter(Boolean).join('\n'));
    } else if (type === 'savingsplan') {
      const projects18 = ms>0?Math.ceil(1500/ms):0;
      const projects5k = ms>0?Math.ceil(5000/ms):0;
      const projects15k = ms>0?Math.ceil(15000/ms):0;
      setSmartText([
        '💡 خطة التوفير الذكية',
        '━━━━━━━━━━━━━━━━━━━━',
        '',
        `📅 توفيرك الحالي: ${formatCurrency(ms)} ${cur}/شهر`,
        `📆 توقع سنوي: ${formatCurrency(ms*12)} ${cur}`,
        '',
        '🎯 يمكنك تحقيق:',
        ms>0?`  • متجر إلكتروني: ${projects18} شهر`:'',
        ms>0?`  • محل تجاري: ${projects5k} شهر`:'',
        ms>0?`  • كافيه أو مطعم: ${projects15k} شهر`:'',
        '',
        goals.length>0 ? '🏆 أهدافك المالية:' : '',
        ...goals.filter(g=>g.amount).map(g=>{
          const amt = parseFloat(g.amount.replace(/[^\d.]/g,''))||0;
          return ms>0&&amt>0?`  • ${g.goal}: ${Math.ceil(amt/ms)} شهر`:`  • ${g.goal}: حدد مبلغ الادخار`;
        }),
        '',
        '⭐ نصيحة ذهبية:',
        `  لو زدت ادخارك 5% = +${formatCurrency(totalIncome*0.05)} ${cur}/شهر`,
        ms>0?`  تختصر الوقت بـ ~20% لكل هدف!`:'  ابدأ بأي مبلغ ولو صغير.',
      ].filter(l=>l!==undefined).join('\n'));
    }
  };

  const handleReset = () => {
    // Only reset calculator settings - NOT saved items or goals
    setOtherIncome(''); setOtherIncomeNumber(0);
    setDistributionMethod('70-20-10'); setManualExpenses(''); setManualSavings(''); setManualInvestment('');
    setIncludeCharity(false); setSelectedCharityTypes([]); setCharityPercentages({}); setTotalCharityPercentage(0);
    setShowAdvice(false); setRandomAdvice(null); setManualWarning(false);
    // Note: expenseItems, savingsItems, investmentItems, goals are NOT reset - they persist in DB
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
    const [expensesRes, savingsRes, investmentsRes, goalsRes, projRes] = await Promise.all([
      supabase.from('expense_items').select('id, name, amount').eq('user_id', uid),
      supabase.from('savings_items').select('id, name, amount').eq('user_id', uid),
      supabase.from('investment_items').select('id, name, amount').eq('user_id', uid),
      supabase.from('financial_goals').select('id, goal, amount, duration, duration_unit, notes').eq('user_id', uid),
      supabase.from('projects').select('id, name, emoji, budget, timeline, duration_unit, notes').eq('user_id', uid).order('created_at', { ascending: false }),
    ]);
    if (expensesRes.data) setExpenseItems(expensesRes.data.map(item => ({ id: item.id, name: item.name, amount: String(item.amount) })));
    if (savingsRes.data) setSavingsItems(savingsRes.data.map(item => ({ id: item.id, name: item.name, amount: String(item.amount) })));
    if (investmentsRes.data) setInvestmentItems(investmentsRes.data.map(item => ({ id: item.id, name: item.name, amount: String(item.amount) })));
    if (goalsRes.data) setGoals(goalsRes.data.map(item => ({ id: item.id, goal: item.goal, amount: String(item.amount), duration: item.duration || '', durationUnit: (item.duration_unit as DurationUnit) || 'month', notes: item.notes || '' })));
    if (projRes.data) setUserProjects(projRes.data.map((p:any) => ({ id: p.id, name: p.name || '', emoji: p.emoji || '🚀', budget: String(p.budget || '') })));
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
    <>
    <style>{`
      @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}.ticker-scroll{animation:ticker 30s linear infinite;display:flex;width:max-content;}
      @keyframes ringFill{from{stroke-dasharray:0 226}to{stroke-dasharray:var(--rd,0) 226}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pulse-dot{0%,100%{box-shadow:0 0 0 0 currentColor}50%{box-shadow:0 0 0 4px rgba(196,163,90,0.2)}}
      .ring-anim{animation:ringFill 1.4s cubic-bezier(0.4,0,0.2,1) 0.2s both}
      .kpi-card{animation:fadeUp 0.5s ease both}.kpi-card:nth-child(1){animation-delay:.05s}.kpi-card:nth-child(2){animation-delay:.15s}.kpi-card:nth-child(3){animation-delay:.25s}.kpi-card:nth-child(4){animation-delay:.35s}
      .ai-ins{animation:fadeUp 0.4s ease both}.ai-ins:nth-child(1){animation-delay:.1s}.ai-ins:nth-child(2){animation-delay:.2s}.ai-ins:nth-child(3){animation-delay:.3s}.ai-ins:nth-child(4){animation-delay:.4s}
      .score-val{animation:fadeUp 0.6s ease 0.4s both}
      .kpi-card:hover{transform:translateY(-3px)!important;box-shadow:0 12px 32px rgba(196,163,90,0.18)!important}
      @media print {
        body { background: white !important; }
        .no-print { display: none !important; }
        .print-only { display: block !important; }
        header, nav, button, select { display: none !important; }
        .rounded-\\[1\\.75rem\\] { display: none !important; }
        main { padding: 0 !important; background: white !important; }
        .max-w-5xl { max-width: 100% !important; }
        * { box-shadow: none !important; border-radius: 4px !important; }
        h1 { color: #7f5c48 !important; font-size: 24px !important; }
        h2, h3 { color: #7a5c1a !important; }
        .rounded-\\[2rem\\] { border: 1px solid #c4a35a !important; padding: 16px !important; margin-bottom: 12px !important; }
      }
    `}</style>
    <main dir={isArabic ? 'rtl' : 'ltr'} className="relative min-h-screen overflow-hidden px-4 py-6" style={{background: 'linear-gradient(135deg, #fffdf5 0%, #fef9e7 50%, #fdf5d0 100%)'}}>
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{backgroundImage: 'linear-gradient(120deg,rgba(196,163,90,0.15) 0,rgba(196,163,90,0.15) 1px,transparent 1px,transparent 42px)'}} />
      <div className="pointer-events-none absolute -right-24 top-0 h-[34rem] w-[34rem] rounded-full blur-3xl" style={{background: 'rgba(196,163,90,0.2)'}} />
      <div className="relative max-w-5xl mx-auto space-y-6">
        {/* Ticker */}
        <div className="overflow-hidden rounded-[1.75rem] border shadow-[0_8px_40px_rgba(196,163,90,0.25)]" style={{borderColor: 'rgba(196,163,90,0.4)', background: '#1a1228'}}>
          <div className="flex flex-col gap-3 border-b px-4 py-3 text-white md:flex-row md:items-center md:justify-between" style={{background: '#7f5c48', borderColor: 'rgba(255,255,255,0.15)', boxShadow: '0 2px 8px rgba(127,92,72,0.3), 0 4px 16px rgba(127,92,72,0.15)'}}>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f0d080] shadow-[0_0_18px_rgba(240,208,128,0.8)]" />
              <div>
                <p className="text-sm font-bold text-white">{text.tickerTitle}</p>
                <p className="text-xs text-white/70">{tickerStatus}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={fetchTickerData} className="h-10 rounded-xl text-white hover:bg-white/20">
                <RefreshCw className={`h-4 w-4 ${tickerLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Select value={tickerCategory} onValueChange={(value) => setTickerCategory(value as TickerCategory)}>
                <SelectTrigger className="h-10 w-[190px] text-white [&>span]:text-white" style={{borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.15)'}}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tickerOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/education/investments')} className="h-10 rounded-xl text-white hover:bg-white/20 text-sm">{text.investmentTypesBtn}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/education/savings')} className="h-10 rounded-xl text-white hover:bg-white/20 text-sm">{text.savingsTypesBtn}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/education/expenses')} className="h-10 rounded-xl text-white hover:bg-white/20 text-sm">{text.expensesInfoBtn}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/projects')} className="h-10 rounded-xl text-white hover:bg-white/20 text-sm">{isArabic ? 'مشروعي' : 'My Projects'}</Button>
              {!isGuest && (
                <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/profile')} className="h-10 rounded-xl text-white hover:bg-white/20 text-sm">
                  <User className="h-4 w-4 me-1" />{text.profileBtn}
                </Button>
              )}
              {isGuest ? (
                <Button type="button" size="sm" onClick={() => { localStorage.removeItem('guest_session'); window.location.reload(); }} className="h-10 rounded-xl text-sm font-bold px-4" style={{background: '#f0d080', color: '#3d2b1a'}}>
                  🔑 {isArabic ? 'تسجيل الدخول' : 'Login'}
                </Button>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => { localStorage.removeItem('guest_session'); supabase.auth.signOut(); }} className="h-10 rounded-xl text-white/70 hover:bg-white/20 text-sm">{text.logout}</Button>
              )}
            </div>
          </div>
          <div className="overflow-hidden py-3" style={{background: 'rgba(18,13,30,0.9)'}}>
            <div className="ticker-scroll items-center gap-4 px-4">
              {[...tickerItems, ...tickerItems, ...tickerItems].map((item, index) => (
                <div key={`${item.nameEn}-${index}`} className="flex shrink-0 items-center gap-3 rounded-full px-4 py-2 text-sm mx-2" style={{border: '0.5px solid rgba(196,163,90,0.3)', background: 'rgba(26,20,40,0.9)'}}>
                  <span className="font-bold" style={{color: '#c4a35a'}}>{isArabic ? item.nameAr : item.nameEn}</span>
                  <span className="font-mono text-slate-300" dir="ltr">{item.value}</span>
                  <span className={`font-mono text-xs font-bold ${item.positive ? 'text-emerald-400' : 'text-rose-400'}`} dir="ltr">{item.change}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="rounded-[2rem] p-5" style={{border: '1px solid rgba(196,163,90,0.4)', background: 'rgba(255,253,245,0.95)', boxShadow: '0 8px 40px rgba(196,163,90,0.15)'}}>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2 text-center md:text-start">
              <h1 className="text-4xl font-bold tracking-tight flex items-center justify-center gap-3 md:justify-start" style={{color: '#7a5c1a'}}>
                <span className="flex items-center justify-center">
                  <svg viewBox="0 0 300 300" width="52" height="52" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <radialGradient id="bgG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1e1e3f"/><stop offset="100%" stopColor="#0d0d1a"/></radialGradient>
                      <linearGradient id="gG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f0d080"/><stop offset="40%" stopColor="#c4a35a"/><stop offset="100%" stopColor="#9a7a30"/></linearGradient>
                      <linearGradient id="gG2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#e8c870"/><stop offset="50%" stopColor="#c4a35a"/><stop offset="100%" stopColor="#f0d080"/></linearGradient>
                    </defs>
                    <circle cx="150" cy="150" r="140" fill="url(#bgG)" stroke="url(#gG)" strokeWidth="1.5"/>
                    <circle cx="150" cy="150" r="128" fill="none" stroke="url(#gG)" strokeWidth="0.4" opacity="0.4"/>
                    <g stroke="url(#gG)" strokeWidth="1" fill="none" opacity="0.7">
                      <path d="M 58 58 L 58 72 L 72 72"/><path d="M 242 58 L 242 72 L 228 72"/>
                      <path d="M 58 242 L 58 228 L 72 228"/><path d="M 242 242 L 242 228 L 228 228"/>
                    </g>
                    <g fill="url(#gG)" opacity="0.8">
                      <polygon points="150,38 154,43 150,48 146,43"/><polygon points="150,252 154,257 150,262 146,257"/>
                      <polygon points="38,150 43,154 48,150 43,146"/><polygon points="252,150 257,154 262,150 257,146"/>
                    </g>
                    <text x="74" y="175" fontFamily="Georgia, serif" fontSize="82" fontWeight="700" fill="url(#gG)" textAnchor="middle">S</text>
                    <text x="150" y="175" fontFamily="Georgia, serif" fontSize="82" fontWeight="700" fill="url(#gG2)" textAnchor="middle">F</text>
                    <text x="226" y="175" fontFamily="Georgia, serif" fontSize="82" fontWeight="700" fill="url(#gG)" textAnchor="middle">M</text>
                    <line x1="68" y1="188" x2="232" y2="188" stroke="url(#gG)" strokeWidth="1" opacity="0.6"/>
                    <circle cx="68" cy="188" r="2.5" fill="url(#gG)" opacity="0.9"/>
                    <circle cx="150" cy="188" r="2.5" fill="url(#gG)" opacity="0.9"/>
                    <circle cx="232" cy="188" r="2.5" fill="url(#gG)" opacity="0.9"/>
                  </svg>
                </span>
                {text.title}
              </h1>
              <p className="text-lg" style={{color: 'rgba(122,92,26,0.7)'}}>{text.subtitle}</p>
              {isGuest && (
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm font-medium" style={{color: '#9a7a30'}}>🔒 {isArabic ? 'أنت تتصفح كضيف - البيانات لن تُحفظ' : 'Guest mode - data will not be saved'}</p>
                  <Button onClick={() => { localStorage.removeItem('guest_session'); window.location.reload(); }} size="sm" className="rounded-xl text-sm px-4 font-bold" style={{background: '#c4a35a', color: '#1a1228'}}>
                    🔑 {isArabic ? 'تسجيل الدخول / إنشاء حساب' : 'Login / Register'}
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl p-2" style={{background: 'rgba(196,163,90,0.1)'}}>
              {username && <span className="rounded-xl px-3 py-2 text-sm font-bold" style={{background: 'rgba(196,163,90,0.2)', color: '#7a5c1a'}}>{username}</span>}
              <Languages className="h-5 w-5" style={{color: '#c4a35a'}} />
              <Select value={language} onValueChange={(value) => setLanguage(value as 'ar' | 'en')}>
                <SelectTrigger className="h-10 w-[150px]" style={{borderColor: 'rgba(196,163,90,0.4)', background: 'white', color: '#7a5c1a'}}><SelectValue /></SelectTrigger>
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
          <Card style={{border: '1px solid rgba(196,163,90,0.35)', background: 'rgba(255,253,245,0.98)', boxShadow: '0 4px 20px rgba(196,163,90,0.1)'}}>
            <CardHeader className="rounded-t-lg" style={{background: 'rgba(196,163,90,0.08)'}}>
              <CardTitle className="flex items-center gap-2" style={{color: '#7a5c1a'}}><User className="w-6 h-6" />{text.profileTitle}</CardTitle>
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
              <Button onClick={() => saveProfile(userId)} disabled={profileSaving} className="w-full font-bold text-black" style={{background: '#c4a35a'}}>
                {profileSaving ? '...' : (isArabic ? 'حفظ التغييرات' : 'Save changes')}
              </Button>
              <div className="pt-4 border-t" style={{borderColor: 'rgba(196,163,90,0.2)'}}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold" style={{color: '#c4a35a'}}>{text.incomeSourcesTitle}</h3>
                  <Button variant="outline" size="sm" onClick={() => { if (!editingIncomeSources) loadCurrentIncomeSources(userId); setEditingIncomeSources(!editingIncomeSources); }} style={{borderColor: 'rgba(196,163,90,0.4)', color: '#c4a35a'}}>
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
                        <Button onClick={() => saveIncomeSources(userId)} disabled={profileSaving} size="sm" className="w-full font-bold text-black mt-2" style={{background: '#c4a35a'}}>
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
        <Card style={{border: '1px solid rgba(196,163,90,0.35)', background: 'rgba(255,253,245,0.98)', boxShadow: '0 4px 20px rgba(196,163,90,0.1)'}}>
          <CardHeader className="rounded-t-lg" style={{background: 'rgba(196,163,90,0.08)'}}>
            <CardTitle className="flex items-center gap-2" style={{color: '#7a5c1a'}}><Coins className="w-6 h-6" />{text.salaryTitle}</CardTitle>
            <CardDescription style={{color: 'rgba(122,92,26,0.6)'}}>{text.salaryDesc}</CardDescription>
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
            <div className="rounded-2xl p-4 text-center" style={{border: '1px solid rgba(196,163,90,0.3)', background: 'rgba(196,163,90,0.08)'}}>
              <span className="text-sm" style={{color: 'rgba(196,163,90,0.7)'}}>{text.totalIncome}</span>
              <p className="text-3xl font-bold" style={{color: '#c4a35a'}}>{formatCurrency(totalIncome)} {getCurrentCurrency().symbol}</p>
            </div>
            <div className="space-y-3">
              <Label className="text-lg font-medium" style={{color: '#c4a35a'}}>{text.distributionMethod}</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {[{ value: '70-20-10', label: text.plan70 }, { value: '60-30-10', label: text.plan60Savings }, { value: '60-20-20', label: text.plan60Invest }, { value: 'manual', label: text.manualPlan }].map(option => (
                  <button key={option.value} type="button" onClick={() => setDistributionMethod(option.value as typeof distributionMethod)}
                    className="rounded-2xl p-4 text-start text-sm font-semibold transition-all"
                    style={distributionMethod === option.value
                      ? {border: '1px solid #c4a35a', background: '#c4a35a', color: '#0d0d1a'}
                      : {border: '0.5px solid rgba(196,163,90,0.25)', background: 'rgba(196,163,90,0.05)', color: 'rgba(196,163,90,0.8)'}
                    }>{option.label}</button>
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
        <Card style={{border: '1px solid rgba(196,163,90,0.35)', background: 'rgba(255,253,245,0.98)', boxShadow: '0 4px 20px rgba(196,163,90,0.1)'}}>
          <CardHeader className="rounded-t-lg" style={{background: 'rgba(196,163,90,0.08)'}}>
            <CardTitle className="flex items-center gap-2" style={{color: '#7a5c1a'}}><Heart className="w-6 h-6" />{text.charityTitle}</CardTitle>
            <CardDescription style={{color: 'rgba(122,92,26,0.6)'}}>{text.charityDesc}</CardDescription>
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

        {/* KPI Dashboard */}
        {totalIncome > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              {
                label: isArabic ? 'معدل الادخار' : 'Savings Rate',
                value: totalIncome > 0 ? (breakdown.savings / totalIncome * 100).toFixed(0) + '%' : '0%',
                icon: '💰',
                color: breakdown.savings / totalIncome >= 0.2 ? '#2d8a4e' : breakdown.savings / totalIncome >= 0.1 ? '#c4a35a' : '#c0392b',
                sub: isArabic ? 'من إجمالي الدخل' : 'of total income',
              },
              {
                label: isArabic ? 'معدل الإنفاق' : 'Burn Rate',
                value: formatCurrency(breakdown.expenses) + ' ' + getCurrentCurrency().symbol,
                icon: '🔥',
                color: breakdown.expenses / totalIncome > 0.7 ? '#c0392b' : '#7a5c1a',
                sub: isArabic ? 'شهرياً' : 'per month',
              },
              {
                label: isArabic ? 'نمو الثروة' : 'Wealth Growth',
                value: totalIncome > 0 ? formatCurrency((breakdown.savings + breakdown.investment) * 12) : '0',
                icon: '📈',
                color: '#2d8a4e',
                sub: isArabic ? 'توقع سنوي' : 'yearly forecast',
              },
              {
                label: isArabic ? 'الصحة المالية' : 'Health Score',
                value: Math.min(100, Math.round(
                  (breakdown.savings / totalIncome >= 0.2 ? 30 : breakdown.savings / totalIncome >= 0.1 ? 20 : 10) +
                  (breakdown.expenses / totalIncome <= 0.5 ? 25 : breakdown.expenses / totalIncome <= 0.65 ? 15 : 5) +
                  (breakdown.investment / totalIncome >= 0.1 ? 25 : breakdown.investment / totalIncome >= 0.05 ? 15 : 5) +
                  (goals.length > 0 ? 10 : 0) + (expenseItems.length > 0 ? 10 : 0)
                )) + '/100',
                icon: '⚡',
                color: '#c4a35a',
                sub: isArabic ? 'تقييم شامل' : 'overall rating',
              },
            ].map((kpi, i) => (
              <div key={i} className="kpi-card rounded-2xl p-4 cursor-default"
                style={{background: 'rgba(255,253,245,0.98)', border: '1px solid rgba(196,163,90,0.25)', boxShadow: '0 4px 20px rgba(196,163,90,0.08)', transition: 'all 0.2s ease'}}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{kpi.icon}</span>
                  <div className="w-2 h-2 rounded-full mt-1" style={{background: kpi.color, boxShadow: `0 0 8px ${kpi.color}`}} />
                </div>
                <p className="text-xs mb-1" style={{color: 'rgba(122,92,26,0.55)'}}>{kpi.label}</p>
                <p className="text-xl font-bold leading-tight" style={{color: kpi.color}}>{kpi.value}</p>
                <p className="text-xs mt-1" style={{color: 'rgba(122,92,26,0.4)'}}>{kpi.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Salary Details */}
        <Card style={{border: '1px solid rgba(196,163,90,0.35)', background: 'rgba(255,253,245,0.98)', boxShadow: '0 4px 20px rgba(196,163,90,0.1)'}}>
          <CardHeader className="rounded-t-lg" style={{background: 'rgba(196,163,90,0.08)'}}>
            <CardTitle className="flex items-center gap-2" style={{color: '#7a5c1a'}}><Wallet className="w-6 h-6" />{text.salaryDetails}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="p-4 rounded-xl text-center" style={{border: '2px solid rgba(196,163,90,0.4)', background: 'rgba(196,163,90,0.08)'}}>
              <span className="text-sm" style={{color: 'rgba(122,92,26,0.7)'}}>{text.totalSalary}</span>
              <p className="text-3xl font-bold" style={{color: '#7a5c1a'}}>{formatCurrency(totalIncome)} {getCurrentCurrency().symbol}</p>
            </div>

            {/* Expenses */}
            <div className="p-4 rounded-xl" style={{background: 'rgba(139,90,60,0.06)', border: '1px solid rgba(139,90,60,0.2)'}}>
              <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setExpensesExpanded(!expensesExpanded)}>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{background: '#7f5c48'}} /><span className="font-semibold" style={{color: '#7f5c48'}}>{text.expenses}</span></div>
                <div className="flex items-center gap-2"><span className="text-xl font-bold" style={{color: '#7f5c48'}}>{formatCurrency(breakdown.expenses)} {getCurrentCurrency().symbol}</span>{expensesExpanded ? <ChevronUp className="w-5 h-5" style={{color: '#7f5c48'}} /> : <ChevronDown className="w-5 h-5" style={{color: '#7f5c48'}} />}</div>
              </div>
              <Button onClick={addExpenseItem} variant="ghost" size="sm" className="w-full mt-2" style={{color: '#7f5c48'}}><Plus className="w-4 h-4 ms-1" /> {text.addExpense}</Button>
              {expensesExpanded && (
                <div className="mt-3 space-y-3">
                  <div className="p-3 rounded-lg" style={{background: 'rgba(127,92,72,0.08)'}}>
                    <p className="text-xs font-semibold mb-2" style={{color: '#7f5c48'}}>{text.aiExpenses}</p>
                    <div className="flex flex-wrap gap-1">
                      {EXPENSES_EXAMPLES.map((ex, i) => <button key={i} onClick={() => setExpenseItems([...expenseItems, { id: generateId(), name: language === 'ar' ? ex.name : ex.nameEn, amount: '' }])} className="px-2 py-1 text-xs rounded-full" style={{background: 'white', border: '0.5px solid rgba(127,92,72,0.3)', color: '#7f5c48'}}>{ex.icon} {language === 'ar' ? ex.name : ex.nameEn}</button>)}
                    </div>
                  </div>
                  {expenseItems.map(item => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <Input placeholder={text.expenseNamePlaceholder} value={item.name} onChange={(e) => updateExpenseItem(item.id, 'name', e.target.value)} className="flex-1 h-8 text-sm" style={{borderColor: 'rgba(127,92,72,0.3)'}} />
                      <Input placeholder={text.amountPlaceholder} type="text" value={item.amount} onChange={(e) => updateExpenseItem(item.id, 'amount', e.target.value)} className="w-32 h-8 text-sm" dir="ltr" style={{borderColor: 'rgba(127,92,72,0.3)'}} />
                      <Button variant="ghost" size="icon" onClick={() => removeExpenseItem(item.id)} className="h-8 w-8 text-red-400"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  {expenseItems.length > 0 && <div className="flex justify-end pt-2" style={{borderTop: '0.5px solid rgba(127,92,72,0.2)'}}><span className="text-sm font-semibold" style={{color: '#7f5c48'}}>{text.sumExpenses}: {formatCurrency(expenseItems.reduce((sum, item) => sum + (parseFloat(item.amount.replace(/[^\d.]/g, '')) || 0), 0))} {getCurrentCurrency().symbol}</span></div>}
                </div>
              )}
            </div>

            {/* Savings */}
            <div className="p-4 rounded-xl" style={{background: 'rgba(196,163,90,0.06)', border: '1px solid rgba(196,163,90,0.25)'}}>
              <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setSavingsExpanded(!savingsExpanded)}>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-[#c4a35a]" /><span className="font-semibold" style={{color: '#7a5c1a'}}>{text.savings}</span></div>
                <div className="flex items-center gap-2"><span className="text-xl font-bold" style={{color: '#7a5c1a'}}>{formatCurrency(breakdown.savings)} {getCurrentCurrency().symbol}</span>{savingsExpanded ? <ChevronUp className="w-5 h-5" style={{color: '#c4a35a'}} /> : <ChevronDown className="w-5 h-5" style={{color: '#c4a35a'}} />}</div>
              </div>
              <Button onClick={addSavingsItem} variant="ghost" size="sm" className="w-full mt-2" style={{color: '#7a5c1a'}}><Plus className="w-4 h-4 ms-1" /> {text.addSaving}</Button>
              {savingsExpanded && (
                <div className="mt-3 space-y-3">
                  <div className="p-3 rounded-lg" style={{background: 'rgba(196,163,90,0.08)'}}>
                    <p className="text-xs font-semibold mb-2" style={{color: '#7a5c1a'}}>{text.aiSavings}</p>
                    <div className="flex flex-wrap gap-1">
                      {SAVINGS_EXAMPLES.map((ex, i) => <button key={i} onClick={() => setSavingsItems([...savingsItems, { id: generateId(), name: language === 'ar' ? ex.name : ex.nameEn, amount: '' }])} className="px-2 py-1 text-xs rounded-full" style={{background: 'white', border: '0.5px solid rgba(196,163,90,0.3)', color: '#7a5c1a'}}>{ex.icon} {language === 'ar' ? ex.name : ex.nameEn}</button>)}
                    </div>
                  </div>
                  {savingsItems.map(item => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <Input placeholder={text.savingNamePlaceholder} value={item.name} onChange={(e) => updateSavingsItem(item.id, 'name', e.target.value)} className="flex-1 h-8 text-sm" style={{borderColor: 'rgba(196,163,90,0.3)'}} />
                      <Input placeholder={text.amountPlaceholder} type="text" value={item.amount} onChange={(e) => updateSavingsItem(item.id, 'amount', e.target.value)} className="w-32 h-8 text-sm" dir="ltr" style={{borderColor: 'rgba(196,163,90,0.3)'}} />
                      <Button variant="ghost" size="icon" onClick={() => removeSavingsItem(item.id)} className="h-8 w-8 text-red-400"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  {savingsItems.length > 0 && <div className="flex justify-end pt-2" style={{borderTop: '0.5px solid rgba(196,163,90,0.2)'}}><span className="text-sm font-semibold" style={{color: '#7a5c1a'}}>{text.sumSavings}: {formatCurrency(savingsItems.reduce((sum, item) => sum + (parseFloat(item.amount.replace(/[^\d.]/g, '')) || 0), 0))} {getCurrentCurrency().symbol}</span></div>}
                </div>
              )}
            </div>

            {/* Investment */}
            <div className="p-4 rounded-xl" style={{background: 'rgba(180,140,60,0.06)', border: '1px solid rgba(180,140,60,0.2)'}}>
              <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setInvestmentExpanded(!investmentExpanded)}>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{background: '#b48c3c'}} /><span className="font-semibold" style={{color: '#8a6020'}}>{text.investment}</span></div>
                <div className="flex items-center gap-2"><span className="text-xl font-bold" style={{color: '#8a6020'}}>{formatCurrency(breakdown.investment)} {getCurrentCurrency().symbol}</span>{investmentExpanded ? <ChevronUp className="w-5 h-5" style={{color: '#b48c3c'}} /> : <ChevronDown className="w-5 h-5" style={{color: '#b48c3c'}} />}</div>
              </div>
              <Button onClick={addInvestmentItem} variant="ghost" size="sm" className="w-full mt-2" style={{color: '#8a6020'}}><Plus className="w-4 h-4 ms-1" /> {text.addInvestment}</Button>
              {investmentExpanded && (
                <div className="mt-3 space-y-3">
                  <div className="p-3 rounded-lg" style={{background: 'rgba(180,140,60,0.08)'}}>
                    <p className="text-xs font-semibold mb-2" style={{color: '#8a6020'}}>{text.aiInvestment}</p>
                    <div className="flex flex-wrap gap-1">
                      {INVESTMENT_EXAMPLES.map((ex, i) => <button key={i} onClick={() => setInvestmentItems([...investmentItems, { id: generateId(), name: language === 'ar' ? ex.name : ex.nameEn, amount: '' }])} className="px-2 py-1 text-xs rounded-full" style={{background: 'white', border: '0.5px solid rgba(180,140,60,0.3)', color: '#8a6020'}}>{ex.icon} {language === 'ar' ? ex.name : ex.nameEn}</button>)}
                    </div>
                  </div>
                  {investmentItems.map(item => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <Input placeholder={text.investmentNamePlaceholder} value={item.name} onChange={(e) => updateInvestmentItem(item.id, 'name', e.target.value)} className="flex-1 h-8 text-sm" style={{borderColor: 'rgba(180,140,60,0.3)'}} />
                      <Input placeholder={text.amountPlaceholder} type="text" value={item.amount} onChange={(e) => updateInvestmentItem(item.id, 'amount', e.target.value)} className="w-32 h-8 text-sm" dir="ltr" style={{borderColor: 'rgba(180,140,60,0.3)'}} />
                      <Button variant="ghost" size="icon" onClick={() => removeInvestmentItem(item.id)} className="h-8 w-8 text-red-400"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  {investmentItems.length > 0 && <div className="flex justify-end pt-2" style={{borderTop: '0.5px solid rgba(180,140,60,0.2)'}}><span className="text-sm font-semibold" style={{color: '#8a6020'}}>{text.sumInvestment}: {formatCurrency(investmentItems.reduce((sum, item) => sum + (parseFloat(item.amount.replace(/[^\d.]/g, '')) || 0), 0))} {getCurrentCurrency().symbol}</span></div>}
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

        {/* Percentage Calculator */}
        <Card style={{border: '1px solid rgba(196,163,90,0.35)', background: 'rgba(255,253,245,0.98)', boxShadow: '0 8px 30px rgba(196,163,90,0.1)'}}>
          <CardHeader className="rounded-t-lg" style={{background: 'rgba(196,163,90,0.08)'}}>
            <CardTitle className="flex items-center gap-2" style={{color: '#7a5c1a'}}>
              <span style={{fontSize: '22px'}}>%</span>
              {isArabic ? 'حاسبة النسب المئوية' : 'Percentage Calculator'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="flex flex-col md:flex-row gap-5 items-center">
              {/* Circular Ring */}
              <div className="relative shrink-0 flex items-center justify-center w-36 h-36">
                <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
                  <circle cx="72" cy="72" r="60" fill="none" stroke="rgba(196,163,90,0.15)" strokeWidth="12"/>
                  <circle cx="72" cy="72" r="60" fill="none"
                    stroke={percentCalc <= 25 ? '#2d8a4e' : percentCalc <= 50 ? '#c4a35a' : percentCalc <= 75 ? '#b87333' : '#c0392b'}
                    strokeWidth="12"
                    strokeDasharray={`${(percentCalc / 100) * 2 * Math.PI * 60} ${2 * Math.PI * 60}`}
                    strokeLinecap="round"
                    style={{transition: 'stroke-dasharray 0.4s ease, stroke 0.4s ease'}}/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{color: percentCalc <= 25 ? '#2d8a4e' : percentCalc <= 50 ? '#c4a35a' : percentCalc <= 75 ? '#b87333' : '#c0392b'}}>{percentCalc}%</span>
                  <span className="text-xs mt-0.5" style={{color: 'rgba(122,92,26,0.5)'}}>{isArabic ? 'من دخلك' : 'of income'}</span>
                </div>
              </div>
              {/* Slider + Quick */}
              <div className="flex-1 w-full space-y-3">
                <input type="range" min="1" max="100" value={percentCalc}
                  onChange={(e) => { const p = Number(e.target.value); setPercentCalc(p); setPercentAmount(totalIncome > 0 ? String(Math.round(totalIncome * p / 100 * 1000) / 1000) : ''); }}
                  className="w-full" style={{accentColor: percentCalc <= 25 ? '#2d8a4e' : percentCalc <= 50 ? '#c4a35a' : '#c0392b', height: '6px'}}/>
                <div className="flex justify-between text-xs" style={{color: 'rgba(122,92,26,0.4)'}}><span>1%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
                <div className="flex flex-wrap gap-1.5">
                  {[5,10,15,20,25,30,40,50,75,100].map(p => (
                    <button key={p} onClick={() => { setPercentCalc(p); setPercentAmount(totalIncome > 0 ? String(Math.round(totalIncome * p / 100 * 1000) / 1000) : ''); }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all hover:scale-105"
                      style={percentCalc === p ? {background: '#c4a35a', color: '#1a0f00', border: '1px solid #c4a35a'} : {background: 'rgba(196,163,90,0.1)', color: '#7a5c1a', border: '1px solid rgba(196,163,90,0.3)'}}>
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl p-4 space-y-3" style={{background: 'rgba(196,163,90,0.06)', border: '1px solid rgba(196,163,90,0.25)'}}>
              <div className="text-center">
                <p className="text-sm" style={{color: 'rgba(122,92,26,0.6)'}}>{percentCalc}% {isArabic ? 'من إجمالي دخلك' : 'of your income'}</p>
                <p className="text-4xl font-bold mt-1" style={{color: '#c4a35a'}}>{totalIncome > 0 ? formatCurrency(Math.round(totalIncome * percentCalc / 100 * 1000) / 1000) : '0.000'} <span className="text-lg">{getCurrentCurrency().symbol}</span></p>
              </div>
              <div className="flex items-center gap-2 h-11 rounded-xl border px-4" style={{borderColor: 'rgba(196,163,90,0.4)', background: 'white'}}>
                <span style={{color: '#c4a35a', fontWeight: 'bold'}}>{getCurrentCurrency().symbol}</span>
                <input type="text" value={percentAmount}
                  onChange={(e) => { const val = e.target.value; setPercentAmount(val); const num = parseFloat(val.replace(/[^\d.]/g, '')); if (!isNaN(num) && totalIncome > 0) setPercentCalc(Math.min(100, Math.max(1, Math.round(num / totalIncome * 100)))); }}
                  placeholder="0.000" className="flex-1 bg-transparent text-base font-bold outline-none text-center" dir="ltr" style={{color: '#7a5c1a'}}/>
              </div>
              {totalIncome > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {[{label: isArabic ? 'يومياً' : 'Daily', value: Math.round(totalIncome * percentCalc / 100 / 30 * 1000) / 1000},{label: isArabic ? 'أسبوعياً' : 'Weekly', value: Math.round(totalIncome * percentCalc / 100 / 4 * 1000) / 1000},{label: isArabic ? 'سنوياً' : 'Yearly', value: Math.round(totalIncome * percentCalc / 100 * 12 * 1000) / 1000}].map(item => (
                    <div key={item.label} className="rounded-xl p-2.5 text-center" style={{background: 'rgba(255,253,245,0.8)', border: '0.5px solid rgba(196,163,90,0.2)'}}>
                      <p className="text-xs mb-0.5" style={{color: 'rgba(122,92,26,0.5)'}}>{item.label}</p>
                      <p className="text-sm font-bold" style={{color: '#7a5c1a'}}>{formatCurrency(item.value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>




        {/* Goals */}
        <Card style={{border: '1px solid rgba(196,163,90,0.35)', background: 'rgba(255,253,245,0.98)', boxShadow: '0 4px 20px rgba(196,163,90,0.1)'}}>
          <CardHeader className="rounded-t-lg" style={{background: 'rgba(196,163,90,0.08)'}}>
            <CardTitle className="flex items-center gap-2" style={{color: '#7a5c1a'}}><Target className="w-6 h-6" />{text.goalsTitle}</CardTitle>
            <CardDescription style={{color: 'rgba(122,92,26,0.6)'}}>{text.goalsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <Button onClick={addGoal} variant="outline" className="w-full" style={{borderColor: 'rgba(196,163,90,0.5)', color: '#7a5c1a'}}><Plus className="w-5 h-5 ms-2" />{text.addGoal}</Button>
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

        {/* AI Financial Health Card */}
        {totalIncome > 0 && (() => {
          const sr = breakdown.savings / totalIncome * 100;
          const er = breakdown.expenses / totalIncome * 100;
          const ir = breakdown.investment / totalIncome * 100;
          const score = Math.min(100, Math.round((sr>=20?30:sr>=10?20:10)+(er<=50?25:er<=65?15:5)+(ir>=10?25:ir>=5?15:5)+(goals.length>0?10:0)+(expenseItems.length>0?10:0)));
          const scoreColor = score>=75?'#2d8a4e':score>=50?'#c4a35a':'#c0392b';
          const c = 2*Math.PI*36;
          const dash = (score/100)*c;
          const insights = [
            sr>=20 ? {t:'✅', msg: isArabic?`معدل ادخارك ${sr.toFixed(0)}% ممتاز - أعلى من المتوسط`:`Savings rate ${sr.toFixed(0)}% is excellent`, good:true} : {t:'⚠️', msg: isArabic?`ادخارك ${sr.toFixed(0)}% أقل من المثالي (20%)`:`Savings ${sr.toFixed(0)}% below ideal 20%`, good:false},
            er<=60 ? {t:'✅', msg: isArabic?`نسبة مصروفاتك ${er.toFixed(0)}% معقولة`:`Expense ratio ${er.toFixed(0)}% is reasonable`, good:true} : {t:'🔴', msg: isArabic?`مصروفاتك ${er.toFixed(0)}% مرتفعة - حاول تقليصها`:`High expenses ${er.toFixed(0)}% - reduce spending`, good:false},
            ir>=10 ? {t:'📈', msg: isArabic?`استثمارك ${ir.toFixed(0)}% يبني ثروتك`:`Investment ${ir.toFixed(0)}% is building wealth`, good:true} : {t:'💡', msg: isArabic?`زيادة استثمارك ولو 5% ترفع ثروتك بشكل كبير`:`Increase investment by 5% to grow wealth`, good:false},
            goals.length>0 ? {t:'🎯', msg: isArabic?`لديك ${goals.length} هدف مالي - استمر!`:`You have ${goals.length} financial goals - keep going!`, good:true} : {t:'🎯', msg: isArabic?`أضف أهدافاً مالية لتتبع تقدمك`:`Add financial goals to track progress`, good:false},
          ];
          return (
            <Card style={{border: '1px solid rgba(196,163,90,0.3)', background: 'rgba(255,253,245,0.98)', overflow:'hidden', boxShadow:'0 8px 32px rgba(196,163,90,0.12)'}}>
              <div className="p-5" style={{background:'linear-gradient(135deg,#7f5c48 0%,#5c3d2a 100%)'}}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:'rgba(240,208,128,0.2)',color:'#f0d080'}}>⚡ AI INSIGHTS</span>
                    </div>
                    <h2 className="text-lg font-bold text-white">{score>=75?(isArabic?'وضعك المالي ممتاز 🌟':'Excellent Financial Health 🌟'):score>=50?(isArabic?'وضعك المالي جيد 👍':'Good Financial Health 👍'):(isArabic?'يحتاج تحسين ⚠️':'Needs Improvement ⚠️')}</h2>
                    <p className="text-xs text-white/60 mt-1">{isArabic?`دخل شهري: ${formatCurrency(totalIncome)} ${getCurrentCurrency().symbol}`:`Monthly: ${formatCurrency(totalIncome)} ${getCurrentCurrency().symbol}`}</p>
                  </div>
                  <div className="relative shrink-0 w-20 h-20">
                    <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                      <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7"/>
                      <circle cx="40" cy="40" r="36" fill="none" stroke={scoreColor} strokeWidth="7"
                        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
                        className="ring-anim" style={{'--rd': `${dash}`} as React.CSSProperties}/>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-white score-val">{score}</span>
                      <span className="text-xs text-white/50">/100</span>
                    </div>
                  </div>
                </div>
              </div>
              <CardContent className="pt-4 space-y-2">
                {insights.map((ins, i) => (
                  <div key={i} className="ai-ins flex items-start gap-2 p-2.5 rounded-xl text-sm"
                    style={{background: ins.good?'rgba(45,138,78,0.05)':'rgba(196,163,90,0.05)', border:`0.5px solid ${ins.good?'rgba(45,138,78,0.15)':'rgba(196,163,90,0.2)'}`}}>
                    <span className="shrink-0">{ins.t}</span>
                    <span style={{color:'rgba(122,92,26,0.85)'}}>{ins.msg}</span>
                  </div>
                ))}
                <Button onClick={getRandomAdvice} variant="outline" className="w-full mt-2" style={{borderColor:'rgba(196,163,90,0.4)',color:'#7a5c1a'}}>
                  <Lightbulb className="w-4 h-4 ms-2"/>{text.randomAdvice}
                </Button>
                {showAdvice && randomAdvice && (
                  <div className="p-3 rounded-xl" style={{border:'1px solid rgba(196,163,90,0.25)',background:'rgba(196,163,90,0.06)'}}>
                    <div className="flex items-start gap-2"><span className="text-2xl">{randomAdvice.icon}</span>
                      <div><p className="font-bold text-sm" style={{color:'#7a5c1a'}}>{randomAdvice.category}</p><p className="text-sm" style={{color:'rgba(122,92,26,0.8)'}}>{randomAdvice.tip}</p></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Projects Integration */}
        {totalIncome > 0 && breakdown.savings + breakdown.investment > 0 && (
          <Card style={{border:'1px solid rgba(196,163,90,0.3)',background:'rgba(255,253,245,0.98)',boxShadow:'0 4px 20px rgba(196,163,90,0.1)'}}>
            <CardHeader className="pb-3 rounded-t-lg" style={{background:'rgba(196,163,90,0.07)'}}>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base" style={{color:'#7a5c1a'}}>
                  🚀 {isArabic ? 'مشروعي — متى أبدأ؟' : 'My Projects — When can I start?'}
                </CardTitle>
                <Button onClick={() => router.push('/projects')} size="sm" style={{background:'#7f5c48',color:'white'}} className="text-xs">
                  {isArabic ? 'إدارة مشروعي' : 'Manage'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-3 space-y-2">
              {userProjects.length > 0 ? (
                <>
                  {userProjects.slice(0, 4).map(project => {
                    const cost = parseFloat(project.budget.replace(/[^\d.]/g, '')) || 0;
                    const ms = breakdown.savings + breakdown.investment;
                    const months = cost > 0 && ms > 0 ? Math.ceil(cost / ms) : 0;
                    const feasible = months > 0 && months <= 24;
                    const moderate = months > 24 && months <= 48;
                    const dotColor = feasible ? '#2d8a4e' : moderate ? '#c4a35a' : '#c0392b';
                    return (
                      <div key={project.id} className="flex items-center gap-3 p-3 rounded-xl"
                        style={{background: feasible ? 'rgba(45,138,78,0.05)' : 'rgba(196,163,90,0.05)', border: '0.5px solid rgba(196,163,90,0.2)'}}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{background:'rgba(196,163,90,0.1)'}}>{project.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate" style={{color:'#7a5c1a'}}>{project.name}</p>
                          <p className="text-xs" style={{color:'rgba(122,92,26,0.5)'}}>
                            {cost > 0 ? formatCurrency(cost) + ' ' + getCurrentCurrency().symbol : (isArabic ? 'بدون ميزانية' : 'No budget')}
                          </p>
                        </div>
                        <div className="text-end shrink-0">
                          {months > 0 ? (
                            <>
                              <div className="flex items-center gap-1.5 justify-end">
                                <div className="w-2 h-2 rounded-full" style={{background: dotColor}}/>
                                <p className="text-sm font-bold" style={{color: dotColor}}>
                                  {months >= 12 ? (months/12).toFixed(1) + (isArabic ? ' سنة' : ' yr') : months + (isArabic ? ' شهر' : ' mo')}
                                </p>
                              </div>
                              <p className="text-xs mt-0.5" style={{color:'rgba(122,92,26,0.4)'}}>
                                {feasible ? (isArabic ? '✅ قريب' : '✅ Soon') : moderate ? (isArabic ? '⏳ متوسط' : '⏳ Med') : (isArabic ? '🔴 بعيد' : '🔴 Long')}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs" style={{color:'rgba(122,92,26,0.4)'}}>{isArabic ? 'حدد ميزانية' : 'Set budget'}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {breakdown.savings + breakdown.investment > 0 && (
                    <div className="p-3 rounded-xl text-xs" style={{background:'rgba(127,92,72,0.06)',border:'0.5px solid rgba(127,92,72,0.15)',color:'#7f5c48'}}>
                      💡 {isArabic
                        ? 'بادخارك ' + formatCurrency(breakdown.savings + breakdown.investment) + ' ' + getCurrentCurrency().symbol + '/شهر — كافيه خلال ' + (breakdown.savings + breakdown.investment > 0 ? Math.ceil(15000 / (breakdown.savings + breakdown.investment)) : '—') + ' شهر، متجر إلكتروني خلال ' + (breakdown.savings + breakdown.investment > 0 ? Math.ceil(1500 / (breakdown.savings + breakdown.investment)) : '—') + ' شهر.'
                        : 'Saving ' + formatCurrency(breakdown.savings + breakdown.investment) + ' ' + getCurrentCurrency().symbol + '/mo — café in ' + (breakdown.savings + breakdown.investment > 0 ? Math.ceil(15000 / (breakdown.savings + breakdown.investment)) : '—') + ' months.'
                      }
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-5 rounded-xl" style={{border:'1px dashed rgba(196,163,90,0.3)'}}>
                  <p className="text-3xl mb-2">🚀</p>
                  <p className="text-sm" style={{color:'rgba(122,92,26,0.5)'}}>{isArabic ? 'لم تضف مشاريع بعد' : 'No projects yet'}</p>
                  <Button onClick={() => router.push('/projects')} size="sm" className="mt-2" style={{background:'#c4a35a',color:'#1a0f00'}}>
                    {isArabic ? '+ أضف مشروعك الأول' : '+ Add First Project'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Smart Actions */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Button onClick={handlePrint} size="lg" className="h-14 flex-col gap-1 font-bold" style={{background:'#7f5c48',color:'white',boxShadow:'0 4px 16px rgba(127,92,72,0.3)'}}>
              <Printer className="w-5 h-5"/>
              <span className="text-xs">{isArabic?'طباعة':'Print'}</span>
            </Button>
            {[
              {id:'analysis', icon:'🧠', label: isArabic?'تحليل ذكي':'Analysis'},
              {id:'assessment', icon:'📊', label: isArabic?'تقييم مالي':'Assessment'},
              {id:'savingsplan', icon:'💡', label: isArabic?'خطة توفير':'Savings Plan'},
            ].map(btn => (
              <Button key={btn.id} onClick={() => runSmartAnalysis(btn.id)} size="lg" variant="outline"
                className="h-14 flex-col gap-1 font-bold transition-all"
                style={{borderColor:'rgba(196,163,90,0.5)',color:'#7a5c1a',background:smartPanel===btn.id?'rgba(127,92,72,0.1)':'white',transform:smartPanel===btn.id?'scale(0.97)':'scale(1)'}}>
                <span className="text-xl">{btn.icon}</span>
                <span className="text-xs">{btn.label}</span>
              </Button>
            ))}
          </div>

          {/* Result Panel */}
          {smartPanel && smartText && (
            <Card style={{border:'1px solid rgba(196,163,90,0.35)',background:'rgba(255,253,245,0.98)',boxShadow:'0 8px 30px rgba(196,163,90,0.12)'}}>
              <CardHeader className="pb-3 rounded-t-lg" style={{background:'linear-gradient(135deg,#7f5c48,#5c3d2a)'}}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-base">
                    {smartPanel==='analysis'&&(isArabic?'🧠 التحليل المالي':'🧠 Financial Analysis')}
                    {smartPanel==='assessment'&&(isArabic?'📊 التقييم المالي':'📊 Assessment')}
                    {smartPanel==='savingsplan'&&(isArabic?'💡 خطة التوفير':'💡 Savings Plan')}
                  </CardTitle>
                  <button onClick={()=>{setSmartPanel('');setSmartText('');}} className="text-white/70 hover:text-white text-xl font-bold transition-colors">×</button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans" style={{color:'rgba(122,92,26,0.9)'}}>{smartText}</pre>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center">
            <Button onClick={handleReset} variant="outline" style={{borderColor:'rgba(196,163,90,0.3)',color:'rgba(122,92,26,0.5)'}}><RefreshCw className="w-4 h-4 ms-2"/>{text.reset}</Button>
          </div>
        </div>

        <div className="mt-8 pt-8 text-center text-sm" style={{borderTop: '1px solid rgba(196,163,90,0.3)'}}>
          <p className="mb-1" style={{color: 'rgba(122,92,26,0.5)'}}>{text.footer}</p>
          <div className="flex items-center justify-center gap-2">
            <span className="w-24 h-px" style={{background: 'rgba(196,163,90,0.4)'}}></span>
            <span className="font-medium" style={{color: '#c4a35a'}}>powered by M.Q</span>
            <span className="w-24 h-px" style={{background: 'rgba(196,163,90,0.4)'}}></span>
          </div>
        </div>
      </div>
    </main>
    </>
  );
}
