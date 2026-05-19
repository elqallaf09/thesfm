'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Pencil, Trash2, Send, ChevronDown, ChevronUp } from 'lucide-react';

/* ── Static data ── */
const PROJECT_TYPES = ['مطعم / كافيه','متجر إلكتروني','عقار واستثمار','تقنية وبرمجة','تعليم وتدريب','خدمات منزلية','صحة وجمال','تجارة وتوزيع','إعلام وتسويق','أخرى'];
const PROJECT_GOALS = ['دخل إضافي','تفرغ كامل','استثمار طويل الأمد','نمو سريع','بناء علامة تجارية','استقلالية مالية'];
const START_TIMELINES = ['خلال شهر','خلال 3 أشهر','خلال 6 أشهر','خلال سنة','أكثر من سنة'];
const PROJECT_NEEDS = [
  {id:'funding',label:'تمويل',icon:'💰'},{id:'partner',label:'شريك',icon:'🤝'},
  {id:'employees',label:'موظفين',icon:'👥'},{id:'ecommerce',label:'متجر إلكتروني',icon:'🛒'},
  {id:'app',label:'تطبيق',icon:'📱'},{id:'marketing',label:'تسويق',icon:'📣'},
  {id:'suppliers',label:'موردين',icon:'🏭'},{id:'website',label:'موقع إلكتروني',icon:'🌐'},
  {id:'equipment',label:'معدات',icon:'⚙️'},{id:'location',label:'مكتب / محل',icon:'🏪'},
  {id:'license',label:'رخصة تجارية',icon:'📋'},{id:'plan',label:'خطة عمل',icon:'📊'},
  {id:'feasibility',label:'دراسة جدوى',icon:'🔍'},{id:'legal',label:'استشارة قانونية',icon:'⚖️'},
];
const PROGRESS_STEPS = [
  {id:'idea',label:'الفكرة',icon:'💡'},{id:'feasibility',label:'الجدوى',icon:'📊'},
  {id:'funding',label:'التمويل',icon:'💰'},{id:'license',label:'الرخصة',icon:'📋'},
  {id:'launch',label:'الإطلاق',icon:'🚀'},
];
const EMOJIS = ['🚀','💡','🏪','🛒','🏠','📱','🎓','💼','🍽','📈','🎨','🏭','🌐','⚙️','💎'];

interface ProjectForm {
  name:string;emoji:string;type:string;idea:string;
  capital:string;monthlyExpenses:string;monthlyRevenue:string;
  riskLevel:number;needs:string[];goal:string;startTimeline:string;
  progress:Record<string,boolean>;
}
interface AIAnalysis{score:number;successRate:string;strengths:string[];weaknesses:string[];suggestions:string[];marketStatus:string;}
interface Project extends ProjectForm{id:string;analysis?:AIAnalysis;expanded?:boolean;createdAt?:string;}
interface Message{role:'user'|'assistant';content:string;}

const emptyForm:ProjectForm={name:'',emoji:'🚀',type:'',idea:'',capital:'',monthlyExpenses:'',monthlyRevenue:'',riskLevel:33,needs:[],goal:'',startTimeline:'',progress:{idea:true,feasibility:false,funding:false,license:false,launch:false}};

const riskInfo=(v:number)=>v<34?{label:'منخفض',color:'#22C55E',bg:'rgba(34,197,94,.12)',bar:'#22C55E'}:v<67?{label:'متوسط',color:'#F59E0B',bg:'rgba(245,158,11,.12)',bar:'#F59E0B'}:{label:'عالي',color:'#EF4444',bg:'rgba(239,68,68,.12)',bar:'#EF4444'};
const scoreColor=(s:number)=>s>=70?'#22C55E':s>=50?'#D4AF37':'#EF4444';

