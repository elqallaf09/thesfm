'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Plus, Trash2, Send, Loader2, Target, DollarSign, Calendar, Lightbulb } from 'lucide-react';

const PROJECT_TEMPLATES = [
  { emoji: '🏪', name: 'فتح محل تجاري', nameEn: 'Open a shop', budget: '5000-15000', time: '3-6 أشهر', steps: ['اختيار الموقع المناسب', 'الحصول على ترخيص تجاري', 'تجهيز المحل وشراء البضاعة', 'التسويق والإعلان', 'تعيين موظفين إن لزم'] },
  { emoji: '🍕', name: 'مطعم أو كافيه', nameEn: 'Restaurant or cafe', budget: '10000-50000', time: '6-12 شهراً', steps: ['دراسة السوق والمنافسين', 'اختيار القائمة والمفهوم', 'الحصول على تراخيص الصحة', 'تجهيز المطبخ والمكان', 'تدريب الفريق'] },
  { emoji: '💻', name: 'مشروع تقني أو تطبيق', nameEn: 'Tech project or app', budget: '2000-20000', time: '3-12 شهراً', steps: ['تحديد الفكرة والجمهور المستهدف', 'تصميم النموذج الأولي', 'التطوير والبرمجة', 'الاختبار وإطلاق البيتا', 'التسويق والنشر'] },
  { emoji: '🏠', name: 'استثمار عقاري', nameEn: 'Real estate investment', budget: '50000+', time: '6-24 شهراً', steps: ['تحليل السوق العقاري', 'تحديد نوع العقار', 'التمويل والقروض', 'الشراء وإجراءات التسجيل', 'إدارة العقار أو إعادة البيع'] },
  { emoji: '📱', name: 'متجر إلكتروني', nameEn: 'Online store', budget: '500-5000', time: '1-3 أشهر', steps: ['اختيار المنتجات والموردين', 'إنشاء المتجر الإلكتروني', 'ربط بوابة الدفع', 'استراتيجية التسويق الرقمي', 'إدارة الشحن والمخزون'] },
  { emoji: '📚', name: 'مركز تعليمي أو دورات', nameEn: 'Educational center', budget: '3000-15000', time: '2-6 أشهر', steps: ['تحديد التخصص والجمهور', 'إعداد المناهج والمحتوى', 'إيجاد المكان أو المنصة الرقمية', 'تسجيل الطلاب وبدء التدريس', 'الحصول على الاعتماد'] },
];

