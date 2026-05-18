'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Plus, Trash2, Send, Loader2, ChevronDown, ChevronUp, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Clock, Target, Zap, BarChart3 } from 'lucide-react';
import { WisdomTicker } from '@/components/WisdomTicker';

const PROJECT_TYPES = ['مطعم / كافيه', 'متجر إلكتروني', 'عقار واستثمار', 'تقنية وبرمجة', 'تعليم وتدريب', 'خدمات منزلية', 'صحة وجمال', 'تجارة وتوزيع', 'إعلام وتسويق', 'أخرى'];
const PROJECT_GOALS = ['دخل إضافي', 'تفرغ كامل', 'استثمار طويل الأمد', 'نمو سريع', 'بناء علامة تجارية', 'استقلالية مالية'];
const START_TIMELINES = ['خلال شهر', 'خلال 3 أشهر', 'خلال 6 أشهر', 'خلال سنة', 'أكثر من سنة'];
const PROJECT_NEEDS = [
  { id: 'funding', label: 'تمويل', icon: '💰' },
  { id: 'partner', label: 'شريك', icon: '🤝' },
  { id: 'employees', label: 'موظفين', icon: '👥' },
  { id: 'ecommerce', label: 'متجر إلكتروني', icon: '🛒' },
  { id: 'app', label: 'تطبيق', icon: '📱' },
  { id: 'marketing', label: 'تسويق', icon: '📣' },
  { id: 'suppliers', label: 'موردين', icon: '🏭' },
  { id: 'website', label: 'موقع إلكتروني', icon: '🌐' },
  { id: 'equipment', label: 'معدات', icon: '⚙️' },
  { id: 'location', label: 'مكتب / محل', icon: '🏪' },
  { id: 'license', label: 'رخصة تجارية', icon: '📋' },
  { id: 'plan', label: 'خطة عمل', icon: '📊' },
  { id: 'feasibility', label: 'دراسة جدوى', icon: '🔍' },
  { id: 'legal', label: 'استشارة قانونية', icon: '⚖️' },
];
const PROGRESS_STEPS = [
  { id: 'idea', label: 'فكرة المشروع', icon: '💡' },
  { id: 'feasibility', label: 'دراسة الجدوى', icon: '📊' },
  { id: 'funding', label: 'التمويل', icon: '💰' },
  { id: 'license', label: 'الرخصة', icon: '📋' },
  { id: 'launch', label: 'الإطلاق', icon: '🚀' },
];

interface ProjectForm {
  name: string; emoji: string; type: string; idea: string;
  capital: string; monthlyExpenses: string; monthlyRevenue: string;
  riskLevel: number; needs: string[]; goal: string; startTimeline: string;
  progress: Record<string, boolean>;
}
interface AIAnalysis { score: number; successRate: string; strengths: string[]; weaknesses: string[]; suggestions: string[]; marketStatus: string; }
interface Project extends ProjectForm { id: string; analysis?: AIAnalysis; expanded?: boolean; createdAt?: string; }
interface Message { role: 'user' | 'assistant'; content: string; }

const emptyForm: ProjectForm = {
  name: '', emoji: '🚀', type: '', idea: '', capital: '', monthlyExpenses: '',
  monthlyRevenue: '', riskLevel: 33, needs: [], goal: '', startTimeline: '',
  progress: { idea: true, feasibility: false, funding: false, license: false, launch: false },
};

