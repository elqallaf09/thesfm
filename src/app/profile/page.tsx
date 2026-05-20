'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { INCOME_CATEGORIES } from '@/lib/income-categories';

/* ─── Static Data ─── */
const PROFESSIONS = ['طبيب عام','طبيب أسنان','طبيب متخصص','صيدلاني','ممرض/ممرضة','مهندس مدني','مهندس كهربائي','مهندس ميكانيكي','مهندس معماري','مهندس برمجيات','مطور تطبيقات','مطور ويب','محلل نظم','خبير أمن معلومات','محلل بيانات','مهندس ذكاء اصطناعي','مصمم UX/UI','معلم ابتدائي','معلم متوسط','معلم ثانوي','أستاذ جامعي','مدرب مهني','محاسب','مدقق حسابات','محلل مالي','مصرفي','خبير أسواق ومعلومات','مستشار استثمار','مدير أعمال','رجل أعمال','مدير تسويق','محامي','مستشار قانوني','قاضي','ضابط شرطة','موظف حكومي','صحفي','مصور','مصمم جرافيك','فنان','كاتب','تاجر','مستورد ومصدر','مدرب رياضي','طالب','متقاعد','ربة منزل','باحث علمي','أخرى'];
const COUNTRY_CODES = [{code:'+965',name:'الكويت 🇰🇼'},{code:'+966',name:'السعودية 🇸🇦'},{code:'+971',name:'الإمارات 🇦🇪'},{code:'+973',name:'البحرين 🇧🇭'},{code:'+968',name:'عُمان 🇴🇲'},{code:'+974',name:'قطر 🇶🇦'},{code:'+962',name:'الأردن 🇯🇴'},{code:'+961',name:'لبنان 🇱🇧'},{code:'+20',name:'مصر 🇪🇬'},{code:'+1',name:'أمريكا/كندا 🇺🇸'},{code:'+44',name:'بريطانيا 🇬🇧'},{code:'+33',name:'فرنسا 🇫🇷'},{code:'+49',name:'ألمانيا 🇩🇪'},{code:'+91',name:'الهند 🇮🇳'}];

type Tab = 'info'|'password'|'income'|'goals'|'invest'|'charity'|'ai';

/* ─── Progress Ring ─── */
function ProgressRing({pct,size=100,stroke=8}:{pct:number;size?:number;stroke?:number}){
  const r=(size-stroke*2)/2, c=2*Math.PI*r, dash=(pct/100)*c;
  return(
    <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(216,174,99,0.15)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#rg)" strokeWidth={stroke}
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        style={{transition:'stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1) 0.3s'}}/>
      <defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D8AE63"/><stop offset="100%" stopColor="#9A6C3C"/>
      </linearGradient></defs>
    </svg>
  );
}

