'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/* ─── Animated Counter ─── */
function useCounter(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  const r = useRef(false);
  useEffect(() => {
    if (r.current) return; r.current = true;
    const steps = 60; let cur = 0; const inc = target / steps;
    const t = setInterval(() => { cur += inc; if (cur >= target) { setVal(target); clearInterval(t); } else setVal(Math.floor(cur)); }, duration / steps);
    return () => clearInterval(t);
  }, [target, duration]);
  return val;
}

/* ─── SVG Donut ─── */
function Donut({ data }: { data: { color: string; pct: number; label: string }[] }) {
  const r = 54, cx = 70, cy = 70, circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      {data.map((d, i) => {
        const dash = (d.pct / 100) * circ;
        const gap = circ - dash;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth="18"
            strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: `stroke-dasharray 1.2s ease ${i * 0.15}s` }} />
        );
        offset += dash;
        return el;
      })}
      <circle cx={cx} cy={cy} r={r - 10} fill="white" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="900" fill="#2B2118">62</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#8A9BB0">risk</text>
    </svg>
  );
}

/* ─── Progress Ring ─── */
function Ring({ pct, g1, g2, id }: { pct: number; g1: string; g2: string; id: string }) {
  const r = 20, c = 2 * Math.PI * r, dash = (pct / 100) * c;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <defs><linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={g1} /><stop offset="100%" stopColor={g2} />
      </linearGradient></defs>
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(0,0,0,.07)" strokeWidth="5" />
      <circle cx="26" cy="26" r={r} fill="none" stroke={`url(#${id})`} strokeWidth="5"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 26 26)"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s' }} />
      <text x="26" y="30" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#2B2118">{pct}</text>
    </svg>
  );
}

