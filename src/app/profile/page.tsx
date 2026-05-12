'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins, RefreshCw, User, Globe, Lock, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { INCOME_CATEGORIES } from '@/lib/income-categories';

const CURRENCIES = [
  { code: 'KWD', symbol: 'د.ك', nameAr: 'دينار كويتي' },
  { code: 'AED', symbol: 'د.إ', nameAr: 'درهم إماراتي' },
  { code: 'SAR', symbol: 'ر.س', nameAr: 'ريال سعودي' },
  { code: 'USD', symbol: '$', nameAr: 'دولار أمريكي' },
  { code: 'EUR', symbol: '€', nameAr: 'يورو' },
  { code: 'GBP', symbol: '£', nameAr: 'جنيه إسترليني' },
  { code: 'CNY', symbol: '¥', nameAr: 'يوان صيني' },
];

const COUNTRY_DIAL_CODES = [
  { code: '+971', nameAr: 'الإمارات' },
  { code: '+966', nameAr: 'السعودية' },
  { code: '+965', nameAr: 'الكويت' },
  { code: '+973', nameAr: 'البحرين' },
  { code: '+968', nameAr: 'عُمان' },
  { code: '+974', nameAr: 'قطر' },
  { code: '+962', nameAr: 'الأردن' },
  { code: '+1', nameAr: 'أمريكا/كندا' },
  { code: '+44', nameAr: 'بريطانيا' },
  { code: '+33', nameAr: 'فرنسا' },
  { code: '+49', nameAr: 'ألمانيا' },
  { code: '+86', nameAr: 'الصين' },
];

