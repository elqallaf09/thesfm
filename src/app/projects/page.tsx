'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Plus, Trash2, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { WisdomTicker } from '@/components/WisdomTicker';

const TEMPLATES = [
  { emoji: '🏪', name: 'فتح محل تجاري', budget: '5000', durationUnit: 'month', timeline: '6', steps: ['اختيار الموقع', 'الترخيص التجاري', 'تجهيز المحل', 'التسويق'] },
  { emoji: '🍕', name: 'مطعم أو كافيه', budget: '15000', durationUnit: 'month', timeline: '9', steps: ['دراسة السوق', 'تراخيص الصحة', 'تجهيز المطبخ', 'تدريب الفريق'] },
  { emoji: '💻', name: 'مشروع تقني', budget: '5000', durationUnit: 'month', timeline: '6', steps: ['تحديد الفكرة', 'النموذج الأولي', 'التطوير', 'الإطلاق'] },
  { emoji: '🏠', name: 'استثمار عقاري', budget: '50000', durationUnit: 'year', timeline: '2', steps: ['تحليل السوق', 'اختيار العقار', 'التمويل', 'الإدارة'] },
  { emoji: '📱', name: 'متجر إلكتروني', budget: '1500', durationUnit: 'month', timeline: '3', steps: ['اختيار المنتجات', 'إنشاء المتجر', 'التسويق', 'الشحن'] },
  { emoji: '📚', name: 'مركز تعليمي', budget: '8000', durationUnit: 'month', timeline: '4', steps: ['التخصص', 'المناهج', 'المكان', 'التسجيل'] },
];

const NOTE_CATS = [
  { id: 'budget_detail', label: 'الميزانية التفصيلية', placeholder: 'إيجار 200 د.ك + بضاعة 500 د.ك ...' },
  { id: 'location', label: 'الموقع والمكان', placeholder: 'منطقة السالمية، مساحة 50 متر...' },
  { id: 'feasibility', label: 'دراسة الجدوى', placeholder: 'العائد المتوقع 15% سنوياً...' },
  { id: 'labor', label: 'العمالة والكادر', placeholder: 'موظف كاشير + عامل...' },
  { id: 'marketing', label: 'خطة التسويق', placeholder: 'إنستغرام + لوحات إعلانية...' },
  { id: 'risks', label: 'المخاطر والتحديات', placeholder: 'المنافسة العالية في المنطقة...' },
  { id: 'funding', label: 'مصادر التمويل', placeholder: 'مدخرات 70% + قرض 30%...' },
  { id: 'partners', label: 'الشركاء والموردين', placeholder: 'مورد البضاعة من الشركة X...' },
  { id: 'goals', label: 'الأهداف والمستهدفات', placeholder: '50 عميل في الشهر الأول...' },
  { id: 'other', label: 'ملاحظات أخرى', placeholder: 'أي معلومات إضافية...' },
];

