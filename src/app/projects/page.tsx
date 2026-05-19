'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  Layers3,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const PROJECT_TYPES = [
  'مطعم / كافيه',
  'متجر إلكتروني',
  'عقار واستثمار',
  'تقنية وبرمجة',
  'تعليم وتدريب',
  'خدمات منزلية',
  'صحة وجمال',
  'تجارة وتوزيع',
  'إعلام وتسويق',
  'أخرى',
];

const PROJECT_GOALS = [
  'دخل إضافي',
  'تفرغ كامل',
  'استثمار طويل الأمد',
  'نمو سريع',
  'بناء علامة تجارية',
  'استقلالية مالية',
];

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
] as const;

const PROGRESS_STEPS = [
  { id: 'idea', label: 'فكرة المشروع', icon: '💡' },
  { id: 'feasibility', label: 'دراسة الجدوى', icon: '📊' },
  { id: 'funding', label: 'التمويل', icon: '💰' },
  { id: 'license', label: 'الرخصة', icon: '📋' },
  { id: 'launch', label: 'الإطلاق', icon: '🚀' },
] as const;

const MONEY_FIELDS: Array<{ key: 'capital' | 'monthlyExpenses' | 'monthlyRevenue'; label: string }> = [
  { key: 'capital', label: 'رأس المال المتوفر' },
  { key: 'monthlyExpenses', label: 'المصروف الشهري المتوقع' },
  { key: 'monthlyRevenue', label: 'الإيراد الشهري المتوقع' },
];

type NeedStatus = 'none' | 'pending' | 'done';

interface ProjectForm {
  name: string;
  emoji: string;
  type: string;
  idea: string;
  capital: string;
  monthlyExpenses: string;
  monthlyRevenue: string;
  riskLevel: number;
  needs: Record<string, NeedStatus>;
  goal: string;
  startTimeline: string;
  progress: Record<string, boolean>;
}

interface AIAnalysis {
  score: number;
  successRate: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  marketStatus: string;
}

interface Project extends ProjectForm {
  id: string;
  analysis?: AIAnalysis;
  expanded?: boolean;
  createdAt?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const makeNeeds = () =>
  PROJECT_NEEDS.reduce<Record<string, NeedStatus>>((acc, item) => {
    acc[item.id] = 'none';
    return acc;
  }, {});

const makeProgress = () =>
  PROGRESS_STEPS.reduce<Record<string, boolean>>((acc, item, index) => {
    acc[item.id] = index === 0;
    return acc;
  }, {});

const emptyForm: ProjectForm = {
  name: '',
  emoji: '🚀',
  type: '',
  idea: '',
  capital: '',
  monthlyExpenses: '',
  monthlyRevenue: '',
  riskLevel: 33,
  needs: makeNeeds(),
  goal: '',
  startTimeline: '',
  progress: makeProgress(),
};

const toNumber = (value: string) => parseFloat(String(value || '').replace(/[^\d.]/g, '')) || 0;

const formatKwd = (amount: number) =>
  new Intl.NumberFormat('ar-KW', {
    minimumFractionDigits: amount >= 100 ? 0 : 3,
    maximumFractionDigits: amount >= 100 ? 0 : 3,
  }).format(amount);

const riskLabel = (value: number) => {
  if (value < 34) return { label: 'منخفض', color: '#2d8a4e', bg: 'rgba(45,138,78,0.10)' };
  if (value < 67) return { label: 'متوسط', color: '#c4a35a', bg: 'rgba(196,163,90,0.12)' };
  return { label: 'عالي', color: '#c0392b', bg: 'rgba(192,57,43,0.10)' };
};

const scoreColor = (score: number) => (score >= 70 ? '#2d8a4e' : score >= 50 ? '#c4a35a' : '#c0392b');

const normalizeNeeds = (needs: unknown): Record<string, NeedStatus> => {
  const next = makeNeeds();
  if (needs && typeof needs === 'object' && !Array.isArray(needs)) {
    Object.entries(needs as Record<string, unknown>).forEach(([key, value]) => {
      next[key] = value === 'done' || value === 'pending' ? value : 'none';
    });
  }
  return next;
};

const normalizeProgress = (progress: unknown): Record<string, boolean> => {
  const next = makeProgress();
  if (progress && typeof progress === 'object' && !Array.isArray(progress)) {
    Object.entries(progress as Record<string, unknown>).forEach(([key, value]) => {
      next[key] = Boolean(value);
    });
  }
  return next;
};

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'مرحباً، أنا مستشار مشاريع SFM. أضف تفاصيل مشروعك وسأساعدك في قراءة الربحية، المخاطر، الأولويات، وخطوات الإطلاق.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;
    const { data } = await supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (!data) return;

