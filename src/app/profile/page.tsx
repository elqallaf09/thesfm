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
import { ArrowRight, User, Mail, Phone, Briefcase, Lock, Coins, CheckCircle, AlertCircle } from 'lucide-react';
import { INCOME_CATEGORIES } from '@/lib/income-categories';

const COUNTRY_CODES = [
  { code: '+965', name: 'الكويت' }, { code: '+966', name: 'السعودية' }, { code: '+971', name: 'الإمارات' },
  { code: '+973', name: 'البحرين' }, { code: '+968', name: 'عُمان' }, { code: '+974', name: 'قطر' },
  { code: '+962', name: 'الأردن' }, { code: '+961', name: 'لبنان' }, { code: '+20', name: 'مصر' },
  { code: '+1', name: 'أمريكا' }, { code: '+44', name: 'بريطانيا' }, { code: '+33', name: 'فرنسا' },
];

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>({});
  const [incomeSources, setIncomeSources] = useState<any[]>([]);
  const [incomeAmounts, setIncomeAmounts] = useState<Record<string, string>>({});
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'info'|'password'|'income'>('info');

  useEffect(() => {
    if (!loading && !user) { router.push('/'); return; }
    if (user) loadData();
  }, [user, loading]);

  const loadData = async () => {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle();
    if (p) setProfile(p);
    const { data: s } = await supabase.from('monthly_income_sources').select('*').eq('user_id', user!.id);
    if (s) {
      setIncomeSources(s);
      const amounts: Record<string, string> = {};
      s.forEach((src: any) => { amounts[src.category] = String(src.amount); });
      setIncomeAmounts(amounts);
    }
  };

  const saveInfo = async () => {
    setSaving(true); setMessage(null);
    const { error } = await supabase.from('profiles').update({
      display_name: profile.display_name,
      username: profile.username,
      email: profile.email,
      age: profile.age,
      gender: profile.gender,
      profession: profile.profession,
      phone_country_code: profile.phone_country_code,
      phone_number: profile.phone_number,
    }).eq('id', user!.id);
    if (error) setMessage({ type: 'error', text: 'حدث خطأ في الحفظ: ' + error.message });
    else setMessage({ type: 'success', text: '✅ تم حفظ البيانات بنجاح' });
    setSaving(false);
  };

  const savePassword = async () => {
    if (!oldPassword) { setMessage({ type: 'error', text: 'أدخل كلمة المرور الحالية' }); return; }
    if (newPassword.length < 6) { setMessage({ type: 'error', text: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' }); return; }
    if (newPassword !== confirmPassword) { setMessage({ type: 'error', text: 'كلمة المرور الجديدة وتأكيدها غير متطابقين' }); return; }
    setSaving(true); setMessage(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user!.email!, password: oldPassword });
    if (signInError) { setMessage({ type: 'error', text: 'كلمة المرور الحالية غير صحيحة' }); setSaving(false); return; }
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

  if (loading) return <div className="flex min-h-screen items-center justify-center" style={{background: '#fffdf5'}}><div className="animate-spin h-8 w-8 rounded-full border-4" style={{borderColor: '#c4a35a', borderTopColor: 'transparent'}}></div></div>;

  const tabs = [
    { id: 'info', label: 'المعلومات الشخصية', icon: <User className="w-4 h-4" /> },
    { id: 'password', label: 'كلمة المرور', icon: <Lock className="w-4 h-4" /> },
    { id: 'income', label: 'مصادر الدخل', icon: <Coins className="w-4 h-4" /> },
  ];

  return (
    <main dir="rtl" className="min-h-screen px-4 py-8" style={{background: 'linear-gradient(135deg, #fffdf5 0%, #fef9e7 50%, #fdf5d0 100%)'}}>
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <div className="rounded-3xl p-6 text-white" style={{background: '#7f5c48', boxShadow: '0 4px 20px rgba(127,92,72,0.3)'}}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="text-white/80 hover:text-white transition-colors">
              <ArrowRight className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold" style={{background: 'rgba(240,208,128,0.2)', border: '2px solid #f0d080', color: '#f0d080'}}>
                {profile.display_name?.[0] || profile.username?.[0] || '؟'}
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{color: '#f0d080'}}>{profile.display_name || profile.username || 'المستخدم'}</h1>
                <p className="text-sm text-white/70">{profile.email || ''}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="rounded-xl p-3 flex items-center gap-2 text-sm" style={{background: message.type === 'success' ? 'rgba(196,163,90,0.1)' : 'rgba(220,50,50,0.1)', border: `1px solid ${message.type === 'success' ? 'rgba(196,163,90,0.4)' : 'rgba(220,50,50,0.3)'}`, color: message.type === 'success' ? '#7a5c1a' : '#c0392b'}}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 rounded-2xl p-1" style={{background: 'rgba(196,163,90,0.1)', border: '1px solid rgba(196,163,90,0.3)'}}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setMessage(null); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={activeTab === tab.id ? {background: '#7f5c48', color: 'white', boxShadow: '0 2px 8px rgba(127,92,72,0.3)'} : {color: '#7a5c1a'}}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Info Tab */}
        {activeTab === 'info' && (
          <Card style={{border: '1px solid rgba(196,163,90,0.35)', background: 'rgba(255,253,245,0.98)'}}>
            <CardHeader style={{background: 'rgba(196,163,90,0.08)', borderRadius: '12px 12px 0 0'}}>
              <CardTitle style={{color: '#7a5c1a'}}>المعلومات الشخصية</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label style={{color: '#7a5c1a'}}>الاسم المعروض</Label>
                  <Input value={profile.display_name || ''} onChange={e => setProfile({...profile, display_name: e.target.value})} style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                </div>
                <div className="space-y-2">
                  <Label style={{color: '#7a5c1a'}}>اسم المستخدم (اختياري)</Label>
                  <Input value={profile.username || ''} onChange={e => setProfile({...profile, username: e.target.value})} dir="ltr" style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                </div>
                <div className="space-y-2">
                  <Label style={{color: '#7a5c1a'}}>البريد الإلكتروني</Label>
                  <Input value={profile.email || ''} onChange={e => setProfile({...profile, email: e.target.value})} dir="ltr" type="email" style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                </div>
                <div className="space-y-2">
                  <Label style={{color: '#7a5c1a'}}>العمر</Label>
                  <Input value={profile.age || ''} onChange={e => setProfile({...profile, age: e.target.value})} type="number" dir="ltr" min="10" max="120" style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                </div>
                <div className="space-y-2">
                  <Label style={{color: '#7a5c1a'}}>الجنس</Label>
                  <Select value={profile.gender || ''} onValueChange={v => setProfile({...profile, gender: v})}>
                    <SelectTrigger style={{borderColor: 'rgba(196,163,90,0.4)'}}><SelectValue placeholder="اختر الجنس" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label style={{color: '#7a5c1a'}}>المهنة</Label>
                  <Input value={profile.profession || ''} onChange={e => setProfile({...profile, profession: e.target.value})} placeholder="مثال: مهندس، معلم، طبيب..." style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                </div>
                <div className="space-y-2">
                  <Label style={{color: '#7a5c1a'}}>رمز الدولة</Label>
                  <Select value={profile.phone_country_code || '+965'} onValueChange={v => setProfile({...profile, phone_country_code: v})}>
                    <SelectTrigger style={{borderColor: 'rgba(196,163,90,0.4)'}}><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRY_CODES.map(c => <SelectItem key={c.code} value={c.code}>{c.code} {c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label style={{color: '#7a5c1a'}}>رقم الهاتف</Label>
                  <Input value={profile.phone_number || ''} onChange={e => setProfile({...profile, phone_number: e.target.value})} dir="ltr" type="tel" style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                </div>
              </div>
              <Button onClick={saveInfo} disabled={saving} className="w-full font-bold" style={{background: '#7f5c48', color: 'white'}}>
                {saving ? 'جار الحفظ...' : '💾 حفظ المعلومات الشخصية'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <Card style={{border: '1px solid rgba(196,163,90,0.35)', background: 'rgba(255,253,245,0.98)'}}>
            <CardHeader style={{background: 'rgba(196,163,90,0.08)', borderRadius: '12px 12px 0 0'}}>
              <CardTitle style={{color: '#7a5c1a'}}>تغيير كلمة المرور</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label style={{color: '#7a5c1a'}}>كلمة المرور الحالية</Label>
                <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} dir="ltr" style={{borderColor: 'rgba(196,163,90,0.4)'}} />
              </div>
              <div className="space-y-2">
                <Label style={{color: '#7a5c1a'}}>كلمة المرور الجديدة</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} dir="ltr" placeholder="6 أحرف على الأقل" style={{borderColor: 'rgba(196,163,90,0.4)'}} />
              </div>
              <div className="space-y-2">
                <Label style={{color: '#7a5c1a'}}>تأكيد كلمة المرور الجديدة</Label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} dir="ltr" style={{borderColor: 'rgba(196,163,90,0.4)'}} />
              </div>
              <Button onClick={savePassword} disabled={saving} className="w-full font-bold" style={{background: '#7f5c48', color: 'white'}}>
                {saving ? 'جار التغيير...' : '🔐 تغيير كلمة المرور'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Income Tab */}
        {activeTab === 'income' && (
          <Card style={{border: '1px solid rgba(196,163,90,0.35)', background: 'rgba(255,253,245,0.98)'}}>
            <CardHeader style={{background: 'rgba(196,163,90,0.08)', borderRadius: '12px 12px 0 0'}}>
              <CardTitle style={{color: '#7a5c1a'}}>مصادر الدخل الشهري</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {INCOME_CATEGORIES.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl" style={{background: 'rgba(196,163,90,0.05)', border: '0.5px solid rgba(196,163,90,0.2)'}}>
                  <span className="flex-1 text-sm font-medium" style={{color: '#7a5c1a'}}>{cat.nameAr}</span>
                  <Input type="text" value={incomeAmounts[cat.id] || ''} onChange={e => setIncomeAmounts({...incomeAmounts, [cat.id]: e.target.value})} placeholder="0.00" className="w-36 h-8 text-sm text-center" dir="ltr" style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                  <span className="text-sm" style={{color: 'rgba(122,92,26,0.5)'}}>د.ك</span>
                </div>
              ))}
              <div className="pt-2 text-center">
                <p className="text-sm font-bold" style={{color: '#7a5c1a'}}>
                  الإجمالي: {Object.values(incomeAmounts).reduce((sum, v) => sum + (parseFloat((v || '0').replace(/[^\d.]/g, '')) || 0), 0).toFixed(3)} د.ك
                </p>
              </div>
              <Button onClick={saveIncome} disabled={saving} className="w-full font-bold" style={{background: '#7f5c48', color: 'white'}}>
                {saving ? 'جار الحفظ...' : '💰 حفظ مصادر الدخل'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm pt-2" style={{color: 'rgba(122,92,26,0.5)'}}>
          <p>المدير المالي الذكي - يساعدك على اتخاذ قرارات مالية أوضح</p>
          <p className="mt-1" style={{color: '#c4a35a'}}>powered by M.Q</p>
        </div>
      </div>
    </main>
  );
}
