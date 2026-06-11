'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AtSign,
  ChevronLeft,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { CurrencySelect } from '@/components/CurrencySelect';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { isEmail } from '@/lib/authSecurity';
import { trackEvent } from '@/lib/analytics';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset' | 'twoFactor' | 'phone';
type Message = { type: 'error' | 'ok'; text: string } | null;
type PasswordStrength = 'weak' | 'medium' | 'strong';
type TwoFactorChallenge = {
  email: string;
};
const MIN_PASSWORD_LENGTH = 6;

function syncLoggedInCookies(session: Session | null) {
  if (typeof document === 'undefined') return;
  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `sfm_auth=${session ? 'true' : ''}; path=/; max-age=${session ? 60 * 60 * 24 * 30 : 0}; SameSite=Lax`;
  document.cookie = `sfm_access_token=${session?.access_token ?? ''}; path=/; max-age=${session?.access_token ? 60 * 60 * 24 * 7 : 0}; SameSite=Lax${secureFlag}`;
  document.cookie = 'sfm_guest=; path=/; max-age=0; SameSite=Lax';
  try {
    window.localStorage?.removeItem('sfm_guest_mode');
    window.localStorage?.removeItem('sfm_guest_started_at');
  } catch {
    // Keep login navigation working in restricted browser storage contexts.
  }
}

function setMfaRequiredCookie(required: boolean) {
  if (typeof document === 'undefined') return;
  document.cookie = `sfm_mfa_required=${required ? 'true' : ''}; path=/; max-age=${required ? 60 * 15 : 0}; SameSite=Lax`;
}

const COUNTRY_OPTIONS = [
  { value: 'Kuwait', ar: 'الكويت', en: 'Kuwait', fr: 'Koweït' },
  { value: 'Saudi Arabia', ar: 'السعودية', en: 'Saudi Arabia', fr: 'Arabie saoudite' },
  { value: 'United Arab Emirates', ar: 'الإمارات', en: 'UAE', fr: 'Émirats arabes unis' },
  { value: 'Qatar', ar: 'قطر', en: 'Qatar', fr: 'Qatar' },
  { value: 'Bahrain', ar: 'البحرين', en: 'Bahrain', fr: 'Bahreïn' },
  { value: 'Oman', ar: 'عُمان', en: 'Oman', fr: 'Oman' },
  { value: 'Other', ar: 'أخرى', en: 'Other', fr: 'Autre' },
] as const;

const QUESTION_OPTIONS = {
  ar: [
    'ما اسم أول مدينة عشت فيها؟',
    'ما اسم أول مدرسة درست فيها؟',
    'ما اسم شخص تثق به؟',
    'ما اسم أول مشروع عملت عليه؟',
  ],
  en: [
    'What was the first city you lived in?',
    'What was the name of your first school?',
    'What is the name of someone you trust?',
    'What was the name of your first project?',
  ],
  fr: [
    'Quelle est la première ville où vous avez vécu ?',
    'Quel était le nom de votre première école ?',
    'Quel est le nom d’une personne de confiance ?',
    'Quel était le nom de votre premier projet ?',
  ],
} as const;