    setProjects(
      data.map((project: any) => {
        const notes = project.notes && typeof project.notes === 'object' ? project.notes : {};
        return {
          ...emptyForm,
          id: project.id,
          name: project.name,
          emoji: project.emoji || '🚀',
          type: notes.type || '',
          idea: notes.idea || '',
          capital: String(notes.capital || project.budget || ''),
          monthlyExpenses: notes.monthlyExpenses || '',
          monthlyRevenue: notes.monthlyRevenue || '',
          riskLevel: Number(notes.riskLevel || 33),
          needs: normalizeNeeds(notes.needs),
          goal: notes.goal || '',
          startTimeline: notes.startTimeline || project.timeline || '',
          progress: normalizeProgress(notes.progress),
          analysis: notes.analysis,
          expanded: false,
          createdAt: project.created_at,
        };
      }),
    );
  };

  const serializeProjectNotes = (project: ProjectForm, analysis?: AIAnalysis | null) => ({
    type: project.type,
    idea: project.idea,
    capital: project.capital,
    monthlyExpenses: project.monthlyExpenses,
    monthlyRevenue: project.monthlyRevenue,
    riskLevel: project.riskLevel,
    needs: project.needs,
    goal: project.goal,
    startTimeline: project.startTimeline,
    progress: project.progress,
    analysis,
  });

  const analyzeProject = async (): Promise<AIAnalysis | null> => {
    if (!form.name.trim()) return null;
    setAnalyzing(true);

    try {
      const selectedNeeds = Object.entries(form.needs)
        .filter(([, value]) => value !== 'none')
        .map(([key, value]) => {
          const need = PROJECT_NEEDS.find((item) => item.id === key);
          return `${need?.label || key} (${value === 'done' ? 'منجز' : 'مطلوب'})`;
        })
        .join(', ');

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
الاحتياجات: ${selectedNeeds || 'لا توجد'}

أجب فقط بـ JSON بدون أي نص:
{"score":75,"successRate":"70%","strengths":["نقطة قوة 1","نقطة قوة 2"],"weaknesses":["نقطة ضعف 1","نقطة ضعف 2"],"suggestions":["اقتراح 1","اقتراح 2","اقتراح 3"],"marketStatus":"وصف حالة السوق"}`;

      const res = await fetch('/api/projects-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await res.json();
      const clean = String(data.text || '').replace(/```json|```/g, '').trim();
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start !== -1 && end !== -1) return JSON.parse(clean.slice(start, end + 1));
    } catch {
      return null;
    } finally {
      setAnalyzing(false);
    }

    return null;
  };

  const startEdit = (project: Project) => {
    setForm({
      name: project.name,
      emoji: project.emoji,
      type: project.type,
      idea: project.idea,
      capital: project.capital,
      monthlyExpenses: project.monthlyExpenses,
      monthlyRevenue: project.monthlyRevenue,
      riskLevel: project.riskLevel,
      needs: project.needs,
      goal: project.goal,
      startTimeline: project.startTimeline,
      progress: project.progress,
    });
    setEditingId(project.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveProject = async () => {
    if (!form.name.trim() || !user) return;
    setSaving(true);
    const analysis = await analyzeProject();
    const notesData = serializeProjectNotes(form, analysis);

    if (editingId) {
      await supabase
        .from('projects')
        .update({ name: form.name, emoji: form.emoji, budget: form.capital, timeline: form.startTimeline, notes: notesData })
        .eq('id', editingId);
      setProjects((prev) =>
        prev.map((project) => (project.id === editingId ? { ...form, id: editingId, analysis: analysis || project.analysis, expanded: project.expanded } : project)),
      );
      setEditingId(null);
    } else {
      const { data } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: form.name,
          emoji: form.emoji,
          budget: form.capital,
          timeline: form.startTimeline,
          duration_unit: 'month',
          steps: [],
          notes: notesData,
        })
        .select()
        .single();
      if (data) setProjects((prev) => [{ ...form, id: data.id, analysis: analysis || undefined, expanded: false }, ...prev]);
    }

    setForm({ ...emptyForm, needs: makeNeeds(), progress: makeProgress() });
    setShowForm(false);
    setSaving(false);
  };

  const removeProject = async (id: string) => {
    if (user) await supabase.from('projects').delete().eq('id', id);
    setProjects((prev) => prev.filter((project) => project.id !== id));
  };

  const toggleProgress = async (projectId: string, stepId: string) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project;
        const newProgress = { ...project.progress, [stepId]: !project.progress[stepId] };
        const notes = serializeProjectNotes({ ...project, progress: newProgress }, project.analysis);
        supabase.from('projects').update({ notes }).eq('id', projectId);
        return { ...project, progress: newProgress };
      }),
    );
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    const nextMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/projects-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.map((message) => ({ role: message.role, content: message.content })) }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.text || 'عذراً، حدث خطأ.' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const calcROI = (project: Pick<ProjectForm, 'capital' | 'monthlyExpenses' | 'monthlyRevenue'>) => {
    const cap = toNumber(project.capital);
    const rev = toNumber(project.monthlyRevenue);
    const exp = toNumber(project.monthlyExpenses);
    const profit = rev - exp;
    if (cap > 0 && profit > 0) return { profit, months: Math.ceil(cap / profit), yearly: ((profit * 12 * 100) / cap).toFixed(1) };
    return null;
  };

  const metrics = useMemo(() => {
    const totalCapital = projects.reduce((sum, project) => sum + toNumber(project.capital), 0);
    const totalRevenue = projects.reduce((sum, project) => sum + toNumber(project.monthlyRevenue), 0);
    const totalExpenses = projects.reduce((sum, project) => sum + toNumber(project.monthlyExpenses), 0);
    const expectedProfit = totalRevenue - totalExpenses;
    const averageRisk = projects.length ? Math.round(projects.reduce((sum, project) => sum + project.riskLevel, 0) / projects.length) : form.riskLevel;
    const analyzed = projects.filter((project) => project.analysis);
    const averageScore = analyzed.length ? Math.round(analyzed.reduce((sum, project) => sum + (project.analysis?.score || 0), 0) / analyzed.length) : 0;
    const readySteps = projects.reduce((sum, project) => sum + Object.values(project.progress).filter(Boolean).length, 0);

    return { totalCapital, totalRevenue, totalExpenses, expectedProfit, averageRisk, averageScore, readySteps, analyzedCount: analyzed.length };
  }, [projects, form.riskLevel]);

  const featuredProject = projects[0];
  const featuredRoi = featuredProject ? calcROI(featuredProject) : null;
  const formRoi = calcROI(form);
  const overallRisk = riskLabel(metrics.averageRisk);
  const riskDash = Math.min(100, Math.max(0, metrics.averageRisk));

  return (
    <main dir="rtl" className="projects-shell min-h-screen">
      <style>{`
        .projects-shell{
          --cream:#fffdf5;
          --cream-2:#fef9e7;
          --cream-3:#fdf5d0;
          --gold:#c4a35a;
          --gold-2:#d4b36a;
          --brown:#7f5c48;
          --brown-2:#5c3d2a;
          --text:#2d1a0a;
          --muted:#7a5c1a;
          --border:rgba(196,163,90,.22);
          min-height:100vh;
          padding:28px 18px 34px;
          color:var(--text);
          background:
            radial-gradient(circle at 18% 8%, rgba(196,163,90,.18), transparent 30%),
            linear-gradient(160deg,#fffdf5 0%,#fef9e7 58%,#fdf5d0 100%);
          font-family:'Tajawal','IBM Plex Sans Arabic',Arial,sans-serif;
        }
        .projects-wrap{max-width:1240px;margin:0 auto;display:flex;flex-direction:column;gap:22px}
        .premium-card{
          background:rgba(255,253,245,.82);
          border:1px solid var(--border);
          border-radius:28px;
          box-shadow:0 18px 55px rgba(92,61,42,.08),0 3px 14px rgba(196,163,90,.10);
          backdrop-filter:blur(18px);
          transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease;
        }
        .premium-card:hover{transform:translateY(-2px);box-shadow:0 24px 70px rgba(92,61,42,.11),0 4px 18px rgba(196,163,90,.14);border-color:rgba(196,163,90,.36)}
        .hero-card{
          position:relative;overflow:hidden;padding:26px;
          background:linear-gradient(135deg,rgba(127,92,72,.98),rgba(92,61,42,.98));
          color:white;border-color:rgba(255,255,255,.12);
        }
        .hero-card::after{content:'';position:absolute;inset:auto -70px -90px auto;width:230px;height:230px;border-radius:50%;background:rgba(196,163,90,.16);filter:blur(4px)}
        .hero-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,.75fr);gap:24px;align-items:center;position:relative;z-index:1}
        .hero-title{font-size:34px;font-weight:900;line-height:1.15;letter-spacing:0;color:#fff}
        .hero-sub{margin-top:10px;color:rgba(255,255,255,.68);font-size:14px;max-width:680px}
        .hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
        .glass-stat{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);border-radius:20px;padding:14px}
        .glass-stat strong{display:block;font-size:24px;font-weight:900;color:#fff}
        .glass-stat span{font-size:12px;color:rgba(255,255,255,.58)}
        .kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
        .kpi-card{padding:18px;border-radius:22px}
        .kpi-icon{width:42px;height:42px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:rgba(196,163,90,.14);color:var(--brown-2);margin-bottom:14px}
        .kpi-label{font-size:12px;color:rgba(122,92,26,.62);font-weight:700}
        .kpi-value{font-family:'IBM Plex Sans Arabic','Tajawal',sans-serif;font-size:24px;font-weight:900;color:var(--text);line-height:1.2;margin-top:4px}
        .kpi-note{display:inline-flex;margin-top:10px;border-radius:999px;padding:4px 10px;background:rgba(196,163,90,.12);color:var(--muted);font-size:11px;font-weight:800}
        .section-title{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px}
        .section-title h2{font-size:19px;font-weight:900;color:var(--text);display:flex;align-items:center;gap:9px}
        .section-title p{font-size:12px;color:rgba(122,92,26,.58);margin-top:2px}
        .stepper{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:18px}
        .step-pill{border:1px solid var(--border);border-radius:18px;padding:13px;background:rgba(254,249,231,.64);display:flex;gap:10px;align-items:center}
        .step-pill b{width:30px;height:30px;border-radius:12px;background:var(--gold);display:flex;align-items:center;justify-content:center;color:var(--brown-2)}
        .form-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px}
        .field{display:flex;flex-direction:column;gap:7px}
        .field label{font-size:12px;font-weight:800;color:var(--muted)}
        .span-12{grid-column:span 12}.span-8{grid-column:span 8}.span-6{grid-column:span 6}.span-4{grid-column:span 4}
        .soft-input,.projects-shell input,.projects-shell textarea,[data-radix-select-trigger]{
          border-color:rgba(196,163,90,.32)!important;background:rgba(255,253,245,.78)!important;color:var(--text)!important;border-radius:16px!important;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.45);
        }
        .money-input{display:flex;align-items:center;gap:10px;height:44px;border:1px solid rgba(196,163,90,.32);border-radius:16px;background:rgba(255,253,245,.78);padding:0 13px}
        .money-input span{color:var(--gold);font-weight:900;font-size:12px}.money-input input{border:0!important;background:transparent!important;box-shadow:none!important;outline:0;width:100%;height:100%}
        .needs-grid{display:flex;flex-wrap:wrap;gap:8px}
        .need-chip{border:1px solid var(--border);border-radius:999px;background:rgba(255,253,245,.72);color:var(--muted);padding:8px 12px;font-size:12px;font-weight:800;transition:all .18s ease}
        .need-chip:hover{transform:translateY(-1px);border-color:rgba(196,163,90,.42)}
        .analysis-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .risk-card{padding:22px;display:grid;grid-template-columns:170px minmax(0,1fr);gap:16px;align-items:center}
        .gauge{position:relative;width:170px;height:124px}.gauge svg{overflow:visible}.gauge-score{position:absolute;inset:auto 0 8px;text-align:center;font-size:34px;font-weight:900;color:var(--text)}.gauge-score span{font-size:12px;color:rgba(122,92,26,.5)}
        .ai-list{display:grid;gap:10px}.ai-item{padding:12px;border-radius:16px;border:1px solid var(--border);background:rgba(254,249,231,.54)}
        .project-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
        .project-card{padding:18px;border-radius:24px}
        .project-head{display:flex;gap:14px;align-items:flex-start}.project-emoji{width:54px;height:54px;border-radius:20px;background:rgba(196,163,90,.15);display:flex;align-items:center;justify-content:center;font-size:27px;flex-shrink:0}
        .tag-row{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.tag{font-size:11px;font-weight:800;border-radius:999px;padding:4px 9px;background:rgba(196,163,90,.12);color:var(--muted)}
        .progress-track{height:8px;border-radius:99px;background:rgba(196,163,90,.14);overflow:hidden}.progress-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--gold),#2d8a4e)}
        .project-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}.mini-stat{padding:10px;border-radius:16px;background:rgba(254,249,231,.62);border:1px solid rgba(196,163,90,.14);text-align:center}.mini-stat span{font-size:10px;color:rgba(122,92,26,.55);display:block}.mini-stat strong{font-size:13px;color:var(--text)}
        .chat-card{height:690px;display:flex;flex-direction:column;overflow:hidden}.chat-messages{flex:1;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:12px;min-height:0}.chat-bubble{max-width:90%;border-radius:22px;padding:13px 15px;font-size:13px;line-height:1.8;white-space:pre-wrap}.chat-user{align-self:flex-start;background:rgba(196,163,90,.14);color:var(--text);border:1px solid var(--border)}.chat-assistant{align-self:flex-end;background:linear-gradient(135deg,var(--brown),var(--brown-2));color:white}
        .chat-input{border-top:1px solid var(--border);padding:14px;display:flex;gap:10px;background:rgba(255,253,245,.68)}
        @media(max-width:1024px){.projects-shell{padding:22px 14px 96px}.hero-grid,.analysis-grid{grid-template-columns:1fr}.kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.project-grid{grid-template-columns:1fr}.risk-card{grid-template-columns:1fr;justify-items:center;text-align:center}.chat-card{height:560px}}
        @media(max-width:720px){.hero-title{font-size:27px}.hero-actions{flex-direction:column}.hero-actions button{width:100%}.stepper,.kpi-grid{grid-template-columns:1fr}.span-8,.span-6,.span-4{grid-column:span 12}.project-stats{grid-template-columns:1fr}.section-title{align-items:flex-start;flex-direction:column}.chat-input{flex-direction:column}.chat-input button{width:100%}}
      `}</style>

      <div className="projects-wrap">
        <section className="premium-card hero-card">
          <div className="hero-grid">
            <div>
              <button onClick={() => router.push('/')} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-white/70 transition hover:text-white">
                <ArrowRight className="h-4 w-4" />
                العودة للمدير المالي
              </button>
              <h1 className="hero-title">مشاريعي المستقبلية</h1>
              <p className="hero-sub">حوّل أفكارك إلى لوحة تنفيذ واضحة: رأس المال، الربحية، المخاطر، الاحتياجات، وخطوات الإطلاق في مكان واحد بتصميم SFM premium.</p>
              <div className="hero-actions">
                <Button onClick={() => setShowForm(true)} className="h-12 rounded-2xl px-5 font-black" style={{ background: '#c4a35a', color: '#2d1a0a' }}>
                  <Plus className="ms-2 h-4 w-4" />
                  مشروع جديد
                </Button>
                <Button onClick={() => document.getElementById('ai-consultant')?.scrollIntoView({ behavior: 'smooth' })} variant="outline" className="h-12 rounded-2xl border-white/20 bg-white/10 px-5 font-black text-white hover:bg-white/15">
                  <MessageCircle className="ms-2 h-4 w-4" />
                  اسأل المستشار
                </Button>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="glass-stat">
                <span>عدد المشاريع</span>
                <strong>{projects.length}</strong>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-stat">
                  <span>متوسط المخاطر</span>
                  <strong>{riskLabel(metrics.averageRisk).label}</strong>
                </div>
                <div className="glass-stat">
                  <span>تحليل AI</span>
                  <strong>{metrics.analyzedCount}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="kpi-grid">
          {[
            { icon: <Wallet className="h-5 w-5" />, label: 'رأس المال المخطط', value: `${formatKwd(metrics.totalCapital)} د.ك`, note: 'إجمالي الميزانيات' },
            { icon: <TrendingUp className="h-5 w-5" />, label: 'الربح الشهري المتوقع', value: `${formatKwd(metrics.expectedProfit)} د.ك`, note: metrics.expectedProfit >= 0 ? 'تدفق موجب' : 'يحتاج مراجعة' },
            { icon: <ShieldAlert className="h-5 w-5" />, label: 'مستوى المخاطرة', value: overallRisk.label, note: `${metrics.averageRisk}%` },
            { icon: <Sparkles className="h-5 w-5" />, label: 'متوسط تقييم AI', value: metrics.averageScore ? `${metrics.averageScore}/100` : 'بانتظار التحليل', note: `${metrics.analyzedCount} مشروع محلل` },
          ].map((item) => (
            <article className="premium-card kpi-card" key={item.label}>
              <div className="kpi-icon">{item.icon}</div>
              <div className="kpi-label">{item.label}</div>
              <div className="kpi-value">{item.value}</div>
              <span className="kpi-note">{item.note}</span>
            </article>
          ))}
        </section>

        {showForm && (
          <section className="premium-card p-5 md:p-7" id="project-flow">
            <div className="section-title">
              <div>
                <h2>
                  <Sparkles className="h-5 w-5 text-[#c4a35a]" />
                  {editingId ? 'تعديل المشروع' : 'إنشاء مشروع جديد'}
                </h2>
                <p>تدفق بسيط بثلاث خطوات: الفكرة، الأرقام، الجاهزية.</p>
              </div>
              <Button onClick={() => { setShowForm(false); setEditingId(null); setForm({ ...emptyForm, needs: makeNeeds(), progress: makeProgress() }); }} variant="outline" className="rounded-2xl border-[#c4a35a]/40 text-[#7a5c1a]">
                إغلاق
              </Button>
            </div>

            <div className="stepper">
              <div className="step-pill"><b>1</b><span className="text-sm font-extrabold text-[#2d1a0a]">الفكرة والهوية</span></div>
              <div className="step-pill"><b>2</b><span className="text-sm font-extrabold text-[#2d1a0a]">الأرقام والمخاطر</span></div>
              <div className="step-pill"><b>3</b><span className="text-sm font-extrabold text-[#2d1a0a]">الاحتياجات والإطلاق</span></div>
            </div>

            <div className="form-grid">
              <div className="field span-8">
                <Label>اسم المشروع *</Label>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="مثال: كافيه الأصالة" />
              </div>
              <div className="field span-4">
                <Label>رمز المشروع</Label>
                <Input value={form.emoji} onChange={(event) => setForm({ ...form, emoji: event.target.value })} placeholder="🚀" />
              </div>
              <div className="field span-6">
                <Label>نوع المشروع</Label>
                <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                  <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                  <SelectContent>{PROJECT_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="field span-6">
                <Label>وقت البدء</Label>
                <Select value={form.startTimeline} onValueChange={(value) => setForm({ ...form, startTimeline: value })}>
                  <SelectTrigger><SelectValue placeholder="متى تبدأ؟" /></SelectTrigger>
                  <SelectContent>{START_TIMELINES.map((time) => <SelectItem key={time} value={time}>{time}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="field span-12">
                <Label>فكرة المشروع</Label>
                <Textarea value={form.idea} onChange={(event) => setForm({ ...form, idea: event.target.value })} placeholder="اشرح الفكرة، الجمهور، وطريقة الربح..." className="min-h-[110px]" />
              </div>

              {MONEY_FIELDS.map((field) => (
                <div className="field span-4" key={field.key}>
                  <Label>{field.label}</Label>
                  <div className="money-input">
                    <span>د.ك</span>
                    <input value={form[field.key]} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} placeholder="0.000" dir="ltr" />
                  </div>
                </div>
              ))}

              <div className="span-12">
                <div className="premium-card risk-card">
                  <div className="gauge">
                    <svg viewBox="0 0 170 124" aria-hidden="true">
                      <path d="M24 92 A61 61 0 0 1 146 92" fill="none" stroke="rgba(196,163,90,.18)" strokeWidth="16" strokeLinecap="round" />
                      <path d="M24 92 A61 61 0 0 1 146 92" fill="none" stroke={riskLabel(form.riskLevel).color} strokeWidth="16" strokeLinecap="round" pathLength="100" strokeDasharray={`${form.riskLevel} 100`} />
                    </svg>
                    <div className="gauge-score">{form.riskLevel}<span>%</span></div>
                  </div>
                  <div>
                    <div className="section-title mb-2">
                      <div>
                        <h2 className="text-base">مؤشر المخاطرة</h2>
                        <p>عدّل مستوى المخاطر حسب وضوح السوق والتمويل والتنفيذ.</p>
                      </div>
                      <span className="tag" style={{ background: riskLabel(form.riskLevel).bg, color: riskLabel(form.riskLevel).color }}>{riskLabel(form.riskLevel).label}</span>
                    </div>
                    <input type="range" min="0" max="100" value={form.riskLevel} onChange={(event) => setForm({ ...form, riskLevel: Number(event.target.value) })} className="w-full" style={{ accentColor: riskLabel(form.riskLevel).color }} />
                  </div>
                </div>
              </div>

              {formRoi && (
                <div className="span-12 grid gap-3 md:grid-cols-3">
                  <div className="mini-stat"><span>الربح الشهري</span><strong>{formatKwd(formRoi.profit)} د.ك</strong></div>
                  <div className="mini-stat"><span>استرجاع رأس المال</span><strong>{formRoi.months} شهر</strong></div>
                  <div className="mini-stat"><span>العائد السنوي</span><strong className="text-[#2d8a4e]">{formRoi.yearly}%</strong></div>
                </div>
              )}

              <div className="field span-6">
                <Label>الهدف من المشروع</Label>
                <Select value={form.goal} onValueChange={(value) => setForm({ ...form, goal: value })}>
                  <SelectTrigger><SelectValue placeholder="اختر هدفك" /></SelectTrigger>
                  <SelectContent>{PROJECT_GOALS.map((goal) => <SelectItem key={goal} value={goal}>{goal}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="field span-6">
                <Label>ما أنجزته حتى الآن</Label>
                <div className="needs-grid">
                  {PROGRESS_STEPS.map((step) => (
                    <button
                      type="button"
                      key={step.id}
                      onClick={() => setForm((prev) => ({ ...prev, progress: { ...prev.progress, [step.id]: !prev.progress[step.id] } }))}
                      className="need-chip"
                      style={form.progress[step.id] ? { background: 'rgba(45,138,78,.13)', color: '#2d8a4e', borderColor: 'rgba(45,138,78,.3)' } : undefined}
                    >
                      {step.icon} {step.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field span-12">
                <Label>احتياجات المشروع</Label>
                <div className="needs-grid">
                  {PROJECT_NEEDS.map((need) => (
                    <button
                      key={need.id}
                      type="button"
                      onClick={() =>
                        setForm((prev) => {
                          const current = prev.needs[need.id] || 'none';
                          const next = current === 'none' ? 'pending' : current === 'pending' ? 'done' : 'none';
                          return { ...prev, needs: { ...prev.needs, [need.id]: next } };
                        })
                      }
                      className="need-chip"
                      style={
                        form.needs[need.id] === 'done'
                          ? { background: 'rgba(45,138,78,.13)', color: '#2d8a4e', borderColor: 'rgba(45,138,78,.3)' }
                          : form.needs[need.id] === 'pending'
                            ? { background: '#5c3d2a', color: 'white', borderColor: '#5c3d2a' }
                            : undefined
                      }
                    >
                      {form.needs[need.id] === 'done' ? '✓ ' : form.needs[need.id] === 'pending' ? '• ' : ''}
                      {need.icon} {need.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <Button onClick={saveProject} disabled={saving || !form.name.trim()} className="h-12 flex-1 rounded-2xl bg-[#5c3d2a] font-black text-white hover:bg-[#4a2e1a]">
                {saving || analyzing ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : <Sparkles className="ms-2 h-4 w-4" />}
                {saving || analyzing ? (analyzing ? 'جار تحليل المشروع...' : 'جار الحفظ...') : editingId ? 'حفظ التعديلات' : 'حفظ وتحليل المشروع'}
              </Button>
              <Button onClick={() => { setShowForm(false); setEditingId(null); setForm({ ...emptyForm, needs: makeNeeds(), progress: makeProgress() }); }} variant="outline" className="h-12 rounded-2xl border-[#c4a35a]/40 px-8 font-black text-[#7a5c1a]">
                إلغاء
              </Button>
            </div>
          </section>
        )}

        <section className="analysis-grid">
          <article className="premium-card risk-card">
            <div className="gauge">
              <svg viewBox="0 0 170 124" aria-hidden="true">
                <path d="M24 92 A61 61 0 0 1 146 92" fill="none" stroke="rgba(196,163,90,.18)" strokeWidth="16" strokeLinecap="round" />
                <path d="M24 92 A61 61 0 0 1 146 92" fill="none" stroke={overallRisk.color} strokeWidth="16" strokeLinecap="round" pathLength="100" strokeDasharray={`${riskDash} 100`} />
              </svg>
              <div className="gauge-score">{riskDash}<span>%</span></div>
            </div>
            <div>
              <div className="section-title">
                <div>
                  <h2><ShieldAlert className="h-5 w-5 text-[#c4a35a]" /> مؤشر مخاطر المحفظة</h2>
                  <p>قراءة مجمعة لمخاطر مشاريعك الحالية.</p>
                </div>
              </div>
              <span className="tag" style={{ background: overallRisk.bg, color: overallRisk.color }}>مخاطرة {overallRisk.label}</span>
              <p className="mt-4 text-sm leading-7 text-[#7a5c1a]">
                {riskDash < 34 ? 'المخاطر هادئة. ركّز على التنفيذ المنظم وقياس الطلب.' : riskDash < 67 ? 'المخاطر متوسطة. تحتاج خطة نقدية واضحة ومراحل إطلاق صغيرة.' : 'المخاطر عالية. ابدأ بنسخة تجريبية وخفّض الالتزامات الثابتة قبل التوسع.'}
              </p>
            </div>
          </article>

          <article className="premium-card p-5">
            <div className="section-title">
              <div>
                <h2><Sparkles className="h-5 w-5 text-[#c4a35a]" /> لوحة تحليل AI</h2>
                <p>ملخص سريع مبني على آخر مشروع وتحليلاتك المحفوظة.</p>
              </div>
            </div>
            <div className="ai-list">
              <div className="ai-item">
                <b className="text-sm text-[#2d1a0a]">أفضل مشروع للمتابعة</b>
                <p className="mt-1 text-sm text-[#7a5c1a]">{featuredProject ? `${featuredProject.emoji} ${featuredProject.name}` : 'أضف مشروعاً ليظهر هنا.'}</p>
              </div>
              <div className="ai-item">
                <b className="text-sm text-[#2d1a0a]">توقع الربحية</b>
                <p className="mt-1 text-sm text-[#7a5c1a]">{featuredRoi ? `استرجاع رأس المال خلال ${featuredRoi.months} شهر بعائد سنوي ${featuredRoi.yearly}%.` : 'أدخل رأس المال والإيراد والمصروف لتحصل على توقع فوري.'}</p>
              </div>
              <div className="ai-item">
                <b className="text-sm text-[#2d1a0a]">أولوية التنفيذ</b>
                <p className="mt-1 text-sm text-[#7a5c1a]">{metrics.readySteps > 0 ? `تم إنجاز ${metrics.readySteps} خطوة عبر مشاريعك. الخطوة التالية: التمويل أو الترخيص حسب جاهزية المشروع.` : 'ابدأ بتثبيت الفكرة ثم دراسة الجدوى.'}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.35fr_.85fr]">
          <div>
            <div className="section-title">
              <div>
                <h2><Layers3 className="h-5 w-5 text-[#c4a35a]" /> بطاقات المشاريع</h2>
                <p>بدل الجداول القديمة: كل مشروع يظهر ككرت تنفيذي قابل للتوسيع.</p>
              </div>
              <Button onClick={() => setShowForm(true)} className="rounded-2xl bg-[#c4a35a] font-black text-[#2d1a0a] hover:bg-[#d4b36a]">
                <Plus className="ms-2 h-4 w-4" />
                إضافة
              </Button>
            </div>

            {projects.length === 0 ? (
              <div className="premium-card p-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#c4a35a]/15 text-3xl">🚀</div>
                <h3 className="text-xl font-black text-[#2d1a0a]">ابدأ بمشروعك الأول</h3>
                <p className="mt-2 text-sm text-[#7a5c1a]">أضف فكرة المشروع وسيتم تحليلها وحفظها هنا كبطاقة تنفيذية.</p>
              </div>
            ) : (
              <div className="project-grid">
                {projects.map((project) => {
                  const roi = calcROI(project);
                  const progressCount = Object.values(project.progress).filter(Boolean).length;
                  const progressPct = Math.round((progressCount / PROGRESS_STEPS.length) * 100);
                  return (
                    <article className="premium-card project-card" key={project.id}>
                      <div className="project-head">
                        <div className="project-emoji">{project.emoji}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="truncate text-lg font-black text-[#2d1a0a]">{project.name}</h3>
                              <div className="tag-row">
                                {project.type && <span className="tag">{project.type}</span>}
                                <span className="tag" style={{ background: riskLabel(project.riskLevel).bg, color: riskLabel(project.riskLevel).color }}>مخاطرة {riskLabel(project.riskLevel).label}</span>
                                {project.analysis && <span className="tag" style={{ color: scoreColor(project.analysis.score) }}>AI {project.analysis.score}/100</span>}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button onClick={() => startEdit(project)} className="rounded-xl p-2 text-[#c4a35a] transition hover:bg-[#c4a35a]/10" title="تعديل"><Edit3 className="h-4 w-4" /></button>
                              <button onClick={() => removeProject(project.id)} className="rounded-xl p-2 text-[#c0392b] transition hover:bg-[#c0392b]/10" title="حذف"><Trash2 className="h-4 w-4" /></button>
                              <button onClick={() => setProjects((prev) => prev.map((item) => (item.id === project.id ? { ...item, expanded: !item.expanded } : item)))} className="rounded-xl p-2 text-[#7a5c1a] transition hover:bg-[#c4a35a]/10">
                                {project.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#7a5c1a]">
                              <span>تقدم المشروع</span>
                              <span>{progressPct}%</span>
                            </div>
                            <div className="progress-track"><div className="progress-fill" style={{ width: `${progressPct}%` }} /></div>
                          </div>
                        </div>
                      </div>

                      <div className="project-stats">
                        <div className="mini-stat"><span>رأس المال</span><strong>{project.capital || '0'} د.ك</strong></div>
                        <div className="mini-stat"><span>إيراد شهري</span><strong>{project.monthlyRevenue || '0'} د.ك</strong></div>
                        <div className="mini-stat"><span>الاسترداد</span><strong>{roi ? `${roi.months} شهر` : 'غير مكتمل'}</strong></div>
                      </div>

                      {project.expanded && (
                        <div className="mt-5 space-y-4 border-t border-[#c4a35a]/15 pt-4">
                          {project.idea && (
                            <div className="ai-item">
                              <b className="text-sm text-[#2d1a0a]">فكرة المشروع</b>
                              <p className="mt-1 text-sm leading-7 text-[#7a5c1a]">{project.idea}</p>
                            </div>
                          )}

                          {project.analysis && (
                            <div className="ai-item">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <b className="text-sm text-[#2d1a0a]">تحليل AI</b>
                                <span className="tag" style={{ color: scoreColor(project.analysis.score) }}>{project.analysis.successRate}</span>
                              </div>
                              <p className="mb-3 text-sm leading-7 text-[#7a5c1a]">{project.analysis.marketStatus}</p>
                              <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                  <p className="mb-2 text-xs font-black text-[#2d8a4e]">نقاط القوة</p>
                                  {project.analysis.strengths.map((item, index) => <p key={index} className="text-xs leading-6 text-[#7a5c1a]">• {item}</p>)}
                                </div>
                                <div>
                                  <p className="mb-2 text-xs font-black text-[#c0392b]">نقاط الضعف</p>
                                  {project.analysis.weaknesses.map((item, index) => <p key={index} className="text-xs leading-6 text-[#7a5c1a]">• {item}</p>)}
                                </div>
                              </div>
                              <div className="mt-3">
                                <p className="mb-2 text-xs font-black text-[#c4a35a]">اقتراحات</p>
                                {project.analysis.suggestions.map((item, index) => <p key={index} className="text-xs leading-6 text-[#7a5c1a]">• {item}</p>)}
                              </div>
                            </div>
                          )}

                          <div>
                            <p className="mb-2 text-xs font-black text-[#2d1a0a]">خطوات التنفيذ</p>
                            <div className="needs-grid">
                              {PROGRESS_STEPS.map((step, index) => {
                                const done = project.progress[step.id];
                                const previousDone = index === 0 || project.progress[PROGRESS_STEPS[index - 1].id];
                                return (
                                  <button
                                    key={step.id}
                                    onClick={() => toggleProgress(project.id, step.id)}
                                    disabled={!previousDone && !done}
                                    className="need-chip"
                                    style={done ? { background: 'rgba(45,138,78,.13)', color: '#2d8a4e', borderColor: 'rgba(45,138,78,.3)' } : !previousDone ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                                  >
                                    {done ? <CheckCircle2 className="inline h-3 w-3" /> : <Clock className="inline h-3 w-3" />} {step.icon} {step.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {Object.entries(project.needs).some(([, value]) => value !== 'none') && (
                            <div>
                              <p className="mb-2 text-xs font-black text-[#2d1a0a]">الاحتياجات</p>
                              <div className="needs-grid">
                                {Object.entries(project.needs)
                                  .filter(([, value]) => value !== 'none')
                                  .map(([needId, status]) => {
                                    const need = PROJECT_NEEDS.find((item) => item.id === needId);
                                    if (!need) return null;
                                    return (
                                      <span key={needId} className="need-chip" style={status === 'done' ? { background: 'rgba(45,138,78,.13)', color: '#2d8a4e' } : { background: 'rgba(92,61,42,.10)', color: '#5c3d2a' }}>
                                        {status === 'done' ? '✓' : '•'} {need.icon} {need.label}
                                      </span>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside id="ai-consultant">
            <div className="section-title">
              <div>
                <h2><MessageCircle className="h-5 w-5 text-[#c4a35a]" /> مستشار المشاريع الذكي</h2>
                <p>منطقة محادثة حديثة للمساعدة في التفكير والتحليل.</p>
              </div>
            </div>
            <div className="premium-card chat-card">
              <div className="chat-messages">
                {messages.map((message, index) => (
                  <div key={index} className={`chat-bubble ${message.role === 'user' ? 'chat-user' : 'chat-assistant'}`}>
                    {message.content}
                  </div>
                ))}
                {isLoading && (
                  <div className="chat-bubble chat-assistant">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="chat-input">
                <Input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendMessage()} placeholder="اسأل عن مشروعك، الربحية، أو المخاطر..." />
                <Button onClick={sendMessage} disabled={isLoading || !input.trim()} className="rounded-2xl bg-[#5c3d2a] text-white hover:bg-[#4a2e1a]">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </aside>
        </section>

        <footer className="pt-4 text-center text-sm text-[#7a5c1a]/55">
          <p>المدير المالي الذكي - يساعدك على تحويل الأفكار إلى مشاريع قابلة للتنفيذ</p>
          <p className="mt-1 font-black text-[#c4a35a]">powered by M.Q</p>
        </footer>
      </div>
    </main>
  );
}
