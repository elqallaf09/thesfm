'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { INCOME_CATEGORIES } from '@/lib/income-categories';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const PROFESSIONS = ['طبيب عام','طبيب أسنان','مهندس مدني','مهندس برمجيات','مطور تطبيقات','محلل بيانات','خبير أسواق ومعلومات','مستشار استثمار','مدير أعمال','رجل أعمال','محاسب','محلل مالي','محامي','معلم','أستاذ جامعي','مدرب مهني','طالب','متقاعد','ربة منزل','باحث علمي','أخرى'];
const COUNTRY_CODES = [{code:'+965',name:'🇰🇼 الكويت'},{code:'+966',name:'🇸🇦 السعودية'},{code:'+971',name:'🇦🇪 الإمارات'},{code:'+973',name:'🇧🇭 البحرين'},{code:'+968',name:'🇴🇲 عُمان'},{code:'+974',name:'🇶🇦 قطر'},{code:'+962',name:'🇯🇴 الأردن'},{code:'+20',name:'🇪🇬 مصر'},{code:'+1',name:'🇺🇸 أمريكا'},{code:'+44',name:'🇬🇧 بريطانيا'},{code:'+33',name:'🇫🇷 فرنسا'},{code:'+49',name:'🇩🇪 ألمانيا'}];

type Tab = 'info' | 'password' | 'income';

function ProgressRing({ pct, size=100, stroke=8 }: { pct:number; size?:number; stroke?:number }) {
  const r=(size-stroke*2)/2, c=2*Math.PI*r, dash=(pct/100)*c;
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(216,174,99,0.15)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#prg)" strokeWidth={stroke}
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        style={{transition:'stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1) 0.3s'}}/>
      <defs><linearGradient id="prg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D8AE63"/><stop offset="100%" stopColor="#9A6C3C"/>
      </linearGradient></defs>
    </svg>
  );
}