interface Project { id: string; name: string; emoji: string; budget: string; timeline: string; durationUnit: string; steps: string[]; notes: Record<string, string>; expanded?: boolean; }
interface Message { role: 'user' | 'assistant'; content: string; }

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', emoji: '🚀', budget: '', timeline: '', durationUnit: 'month', notes: {} as Record<string, string> });
  const [activeNotes, setActiveNotes] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: 'مرحباً! 👋 أنا مستشارك المالي للمشاريع. أخبرني عن مشروعك وسأساعدك في التخطيط وحساب التكاليف. ما هو مشروعك الحلم؟ 🚀' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (user) loadProjects(); }, [user]);

  const loadProjects = async () => {
    const { data } = await supabase.from('projects').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    if (data) setProjects(data.map((p: any) => ({ id: p.id, name: p.name, emoji: p.emoji || '🚀', budget: String(p.budget || ''), timeline: String(p.timeline || ''), durationUnit: p.duration_unit || 'month', steps: p.steps || [], notes: p.notes || {}, expanded: false })));
  };

  const addProject = async (template?: typeof TEMPLATES[0]) => {
    setSaving(true);
    const proj = { name: template?.name || form.name || 'مشروع جديد', emoji: template?.emoji || form.emoji, budget: template?.budget || form.budget, timeline: template?.timeline || form.timeline, durationUnit: template?.durationUnit || form.durationUnit, steps: template?.steps || [], notes: form.notes };
    if (user) {
      const { data } = await supabase.from('projects').insert({ user_id: user.id, name: proj.name, emoji: proj.emoji, budget: proj.budget, timeline: proj.timeline, duration_unit: proj.durationUnit, steps: proj.steps, notes: proj.notes }).select().single();
      if (data) setProjects(prev => [{ ...proj, id: data.id, expanded: false }, ...prev]);
    } else {
      setProjects(prev => [{ ...proj, id: crypto.randomUUID(), expanded: false }, ...prev]);
    }
    setForm({ name: '', emoji: '🚀', budget: '', timeline: '', durationUnit: 'month', notes: {} });
    setActiveNotes([]); setShowForm(false); setSaving(false);
  };

  const removeProject = async (id: string) => {
    if (user) await supabase.from('projects').delete().eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const unitLabel = (u: string) => u === 'day' ? 'يوم' : u === 'year' ? 'سنة' : 'شهر';

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim(); setInput('');
    const newMsgs: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMsgs); setIsLoading(true);
    try {
      const res = await fetch('/api/projects-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newMsgs.map(m => ({ role: m.role, content: m.content })) }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.text || 'عذراً، حدث خطأ.' }]);
    } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ في الاتصال.' }]); }
    setIsLoading(false);
  };

  const S = { card: { border: '1px solid rgba(196,163,90,0.3)', background: 'rgba(255,253,245,0.98)' } as React.CSSProperties, input: { borderColor: 'rgba(196,163,90,0.4)' } as React.CSSProperties };

  return (
    <main dir="rtl" className="min-h-screen px-4 py-6" style={{ background: 'linear-gradient(135deg, #fffdf5 0%, #fef9e7 50%, #fdf5d0 100%)' }}>
      <div className="mx-auto max-w-5xl space-y-4">
        <WisdomTicker language="ar" showLanguageSelector={false} />

        <div className="rounded-3xl p-5" style={{ background: '#7f5c48', boxShadow: '0 4px 20px rgba(127,92,72,0.35)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="text-white/80 hover:text-white"><ArrowRight className="w-6 h-6" /></button>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#f0d080' }}>🚀 مشاريعي المستقبلية</h1>
              <p className="text-sm text-white/60 mt-0.5">خطط لمشاريعك واحسب تكاليفها بمساعدة الذكاء الاصطناعي</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold" style={{ color: '#7a5c1a' }}>مشاريعي ({projects.length})</h2>
              <Button onClick={() => setShowForm(!showForm)} className="font-bold text-sm" style={{ background: '#c4a35a', color: '#1a0f00' }}><Plus className="w-4 h-4 ms-1" /> إضافة</Button>
            </div>

            {showForm && (
              <Card style={S.card}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex gap-2">
                    <Input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} className="w-12 text-center text-lg" style={S.input} />
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسم المشروع" className="flex-1" style={S.input} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" style={{ color: '#7a5c1a' }}>الميزانية الإجمالية</Label>
                    <div className="flex items-center gap-2 h-10 rounded-xl border px-3" style={{ borderColor: 'rgba(196,163,90,0.4)', background: 'white' }}>
                      <span className="text-sm font-bold shrink-0" style={{ color: '#c4a35a' }}>د.ك</span>
                      <input type="text" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="0.000" className="flex-1 bg-transparent text-sm outline-none" dir="ltr" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs" style={{ color: '#7a5c1a' }}>المدة</Label>
                      <Input value={form.timeline} onChange={e => setForm({ ...form, timeline: e.target.value })} placeholder="6" type="number" dir="ltr" style={S.input} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs" style={{ color: '#7a5c1a' }}>الوحدة</Label>
                      <Select value={form.durationUnit} onValueChange={v => setForm({ ...form, durationUnit: v })}>
                        <SelectTrigger style={S.input}><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="day">يوم</SelectItem><SelectItem value="month">شهر</SelectItem><SelectItem value="year">سنة</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold" style={{ color: '#7a5c1a' }}>📋 تفاصيل المشروع</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {NOTE_CATS.map(cat => (
                        <button key={cat.id} type="button" onClick={() => setActiveNotes(prev => prev.includes(cat.id) ? prev.filter(n => n !== cat.id) : [...prev, cat.id])}
                          className="px-2 py-1 rounded-full text-xs transition-all"
                          style={activeNotes.includes(cat.id) ? { background: '#7f5c48', color: 'white' } : { background: 'rgba(196,163,90,0.1)', color: '#7a5c1a', border: '0.5px solid rgba(196,163,90,0.3)' }}>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    {activeNotes.map(nid => {
                      const cat = NOTE_CATS.find(c => c.id === nid)!;
                      return (
                        <div key={nid} className="space-y-1">
                          <Label className="text-xs" style={{ color: '#7a5c1a' }}>{cat.label}</Label>
                          <Textarea value={form.notes[nid] || ''} onChange={e => setForm({ ...form, notes: { ...form.notes, [nid]: e.target.value } })} placeholder={cat.placeholder} className="text-xs min-h-[50px]" style={S.input} />
                        </div>
                      );
                    })}
                  </div>
                  <Button onClick={() => addProject()} disabled={saving} className="w-full font-bold" style={{ background: '#7f5c48', color: 'white' }}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '✅ حفظ المشروع'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {projects.length === 0 ? (
              <div className="text-center py-8 rounded-2xl" style={{ border: '1px dashed rgba(196,163,90,0.4)', color: 'rgba(122,92,26,0.5)' }}>
                <p className="text-3xl mb-2">🚀</p><p className="text-sm">اختر قالباً أو أضف مشروعاً جديداً</p>
              </div>
            ) : projects.map(project => (
              <Card key={project.id} style={S.card}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setProjects(prev => prev.map(p => p.id === project.id ? { ...p, expanded: !p.expanded } : p))} className="flex items-center gap-2 flex-1 text-start min-w-0">
                      <span className="text-xl shrink-0">{project.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm truncate" style={{ color: '#7a5c1a' }}>{project.name}</p>
                        <div className="flex gap-3 text-xs" style={{ color: 'rgba(122,92,26,0.6)' }}>
                          {project.budget && <span>💰 {project.budget} د.ك</span>}
                          {project.timeline && <span>📅 {project.timeline} {unitLabel(project.durationUnit)}</span>}
                        </div>
                      </div>
                      {project.expanded ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: '#c4a35a' }} /> : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: '#c4a35a' }} />}
                    </button>
                    <Button variant="ghost" size="icon" onClick={() => removeProject(project.id)} className="text-red-400 h-7 w-7 shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                  {project.expanded && (
                    <div className="mt-3 space-y-2">
                      {project.steps.length > 0 && (
                        <div className="space-y-1">
                          {project.steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(122,92,26,0.7)' }}>
                              <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs shrink-0 font-bold" style={{ background: 'rgba(196,163,90,0.15)', color: '#c4a35a' }}>{i + 1}</span>{step}
                            </div>
                          ))}
                        </div>
                      )}
                      {Object.entries(project.notes).filter(([, v]) => v).map(([key, value]) => {
                        const cat = NOTE_CATS.find(c => c.id === key);
                        return cat ? (
                          <div key={key} className="rounded-lg p-2" style={{ background: 'rgba(196,163,90,0.06)', border: '0.5px solid rgba(196,163,90,0.2)' }}>
                            <p className="text-xs font-bold" style={{ color: '#7a5c1a' }}>{cat.label}:</p>
                            <p className="text-xs mt-0.5 whitespace-pre-wrap" style={{ color: 'rgba(122,92,26,0.7)' }}>{value}</p>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div>
              <p className="text-xs font-bold mb-2" style={{ color: 'rgba(122,92,26,0.5)' }}>📋 قوالب جاهزة</p>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => addProject(t)} className="p-3 rounded-xl text-start hover:scale-[1.02] transition-all" style={{ border: '1px solid rgba(196,163,90,0.3)', background: 'rgba(255,253,245,0.9)' }}>
                    <span className="text-lg">{t.emoji}</span>
                    <p className="text-xs font-bold mt-1" style={{ color: '#7a5c1a' }}>{t.name}</p>
                    <p className="text-xs" style={{ color: 'rgba(122,92,26,0.45)' }}>{t.budget} د.ك | {t.timeline} {unitLabel(t.durationUnit)}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-bold" style={{ color: '#7a5c1a' }}>🤖 مستشار المشاريع الذكي</h2>
            <Card style={{ ...S.card, display: 'flex', flexDirection: 'column', height: '560px' }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                      style={msg.role === 'user' ? { background: 'rgba(127,92,72,0.1)', color: '#7f5c48', border: '0.5px solid rgba(127,92,72,0.2)' } : { background: '#7f5c48', color: 'white' }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && <div className="flex justify-end"><div className="rounded-2xl px-4 py-3" style={{ background: '#7f5c48' }}><Loader2 className="w-4 h-4 animate-spin text-white" /></div></div>}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 border-t" style={{ borderColor: 'rgba(196,163,90,0.2)' }}>
                <div className="flex gap-2">
                  <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="اسألني عن مشروعك..." style={S.input} />
                  <Button onClick={sendMessage} disabled={isLoading || !input.trim()} style={{ background: '#7f5c48', color: 'white' }}><Send className="w-4 h-4" /></Button>
                </div>
                <p className="text-xs mt-1 text-center" style={{ color: 'rgba(122,92,26,0.4)' }}>متخصص فقط في المشاريع والاستثمار المالي</p>
              </div>
            </Card>
          </div>
        </div>

        <div className="pt-4 text-center text-sm" style={{ borderTop: '1px solid rgba(196,163,90,0.3)' }}>
          <p style={{ color: 'rgba(122,92,26,0.5)' }}>المدير المالي الذكي - يساعدك على اتخاذ قرارات مالية أوضح</p>
          <p className="mt-1 font-medium" style={{ color: '#c4a35a' }}>powered by M.Q</p>
        </div>
      </div>
    </main>
  );
}
