'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Plus, Trash2, Send, Loader2 } from 'lucide-react';

const PROJECT_TEMPLATES = [
  { emoji: '🏪', name: 'فتح محل تجاري', budget: '5,000 - 15,000', time: '3-6 أشهر', steps: ['اختيار الموقع المناسب', 'الحصول على الترخيص التجاري', 'تجهيز المحل وشراء البضاعة', 'التسويق والإعلان'] },
  { emoji: '🍕', name: 'مطعم أو كافيه', budget: '10,000 - 50,000', time: '6-12 شهراً', steps: ['دراسة السوق والمنافسين', 'الحصول على تراخيص الصحة', 'تجهيز المطبخ والمكان', 'تدريب الفريق وبدء العمل'] },
  { emoji: '💻', name: 'مشروع تقني', budget: '2,000 - 20,000', time: '3-12 شهراً', steps: ['تحديد الفكرة والجمهور المستهدف', 'تصميم النموذج الأولي', 'التطوير والبرمجة', 'الإطلاق والتسويق'] },
  { emoji: '🏠', name: 'استثمار عقاري', budget: '50,000+', time: '6-24 شهراً', steps: ['تحليل السوق العقاري', 'تحديد نوع العقار المناسب', 'التمويل وإجراءات الشراء', 'إدارة العقار أو إعادة البيع'] },
  { emoji: '📱', name: 'متجر إلكتروني', budget: '500 - 5,000', time: '1-3 أشهر', steps: ['اختيار المنتجات والموردين', 'إنشاء المتجر وربط الدفع', 'استراتيجية التسويق الرقمي', 'إدارة الشحن والمخزون'] },
  { emoji: '📚', name: 'مركز تعليمي', budget: '3,000 - 15,000', time: '2-6 أشهر', steps: ['تحديد التخصص والجمهور', 'إعداد المناهج والمحتوى', 'إيجاد المكان أو المنصة', 'تسجيل الطلاب والبدء'] },
];