const riskLabel = (v: number) => v < 34 ? { label: 'منخفض', color: '#2d8a4e', bg: 'rgba(45,138,78,0.1)' } : v < 67 ? { label: 'متوسط', color: '#c4a35a', bg: 'rgba(196,163,90,0.1)' } : { label: 'عالي', color: '#c0392b', bg: 'rgba(192,57,43,0.1)' };

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: 'مرحباً! 👋 أنا مستشارك المالي للمشاريع. أملأ تفاصيل مشروعك واضغط "تحليل المشروع" لأعطيك تقييماً شاملاً، أو اسألني مباشرة عن أي فكرة! 🚀' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (user) loadProjects(); }, [user]);

  const loadProjects = async () => {
    const { data } = await supabase.from('projects').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    if (data) setProjects(data.map((p: any) => ({ ...emptyForm, id: p.id, name: p.name, emoji: p.emoji || '🚀', type: p.notes?.type || '', idea: p.notes?.idea || '', capital: p.notes?.capital || '', monthlyExpenses: p.notes?.monthlyExpenses || '', monthlyRevenue: p.notes?.monthlyRevenue || '', riskLevel: p.notes?.riskLevel || 33, needs: p.notes?.needs || [], goal: p.notes?.goal || '', startTimeline: p.notes?.startTimeline || '', progress: p.notes?.progress || emptyForm.progress, analysis: p.notes?.analysis, expanded: false, createdAt: p.created_at })));
  };

  const analyzeProject = async (): Promise<AIAnalysis | null> => {
    if (!form.name) return null;
    setAnalyzing(true);
    try {
      const prompt = `حلل هذا المشروع وأعطني تقييماً دقيقاً:
اسم المشروع: ${form.name}
النوع: ${form.type}
الفكرة: ${form.idea}
رأس المال: ${form.capital} د.ك
المصروف الشهري المتوقع: ${form.monthlyExpenses} د.ك
الإيراد الشهري المتوقع: ${form.monthlyRevenue} د.ك
مستوى المخاطرة: ${riskLabel(form.riskLevel).label}
الهدف: ${form.goal}
وقت البدء: ${form.startTimeline}
الاحتياجات: ${form.needs.join(', ')}

أجب فقط بـ JSON بدون أي نص:
{"score":75,"successRate":"70%","strengths":["نقطة قوة 1","نقطة قوة 2"],"weaknesses":["نقطة ضعف 1","نقطة ضعف 2"],"suggestions":["اقتراح 1","اقتراح 2","اقتراح 3"],"marketStatus":"وصف حالة السوق"}`;

      const res = await fetch('/api/projects-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }) });
      const data = await res.json();
      const clean = (data.text || '').replace(/```json|```/g, '').trim();
      const start = clean.indexOf('{'); const end = clean.lastIndexOf('}');
      if (start !== -1 && end !== -1) return JSON.parse(clean.slice(start, end + 1));
    } catch { }
    setAnalyzing(false);
    return null;
  };

  const saveProject = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const analysis = await analyzeProject();
    setAnalyzing(false);
    const notesData = { type: form.type, idea: form.idea, capital: form.capital, monthlyExpenses: form.monthlyExpenses, monthlyRevenue: form.monthlyRevenue, riskLevel: form.riskLevel, needs: form.needs, goal: form.goal, startTimeline: form.startTimeline, progress: form.progress, analysis };
    if (user) {
      const { data } = await supabase.from('projects').insert({ user_id: user.id, name: form.name, emoji: form.emoji, budget: form.capital, timeline: form.startTimeline, duration_unit: 'month', steps: [], notes: notesData }).select().single();
      if (data) setProjects(prev => [{ ...form, id: data.id, analysis: analysis || undefined, expanded: false }, ...prev]);
    }
    setForm(emptyForm); setShowForm(false); setSaving(false);
  };

  const removeProject = async (id: string) => {
    if (user) await supabase.from('projects').delete().eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const toggleProgress = async (projectId: string, stepId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const newProgress = { ...p.progress, [stepId]: !p.progress[stepId] };
      supabase.from('projects').update({ notes: { ...p, progress: newProgress, analysis: p.analysis } }).eq('id', projectId);
      return { ...p, progress: newProgress };
    }));
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim(); setInput('');
    const newMsgs: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMsgs); setIsLoading(true);
    try {
      const res = await fetch('/api/projects-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newMsgs.map(m => ({ role: m.role, content: m.content })) }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.text || 'عذراً، حدث خطأ.' }]);
    } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ.' }]); }
    setIsLoading(false);
  };

  const calcROI = (p: Project) => {
    const cap = parseFloat(p.capital.replace(/[^\d.]/g, '')) || 0;
    const rev = parseFloat(p.monthlyRevenue.replace(/[^\d.]/g, '')) || 0;
    const exp = parseFloat(p.monthlyExpenses.replace(/[^\d.]/g, '')) || 0;
    const profit = rev - exp;
    if (cap > 0 && profit > 0) return { profit, months: Math.ceil(cap / profit), yearly: ((profit * 12 / cap) * 100).toFixed(1) };
    return null;
  };

  const scoreColor = (s: number) => s >= 70 ? '#2d8a4e' : s >= 50 ? '#c4a35a' : '#c0392b';
  const G = '#c4a35a', Br = '#7f5c48', DG = '#7a5c1a';
  const card = { border: '1px solid rgba(196,163,90,0.25)', background: 'rgba(255,253,245,0.97)', boxShadow: '0 2px 16px rgba(196,163,90,0.08)' };

  return (
    <main dir="rtl" className="min-h-screen px-4 py-6" style={{ background: 'linear-gradient(135deg, #fffdf5 0%, #fef9e7 60%, #fdf5d0 100%)' }}>
      <style>{`.proj-card{transition:all .2s}.proj-card:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(196,163,90,0.15)!important}.need-btn{transition:all .15s}.need-btn:hover{transform:scale(1.05)}.prog-step{transition:all .2s}`}</style>
      <div className="mx-auto max-w-6xl space-y-4">
        <WisdomTicker language="ar" showLanguageSelector={false} />

        {/* Header */}
        <div className="rounded-3xl p-5" style={{ background: Br, boxShadow: '0 4px 20px rgba(127,92,72,0.35), 0 8px 40px rgba(127,92,72,0.15)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/')} className="text-white/70 hover:text-white transition-colors"><ArrowRight className="w-6 h-6" /></button>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#f0d080' }}>🚀 مشاريعي المستقبلية</h1>
                <p className="text-xs text-white/60 mt-0.5">إدارة ذكية لمشاريعك مع تحليل AI شامل</p>
              </div>
            </div>
            <Button onClick={() => setShowForm(!showForm)} className="font-bold" style={{ background: G, color: '#1a0f00' }}>
              <Plus className="w-4 h-4 ms-1" /> مشروع جديد
            </Button>
          </div>
        </div>

        {/* New Project Form */}
        {showForm && (
          <Card style={{ ...card, border: '1px solid rgba(196,163,90,0.4)' }}>
            <CardHeader className="pb-3" style={{ background: 'rgba(196,163,90,0.06)', borderRadius: '12px 12px 0 0' }}>
              <CardTitle className="flex items-center gap-2 text-lg" style={{ color: DG }}><Sparkles className="w-5 h-5" style={{ color: G }} />إضافة مشروع جديد</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              {/* Basic Info */}
              <div>
                <p className="text-sm font-bold mb-3 flex items-center gap-1" style={{ color: DG }}><Target className="w-4 h-4" style={{ color: G }} /> المعلومات الأساسية</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs" style={{ color: DG }}>إيموجي</Label>
                    <Input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} className="text-center text-xl" style={{ borderColor: 'rgba(196,163,90,0.4)' }} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs" style={{ color: DG }}>اسم المشروع *</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: كافيه الأصيل" style={{ borderColor: 'rgba(196,163,90,0.4)' }} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs" style={{ color: DG }}>نوع المشروع</Label>
                    <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                      <SelectTrigger style={{ borderColor: 'rgba(196,163,90,0.4)' }}><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                      <SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" style={{ color: DG }}>وقت البدء</Label>
                    <Select value={form.startTimeline} onValueChange={v => setForm({ ...form, startTimeline: v })}>
                      <SelectTrigger style={{ borderColor: 'rgba(196,163,90,0.4)' }}><SelectValue placeholder="متى؟" /></SelectTrigger>
                      <SelectContent>{START_TIMELINES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <Label className="text-xs" style={{ color: DG }}>فكرة المشروع</Label>
                    <Textarea value={form.idea} onChange={e => setForm({ ...form, idea: e.target.value })} placeholder="اشرح فكرتك باختصار..." className="min-h-[80px] text-sm" style={{ borderColor: 'rgba(196,163,90,0.4)' }} />
                  </div>
                </div>
              </div>

              {/* Financial */}
              <div>
                <p className="text-sm font-bold mb-3 flex items-center gap-1" style={{ color: DG }}><BarChart3 className="w-4 h-4" style={{ color: G }} /> الجانب المالي</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {[{ key: 'capital', label: 'رأس المال المتوفر' }, { key: 'monthlyExpenses', label: 'المصروف الشهري المتوقع' }, { key: 'monthlyRevenue', label: 'الإيراد الشهري المتوقع' }].map(f => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-xs" style={{ color: DG }}>{f.label}</Label>
                      <div className="flex items-center gap-2 h-10 rounded-xl border px-3" style={{ borderColor: 'rgba(196,163,90,0.4)', background: 'white' }}>
                        <span className="text-xs font-bold shrink-0" style={{ color: G }}>د.ك</span>
                        <input type="text" value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder="0.000" className="flex-1 bg-transparent text-sm outline-none" dir="ltr" style={{ color: DG }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* ROI Preview */}
                {form.capital && form.monthlyRevenue && form.monthlyExpenses && (() => {
                  const roi = calcROI(form as any);
                  if (!roi) return null;
                  return (
                    <div className="mt-3 p-3 rounded-xl grid grid-cols-3 gap-3 text-center" style={{ background: 'rgba(196,163,90,0.06)', border: '1px solid rgba(196,163,90,0.2)' }}>
                      <div><p className="text-xs" style={{ color: 'rgba(122,92,26,0.6)' }}>الربح الشهري</p><p className="font-bold text-sm" style={{ color: DG }}>{roi.profit.toFixed(3)} د.ك</p></div>
                      <div><p className="text-xs" style={{ color: 'rgba(122,92,26,0.6)' }}>استرجاع رأس المال</p><p className="font-bold text-sm" style={{ color: DG }}>{roi.months} شهر</p></div>
                      <div><p className="text-xs" style={{ color: 'rgba(122,92,26,0.6)' }}>العائد السنوي</p><p className="font-bold text-sm" style={{ color: '#2d8a4e' }}>{roi.yearly}%</p></div>
                    </div>
                  );
                })()}

                {/* Risk Slider */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs" style={{ color: DG }}>نسبة المخاطرة</Label>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: riskLabel(form.riskLevel).bg, color: riskLabel(form.riskLevel).color }}>
                      {riskLabel(form.riskLevel).label}
                    </span>
                  </div>
                  <input type="range" min="0" max="100" value={form.riskLevel} onChange={e => setForm({ ...form, riskLevel: Number(e.target.value) })} className="w-full" style={{ accentColor: riskLabel(form.riskLevel).color }} />
                  <div className="flex justify-between text-xs" style={{ color: 'rgba(122,92,26,0.4)' }}>
                    <span>🟢 منخفض</span><span>🟡 متوسط</span><span>🔴 عالي</span>
                  </div>
                </div>
              </div>

              {/* Needs */}
              <div>
                <p className="text-sm font-bold mb-3 flex items-center gap-1" style={{ color: DG }}><Zap className="w-4 h-4" style={{ color: G }} /> احتياجات المشروع</p>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_NEEDS.map(n => (
                    <button key={n.id} type="button" onClick={() => setForm(prev => ({ ...prev, needs: prev.needs.includes(n.id) ? prev.needs.filter(x => x !== n.id) : [...prev.needs, n.id] }))}
                      className="need-btn px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1"
                      style={form.needs.includes(n.id) ? { background: Br, color: 'white', border: `1px solid ${Br}` } : { background: 'rgba(196,163,90,0.08)', color: DG, border: '1px solid rgba(196,163,90,0.25)' }}>
                      {n.icon} {n.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal */}
              <div className="space-y-1">
                <Label className="text-xs font-bold" style={{ color: DG }}>🎯 الهدف من المشروع</Label>
                <Select value={form.goal} onValueChange={v => setForm({ ...form, goal: v })}>
                  <SelectTrigger style={{ borderColor: 'rgba(196,163,90,0.4)' }}><SelectValue placeholder="اختر هدفك" /></SelectTrigger>
                  <SelectContent>{PROJECT_GOALS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Progress Initial */}
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: DG }}>📍 ما أنجزته حتى الآن</p>
                <div className="flex gap-2 flex-wrap">
                  {PROGRESS_STEPS.map(step => (
                    <button key={step.id} type="button" onClick={() => setForm(prev => ({ ...prev, progress: { ...prev.progress, [step.id]: !prev.progress[step.id] } }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
                      style={form.progress[step.id] ? { background: 'rgba(45,138,78,0.15)', color: '#2d8a4e', border: '1px solid rgba(45,138,78,0.3)' } : { background: 'rgba(196,163,90,0.08)', color: 'rgba(122,92,26,0.5)', border: '1px solid rgba(196,163,90,0.2)' }}>
                      {form.progress[step.id] ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {step.icon} {step.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={saveProject} disabled={saving || !form.name.trim()} className="flex-1 font-bold h-12" style={{ background: Br, color: 'white' }}>
                  {saving || analyzing ? <><Loader2 className="w-4 h-4 animate-spin ms-2" />{analyzing ? 'جارٍ تحليل المشروع...' : 'جارٍ الحفظ...'}</> : <><Sparkles className="w-4 h-4 ms-2" />حفظ + تحليل بالذكاء الاصطناعي</>}
                </Button>
                <Button onClick={() => { setShowForm(false); setForm(emptyForm); }} variant="outline" className="px-6" style={{ borderColor: 'rgba(196,163,90,0.4)', color: DG }}>إلغاء</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Grid */}
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Projects List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2" style={{ color: DG }}><TrendingUp className="w-5 h-5" style={{ color: G }} />مشاريعي ({projects.length})</h2>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-12 rounded-2xl" style={{ border: '1px dashed rgba(196,163,90,0.4)', color: 'rgba(122,92,26,0.5)' }}>
                <p className="text-5xl mb-3">🚀</p>
                <p className="font-medium">ابدأ بإضافة مشروعك الأول</p>
                <p className="text-sm mt-1">الذكاء الاصطناعي سيحلله ويعطيك تقييماً شاملاً</p>
              </div>
            ) : projects.map(project => {
              const roi = calcROI(project);
              const progressCount = Object.values(project.progress).filter(Boolean).length;
              const progressPct = Math.round(progressCount / PROGRESS_STEPS.length * 100);
              return (
                <div key={project.id} className="proj-card rounded-2xl overflow-hidden" style={card}>
                  {/* Card Header */}
                  <div className="p-4 cursor-pointer" onClick={() => setProjects(prev => prev.map(p => p.id === project.id ? { ...p, expanded: !p.expanded } : p))}>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: 'rgba(196,163,90,0.12)', border: '1px solid rgba(196,163,90,0.2)' }}>{project.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold" style={{ color: DG }}>{project.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {project.type && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(196,163,90,0.12)', color: DG }}>{project.type}</span>}
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: riskLabel(project.riskLevel).bg, color: riskLabel(project.riskLevel).color }}>مخاطرة {riskLabel(project.riskLevel).label}</span>
                              {project.goal && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(127,92,72,0.1)', color: Br }}>{project.goal}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {project.analysis && (
                              <div className="text-center">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${scoreColor(project.analysis.score)}20`, color: scoreColor(project.analysis.score), border: `2px solid ${scoreColor(project.analysis.score)}` }}>
                                  {project.analysis.score}
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: 'rgba(122,92,26,0.5)' }}>/100</p>
                              </div>
                            )}
                            <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); removeProject(project.id); }} className="text-red-400 h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs" style={{ color: 'rgba(122,92,26,0.5)' }}>تقدم المشروع</p>
                            <p className="text-xs font-bold" style={{ color: DG }}>{progressPct}%</p>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(196,163,90,0.15)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#2d8a4e' : G }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    {(project.capital || project.monthlyRevenue) && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {project.capital && <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(196,163,90,0.06)' }}><p className="text-xs" style={{ color: 'rgba(122,92,26,0.5)' }}>رأس المال</p><p className="text-sm font-bold" style={{ color: DG }}>{project.capital} <span className="text-xs">د.ك</span></p></div>}
                        {project.monthlyRevenue && <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(196,163,90,0.06)' }}><p className="text-xs" style={{ color: 'rgba(122,92,26,0.5)' }}>الإيراد/شهر</p><p className="text-sm font-bold" style={{ color: '#2d8a4e' }}>{project.monthlyRevenue} <span className="text-xs">د.ك</span></p></div>}
                        {roi && <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(196,163,90,0.06)' }}><p className="text-xs" style={{ color: 'rgba(122,92,26,0.5)' }}>استرجاع رأس المال</p><p className="text-sm font-bold" style={{ color: DG }}>{roi.months} <span className="text-xs">شهر</span></p></div>}
                      </div>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {project.expanded && (
                    <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: 'rgba(196,163,90,0.15)' }}>
                      {/* AI Analysis */}
                      {project.analysis && (
                        <div className="mt-4 rounded-xl p-4 space-y-3" style={{ background: 'rgba(196,163,90,0.06)', border: '1px solid rgba(196,163,90,0.2)' }}>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold flex items-center gap-1" style={{ color: DG }}><Sparkles className="w-4 h-4" style={{ color: G }} />تحليل الذكاء الاصطناعي</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold" style={{ color: scoreColor(project.analysis.score) }}>نسبة النجاح: {project.analysis.successRate}</span>
                            </div>
                          </div>
                          <p className="text-xs p-2 rounded-lg" style={{ background: 'rgba(196,163,90,0.08)', color: DG }}>{project.analysis.marketStatus}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-bold mb-1.5" style={{ color: '#2d8a4e' }}>✅ نقاط القوة</p>
                              {project.analysis.strengths.map((s, i) => <p key={i} className="text-xs py-0.5" style={{ color: 'rgba(122,92,26,0.8)' }}>• {s}</p>)}
                            </div>
                            <div>
                              <p className="text-xs font-bold mb-1.5" style={{ color: '#c0392b' }}>⚠️ نقاط الضعف</p>
                              {project.analysis.weaknesses.map((w, i) => <p key={i} className="text-xs py-0.5" style={{ color: 'rgba(122,92,26,0.8)' }}>• {w}</p>)}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold mb-1.5" style={{ color: G }}>💡 اقتراحات</p>
                            {project.analysis.suggestions.map((s, i) => <p key={i} className="text-xs py-0.5" style={{ color: 'rgba(122,92,26,0.8)' }}>• {s}</p>)}
                          </div>
                        </div>
                      )}

                      {/* Progress Tracker */}
                      <div>
                        <p className="text-xs font-bold mb-2" style={{ color: DG }}>📍 متابعة التقدم</p>
                        <div className="flex gap-2 flex-wrap">
                          {PROGRESS_STEPS.map((step, idx) => {
                            const done = project.progress[step.id];
                            const prevDone = idx === 0 || project.progress[PROGRESS_STEPS[idx - 1].id];
                            return (
                              <button key={step.id} onClick={() => toggleProgress(project.id, step.id)} disabled={!prevDone && !done}
                                className="prog-step flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
                                style={done ? { background: 'rgba(45,138,78,0.15)', color: '#2d8a4e', border: '1px solid rgba(45,138,78,0.3)' } : prevDone ? { background: 'rgba(196,163,90,0.1)', color: DG, border: '1px solid rgba(196,163,90,0.3)', cursor: 'pointer' } : { background: 'rgba(0,0,0,0.04)', color: 'rgba(122,92,26,0.35)', border: '1px solid rgba(0,0,0,0.08)', cursor: 'not-allowed' }}>
                                {done ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {step.icon} {step.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Idea & Needs */}
                      {project.idea && <div className="rounded-xl p-3" style={{ background: 'rgba(196,163,90,0.06)', border: '0.5px solid rgba(196,163,90,0.2)' }}><p className="text-xs font-bold mb-1" style={{ color: DG }}>💡 فكرة المشروع:</p><p className="text-xs" style={{ color: 'rgba(122,92,26,0.8)' }}>{project.idea}</p></div>}
                      {project.needs.length > 0 && (
                        <div><p className="text-xs font-bold mb-2" style={{ color: DG }}>⚡ الاحتياجات:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {project.needs.map(nid => { const n = PROJECT_NEEDS.find(x => x.id === nid); return n ? <span key={nid} className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(127,92,72,0.1)', color: Br }}>{n.icon} {n.label}</span> : null; })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* AI Chat */}
          <div className="space-y-3">
            <h2 className="font-bold flex items-center gap-2" style={{ color: DG }}><Sparkles className="w-5 h-5" style={{ color: G }} />مستشار المشاريع الذكي</h2>
            <Card style={{ ...card, display: 'flex', flexDirection: 'column', height: '600px' }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                      style={msg.role === 'user' ? { background: 'rgba(127,92,72,0.1)', color: Br, border: '0.5px solid rgba(127,92,72,0.15)' } : { background: Br, color: 'white' }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && <div className="flex justify-end"><div className="rounded-2xl px-4 py-3" style={{ background: Br }}><Loader2 className="w-4 h-4 animate-spin text-white" /></div></div>}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 border-t space-y-2" style={{ borderColor: 'rgba(196,163,90,0.15)' }}>
                <div className="flex gap-2">
                  <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="اسألني عن مشروعك..." style={{ borderColor: 'rgba(196,163,90,0.4)' }} />
                  <Button onClick={sendMessage} disabled={isLoading || !input.trim()} style={{ background: Br, color: 'white' }}><Send className="w-4 h-4" /></Button>
                </div>
                <p className="text-xs text-center" style={{ color: 'rgba(122,92,26,0.4)' }}>متخصص في المشاريع والاستثمار المالي فقط</p>
              </div>
            </Card>
          </div>
        </div>

        <div className="pt-4 text-center text-sm" style={{ borderTop: '1px solid rgba(196,163,90,0.25)' }}>
          <p style={{ color: 'rgba(122,92,26,0.5)' }}>المدير المالي الذكي - يساعدك على اتخاذ قرارات مالية أوضح</p>
          <p className="mt-1 font-medium" style={{ color: G }}>powered by M.Q</p>
        </div>
      </div>
    </main>
  );
}
