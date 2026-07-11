'use client';
import { useCallback, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';
import { PageTabs } from '@/components/layout/PageTabs';
import { AppModal } from '@/components/ui/AppModal';
import { Loader2, Pencil, Trash2, Send, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { normalizeDigits } from '@/lib/locale';

/* ─── Types ─── */
type ProjectStatus = 'فكرة' | 'قيد التنفيذ' | 'نشط' | 'متوقف' | 'مكتمل';
type ProjectsTab = 'all' | 'active' | 'late' | 'completed' | 'templates';
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
const PROJECT_TYPES = [
  ['مطعم / كافيه', 'projects_type_restaurant'], ['متجر إلكتروني', 'projects_type_ecommerce'], ['عقار واستثمار', 'projects_type_real_estate'],
  ['تقنية وبرمجة', 'projects_type_technology'], ['تعليم وتدريب', 'projects_type_education'], ['خدمات منزلية', 'projects_type_home_services'],
  ['صحة وجمال', 'projects_type_health'], ['تجارة وتوزيع', 'projects_type_trade'], ['إعلام وتسويق', 'projects_type_media'],
  ['مشروع زراعي', 'projects_type_agriculture'], ['صناعة وتصنيع', 'projects_type_manufacturing'], ['أخرى', 'projects_type_other'],
] as const;
const PROJECT_GOALS = [
  ['دخل إضافي', 'projects_goal_additional_income'], ['تفرغ كامل', 'projects_goal_full_time'], ['استثمار طويل الأمد', 'projects_goal_long_term'],
  ['نمو سريع', 'projects_goal_fast_growth'], ['بناء علامة تجارية', 'projects_goal_brand'], ['استقلالية مالية', 'projects_goal_independence'],
] as const;
const START_TIMELINES = [
  ['خلال شهر', 'projects_timeline_month'], ['خلال 3 أشهر', 'projects_timeline_three_months'], ['خلال 6 أشهر', 'projects_timeline_six_months'],
  ['خلال سنة', 'projects_timeline_year'], ['أكثر من سنة', 'projects_timeline_over_year'],
] as const;
const PROGRESS_STEPS = [{id:'idea',labelKey:'projects_progress_idea',icon:'💡'},{id:'feasibility',labelKey:'projects_progress_feasibility',icon:'📊'},{id:'funding',labelKey:'projects_progress_funding',icon:'💰'},{id:'license',labelKey:'projects_progress_license',icon:'📋'},{id:'launch',labelKey:'projects_progress_launch',icon:'🚀'}];
const EMOJIS = ['🚀','💡','🏪','🛒','🏠','📱','🎓','💼','🍽','📈','🎨','🏭','🌐','⚙️','💎','🏗','🚗','✈️','🎯','💊'];
const STATUS_CONFIG: Record<ProjectStatus, { color: string; bg: string; icon: string }> = {
  'فكرة':        { color: '#3B82F6', bg: 'rgba(59,130,246,.10)',  icon: '💡' },
  'قيد التنفيذ': { color: '#F59E0B', bg: 'rgba(245,158,11,.10)',  icon: '⚙️' },
  'نشط':         { color: '#22C55E', bg: 'rgba(34,197,94,.10)',   icon: '✅' },
  'متوقف':       { color: '#EF4444', bg: 'rgba(239,68,68,.10)',   icon: '⏸' },
  'مكتمل':       { color: 'var(--sfm-soft-cyan)', bg: 'rgba(167,243,240,.12)',  icon: '🏆' },
};
const emptyForm: ProjectForm = {
  name:'',emoji:'🚀',type:'',idea:'',capital:'',expectedProfit:'',currentProfit:'',
  monthlyExpenses:'',monthlyRevenue:'',startDate:'',status:'فكرة',
  riskLevel:33,needs:[],goal:'',startTimeline:'',notes:'',
  progress:{idea:true,feasibility:false,funding:false,license:false,launch:false},
  feasibilityTypes:[],
};
const FEASIBILITY_TYPES = [
  { id: 'economic', icon: '💰', color: 'var(--sfm-soft-cyan)', titleKey: 'projects_feasibility_economic', descKey: 'projects_feasibility_economic_desc' },
  { id: 'market', icon: '📈', color: '#22C55E', titleKey: 'projects_feasibility_market', descKey: 'projects_feasibility_market_desc' },
  { id: 'technical', icon: '⚙️', color: '#3B82F6', titleKey: 'projects_feasibility_technical', descKey: 'projects_feasibility_technical_desc' },
  { id: 'legal', icon: '⚖️', color: '#8B5CF6', titleKey: 'projects_feasibility_legal', descKey: 'projects_feasibility_legal_desc' },
  { id: 'financial', icon: '💵', color: '#F59E0B', titleKey: 'projects_feasibility_financial', descKey: 'projects_feasibility_financial_desc' },
  { id: 'esg', icon: '🌱', color: '#16A34A', titleKey: 'projects_feasibility_esg', descKey: 'projects_feasibility_esg_desc' },
  { id: 'marketing', icon: '🎯', color: '#EC4899', titleKey: 'projects_feasibility_marketing', descKey: 'projects_feasibility_marketing_desc' },
];

/* ─── Helpers ─── */
const riskInfo = (v: number, labels: { low: string; medium: string; high: string }) => v < 34
  ? {label:labels.low,  color:'#22C55E', bg:'rgba(34,197,94,.10)',  bar:'#22C55E'}
  : v < 67
  ? {label:labels.medium,  color:'#F59E0B', bg:'rgba(245,158,11,.10)', bar:'#F59E0B'}
  : {label:labels.high,   color:'#EF4444', bg:'rgba(239,68,68,.10)',  bar:'#EF4444'};

const scoreColor = (s: number) => s >= 70 ? '#22C55E' : s >= 50 ? 'var(--sfm-soft-cyan)' : '#EF4444';
const fmt = (v: string | number) => parseFloat(normalizeDigits(v).replace(/[^\d.]/g, '')) || 0;

/* ─── Step Indicator ─── */
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: i < total - 1 ? 1 : 'none' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0,
            background: i < step ? 'var(--sfm-soft-cyan)' : i === step ? 'var(--sfm-foreground)' : 'rgba(167,243,240,.12)',
            color: i < step ? 'var(--sfm-foreground)' : i === step ? 'var(--sfm-soft-cyan)' : 'var(--sfm-muted)',
            border: i === step ? '2px solid var(--sfm-soft-cyan)' : '2px solid transparent',
            boxShadow: i === step ? '0 0 0 4px rgba(167,243,240,.14)' : 'none',
          }}>{i < step ? '✓' : i + 1}</div>
          {i < total - 1 && <div style={{ flex: 1, height: '2px', background: i < step ? 'var(--sfm-soft-cyan)' : 'rgba(167,243,240,.15)', borderRadius: '2px', transition: 'background .3s' }} />}
        </div>
      ))}
    </div>
  );
}

