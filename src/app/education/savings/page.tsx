'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

function useCounter(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const steps = 60; let cur = 0;
    const inc = target / steps;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(cur));
    }, duration / steps);
    return () => clearInterval(t);
  }, [target, duration]);
  return val;
}

const SAVING_TYPES = [
  { icon:'💵', key:'savings', name:'حساب التوفير العادي', desc:'مثالي للبداية. سيولة فورية وأمان تام مع عائد ثابت منخفض المخاطر.', risk:'منخفض', riskColor:'#22C55E', riskBg:'rgba(34,197,94,.10)', returns:'2–4%', horizon:'1–3 سنوات', ai:'مناسب كقاعدة لصندوق الطوارئ', aiColor:'#22C55E', progress:72, g1:'#22C55E', g2:'#16A34A' },
  { icon:'📜', key:'certs', name:'شهادات الادخار', desc:'عائد أعلى مع التزام زمني. تحمي رأس مالك وتوفر ثباتاً أفضل.', risk:'منخفض', riskColor:'#22C55E', riskBg:'rgba(34,197,94,.10)', returns:'4–7%', horizon:'1–5 سنوات', ai:'خيار ممتاز لمن يريد الثبات', aiColor:'#22C55E', progress:58, g1:'#3B82F6', g2:'#2563EB' },
  { icon:'📈', key:'funds', name:'الصناديق الاستثمارية', desc:'تنويع تلقائي مع إدارة محترفة. أفضل نسبة عائد/مخاطرة على المدى المتوسط.', risk:'متوسط', riskColor:'#F59E0B', riskBg:'rgba(245,158,11,.10)', returns:'7–12%', horizon:'3–7 سنوات', ai:'الأعلى كفاءة للتنويع التلقائي', aiColor:'#D4AF37', progress:45, g1:'#F59E0B', g2:'#D97706' },
  { icon:'🛡', key:'ins', name:'التأمين على الحياة', desc:'حماية وادخار في آنٍ واحد. يضمن مستقبل عائلتك مع تراكم رأس المال.', risk:'منخفض', riskColor:'#22C55E', riskBg:'rgba(34,197,94,.10)', returns:'3–5%', horizon:'10+ سنوات', ai:'ضروري للحماية طويلة المدى', aiColor:'#22C55E', progress:30, g1:'#8B5CF6', g2:'#7C3AED' },
  { icon:'🏢', key:'re', name:'العقارات', desc:'أصل حقيقي بعائد إيجاري ثابت وارتفاع رأسمالي. أقوى أدوات بناء الثروة.', risk:'متوسط', riskColor:'#F59E0B', riskBg:'rgba(245,158,11,.10)', returns:'8–15%', horizon:'5–20 سنة', ai:'مثالي لبناء ثروة حقيقية', aiColor:'#D4AF37', progress:25, g1:'#EC4899', g2:'#BE185D' },
  { icon:'🥇', key:'gold', name:'الذهب والمعادن', desc:'تحوط ضد التضخم وأزمات العملة. ملاذ آمن لحفظ القيمة عبر الزمن.', risk:'متوسط', riskColor:'#F59E0B', riskBg:'rgba(245,158,11,.10)', returns:'5–10%', horizon:'3–10 سنوات', ai:'تحوط ممتاز لـ 10–15% من المحفظة', aiColor:'#D4AF37', progress:38, g1:'#D4AF37', g2:'#B8860B' },
  { icon:'💱', key:'fx', name:'العملات الأجنبية', desc:'تنويع العملة يحمي من تقلبات السوق المحلي ويفتح آفاق عالمية.', risk:'مرتفع', riskColor:'#EF4444', riskBg:'rgba(239,68,68,.10)', returns:'5–20%', horizon:'1–5 سنوات', ai:'للمستثمر المتمرس فقط', aiColor:'#EF4444', progress:20, g1:'#06B6D4', g2:'#0891B2' },
  { icon:'♻', key:'reinv', name:'إعادة الاستثمار', desc:'قوة الفائدة المركبة. إعادة الأرباح تضاعف الثروة تلقائياً بمرور الوقت.', risk:'متوسط', riskColor:'#F59E0B', riskBg:'rgba(245,158,11,.10)', returns:'10–18%', horizon:'5–15 سنة', ai:'السر الأكبر لبناء الثروة', aiColor:'#D4AF37', progress:55, g1:'#10B981', g2:'#059669' },
  { icon:'👥', key:'coop', name:'الجمعيات التعاونية', desc:'ادخار جماعي منظم بدعم مجتمعي. انضباط مالي طبيعي وبناء علاقات.', risk:'منخفض', riskColor:'#22C55E', riskBg:'rgba(34,197,94,.10)', returns:'3–6%', horizon:'1–3 سنوات', ai:'يبني الانضباط المالي بشكل طبيعي', aiColor:'#22C55E', progress:63, g1:'#F97316', g2:'#EA580C' },
];