interface Project { id: string; name: string; emoji: string; budget: string; timeline: string; notes: string; steps: string[]; }
interface Message { role: 'user' | 'assistant'; content: string; }

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', emoji: '🚀', budget: '', timeline: '', notes: '' });
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: 'مرحباً! 👋 أنا مستشارك المالي للمشاريع. أخبرني عن مشروعك المستقبلي وسأساعدك في التخطيط وحساب التكاليف. ما هو مشروعك الحلم؟ 🚀' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const addProject = (template?: typeof PROJECT_TEMPLATES[0]) => {
    setProjects(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: template?.name || newProject.name || 'مشروع جديد', emoji: template?.emoji || newProject.emoji, budget: template?.budget || newProject.budget, timeline: template?.time || newProject.timeline, notes: newProject.notes, steps: template?.steps || [] }]);
    setNewProject({ name: '', emoji: '🚀', budget: '', timeline: '', notes: '' });
    setShowForm(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);
    try {
      const res = await fetch('/api/projects-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.text || 'عذراً، حدث خطأ. حاول مرة أخرى.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ في الاتصال.' }]);
    }
    setIsLoading(false);
  };

  return (
    <main dir="rtl" className="min-h-screen px-4 py-8" style={{ background: 'linear-gradient(135deg, #fffdf5 0%, #fef9e7 50%, #fdf5d0 100%)' }}>
      <div className="mx-auto max-w-5xl space-y-6">

        <div className="rounded-3xl p-6" style={{ background: '#7f5c48', boxShadow: '0 4px 20px rgba(127,92,72,0.35), 0 8px 40px rgba(127,92,72,0.15)' }}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="text-white/80 hover:text-white"><ArrowRight className="w-6 h-6" /></button>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#f0d080' }}>🚀 مشاريعي المستقبلية</h1>
              <p className="mt-1 text-white/70 text-sm">خطط لمشاريعك واحسب تكاليفها بمساعدة الذكاء الاصطناعي</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: '#7a5c1a' }}>مشاريعي ({projects.length})</h2>
              <Button onClick={() => setShowForm(!showForm)} className="font-bold" style={{ background: '#c4a35a', color: '#1a0f00' }}><Plus className="w-4 h-4 ms-1" /> إضافة</Button>
            </div>

            {showForm && (
              <Card style={{ border: '1px solid rgba(196,163,90,0.4)', background: 'rgba(255,253,245,0.98)' }}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex gap-2">
                    <Input value={newProject.emoji} onChange={e => setNewProject({ ...newProject, emoji: e.target.value })} className="w-16 text-center text-2xl" style={{ borderColor: 'rgba(196,163,90,0.4)' }} />
                    <Input value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} placeholder="اسم المشروع" className="flex-1" style={{ borderColor: 'rgba(196,163,90,0.4)' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={newProject.budget} onChange={e => setNewProject({ ...newProject, budget: e.target.value })} placeholder="الميزانية (د.ك)" dir="ltr" style={{ borderColor: 'rgba(196,163,90,0.4)' }} />
                    <Input value={newProject.timeline} onChange={e => setNewProject({ ...newProject, timeline: e.target.value })} placeholder="المدة الزمنية" style={{ borderColor: 'rgba(196,163,90,0.4)' }} />
                  </div>
                  <Input value={newProject.notes} onChange={e => setNewProject({ ...newProject, notes: e.target.value })} placeholder="ملاحظات..." style={{ borderColor: 'rgba(196,163,90,0.4)' }} />
                  <Button onClick={() => addProject()} className="w-full font-bold" style={{ background: '#7f5c48', color: 'white' }}>✅ إضافة المشروع</Button>
                </CardContent>
              </Card>
            )}

            {projects.length === 0 ? (
              <div className="text-center py-10 rounded-2xl" style={{ border: '1px dashed rgba(196,163,90,0.4)', color: 'rgba(122,92,26,0.5)' }}>
                <p className="text-4xl mb-2">🚀</p><p>لم تضف أي مشاريع بعد</p>
                <p className="text-sm mt-1">اختر قالباً جاهزاً من الأسفل</p>
              </div>
            ) : projects.map(project => (
              <Card key={project.id} style={{ border: '1px solid rgba(196,163,90,0.3)', background: 'rgba(255,253,245,0.98)' }}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{project.emoji}</span>
                      <div>
                        <h3 className="font-bold" style={{ color: '#7a5c1a' }}>{project.name}</h3>
                        <div className="flex gap-3 mt-0.5 text-xs" style={{ color: 'rgba(122,92,26,0.6)' }}>
                          {project.budget && <span>💰 {project.budget} د.ك</span>}
                          {project.timeline && <span>📅 {project.timeline}</span>}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setProjects(prev => prev.filter(p => p.id !== project.id))} className="text-red-400 h-8 w-8 shrink-0"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  {project.steps.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {project.steps.map((step, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(122,92,26,0.7)' }}>
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'rgba(196,163,90,0.15)', color: '#c4a35a' }}>{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  )}
                  {project.notes && <p className="mt-2 text-xs" style={{ color: 'rgba(122,92,26,0.6)' }}>{project.notes}</p>}
                </CardContent>
              </Card>
            ))}

            <div>
              <p className="text-sm font-bold mb-3" style={{ color: 'rgba(122,92,26,0.6)' }}>📋 قوالب جاهزة</p>
              <div className="grid grid-cols-2 gap-2">
                {PROJECT_TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => addProject(t)} className="p-3 rounded-xl text-start transition-all hover:scale-[1.02]" style={{ border: '1px solid rgba(196,163,90,0.3)', background: 'rgba(255,253,245,0.9)' }}>
                    <span className="text-xl">{t.emoji}</span>
                    <p className="text-xs font-bold mt-1" style={{ color: '#7a5c1a' }}>{t.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(122,92,26,0.45)' }}>{t.budget} د.ك</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold" style={{ color: '#7a5c1a' }}>🤖 مستشار المشاريع الذكي</h2>
            <Card style={{ border: '1px solid rgba(196,163,90,0.35)', background: 'rgba(255,253,245,0.98)', display: 'flex', flexDirection: 'column', height: '560px' }}>
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
                  <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="اسألني عن مشروعك..." style={{ borderColor: 'rgba(196,163,90,0.4)' }} />
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