const SECURITY_QUESTIONS = [
  { id: 'pet_name', questionAr: 'ما اسم حيوانك الأليف؟', questionEn: 'What is your pet name?', questionFr: "Comment s'appelle votre animal de compagnie?", questionZh: '你宠物的名字是什么？' },
  { id: 'school_name', questionAr: 'ما اسم مدرستك الأساسية؟', questionEn: 'What is your primary school name?', questionFr: "Quel est le nom de votre école primaire?", questionZh: '你小学的名字是什么？' },
  { id: 'city_born', questionAr: 'في أي مدينة ولدت؟', questionEn: 'In which city were you born?', questionFr: "Dans quelle ville êtes-vous né?", questionZh: '你在哪个城市出生？' },
  { id: 'father_name', questionAr: 'ما اسم والدك الأول؟', questionEn: "What is your father's first name?", questionFr: "Quel est le prénom de votre père?", questionZh: '你父亲的名字是什么？' },
  { id: 'favorite_color', questionAr: 'ما هو لونك المفضل؟', questionEn: 'What is your favorite color?', questionFr: 'Quelle est votre couleur préférée?', questionZh: '你最喜欢的颜色是什么？' },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [language, setLanguage] = useState<'ar' | 'en' | 'fr' | 'zh'>('ar');
  const isArabic = language === 'ar';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const text = {
    profileTitle: isArabic ? 'الملف الشخصي' : language === 'fr' ? 'Profil' : language === 'zh' ? '个人资料' : 'Profile',
    profileName: isArabic ? 'اسم المستخدم' : language === 'fr' ? "Nom d'utilisateur" : language === 'zh' ? '用户名' : 'Username',
    email: isArabic ? 'البريد الإلكتروني' : language === 'fr' ? 'Email' : language === 'zh' ? '电子邮件' : 'Email',
    age: isArabic ? 'العمر' : language === 'fr' ? 'Âge' : language === 'zh' ? '年龄' : 'Age',
    gender: isArabic ? 'الجنس' : language === 'fr' ? 'Genre' : language === 'zh' ? '性别' : 'Gender',
    male: isArabic ? 'ذكر' : language === 'fr' ? 'Homme' : language === 'zh' ? '男性' : 'Male',
    female: isArabic ? 'أنثى' : language === 'fr' ? 'Femme' : language === 'zh' ? '女性' : 'Female',
    phone: isArabic ? 'رقم الهاتف' : language === 'fr' ? 'Téléphone' : language === 'zh' ? '电话' : 'Phone',
    countryCode: isArabic ? 'رمز الدولة' : language === 'fr' ? 'Indicatif' : language === 'zh' ? '国家代码' : 'Country code',
    totalIncome: isArabic ? 'إجمالي الدخل' : language === 'fr' ? 'Revenu total' : language === 'zh' ? '总收入' : 'Total income',
    saveChanges: isArabic ? 'حفظ التغييرات' : language === 'fr' ? 'Enregistrer' : language === 'zh' ? '保存更改' : 'Save changes',
    saved: isArabic ? 'تم الحفظ بنجاح' : language === 'fr' ? 'Enregistré' : language === 'zh' ? '保存成功' : 'Saved successfully',
    error: isArabic ? 'حدث خطأ' : language === 'fr' ? 'Erreur' : language === 'zh' ? '错误' : 'Error',
    languageLabel: isArabic ? 'اللغة' : language === 'fr' ? 'Langue' : language === 'zh' ? '语言' : 'Language',
    incomeSources: isArabic ? 'مصادر الدخل' : language === 'fr' ? 'Sources de revenu' : language === 'zh' ? '收入来源' : 'Income sources',
    updateIncome: isArabic ? 'تعديل المدخول' : language === 'fr' ? 'Modifier le revenu' : language === 'zh' ? '修改收入' : 'Update income',
    securityQuestion: isArabic ? 'سؤال الأمان' : language === 'fr' ? 'Question de sécurité' : language === 'zh' ? '安全问题' : 'Security question',
    securityAnswer: isArabic ? 'إجابة الأمان' : language === 'fr' ? 'Réponse de sécurité' : language === 'zh' ? '安全答案' : 'Security answer',
    passwordSection: isArabic ? 'كلمة المرور' : language === 'fr' ? 'Mot de passe' : language === 'zh' ? '密码' : 'Password',
    oldPassword: isArabic ? 'كلمة المرور القديمة' : language === 'fr' ? 'Ancien mot de passe' : language === 'zh' ? '旧密码' : 'Old password',
    newPassword: isArabic ? 'كلمة المرور الجديدة' : language === 'fr' ? 'Nouveau mot de passe' : language === 'zh' ? '新密码' : 'New password',
    newPasswordHint: isArabic ? 'اتركها فارغة إذا كنت لا تريد تغيير كلمة المرور' : language === 'fr' ? 'Laissez vide si vous ne souhaitez pas changer' : language === 'zh' ? '如果不想更改密码，请留空' : 'Leave empty if you do not want to change password',
    logout: isArabic ? 'تسجيل الخروج' : language === 'fr' ? 'Déconnexion' : language === 'zh' ? '退出' : 'Sign out',
    back: isArabic ? 'العودة' : language === 'fr' ? 'Retour' : language === 'zh' ? '返回' : 'Back',
    autoSaved: isArabic ? 'تم الحفظ تلقائياً' : language === 'fr' ? 'Sauvegarde automatique' : language === 'zh' ? '自动保存' : 'Auto-saved',
    calculationDetails: isArabic ? 'تفاصيل العمليات الحسابية' : language === 'fr' ? 'Détails des calculs' : language === 'zh' ? '计算详情' : 'Calculation details',
    noOperations: isArabic ? 'لا توجد عمليات مسجلة' : language === 'fr' ? 'Aucune opération enregistrée' : language === 'zh' ? '没有记录的手术' : 'No recorded operations',
  };

  const [profileData, setProfileData] = useState({
    display_name: '',
    email: '',
    age: '' as string | undefined,
    gender: '' as string | undefined,
    phone_country_code: '',
    phone_number: '',
    security_question: '',
    security_answer: '',
  });

  const [newPassword, setNewPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [editingIncomeSources, setEditingIncomeSources] = useState(false);
  const [incomeSourceAmounts, setIncomeSourceAmounts] = useState<Record<string, string>>({});
  const [currentIncomeSources, setCurrentIncomeSources] = useState<{ id: string; category: string; label: string | null; amount: number }[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState('KWD');

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('display_name, email, age, gender, phone_country_code, phone_number, security_question, security_answer')
      .eq('id', user.id)
      .maybeSingle();
    if (data) {
      setProfileData({
        display_name: data.display_name || '',
        email: data.email || '',
        age: data.age?.toString() || '',
        gender: data.gender || '',
        phone_country_code: data.phone_country_code || '',
        phone_number: data.phone_number || '',
        security_question: data.security_question || '',
        security_answer: data.security_answer || '',
      });
    }
    setLoading(false);
  }, [user]);

  const loadCurrentIncomeSources = async () => {
    if (!user) return;
    const { data } = await supabase.from('monthly_income_sources').select('id, category, label, amount').eq('user_id', user.id);
    if (data) {
      setCurrentIncomeSources(data);
      const amounts: Record<string, string> = {};
      data.forEach((source) => {
        amounts[source.category] = String(source.amount);
      });
      setIncomeSourceAmounts(amounts);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (user) {
      loadProfile();
      loadCurrentIncomeSources();
    }
  }, [user, authLoading, router, loadProfile]);

  const autoSave = async (field: string, value: string) => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('id', user.id);
  };

  const handleAutoSave = (field: keyof typeof profileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    autoSave(field, value);
    setMessage({ type: 'success', text: text.autoSaved });
    setTimeout(() => setMessage(null), 2000);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);

    if (newPassword && oldPassword) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email || '',
        password: oldPassword,
      });
      if (signInError) {
        setMessage({ type: 'error', text: isArabic ? 'كلمة المرور القديمة غير صحيحة' : 'Old password is incorrect' });
        setSaving(false);
        return;
      }
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) {
        setMessage({ type: 'error', text: passwordError.message });
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: profileData.display_name,
        age: profileData.age ? parseInt(profileData.age) : null,
        gender: profileData.gender,
        phone_country_code: profileData.phone_country_code,
        phone_number: profileData.phone_number,
        security_question: profileData.security_question,
        security_answer: profileData.security_answer,
      })
      .eq('id', user.id);

    if (error) {
      setMessage({ type: 'error', text: text.error });
    } else {
      setMessage({ type: 'success', text: text.saved });
      setNewPassword('');
      setOldPassword('');
      setShowPasswordSection(false);
    }
    setSaving(false);
  };

  const saveIncomeSources = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('monthly_income_sources').delete().eq('user_id', user.id);
    const rows = INCOME_CATEGORIES.map((category) => ({
      user_id: user.id,
      category: category.id,
      label: category.nameAr,
      amount: parseFloat((incomeSourceAmounts[category.id] || '').replace(/[^\d.]/g, '')) || 0,
    })).filter((row) => row.amount > 0);
    await supabase.from('monthly_income_sources').insert(rows);
    setEditingIncomeSources(false);
    loadCurrentIncomeSources();
    setSaving(false);
    setMessage({ type: 'success', text: text.saved });
  };

  const getCurrentCurrency = () => CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#eff6ff_0%,_#dbeafe_42%,_#bfdbfe_100%)]">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-700" />
      </div>
    );
  }

  return (
    <main dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-[linear-gradient(135deg,_#eff6ff_0%,_#dbeafe_42%,_#bfdbfe_100%)] px-4 py-6 dark:bg-[linear-gradient(135deg,_#1e3a5f_0%,_#1e3a8a_48%,_#111827_100%)]">
      <div className="relative mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={() => router.push('/')} variant="ghost" className="text-blue-700">
            {text.back}
          </Button>
          <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
            <SelectTrigger className="w-[150px]">
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

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-blue-50 dark:bg-blue-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <User className="w-6 h-6" />
              {text.profileTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{text.profileName}</Label>
                <Input value={profileData.display_name} onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })} onBlur={(e) => handleAutoSave('display_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{text.email}</Label>
                <div className="flex h-10 items-center px-3 bg-slate-100 dark:bg-slate-800 rounded-md border">
                  <span className="text-sm">{profileData.email || '-'}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{text.age}</Label>
                <Input type="number" value={profileData.age || ''} onChange={(e) => setProfileData({ ...profileData, age: e.target.value })} onBlur={(e) => handleAutoSave('age', e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{text.gender}</Label>
                <Select value={profileData.gender || ''} onValueChange={(v) => handleAutoSave('gender', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={text.gender} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{text.male}</SelectItem>
                    <SelectItem value="female">{text.female}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{text.totalIncome}</Label>
                <div className="flex h-10 items-center px-3 bg-slate-100 dark:bg-slate-800 rounded-md border">
                  <span className="font-bold">
                    {formatCurrency(currentIncomeSources.reduce((sum, s) => sum + Number(s.amount), 0))} {getCurrentCurrency().symbol}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{text.countryCode}</Label>
                <Select value={profileData.phone_country_code || ''} onValueChange={(v) => handleAutoSave('phone_country_code', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={text.countryCode} />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_DIAL_CODES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.code} {c.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{text.phone}</Label>
                <Input type="tel" value={profileData.phone_number || ''} onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })} onBlur={(e) => handleAutoSave('phone_number', e.target.value)} dir="ltr" />
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {message.text}
              </div>
            )}

            <Button onClick={saveProfile} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
              {saving ? '...' : text.saveChanges}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-blue-50 dark:bg-blue-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Shield className="w-6 h-6" />
              {text.securityQuestion}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{text.securityQuestion}</Label>
                <Select value={profileData.security_question || ''} onValueChange={(v) => handleAutoSave('security_question', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={text.securityQuestion} />
                  </SelectTrigger>
                  <SelectContent>
                    {SECURITY_QUESTIONS.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {isArabic ? q.questionAr : language === 'fr' ? q.questionFr : language === 'zh' ? q.questionZh : q.questionEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{text.securityAnswer}</Label>
                <Input value={profileData.security_answer || ''} onChange={(e) => setProfileData({ ...profileData, security_answer: e.target.value })} onBlur={(e) => handleAutoSave('security_answer', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-blue-50 dark:bg-blue-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Lock className="w-6 h-6" />
              {text.passwordSection}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Button variant="outline" onClick={() => setShowPasswordSection(!showPasswordSection)} className="w-full">
              {showPasswordSection ? (isArabic ? 'إخفاء قسم كلمة المرور' : 'Hide password section') : (isArabic ? 'إظهار قسم كلمة المرور' : 'Show password section')}
            </Button>
            {showPasswordSection && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{text.oldPassword}</Label>
                  <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{text.newPassword}</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <p className="text-xs text-muted-foreground">{text.newPasswordHint}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-blue-50 dark:bg-blue-900/30 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Coins className="w-6 h-6" />
              {text.incomeSources}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium">{text.totalIncome}: {formatCurrency(currentIncomeSources.reduce((sum, s) => sum + Number(s.amount), 0))} {getCurrentCurrency().symbol}</span>
              <Button variant="outline" size="sm" onClick={() => { if (!editingIncomeSources) loadCurrentIncomeSources(); setEditingIncomeSources(!editingIncomeSources); }}>
                {editingIncomeSources ? (isArabic ? 'إلغاء' : 'Cancel') : text.updateIncome}
              </Button>
            </div>
            {editingIncomeSources && (
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200">
                {INCOME_CATEGORIES.map((category) => (
                  <div key={category.id} className="flex gap-3 items-center">
                    <div className="flex-1"><span className="text-sm font-medium">{category.nameAr}</span></div>
                    <Input type="text" value={incomeSourceAmounts[category.id] || ''} onChange={(e) => setIncomeSourceAmounts({ ...incomeSourceAmounts, [category.id]: e.target.value })} className="w-32 h-8 text-sm" dir="ltr" />
                  </div>
                ))}
                <Button onClick={saveIncomeSources} disabled={saving} size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                  {saving ? '...' : text.saveChanges}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={signOut} variant="destructive" className="w-full">
          {text.logout}
        </Button>
      </div>
    </main>
  );
}
