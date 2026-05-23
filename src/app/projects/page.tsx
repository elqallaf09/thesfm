'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';
import { Loader2, Pencil, Trash2, Send, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';

/* ─── Types ─── */
type ProjectStatus = 'فكرة' | 'قيد التنفيذ' | 'نشط' | 'متوقف' | 'مكتمل';
interface ProjectForm {
  name: string; emoji: string; type: string; idea: string;
  capital: string; expectedProfit: string; currentProfit: string;
  monthlyExpenses: string; monthlyRevenue: string;
  startDate: string; status: ProjectStatus;
  riskLevel: number; needs: string[]; goal: string;
  startTimeline: string; notes: string;
  progress: Record<string, boolean>;
  feasibilityTypes: string[];
}
interface AIAnalysis { score: number; successRate: string; strengths: string[]; weaknesses: string[]; suggestions: string[]; marketStatus: string; }
interface Project extends ProjectForm { id: string; analysis?: AIAnalysis; expanded?: boolean; createdAt?: string; }
interface Message { role: 'user' | 'assistant'; content: string; }

/* ─── Constants ─── */
const PROJECT_TYPES = ['مطعم / كافيه','متجر إلكتروني','عقار واستثمار','تقنية وبرمجة','تعليم وتدريب','خدمات منزلية','صحة وجمال','تجارة وتوزيع','إعلام وتسويق','مشروع زراعي','صناعة وتصنيع','أخرى'];
const PROJECT_GOALS = ['دخل إضافي','تفرغ كامل','استثمار طويل الأمد','نمو سريع','بناء علامة تجارية','استقلالية مالية'];
const START_TIMELINES = ['خلال شهر','خلال 3 أشهر','خلال 6 أشهر','خلال سنة','أكثر من سنة'];
const PROGRESS_STEPS = [{id:'idea',label:'الفكرة',icon:'💡'},{id:'feasibility',label:'الجدوى',icon:'📊'},{id:'funding',label:'التمويل',icon:'💰'},{id:'license',label:'الرخصة',icon:'📋'},{id:'launch',label:'الإطلاق',icon:'🚀'}];
const EMOJIS = ['🚀','💡','🏪','🛒','🏠','📱','🎓','💼','🍽','📈','🎨','🏭','🌐','⚙️','💎','🏗','🚗','✈️','🎯','💊'];
const STATUS_CONFIG: Record<ProjectStatus, { color: string; bg: string; icon: string }> = {
  'فكرة':        { color: '#3B82F6', bg: 'rgba(59,130,246,.10)',  icon: '💡' },
  'قيد التنفيذ': { color: '#F59E0B', bg: 'rgba(245,158,11,.10)',  icon: '⚙️' },
  'نشط':         { color: '#22C55E', bg: 'rgba(34,197,94,.10)',   icon: '✅' },
  'متوقف':       { color: '#EF4444', bg: 'rgba(239,68,68,.10)',   icon: '⏸' },
  'مكتمل':       { color: '#D8AE63', bg: 'rgba(216,174,99,.12)',  icon: '🏆' },
};
const emptyForm: ProjectForm = {
  name:'',emoji:'🚀',type:'',idea:'',capital:'',expectedProfit:'',currentProfit:'',
  monthlyExpenses:'',monthlyRevenue:'',startDate:'',status:'فكرة',
  riskLevel:33,needs:[],goal:'',startTimeline:'',notes:'',
  progress:{idea:true,feasibility:false,funding:false,license:false,launch:false},
  feasibilityTypes:[],
};
const FEASIBILITY_TYPES = [
  { id: 'economic', icon: '💰', color: '#D8AE63', title: 'الجدوى الاقتصادية', desc: 'دراسة الربحية المتوقعة وقياس العوائد مقابل التكاليف.' },
  { id: 'market', icon: '📈', color: '#22C55E', title: 'الجدوى السوقية', desc: 'تحليل السوق المستهدف وحجم الطلب والمنافسة.' },
  { id: 'technical', icon: '⚙️', color: '#3B82F6', title: 'الجدوى الفنية / التشغيلية', desc: 'قياس إمكانية تنفيذ المشروع فنياً ولوجستياً.' },
  { id: 'legal', icon: '⚖️', color: '#8B5CF6', title: 'الجدوى القانونية', desc: 'التأكد من توافق المشروع مع القوانين والأنظمة.' },
  { id: 'financial', icon: '💵', color: '#F59E0B', title: 'الجدوى المالية', desc: 'تحليل مالي متعمق ومصادر التمويل.' },
  { id: 'esg', icon: '🌱', color: '#16A34A', title: 'الجدوى البيئية والاجتماعية', desc: 'تقييم الأثر البيئي والاجتماعي للمشروع.' },
  { id: 'marketing', icon: '🎯', color: '#EC4899', title: 'الجدوى التسويقية والرقمية', desc: 'استراتيجية التسويق والحضور الرقمي.' },
];

const PROJECT_TEXT = {
  ar: {
    title: '🚀 مشاريعي',
    subtitle: 'تابع مشاريعك وخططك المالية والاستثمارية',
    adCalculator: '🎯 حاسبة ميزانية حملة إعلانية',
    close: 'إغلاق',
    newProject: 'مشروع جديد',
    totalProjects: 'إجمالي المشاريع',
    activeProjects: 'المشاريع النشطة',
    totalCapital: 'إجمالي رأس المال',
    totalProfit: 'إجمالي الأرباح',
    currency: 'د.ك',
    noProjects: 'لا توجد مشاريع بعد',
    noProjectsDesc: 'أضف مشروعك الأول واحصل على تحليل AI شامل',
    addFirst: 'إضافة أول مشروع',
    advisorTitle: 'SFM Project Advisor',
    advisorSub: 'مستشار مشاريع متخصص',
    connected: 'متصل',
  },
  en: {
    title: '🚀 My Projects',
    subtitle: 'Track your projects, financial plans, and investment ideas',
    adCalculator: '🎯 Ad campaign budget calculator',
    close: 'Close',
    newProject: 'New project',
    totalProjects: 'Total projects',
    activeProjects: 'Active projects',
    totalCapital: 'Total capital',
    totalProfit: 'Total profit',
    currency: 'KWD',
    noProjects: 'No projects yet',
    noProjectsDesc: 'Add your first project and get a full AI analysis',
    addFirst: 'Add first project',
    advisorTitle: 'SFM Project Advisor',
    advisorSub: 'Specialized project advisor',
    connected: 'Connected',
  },
  fr: {
    title: '🚀 Mes projets',
    subtitle: 'Suivez vos projets, plans financiers et idées d’investissement',
    adCalculator: '🎯 Calculateur de budget publicitaire',
    close: 'Fermer',
    newProject: 'Nouveau projet',
    totalProjects: 'Total des projets',
    activeProjects: 'Projets actifs',
    totalCapital: 'Capital total',
    totalProfit: 'Bénéfice total',
    currency: 'KWD',
    noProjects: 'Aucun projet pour le moment',
    noProjectsDesc: 'Ajoutez votre premier projet et obtenez une analyse IA complète',
    addFirst: 'Ajouter le premier projet',
    advisorTitle: 'SFM Project Advisor',
    advisorSub: 'Conseiller spécialisé en projets',
    connected: 'Connecté',
  },
} as const;

/* ─── Helpers ─── */
const riskInfo = (v: number) => v < 34
  ? {label:'منخفض',  color:'#22C55E', bg:'rgba(34,197,94,.10)',  bar:'#22C55E'}
  : v < 67
  ? {label:'متوسط',  color:'#F59E0B', bg:'rgba(245,158,11,.10)', bar:'#F59E0B'}
  : {label:'عالٍ',   color:'#EF4444', bg:'rgba(239,68,68,.10)',  bar:'#EF4444'};

const scoreColor = (s: number) => s >= 70 ? '#22C55E' : s >= 50 ? '#D8AE63' : '#EF4444';
const fmt = (v: string | number) => parseFloat(String(v).replace(/[^\d.]/g, '')) || 0;

/* ─── Step Indicator ─── */
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: i < total - 1 ? 1 : 'none' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0,
            background: i < step ? '#D8AE63' : i === step ? '#111111' : 'rgba(216,174,99,.12)',
            color: i < step ? '#111111' : i === step ? '#D8AE63' : '#9A6C3C',
            border: i === step ? '2px solid #D8AE63' : '2px solid transparent',
            boxShadow: i === step ? '0 0 0 4px rgba(216,174,99,.14)' : 'none',
          }}>{i < step ? '✓' : i + 1}</div>
          {i < total - 1 && <div style={{ flex: 1, height: '2px', background: i < step ? '#D8AE63' : 'rgba(216,174,99,.15)', borderRadius: '2px', transition: 'background .3s' }} />}
        </div>
      ))}
    </div>
  );
}