const DIAL_CODES = [
  // GCC – أول الخيارات
  { dial: '+965', name: 'الكويت / Kuwait', flag: '🇰🇼' },
  { dial: '+966', name: 'السعودية / Saudi Arabia', flag: '🇸🇦' },
  { dial: '+971', name: 'الإمارات / UAE', flag: '🇦🇪' },
  { dial: '+974', name: 'قطر / Qatar', flag: '🇶🇦' },
  { dial: '+973', name: 'البحرين / Bahrain', flag: '🇧🇭' },
  { dial: '+968', name: 'عُمان / Oman', flag: '🇴🇲' },
  // الدول العربية
  { dial: '+20',  name: 'مصر / Egypt', flag: '🇪🇬' },
  { dial: '+962', name: 'الأردن / Jordan', flag: '🇯🇴' },
  { dial: '+961', name: 'لبنان / Lebanon', flag: '🇱🇧' },
  { dial: '+963', name: 'سوريا / Syria', flag: '🇸🇾' },
  { dial: '+964', name: 'العراق / Iraq', flag: '🇮🇶' },
  { dial: '+967', name: 'اليمن / Yemen', flag: '🇾🇪' },
  { dial: '+970', name: 'فلسطين / Palestine', flag: '🇵🇸' },
  { dial: '+212', name: 'المغرب / Morocco', flag: '🇲🇦' },
  { dial: '+213', name: 'الجزائر / Algeria', flag: '🇩🇿' },
  { dial: '+216', name: 'تونس / Tunisia', flag: '🇹🇳' },
  { dial: '+218', name: 'ليبيا / Libya', flag: '🇱🇾' },
  { dial: '+249', name: 'السودان / Sudan', flag: '🇸🇩' },
  { dial: '+252', name: 'الصومال / Somalia', flag: '🇸🇴' },
  { dial: '+222', name: 'موريتانيا / Mauritania', flag: '🇲🇷' },
  // أمريكا الشمالية
  { dial: '+1',   name: 'الولايات المتحدة / USA', flag: '🇺🇸' },
  { dial: '+1',   name: 'كندا / Canada', flag: '🇨🇦' },
  { dial: '+52',  name: 'المكسيك / Mexico', flag: '🇲🇽' },
  // أوروبا
  { dial: '+44',  name: 'المملكة المتحدة / UK', flag: '🇬🇧' },
  { dial: '+33',  name: 'فرنسا / France', flag: '🇫🇷' },
  { dial: '+49',  name: 'ألمانيا / Germany', flag: '🇩🇪' },
  { dial: '+39',  name: 'إيطاليا / Italy', flag: '🇮🇹' },
  { dial: '+34',  name: 'إسبانيا / Spain', flag: '🇪🇸' },
  { dial: '+31',  name: 'هولندا / Netherlands', flag: '🇳🇱' },
  { dial: '+32',  name: 'بلجيكا / Belgium', flag: '🇧🇪' },
  { dial: '+41',  name: 'سويسرا / Switzerland', flag: '🇨🇭' },
  { dial: '+43',  name: 'النمسا / Austria', flag: '🇦🇹' },
  { dial: '+351', name: 'البرتغال / Portugal', flag: '🇵🇹' },
  { dial: '+30',  name: 'اليونان / Greece', flag: '🇬🇷' },
  { dial: '+46',  name: 'السويد / Sweden', flag: '🇸🇪' },
  { dial: '+47',  name: 'النرويج / Norway', flag: '🇳🇴' },
  { dial: '+45',  name: 'الدنمارك / Denmark', flag: '🇩🇰' },
  { dial: '+358', name: 'فنلندا / Finland', flag: '🇫🇮' },
  { dial: '+354', name: 'آيسلندا / Iceland', flag: '🇮🇸' },
  { dial: '+353', name: 'أيرلندا / Ireland', flag: '🇮🇪' },
  { dial: '+48',  name: 'بولندا / Poland', flag: '🇵🇱' },
  { dial: '+380', name: 'أوكرانيا / Ukraine', flag: '🇺🇦' },
  { dial: '+40',  name: 'رومانيا / Romania', flag: '🇷🇴' },
  { dial: '+36',  name: 'المجر / Hungary', flag: '🇭🇺' },
  { dial: '+420', name: 'التشيك / Czech Republic', flag: '🇨🇿' },
  { dial: '+421', name: 'سلوفاكيا / Slovakia', flag: '🇸🇰' },
  { dial: '+386', name: 'سلوفينيا / Slovenia', flag: '🇸🇮' },
  { dial: '+385', name: 'كرواتيا / Croatia', flag: '🇭🇷' },
  { dial: '+387', name: 'البوسنة / Bosnia', flag: '🇧🇦' },
  { dial: '+381', name: 'صربيا / Serbia', flag: '🇷🇸' },
  { dial: '+382', name: 'الجبل الأسود / Montenegro', flag: '🇲🇪' },
  { dial: '+383', name: 'كوسوفو / Kosovo', flag: '🇽🇰' },
  { dial: '+389', name: 'مقدونيا الشمالية / N. Macedonia', flag: '🇲🇰' },
  { dial: '+355', name: 'ألبانيا / Albania', flag: '🇦🇱' },
  { dial: '+359', name: 'بلغاريا / Bulgaria', flag: '🇧🇬' },
  { dial: '+372', name: 'إستونيا / Estonia', flag: '🇪🇪' },
  { dial: '+371', name: 'لاتفيا / Latvia', flag: '🇱🇻' },
  { dial: '+370', name: 'ليتوانيا / Lithuania', flag: '🇱🇹' },
  { dial: '+352', name: 'لوكسمبورغ / Luxembourg', flag: '🇱🇺' },
  { dial: '+357', name: 'قبرص / Cyprus', flag: '🇨🇾' },
  { dial: '+356', name: 'مالطا / Malta', flag: '🇲🇹' },
  { dial: '+376', name: 'أندورا / Andorra', flag: '🇦🇩' },
  { dial: '+377', name: 'موناكو / Monaco', flag: '🇲🇨' },
  { dial: '+378', name: 'سان مارينو / San Marino', flag: '🇸🇲' },
  { dial: '+423', name: 'ليختنشتاين / Liechtenstein', flag: '🇱🇮' },
  { dial: '+350', name: 'جبل طارق / Gibraltar', flag: '🇬🇮' },
  { dial: '+298', name: 'جزر فاروه / Faroe Islands', flag: '🇫🇴' },
  { dial: '+375', name: 'بيلاروسيا / Belarus', flag: '🇧🇾' },
  { dial: '+373', name: 'مولدوفا / Moldova', flag: '🇲🇩' },
  { dial: '+374', name: 'أرمينيا / Armenia', flag: '🇦🇲' },
  { dial: '+994', name: 'أذربيجان / Azerbaijan', flag: '🇦🇿' },
  { dial: '+995', name: 'جورجيا / Georgia', flag: '🇬🇪' },
  // روسيا وآسيا الوسطى
  { dial: '+7',   name: 'روسيا / Russia', flag: '🇷🇺' },
  { dial: '+7',   name: 'كازاخستان / Kazakhstan', flag: '🇰🇿' },
  { dial: '+998', name: 'أوزبكستان / Uzbekistan', flag: '🇺🇿' },
  { dial: '+993', name: 'تركمانستان / Turkmenistan', flag: '🇹🇲' },
  { dial: '+992', name: 'طاجيكستان / Tajikistan', flag: '🇹🇯' },
  { dial: '+996', name: 'قيرغيزستان / Kyrgyzstan', flag: '🇰🇬' },
  // آسيا
  { dial: '+90',  name: 'تركيا / Turkey', flag: '🇹🇷' },
  { dial: '+98',  name: 'إيران / Iran', flag: '🇮🇷' },
  { dial: '+93',  name: 'أفغانستان / Afghanistan', flag: '🇦🇫' },
  { dial: '+92',  name: 'باكستان / Pakistan', flag: '🇵🇰' },
  { dial: '+91',  name: 'الهند / India', flag: '🇮🇳' },
  { dial: '+880', name: 'بنغلاديش / Bangladesh', flag: '🇧🇩' },
  { dial: '+94',  name: 'سريلانكا / Sri Lanka', flag: '🇱🇰' },
  { dial: '+977', name: 'نيبال / Nepal', flag: '🇳🇵' },
  { dial: '+975', name: 'بوتان / Bhutan', flag: '🇧🇹' },
  { dial: '+960', name: 'المالديف / Maldives', flag: '🇲🇻' },
  { dial: '+86',  name: 'الصين / China', flag: '🇨🇳' },
  { dial: '+852', name: 'هونغ كونغ / Hong Kong', flag: '🇭🇰' },
  { dial: '+853', name: 'ماكاو / Macao', flag: '🇲🇴' },
  { dial: '+886', name: 'تايوان / Taiwan', flag: '🇹🇼' },
  { dial: '+81',  name: 'اليابان / Japan', flag: '🇯🇵' },
  { dial: '+82',  name: 'كوريا الجنوبية / South Korea', flag: '🇰🇷' },
  { dial: '+850', name: 'كوريا الشمالية / North Korea', flag: '🇰🇵' },
  { dial: '+976', name: 'منغوليا / Mongolia', flag: '🇲🇳' },
  { dial: '+60',  name: 'ماليزيا / Malaysia', flag: '🇲🇾' },
  { dial: '+65',  name: 'سنغافورة / Singapore', flag: '🇸🇬' },
  { dial: '+62',  name: 'إندونيسيا / Indonesia', flag: '🇮🇩' },
  { dial: '+63',  name: 'الفلبين / Philippines', flag: '🇵🇭' },
  { dial: '+66',  name: 'تايلاند / Thailand', flag: '🇹🇭' },
  { dial: '+84',  name: 'فيتنام / Vietnam', flag: '🇻🇳' },
  { dial: '+855', name: 'كمبوديا / Cambodia', flag: '🇰🇭' },
  { dial: '+856', name: 'لاوس / Laos', flag: '🇱🇦' },
  { dial: '+95',  name: 'ميانمار / Myanmar', flag: '🇲🇲' },
  { dial: '+670', name: 'تيمور الشرقية / Timor-Leste', flag: '🇹🇱' },
  { dial: '+673', name: 'بروناي / Brunei', flag: '🇧🇳' },
  // أوقيانوسيا
  { dial: '+61',  name: 'أستراليا / Australia', flag: '🇦🇺' },
  { dial: '+64',  name: 'نيوزيلندا / New Zealand', flag: '🇳🇿' },
  { dial: '+675', name: 'بابوا غينيا الجديدة / Papua New Guinea', flag: '🇵🇬' },
  { dial: '+679', name: 'فيجي / Fiji', flag: '🇫🇯' },
  { dial: '+685', name: 'ساموا / Samoa', flag: '🇼🇸' },
  { dial: '+676', name: 'تونغا / Tonga', flag: '🇹🇴' },
  { dial: '+677', name: 'جزر سليمان / Solomon Islands', flag: '🇸🇧' },
  { dial: '+678', name: 'فانواتو / Vanuatu', flag: '🇻🇺' },
  { dial: '+680', name: 'بالاو / Palau', flag: '🇵🇼' },
  { dial: '+691', name: 'ميكرونيزيا / Micronesia', flag: '🇫🇲' },
  { dial: '+692', name: 'جزر مارشال / Marshall Islands', flag: '🇲🇭' },
  { dial: '+688', name: 'توفالو / Tuvalu', flag: '🇹🇻' },
  { dial: '+686', name: 'كيريباتي / Kiribati', flag: '🇰🇮' },
  { dial: '+674', name: 'ناورو / Nauru', flag: '🇳🇷' },
  { dial: '+687', name: 'كاليدونيا الجديدة / New Caledonia', flag: '🇳🇨' },
  { dial: '+689', name: 'بولينيزيا الفرنسية / French Polynesia', flag: '🇵🇫' },
  { dial: '+682', name: 'جزر كوك / Cook Islands', flag: '🇨🇰' },
  // أمريكا اللاتينية
  { dial: '+55',  name: 'البرازيل / Brazil', flag: '🇧🇷' },
  { dial: '+54',  name: 'الأرجنتين / Argentina', flag: '🇦🇷' },
  { dial: '+56',  name: 'تشيلي / Chile', flag: '🇨🇱' },
  { dial: '+57',  name: 'كولومبيا / Colombia', flag: '🇨🇴' },
  { dial: '+51',  name: 'بيرو / Peru', flag: '🇵🇪' },
  { dial: '+58',  name: 'فنزويلا / Venezuela', flag: '🇻🇪' },
  { dial: '+593', name: 'الإكوادور / Ecuador', flag: '🇪🇨' },
  { dial: '+591', name: 'بوليفيا / Bolivia', flag: '🇧🇴' },
  { dial: '+595', name: 'باراغواي / Paraguay', flag: '🇵🇾' },
  { dial: '+598', name: 'أوروغواي / Uruguay', flag: '🇺🇾' },
  { dial: '+592', name: 'غيانا / Guyana', flag: '🇬🇾' },
  { dial: '+597', name: 'سورينام / Suriname', flag: '🇸🇷' },
  { dial: '+507', name: 'بنما / Panama', flag: '🇵🇦' },
  { dial: '+506', name: 'كوستاريكا / Costa Rica', flag: '🇨🇷' },
  { dial: '+505', name: 'نيكاراغوا / Nicaragua', flag: '🇳🇮' },
  { dial: '+504', name: 'هندوراس / Honduras', flag: '🇭🇳' },
  { dial: '+503', name: 'السلفادور / El Salvador', flag: '🇸🇻' },
  { dial: '+502', name: 'غواتيمالا / Guatemala', flag: '🇬🇹' },
  { dial: '+501', name: 'بليز / Belize', flag: '🇧🇿' },
  { dial: '+53',  name: 'كوبا / Cuba', flag: '🇨🇺' },
  { dial: '+509', name: 'هايتي / Haiti', flag: '🇭🇹' },
  { dial: '+1809',name: 'الدومينيكان / Dominican Republic', flag: '🇩🇴' },
  { dial: '+1876',name: 'جامايكا / Jamaica', flag: '🇯🇲' },
  { dial: '+1868',name: 'ترينيداد وتوباغو / Trinidad & Tobago', flag: '🇹🇹' },
  { dial: '+1758',name: 'سانت لوسيا / Saint Lucia', flag: '🇱🇨' },
  { dial: '+1473',name: 'غرينادا / Grenada', flag: '🇬🇩' },
  { dial: '+1767',name: 'دومينيكا / Dominica', flag: '🇩🇲' },
  { dial: '+1784',name: 'سانت فنسنت / Saint Vincent', flag: '🇻🇨' },
  { dial: '+1869',name: 'سانت كيتس / Saint Kitts', flag: '🇰🇳' },
  { dial: '+1268',name: 'أنتيغوا / Antigua & Barbuda', flag: '🇦🇬' },
  { dial: '+1246',name: 'باربادوس / Barbados', flag: '🇧🇧' },
  { dial: '+1242',name: 'الباهاما / Bahamas', flag: '🇧🇸' },
  { dial: '+1787',name: 'بورتوريكو / Puerto Rico', flag: '🇵🇷' },
  { dial: '+1345',name: 'جزر كايمان / Cayman Islands', flag: '🇰🇾' },
  { dial: '+1441',name: 'برمودا / Bermuda', flag: '🇧🇲' },
  { dial: '+297', name: 'أروبا / Aruba', flag: '🇦🇼' },
  // أفريقيا
  { dial: '+27',  name: 'جنوب أفريقيا / South Africa', flag: '🇿🇦' },
  { dial: '+234', name: 'نيجيريا / Nigeria', flag: '🇳🇬' },
  { dial: '+254', name: 'كينيا / Kenya', flag: '🇰🇪' },
  { dial: '+256', name: 'أوغندا / Uganda', flag: '🇺🇬' },
  { dial: '+255', name: 'تنزانيا / Tanzania', flag: '🇹🇿' },
  { dial: '+251', name: 'إثيوبيا / Ethiopia', flag: '🇪🇹' },
  { dial: '+233', name: 'غانا / Ghana', flag: '🇬🇭' },
  { dial: '+221', name: 'السنغال / Senegal', flag: '🇸🇳' },
  { dial: '+225', name: 'كوت ديفوار / Ivory Coast', flag: '🇨🇮' },
  { dial: '+237', name: 'الكاميرون / Cameroon', flag: '🇨🇲' },
  { dial: '+260', name: 'زامبيا / Zambia', flag: '🇿🇲' },
  { dial: '+263', name: 'زيمبابوي / Zimbabwe', flag: '🇿🇼' },
  { dial: '+258', name: 'موزمبيق / Mozambique', flag: '🇲🇿' },
  { dial: '+250', name: 'رواندا / Rwanda', flag: '🇷🇼' },
  { dial: '+261', name: 'مدغشقر / Madagascar', flag: '🇲🇬' },
  { dial: '+248', name: 'سيشيل / Seychelles', flag: '🇸🇨' },
  { dial: '+230', name: 'موريشيوس / Mauritius', flag: '🇲🇺' },
  { dial: '+264', name: 'ناميبيا / Namibia', flag: '🇳🇦' },
  { dial: '+267', name: 'بوتسوانا / Botswana', flag: '🇧🇼' },
  { dial: '+268', name: 'إيسواتيني / Eswatini', flag: '🇸🇿' },
  { dial: '+266', name: 'ليسوتو / Lesotho', flag: '🇱🇸' },
  { dial: '+265', name: 'مالاوي / Malawi', flag: '🇲🇼' },
  { dial: '+257', name: 'بوروندي / Burundi', flag: '🇧🇮' },
  { dial: '+253', name: 'جيبوتي / Djibouti', flag: '🇩🇯' },
  { dial: '+291', name: 'إريتريا / Eritrea', flag: '🇪🇷' },
  { dial: '+241', name: 'الغابون / Gabon', flag: '🇬🇦' },
  { dial: '+242', name: 'الكونغو / Congo', flag: '🇨🇬' },
  { dial: '+243', name: 'الكونغو الديمقراطية / DR Congo', flag: '🇨🇩' },
  { dial: '+244', name: 'أنغولا / Angola', flag: '🇦🇴' },
  { dial: '+240', name: 'غينيا الاستوائية / Equatorial Guinea', flag: '🇬🇶' },
  { dial: '+236', name: 'أفريقيا الوسطى / CAR', flag: '🇨🇫' },
  { dial: '+235', name: 'تشاد / Chad', flag: '🇹🇩' },
  { dial: '+227', name: 'النيجر / Niger', flag: '🇳🇪' },
  { dial: '+228', name: 'توغو / Togo', flag: '🇹🇬' },
  { dial: '+229', name: 'بنين / Benin', flag: '🇧🇯' },
  { dial: '+226', name: 'بوركينا فاسو / Burkina Faso', flag: '🇧🇫' },
  { dial: '+223', name: 'مالي / Mali', flag: '🇲🇱' },
  { dial: '+224', name: 'غينيا / Guinea', flag: '🇬🇳' },
  { dial: '+232', name: 'سيراليون / Sierra Leone', flag: '🇸🇱' },
  { dial: '+231', name: 'ليبيريا / Liberia', flag: '🇱🇷' },
  { dial: '+245', name: 'غينيا بيساو / Guinea-Bissau', flag: '🇬🇼' },
  { dial: '+238', name: 'رأس الخضراء / Cape Verde', flag: '🇨🇻' },
  { dial: '+220', name: 'غامبيا / Gambia', flag: '🇬🇲' },
  { dial: '+269', name: 'جزر القمر / Comoros', flag: '🇰🇲' },
  { dial: '+239', name: 'ساو تومي وبرينسيبي / São Tomé', flag: '🇸🇹' },
] as const;

