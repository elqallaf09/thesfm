'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Coins, CheckCircle, AlertCircle } from 'lucide-react';
import { INCOME_CATEGORIES } from '@/lib/income-categories';

const PROFESSIONS = [
  // الطب والصحة
  'طبيب عام', 'طبيب أسنان', 'طبيب متخصص', 'صيدلاني', 'ممرض/ممرضة', 'مساعد طبيب', 'تقني مختبر', 'أخصائي تغذية', 'معالج فيزيائي', 'طبيب بيطري',
  // الهندسة
  'مهندس مدني', 'مهندس كهربائي', 'مهندس ميكانيكي', 'مهندس كيميائي', 'مهندس معماري', 'مهندس برمجيات', 'مهندس شبكات', 'مهندس نفط وغاز', 'مهندس صناعي', 'مهندس بيئي',
  // تقنية المعلومات
  'مطور تطبيقات', 'مطور ويب', 'محلل نظم', 'مسؤول شبكات', 'خبير أمن معلومات', 'محلل بيانات', 'مهندس ذكاء اصطناعي', 'مختص دعم تقني', 'مصمم UX/UI', 'مدير مشاريع تقنية',
  // التعليم
  'معلم ابتدائي', 'معلم متوسط', 'معلم ثانوي', 'أستاذ جامعي', 'مدير مدرسة', 'مستشار تعليمي', 'مدرب مهني', 'أخصائي تربوي', 'معلم لغة عربية', 'معلم رياضيات',
  // المال والأعمال
  'محاسب', 'مدقق حسابات', 'محلل مالي', 'مصرفي', 'وسيط عقاري', 'مستشار استثمار', 'مدير أعمال', 'رجل أعمال', 'مدير تسويق', 'مدير مبيعات',
  // القانون
  'محامي', 'مستشار قانوني', 'قاضي', 'مدعي عام', 'موثق عدل', 'مستشار شرعي',
  // الأعمال الحكومية والعسكرية
  'ضابط شرطة', 'ضابط جيش', 'موظف حكومي', 'دبلوماسي', 'موظف جمارك', 'إطفائي', 'مسؤول بلدية',
  // الإعلام والفنون
  'صحفي', 'مذيع', 'مصور', 'مصمم جرافيك', 'فنان', 'كاتب', 'مؤلف موسيقي', 'ممثل', 'منتج إعلامي', 'مؤثر رقمي',
  // الخدمات
  'سائق', 'طاهي / شيف', 'حلاق', 'نجار', 'كهربائي', 'سباك', 'ميكانيكي سيارات', 'بستاني', 'حارس أمن', 'عامل نظافة',
  // التجارة
  'تاجر', 'مستورد ومصدر', 'صاحب محل', 'موزع', 'مندوب مبيعات', 'مسؤول مشتريات',
  // الزراعة والبيئة
  'مهندس زراعي', 'مزارع', 'صياد', 'بيطري ميداني',
  // الرياضة واللياقة
  'مدرب رياضي', 'لاعب محترف', 'مدرب لياقة بدنية', 'معالج رياضي',
  // متنوع
  'طالب', 'متقاعد', 'ربة منزل', 'باحث علمي', 'أخرى',
];

const COUNTRY_CODES = [
  { code: '+965', name: 'الكويت' }, { code: '+966', name: 'السعودية' }, { code: '+971', name: 'الإمارات' },
  { code: '+973', name: 'البحرين' }, { code: '+968', name: 'عُمان' }, { code: '+974', name: 'قطر' },
  { code: '+962', name: 'الأردن' }, { code: '+961', name: 'لبنان' }, { code: '+20', name: 'مصر' },
  { code: '+1', name: 'أمريكا/كندا' }, { code: '+44', name: 'بريطانيا' }, { code: '+33', name: 'فرنسا' },
  { code: '+49', name: 'ألمانيا' }, { code: '+91', name: 'الهند' }, { code: '+92', name: 'باكستان' },
];

