'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Sidebar } from '@/components/Sidebar';
import { UserChip } from '@/components/UserChip';
import { useCurrency } from '@/lib/useCurrency';
import { formatCurrency } from '@/lib/format';
import { calculateGoalProgress, parseMoney } from '@/lib/goalProgress';

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */
interface MonthSnapshot {
  month: string; label: string;
  income: number; expenses: number; savings: number; investment: number; charity: number;
}
type ExpenseRow = { id: string; name: string | null; amount: number | string | null; created_at?: string | null };
type GoalRow = { id: string; goal?: string | null; name?: string | null; amount?: number | string | null; target_amount?: number | string | null; targetAmount?: number | string | null; current_amount?: number | string | null; currentAmount?: number | string | null; saved_amount?: number | string | null; savedAmount?: number | string | null; notes?: string | null; icon?: string | null; color?: string | null };
type InvestmentRow = { id: string; name: string | null; amount: number | string | null };
type SavingsRow = { id: string; name: string | null; amount: number | string | null; created_at?: string | null };
type DonutItem = { label: string; pct: number; color: string; amount: number };
type ProfileRow = { display_name?: string | null; profession?: string | null };

/* ═══════════════════════════════════════════════════
   STATIC DATA
═══════════════════════════════════════════════════ */
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const NAV_ITEMS = [
  {id:'home', icon:'⊞', label:'الرئيسية'},
  {id:'expenses', icon:'🛒', label:'المصاريف'},
  {id:'income', icon:'💵', label:'الدخل'},
  {id:'invest', icon:'📈', label:'الاستثمارات'},
  {id:'goals', icon:'🎯', label:'الأهداف المالية'},
  {id:'reports', icon:'📊', label:'التقارير'},
  {id:'ai', icon:'🧠', label:'تحليلات الذكية'},
  {id:'charity', icon:'🤲', label:'الأعمال الخيرية'},
  {id:'notifications', icon:'🔔', label:'الإشعارات'},
];

const NAV_ROUTES: Record<string, string> = {
  home: '/',
  expenses: '/expenses',
  income: '/income',
  invest: '/education/investments',
  goals: '/goals',
  reports: '/reports',
  ai: '/ai',
  charity: '/charity',
  notifications: '/notifications',
};