/* ─── Gauge ─── */
function RiskGauge({ value }: { value: number }) {
  const { t } = useLanguage();
  const ri = riskInfo(value, { low: t('proj_risk_low'), medium: t('proj_risk_med'), high: t('proj_risk_high') });
  const dash = (value / 100) * 157;
  return (
    <div style={{ position: 'relative', width: '110px', height: '66px', margin: '0 auto' }}>
      <svg width="110" height="66" viewBox="0 0 110 66">
        <path d="M10 60 A45 45 0 0 1 100 60" fill="none" stroke="rgba(167,243,240,.12)" strokeWidth="9" strokeLinecap="round" />
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
  const { lang, dir, t } = useLanguage();
  const pt = {
    title: `🚀 ${t('proj_title')}`,
    subtitle: t('proj_subtitle'),
    adCalculator: `🎯 ${t('projects_ad_calculator')}`,
    close: t('projects_close'),
    newProject: t('proj_new').replace(/^\+\s*/, ''),
    editProject: t('projects_edit'),
    totalProjects: t('proj_total'),
    activeProjects: t('proj_active'),
    totalCapital: t('proj_capital'),
    totalProfit: t('proj_profit'),
    currency: t('projects_currency'),
    noProjects: t('projects_empty_title'),
    noProjectsDesc: t('projects_empty_description'),
    addFirst: t('projects_add_first'),
    viewDetails: t('projects_view_details'),
    expandProject: t('projects_expand'),
    collapseProject: t('projects_collapse'),
    advisorTitle: t('projects_advisor_title'),
    advisorSub: t('projects_advisor_subtitle'),
    connected: t('projects_connected'),
    send: t('projects_send'),
  };
  const statusLabels: Record<ProjectStatus, string> = {
    'فكرة': t('proj_idea'),
    'قيد التنفيذ': t('proj_inprogress'),
    'نشط': t('proj_active_s'),
    'متوقف': t('proj_paused'),
    'مكتمل': t('proj_done'),
  };
  const riskLabels = { low: t('proj_risk_low'), medium: t('proj_risk_med'), high: t('proj_risk_high') };
  const needsOptions = [
    ['تمويل 💰', 'projects_need_funding', '💰'], ['شريك 🤝', 'projects_need_partner', '🤝'], ['موظفين 👥', 'projects_need_employees', '👥'],
    ['متجر إلكتروني 🛒', 'projects_need_store', '🛒'], ['تطبيق 📱', 'projects_need_app', '📱'], ['تسويق 📣', 'projects_need_marketing', '📣'],
    ['موردين 🏭', 'projects_need_suppliers', '🏭'], ['موقع 🌐', 'projects_need_website', '🌐'], ['معدات ⚙️', 'projects_need_equipment', '⚙️'],
    ['محل 🏪', 'projects_need_premises', '🏪'], ['رخصة 📋', 'projects_need_license', '📋'], ['خطة عمل 📊', 'projects_need_plan', '📊'],
    ['دراسة جدوى 🔍', 'projects_need_feasibility', '🔍'], ['مستشار قانوني ⚖️', 'projects_need_legal', '⚖️'],
  ] as const;
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [{ role: 'assistant', content: t('projects_chat_welcome') }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ProjectsTab>('all');
  const formRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
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
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 60);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (user) void loadProjects(); }, [user, loadProjects]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    setMessages([{ role: 'assistant', content: t('projects_chat_welcome') }]);
    setChatInput('');
  }, [lang, t]);

  const analyzeProject = async (): Promise<AIAnalysis | null> => {
    if (!form.name) return null;
    setAnalyzing(true);
    try {
      const prompt = lang === 'ar'
        ? `حلل هذا المشروع باللغة العربية الفصحى:\nالاسم: ${form.name}\nالنوع: ${form.type}\nالفكرة: ${form.idea}\nرأس المال: ${form.capital} ${pt.currency}\nالربح المتوقع: ${form.expectedProfit} ${pt.currency}\nالربح الحالي: ${form.currentProfit} ${pt.currency}\nالمصروف الشهري: ${form.monthlyExpenses} ${pt.currency}\nالإيراد الشهري: ${form.monthlyRevenue} ${pt.currency}\nالحالة: ${statusLabels[form.status]}\nمستوى المخاطرة: ${riskInfo(form.riskLevel, riskLabels).label}\n\nأجب بصيغة JSON فقط مع محتوى عربي فصيح للمصفوفات والوصف:\n{"score":75,"successRate":"70%","strengths":["نقطة قوة"],"weaknesses":["نقطة ضعف"],"suggestions":["توصية"],"marketStatus":"وصف السوق"}`
        : lang === 'fr'
          ? `Analysez ce projet en français :\nNom : ${form.name}\nType : ${form.type}\nIdée : ${form.idea}\nCapital : ${form.capital} ${pt.currency}\nBénéfice attendu : ${form.expectedProfit} ${pt.currency}\nBénéfice actuel : ${form.currentProfit} ${pt.currency}\nDépenses mensuelles : ${form.monthlyExpenses} ${pt.currency}\nRevenu mensuel : ${form.monthlyRevenue} ${pt.currency}\nStatut : ${statusLabels[form.status]}\nRisque : ${riskInfo(form.riskLevel, riskLabels).label}\n\nRépondez uniquement en JSON, avec les tableaux et la description en français :\n{"score":75,"successRate":"70%","strengths":["Point fort"],"weaknesses":["Point faible"],"suggestions":["Recommandation"],"marketStatus":"Description du marché"}`
          : `Analyze this project in English:\nName: ${form.name}\nType: ${form.type}\nIdea: ${form.idea}\nCapital: ${form.capital} ${pt.currency}\nExpected profit: ${form.expectedProfit} ${pt.currency}\nCurrent profit: ${form.currentProfit} ${pt.currency}\nMonthly expenses: ${form.monthlyExpenses} ${pt.currency}\nMonthly revenue: ${form.monthlyRevenue} ${pt.currency}\nStatus: ${statusLabels[form.status]}\nRisk: ${riskInfo(form.riskLevel, riskLabels).label}\n\nReply only in JSON, with all array items and the description in English:\n{"score":75,"successRate":"70%","strengths":["Strength"],"weaknesses":["Weakness"],"suggestions":["Recommendation"],"marketStatus":"Market description"}`;
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
        void trackEvent('create_project', { module: 'projects', metadata: { has_timeline: Boolean(form.startTimeline), has_feasibility_types: form.feasibilityTypes.length > 0 } });
        if (data) setProjects(prev => [{ ...form, id: data.id, analysis: analysis || undefined, expanded: false }, ...prev]);
      }
      setForm(emptyForm); setShowForm(false); setFormStep(0);
    } catch (err) {
      alert(err instanceof Error && err.message ? t('projects_save_error') : t('projects_save_error'));
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
      setMessages(prev => [...prev, { role: 'assistant', content: data.text || t('projects_chat_error') }]);
    } catch { setMessages(prev => [...prev, { role: 'assistant', content: t('projects_chat_error') }]); }
    setChatLoading(false);
  };

  /* Derived stats */
  const statusKeys = Object.keys(STATUS_CONFIG) as ProjectStatus[];
  const inProgressStatus = statusKeys[1];
  const activeStatus = statusKeys[2];
  const stoppedStatus = statusKeys[3];
  const completedStatus = statusKeys[4];
  const filteredProjects = projects.filter(project => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return project.status === activeStatus || project.status === inProgressStatus;
    if (activeTab === 'late') return project.status === stoppedStatus;
    if (activeTab === 'completed') return project.status === completedStatus;
    return false;
  });
  const projectTabs = [
    { id: 'all', label: t('projects_tab_all'), count: projects.length },
    { id: 'active', label: t('projects_tab_active'), count: projects.filter(project => project.status === activeStatus || project.status === inProgressStatus).length },
    { id: 'late', label: t('projects_tab_late'), count: projects.filter(project => project.status === stoppedStatus).length },
    { id: 'completed', label: t('projects_tab_completed'), count: projects.filter(project => project.status === completedStatus).length },
    { id: 'templates', label: t('projects_tab_templates') },
  ];
  const totalCapital = projects.reduce((s, p) => s + fmt(p.capital), 0);
  const totalCurrentProfit = projects.reduce((s, p) => s + fmt(p.currentProfit), 0);
  const activeProjects = projects.filter(p => p.status === 'نشط').length;
  const S = (d: number) => ({ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(18px)', transition: `opacity .5s ease ${d}ms, transform .5s ease ${d}ms` });
  const STEP_LABELS = [t('projects_step_basics'), t('projects_step_financials'), t('projects_step_details'), t('projects_step_progress'), t('projects_step_feasibility')];

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      .pp{font-family:'Tajawal',sans-serif;background:var(--sfm-light-card);min-height:100vh;color:var(--sfm-foreground)}
      .pp ::-webkit-scrollbar{width:4px}.pp ::-webkit-scrollbar-thumb{background:rgba(167,243,240,.3);border-radius:var(--r-sm)}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      .pc{background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:var(--r-2xl);box-shadow:0 4px 22px rgba(3,18,37,.06);transition:all .25s cubic-bezier(.4,0,.2,1)}
      .pc:hover:not(.no-h){transform:translateY(-2px);box-shadow:0 10px 34px rgba(3,18,37,.10)}
      .pi{width:100%;background:rgba(247,243,234,.7);border:1.5px solid rgba(167,243,240,.22);border-radius:var(--r-md);padding:12px 15px;font-family:'Tajawal',sans-serif;font-size:15px;color:var(--sfm-foreground);outline:none;transition:border-color .2s,box-shadow .2s;-webkit-appearance:none}
      .pi:focus{border-color:var(--sfm-soft-cyan);box-shadow:0 0 0 3px rgba(167,243,240,.14)}
      .psel{background:rgba(247,243,234,.7) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%231D8CFF' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat left 14px center;cursor:pointer;padding-left:36px}
      .pbtn{display:inline-flex;align-items:center;gap:8px;border:none;border-radius:var(--r-md);font-family:'Tajawal',sans-serif;font-weight:700;cursor:pointer;transition:all .2s}
      .pbtn-g{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;box-shadow:0 4px 16px rgba(167,243,240,.28)}
      .pbtn-g:hover{background:linear-gradient(135deg,#E4BC73,#A87C4C);transform:translateY(-1px);box-shadow:0 6px 20px rgba(167,243,240,.35)}
      .pbtn-d{background:var(--sfm-foreground);color:var(--sfm-soft-cyan)}
      .pbtn-d:hover{background:#222;transform:translateY(-1px)}
      .pbtn-o{background:transparent;border:1.5px solid rgba(167,243,240,.3);color:var(--sfm-muted)}
      .pbtn-o:hover{border-color:var(--sfm-soft-cyan);color:var(--sfm-muted)}
      .pbtn:disabled{opacity:.55;cursor:not-allowed;transform:none!important}
      .nav-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:var(--r-md);cursor:pointer;transition:all .2s;color:rgba(255,255,255,.55);font-size:13px;font-weight:500;border:none;background:transparent;width:100%;text-align:right;direction:rtl;font-family:'Tajawal',sans-serif}
      .nav-item:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.88)}
      .nav-item.active{background:rgba(167,243,240,.18);color:var(--sfm-soft-cyan);font-weight:700}
      .prog-bar{height:7px;background:rgba(167,243,240,.12);border-radius:var(--r-sm);overflow:hidden}
      .prog-fill{height:100%;border-radius:var(--r-sm);transition:width 1s cubic-bezier(.4,0,.2,1)}
      .need-chip{cursor:pointer;transition:all .15s;border:1.5px solid rgba(167,243,240,.22);border-radius:var(--r-xl);padding:7px 13px;font-size:12.5px;font-weight:600;font-family:'Tajawal',sans-serif;background:transparent;color:var(--sfm-muted);display:inline-flex;align-items:center;gap:6px}
      .need-chip:hover{border-color:var(--sfm-soft-cyan);background:rgba(167,243,240,.08)}
      .need-chip.active{background:rgba(167,243,240,.16);border-color:var(--sfm-soft-cyan);color:#8A6D2A}
      @media(max-width:1024px){.sidebar{display:none!important}.main-ml{margin-inline-start:0!important}}
      @media(max-width:768px){.kpi-g{grid-template-columns:1fr 1fr!important}.g2{grid-template-columns:1fr!important}}
      @media(max-width:560px){.kpi-g{grid-template-columns:1fr!important}.main-ml{padding-inline:14px!important}}
    `}</style>

    <div className="pp" dir={dir}>
      <Sidebar />

      {/* ── Main ── */}
      <DashboardPageShell className="main-ml" contentStyle={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Header */}
          <div style={S(0)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: '900', color: 'var(--sfm-foreground)', marginBottom: '4px' }}>{pt.title}</h1>
                <p style={{ fontSize: '13px', color: 'var(--sfm-muted)' }}>{pt.subtitle}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <LanguageSwitcher variant="gold" compact />
                <button className="pbtn pbtn-o" style={{ padding: '11px 18px', fontSize: '14px' }} onClick={() => router.push('/projects/ad-calculator')}>
                  {pt.adCalculator}
                </button>
                <button className="pbtn pbtn-g" style={{ padding: '11px 22px', fontSize: '14px' }}
                  onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setFormStep(0); }}>
                  <Plus className="w-4 h-4" /> {pt.newProject}
                </button>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="kpi-g" style={{ ...S(40), display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
            {[
              { icon: '🚀', label: pt.totalProjects, val: projects.length, color: 'var(--sfm-soft-cyan)', isN: true },
              { icon: '✅', label: pt.activeProjects, val: activeProjects, color: '#22C55E', isN: true },
              { icon: '💰', label: pt.totalCapital, val: totalCapital, color: '#3B82F6', unit: pt.currency },
              { icon: '📈', label: pt.totalProfit, val: totalCurrentProfit, color: totalCurrentProfit >= 0 ? '#22C55E' : '#EF4444', unit: pt.currency },
            ].map((k, i) => (
              <div key={i} className="pc no-h" style={{ padding: '18px 20px' }}>
                <div style={{ width: '40px', height: '40px', background: `${k.color}14`, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '12px' }}>{k.icon}</div>
                <div style={{ fontSize: '11px', color: 'var(--sfm-muted)', marginBottom: '4px', fontWeight: '600' }}>{k.label}</div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: k.color, fontFamily: "'IBM Plex Sans Arabic',sans-serif", lineHeight: 1 }}>
                  {k.isN ? k.val : k.val.toFixed(3)}
                  {k.unit && <span style={{ fontSize: '12px', color: 'var(--sfm-muted)', marginRight: '4px' }}> {k.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          <PageTabs
            tabs={projectTabs}
            active={activeTab}
            onChange={id => setActiveTab(id as ProjectsTab)}
            ariaLabel={pt.title}
          />

          {/* Multi-step form */}
          {showForm && (
            <AppModal
              open={showForm}
              title={editingId ? pt.editProject : pt.newProject}
              subtitle={STEP_LABELS[formStep]}
              closeLabel={pt.close}
              onClose={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); setFormStep(0); }}
              size="lg"
              className="project-modal"
              bodyClassName="project-modal-body"
            >
            <div ref={formRef} className="project-form-modal-content" style={S(60)}>
              <div style={{ marginBottom: '4px', fontSize: '16px', fontWeight: '800', color: 'var(--sfm-foreground)' }}>
                {editingId ? pt.editProject : pt.newProject} — {STEP_LABELS[formStep]}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--sfm-muted)', marginBottom: '20px' }}>{t('projects_step')} {formStep + 1} {t('projects_of')} {STEP_LABELS.length}</div>
              <StepDots step={formStep} total={STEP_LABELS.length} />

              {/* Step 0: Basics */}
              {formStep === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ position: 'relative' }}>
                      <button style={{ width: '52px', height: '52px', background: 'var(--sfm-card)', border: '1.5px solid rgba(167,243,240,.22)', borderRadius: 'var(--r-md)', fontSize: '24px', cursor: 'pointer' }}
                        onClick={() => { const el = document.getElementById('ep'); if (el) el.style.display = el.style.display === 'grid' ? 'none' : 'grid'; }}>
                        {form.emoji}
                      </button>
                      <div id="ep" style={{ display: 'none', position: 'absolute', top: '56px', right: 0, zIndex: 100, background: '#fff', border: '1px solid rgba(167,243,240,.2)', borderRadius: 'var(--r-lg)', padding: '10px', boxShadow: '0 16px 40px rgba(27,36,48,.10)', gridTemplateColumns: 'repeat(5,1fr)', gap: '5px', width: '180px' }}>
                        {EMOJIS.map(e => <button key={e} onClick={() => { setForm(f => ({ ...f, emoji: e })); const el = document.getElementById('ep'); if (el) el.style.display = 'none'; }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px', borderRadius: 'var(--r-xs)' }}>{e}</button>)}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', display: 'block', marginBottom: '7px' }}>{t('projects_name')} *</label>
                      <input className="pi" placeholder={t('projects_name_placeholder')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ height: '48px' }} />
                    </div>
                  </div>
                  <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {[
                      { key: 'type', label: t('projects_type'), opts: PROJECT_TYPES },
                      { key: 'goal', label: t('projects_goal'), opts: PROJECT_GOALS },
                      { key: 'startTimeline', label: t('projects_start_timeline'), opts: START_TIMELINES },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', display: 'block', marginBottom: '7px' }}>{f.label}</label>
                        <select className="pi psel" style={{ height: '48px' }} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}>
                          <option value="">{t('projects_select')}</option>
                          {f.opts.map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}
                        </select>
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', display: 'block', marginBottom: '7px' }}>{t('projects_status')}</label>
                      <select className="pi psel" style={{ height: '48px' }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}>
                        {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].icon} {statusLabels[s]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', display: 'block', marginBottom: '7px' }}>{t('projects_start_date')}</label>
                      <input className="pi" type="date" style={{ height: '48px' }} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', display: 'block', marginBottom: '7px' }}>{t('projects_idea')}</label>
                      <input className="pi" placeholder={t('projects_idea_placeholder')} value={form.idea} onChange={e => setForm(f => ({ ...f, idea: e.target.value }))} style={{ height: '48px' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Financials */}
              {formStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {[
                      { key: 'capital', label: t('projects_required_capital'), icon: '💰', color: 'var(--sfm-soft-cyan)' },
                      { key: 'expectedProfit', label: t('projects_expected_monthly_profit'), icon: '📈', color: '#22C55E' },
                      { key: 'currentProfit', label: t('projects_actual_profit'), icon: '💵', color: '#3B82F6' },
                      { key: 'monthlyExpenses', label: t('projects_monthly_expenses'), icon: '🔥', color: '#EF4444' },
                      { key: 'monthlyRevenue', label: t('projects_expected_monthly_revenue'), icon: '📊', color: '#22C55E' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', display: 'block', marginBottom: '7px' }}>{f.icon} {f.label}</label>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid rgba(167,243,240,.22)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'rgba(247,243,234,.7)' }}>
                          <span style={{ padding: '0 10px', fontSize: '12px', fontWeight: '700', color: f.color, borderLeft: '1px solid rgba(167,243,240,.15)', height: '48px', display: 'flex', alignItems: 'center', flexShrink: 0, fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{pt.currency}</span>
                          <input type="text" placeholder="0.000" dir="ltr" value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                            style={{ flex: 1, height: '48px', padding: '0 12px', background: 'transparent', border: 'none', outline: 'none', fontSize: '16px', fontWeight: '700', color: 'var(--sfm-foreground)', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }} />
                        </div>
                      </div>
                    ))}
                    {/* ROI preview */}
                    {form.capital && form.monthlyRevenue && (() => {
                      const cap = fmt(form.capital), rev = fmt(form.monthlyRevenue), exp = fmt(form.monthlyExpenses);
                      const profit = rev - exp;
                      if (cap > 0 && profit > 0) {
                        return (
                          <div style={{ background: 'rgba(34,197,94,.06)', border: '1.5px solid rgba(34,197,94,.2)', borderRadius: 'var(--r-md)', padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', textAlign: 'center' }}>
                            {[{ label: t('projects_monthly_profit'), val: `${profit.toFixed(3)} ${pt.currency}`, color: '#22C55E' }, { label: t('projects_payback'), val: `${Math.ceil(cap / profit)} ${t('projects_month')}`, color: 'var(--sfm-soft-cyan)' }, { label: t('projects_annual_return'), val: `${((profit * 12 / cap) * 100).toFixed(1)}%`, color: '#3B82F6' }].map((r, i) => (
                              <div key={i}><div style={{ fontSize: '10px', color: 'var(--sfm-muted)', marginBottom: '4px' }}>{r.label}</div><div style={{ fontSize: '15px', fontWeight: '800', color: r.color, fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{r.val}</div></div>
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
                      <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)' }}>⚖️ {t('projects_risk_level')}</label>
                      <span style={{ fontSize: '12.5px', fontWeight: '700', padding: '3px 12px', borderRadius: 'var(--r-xl)', background: riskInfo(form.riskLevel, riskLabels).bg, color: riskInfo(form.riskLevel, riskLabels).color }}>{riskInfo(form.riskLevel, riskLabels).label} ({form.riskLevel})</span>
                    </div>
                    <input type="range" min={0} max={100} value={form.riskLevel} onChange={e => setForm(f => ({ ...f, riskLevel: +e.target.value }))} style={{ width: '100%', height: '6px', borderRadius: 'var(--r-sm)', accentColor: riskInfo(form.riskLevel, riskLabels).color, cursor: 'pointer' }} />
                  </div>
                </div>
              )}

              {/* Step 2: Notes + Needs */}
              {formStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', display: 'block', marginBottom: '8px' }}>📝 {t('projects_notes')}</label>
                    <textarea className="pi" rows={4} placeholder={t('projects_notes_placeholder')} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical', minHeight: '100px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', display: 'block', marginBottom: '10px' }}>⚡ {t('projects_needs')}</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {needsOptions.map(([value, key, icon]) => {
                        const active = form.needs.includes(value);
                        return <button key={value} className={'need-chip' + (active ? ' active' : '')} onClick={() => setForm(f => ({ ...f, needs: active ? f.needs.filter(x => x !== value) : [...f.needs, value] }))}>{t(key)} {icon}{active && ' ✓'}</button>;
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Progress */}
              {formStep === 3 && (
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--sfm-muted)', marginBottom: '14px' }}>{t('projects_progress_help')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {PROGRESS_STEPS.map((s, i) => {
                      const done = form.progress[s.id];
                      return (
                        <div key={s.id} onClick={() => setForm(f => ({ ...f, progress: { ...f.progress, [s.id]: !f.progress[s.id] } }))}
                          style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderRadius: 'var(--r-lg)', border: `1.5px solid ${done ? 'rgba(34,197,94,.3)' : 'rgba(167,243,240,.18)'}`, background: done ? 'rgba(34,197,94,.05)' : 'var(--sfm-light-card)', cursor: 'pointer', transition: 'all .2s' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', background: done ? 'rgba(34,197,94,.12)' : 'rgba(167,243,240,.10)', border: `2px solid ${done ? '#22C55E' : 'rgba(167,243,240,.3)'}`, flexShrink: 0 }}>{done ? '✅' : s.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: done ? '#22C55E' : 'var(--sfm-foreground)' }}>{t(s.labelKey)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--sfm-muted)' }}>{t('projects_stage')} {i + 1} {t('projects_of')} 5</div>
                          </div>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${done ? '#22C55E' : 'rgba(167,243,240,.3)'}`, background: done ? '#22C55E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', flexShrink: 0 }}>{done && '✓'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {formStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--sfm-muted)' }}>{t('projects_feasibility_help')}</div>
                  <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '12px' }}>
                    {FEASIBILITY_TYPES.map(type => {
                      const active = form.feasibilityTypes.includes(type.id);
                      return (
                        <button key={type.id} onClick={() => setForm(f => ({ ...f, feasibilityTypes: active ? f.feasibilityTypes.filter(x => x !== type.id) : [...f.feasibilityTypes, type.id] }))} style={{ textAlign: dir === 'rtl' ? 'right' : 'left', border: `1.8px solid ${active ? 'var(--sfm-soft-cyan)' : 'rgba(167,243,240,.18)'}`, background: active ? 'rgba(167,243,240,.10)' : 'var(--sfm-card)', borderRadius: 'var(--r-lg)', padding: '14px', cursor: 'pointer', fontFamily: 'Tajawal,sans-serif' }}>
                          <div style={{ fontSize: '26px', color: type.color }}>{type.icon}</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--sfm-foreground)', marginTop: '8px' }}>{t(type.titleKey)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--sfm-muted)', lineHeight: 1.6, marginTop: '5px' }}>{t(type.descKey)}</div>
                          <div style={{ marginTop: '9px', fontSize: '11px', color: type.color, fontWeight: 800 }}>{active ? t('projects_selected') : t('projects_choose')}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nav buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '26px', paddingTop: '18px', borderTop: '1px solid rgba(167,243,240,.10)' }}>
                <button className="pbtn pbtn-o" style={{ padding: '10px 20px', fontSize: '14px' }} onClick={() => formStep > 0 ? setFormStep(s => s - 1) : (setShowForm(false), setEditingId(null))}>
                  {formStep > 0 ? `${dir === 'rtl' ? '←' : '→'} ${t('projects_previous')}` : t('projects_cancel')}
                </button>
                {formStep < STEP_LABELS.length - 1 ? (
                  <button className="pbtn pbtn-d" style={{ padding: '10px 22px', fontSize: '14px' }} disabled={formStep === 0 && !form.name.trim()} onClick={() => setFormStep(s => s + 1)}>
                    {t('projects_next')} {dir === 'rtl' ? '→' : '←'}
                  </button>
                ) : (
                  <button className="pbtn pbtn-g" style={{ padding: '10px 22px', fontSize: '14px' }} onClick={saveProject} disabled={saving || analyzing}>
                    {saving || analyzing ? <><span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--sfm-foreground)', animation: 'spin 1s linear infinite', display: 'inline-block' }} /> {analyzing ? t('projects_analyzing') : t('projects_saving')}</> : `💾 ${t('projects_save_analyze')}`}
                  </button>
                )}
              </div>
            </div>
            </AppModal>
          )}

          {/* Empty state */}
          {projects.length === 0 && !showForm && (
            <div className="pc" style={{ ...S(80), padding: '60px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: '56px', marginBottom: '18px' }}>🚀</div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--sfm-foreground)', marginBottom: '10px' }}>{pt.noProjects}</h3>
              <p style={{ fontSize: '14px', color: 'var(--sfm-muted)', marginBottom: '22px', lineHeight: 1.7 }}>{pt.noProjectsDesc}</p>
              <button className="pbtn pbtn-g" style={{ padding: '12px 26px', fontSize: '15px', margin: '0 auto' }} onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4" /> {pt.addFirst}
              </button>
            </div>
          )}

          {projects.length > 0 && filteredProjects.length === 0 && activeTab !== 'all' && (
            <div className="pc" style={{ ...S(90), padding: '34px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--sfm-foreground)', marginBottom: '8px' }}>{t('projects_filtered_empty')}</h3>
              <p style={{ fontSize: '13px', color: 'var(--sfm-muted)', lineHeight: 1.7 }}>{t('projects_filtered_empty_body')}</p>
            </div>
          )}

          {/* Project cards */}
          {filteredProjects.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', ...S(100) }}>
              {filteredProjects.map(project => {
                const sc = STATUS_CONFIG[project.status] ?? STATUS_CONFIG['فكرة'];
                const cap = fmt(project.capital), curP = fmt(project.currentProfit), expP = fmt(project.expectedProfit);
                const roi = (() => { const rev = fmt(project.monthlyRevenue), exp = fmt(project.monthlyExpenses); const p = rev - exp; return cap > 0 && p > 0 ? { months: Math.ceil(cap / p), yearly: ((p * 12 / cap) * 100).toFixed(1) } : null; })();
                const progressDone = Object.values(project.progress || {}).filter(Boolean).length;
                const progressPct = Math.round((progressDone / 5) * 100);
                return (
                  <div key={project.id} className="pc" style={{ overflow: 'hidden' }}>
                    {/* Card header */}
                    <div style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '14px' }}
                      onClick={() => router.push(`/projects/${project.id}`)}>
                      <div style={{ width: '50px', height: '50px', background: sc.bg, borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, border: `1px solid ${sc.color}22` }}>{project.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--sfm-foreground)' }}>{project.name}</h3>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: 'var(--r-xl)', background: sc.bg, color: sc.color, flexShrink: 0 }}>{sc.icon} {statusLabels[project.status]}</span>
                          {project.type && <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: 'var(--r-xl)', background: 'rgba(167,243,240,.10)', color: 'var(--sfm-muted)' }}>{PROJECT_TYPES.find(([value]) => value === project.type)?.[1] ? t(PROJECT_TYPES.find(([value]) => value === project.type)![1]) : project.type}</span>}
                        </div>
                        <div className="prog-bar" style={{ marginBottom: '6px' }}>
                          <div className="prog-fill" style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#22C55E' : 'linear-gradient(90deg,var(--sfm-primary),var(--sfm-accent))' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          {cap > 0 && <span style={{ fontSize: '12px', color: 'var(--sfm-muted)' }}>{t('projects_capital')}: <b style={{ color: 'var(--sfm-soft-cyan)', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{cap.toFixed(3)} {pt.currency}</b></span>}
                          {curP !== 0 && <span style={{ fontSize: '12px', color: 'var(--sfm-muted)' }}>{t('projects_current_profit')}: <b style={{ color: curP >= 0 ? '#22C55E' : '#EF4444', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{curP >= 0 ? '+' : ''}{curP.toFixed(3)} {pt.currency}</b></span>}
                          {roi && <span style={{ fontSize: '12px', color: 'var(--sfm-muted)' }}>{t('projects_payback_short')}: <b style={{ color: '#3B82F6' }}>{roi.months} {t('projects_month')}</b></span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                        {project.analysis && (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `2.5px solid ${scoreColor(project.analysis.score)}`, background: `${scoreColor(project.analysis.score)}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: '900', color: scoreColor(project.analysis.score) }}>{project.analysis.score}</span>
                          </div>
                        )}
                        <button onClick={e => { e.stopPropagation(); startEdit(project); }} style={{ width: '34px', height: '34px', background: 'rgba(167,243,240,.10)', border: '1px solid rgba(167,243,240,.22)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--sfm-soft-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={e => { e.stopPropagation(); removeProject(project.id); }} style={{ width: '34px', height: '34px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 className="w-3.5 h-3.5" /></button>
                        <button onClick={e => { e.stopPropagation(); router.push(`/projects/${project.id}`); }} style={{ minHeight: '34px', minWidth: '96px', background: 'linear-gradient(135deg,#A7F3F0,#22D3EE)', border: '1px solid rgba(167,243,240,.65)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: '#061A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', fontSize: '12px', lineHeight: 1, fontWeight: 900, fontFamily: 'Tajawal,sans-serif', whiteSpace: 'nowrap', boxShadow: '0 8px 18px rgba(34,211,238,.24)', textShadow: 'none' }}>{pt.viewDetails}</button>
                        <button onClick={e => { e.stopPropagation(); setProjects(prev => prev.map(p => p.id === project.id ? { ...p, expanded: !p.expanded } : p)); }} aria-label={project.expanded ? pt.collapseProject : pt.expandProject} style={{ width: '34px', height: '34px', background: 'rgba(167,243,240,.08)', border: '1px solid rgba(167,243,240,.2)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--sfm-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {project.expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {project.expanded && (
                      <div style={{ padding: '0 24px 22px', borderTop: '1px solid rgba(167,243,240,.10)' }}>
                        <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', paddingTop: '18px' }}>
                          {/* Financials */}
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', marginBottom: '12px' }}>💰 {t('projects_financial_data')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              {[
                                { label: t('projects_capital'), val: project.capital, icon: '💰', color: 'var(--sfm-soft-cyan)' },
                                { label: t('projects_expected_profit'), val: project.expectedProfit, icon: '📈', color: '#22C55E' },
                                { label: t('projects_current_profit'), val: project.currentProfit, icon: '💵', color: curP >= 0 ? '#22C55E' : '#EF4444' },
                                { label: t('projects_expense_month'), val: project.monthlyExpenses, icon: '🔥', color: '#EF4444' },
                              ].map((f, i) => f.val ? (
                                <div key={i} style={{ background: 'var(--sfm-card)', borderRadius: 'var(--r-md)', padding: '12px', textAlign: 'center', border: '1px solid rgba(167,243,240,.10)' }}>
                                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{f.icon}</div>
                                  <div style={{ fontSize: '10px', color: 'var(--sfm-muted)', marginBottom: '4px' }}>{f.label}</div>
                                  <div style={{ fontSize: '14px', fontWeight: '800', color: f.color, fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{fmt(f.val).toFixed(3)}<span style={{ fontSize: '10px', color: 'var(--sfm-muted)', marginInlineStart: '3px' }}> {pt.currency}</span></div>
                                </div>
                              ) : null)}
                            </div>
                            <div style={{ marginTop: '12px', background: 'var(--sfm-card)', borderRadius: 'var(--r-md)', padding: '14px', textAlign: 'center', border: '1px solid rgba(167,243,240,.10)' }}>
                              <div style={{ fontSize: '12px', color: 'var(--sfm-muted)', marginBottom: '10px' }}>{t('projects_risk_level')}</div>
                              <RiskGauge value={project.riskLevel} />
                            </div>
                          </div>

                          {/* AI Analysis */}
                          {project.analysis && (
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', marginBottom: '12px' }}>🤖 {t('projects_ai_analysis')}</div>
                              <div style={{ background: 'linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark))', borderRadius: 'var(--r-lg)', padding: '16px', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.6)' }}>{t('projects_expected_success')}</span>
                                  <span style={{ fontSize: '18px', fontWeight: '900', color: scoreColor(project.analysis.score) }}>{project.analysis.successRate}</span>
                                </div>
                                {[
                                  { label: t('projects_strengths'), items: project.analysis.strengths, color: '#22C55E', icon: '✅' },
                                  { label: t('projects_weaknesses'), items: project.analysis.weaknesses, color: '#EF4444', icon: '⚠️' },
                                  { label: t('projects_recommendations'), items: project.analysis.suggestions, color: 'var(--sfm-soft-cyan)', icon: '💡' },
                                ].map((sec, i) => (
                                  <div key={i} style={{ marginBottom: '8px' }}>
                                    <div style={{ fontSize: '10.5px', fontWeight: '700', color: 'rgba(255,255,255,.45)', marginBottom: '4px' }}>{sec.icon} {sec.label}</div>
                                    {sec.items?.map((item, j) => <div key={j} style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.72)', padding: '2px 0', lineHeight: 1.5 }}>• {item}</div>)}
                                  </div>
                                ))}
                              </div>
                              {project.analysis.marketStatus && (
                                <div style={{ background: 'rgba(167,243,240,.07)', border: '1px solid rgba(167,243,240,.18)', borderRadius: 'var(--r-md)', padding: '11px 14px' }}>
                                  <div style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--sfm-muted)', marginBottom: '4px' }}>📊 {t('projects_market_status')}</div>
                                  <div style={{ fontSize: '12px', color: 'var(--sfm-muted)', lineHeight: 1.6 }}>{project.analysis.marketStatus}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Progress steps */}
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(167,243,240,.08)' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', marginBottom: '10px' }}>📋 {t('projects_stages')}</div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {PROGRESS_STEPS.map(s => {
                              const done = project.progress?.[s.id];
                              return <button key={s.id} onClick={() => toggleProgress(project.id, s.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: 'var(--r-xl)', border: `1.5px solid ${done ? '#22C55E' : 'rgba(167,243,240,.22)'}`, background: done ? 'rgba(34,197,94,.08)' : 'var(--sfm-card)', cursor: 'pointer', fontSize: '12.5px', fontWeight: '600', color: done ? '#22C55E' : 'var(--sfm-muted)', fontFamily: 'Tajawal,sans-serif', transition: 'all .2s' }}><span>{done ? '✅' : s.icon}</span>{t(s.labelKey)}</button>;
                            })}
                          </div>
                        </div>

                        {/* Notes */}
                        {project.notes && (
                          <div style={{ marginTop: '14px', background: 'rgba(167,243,240,.06)', border: '1px solid rgba(167,243,240,.15)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--sfm-muted)', marginBottom: '4px' }}>📝 {t('projects_notes')}</div>
                            <div style={{ fontSize: '13px', color: 'var(--sfm-muted)', lineHeight: 1.6 }}>{project.notes}</div>
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
          {activeTab === 'all' && (
          <div id="ai-chat" className="pc" style={{ ...S(200), padding: 0, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark))', padding: '16px 22px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', background: 'rgba(167,243,240,.18)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid rgba(167,243,240,.28)', flexShrink: 0 }}>🤖</div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#fff' }}>{pt.advisorTitle}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)' }}>{pt.advisorSub}</div>
              </div>
              <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: '11px', color: '#22C55E', fontWeight: '600' }}>{pt.connected}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', padding: '12px 22px 0', flexWrap: 'wrap', borderBottom: '1px solid rgba(167,243,240,.08)', paddingBottom: '12px' }}>
              {[t('projects_chat_question_start'), t('projects_chat_question_budget'), t('projects_chat_question_feasibility')].map((q, i) => (
                <button key={i} onClick={() => setChatInput(q)} style={{ background: 'var(--sfm-card)', border: '1px solid rgba(167,243,240,.2)', borderRadius: 'var(--r-xl)', padding: '5px 12px', fontSize: '12px', fontWeight: '600', color: 'var(--sfm-muted)', cursor: 'pointer', fontFamily: 'Tajawal,sans-serif' }}>{q}</button>
              ))}
            </div>
            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 22px' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end', gap: '8px', alignItems: 'flex-end' }}>
                  {msg.role === 'assistant' && <div style={{ width: '28px', height: '28px', background: 'rgba(167,243,240,.14)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>🤖</div>}
                  <div style={{ maxWidth: '80%', padding: '11px 15px', borderRadius: msg.role === 'assistant' ? '18px 18px 18px 4px' : '18px 18px 4px 18px', background: msg.role === 'assistant' ? 'var(--sfm-card)' : 'linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent))', border: msg.role === 'assistant' ? '1px solid rgba(167,243,240,.16)' : 'none', color: msg.role === 'assistant' ? 'var(--sfm-foreground)' : '#1a0f00', fontSize: '13.5px', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                </div>
              ))}
              {chatLoading && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}><div style={{ width: '28px', height: '28px', background: 'rgba(167,243,240,.14)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div><div style={{ padding: '12px 16px', background: 'var(--sfm-card)', border: '1px solid rgba(167,243,240,.16)', borderRadius: 'var(--r-xl) var(--r-xl) var(--r-xl) 4px' }}><Loader2 className="w-4 h-4" style={{ animation: 'spin 1s linear infinite', color: 'var(--sfm-soft-cyan)' }} /></div></div>}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: '12px 22px 20px', borderTop: '1px solid rgba(167,243,240,.08)', display: 'flex', gap: '10px' }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={t('projects_chat_placeholder')}
                style={{ flex: 1, background: 'var(--sfm-card)', border: '1.5px solid rgba(167,243,240,.2)', borderRadius: 'var(--r-md)', padding: '11px 16px', fontFamily: 'Tajawal,sans-serif', fontSize: '14px', color: 'var(--sfm-foreground)', outline: 'none', transition: 'border-color .2s' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--sfm-soft-cyan)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(167,243,240,.2)'} />
              <button
                className="pbtn pbtn-g"
                style={{ padding: '11px 18px', flexShrink: 0 }}
                onClick={sendMessage}
                disabled={chatLoading || !chatInput.trim()}
                aria-label={pt.send || 'Send message'}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          )}

      </DashboardPageShell>
    </div>
  </>);
}