interface Project {
  id: string;
  name: string;
  emoji: string;
  budget: string;
  timeline: string;
  notes: string;
  steps: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', emoji: '🚀', budget: '', timeline: '', notes: '' });
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'مرحباً! 👋 أنا مساعدك المالي للمشاريع. أخبرني عن مشروعك المستقبلي وسأساعدك في التخطيط وحساب التكاليف والخطوات اللازمة. ما هو مشروعك الحلم؟' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const addProject = (template?: typeof PROJECT_TEMPLATES[0]) => {
    const project: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name: template?.name || newProject.name || 'مشروع جديد',
      emoji: template?.emoji || newProject.emoji,
      budget: template?.budget || newProject.budget,
      timeline: template?.time || newProject.timeline,
      notes: newProject.notes,
      steps: template?.steps || [],
    };
    setProjects([...projects, project]);
    setNewProject({ name: '', emoji: '🚀', budget: '', timeline: '', notes: '' });
    setShowForm(false);
  };

  const removeProject = (id: string) => setProjects(projects.filter(p => p.id !== id));

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `أنت مستشار مالي متخصص في المشاريع الصغيرة والمتوسطة في الكويت والخليج العربي. مهمتك حصراً هي:
1. مساعدة المستخدم في التخطيط لمشاريعه المستقبلية
2. حساب التكاليف التقريبية بالدينار الكويتي
3. تقديم خطوات عملية لتنفيذ المشروع
4. نصائح استثمارية وتمويلية للمشاريع
5. تحليل مخاطر المشاريع وفرص النجاح

لا تتحدث في أي موضوع آخر خارج المشاريع والاستثمار والتخطيط المالي. ردودك باللغة العربية بشكل مختصر ومفيد.`,
          messages: [...messages, { role: 'user', content: userMsg }].map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await response.json();
      const text = data.content?.[0]?.text || 'عذراً، لم أتمكن من الرد. حاول مرة أخرى.';
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ في الاتصال. تحقق من اتصالك وحاول مرة أخرى.' }]);
    }
    setIsLoading(false);
  };

  return (
    <main dir="rtl" className="min-h-screen px-4 py-8" style={{background: 'linear-gradient(135deg, #fffdf5 0%, #fef9e7 50%, #fdf5d0 100%)'}}>
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="rounded-3xl p-6 text-white" style={{background: '#7f5c48', boxShadow: '0 4px 20px rgba(127,92,72,0.3)'}}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="text-white/80 hover:text-white"><ArrowRight className="w-6 h-6" /></button>
            <div>
              <h1 className="text-3xl font-bold" style={{color: '#f0d080'}}>🚀 مشاريعي المستقبلية</h1>
              <p className="mt-1 text-white/70">خطط لمشاريعك واحسب تكاليفها بمساعدة الذكاء الاصطناعي</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Projects List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{color: '#7a5c1a'}}>مشاريعي ({projects.length})</h2>
              <Button onClick={() => setShowForm(!showForm)} style={{background: '#c4a35a', color: '#1a0f00'}} className="font-bold">
                <Plus className="w-4 h-4 ms-1" /> إضافة مشروع
              </Button>
            </div>

            {/* Add Form */}
            {showForm && (
              <Card style={{border: '1px solid rgba(196,163,90,0.4)', background: 'rgba(255,253,245,0.98)'}}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex gap-2">
                    <Input value={newProject.emoji} onChange={e => setNewProject({...newProject, emoji: e.target.value})} className="w-16 text-center text-2xl" style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                    <Input value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="اسم المشروع" className="flex-1" style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={newProject.budget} onChange={e => setNewProject({...newProject, budget: e.target.value})} placeholder="الميزانية (د.ك)" dir="ltr" style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                    <Input value={newProject.timeline} onChange={e => setNewProject({...newProject, timeline: e.target.value})} placeholder="المدة الزمنية" style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                  </div>
                  <Input value={newProject.notes} onChange={e => setNewProject({...newProject, notes: e.target.value})} placeholder="ملاحظات..." style={{borderColor: 'rgba(196,163,90,0.4)'}} />
                  <Button onClick={() => addProject()} className="w-full font-bold" style={{background: '#7f5c48', color: 'white'}}>✅ إضافة المشروع</Button>
                </CardContent>
              </Card>
            )}

            {/* Project Cards */}
            {projects.length === 0 ? (
              <div className="text-center py-10 rounded-2xl" style={{border: '1px dashed rgba(196,163,90,0.4)', color: 'rgba(122,92,26,0.5)'}}>
                <p className="text-4xl mb-2">🚀</p>
                <p>لم تضف أي مشاريع بعد</p>
                <p className="text-sm mt-1">اختر من القوالب أدناه أو أضف مشروعاً جديداً</p>
              </div>
            ) : (
              projects.map(project => (
                <Card key={project.id} style={{border: '1px solid rgba(196,163,90,0.3)', background: 'rgba(255,253,245,0.98)'}}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{project.emoji}</span>
                        <div>
                          <h3 className="font-bold" style={{color: '#7a5c1a'}}>{project.name}</h3>
                          <div className="flex gap-3 mt-1 text-xs" style={{color: 'rgba(122,92,26,0.6)'}}>
                            {project.budget && <span>💰 {project.budget} د.ك</span>}
                            {project.timeline && <span>📅 {project.timeline}</span>}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeProject(project.id)} className="text-red-400 h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    {project.steps.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {project.steps.map((step, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm" style={{color: 'rgba(122,92,26,0.7)'}}>
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{background: 'rgba(196,163,90,0.15)', color: '#c4a35a'}}>{i+1}</span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    )}
                    {project.notes && <p className="mt-2 text-sm" style={{color: 'rgba(122,92,26,0.6)'}}>{project.notes}</p>}
                  </CardContent>
                </Card>
              ))
            )}

            {/* Templates */}
            <div>
              <h3 className="font-bold mb-3" style={{color: 'rgba(122,92,26,0.7)'}}>📋 قوالب جاهزة</h3>
              <div className="grid grid-cols-2 gap-2">
                {PROJECT_TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => addProject(t)} className="p-3 rounded-xl text-start transition-all hover:scale-105"
                    style={{border: '1px solid rgba(196,163,90,0.3)', background: 'rgba(255,253,245,0.9)'}}>
                    <span className="text-xl">{t.emoji}</span>
                    <p className="text-xs font-bold mt-1" style={{color: '#7a5c1a'}}>{t.name}</p>
                    <p className="text-xs mt-0.5" style={{color: 'rgba(122,92,26,0.5)'}}>{t.budget} د.ك</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Chat */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold" style={{color: '#7a5c1a'}}>🤖 مستشار المشاريع الذكي</h2>
            <Card style={{border: '1px solid rgba(196,163,90,0.35)', background: 'rgba(255,253,245,0.98)', height: '600px', display: 'flex', flexDirection: 'column'}}>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                      style={msg.role === 'user'
                        ? {background: 'rgba(127,92,72,0.1)', color: '#7f5c48', border: '0.5px solid rgba(127,92,72,0.2)'}
                        : {background: '#7f5c48', color: 'white'}}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-end">
                    <div className="rounded-2xl px-4 py-3" style={{background: '#7f5c48', color: 'white'}}>
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t" style={{borderColor: 'rgba(196,163,90,0.2)'}}>
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="اسألني عن مشروعك..."
                    style={{borderColor: 'rgba(196,163,90,0.4)'}}
                  />
                  <Button onClick={sendMessage} disabled={isLoading || !input.trim()} style={{background: '#7f5c48', color: 'white'}}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm pt-2" style={{borderTop: '1px solid rgba(196,163,90,0.3)', color: 'rgba(122,92,26,0.5)'}}>
          <p>المدير المالي الذكي - يساعدك على اتخاذ قرارات مالية أوضح</p>
          <p className="mt-1" style={{color: '#c4a35a'}}>powered by M.Q</p>
        </div>
      </div>
    </main>
  );
}