const SFMLogo = () => (
  <svg viewBox="0 0 300 300" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="pBgG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1e1e3f"/><stop offset="100%" stopColor="#0d0d1a"/></radialGradient>
      <linearGradient id="pGG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f0d080"/><stop offset="40%" stopColor="#c4a35a"/><stop offset="100%" stopColor="#9a7a30"/></linearGradient>
      <linearGradient id="pGG2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#e8c870"/><stop offset="50%" stopColor="#c4a35a"/><stop offset="100%" stopColor="#f0d080"/></linearGradient>
    </defs>
    <circle cx="150" cy="150" r="140" fill="url(#pBgG)" stroke="url(#pGG)" strokeWidth="1.5"/>
    <circle cx="150" cy="150" r="128" fill="none" stroke="url(#pGG)" strokeWidth="0.4" opacity="0.4"/>
    <text x="74" y="175" fontFamily="Georgia, serif" fontSize="82" fontWeight="700" fill="url(#pGG)" textAnchor="middle">S</text>
    <text x="150" y="175" fontFamily="Georgia, serif" fontSize="82" fontWeight="700" fill="url(#pGG2)" textAnchor="middle">F</text>
    <text x="226" y="175" fontFamily="Georgia, serif" fontSize="82" fontWeight="700" fill="url(#pGG)" textAnchor="middle">M</text>
    <line x1="68" y1="188" x2="232" y2="188" stroke="url(#pGG)" strokeWidth="1" opacity="0.6"/>
  </svg>
);

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>({ phone_country_code: '+965', gender: '', profession: '' });
  const [incomeAmounts, setIncomeAmounts] = useState<Record<string, string>>({});
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'income'>('info');

  useEffect(() => {
    if (!loading && !user) { router.push('/'); return; }
    if (user) loadData();
  }, [user, loading]);

  const loadData = async () => {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle();
    if (p) {
      setProfile({
        display_name: p.display_name || '',
        username: p.username || '',
        email: p.email || '',
        age: p.age ? String(p.age) : '',
        gender: p.gender || '',
        profession: p.profession || '',
        phone_country_code: p.phone_country_code || '+965',
        phone_number: p.phone_number || '',
      });
    }
    const { data: s } = await supabase.from('monthly_income_sources').select('*').eq('user_id', user!.id);
    if (s) {
      const amounts: Record<string, string> = {};
      s.forEach((src: any) => { amounts[src.category] = String(src.amount); });
      setIncomeAmounts(amounts);
    }
  };

  const saveInfo = async () => {
    if (!profile.display_name?.trim()) { setMessage({ type: 'error', text: 'الاسم المعروض مطلوب' }); return; }
    setSaving(true); setMessage(null);
    const { error } = await supabase.from('profiles').update({
      display_name: profile.display_name?.trim(),
      username: profile.username?.trim() || null,
      age: profile.age ? parseInt(profile.age) : null,
      gender: profile.gender || null,
      profession: profile.profession || null,
      phone_country_code: profile.phone_country_code,
      phone_number: profile.phone_number || null,
    }).eq('id', user!.id);
    if (error) setMessage({ type: 'error', text: 'حدث خطأ: ' + error.message });
    else {
      setMessage({ type: 'success', text: '✅ تم حفظ البيانات بنجاح' });
      await loadData(); // أعد تحميل البيانات بعد الحفظ
    }
    setSaving(false);
  };

  const savePassword = async () => {
    if (!oldPassword) { setMessage({ type: 'error', text: 'أدخل كلمة المرور الحالية' }); return; }
    if (newPassword.length < 6) { setMessage({ type: 'error', text: 'كلمة المرور الجديدة 6 أحرف على الأقل' }); return; }
    if (newPassword !== confirmPassword) { setMessage({ type: 'error', text: 'كلمة المرور الجديدة وتأكيدها غير متطابقين' }); return; }
    setSaving(true); setMessage(null);
    const email = profile.email || `${profile.username}@smart-finance.local`;
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
    if (signInErr) { setMessage({ type: 'error', text: 'كلمة المرور الحالية غير صحيحة' }); setSaving(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setMessage({ type: 'error', text: 'حدث خطأ: ' + error.message });
    else { setMessage({ type: 'success', text: '✅ تم تغيير كلمة المرور بنجاح' }); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }
    setSaving(false);
  };

  const saveIncome = async () => {
    setSaving(true); setMessage(null);
    await supabase.from('monthly_income_sources').delete().eq('user_id', user!.id);
    const rows = INCOME_CATEGORIES.map(cat => ({
      user_id: user!.id, category: cat.id, label: cat.nameAr,
      amount: parseFloat((incomeAmounts[cat.id] || '0').replace(/[^\d.]/g, '')) || 0,
    })).filter(r => r.amount > 0);
    if (rows.length > 0) await supabase.from('monthly_income_sources').insert(rows);
    setMessage({ type: 'success', text: '✅ تم تحديث مصادر الدخل بنجاح' });
    setSaving(false);
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#fffdf5' }}>
      <div className="animate-spin h-10 w-10 rounded-full border-4 border-t-transparent" style={{ borderColor: '#c4a35a', borderTopColor: 'transparent' }}></div>
    </div>
  );

  const tabs = [
    { id: 'info', label: 'المعلومات الشخصية' },
    { id: 'password', label: 'كلمة المرور' },
    { id: 'income', label: 'مصادر الدخل' },
  ];

  const inputStyle = { borderColor: 'rgba(196,163,90,0.4)' };

  return (
    <main dir="rtl" className="min-h-screen px-4 py-8" style={{ background: 'linear-gradient(135deg, #fffdf5 0%, #fef9e7 50%, #fdf5d0 100%)' }}>
      <div className="mx-auto max-w-3xl space-y-5">

        {/* Header */}
        <div className="rounded-3xl p-6" style={{ background: '#7f5c48', boxShadow: '0 4px 20px rgba(127,92,72,0.3), 0 8px 40px rgba(127,92,72,0.15)' }}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="text-white/80 hover:text-white transition-colors">
              <ArrowRight className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <SFMLogo />
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#f0d080' }}>{profile.display_name || profile.username || 'الملف الشخصي'}</h1>
                <p className="text-sm text-white/60">{profile.email || ''}</p>
                {profile.profession && <p className="text-xs mt-0.5" style={{ color: 'rgba(240,208,128,0.7)' }}>💼 {profile.profession}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="rounded-xl p-3 flex items-center gap-2 text-sm" style={{ background: message.type === 'success' ? 'rgba(196,163,90,0.1)' : 'rgba(220,50,50,0.08)', border: `1px solid ${message.type === 'success' ? 'rgba(196,163,90,0.4)' : 'rgba(220,50,50,0.3)'}`, color: message.type === 'success' ? '#7a5c1a' : '#c0392b' }}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl p-1" style={{ background: 'rgba(196,163,90,0.1)', border: '1px solid rgba(196,163,90,0.25)' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setMessage(null); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={activeTab === tab.id ? { background: '#7f5c48', color: 'white', boxShadow: '0 2px 8px rgba(127,92,72,0.3)' } : { color: '#7a5c1a' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Info Tab */}
        {activeTab === 'info' && (
          <Card style={{ border: '1px solid rgba(196,163,90,0.35)', background: 'rgba(255,253,245,0.98)' }}>
            <CardHeader className="rounded-t-lg" style={{ background: 'rgba(196,163,90,0.08)' }}>
              <CardTitle style={{ color: '#7a5c1a' }}>المعلومات الشخصية</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label style={{ color: '#7a5c1a' }}>الاسم المعروض <span className="text-red-500">*</span></Label>
                  <Input value={profile.display_name || ''} onChange={e => setProfile({ ...profile, display_name: e.target.value })} placeholder="الاسم الكامل" style={inputStyle} />
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: '#7a5c1a' }}>اسم المستخدم</Label>
                  <Input value={profile.username || ''} onChange={e => setProfile({ ...profile, username: e.target.value })} placeholder="مثال: mohammed123" dir="ltr" style={inputStyle} />
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: '#7a5c1a' }}>العمر</Label>
                  <Input value={profile.age || ''} onChange={e => setProfile({ ...profile, age: e.target.value })} type="number" dir="ltr" min="10" max="100" placeholder="25" style={inputStyle} />
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: '#7a5c1a' }}>الجنس</Label>
                  <Select value={profile.gender || ''} onValueChange={v => setProfile({ ...profile, gender: v })}>
                    <SelectTrigger style={inputStyle}><SelectValue placeholder="اختر الجنس" /></SelectTrigger>
                    <SelectContent><SelectItem value="male">ذكر</SelectItem><SelectItem value="female">أنثى</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label style={{ color: '#7a5c1a' }}>المهنة</Label>
                  <Select value={profile.profession || ''} onValueChange={v => setProfile({ ...profile, profession: v })}>
                    <SelectTrigger style={inputStyle}><SelectValue placeholder="اختر مهنتك" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {PROFESSIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: '#7a5c1a' }}>رمز الدولة</Label>
                  <Select value={profile.phone_country_code || '+965'} onValueChange={v => setProfile({ ...profile, phone_country_code: v })}>
                    <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRY_CODES.map(c => <SelectItem key={c.code} value={c.code}>{c.code} {c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: '#7a5c1a' }}>رقم الهاتف</Label>
                  <Input value={profile.phone_number || ''} onChange={e => setProfile({ ...profile, phone_number: e.target.value })} type="tel" dir="ltr" placeholder="XXXXXXXX" style={inputStyle} />
                </div>
              </div>
              <Button onClick={saveInfo} disabled={saving} className="w-full font-bold" style={{ background: '#7f5c48', color: 'white' }}>
                {saving ? 'جار الحفظ...' : '💾 حفظ المعلومات الشخصية'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <Card style={{ border: '1px solid rgba(196,163,90,0.35)', background: 'rgba(255,253,245,0.98)' }}>
            <CardHeader className="rounded-t-lg" style={{ background: 'rgba(196,163,90,0.08)' }}>
              <CardTitle style={{ color: '#7a5c1a' }}>تغيير كلمة المرور</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-1.5">
                <Label style={{ color: '#7a5c1a' }}>كلمة المرور الحالية</Label>
                <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} dir="ltr" style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <Label style={{ color: '#7a5c1a' }}>كلمة المرور الجديدة</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} dir="ltr" placeholder="6 أحرف على الأقل" style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <Label style={{ color: '#7a5c1a' }}>تأكيد كلمة المرور الجديدة</Label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} dir="ltr" style={inputStyle} />
              </div>
              <Button onClick={savePassword} disabled={saving} className="w-full font-bold" style={{ background: '#7f5c48', color: 'white' }}>
                {saving ? 'جار التغيير...' : '🔐 تغيير كلمة المرور'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Income Tab */}
        {activeTab === 'income' && (
          <Card style={{ border: '1px solid rgba(196,163,90,0.35)', background: 'rgba(255,253,245,0.98)' }}>
            <CardHeader className="rounded-t-lg" style={{ background: 'rgba(196,163,90,0.08)' }}>
              <CardTitle className="flex items-center gap-2" style={{ color: '#7a5c1a' }}><Coins className="w-5 h-5" />مصادر الدخل الشهري</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-3">
              {INCOME_CATEGORIES.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(196,163,90,0.05)', border: '0.5px solid rgba(196,163,90,0.2)' }}>
                  <span className="flex-1 text-sm font-medium" style={{ color: '#7a5c1a' }}>{cat.nameAr}</span>
                  <div className="flex items-center gap-1">
                    <Input type="text" value={incomeAmounts[cat.id] || ''} onChange={e => setIncomeAmounts({ ...incomeAmounts, [cat.id]: e.target.value })} placeholder="0.000" className="w-28 h-8 text-sm text-center" dir="ltr" style={inputStyle} />
                    <span className="text-xs shrink-0" style={{ color: 'rgba(122,92,26,0.5)' }}>د.ك</span>
                  </div>
                </div>
              ))}
              <div className="py-2 text-center rounded-xl" style={{ background: 'rgba(196,163,90,0.08)' }}>
                <p className="text-sm font-bold" style={{ color: '#7a5c1a' }}>
                  الإجمالي: {Object.values(incomeAmounts).reduce((s, v) => s + (parseFloat((v || '0').replace(/[^\d.]/g, '')) || 0), 0).toFixed(3)} د.ك
                </p>
              </div>
              <Button onClick={saveIncome} disabled={saving} className="w-full font-bold" style={{ background: '#7f5c48', color: 'white' }}>
                {saving ? 'جار الحفظ...' : '💰 حفظ مصادر الدخل'}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm pt-2" style={{ color: 'rgba(122,92,26,0.45)' }}>
          <p>المدير المالي الذكي - يساعدك على اتخاذ قرارات مالية أوضح</p>
          <p className="mt-1 font-medium" style={{ color: '#c4a35a' }}>powered by M.Q</p>
        </div>
      </div>
    </main>
  );
}