export default function ProfilePage(){
  const {user,loading}=useAuth();
  const router=useRouter();
  const [profile,setProfile]=useState<any>({phone_country_code:'+965',gender:'',profession:''});
  const [incomeAmounts,setIncomeAmounts]=useState<Record<string,string>>({});
  const [oldPassword,setOldPassword]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [message,setMessage]=useState<{type:'success'|'error';text:string}|null>(null);
  const [activeTab,setActiveTab]=useState<Tab>('info');
  const [mounted,setMounted]=useState(false);

  useEffect(()=>{if(!loading&&!user){router.push('/');return;}if(user)loadData();},[user,loading]);
  useEffect(()=>{setTimeout(()=>setMounted(true),80);},[]);

  const loadData=async()=>{
    const{data:p}=await supabase.from('profiles').select('*').eq('id',user!.id).maybeSingle();
    if(p)setProfile({display_name:p.display_name||'',username:p.username||'',email:p.email||user?.email||'',age:p.age?String(p.age):'',gender:p.gender||'',profession:p.profession||'',phone_country_code:p.phone_country_code||'+965',phone_number:p.phone_number||''});
    else setProfile((prev:any)=>({...prev,email:user?.email||''}));
    const{data:s}=await supabase.from('monthly_income_sources').select('*').eq('user_id',user!.id);
    if(s){const a:Record<string,string>={};s.forEach((src:any)=>{a[src.category]=String(src.amount);});setIncomeAmounts(a);}
  };

  const saveInfo=async()=>{
    if(!profile.display_name?.trim()){setMessage({type:'error',text:'الاسم المعروض مطلوب'});return;}
    setSaving(true);setMessage(null);
    const{error}=await supabase.from('profiles').update({display_name:profile.display_name.trim(),username:profile.username?.trim()||null,age:profile.age?parseInt(String(profile.age)):null,gender:profile.gender||null,profession:profile.profession||null,phone_country_code:profile.phone_country_code||'+965',phone_number:profile.phone_number||null}).eq('id',user!.id);
    if(error)setMessage({type:'error',text:'حدث خطأ: '+error.message});
    else{setMessage({type:'success',text:'تم حفظ البيانات بنجاح'});setSaved(true);setTimeout(()=>setSaved(false),3000);}
    setSaving(false);
  };

  const savePassword=async()=>{
    if(!oldPassword){setMessage({type:'error',text:'أدخل كلمة المرور الحالية'});return;}
    if(newPassword.length<6){setMessage({type:'error',text:'كلمة المرور الجديدة 6 أحرف على الأقل'});return;}
    if(newPassword!==confirmPassword){setMessage({type:'error',text:'كلمة المرور الجديدة وتأكيدها غير متطابقين'});return;}
    setSaving(true);setMessage(null);
    const email=profile.email||`${profile.username}@smart-finance.local`;
    const{error:signInErr}=await supabase.auth.signInWithPassword({email,password:oldPassword});
    if(signInErr){setMessage({type:'error',text:'كلمة المرور الحالية غير صحيحة'});setSaving(false);return;}
    const{error}=await supabase.auth.updateUser({password:newPassword});
    if(error)setMessage({type:'error',text:'حدث خطأ: '+error.message});
    else{setMessage({type:'success',text:'تم تغيير كلمة المرور بنجاح'});setOldPassword('');setNewPassword('');setConfirmPassword('');}
    setSaving(false);
  };

  const saveIncome=async()=>{
    setSaving(true);setMessage(null);
    await supabase.from('monthly_income_sources').delete().eq('user_id',user!.id);
    const rows=INCOME_CATEGORIES.map(cat=>({user_id:user!.id,category:cat.id,label:cat.nameAr,amount:parseFloat((incomeAmounts[cat.id]||'0').replace(/[^\d.]/g,''))||0})).filter(r=>r.amount>0);
    if(rows.length>0)await supabase.from('monthly_income_sources').insert(rows);
    setMessage({type:'success',text:'تم تحديث مصادر الدخل بنجاح'});
    setSaving(false);
  };

  const completionPct=Math.round([profile.display_name,profile.username,profile.age,profile.gender,profile.profession,profile.phone_number,profile.email].filter(Boolean).length/7*100);
  const initials=(profile.display_name||profile.username||'SFM').substring(0,2).toUpperCase();

  const S=(d:number)=>({opacity:mounted?1:0,transform:mounted?'translateY(0)':'translateY(22px)',transition:`opacity .55s ease ${d}ms, transform .55s ease ${d}ms`});

  if(loading)return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#F7F3EA'}}>
      <div style={{width:'44px',height:'44px',borderRadius:'50%',border:'3px solid rgba(216,174,99,0.2)',borderTopColor:'#D8AE63',animation:'spin 1s linear infinite'}}/>
    </div>
  );

  const TABS=[
    {id:'info',label:'المعلومات الشخصية',icon:'👤'},
    {id:'password',label:'كلمة المرور',icon:'🔒'},
    {id:'income',label:'مصادر الدخل',icon:'💰'},
    {id:'goals',label:'الأهداف المالية',icon:'🎯'},
    {id:'invest',label:'الاستثمار',icon:'📈'},
    {id:'charity',label:'الأعمال الخيرية',icon:'🤲'},
    {id:'ai',label:'AI التحليلات',icon:'🤖'},
  ] as const;

  const AI_CARDS=[
    {icon:'💼',label:'مصادر الدخل',val:Object.values(incomeAmounts).filter(v=>parseFloat(v)>0).length||3,unit:'مصادر'},
    {icon:'🎯',label:'الأهداف المالية',val:7,unit:'أهداف'},
    {icon:'📈',label:'الاستثمار',val:'نشط',unit:''},
    {icon:'📊',label:'التقدم المالي',val:'+18%',unit:''},
  ];

  const FEATURE_CARDS=[
    {icon:'✨',title:'واجهة ذكية',desc:'تصميم عصري وسهل الاستخدام'},
    {icon:'🧠',title:'ذكاء مالي',desc:'تحليلات مالية دقيقة ولحظية'},
    {icon:'🤖',title:'تحليلات AI',desc:'توصيات استثمارية ذكية'},
    {icon:'🛡',title:'حماية متقدمة',desc:'تشفير بنكي عالي المستوى'},
    {icon:'⚡',title:'تحديث لحظي',desc:'بياناتك محدثة دائماً'},
    {icon:'🎯',title:'أهداف مالية',desc:'تتبع أهدافك بدقة'},
  ];

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      .wp{font-family:'Tajawal',sans-serif;direction:rtl;background:#F7F3EA;min-height:100vh;color:#151515}
      .wp ::-webkit-scrollbar{width:4px}.wp ::-webkit-scrollbar-thumb{background:rgba(216,174,99,.3);border-radius:10px}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
      @keyframes success-burst{0%{transform:scale(0.95);opacity:0}50%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}
      .wcard{background:#FFFDFB;border:1px solid rgba(216,174,99,.16);border-radius:28px;box-shadow:0 4px 24px rgba(90,67,51,.06),0 1px 4px rgba(0,0,0,.04);transition:all .28s cubic-bezier(.4,0,.2,1)}
      .wcard:hover:not(.no-h){transform:translateY(-3px);box-shadow:0 12px 40px rgba(90,67,51,.11),0 0 0 1px rgba(216,174,99,.22)}
      .ai-card{cursor:default;background:rgba(255,253,251,.85);backdrop-filter:blur(12px);border:1px solid rgba(216,174,99,.18);border-radius:20px;padding:18px 16px;transition:all .25s;position:relative;overflow:hidden}
      .ai-card::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(216,174,99,.06),transparent);opacity:0;transition:opacity .25s;border-radius:20px;pointer-events:none}
      .ai-card:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(90,67,51,.10),0 0 0 1px rgba(216,174,99,.28)}
      .ai-card:hover::after{opacity:1}
      .wfield{position:relative;width:100%}
      .wfield input,.wfield select,.wfield textarea{width:100%;height:56px;background:rgba(247,243,234,.7);border:1.5px solid rgba(216,174,99,.25);border-radius:16px;padding:18px 16px 6px 42px;font-family:'Tajawal',sans-serif;font-size:15px;font-weight:400;color:#151515;outline:none;transition:all .2s;-webkit-appearance:none;backdrop-filter:blur(4px)}
      .wfield input:focus,.wfield select:focus{border-color:#D8AE63;box-shadow:0 0 0 3px rgba(216,174,99,.14),0 2px 8px rgba(216,174,99,.10);background:rgba(255,253,251,0.9)}
      .wfield label{position:absolute;right:16px;top:10px;font-size:11px;font-weight:700;color:#9A6C3C;pointer-events:none;letter-spacing:.03em}
      .wfield .icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;opacity:.55;pointer-events:none}
      .wfield select{cursor:pointer;padding-left:38px;background:rgba(247,243,234,.7) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23D8AE63' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat left 14px center}
      .tab-pill{display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:40px;border:none;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:13px;font-weight:600;white-space:nowrap;transition:all .22s cubic-bezier(.4,0,.2,1)}
      .tab-pill.active{background:linear-gradient(135deg,#151515,#2D1A0A);color:#D8AE63;box-shadow:0 4px 16px rgba(21,21,21,.25)}
      .tab-pill.idle{background:rgba(255,253,251,.75);color:#9A6C3C;border:1px solid rgba(216,174,99,.2)}
      .tab-pill.idle:hover{background:rgba(255,253,251,1);border-color:#D8AE63;color:#5A4333}
      .save-btn{width:100%;height:60px;background:linear-gradient(135deg,#151515 0%,#2D1A0A 40%,#D8AE63 100%);background-size:200%;border:none;border-radius:18px;color:#fff;font-family:'Tajawal',sans-serif;font-size:17px;font-weight:800;cursor:pointer;letter-spacing:.02em;transition:all .3s;position:relative;overflow:hidden}
      .save-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,#D8AE63 0%,#9A6C3C 40%,#151515 100%);opacity:0;transition:opacity .3s}
      .save-btn:hover::before{opacity:1}
      .save-btn:hover{box-shadow:0 8px 32px rgba(21,21,21,.3),0 0 0 1px rgba(216,174,99,.4);transform:translateY(-2px)}
      .save-btn:active{transform:scale(.98)}
      .save-btn span{position:relative;z-index:1}
      .save-btn.success-state{background:linear-gradient(135deg,#2d8a4e,#1a6b35) !important}
      .feat-card{background:rgba(255,253,251,.8);border:1px solid rgba(216,174,99,.15);border-radius:20px;padding:22px 18px;text-align:center;transition:all .25s;cursor:default;position:relative;overflow:hidden;backdrop-filter:blur(8px)}
      .feat-card:hover{transform:translateY(-4px);box-shadow:0 12px 36px rgba(90,67,51,.10),0 0 0 1.5px rgba(216,174,99,.35)}
      .feat-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(216,174,99,.08),transparent);opacity:0;transition:opacity .25s;border-radius:20px}
      .feat-card:hover::before{opacity:1}
      .income-row{display:flex;align-items:center;gap:12px;padding:14px 16px;background:rgba(247,243,234,.6);border:1px solid rgba(216,174,99,.15);border-radius:14px;transition:all .2s}
      .income-row:hover{background:rgba(255,253,251,.9);border-color:rgba(216,174,99,.3)}
      .income-input{flex:1;height:40px;background:rgba(255,253,251,.9);border:1.5px solid rgba(216,174,99,.2);border-radius:10px;padding:0 12px;font-family:'IBM Plex Sans Arabic',sans-serif;font-size:14px;font-weight:600;color:#151515;outline:none;text-align:center;direction:ltr;transition:border-color .2s}
      .income-input:focus{border-color:#D8AE63;box-shadow:0 0 0 3px rgba(216,174,99,.12)}
      @media(max-width:900px){.pg2{grid-template-columns:1fr!important}.hero-grid{grid-template-columns:1fr!important}.tab-scroll{overflow-x:auto;padding-bottom:4px}}
      @media(max-width:600px){.pg2{grid-template-columns:1fr!important}.hero-pad{padding:28px 22px!important}.save-btn{height:52px;font-size:15px}}
    `}</style>

    <div className="wp">

      {/* ── Background blobs ── */}
      <div style={{position:'fixed',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0}}>
        <div style={{position:'absolute',top:'-120px',right:'-80px',width:'480px',height:'480px',borderRadius:'50%',background:'radial-gradient(circle,rgba(216,174,99,.12) 0%,transparent 70%)'}}/>
        <div style={{position:'absolute',bottom:'-60px',left:'-100px',width:'400px',height:'400px',borderRadius:'50%',background:'radial-gradient(circle,rgba(154,108,60,.08) 0%,transparent 70%)'}}/>
        <div style={{position:'absolute',top:'40%',left:'30%',width:'300px',height:'300px',borderRadius:'50%',background:'radial-gradient(circle,rgba(216,174,99,.05) 0%,transparent 70%)'}}/>
      </div>

      <div style={{maxWidth:'1280px',margin:'0 auto',padding:'24px 20px 80px',position:'relative',zIndex:1}}>

        {/* ═══ SECTION 1: HERO ═══ */}
        <div style={{...S(0),marginBottom:'28px',display:'grid',gridTemplateColumns:'1fr 340px',gap:'20px',alignItems:'stretch'}} className="hero-grid">

          {/* Left: AI cards */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',alignContent:'center'}}>
            <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
              <button onClick={()=>router.push('/')} style={{display:'flex',alignItems:'center',gap:'8px',background:'rgba(255,253,251,.8)',border:'1px solid rgba(216,174,99,.22)',borderRadius:'12px',padding:'8px 16px',cursor:'pointer',color:'#5A4333',fontSize:'13px',fontWeight:'700',fontFamily:'Tajawal,sans-serif',transition:'all .2s',backdropFilter:'blur(8px)'}}>
                ← لوحة التحكم
              </button>
            </div>
            {AI_CARDS.map((card,i)=>(
              <div key={i} className="ai-card" style={{animationDelay:`${i*.08}s`}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                  <div style={{width:'38px',height:'38px',background:'linear-gradient(135deg,rgba(216,174,99,.18),rgba(154,108,60,.12))',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',border:'1px solid rgba(216,174,99,.22)'}}>{card.icon}</div>
                  <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#D8AE63',animation:'pulse 2s infinite'}}/>
                </div>
                <div style={{fontSize:'22px',fontWeight:'900',color:'#151515',fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1,marginBottom:'4px'}}>{card.val}<span style={{fontSize:'13px',color:'#9A6C3C',marginRight:'4px'}}>{card.unit}</span></div>
                <div style={{fontSize:'12px',fontWeight:'600',color:'#9A6C3C'}}>{card.label}</div>
                {/* Gold line accent */}
                <div style={{position:'absolute',bottom:0,right:0,width:'40%',height:'2px',background:'linear-gradient(90deg,transparent,rgba(216,174,99,.5))',borderRadius:'0 0 20px 0'}}/>
              </div>
            ))}
          </div>

          {/* Right: Hero profile card */}
          <div className="wcard" style={{background:'linear-gradient(155deg,#2B1A0D 0%,#3D2618 50%,#2B1A0D 100%)',padding:'36px 28px',textAlign:'center',position:'relative',overflow:'hidden'}}>
            {/* Decorative circles */}
            <div style={{position:'absolute',top:'-40px',right:'-40px',width:'200px',height:'200px',borderRadius:'50%',border:'1px solid rgba(216,174,99,.08)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',bottom:'-60px',left:'-60px',width:'250px',height:'250px',borderRadius:'50%',border:'1px solid rgba(216,174,99,.06)',pointerEvents:'none'}}/>

            {/* Avatar + ring */}
            <div style={{position:'relative',width:'120px',height:'120px',margin:'0 auto 18px'}}>
              <ProgressRing pct={completionPct} size={120} stroke={6}/>
              <div style={{position:'absolute',inset:'8px',borderRadius:'50%',background:'linear-gradient(135deg,#D8AE63,#9A6C3C)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'30px',fontWeight:'900',color:'#151515',boxShadow:'0 4px 20px rgba(216,174,99,.4)'}}>
                {initials}
              </div>
              {/* % label */}
              <div style={{position:'absolute',bottom:'-4px',left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#D8AE63,#9A6C3C)',borderRadius:'20px',padding:'2px 10px',fontSize:'11px',fontWeight:'800',color:'#151515',whiteSpace:'nowrap'}}>
                {completionPct}%
              </div>
            </div>

            {/* Name + title */}
            <h2 style={{fontSize:'22px',fontWeight:'900',color:'#FFFDFB',marginBottom:'4px',letterSpacing:'-0.01em'}}>
              {profile.display_name||profile.username||'SFM User'}
            </h2>
            <p style={{fontSize:'13px',color:'rgba(216,174,99,.7)',marginBottom:'16px'}}>{profile.profession||'عضو مميز'}</p>

            {/* Elite badge */}
            <div style={{display:'inline-flex',alignItems:'center',gap:'7px',background:'linear-gradient(135deg,rgba(216,174,99,.2),rgba(154,108,60,.14))',border:'1px solid rgba(216,174,99,.35)',borderRadius:'30px',padding:'7px 18px',marginBottom:'18px'}}>
              <span style={{fontSize:'14px'}}>⭐</span>
              <span style={{fontSize:'12px',fontWeight:'800',color:'#D8AE63',letterSpacing:'.06em'}}>ELITE MEMBER</span>
            </div>

            {/* AI Status */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',background:'rgba(255,255,255,.05)',borderRadius:'14px',padding:'10px 16px',border:'1px solid rgba(255,255,255,.07)'}}>
              <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#22C55E',animation:'pulse 1.5s infinite',flexShrink:0}}/>
              <span style={{fontSize:'12px',color:'rgba(255,255,255,.65)',fontWeight:'600'}}>المدير المالي الذكي نشط</span>
              <span style={{fontSize:'14px'}}>🤖</span>
            </div>

            {/* Profile completion label */}
            <div style={{marginTop:'14px',fontSize:'11px',color:'rgba(216,174,99,.5)',fontWeight:'500'}}>اكتمال الملف الشخصي • {completionPct}%</div>

            {/* Golden accent lines */}
            <div style={{position:'absolute',top:'50%',right:0,width:'1px',height:'30%',background:'linear-gradient(180deg,transparent,rgba(216,174,99,.3),transparent)',transform:'translateY(-50%)'}}/>
            <div style={{position:'absolute',top:'50%',left:0,width:'1px',height:'30%',background:'linear-gradient(180deg,transparent,rgba(216,174,99,.3),transparent)',transform:'translateY(-50%)'}}/>
          </div>
        </div>

        {/* ═══ SECTION 2: NAVIGATION ═══ */}
        <div style={{...S(80),marginBottom:'24px'}}>
          <div className="tab-scroll" style={{display:'flex',gap:'8px',padding:'4px'}}>
            {TABS.map(tab=>(
              <button key={tab.id} className={'tab-pill '+(activeTab===tab.id?'active':'idle')}
                onClick={()=>setActiveTab(tab.id as Tab)}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ SECTION 3+4: CONTENT + SIDEBAR ═══ */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:'20px',alignItems:'start'}} className="pg2">

          {/* ── MAIN CONTENT ── */}
          <div style={S(120)}>

            {/* ─── MESSAGE ─── */}
            {message&&(
              <div style={{marginBottom:'16px',padding:'14px 18px',borderRadius:'16px',display:'flex',alignItems:'center',gap:'12px',
                background:message.type==='success'?'rgba(45,138,78,.08)':'rgba(239,68,68,.08)',
                border:`1.5px solid ${message.type==='success'?'rgba(45,138,78,.25)':'rgba(239,68,68,.25)'}`,
                color:message.type==='success'?'#2d8a4e':'#EF4444',animation:'fadeUp .3s ease'}}>
                <span style={{fontSize:'18px'}}>{message.type==='success'?'✅':'⚠️'}</span>
                <span style={{fontSize:'14px',fontWeight:'600',fontFamily:'Tajawal,sans-serif'}}>{message.text}</span>
              </div>
            )}

            {/* ─── INFO PANEL ─── */}
            {activeTab==='info'&&(
              <div className="wcard" style={{padding:'32px 36px'}}>
                {/* Panel header */}
                <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'28px',paddingBottom:'20px',borderBottom:'1px solid rgba(216,174,99,.12)'}}>
                  <div style={{width:'48px',height:'48px',background:'linear-gradient(135deg,#D8AE63,#9A6C3C)',borderRadius:'16px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',boxShadow:'0 4px 14px rgba(216,174,99,.3)'}}>👤</div>
                  <div>
                    <h3 style={{fontSize:'19px',fontWeight:'800',color:'#151515',marginBottom:'3px'}}>المعلومات الشخصية</h3>
                    <p style={{fontSize:'13px',color:'#9A6C3C'}}>قم بإدارة بياناتك وتجربة الذكاء المالي</p>
                  </div>
                </div>

                {/* Fields grid */}
                <div className="pg2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'18px'}}>
                  {/* Full name */}
                  <div className="wfield">
                    <label>الاسم الكامل</label>
                    <span className="icon">✍️</span>
                    <input placeholder="محمد القلاف" value={profile.display_name||''} onChange={e=>setProfile((p:any)=>({...p,display_name:e.target.value}))}/>
                  </div>
                  {/* Username */}
                  <div className="wfield">
                    <label>اسم المستخدم</label>
                    <span className="icon">@</span>
                    <input placeholder="elqallaf09" value={profile.username||''} onChange={e=>setProfile((p:any)=>({...p,username:e.target.value}))} dir="ltr"/>
                  </div>
                  {/* Age */}
                  <div className="wfield">
                    <label>العمر</label>
                    <span className="icon">🎂</span>
                    <input type="number" placeholder="35" value={profile.age||''} onChange={e=>setProfile((p:any)=>({...p,age:e.target.value}))} dir="ltr"/>
                  </div>
                  {/* Gender */}
                  <div className="wfield">
                    <label>الجنس</label>
                    <span className="icon">👤</span>
                    <select value={profile.gender||''} onChange={e=>setProfile((p:any)=>({...p,gender:e.target.value}))}>
                      <option value="">اختر...</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>
                  {/* Country code */}
                  <div className="wfield">
                    <label>رمز الدولة</label>
                    <span className="icon">🌍</span>
                    <select value={profile.phone_country_code||'+965'} onChange={e=>setProfile((p:any)=>({...p,phone_country_code:e.target.value}))}>
                      {COUNTRY_CODES.map(c=><option key={c.code} value={c.code}>{c.name} {c.code}</option>)}
                    </select>
                  </div>
                  {/* Phone */}
                  <div className="wfield">
                    <label>رقم الهاتف</label>
                    <span className="icon">📱</span>
                    <input type="tel" placeholder="97515177" value={profile.phone_number||''} onChange={e=>setProfile((p:any)=>({...p,phone_number:e.target.value}))} dir="ltr"/>
                  </div>
                  {/* Profession */}
                  <div className="wfield" style={{gridColumn:'1/-1'}}>
                    <label>المهنة</label>
                    <span className="icon">💼</span>
                    <select value={profile.profession||''} onChange={e=>setProfile((p:any)=>({...p,profession:e.target.value}))}>
                      <option value="">اختر مهنتك...</option>
                      {PROFESSIONS.map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  {/* Email (read-only) */}
                  <div className="wfield" style={{gridColumn:'1/-1'}}>
                    <label>البريد الإلكتروني</label>
                    <span className="icon">📧</span>
                    <input type="email" placeholder="user@the-sfm.com" value={profile.email||''} readOnly style={{opacity:.7,cursor:'not-allowed'}} dir="ltr"/>
                  </div>
                </div>

                {/* Save button */}
                <div style={{marginTop:'28px'}}>
                  <button className={'save-btn'+(saved?' success-state':'')} onClick={saveInfo} disabled={saving}>
                    <span>
                      {saving?(
                        <span style={{display:'inline-flex',alignItems:'center',gap:'10px'}}>
                          <span style={{width:'18px',height:'18px',borderRadius:'50%',border:'2.5px solid rgba(255,255,255,.3)',borderTopColor:'#fff',animation:'spin 1s linear infinite',display:'inline-block'}}/>
                          جارٍ الحفظ...
                        </span>
                      ):saved?(
                        <span style={{display:'inline-flex',alignItems:'center',gap:'10px',animation:'success-burst .4s ease'}}>✅ تم الحفظ بنجاح</span>
                      ):'✦ حفظ المعلومات الشخصية'}
                    </span>
                  </button>
                  <p style={{textAlign:'center',fontSize:'12px',color:'#9A6C3C',marginTop:'12px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                    <span>🔒</span> نحن نضمن حماية بياناتك الشخصية وفق أعلى معايير الأمان
                  </p>
                </div>
              </div>
            )}

            {/* ─── PASSWORD PANEL ─── */}
            {activeTab==='password'&&(
              <div className="wcard" style={{padding:'32px 36px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'28px',paddingBottom:'20px',borderBottom:'1px solid rgba(216,174,99,.12)'}}>
                  <div style={{width:'48px',height:'48px',background:'linear-gradient(135deg,#151515,#2D1A0A)',borderRadius:'16px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',boxShadow:'0 4px 14px rgba(21,21,21,.2)'}}>🔒</div>
                  <div>
                    <h3 style={{fontSize:'19px',fontWeight:'800',color:'#151515',marginBottom:'3px'}}>تغيير كلمة المرور</h3>
                    <p style={{fontSize:'13px',color:'#9A6C3C'}}>احتفظ بحسابك آمناً باستخدام كلمة مرور قوية</p>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'18px'}}>
                  {[
                    {label:'كلمة المرور الحالية',icon:'🔑',val:oldPassword,set:setOldPassword},
                    {label:'كلمة المرور الجديدة',icon:'🔏',val:newPassword,set:setNewPassword},
                    {label:'تأكيد كلمة المرور الجديدة',icon:'✅',val:confirmPassword,set:setConfirmPassword},
                  ].map((f,i)=>(
                    <div key={i} className="wfield">
                      <label>{f.label}</label>
                      <span className="icon">{f.icon}</span>
                      <input type="password" placeholder="••••••••" value={f.val} onChange={e=>f.set(e.target.value)} dir="ltr" style={{paddingTop:'8px'}}/>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:'28px'}}>
                  <button className="save-btn" onClick={savePassword} disabled={saving}>
                    <span>{saving?<span style={{display:'inline-flex',alignItems:'center',gap:'10px'}}><span style={{width:'18px',height:'18px',borderRadius:'50%',border:'2.5px solid rgba(255,255,255,.3)',borderTopColor:'#fff',animation:'spin 1s linear infinite',display:'inline-block'}}/> جارٍ التغيير...</span>:'🔐 تغيير كلمة المرور'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ─── INCOME PANEL ─── */}
            {activeTab==='income'&&(
              <div className="wcard" style={{padding:'32px 36px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'24px',paddingBottom:'18px',borderBottom:'1px solid rgba(216,174,99,.12)'}}>
                  <div style={{width:'48px',height:'48px',background:'linear-gradient(135deg,#D8AE63,#9A6C3C)',borderRadius:'16px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',boxShadow:'0 4px 14px rgba(216,174,99,.3)'}}>💰</div>
                  <div>
                    <h3 style={{fontSize:'19px',fontWeight:'800',color:'#151515',marginBottom:'3px'}}>مصادر الدخل الشهري</h3>
                    <p style={{fontSize:'13px',color:'#9A6C3C'}}>أدخل مبالغ مصادر دخلك الشهرية بالدينار الكويتي</p>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'10px',maxHeight:'480px',overflowY:'auto'}}>
                  {INCOME_CATEGORIES.map(cat=>(
                    <div key={cat.id} className="income-row">
                      <span style={{fontSize:'20px',flexShrink:0}}>{cat.icon}</span>
                      <span style={{flex:1,fontSize:'14px',fontWeight:'600',color:'#151515'}}>{cat.nameAr}</span>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
                        <span style={{fontSize:'11px',fontWeight:'700',color:'#D8AE63',fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>د.ك</span>
                        <input className="income-input" type="text" placeholder="0.000"
                          value={incomeAmounts[cat.id]||''}
                          onChange={e=>setIncomeAmounts(prev=>({...prev,[cat.id]:e.target.value}))}/>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:'24px'}}>
                  <button className="save-btn" onClick={saveIncome} disabled={saving}>
                    <span>{saving?<span style={{display:'inline-flex',alignItems:'center',gap:'10px'}}><span style={{width:'18px',height:'18px',borderRadius:'50%',border:'2.5px solid rgba(255,255,255,.3)',borderTopColor:'#fff',animation:'spin 1s linear infinite',display:'inline-block'}}/> جارٍ الحفظ...</span>:'💰 حفظ مصادر الدخل'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ─── OTHER TABS placeholder ─── */}
            {!['info','password','income'].includes(activeTab)&&(
              <div className="wcard" style={{padding:'48px 36px',textAlign:'center'}}>
                <div style={{fontSize:'52px',marginBottom:'18px'}}>
                  {TABS.find(t=>t.id===activeTab)?.icon}
                </div>
                <h3 style={{fontSize:'22px',fontWeight:'800',color:'#151515',marginBottom:'10px'}}>
                  {TABS.find(t=>t.id===activeTab)?.label}
                </h3>
                <p style={{fontSize:'14px',color:'#9A6C3C',marginBottom:'24px',lineHeight:1.7}}>
                  هذا القسم قيد التطوير ضمن الجيل القادم من SFM Premium.
                </p>
                <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'linear-gradient(135deg,rgba(216,174,99,.14),rgba(154,108,60,.10))',border:'1px solid rgba(216,174,99,.25)',borderRadius:'20px',padding:'9px 20px'}}>
                  <span style={{fontSize:'12px',fontWeight:'700',color:'#D8AE63'}}>قريباً • Coming Soon</span>
                  <span>✨</span>
                </div>
              </div>
            )}

          </div>

          {/* ── AI SIDEBAR ── */}
          <div style={{...S(160),display:'flex',flexDirection:'column',gap:'16px',position:'sticky',top:'24px'}}>

            {/* Card 1: Health score */}
            <div style={{background:'linear-gradient(145deg,#2B1A0D,#3D2618)',borderRadius:'24px',padding:'24px 20px',textAlign:'center',border:'1px solid rgba(216,174,99,.2)',boxShadow:'0 8px 32px rgba(43,26,13,.25)',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:'-30px',right:'-30px',width:'120px',height:'120px',borderRadius:'50%',background:'radial-gradient(circle,rgba(216,174,99,.12) 0%,transparent 70%)',pointerEvents:'none'}}/>
              <div style={{fontSize:'13px',fontWeight:'700',color:'rgba(216,174,99,.6)',marginBottom:'16px',letterSpacing:'.04em'}}>مستوى الصحة المالية</div>
              <div style={{position:'relative',width:'100px',height:'100px',margin:'0 auto 16px'}}>
                <ProgressRing pct={78} size={100} stroke={7}/>
                <div style={{position:'absolute',inset:'8px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:'24px',fontWeight:'900',color:'#D8AE63',fontFamily:"'IBM Plex Sans Arabic',sans-serif",lineHeight:1}}>78</span>
                  <span style={{fontSize:'10px',color:'rgba(216,174,99,.55)'}}>/100</span>
                </div>
              </div>
              <div style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'rgba(34,197,94,.12)',borderRadius:'20px',padding:'4px 14px'}}>
                <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#22C55E',animation:'pulse 1.5s infinite'}}/>
                <span style={{fontSize:'12px',fontWeight:'700',color:'#22C55E'}}>ممتاز</span>
              </div>
            </div>

            {/* Card 2: AI predictions */}
            <div style={{background:'#FFFDFB',border:'1px solid rgba(216,174,99,.18)',borderRadius:'22px',padding:'22px 18px',boxShadow:'0 4px 20px rgba(90,67,51,.06)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
                <div style={{width:'36px',height:'36px',background:'linear-gradient(135deg,#151515,#2D1A0A)',borderRadius:'11px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>🤖</div>
                <div style={{fontSize:'14px',fontWeight:'800',color:'#151515'}}>توقعات الذكاء الاصطناعي</div>
              </div>
              {[
                {label:'زيادة الادخار',val:'+12%',color:'#22C55E',bg:'rgba(34,197,94,.09)'},
                {label:'فرصة استثمار',val:'مرتفعة',color:'#D8AE63',bg:'rgba(216,174,99,.10)'},
                {label:'مخاطر المحفظة',val:'منخفضة',color:'#3B82F6',bg:'rgba(59,130,246,.09)'},
              ].map((r,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderRadius:'12px',background:r.bg,marginBottom:i<2?'8px':'0'}}>
                  <span style={{fontSize:'12.5px',fontWeight:'600',color:'#5A4333'}}>{r.label}</span>
                  <span style={{fontSize:'13px',fontWeight:'800',color:r.color,fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>{r.val}</span>
                </div>
              ))}
            </div>

            {/* Card 3: Daily quote */}
            <div style={{background:'linear-gradient(135deg,rgba(216,174,99,.10),rgba(154,108,60,.07))',border:'1px solid rgba(216,174,99,.22)',borderRadius:'22px',padding:'22px 18px'}}>
              <div style={{fontSize:'13px',fontWeight:'700',color:'#D8AE63',marginBottom:'12px',display:'flex',alignItems:'center',gap:'7px'}}>
                <span>✨</span> رسالة اليوم
              </div>
              <p style={{fontSize:'14px',color:'#5A4333',lineHeight:1.75,fontStyle:'italic',fontWeight:'500'}}>
                "استثمر في التعلم فهو أفضل استثمار يمكن أن تقوم به طوال حياتك"
              </p>
              <div style={{marginTop:'12px',fontSize:'11px',color:'rgba(154,108,60,.55)',textAlign:'left',direction:'ltr'}}>— SFM Wisdom</div>
            </div>

          </div>
        </div>

        {/* ═══ SECTION 6: FEATURE GRID ═══ */}
        <div style={{...S(240),marginTop:'28px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'18px'}}>
            <div style={{width:'4px',height:'22px',background:'linear-gradient(180deg,#D8AE63,#9A6C3C)',borderRadius:'4px'}}/>
            <h2 style={{fontSize:'19px',fontWeight:'800',color:'#151515',margin:0}}>مميزات SFM Premium</h2>
          </div>
          <div className="pg2" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'14px'}} id="feat-grid">
            {FEATURE_CARDS.map((card,i)=>(
              <div key={i} className="feat-card" style={{animationDelay:`${i*.06}s`}}>
                <div style={{width:'46px',height:'46px',background:'linear-gradient(135deg,rgba(216,174,99,.18),rgba(154,108,60,.12))',borderRadius:'16px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',margin:'0 auto 14px',border:'1px solid rgba(216,174,99,.22)'}}>{card.icon}</div>
                <h4 style={{fontSize:'15px',fontWeight:'800',color:'#151515',marginBottom:'6px'}}>{card.title}</h4>
                <p style={{fontSize:'12px',color:'#9A6C3C',lineHeight:1.6}}>{card.desc}</p>
                <div style={{position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',width:'40%',height:'2px',background:'linear-gradient(90deg,transparent,rgba(216,174,99,.4),transparent)',borderRadius:'0'}}/>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  </>);
}