/* ── Risk Gauge ── */
function RiskGauge({value}:{value:number}){
  const angle=-130+(value/100)*260;
  const ri=riskInfo(value);
  return(
    <div style={{position:'relative',width:'120px',height:'70px',margin:'0 auto'}}>
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path d="M10 65 A50 50 0 0 1 110 65" fill="none" stroke="rgba(200,169,107,.15)" strokeWidth="10" strokeLinecap="round"/>
        <path d="M10 65 A50 50 0 0 1 110 65" fill="none" stroke={ri.bar} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(value/100)*157} 157`} style={{transition:'stroke-dasharray .8s ease'}}/>
      </svg>
      <div style={{position:'absolute',bottom:'-2px',left:'50%',transform:'translateX(-50%)',textAlign:'center'}}>
        <div style={{fontSize:'20px',fontWeight:'900',color:ri.color,fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1}}>{value}</div>
        <div style={{fontSize:'10px',fontWeight:'700',color:ri.color}}>{ri.label}</div>
      </div>
    </div>
  );
}

/* ── Step indicator ── */
function Steps({current,total}:{current:number;total:number}){
  return(
    <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'24px'}}>
      {Array.from({length:total},(_,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:'6px',flex:i<total-1?1:'none'}}>
          <div style={{width:'28px',height:'28px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'700',transition:'all .2s',
            background:i<current?'#D4AF37':i===current?'#1B2430':'rgba(200,169,107,.12)',
            color:i<current?'#1a0f00':i===current?'#D4AF37':'#8A9BB0',
            border:i===current?'2px solid #D4AF37':'2px solid transparent',
            boxShadow:i===current?'0 0 0 4px rgba(212,175,55,.15)':'none',
            flexShrink:0,
          }}>{i<current?'✓':i+1}</div>
          {i<total-1&&<div style={{flex:1,height:'2px',background:i<current?'#D4AF37':'rgba(200,169,107,.18)',transition:'background .3s'}}/>}
        </div>
      ))}
    </div>
  );
}

export default function ProjectsPage(){
  const router=useRouter();
  const {user}=useAuth();
  const [projects,setProjects]=useState<Project[]>([]);
  const [showForm,setShowForm]=useState(false);
  const [step,setStep]=useState(0);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [form,setForm]=useState<ProjectForm>(emptyForm);
  const [analyzing,setAnalyzing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [messages,setMessages]=useState<Message[]>([{role:'assistant',content:'مرحباً! 👋 أنا مستشارك الذكي للمشاريع. أملأ تفاصيل مشروعك واضغط "حفظ وتحليل" لأعطيك تقييماً شاملاً، أو اسألني مباشرة! 🚀'}]);
  const [input,setInput]=useState('');
  const [isLoading,setIsLoading]=useState(false);
  const [mounted,setMounted]=useState(false);
  const messagesEndRef=useRef<HTMLDivElement>(null);
  const formRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{messagesEndRef.current?.scrollIntoView({behavior:'smooth'});},[messages]);
  useEffect(()=>{if(user)loadProjects();},[user]);
  useEffect(()=>{setTimeout(()=>setMounted(true),60);},[]);

  const loadProjects=async()=>{
    const{data}=await supabase.from('projects').select('*').eq('user_id',user!.id).order('created_at',{ascending:false});
    if(data)setProjects(data.map((p:any)=>({...emptyForm,id:p.id,name:p.name,emoji:p.emoji||'🚀',type:p.notes?.type||'',idea:p.notes?.idea||'',capital:p.notes?.capital||'',monthlyExpenses:p.notes?.monthlyExpenses||'',monthlyRevenue:p.notes?.monthlyRevenue||'',riskLevel:p.notes?.riskLevel||33,needs:p.notes?.needs||[],goal:p.notes?.goal||'',startTimeline:p.notes?.startTimeline||'',progress:p.notes?.progress||emptyForm.progress,analysis:p.notes?.analysis,expanded:false,createdAt:p.created_at})));
  };

  const analyzeProject=async():Promise<AIAnalysis|null>=>{
    if(!form.name)return null;
    setAnalyzing(true);
    try{
      const prompt=`حلل هذا المشروع وأعطني تقييماً دقيقاً:\nاسم المشروع: ${form.name}\nالنوع: ${form.type}\nالفكرة: ${form.idea}\nرأس المال: ${form.capital} د.ك\nالمصروف الشهري: ${form.monthlyExpenses} د.ك\nالإيراد المتوقع: ${form.monthlyRevenue} د.ك\nمستوى المخاطرة: ${riskInfo(form.riskLevel).label}\nالهدف: ${form.goal}\nوقت البدء: ${form.startTimeline}\n\nأجب فقط بـ JSON:\n{"score":75,"successRate":"70%","strengths":["قوة 1","قوة 2"],"weaknesses":["ضعف 1"],"suggestions":["اقتراح 1","اقتراح 2"],"marketStatus":"وصف السوق"}`;
      const res=await fetch('/api/projects-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}]})});
      const data=await res.json();
      const clean=(data.text||'').replace(/```json|```/g,'').trim();
      const s=clean.indexOf('{');const e=clean.lastIndexOf('}');
      if(s!==-1&&e!==-1)return JSON.parse(clean.slice(s,e+1));
    }catch{}
    setAnalyzing(false);return null;
  };

  const saveProject=async()=>{
    if(!form.name.trim())return;
    setSaving(true);
    const analysis=await analyzeProject();
    setAnalyzing(false);
    const notes={type:form.type,idea:form.idea,capital:form.capital,monthlyExpenses:form.monthlyExpenses,monthlyRevenue:form.monthlyRevenue,riskLevel:form.riskLevel,needs:form.needs,goal:form.goal,startTimeline:form.startTimeline,progress:form.progress,analysis};
    if(editingId&&user){
      await supabase.from('projects').update({name:form.name,emoji:form.emoji,budget:form.capital,timeline:form.startTimeline,notes}).eq('id',editingId);
      setProjects(prev=>prev.map(p=>p.id===editingId?{...form,id:editingId,analysis:analysis||p.analysis,expanded:p.expanded}:p));
      setEditingId(null);
    }else if(user){
      const{data}=await supabase.from('projects').insert({user_id:user.id,name:form.name,emoji:form.emoji,budget:form.capital,timeline:form.startTimeline,duration_unit:'month',steps:[],notes}).select().single();
      if(data)setProjects(prev=>[{...form,id:data.id,analysis:analysis||undefined,expanded:false},...prev]);
    }
    setForm(emptyForm);setShowForm(false);setSaving(false);setStep(0);
  };

  const removeProject=async(id:string)=>{
    if(user)await supabase.from('projects').delete().eq('id',id);
    setProjects(prev=>prev.filter(p=>p.id!==id));
  };

  const startEdit=(project:Project)=>{
    setForm({name:project.name,emoji:project.emoji,type:project.type,idea:project.idea,capital:project.capital,monthlyExpenses:project.monthlyExpenses,monthlyRevenue:project.monthlyRevenue,riskLevel:project.riskLevel,needs:project.needs,goal:project.goal,startTimeline:project.startTimeline,progress:project.progress});
    setEditingId(project.id);setShowForm(true);setStep(0);
    setTimeout(()=>formRef.current?.scrollIntoView({behavior:'smooth'}),100);
  };

  const toggleProgress=async(projectId:string,stepId:string)=>{
    setProjects(prev=>prev.map(p=>{
      if(p.id!==projectId)return p;
      const np={...p.progress,[stepId]:!p.progress[stepId]};
      supabase.from('projects').update({notes:{...p,progress:np,analysis:p.analysis}}).eq('id',projectId);
      return{...p,progress:np};
    }));
  };

  const sendMessage=async()=>{
    if(!input.trim()||isLoading)return;
    const userMsg=input.trim();setInput('');
    const newMsgs:Message[]=[...messages,{role:'user',content:userMsg}];
    setMessages(newMsgs);setIsLoading(true);
    try{
      const res=await fetch('/api/projects-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:newMsgs.map(m=>({role:m.role,content:m.content}))})});
      const data=await res.json();
      setMessages(prev=>[...prev,{role:'assistant',content:data.text||'عذراً، حدث خطأ.'}]);
    }catch{setMessages(prev=>[...prev,{role:'assistant',content:'عذراً، حدث خطأ.'}]);}
    setIsLoading(false);
  };

  const calcROI=(p:Project)=>{
    const cap=parseFloat(p.capital.replace(/[^\d.]/g,''))||0;
    const rev=parseFloat(p.monthlyRevenue.replace(/[^\d.]/g,''))||0;
    const exp=parseFloat(p.monthlyExpenses.replace(/[^\d.]/g,''))||0;
    const profit=rev-exp;
    if(cap>0&&profit>0)return{profit,months:Math.ceil(cap/profit),yearly:((profit*12/cap)*100).toFixed(1)};
    return null;
  };

  const S=(d:number)=>({opacity:mounted?1:0,transform:mounted?'translateY(0)':'translateY(18px)',transition:`opacity .5s ease ${d}ms, transform .5s ease ${d}ms`});
  const totalCapital=projects.reduce((s,p)=>s+(parseFloat(p.capital.replace(/[^\d.]/g,''))||0),0);
  const avgScore=projects.length>0?Math.round(projects.filter(p=>p.analysis).reduce((s,p)=>s+(p.analysis?.score||0),0)/Math.max(projects.filter(p=>p.analysis).length,1)):0;
  const STEPS_LABELS=['الأساسيات','التفاصيل المالية','الاحتياجات','المرحلة الحالية'];

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      .pp{font-family:'Tajawal',sans-serif;direction:rtl;background:#FAF8F2;min-height:100vh;color:#2B2118}
      .pp ::-webkit-scrollbar{width:4px;height:4px}.pp ::-webkit-scrollbar-thumb{background:rgba(200,169,107,.3);border-radius:10px}
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      .pcard{background:#fff;border:1px solid rgba(200,169,107,.18);border-radius:28px;box-shadow:0 8px 32px rgba(92,61,42,.06);transition:all .25s cubic-bezier(.4,0,.2,1)}
      .pcard:hover:not(.no-h){transform:translateY(-3px);box-shadow:0 20px 56px rgba(92,61,42,.11),0 0 0 1px rgba(200,169,107,.25)}
      .pcard.proj:hover{transform:translateY(-3px);box-shadow:0 20px 56px rgba(92,61,42,.11)!important}
      .need-chip{cursor:pointer;transition:all .15s;border:1.5px solid rgba(200,169,107,.22);border-radius:20px;padding:7px 13px;font-size:12.5px;font-weight:600;font-family:'Tajawal',sans-serif;background:transparent;color:#5C3D2A;display:inline-flex;align-items:center;gap:6px}
      .need-chip:hover{border-color:#C8A96B;background:rgba(200,169,107,.08)}
      .need-chip.active{background:linear-gradient(135deg,rgba(200,169,107,.18),rgba(200,169,107,.10));border-color:#C8A96B;color:#8A6D2A}
      .sf-input{width:100%;background:#FAFAF7;border:1.5px solid #E8E2D6;border-radius:12px;padding:12px 14px;font-family:'Tajawal',sans-serif;font-size:15px;color:#2B2118;outline:none;transition:border-color .2s,box-shadow .2s}
      .sf-input:focus{border-color:#C8A96B;box-shadow:0 0 0 3px rgba(200,169,107,.12)}
      .sf-select{appearance:none;-webkit-appearance:none;width:100%;background:#FAFAF7 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23C8A96B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat left 14px center;border:1.5px solid #E8E2D6;border-radius:12px;padding:12px 14px 12px 36px;font-family:'Tajawal',sans-serif;font-size:15px;color:#2B2118;outline:none;cursor:pointer;transition:border-color .2s}
      .sf-select:focus{border-color:#C8A96B;box-shadow:0 0 0 3px rgba(200,169,107,.12)}
      .btn-g{background:linear-gradient(135deg,#C8A96B,#A8873E);color:#1a0f00;border:none;border-radius:14px;padding:13px 26px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap;display:inline-flex;align-items:center;gap:8px}
      .btn-g:hover:not(:disabled){background:linear-gradient(135deg,#D4AF37,#C49B3A);box-shadow:0 6px 20px rgba(212,175,55,.35);transform:translateY(-1px)}
      .btn-g:disabled{opacity:.55;cursor:not-allowed}
      .btn-dark{background:#1B2430;color:#fff;border:none;border-radius:14px;padding:13px 26px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap;display:inline-flex;align-items:center;gap:8px}
      .btn-dark:hover{background:#2C3444;transform:translateY(-1px)}
      .btn-o{background:transparent;border:1.5px solid rgba(200,169,107,.35);border-radius:14px;padding:12px 22px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;color:#5C3D2A}
      .btn-o:hover{background:rgba(200,169,107,.09);border-color:#C8A96B}
      @media(max-width:900px){.pg2{grid-template-columns:1fr 1fr!important}.pg3{grid-template-columns:1fr 1fr!important}.pg4{grid-template-columns:1fr 1fr!important}}
      @media(max-width:600px){.pg2{grid-template-columns:1fr!important}.pg3{grid-template-columns:1fr!important}.pg4{grid-template-columns:1fr 1fr!important}.hero-pad{padding:28px 22px!important}}
    `}</style>

    <div className="pp">
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'20px 20px 80px'}}>

        {/* ═══ HERO ═══ */}
        <div style={{...S(0),marginBottom:'24px',background:'linear-gradient(145deg,#2B2118 0%,#3D2B1A 45%,#4A3420 70%,#2B2118 100%)',borderRadius:'32px',border:'1px solid rgba(200,169,107,.22)',position:'relative',overflow:'hidden'}} className="pcard no-h">
          {/* Orbs */}
          <div style={{position:'absolute',top:'-80px',right:'-80px',width:'300px',height:'300px',background:'radial-gradient(circle,rgba(200,169,107,.16) 0%,transparent 70%)',pointerEvents:'none'}}/>
          <div style={{position:'absolute',bottom:'-60px',left:'5%',width:'240px',height:'240px',background:'radial-gradient(circle,rgba(200,169,107,.08) 0%,transparent 70%)',pointerEvents:'none'}}/>
          {[...Array(8)].map((_,i)=><div key={i} style={{position:'absolute',width:`${8+(i%3)*5}px`,height:`${8+(i%3)*5}px`,borderRadius:'50%',background:i%2===0?'rgba(200,169,107,.13)':'rgba(255,255,255,.06)',left:`${(i*23+4)%90}%`,top:`${(i*31+8)%85}%`,animation:`float ${4+i%3}s ease-in-out infinite`,animationDelay:`${i*.35}s`,filter:'blur(1px)',pointerEvents:'none'}}/>)}

          <div className="hero-pad" style={{padding:'48px 44px',position:'relative',zIndex:1}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:'20px'}}>
              <div style={{flex:1}}>
                {/* Back */}
                <button onClick={()=>router.push('/')} style={{display:'flex',alignItems:'center',gap:'6px',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.14)',borderRadius:'10px',padding:'7px 14px',color:'rgba(255,255,255,.7)',fontSize:'13px',fontWeight:'600',cursor:'pointer',marginBottom:'20px',fontFamily:'Tajawal,sans-serif'}}>
                  ← لوحة التحكم
                </button>
                <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(200,169,107,.14)',border:'1px solid rgba(200,169,107,.28)',borderRadius:'20px',padding:'6px 16px',marginBottom:'16px'}}>
                  <span>🚀</span>
                  <span style={{fontSize:'11.5px',fontWeight:'700',color:'#C8A96B',letterSpacing:'.06em'}}>SFM PROJECT MANAGER</span>
                </div>
                <h1 style={{fontSize:'clamp(24px,4vw,44px)',fontWeight:'900',color:'#fff',lineHeight:1.15,marginBottom:'10px',letterSpacing:'-0.02em'}}>مشاريعي المستقبلية</h1>
                <p style={{fontSize:'15px',color:'rgba(255,255,255,.55)',marginBottom:'28px',lineHeight:1.7}}>إدارة ذكية لمشاريعك مع تحليل AI شامل وتتبع التقدم</p>
                <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                  <button className="btn-g" onClick={()=>{setShowForm(!showForm);setStep(0);setEditingId(null);setForm(emptyForm);setTimeout(()=>formRef.current?.scrollIntoView({behavior:'smooth'}),100);}}>
                    + {showForm?'إغلاق النموذج':'مشروع جديد'}
                  </button>
                  <button className="btn-o" style={{color:'rgba(255,255,255,.7)',borderColor:'rgba(255,255,255,.2)'}} onClick={()=>document.getElementById('ai-chat')?.scrollIntoView({behavior:'smooth'})}>
                    🤖 المستشار الذكي
                  </button>
                </div>
              </div>
              {/* Stats */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'12px',flexShrink:0}}>
                {[
                  {label:'المشاريع',val:projects.length,color:'#C8A96B'},
                  {label:'إجمالي رأس المال',val:`${totalCapital.toLocaleString('ar-KW')} د.ك`,color:'#4ADE80'},
                  {label:'متوسط التقييم',val:projects.length>0?`${avgScore}/100`:'—',color:'#60A5FA'},
                  {label:'قيد التنفيذ',val:projects.filter(p=>Object.values(p.progress||{}).some(v=>v)).length,color:'#C084FC'},
                ].map((s,i)=>(
                  <div key={i} style={{background:'rgba(255,255,255,.07)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,.09)',borderRadius:'16px',padding:'16px 14px',textAlign:'center'}}>
                    <div style={{fontSize:'10px',color:'rgba(255,255,255,.4)',marginBottom:'6px',fontWeight:'500'}}>{s.label}</div>
                    <div style={{fontSize:'clamp(14px,1.8vw,20px)',fontWeight:'800',color:s.color,fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1}}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ CREATE / EDIT FORM ═══ */}
        {showForm&&(
          <div ref={formRef} style={{...S(40),marginBottom:'24px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
              <div style={{width:'4px',height:'22px',background:'linear-gradient(180deg,#C8A96B,#8A6D2A)',borderRadius:'4px'}}/>
              <h2 style={{fontSize:'19px',fontWeight:'800',color:'#2B2118',margin:0}}>{editingId?'تعديل المشروع':'مشروع جديد'}</h2>
            </div>
            <div className="pcard" style={{padding:'32px 36px'}}>
              <Steps current={step} total={4}/>

              {/* STEP 0: Basics */}
              {step===0&&(
                <div style={{display:'flex',flexDirection:'column',gap:'18px'}}>
                  <div>
                    <label style={{fontSize:'13.5px',fontWeight:'700',color:'#5C3D2A',display:'block',marginBottom:'8px'}}>اسم المشروع *</label>
                    <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                      {/* Emoji picker */}
                      <div style={{position:'relative',flexShrink:0}}>
                        <button style={{width:'52px',height:'52px',background:'#FAF8F2',border:'1.5px solid #E8E2D6',borderRadius:'14px',fontSize:'24px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}} onClick={(e)=>{e.preventDefault();const el=document.getElementById('emoji-grid');if(el)el.style.display=el.style.display==='grid'?'none':'grid';}}>
                          {form.emoji}
                        </button>
                        <div id="emoji-grid" style={{display:'none',position:'absolute',top:'56px',right:0,zIndex:100,background:'#fff',border:'1px solid #E8E2D6',borderRadius:'16px',padding:'12px',boxShadow:'0 16px 40px rgba(27,36,48,.12)',gridTemplateColumns:'repeat(5,1fr)',gap:'6px',width:'180px'}}>
                          {EMOJIS.map(e=><button key={e} onClick={()=>{setForm(f=>({...f,emoji:e}));const el=document.getElementById('emoji-grid');if(el)el.style.display='none';}} style={{background:'none',border:'none',fontSize:'20px',cursor:'pointer',padding:'5px',borderRadius:'8px',transition:'background .15s'}}>{e}</button>)}
                        </div>
                      </div>
                      <input className="sf-input" placeholder="مثال: كافيه الرياض" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={{height:'52px'}}/>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                    <div>
                      <label style={{fontSize:'13.5px',fontWeight:'700',color:'#5C3D2A',display:'block',marginBottom:'8px'}}>نوع المشروع</label>
                      <select className="sf-select" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                        <option value="">اختر النوع...</option>
                        {PROJECT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{fontSize:'13.5px',fontWeight:'700',color:'#5C3D2A',display:'block',marginBottom:'8px'}}>الهدف من المشروع</label>
                      <select className="sf-select" value={form.goal} onChange={e=>setForm(f=>({...f,goal:e.target.value}))}>
                        <option value="">اختر الهدف...</option>
                        {PROJECT_GOALS.map(g=><option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{fontSize:'13.5px',fontWeight:'700',color:'#5C3D2A',display:'block',marginBottom:'8px'}}>وقت البدء المتوقع</label>
                      <select className="sf-select" value={form.startTimeline} onChange={e=>setForm(f=>({...f,startTimeline:e.target.value}))}>
                        <option value="">متى تبدأ؟</option>
                        {START_TIMELINES.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{fontSize:'13.5px',fontWeight:'700',color:'#5C3D2A',display:'block',marginBottom:'8px'}}>فكرة المشروع</label>
                      <input className="sf-input" placeholder="وصف مختصر للفكرة..." value={form.idea} onChange={e=>setForm(f=>({...f,idea:e.target.value}))}/>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1: Financials */}
              {step===1&&(
                <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px'}} className="pg3">
                    {[
                      {key:'capital',label:'رأس المال المطلوب',icon:'💰',color:'#D4AF37'},
                      {key:'monthlyExpenses',label:'المصروفات الشهرية',icon:'🔥',color:'#EF4444'},
                      {key:'monthlyRevenue',label:'الإيراد الشهري المتوقع',icon:'📈',color:'#22C55E'},
                    ].map(f=>(
                      <div key={f.key}>
                        <label style={{fontSize:'13.5px',fontWeight:'700',color:'#5C3D2A',display:'block',marginBottom:'8px'}}>{f.icon} {f.label}</label>
                        <div style={{display:'flex',alignItems:'center',border:'1.5px solid #E8E2D6',borderRadius:'12px',overflow:'hidden',background:'#FAFAF7'}}>
                          <span style={{padding:'0 10px',fontSize:'12px',fontWeight:'700',color:f.color,borderLeft:'1px solid #E8E2D6',height:'48px',display:'flex',alignItems:'center',flexShrink:0,fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>د.ك</span>
                          <input type="text" placeholder="0.00" dir="ltr"
                            value={(form as any)[f.key]}
                            onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))}
                            style={{flex:1,height:'48px',padding:'0 12px',background:'transparent',border:'none',outline:'none',fontSize:'16px',fontWeight:'700',color:'#2B2118',fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* ROI preview */}
                  {form.capital&&form.monthlyRevenue&&(()=>{
                    const cap=parseFloat(form.capital)||0;
                    const rev=parseFloat(form.monthlyRevenue)||0;
                    const exp=parseFloat(form.monthlyExpenses)||0;
                    const profit=rev-exp;
                    if(cap>0&&profit>0){
                      const months=Math.ceil(cap/profit);
                      const roi=((profit*12/cap)*100).toFixed(1);
                      return(
                        <div style={{background:'rgba(34,197,94,.06)',border:'1.5px solid rgba(34,197,94,.2)',borderRadius:'16px',padding:'16px 20px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',textAlign:'center'}}>
                          {[{label:'الربح الشهري',val:`${profit.toFixed(3)} د.ك`,color:'#22C55E'},{label:'استرجاع رأس المال',val:`${months} شهر`,color:'#D4AF37'},{label:'العائد السنوي',val:`${roi}%`,color:'#3B82F6'}].map((r,i)=>(
                            <div key={i}><div style={{fontSize:'11px',color:'#8A9BB0',marginBottom:'4px'}}>{r.label}</div><div style={{fontSize:'17px',fontWeight:'800',color:r.color,fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{r.val}</div></div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {/* Risk slider */}
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                      <label style={{fontSize:'13.5px',fontWeight:'700',color:'#5C3D2A'}}>⚖️ مستوى المخاطرة</label>
                      <span style={{fontSize:'13px',fontWeight:'700',padding:'4px 12px',borderRadius:'20px',background:riskInfo(form.riskLevel).bg,color:riskInfo(form.riskLevel).color}}>{riskInfo(form.riskLevel).label} ({form.riskLevel})</span>
                    </div>
                    <input type="range" min={0} max={100} value={form.riskLevel} onChange={e=>setForm(f=>({...f,riskLevel:+e.target.value}))}
                      style={{width:'100%',height:'6px',borderRadius:'10px',accentColor:riskInfo(form.riskLevel).color,cursor:'pointer'}}/>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:'6px'}}>
                      {['منخفض','متوسط','عالي'].map(l=><span key={l} style={{fontSize:'11px',color:'#8A9BB0'}}>{l}</span>)}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Needs */}
              {step===2&&(
                <div>
                  <div style={{fontSize:'13.5px',color:'#8A9BB0',marginBottom:'16px'}}>اختر ما يحتاجه مشروعك (يمكن اختيار أكثر من واحد)</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                    {PROJECT_NEEDS.map(n=>{
                      const active=form.needs.includes(n.id);
                      return(
                        <button key={n.id} className={'need-chip'+(active?' active':'')}
                          onClick={()=>setForm(f=>({...f,needs:active?f.needs.filter(x=>x!==n.id):[...f.needs,n.id]}))}>
                          {n.icon} {n.label}
                          {active&&<span style={{marginRight:'4px',fontSize:'11px'}}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: Progress */}
              {step===3&&(
                <div>
                  <div style={{fontSize:'13.5px',color:'#8A9BB0',marginBottom:'16px'}}>حدد المراحل التي أتممتها</div>
                  <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                    {PROGRESS_STEPS.map((s,i)=>{
                      const done=form.progress[s.id];
                      return(
                        <div key={s.id} onClick={()=>setForm(f=>({...f,progress:{...f.progress,[s.id]:!f.progress[s.id]}}))}
                          style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 18px',borderRadius:'16px',border:`1.5px solid ${done?'rgba(34,197,94,.3)':'#E8E2D6'}`,background:done?'rgba(34,197,94,.05)':'#FAFAF7',cursor:'pointer',transition:'all .2s'}}>
                          <div style={{width:'36px',height:'36px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',background:done?'rgba(34,197,94,.12)':'rgba(200,169,107,.10)',border:`2px solid ${done?'#22C55E':'rgba(200,169,107,.3)'}`,flexShrink:0,transition:'all .2s'}}>{done?'✅':s.icon}</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:'14px',fontWeight:'700',color:done?'#22C55E':'#2B2118'}}>{s.label}</div>
                            <div style={{fontSize:'11.5px',color:'#8A9BB0',marginTop:'2px'}}>المرحلة {i+1} من 5</div>
                          </div>
                          <div style={{width:'20px',height:'20px',borderRadius:'50%',border:`2px solid ${done?'#22C55E':'#E8E2D6'}`,background:done?'#22C55E':'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'12px',flexShrink:0}}>{done&&'✓'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'28px',paddingTop:'20px',borderTop:'1px solid #E8E2D6'}}>
                <button className="btn-o" onClick={()=>step>0?setStep(s=>s-1):(setShowForm(false),setEditingId(null))} style={{padding:'10px 20px'}}>
                  {step>0?'← السابق':'إلغاء'}
                </button>
                <div style={{display:'flex',gap:'8px'}}>
                  {step<3?(
                    <button className="btn-dark" onClick={()=>setStep(s=>s+1)} disabled={step===0&&!form.name.trim()}>
                      التالي ←
                    </button>
                  ):(
                    <button className="btn-g" onClick={saveProject} disabled={saving||analyzing}>
                      {saving||analyzing?(
                        <><span style={{animation:'spin 1s linear infinite',display:'inline-block',borderRadius:'50%',border:'2px solid rgba(255,255,255,.25)',borderTopColor:'#fff',width:'16px',height:'16px'}}/> {analyzing?'تحليل AI...':'جارٍ الحفظ...'}</>
                      ):'💾 حفظ وتحليل'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ KPI CARDS ═══ */}
        {projects.length>0&&(
          <div style={{...S(80),marginBottom:'24px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
              <div style={{width:'4px',height:'22px',background:'linear-gradient(180deg,#C8A96B,#8A6D2A)',borderRadius:'4px'}}/>
              <h2 style={{fontSize:'19px',fontWeight:'800',color:'#2B2118',margin:0}}>لوحة المشاريع</h2>
              <span style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:'20px',background:'rgba(200,169,107,.12)',color:'#8A6D2A',fontSize:'11px',fontWeight:'700',marginRight:'auto'}}>{projects.length} مشروع</span>
            </div>
            <div className="pg4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px'}}>
              {[
                {icon:'🚀',label:'إجمالي المشاريع',val:projects.length,unit:'',color:'#C8A96B',bg:'rgba(200,169,107,.10)'},
                {icon:'💰',label:'رأس المال المُخطط',val:totalCapital>0?`${totalCapital.toLocaleString('ar-KW')}`:'-',unit:totalCapital>0?'د.ك':'',color:'#D4AF37',bg:'rgba(212,175,55,.10)'},
                {icon:'📊',label:'متوسط التقييم',val:avgScore>0?avgScore:'-',unit:avgScore>0?'/100':'',color:scoreColor(avgScore),bg:`${scoreColor(avgScore)}14`},
                {icon:'✅',label:'مشاريع نشطة',val:projects.filter(p=>Object.values(p.progress||{}).filter(Boolean).length>0).length,unit:'',color:'#22C55E',bg:'rgba(34,197,94,.10)'},
              ].map((k,i)=>(
                <div key={i} className="pcard" style={{padding:'20px 18px',textAlign:'center'}}>
                  <div style={{width:'42px',height:'42px',background:k.bg,borderRadius:'13px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',margin:'0 auto 14px'}}>{k.icon}</div>
                  <div style={{fontSize:'22px',fontWeight:'900',color:k.color,fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1}}>{k.val}<span style={{fontSize:'14px',fontWeight:'600',color:'#8A9BB0',marginRight:'3px'}}>{k.unit}</span></div>
                  <div style={{fontSize:'12px',fontWeight:'600',color:'#8A9BB0',marginTop:'6px'}}>{k.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ PROJECT CARDS ═══ */}
        {projects.length>0&&(
          <div style={{...S(140),marginBottom:'24px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
              <div style={{width:'4px',height:'22px',background:'linear-gradient(180deg,#C8A96B,#8A6D2A)',borderRadius:'4px'}}/>
              <h2 style={{fontSize:'19px',fontWeight:'800',color:'#2B2118',margin:0}}>مشاريعك</h2>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
              {projects.map(project=>{
                const roi=calcROI(project);
                const progressDone=Object.values(project.progress||{}).filter(Boolean).length;
                const progressTotal=Object.keys(project.progress||{}).length;
                const progressPct=progressTotal>0?Math.round((progressDone/progressTotal)*100):0;
                const ri=riskInfo(project.riskLevel);
                const sc=project.analysis?.score||0;
                return(
                  <div key={project.id} className="pcard proj" style={{overflow:'hidden'}}>
                    {/* Card Header */}
                    <div style={{padding:'22px 24px',cursor:'pointer',display:'flex',alignItems:'flex-start',gap:'16px'}}
                      onClick={()=>setProjects(prev=>prev.map(p=>p.id===project.id?{...p,expanded:!p.expanded}:p))}>
                      {/* Emoji */}
                      <div style={{width:'52px',height:'52px',background:'rgba(200,169,107,.12)',borderRadius:'16px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'26px',flexShrink:0,border:'1px solid rgba(200,169,107,.2)'}}>{project.emoji}</div>
                      {/* Main info */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px',flexWrap:'wrap'}}>
                          <h3 style={{fontSize:'17px',fontWeight:'800',color:'#2B2118',fontFamily:'Tajawal,sans-serif'}}>{project.name}</h3>
                          {project.type&&<span style={{fontSize:'11px',fontWeight:'700',padding:'3px 10px',borderRadius:'20px',background:'rgba(200,169,107,.10)',color:'#8A6D2A'}}>{project.type}</span>}
                          {project.startTimeline&&<span style={{fontSize:'11px',fontWeight:'600',padding:'3px 10px',borderRadius:'20px',background:'rgba(27,36,48,.06)',color:'#4A5568'}}>🕒 {project.startTimeline}</span>}
                        </div>
                        {/* Progress bar */}
                        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
                          <div style={{flex:1,height:'6px',background:'rgba(200,169,107,.12)',borderRadius:'10px',overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${progressPct}%`,background:progressPct===100?'#22C55E':'linear-gradient(90deg,#C8A96B,#D4AF37)',borderRadius:'10px',transition:'width 1s ease'}}/>
                          </div>
                          <span style={{fontSize:'12px',fontWeight:'700',color:'#8A9BB0',whiteSpace:'nowrap'}}>{progressPct}%</span>
                        </div>
                        {project.idea&&<p style={{fontSize:'13px',color:'#8A9BB0',lineHeight:1.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'400px'}}>{project.idea}</p>}
                      </div>
                      {/* Right side: score + actions */}
                      <div style={{display:'flex',alignItems:'center',gap:'12px',flexShrink:0}}>
                        {project.analysis&&(
                          <div style={{textAlign:'center'}}>
                            <div style={{fontSize:'11px',color:'#8A9BB0',marginBottom:'4px'}}>تقييم AI</div>
                            <div style={{width:'44px',height:'44px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:`3px solid ${scoreColor(sc)}`,background:`${scoreColor(sc)}12`}}>
                              <span style={{fontSize:'13px',fontWeight:'900',color:scoreColor(sc)}}>{sc}</span>
                            </div>
                          </div>
                        )}
                        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                          <button onClick={e=>{e.stopPropagation();startEdit(project);}} style={{width:'34px',height:'34px',background:'rgba(212,175,55,.10)',border:'1px solid rgba(212,175,55,.25)',borderRadius:'10px',cursor:'pointer',color:'#D4AF37',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center'}}><Pencil className="w-3.5 h-3.5"/></button>
                          <button onClick={e=>{e.stopPropagation();removeProject(project.id);}} style={{width:'34px',height:'34px',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:'10px',cursor:'pointer',color:'#EF4444',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                        {project.expanded?<ChevronUp className="w-5 h-5" style={{color:'#8A9BB0'}}/>:<ChevronDown className="w-5 h-5" style={{color:'#8A9BB0'}}/>}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {project.expanded&&(
                      <div style={{padding:'0 24px 24px',borderTop:'1px solid rgba(200,169,107,.12)'}}>
                        <div style={{paddingTop:'20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}} className="pg2">

                          {/* Financial KPIs */}
                          <div>
                            <div style={{fontSize:'13px',fontWeight:'700',color:'#5C3D2A',marginBottom:'12px'}}>💰 البيانات المالية</div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                              {[
                                {label:'رأس المال',val:project.capital,color:'#D4AF37',icon:'💰'},
                                {label:'مصروفات/شهر',val:project.monthlyExpenses,color:'#EF4444',icon:'🔥'},
                                {label:'إيراد/شهر',val:project.monthlyRevenue,color:'#22C55E',icon:'📈'},
                                roi&&{label:'استرجاع رأس المال',val:`${roi.months} شهر`,color:'#3B82F6',icon:'⏱'} || null,
                              ].filter(Boolean).map((f:any,i:number)=>(
                                <div key={i} style={{background:'#FAF8F2',borderRadius:'12px',padding:'12px',textAlign:'center',border:'1px solid rgba(200,169,107,.12)'}}>
                                  <div style={{fontSize:'16px',marginBottom:'4px'}}>{f.icon}</div>
                                  <div style={{fontSize:'10px',color:'#8A9BB0',marginBottom:'4px'}}>{f.label}</div>
                                  <div style={{fontSize:'14px',fontWeight:'800',color:f.color,fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{f.val||'-'}{f.val&&f.label!=='استرجاع رأس المال'&&<span style={{fontSize:'10px',fontWeight:'500',color:'#8A9BB0',marginRight:'3px'}}> د.ك</span>}</div>
                                </div>
                              ))}
                            </div>
                            {/* Risk gauge */}
                            <div style={{marginTop:'14px',background:'#FAF8F2',borderRadius:'14px',padding:'16px',textAlign:'center',border:`1px solid ${ri.bg}`}}>
                              <div style={{fontSize:'12px',color:'#8A9BB0',marginBottom:'10px'}}>مستوى المخاطرة</div>
                              <RiskGauge value={project.riskLevel}/>
                            </div>
                          </div>

                          {/* AI Analysis */}
                          {project.analysis&&(
                            <div>
                              <div style={{fontSize:'13px',fontWeight:'700',color:'#5C3D2A',marginBottom:'12px'}}>🤖 تحليل الذكاء الاصطناعي</div>
                              <div style={{background:'linear-gradient(135deg,#1B2430,#2C3444)',borderRadius:'16px',padding:'16px',marginBottom:'10px'}}>
                                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                                  <span style={{fontSize:'13px',fontWeight:'700',color:'rgba(255,255,255,.7)'}}>نسبة النجاح المتوقعة</span>
                                  <span style={{fontSize:'20px',fontWeight:'900',color:scoreColor(project.analysis.score),fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{project.analysis.successRate}</span>
                                </div>
                                {[
                                  {label:'نقاط القوة',items:project.analysis.strengths,color:'#22C55E',icon:'✅'},
                                  {label:'نقاط الضعف',items:project.analysis.weaknesses,color:'#EF4444',icon:'⚠️'},
                                  {label:'التوصيات',items:project.analysis.suggestions,color:'#D4AF37',icon:'💡'},
                                ].map((sec,i)=>(
                                  <div key={i} style={{marginBottom:'8px'}}>
                                    <div style={{fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,.5)',marginBottom:'4px'}}>{sec.icon} {sec.label}</div>
                                    {sec.items.map((item,j)=><div key={j} style={{fontSize:'12px',color:'rgba(255,255,255,.75)',padding:'3px 0',lineHeight:1.5}}>• {item}</div>)}
                                  </div>
                                ))}
                              </div>
                              {project.analysis.marketStatus&&(
                                <div style={{background:'rgba(200,169,107,.07)',border:'1px solid rgba(200,169,107,.2)',borderRadius:'12px',padding:'12px 14px'}}>
                                  <div style={{fontSize:'11px',fontWeight:'700',color:'#8A6D2A',marginBottom:'4px'}}>📊 حالة السوق</div>
                                  <div style={{fontSize:'12.5px',color:'#5C3D2A',lineHeight:1.6}}>{project.analysis.marketStatus}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Progress Steps */}
                        <div style={{marginTop:'20px',paddingTop:'20px',borderTop:'1px solid rgba(200,169,107,.10)'}}>
                          <div style={{fontSize:'13px',fontWeight:'700',color:'#5C3D2A',marginBottom:'12px'}}>📋 مراحل المشروع</div>
                          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                            {PROGRESS_STEPS.map(s=>{
                              const done=project.progress?.[s.id];
                              return(
                                <button key={s.id} onClick={()=>toggleProgress(project.id,s.id)} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 14px',borderRadius:'20px',border:`1.5px solid ${done?'#22C55E':'#E8E2D6'}`,background:done?'rgba(34,197,94,.08)':'#FAFAF7',cursor:'pointer',fontSize:'12.5px',fontWeight:'600',color:done?'#22C55E':'#4A5568',fontFamily:'Tajawal,sans-serif',transition:'all .2s'}}>
                                  <span>{done?'✅':s.icon}</span> {s.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Needs */}
                        {project.needs&&project.needs.length>0&&(
                          <div style={{marginTop:'14px'}}>
                            <div style={{fontSize:'13px',fontWeight:'700',color:'#5C3D2A',marginBottom:'10px'}}>⚡ الاحتياجات</div>
                            <div style={{display:'flex',flexWrap:'wrap',gap:'7px'}}>
                              {project.needs.map(nid=>{const n=PROJECT_NEEDS.find(x=>x.id===nid);return n&&<span key={nid} style={{display:'inline-flex',alignItems:'center',gap:'5px',padding:'5px 12px',borderRadius:'20px',background:'rgba(200,169,107,.10)',border:'1px solid rgba(200,169,107,.22)',fontSize:'12px',fontWeight:'600',color:'#5C3D2A'}}>{n.icon} {n.label}</span>;})}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {projects.length===0&&!showForm&&(
          <div style={{...S(80),marginBottom:'24px'}}>
            <div className="pcard" style={{padding:'60px 40px',textAlign:'center'}}>
              <div style={{fontSize:'60px',marginBottom:'20px'}}>🚀</div>
              <h3 style={{fontSize:'22px',fontWeight:'800',color:'#2B2118',marginBottom:'10px'}}>لا توجد مشاريع بعد</h3>
              <p style={{fontSize:'14px',color:'#8A9BB0',marginBottom:'24px',lineHeight:1.7}}>أضف مشروعك الأول واحصل على تحليل AI شامل لفرص النجاح</p>
              <button className="btn-g" onClick={()=>setShowForm(true)}>+ أضف مشروعك الأول</button>
            </div>
          </div>
        )}

        {/* ═══ AI CHAT ═══ */}
        <div id="ai-chat" style={{...S(200)}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
            <div style={{width:'4px',height:'22px',background:'linear-gradient(180deg,#C8A96B,#8A6D2A)',borderRadius:'4px'}}/>
            <h2 style={{fontSize:'19px',fontWeight:'800',color:'#2B2118',margin:0}}>المستشار الذكي للمشاريع</h2>
            <span style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:'20px',background:'rgba(192,132,252,.12)',color:'#9333EA',fontSize:'11px',fontWeight:'700'}}>🤖 AI</span>
          </div>
          <div className="pcard" style={{padding:0,overflow:'hidden'}}>
            {/* Header */}
            <div style={{background:'linear-gradient(135deg,#2B2118,#3D2B1A)',padding:'18px 24px',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'40px',height:'40px',background:'rgba(200,169,107,.18)',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',border:'1px solid rgba(200,169,107,.3)',flexShrink:0}}>🤖</div>
              <div>
                <div style={{fontSize:'14px',fontWeight:'800',color:'#fff'}}>SFM Project Advisor</div>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,.45)'}}>مستشار مشاريع متخصص • متاح 24/7</div>
              </div>
              <div style={{marginRight:'auto',display:'flex',alignItems:'center',gap:'5px'}}>
                <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#22C55E',animation:'pulse 1.5s infinite'}}/>
                <span style={{fontSize:'11px',color:'#22C55E',fontWeight:'600'}}>متصل</span>
              </div>
            </div>
            {/* Quick questions */}
            <div style={{padding:'14px 22px 0',display:'flex',gap:'8px',flexWrap:'wrap',borderBottom:'1px solid rgba(200,169,107,.10)',paddingBottom:'14px'}}>
              {['كيف أبدأ مشروعي؟','ما أفضل مشروع بـ 5000 د.ك؟','كيف أحسب الجدوى؟'].map((q,i)=>(
                <button key={i} onClick={()=>setInput(q)} style={{background:'#FAF8F2',border:'1px solid rgba(200,169,107,.22)',borderRadius:'20px',padding:'6px 13px',fontSize:'12px',fontWeight:'600',color:'#5C3D2A',cursor:'pointer',fontFamily:'Tajawal,sans-serif',transition:'all .15s'}}>{q}</button>
              ))}
            </div>
            {/* Messages */}
            <div style={{maxHeight:'340px',overflowY:'auto',display:'flex',flexDirection:'column',gap:'12px',padding:'18px 22px'}}>
              {messages.map((msg,i)=>(
                <div key={i} style={{display:'flex',justifyContent:msg.role==='user'?'flex-start':'flex-end',gap:'8px',alignItems:'flex-end'}}>
                  {msg.role==='assistant'&&<div style={{width:'28px',height:'28px',background:'rgba(200,169,107,.14)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',flexShrink:0}}>🤖</div>}
                  <div style={{maxWidth:'78%',padding:'11px 15px',borderRadius:msg.role==='assistant'?'18px 18px 18px 4px':'18px 18px 4px 18px',background:msg.role==='assistant'?'#fff':'linear-gradient(135deg,#C8A96B,#A8873E)',border:msg.role==='assistant'?'1px solid rgba(200,169,107,.18)':'none',color:msg.role==='assistant'?'#2B2118':'#1a0f00',fontSize:'13.5px',lineHeight:1.65,boxShadow:'0 2px 8px rgba(0,0,0,.05)',whiteSpace:'pre-wrap'}}>{msg.content}</div>
                </div>
              ))}
              {isLoading&&<div style={{display:'flex',justifyContent:'flex-end',gap:'8px'}}><div style={{width:'28px',height:'28px',background:'rgba(200,169,107,.14)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px'}}>🤖</div><div style={{padding:'12px 16px',background:'#fff',border:'1px solid rgba(200,169,107,.18)',borderRadius:'18px 18px 18px 4px'}}><Loader2 className="w-4 h-4" style={{animation:'spin 1s linear infinite',color:'#C8A96B'}}/></div></div>}
              <div ref={messagesEndRef}/>
            </div>
            {/* Input */}
            <div style={{padding:'12px 22px 22px',borderTop:'1px solid rgba(200,169,107,.10)',display:'flex',gap:'10px'}}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()}
                placeholder="اسألني عن مشروعك، الجدوى، التمويل..."
                style={{flex:1,background:'#FAF8F2',border:'1.5px solid #E8E2D6',borderRadius:'14px',padding:'12px 16px',fontFamily:'Tajawal,sans-serif',fontSize:'14px',color:'#2B2118',outline:'none',transition:'border-color .2s'}}
                onFocus={e=>{e.currentTarget.style.borderColor='#C8A96B';e.currentTarget.style.boxShadow='0 0 0 3px rgba(200,169,107,.12)'}}
                onBlur={e=>{e.currentTarget.style.borderColor='#E8E2D6';e.currentTarget.style.boxShadow='none'}}/>
              <button className="btn-g" onClick={sendMessage} disabled={isLoading||!input.trim()} style={{padding:'12px 20px',borderRadius:'12px',flexShrink:0}}><Send className="w-4 h-4"/></button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </>);
}