/* ─── Bar Chart ─── */
function BarChart({ data }: { data: { label: string; val: number; max: number; color: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', height: '100px' }}>
      {data.map((b, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: '9px', color: '#8A9BB0', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{(b.val / 1000).toFixed(0)}K</div>
          <div style={{ width: '100%', borderRadius: '6px 6px 0 0', background: `linear-gradient(180deg,${b.color},${b.color}88)`, height: `${Math.max((b.val / b.max) * 80, 4)}px`, transition: 'height .9s cubic-bezier(.4,0,.2,1)', opacity: 0.65 + i * 0.07 }} />
          <div style={{ fontSize: '9px', color: '#8A9BB0' }}>{b.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Data ─── */
const INVESTMENTS = [
  { icon: '📈', key: 'stocks', name: 'الأسهم', name_en: 'Stocks', desc: 'ملكية في شركات حقيقية مع إمكانية نمو رأس المال وتوزيعات الأرباح السنوية.', risk: 'متوسطة', riskColor: '#F59E0B', riskBg: 'rgba(245,158,11,.10)', returns: '8–15%', horizon: '3–7 سنوات', aiScore: 78, g1: '#F59E0B', g2: '#D97706', progress: 78 },
  { icon: '🏦', key: 'funds', name: 'الصناديق الاستثمارية', name_en: 'Investment Funds', desc: 'تنويع تلقائي مع إدارة احترافية. أفضل خيار للمستثمر المبتدئ والمتوسط.', risk: 'منخفضة', riskColor: '#22C55E', riskBg: 'rgba(34,197,94,.10)', returns: '6–12%', horizon: '3–5 سنوات', aiScore: 92, g1: '#22C55E', g2: '#16A34A', progress: 92 },
  { icon: '📜', key: 'bonds', name: 'الصكوك والسندات', name_en: 'Bonds & Sukuk', desc: 'دخل ثابت ومنتظم مع حماية رأس المال. مثالي للمحافظين وكبار السن.', risk: 'منخفضة', riskColor: '#22C55E', riskBg: 'rgba(34,197,94,.10)', returns: '3–6%', horizon: '1–5 سنوات', aiScore: 85, g1: '#3B82F6', g2: '#2563EB', progress: 85 },
  { icon: '🏠', key: 'realestate', name: 'العقار', name_en: 'Real Estate', desc: 'أصل حقيقي بدخل إيجاري ثابت وارتفاع رأسمالي تاريخي على المدى البعيد.', risk: 'منخفضة-متوسطة', riskColor: '#22C55E', riskBg: 'rgba(34,197,94,.10)', returns: '8–14%', horizon: '5–20 سنة', aiScore: 88, g1: '#EC4899', g2: '#BE185D', progress: 88 },
  { icon: '🥇', key: 'gold', name: 'الذهب والمعادن', name_en: 'Gold & Metals', desc: 'تحوط ضد التضخم وعدم الاستقرار. ملاذ آمن تاريخي يحفظ القيمة على المدى البعيد.', risk: 'متوسطة', riskColor: '#F59E0B', riskBg: 'rgba(245,158,11,.10)', returns: '5–10%', horizon: '3–10 سنوات', aiScore: 82, g1: '#C8A96B', g2: '#8A6D2A', progress: 82 },
  { icon: '🚀', key: 'startup', name: 'المشاريع الصغيرة', name_en: 'Small Businesses', desc: 'عوائد مرتفعة محتملة مع خبرة عملية وتأثير مباشر على الاقتصاد المحلي.', risk: 'عالية', riskColor: '#EF4444', riskBg: 'rgba(239,68,68,.10)', returns: '15–30%', horizon: '3–7 سنوات', aiScore: 58, g1: '#F97316', g2: '#EA580C', progress: 58 },
  { icon: '🎓', key: 'education', name: 'التعليم والمهارات', name_en: 'Education & Skills', desc: 'أفضل استثمار في نفسك. يرفع قيمتك السوقية ودخلك المستقبلي بشكل دائم.', risk: 'منخفضة جداً', riskColor: '#22C55E', riskBg: 'rgba(34,197,94,.10)', returns: '20–50%', horizon: '1–3 سنوات', aiScore: 95, g1: '#8B5CF6', g2: '#7C3AED', progress: 95 },
  { icon: '💎', key: 'crypto', name: 'العملات الرقمية', name_en: 'Cryptocurrency', desc: 'فئة أصول جديدة عالية التقلب. إمكانية عوائد استثنائية مع مخاطر مقابلة عالية.', risk: 'عالية جداً', riskColor: '#EF4444', riskBg: 'rgba(239,68,68,.10)', returns: '−50% – +500%', horizon: '1–5 سنوات', aiScore: 42, g1: '#06B6D4', g2: '#0891B2', progress: 42 },
];

const DONUT_DATA = [
  { label: 'أسهم', color: '#F59E0B', pct: 35 },
  { label: 'عقار', color: '#EC4899', pct: 25 },
  { label: 'صناديق', color: '#22C55E', pct: 20 },
  { label: 'ذهب', color: '#C8A96B', pct: 12 },
  { label: 'أخرى', color: '#8B5CF6', pct: 8 },
];

const WEALTH_PATH = [
  { icon: '🌱', title: 'مبتدئ', sub: 'أولى خطواتك', done: true },
  { icon: '💰', title: 'مدخر', sub: 'تراكم رأس المال', done: true },
  { icon: '📈', title: 'مستثمر', sub: 'نمو نشط', done: false },
  { icon: '🏠', title: 'مالك أصول', sub: 'دخل سلبي', done: false },
  { icon: '👑', title: 'حر مالياً', sub: 'الاستقلال التام', done: false },
];

const AI_MESSAGES = [
  { icon: '📊', text: 'محفظتك تفتقر للتنويع — 70% في أصل واحد يزيد المخاطر. أضف صناديق استثمارية.' },
  { icon: '🥇', text: 'اقتصادك المحلي يمر بضغوط تضخمية — خصص 10-15% للذهب كتحوط فوري.' },
  { icon: '📈', text: 'العوائد المتوقعة أعلى 12% مع محفظة متوازنة من الأسهم + الصكوك + العقار.' },
  { icon: '⚖️', text: 'مؤشر خطرك 62/100 — قابل للتخفيض إلى 45 بإضافة أصول ذات دخل ثابت.' },
];

/* ══════════════════════════════════
   MAIN PAGE
══════════════════════════════════ */

/* ── Inline language pill for standalone pages ── */
function useLang() {
  const [lang, setLang] = React.useState<'ar'|'en'|'fr'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('sfm_lang') as 'ar'|'en'|'fr') || 'ar';
    return 'ar';
  });
  const change = (l: 'ar'|'en'|'fr') => { setLang(l); if (typeof window !== 'undefined') localStorage.setItem('sfm_lang', l); };
  return { lang, change, isAr: lang==='ar', isFr: lang==='fr' };
}

function LangPill() {
  const [lang, setLangState] = React.useState<'ar'|'en'|'fr'>('ar');
  React.useEffect(() => {
    const stored = localStorage.getItem('sfm_lang') as 'ar'|'en'|'fr' | null;
    if (stored) setLangState(stored);
  }, []);
  const setL = (l: 'ar'|'en'|'fr') => { setLangState(l); localStorage.setItem('sfm_lang', l); };
  const idx = ['ar','en','fr'].indexOf(lang);
  return (
    <div dir="ltr" style={{display:'inline-flex',alignItems:'center',background:'#FFFFFF',borderRadius:'40px',padding:'3px',border:'1.5px solid #E8E2D6',position:'relative',minWidth:'126px',boxShadow:'0 2px 12px rgba(27,36,48,0.10)'}}>
      <span style={{position:'absolute',top:'3px',left:`calc(3px + ${idx} * 33.33%)`,width:'calc(33.33%)',height:'calc(100% - 6px)',background:'#1B2430',borderRadius:'36px',transition:'left 0.22s cubic-bezier(0.4,0,0.2,1)',pointerEvents:'none',zIndex:1}}/>
      {([{id:'ar',label:'عربي'},{id:'en',label:'EN'},{id:'fr',label:'FR'}] as const).map(l => (
        <button key={l.id} onClick={() => setL(l.id)} style={{position:'relative',zIndex:2,flex:1,height:'28px',padding:'0 4px',background:'transparent',border:'none',borderRadius:'36px',cursor:'pointer',fontSize:'11.5px',fontWeight:lang===l.id?'700':'500',color:lang===l.id?'#FFFFFF':'#8A9BB0',fontFamily:l.id==='ar'?"'Tajawal',sans-serif":"-apple-system,sans-serif",transition:'color 0.18s ease',whiteSpace:'nowrap'}}>
          {l.label}
        </button>
      ))}
    </div>
  );
}

export default function InvestmentsPage() {
  const router = useRouter();
  const [chatMsg, setChatMsg] = useState('');
  const [saving, setSaving] = useState(500);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'مرحباً! أنا مستشارك الاستثماري الذكي. أخبرني عن أهدافك المالية وسأبني لك محفظة مثالية 🤖' },
  ]);
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatHistory]);

  const wealth = useCounter(19000);
  const goal = useCounter(80000);
  const riskScore = useCounter(62);
  const yr1 = saving * 12;
  const yr5 = Math.round(saving * 12 * 5 * 1.10);
  const yr10 = Math.round(saving * 12 * 10 * 1.22);

  const handleChat = () => {
    if (!chatMsg.trim()) return;
    const q = chatMsg; setChatMsg('');
    setChatHistory(h => [...h, { role: 'user', text: q }]);
    setTimeout(() => {
      setChatHistory(h => [...h, {
        role: 'ai',
        text: q.includes('أسهم') || q.includes('سهم') ? '📈 الأسهم الكويتية تتمتع بعوائد توزيعات مرتفعة نسبياً. أنصح بالتركيز على البنوك الإسلامية وشركات الاتصالات كمحور أساسي.' :
          q.includes('ذهب') ? '🥇 الذهب الآن عند مستويات تاريخية مرتفعة. لا تزيد حصته عن 15% من محفظتك — استخدمه للتحوط لا للمضاربة.' :
          q.includes('عقار') ? '🏠 العقار الكويتي يشهد طلباً قوياً في المناطق المطورة. العائد الإيجاري يتراوح 5-8% سنوياً مع نمو رأسمالي محتمل.' :
          q.includes('كريبتو') || q.includes('بيتكوين') ? '💎 العملات الرقمية شديدة التقلب. إن كنت مصراً، لا تتجاوز 5% من محفظتك وتقبّل احتمال خسارة المبلغ كاملاً.' :
          '💡 توصيتي: ابدأ بصندوق استثماري متنوع (40%) + أسهم محلية (30%) + ذهب (15%) + سيولة (15%). هذا التوزيع يوازن بين النمو والحماية.',
      }]);
    }, 700);
  };

  const S = (d: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity 0.5s ease ${d}ms, transform 0.5s ease ${d}ms`,
  });

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      .ip{font-family:'Tajawal',sans-serif;direction:rtl;background:#FAF8F2;min-height:100vh;color:#2B2118}
      .ip ::-webkit-scrollbar{width:4px}.ip ::-webkit-scrollbar-thumb{background:rgba(200,169,107,.3);border-radius:10px}
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(200,169,107,0)}50%{box-shadow:0 0 0 8px rgba(200,169,107,.12)}}
      .icard{background:#fff;border:1px solid rgba(200,169,107,.18);border-radius:28px;box-shadow:0 16px 50px rgba(92,61,42,.06);transition:all .25s cubic-bezier(.4,0,.2,1)}
      .icard:hover:not(.no-h){transform:translateY(-4px);box-shadow:0 24px 64px rgba(92,61,42,.12),0 0 0 1px rgba(200,169,107,.28)}
      .inv-card{cursor:default;overflow:hidden;position:relative}
      .inv-card::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(200,169,107,.06),transparent);opacity:0;transition:opacity .25s;border-radius:28px}
      .inv-card:hover::after{opacity:1}
      .badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
      .btn-g{background:linear-gradient(135deg,#C8A96B,#A8873E);color:#1a0f00;border:none;border-radius:14px;padding:13px 26px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap}
      .btn-g:hover{background:linear-gradient(135deg,#D4AF37,#C49B3A);box-shadow:0 6px 20px rgba(212,175,55,.35);transform:translateY(-1px)}
      .btn-o{background:transparent;border:1.5px solid rgba(200,169,107,.35);border-radius:14px;padding:12px 22px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s}
      .btn-o:hover{background:rgba(200,169,107,.09);border-color:#C8A96B}
      .islider{-webkit-appearance:none;appearance:none;height:6px;border-radius:10px;background:linear-gradient(90deg,#C8A96B var(--p),rgba(200,169,107,.18) var(--p));cursor:pointer;width:100%}
      .islider::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#C8A96B;box-shadow:0 2px 12px rgba(200,169,107,.4);cursor:pointer;transition:transform .15s}
      .islider::-webkit-slider-thumb:hover{transform:scale(1.15)}
      .chat-in{width:100%;background:#FAF8F2;border:1.5px solid rgba(200,169,107,.28);border-radius:14px;padding:12px 16px;font-family:'Tajawal',sans-serif;font-size:14px;color:#2B2118;outline:none;direction:rtl}
      .chat-in:focus{border-color:#C8A96B;box-shadow:0 0 0 3px rgba(200,169,107,.12)}
      @media(max-width:900px){.g3{grid-template-columns:1fr 1fr!important}.g4{grid-template-columns:1fr 1fr!important}.g2{grid-template-columns:1fr!important}}
      @media(max-width:600px){.g3{grid-template-columns:1fr!important}.g4{grid-template-columns:1fr 1fr!important}.hero-pad{padding:32px 22px!important}.hero-btns{flex-direction:column!important}.hero-m{grid-template-columns:1fr 1fr!important}.sim-g{grid-template-columns:1fr!important}}
      @media(max-width:400px){.g4{grid-template-columns:1fr!important}}
    `}</style>
    <div className="ip">
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 20px 80px' }}>

        {/* Global Language Pill */}
      <div dir="ltr" style={{position:'fixed',top:'14px',left:'14px',zIndex:200}}><LangPill/></div>

      {/* Back */}
        <div style={{ ...S(0), marginBottom: '20px' }}>
          <button onClick={() => router.back()} className="btn-o" style={{ color: '#5C3D2A', padding: '8px 18px', fontSize: '13px', borderRadius: '12px' }}>← العودة</button>
        </div>

        {/* ═══ HERO ═══ */}
        <div style={{ ...S(40), marginBottom: '24px', background: 'linear-gradient(145deg,#2B2118 0%,#3D2B1A 40%,#4A3420 70%,#2B2118 100%)', border: '1px solid rgba(200,169,107,.22)', borderRadius: '32px', position: 'relative', overflow: 'hidden' }} className="icard no-h">
          {/* Glow orbs */}
          <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', background: 'radial-gradient(circle,rgba(200,169,107,.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-60px', left: '8%', width: '260px', height: '260px', background: 'radial-gradient(circle,rgba(200,169,107,.09) 0%,transparent 70%)', pointerEvents: 'none' }} />
          {/* Floating particles */}
          {[...Array(10)].map((_, i) => (
            <div key={i} style={{ position: 'absolute', width: `${8 + (i % 3) * 5}px`, height: `${8 + (i % 3) * 5}px`, borderRadius: '50%', background: i % 2 === 0 ? 'rgba(200,169,107,.14)' : 'rgba(255,255,255,.07)', left: `${(i * 19 + 4) % 92}%`, top: `${(i * 27 + 8) % 85}%`, animation: `float ${4 + i % 3}s ease-in-out infinite`, animationDelay: `${i * 0.35}s`, filter: 'blur(1px)', pointerEvents: 'none' }} />
          ))}
          <div className="hero-pad" style={{ padding: '52px 48px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(200,169,107,.14)', border: '1px solid rgba(200,169,107,.28)', borderRadius: '20px', padding: '6px 16px', marginBottom: '22px' }}>
              <span>📈</span>
              <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#C8A96B', letterSpacing: '.06em' }}>SFM INVESTMENT PLATFORM</span>
            </div>
            <h1 style={{ fontSize: 'clamp(26px,4.5vw,50px)', fontWeight: '900', color: '#fff', lineHeight: 1.15, marginBottom: '10px', letterSpacing: '-0.02em' }}>أنواع الاستثمار</h1>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,.55)', marginBottom: '34px', maxWidth: '500px', lineHeight: 1.7 }}>ابنِ محفظتك الاستثمارية الذكية وحقق أهدافك المالية</p>
            {/* Metrics */}
            <div className="hero-m" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '34px' }}>
              {[
                { label: 'الثروة الحالية', val: `${wealth.toLocaleString('ar-KW')} د.ك`, color: '#C8A96B' },
                { label: 'هدف الاستثمار', val: `${goal.toLocaleString('ar-KW')} د.ك`, color: '#4ADE80' },
                { label: 'مؤشر المخاطر', val: `${riskScore}/100`, color: '#60A5FA' },
                { label: 'العائد المتوقع', val: '12%', color: '#C084FC' },
              ].map((m, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.09)', borderRadius: '18px', padding: '18px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,.4)', marginBottom: '7px', fontWeight: '500' }}>{m.label}</div>
                  <div style={{ fontSize: 'clamp(14px,1.8vw,20px)', fontWeight: '800', color: m.color, fontFamily: "'IBM Plex Sans Arabic',sans-serif", lineHeight: 1 }}>{m.val}</div>
                </div>
              ))}
            </div>
            {/* Buttons */}
            <div className="hero-btns" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn-g" onClick={() => router.push('/projects')} style={{ fontSize: '15px', padding: '14px 32px', borderRadius: '16px', animation: 'glow 2.5s infinite' }}>ابدأ الاستثمار ←</button>
              <button className="btn-o" onClick={() => document.getElementById('investment-ai-chat')?.scrollIntoView({ behavior: 'smooth' })} style={{ color: 'rgba(255,255,255,.72)', borderColor: 'rgba(255,255,255,.18)', fontSize: '14px' }}>🤖 تحليل AI</button>
              <button className="btn-o" onClick={() => router.push('/goals')} style={{ color: 'rgba(255,255,255,.72)', borderColor: 'rgba(255,255,255,.18)', fontSize: '14px' }}>+ إنشاء محفظة</button>
            </div>
          </div>
        </div>

        {/* ═══ INVESTMENT CARDS ═══ */}
        <div style={{ ...S(100), marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '4px', height: '22px', background: 'linear-gradient(180deg,#C8A96B,#8A6D2A)', borderRadius: '4px' }} />
            <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#2B2118', margin: 0 }}>فئات الاستثمار</h2>
            <span className="badge" style={{ background: 'rgba(200,169,107,.12)', color: '#8A6D2A', marginRight: 'auto' }}>8 فئات</span>
          </div>
          <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
            {INVESTMENTS.map((inv) => (
              <div key={inv.key} className="icard inv-card" style={{ padding: '22px 20px' }}
                onMouseEnter={() => setHovered(inv.key)} onMouseLeave={() => setHovered(null)}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ width: '46px', height: '46px', background: inv.riskBg, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{inv.icon}</div>
                  <Ring pct={inv.aiScore} g1={inv.g1} g2={inv.g2} id={`r-${inv.key}`} />
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#2B2118', marginBottom: '7px', lineHeight: 1.3 }}>{inv.name}</h3>
                <p style={{ fontSize: '12px', color: '#8A9BB0', lineHeight: 1.6, marginBottom: '13px' }}>{inv.desc}</p>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', marginBottom: '12px' }}>
                  <div style={{ background: '#FAF8F2', borderRadius: '9px', padding: '7px 9px' }}>
                    <div style={{ fontSize: '9.5px', color: '#8A9BB0', marginBottom: '2px' }}>العائد</div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#2B2118', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{inv.returns}</div>
                  </div>
                  <div style={{ background: '#FAF8F2', borderRadius: '9px', padding: '7px 9px' }}>
                    <div style={{ fontSize: '9.5px', color: '#8A9BB0', marginBottom: '2px' }}>المدة</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#2B2118' }}>{inv.horizon}</div>
                  </div>
                </div>
                {/* Risk + AI Score */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '11px' }}>
                  <span className="badge" style={{ background: inv.riskBg, color: inv.riskColor }}>مخاطرة {inv.risk}</span>
                  <span className="badge" style={{ background: 'rgba(200,169,107,.10)', color: '#8A6D2A' }}>AI: {inv.aiScore}</span>
                </div>
                {/* AI progress bar */}
                <div style={{ height: '5px', background: 'rgba(0,0,0,.06)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${inv.progress}%`, background: `linear-gradient(90deg,${inv.g1},${inv.g2})`, borderRadius: '10px', transition: 'width 1.2s cubic-bezier(.4,0,.2,1) .3s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ PORTFOLIO DASHBOARD ═══ */}
        <div style={{ ...S(160), marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '4px', height: '22px', background: 'linear-gradient(180deg,#C8A96B,#8A6D2A)', borderRadius: '4px' }} />
            <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#2B2118', margin: 0 }}>لوحة المحفظة</h2>
          </div>
          <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Donut chart card */}
            <div className="icard" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#2B2118', marginBottom: '20px' }}>توزيع الأصول</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                <Donut data={DONUT_DATA} />
                <div style={{ flex: 1, minWidth: '120px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {DONUT_DATA.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#2B2118', flex: 1 }}>{d.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#2B2118', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { icon: '⚖️', label: 'مؤشر المخاطر', val: '62/100', sub: 'متوسط', color: '#F59E0B', bg: 'rgba(245,158,11,.10)' },
                { icon: '🌐', label: 'نسبة التنويع', val: '74%', sub: 'جيد', color: '#22C55E', bg: 'rgba(34,197,94,.10)' },
                { icon: '📈', label: 'العائد المتوقع', val: '12%', sub: 'سنوياً', color: '#C8A96B', bg: 'rgba(200,169,107,.12)' },
                { icon: '🏆', label: 'تقييم المحفظة', val: '78/100', sub: 'ممتاز', color: '#8B5CF6', bg: 'rgba(139,92,246,.10)' },
              ].map((k, i) => (
                <div key={i} className="icard" style={{ padding: '18px 16px', textAlign: 'center' }}>
                  <div style={{ width: '40px', height: '40px', background: k.bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', margin: '0 auto 12px' }}>{k.icon}</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: k.color, fontFamily: "'IBM Plex Sans Arabic',sans-serif", lineHeight: 1 }}>{k.val}</div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#2B2118', marginTop: '6px' }}>{k.label}</div>
                  <div style={{ fontSize: '10.5px', color: '#8A9BB0', marginTop: '2px' }}>{k.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ AI ADVISOR ═══ */}
        <div id="investment-ai-chat" style={{ ...S(220), marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '4px', height: '22px', background: 'linear-gradient(180deg,#C8A96B,#8A6D2A)', borderRadius: '4px' }} />
            <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#2B2118', margin: 0 }}>مستشار الاستثمار الذكي</h2>
            <span className="badge" style={{ background: 'rgba(192,132,252,.12)', color: '#9333EA' }}>🤖 AI</span>
          </div>
          <div className="icard" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#2B2118,#3D2B1A)', padding: '18px 26px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', background: 'rgba(200,169,107,.18)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: '1px solid rgba(200,169,107,.3)', flexShrink: 0 }}>📊</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>SFM Investment AI</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.45)' }}>تحليل محفظة • توصيات ذكية</div>
              </div>
              <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: '11px', color: '#22C55E', fontWeight: '600' }}>متصل</span>
              </div>
            </div>

            {/* AI Insights strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0', borderBottom: '1px solid rgba(200,169,107,.12)' }}>
              {AI_MESSAGES.map((m, i) => (
                <div key={i} onClick={() => setChatHistory(h => [...h, { role: 'ai', text: m.text }])}
                  style={{ padding: '14px 18px', borderBottom: i < 2 ? '1px solid rgba(200,169,107,.08)' : 'none', borderLeft: i % 2 === 0 ? '1px solid rgba(200,169,107,.08)' : 'none', cursor: 'pointer', transition: 'background .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,169,107,.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{m.icon}</span>
                    <span style={{ fontSize: '12.5px', color: '#5C3D2A', lineHeight: 1.5, fontWeight: '500' }}>{m.text.slice(0, 70)}…</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat */}
            <div ref={chatRef} style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '18px 22px' }}>
              {chatHistory.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end', gap: '8px', alignItems: 'flex-end' }}>
                  {msg.role === 'ai' && <div style={{ width: '28px', height: '28px', background: 'rgba(200,169,107,.14)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>🤖</div>}
                  <div style={{ maxWidth: '78%', padding: '11px 15px', borderRadius: msg.role === 'ai' ? '18px 18px 18px 4px' : '18px 18px 4px 18px', background: msg.role === 'ai' ? '#fff' : 'linear-gradient(135deg,#C8A96B,#A8873E)', border: msg.role === 'ai' ? '1px solid rgba(200,169,107,.18)' : 'none', color: msg.role === 'ai' ? '#2B2118' : '#1a0f00', fontSize: '13.5px', lineHeight: 1.6, fontWeight: msg.role === 'user' ? '600' : '400', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>{msg.text}</div>
                </div>
              ))}
            </div>

            {/* Quick questions */}
            <div style={{ padding: '0 22px', display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {['ما أفضل استثمار الآن؟', 'كيف أبني محفظة؟', 'رأيك في الذهب؟'].map((q, i) => (
                <button key={i} onClick={() => { setChatMsg(q); }} style={{ background: '#FAF8F2', border: '1px solid rgba(200,169,107,.22)', borderRadius: '20px', padding: '5px 12px', fontSize: '11.5px', fontWeight: '600', color: '#5C3D2A', cursor: 'pointer', fontFamily: 'Tajawal,sans-serif', transition: 'all .15s' }}>{q}</button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '10px 22px 22px', borderTop: '1px solid rgba(200,169,107,.10)', display: 'flex', gap: '10px' }}>
              <input className="chat-in" value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="اسألني عن أي استثمار..." />
              <button className="btn-g" onClick={handleChat} style={{ padding: '12px 18px', borderRadius: '12px', flexShrink: 0 }}>إرسال</button>
            </div>
          </div>
        </div>

        {/* ═══ WEALTH PATH ═══ */}
        <div style={{ ...S(280), marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '4px', height: '22px', background: 'linear-gradient(180deg,#C8A96B,#8A6D2A)', borderRadius: '4px' }} />
            <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#2B2118', margin: 0 }}>مسار الاستثمار</h2>
          </div>
          <div className="icard" style={{ padding: '32px 36px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', minWidth: '600px' }}>
              {WEALTH_PATH.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < WEALTH_PATH.length - 1 ? '1' : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: s.done ? 'linear-gradient(135deg,#C8A96B,#A8873E)' : 'rgba(200,169,107,.10)', border: s.done ? 'none' : '2px dashed rgba(200,169,107,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: s.done ? '0 4px 16px rgba(200,169,107,.25)' : 'none', transition: 'all .3s' }}>{s.icon}</div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: s.done ? '#2B2118' : '#8A9BB0', whiteSpace: 'nowrap' }}>{s.title}</div>
                      <div style={{ fontSize: '11px', color: '#8A9BB0', marginTop: '2px', whiteSpace: 'nowrap' }}>{s.sub}</div>
                      {s.done && <span className="badge" style={{ background: 'rgba(34,197,94,.10)', color: '#22C55E', marginTop: '5px' }}>✓ مكتمل</span>}
                    </div>
                  </div>
                  {i < WEALTH_PATH.length - 1 && (
                    <div style={{ flex: 1, height: '2px', margin: '0 8px', marginBottom: '32px', background: WEALTH_PATH[i + 1].done ? '#C8A96B' : 'linear-gradient(90deg,#C8A96B,rgba(200,169,107,.2))' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ WEALTH SIMULATOR ═══ */}
        <div style={{ ...S(340), marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '4px', height: '22px', background: 'linear-gradient(180deg,#C8A96B,#8A6D2A)', borderRadius: '4px' }} />
            <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#2B2118', margin: 0 }}>محاكي نمو الثروة</h2>
          </div>
          <div className="icard" style={{ padding: '32px 36px' }}>
            <div style={{ marginBottom: '26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontSize: '14px', fontWeight: '700', color: '#5C3D2A' }}>الاستثمار الشهري</label>
                <span style={{ fontSize: '22px', fontWeight: '900', color: '#C8A96B', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{saving.toLocaleString('ar-KW')} د.ك</span>
              </div>
              <input type="range" className="islider" min={50} max={3000} step={50} value={saving}
                onChange={e => setSaving(+e.target.value)}
                style={{ '--p': `${((saving - 50) / (3000 - 50)) * 100}%` } as React.CSSProperties} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                {[200, 500, 1000, 2000].map(v => (
                  <button key={v} onClick={() => setSaving(v)} style={{ padding: '5px 14px', borderRadius: '20px', border: '1.5px solid', borderColor: saving === v ? '#C8A96B' : 'rgba(200,169,107,.25)', background: saving === v ? 'rgba(200,169,107,.12)' : 'transparent', color: saving === v ? '#8A6D2A' : '#8A9BB0', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>{v} د.ك</button>
                ))}
              </div>
            </div>
            <div className="sim-g" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }}>
              {[
                { label: 'بعد سنة', val: yr1, color: '#3B82F6', icon: '📅', note: 'بدون عائد' },
                { label: 'بعد 5 سنوات', val: yr5, color: '#C8A96B', icon: '⭐', note: 'عائد سنوي 10%' },
                { label: 'بعد 10 سنوات', val: yr10, color: '#22C55E', icon: '🚀', note: 'مركب 12% سنوياً' },
              ].map((r, i) => (
                <div key={i} style={{ background: 'linear-gradient(135deg,#FAF8F2,#F5F0E8)', border: '1px solid rgba(200,169,107,.18)', borderRadius: '18px', padding: '20px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{r.icon}</div>
                  <div style={{ fontSize: '11px', color: '#8A9BB0', marginBottom: '6px' }}>{r.label}</div>
                  <div style={{ fontSize: 'clamp(18px,2.5vw,26px)', fontWeight: '900', color: r.color, fontFamily: "'IBM Plex Sans Arabic',sans-serif", lineHeight: 1 }}>{r.val.toLocaleString('ar-KW')}</div>
                  <div style={{ fontSize: '12px', color: '#8A9BB0', marginTop: '4px' }}>د.ك</div>
                  <div style={{ fontSize: '10px', color: '#B0B8C4', marginTop: '4px' }}>{r.note}</div>
                </div>
              ))}
            </div>
            {/* Bar chart */}
            <div>
              <div style={{ fontSize: '12px', color: '#8A9BB0', marginBottom: '12px', fontWeight: '500' }}>نمو رأس المال مع الاستثمار المنتظم (المركب)</div>
              <BarChart data={[
                { label: '1س', val: yr1, max: yr10, color: '#C8A96B' },
                { label: '2س', val: Math.round(yr1 * 2.21), max: yr10, color: '#C8A96B' },
                { label: '3س', val: Math.round(yr1 * 3.64), max: yr10, color: '#C8A96B' },
                { label: '5س', val: yr5, max: yr10, color: '#C8A96B' },
                { label: '7س', val: Math.round(yr10 * 0.60), max: yr10, color: '#C8A96B' },
                { label: '10س', val: yr10, max: yr10, color: '#C8A96B' },
              ]} />
            </div>
          </div>
        </div>

        {/* ═══ CTA ═══ */}
        <div style={S(400)}>
          <div className="icard no-h" style={{ background: 'linear-gradient(135deg,#2B2118,#3D2B1A)', padding: '44px 48px', textAlign: 'center', border: '1px solid rgba(200,169,107,.22)', borderRadius: '32px' }}>
            <div style={{ fontSize: '36px', marginBottom: '14px' }}>📈</div>
            <h3 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: '900', color: '#fff', marginBottom: '10px' }}>ابدأ بناء محفظتك الاستثمارية</h3>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.52)', marginBottom: '28px', maxWidth: '440px', margin: '0 auto 28px', lineHeight: 1.7 }}>كل شهر تأخير يكلفك آلاف الدنانير من العوائد المفقودة. ابدأ الآن.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-g" onClick={() => router.push('/projects')} style={{ fontSize: '15px', padding: '14px 36px' }}>ابدأ الاستثمار الآن</button>
              <button className="btn-o" onClick={() => document.getElementById('investment-ai-chat')?.scrollIntoView({ behavior: 'smooth' })} style={{ color: 'rgba(255,255,255,.72)', borderColor: 'rgba(255,255,255,.2)', fontSize: '14px' }}>استشر المستشار الذكي</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </>);
}