/* ═══════════════════════════════════════════════════
   SVG CHARTS
═══════════════════════════════════════════════════ */
function LineChart({data,width=520,height=200}:{data:MonthSnapshot[];width?:number;height?:number}){
  const { t } = useLanguage();
  const pad={t:20,r:20,b:40,l:50};
  const w=width-pad.l-pad.r, h=height-pad.t-pad.b;
  const series=[
    {key:'income',color:'#22C55E',label:t('chart_income')},
    {key:'expenses',color:'#EF4444',label:t('chart_expenses')},
    {key:'savings',color:'#D8AE63',label:t('chart_savings')},
    {key:'investment',color:'#3B82F6',label:t('chart_investment')},
  ] as const;
  const allVals=data.flatMap(d=>series.map(s=>d[s.key]));
  const maxV=Math.max(...allVals)*1.1||1;
  const xStep=w/(data.length-1||1);
  const toY=(v:number)=>pad.t+h-(v/maxV)*h;
  const toX=(i:number)=>pad.l+i*xStep;
  const [tooltip,setTooltip]=useState<{x:number;y:number;idx:number}|null>(null);
  return(
    <div style={{position:'relative',width:'100%'}}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{width:'100%',height:'auto',maxHeight:'260px',overflow:'visible'}}>
        {/* Grid lines */}
        {[0,0.25,0.5,0.75,1].map((t,i)=>{
          const y=pad.t+h*(1-t);
          return<g key={i}><line x1={pad.l} y1={y} x2={pad.l+w} y2={y} stroke="rgba(216,174,99,0.08)" strokeWidth="1"/><text x={pad.l-6} y={y+4} textAnchor="end" fontSize="10" fill="#9A6C3C">{Math.round(maxV*t)}</text></g>;
        })}
        {/* X labels */}
        {data.map((d,i)=><text key={i} x={toX(i)} y={height-8} textAnchor="middle" fontSize="10" fill="#9A6C3C">{d.label.split(' ')[0]}</text>)}
        {/* Lines + dots */}
        {series.map(s=>{
          const pts=data.map((d,i)=>`${toX(i)},${toY(d[s.key])}`).join(' ');
          return(
            <g key={s.key}>
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              {data.map((d,i)=><circle key={i} cx={toX(i)} cy={toY(d[s.key])} r="4" fill={s.color} stroke="#FFFDFC" strokeWidth="2" style={{cursor:'pointer'}} onMouseEnter={()=>setTooltip({x:toX(i),y:toY(d[s.key]),idx:i})} onMouseLeave={()=>setTooltip(null)}/>)}
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
              {series.map((s,i)=><text key={s.key} x={x+8} y={tooltip.y-26+i*14} fontSize="10" fill={s.color}>{s.label}: {d[s.key].toFixed(2)}</text>)}
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

function DonutChart({data,total}:{data:DonutItem[];total:number}){
  const { t } = useLanguage();
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
      <text x={cx} y={cy+12} textAnchor="middle" fontSize="10" fill="#9A6C3C">{t('total_expenses')}</text>
    </svg>
  );
}

function BarChart({data}:{data:{label:string;v1:number;v2:number}[]}){
  const maxV=Math.max(...data.flatMap(d=>[d.v1,d.v2]))*1.15||1;
  const h=120,pad=30,bw=14,gap=6;
  // minimum W=480 keeps the viewBox always landscape (480:150 = 3.2:1)
  // preventing the SVG from scaling to >300px tall on wide containers
  const W=Math.max(data.length*(bw*2+gap+12)+pad*2, 480);
  return(
    <svg viewBox={`0 0 ${W} ${h+30}`} style={{width:'100%',height:'auto',maxHeight:'220px'}}>
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

function EmptyState({
  icon, title, subtitle, btnLabel, btnHref, compact,
}: {
  icon: string;
  title: string;
  subtitle: string;
  btnLabel?: string;
  btnHref?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  return (
    <div style={{
      textAlign: 'center',
      padding: compact ? '16px 12px' : '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: compact ? '8px' : '12px',
    }}>
      <div style={{ fontSize: compact ? '28px' : '44px' }}>{icon}</div>
      <div style={{
        fontSize: compact ? '13px' : '15px', fontWeight: '700',
        color: '#111111', fontFamily: 'Tajawal,sans-serif',
      }}>{title}</div>
      <div style={{
        fontSize: '12px', color: '#9A6C3C',
        lineHeight: 1.5, maxWidth: '220px',
        fontFamily: 'Tajawal,sans-serif',
      }}>{subtitle}</div>
      {btnLabel && btnHref && (
        <button type="button" onClick={() => router.push(btnHref)} style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          padding: compact ? '7px 16px' : '10px 22px',
          background: 'linear-gradient(135deg,#D8AE63,#9A6C3C)',
          border: 'none', borderRadius: '13px',
          color: '#111111', fontSize: compact ? '12px' : '13.5px', fontWeight: '700',
          textDecoration: 'none', fontFamily: 'Tajawal,sans-serif',
          cursor: 'pointer',
        }}>{btnLabel}</button>
      )}
    </div>
  );
}

function amountOf(value: number | string | null | undefined) {
  return parseMoney(value);
}

function formatExpenseName(name: string | null | undefined, fallback: string, charityFallback: string) {
  const raw = name || fallback;
  if (!raw.startsWith('خيرية:')) return raw;
  const note = raw.split(':').slice(2).join(':').trim();
  return `🤲 ${note || charityFallback}`;
}

function AnalysisBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section style={{
      background: '#FFFDFC',
      border: '1px solid rgba(216,174,99,.14)',
      borderRadius: '18px',
      padding: '16px',
      minWidth: 0,
      boxShadow: '0 10px 24px rgba(17,17,17,.04)',
    }}>
      <h3 style={{
        margin: '0 0 10px',
        fontSize: '15px',
        fontWeight: 900,
        color: '#111111',
        fontFamily: 'Tajawal,Arial,sans-serif',
      }}>{title}</h3>
      <ul style={{
        margin: 0,
        paddingInlineStart: '18px',
        display: 'grid',
        gap: '8px',
        color: '#5B4332',
        fontSize: '13px',
        fontWeight: 700,
        lineHeight: 1.7,
        fontFamily: 'Tajawal,Arial,sans-serif',
      }}>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════ */
export default function DashboardPage(){
  const {user,loading,isGuest}=useAuth();
  const {dir, isAr, isFr, t} = useLanguage();
  const { currency } = useCurrency();
  const fmt = (v: number) => formatCurrency(v, currency, isAr ? 'ar' : 'en');
  const router=useRouter();
  const [profile,setProfile]=useState<ProfileRow>({display_name:'SFM',profession:'خبير مالي'});
  const [totalIncome,setTotalIncome]=useState(0);
  const [totalExpenses,setTotalExpenses]=useState(0);
  const [goals,setGoals]=useState<GoalRow[]>([]);
  const [investments,setInvestments]=useState<InvestmentRow[]>([]);
  const [savingsItems,setSavingsItems]=useState<SavingsRow[]>([]);
  const [expenseItems,setExpenseItems]=useState<ExpenseRow[]>([]);
  const [monthHistory,setMonthHistory]=useState<MonthSnapshot[]>([]);
  const [cmpA,setCmpA]=useState(0);
  const [cmpB,setCmpB]=useState(1);
  const [activeNav,setActiveNav]=useState('home');
  const [mounted,setMounted]=useState(false);
  const [fullAnalysisOpen,setFullAnalysisOpen]=useState(false);

  useEffect(()=>{
    setTimeout(()=>setMounted(true),60);
    if(!loading&&user){loadProfile();}
  },[user,loading]);

  const loadProfile=async()=>{
    const userId = user?.id;
    if (!userId) return;
    if (process.env.NODE_ENV === 'development') console.time('dashboard_initial_load');
    const [
      profileResult,
      incomeResult,
      goalsResult,
      investmentsResult,
      savingsResult,
      expensesResult,
    ] = await Promise.allSettled([
      supabase.from('profiles').select('*').eq('id',userId).maybeSingle(),
      supabase.from('monthly_income_sources').select('amount').eq('user_id',userId),
      supabase.from('financial_goals').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('investment_items').select('id,name,amount').eq('user_id',userId),
      supabase.from('savings_items').select('id,name,amount,created_at').eq('user_id',userId),
      supabase.from('expense_items').select('id,name,amount,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(250),
    ]);

    const profileResponse = profileResult.status === 'fulfilled' ? profileResult.value : null;
    if(profileResponse?.data)setProfile(profileResponse.data as ProfileRow);

    const incomeResponse = incomeResult.status === 'fulfilled' ? incomeResult.value : null;
    const s = incomeResponse?.data as { amount: number | string | null }[] | null | undefined;
    const realIncome=s?.reduce((a:number,r:{amount:number|string|null})=>a+amountOf(r.amount),0) ?? 0;
    setTotalIncome(realIncome);

    const goalsResponse = goalsResult.status === 'fulfilled' ? goalsResult.value : null;
    const goalsData = goalsResponse?.data;
    setGoals((goalsData ?? []) as GoalRow[]);

    const investmentsResponse = investmentsResult.status === 'fulfilled' ? investmentsResult.value : null;
    const invRows=(investmentsResponse?.data ?? []) as InvestmentRow[];
    setInvestments(invRows);

    const savingsResponse = savingsResult.status === 'fulfilled' ? savingsResult.value : null;
    const savingsData = savingsResponse?.data;
    const savingRows=(savingsData ?? []) as SavingsRow[];
    setSavingsItems(savingRows);
    const realSavings=savingRows.reduce((sum,row)=>sum+amountOf(row.amount),0);

    const expensesResponse = expensesResult.status === 'fulfilled' ? expensesResult.value : null;
    const expData = expensesResponse?.data;
    const expRows=(expData ?? []) as ExpenseRow[];
    setExpenseItems(expRows);
    const realExp=expRows.reduce((sum,row)=>sum+amountOf(row.amount),0);
    setTotalExpenses(realExp);

    const realCharity=expRows
      .filter(row=>row.name?.startsWith('خيرية:'))
      .reduce((sum,row)=>sum+amountOf(row.amount),0);
    const realInvestment=invRows.reduce((sum,row)=>sum+amountOf(row.amount),0);
    const now=new Date();
    const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    if(realIncome>0||realExp>0||realSavings>0){
      setMonthHistory([{
        month:ym,
        label:MONTHS_AR[now.getMonth()]+' '+now.getFullYear(),
        income:realIncome,
        expenses:realExp,
        savings:realSavings,
        investment:realInvestment,
        charity:realCharity,
      }]);
    } else {
      setMonthHistory([]);
    }
    if (process.env.NODE_ENV === 'development') console.timeEnd('dashboard_initial_load');
  };

  const totalSavings=savingsItems.reduce((sum,item)=>sum+amountOf(item.amount),0);
  const totalInvestment=investments.reduce((sum,item)=>sum+amountOf(item.amount),0);
  const netWorth=totalIncome+totalSavings;
  const healthScore=totalIncome>0?Math.min(100,Math.round(60+(totalSavings/totalIncome)*40)):0;
  const monthlyGrowth:number=0;
  const monthlyGrowthPct:number=0;
  const initials=(profile.display_name||'SFM').substring(0,2).toUpperCase();
  const netBalance=totalIncome-totalExpenses;
  const expenseRatio=totalIncome>0?totalExpenses/totalIncome:0;
  const hasEnoughAnalysisData=totalIncome>0||totalExpenses>0||goals.length>0||investments.length>0||savingsItems.length>0;
  const L=useCallback((ar:string,en:string,fr:string)=>isAr?ar:isFr?fr:en,[isAr,isFr]);
  const locale=isAr?'ar-KW':isFr?'fr-FR':'en-US';

  const S=(d:number)=>({opacity:mounted?1:0,transform:mounted?'translateY(0)':'translateY(18px)',transition:`opacity .5s ease ${d}ms, transform .5s ease ${d}ms`});

  useEffect(()=>{
    if(!fullAnalysisOpen)return;
    const original=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=original;};
  },[fullAnalysisOpen]);

  const donutData=useMemo(()=>{
    if(expenseItems.length===0)return[];
    const groups:Record<string,number>={};
    const total=expenseItems.reduce((sum,item)=>sum+amountOf(item.amount),0);
    expenseItems.forEach(item=>{
      const name=item.name||'';
      const amt=amountOf(item.amount);
      let cat='other';
      if(name.startsWith('خيرية:'))cat='charity';
      else if(/سكن|إيجار|منزل/i.test(name))cat='housing';
      else if(/طعام|مطعم|أكل/i.test(name))cat='food';
      else if(/سيارة|مواصلات|بنزين/i.test(name))cat='transport';
      else if(/كهرباء|ماء|فاتورة/i.test(name))cat='utilities';
      else if(/تسوق|ملابس/i.test(name))cat='shopping';
      else if(/ترفيه|سينما|سفر/i.test(name))cat='entertainment';
      else if(/صحة|دواء|طبيب/i.test(name))cat='health';
      groups[cat]=(groups[cat]||0)+amt;
    });
    const PALETTE=['#D8AE63','#9A6C3C','#5B4332','#C8A96B','#22C55E','#3B82F6','#8A7060','#BFB5A8'];
    const categoryLabel:Record<string,string>={
      charity:L('خيرية','Charity','Charité'),
      housing:t('dist_housing'),
      food:t('dist_food'),
      transport:t('dist_transport'),
      utilities:L('المرافق','Utilities','Services publics'),
      shopping:t('dist_shopping'),
      entertainment:t('dist_entertain'),
      health:L('الصحة','Health','Santé'),
      other:t('dist_other'),
    };
    return Object.entries(groups).map(([label,amount],i)=>({
      label:categoryLabel[label] ?? label,
      pct:total>0?Math.round((amount/total)*100):0,
      color:PALETTE[i%PALETTE.length],
      amount,
    }));
  },[expenseItems,L,t]);

  const displayMonthHistory=useMemo(()=>monthHistory.map(item=>{
    const [year,month]=item.month.split('-').map(Number);
    const date=new Date(year,Math.max(0,(month||1)-1),1);
    return {...item,label:new Intl.DateTimeFormat(locale,{month:'long',year:'numeric'}).format(date)};
  }),[monthHistory,locale]);

  const cmpDiff=(key:keyof MonthSnapshot)=>{
    if(monthHistory.length<2)return{diff:0,pct:0};
    const a=monthHistory[cmpA]?.[key] as number||0;
    const b=monthHistory[cmpB]?.[key] as number||0;
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
      .dp{font-family:'Tajawal',sans-serif;background:#F7F3EA;min-height:100vh;color:#111111;display:flex;flex-direction:column}
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
      .home-language-mobile{display:none}
      .dp{width:100%;max-width:100%;min-height:100dvh;overflow-x:hidden}
      .dp *{box-sizing:border-box;min-width:0}
      .dc{width:100%;max-width:100%;min-width:0}
      .table-scroll{width:100%;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
      @media(max-width:1024px){
        .sidebar{display:none!important}
        .main-pad{
          margin-inline-start:0!important;
          margin-inline-end:0!important;
          margin-left:0!important;
          margin-right:0!important;
          width:100%!important;
          max-width:100%!important;
          padding:16px!important;
          overflow-x:hidden!important;
        }
        .home-language-mobile{display:flex!important;max-width:100%;min-width:0}
      }
      @media(max-width:768px){
        .main-pad{padding-inline:14px!important;gap:14px!important}
        .main-pad>div{width:100%;max-width:100%;min-width:0}
        .hero-grid,.insight-grid,.dist-grid,.invest-grid,.comparison-grid,.goals-actions-grid,.history-grid,.full-analysis-summary,.full-analysis-grid{grid-template-columns:1fr!important}
        .kpi-grid,.goals-grid{grid-template-columns:1fr!important}
        .quick-actions-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        .dc{border-radius:16px}
        .table-scroll table{min-width:520px}
      }
      @media(max-width:390px){
        .main-pad{padding-inline:12px!important}
        .quick-actions-grid{grid-template-columns:1fr!important}
        .home-language-mobile{gap:6px!important}
      }
    `}</style>

    <div className="dp" dir={dir}>

      <div style={{display:'flex',flex:1}}>

        {/* ═══ SIDEBAR ═══ */}
        <Sidebar />

        {/* ═══ MAIN CONTENT ═══ */}
        <main className="main-pad" style={{flex:1,marginInlineStart:'230px',padding:'20px',display:'flex',flexDirection:'column',gap:'16px',width:'auto',maxWidth:'100%',minWidth:0,overflowX:'hidden'}}>

          {/* ─── PAGE HEADER ─── */}
          <div style={{...S(0),display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <Image src="/sfm-logo.png" alt="THE SFM" width={28} height={28} className="rounded-sm" />
              <div>
              <h1 style={{fontSize:'clamp(20px,3vw,28px)',fontWeight:'900',color:'#111111',marginBottom:'4px'}}>
                {t('dash_hello')} {profile.display_name||'SFM'} 👋
              </h1>
              <p style={{fontSize:'13px',color:'#9A6C3C'}}>{t('dash_subtitle')}</p>
              </div>
            </div>
            <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
              {isGuest && (
                <span style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:'8px 12px',background:'rgba(216,174,99,.12)',border:'1px solid rgba(216,174,99,.24)',borderRadius:'999px',color:'#9A6C3C',fontSize:'12px',fontWeight:'900'}}>
                  {t('dash_guest')}
                </span>
              )}
              <div className="home-language-mobile" style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <LanguageSwitcher variant="gold" compact />
                <UserChip displayName={profile.display_name||undefined} />
              </div>
              <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:'7px',padding:'9px 18px',background:'#FFFDFC',border:'1.5px solid rgba(216,174,99,.25)',borderRadius:'12px',cursor:'pointer',color:'#5B4332',fontSize:'13px',fontWeight:'700',fontFamily:'Tajawal,sans-serif'}}>
                {t('dash_report')}
              </button>
            </div>
          </div>

          {/* ─── HERO CARD ─── */}
          <div style={{...S(40)}} className="dc no-h">
            <div className="hero-grid" style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'0',padding:'0',overflow:'hidden',borderRadius:'20px'}}>
              {/* Left: Net Wealth */}
              <div style={{padding:'28px 28px',background:'linear-gradient(145deg,#2B1A0D 0%,#3D2618 100%)',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:'-40px',right:'-40px',width:'180px',height:'180px',borderRadius:'50%',background:'radial-gradient(circle,rgba(216,174,99,.14) 0%,transparent 70%)',pointerEvents:'none'}}/>
                <div style={{fontSize:'12.5px',color:'rgba(216,174,99,.6)',fontWeight:'600',marginBottom:'10px',position:'relative',zIndex:1}}>{t('net_wealth')}</div>
                <div style={{fontSize:'clamp(28px,4vw,42px)',fontWeight:'900',color:'#FFFDFC',fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1,marginBottom:'12px',position:'relative',zIndex:1}}>
                  {fmt(netWorth)}
                </div>
                {monthlyGrowth!==0 ? (
                  <>
                    <div style={{display:'flex',gap:'10px',alignItems:'center',position:'relative',zIndex:1}}>
                      <div style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'rgba(34,197,94,.12)',borderRadius:'20px',padding:'5px 12px'}}>
                        <span style={{fontSize:'14px'}}>↑</span>
                        <span style={{fontSize:'13px',fontWeight:'700',color:'#22C55E',fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>+{fmt(monthlyGrowth)}</span>
                      </div>
                      <span style={{fontSize:'13px',fontWeight:'700',color:'#22C55E'}}>+{Math.abs(monthlyGrowthPct).toFixed(2)}%</span>
                    </div>
                    <div style={{fontSize:'11px',color:'rgba(216,174,99,.35)',marginTop:'8px',position:'relative',zIndex:1}}>{t('vs_prev_month')}</div>
                  </>
                ) : (
                  <div style={{fontSize:'12px',color:'rgba(216,174,99,.55)',marginTop:'8px',position:'relative',zIndex:1}}>{t('dash_enterMonthData')}</div>
                )}
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
                    <div style={{fontSize:'9px',color:'#9A6C3C',marginTop:'2px'}}>{t('health_score')}</div>
                  </div>
                </div>
                <div style={{fontSize:'12px',fontWeight:'700',color:'#22C55E',background:'rgba(34,197,94,.08)',borderRadius:'20px',padding:'4px 12px'}}>{t('health_great')}</div>
              </div>

              {/* Right: AI Manager */}
              <div style={{padding:'24px 24px',background:'linear-gradient(145deg,#FFFDFC,#FAF6EE)',display:'flex',flexDirection:'column',justifyContent:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
                  <div style={{width:'44px',height:'44px',background:'linear-gradient(135deg,#111111,#2D1A0A)',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',boxShadow:'0 3px 12px rgba(21,21,21,.2)'}} >🤖</div>
                  <div>
                    <div style={{fontSize:'13.5px',fontWeight:'800',color:'#111111'}}>{t('ai_manager')}</div>
                    <div style={{display:'flex',alignItems:'center',gap:'5px',marginTop:'3px'}}>
                      <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#22C55E',animation:'pulse 1.5s infinite'}}/>
                      <span style={{fontSize:'11px',color:'#22C55E',fontWeight:'600'}}>{t('ai_active')}</span>
                    </div>
                  </div>
                </div>
                <div style={{background:'rgba(216,174,99,.07)',border:'1px solid rgba(216,174,99,.15)',borderRadius:'12px',padding:'12px 14px'}}>
                  <p style={{fontSize:'12.5px',color:'#5B4332',lineHeight:1.65,fontWeight:'500'}}>{t('ai_working')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── KPI GRID ─── */}
          <div className="kpi-grid" style={{...S(80),display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px'}}>
            {[
              {id:'income',label:t('total_income'),val:totalIncome,icon:'💵',color:'#22C55E',hasData:totalIncome>0},
              {id:'expenses',label:t('total_expenses'),val:totalExpenses,icon:'🛒',color:'#EF4444',hasData:expenseItems.length>0},
              {id:'savings',label:t('total_savings'),val:totalSavings,icon:'💰',color:'#D8AE63',hasData:savingsItems.length>0},
              {id:'invest',label:t('total_invest'),val:totalInvestment,icon:'📈',color:'#3B82F6',hasData:investments.length>0},
            ].map((k,i)=>(
              <div key={i} className="dc kpi-c" style={{animationDelay:`${i*.06}s`}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'12px'}}>
                  <div style={{width:'40px',height:'40px',background:`${k.color}14`,borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>{k.icon}</div>
                  {k.hasData && <span style={{fontSize:'11px',fontWeight:'700',color:'#15803D',background:'rgba(34,197,94,.08)',borderRadius:'20px',padding:'3px 9px'}}>{t('actualData')}</span>}
                </div>
                <div style={{fontSize:'11px',color:'#9A6C3C',marginBottom:'4px'}}>{k.label}</div>
                <div style={{fontSize:'22px',fontWeight:'900',color:'#111111',fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1}}>
                  {fmt(k.val)}
                </div>
                {k.id==='savings' && !k.hasData && (
                  <div style={{fontSize:'11px',color:'#8A7060',marginTop:'7px',lineHeight:1.5}}>{t('savings_noEntriesYet')}</div>
                )}
              </div>
            ))}
          </div>

          {/* ─── AI INSIGHT + 6-MONTH CHART ─── */}
          <div className="insight-grid" style={{...S(120),display:'grid',gridTemplateColumns:'280px 1fr',gap:'16px',alignItems:'start'}}>
            {/* AI insight card */}
            <div className="dc" style={{padding:'22px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'18px'}}>
                <div style={{width:'36px',height:'36px',background:'linear-gradient(135deg,#111111,#2D1A0A)',borderRadius:'11px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>🧠</div>
                <div style={{fontSize:'14px',fontWeight:'800',color:'#111111'}}>{t('ai_insights_title')}</div>
              </div>
              <div style={{fontSize:'11.5px',color:'#9A6C3C',marginBottom:'14px',fontWeight:'600'}}>{t('ai_month_analysis')}</div>
              {[
                {text:totalIncome>0?L('تم تسجيل الدخل لهذا الشهر','Income is recorded for this month','Le revenu est enregistré pour ce mois'):L('لم يتم تسجيل دخل بعد','No income recorded yet','Aucun revenu enregistré pour le moment'),chg:totalIncome>0?fmt(totalIncome):'—',up:totalIncome>0},
                {text:expenseItems.length>0?L('تم تسجيل مصروفات فعلية','Actual expenses are recorded','Des dépenses réelles sont enregistrées'):L('لا توجد مصروفات مسجلة','No expenses recorded','Aucune dépense enregistrée'),chg:expenseItems.length>0?fmt(totalExpenses):'—',up:false},
                {text:investments.length>0?L('توجد استثمارات مسجلة','Investments are recorded','Des investissements sont enregistrés'):L('لا توجد استثمارات مسجلة','No investments recorded','Aucun investissement enregistré'),chg:investments.length>0?fmt(totalInvestment):'—',up:investments.length>0},
              ].map((ins,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'11px 13px',borderRadius:'12px',background:ins.up?'rgba(34,197,94,.05)':'rgba(239,68,68,.05)',border:`1px solid ${ins.up?'rgba(34,197,94,.15)':'rgba(239,68,68,.15)'}`,marginBottom:'8px'}}>
                  <span style={{fontSize:'14px',flexShrink:0}}>{ins.up?'✅':'⚠️'}</span>
                  <div>
                    <div style={{fontSize:'12.5px',color:'#5B4332',lineHeight:1.5}}>{ins.text}</div>
                    <div style={{fontSize:'12px',fontWeight:'800',color:ins.up?'#22C55E':'#EF4444',marginTop:'3px'}}>{ins.chg}</div>
                  </div>
                </div>
              ))}
              <button onClick={()=>setFullAnalysisOpen(true)} style={{width:'100%',marginTop:'14px',padding:'11px',background:'linear-gradient(135deg,#111111,#2D1A0A)',border:'none',borderRadius:'13px',color:'#D8AE63',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'Tajawal,sans-serif',transition:'all .2s'}}
                onMouseEnter={e=>(e.currentTarget.style.opacity='0.85')} onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
                {t('ai.viewFullAnalysis')}
              </button>
            </div>
            {/* 6-month chart */}
            <div className="dc" style={{padding:'22px',maxHeight:'360px',overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                <h3 style={{fontSize:'15px',fontWeight:'800',color:'#111111'}}>{t('chart_6months')}</h3>
                <select style={{fontSize:'12px',padding:'6px 10px',borderRadius:'10px',border:'1px solid rgba(216,174,99,.2)',background:'#FFFDFC',color:'#5B4332',fontFamily:'Tajawal,sans-serif',cursor:'pointer',outline:'none'}}>
                  {displayMonthHistory.map(h=><option key={h.month} value={h.month}>{h.label}</option>)}
                </select>
              </div>
              {displayMonthHistory.length>0 ? <LineChart data={displayMonthHistory}/> : (
                <EmptyState compact icon="📈" title={t('dash_noMonthlyHistory')} subtitle={t('dash_monthlyHistoryHint')} btnLabel={t('dash_enterMonthlyIncome')} btnHref="/income" />
              )}
            </div>
          </div>

          {/* ─── MONTH COMPARISON ─── */}
          <div className="dc" style={{...S(160),padding:'24px'}}>
            <h3 style={{fontSize:'16px',fontWeight:'800',color:'#111111',marginBottom:'4px'}}>{t('month_cmp_title')}</h3>
            {monthHistory.length<2 ? (
              <EmptyState compact icon="📊" title={t('dash_noComparisonData')} subtitle={t('dash_addTwoMonths')} btnLabel={t('dash_addIncomeData')} btnHref="/income" />
            ) : (
              <>
                <p style={{fontSize:'12px',color:'#9A6C3C',marginBottom:'18px'}}>{t('month_cmp_sub')}</p>
                <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'20px',flexWrap:'wrap'}}>
                  <div>
                    <label style={{fontSize:'11px',color:'#9A6C3C',display:'block',marginBottom:'5px',fontWeight:'600'}}>{t('month_first')}</label>
                    <select className="sf-select" style={{padding:'8px 12px',borderRadius:'12px',border:'1.5px solid rgba(216,174,99,.25)',background:'#FFFDFC',color:'#111111',fontFamily:'Tajawal,sans-serif',fontSize:'13px',outline:'none',cursor:'pointer'}} value={cmpA} onChange={e=>setCmpA(+e.target.value)}>
                      {displayMonthHistory.map((h,i)=><option key={h.month} value={i}>{h.label}</option>)}
                    </select>
                  </div>
                  <div style={{fontSize:'16px',color:'#9A6C3C',alignSelf:'flex-end',paddingBottom:'6px',fontWeight:'800'}}>VS</div>
                  <div>
                    <label style={{fontSize:'11px',color:'#9A6C3C',display:'block',marginBottom:'5px',fontWeight:'600'}}>{t('month_second')}</label>
                    <select style={{padding:'8px 12px',borderRadius:'12px',border:'1.5px solid rgba(216,174,99,.25)',background:'#FFFDFC',color:'#111111',fontFamily:'Tajawal,sans-serif',fontSize:'13px',outline:'none',cursor:'pointer'}} value={cmpB} onChange={e=>setCmpB(+e.target.value)}>
                      {displayMonthHistory.map((h,i)=><option key={h.month} value={i}>{h.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="comparison-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:'12px'}}>
                  {([['income',t('chart_income')],['expenses',t('chart_expenses')],['savings',t('chart_savings')],['investment',t('chart_investment')]] as const).map(([key,label])=>{
                    const{diff,pct}=cmpDiff(key as keyof MonthSnapshot);
                    const up=diff>=0;
                    return(
                      <div key={key} style={{background:up?'rgba(34,197,94,.05)':'rgba(239,68,68,.05)',border:`1.5px solid ${up?'rgba(34,197,94,.18)':'rgba(239,68,68,.18)'}`,borderRadius:'16px',padding:'16px'}}>
                        <div style={{fontSize:'11px',color:'#9A6C3C',marginBottom:'8px',fontWeight:'600'}}>{L('الفرق في','Difference in','Différence de')} {label}</div>
                        <div style={{fontSize:'22px',fontWeight:'900',color:up?'#22C55E':'#EF4444',fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1,marginBottom:'4px'}}>
                          {up?'+':''}{fmt(diff)}
                        </div>
                        <div style={{fontSize:'12px',fontWeight:'700',color:up?'#22C55E':'#EF4444',display:'flex',alignItems:'center',gap:'4px'}}>
                          <span>{up?'↑':'↓'}</span>{Math.abs(pct).toFixed(2)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ─── TRANSACTIONS + EXPENSE DIST ─── */}
          <div className="dist-grid" style={{...S(200),display:'grid',gridTemplateColumns:'1fr 320px',gap:'16px',alignItems:'start'}}>
            {/* Transactions table */}
            <div className="dc" style={{padding:'22px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                <h3 style={{fontSize:'15px',fontWeight:'800',color:'#111111'}}>{t('trans_title')}</h3>
              </div>
              {expenseItems.length===0 ? (
                <EmptyState compact icon="📋" title={t('dash_noExpenses')} subtitle={t('dash_addFirstExpense')} btnLabel={t('dash_addExpense')} btnHref="/expenses" />
              ) : (
                <>
                  <div className="table-scroll">
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{borderBottom:'2px solid rgba(216,174,99,.12)'}}>
                        {[t('dash_expenseName'),t('trans_amount'),t('trans_date')].map(h=><th key={h} style={{padding:'8px 10px',textAlign:'right',fontSize:'11.5px',fontWeight:'700',color:'#9A6C3C',letterSpacing:'.02em'}}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {expenseItems.slice(0,5).map(item=>(
                        <tr key={item.id} style={{borderBottom:'1px solid rgba(216,174,99,.07)',transition:'background .15s'}} onMouseEnter={e=>(e.currentTarget.style.background='rgba(216,174,99,.04)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                          <td style={{padding:'11px 10px',fontSize:'12.5px',color:'#5B4332',fontWeight:'600'}}>{formatExpenseName(item.name,t('dash_expenseFallback'),L('عمل خيري','Charity','Charité'))}</td>
                          <td style={{padding:'11px 10px',fontSize:'13px',fontWeight:'800',color:'#EF4444',fontFamily:"'IBM Plex Sans Arabic',sans-serif",direction:'ltr'}}>{fmt(amountOf(item.amount))}</td>
                          <td style={{padding:'11px 10px',fontSize:'12px',color:'#9A6C3C',direction:'ltr'}}>{item.created_at?new Date(item.created_at).toISOString().slice(0,10):'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                  <button onClick={()=>router.push('/expenses')} style={{width:'100%',marginTop:'14px',padding:'9px',background:'transparent',border:'1.5px solid rgba(216,174,99,.2)',borderRadius:'12px',color:'#9A6C3C',fontSize:'12.5px',fontWeight:'700',cursor:'pointer',fontFamily:'Tajawal,sans-serif'}}>{t('trans_view_all')}</button>
                </>
              )}
            </div>

            {/* Donut chart */}
            <div className="dc" style={{padding:'22px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                <h3 style={{fontSize:'14px',fontWeight:'800',color:'#111111'}}>{t('dist_title')}</h3>
                {donutData.length>0 && <span style={{fontSize:'11px',color:'#15803D',background:'rgba(34,197,94,.08)',borderRadius:'20px',padding:'3px 10px'}}>{t('actualData')}</span>}
              </div>
              {donutData.length===0 ? (
                <EmptyState compact icon="🥧" title={t('dash_noExpenseDistribution')} subtitle={t('dash_addExpensesForDistribution')} btnLabel={t('dash_addExpense')} btnHref="/expenses" />
              ) : (
                <>
                  <div style={{display:'flex',justifyContent:'center',marginBottom:'14px'}}>
                    <DonutChart data={donutData} total={totalExpenses}/>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
                    {donutData.map((d,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <div style={{width:'10px',height:'10px',borderRadius:'50%',background:d.color,flexShrink:0}}/>
                        <span style={{flex:1,fontSize:'12px',color:'#5B4332',fontWeight:'500'}}>{d.label}</span>
                        <span style={{fontSize:'12px',fontWeight:'700',color:'#111111',fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ─── INVESTMENT SECTION ─── */}
          <div className="invest-grid" style={{...S(240),display:'grid',gridTemplateColumns:'200px 1fr 200px',gap:'16px',alignItems:'start'}}>
            {/* Summary */}
            <div className="dc" style={{padding:'20px'}}>
              <h3 style={{fontSize:'14px',fontWeight:'800',color:'#111111',marginBottom:'16px'}}>{t('invest_summary')}</h3>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid rgba(216,174,99,.07)'}}>
                <span style={{fontSize:'11px',color:'#9A6C3C',fontWeight:'500',maxWidth:'100px',lineHeight:1.4}}>{t('invest_portfolio')}</span>
                <span style={{fontSize:'13px',fontWeight:'800',color:'#111111',fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{fmt(totalInvestment)}</span>
              </div>
              {investments.length===0 ? (
                <EmptyState compact icon="📈" title={t('dash_noInvestments')} subtitle={t('dash_addFirstInvestment')} btnLabel={t('dash_addInvestment')} btnHref="/education/investments" />
              ) : investments.map(item=>(
                <div key={item.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid rgba(216,174,99,.07)'}}>
                  <span style={{fontSize:'11px',color:'#9A6C3C',fontWeight:'500',maxWidth:'100px',lineHeight:1.4}}>{item.name || t('dash_investmentFallback')}</span>
                  <span style={{fontSize:'13px',fontWeight:'800',color:'#111111',fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{fmt(amountOf(item.amount))}</span>
                </div>
              ))}
              <button onClick={()=>router.push('/education/investments')} style={{width:'100%',marginTop:'12px',padding:'9px',background:'linear-gradient(135deg,#D8AE63,#9A6C3C)',border:'none',borderRadius:'12px',color:'#111111',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Tajawal,sans-serif'}}>{t('invest_view_all')}</button>
            </div>

            {/* Bar chart */}
            <div className="dc" style={{padding:'20px',maxHeight:'320px',overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
                <h3 style={{fontSize:'14px',fontWeight:'800',color:'#111111'}}>{t('invest_perf')}</h3>
              </div>
              {monthHistory.length===0 ? (
                <EmptyState compact icon="📈" title={t('dash_noInvestmentHistory')} subtitle={t('dash_investmentHistoryHint')} btnLabel={t('dash_enterMonthlyIncome')} btnHref="/income" />
              ) : (
                <BarChart data={displayMonthHistory.map(h=>({label:h.label.split(' ')[0],v1:h.investment,v2:0}))}/>
              )}
            </div>

            {/* Top investments */}
            <div className="dc" style={{padding:'20px'}}>
              <h3 style={{fontSize:'14px',fontWeight:'800',color:'#111111',marginBottom:'14px'}}>{t('invest_best')}</h3>
              {investments.length===0 ? (
                <EmptyState compact icon="📈" title={t('dash_noInvestments')} subtitle={t('dash_topInvestmentsEmpty')} btnLabel={t('dash_addInvestment')} btnHref="/education/investments" />
              ) : [...investments].sort((a,b)=>amountOf(b.amount)-amountOf(a.amount)).slice(0,3).map((inv,i)=>(
                <div key={inv.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 0',borderBottom:i<2?'1px solid rgba(216,174,99,.07)':'none'}}>
                  <div style={{width:'36px',height:'36px',background:'rgba(216,174,99,.10)',borderRadius:'11px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'17px',flexShrink:0}}>📈</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'12px',fontWeight:'700',color:'#111111',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inv.name || t('dash_investmentFallback')}</div>
                    <div style={{fontSize:'11px',fontWeight:'800',color:'#9A6C3C'}}>{fmt(amountOf(inv.amount))}</div>
                  </div>
                </div>
              ))}
              <button onClick={()=>router.push('/education/investments')} style={{width:'100%',marginTop:'12px',padding:'9px',background:'transparent',border:'1.5px solid rgba(216,174,99,.2)',borderRadius:'12px',color:'#9A6C3C',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'Tajawal,sans-serif'}}>{t('invest_view_more')}</button>
            </div>
          </div>

          {/* ─── GOALS + QUICK ACTIONS ─── */}
          <div className="goals-actions-grid" style={{...S(280),display:'grid',gridTemplateColumns:'minmax(0,1fr) 240px',gap:'16px',alignItems:'start'}}>
            {/* Goals */}
            <div className="dc" style={{padding:'22px'}}>
              <h3 style={{fontSize:'15px',fontWeight:'800',color:'#111111',marginBottom:'18px'}}>{t('goals_title')}</h3>
              {goals.length===0 ? (
                <EmptyState compact icon="🎯" title={L('لا توجد أهداف مالية بعد','No financial goals yet','Aucun objectif financier pour le moment')} subtitle={L('ابدأ بتحديد هدفك الأول','Start by setting your first goal','Commencez par définir votre premier objectif')} btnLabel={L('إضافة هدف','Add goal','Ajouter un objectif')} btnHref="/goals/add" />
              ) : (
                <div className="goals-grid" style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'14px'}}>
                  {goals.map(g=>{
                    const goalProgress=calculateGoalProgress(g);
                    const target=goalProgress.targetAmount;
                    const saved=goalProgress.currentAmount;
                    const color=g.color||'#D8AE63';
                    const pct=goalProgress.progressPercent;
                    return(
                      <div key={g.id} className="dc" style={{padding:'16px',border:`1px solid ${color}22`}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <span style={{fontSize:'20px'}}>{g.icon||'🎯'}</span>
                            <span style={{fontSize:'13px',fontWeight:'800',color:'#111111'}}>{g.name||g.goal||t('dash_goalFallback')}</span>
                          </div>
                          <span style={{fontSize:'14px',fontWeight:'900',color}}>{pct}%</span>
                        </div>
                        <div className="prog-bar" style={{marginBottom:'8px'}}>
                          <div className="prog-fill" style={{width:`${pct}%`,background:`linear-gradient(90deg,${color},${color}88)`}}/>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#9A6C3C'}}>
                          <span style={{fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{fmt(saved)}</span>
                          <span style={{fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{t('dash_from')} {fmt(target)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="dc" style={{padding:'20px'}}>
              <h3 style={{fontSize:'14px',fontWeight:'800',color:'#111111',marginBottom:'14px'}}>{t('quick_title')}</h3>
              <div className="quick-actions-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                {[
                  {icon:'💵',label:t('action_add_income'),action:()=>router.push('/income/add')},
                  {icon:'🛒',label:t('action_add_expense'),action:()=>router.push('/expenses/add')},
                  {icon:'📈',label:t('action_transfer'),action:()=>router.push('/education/investments')},
                  {icon:'📉',label:t('action_market_analysis'),action:()=>router.push('/market-analysis')},
                  {icon:'📊',label:t('action_report'),action:()=>router.push('/reports')},
                  {icon:'🖨️',label:t('action_print'),action:()=>window.print()},
                  {icon:'📥',label:t('action_export'),action:()=>{
                    const html=document.getElementById('report-content')?.innerHTML||document.body.innerHTML;
                    const blob=new Blob([`<!doctype html><html><head><meta charset="utf-8"><title>SFM Report</title></head><body>${html}</body></html>`],{type:'text/html'});
                    const url=URL.createObjectURL(blob);
                    const a=document.createElement('a');
                    a.href=url;
                    a.download='sfm-report.html';
                    a.click();
                    URL.revokeObjectURL(url);
                  }},
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
          <div className="history-grid" style={{...S(320),display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'16px',alignItems:'start'}}>
            {monthHistory.length===0 ? (
              <div className="dc" style={{padding:'22px',gridColumn:'1 / -1'}}>
                <EmptyState compact icon="📈" title={t('dash_noMonthlyHistory')} subtitle={t('dash_monthlyHistoryAccumHint')} btnLabel={t('dash_enterMonthlyIncome')} btnHref="/income" />
              </div>
            ) : (
              <>
                <div className="dc" style={{padding:'22px'}}>
                  <h3 style={{fontSize:'15px',fontWeight:'800',color:'#111111',marginBottom:'16px'}}>{t('dash_monthlyInvestments')}</h3>
                  <div className="table-scroll">
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{borderBottom:'2px solid rgba(216,174,99,.12)'}}>
                        {[t('charity_month'),t('total_invest'),'—'].map(h=><th key={h} style={{padding:'8px 8px',textAlign:'right',fontSize:'11px',fontWeight:'700',color:'#9A6C3C'}}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[...displayMonthHistory].reverse().map(h=>(
                        <tr key={h.month} style={{borderBottom:'1px solid rgba(216,174,99,.07)'}}>
                          <td style={{padding:'10px 8px',fontSize:'12px',color:'#5B4332',fontWeight:'600'}}>{h.label}</td>
                          <td style={{padding:'10px 8px',fontSize:'12px',color:'#111111',fontFamily:"'IBM Plex Sans Arabic',sans-serif",fontWeight:'700'}}>{fmt(h.investment)}</td>
                          <td style={{padding:'10px 8px',fontSize:'12px',color:'#9A6C3C'}}>—</td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </div>
                <div className="dc" style={{padding:'22px'}}>
                  <h3 style={{fontSize:'15px',fontWeight:'800',color:'#111111',marginBottom:'16px'}}>{t('dash_monthlyExpenses')}</h3>
                  <div className="table-scroll">
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{borderBottom:'2px solid rgba(216,174,99,.12)'}}>
                        {[t('charity_month'),t('total_expenses'),'—'].map(h=><th key={h} style={{padding:'8px 8px',textAlign:'right',fontSize:'11px',fontWeight:'700',color:'#9A6C3C'}}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[...displayMonthHistory].reverse().map(h=>(
                        <tr key={h.month} style={{borderBottom:'1px solid rgba(216,174,99,.07)'}}>
                          <td style={{padding:'10px 8px',fontSize:'12px',color:'#5B4332',fontWeight:'600'}}>{h.label}</td>
                          <td style={{padding:'10px 8px',fontSize:'12px',color:'#111111',fontFamily:"'IBM Plex Sans Arabic',sans-serif",fontWeight:'700'}}>{fmt(h.expenses)}</td>
                          <td style={{padding:'10px 8px',fontSize:'12px',color:'#9A6C3C'}}>—</td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ─── FOOTER ─── */}
          <div style={{...S(360),marginTop:'8px',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:'1px solid rgba(216,174,99,.12)',flexWrap:'wrap',gap:'12px'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'16px',fontWeight:'900',color:'#D8AE63',marginBottom:'2px'}}>
                <Image src="/sfm-logo.png" alt="THE SFM" width={24} height={24} className="rounded-sm" />
                <span>THE SFM</span>
              </div>
              <div style={{fontSize:'11px',color:'#9A6C3C'}}>{t('dash_footerTagline')}</div>
            </div>
            <div style={{fontSize:'11px',color:'#BFB5A8',textAlign:'center'}}>{t('dash_footerRights')}</div>
          </div>

          {fullAnalysisOpen && (
            <div role="presentation" onMouseDown={()=>setFullAnalysisOpen(false)} style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(17,17,17,.48)',backdropFilter:'blur(8px)',display:'grid',placeItems:'center',padding:'max(14px,env(safe-area-inset-top)) 14px max(14px,env(safe-area-inset-bottom))'}}>
              <section role="dialog" aria-modal="true" aria-labelledby="full-analysis-title" onMouseDown={event=>event.stopPropagation()} style={{width:'min(920px,100%)',maxHeight:'min(88vh,900px)',overflow:'auto',background:'#FFFDFC',border:'1px solid rgba(216,174,99,.24)',borderRadius:'24px',boxShadow:'0 28px 90px rgba(45,26,10,.32)',color:'#111'}}>
                <div style={{position:'sticky',top:0,zIndex:2,display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',padding:'18px 20px',background:'rgba(255,253,252,.94)',borderBottom:'1px solid rgba(216,174,99,.14)',backdropFilter:'blur(12px)'}}>
                  <div>
                    <p style={{margin:0,fontSize:'12px',fontWeight:900,color:'#9A6C3C'}}>{L('رؤية المدير المالي الذكي','AI Financial Manager Insights','Insights du gestionnaire financier IA')}</p>
                    <h2 id="full-analysis-title" style={{margin:'4px 0 0',fontSize:'clamp(20px,4vw,28px)',fontWeight:900,color:'#111'}}>{L('التحليل المالي الكامل','Full Financial Analysis','Analyse financière complète')}</h2>
                  </div>
                  <button type="button" onClick={()=>setFullAnalysisOpen(false)} aria-label={L('إغلاق','Close','Fermer')} style={{width:'42px',height:'42px',borderRadius:'14px',border:'1px solid rgba(216,174,99,.24)',background:'#FFF8EA',color:'#5B4332',fontSize:'22px',fontWeight:900,cursor:'pointer'}}>×</button>
                </div>

                <div style={{padding:'20px',display:'grid',gap:'16px'}}>
                  {!hasEnoughAnalysisData ? (
                    <div style={{padding:'28px 18px',borderRadius:'18px',background:'#F7F3EA',border:'1px solid rgba(216,174,99,.14)',textAlign:'center'}}>
                      <strong style={{display:'block',fontSize:'18px',marginBottom:'8px'}}>{L('لا توجد بيانات كافية لإنشاء تحليل كامل.','Not enough data to generate a full analysis.','Données insuffisantes pour générer une analyse complète.')}</strong>
                      <p style={{margin:0,color:'#8A7060',fontWeight:700}}>{L('أضف الدخل والمصروفات والأهداف للحصول على تحليل أدق.','Add income, expenses, and goals to get better insights.','Ajoutez vos revenus, dépenses et objectifs pour obtenir une analyse plus précise.')}</p>
                    </div>
                  ) : (
                    <>
                      <div className="full-analysis-summary" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'10px'}}>
                        {[
                          [L('الصحة المالية','Financial health','Santé financière'), `${healthScore}%`, '#22C55E'],
                          [L('صافي الرصيد','Net balance','Solde net'), fmt(netBalance), netBalance>=0?'#22C55E':'#EF4444'],
                          [L('نسبة المصروفات','Expense ratio','Ratio des dépenses'), totalIncome>0?`${Math.round(expenseRatio*100)}%`:'-', expenseRatio>0.8?'#EF4444':'#D8AE63'],
                        ].map(([label,value,color])=>(
                          <div key={label} style={{background:'#F7F3EA',border:'1px solid rgba(216,174,99,.14)',borderRadius:'16px',padding:'14px'}}>
                            <span style={{display:'block',fontSize:'11px',fontWeight:900,color:'#9A6C3C',marginBottom:'6px'}}>{label}</span>
                            <b style={{fontSize:'20px',color:String(color),fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{value}</b>
                          </div>
                        ))}
                      </div>

                      <div className="full-analysis-grid" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'14px'}}>
                        <AnalysisBlock title={L('الملخص المالي','Financial Summary','Résumé financier')} items={[`${L('إجمالي الدخل','Total income','Total des revenus')}: ${fmt(totalIncome)}`,`${L('إجمالي المصروفات','Total expenses','Total des dépenses')}: ${fmt(totalExpenses)}`,`${L('الادخار','Savings','Épargne')}: ${fmt(totalSavings)}`,`${L('الاستثمارات','Investments','Investissements')}: ${fmt(totalInvestment)}`]} />
                        <AnalysisBlock title={L('نقاط القوة','Strengths','Points forts')} items={[totalIncome>0?L('تم تسجيل الدخل ويمكن بناء خطة شهرية عليه.','Income is recorded, so a monthly plan can be built.','Les revenus sont enregistrés, un plan mensuel peut être construit.'):L('ابدأ بتسجيل الدخل لفتح تحليل أدق.','Add income to unlock better analysis.','Ajoutez vos revenus pour une analyse plus précise.'),totalSavings>0?L('لديك مدخرات مسجلة تدعم الاستقرار المالي.','Recorded savings support financial stability.','Votre épargne enregistrée renforce la stabilité financière.'):L('إضافة المدخرات ستوضح قوة وضعك المالي.','Adding savings will clarify your financial strength.','Ajouter l’épargne clarifiera votre solidité financière.'),investments.length>0?L('توجد استثمارات ضمن لوحة المتابعة.','Investments are included in tracking.','Les investissements sont inclus dans le suivi.'):L('تنويع الاستثمار يمكن أن يحسن النمو طويل الأجل.','Investment diversification can improve long-term growth.','La diversification peut améliorer la croissance à long terme.')]} />
                        <AnalysisBlock title={L('نقاط تحتاج تحسين','Areas to Improve','Points à améliorer')} items={[expenseRatio>0.8?L('المصروفات مرتفعة مقارنة بالدخل هذا الشهر.','Expenses are high compared with income this month.','Les dépenses sont élevées par rapport aux revenus ce mois-ci.'):L('راقب المصروفات المتكررة للحفاظ على الفائض.','Monitor recurring expenses to protect surplus.','Surveillez les dépenses récurrentes pour préserver l’excédent.'),goals.length===0?L('لا توجد أهداف مالية مسجلة حتى الآن.','No financial goals are registered yet.','Aucun objectif financier n’est encore enregistré.'):L('راجع تقدم الأهداف شهريًا لتجنب التأخير.','Review goal progress monthly to avoid delays.','Vérifiez les objectifs chaque mois pour éviter les retards.'),expenseItems.length===0?L('لا توجد معاملات مصروفات كافية لتحليل السلوك.','There are not enough expense transactions to analyze behavior.','Il n’y a pas assez de dépenses pour analyser les habitudes.'):L('صنّف المصروفات بدقة لتحسين توصيات الذكاء المالي.','Categorize expenses accurately to improve AI recommendations.','Classez les dépenses précisément pour améliorer les recommandations IA.')]} />
                        <AnalysisBlock title={L('توصيات الذكاء المالي','Financial AI Recommendations','Recommandations de l’IA financière')} items={[netBalance>0?L('وجّه جزءًا من الفائض مباشرة إلى الادخار أو الأهداف.','Move part of the surplus directly to savings or goals.','Affectez une partie de l’excédent à l’épargne ou aux objectifs.'):L('خفّض المصروفات غير الضرورية قبل إضافة التزامات جديدة.','Reduce nonessential expenses before adding new commitments.','Réduisez les dépenses non essentielles avant de nouveaux engagements.'),L('راجع أعلى ثلاثة مصروفات هذا الشهر وحدد ما يمكن خفضه.','Review the top three expenses this month and choose what to reduce.','Examinez les trois principales dépenses du mois et choisissez quoi réduire.'),L('استعمل صفحة الذكاء المالي للحصول على خطة تفصيلية محدثة.','Use the Financial AI page for a detailed updated plan.','Utilisez la page IA financière pour un plan détaillé actualisé.')]} />
                        <AnalysisBlock title={L('خطة الشهر القادم','Next Month Plan','Plan du mois prochain')} items={[`${L('حد المصروفات المقترح','Suggested expense cap','Plafond de dépenses suggéré')}: ${fmt(totalIncome>0?Math.max(totalIncome*0.7,0):totalExpenses)}`,`${L('الادخار المقترح','Suggested saving','Épargne suggérée')}: ${fmt(totalIncome>0?Math.max(totalIncome-totalExpenses,0)*0.5:0)}`,L('حدد هدفًا واحدًا كأولوية وراجعه أسبوعيًا.','Pick one priority goal and review it weekly.','Choisissez un objectif prioritaire et révisez-le chaque semaine.')]} />
                        <AnalysisBlock title={L('التنبيهات المهمة','Important Alerts','Alertes importantes')} items={[totalIncome===0?L('لم يتم تسجيل دخل، لذلك لا يمكن حساب الفائض بدقة.','No income is recorded, so surplus cannot be calculated accurately.','Aucun revenu enregistré, le surplus ne peut pas être calculé précisément.'):L('الدخل مسجل ويمكن حساب الفائض الشهري.','Income is recorded and monthly surplus can be calculated.','Les revenus sont enregistrés et le surplus peut être calculé.'),totalExpenses>totalIncome&&totalIncome>0?L('المصروفات أعلى من الدخل وتحتاج مراجعة فورية.','Expenses exceed income and need immediate review.','Les dépenses dépassent les revenus et exigent une révision immédiate.'):L('لا يوجد تنبيه عجز حاد في البيانات الحالية.','No severe deficit alert in current data.','Aucune alerte de déficit important dans les données actuelles.'),`${L('عدد الأهداف','Goals count','Nombre d’objectifs')}: ${goals.length}`]} />
                      </div>
                    </>
                  )}

                  <div style={{display:'flex',justifyContent:'flex-end',gap:'10px',flexWrap:'wrap',paddingTop:'4px'}}>
                    <button type="button" onClick={()=>setFullAnalysisOpen(false)} style={{height:'44px',borderRadius:'13px',border:'1px solid rgba(216,174,99,.24)',background:'#FFFDFC',color:'#5B4332',padding:'0 16px',font:'900 13px Tajawal,Arial,sans-serif',cursor:'pointer'}}>{L('إغلاق','Close','Fermer')}</button>
                    <button type="button" onClick={()=>router.push('/ai')} style={{height:'44px',borderRadius:'13px',border:0,background:'linear-gradient(135deg,#111,#2D1A0A,#D8AE63)',color:'#fff',padding:'0 16px',font:'900 13px Tajawal,Arial,sans-serif',cursor:'pointer'}}>{L('الانتقال إلى صفحة الذكاء المالي','Go to Financial AI page','Aller à la page IA financière')}</button>
                  </div>
                </div>
              </section>
            </div>
          )}

        </main>
      </div>
    </div>
  </>);
}
