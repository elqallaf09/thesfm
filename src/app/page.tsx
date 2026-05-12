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
import { Heart, Lightbulb, Printer, RefreshCw, Coins, Wallet, Sparkles, Globe, Plus, Trash2, Target, Calendar, Banknote, Goal, ChevronDown, ChevronUp, Languages, User } from 'lucide-react';
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

// Country dial codes for phone number
const COUNTRY_DIAL_CODES = [
  { code: '+971', name: 'UAE', nameAr: 'الإمارات' },
  { code: '+966', name: 'Saudi Arabia', nameAr: 'السعودية' },
  { code: '+965', name: 'Kuwait', nameAr: 'الكويت' },
  { code: '+973', name: 'Bahrain', nameAr: 'البحرين' },
  { code: '+968', name: 'Oman', nameAr: 'عُمان' },
  { code: '+974', name: 'Qatar', nameAr: 'قطر' },
  { code: '+962', name: 'Jordan', nameAr: 'الأردن' },
  { code: '+961', name: 'Lebanon', nameAr: 'لبنان' },
  { code: '+963', name: 'Syria', nameAr: 'سوريا' },
  { code: '+964', name: 'Iraq', nameAr: 'العراق' },
  { code: '+970', name: 'Palestine', nameAr: 'فلسطين' },
  { code: '+972', name: 'Israel', nameAr: 'إسرائيل' },
  { code: '+20', name: 'Egypt', nameAr: 'مصر' },
  { code: '+216', name: 'Tunisia', nameAr: 'تونس' },
  { code: '+213', name: 'Algeria', nameAr: 'الجزائر' },
  { code: '+212', name: 'Morocco', nameAr: 'المغرب' },
  { code: '+218', name: 'Libya', nameAr: 'ليبيا' },
  { code: '+249', name: 'Sudan', nameAr: 'السودان' },
  { code: '+252', name: 'Somalia', nameAr: 'الصومال' },
  { code: '+251', name: 'Ethiopia', nameAr: 'إثيوبيا' },
  { code: '+254', name: 'Kenya', nameAr: 'كينيا' },
  { code: '+256', name: 'Uganda', nameAr: 'أوغندا' },
  { code: '+255', name: 'Tanzania', nameAr: 'تنزانيا' },
  { code: '+1', name: 'USA/Canada', nameAr: 'أمريكا/كندا' },
  { code: '+44', name: 'UK', nameAr: 'بريطانيا' },
  { code: '+33', name: 'France', nameAr: 'فرنسا' },
  { code: '+49', name: 'Germany', nameAr: 'ألمانيا' },
  { code: '+39', name: 'Italy', nameAr: 'إيطاليا' },
  { code: '+34', name: 'Spain', nameAr: 'إسبانيا' },
  { code: '+31', name: 'Netherlands', nameAr: 'هولندا' },
  { code: '+32', name: 'Belgium', nameAr: 'بلجيكا' },
  { code: '+41', name: 'Switzerland', nameAr: 'سويسرا' },
  { code: '+43', name: 'Austria', nameAr: 'النمسا' },
  { code: '+46', name: 'Sweden', nameAr: 'السويد' },
  { code: '+47', name: 'Norway', nameAr: 'النرويج' },
  { code: '+45', name: 'Denmark', nameAr: 'الدنمارك' },
  { code: '+358', name: 'Finland', nameAr: 'فنلندا' },
  { code: '+30', name: 'Greece', nameAr: 'اليونان' },
  { code: '+90', name: 'Turkey', nameAr: 'تركيا' },
  { code: '+7', name: 'Russia', nameAr: 'روسيا' },
  { code: '+91', name: 'India', nameAr: 'الهند' },
  { code: '+92', name: 'Pakistan', nameAr: 'باكستان' },
  { code: '+880', name: 'Bangladesh', nameAr: 'بنغلاديش' },
  { code: '+93', name: 'Afghanistan', nameAr: 'أفغانستان' },
  { code: '+94', name: 'Sri Lanka', nameAr: 'سريلانكا' },
  { code: '+95', name: 'Myanmar', nameAr: 'ميانمار' },
  { code: '+66', name: 'Thailand', nameAr: 'تايلاند' },
  { code: '+60', name: 'Malaysia', nameAr: 'ماليزيا' },
  { code: '+62', name: 'Indonesia', nameAr: 'إندونيسيا' },
  { code: '+63', name: 'Philippines', nameAr: 'الفلبين' },
  { code: '+65', name: 'Singapore', nameAr: 'سنغافورة' },
  { code: '+84', name: 'Vietnam', nameAr: 'فيتنام' },
  { code: '+82', name: 'South Korea', nameAr: 'كوريا الجنوبية' },
  { code: '+81', name: 'Japan', nameAr: 'اليابان' },
  { code: '+86', name: 'China', nameAr: 'الصين' },
  { code: '+852', name: 'Hong Kong', nameAr: 'هونغ كونغ' },
  { code: '+886', name: 'Taiwan', nameAr: 'تايوان' },
  { code: '+61', name: 'Australia', nameAr: 'أستراليا' },
  { code: '+64', name: 'New Zealand', nameAr: 'نيوزيلندا' },
  { code: '+27', name: 'South Africa', nameAr: 'جنوب أفريقيا' },
  { code: '+234', name: 'Nigeria', nameAr: 'نيجيريا' },
  { code: '+233', name: 'Ghana', nameAr: 'غانا' },
  { code: '+225', name: "Cote d'Ivoire", nameAr: 'ساحل العاج' },
  { code: '+221', name: 'Senegal', nameAr: 'السنغال' },
  { code: '+226', name: 'Burkina Faso', nameAr: 'بوركينا فاسو' },
  { code: '+227', name: 'Niger', nameAr: 'النيجر' },
  { code: '+228', name: 'Togo', nameAr: 'توغو' },
  { code: '+229', name: 'Benin', nameAr: 'بنين' },
  { code: '+237', name: 'Cameroon', nameAr: 'الكاميرون' },
  { code: '+241', name: 'Gabon', nameAr: 'الغابون' },
  { code: '+242', name: 'Congo', nameAr: 'الكونغو' },
  { code: '+243', name: 'DR Congo', nameAr: 'الكونغو الديموقراطية' },
  { code: '+507', name: 'Panama', nameAr: 'بنما' },
  { code: '+52', name: 'Mexico', nameAr: 'المكسيك' },
  { code: '+53', name: 'Cuba', nameAr: 'كوبا' },
  { code: '+1', name: 'USA', nameAr: 'أمريكا' },
  { code: '+55', name: 'Brazil', nameAr: 'البرازيل' },
  { code: '+54', name: 'Argentina', nameAr: 'الأرجنتين' },
  { code: '+56', name: 'Chile', nameAr: 'تشيلي' },
  { code: '+57', name: 'Colombia', nameAr: 'كولومبيا' },
  { code: '+51', name: 'Peru', nameAr: 'بيرو' },
  { code: '+598', name: 'Uruguay', nameAr: 'أوروغواي' },
  { code: '+595', name: 'Paraguay', nameAr: 'باراغواي' },
  { code: '+592', name: 'Guyana', nameAr: 'غيانا' },
  { code: '+509', name: 'Haiti', nameAr: 'هايتي' },
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

  const loadUserData = useCallback(async () => {
    if (!user) {
      setCheckingProfile(false);
      return;
    }

    setCheckingProfile(true);
    const [{ data: profile }, { data: sources }] = await Promise.all([
      supabase.from('profiles').select('username, display_name').eq('id', user.id).maybeSingle(),
      supabase.from('monthly_income_sources').select('amount').eq('user_id', user.id),
    ]);

    setUsername(profile?.display_name || profile?.username || user.user_metadata?.username || '');
    const total = (sources || []).reduce((sum, source) => sum + Number(source.amount || 0), 0);
    setIncomeTotal(total);
    setHasIncomeSources((sources || []).length > 0);
    setCheckingProfile(false);
  }, [user]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  if (loading || checkingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#f7faf7_0%,_#eef6ef_42%,_#dfeee7_100%)]">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!user) return <AuthForm />;

  if (!hasIncomeSources) {
    return <IncomeSourcesForm userId={user.id} username={username} onComplete={loadUserData} />;
  }

  return <>{children({ userId: user.id, username, incomeTotal })}</>;
}

interface SalaryManagerProps {
  userId: string;
  username: string;
  incomeTotal: number;
}

function SalaryManager({ userId, username, incomeTotal }: SalaryManagerProps) {
  const router = useRouter();
  const [language, setLanguage] = useState<'ar' | 'en' | 'fr' | 'zh'>('ar');
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
    aiBestChoice: isArabic ? 'تحليل الذكاء الاصطناعي' : 'AI analysis',
    placeholder: isArabic ? 'مثال: 5000' : 'Example: 5000',
    charityTitle: isArabic ? 'الأعمال الخيرية' : 'Charitable works',
    charityDesc: isArabic ? 'خصص نسبة من مدخولك للأعمال الخيرية' : 'Allocate a percentage of your income for charitable works',
    charityToggle: isArabic ? 'تفعيل الأعمال الخيرية' : 'Enable charitable works',
    charityPercent: isArabic ? 'نسبة الأعمال الخيرية' : 'Charity percentage',
    profileBtn: isArabic ? 'الملف الشخصي' : 'Profile',
    phoneCountryCode: isArabic ? 'رمز الدولة' : 'Country code',
    phoneNumber: isArabic ? 'رقم الهاتف' : 'Phone number',
    newPassword: isArabic ? 'كلمة المرور الجديدة' : 'New password',
    newPasswordHint: isArabic ? 'اتركه فارغاً إذا كنت لا تريد تغيير كلمة المرور' : 'Leave empty if you do not want to change password',
    incomeSourcesTitle: isArabic ? 'مصادر الدخل الحالية' : 'Current income sources',
    updateIncome: isArabic ? 'تعديل المدخول الشهري' : 'Update monthly income',
    durationUnitDay: isArabic ? 'يوم' : 'day',
    durationUnitMonth: isArabic ? 'شهر' : 'month',
    durationUnitYear: isArabic ? 'سنة' : 'year',
    durationUnit: isArabic ? 'وحدة المدة' : 'Duration unit',
    calculationDetails: isArabic ? 'تفاصيل العمليات الحسابية السابقة' : 'Previous calculation details',
    noCharitySelected: isArabic ? 'لم يتم اختيار أي عمل خيري' : 'No charity selected',
    charityAmount: isArabic ? 'مبلغ' : 'Amount',
    chart: isArabic ? 'التوزيع البياني' : 'Visual distribution',
    emptyChart: isArabic ? 'أدخل المدخول لرؤية التوزيع' : 'Enter income to view distribution',
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
    goalDurationPlaceholder: isArabic ? 'مثال: 6 أشهر' : 'Example: 6 months',
    notesPlaceholder: isArabic ? 'ملاحظات' : 'Notes',
    sumExpenses: isArabic ? 'مجموع المصروفات' : 'Total expenses',
    sumSavings: isArabic ? 'مجموع المدخرات' : 'Total savings',
    sumInvestment: isArabic ? 'مجموع الاستثمار' : 'Total investment',
    previousOperations: isArabic ? 'العمليات السابقة' : 'Previous operations',
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
    expensesExamples: isArabic ? 'أمثلة: الإيجار، الطعام، المواصلات...' : 'Examples: Rent, Food, Transportation...',
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
    showChart: isArabic ? 'إظهار التوزيع البياني' : 'Show chart',
    hideChart: isArabic ? 'إخفاء التوزيع البياني' : 'Hide chart',
    goalSuggestion: isArabic ? 'اقتراح للهدف' : 'Goal suggestion',
    goalMonthlyReq: isArabic ? 'المبلغ الشهري المطلوب' : 'Monthly amount needed',
    goalCompareSavings: isArabic ? 'مقارنة بالمدخرات الحالية' : 'Compared to current savings',
    goalReduceExpenses: isArabic ? 'اقتراح: قلل المصروفات أو زد المدخرات' : 'Suggestion: Reduce expenses or increase savings',
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
  const [selectedCurrency, setSelectedCurrency] = useState<string>('KWD');
  const [tickerCategory, setTickerCategory] = useState<TickerCategory>('gulf');
  const [liveTickerItems, setLiveTickerItems] = useState<MarketTickerItem[]>(MARKET_TICKERS.gulf);
  const [tickerLoading, setTickerLoading] = useState<boolean>(true);
  const [tickerIsLive, setTickerIsLive] = useState<boolean>(false);
  const [manualWarning, setManualWarning] = useState<boolean>(false);

  // Income sources editing state
  const [editingIncomeSources, setEditingIncomeSources] = useState<boolean>(false);
  const [incomeSourceAmounts, setIncomeSourceAmounts] = useState<Record<string, string>>({});
  const [currentIncomeSources, setCurrentIncomeSources] = useState<{ id: string; category: string; label: string | null; amount: number }[]>([]);
  const [incomeSourcesLoading, setIncomeSourcesLoading] = useState<boolean>(false);

  // Charity types state with individual percentages
  const [selectedCharityTypes, setSelectedCharityTypes] = useState<string[]>([]);
  const [charityPercentages, setCharityPercentages] = useState<Record<string, number>>({});
  const CHARITY_TYPE_OPTIONS = ['sadaqah', 'zakat', 'sacrifice', 'expiation', 'other'];
  const [totalCharityPercentage, setTotalCharityPercentage] = useState<number>(0);

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
      if (!response.ok) throw new Error('Failed to fetch market ticker');

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
    if (baseAmount <= 0) {
      setBreakdown({ expenses: 0, savings: 0, investment: 0, charity: 0 });
      return;
    }

    let expenses = 0;
    let savings = 0;
    let investment = 0;
    let charity = 0;

    if (distributionMethod === 'manual') {
      expenses = parseFloat(manualExpenses.replace(/[^\d.]/g, '')) || 0;
      savings = parseFloat(manualSavings.replace(/[^\d.]/g, '')) || 0;
      investment = parseFloat(manualInvestment.replace(/[^\d.]/g, '')) || 0;
    } else {
      const ratios = {
        '70-20-10': { expenses: 0.7, savings: 0.2, investment: 0.1 },
        '60-30-10': { expenses: 0.6, savings: 0.3, investment: 0.1 },
        '60-20-20': { expenses: 0.6, savings: 0.2, investment: 0.2 },
      }[distributionMethod];

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

    setBreakdown({
      expenses: Math.round(expenses * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      investment: Math.round(investment * 100) / 100,
      charity: Math.round(charity * 100) / 100,
    });
  }, [salaryNumber, otherIncomeNumber, includeCharity, totalCharityPercentage, distributionMethod, manualExpenses, manualSavings, manualInvestment]);

  useEffect(() => {
    calculateBreakdown();
  }, [calculateBreakdown]);

  useEffect(() => {
    checkManualWarning();
  }, [manualExpenses, manualSavings, manualInvestment, totalIncome, distributionMethod]);

  useEffect(() => {
    fetchTickerData();
  }, [fetchTickerData]);


  useEffect(() => {
    setSalary(incomeTotal ? String(incomeTotal) : '');
    setSalaryNumber(incomeTotal || 0);
  }, [incomeTotal]);

  useEffect(() => {
    const num = parseFloat(salary.replace(/[^\d.]/g, ''));
    setSalaryNumber(isNaN(num) ? 0 : num);
  }, [salary]);

  useEffect(() => {
    const num = parseFloat(otherIncome.replace(/[^\d.]/g, ''));
    setOtherIncomeNumber(isNaN(num) ? 0 : num);
  }, [otherIncome]);

  const getManualAnalysis = () => {
    if (distributionMethod !== 'manual') return '';
    if (totalIncome <= 0) return isArabic ? 'أدخل المدخول والمدخول الآخر لبدء التحليل.' : 'Enter income and other income to start analysis.';

    const expenses = parseFloat(manualExpenses.replace(/[^\d.]/g, '')) || 0;
    const savings = parseFloat(manualSavings.replace(/[^\d.]/g, '')) || 0;
    const investment = parseFloat(manualInvestment.replace(/[^\d.]/g, '')) || 0;
    const plannedTotal = expenses + savings + investment;

    if (plannedTotal === 0) return isArabic ? 'املأ المصروفات والمدخرات والاستثمار ليتم حساب الأفضل تلقائياً.' : 'Fill expenses, savings, and investment to calculate the best choice automatically.';

    const expenseRatio = expenses / totalIncome;
    const savingRatio = savings / totalIncome;
    const investmentRatio = investment / totalIncome;
    const difference = totalIncome - plannedTotal;

    const plans = [
      { name: text.plan70, expenses: 0.7, savings: 0.2, investment: 0.1 },
      { name: text.plan60Savings, expenses: 0.6, savings: 0.3, investment: 0.1 },
      { name: text.plan60Invest, expenses: 0.6, savings: 0.2, investment: 0.2 },
    ];

    const bestPlan = plans
      .map((plan) => ({
        ...plan,
        score: Math.abs(expenseRatio - plan.expenses) + Math.abs(savingRatio - plan.savings) + Math.abs(investmentRatio - plan.investment),
      }))
      .sort((a, b) => a.score - b.score)[0];

    const balanceNote = difference > 0
      ? (isArabic ? `يوجد مبلغ غير موزع قدره ${formatCurrency(difference)} ${getCurrentCurrency().symbol}.` : `There is an unallocated amount of ${formatCurrency(difference)} ${getCurrentCurrency().symbol}.`)
      : difference < 0
        ? (isArabic ? `الخطة تتجاوز دخلك بمبلغ ${formatCurrency(Math.abs(difference))} ${getCurrentCurrency().symbol}.` : `The plan exceeds your income by ${formatCurrency(Math.abs(difference))} ${getCurrentCurrency().symbol}.`)
        : (isArabic ? 'تم توزيع كامل الدخل بشكل متوازن.' : 'Your full income has been allocated.');

    return isArabic
      ? `الأقرب لخطة إدخالك هو: ${bestPlan.name}. ${balanceNote} الأفضل آلياً هو تقليل المصروفات إذا تجاوزت 60% وزيادة المدخرات أو الاستثمار حسب هدفك.`
      : `Closest match: ${bestPlan.name}. ${balanceNote} The smart recommendation is to reduce expenses if they exceed 60% and increase savings or investment based on your goal.`;
  };

  const formatCurrency = (amount: number) => {
    const decimals = ['JPY', 'KRW', 'VND', 'IDR'].includes(selectedCurrency) ? 0 : 2;
    const locale = isArabic ? 'ar-SA' : 'en-US';
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setSalary('');
    setSalaryNumber(0);
    setOtherIncome('');
    setOtherIncomeNumber(0);
    setDistributionMethod('70-20-10');
    setManualExpenses('');
    setManualSavings('');
    setManualInvestment('');
    setIncludeCharity(false);
    setSelectedCharityTypes([]);
    setCharityPercentages({});
    setTotalCharityPercentage(0);
    setExpenseItems([]);
    setSavingsItems([]);
    setInvestmentItems([]);
    setGoals([]);
    setExpensesExpanded(false);
    setSavingsExpanded(false);
    setInvestmentExpanded(false);
    setManualWarning(false);
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
    setGoals([...goals, { id: generateId(), goal: '', amount: '', duration: '', durationUnit: 'month', notes: '' }]);
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
    if (totalIncome === 0) return isArabic ? 'أدخل مدخولك ومدخولك الآخر للحصول على نصائح مالية مخصصة' : 'Enter your income and other income to get personalized financial tips';

    const currency = getCurrentCurrency();
    const incomeInCurrency = `${formatCurrency(totalIncome)} ${currency.symbol}`;

    if (['KWD', 'BHD', 'OMR'].includes(selectedCurrency)) {
      if (totalIncome < 500) {
        return isArabic
          ? `مدخولك ${incomeInCurrency} جيد مقارنة بالعديد من الدول. ركز على تقليل المصاريف وبحث عن فرص إضافية.`
          : `Your income of ${incomeInCurrency} is good compared to many countries. Focus on reducing expenses and look for additional opportunities.`;
      } else if (totalIncome < 1500) {
        return isArabic
          ? `مدخولك ${incomeInCurrency} ممتاز. استثمر في صندوق طوارئ وفكر في الاستثمار العقاري.`
          : `Your income of ${incomeInCurrency} is excellent. Invest in an emergency fund and consider real estate investment.`;
      } else {
        return isArabic
          ? `مدخولك ${incomeInCurrency} عالي جداً. فكر في استشارات مالية متخصصة وتوزيع استثماراتك.`
          : `Your income of ${incomeInCurrency} is very high. Consider specialized financial consulting and diversify your investments.`;
      }
    }

    if (totalIncome < 2000) {
      return isArabic
        ? `مع مدخولك ${incomeInCurrency}، ركز على تقليل المصاريف. تجنب الديون وبحث عن مصادر دخل إضافية.`
        : `With your income of ${incomeInCurrency}, focus on reducing expenses. Avoid debt and look for additional income sources.`;
    } else if (totalIncome < 5000) {
      return isArabic
        ? `مدخولك ${incomeInCurrency} جيد. ابدأ صندوق طوارئ لـ 3-6 أشهر واستثمر في تطوير مهاراتك.`
        : `Your income of ${incomeInCurrency} is good. Start an emergency fund for 3-6 months and invest in developing your skills.`;
    } else if (totalIncome < 10000) {
      return isArabic
        ? `لديك ${incomeInCurrency} مرونة جيدة. نوّع استثماراتك وفكر في التأمين الصحي الشامل.`
        : `You have ${incomeInCurrency} with good flexibility. Diversify your investments and consider comprehensive health insurance.`;
    } else {
      return isArabic
        ? `مدخولك ${incomeInCurrency} ممتاز! فكر في استشارة مالية متخصصة وتبرع للأعمال الخيرية.`
        : `Your income of ${incomeInCurrency} is excellent! Consider specialized financial consulting and donate to charitable causes.`;
    }
  };

  const getGoalSuggestion = (goal: GoalEntry): string => {
    if (!goal.amount || !goal.duration || totalIncome === 0) return '';
    const amount = parseFloat(goal.amount.replace(/[^\d.]/g, '')) || 0;
    if (amount <= 0) return '';

    // Convert duration to months based on unit
    const durationNum = parseInt(goal.duration.replace(/[^\d]/g, ''), 10) || 1;
    let durationMonths: number;
    switch (goal.durationUnit) {
      case 'day':
        durationMonths = durationNum / 30;
        break;
      case 'year':
        durationMonths = durationNum * 12;
        break;
      default:
        durationMonths = durationNum;
    }

    const monthlyRequired = amount / durationMonths;
    const savingsPerMonth = distributionMethod === 'manual'
      ? parseFloat(manualSavings.replace(/[^\d.]/g, '')) || 0
      : totalIncome * 0.2;

    const unitLabel = goal.durationUnit === 'day' ? text.durationUnitDay
      : goal.durationUnit === 'year' ? text.durationUnitYear
      : text.durationUnitMonth;

    const suggestion = isArabic
      ? `المبلغ الشهري المطلوب: ${formatCurrency(monthlyRequired)} ${getCurrentCurrency().symbol}. `
      : `Monthly amount needed: ${formatCurrency(monthlyRequired)} ${getCurrentCurrency().symbol}. `;
    if (monthlyRequired > savingsPerMonth) {
      const diff = monthlyRequired - savingsPerMonth;
      const suggestion2 = isArabic
        ? `يتجاوز ذلك مدخراتك بمبلغ ${formatCurrency(diff)} ${getCurrentCurrency().symbol}. حاول تقليل المصروفات أو زيادة المدخرات.`
        : `This exceeds your savings by ${formatCurrency(diff)} ${getCurrentCurrency().symbol}. Try reducing expenses or increasing savings.`;
      return suggestion + suggestion2;
    }
    const extra = savingsPerMonth - monthlyRequired;
    const suggestion2 = isArabic
      ? ` مقارنة بالمدخرات الحالية البالغة ${formatCurrency(savingsPerMonth)} ${getCurrentCurrency().symbol}، لديك فائض شهري قدره ${formatCurrency(extra)}.`
      : `Compared to your current savings of ${formatCurrency(savingsPerMonth)} ${getCurrentCurrency().symbol}, you have a monthly surplus of ${formatCurrency(extra)}.`;
    return suggestion + suggestion2;
  };

  const checkManualWarning = () => {
    if (distributionMethod !== 'manual') {
      setManualWarning(false);
      return;
    }
    const expenses = parseFloat(manualExpenses.replace(/[^\d.]/g, '')) || 0;
    const savings = parseFloat(manualSavings.replace(/[^\d.]/g, '')) || 0;
    const investment = parseFloat(manualInvestment.replace(/[^\d.]/g, '')) || 0;
    const refExpenses = totalIncome * 0.7;
    const refSavings = totalIncome * 0.2;
    const refInvestment = totalIncome * 0.1;
    if (expenses > refExpenses || savings > refSavings || investment > refInvestment) {
      setManualWarning(true);
    } else {
      setManualWarning(false);
    }
  };

  return (
    <main
      dir={isArabic ? 'rtl' : 'ltr'}
      className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,_#f7faf7_0%,_#eef6ef_42%,_#dfeee7_100%)] px-4 py-6 dark:bg-[linear-gradient(135deg,_#07110d_0%,_#0d1d16_48%,_#111827_100%)]"
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(120deg,rgba(0,96,72,0.10)_0,rgba(0,96,72,0.10)_1px,transparent_1px,transparent_42px),linear-gradient(160deg,rgba(187,151,82,0.12)_0,rgba(187,151,82,0.12)_1px,transparent_1px,transparent_68px)] dark:opacity-20" />
      <div className="pointer-events-none absolute -right-24 top-0 h-[34rem] w-[34rem] rounded-full bg-emerald-700/10 blur-3xl dark:bg-emerald-400/10" />
      <div className="pointer-events-none absolute -left-28 top-40 h-[26rem] w-[26rem] rounded-full bg-[#c4a35a]/20 blur-3xl dark:bg-[#c4a35a]/10" />
      <div className="relative max-w-5xl mx-auto space-y-6">
        <div className="overflow-hidden rounded-[1.75rem] border border-emerald-900/10 bg-white/85 shadow-[0_18px_70px_rgba(0,66,54,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/65">
          <div className="flex flex-col gap-3 border-b border-emerald-900/10 bg-emerald-950 px-4 py-3 text-white md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c4a35a] shadow-[0_0_18px_rgba(196,163,90,0.8)]" />
              <div>
                <p className="text-sm font-bold">{text.tickerTitle}</p>
                <p className="text-xs text-emerald-100/75">{tickerStatus}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={fetchTickerData}
                className="h-10 rounded-xl text-emerald-50 hover:bg-white/10 hover:text-white"
                aria-label={text.refreshPrices}
              >
                <RefreshCw className={`h-4 w-4 ${tickerLoading ? 'animate-spin' : ''}`} />
              </Button>
              <span className="text-xs text-emerald-100/80">{text.tickerType}</span>
              <Select value={tickerCategory} onValueChange={(value) => setTickerCategory(value as TickerCategory)}>
                <SelectTrigger className="h-10 w-[190px] border-white/15 bg-white/10 text-white backdrop-blur [&>span]:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tickerOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => router.push('/profile')}
                className="h-10 rounded-xl text-emerald-50 hover:bg-white/10 hover:text-white text-sm font-medium"
              >
                <User className="h-4 w-4 me-1" />
                {text.profileBtn}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => supabase.auth.signOut()}
                className="h-10 rounded-xl text-emerald-50 hover:bg-white/10 hover:text-white text-sm font-medium"
              >
                {text.logout}
              </Button>
            </div>
          </div>
          <div className="relative flex overflow-hidden bg-white/80 py-3 dark:bg-slate-950/70">
            <div className="flex min-w-full shrink-0 animate-[ticker_26s_linear_infinite] items-center gap-4 px-4">
              {[...tickerItems, ...tickerItems].map((item, index) => (
                <div key={`${item.nameEn}-${index}`} className="flex shrink-0 items-center gap-3 rounded-full border border-emerald-900/10 bg-white px-4 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-slate-900/80">
                  <span className="font-bold text-emerald-950 dark:text-emerald-100">{isArabic ? item.nameAr : item.nameEn}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200" dir="ltr">{item.value}</span>
                  <span className={`font-mono text-xs font-bold ${item.positive ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">{item.change}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/50 dark:shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2 text-center md:text-start">
              <h1 className="text-4xl font-bold tracking-tight text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-3 md:justify-start">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl overflow-hidden shadow-lg shadow-emerald-700/20">
                  <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=100&h=100&fit=crop" alt="Calculator" className="w-full h-full object-cover" />
                </span>
                {text.title}
              </h1>
              <p className="text-muted-foreground text-lg">
                {text.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-slate-900/5 p-2 dark:bg-white/10">
              {username && (
                <span className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100">
                  {username}
                </span>
              )}
              <Languages className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{text.langLabel}</span>
              <Select value={language} onValueChange={(value) => setLanguage(value as 'ar' | 'en' | 'fr' | 'zh')}>
                <SelectTrigger className="h-10 w-[150px] border-white/70 bg-white/80 dark:border-white/10 dark:bg-slate-900/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Francais</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            {/* Currency Selector */}
            <div className="space-y-2">
              <Label className="text-lg font-medium flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {text.currency}
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salary" className="text-lg font-medium">{text.monthlySalary}</Label>
                <div className="relative">
                  <Input
                    id="salary"
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
                <Label htmlFor="other-income" className="text-lg font-medium">{text.otherIncome}</Label>
                <div className="relative">
                  <Input
                    id="other-income"
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
                  { value: 'manual', label: text.manualPlan },
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

            {distributionMethod === 'manual' && (
              <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-900/30">
                <p className="text-sm text-amber-800 dark:text-amber-200">{text.manualDesc}</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>{text.manualExpenses}</Label>
                    <Input value={manualExpenses} onChange={(e) => setManualExpenses(e.target.value)} placeholder="0.00" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>{text.manualSavings}</Label>
                    <Input value={manualSavings} onChange={(e) => setManualSavings(e.target.value)} placeholder="0.00" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>{text.manualInvestment}</Label>
                    <Input value={manualInvestment} onChange={(e) => setManualInvestment(e.target.value)} placeholder="0.00" dir="ltr" />
                  </div>
                </div>
                <div className="rounded-xl border border-amber-300 bg-white/80 p-3 text-sm leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-slate-950/40 dark:text-amber-100">
                  <strong>{text.aiBestChoice}: </strong>{getManualAnalysis()}
                </div>
                {manualWarning && (
                  <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm leading-relaxed text-rose-900 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100">
                    <strong>{text.warningExceeded}:</strong> {text.warningManual}
                  </div>
                )}
              </div>
            )}
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
              <Label htmlFor="charity-toggle" className="text-lg font-medium cursor-pointer">
                {text.charityToggle}
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
                  <Label className="font-medium">{text.charityPercent}: {totalCharityPercentage}%</Label>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{isArabic ? '0% (الحد الأدنى)' : '0% (Min)'}</span>
                  <span>{isArabic ? '20% (الحد الأقصى)' : '20% (Max)'}</span>
                </div>
                <div className="space-y-2 pt-2">
                  <Label className="font-medium">{text.charityTypes}</Label>
                  <div className="flex flex-wrap gap-2">
                    {CHARITY_TYPE_OPTIONS.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          if (selectedCharityTypes.includes(type)) {
                            setSelectedCharityTypes(selectedCharityTypes.filter(t => t !== type));
                            const newPercentages = { ...charityPercentages };
                            delete newPercentages[type];
                            setCharityPercentages(newPercentages);
                          } else {
                            setSelectedCharityTypes([...selectedCharityTypes, type]);
                            setCharityPercentages({ ...charityPercentages, [type]: 0 });
                          }
                          // Recalculate total
                          setTimeout(() => {
                            const newSelected = selectedCharityTypes.includes(type)
                              ? selectedCharityTypes.filter(t => t !== type)
                              : [...selectedCharityTypes, type];
                            const total = newSelected.reduce((sum, t) => sum + (charityPercentages[t] || 0), 0);
                            setTotalCharityPercentage(total);
                          }, 0);
                        }}
                        className={`px-3 py-2 text-sm rounded-xl border transition-all ${
                          selectedCharityTypes.includes(type)
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-300'
                        }`}
                      >
                        {type === 'sadaqah' ? text.charitySadaqah :
                         type === 'zakat' ? text.charityZakat :
                         type === 'sacrifice' ? text.charitySacrifice :
                         type === 'expiation' ? text.charityExpiation :
                         text.charityOther}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedCharityTypes.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-rose-200 dark:border-rose-800">
                    <p className="text-sm font-medium">{text.selectedCharities}: {selectedCharityTypes.length}</p>
                    {selectedCharityTypes.map((type) => {
                      const remainingBudget = 20 - totalCharityPercentage + (charityPercentages[type] || 0);
                      return (
                        <div key={type} className="space-y-2 p-3 bg-rose-50/50 dark:bg-rose-900/20 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              {type === 'sadaqah' ? text.charitySadaqah :
                               type === 'zakat' ? text.charityZakat :
                               type === 'sacrifice' ? text.charitySacrifice :
                               type === 'expiation' ? text.charityExpiation :
                               text.charityOther}
                            </span>
                            <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                              {charityPercentages[type] || 0}%
                            </span>
                          </div>
                          <Slider
                            value={[charityPercentages[type] || 0]}
                            onValueChange={(value) => {
                              const newPercentages = { ...charityPercentages, [type]: value[0] };
                              setCharityPercentages(newPercentages);
                              const newTotal = Object.values(newPercentages).reduce((sum, v) => sum + v, 0);
                              setTotalCharityPercentage(Math.min(newTotal, 20));
                            }}
                            max={Math.max(remainingBudget, 1)}
                            min={0}
                            step={0.5}
                            className="py-2"
                          />
                          <div className="text-xs text-muted-foreground">
                            {isArabic ? 'المتبقي' : 'Remaining'}: {remainingBudget.toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Salary Details Cards */}
        <Card className="border-emerald-200 dark:border-emerald-800">
            <CardHeader className="bg-emerald-50 dark:bg-emerald-900/30 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Wallet className="w-6 h-6" />
                {text.salaryDetails}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Total Salary */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border-2 border-emerald-300 dark:border-emerald-700">
                <div className="text-center">
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">{text.totalSalary}</span>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(totalIncome)} {getCurrentCurrency().symbol}
                  </p>
                </div>
              </div>

              {/* Expenses */}
              <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setExpensesExpanded(!expensesExpanded)}>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500" />
                    <span className="font-semibold text-green-700 dark:text-green-400">{text.expenses}</span>
                    <span className="text-green-600 dark:text-green-400 font-bold">70%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-green-800 dark:text-green-300">
                      {formatCurrency(breakdown.expenses)} {getCurrentCurrency().symbol}
                    </span>
                    {expensesExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
                <Button onClick={addExpenseItem} variant="ghost" size="sm" className="w-full mt-2 text-green-600 hover:text-green-700 hover:bg-green-100">
                  <Plus className="w-4 h-4 ms-1" /> {text.addExpense}
                </Button>
                {expensesExpanded && (
                  <div className="mt-3 space-y-3">
                    <div className="p-3 bg-green-100/50 dark:bg-green-800/30 rounded-lg">
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2">{text.aiExpenses}</p>
                      <div className="flex flex-wrap gap-1">
                        {EXPENSES_EXAMPLES.map((ex, i) => (
                          <button
                            key={i}
                            onClick={() => setExpenseItems([...expenseItems, { id: generateId(), name: language === 'ar' ? ex.name : ex.nameEn, amount: '' }])}
                            className="px-2 py-1 text-xs bg-white dark:bg-green-900 rounded-full border border-green-200 dark:border-green-700 hover:bg-green-50"
                          >
                            {ex.icon} {language === 'ar' ? ex.name : ex.nameEn}
                          </button>
                        ))}
                      </div>
                    </div>
                    {expenseItems.length > 0 && (
                      <div className="space-y-2">
                        {expenseItems.map((item) => (
                          <div key={item.id} className="flex gap-2 items-center">
                            <Input
                              placeholder={text.expenseNamePlaceholder}
                              value={item.name}
                              onChange={(e) => updateExpenseItem(item.id, 'name', e.target.value)}
                              className="flex-1 h-8 text-sm"
                            />
                            <div className="relative">
                              <Input
                                placeholder={text.amountPlaceholder}
                                type="text"
                                value={item.amount}
                                onChange={(e) => updateExpenseItem(item.id, 'amount', e.target.value)}
                                className="w-32 h-8 text-sm pe-10"
                                dir="ltr"
                              />
                              <span className={`absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground ${isArabic ? 'left-3' : 'right-3'}`}>
                                {getCurrentCurrency().symbol}
                              </span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeExpenseItem(item.id)} className="h-8 w-8 text-red-500 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex justify-end pt-2 border-t border-green-200 dark:border-green-700">
                          <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                            {text.sumExpenses}: {formatCurrency(expenseItems.reduce((sum, item) => sum + (parseFloat(item.amount.replace(/[^\d.]/g, '')) || 0), 0))} {getCurrentCurrency().symbol}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Savings */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setSavingsExpanded(!savingsExpanded)}>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                    <span className="font-semibold text-blue-700 dark:text-blue-400">{text.savings}</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">20%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-blue-800 dark:text-blue-300">
                      {formatCurrency(breakdown.savings)} {getCurrentCurrency().symbol}
                    </span>
                    {savingsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
                <Button onClick={addSavingsItem} variant="ghost" size="sm" className="w-full mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100">
                  <Plus className="w-4 h-4 ms-1" /> {text.addSaving}
                </Button>
                {savingsExpanded && (
                  <div className="mt-3 space-y-3">
                    <div className="p-3 bg-blue-100/50 dark:bg-blue-800/30 rounded-lg">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">{text.aiSavings}</p>
                      <div className="flex flex-wrap gap-1">
                        {SAVINGS_EXAMPLES.map((ex, i) => (
                          <button
                            key={i}
                            onClick={() => setSavingsItems([...savingsItems, { id: generateId(), name: language === 'ar' ? ex.name : ex.nameEn, amount: '' }])}
                            className="px-2 py-1 text-xs bg-white dark:bg-blue-900 rounded-full border border-blue-200 dark:border-blue-700 hover:bg-blue-50"
                          >
                            {ex.icon} {language === 'ar' ? ex.name : ex.nameEn}
                          </button>
                        ))}
                      </div>
                    </div>
                    {savingsItems.length > 0 && (
                      <div className="space-y-2">
                        {savingsItems.map((item) => (
                          <div key={item.id} className="flex gap-2 items-center">
                            <Input
                              placeholder={text.savingNamePlaceholder}
                              value={item.name}
                              onChange={(e) => updateSavingsItem(item.id, 'name', e.target.value)}
                              className="flex-1 h-8 text-sm"
                            />
                            <div className="relative">
                              <Input
                                placeholder={text.amountPlaceholder}
                                type="text"
                                value={item.amount}
                                onChange={(e) => updateSavingsItem(item.id, 'amount', e.target.value)}
                                className="w-32 h-8 text-sm pe-10"
                                dir="ltr"
                              />
                              <span className={`absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground ${isArabic ? 'left-3' : 'right-3'}`}>
                                {getCurrentCurrency().symbol}
                              </span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeSavingsItem(item.id)} className="h-8 w-8 text-red-500 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex justify-end pt-2 border-t border-blue-200 dark:border-blue-700">
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                            {text.sumSavings}: {formatCurrency(savingsItems.reduce((sum, item) => sum + (parseFloat(item.amount.replace(/[^\d.]/g, '')) || 0), 0))} {getCurrentCurrency().symbol}
                          </span>
                        </div>
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
                    <span className="font-semibold text-amber-700 dark:text-amber-400">{text.investment}</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">10%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-amber-800 dark:text-amber-300">
                      {formatCurrency(breakdown.investment)} {getCurrentCurrency().symbol}
                    </span>
                    {investmentExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
                <Button onClick={addInvestmentItem} variant="ghost" size="sm" className="w-full mt-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100">
                  <Plus className="w-4 h-4 ms-1" /> {text.addInvestment}
                </Button>
                {investmentExpanded && (
                  <div className="mt-3 space-y-3">
                    <div className="p-3 bg-amber-100/50 dark:bg-amber-800/30 rounded-lg">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">{text.aiInvestment}</p>
                      <div className="flex flex-wrap gap-1">
                        {INVESTMENT_EXAMPLES.map((ex, i) => (
                          <button
                            key={i}
                            onClick={() => setInvestmentItems([...investmentItems, { id: generateId(), name: language === 'ar' ? ex.name : ex.nameEn, amount: '' }])}
                            className="px-2 py-1 text-xs bg-white dark:bg-amber-900 rounded-full border border-amber-200 dark:border-amber-700 hover:bg-amber-50"
                          >
                            {ex.icon} {language === 'ar' ? ex.name : ex.nameEn}
                          </button>
                        ))}
                      </div>
                    </div>
                    {investmentItems.length > 0 && (
                      <div className="space-y-2">
                        {investmentItems.map((item) => (
                          <div key={item.id} className="flex gap-2 items-center">
                            <Input
                              placeholder={text.investmentNamePlaceholder}
                              value={item.name}
                              onChange={(e) => updateInvestmentItem(item.id, 'name', e.target.value)}
                              className="flex-1 h-8 text-sm"
                            />
                            <div className="relative">
                              <Input
                                placeholder={text.amountPlaceholder}
                                type="text"
                                value={item.amount}
                                onChange={(e) => updateInvestmentItem(item.id, 'amount', e.target.value)}
                                className="w-32 h-8 text-sm pe-10"
                                dir="ltr"
                              />
                              <span className={`absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground ${isArabic ? 'left-3' : 'right-3'}`}>
                                {getCurrentCurrency().symbol}
                              </span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeInvestmentItem(item.id)} className="h-8 w-8 text-red-500 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex justify-end pt-2 border-t border-amber-200 dark:border-amber-700">
                          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                            {text.sumInvestment}: {formatCurrency(investmentItems.reduce((sum, item) => sum + (parseFloat(item.amount.replace(/[^\d.]/g, '')) || 0), 0))} {getCurrentCurrency().symbol}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Charity */}
              {includeCharity && breakdown.charity > 0 && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/30 rounded-xl border border-rose-200 dark:border-rose-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-rose-500" />
                      <span className="font-semibold text-rose-700 dark:text-rose-400">{text.charity}</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">{totalCharityPercentage}%</span>
                    </div>
                    <span className="text-xl font-bold text-rose-800 dark:text-rose-300">
                      {formatCurrency(breakdown.charity)} {getCurrentCurrency().symbol}
                    </span>
                  </div>
                  {selectedCharityTypes.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-rose-200 dark:border-rose-800">
                      <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{text.charityTypes}:</p>
                      {selectedCharityTypes.map((type) => {
                        const percentage = charityPercentages[type] || 0;
                        const amount = totalIncome * (percentage / 100);
                        return (
                          <div key={type} className="flex justify-between items-center text-sm">
                            <span className="text-rose-700 dark:text-rose-300">
                              {type === 'sadaqah' ? text.charitySadaqah :
                               type === 'zakat' ? text.charityZakat :
                               type === 'sacrifice' ? text.charitySacrifice :
                               type === 'expiation' ? text.charityExpiation :
                               text.charityOther}
                            </span>
                            <span className="text-rose-600 dark:text-rose-400">
                              {percentage}% = {formatCurrency(amount)} {getCurrentCurrency().symbol}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
        </Card>

        {/* Goals Section */}
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="bg-purple-50 dark:bg-purple-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <Target className="w-6 h-6" />
              {text.goalsTitle}
            </CardTitle>
            <CardDescription>{text.goalsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <Button onClick={addGoal} variant="outline" className="w-full border-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900">
              <Plus className="w-5 h-5 ms-2" />
              {text.addGoal}
            </Button>

            {goals.length > 0 && (
              <div className="space-y-4">
                {goals.map((goal) => (
                  <div key={goal.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Target className="w-3 h-3" /> {text.goal}
                        </Label>
                        <Input
                          placeholder={text.goalNamePlaceholder}
                          value={goal.goal}
                          onChange={(e) => updateGoal(goal.id, 'goal', e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Banknote className="w-3 h-3" /> {text.amount}
                        </Label>
                        <Input
                            placeholder="0.00"
                            type="text"
                            value={goal.amount}
                            onChange={(e) => updateGoal(goal.id, 'amount', e.target.value)}
                            className="h-10 ltr"
                            dir="ltr"
                          />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {text.duration}
                        </Label>
                        <div className="flex gap-1">
                          <Input
                            placeholder={isArabic ? 'المدة' : 'Duration'}
                            type="number"
                            value={goal.duration}
                            onChange={(e) => updateGoal(goal.id, 'duration', e.target.value)}
                            className="h-10 w-20"
                            dir="ltr"
                          />
                          <Select
                            value={goal.durationUnit}
                            onValueChange={(value) => updateGoal(goal.id, 'durationUnit', value as DurationUnit)}
                          >
                            <SelectTrigger className="h-10 w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="day">{text.durationUnitDay}</SelectItem>
                              <SelectItem value="month">{text.durationUnitMonth}</SelectItem>
                              <SelectItem value="year">{text.durationUnitYear}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" /> {text.notes}
                        </Label>
                        <Input
                          placeholder={text.notesPlaceholder}
                          value={goal.notes}
                          onChange={(e) => updateGoal(goal.id, 'notes', e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="flex items-end">
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
                    {goal.amount && goal.duration && totalIncome > 0 && (
                      <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                        <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">{text.goalSuggestion}</p>
                        <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed">{getGoalSuggestion(goal)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {goals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Goal className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{text.noGoals}</p>
                <p className="text-sm">{text.noGoalsHint}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Advice Section */}
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="bg-purple-50 dark:bg-purple-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <Sparkles className="w-6 h-6" />
              {text.adviceTitle}
            </CardTitle>
            <CardDescription>{text.adviceDesc}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl border border-purple-200 dark:border-purple-800">
              <p className="text-lg leading-relaxed text-purple-900 dark:text-purple-100">
                {getAIAdvice()}
              </p>
            </div>
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
            {text.print}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="lg"
            className="border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
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
