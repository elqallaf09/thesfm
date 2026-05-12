'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Calculator, Heart, Lightbulb, Printer, RefreshCw, Coins, Wallet, Sparkles, Globe, Plus, Trash2, Target, Calendar, Banknote, TrendingUp, PiggyBank, Goal, ChevronDown, ChevronUp } from 'lucide-react';

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

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

const CURRENCIES: Currency[] = [
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', nameAr: 'دينار كويتي' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', nameAr: 'درهم إماراتي' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', nameAr: 'ريال سعودي' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب', nameAr: 'دينار بحريني' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.', nameAr: 'ريال عماني' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', nameAr: 'ريال قطري' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.أ', nameAr: 'دينار أردني' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', nameAr: 'شيكل إسرائيلي' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', nameAr: 'ليرة لبنانية' },
  { code: 'SYR', name: 'Syrian Pound', symbol: 'ل.س', nameAr: 'ليرة سورية' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', nameAr: 'دينار عراقي' },
  { code: 'USD', name: 'US Dollar', symbol: '$', nameAr: 'دولار أمريكي' },
  { code: 'EUR', name: 'Euro', symbol: '€', nameAr: 'يورو' },
  { code: 'GBP', name: 'British Pound', symbol: '£', nameAr: 'جنيه إسترليني' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', nameAr: 'فرنك سويسري' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', nameAr: 'دولار كندي' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', nameAr: 'دولار أسترالي' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', nameAr: 'ين ياباني' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', nameAr: 'يوان صيني' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', nameAr: 'روبية هندية' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', nameAr: 'روبية باكستانية' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', nameAr: 'تاكا بنغلاديشية' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', nameAr: 'روبية سريلانكية' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'रू', nameAr: 'روبية نيبالية' },
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K', nameAr: 'كيات ميانمار' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', nameAr: 'باهت تايلاندي' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', nameAr: 'رينجيت ماليزي' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', nameAr: 'دولار سنغافوري' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', nameAr: 'روبية إندونيسية' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', nameAr: 'بيزو فلبيني' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', nameAr: 'دونغ فيتنامي' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', nameAr: 'وون كوري' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', nameAr: 'دولار تايواني' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', nameAr: 'دولار هونغ كونغ' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', nameAr: 'دولار نيوزيلندي' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', nameAr: 'راند جنوب أفريقي' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', nameAr: 'جنيه مصري' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', nameAr: 'درهم مغربي' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت', nameAr: 'دينار تونسي' },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج', nameAr: 'دينار جزائري' },
  { code: 'LYD', name: 'Libyan Dinar', symbol: 'ل.د', nameAr: 'دينار ليبي' },
  { code: 'SDG', name: 'Sudanese Pound', symbol: 'ج.س', nameAr: 'جنيه سوداني' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', nameAr: 'شلن كيني' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', nameAr: 'نيرا نيجيري' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', nameAr: 'سيدي غاني' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', nameAr: 'شلن تنزاني' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', nameAr: 'شلن أوغندي' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', nameAr: 'بر أثيوبي' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'FRw', nameAr: 'فرنك رواندي' },
  { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz', nameAr: 'كوانزا أنغولي' },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK', nameAr: 'كواشا زامبي' },
  { code: 'BWP', name: 'Botswana Pula', symbol: 'P', nameAr: 'بولا بوتسوانية' },
  { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨', nameAr: 'روبية موريشيوسية' },
  { code: 'SCR', name: 'Seychellois Rupee', symbol: '₨', nameAr: 'روبية سيشل' },
  { code: 'NAD', name: 'Namibian Dollar', symbol: '$', nameAr: 'دولار ناميبي' },
  { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT', nameAr: 'مetical موزمبيقي' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', nameAr: 'ريال برازيلي' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', nameAr: 'بيزو أرجنتيني' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', nameAr: 'بيزو تشيلي' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', nameAr: 'بيزو كولومبي' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', nameAr: 'سول بيروفي' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', nameAr: 'بيزو مكسيكي' },
  { code: 'VES', name: 'Venezuelan Bolivar', symbol: 'Bs', nameAr: 'بوليفار فنزويلي' },
  { code: 'PYG', name: 'Paraguayan Guarani', symbol: '₲', nameAr: 'غواراني باراغواي' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$', nameAr: 'بيزو أوروغواي' },
  { code: 'CRC', name: 'Costa Rican Colon', symbol: '₡', nameAr: 'كولون كوستاريكي' },
  { code: 'PAB', name: 'Panamanian Balboa', symbol: 'B/.', nameAr: 'بالبوا بنمي' },
  { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$', nameAr: 'بيزو دومينيكي' },
  { code: 'CUP', name: 'Cuban Peso', symbol: '₱', nameAr: 'بيزو كوبي' },
  { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$', nameAr: 'دولار جامايكي' },
  { code: 'HTG', name: 'Haitian Gourde', symbol: 'G', nameAr: 'غورد هايتي' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', nameAr: 'ليرة تركية' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', nameAr: 'روبل روسي' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', nameAr: 'غريفنيا أوكرانية' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', nameAr: 'زلوتي بولندي' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', nameAr: 'كرونة تشيكية' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', nameAr: 'فورنت مجري' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', nameAr: 'ليو روماني' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', nameAr: 'ليف بلغاري' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин', nameAr: 'دينار صربي' },
  { code: 'MKD', name: 'Macedonian Denar', symbol: 'ден', nameAr: 'دينار مقدوني' },
  { code: 'ALL', name: 'Albanian Lek', symbol: 'L', nameAr: 'ليك ألباني' },
  { code: 'BAM', name: 'Bosnia Mark', symbol: 'KM', nameAr: 'مارك البوسنة' },
  { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn', nameAr: 'كونا كرواتية' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', nameAr: 'كرونة سويدية' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', nameAr: 'كرونة نرويجية' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', nameAr: 'كرونة دنماركية' },
  { code: 'ISK', name: 'Icelandic Krona', symbol: 'kr', nameAr: 'كرونة آيسلندية' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸', nameAr: 'تينغ كازاخستاني' },
  { code: 'UZS', name: 'Uzbekistani Som', symbol: 'soʻm', nameAr: 'سوم أوزبكي' },
  { code: 'TJS', name: 'Tajikistani Somoni', symbol: 'SM', nameAr: 'سوموني طاجيكستاني' },
  { code: 'TMT', name: 'Turkmenistani Manat', symbol: 'm', nameAr: 'مانات تركماني' },
  { code: 'KGS', name: 'Kyrgyzstani Som', symbol: 'сом', nameAr: 'سوم قيرغيزستاني' },
  { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼', nameAr: 'مانات أذربيجاني' },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾', nameAr: 'لاري جورجي' },
  { code: 'AMD', name: 'Armenian Dram', symbol: '֏', nameAr: 'درام أرميني' },
  { code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br', nameAr: 'روبل بيلاروسي' },
  { code: 'MDL', name: 'Moldovan Leu', symbol: 'L', nameAr: 'ليو مولدوفي' },
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋', nameAr: 'أفغاني أفغاني' },
];

const INVESTMENT_EXAMPLES = [
  { name: 'صناديق الاستثمار', icon: '📊' },
  { name: 'الأسهم', icon: '📈' },
  { name: 'العقارات', icon: '🏠' },
  { name: 'الذهب', icon: '🥇' },
  { name: 'السندات', icon: '📜' },
  { name: 'التأمين التكافلي', icon: '🛡️' },
  { name: 'المتاجرة', icon: '🛒' },
  { name: 'المشاريع الصغيرة', icon: '🏪' },
  { name: 'التعليم والدورات', icon: '📚' },
  { name: 'التقنيات الحديثة', icon: '💻' },
];

const SAVINGS_EXAMPLES = [
  { name: 'صندوق الطوارئ', icon: '🚨' },
  { name: 'حساب التوفير', icon: '🏦' },
  { name: 'شهادات الإدخار', icon: '📋' },
  { name: 'إيجار شقة', icon: '🏢' },
  { name: 'سيارة جديدة', icon: '🚗' },
  { name: 'جهاز كهربائي', icon: '📺' },
  { name: 'رحلة سياحية', icon: '✈️' },
  { name: 'جهاز جوال', icon: '📱' },
  { name: 'تجديد أثاث', icon: '🪑' },
  { name: 'زواج أو خطوبة', icon: '💍' },
];

const EXPENSES_EXAMPLES = [
  { name: 'الإيجار', icon: '🏠' },
  { name: 'الطعام والشراب', icon: '🍔' },
  { name: 'المواصلات', icon: '🚌' },
  { name: 'الكهرباء والماء', icon: '💡' },
  { name: 'الاتصالات', icon: '📱' },
  { name: 'الملابس', icon: '👔' },
  { name: 'الرعاية الصحية', icon: '🏥' },
  { name: 'الملاهي', icon: '🎮' },
];

const ARABIC_ADVICE: Advice[] = [
  { category: 'المصروفات', tip: 'حاول الالتزام بـ 70% من راتبك للمصروفات الأساسية. قلل من المصاريف غير الضرورية', icon: '💰' },
  { category: 'المدخرات', tip: 'لا تلمس مدخراتك في الطوارئ. اجعلها في حساب منفصل يصعب الوصول إليه', icon: '🏦' },
  { category: 'الاستثمار', tip: 'ابدأ بالاستثمار مبكراً حتى لو بمبالغ صغيرة. الفائدة المركبة تعمل لصالحك', icon: '📈' },
  { category: 'الصدقة', tip: 'الصدقة تطفئ غضب الرب وتبارك في الرزق. حتى المبلغ الصغير له قيمة', icon: '🤲' },
  { category: 'الدين', tip: 'إذا كنت مديناً، اعمل على سداد الديون أولاً قبل التفكير في الاستثمار', icon: '⚖️' },
  { category: 'التأمين', tip: 'تأكد من وجود تأمين صحي وتأمين حياة يحميك وعائلتك', icon: '🛡️' },
  { category: 'التقاعد', tip: 'خصص نسبة من دخلك للتقاعد مبكراً. كلما بدأت أبكر كلما كان أفضل', icon: '🌴' },
  { category: 'التعليم', tip: 'استثمر في تطوير مهاراتك التعليمية. المعرفة أفضل استثمار', icon: '📚' },
];

export default function SalaryManager() {
  const [salary, setSalary] = useState<string>('');
  const [salaryNumber, setSalaryNumber] = useState<number>(0);
  const [charityPercentage, setCharityPercentage] = useState<number>(0);
  const [includeCharity, setIncludeCharity] = useState<boolean>(false);
  const [showAdvice, setShowAdvice] = useState<boolean>(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('KWD');
  const [randomAdvice, setRandomAdvice] = useState<Advice | null>(null);

  // Items states
  const [expenseItems, setExpenseItems] = useState<ItemEntry[]>([]);
  const [savingsItems, setSavingsItems] = useState<ItemEntry[]>([]);
  const [investmentItems, setInvestmentItems] = useState<ItemEntry[]>([]);

  // Expanded states
  const [expensesExpanded, setExpensesExpanded] = useState<boolean>(false);
  const [savingsExpanded, setSavingsExpanded] = useState<boolean>(false);
  const [investmentExpanded, setInvestmentExpanded] = useState<boolean>(false);

  // Goals state
  const [goals, setGoals] = useState<GoalEntry[]>([]);

  const [breakdown, setBreakdown] = useState<SalaryBreakdown>({
    expenses: 0,
    savings: 0,
    investment: 0,
    charity: 0,
  });

  const getCurrentCurrency = () => {
    return CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const calculateBreakdown = useCallback(() => {
    const baseAmount = salaryNumber;
    if (baseAmount <= 0) {
      setBreakdown({ expenses: 0, savings: 0, investment: 0, charity: 0 });
      return;
    }

    let expenses = baseAmount * 0.7;
    let savings = baseAmount * 0.2;
    let investment = baseAmount * 0.1;
    let charity = 0;

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
  }, [salaryNumber, includeCharity, charityPercentage]);

  useEffect(() => {
    calculateBreakdown();
  }, [calculateBreakdown]);

  useEffect(() => {
    const num = parseFloat(salary.replace(/[^\d.]/g, ''));
    setSalaryNumber(isNaN(num) ? 0 : num);
  }, [salary]);

  const getRandomAdvice = () => {
    const randomIndex = Math.floor(Math.random() * ARABIC_ADVICE.length);
    setRandomAdvice(ARABIC_ADVICE[randomIndex]);
    setShowAdvice(true);
  };

  const formatCurrency = (amount: number) => {
    const decimals = ['JPY', 'KRW', 'VND', 'IDR'].includes(selectedCurrency) ? 0 : 2;
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  };

  const getChartData = () => {
    const data = [
      { name: 'المصروفات', value: breakdown.expenses, color: COLORS[0] },
      { name: 'المدخرات', value: breakdown.savings, color: COLORS[1] },
      { name: 'الاستثمار', value: breakdown.investment, color: COLORS[2] },
    ];
    if (includeCharity && breakdown.charity > 0) {
      data.push({ name: 'الصدقة', value: breakdown.charity, color: COLORS[3] });
    }
    return data;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setSalary('');
    setSalaryNumber(0);
    setCharityPercentage(0);
    setIncludeCharity(false);
    setShowAdvice(false);
    setRandomAdvice(null);
    setExpenseItems([]);
    setSavingsItems([]);
    setInvestmentItems([]);
    setGoals([]);
    setExpensesExpanded(false);
    setSavingsExpanded(false);
    setInvestmentExpanded(false);
  };

  const handleCurrencyChange = (value: string) => {
    setSelectedCurrency(value);
  };

  // Item management functions
  const addExpenseItem = () => {
    setExpenseItems([...expenseItems, { id: generateId(), name: '', amount: '' }]);
    setExpensesExpanded(true);
  };

  const addSavingsItem = () => {
    setSavingsItems([...savingsItems, { id: generateId(), name: '', amount: '' }]);
    setSavingsExpanded(true);
  };

  const addInvestmentItem = () => {
    setInvestmentItems([...investmentItems, { id: generateId(), name: '', amount: '' }]);
    setInvestmentExpanded(true);
  };

  const updateExpenseItem = (id: string, field: 'name' | 'amount', value: string) => {
    setExpenseItems(expenseItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const updateSavingsItem = (id: string, field: 'name' | 'amount', value: string) => {
    setSavingsItems(savingsItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const updateInvestmentItem = (id: string, field: 'name' | 'amount', value: string) => {
    setInvestmentItems(investmentItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeExpenseItem = (id: string) => {
    setExpenseItems(expenseItems.filter(item => item.id !== id));
  };

  const removeSavingsItem = (id: string) => {
    setSavingsItems(savingsItems.filter(item => item.id !== id));
  };

  const removeInvestmentItem = (id: string) => {
    setInvestmentItems(investmentItems.filter(item => item.id !== id));
  };

  // Goal management functions
  const addGoal = () => {
    setGoals([...goals, { id: generateId(), goal: '', amount: '', duration: '', notes: '' }]);
  };

  const updateGoal = (id: string, field: keyof GoalEntry, value: string) => {
    setGoals(goals.map(goal =>
      goal.id === id ? { ...goal, [field]: value } : goal
    ));
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter(goal => goal.id !== id));
  };

  const getAIAdvice = (): string => {
    if (salaryNumber === 0) return 'أدخل راتبك للحصول على نصائح مالية مخصصة';

    const currency = getCurrentCurrency();
    const salaryInCurrency = `${formatCurrency(salaryNumber)} ${currency.symbol}`;

    if (['KWD', 'BHD', 'OMR'].includes(selectedCurrency)) {
      if (salaryNumber < 500) {
        return `راتبك ${salaryInCurrency} جيد مقارنة بالعديد من الدول. ركز على تقليل المصاريف وبحث عن فرص إضافية.`;
      } else if (salaryNumber < 1500) {
        return `راتبك ${salaryInCurrency} ممتاز. استثمر في صندوق طوارئ وفكر في الاستثمار العقاري.`;
      } else {
        return `راتبك ${salaryInCurrency} عالي جداً. فكر في استشارات مالية متخصصة وتوزيع استثماراتك.`;
      }
    }

    if (salaryNumber < 2000) {
      return `مع راتبك ${salaryInCurrency}، ركز على تقليل المصاريف. تجنب الديون وبحث عن مصادر دخل إضافية.`;
    } else if (salaryNumber < 5000) {
      return `راتبك ${salaryInCurrency} جيد. ابدأ صندوق طوارئ لـ 3-6 أشهر واستثمر في تطوير مهاراتك.`;
    } else if (salaryNumber < 10000) {
      return `لديك ${salaryInCurrency} مرونة جيدة. نوّع استثماراتك وفكر في التأمين الصحي الشامل.`;
    } else {
      return `راتبك ${salaryInCurrency} ممتاز! فكر في استشارة مالية متخصصة وتبرع للأعمال الخيرية.`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950 dark:to-slate-900 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-3">
            <Calculator className="w-10 h-10" />
            مدير الراتب الذكي
          </h1>
          <p className="text-muted-foreground text-lg">
            قسّم راتبك بذكاء: 70% مصروفات | 20% مدخرات | 10% استثمار
          </p>
        </div>

        {/* Salary Input Card */}
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardHeader className="bg-emerald-50 dark:bg-emerald-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Coins className="w-6 h-6" />
              أدخل راتبك الشهري
            </CardTitle>
            <CardDescription>سيتم تقسيم الراتب تلقائياً حسب النسب المحددة</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Currency Selector */}
            <div className="space-y-2">
              <Label className="text-lg font-medium flex items-center gap-2">
                <Globe className="w-5 h-5" />
                اختر العملة
              </Label>
              <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <span className="flex items-center gap-2">
                        <span className="font-bold min-w-[60px]">{currency.symbol}</span>
                        <span>{currency.nameAr}</span>
                        <span className="text-muted-foreground text-sm">({currency.code})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Salary Input */}
            <div className="space-y-2">
              <Label htmlFor="salary" className="text-lg font-medium">الراتب الشهري</Label>
              <div className="relative">
                <Input
                  id="salary"
                  type="text"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="مثال: 5000"
                  className="text-xl font-bold text-center h-14 text-input text-lg"
                  dir="ltr"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  {getCurrentCurrency().symbol}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charity Section */}
        <Card className="border-rose-200 dark:border-rose-800">
          <CardHeader className="bg-rose-50 dark:bg-rose-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <Heart className="w-6 h-6" />
              التبرع والصدقة
            </CardTitle>
            <CardDescription>خصص نسبة من راتبك للتبرع والصدقة</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="charity-toggle" className="text-lg font-medium cursor-pointer">
                تفعيل التبرع من الراتب
              </Label>
              <Switch
                id="charity-toggle"
                checked={includeCharity}
                onCheckedChange={setIncludeCharity}
              />
            </div>
            {includeCharity && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center">
                  <Label className="font-medium">نسبة التبرع: {charityPercentage}%</Label>
                </div>
                <Slider
                  value={[charityPercentage]}
                  onValueChange={(value) => setCharityPercentage(value[0])}
                  max={20}
                  min={0}
                  step={1}
                  className="py-2"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>0%</span>
                  <span>5%</span>
                  <span>10%</span>
                  <span>15%</span>
                  <span>20%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Chart - Improved */}
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardHeader className="bg-emerald-50 dark:bg-emerald-900/30 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <PieChart className="w-6 h-6" />
                التوزيع البياني
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {salaryNumber > 0 ? (
                <div className="space-y-4">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getChartData()}
                          cx="50%"
                          cy="45%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          labelLine={true}
                        >
                          {getChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [
                            `${formatCurrency(value)} ${getCurrentCurrency().symbol}`,
                            ''
                          ]}
                          contentStyle={{
                            direction: 'rtl',
                            fontSize: '14px',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: 'white'
                          }}
                        />
                        <Legend
                          layout="horizontal"
                          verticalAlign="bottom"
                          align="center"
                          iconType="circle"
                          iconSize={10}
                          wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Bar Chart for amounts */}
                  <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getChartData()} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 12 }}
                          width={80}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value: number) => `${formatCurrency(value)} ${getCurrentCurrency().symbol}`}
                          contentStyle={{ direction: 'rtl' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {getChartData().map((entry, index) => (
                            <Cell key={`bar-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <PieChart className="w-16 h-16 mx-auto opacity-50" />
                    <p>أدخل الراتب لرؤية التوزيع</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Salary Details Cards */}
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardHeader className="bg-emerald-50 dark:bg-emerald-900/30 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Wallet className="w-6 h-6" />
                تفاصيل الراتب
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Total Salary */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border-2 border-emerald-300 dark:border-emerald-700">
                <div className="text-center">
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">إجمالي الراتب</span>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(salaryNumber)} {getCurrentCurrency().symbol}
                  </p>
                </div>
              </div>

              {/* Expenses */}
              <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setExpensesExpanded(!expensesExpanded)}>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500" />
                    <span className="font-semibold text-green-700 dark:text-green-400">المصروفات</span>
                    <span className="text-green-600 dark:text-green-400 font-bold">70%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-green-800 dark:text-green-300">
                      {formatCurrency(breakdown.expenses)}
                    </span>
                    {expensesExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
                <Button onClick={addExpenseItem} variant="ghost" size="sm" className="w-full mt-2 text-green-600 hover:text-green-700 hover:bg-green-100">
                  <Plus className="w-4 h-4 ms-1" /> إضافة مصروف
                </Button>
                {expensesExpanded && expenseItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">امثلة: الإيجار، الطعام، المواصلات...</p>
                    {expenseItems.map((item) => (
                      <div key={item.id} className="flex gap-2 items-center">
                        <Input
                          placeholder="اسم المصروف"
                          value={item.name}
                          onChange={(e) => updateExpenseItem(item.id, 'name', e.target.value)}
                          className="flex-1 h-8 text-sm"
                        />
                        <Input
                          placeholder="المبلغ"
                          type="text"
                          value={item.amount}
                          onChange={(e) => updateExpenseItem(item.id, 'amount', e.target.value)}
                          className="w-24 h-8 text-sm"
                          dir="ltr"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeExpenseItem(item.id)} className="h-8 w-8 text-red-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Savings */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setSavingsExpanded(!savingsExpanded)}>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                    <span className="font-semibold text-blue-700 dark:text-blue-400">المدخرات</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">20%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-blue-800 dark:text-blue-300">
                      {formatCurrency(breakdown.savings)}
                    </span>
                    {savingsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
                <Button onClick={addSavingsItem} variant="ghost" size="sm" className="w-full mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100">
                  <Plus className="w-4 h-4 ms-1" /> إضافة مدخرة
                </Button>
                {savingsExpanded && (
                  <div className="mt-3 space-y-3">
                    <div className="p-3 bg-blue-100/50 dark:bg-blue-800/30 rounded-lg">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">امثلة للمدخرات (بالذكاء الاصطناعي):</p>
                      <div className="flex flex-wrap gap-1">
                        {SAVINGS_EXAMPLES.map((ex, i) => (
                          <button
                            key={i}
                            onClick={() => setSavingsItems([...savingsItems, { id: generateId(), name: ex.name, amount: '' }])}
                            className="px-2 py-1 text-xs bg-white dark:bg-blue-900 rounded-full border border-blue-200 dark:border-blue-700 hover:bg-blue-50"
                          >
                            {ex.icon} {ex.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    {savingsItems.length > 0 && (
                      <div className="space-y-2">
                        {savingsItems.map((item) => (
                          <div key={item.id} className="flex gap-2 items-center">
                            <Input
                              placeholder="اسم المدخرة"
                              value={item.name}
                              onChange={(e) => updateSavingsItem(item.id, 'name', e.target.value)}
                              className="flex-1 h-8 text-sm"
                            />
                            <Input
                              placeholder="المبلغ"
                              type="text"
                              value={item.amount}
                              onChange={(e) => updateSavingsItem(item.id, 'amount', e.target.value)}
                              className="w-24 h-8 text-sm"
                              dir="ltr"
                            />
                            <Button variant="ghost" size="icon" onClick={() => removeSavingsItem(item.id)} className="h-8 w-8 text-red-500 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Investment */}
              <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setInvestmentExpanded(!investmentExpanded)}>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-amber-500" />
                    <span className="font-semibold text-amber-700 dark:text-amber-400">الاستثمار</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">10%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-amber-800 dark:text-amber-300">
                      {formatCurrency(breakdown.investment)}
                    </span>
                    {investmentExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
                <Button onClick={addInvestmentItem} variant="ghost" size="sm" className="w-full mt-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100">
                  <Plus className="w-4 h-4 ms-1" /> إضافة استثمار
                </Button>
                {investmentExpanded && (
                  <div className="mt-3 space-y-3">
                    <div className="p-3 bg-amber-100/50 dark:bg-amber-800/30 rounded-lg">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">امثلة للاستثمار (بالذكاء الاصطناعي):</p>
                      <div className="flex flex-wrap gap-1">
                        {INVESTMENT_EXAMPLES.map((ex, i) => (
                          <button
                            key={i}
                            onClick={() => setInvestmentItems([...investmentItems, { id: generateId(), name: ex.name, amount: '' }])}
                            className="px-2 py-1 text-xs bg-white dark:bg-amber-900 rounded-full border border-amber-200 dark:border-amber-700 hover:bg-amber-50"
                          >
                            {ex.icon} {ex.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    {investmentItems.length > 0 && (
                      <div className="space-y-2">
                        {investmentItems.map((item) => (
                          <div key={item.id} className="flex gap-2 items-center">
                            <Input
                              placeholder="اسم الاستثمار"
                              value={item.name}
                              onChange={(e) => updateInvestmentItem(item.id, 'name', e.target.value)}
                              className="flex-1 h-8 text-sm"
                            />
                            <Input
                              placeholder="المبلغ"
                              type="text"
                              value={item.amount}
                              onChange={(e) => updateInvestmentItem(item.id, 'amount', e.target.value)}
                              className="w-24 h-8 text-sm"
                              dir="ltr"
                            />
                            <Button variant="ghost" size="icon" onClick={() => removeInvestmentItem(item.id)} className="h-8 w-8 text-red-500 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Charity */}
              {includeCharity && breakdown.charity > 0 && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/30 rounded-xl border border-rose-200 dark:border-rose-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-rose-500" />
                      <span className="font-semibold text-rose-700 dark:text-rose-400">الصدقة</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">{charityPercentage}%</span>
                    </div>
                    <span className="text-xl font-bold text-rose-800 dark:text-rose-300">
                      {formatCurrency(breakdown.charity)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Goals Section */}
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="bg-purple-50 dark:bg-purple-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <Target className="w-6 h-6" />
              الأهداف المالية
            </CardTitle>
            <CardDescription>حدد أهدافك المالية ومبالغها ومدتها</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <Button onClick={addGoal} variant="outline" className="w-full border-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900">
              <Plus className="w-5 h-5 ms-2" />
              إضافة هدف جديد
            </Button>

            {goals.length > 0 && (
              <div className="space-y-4">
                {goals.map((goal) => (
                  <div key={goal.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Target className="w-3 h-3" /> الهدف
                        </Label>
                        <Input
                          placeholder="مثال: شراء سيارة"
                          value={goal.goal}
                          onChange={(e) => updateGoal(goal.id, 'goal', e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Banknote className="w-3 h-3" /> المبلغ المطلوب
                        </Label>
                        <div className="relative">
                          <Input
                            placeholder="0.00"
                            type="text"
                            value={goal.amount}
                            onChange={(e) => updateGoal(goal.id, 'amount', e.target.value)}
                            className="h-10 ltr"
                            dir="ltr"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {getCurrentCurrency().symbol}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> المدة
                        </Label>
                        <Input
                          placeholder="مثال: 6 أشهر"
                          value={goal.duration}
                          onChange={(e) => updateGoal(goal.id, 'duration', e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" /> ملاحظات
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="ملاحظات"
                            value={goal.notes}
                            onChange={(e) => updateGoal(goal.id, 'notes', e.target.value)}
                            className="h-10 flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeGoal(goal.id)}
                            className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {goals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Goal className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>لم تضف أي أهداف بعد</p>
                <p className="text-sm">اضغط على الزر أعلاه لإضافة هدف جديد</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Advice Section */}
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="bg-purple-50 dark:bg-purple-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <Sparkles className="w-6 h-6" />
              نصائح الذكاء الاصطناعي
            </CardTitle>
            <CardDescription>نصائح مالية مخصصة بناءً على راتبك</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl border border-purple-200 dark:border-purple-800">
              <p className="text-lg leading-relaxed text-purple-900 dark:text-purple-100">
                {getAIAdvice()}
              </p>
            </div>
            <Button
              onClick={getRandomAdvice}
              variant="outline"
              className="w-full border-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900"
            >
              <Lightbulb className="w-5 h-5 ms-2" />
              احصل على نصيحة عشوائية
            </Button>
            {showAdvice && randomAdvice && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{randomAdvice.icon}</span>
                  <div>
                    <h4 className="font-bold text-amber-800 dark:text-amber-300 mb-1">
                      {randomAdvice.category}
                    </h4>
                    <p className="text-amber-900 dark:text-amber-100">
                      {randomAdvice.tip}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button
            onClick={handlePrint}
            variant="outline"
            size="lg"
            className="border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900"
          >
            <Printer className="w-5 h-5 ms-2" />
            طباعة / تصدير
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="lg"
            className="border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className="w-5 h-5 ms-2" />
            إعادة تعيين
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>مدير الراتب الذكي - ساعدك على تحقيق أهدافك المالية</p>
        </div>
      </div>
    </div>
  );
}
