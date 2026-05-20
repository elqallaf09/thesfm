'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */
interface MonthRecord {
  month: string; label: string;
  income: number; expenses: number; savings: number; investment: number; charity: number;
}
interface ExpenseItem { date: string; category: string; desc: string; amount: number; pct: number; }
interface Goal { id: string; name: string; icon: string; target: number; saved: number; color: string; }
interface Investment { id: string; name: string; icon: string; amount: number; profit: number; pct: number; }

/* ═══════════════════════════════════════════════════
   STATIC DATA
═══════════════════════════════════════════════════ */
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const TICKER_ITEMS = [
  {name:'ناسداك', val:'10,982.3', chg:'+0.68%', up:true},
  {name:'الذهب', val:'2,360.10', chg:'+0.35%', up:true},
  {name:'فتشة', val:'27.61', chg:'+0.42%', up:true},
  {name:'آبل موز', val:'82.45', chg:'-0.24%', up:false},
  {name:'الكاكاو', val:'8,683.3', chg:'-2.38%', up:false},
  {name:'بيتكوين', val:'67,240', chg:'+1.85%', up:true},
  {name:'تداول السعودية', val:'11,542', chg:'+0.45%', up:true},
  {name:'بورصة قطر', val:'9,876', chg:'-0.32%', up:false},
  {name:'سوق دبي', val:'4,512', chg:'+0.78%', up:true},
];

const NAV_ITEMS = [
  {id:'home', icon:'⊞', label:'الرئيسية'},
  {id:'expenses', icon:'🛒', label:'المصاريف'},
  {id:'income', icon:'💵', label:'الدخل'},
  {id:'invest', icon:'📈', label:'الاستثمارات'},
  {id:'goals', icon:'🎯', label:'الأهداف المالية'},
  {id:'reports', icon:'📊', label:'التقارير'},
  {id:'ai', icon:'🧠', label:'تحليلات الذكية'},
  {id:'charity', icon:'🤲', label:'الأعمال الخيرية'},
  {id:'notif', icon:'🔔', label:'الإشعارات'},
  {id:'settings', icon:'⚙️', label:'الإعدادات'},
];

const DONUT_DATA = [
  {label:'المواصلات',pct:25,color:'#D8AE63'},
  {label:'الطعام',pct:20,color:'#9A6C3C'},
  {label:'السكن',pct:20,color:'#5B4332'},
  {label:'التسوق',pct:15,color:'#C8A96B'},
  {label:'الترفيه',pct:10,color:'#8A7060'},
  {label:'أخرى',pct:10,color:'#BFB5A8'},
];

const SAMPLE_GOALS: Goal[] = [
  {id:'car',name:'شراء سيارة',icon:'🚗',target:10000,saved:8200,color:'#D8AE63'},
  {id:'house',name:'منزل الأحلام',icon:'🏠',target:50000,saved:13500,color:'#9A6C3C'},
  {id:'retire',name:'التقاعد',icon:'👴',target:100000,saved:41000,color:'#22C55E'},
  {id:'project',name:'مشروع',icon:'🚀',target:10000,saved:4200,color:'#3B82F6'},
];

const SAMPLE_INVESTMENTS: Investment[] = [
  {id:'tech',name:'صندوق تكنولوجيا',icon:'💻',amount:850,profit:133.60,pct:18.50},
  {id:'gold',name:'الذهب',icon:'🥇',amount:754,profit:90.48,pct:12.20},
  {id:'stocks',name:'الأسهم الأمريكية',icon:'📈',amount:666,profit:57.94,pct:8.71},
];

/* ─── Generate 6 months of sample history ─── */
function genHistory(baseIncome=1936,baseExp=1305): MonthRecord[] {
  const now=new Date(); const months:MonthRecord[]=[];
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const variance=0.85+Math.random()*0.3;
    const inc=Math.round(baseIncome*variance*100)/100;
    const exp=Math.round(baseExp*variance*100)/100;
    const sav=Math.round((inc-exp)*0.3*100)/100;
    const inv=Math.round(inc*0.15*100)/100;
    months.push({month:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:MONTHS_AR[d.getMonth()]+' '+d.getFullYear(),income:inc,expenses:exp,savings:sav,investment:inv,charity:Math.round(inc*0.02*100)/100});
  }
  return months;
}

/* ═══════════════════════════════════════════════════
   SVG CHARTS
═══════════════════════════════════════════════════ */
function LineChart({data,width=520,height=200}:{data:MonthRecord[];width?:number;height?:number}){
  const pad={t:20,r:20,b:40,l:50};
  const w=width-pad.l-pad.r, h=height-pad.t-pad.b;
  const series=[
    {key:'income',color:'#22C55E',label:'الدخل'},
    {key:'expenses',color:'#EF4444',label:'المصروفات'},
    {key:'savings',color:'#D8AE63',label:'الادخار'},
    {key:'investment',color:'#3B82F6',label:'الاستثمار'},
  ] as const;
  const allVals=data.flatMap(d=>series.map(s=>d[s.key as keyof MonthRecord] as number));
  const maxV=Math.max(...allVals)*1.1||1;
  const xStep=w/(data.length-1||1);
  const toY=(v:number)=>pad.t+h-(v/maxV)*h;
  const toX=(i:number)=>pad.l+i*xStep;
  const [tooltip,setTooltip]=useState<{x:number;y:number;idx:number}|null>(null);
  return(
    <div style={{position:'relative',width:'100%'}}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{width:'100%',height:'auto',overflow:'visible'}}>
        {/* Grid lines */}
        {[0,0.25,0.5,0.75,1].map((t,i)=>{
          const y=pad.t+h*(1-t);
          return<g key={i}><line x1={pad.l} y1={y} x2={pad.l+w} y2={y} stroke="rgba(216,174,99,0.08)" strokeWidth="1"/><text x={pad.l-6} y={y+4} textAnchor="end" fontSize="10" fill="#9A6C3C">{Math.round(maxV*t)}</text></g>;
        })}
        {/* X labels */}
        {data.map((d,i)=><text key={i} x={toX(i)} y={height-8} textAnchor="middle" fontSize="10" fill="#9A6C3C">{d.label.split(' ')[0]}</text>)}
        {/* Lines + dots */}
        {series.map(s=>{
          const pts=data.map((d,i)=>`${toX(i)},${toY(d[s.key as keyof MonthRecord] as number)}`).join(' ');
          return(
            <g key={s.key}>
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              {data.map((d,i)=><circle key={i} cx={toX(i)} cy={toY(d[s.key as keyof MonthRecord] as number)} r="4" fill={s.color} stroke="#FFFDFC" strokeWidth="2" style={{cursor:'pointer'}} onMouseEnter={()=>setTooltip({x:toX(i),y:toY(d[s.key as keyof MonthRecord] as number),idx:i})} onMouseLeave={()=>setTooltip(null)}/>)}
            </g>
          );
        })}
        {/* Tooltip */}
        {tooltip&&(()=>{
          const d=data[tooltip.idx];
          const x=Math.min(tooltip.x+8,width-130);
          return(
            <g>
              <rect x={x} y={tooltip.y-60} width="130" height="80" rx="8" fill="#111111" opacity="0.92"/>
              <text x={x+8} y={tooltip.y-42} fontSize="11" fill="#D8AE63" fontWeight="700">{d.label}</text>
              {series.map((s,i)=><text key={s.key} x={x+8} y={tooltip.y-26+i*14} fontSize="10" fill={s.color}>{s.label}: {(d[s.key as keyof MonthRecord] as number).toFixed(2)}</text>)}
            </g>
          );
        })()}
      </svg>
      {/* Legend */}
      <div style={{display:'flex',gap:'16px',flexWrap:'wrap',marginTop:'8px',justifyContent:'center'}}>
        {series.map(s=><div key={s.key} style={{display:'flex',alignItems:'center',gap:'5px'}}><div style={{width:'12px',height:'3px',background:s.color,borderRadius:'2px'}}/><span style={{fontSize:'11px',color:'#9A6C3C',fontWeight:'600'}}>{s.label}</span></div>)}
      </div>
    </div>
  );
}