const TEXT = {
  ar: {
    title: 'المدير المالي الذكي',
    subtitle: 'ادخل إلى لوحة THE SFM لإدارة دخلك ومصروفاتك وأهدافك بوضوح.',
    login: 'تسجيل الدخول',
    create: 'إنشاء حساب',
    forgot: 'استعادة كلمة المرور',
    reset: 'تعيين كلمة مرور جديدة',
    usernameOrEmail: 'اسم المستخدم أو البريد الإلكتروني',
    username: 'اسم المستخدم',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    defaultCurrency: 'العملة الافتراضية',
    country: 'الدولة',
    securityQuestion: 'سؤال الأمان',
    customQuestion: 'سؤال مخصص',
    customQuestionPlaceholder: 'اكتب سؤال الأمان الخاص بك',
    securityAnswer: 'إجابة سؤال الأمان',
    securityOptional: 'سؤال الأمان اختياري ويستخدم كطبقة تحقق إضافية فقط، وليس بديلاً عن البريد الإلكتروني.',
    termsPrefix: 'أوافق على',
    terms: 'الشروط',
    privacy: 'سياسة الخصوصية',
    and: 'و',
    accountDetails: 'بيانات الحساب',
    preferencesSecurity: 'التفضيلات والأمان',
    continue: 'متابعة',
    back: 'السابق',
    signIn: 'تسجيل الدخول',
    createAccount: 'إنشاء الحساب',
    signingIn: 'جاري تسجيل الدخول...',
    saving: 'جاري إنشاء الحساب...',
    sendReset: 'إرسال رابط الاستعادة',
    sendResetBody: 'أدخل بريدك الإلكتروني لإرسال رابط استعادة كلمة المرور.',
    resetSent: 'إذا كان البريد مسجلاً، سنرسل لك رابط إعادة تعيين كلمة المرور. تحقق من البريد الوارد والرسائل غير المرغوبة.',
    resetSendError: 'تعذر إرسال رابط الاستعادة حالياً. حاول مرة أخرى.',
    resetAccountNotFound: 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.',
    resetVerifyError: 'تعذر التحقق من البريد حالياً. تأكد من إعدادات الخادم ثم حاول مرة أخرى.',
    resetSuccess: 'تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.',
    switchCreate: 'إنشاء حساب جديد',
    switchLogin: 'لدي حساب بالفعل',
    forgotLink: 'نسيت كلمة المرور؟',
    guest: 'متابعة كضيف',
    weak: 'ضعيفة',
    medium: 'متوسطة',
    strong: 'قوية',
    recommended: 'استخدم كلمة مرور أطول لزيادة الأمان.',
    optional: 'اختياري',
    required: 'مطلوب',
    emailPlaceholder: 'name@example.com',
    usernamePlaceholder: 'اختر اسم مستخدم',
    loginPlaceholder: 'اسم المستخدم أو البريد الإلكتروني',
    passwordPlaceholder: 'أدخل كلمة المرور',
    recoveryQuestionTitle: 'تحقق إضافي',
    recoveryQuestionHelp: 'تم التحقق من البريد. أجب عن سؤال الأمان لإكمال إعادة التعيين.',
    hidePassword: 'إخفاء كلمة المرور',
    showPassword: 'إظهار كلمة المرور',
    errorEmpty: 'أكمل كل الحقول المطلوبة.',
    errorUsername: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل.',
    errorEmail: 'الرجاء إدخال بريد إلكتروني صحيح.',
    errorPasswordLength: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.',
    errorPasswordContent: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.',
    errorMismatch: 'كلمتا المرور غير متطابقتين.',
    errorTerms: 'يجب الموافقة على الشروط وسياسة الخصوصية للمتابعة.',
    errorExists: 'اسم المستخدم مستخدم بالفعل.',
    errorRegister: 'تعذر إنشاء الحساب. حاول مرة أخرى.',
    errorProfileCreate: 'تم إنشاء الحساب، لكن تعذر حفظ بيانات الملف الشخصي. الرجاء المحاولة مرة أخرى.',
    errorLogin: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
    errorUsernameNotFound: 'اسم المستخدم غير موجود',
    errorProfileEmailMissing: 'لا يوجد بريد إلكتروني مرتبط بهذا المستخدم',
    errorInvalidCredentials: 'بيانات الدخول غير صحيحة.',
    profileSetupNeeded: 'تم تسجيل الدخول، يرجى إكمال إعداد الحساب.',
    errorLoginGeneric: 'تعذر تسجيل الدخول حالياً. حاول مرة أخرى.',
    errorSecurityPair: 'أكمل سؤال الأمان وإجابته أو اتركهما فارغين.',
    errorSecurityAnswer: 'إجابة سؤال الأمان غير صحيحة.',
    errorSecurityLocked: 'تم تجاوز عدد المحاولات. استخدم رابط البريد الإلكتروني لاحقاً.',
    checkEmail: 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب إذا كان التحقق مفعلاً.',
    noReveal: 'لن نكشف ما إذا كان البريد مسجلاً لحماية الحسابات.',
    twoFactorTitle: 'التحقق عبر البريد الإلكتروني',
    twoFactorBody: 'أدخل رمز التحقق المرسل إلى بريدك الإلكتروني قبل الدخول إلى الحساب.',
    twoFactorSent: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.',
    twoFactorSendError: 'تعذر إرسال رمز التحقق حالياً. حاول مرة أخرى.',
    verificationCode: 'رمز التحقق',
    verifyCode: 'تحقق',
    verifyingCode: 'جاري التحقق...',
    resendCode: 'إعادة إرسال الرمز',
    invalidCode: 'رمز التحقق غير صحيح.',
    codeExpired: 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.',
    codeInvalidOrExpired: 'رمز التحقق غير صحيح أو منتهي الصلاحية.',
    twoFactorNoEmail: 'لا يمكن إكمال المصادقة الثنائية بدون بريد إلكتروني صالح.',
    orContinueWith: 'أو تابع عبر',
    signInGoogle: 'تسجيل الدخول عبر Google',
    signInApple: 'تسجيل الدخول عبر Apple',
    signInPhone: 'تسجيل الدخول برقم الهاتف',
    phoneTitle: 'تسجيل الدخول برقم الهاتف',
    phoneBody: 'سنرسل رمز تحقق عبر رسالة نصية SMS إلى رقمك.',
    phoneNumber: 'رقم الهاتف',
    dialCode: 'رمز الدولة',
    sendOtp: 'إرسال رمز التحقق',
    sendingOtp: 'جاري الإرسال...',
    otpSent: 'تم إرسال رمز التحقق إلى هاتفك.',
    otpTitle: 'أدخل رمز التحقق',
    otpBody: 'أدخل الرمز المكون من 6 أرقام المرسل إلى رقمك.',
    errorPhone: 'أدخل رقم هاتف صحيح (بدون الصفر الأول).',
    errorOtp: 'رمز التحقق غير صحيح أو منتهي الصلاحية.',
    backToLogin: 'العودة لتسجيل الدخول',
  },
  en: {
    title: 'Smart Financial Manager',
    subtitle: 'Sign in to THE SFM dashboard to manage income, expenses, and goals clearly.',
    login: 'Sign in',
    create: 'Create account',
    forgot: 'Recover password',
    reset: 'Set a new password',
    usernameOrEmail: 'Username or email',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    defaultCurrency: 'Default currency',
    country: 'Country',
    securityQuestion: 'Security question',
    customQuestion: 'Custom question',
    customQuestionPlaceholder: 'Write your own security question',
    securityAnswer: 'Security answer',
    securityOptional: 'The security question is optional and used only as an additional verification layer, not as a replacement for email recovery.',
    termsPrefix: 'I agree to the',
    terms: 'Terms',
    privacy: 'Privacy Policy',
    and: 'and',
    accountDetails: 'Account details',
    preferencesSecurity: 'Preferences and security',
    continue: 'Continue',
    back: 'Back',
    signIn: 'Sign in',
    createAccount: 'Create account',
    signingIn: 'Signing in...',
    saving: 'Creating account...',
    sendReset: 'Send reset link',
    sendResetBody: 'Enter your email to send a password recovery link.',
    resetSent: 'If this email is registered, we will send a password reset link. Check your inbox and spam folder.',
    resetSendError: 'Could not send the reset link right now. Please try again.',
    resetAccountNotFound: 'No account is registered with this email address.',
    resetVerifyError: 'Could not verify this email right now. Check the server settings, then try again.',
    resetSuccess: 'Password changed successfully. You can sign in now.',
    switchCreate: 'Create new account',
    switchLogin: 'I already have an account',
    forgotLink: 'Forgot password?',
    guest: 'Continue as guest',
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    recommended: 'A longer password improves security.',
    optional: 'Optional',
    required: 'Required',
    emailPlaceholder: 'name@example.com',
    usernamePlaceholder: 'Choose a username',
    loginPlaceholder: 'Username or email',
    passwordPlaceholder: 'Enter password',
    recoveryQuestionTitle: 'Additional verification',
    recoveryQuestionHelp: 'Email was verified. Answer your security question to complete the reset.',
    hidePassword: 'Hide password',
    showPassword: 'Show password',
    errorEmpty: 'Complete all required fields.',
    errorUsername: 'Username must be at least 3 characters.',
    errorEmail: 'Please enter a valid email address.',
    errorPasswordLength: 'Password must be at least 6 characters.',
    errorPasswordContent: 'Password must be at least 6 characters.',
    errorMismatch: 'Passwords do not match.',
    errorTerms: 'You must agree to the Terms and Privacy Policy to continue.',
    errorExists: 'This username is already taken.',
    errorRegister: 'Could not create the account. Try again.',
    errorProfileCreate: 'Account created, but we could not save your profile details. Please try again.',
    errorLogin: 'Username or password is incorrect.',
    errorUsernameNotFound: 'Username not found.',
    errorProfileEmailMissing: 'No email address is linked to this user.',
    errorInvalidCredentials: 'Invalid login credentials.',
    profileSetupNeeded: 'Signed in. Please complete account setup.',
    errorLoginGeneric: 'Could not sign in right now. Please try again.',
    errorSecurityPair: 'Complete both security question and answer, or leave both blank.',
    errorSecurityAnswer: 'The security answer is incorrect.',
    errorSecurityLocked: 'Too many attempts. Use the email recovery link again later.',
    checkEmail: 'Account created. Check your email to verify the account if verification is enabled.',
    noReveal: 'We do not reveal whether an email is registered to protect accounts.',
    twoFactorTitle: 'Email Two-Factor Authentication',
    twoFactorBody: 'Enter the verification code sent to your email before account access.',
    twoFactorSent: 'A verification code has been sent to your email.',
    twoFactorSendError: 'Could not send the verification code right now. Please try again.',
    verificationCode: 'Verification Code',
    verifyCode: 'Verify',
    verifyingCode: 'Verifying...',
    resendCode: 'Resend Code',
    invalidCode: 'The verification code is incorrect.',
    codeExpired: 'The code has expired. Request a new code.',
    codeInvalidOrExpired: 'The verification code is incorrect or expired.',
    twoFactorNoEmail: 'Two-factor authentication requires a valid email address.',
    orContinueWith: 'Or continue with',
    signInGoogle: 'Sign in with Google',
    signInApple: 'Sign in with Apple',
    signInPhone: 'Sign in with phone number',
    phoneTitle: 'Sign in with phone',
    phoneBody: 'We\'ll send a one-time SMS code to your number.',
    phoneNumber: 'Phone number',
    dialCode: 'Country code',
    sendOtp: 'Send verification code',
    sendingOtp: 'Sending...',
    otpSent: 'Verification code sent to your phone.',
    otpTitle: 'Enter verification code',
    otpBody: 'Enter the 6-digit code sent to your number.',
    errorPhone: 'Please enter a valid phone number (without leading zero).',
    errorOtp: 'Invalid or expired verification code.',
    backToLogin: 'Back to sign in',
  },
  fr: {
    title: 'Gestionnaire financier intelligent',
    subtitle: 'Connectez-vous au tableau THE SFM pour gérer revenus, dépenses et objectifs.',
    login: 'Connexion',
    create: 'Créer un compte',
    forgot: 'Récupérer le mot de passe',
    reset: 'Définir un nouveau mot de passe',
    usernameOrEmail: 'Nom d’utilisateur ou email',
    username: 'Nom d’utilisateur',
    email: 'Email',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    defaultCurrency: 'Devise par défaut',
    country: 'Pays',
    securityQuestion: 'Question de sécurité',
    customQuestion: 'Question personnalisée',
    customQuestionPlaceholder: 'Écrivez votre question de sécurité',
    securityAnswer: 'Réponse de sécurité',
    securityOptional: 'La question de sécurité est facultative et sert uniquement de couche de vérification supplémentaire, pas de remplacement à la récupération par email.',
    termsPrefix: 'J’accepte les',
    terms: 'conditions',
    privacy: 'politique de confidentialité',
    and: 'et la',
    accountDetails: 'Détails du compte',
    preferencesSecurity: 'Préférences et sécurité',
    continue: 'Continuer',
    back: 'Retour',
    signIn: 'Connexion',
    createAccount: 'Créer le compte',
    signingIn: 'Connexion en cours...',
    saving: 'Création du compte...',
    sendReset: 'Envoyer le lien',
    sendResetBody: 'Entrez votre email pour envoyer un lien de récupération du mot de passe.',
    resetSent: 'Si cet e-mail est enregistré, nous vous enverrons un lien de réinitialisation. Vérifiez votre boîte de réception et les spams.',
    resetSendError: 'Impossible d’envoyer le lien de réinitialisation pour le moment. Réessayez.',
    resetAccountNotFound: 'Aucun compte n’est enregistré avec cette adresse e-mail.',
    resetVerifyError: 'Impossible de vérifier cet e-mail pour le moment. Vérifiez la configuration du serveur, puis réessayez.',
    resetSuccess: 'Mot de passe changé avec succès. Vous pouvez vous connecter.',
    switchCreate: 'Créer un nouveau compte',
    switchLogin: 'J’ai déjà un compte',
    forgotLink: 'Mot de passe oublié ?',
    guest: 'Continuer en invité',
    weak: 'Faible',
    medium: 'Moyen',
    strong: 'Fort',
    recommended: 'Un mot de passe plus long améliore la sécurité.',
    optional: 'Facultatif',
    required: 'Requis',
    emailPlaceholder: 'nom@example.com',
    usernamePlaceholder: 'Choisissez un nom d’utilisateur',
    loginPlaceholder: 'Nom d’utilisateur ou email',
    passwordPlaceholder: 'Entrez le mot de passe',
    recoveryQuestionTitle: 'Vérification supplémentaire',
    recoveryQuestionHelp: 'L’email a été vérifié. Répondez à la question de sécurité pour terminer.',
    hidePassword: 'Masquer le mot de passe',
    showPassword: 'Afficher le mot de passe',
    errorEmpty: 'Complétez tous les champs requis.',
    errorUsername: 'Le nom d’utilisateur doit contenir au moins 3 caractères.',
    errorEmail: 'Veuillez entrer une adresse email valide.',
    errorPasswordLength: 'Le mot de passe doit contenir au moins 6 caractères.',
    errorPasswordContent: 'Le mot de passe doit contenir au moins 6 caractères.',
    errorMismatch: 'Les mots de passe ne correspondent pas.',
    errorTerms: 'Vous devez accepter les conditions et la politique de confidentialité pour continuer.',
    errorExists: 'Ce nom d’utilisateur est déjà utilisé.',
    errorRegister: 'Impossible de créer le compte. Réessayez.',
    errorProfileCreate: 'Le compte a été créé, mais les informations du profil n’ont pas pu être enregistrées. Veuillez réessayer.',
    errorLogin: 'Nom d’utilisateur ou mot de passe incorrect.',
    errorUsernameNotFound: 'Nom d’utilisateur introuvable.',
    errorProfileEmailMissing: 'Aucune adresse email n’est liée à cet utilisateur.',
    errorInvalidCredentials: 'Identifiants invalides.',
    profileSetupNeeded: 'Connexion réussie. Veuillez terminer la configuration du compte.',
    errorLoginGeneric: 'Connexion impossible pour le moment. Réessayez.',
    errorSecurityPair: 'Complétez la question et la réponse de sécurité, ou laissez les deux vides.',
    errorSecurityAnswer: 'La réponse de sécurité est incorrecte.',
    errorSecurityLocked: 'Trop de tentatives. Réutilisez le lien email plus tard.',
    checkEmail: 'Compte créé. Vérifiez votre email si la confirmation est activée.',
    noReveal: 'Nous ne révélons pas si un email est enregistré afin de protéger les comptes.',
    twoFactorTitle: 'Authentification à deux facteurs par e-mail',
    twoFactorBody: 'Saisissez le code de vérification envoyé à votre e-mail avant l’accès au compte.',
    twoFactorSent: 'Un code de vérification a été envoyé à votre e-mail.',
    twoFactorSendError: 'Impossible d’envoyer le code de vérification pour le moment. Réessayez.',
    verificationCode: 'Code de vérification',
    verifyCode: 'Vérifier',
    verifyingCode: 'Vérification...',
    resendCode: 'Renvoyer le code',
    invalidCode: 'Le code de vérification est incorrect.',
    codeExpired: 'Le code a expiré. Demandez un nouveau code.',
    codeInvalidOrExpired: 'Le code de vérification est incorrect ou expiré.',
    twoFactorNoEmail: ‘L’authentification à deux facteurs nécessite une adresse e-mail valide.’,
    orContinueWith: ‘Ou continuer avec’,
    signInGoogle: ‘Se connecter avec Google’,
    signInApple: ‘Se connecter avec Apple’,
    signInPhone: ‘Se connecter par téléphone’,
    phoneTitle: ‘Connexion par téléphone’,
    phoneBody: ‘Nous enverrons un code SMS unique à votre numéro.’,
    phoneNumber: ‘Numéro de téléphone’,
    dialCode: ‘Indicatif pays’,
    sendOtp: ‘Envoyer le code’,
    sendingOtp: ‘Envoi en cours...’,
    otpSent: ‘Code de vérification envoyé sur votre téléphone.’,
    otpTitle: ‘Entrez le code de vérification’,
    otpBody: ‘Entrez le code à 6 chiffres envoyé à votre numéro.’,
    errorPhone: ‘Entrez un numéro de téléphone valide (sans zéro initial).’,
    errorOtp: ‘Code de vérification invalide ou expiré.’,
    backToLogin: ‘Retour à la connexion’,
  },
} as const;