/* ─ Toast ─ */
function Toast({ msg, type, onClose }: { msg:string; type:'ok'|'err'; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)', zIndex:9999, minWidth:'280px', padding:'14px 20px', borderRadius:'16px', display:'flex', alignItems:'center', gap:'12px', background: type==='ok'?'rgba(34,197,94,.95)':'rgba(239,68,68,.95)', color:'#fff', boxShadow:'0 8px 32px rgba(0,0,0,0.20)', animation:'slideUp .3s ease', fontFamily:'Tajawal,sans-serif', fontSize:'14px', fontWeight:'600' }}>
      <span style={{fontSize:'18px'}}>{type==='ok'?'✅':'⚠️'}</span>
      {msg}
      <button onClick={onClose} style={{marginRight:'auto',background:'none',border:'none',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:'16px',lineHeight:1}}>✕</button>
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { lang, setLang, t, dir, isAr } = useLanguage();

  const [profile, setProfile]           = useState<any>({ phone_country_code:'+965', gender:'', profession:'' });
  const [incomeAmounts, setIncomeAmounts] = useState<Record<string,string>>({});
  const [oldPassword, setOldPassword]   = useState('');
  const [newPassword, setNewPassword]   = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState<{type:'ok'|'err';text:string}|null>(null);
  const [activeTab, setActiveTab]       = useState<Tab>('info');
  const [tabAnim, setTabAnim]           = useState(false);
  const [mounted, setMounted]           = useState(false);
  const [showPass, setShowPass]         = useState(false);
  const [saved, setSaved]               = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) router.push('/'); }, [user, loading, router]);
  useEffect(() => { setTimeout(() => setMounted(true), 60); if (user) loadData(); }, [user]);

  const loadData = async () => {
    const userId = user?.id;
    if (!userId) return;
    const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (p) setProfile({ display_name:p.display_name||'', username:p.username||'', email:p.email||user?.email||'', age:p.age?String(p.age):'', gender:p.gender||'', profession:p.profession||'', phone_country_code:p.phone_country_code||'+965', phone_number:p.phone_number||'' });
    else setProfile(prev => ({ ...prev, email: user?.email||'' }));
    const { data: s } = await supabase.from('monthly_income_sources').select('*').eq('user_id', userId);
    if (s) { const a: Record<string,string>={}; s.forEach((r: { category: string | null; amount: number | string | null }) => { if (r.category) a[r.category]=String(r.amount ?? ''); }); setIncomeAmounts(a); }
  };

  const showToast = (text: string, type: 'ok'|'err' = 'ok') => setToast({ text, type });

  const saveInfo = async () => {
    const userId = user?.id;
    if (!userId) return;
    if (!profile.display_name?.trim()) { showToast(t('error'), 'err'); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ display_name:profile.display_name.trim(), username:profile.username?.trim()||null, age:profile.age?parseInt(String(profile.age)):null, gender:profile.gender||null, profession:profile.profession||null, phone_country_code:profile.phone_country_code||'+965', phone_number:profile.phone_number||null }).eq('id', userId).select().single();
    if (error) showToast(t('error') + ': ' + error.message, 'err');
    else { showToast(t('saved')); setSaved(true); setTimeout(()=>setSaved(false),2500); }
    setSaving(false);
  };

  const savePassword = async () => {
    if (!oldPassword) { showToast(isAr?'أدخل كلمة المرور الحالية':'Enter current password','err'); return; }
    if (newPassword.length < 6) { showToast(isAr?'كلمة المرور 6 أحرف على الأقل':'Password must be 6+ characters','err'); return; }
    if (newPassword !== confirmPassword) { showToast(isAr?'كلمتا المرور غير متطابقتين':'Passwords do not match','err'); return; }
    setSaving(true);
    const email = profile.email || `${profile.username}@smart-finance.local`;
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
    if (signInErr) { showToast(isAr?'كلمة المرور الحالية غير صحيحة':'Incorrect current password','err'); setSaving(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) showToast(t('error') + ': ' + error.message,'err');
    else { showToast(isAr?'✅ تم تغيير كلمة المرور':'✅ Password changed'); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }
    setSaving(false);
  };

  const saveIncome = async () => {
    const userId = user?.id;
    if (!userId) return;
    setSaving(true);
    const { error: deleteError } = await supabase.from('monthly_income_sources').delete().eq('user_id', userId);
    if (deleteError) { showToast(t('error') + ': ' + deleteError.message, 'err'); setSaving(false); return; }
    const rows = INCOME_CATEGORIES.map(cat => ({ user_id:userId, category:cat.id, label:cat.nameAr, amount:parseFloat((incomeAmounts[cat.id]||'0').replace(/[^\d.]/g,''))||0 })).filter(r => r.amount > 0);
    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('monthly_income_sources').insert(rows).select();
      if (insertError) { showToast(t('error') + ': ' + insertError.message, 'err'); setSaving(false); return; }
    }
    await loadData();
    showToast(isAr?'✅ تم تحديث مصادر الدخل':'✅ Income sources updated');
    setSaving(false);
  };

  const switchTab = (tab: Tab) => {
    if (tab === activeTab) return;
    setTabAnim(true);
    setTimeout(() => { setActiveTab(tab); setTabAnim(false); }, 180);
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const completionPct = Math.round([profile.display_name,profile.username,profile.age,profile.gender,profile.profession,profile.phone_number,profile.email].filter(Boolean).length/7*100);
  const initials = (profile.display_name||profile.username||'SFM').substring(0,2).toUpperCase();
  const S = (d:number) => ({ opacity:mounted?1:0, transform:mounted?'translateY(0)':'translateY(20px)', transition:`opacity .5s ease ${d}ms, transform .5s ease ${d}ms` });

  const TABS: { id:Tab; icon:string; label:string }[] = [
    { id:'info',     icon:'👤', label: t('profile_tab_info')   },
    { id:'password', icon:'🔒', label: t('profile_tab_pass')   },
    { id:'income',   icon:'💰', label: t('profile_tab_income') },
  ];

  const FEAT = [
    { icon:'✨', t:'feat_smart_ui',     d:'feat_smart_ui_desc'    },
    { icon:'🧠', t:'feat_ai_finance',   d:'feat_ai_finance_desc'  },
    { icon:'🤖', t:'feat_ai_analytics', d:'feat_analytics_desc'   },
    { icon:'🛡', t:'feat_security',     d:'feat_security_desc'    },
    { icon:'⚡', t:'feat_realtime',     d:'feat_realtime_desc'    },
    { icon:'🎯', t:'feat_goals',        d:'feat_goals_desc'       },
  ] as const;

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#F7F3EA'}}>
      <div style={{width:'44px',height:'44px',borderRadius:'50%',border:'3px solid rgba(216,174,99,0.2)',borderTopColor:'#D8AE63',animation:'spin 1s linear infinite'}}/>
    </div>
  );

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap');
      *, *::before, *::after {box-sizing:border-box;margin:0;padding:0}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes slideUp{from{opacity:0;transform:translate(-50%,20px)}to{opacity:1;transform:translate(-50%,0)}}
      @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      @keyframes tabIn{from{opacity:0;transform:translateX(${dir==='rtl'?'-':''}10px)}to{opacity:1;transform:translateX(0)}}
      @keyframes goldShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      @keyframes successPop{0%{transform:scale(.96)}50%{transform:scale(1.02)}100%{transform:scale(1)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
      .wp{font-family:'Tajawal',sans-serif;background:#F7F3EA;min-height:100vh;color:#111111}
      .wp ::-webkit-scrollbar{width:4px}.wp ::-webkit-scrollbar-thumb{background:rgba(216,174,99,.3);border-radius:10px}
      .wc{background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:22px;box-shadow:0 4px 22px rgba(90,67,51,.06);transition:all .25s cubic-bezier(.4,0,.2,1)}
      .wc:hover:not(.no-h){transform:translateY(-2px);box-shadow:0 10px 34px rgba(90,67,51,.10)}
      .wf{position:relative;width:100%}
      .wf input,.wf select{width:100%;height:54px;background:rgba(247,243,234,.7);border:1.5px solid rgba(216,174,99,.22);border-radius:14px;padding:18px 16px 6px 42px;font-family:'Tajawal',sans-serif;font-size:15px;color:#111111;outline:none;transition:all .2s;-webkit-appearance:none}
      .wf input:focus,.wf select:focus{border-color:#D8AE63;box-shadow:0 0 0 3px rgba(216,174,99,.14);background:rgba(255,253,251,0.95)}
      .wf label{position:absolute;right:16px;top:9px;font-size:11px;font-weight:700;color:#9A6C3C;pointer-events:none;letter-spacing:.03em;z-index:1}
      .wf .icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;opacity:.5;pointer-events:none}
      .wf select{cursor:pointer;padding-left:38px;background:rgba(247,243,234,.7) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23D8AE63' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat left 14px center}
      /* ── Tabs ── */
      .tab-track{display:flex;background:rgba(216,174,99,.07);border-radius:16px;padding:4px;gap:2px;border:1px solid rgba(216,174,99,.14)}
      .tab-btn{position:relative;flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px 16px;border-radius:12px;border:none;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:13.5px;font-weight:600;transition:all .22s cubic-bezier(.4,0,.2,1);background:transparent;color:#9A6C3C;white-space:nowrap}
      .tab-btn::after{content:'';position:absolute;bottom:0;left:50%;width:0;height:2.5px;background:linear-gradient(90deg,#D8AE63,#9A6C3C);border-radius:2px;transform:translateX(-50%);transition:width .25s cubic-bezier(.4,0,.2,1)}
      .tab-btn.active{background:#FFFDFC;color:#111111;font-weight:700;box-shadow:0 2px 12px rgba(90,67,51,.09),0 0 0 1px rgba(216,174,99,.18)}
      .tab-btn.active::after{width:40%}
      .tab-btn:hover:not(.active){background:rgba(255,253,251,.5);color:#5B4332}
      /* ── Tab content animation ── */
      .tab-content{animation:fadeIn .3s cubic-bezier(.4,0,.2,1)}
      .tab-exit{animation:fadeIn .15s reverse forwards}
      /* ── Save button ── */
      .save-btn{width:100%;height:56px;border:none;border-radius:16px;font-family:'Tajawal',sans-serif;font-size:16px;font-weight:700;cursor:pointer;position:relative;overflow:hidden;transition:all .3s}
      .save-btn::before{content:'';position:absolute;inset:0;opacity:0;transition:opacity .3s;border-radius:16px}
      .save-btn.idle{background:linear-gradient(135deg,#111111 0%,#2D1A0A 50%,#D8AE63 100%);color:#fff}
      .save-btn.idle::before{background:linear-gradient(135deg,#D8AE63 0%,#9A6C3C 40%,#111111 100%)}
      .save-btn.idle:hover::before{opacity:1}
      .save-btn.idle:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(21,21,21,.28)}
      .save-btn.ok{background:linear-gradient(135deg,#22C55E,#16A34A)!important;animation:successPop .4s ease}
      .save-btn span{position:relative;z-index:1}
      /* ── AI Cards + Features ── */
      .ai-card{cursor:default;background:rgba(255,253,251,.88);backdrop-filter:blur(12px);border:1px solid rgba(216,174,99,.18);border-radius:20px;padding:18px 16px;transition:all .25s;position:relative;overflow:hidden}
      .ai-card::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(216,174,99,.06),transparent);opacity:0;transition:opacity .25s;border-radius:20px}
      .ai-card:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(90,67,51,.10),0 0 0 1px rgba(216,174,99,.28)}
      .ai-card:hover::after{opacity:1}
      .feat-card{background:rgba(255,253,251,.8);border:1px solid rgba(216,174,99,.13);border-radius:20px;padding:20px 16px;text-align:center;transition:all .25s;cursor:default;position:relative;overflow:hidden;backdrop-filter:blur(8px)}
      .feat-card:hover{transform:translateY(-4px);box-shadow:0 12px 36px rgba(90,67,51,.10),0 0 0 1.5px rgba(216,174,99,.32)}
      .income-row{display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(247,243,234,.6);border:1px solid rgba(216,174,99,.13);border-radius:14px;transition:all .2s}
      .income-row:hover{background:rgba(255,253,251,.9);border-color:rgba(216,174,99,.28)}
      /* ── Responsive ── */
      @media(max-width:900px){.hero-g{grid-template-columns:1fr!important}.ai-cards{grid-template-columns:1fr 1fr!important}.pg2{grid-template-columns:1fr!important}.feat-g{grid-template-columns:repeat(2,1fr)!important}}
      @media(max-width:600px){.tab-btn{padding:10px 10px;font-size:12px}.pg2{grid-template-columns:1fr!important}.ai-cards{grid-template-columns:1fr!important}}
    `}</style>

    <div className="wp" dir={dir}>
      <div style={{maxWidth:'1180px',margin:'0 auto',padding:'24px 20px 64px'}}>

        {/* ── Header ── */}
        <div style={{...S(0),display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px',marginBottom:'28px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>router.push('/')} style={{padding:'8px 16px',background:'#FFFDFC',border:'1.5px solid rgba(216,174,99,.22)',borderRadius:'12px',cursor:'pointer',color:'#5B4332',fontSize:'13px',fontWeight:'700',fontFamily:'Tajawal,sans-serif'}}>
              {dir==='rtl'?'←':'→'} {t('back')}
            </button>
            <div>
              <h1 style={{fontSize:'clamp(22px,3.5vw,30px)',fontWeight:'900',color:'#111111',lineHeight:1.2}}>{t('profile_title')}</h1>
              <p style={{fontSize:'13px',color:'#9A6C3C',marginTop:'4px'}}>{t('profile_subtitle')}</p>
            </div>
          </div>
          {/* Language Switcher in header */}
          <LanguageSwitcher value={lang} onChange={setLang} variant="gold" />
        </div>

        {/* ── HERO ── */}
        <div style={{...S(40),display:'grid',gridTemplateColumns:'1fr 320px',gap:'20px',marginBottom:'24px',alignItems:'stretch'}} className="hero-g">

          {/* AI Insight Cards */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',alignContent:'start'}} className="ai-cards">
            {[
              {icon:'💼',label:t('nav_income'),    val:Object.values(incomeAmounts).filter(v=>parseFloat(v)>0).length||3,unit:isAr?'مصادر':'sources'},
              {icon:'🎯',label:t('goals_title'),   val:7,unit:isAr?'أهداف':'goals'},
              {icon:'📈',label:t('nav_invest'),    val:isAr?'نشط':'Active',unit:''},
              {icon:'📊',label:isAr?'التقدم المالي':'Financial Progress',val:'+18%',unit:''},
            ].map((card,i)=>(
              <div key={i} className="ai-card" style={{animationDelay:`${i*.06}s`}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                  <div style={{width:'36px',height:'36px',background:'linear-gradient(135deg,rgba(216,174,99,.18),rgba(154,108,60,.12))',borderRadius:'11px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'17px',border:'1px solid rgba(216,174,99,.2)'}}>{card.icon}</div>
                  <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#D8AE63',animation:'pulse 2s infinite'}}/>
                </div>
                <div style={{fontSize:'22px',fontWeight:'900',color:'#111111',fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1,marginBottom:'4px'}}>
                  {card.val}{card.unit&&<span style={{fontSize:'13px',color:'#9A6C3C',marginRight:'4px'}}> {card.unit}</span>}
                </div>
                <div style={{fontSize:'12px',fontWeight:'600',color:'#9A6C3C'}}>{card.label}</div>
                <div style={{position:'absolute',bottom:0,right:0,width:'35%',height:'2px',background:'linear-gradient(90deg,transparent,rgba(216,174,99,.45))',borderRadius:'0 0 20px 0'}}/>
              </div>
            ))}
          </div>

          {/* Profile Hero Card */}
          <div className="wc no-h" style={{background:'linear-gradient(155deg,#2B1A0D 0%,#3D2618 55%,#2B1A0D 100%)',padding:'32px 24px',textAlign:'center',position:'relative',overflow:'hidden',borderRadius:'24px'}}>
            <div style={{position:'absolute',top:'-50px',right:'-50px',width:'200px',height:'200px',borderRadius:'50%',border:'1px solid rgba(216,174,99,.07)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',bottom:'-60px',left:'-60px',width:'240px',height:'240px',borderRadius:'50%',border:'1px solid rgba(216,174,99,.05)',pointerEvents:'none'}}/>
            {/* Avatar + ring */}
            <div style={{position:'relative',width:'112px',height:'112px',margin:'0 auto 16px'}}>
              <ProgressRing pct={completionPct} size={112} stroke={6}/>
              <div style={{position:'absolute',inset:'8px',borderRadius:'50%',background:'linear-gradient(135deg,#D8AE63,#9A6C3C)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',fontWeight:'900',color:'#111111',boxShadow:'0 4px 18px rgba(216,174,99,.38)'}}>
                {initials}
              </div>
              <div style={{position:'absolute',bottom:'-4px',left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#D8AE63,#9A6C3C)',borderRadius:'20px',padding:'2px 10px',fontSize:'10.5px',fontWeight:'800',color:'#111111',whiteSpace:'nowrap'}}>
                {completionPct}%
              </div>
            </div>
            <h2 style={{fontSize:'21px',fontWeight:'900',color:'#FFFDFC',marginBottom:'4px'}}>{profile.display_name||profile.username||'SFM User'}</h2>
            <p style={{fontSize:'13px',color:'rgba(216,174,99,.65)',marginBottom:'14px'}}>{profile.profession||'عضو مميز'}</p>
            <div style={{display:'inline-flex',alignItems:'center',gap:'7px',background:'rgba(216,174,99,.18)',border:'1px solid rgba(216,174,99,.32)',borderRadius:'30px',padding:'6px 18px',marginBottom:'16px'}}>
              <span>⭐</span>
              <span style={{fontSize:'11.5px',fontWeight:'800',color:'#D8AE63',letterSpacing:'.07em'}}>{t('profile_elite')}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',background:'rgba(255,255,255,.05)',borderRadius:'14px',padding:'9px 14px',border:'1px solid rgba(255,255,255,.06)'}}>
              <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#22C55E',animation:'pulse 1.5s infinite',flexShrink:0}}/>
              <span style={{fontSize:'12px',color:'rgba(255,255,255,.6)',fontWeight:'600'}}>{t('profile_ai_active')}</span>
              <span>🤖</span>
            </div>
            <div style={{marginTop:'12px',fontSize:'11px',color:'rgba(216,174,99,.42)'}}>
              {t('profile_completion')} • {completionPct}%
            </div>
            {/* Language switcher inside hero card */}
            <div style={{marginTop:'16px',display:'flex',justifyContent:'center'}}>
              <LanguageSwitcher value={lang} onChange={setLang} variant="dark" compact/>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{...S(80),marginBottom:'20px'}}>
          <div className="tab-track">
            {TABS.map(tab => (
              <button key={tab.id}
                className={`tab-btn${activeTab===tab.id?' active':''}`}
                onClick={() => switchTab(tab.id)}
                aria-selected={activeTab===tab.id}
                role="tab">
                <span style={{fontSize:'16px'}}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── CONTENT + SIDEBAR ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 290px',gap:'20px',alignItems:'start'}} className="pg2">

          {/* Main panel */}
          <div ref={contentRef}>

            {/* Toast */}
            {toast && <Toast msg={toast.text} type={toast.type} onClose={()=>setToast(null)}/>}

            {/* Tab content with animation */}
            <div className={tabAnim ? 'tab-exit' : 'tab-content'}>

              {/* ─── INFO TAB ─── */}
              {activeTab==='info' && (
                <div className="wc" style={{padding:'30px 34px'}}>
                  {/* Panel header */}
                  <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'26px',paddingBottom:'18px',borderBottom:'1px solid rgba(216,174,99,.10)'}}>
                    <div style={{width:'48px',height:'48px',background:'linear-gradient(135deg,#D8AE63,#9A6C3C)',borderRadius:'15px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',boxShadow:'0 4px 14px rgba(216,174,99,.28)'}}>👤</div>
                    <div>
                      <h3 style={{fontSize:'18px',fontWeight:'800',color:'#111111',marginBottom:'3px'}}>{t('profile_tab_info')}</h3>
                      <p style={{fontSize:'12.5px',color:'#9A6C3C'}}>{t('profile_subtitle')}</p>
                    </div>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'18px'}} className="pg2">
                    <div className="wf">
                      <label>{t('profile_fullname')}</label>
                      <span className="icon">✍️</span>
                      <input placeholder={isAr?'أدخل الاسم':'Enter name'} value={profile.display_name||''} onChange={e=>setProfile((p:any)=>({...p,display_name:e.target.value}))}/>
                    </div>
                    <div className="wf">
                      <label>{t('profile_username')}</label>
                      <span className="icon">@</span>
                      <input placeholder="elqallaf09" value={profile.username||''} onChange={e=>setProfile((p:any)=>({...p,username:e.target.value}))} dir="ltr"/>
                    </div>
                    <div className="wf">
                      <label>{t('profile_age')}</label>
                      <span className="icon">🎂</span>
                      <input type="number" placeholder="35" value={profile.age||''} onChange={e=>setProfile((p:any)=>({...p,age:e.target.value}))} dir="ltr"/>
                    </div>
                    <div className="wf">
                      <label>{t('profile_gender')}</label>
                      <span className="icon">👤</span>
                      <select value={profile.gender||''} onChange={e=>setProfile((p:any)=>({...p,gender:e.target.value}))}>
                        <option value="">{isAr?'اختر...':'Select...'}</option>
                        <option value="male">{t('profile_male')}</option>
                        <option value="female">{t('profile_female')}</option>
                      </select>
                    </div>
                    <div className="wf">
                      <label>{t('profile_country')}</label>
                      <span className="icon">🌍</span>
                      <select value={profile.phone_country_code||'+965'} onChange={e=>setProfile((p:any)=>({...p,phone_country_code:e.target.value}))}>
                        {COUNTRY_CODES.map(c=><option key={c.code} value={c.code}>{c.name} {c.code}</option>)}
                      </select>
                    </div>
                    <div className="wf">
                      <label>{t('profile_phone')}</label>
                      <span className="icon">📱</span>
                      <input type="tel" placeholder="97515177" value={profile.phone_number||''} onChange={e=>setProfile((p:any)=>({...p,phone_number:e.target.value}))} dir="ltr"/>
                    </div>
                    <div className="wf" style={{gridColumn:'1/-1'}}>
                      <label>{t('profile_profession')}</label>
                      <span className="icon">💼</span>
                      <select value={profile.profession||''} onChange={e=>setProfile((p:any)=>({...p,profession:e.target.value}))}>
                        <option value="">{isAr?'اختر مهنتك...':'Select profession...'}</option>
                        {PROFESSIONS.map(p=><option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="wf" style={{gridColumn:'1/-1'}}>
                      <label>{t('profile_email')}</label>
                      <span className="icon">📧</span>
                      <input type="email" value={profile.email||''} readOnly style={{opacity:.6,cursor:'not-allowed'}} dir="ltr"/>
                    </div>
                  </div>

                  {/* Save */}
                  <div style={{marginTop:'26px'}}>
                    <button className={`save-btn ${saved?'ok':'idle'}`} onClick={saveInfo} disabled={saving}>
                      <span>
                        {saving
                          ? <span style={{display:'inline-flex',alignItems:'center',gap:'9px'}}>
                              <span style={{width:'18px',height:'18px',borderRadius:'50%',border:'2.5px solid rgba(255,255,255,.25)',borderTopColor:'#fff',animation:'spin 1s linear infinite',display:'inline-block'}}/>
                              {t('saving')}
                            </span>
                          : saved
                          ? t('saved')
                          : t('profile_save_info')}
                      </span>
                    </button>
                    <p style={{textAlign:'center',fontSize:'11.5px',color:'#9A6C3C',marginTop:'11px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                      <span>🔒</span> {t('profile_security')}
                    </p>
                  </div>
                </div>
              )}

              {/* ─── PASSWORD TAB ─── */}
              {activeTab==='password' && (
                <div className="wc" style={{padding:'30px 34px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'26px',paddingBottom:'18px',borderBottom:'1px solid rgba(216,174,99,.10)'}}>
                    <div style={{width:'48px',height:'48px',background:'linear-gradient(135deg,#111111,#2D1A0A)',borderRadius:'15px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',boxShadow:'0 4px 14px rgba(21,21,21,.2)'}}>🔒</div>
                    <div>
                      <h3 style={{fontSize:'18px',fontWeight:'800',color:'#111111',marginBottom:'3px'}}>{t('profile_tab_pass')}</h3>
                      <p style={{fontSize:'12.5px',color:'#9A6C3C'}}>{isAr?'احتفظ بحسابك آمناً باستخدام كلمة مرور قوية':'Keep your account secure with a strong password'}</p>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'18px',maxWidth:'480px'}}>
                    {[
                      {label:t('profile_curr_pass'), icon:'🔑', val:oldPassword, set:setOldPassword},
                      {label:t('profile_new_pass'),  icon:'🔏', val:newPassword, set:setNewPassword},
                      {label:t('profile_confirm_pass'),icon:'✅',val:confirmPassword,set:setConfirmPassword},
                    ].map((f,i) => (
                      <div key={i} className="wf">
                        <label>{f.label}</label>
                        <span className="icon">{f.icon}</span>
                        <input type={showPass?'text':'password'} placeholder="••••••••" value={f.val} onChange={e=>f.set(e.target.value)} dir="ltr" style={{paddingTop:'8px'}}/>
                      </div>
                    ))}
                    <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px',color:'#9A6C3C'}}>
                      <input type="checkbox" checked={showPass} onChange={e=>setShowPass(e.target.checked)} style={{accentColor:'#D8AE63',width:'15px',height:'15px'}}/>
                      {isAr?'إظهار كلمات المرور':'Show passwords'}
                    </label>
                  </div>
                  <div style={{marginTop:'26px',maxWidth:'480px'}}>
                    <button className={`save-btn idle`} onClick={savePassword} disabled={saving}>
                      <span>{saving?<span style={{display:'inline-flex',alignItems:'center',gap:'9px'}}><span style={{width:'18px',height:'18px',borderRadius:'50%',border:'2.5px solid rgba(255,255,255,.25)',borderTopColor:'#fff',animation:'spin 1s linear infinite',display:'inline-block'}}/>{t('saving')}</span>:t('profile_change_pass')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ─── INCOME TAB ─── */}
              {activeTab==='income' && (
                <div className="wc" style={{padding:'30px 34px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'24px',paddingBottom:'18px',borderBottom:'1px solid rgba(216,174,99,.10)'}}>
                    <div style={{width:'48px',height:'48px',background:'linear-gradient(135deg,#D8AE63,#9A6C3C)',borderRadius:'15px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',boxShadow:'0 4px 14px rgba(216,174,99,.28)'}}>💰</div>
                    <div>
                      <h3 style={{fontSize:'18px',fontWeight:'800',color:'#111111',marginBottom:'3px'}}>{t('profile_income_title')}</h3>
                      <p style={{fontSize:'12.5px',color:'#9A6C3C'}}>{t('profile_income_sub')}</p>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'10px',maxHeight:'460px',overflowY:'auto',paddingLeft:'4px'}}>
                    {INCOME_CATEGORIES.map(cat => (
                      <div key={cat.id} className="income-row">
                        <span style={{fontSize:'20px',flexShrink:0}}>{cat.icon}</span>
                        <span style={{flex:1,fontSize:'14px',fontWeight:'600',color:'#111111'}}>{isAr?cat.nameAr:cat.nameEn||cat.nameAr}</span>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
                          <span style={{fontSize:'11px',fontWeight:'700',color:'#D8AE63',fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{t('currency')}</span>
                          <input type="text" inputMode="decimal" placeholder="0.000"
                            value={incomeAmounts[cat.id]||''} onChange={e=>setIncomeAmounts(prev=>({...prev,[cat.id]:e.target.value}))}
                            style={{width:'90px',height:'38px',background:'rgba(255,253,251,.9)',border:'1.5px solid rgba(216,174,99,.2)',borderRadius:'10px',padding:'0 10px',fontFamily:"'IBM Plex Sans Arabic',sans-serif",fontSize:'14px',fontWeight:'700',color:'#111111',outline:'none',textAlign:'center',direction:'ltr',transition:'border-color .2s'}}
                            onFocus={e=>e.currentTarget.style.borderColor='#D8AE63'} onBlur={e=>e.currentTarget.style.borderColor='rgba(216,174,99,.2)'}/>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:'22px'}}>
                    <button className={`save-btn idle`} onClick={saveIncome} disabled={saving}>
                      <span>{saving?<span style={{display:'inline-flex',alignItems:'center',gap:'9px'}}><span style={{width:'18px',height:'18px',borderRadius:'50%',border:'2.5px solid rgba(255,255,255,.25)',borderTopColor:'#fff',animation:'spin 1s linear infinite',display:'inline-block'}}/>{t('saving')}</span>:t('profile_save_income')}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ─── AI SIDEBAR ─── */}
          <div style={{display:'flex',flexDirection:'column',gap:'16px',position:'sticky',top:'24px'}}>

            {/* Health score */}
            <div style={{background:'linear-gradient(145deg,#2B1A0D,#3D2618)',borderRadius:'22px',padding:'24px 20px',textAlign:'center',border:'1px solid rgba(216,174,99,.2)',boxShadow:'0 8px 32px rgba(43,26,13,.22)',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:'-30px',right:'-30px',width:'120px',height:'120px',borderRadius:'50%',background:'radial-gradient(circle,rgba(216,174,99,.12) 0%,transparent 70%)',pointerEvents:'none'}}/>
              <div style={{fontSize:'12px',fontWeight:'700',color:'rgba(216,174,99,.55)',marginBottom:'14px',letterSpacing:'.04em'}}>{t('profile_health')}</div>
              <div style={{position:'relative',width:'90px',height:'90px',margin:'0 auto 14px'}}>
                <ProgressRing pct={78} size={90} stroke={7}/>
                <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:'22px',fontWeight:'900',color:'#D8AE63',fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1}}>78</span>
                  <span style={{fontSize:'9px',color:'rgba(216,174,99,.5)'}}>/100</span>
                </div>
              </div>
              <div style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'rgba(34,197,94,.12)',borderRadius:'20px',padding:'4px 13px'}}>
                <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#22C55E',animation:'pulse 1.5s infinite'}}/>
                <span style={{fontSize:'12px',fontWeight:'700',color:'#22C55E'}}>{isAr?'ممتاز':'Excellent'}</span>
              </div>
            </div>

            {/* AI Predictions */}
            <div className="wc no-h" style={{padding:'20px 18px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
                <div style={{width:'34px',height:'34px',background:'linear-gradient(135deg,#111111,#2D1A0A)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px'}}>🤖</div>
                <div style={{fontSize:'13.5px',fontWeight:'800',color:'#111111'}}>{t('profile_ai_preds')}</div>
              </div>
              {[
                {label:t('profile_save_inc'),      val:'+12%', color:'#22C55E', bg:'rgba(34,197,94,.09)'},
                {label:t('profile_invest_opp'),    val:isAr?'مرتفعة':'High',  color:'#D8AE63', bg:'rgba(216,174,99,.10)'},
                {label:t('profile_portfolio_risk'),val:isAr?'منخفضة':'Low',   color:'#3B82F6', bg:'rgba(59,130,246,.09)'},
              ].map((r,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',borderRadius:'11px',background:r.bg,marginBottom:i<2?'8px':'0'}}>
                  <span style={{fontSize:'12.5px',fontWeight:'600',color:'#5B4332'}}>{r.label}</span>
                  <span style={{fontSize:'13px',fontWeight:'800',color:r.color,fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{r.val}</span>
                </div>
              ))}
            </div>

            {/* Daily quote */}
            <div style={{background:'linear-gradient(135deg,rgba(216,174,99,.10),rgba(154,108,60,.07))',border:'1px solid rgba(216,174,99,.22)',borderRadius:'20px',padding:'20px 18px'}}>
              <div style={{fontSize:'12.5px',fontWeight:'700',color:'#D8AE63',marginBottom:'10px',display:'flex',alignItems:'center',gap:'7px'}}>
                <span>✨</span>{t('profile_daily_msg')}
              </div>
              <p style={{fontSize:'13px',color:'#5B4332',lineHeight:1.75,fontStyle:'italic',fontWeight:'500'}}>{t('profile_quote')}</p>
              <div style={{marginTop:'10px',fontSize:'11px',color:'rgba(154,108,60,.5)',textAlign:dir==='rtl'?'left':'right',direction:'ltr'}}>— SFM Wisdom</div>
            </div>

          </div>
        </div>

        {/* ── FEATURE GRID ── */}
        <div style={{...S(240),marginTop:'26px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
            <div style={{width:'4px',height:'22px',background:'linear-gradient(180deg,#D8AE63,#9A6C3C)',borderRadius:'4px'}}/>
            <h2 style={{fontSize:'18px',fontWeight:'800',color:'#111111',margin:0}}>{t('profile_features')}</h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'14px'}} className="feat-g">
            {FEAT.map((f,i) => (
              <div key={i} className="feat-card">
                <div style={{width:'44px',height:'44px',background:'linear-gradient(135deg,rgba(216,174,99,.18),rgba(154,108,60,.12))',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',margin:'0 auto 12px',border:'1px solid rgba(216,174,99,.2)'}}>{f.icon}</div>
                <h4 style={{fontSize:'14px',fontWeight:'800',color:'#111111',marginBottom:'5px'}}>{t(f.t as any)}</h4>
                <p style={{fontSize:'11.5px',color:'#9A6C3C',lineHeight:1.6}}>{t(f.d as any)}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  </>);
}