const WEALTH_PATH = [
  { stage:1, icon:'💰', title:'صندوق الطوارئ', sub:'6 أشهر مصاريف', done:true },
  { stage:2, icon:'🏦', title:'التوفير الذكي', sub:'ادخار منهجي', done:true },
  { stage:3, icon:'📈', title:'الاستثمار', sub:'تنمية رأس المال', done:false },
  { stage:4, icon:'🏠', title:'الأصول', sub:'عقارات وأصول حقيقية', done:false },
  { stage:5, icon:'👑', title:'الحرية المالية', sub:'الاستقلال التام', done:false },
];

function Ring({ pct, g1, g2, id }: { pct:number; g1:string; g2:string; id:string }) {
  const r=20, c=2*Math.PI*r, dash=(pct/100)*c;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <defs><linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={g1}/><stop offset="100%" stopColor={g2}/>
      </linearGradient></defs>
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(0,0,0,.07)" strokeWidth="5"/>
      <circle cx="26" cy="26" r={r} fill="none" stroke={`url(#${id})`} strokeWidth="5"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 26 26)"
        style={{transition:'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s'}}/>
      <text x="26" y="30" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#2B2118">{pct}%</text>
    </svg>
  );
}

export default function SavingsPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(300);
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState<{role:'user'|'ai';text:string}[]>([
    {role:'ai', text:'مرحباً! أنا مستشارك المالي الذكي. كيف يمكنني مساعدتك في بناء ثروتك؟ 🤖'},
  ]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const yr1  = saving * 12;
  const yr5  = Math.round(saving * 12 * 5 * 1.055);
  const yr10 = Math.round(saving * 12 * 10 * 1.12);

  const cntScore  = useCounter(82);
  const cntSaving = useCounter(2400);
  const cntTarget = useCounter(50000);

  const handleChat = () => {
    if (!chatMsg.trim()) return;
    const q = chatMsg; setChatMsg('');
    setChatHistory(h => [...h, {role:'user', text:q}]);
    setTimeout(() => {
      setChatHistory(h => [...h, {role:'ai', text:
        q.includes('ذهب') ? '🥇 الذهب خيار ممتاز للتحوط — خصص 10–15% من محفظتك.' :
        q.includes('عقار') ? '🏢 العقار استثمار ممتاز طويل المدى مع دخل إيجاري ثابت.' :
        q.includes('صندوق') ? '📈 الصناديق الاستثمارية هي أفضل أداة للتنويع التلقائي.' :
        '💡 ابدأ بصندوق طوارئ 6 أشهر، ثم ادخر 20% من دخلك في صندوق استثماري متنوع.',
      }]);
    }, 650);
  };

  const S = (d:number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(22px)',
    transition: `opacity 0.5s ease ${d}ms, transform 0.5s ease ${d}ms`,
  });

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      .sp{font-family:'Tajawal',sans-serif;direction:rtl;background:#FAF8F2;min-height:100vh;color:#2B2118}
      .sp ::-webkit-scrollbar{width:4px;height:4px}.sp ::-webkit-scrollbar-thumb{background:rgba(200,169,107,.3);border-radius:10px}
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
      @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(200,169,107,0)}50%{box-shadow:0 0 0 8px rgba(200,169,107,.12)}}
      .card{background:#fff;border:1px solid rgba(200,169,107,.18);border-radius:28px;box-shadow:0 16px 50px rgba(92,61,42,.06);transition:all .25s cubic-bezier(.4,0,.2,1)}
      .card:hover:not(.no-hover){transform:translateY(-3px);box-shadow:0 24px 60px rgba(92,61,42,.11),0 0 0 1px rgba(200,169,107,.28)}
      .type-card{cursor:default;overflow:hidden;position:relative}
      .type-card:hover{transform:translateY(-4px)!important}
      .badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
      .btn-g{background:linear-gradient(135deg,#C8A96B,#A8873E);color:#1a0f00;border:none;border-radius:14px;padding:13px 26px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap}
      .btn-g:hover{background:linear-gradient(135deg,#D4AF37,#C49B3A);box-shadow:0 6px 20px rgba(212,175,55,.35);transform:translateY(-1px)}
      .btn-g:active{transform:scale(.97)}
      .btn-o{background:transparent;border:1.5px solid rgba(200,169,107,.35);border-radius:14px;padding:12px 22px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap}
      .btn-o:hover{background:rgba(200,169,107,.09);border-color:#C8A96B}
      .slider{-webkit-appearance:none;appearance:none;height:6px;border-radius:10px;background:linear-gradient(90deg,#D4AF37 var(--p),rgba(200,169,107,.18) var(--p));cursor:pointer;width:100%}
      .slider::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#D4AF37;box-shadow:0 2px 12px rgba(212,175,55,.4);cursor:pointer;transition:transform .15s}
      .slider::-webkit-slider-thumb:hover{transform:scale(1.15)}
      .chat-wrap{max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding:20px 24px}
      .chat-in{width:100%;background:#FAF8F2;border:1.5px solid rgba(200,169,107,.28);border-radius:14px;padding:12px 16px;font-family:'Tajawal',sans-serif;font-size:14px;color:#2B2118;outline:none;direction:rtl}
      .chat-in:focus{border-color:#D4AF37;box-shadow:0 0 0 3px rgba(212,175,55,.12)}
      @media(max-width:900px){.g3{grid-template-columns:1fr 1fr!important}.g4{grid-template-columns:1fr 1fr!important}}
      @media(max-width:600px){.g3{grid-template-columns:1fr!important}.g4{grid-template-columns:1fr 1fr!important}.hero-pad{padding:32px 24px!important}.hero-btns{flex-direction:column!important}.hero-m{grid-template-columns:1fr 1fr!important}.sim-g{grid-template-columns:1fr!important}}
      @media(max-width:400px){.g4{grid-template-columns:1fr!important}}
    `}</style>
    <div className="sp">
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'20px 20px 80px'}}>

        {/* Back */}
        <div style={{...S(0),marginBottom:'20px'}}>
          <button onClick={() => router.back()} className="btn-o" style={{color:'#5C3D2A',padding:'8px 18px',fontSize:'13px',borderRadius:'12px'}}>← العودة</button>
        </div>

        {/* ═══ HERO ═══ */}
        <div style={{...S(40),marginBottom:'24px',background:'linear-gradient(145deg,#2B2118 0%,#3D2B1A 45%,#4A3420 75%,#2B2118 100%)',border:'1px solid rgba(200,169,107,.22)',borderRadius:'32px',position:'relative',overflow:'hidden'}} className="card no-hover">
          {/* Orbs */}
          <div style={{position:'absolute',top:'-80px',right:'-80px',width:'320px',height:'320px',background:'radial-gradient(circle,rgba(200,169,107,.16) 0%,transparent 70%)',pointerEvents:'none'}}/>
          <div style={{position:'absolute',bottom:'-60px',left:'5%',width:'240px',height:'240px',background:'radial-gradient(circle,rgba(200,169,107,.08) 0%,transparent 70%)',pointerEvents:'none'}}/>
          {/* Particles */}
          {[...Array(10)].map((_,i) => (
            <div key={i} style={{position:'absolute',width:`${8+(i%3)*5}px`,height:`${8+(i%3)*5}px`,borderRadius:'50%',background:i%2===0?'rgba(200,169,107,.15)':'rgba(255,255,255,.07)',left:`${(i*19+4)%92}%`,top:`${(i*27+8)%88}%`,animation:`float ${4+i%3}s ease-in-out infinite`,animationDelay:`${i*0.35}s`,filter:'blur(1px)',pointerEvents:'none'}}/>
          ))}
          <div className="hero-pad" style={{padding:'52px 48px',position:'relative',zIndex:1}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(200,169,107,.14)',border:'1px solid rgba(200,169,107,.28)',borderRadius:'20px',padding:'6px 16px',marginBottom:'22px'}}>
              <span>✨</span>
              <span style={{fontSize:'11.5px',fontWeight:'700',color:'#D4AF37',letterSpacing:'.06em'}}>SFM WEALTH PLANNER</span>
            </div>
            <h1 style={{fontSize:'clamp(26px,4.5vw,50px)',fontWeight:'900',color:'#fff',lineHeight:1.15,marginBottom:'12px',letterSpacing:'-0.02em'}}>أنشئ مستقبل ثروتك</h1>
            <p style={{fontSize:'16px',color:'rgba(255,255,255,.58)',marginBottom:'34px',maxWidth:'500px',lineHeight:1.7}}>حوّل الادخار من عادة إلى نظام ذكي لبناء الثروة</p>
            {/* Metrics */}
            <div className="hero-m" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'34px'}}>
              {[
                {label:'ادخارك الحالي', val:`${cntSaving.toLocaleString('ar-KW')} د.ك`, color:'#D4AF37'},
                {label:'الهدف المستهدف', val:`${cntTarget.toLocaleString('ar-KW')} د.ك`, color:'#4ADE80'},
                {label:'الوقت المقدّر', val:'4.2 سنوات', color:'#60A5FA'},
                {label:'تقييم SFM AI', val:`${cntScore}/100`, color:'#C084FC'},
              ].map((m,i) => (
                <div key={i} style={{background:'rgba(255,255,255,.06)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,.09)',borderRadius:'18px',padding:'18px 14px',textAlign:'center'}}>
                  <div style={{fontSize:'10.5px',color:'rgba(255,255,255,.42)',marginBottom:'7px',fontWeight:'500'}}>{m.label}</div>
                  <div style={{fontSize:'clamp(14px,1.8vw,20px)',fontWeight:'800',color:m.color,fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1}}>{m.val}</div>
                </div>
              ))}
            </div>
            {/* Buttons */}
            <div className="hero-btns" style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
              <button className="btn-g" style={{fontSize:'15px',padding:'14px 32px',borderRadius:'16px',animation:'glow 2.5s infinite'}}>ابدأ الخطة ←</button>
              <button className="btn-o" style={{color:'rgba(255,255,255,.72)',borderColor:'rgba(255,255,255,.18)',fontSize:'14px'}}>🤖 تحليل الذكاء المالي</button>
              <button className="btn-o" style={{color:'rgba(255,255,255,.72)',borderColor:'rgba(255,255,255,.18)',fontSize:'14px'}}>+ إنشاء هدف جديد</button>
            </div>
          </div>
        </div>

        {/* ═══ WEALTH PATH ═══ */}
        <div style={{...S(100),marginBottom:'24px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'18px'}}>
            <div style={{width:'4px',height:'22px',background:'linear-gradient(180deg,#D4AF37,#C49B3A)',borderRadius:'4px'}}/>
            <h2 style={{fontSize:'19px',fontWeight:'800',color:'#2B2118',margin:0}}>مسار الثروة</h2>
          </div>
          <div className="card" style={{padding:'32px 36px',overflowX:'auto'}}>
            <div style={{display:'flex',alignItems:'center',minWidth:'600px'}}>
              {WEALTH_PATH.map((s,i) => (
                <div key={s.stage} style={{display:'flex',alignItems:'center',flex:i<WEALTH_PATH.length-1?'1':'none'}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px',flexShrink:0}}>
                    <div style={{width:'58px',height:'58px',borderRadius:'50%',background:s.done?'linear-gradient(135deg,#D4AF37,#C49B3A)':'rgba(200,169,107,.10)',border:s.done?'none':'2px dashed rgba(200,169,107,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',boxShadow:s.done?'0 4px 16px rgba(212,175,55,.22)':'none',transition:'all .3s'}}>{s.icon}</div>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:'13px',fontWeight:'800',color:s.done?'#2B2118':'#8A9BB0',whiteSpace:'nowrap'}}>{s.title}</div>
                      <div style={{fontSize:'11px',color:'#8A9BB0',marginTop:'2px',whiteSpace:'nowrap'}}>{s.sub}</div>
                      {s.done && <span className="badge" style={{background:'rgba(34,197,94,.10)',color:'#22C55E',marginTop:'6px'}}>✓ مكتمل</span>}
                    </div>
                  </div>
                  {i<WEALTH_PATH.length-1 && (
                    <div style={{flex:1,height:'2px',margin:'0 8px',marginBottom:'30px',background:WEALTH_PATH[i+1].done?'#D4AF37':'linear-gradient(90deg,#D4AF37,rgba(200,169,107,.2))'}}/>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ SAVING TYPES ═══ */}
        <div style={{...S(160),marginBottom:'24px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'18px'}}>
            <div style={{width:'4px',height:'22px',background:'linear-gradient(180deg,#D4AF37,#C49B3A)',borderRadius:'4px'}}/>
            <h2 style={{fontSize:'19px',fontWeight:'800',color:'#2B2118',margin:0}}>أدوات بناء الثروة</h2>
            <span className="badge" style={{background:'rgba(200,169,107,.12)',color:'#8A6D2A',marginRight:'auto'}}>9 أدوات</span>
          </div>
          <div className="g3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
            {SAVING_TYPES.map((t) => (
              <div key={t.key} className="card type-card" style={{padding:'24px'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'14px'}}>
                  <div style={{width:'48px',height:'48px',background:t.riskBg,borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',flexShrink:0}}>{t.icon}</div>
                  <Ring pct={t.progress} g1={t.g1} g2={t.g2} id={`r-${t.key}`}/>
                </div>
                <h3 style={{fontSize:'15px',fontWeight:'800',color:'#2B2118',marginBottom:'8px',lineHeight:1.3}}>{t.name}</h3>
                <p style={{fontSize:'12.5px',color:'#8A9BB0',lineHeight:1.65,marginBottom:'14px'}}>{t.desc}</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
                  <div style={{background:'#FAF8F2',borderRadius:'10px',padding:'8px 10px'}}>
                    <div style={{fontSize:'10px',color:'#8A9BB0',marginBottom:'2px'}}>العائد المتوقع</div>
                    <div style={{fontSize:'13px',fontWeight:'800',color:'#2B2118',fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{t.returns}</div>
                  </div>
                  <div style={{background:'#FAF8F2',borderRadius:'10px',padding:'8px 10px'}}>
                    <div style={{fontSize:'10px',color:'#8A9BB0',marginBottom:'2px'}}>الأفق الزمني</div>
                    <div style={{fontSize:'12px',fontWeight:'700',color:'#2B2118'}}>{t.horizon}</div>
                  </div>
                </div>
                <span className="badge" style={{background:t.riskBg,color:t.riskColor,marginBottom:'10px'}}>مخاطرة {t.risk}</span>
                <div style={{background:'rgba(200,169,107,.07)',border:'1px solid rgba(200,169,107,.18)',borderRadius:'10px',padding:'9px 12px',display:'flex',gap:'8px',marginTop:'8px'}}>
                  <span style={{fontSize:'13px',flexShrink:0}}>🤖</span>
                  <span style={{fontSize:'11.5px',color:t.aiColor,fontWeight:'600',lineHeight:1.5}}>{t.ai}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ SIMULATOR ═══ */}
        <div style={{...S(220),marginBottom:'24px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'18px'}}>
            <div style={{width:'4px',height:'22px',background:'linear-gradient(180deg,#D4AF37,#C49B3A)',borderRadius:'4px'}}/>
            <h2 style={{fontSize:'19px',fontWeight:'800',color:'#2B2118',margin:0}}>محاكي الثروة المستقبلية</h2>
          </div>
          <div className="card" style={{padding:'36px 40px'}}>
            {/* Slider */}
            <div style={{marginBottom:'30px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'12px'}}>
                <label style={{fontSize:'14px',fontWeight:'700',color:'#5C3D2A'}}>الادخار الشهري</label>
                <span style={{fontSize:'22px',fontWeight:'900',color:'#D4AF37',fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{saving.toLocaleString('ar-KW')} د.ك</span>
              </div>
              <input type="range" className="slider" min={50} max={2000} step={50} value={saving}
                onChange={e => setSaving(+e.target.value)}
                style={{'--p':`${((saving-50)/(2000-50))*100}%`} as React.CSSProperties}/>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',gap:'8px',flexWrap:'wrap'}}>
                {[100,300,500,1000].map(v => (
                  <button key={v} onClick={() => setSaving(v)} style={{padding:'5px 14px',borderRadius:'20px',border:'1.5px solid',borderColor:saving===v?'#D4AF37':'rgba(200,169,107,.25)',background:saving===v?'rgba(212,175,55,.12)':'transparent',color:saving===v?'#8A6D2A':'#8A9BB0',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:"'IBM Plex Sans Arabic',sans-serif",transition:'all .15s'}}>
                    {v} د.ك
                  </button>
                ))}
              </div>
            </div>
            {/* Results */}
            <div className="sim-g" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',marginBottom:'28px'}}>
              {[
                {label:'بعد سنة واحدة', val:yr1, color:'#3B82F6', icon:'📅', note:'بدون فائدة'},
                {label:'بعد 5 سنوات', val:yr5, color:'#D4AF37', icon:'⭐', note:'مع فائدة 5.5%'},
                {label:'بعد 10 سنوات', val:yr10, color:'#22C55E', icon:'🚀', note:'مع فائدة مركبة 12%'},
              ].map((r,i) => (
                <div key={i} style={{background:'linear-gradient(135deg,#FAF8F2,#F5F0E8)',border:'1px solid rgba(200,169,107,.18)',borderRadius:'20px',padding:'22px 18px',textAlign:'center'}}>
                  <div style={{fontSize:'24px',marginBottom:'8px'}}>{r.icon}</div>
                  <div style={{fontSize:'11px',color:'#8A9BB0',marginBottom:'6px',fontWeight:'500'}}>{r.label}</div>
                  <div style={{fontSize:'clamp(18px,2.5vw,28px)',fontWeight:'900',color:r.color,fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1}}>{r.val.toLocaleString('ar-KW')}</div>
                  <div style={{fontSize:'12px',color:'#8A9BB0',marginTop:'4px'}}>د.ك</div>
                  <div style={{fontSize:'10px',color:'#8A9BB0',marginTop:'4px',opacity:.7}}>{r.note}</div>
                </div>
              ))}
            </div>
            {/* Bar chart */}
            <div>
              <div style={{fontSize:'12.5px',color:'#8A9BB0',marginBottom:'12px',fontWeight:'500'}}>نمو الثروة المتراكم (مع الفائدة المركبة)</div>
              <div style={{display:'flex',gap:'10px',alignItems:'flex-end',height:'100px'}}>
                {[
                  {label:'1', v:yr1},
                  {label:'2', v:Math.round(yr1*2.11)},
                  {label:'3', v:Math.round(yr1*3.34)},
                  {label:'5', v:yr5},
                  {label:'7', v:Math.round(yr10*0.65)},
                  {label:'10', v:yr10},
                ].map((b,i) => (
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',height:'100%',justifyContent:'flex-end'}}>
                    <div style={{fontSize:'9px',color:'#8A9BB0',fontFamily:"'IBM Plex Sans Arabic',sans-serif",whiteSpace:'nowrap'}}>{(b.v/1000).toFixed(0)}K</div>
                    <div style={{width:'100%',borderRadius:'6px 6px 0 0',background:'linear-gradient(180deg,#D4AF37,#C49B3A)',height:`${Math.max((b.v/yr10)*80,4)}px`,transition:'height .8s cubic-bezier(.4,0,.2,1)',opacity:.45+i*.1}}/>
                    <div style={{fontSize:'9px',color:'#8A9BB0'}}>{b.label}س</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ AI ADVISOR ═══ */}
        <div style={{...S(280),marginBottom:'24px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'18px'}}>
            <div style={{width:'4px',height:'22px',background:'linear-gradient(180deg,#D4AF37,#C49B3A)',borderRadius:'4px'}}/>
            <h2 style={{fontSize:'19px',fontWeight:'800',color:'#2B2118',margin:0}}>مستشار الثروة الذكي</h2>
            <span className="badge" style={{background:'rgba(192,132,252,.12)',color:'#9333EA'}}>🤖 AI</span>
          </div>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            {/* Header */}
            <div style={{background:'linear-gradient(135deg,#2B2118,#3D2B1A)',padding:'18px 26px',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'42px',height:'42px',background:'rgba(212,175,55,.18)',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',border:'1px solid rgba(212,175,55,.3)',flexShrink:0}}>🤖</div>
              <div>
                <div style={{fontSize:'14px',fontWeight:'800',color:'#fff'}}>مستشار SFM الذكي</div>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,.45)'}}>متاح دائماً • ذكاء اصطناعي</div>
              </div>
              <div style={{marginRight:'auto',display:'flex',alignItems:'center',gap:'5px'}}>
                <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#22C55E',animation:'pulse-dot 1.5s infinite'}}/>
                <span style={{fontSize:'11px',color:'#22C55E',fontWeight:'600'}}>متصل</span>
              </div>
            </div>
            {/* Chat */}
            <div className="chat-wrap">
              {chatHistory.map((msg,i) => (
                <div key={i} style={{display:'flex',justifyContent:msg.role==='user'?'flex-start':'flex-end',gap:'8px',alignItems:'flex-end'}}>
                  {msg.role==='ai' && <div style={{width:'30px',height:'30px',background:'rgba(212,175,55,.14)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',flexShrink:0}}>🤖</div>}
                  <div style={{maxWidth:'78%',padding:'11px 15px',borderRadius:msg.role==='ai'?'18px 18px 18px 4px':'18px 18px 4px 18px',background:msg.role==='ai'?'#fff':'linear-gradient(135deg,#D4AF37,#C49B3A)',border:msg.role==='ai'?'1px solid rgba(200,169,107,.18)':'none',color:msg.role==='ai'?'#2B2118':'#1a0f00',fontSize:'13.5px',lineHeight:1.6,fontWeight:msg.role==='user'?'600':'400',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>{msg.text}</div>
                </div>
              ))}
            </div>
            {/* Quick questions */}
            <div style={{padding:'0 24px',display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'14px'}}>
              {['سؤال عن الذهب','أفضل صندوق استثماري','العقار أم الأسهم'].map((q,i) => (
                <button key={i} onClick={() => { setChatMsg(q); }} style={{background:'#FAF8F2',border:'1px solid rgba(200,169,107,.22)',borderRadius:'20px',padding:'5px 12px',fontSize:'11.5px',fontWeight:'600',color:'#5C3D2A',cursor:'pointer',fontFamily:'Tajawal,sans-serif',transition:'all .15s'}}>{q}</button>
              ))}
            </div>
            {/* Input */}
            <div style={{padding:'12px 24px 24px',borderTop:'1px solid rgba(200,169,107,.12)',display:'flex',gap:'10px'}}>
              <input className="chat-in" value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => e.key==='Enter' && handleChat()}
                placeholder="اسألني عن ادخارك واستثمارك..."/>
              <button className="btn-g" onClick={handleChat} style={{padding:'12px 20px',borderRadius:'12px',flexShrink:0}}>إرسال</button>
            </div>
          </div>
        </div>

        {/* ═══ WEALTH DASHBOARD ═══ */}
        <div style={{...S(340),marginBottom:'24px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'18px'}}>
            <div style={{width:'4px',height:'22px',background:'linear-gradient(180deg,#D4AF37,#C49B3A)',borderRadius:'4px'}}/>
            <h2 style={{fontSize:'19px',fontWeight:'800',color:'#2B2118',margin:0}}>لوحة الثروة</h2>
          </div>
          <div className="g4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px'}}>
            {[
              {label:'صندوق الطوارئ', pct:72, icon:'🛡', color:'#22C55E', g1:'#22C55E', g2:'#16A34A', sub:'مكتمل جزئياً'},
              {label:'الاستثمار', pct:18, icon:'📈', color:'#D4AF37', g1:'#D4AF37', g2:'#C49B3A', sub:'من المحفظة'},
              {label:'الادخار', pct:10, icon:'💰', color:'#3B82F6', g1:'#3B82F6', g2:'#2563EB', sub:'معدل شهري'},
              {label:'مؤشر الاستقرار', pct:88, icon:'⭐', color:'#C084FC', g1:'#C084FC', g2:'#9333EA', sub:'ممتاز'},
            ].map((k,i) => (
              <div key={i} className="card" style={{padding:'22px 18px',textAlign:'center'}}>
                <div style={{width:'44px',height:'44px',background:k.color+'18',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',margin:'0 auto 14px'}}>{k.icon}</div>
                <Ring pct={k.pct} g1={k.g1} g2={k.g2} id={`kpi-${i}`}/>
                <div style={{fontSize:'13px',fontWeight:'700',color:'#2B2118',marginTop:'10px'}}>{k.label}</div>
                <div style={{fontSize:'11px',color:'#8A9BB0',marginTop:'3px'}}>{k.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ CTA ═══ */}
        <div style={S(400)}>
          <div className="card no-hover" style={{background:'linear-gradient(135deg,#2B2118,#3D2B1A)',padding:'44px 48px',textAlign:'center',border:'1px solid rgba(200,169,107,.22)',borderRadius:'32px'}}>
            <div style={{fontSize:'36px',marginBottom:'16px'}}>🚀</div>
            <h3 style={{fontSize:'clamp(20px,3vw,28px)',fontWeight:'900',color:'#fff',marginBottom:'10px'}}>ابدأ رحلة ثروتك اليوم</h3>
            <p style={{fontSize:'15px',color:'rgba(255,255,255,.52)',marginBottom:'28px',maxWidth:'440px',margin:'0 auto 28px',lineHeight:1.7}}>كل يوم تأخير يكلفك أكثر مما تتخيل. الوقت هو أقوى أدواتك.</p>
            <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
              <button className="btn-g" style={{fontSize:'15px',padding:'14px 36px'}}>ابدأ خطتك الآن</button>
              <button className="btn-o" style={{color:'rgba(255,255,255,.72)',borderColor:'rgba(255,255,255,.2)',fontSize:'14px'}}>اكتشف المزيد</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </>);
}