/* ─── Gauge ─── */
function RiskGauge({ value }: { value: number }) {
  const ri = riskInfo(value);
  const dash = (value / 100) * 157;
  return (
    <div style={{ position: 'relative', width: '110px', height: '66px', margin: '0 auto' }}>
      <svg width="110" height="66" viewBox="0 0 110 66">
        <path d="M10 60 A45 45 0 0 1 100 60" fill="none" stroke="rgba(216,174,99,.12)" strokeWidth="9" strokeLinecap="round" />
        <path d="M10 60 A45 45 0 0 1 100 60" fill="none" stroke={ri.bar} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${dash * 0.9} 157`} style={{ transition: 'stroke-dasharray .8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: '900', color: ri.color, fontFamily: "'IBM Plex Sans Arabic',sans-serif", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '10px', fontWeight: '700', color: ri.color }}>{ri.label}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════
   MAIN PAGE
═══════════════════════════ */
export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const pt = PROJECT_TEXT[lang];
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: 'مرحباً! 👋 أنا مستشارك الذكي للمشاريع. أملأ تفاصيل مشروعك واضغط "حفظ وتحليل" للحصول على تقييم شامل، أو اسألني مباشرة! 🚀' }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);
  useEffect(() => { if (user) loadProjects(); }, [user]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadProjects = async () => {
    const { data } = await supabase.from('projects').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    if (data) setProjects(data.map((p: any) => ({
      ...emptyForm, id: p.id, name: p.name, emoji: p.emoji || '🚀',
      type: p.notes?.type || '', idea: p.notes?.idea || '',
      capital: p.notes?.capital || '', expectedProfit: p.notes?.expectedProfit || '',
      currentProfit: p.notes?.currentProfit || '', monthlyExpenses: p.notes?.monthlyExpenses || '',
      monthlyRevenue: p.notes?.monthlyRevenue || '', startDate: p.notes?.startDate || '',
      status: p.notes?.status || 'فكرة', riskLevel: p.notes?.riskLevel || 33,
      needs: p.notes?.needs || [], goal: p.notes?.goal || '',
      startTimeline: p.notes?.startTimeline || '', notes: p.notes?.notes || '',
      progress: p.notes?.progress || emptyForm.progress,
      feasibilityTypes: p.notes?.feasibility_types || p.notes?.feasibilityTypes || [],
      analysis: p.notes?.analysis, expanded: false, createdAt: p.created_at,
    })));
  };

  const analyzeProject = async (): Promise<AIAnalysis | null> => {
    if (!form.name) return null;
    setAnalyzing(true);
    try {
      const prompt = `حلل هذا المشروع:\nاسم: ${form.name}\nنوع: ${form.type}\nفكرة: ${form.idea}\nرأس المال: ${form.capital} د.ك\nالربح المتوقع: ${form.expectedProfit} د.ك\nالربح الحالي: ${form.currentProfit} د.ك\nمصروف شهري: ${form.monthlyExpenses} د.ك\nإيراد شهري: ${form.monthlyRevenue} د.ك\nالحالة: ${form.status}\nمستوى المخاطرة: ${riskInfo(form.riskLevel).label}\n\nأجب فقط بـ JSON:\n{"score":75,"successRate":"70%","strengths":["قوة 1"],"weaknesses":["ضعف 1"],"suggestions":["اقتراح 1"],"marketStatus":"وصف السوق"}`;
      const res = await fetch('/api/projects-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }) });
      const data = await res.json();
      const clean = (data.text || '').replace(/```json|```/g, '').trim();
      const s = clean.indexOf('{'); const e = clean.lastIndexOf('}');
      if (s !== -1 && e !== -1) return JSON.parse(clean.slice(s, e + 1));
    } catch {}
    setAnalyzing(false);
    return null;
  };

  const saveProject = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const analysis = await analyzeProject();
      setAnalyzing(false);
      const notes = { ...form, feasibility_types: form.feasibilityTypes, analysis };
      if (editingId && user) {
        const { data, error } = await supabase.from('projects').update({ name: form.name, emoji: form.emoji, budget: form.capital, timeline: form.startTimeline, notes }).eq('id', editingId).select().single();
        if (error) throw new Error(error.message);
        setProjects(prev => prev.map(p => p.id === editingId ? { ...form, id: data.id, analysis: analysis || p.analysis, expanded: p.expanded } : p));
        setEditingId(null);
      } else if (user) {
        const { data, error } = await supabase.from('projects').insert({ user_id: user.id, name: form.name, emoji: form.emoji, budget: form.capital, timeline: form.startTimeline, duration_unit: 'month', steps: [], notes }).select().single();
        if (error) throw new Error(error.message);
        if (data) setProjects(prev => [{ ...form, id: data.id, analysis: analysis || undefined, expanded: false }, ...prev]);
      }
      setForm(emptyForm); setShowForm(false); setFormStep(0);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'تعذر حفظ المشروع');
    } finally {
      setSaving(false);
    }
  };

  const removeProject = async (id: string) => {
    if (user) await supabase.from('projects').delete().eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const startEdit = (project: Project) => {
    setForm({ name: project.name, emoji: project.emoji, type: project.type, idea: project.idea, capital: project.capital, expectedProfit: project.expectedProfit, currentProfit: project.currentProfit, monthlyExpenses: project.monthlyExpenses, monthlyRevenue: project.monthlyRevenue, startDate: project.startDate, status: project.status, riskLevel: project.riskLevel, needs: project.needs, goal: project.goal, startTimeline: project.startTimeline, notes: project.notes, progress: project.progress, feasibilityTypes: project.feasibilityTypes || [] });
    setEditingId(project.id); setShowForm(true); setFormStep(0);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const toggleProgress = async (projectId: string, stepId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const np = { ...p.progress, [stepId]: !p.progress[stepId] };
      supabase.from('projects').update({ notes: { ...p, progress: np, analysis: p.analysis } }).eq('id', projectId);
      return { ...p, progress: np };
    }));
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const q = chatInput.trim(); setChatInput('');
    const newMsgs: Message[] = [...messages, { role: 'user', content: q }];
    setMessages(newMsgs); setChatLoading(true);
    try {
      const res = await fetch('/api/projects-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newMsgs.map(m => ({ role: m.role, content: m.content })) }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.text || 'عذراً، حدث خطأ.' }]);
    } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ.' }]); }
    setChatLoading(false);
  };

  /* Derived stats */
  const totalCapital = projects.reduce((s, p) => s + fmt(p.capital), 0);
  const totalCurrentProfit = projects.reduce((s, p) => s + fmt(p.currentProfit), 0);
  const activeProjects = projects.filter(p => p.status === 'نشط').length;
  const S = (d: number) => ({ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(18px)', transition: `opacity .5s ease ${d}ms, transform .5s ease ${d}ms` });
  const STEP_LABELS = ['الأساسيات', 'المالية', 'التفاصيل', 'التقدم', 'نوع دراسة الجدوى'];

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      .pp{font-family:'Tajawal',sans-serif;background:#F7F3EA;min-height:100vh;color:#111111}
      .pp ::-webkit-scrollbar{width:4px}.pp ::-webkit-scrollbar-thumb{background:rgba(216,174,99,.3);border-radius:10px}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      .pc{background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:22px;box-shadow:0 4px 22px rgba(90,67,51,.06);transition:all .25s cubic-bezier(.4,0,.2,1)}
      .pc:hover:not(.no-h){transform:translateY(-2px);box-shadow:0 10px 34px rgba(90,67,51,.10)}
      .pi{width:100%;background:rgba(247,243,234,.7);border:1.5px solid rgba(216,174,99,.22);border-radius:13px;padding:12px 15px;font-family:'Tajawal',sans-serif;font-size:15px;color:#111111;outline:none;transition:border-color .2s,box-shadow .2s;-webkit-appearance:none}
      .pi:focus{border-color:#D8AE63;box-shadow:0 0 0 3px rgba(216,174,99,.14)}
      .psel{background:rgba(247,243,234,.7) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23D8AE63' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat left 14px center;cursor:pointer;padding-left:36px}
      .pbtn{display:inline-flex;align-items:center;gap:8px;border:none;border-radius:14px;font-family:'Tajawal',sans-serif;font-weight:700;cursor:pointer;transition:all .2s}
      .pbtn-g{background:linear-gradient(135deg,#D8AE63,#9A6C3C);color:#111111;box-shadow:0 4px 16px rgba(216,174,99,.28)}
      .pbtn-g:hover{background:linear-gradient(135deg,#E4BC73,#A87C4C);transform:translateY(-1px);box-shadow:0 6px 20px rgba(216,174,99,.35)}
      .pbtn-d{background:#111111;color:#D8AE63}
      .pbtn-d:hover{background:#222;transform:translateY(-1px)}
      .pbtn-o{background:transparent;border:1.5px solid rgba(216,174,99,.3);color:#9A6C3C}
      .pbtn-o:hover{border-color:#D8AE63;color:#5B4332}
      .pbtn:disabled{opacity:.55;cursor:not-allowed;transform:none!important}
      .nav-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;cursor:pointer;transition:all .2s;color:rgba(255,255,255,.55);font-size:13px;font-weight:500;border:none;background:transparent;width:100%;text-align:right;direction:rtl;font-family:'Tajawal',sans-serif}
      .nav-item:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.88)}
      .nav-item.active{background:rgba(216,174,99,.18);color:#D8AE63;font-weight:700}
      .prog-bar{height:7px;background:rgba(216,174,99,.12);border-radius:10px;overflow:hidden}
      .prog-fill{height:100%;border-radius:10px;transition:width 1s cubic-bezier(.4,0,.2,1)}
      .need-chip{cursor:pointer;transition:all .15s;border:1.5px solid rgba(216,174,99,.22);border-radius:20px;padding:7px 13px;font-size:12.5px;font-weight:600;font-family:'Tajawal',sans-serif;background:transparent;color:#5B4332;display:inline-flex;align-items:center;gap:6px}
      .need-chip:hover{border-color:#D8AE63;background:rgba(216,174,99,.08)}
      .need-chip.active{background:rgba(216,174,99,.16);border-color:#D8AE63;color:#8A6D2A}
      @media(max-width:1024px){.sidebar{display:none!important}.main-ml{margin-inline-start:0!important}}
      @media(max-width:768px){.kpi-g{grid-template-columns:1fr 1fr!important}.g2{grid-template-columns:1fr!important}}
      @media(max-width:560px){.kpi-g{grid-template-columns:1fr!important}.main-ml{padding-inline:14px!important}}
    `}</style>

    <div className="pp" dir={dir}>
      <Sidebar />

      {/* ── Main ── */}
      <main className="main-ml" style={{ marginInlineStart: '230px', padding: '24px 24px 60px', maxWidth: 'none', overflowX: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: 'none', margin: 0, display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Header */}
          <div style={S(0)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: '900', color: '#111111', marginBottom: '4px' }}>{pt.title}</h1>
                <p style={{ fontSize: '13px', color: '#9A6C3C' }}>{pt.subtitle}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <LanguageSwitcher variant="gold" compact />
                <button className="pbtn pbtn-o" style={{ padding: '11px 18px', fontSize: '14px' }} onClick={() => router.push('/projects/ad-calculator')}>
                  {pt.adCalculator}
                </button>
                <button className="pbtn pbtn-g" style={{ padding: '11px 22px', fontSize: '14px' }}
                  onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); setFormStep(0); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }}>
                  {showForm ? <><X className="w-4 h-4" /> {pt.close}</> : <><Plus className="w-4 h-4" /> {pt.newProject}</>}
                </button>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="kpi-g" style={{ ...S(40), display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
            {[
              { icon: '🚀', label: pt.totalProjects, val: projects.length, color: '#D8AE63', isN: true },
              { icon: '✅', label: pt.activeProjects, val: activeProjects, color: '#22C55E', isN: true },
              { icon: '💰', label: pt.totalCapital, val: totalCapital, color: '#3B82F6', unit: pt.currency },
              { icon: '📈', label: pt.totalProfit, val: totalCurrentProfit, color: totalCurrentProfit >= 0 ? '#22C55E' : '#EF4444', unit: pt.currency },
            ].map((k, i) => (
              <div key={i} className="pc no-h" style={{ padding: '18px 20px' }}>
                <div style={{ width: '40px', height: '40px', background: `${k.color}14`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '12px' }}>{k.icon}</div>
                <div style={{ fontSize: '11px', color: '#9A6C3C', marginBottom: '4px', fontWeight: '600' }}>{k.label}</div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: k.color, fontFamily: "'IBM Plex Sans Arabic',sans-serif", lineHeight: 1 }}>
                  {k.isN ? k.val : k.val.toFixed(3)}
                  {k.unit && <span style={{ fontSize: '12px', color: '#9A6C3C', marginRight: '4px' }}> {k.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Multi-step form */}
          {showForm && (
            <div ref={formRef} className="pc" style={{ ...S(60), padding: '30px 34px' }}>
              <div style={{ marginBottom: '4px', fontSize: '16px', fontWeight: '800', color: '#111111' }}>
                {editingId ? '✏️ تعديل المشروع' : '➕ مشروع جديد'} — {STEP_LABELS[formStep]}
              </div>
              <div style={{ fontSize: '12px', color: '#9A6C3C', marginBottom: '20px' }}>الخطوة {formStep + 1} من {STEP_LABELS.length}</div>
              <StepDots step={formStep} total={STEP_LABELS.length} />

              {/* Step 0: Basics */}
              {formStep === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ position: 'relative' }}>
                      <button style={{ width: '52px', height: '52px', background: '#FAF8F2', border: '1.5px solid rgba(216,174,99,.22)', borderRadius: '14px', fontSize: '24px', cursor: 'pointer' }}
                        onClick={() => { const el = document.getElementById('ep'); if (el) el.style.display = el.style.display === 'grid' ? 'none' : 'grid'; }}>
                        {form.emoji}
                      </button>
                      <div id="ep" style={{ display: 'none', position: 'absolute', top: '56px', right: 0, zIndex: 100, background: '#fff', border: '1px solid rgba(216,174,99,.2)', borderRadius: '16px', padding: '10px', boxShadow: '0 16px 40px rgba(27,36,48,.10)', gridTemplateColumns: 'repeat(5,1fr)', gap: '5px', width: '180px' }}>
                        {EMOJIS.map(e => <button key={e} onClick={() => { setForm(f => ({ ...f, emoji: e })); const el = document.getElementById('ep'); if (el) el.style.display = 'none'; }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}>{e}</button>)}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: '#5B4332', display: 'block', marginBottom: '7px' }}>اسم المشروع *</label>
                      <input className="pi" placeholder="مثال: كافيه الرياض" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ height: '48px' }} />
                    </div>
                  </div>
                  <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {[
                      { key: 'type', label: 'نوع المشروع', opts: PROJECT_TYPES },
                      { key: 'goal', label: 'الهدف من المشروع', opts: PROJECT_GOALS },
                      { key: 'startTimeline', label: 'وقت البدء المتوقع', opts: START_TIMELINES },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: '13px', fontWeight: '700', color: '#5B4332', display: 'block', marginBottom: '7px' }}>{f.label}</label>
                        <select className="pi psel" style={{ height: '48px' }} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}>
                          <option value="">اختر...</option>
                          {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: '#5B4332', display: 'block', marginBottom: '7px' }}>حالة المشروع</label>
                      <select className="pi psel" style={{ height: '48px' }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}>
                        {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].icon} {s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: '#5B4332', display: 'block', marginBottom: '7px' }}>تاريخ البداية</label>
                      <input className="pi" type="date" style={{ height: '48px' }} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: '#5B4332', display: 'block', marginBottom: '7px' }}>فكرة المشروع</label>
                      <input className="pi" placeholder="وصف مختصر..." value={form.idea} onChange={e => setForm(f => ({ ...f, idea: e.target.value }))} style={{ height: '48px' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Financials */}
              {formStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {[
                      { key: 'capital', label: 'رأس المال المطلوب', icon: '💰', color: '#D8AE63' },
                      { key: 'expectedProfit', label: 'الربح المتوقع الشهري', icon: '📈', color: '#22C55E' },
                      { key: 'currentProfit', label: 'الربح الحالي الفعلي', icon: '💵', color: '#3B82F6' },
                      { key: 'monthlyExpenses', label: 'المصروفات الشهرية', icon: '🔥', color: '#EF4444' },
                      { key: 'monthlyRevenue', label: 'الإيراد الشهري المتوقع', icon: '📊', color: '#22C55E' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: '13px', fontWeight: '700', color: '#5B4332', display: 'block', marginBottom: '7px' }}>{f.icon} {f.label}</label>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid rgba(216,174,99,.22)', borderRadius: '13px', overflow: 'hidden', background: 'rgba(247,243,234,.7)' }}>
                          <span style={{ padding: '0 10px', fontSize: '12px', fontWeight: '700', color: f.color, borderLeft: '1px solid rgba(216,174,99,.15)', height: '48px', display: 'flex', alignItems: 'center', flexShrink: 0, fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>د.ك</span>
                          <input type="text" placeholder="0.000" dir="ltr" value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                            style={{ flex: 1, height: '48px', padding: '0 12px', background: 'transparent', border: 'none', outline: 'none', fontSize: '16px', fontWeight: '700', color: '#111111', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }} />
                        </div>
                      </div>
                    ))}
                    {/* ROI preview */}
                    {form.capital && form.monthlyRevenue && (() => {
                      const cap = fmt(form.capital), rev = fmt(form.monthlyRevenue), exp = fmt(form.monthlyExpenses);
                      const profit = rev - exp;
                      if (cap > 0 && profit > 0) {
                        return (
                          <div style={{ background: 'rgba(34,197,94,.06)', border: '1.5px solid rgba(34,197,94,.2)', borderRadius: '14px', padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', textAlign: 'center' }}>
                            {[{ label: 'الربح الشهري', val: `${profit.toFixed(3)} د.ك`, color: '#22C55E' }, { label: 'استرجاع رأس المال', val: `${Math.ceil(cap / profit)} شهر`, color: '#D8AE63' }, { label: 'العائد السنوي', val: `${((profit * 12 / cap) * 100).toFixed(1)}%`, color: '#3B82F6' }].map((r, i) => (
                              <div key={i}><div style={{ fontSize: '10px', color: '#9A6C3C', marginBottom: '4px' }}>{r.label}</div><div style={{ fontSize: '15px', fontWeight: '800', color: r.color, fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{r.val}</div></div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  {/* Risk slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: '#5B4332' }}>⚖️ مستوى المخاطرة</label>
                      <span style={{ fontSize: '12.5px', fontWeight: '700', padding: '3px 12px', borderRadius: '20px', background: riskInfo(form.riskLevel).bg, color: riskInfo(form.riskLevel).color }}>{riskInfo(form.riskLevel).label} ({form.riskLevel})</span>
                    </div>
                    <input type="range" min={0} max={100} value={form.riskLevel} onChange={e => setForm(f => ({ ...f, riskLevel: +e.target.value }))} style={{ width: '100%', height: '6px', borderRadius: '10px', accentColor: riskInfo(form.riskLevel).color, cursor: 'pointer' }} />
                  </div>
                </div>
              )}

              {/* Step 2: Notes + Needs */}
              {formStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#5B4332', display: 'block', marginBottom: '8px' }}>📝 ملاحظات</label>
                    <textarea className="pi" rows={4} placeholder="أضف أي ملاحظات أو تفاصيل إضافية عن المشروع..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical', minHeight: '100px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#5B4332', display: 'block', marginBottom: '10px' }}>⚡ ما يحتاجه المشروع</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {['تمويل 💰', 'شريك 🤝', 'موظفين 👥', 'متجر إلكتروني 🛒', 'تطبيق 📱', 'تسويق 📣', 'موردين 🏭', 'موقع 🌐', 'معدات ⚙️', 'محل 🏪', 'رخصة 📋', 'خطة عمل 📊', 'دراسة جدوى 🔍', 'مستشار قانوني ⚖️'].map(n => {
                        const active = form.needs.includes(n);
                        return <button key={n} className={'need-chip' + (active ? ' active' : '')} onClick={() => setForm(f => ({ ...f, needs: active ? f.needs.filter(x => x !== n) : [...f.needs, n] }))}>{n}{active && ' ✓'}</button>;
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Progress */}
              {formStep === 3 && (
                <div>
                  <div style={{ fontSize: '13px', color: '#9A6C3C', marginBottom: '14px' }}>حدّد المراحل التي أتممتها</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {PROGRESS_STEPS.map((s, i) => {
                      const done = form.progress[s.id];
                      return (
                        <div key={s.id} onClick={() => setForm(f => ({ ...f, progress: { ...f.progress, [s.id]: !f.progress[s.id] } }))}
                          style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderRadius: '16px', border: `1.5px solid ${done ? 'rgba(34,197,94,.3)' : 'rgba(216,174,99,.18)'}`, background: done ? 'rgba(34,197,94,.05)' : '#FAFAF7', cursor: 'pointer', transition: 'all .2s' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', background: done ? 'rgba(34,197,94,.12)' : 'rgba(216,174,99,.10)', border: `2px solid ${done ? '#22C55E' : 'rgba(216,174,99,.3)'}`, flexShrink: 0 }}>{done ? '✅' : s.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: done ? '#22C55E' : '#111111' }}>{s.label}</div>
                            <div style={{ fontSize: '11px', color: '#9A6C3C' }}>المرحلة {i + 1} من 5</div>
                          </div>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${done ? '#22C55E' : 'rgba(216,174,99,.3)'}`, background: done ? '#22C55E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', flexShrink: 0 }}>{done && '✓'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {formStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#9A6C3C' }}>اختر نوع دراسة الجدوى المطلوبة. يمكن اختيار أكثر من نوع.</div>
                  <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '12px' }}>
                    {FEASIBILITY_TYPES.map(type => {
                      const active = form.feasibilityTypes.includes(type.id);
                      return (
                        <button key={type.id} onClick={() => setForm(f => ({ ...f, feasibilityTypes: active ? f.feasibilityTypes.filter(x => x !== type.id) : [...f.feasibilityTypes, type.id] }))} style={{ textAlign: 'right', border: `1.8px solid ${active ? '#D8AE63' : 'rgba(216,174,99,.18)'}`, background: active ? 'rgba(216,174,99,.10)' : '#FAF8F2', borderRadius: '16px', padding: '14px', cursor: 'pointer', fontFamily: 'Tajawal,sans-serif' }}>
                          <div style={{ fontSize: '26px', color: type.color }}>{type.icon}</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#111', marginTop: '8px' }}>{type.title}</div>
                          <div style={{ fontSize: '11px', color: '#9A6C3C', lineHeight: 1.6, marginTop: '5px' }}>{type.desc}</div>
                          <div style={{ marginTop: '9px', fontSize: '11px', color: type.color, fontWeight: 800 }}>{active ? 'تم الاختيار' : 'اختر'}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nav buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '26px', paddingTop: '18px', borderTop: '1px solid rgba(216,174,99,.10)' }}>
                <button className="pbtn pbtn-o" style={{ padding: '10px 20px', fontSize: '14px' }} onClick={() => formStep > 0 ? setFormStep(s => s - 1) : (setShowForm(false), setEditingId(null))}>
                  {formStep > 0 ? '← السابق' : 'إلغاء'}
                </button>
                {formStep < STEP_LABELS.length - 1 ? (
                  <button className="pbtn pbtn-d" style={{ padding: '10px 22px', fontSize: '14px' }} disabled={formStep === 0 && !form.name.trim()} onClick={() => setFormStep(s => s + 1)}>
                    التالي →
                  </button>
                ) : (
                  <button className="pbtn pbtn-g" style={{ padding: '10px 22px', fontSize: '14px' }} onClick={saveProject} disabled={saving || analyzing}>
                    {saving || analyzing ? <><span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(0,0,0,.2)', borderTopColor: '#111', animation: 'spin 1s linear infinite', display: 'inline-block' }} /> {analyzing ? 'تحليل AI...' : 'حفظ...'}</> : '💾 حفظ وتحليل'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {projects.length === 0 && !showForm && (
            <div className="pc" style={{ ...S(80), padding: '60px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: '56px', marginBottom: '18px' }}>🚀</div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#111111', marginBottom: '10px' }}>{pt.noProjects}</h3>
              <p style={{ fontSize: '14px', color: '#9A6C3C', marginBottom: '22px', lineHeight: 1.7 }}>{pt.noProjectsDesc}</p>
              <button className="pbtn pbtn-g" style={{ padding: '12px 26px', fontSize: '15px', margin: '0 auto' }} onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4" /> {pt.addFirst}
              </button>
            </div>
          )}

          {/* Project cards */}
          {projects.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', ...S(100) }}>
              {projects.map(project => {
                const sc = STATUS_CONFIG[project.status];
                const cap = fmt(project.capital), curP = fmt(project.currentProfit), expP = fmt(project.expectedProfit);
                const roi = (() => { const rev = fmt(project.monthlyRevenue), exp = fmt(project.monthlyExpenses); const p = rev - exp; return cap > 0 && p > 0 ? { months: Math.ceil(cap / p), yearly: ((p * 12 / cap) * 100).toFixed(1) } : null; })();
                const progressDone = Object.values(project.progress || {}).filter(Boolean).length;
                const progressPct = Math.round((progressDone / 5) * 100);
                return (
                  <div key={project.id} className="pc" style={{ overflow: 'hidden' }}>
                    {/* Card header */}
                    <div style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '14px' }}
                      onClick={() => setProjects(prev => prev.map(p => p.id === project.id ? { ...p, expanded: !p.expanded } : p))}>
                      <div style={{ width: '50px', height: '50px', background: sc.bg, borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, border: `1px solid ${sc.color}22` }}>{project.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#111111' }}>{project.name}</h3>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: sc.bg, color: sc.color, flexShrink: 0 }}>{sc.icon} {project.status}</span>
                          {project.type && <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(216,174,99,.10)', color: '#9A6C3C' }}>{project.type}</span>}
                        </div>
                        <div className="prog-bar" style={{ marginBottom: '6px' }}>
                          <div className="prog-fill" style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#22C55E' : 'linear-gradient(90deg,#D8AE63,#9A6C3C)' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          {cap > 0 && <span style={{ fontSize: '12px', color: '#9A6C3C' }}>رأس المال: <b style={{ color: '#D8AE63', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{cap.toFixed(3)} د.ك</b></span>}
                          {curP !== 0 && <span style={{ fontSize: '12px', color: '#9A6C3C' }}>الربح الحالي: <b style={{ color: curP >= 0 ? '#22C55E' : '#EF4444', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{curP >= 0 ? '+' : ''}{curP.toFixed(3)} د.ك</b></span>}
                          {roi && <span style={{ fontSize: '12px', color: '#9A6C3C' }}>استرجاع: <b style={{ color: '#3B82F6' }}>{roi.months} شهر</b></span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                        {project.analysis && (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `2.5px solid ${scoreColor(project.analysis.score)}`, background: `${scoreColor(project.analysis.score)}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: '900', color: scoreColor(project.analysis.score) }}>{project.analysis.score}</span>
                          </div>
                        )}
                        <button onClick={e => { e.stopPropagation(); startEdit(project); }} style={{ width: '34px', height: '34px', background: 'rgba(216,174,99,.10)', border: '1px solid rgba(216,174,99,.22)', borderRadius: '10px', cursor: 'pointer', color: '#D8AE63', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={e => { e.stopPropagation(); removeProject(project.id); }} style={{ width: '34px', height: '34px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '10px', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 className="w-3.5 h-3.5" /></button>
                        {project.expanded ? <ChevronUp className="w-5 h-5" style={{ color: '#9A6C3C' }} /> : <ChevronDown className="w-5 h-5" style={{ color: '#9A6C3C' }} />}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {project.expanded && (
                      <div style={{ padding: '0 24px 22px', borderTop: '1px solid rgba(216,174,99,.10)' }}>
                        <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', paddingTop: '18px' }}>
                          {/* Financials */}
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#5B4332', marginBottom: '12px' }}>💰 البيانات المالية</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              {[
                                { label: 'رأس المال', val: project.capital, icon: '💰', color: '#D8AE63' },
                                { label: 'الربح المتوقع', val: project.expectedProfit, icon: '📈', color: '#22C55E' },
                                { label: 'الربح الحالي', val: project.currentProfit, icon: '💵', color: curP >= 0 ? '#22C55E' : '#EF4444' },
                                { label: 'مصروف/شهر', val: project.monthlyExpenses, icon: '🔥', color: '#EF4444' },
                              ].map((f, i) => f.val ? (
                                <div key={i} style={{ background: '#FAF8F2', borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1px solid rgba(216,174,99,.10)' }}>
                                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{f.icon}</div>
                                  <div style={{ fontSize: '10px', color: '#9A6C3C', marginBottom: '4px' }}>{f.label}</div>
                                  <div style={{ fontSize: '14px', fontWeight: '800', color: f.color, fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{fmt(f.val).toFixed(3)}<span style={{ fontSize: '10px', color: '#9A6C3C', marginRight: '3px' }}> د.ك</span></div>
                                </div>
                              ) : null)}
                            </div>
                            <div style={{ marginTop: '12px', background: '#FAF8F2', borderRadius: '12px', padding: '14px', textAlign: 'center', border: '1px solid rgba(216,174,99,.10)' }}>
                              <div style={{ fontSize: '12px', color: '#9A6C3C', marginBottom: '10px' }}>مستوى المخاطرة</div>
                              <RiskGauge value={project.riskLevel} />
                            </div>
                          </div>

                          {/* AI Analysis */}
                          {project.analysis && (
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#5B4332', marginBottom: '12px' }}>🤖 تحليل الذكاء الاصطناعي</div>
                              <div style={{ background: 'linear-gradient(135deg,#1A0F05,#2B1A0D)', borderRadius: '16px', padding: '16px', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.6)' }}>نسبة النجاح المتوقعة</span>
                                  <span style={{ fontSize: '18px', fontWeight: '900', color: scoreColor(project.analysis.score) }}>{project.analysis.successRate}</span>
                                </div>
                                {[
                                  { label: 'نقاط القوة', items: project.analysis.strengths, color: '#22C55E', icon: '✅' },
                                  { label: 'نقاط الضعف', items: project.analysis.weaknesses, color: '#EF4444', icon: '⚠️' },
                                  { label: 'التوصيات', items: project.analysis.suggestions, color: '#D8AE63', icon: '💡' },
                                ].map((sec, i) => (
                                  <div key={i} style={{ marginBottom: '8px' }}>
                                    <div style={{ fontSize: '10.5px', fontWeight: '700', color: 'rgba(255,255,255,.45)', marginBottom: '4px' }}>{sec.icon} {sec.label}</div>
                                    {sec.items?.map((item, j) => <div key={j} style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.72)', padding: '2px 0', lineHeight: 1.5 }}>• {item}</div>)}
                                  </div>
                                ))}
                              </div>
                              {project.analysis.marketStatus && (
                                <div style={{ background: 'rgba(216,174,99,.07)', border: '1px solid rgba(216,174,99,.18)', borderRadius: '12px', padding: '11px 14px' }}>
                                  <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#9A6C3C', marginBottom: '4px' }}>📊 حالة السوق</div>
                                  <div style={{ fontSize: '12px', color: '#5B4332', lineHeight: 1.6 }}>{project.analysis.marketStatus}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Progress steps */}
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(216,174,99,.08)' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#5B4332', marginBottom: '10px' }}>📋 مراحل المشروع</div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {PROGRESS_STEPS.map(s => {
                              const done = project.progress?.[s.id];
                              return <button key={s.id} onClick={() => toggleProgress(project.id, s.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '20px', border: `1.5px solid ${done ? '#22C55E' : 'rgba(216,174,99,.22)'}`, background: done ? 'rgba(34,197,94,.08)' : '#FAF8F2', cursor: 'pointer', fontSize: '12.5px', fontWeight: '600', color: done ? '#22C55E' : '#5B4332', fontFamily: 'Tajawal,sans-serif', transition: 'all .2s' }}><span>{done ? '✅' : s.icon}</span>{s.label}</button>;
                            })}
                          </div>
                        </div>

                        {/* Notes */}
                        {project.notes && (
                          <div style={{ marginTop: '14px', background: 'rgba(216,174,99,.06)', border: '1px solid rgba(216,174,99,.15)', borderRadius: '12px', padding: '12px 14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#9A6C3C', marginBottom: '4px' }}>📝 ملاحظات</div>
                            <div style={{ fontSize: '13px', color: '#5B4332', lineHeight: 1.6 }}>{project.notes}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* AI Chat */}
          <div id="ai-chat" className="pc" style={{ ...S(200), padding: 0, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#1A0F05,#2B1A0D)', padding: '16px 22px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', background: 'rgba(216,174,99,.18)', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid rgba(216,174,99,.28)', flexShrink: 0 }}>🤖</div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#fff' }}>{pt.advisorTitle}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)' }}>{pt.advisorSub}</div>
              </div>
              <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: '11px', color: '#22C55E', fontWeight: '600' }}>{pt.connected}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', padding: '12px 22px 0', flexWrap: 'wrap', borderBottom: '1px solid rgba(216,174,99,.08)', paddingBottom: '12px' }}>
              {['كيف أبدأ مشروعي؟', 'أفضل مشروع بـ 5000 د.ك؟', 'كيف أحسب الجدوى؟'].map((q, i) => (
                <button key={i} onClick={() => setChatInput(q)} style={{ background: '#FAF8F2', border: '1px solid rgba(216,174,99,.2)', borderRadius: '20px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', color: '#5B4332', cursor: 'pointer', fontFamily: 'Tajawal,sans-serif' }}>{q}</button>
              ))}
            </div>
            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 22px' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end', gap: '8px', alignItems: 'flex-end' }}>
                  {msg.role === 'assistant' && <div style={{ width: '28px', height: '28px', background: 'rgba(216,174,99,.14)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>🤖</div>}
                  <div style={{ maxWidth: '80%', padding: '11px 15px', borderRadius: msg.role === 'assistant' ? '18px 18px 18px 4px' : '18px 18px 4px 18px', background: msg.role === 'assistant' ? '#FFFDFC' : 'linear-gradient(135deg,#D8AE63,#9A6C3C)', border: msg.role === 'assistant' ? '1px solid rgba(216,174,99,.16)' : 'none', color: msg.role === 'assistant' ? '#111111' : '#1a0f00', fontSize: '13.5px', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                </div>
              ))}
              {chatLoading && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}><div style={{ width: '28px', height: '28px', background: 'rgba(216,174,99,.14)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div><div style={{ padding: '12px 16px', background: '#FFFDFC', border: '1px solid rgba(216,174,99,.16)', borderRadius: '18px 18px 18px 4px' }}><Loader2 className="w-4 h-4" style={{ animation: 'spin 1s linear infinite', color: '#D8AE63' }} /></div></div>}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: '12px 22px 20px', borderTop: '1px solid rgba(216,174,99,.08)', display: 'flex', gap: '10px' }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="اسألني عن مشروعك..."
                style={{ flex: 1, background: '#FAF8F2', border: '1.5px solid rgba(216,174,99,.2)', borderRadius: '14px', padding: '11px 16px', fontFamily: 'Tajawal,sans-serif', fontSize: '14px', color: '#111111', outline: 'none', transition: 'border-color .2s' }}
                onFocus={e => e.currentTarget.style.borderColor = '#D8AE63'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(216,174,99,.2)'} />
              <button className="pbtn pbtn-g" style={{ padding: '11px 18px', flexShrink: 0 }} onClick={sendMessage} disabled={chatLoading || !chatInput.trim()}><Send className="w-4 h-4" /></button>
            </div>
          </div>

        </div>
      </main>
    </div>
  </>);
}