type AuthCopy = Record<keyof typeof TEXT.ar, string>;

export default function LoginPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: 'var(--sfm-light-card)' }} />}>
      <LoginContent />
    </Suspense>
  );
}

function scorePassword(password: string) {
  const clean = password.trim();
  const checks = [
    clean.length >= MIN_PASSWORD_LENGTH,
    clean.length >= 8,
    clean.length >= 10,
    clean.length >= 12,
  ];
  return checks.filter(Boolean).length;
}

function strengthFor(password: string): PasswordStrength {
  const score = scorePassword(password);
  if (score <= 2) return 'weak';
  if (score === 3) return 'medium';
  return 'strong';
}

function cleanObject<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signOut, session, user, continueAsGuest } = useAuth();
  const { dir, lang } = useLanguage();
  const text = TEXT[lang];
  const questionOptions = QUESTION_OPTIONS[lang];

  const queryMode = searchParams.get('mode');
  const initialMode: AuthMode = queryMode === 'register' || queryMode === 'forgot' || queryMode === 'forgot-password'
    ? (queryMode === 'forgot-password' ? 'forgot' : queryMode)
    : 'login';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('KWD');
  const [country, setCountry] = useState('Kuwait');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [customSecurityQuestion, setCustomSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [submitting, setSubmitting] = useState(false);
  const redirectingRef = useRef(false);
  const [recoveryQuestion, setRecoveryQuestion] = useState<string | null>(null);
  const [recoveryHash, setRecoveryHash] = useState<string | null>(null);
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [securityAttempts, setSecurityAttempts] = useState(0);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [dialCode, setDialCode] = useState('+965');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<'input' | 'verify'>('input');
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const nextPath = useMemo(() => {
    const requested = searchParams.get('next') || '/dashboard';
    return requested.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard';
  }, [searchParams]);
  const passwordStrength = useMemo(() => strengthFor(password), [password]);
  const passwordScore = useMemo(() => scorePassword(password), [password]);

  function completeAuthRedirect(targetPath: string) {
    redirectingRef.current = true;
    setSubmitting(true);
    setMessage({ type: 'ok', text: text.signingIn });
    // Hard redirect ensures middleware reads fresh session cookie
    window.location.href = targetPath;
  }

  async function signInWithGoogle() {
    setSocialLoading('google');
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) setMessage({ type: 'error', text: error.message });
    setSocialLoading(null);
  }

  async function signInWithApple() {
    setSocialLoading('apple');
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo } });
    if (error) setMessage({ type: 'error', text: error.message });
    setSocialLoading(null);
  }

  async function handlePhoneLogin(): Promise<string> {
    const cleaned = phoneNumber.replace(/\D/g, '').replace(/^0/, '');
    if (cleaned.length < 7) return text.errorPhone;
    const fullPhone = `${dialCode}${cleaned}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    if (error) return error.message;
    setPhoneStep('verify');
    setMessage({ type: 'ok', text: text.otpSent });
    return '';
  }

  async function handleVerifyPhone(): Promise<string> {
    const cleaned = phoneNumber.replace(/\D/g, '').replace(/^0/, '');
    const fullPhone = `${dialCode}${cleaned}`;
    const { error } = await supabase.auth.verifyOtp({ phone: fullPhone, token: phoneOtp, type: 'sms' });
    if (error) return text.errorOtp;
    const { data: { session: phoneSess } } = await supabase.auth.getSession();
    if (phoneSess) {
      syncLoggedInCookies(phoneSess);
      completeAuthRedirect(nextPath);
    }
    return '';
  }

  useEffect(() => {
    if (queryMode === 'register' || queryMode === 'forgot' || queryMode === 'forgot-password') {
      setMode(queryMode === 'forgot-password' ? 'forgot' : queryMode);
    }
  }, [queryMode]);

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const search = typeof window !== 'undefined' ? window.location.search : '';
    if (queryMode === 'reset' || hash.includes('type=recovery') || search.includes('type=recovery')) {
      router.replace(`/reset-password${hash || ''}`);
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') router.replace('/reset-password');
    });
    return () => subscription.unsubscribe();
  }, [queryMode, router]);

  useEffect(() => {
    if (session && mode !== 'reset' && mode !== 'twoFactor' && !submitting && !twoFactorChallenge) {
      supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
        if (data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
          setMfaRequiredCookie(true);
          router.refresh();
          router.replace(`/mfa/verify?next=${encodeURIComponent(nextPath)}`);
          return;
        }
        setMfaRequiredCookie(false);
        console.debug('[auth] redirect target', nextPath);
        router.refresh();
        router.replace(nextPath);
      });
    }
  }, [mode, nextPath, router, session, submitting, twoFactorChallenge]);

  useEffect(() => {
    if (mode !== 'reset' || !user) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('security_question_2, security_answer_2')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setRecoveryQuestion(data?.security_question_2 || null);
        setRecoveryHash(data?.security_answer_2 || null);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, user]);

  function setAuthMode(nextMode: AuthMode) {
    setMode(nextMode);
    setSignupStep(1);
    setMessage(null);
    setTermsError('');
    setPassword('');
    setConfirmPassword('');
    setRecoveryAnswer('');
    setTwoFactorCode('');
    if (nextMode !== 'twoFactor') setTwoFactorChallenge(null);
  }

  function validatePassword(value: string) {
    if (value.trim().length < MIN_PASSWORD_LENGTH) return text.errorPasswordLength;
    return '';
  }

  function friendlyAuthError(message?: string | null) {
    const lowerMessage = String(message || '').toLowerCase();
    const isPasswordPolicyError =
      lowerMessage.includes('password should contain') ||
      lowerMessage.includes('password must contain') ||
      lowerMessage.includes('password should be') ||
      lowerMessage.includes('password must be') ||
      lowerMessage.includes('at least 6') ||
      lowerMessage.includes('at least six');

    if (isPasswordPolicyError) return text.errorPasswordLength;
    return message || text.errorRegister;
  }

  function resolvedSecurityQuestion() {
    return securityQuestion === '__custom__' ? customSecurityQuestion.trim() : securityQuestion.trim();
  }

  function validateAccountStep() {
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) return text.errorEmpty;
    if (username.trim().length < 3) return text.errorUsername;
    if (!isEmail(email)) return text.errorEmail;
    const passwordError = validatePassword(password);
    if (passwordError) return passwordError;
    if (password.trim() !== confirmPassword.trim()) return text.errorMismatch;
    return '';
  }

  async function sendLoginTwoFactorCode(emailAddress: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email: emailAddress,
      options: { shouldCreateUser: false },
    });
    return error;
  }

  async function getOrCreateLoginProfile(authUser: User, loginIdentifier: string) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email_2fa_enabled')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError) throw new Error(text.errorLoginGeneric);
    if (profile) return profile;

    const usernameFromLogin = !isEmail(loginIdentifier)
      ? loginIdentifier.trim().toLowerCase()
      : typeof authUser.user_metadata?.username === 'string'
        ? authUser.user_metadata.username.trim().toLowerCase()
        : null;

    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        email: authUser.email || null,
        username: usernameFromLogin || null,
        display_name: typeof authUser.user_metadata?.full_name === 'string'
          ? authUser.user_metadata.full_name
          : typeof authUser.user_metadata?.display_name === 'string'
            ? authUser.user_metadata.display_name
            : usernameFromLogin,
        created_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select('id, email_2fa_enabled')
      .single();

    if (createError) throw new Error(text.profileSetupNeeded);
    return createdProfile;
  }

  async function handleLogin() {
    console.debug('[auth] login started');
    const loginIdentifier = username.trim();
    if (!loginIdentifier || !password.trim()) return text.errorEmpty;
    const result = await signIn(loginIdentifier, password);
    if (result.error) {
      console.error('[auth] login error', result.error);
      if (result.code === 'username_not_found') return text.errorUsernameNotFound;
      if (result.code === 'profile_email_missing') return text.errorProfileEmailMissing;
      if (result.code === 'profile_missing') return text.profileSetupNeeded;
      if (result.code === 'invalid_credentials') return text.errorInvalidCredentials;
      return text.errorLoginGeneric;
    }
    const activeSession = result.session ?? (await supabase.auth.getSession()).data.session;
    if (!activeSession?.access_token) return text.errorLoginGeneric;
    const authUser = result.user ?? activeSession.user ?? null;
    if (!authUser?.id) return text.errorLoginGeneric;
    console.debug('[auth] login success', { userId: authUser.id });
    console.debug('[auth] session returned', { hasSession: Boolean(activeSession), hasAccessToken: Boolean(activeSession.access_token) });

    const profile = await getOrCreateLoginProfile(authUser, loginIdentifier);

    const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal.data?.nextLevel === 'aal2' && aal.data.currentLevel !== 'aal2') {
      syncLoggedInCookies(activeSession);
      setMfaRequiredCookie(true);
      console.debug('[auth] redirect target', '/mfa/verify');
      completeAuthRedirect(`/mfa/verify?next=${encodeURIComponent(nextPath)}`);
      return '';
    }

    if (profile?.email_2fa_enabled) {
      const authEmail = authUser.email?.trim().toLowerCase() || '';
      if (!isEmail(authEmail) || authEmail.endsWith('@smart-finance.local')) {
        await signOut();
        return text.twoFactorNoEmail;
      }

      const otpError = await sendLoginTwoFactorCode(authEmail);
      await signOut();
      if (otpError) return text.twoFactorSendError;

      setTwoFactorChallenge({ email: authEmail });
      setTwoFactorCode('');
      setMode('twoFactor');
      setPassword('');
      setMessage({ type: 'ok', text: text.twoFactorSent });
      return '';
    }
    syncLoggedInCookies(activeSession);
    setMfaRequiredCookie(false);
    console.debug('[auth] redirect target', nextPath);
    completeAuthRedirect(nextPath);
    return '';
  }

  async function handleTwoFactorLogin() {
    if (!twoFactorChallenge) return text.errorLogin;
    const code = twoFactorCode.trim();
    if (code.length !== 6) return text.invalidCode;
    const { data, error } = await supabase.auth.verifyOtp({
      email: twoFactorChallenge.email,
      token: code,
      type: 'email',
    });
    if (error) return error.message.toLowerCase().includes('expired') ? text.codeExpired : text.codeInvalidOrExpired;
    if (!data.session?.user) return text.errorLoginGeneric;
    console.debug('[auth] login success', { userId: data.session.user.id, twoFactor: true });
    console.debug('[auth] session returned', { hasSession: Boolean(data.session), hasAccessToken: Boolean(data.session.access_token) });
    syncLoggedInCookies(data.session);
    setMfaRequiredCookie(false);
    void trackEvent('login', { module: 'auth', metadata: { method: 'email_2fa' } });
    console.debug('[auth] redirect target', nextPath);
    completeAuthRedirect(nextPath);
    return '';
  }

  async function resendTwoFactorCode() {
    if (!twoFactorChallenge) return;
    setSubmitting(true);
    setMessage(null);
    const error = await sendLoginTwoFactorCode(twoFactorChallenge.email);
    setSubmitting(false);
    setMessage(error ? { type: 'error', text: text.twoFactorSendError } : { type: 'ok', text: text.twoFactorSent });
  }

  async function handleRegister() {
    const accountError = validateAccountStep();
    if (accountError) return accountError;
    if (signupStep === 1) {
      setSignupStep(2);
      return '';
    }
    if (!termsAccepted) {
      setTermsError(text.errorTerms);
      return '';
    }
    setTermsError('');

    const question = resolvedSecurityQuestion();
    const answer = securityAnswer.trim();
    const shouldSaveSecurityQuestion = Boolean(question && answer);

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const { data: existing } = await supabase.from('profiles').select('id').eq('username', cleanUsername).maybeSingle();
    if (existing) return text.errorExists;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          username: cleanUsername,
          display_name: cleanUsername,
          email: cleanEmail,
          default_currency: defaultCurrency,
          country,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });

    if (error) return friendlyAuthError(error.message);

    const newUser = data.user ?? (await supabase.auth.getUser()).data.user;
    if (newUser && data.session) {
      const profilePayload = cleanObject({
        id: newUser.id,
        username: cleanUsername || newUser.user_metadata?.username || null,
        display_name: cleanUsername || newUser.user_metadata?.display_name || null,
        email: newUser.email || cleanEmail,
        country: country || null,
        default_currency: defaultCurrency || 'KWD',
        preferred_currency: defaultCurrency || 'KWD',
        currency: defaultCurrency || 'KWD',
        preferred_lang: lang,
        language: lang,
        preferred_theme: 'light',
        theme: 'light',
        view_mode: 'simple',
        onboarding_completed: false,
        security_question_2: shouldSaveSecurityQuestion ? question : null,
        security_answer_2: shouldSaveSecurityQuestion ? answer : null,
        updated_at: new Date().toISOString(),
      });
      const { error: profileError } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
      if (profileError) {
        console.error('[Signup] Profile creation failed', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          payload: profilePayload,
        });
        return text.errorProfileCreate;
      }

      console.debug('[auth] login success', { userId: newUser.id, source: 'register' });
      console.debug('[auth] session returned', { hasSession: Boolean(data.session), hasAccessToken: Boolean(data.session.access_token) });
      syncLoggedInCookies(data.session);
      void trackEvent('signup', { module: 'auth', metadata: { method: 'email' } });
      console.debug('[auth] redirect target', '/dashboard');
      completeAuthRedirect('/dashboard');
      return '';
    }

    setAuthMode('login');
    setMessage({ type: 'ok', text: text.checkEmail });
    return '';
  }

  async function handleForgotPassword() {
    const emailForReset = forgotEmail.trim().toLowerCase();
    if (!isEmail(emailForReset)) return text.errorEmail;

    const checkResponse = await fetch('/api/auth/password-reset/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailForReset }),
    }).catch(error => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[password-reset] Account check request failed', {
          email: emailForReset,
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return null;
    });

    if (!checkResponse) return text.resetVerifyError;
    if (checkResponse.status === 400) return text.errorEmail;
    if (!checkResponse.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[password-reset] Account check returned error', {
          email: emailForReset,
          status: checkResponse.status,
        });
      }
      return text.resetVerifyError;
    }

    const checkPayload = await checkResponse.json().catch(() => null) as { exists?: boolean } | null;
    if (!checkPayload?.exists) return text.resetAccountNotFound;

    const { error } = await supabase.auth.resetPasswordForEmail(emailForReset, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (process.env.NODE_ENV === 'development') {
      console.debug('[password-reset] resetPasswordForEmail response', {
        email: emailForReset,
        ok: !error,
        errorCode: error?.code,
        errorMessage: error?.message,
      });
    }
    if (error) return error.message || text.resetSendError;
    setMessage({ type: 'ok', text: text.resetSent });
    return '';
  }

  async function handleResetPassword() {
    if (!session) return text.resetSent;
    const passwordError = validatePassword(password);
    if (passwordError) return passwordError;
    if (password.trim() !== confirmPassword.trim()) return text.errorMismatch;
    if (recoveryQuestion && recoveryHash) {
      if (securityAttempts >= 5) return text.errorSecurityLocked;
      if (recoveryAnswer.trim().toLowerCase() !== recoveryHash.trim().toLowerCase()) {
        setSecurityAttempts(count => count + 1);
        return text.errorSecurityAnswer;
      }
    }
    const { error } = await supabase.auth.updateUser({ password: password.trim() });
    if (error) return friendlyAuthError(error.message);
    await signOut();
    setAuthMode('login');
    setMessage({ type: 'ok', text: text.resetSuccess });
    return '';
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    redirectingRef.current = false;
    setMessage(null);
    if (supabaseConfigError) {
      setMessage({ type: 'error', text: supabaseConfigError });
      return;
    }

    setSubmitting(true);
    try {
      console.debug('[auth] login started', { mode });
      const error =
        mode === 'login' ? await handleLogin()
        : mode === 'register' ? await handleRegister()
        : mode === 'forgot' ? await handleForgotPassword()
        : mode === 'twoFactor' ? await handleTwoFactorLogin()
        : mode === 'phone' ? (phoneStep === 'verify' ? await handleVerifyPhone() : await handlePhoneLogin())
        : await handleResetPassword();
      if (error) {
        console.error('[auth] login error', error);
        setMessage({ type: 'error', text: error });
      }
    } catch (error: any) {
      console.error('[auth] login error', error);
      setMessage({ type: 'error', text: error?.message || text.errorRegister });
    } finally {
      if (!redirectingRef.current) setSubmitting(false);
    }
  }

  function enterGuestMode() {
    continueAsGuest();
    router.refresh();
    router.replace('/dashboard');
  }

  const cardTitle = mode === 'register' ? text.create : mode === 'forgot' ? text.forgot : mode === 'reset' ? text.reset : mode === 'twoFactor' ? text.twoFactorTitle : mode === 'phone' ? text.phoneTitle : text.login;
  const isRegister = mode === 'register';

  return (
    <main className="login-shell" dir={dir}>
      <section className={`login-card ${isRegister ? 'wide' : ''}`} aria-labelledby="auth-title">
        <div className="language-row">
          <LanguageSwitcher variant="gold" compact />
        </div>

        <div className="brand">
          <Image src="/sfm-logo.png" alt="THE SFM" width={88} height={88} priority className="mark sfm-brand-mark sfm-brand-mark--auth" />
          <h1 id="auth-title">{cardTitle}</h1>
          <p>{mode === 'forgot' ? text.sendResetBody : mode === 'reset' ? text.noReveal : mode === 'twoFactor' ? text.twoFactorBody : text.subtitle}</p>
        </div>

        {isRegister && (
          <div className="signup-steps" aria-label={text.create}>
            <span className={signupStep === 1 ? 'active' : 'done'}><b>1</b>{text.accountDetails}</span>
            <span className={signupStep === 2 ? 'active' : ''}><b>2</b>{text.preferencesSecurity}</span>
          </div>
        )}

        <form onSubmit={submit} className="form">
          {mode === 'login' && (
            <>
              <AuthField label={text.usernameOrEmail} icon={<UserRound size={18} />} required>
                <input value={username} onChange={event => setUsername(event.target.value)} placeholder={text.loginPlaceholder} autoComplete="username" />
              </AuthField>
              <PasswordField
                label={text.password}
                value={password}
                onChange={setPassword}
                placeholder={text.passwordPlaceholder}
                show={showPassword}
                onToggle={() => setShowPassword(value => !value)}
                ariaLabel={showPassword ? text.hidePassword : text.showPassword}
                autoComplete="current-password"
              />
            </>
          )}

          {mode === 'forgot' && (
            <AuthField label={text.email} icon={<Mail size={18} />} required>
              <input value={forgotEmail} onChange={event => setForgotEmail(event.target.value)} placeholder={text.emailPlaceholder} type="email" autoComplete="email" dir="ltr" />
            </AuthField>
          )}

          {mode === 'phone' && (
            <>
              <p className="phone-mode-body">{phoneStep === 'verify' ? text.otpBody : text.phoneBody}</p>
              {phoneStep === 'input' ? (
                <div className="phone-input-wrap">
                  <label className="auth-field">
                    <span>{text.dialCode}</span>
                  </label>
                  <div className="phone-row" dir="ltr">
                    <select
                      className="dial-select"
                      value={dialCode}
                      onChange={e => setDialCode(e.target.value)}
                      aria-label={text.dialCode}
                    >
                      {DIAL_CODES.map((dc, i) => (
                        <option key={`${dc.dial}-${dc.name}-${i}`} value={dc.dial}>
                          {dc.flag} {dc.name} ({dc.dial})
                        </option>
                      ))}
                    </select>
                    <input
                      className="phone-num-input"
                      type="tel"
                      inputMode="tel"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="XXXXXXXXXX"
                      autoComplete="tel-national"
                      dir="ltr"
                    />
                  </div>
                </div>
              ) : (
                <AuthField label={text.otpTitle} icon={<KeyRound size={18} />} required>
                  <input
                    value={phoneOtp}
                    onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    dir="ltr"
                    autoFocus
                    placeholder="• • • • • •"
                  />
                </AuthField>
              )}
            </>
          )}

          {mode === 'twoFactor' && (
            <>
              <div className="security-note">
                <ShieldCheck size={18} aria-hidden="true" />
                <span>{text.twoFactorBody}</span>
              </div>
              <AuthField label={text.verificationCode} icon={<KeyRound size={18} />} required>
                <input
                  value={twoFactorCode}
                  onChange={event => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  autoFocus
                />
              </AuthField>
            </>
          )}

          {mode === 'reset' && (
            <>
              {recoveryQuestion && recoveryHash && (
                <div className="security-check">
                  <ShieldCheck size={18} aria-hidden="true" />
                  <div>
                    <strong>{text.recoveryQuestionTitle}</strong>
                    <p>{text.recoveryQuestionHelp}</p>
                    <label>
                      <span>{recoveryQuestion}</span>
                      <input value={recoveryAnswer} onChange={event => setRecoveryAnswer(event.target.value)} autoComplete="off" />
                    </label>
                  </div>
                </div>
              )}
              <PasswordField
                label={text.password}
                value={password}
                onChange={setPassword}
                placeholder={text.passwordPlaceholder}
                show={showPassword}
                onToggle={() => setShowPassword(value => !value)}
                ariaLabel={showPassword ? text.hidePassword : text.showPassword}
                autoComplete="new-password"
              />
              <PasswordField
                label={text.confirmPassword}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={text.confirmPassword}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword(value => !value)}
                ariaLabel={showConfirmPassword ? text.hidePassword : text.showPassword}
                autoComplete="new-password"
              />
              <PasswordMeter strength={passwordStrength} score={passwordScore} labels={text} />
            </>
          )}

          {isRegister && signupStep === 1 && (
            <div className="form-grid">
              <AuthField label={text.username} icon={<UserRound size={18} />} required>
                <input value={username} onChange={event => setUsername(event.target.value)} placeholder={text.usernamePlaceholder} autoComplete="username" />
              </AuthField>
              <AuthField label={text.email} icon={<AtSign size={18} />} required>
                <input value={email} onChange={event => setEmail(event.target.value)} placeholder={text.emailPlaceholder} type="email" autoComplete="email" dir="ltr" />
              </AuthField>
              <PasswordField
                label={text.password}
                value={password}
                onChange={setPassword}
                placeholder={text.passwordPlaceholder}
                show={showPassword}
                onToggle={() => setShowPassword(value => !value)}
                ariaLabel={showPassword ? text.hidePassword : text.showPassword}
                autoComplete="new-password"
              />
              <PasswordField
                label={text.confirmPassword}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={text.confirmPassword}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword(value => !value)}
                ariaLabel={showConfirmPassword ? text.hidePassword : text.showPassword}
                autoComplete="new-password"
              />
              <div className="grid-full">
                <PasswordMeter strength={passwordStrength} score={passwordScore} labels={text} />
              </div>
            </div>
          )}

          {isRegister && signupStep === 2 && (
            <div className="form-grid">
              <div className="auth-field">
                <span>{text.defaultCurrency} <em>{text.required}</em></span>
                <CurrencySelect value={defaultCurrency} onChange={setDefaultCurrency} lang={lang} ariaLabel={text.defaultCurrency} />
              </div>
              <label className="auth-field">
                <span>{text.country} <em>{text.required}</em></span>
                <div className="input-wrap">
                  <Globe2 size={18} />
                  <select value={country} onChange={event => setCountry(event.target.value)}>
                    {COUNTRY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option[lang]}</option>)}
                  </select>
                </div>
              </label>
              <label className="auth-field grid-full">
                <span>{text.securityQuestion} <em>{text.optional}</em></span>
                <div className="input-wrap">
                  <ShieldCheck size={18} />
                  <select value={securityQuestion} onChange={event => setSecurityQuestion(event.target.value)}>
                    <option value="">{text.optional}</option>
                    {questionOptions.map(question => <option key={question} value={question}>{question}</option>)}
                    <option value="__custom__">{text.customQuestion}</option>
                  </select>
                </div>
              </label>
              {securityQuestion === '__custom__' && (
                <AuthField label={text.customQuestion} icon={<ShieldCheck size={18} />} className="grid-full">
                  <input value={customSecurityQuestion} onChange={event => setCustomSecurityQuestion(event.target.value)} placeholder={text.customQuestionPlaceholder} />
                </AuthField>
              )}
              {(securityQuestion || securityAnswer) && (
                <AuthField label={text.securityAnswer} icon={<KeyRound size={18} />} className="grid-full">
                  <input value={securityAnswer} onChange={event => setSecurityAnswer(event.target.value)} autoComplete="off" />
                </AuthField>
              )}
              <div className="security-note grid-full">
                <ShieldCheck size={17} aria-hidden="true" />
                <span>{text.securityOptional}</span>
              </div>
              <div className="terms-field grid-full">
                <label className={`terms-line${termsError ? ' has-error' : ''}`}>
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={event => {
                      const checked = event.target.checked;
                      setTermsAccepted(checked);
                      if (checked) setTermsError('');
                    }}
                    aria-invalid={Boolean(termsError)}
                    aria-describedby={termsError ? 'terms-error' : undefined}
                  />
                  <span className="terms-box" aria-hidden="true" />
                  <span className="terms-copy">
                    {text.termsPrefix} <Link href="/terms" onClick={event => event.stopPropagation()}>{text.terms}</Link> {text.and} <Link href="/privacy" onClick={event => event.stopPropagation()}>{text.privacy}</Link>.
                    <em>{text.required}</em>
                  </span>
                </label>
                {termsError && <p id="terms-error" className="terms-error">{termsError}</p>}
              </div>
            </div>
          )}

          {message && <div className={message.type === 'ok' ? 'message ok' : 'message'} role="status">{message.text}</div>}

          <div className="submit-row">
            {isRegister && signupStep === 2 && (
              <button type="button" className="secondary" onClick={() => setSignupStep(1)} disabled={submitting}>
                <ChevronLeft size={16} aria-hidden="true" />{text.back}
              </button>
            )}
            <button
              className="primary"
              disabled={submitting}
              aria-disabled={isRegister && signupStep === 2 && !termsAccepted ? true : undefined}
              data-needs-agreement={isRegister && signupStep === 2 && !termsAccepted ? 'true' : undefined}
            >
              {submitting ? (
                <span className="loading-label"><span className="spinner" />{mode === 'login' ? text.signingIn : mode === 'register' ? text.saving : mode === 'twoFactor' ? text.verifyingCode : mode === 'phone' ? text.sendingOtp : text.sendReset}</span>
              ) : mode === 'login' ? text.signIn : mode === 'register' ? (signupStep === 1 ? text.continue : text.createAccount) : mode === 'forgot' ? text.sendReset : mode === 'twoFactor' ? text.verifyCode : mode === 'phone' ? (phoneStep === 'verify' ? text.verifyCode : text.sendOtp) : text.reset}
            </button>
          </div>
        </form>

        {mode === 'login' && (
          <div className="social-login-block">
            <div className="social-divider"><span>{text.orContinueWith}</span></div>
            <div className="social-btns">
              <button
                type="button"
                className="social-btn google-btn"
                onClick={() => void signInWithGoogle()}
                disabled={!!socialLoading || submitting}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                {socialLoading === 'google' ? text.signingIn : text.signInGoogle}
              </button>
              <button
                type="button"
                className="social-btn apple-btn"
                onClick={() => void signInWithApple()}
                disabled={!!socialLoading || submitting}
              >
                <svg width="17" height="18" viewBox="0 0 17 18" aria-hidden="true" fill="currentColor">
                  <path d="M13.18 0c.02.41-.11.81-.32 1.16-.22.35-.54.64-.9.84-.36.2-.77.3-1.19.27-.04-.38.07-.76.27-1.1.2-.33.5-.6.86-.8.36-.19.77-.29 1.19-.27l.09.1Zm1.65 13.55a9.32 9.32 0 0 1-.94 1.67c-.46.67-.85 1.13-1.18 1.39-.47.43-1 .65-1.56.66-.4 0-.88-.12-1.44-.35-.56-.23-1.07-.35-1.53-.35-.48 0-1 .12-1.56.35-.56.24-1.01.36-1.36.37-.54.02-1.08-.21-1.6-.68-.36-.27-.76-.75-1.21-1.44A11.37 11.37 0 0 1 1 11.5a7.43 7.43 0 0 1-.35-2.22c0-.86.19-1.6.56-2.22a3.28 3.28 0 0 1 1.17-1.18 3.14 3.14 0 0 1 1.58-.44c.44 0 1.01.13 1.72.39.7.26 1.16.4 1.36.4.15 0 .67-.16 1.53-.47.83-.29 1.52-.41 2.1-.37 1.57.13 2.74.75 3.52 1.88-1.4.85-2.1 2.04-2.08 3.57.02 1.19.44 2.18 1.28 2.96.38.36.8.64 1.27.83l-.49.92Z"/>
                </svg>
                {socialLoading === 'apple' ? text.signingIn : text.signInApple}
              </button>
              <button
                type="button"
                className="social-btn phone-btn"
                onClick={() => { setPhoneStep('input'); setPhoneNumber(''); setPhoneOtp(''); setMessage(null); setAuthMode('phone'); }}
                disabled={!!socialLoading || submitting}
              >
                <Phone size={17} />
                {text.signInPhone}
              </button>
            </div>
          </div>
        )}

        <div className="actions">
          {mode === 'twoFactor' && <button type="button" disabled={submitting} onClick={() => void resendTwoFactorCode()}>{text.resendCode}</button>}
          {mode === 'phone' && phoneStep === 'verify' && <button type="button" disabled={submitting} onClick={() => { setPhoneStep('input'); setPhoneOtp(''); setMessage(null); }}>{text.resendCode}</button>}
          {mode !== 'login' && <button type="button" disabled={submitting} onClick={() => setAuthMode('login')}>{text.backToLogin}</button>}
          {mode !== 'register' && mode !== 'twoFactor' && mode !== 'phone' && <button type="button" disabled={submitting} onClick={() => setAuthMode('register')}>{text.switchCreate}</button>}
          {mode !== 'forgot' && mode !== 'reset' && mode !== 'twoFactor' && mode !== 'phone' && <button type="button" disabled={submitting} onClick={() => setAuthMode('forgot')}>{text.forgotLink}</button>}
          {mode === 'login' && <button type="button" disabled={submitting} onClick={enterGuestMode}>{text.guest}</button>}
        </div>
      </section>

      <style jsx global>{`
        .login-shell{min-height:100vh;background:radial-gradient(circle at 20% 10%,rgba(24,212,212,.16),transparent 30%),linear-gradient(180deg,#EEF6FF 0%,#F8FBFF 58%,#FFFFFF 100%);display:grid;place-items:center;padding:24px;font-family:Tajawal,Arial,sans-serif;color:#0B172A;overflow-x:hidden}
        .login-shell .login-card{width:min(100%,460px);background:rgba(255,255,255,.95);border:1px solid rgba(29,140,255,.16);border-radius:28px;box-shadow:0 22px 70px rgba(3,18,37,.14);padding:24px;backdrop-filter:blur(18px);min-width:0}.login-shell .login-card.wide{width:min(100%,820px)}
        .login-shell .language-row{display:flex;justify-content:flex-end;margin-bottom:14px}.login-shell .brand{text-align:center;margin-bottom:22px}.login-shell .mark{margin:0 auto 12px}.login-shell .brand h1{font-size:clamp(24px,4vw,30px);margin:0 0 8px;color:#061B33}.login-shell .brand p{font-size:13px;color:#475569;line-height:1.7;margin:0}
        .login-shell .signup-steps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:16px}.login-shell .signup-steps span{border:1px solid rgba(29,140,255,.16);background:#F8FBFF;color:#0B2748;border-radius:16px;padding:10px 12px;display:flex;align-items:center;gap:9px;font-weight:900;font-size:13px}.login-shell .signup-steps b{width:26px;height:26px;border-radius:999px;display:grid;place-items:center;background:rgba(29,140,255,.12);color:#1D8CFF}.login-shell .signup-steps .active{background:#061B33;color:#FFFFFF;border-color:rgba(24,212,212,.35);box-shadow:inset 0 -2px 0 rgba(24,212,212,.70)}.login-shell .signup-steps .active b{background:rgba(255,255,255,.12);color:#18D4D4}.login-shell .signup-steps .done{background:#ECFDF5;color:#047857;border-color:rgba(16,185,129,.22)}
        .login-shell .form{display:grid;gap:14px}.login-shell .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.login-shell .grid-full{grid-column:1/-1}
        .login-shell .social-login-block{margin-top:6px}.social-divider{display:flex;align-items:center;gap:10px;margin:14px 0 12px}.social-divider:before,.social-divider:after{content:"";flex:1;height:1px;background:rgba(29,140,255,.15)}.social-divider span{font-size:12px;color:#94A3B8;font-weight:900;white-space:nowrap}
        .social-btns{display:grid;gap:9px}.social-btn{display:flex;align-items:center;justify-content:center;gap:9px;height:46px;border:1.5px solid rgba(29,140,255,.18);border-radius:14px;background:#fff;color:#0B172A;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;transition:background .15s,border-color .15s,color .15s;width:100%}
        .social-btn:hover{background:#F1F5FF;border-color:rgba(29,140,255,.35)}.social-btn:disabled{opacity:.5;cursor:not-allowed}
        .social-btn.google-btn:hover{border-color:#EA4335;background:#FFF5F5}.social-btn.apple-btn:hover{background:#000;color:#fff;border-color:#000}.social-btn.phone-btn{border-color:rgba(5,150,105,.25);color:#047857}.social-btn.phone-btn:hover:not(:disabled){background:#ECFDF5;border-color:#059669}
        .phone-mode-body{margin:0 0 12px;font-size:13px;color:#475569;font-weight:800;line-height:1.7;text-align:center}
        .phone-input-wrap{display:grid;gap:6px}.phone-row{display:flex;gap:8px;align-items:stretch}.dial-select{height:48px;border:1.5px solid rgba(29,140,255,.18);border-radius:14px;background:#fff;color:#0B172A;padding:0 10px;font:900 13px Tajawal,Arial,sans-serif;min-width:0;width:180px;flex-shrink:0;cursor:pointer;outline:0}.dial-select:focus{border-color:#1D8CFF;box-shadow:0 0 0 4px rgba(29,140,255,.10)}.phone-num-input{flex:1;height:48px;border:1.5px solid rgba(29,140,255,.18);border-radius:14px;background:#fff;color:#0B172A;padding:0 14px;font:900 16px Tajawal,Arial,sans-serif;outline:0;min-width:0}.phone-num-input:focus{border-color:#1D8CFF;box-shadow:0 0 0 4px rgba(29,140,255,.10)}
        .login-shell .auth-field{display:grid;gap:7px;min-width:0}.login-shell .auth-field>span,.login-shell .security-check label>span{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:900;color:#0B2748}.login-shell .auth-field em{font-style:normal;color:#64748B;font-size:11px;font-weight:900}
        .login-shell .input-wrap{min-height:52px;border:1.5px solid rgba(29,140,255,.22);background:#FFFFFF;border-radius:14px;display:flex;align-items:center;gap:10px;padding:0 13px;color:#1D8CFF;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}.login-shell .input-wrap:focus-within{border-color:#1D8CFF;background:#F8FBFF;box-shadow:0 0 0 4px rgba(29,140,255,.25)}
        .login-shell input,.login-shell select{flex:1;border:0;background:transparent;outline:0;color:#0B172A;font:800 14px Tajawal,Arial,sans-serif;min-width:0;width:100%}.login-shell input::placeholder{color:#64748B;opacity:1}.login-shell select{cursor:pointer}
        .login-shell .icon{border:0;background:transparent;color:#0B2748;display:grid;place-items:center;cursor:pointer;border-radius:999px;padding:4px}.login-shell .icon:hover{color:#1D8CFF}.login-shell .icon:focus-visible,.login-shell .primary:focus-visible,.login-shell .secondary:focus-visible,.login-shell .actions button:focus-visible,.login-shell .terms-line:focus-within{outline:3px solid rgba(24,212,212,.35);outline-offset:3px}
        .login-shell .password-meter{display:grid;gap:8px}.login-shell .meter-top{display:flex;justify-content:space-between;gap:12px;color:#334155;font-size:12px;font-weight:900}.login-shell .meter-top strong.weak{color:#B91C1C}.login-shell .meter-top strong.medium{color:#B45309}.login-shell .meter-top strong.strong{color:#047857}.login-shell .meter-bars{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.login-shell .meter-bars span{height:7px;border-radius:999px;background:rgba(100,116,139,.16)}.login-shell .meter-bars span.on.weak{background:#EF4444}.login-shell .meter-bars span.on.medium{background:#F59E0B}.login-shell .meter-bars span.on.strong{background:#10B981}.login-shell .password-meter p{margin:0;color:#64748B;font-size:12px;font-weight:800}
        .login-shell .security-note,.login-shell .security-check{border:1px solid rgba(24,212,212,.22);background:rgba(24,212,212,.08);border-radius:15px;color:#0B2748;display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;padding:12px;font-size:13px;font-weight:850;line-height:1.7}.login-shell .security-note svg,.login-shell .security-check svg{color:#1D8CFF;margin-top:2px}.login-shell .security-check strong{display:block;color:#061B33}.login-shell .security-check p{margin:4px 0 10px;color:#475569}.login-shell .security-check label{display:grid;gap:7px}.login-shell .security-check input{min-height:46px;border:1px solid rgba(29,140,255,.22);border-radius:12px;background:#FFFFFF;padding:0 12px}
        .login-shell .terms-field{display:grid;gap:7px}.login-shell .terms-line{position:relative;display:flex;gap:12px;align-items:flex-start;border:1.5px solid rgba(29,140,255,.26);background:#FFFFFF;border-radius:16px;padding:13px 14px;color:#0B2748;font-size:13px;font-weight:900;line-height:1.7;cursor:pointer;box-shadow:0 10px 26px rgba(3,18,37,.06);transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}.login-shell .terms-line:hover{border-color:rgba(29,140,255,.42);background:#F8FBFF;box-shadow:0 14px 30px rgba(29,140,255,.10)}.login-shell .terms-line.has-error{border-color:rgba(239,68,68,.55);background:rgba(254,242,242,.78)}.login-shell .terms-line input{position:absolute;inset-inline-start:14px;top:15px;width:24px;height:24px;opacity:0;cursor:pointer}.login-shell .terms-box{width:24px;height:24px;border-radius:8px;border:2px solid rgba(29,140,255,.58);background:#FFFFFF;display:grid;place-items:center;flex:0 0 auto;margin-top:1px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.85);transition:background .16s ease,border-color .16s ease,box-shadow .16s ease}.login-shell .terms-box::after{content:"";width:7px;height:12px;border:solid #FFFFFF;border-width:0 2px 2px 0;transform:rotate(45deg) scale(.65);opacity:0;transition:opacity .16s ease,transform .16s ease}.login-shell .terms-line input:checked+.terms-box{background:linear-gradient(135deg,#1D8CFF,#18D4D4);border-color:#18D4D4;box-shadow:0 0 0 4px rgba(24,212,212,.18)}.login-shell .terms-line input:checked+.terms-box::after{opacity:1;transform:rotate(45deg) scale(1)}.login-shell .terms-line:focus-within .terms-box{box-shadow:0 0 0 4px rgba(24,212,212,.24)}.login-shell .terms-copy{display:block;min-width:0}.login-shell .terms-copy em{display:inline-flex;margin-inline-start:8px;border:1px solid rgba(29,140,255,.22);border-radius:999px;padding:1px 7px;color:#1D8CFF;background:rgba(29,140,255,.08);font-size:11px;font-style:normal;font-weight:950;vertical-align:middle}.login-shell .terms-line a{color:#1D8CFF;font-weight:950;text-decoration:none}.login-shell .terms-line a:hover{text-decoration:underline}.login-shell .terms-error{margin:0;color:#B91C1C;font-size:12px;font-weight:900;line-height:1.6}
        .login-shell .submit-row{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:2px}.login-shell .primary,.login-shell .secondary{min-height:54px;border-radius:16px;padding:0 18px;font:950 14px Tajawal,Arial,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease,background .18s ease,border-color .18s ease,opacity .18s ease}.login-shell .primary{border:0;background:linear-gradient(135deg,#061B33 0%,#1D8CFF 54%,#18D4D4 100%);color:#FFFFFF;box-shadow:0 14px 34px rgba(29,140,255,.28);min-width:190px}.login-shell .primary[data-needs-agreement="true"]{opacity:.58;box-shadow:none;filter:saturate(.82)}.login-shell .secondary{border:1px solid rgba(29,140,255,.22);background:#FFFFFF;color:#0B2748}.login-shell .primary:hover:not(:disabled),.login-shell .secondary:hover:not(:disabled){transform:translateY(-2px);filter:saturate(1.08) brightness(1.02);box-shadow:0 16px 38px rgba(24,212,212,.22)}.login-shell .primary[data-needs-agreement="true"]:hover:not(:disabled){filter:saturate(.9);box-shadow:none}.login-shell .primary:active:not(:disabled),.login-shell .secondary:active:not(:disabled){transform:translateY(0) scale(.985)}.login-shell .primary:disabled,.login-shell .secondary:disabled{opacity:.72;cursor:not-allowed;transform:none;box-shadow:none}
        .login-shell .loading-label{display:inline-flex;align-items:center;justify-content:center;gap:9px}.login-shell .spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.35);border-top-color:#FFFFFF;animation:sfm-login-spin .75s linear infinite}@keyframes sfm-login-spin{to{transform:rotate(360deg)}}
        .login-shell .message{background:rgba(239,68,68,.08);color:#B91C1C;border:1px solid rgba(239,68,68,.18);border-radius:13px;padding:11px 13px;font-size:13px;font-weight:850;line-height:1.6}.login-shell .message.ok{background:rgba(16,185,129,.10);border-color:rgba(16,185,129,.24);color:#047857}
        .login-shell .actions{display:flex;flex-wrap:wrap;gap:9px;justify-content:center;margin-top:18px}.login-shell .actions button{border:1px solid rgba(29,140,255,.22);background:#FFFFFF;color:#0B2748;border-radius:999px;padding:9px 13px;font:850 12px Tajawal,Arial,sans-serif;cursor:pointer;transition:background .18s ease,border-color .18s ease,color .18s ease}.login-shell .actions button:hover:not(:disabled){background:#EEF6FF;border-color:rgba(29,140,255,.34);color:#061B33}.login-shell .actions button:disabled{opacity:.55;cursor:not-allowed}
        @media(max-width:640px){.login-shell{padding:16px;align-items:start}.login-shell .login-card,.login-shell .login-card.wide{padding:20px;border-radius:22px;width:100%}.login-shell .language-row{justify-content:center}.login-shell .form-grid,.login-shell .signup-steps{grid-template-columns:1fr}.login-shell .submit-row{display:grid;grid-template-columns:1fr}.login-shell .primary,.login-shell .secondary,.login-shell .actions button{width:100%}.login-shell .actions{display:grid;grid-template-columns:1fr}.login-shell .brand{margin-bottom:18px}}
      `}</style>
    </main>
  );
}

function AuthField({
  label,
  icon,
  required,
  className,
  children,
}: {
  label: string;
  icon: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`auth-field ${className ?? ''}`}>
      <span>{label} {required && <em>*</em>}</span>
      <div className="input-wrap">
        {icon}
        {children}
      </div>
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  show,
  onToggle,
  ariaLabel,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
  ariaLabel: string;
  autoComplete: string;
}) {
  return (
    <AuthField label={label} icon={<LockKeyhole size={18} />} required>
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} type={show ? 'text' : 'password'} autoComplete={autoComplete} dir="ltr" />
      <button type="button" className="icon" onClick={onToggle} aria-label={ariaLabel}>
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </AuthField>
  );
}

function PasswordMeter({
  strength,
  score,
  labels,
}: {
  strength: PasswordStrength;
  score: number;
  labels: AuthCopy;
}) {
  const label = strength === 'weak' ? labels.weak : strength === 'medium' ? labels.medium : labels.strong;
  return (
    <div className="password-meter" aria-live="polite">
      <div className="meter-top">
        <span>{labels.password}</span>
        <strong className={strength}>{label}</strong>
      </div>
      <div className="meter-bars" aria-hidden="true">
        {[1, 2, 3, 4].map(item => <span key={item} className={item <= score ? `on ${strength}` : ''} />)}
      </div>
      {strength !== 'strong' && <p>{labels.recommended}</p>}
    </div>
  );
}