function DonutChart({data,total}:{data:typeof DONUT_DATA;total:number}){
  const r=70,cx=100,cy=100,circ=2*Math.PI*r;
  let offset=0;
  return(
    <svg width="200" height="200" viewBox="0 0 200 200">
      <defs><filter id="df"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.08)"/></filter></defs>
      {data.map((d,i)=>{
        const dash=(d.pct/100)*circ;
        const el=<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth="28"
          strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={-offset}
          transform={`rotate(-90 ${cx} ${cy})`} filter="url(#df)"
          style={{transition:`stroke-dasharray 1.2s ease ${i*.1}s`}}/>;
        offset+=dash; return el;
      })}
      <circle cx={cx} cy={cy} r={r-16} fill="#FFFDFC"/>
      <text x={cx} y={cy-6} textAnchor="middle" fontSize="18" fontWeight="900" fill="#111111">{total.toFixed(0)}</text>
      <text x={cx} y={cy+12} textAnchor="middle" fontSize="10" fill="#9A6C3C">إجمالي المصروفات</text>
    </svg>
  );
}

function BarChart({data}:{data:{label:string;v1:number;v2:number}[]}){
  const maxV=Math.max(...data.flatMap(d=>[d.v1,d.v2]))*1.15||1;
  const h=120,pad=30,bw=14,gap=6;
  const W=data.length*(bw*2+gap+12)+pad*2;
  return(
    <svg viewBox={`0 0 ${W} ${h+30}`} style={{width:'100%',height:'auto'}}>
      {data.map((d,i)=>{
        const x=pad+i*(bw*2+gap+12);
        const b1h=(d.v1/maxV)*h; const b2h=(d.v2/maxV)*h;
        return(
          <g key={i}>
            <rect x={x} y={h-b1h} width={bw} height={b1h} rx="4" fill="#D8AE63" opacity="0.8"/>
            <rect x={x+bw+gap} y={h-b2h} width={bw} height={b2h} rx="4" fill="#22C55E" opacity="0.8"/>
            <text x={x+bw} y={h+16} textAnchor="middle" fontSize="9" fill="#9A6C3C">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════ */
export default function DashboardPage(){
  const {user,loading}=useAuth();
  const router=useRouter();
  const [profile,setProfile]=useState<any>({display_name:'محمد القلاف',profession:'خبير أسواق ومعلومات'});
  const [totalIncome,setTotalIncome]=useState(1936);
  const [totalExpenses,setTotalExpenses]=useState(1305);
  const [history,setHistory]=useState<MonthRecord[]>([]);
  const [cmpA,setCmpA]=useState(0);
  const [cmpB,setCmpB]=useState(1);
  const [activeNav,setActiveNav]=useState('home');
  const [transTab,setTransTab]=useState<'exp'|'inc'|'inv'>('exp');
  const [mounted,setMounted]=useState(false);
  const [sidebarOpen,setSidebarOpen]=useState(true);
  const [selectedMonth,setSelectedMonth]=useState('');

  useEffect(()=>{
    setTimeout(()=>setMounted(true),60);
    const h=genHistory();
    setHistory(h);
    if(!loading&&user){loadProfile();}
  },[user,loading]);

  const loadProfile=async()=>{
    const{data}=await supabase.from('profiles').select('*').eq('id',user!.id).maybeSingle();
    if(data)setProfile(data);
    const{data:s}=await supabase.from('monthly_income_sources').select('*').eq('user_id',user!.id);
    if(s&&s.length>0){const t=s.reduce((a:number,r:any)=>a+(parseFloat(r.amount)||0),0);setTotalIncome(t);}
    const{data:e}=await supabase.from('expense_items').select('*').eq('user_id',user!.id);
    if(e&&e.length>0){const t=e.reduce((a:number,r:any)=>a+(parseFloat(r.amount)||0),0);setTotalExpenses(t);}
  };

  const totalSavings=Math.max(0,totalIncome-totalExpenses)*0.3;
  const totalInvestment=totalIncome*0.15;
  const netWorth=totalIncome+totalSavings;
  const healthScore=Math.min(100,Math.round(60+(totalSavings/totalIncome)*40));
  const prevMonth=history[history.length-2];
  const currMonth=history[history.length-1];
  const monthlyGrowth=prevMonth?totalIncome-prevMonth.income:128.6;
  const monthlyGrowthPct=prevMonth?((totalIncome-prevMonth.income)/prevMonth.income*100):7.09;
  const initials=(profile.display_name||'SFM').substring(0,2).toUpperCase();

  const S=(d:number)=>({opacity:mounted?1:0,transform:mounted?'translateY(0)':'translateY(18px)',transition:`opacity .5s ease ${d}ms, transform .5s ease ${d}ms`});

  const sampleTransactions:ExpenseItem[]=[
    {date:'2024-05-26',category:'مواصلات',desc:'—',amount:-45,pct:10},
    {date:'2024-05-24',category:'طعام',desc:'—',amount:-28,pct:12},
    {date:'2024-05-22',category:'ترفيه',desc:'—',amount:-15,pct:23},
    {date:'2024-05-21',category:'تسوق',desc:'—',amount:-60,pct:5},
    {date:'2024-05-20',category:'كهرباء',desc:'—',amount:-30,pct:0},
  ];

  const cmpDiff=(key:keyof MonthRecord)=>{
    if(history.length<2)return{diff:0,pct:0};
    const a=history[cmpA]?.[key] as number||0;
    const b=history[cmpB]?.[key] as number||0;
    return{diff:b-a,pct:a>0?((b-a)/a*100):0};
  };

  if(loading)return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#F7F3EA'}}>
      <div style={{width:'44px',height:'44px',borderRadius:'50%',border:'3px solid rgba(216,174,99,.2)',borderTopColor:'#D8AE63',animation:'spin 1s linear infinite'}}/>
    </div>
  );

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      .dp{font-family:'Tajawal',sans-serif;direction:rtl;background:#F7F3EA;min-height:100vh;color:#111111;display:flex;flex-direction:column}
      .dp ::-webkit-scrollbar{width:4px;height:4px}.dp ::-webkit-scrollbar-thumb{background:rgba(216,174,99,.3);border-radius:10px}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      @keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(216,174,99,0)}50%{box-shadow:0 0 0 8px rgba(216,174,99,.12)}}
      .dc{background:#FFFDFC;border:1px solid rgba(216,174,99,.12);border-radius:20px;box-shadow:0 4px 20px rgba(90,67,51,.06);transition:all .25s cubic-bezier(.4,0,.2,1)}
      .dc:hover:not(.no-h){transform:translateY(-2px);box-shadow:0 10px 34px rgba(90,67,51,.10),0 0 0 1px rgba(216,174,99,.18)}
      .kpi-c{padding:18px 20px}
      .nav-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;cursor:pointer;transition:all .2s;color:rgba(255,255,255,.55);font-size:13px;font-weight:500;border:none;background:transparent;width:100%;text-align:right;direction:rtl;font-family:'Tajawal',sans-serif}
      .nav-item:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.88)}
      .nav-item.active{background:rgba(216,174,99,.18);color:#D8AE63;font-weight:700}
      .tab-btn{padding:7px 16px;border-radius:20px;border:none;cursor:pointer;font-size:12.5px;font-weight:600;font-family:'Tajawal',sans-serif;transition:all .2s}
      .tab-btn.on{background:linear-gradient(135deg,#D8AE63,#9A6C3C);color:#111111;box-shadow:0 3px 12px rgba(216,174,99,.3)}
      .tab-btn.off{background:transparent;color:#9A6C3C;border:1px solid rgba(216,174,99,.2)}
      .prog-bar{height:8px;background:rgba(216,174,99,.14);border-radius:10px;overflow:hidden}
      .prog-fill{height:100%;border-radius:10px;transition:width 1.2s cubic-bezier(.4,0,.2,1)}
      .action-btn{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 10px;border:1.5px solid rgba(216,174,99,.2);border-radius:16px;background:#FFFDFC;cursor:pointer;transition:all .2s;font-family:'Tajawal',sans-serif;text-align:center}
      .action-btn:hover{border-color:#D8AE63;background:rgba(216,174,99,.06);transform:translateY(-2px);box-shadow:0 6px 20px rgba(216,174,99,.15)}
      @media(max-width:1024px){.sidebar{display:none!important}.main-pad{margin-right:0!important}}
      @media(max-width:768px){.kpi-grid{grid-template-columns:1fr 1fr!important}.hero-grid{grid-template-columns:1fr!important}.insight-grid{grid-template-columns:1fr!important}.dist-grid{grid-template-columns:1fr!important}.invest-grid{grid-template-columns:1fr!important}.goals-grid{grid-template-columns:1fr 1fr!important}.feat-grid{grid-template-columns:repeat(3,1fr)!important}}
    `}</style>

    <div className="dp">

      {/* ═══ TICKER BAR ═══ */}
      <div style={{background:'rgba(17,17,17,0.96)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(216,174,99,.12)',padding:'8px 0',overflow:'hidden',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',gap:'0',width:'max-content',animation:'ticker 60s linear infinite'}}>
          {[...TICKER_ITEMS,...TICKER_ITEMS,...TICKER_ITEMS].map((t,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',padding:'0 20px',borderRight:'1px solid rgba(216,174,99,.1)',flexShrink:0,fontSize:'12px',fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>
              <span style={{fontWeight:'700',color:'#D8AE63'}}>{t.name}</span>
              <span style={{color:'rgba(255,255,255,.85)'}} dir="ltr">{t.val}</span>
              <span style={{fontWeight:'700',color:t.up?'#22C55E':'#EF4444'}} dir="ltr">{t.chg}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'flex',flex:1}}>

        {/* ═══ SIDEBAR ═══ */}
        <aside className="sidebar" style={{width:'230px',background:'linear-gradient(180deg,#1A0F05 0%,#0D0804 100%)',position:'fixed',right:0,top:'37px',bottom:0,zIndex:50,display:'flex',flexDirection:'column',overflowY:'auto',borderLeft:'1px solid rgba(216,174,99,.1)'}}>
          {/* Logo */}
          <div style={{padding:'20px 16px 16px',borderBottom:'1px solid rgba(216,174,99,.08)'}}>
            <div style={{fontSize:'18px',fontWeight:'900',color:'#D8AE63',letterSpacing:'.05em',marginBottom:'2px'}}>THE SFM</div>
            <div style={{fontSize:'11px',color:'rgba(216,174,99,.45)'}}>المدير المالي الذكي</div>
          </div>

          {/* User card */}
          <div style={{padding:'16px',borderBottom:'1px solid rgba(216,174,99,.08)'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px',padding:'14px',background:'rgba(216,174,99,.07)',borderRadius:'16px',border:'1px solid rgba(216,174,99,.12)'}}>
              <div style={{width:'52px',height:'52px',borderRadius:'50%',background:'linear-gradient(135deg,#D8AE63,#9A6C3C)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'900',color:'#111111',boxShadow:'0 3px 14px rgba(216,174,99,.35)'}}>{initials}</div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:'13.5px',fontWeight:'800',color:'rgba(255,255,255,.9)',marginBottom:'2px'}}>{profile.display_name||'محمد القلاف'}</div>
                <div style={{fontSize:'11px',color:'rgba(216,174,99,.6)',marginBottom:'8px'}}>{profile.profession||'خبير أسواق ومعلومات'}</div>
                <div style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'linear-gradient(135deg,rgba(216,174,99,.2),rgba(154,108,60,.14))',border:'1px solid rgba(216,174,99,.3)',borderRadius:'20px',padding:'3px 12px'}}>
                  <span style={{fontSize:'10px'}}>⭐</span>
                  <span style={{fontSize:'10px',fontWeight:'800',color:'#D8AE63',letterSpacing:'.05em'}}>ELITE MEMBER</span>
                </div>
              </div>
              {/* Financial score */}
              <div style={{width:'100%',background:'rgba(255,255,255,.04)',borderRadius:'10px',padding:'10px 12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                  <span style={{fontSize:'10px',color:'rgba(255,255,255,.4)'}}>الصحة المالية</span>
                  <span style={{fontSize:'11px',fontWeight:'800',color:'#D8AE63'}}>{healthScore}%</span>
                </div>
                <div className="prog-bar"><div className="prog-fill" style={{width:`${healthScore}%`,background:'linear-gradient(90deg,#D8AE63,#9A6C3C)'}}/></div>
              </div>
              {/* AI status */}
              <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'11px',color:'rgba(255,255,255,.5)'}}>
                <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#22C55E',animation:'pulse 1.5s infinite'}}/>
                نشط
                <span style={{marginRight:'auto',fontSize:'14px'}}>🤖</span>
              </div>
            </div>

            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginTop:'12px'}}>
              {[
                {label:'الحسابات',val:'8,495'},
                {label:'عضوية منذ',val:'يناير 2023'},
                {label:'عدد الأهداف',val:SAMPLE_GOALS.length},
                {label:'الاستثمارات',val:SAMPLE_INVESTMENTS.length},
              ].map((s,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,.04)',borderRadius:'10px',padding:'8px 10px'}}>
                  <div style={{fontSize:'9.5px',color:'rgba(255,255,255,.3)',marginBottom:'3px'}}>{s.label}</div>
                  <div style={{fontSize:'13px',fontWeight:'800',color:'rgba(255,255,255,.85)',fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{s.val}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>router.push('/profile')} style={{width:'100%',marginTop:'10px',padding:'9px',background:'linear-gradient(135deg,#D8AE63,#9A6C3C)',border:'none',borderRadius:'12px',color:'#111111',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Tajawal,sans-serif'}}>
              عرض الملف الشخصي
            </button>
          </div>

          {/* Nav */}
          <nav style={{flex:1,padding:'10px 8px'}}>
            {NAV_ITEMS.map(n=>(
              <button key={n.id} className={'nav-item'+(activeNav===n.id?' active':'')} onClick={()=>{setActiveNav(n.id);if(n.id==='home')router.push('/');else router.push('/'+n.id);}}>
                <span style={{fontSize:'16px',width:'20px',textAlign:'center'}}>{n.icon}</span>
                {n.label}
              </button>
            ))}
            <div style={{height:'1px',background:'rgba(216,174,99,.08)',margin:'8px 6px'}}/>
            <button className="nav-item" onClick={()=>{supabase.auth.signOut();router.push('/');}}>
              <span style={{fontSize:'16px',width:'20px',textAlign:'center'}}>⤴</span>
              تسجيل الخروج
            </button>
          </nav>

          {/* AI Card bottom */}
          <div style={{padding:'12px',margin:'8px',background:'linear-gradient(135deg,#2B1A0D,#3D2618)',borderRadius:'18px',border:'1px solid rgba(216,174,99,.2)',textAlign:'center',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:'-20px',right:'-20px',width:'80px',height:'80px',borderRadius:'50%',background:'radial-gradient(circle,rgba(216,174,99,.15) 0%,transparent 70%)',pointerEvents:'none'}}/>
            <div style={{fontSize:'22px',marginBottom:'6px'}}>🤖</div>
            <div style={{fontSize:'13px',fontWeight:'800',color:'#D8AE63',marginBottom:'4px'}}>الذكاء المالي</div>
            <div style={{fontSize:'11px',color:'rgba(255,255,255,.45)',marginBottom:'12px',lineHeight:1.5}}>اكتشف فرص جديدة لتحقيق توصيات مخصصة</div>
            <button style={{width:'100%',padding:'8px',background:'linear-gradient(135deg,#D8AE63,#9A6C3C)',border:'none',borderRadius:'10px',color:'#111111',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Tajawal,sans-serif'}}>
              استكشف الآن
            </button>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <main className="main-pad" style={{flex:1,marginRight:'230px',padding:'20px',display:'flex',flexDirection:'column',gap:'16px',maxWidth:'100%',overflowX:'hidden'}}>

          {/* ─── PAGE HEADER ─── */}
          <div style={{...S(0),display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
            <div>
              <h1 style={{fontSize:'clamp(20px,3vw,28px)',fontWeight:'900',color:'#111111',marginBottom:'4px'}}>
                مرحباً {profile.display_name||'محمد القلاف'} 👋
              </h1>
              <p style={{fontSize:'13px',color:'#9A6C3C'}}>هذه نظرة عامة على وضعك المالي اليوم</p>
            </div>
            <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
              <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:'7px',padding:'9px 18px',background:'#FFFDFC',border:'1.5px solid rgba(216,174,99,.25)',borderRadius:'12px',cursor:'pointer',color:'#5B4332',fontSize:'13px',fontWeight:'700',fontFamily:'Tajawal,sans-serif'}}>
                🖨️ تقرير شهري
              </button>
            </div>
          </div>

          {/* ─── HERO CARD ─── */}
          <div style={{...S(40)}} className="dc no-h">
            <div className="hero-grid" style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'0',padding:'0',overflow:'hidden',borderRadius:'20px'}}>
              {/* Left: Net Wealth */}
              <div style={{padding:'28px 28px',background:'linear-gradient(145deg,#2B1A0D 0%,#3D2618 100%)',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:'-40px',right:'-40px',width:'180px',height:'180px',borderRadius:'50%',background:'radial-gradient(circle,rgba(216,174,99,.14) 0%,transparent 70%)',pointerEvents:'none'}}/>
                <div style={{fontSize:'12.5px',color:'rgba(216,174,99,.6)',fontWeight:'600',marginBottom:'10px',position:'relative',zIndex:1}}>📊 صافي الثروة</div>
                <div style={{fontSize:'clamp(28px,4vw,42px)',fontWeight:'900',color:'#FFFDFC',fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1,marginBottom:'12px',position:'relative',zIndex:1}}>
                  {netWorth.toFixed(2)} <span style={{fontSize:'18px',color:'rgba(216,174,99,.7)'}}>د.ك</span>
                </div>
                <div style={{display:'flex',gap:'10px',alignItems:'center',position:'relative',zIndex:1}}>
                  <div style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'rgba(34,197,94,.12)',borderRadius:'20px',padding:'5px 12px'}}>
                    <span style={{fontSize:'14px'}}>↑</span>
                    <span style={{fontSize:'13px',fontWeight:'700',color:'#22C55E',fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>+{monthlyGrowth.toFixed(2)} د.ك</span>
                  </div>
                  <span style={{fontSize:'13px',fontWeight:'700',color:'#22C55E'}}>+{Math.abs(monthlyGrowthPct).toFixed(2)}%</span>
                </div>
                <div style={{fontSize:'11px',color:'rgba(216,174,99,.35)',marginTop:'8px',position:'relative',zIndex:1}}>مقارنة بالشهر الماضي</div>
              </div>

              {/* Center: Health score ring */}
              <div style={{padding:'24px 32px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#FFFDFC',borderRight:'1px solid rgba(216,174,99,.08)',borderLeft:'1px solid rgba(216,174,99,.08)'}}>
                <div style={{position:'relative',width:'110px',height:'110px',marginBottom:'10px'}}>
                  <svg width="110" height="110" style={{transform:'rotate(-90deg)'}}>
                    <defs><linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#22C55E"/><stop offset="100%" stopColor="#D8AE63"/></linearGradient></defs>
                    <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(216,174,99,.1)" strokeWidth="10"/>
                    <circle cx="55" cy="55" r="46" fill="none" stroke="url(#hg)" strokeWidth="10"
                      strokeDasharray={`${(healthScore/100)*289} 289`} strokeLinecap="round"
                      style={{transition:'stroke-dasharray 1.4s ease .3s'}}/>
                  </svg>
                  <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                    <div style={{fontSize:'24px',fontWeight:'900',color:'#111111',fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1}}>{healthScore}%</div>
                    <div style={{fontSize:'9px',color:'#9A6C3C',marginTop:'2px'}}>الصحة المالية</div>
                  </div>
                </div>
                <div style={{fontSize:'12px',fontWeight:'700',color:'#22C55E',background:'rgba(34,197,94,.08)',borderRadius:'20px',padding:'4px 12px'}}>ممتاز</div>
              </div>

              {/* Right: AI Manager */}
              <div style={{padding:'24px 24px',background:'linear-gradient(145deg,#FFFDFC,#FAF6EE)',display:'flex',flexDirection:'column',justifyContent:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
                  <div style={{width:'44px',height:'44px',background:'linear-gradient(135deg,#111111,#2D1A0A)',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',boxShadow:'0 3px 12px rgba(21,21,21,.2)'}} >🤖</div>
                  <div>
                    <div style={{fontSize:'13.5px',fontWeight:'800',color:'#111111'}}>المدير المالي الذكي</div>
                    <div style={{display:'flex',alignItems:'center',gap:'5px',marginTop:'3px'}}>
                      <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#22C55E',animation:'pulse 1.5s infinite'}}/>
                      <span style={{fontSize:'11px',color:'#22C55E',fontWeight:'600'}}>نشط</span>
                    </div>
                  </div>
                </div>
                <div style={{background:'rgba(216,174,99,.07)',border:'1px solid rgba(216,174,99,.15)',borderRadius:'12px',padding:'12px 14px'}}>
                  <p style={{fontSize:'12.5px',color:'#5B4332',lineHeight:1.65,fontWeight:'500'}}>يعمل حالياً لتحسين وضعك المالي وتحليل فرص النمو للشهر القادم</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── KPI GRID ─── */}
          <div className="kpi-grid" style={{...S(80),display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px'}}>
            {[
              {label:'إجمالي الدخل',val:totalIncome,chg:'+7.09%',up:true,icon:'💵',color:'#22C55E'},
              {label:'إجمالي المصروفات',val:totalExpenses,chg:'+4.32%',up:false,icon:'🛒',color:'#EF4444'},
              {label:'إجمالي الادخار',val:totalSavings,chg:'+15.31%',up:true,icon:'💰',color:'#D8AE63'},
              {label:'إجمالي الاستثمار',val:totalInvestment,chg:'+12.71%',up:true,icon:'📈',color:'#3B82F6'},
            ].map((k,i)=>(
              <div key={i} className="dc kpi-c" style={{animationDelay:`${i*.06}s`}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'12px'}}>
                  <div style={{width:'40px',height:'40px',background:`${k.color}14`,borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>{k.icon}</div>
                  <div style={{display:'inline-flex',alignItems:'center',gap:'4px',background:k.up?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)',borderRadius:'20px',padding:'3px 9px'}}>
                    <span style={{fontSize:'13px'}}>{k.up?'↑':'↓'}</span>
                    <span style={{fontSize:'11.5px',fontWeight:'700',color:k.up?'#22C55E':'#EF4444'}}>{k.chg}</span>
                  </div>
                </div>
                <div style={{fontSize:'11px',color:'#9A6C3C',marginBottom:'4px'}}>{k.label}</div>
                <div style={{fontSize:'22px',fontWeight:'900',color:'#111111',fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1}}>
                  {k.val.toFixed(2)} <span style={{fontSize:'12px',fontWeight:'500',color:'#9A6C3C'}}>د.ك</span>
                </div>
              </div>
            ))}
          </div>

          {/* ─── AI INSIGHT + 6-MONTH CHART ─── */}
          <div className="insight-grid" style={{...S(120),display:'grid',gridTemplateColumns:'280px 1fr',gap:'16px'}}>
            {/* AI insight card */}
            <div className="dc" style={{padding:'22px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'18px'}}>
                <div style={{width:'36px',height:'36px',background:'linear-gradient(135deg,#111111,#2D1A0A)',borderRadius:'11px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>🧠</div>
                <div style={{fontSize:'14px',fontWeight:'800',color:'#111111'}}>رؤية المدير المالي الذكي</div>
              </div>
              <div style={{fontSize:'11.5px',color:'#9A6C3C',marginBottom:'14px',fontWeight:'600'}}>تحليل هذا الشهر</div>
              {[
                {text:'الادخار أعلى من الشهر الماضي',chg:'+15.31%',up:true},
                {text:'المصروفات ارتفعت من بند الترفيه',chg:'+23%',up:false},
                {text:'الاستثمار ممتاز — استمر',chg:'+12.71%',up:true},
              ].map((ins,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'11px 13px',borderRadius:'12px',background:ins.up?'rgba(34,197,94,.05)':'rgba(239,68,68,.05)',border:`1px solid ${ins.up?'rgba(34,197,94,.15)':'rgba(239,68,68,.15)'}`,marginBottom:'8px'}}>
                  <span style={{fontSize:'14px',flexShrink:0}}>{ins.up?'✅':'⚠️'}</span>
                  <div>
                    <div style={{fontSize:'12.5px',color:'#5B4332',lineHeight:1.5}}>{ins.text}</div>
                    <div style={{fontSize:'12px',fontWeight:'800',color:ins.up?'#22C55E':'#EF4444',marginTop:'3px'}}>{ins.chg}</div>
                  </div>
                </div>
              ))}
              <button style={{width:'100%',marginTop:'14px',padding:'11px',background:'linear-gradient(135deg,#111111,#2D1A0A)',border:'none',borderRadius:'13px',color:'#D8AE63',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Tajawal,sans-serif',transition:'all .2s'}}
                onMouseEnter={e=>(e.currentTarget.style.opacity='0.85')} onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
                عرض التحليل الكامل
              </button>
            </div>
            {/* 6-month chart */}
            <div className="dc" style={{padding:'22px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                <h3 style={{fontSize:'15px',fontWeight:'800',color:'#111111'}}>نظرة عامة على 6 أشهر</h3>
                <select style={{fontSize:'12px',padding:'6px 10px',borderRadius:'10px',border:'1px solid rgba(216,174,99,.2)',background:'#FFFDFC',color:'#5B4332',fontFamily:'Tajawal,sans-serif',cursor:'pointer',outline:'none'}} onChange={e=>setSelectedMonth(e.target.value)}>
                  {history.map(h=><option key={h.month} value={h.month}>{h.label}</option>)}
                </select>
              </div>
              <LineChart data={history}/>
            </div>
          </div>

          {/* ─── MONTH COMPARISON ─── */}
          <div className="dc" style={{...S(160),padding:'24px'}}>
            <h3 style={{fontSize:'16px',fontWeight:'800',color:'#111111',marginBottom:'4px'}}>مقارنة الأشهر</h3>
            <p style={{fontSize:'12px',color:'#9A6C3C',marginBottom:'18px'}}>احسب الفرق بين كل شهر وآخر</div>
            <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'20px',flexWrap:'wrap'}}>
              <div>
                <label style={{fontSize:'11px',color:'#9A6C3C',display:'block',marginBottom:'5px',fontWeight:'600'}}>اختر الشهر الأول</label>
                <select className="sf-select" style={{padding:'8px 12px',borderRadius:'12px',border:'1.5px solid rgba(216,174,99,.25)',background:'#FFFDFC',color:'#111111',fontFamily:'Tajawal,sans-serif',fontSize:'13px',outline:'none',cursor:'pointer'}} value={cmpA} onChange={e=>setCmpA(+e.target.value)}>
                  {history.map((h,i)=><option key={h.month} value={i}>{h.label}</option>)}
                </select>
              </div>
              <div style={{fontSize:'16px',color:'#9A6C3C',alignSelf:'flex-end',paddingBottom:'6px',fontWeight:'800'}}>VS</div>
              <div>
                <label style={{fontSize:'11px',color:'#9A6C3C',display:'block',marginBottom:'5px',fontWeight:'600'}}>اختر الشهر الثاني</label>
                <select style={{padding:'8px 12px',borderRadius:'12px',border:'1.5px solid rgba(216,174,99,.25)',background:'#FFFDFC',color:'#111111',fontFamily:'Tajawal,sans-serif',fontSize:'13px',outline:'none',cursor:'pointer'}} value={cmpB} onChange={e=>setCmpB(+e.target.value)}>
                  {history.map((h,i)=><option key={h.month} value={i}>{h.label}</option>)}
                </select>
              </div>
              <button style={{alignSelf:'flex-end',padding:'9px 18px',background:'linear-gradient(135deg,#D8AE63,#9A6C3C)',border:'none',borderRadius:'12px',color:'#111111',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Tajawal,sans-serif'}}>
                عرض الفرق
              </button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px'}}>
              {([['income','الدخل'],['expenses','المصروفات'],['savings','الادخار'],['investment','الاستثمار']] as const).map(([key,label])=>{
                const{diff,pct}=cmpDiff(key as keyof MonthRecord);
                const up=diff>=0;
                return(
                  <div key={key} style={{background:up?'rgba(34,197,94,.05)':'rgba(239,68,68,.05)',border:`1.5px solid ${up?'rgba(34,197,94,.18)':'rgba(239,68,68,.18)'}`,borderRadius:'16px',padding:'16px'}}>
                    <div style={{fontSize:'11px',color:'#9A6C3C',marginBottom:'8px',fontWeight:'600'}}>الفرق في {label}</div>
                    <div style={{fontSize:'22px',fontWeight:'900',color:up?'#22C55E':'#EF4444',fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1,marginBottom:'4px'}}>
                      {up?'+':''}{diff.toFixed(2)} <span style={{fontSize:'12px'}}>د.ك</span>
                    </div>
                    <div style={{fontSize:'12px',fontWeight:'700',color:up?'#22C55E':'#EF4444',display:'flex',alignItems:'center',gap:'4px'}}>
                      <span>{up?'↑':'↓'}</span>{Math.abs(pct).toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── TRANSACTIONS + EXPENSE DIST ─── */}
          <div className="dist-grid" style={{...S(200),display:'grid',gridTemplateColumns:'1fr 320px',gap:'16px'}}>
            {/* Transactions table */}
            <div className="dc" style={{padding:'22px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                <h3 style={{fontSize:'15px',fontWeight:'800',color:'#111111'}}>تاريخ المعاملات</h3>
                <div style={{display:'flex',gap:'6px'}}>
                  {(['المصاريف','الدخل','الاستثمارات'] as const).map((t,i)=>(
                    <button key={t} className={'tab-btn '+(i===(['exp','inc','inv'] as const).indexOf(transTab)?'on':'off')}
                      onClick={()=>setTransTab(['exp','inc','inv'][i] as any)}>{t}</button>
                  ))}
                </div>
              </div>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'2px solid rgba(216,174,99,.12)'}}>
                    {['التاريخ','الفئة','الوصف','المبلغ','النسبة'].map(h=><th key={h} style={{padding:'8px 10px',textAlign:'right',fontSize:'11.5px',fontWeight:'700',color:'#9A6C3C',letterSpacing:'.02em'}}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sampleTransactions.map((t,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid rgba(216,174,99,.07)',transition:'background .15s'}} onMouseEnter={e=>(e.currentTarget.style.background='rgba(216,174,99,.04)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <td style={{padding:'11px 10px',fontSize:'12px',color:'#9A6C3C',direction:'ltr'}}>{t.date}</td>
                      <td style={{padding:'11px 10px',fontSize:'12.5px',color:'#5B4332',fontWeight:'600'}}>{t.category}</td>
                      <td style={{padding:'11px 10px',fontSize:'12.5px',color:'#9A6C3C'}}>{t.desc}</td>
                      <td style={{padding:'11px 10px',fontSize:'13px',fontWeight:'800',color:t.amount<0?'#EF4444':'#22C55E',fontFamily:"'IBM Plex Sans Arabic',sans-serif",direction:'ltr'}}>{t.amount.toFixed(2)}</td>
                      <td style={{padding:'11px 10px'}}>
                        <div style={{display:'inline-flex',alignItems:'center',gap:'4px',background:`${t.pct>10?'rgba(34,197,94,.08)':'rgba(216,174,99,.08)'}`,borderRadius:'20px',padding:'2px 8px'}}>
                          <span style={{fontSize:'11px',fontWeight:'700',color:t.pct>10?'#22C55E':'#D8AE63'}}>{t.pct>0?'+':''}{t.pct.toFixed(2)}%</span>
                          <span style={{fontSize:'12px'}}>{t.pct>0?'↑':'↓'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button style={{width:'100%',marginTop:'14px',padding:'9px',background:'transparent',border:'1.5px solid rgba(216,174,99,.2)',borderRadius:'12px',color:'#9A6C3C',fontSize:'12.5px',fontWeight:'700',cursor:'pointer',fontFamily:'Tajawal,sans-serif'}}>عرض كل المعاملات</button>
            </div>

            {/* Donut chart */}
            <div className="dc" style={{padding:'22px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                <h3 style={{fontSize:'14px',fontWeight:'800',color:'#111111'}}>توزيع المصروفات</h3>
                <span style={{fontSize:'11px',color:'#9A6C3C',background:'rgba(216,174,99,.08)',borderRadius:'20px',padding:'3px 10px'}}>مايو 2024</span>
              </div>
              <div style={{display:'flex',justifyContent:'center',marginBottom:'14px'}}>
                <DonutChart data={DONUT_DATA} total={totalExpenses}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
                {DONUT_DATA.map((d,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <div style={{width:'10px',height:'10px',borderRadius:'50%',background:d.color,flexShrink:0}}/>
                    <span style={{flex:1,fontSize:'12px',color:'#5B4332',fontWeight:'500'}}>{d.label}</span>
                    <span style={{fontSize:'12px',fontWeight:'700',color:'#111111',fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── INVESTMENT SECTION ─── */}
          <div className="invest-grid" style={{...S(240),display:'grid',gridTemplateColumns:'200px 1fr 200px',gap:'16px'}}>
            {/* Summary */}
            <div className="dc" style={{padding:'20px'}}>
              <h3 style={{fontSize:'14px',fontWeight:'800',color:'#111111',marginBottom:'16px'}}>ملخص الاستثمارات</h3>
              {[
                {label:'إجمالي قيمة المحفظة',val:`${SAMPLE_INVESTMENTS.reduce((a,i)=>a+i.amount,0).toFixed(0)} د.ك`},
                {label:'الأرباح المحققة',val:`+${SAMPLE_INVESTMENTS.reduce((a,i)=>a+i.profit,0).toFixed(2)} د.ك`,color:'#22C55E'},
                {label:'الأرباح غير المحققة',val:`+38.20 د.ك`,color:'#D8AE63'},
                {label:'إجمالي العائد',val:`+133.60 د.ك`,color:'#22C55E'},
              ].map((r,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:i<3?'1px solid rgba(216,174,99,.07)':'none'}}>
                  <span style={{fontSize:'11px',color:'#9A6C3C',fontWeight:'500',maxWidth:'100px',lineHeight:1.4}}>{r.label}</span>
                  <span style={{fontSize:'13px',fontWeight:'800',color:r.color||'#111111',fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{r.val}</span>
                </div>
              ))}
              <button style={{width:'100%',marginTop:'12px',padding:'9px',background:'linear-gradient(135deg,#D8AE63,#9A6C3C)',border:'none',borderRadius:'12px',color:'#111111',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Tajawal,sans-serif'}}>عرض محفظة الاستثمارات</button>
            </div>

            {/* Bar chart */}
            <div className="dc" style={{padding:'20px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
                <h3 style={{fontSize:'14px',fontWeight:'800',color:'#111111'}}>أداء الاستثمارات (6 أشهر)</h3>
                <div style={{display:'flex',gap:'10px'}}>
                  {[{color:'#D8AE63',label:'الأصول المحققة'},{color:'#22C55E',label:'الأرباح المحققة'}].map((l,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'5px'}}><div style={{width:'10px',height:'10px',borderRadius:'3px',background:l.color}}/><span style={{fontSize:'10px',color:'#9A6C3C'}}>{l.label}</span></div>
                  ))}
                </div>
              </div>
              <BarChart data={history.map(h=>({label:h.label.split(' ')[0],v1:h.investment,v2:h.investment*0.15}))}/>
            </div>

            {/* Top investments */}
            <div className="dc" style={{padding:'20px'}}>
              <h3 style={{fontSize:'14px',fontWeight:'800',color:'#111111',marginBottom:'14px'}}>أفضل الاستثمارات</h3>
              {SAMPLE_INVESTMENTS.map((inv,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 0',borderBottom:i<2?'1px solid rgba(216,174,99,.07)':'none'}}>
                  <div style={{width:'36px',height:'36px',background:'rgba(216,174,99,.10)',borderRadius:'11px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'17px',flexShrink:0}}>{inv.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'12px',fontWeight:'700',color:'#111111',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inv.name}</div>
                    <div style={{fontSize:'11px',fontWeight:'800',color:'#22C55E'}}>+{inv.pct}%</div>
                  </div>
                </div>
              ))}
              <button style={{width:'100%',marginTop:'12px',padding:'9px',background:'transparent',border:'1.5px solid rgba(216,174,99,.2)',borderRadius:'12px',color:'#9A6C3C',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Tajawal,sans-serif'}}>عرض كل الاستثمارات</button>
            </div>
          </div>

          {/* ─── GOALS + QUICK ACTIONS ─── */}
          <div style={{...S(280),display:'grid',gridTemplateColumns:'1fr 240px',gap:'16px'}}>
            {/* Goals */}
            <div className="dc" style={{padding:'22px'}}>
              <h3 style={{fontSize:'15px',fontWeight:'800',color:'#111111',marginBottom:'18px'}}>الأهداف المالية</h3>
              <div className="goals-grid" style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'14px'}}>
                {SAMPLE_GOALS.map(g=>{
                  const pct=Math.round((g.saved/g.target)*100);
                  return(
                    <div key={g.id} className="dc" style={{padding:'16px',border:`1px solid ${g.color}22`}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <span style={{fontSize:'20px'}}>{g.icon}</span>
                          <span style={{fontSize:'13px',fontWeight:'800',color:'#111111'}}>{g.name}</span>
                        </div>
                        <span style={{fontSize:'14px',fontWeight:'900',color:g.color}}>{pct}%</span>
                      </div>
                      <div className="prog-bar" style={{marginBottom:'8px'}}>
                        <div className="prog-fill" style={{width:`${pct}%`,background:`linear-gradient(90deg,${g.color},${g.color}88)`}}/>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#9A6C3C'}}>
                        <span style={{fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{g.saved.toLocaleString('ar-KW')} د.ك</span>
                        <span style={{fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>من {g.target.toLocaleString('ar-KW')} د.ك</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick actions */}
            <div className="dc" style={{padding:'20px'}}>
              <h3 style={{fontSize:'14px',fontWeight:'800',color:'#111111',marginBottom:'14px'}}>إجراءات سريعة</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                {[
                  {icon:'💵',label:'إضافة دخل',action:()=>router.push('/')},
                  {icon:'🛒',label:'إضافة مصروف',action:()=>router.push('/')},
                  {icon:'📈',label:'تحويل استثمار',action:()=>router.push('/education/investments')},
                  {icon:'📊',label:'تقرير شهري',action:()=>window.print()},
                  {icon:'🖨️',label:'طباعة التقرير',action:()=>window.print()},
                  {icon:'📥',label:'تصدير PDF',action:()=>window.print()},
                ].map((a,i)=>(
                  <button key={i} className="action-btn" onClick={a.action}>
                    <span style={{fontSize:'20px'}}>{a.icon}</span>
                    <span style={{fontSize:'11.5px',fontWeight:'700',color:'#5B4332'}}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── HISTORY TABLES ─── */}
          <div style={{...S(320),display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            {/* Investment history */}
            <div className="dc" style={{padding:'22px'}}>
              <h3 style={{fontSize:'15px',fontWeight:'800',color:'#111111',marginBottom:'16px'}}>الاستثمارات الشهرية</h3>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'2px solid rgba(216,174,99,.12)'}}>
                    {['الشهر','إجمالي الاستثمار','الأرباح','التغيير %'].map(h=><th key={h} style={{padding:'8px 8px',textAlign:'right',fontSize:'11px',fontWeight:'700',color:'#9A6C3C'}}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((h,i)=>{
                    const prev=history[history.length-i-2];
                    const profit=h.investment*0.157;
                    const chgPct=prev?((h.investment-prev.investment)/prev.investment*100):18.02;
                    return(
                      <tr key={i} style={{borderBottom:'1px solid rgba(216,174,99,.07)'}} onMouseEnter={e=>(e.currentTarget.style.background='rgba(216,174,99,.03)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                        <td style={{padding:'10px 8px',fontSize:'12px',color:'#5B4332',fontWeight:'600'}}>{h.label}</td>
                        <td style={{padding:'10px 8px',fontSize:'12px',color:'#111111',fontFamily:"'IBM Plex Sans Arabic',sans-serif",fontWeight:'700'}}>{h.investment.toFixed(2)} <span style={{fontSize:'10px',color:'#9A6C3C'}}>د.ك</span></td>
                        <td style={{padding:'10px 8px',fontSize:'12px',color:'#22C55E',fontWeight:'700',fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>+{profit.toFixed(2)}</td>
                        <td style={{padding:'10px 8px'}}>
                          <span style={{fontSize:'12px',fontWeight:'800',color:chgPct>=0?'#22C55E':'#EF4444'}}>{chgPct>=0?'+':''}{chgPct.toFixed(2)}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expenses history */}
            <div className="dc" style={{padding:'22px'}}>
              <h3 style={{fontSize:'15px',fontWeight:'800',color:'#111111',marginBottom:'16px'}}>المصروفات الشهرية</h3>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'2px solid rgba(216,174,99,.12)'}}>
                    {['الشهر','إجمالي المصروفات','%','الفرق من السابق'].map(h=><th key={h} style={{padding:'8px 8px',textAlign:'right',fontSize:'11px',fontWeight:'700',color:'#9A6C3C'}}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((h,i)=>{
                    const prev=history[history.length-i-2];
                    const chg=prev?h.expenses-prev.expenses:53.90;
                    const chgPct=prev?((h.expenses-prev.expenses)/prev.expenses*100):4.32;
                    return(
                      <tr key={i} style={{borderBottom:'1px solid rgba(216,174,99,.07)'}} onMouseEnter={e=>(e.currentTarget.style.background='rgba(216,174,99,.03)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                        <td style={{padding:'10px 8px',fontSize:'12px',color:'#5B4332',fontWeight:'600'}}>{h.label}</td>
                        <td style={{padding:'10px 8px',fontSize:'12px',color:'#111111',fontFamily:"'IBM Plex Sans Arabic',sans-serif",fontWeight:'700'}}>{h.expenses.toFixed(0)} <span style={{fontSize:'10px',color:'#9A6C3C'}}>د.ك</span></td>
                        <td style={{padding:'10px 8px',fontSize:'12px',color:chgPct>=0?'#EF4444':'#22C55E',fontWeight:'800'}}>{chgPct>=0?'+':''}{chgPct.toFixed(2)}%</td>
                        <td style={{padding:'10px 8px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                            <div style={{width:'40px',height:'6px',borderRadius:'10px',overflow:'hidden',background:'rgba(216,174,99,.12)'}}>
                              <div style={{height:'100%',width:`${Math.min(100,Math.abs(chgPct)*5)}%`,background:chgPct>=0?'#EF4444':'#22C55E',borderRadius:'10px'}}/>
                            </div>
                            <span style={{fontSize:'11px',color:chgPct>=0?'#EF4444':'#22C55E',fontWeight:'700'}}>{chg>=0?'+':''}{chg.toFixed(2)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── FOOTER ─── */}
          <div style={{...S(360),marginTop:'8px',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:'1px solid rgba(216,174,99,.12)',flexWrap:'wrap',gap:'12px'}}>
            <div>
              <div style={{fontSize:'16px',fontWeight:'900',color:'#D8AE63',marginBottom:'2px'}}>THE SFM</div>
              <div style={{fontSize:'11px',color:'#9A6C3C'}}>المدير المالي الذكي • AI Wealth Platform</div>
            </div>
            <div style={{fontSize:'11px',color:'#BFB5A8',textAlign:'center'}}>جميع الحقوق محفوظة • THE SFM 2026</div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>router.push('/profile')} style={{padding:'7px 14px',background:'transparent',border:'1px solid rgba(216,174,99,.2)',borderRadius:'10px',color:'#9A6C3C',fontSize:'12px',cursor:'pointer',fontFamily:'Tajawal,sans-serif'}}>الملف الشخصي</button>
              <button onClick={()=>router.push('/projects')} style={{padding:'7px 14px',background:'transparent',border:'1px solid rgba(216,174,99,.2)',borderRadius:'10px',color:'#9A6C3C',fontSize:'12px',cursor:'pointer',fontFamily:'Tajawal,sans-serif'}}>المشاريع</button>
            </div>
          </div>

        </main>
      </div>
    </div>
  </>);
}
