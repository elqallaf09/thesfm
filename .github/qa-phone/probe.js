(async () => {
  const request = window.fetch.bind(window);
  const stamp = new Date().toISOString();
  const quotes = Array.from({length:12}, (_,i) => ({
    symbol:'QA'+i,name:'Company '+i,nameAr:'شركة '+i,currency:'USD',exchange:'US',price:0.21+i/100,
    source:'Simulator fixture',changePercent:2,status:'available',observedAt:stamp,receivedAt:stamp
  }));
  const stories = Array.from({length:27},(_,i)=>({id:String(i),ticker:'QA'+i,price:0.25,priceVerified:true,
    title:'خبر الشركة '+i,url:'https://example.com/story/'+i,source:'QA source',publishedAt:stamp}));
  sessionStorage.setItem('sfm-tv-welcome-shown','1');
  localStorage.setItem('sfm-markets-tv-settings-v1',JSON.stringify({language:'ar',marketIds:['US'],displayMode:'strips',autoRotate:false}));
  window.fetch=async (input,init)=>{
    const u=new URL(typeof input==='string'?input:input.url||input,location.href);
    const reply=value=>Response.json(value);
    if(u.pathname==='/api/tv/catalog') return reply({markets:[{id:'US',group:'us',labelAr:'الأسواق الأمريكية',labelEn:'US stocks',labelFr:'Actions',count:24,status:'directory'}]});
    if(u.pathname==='/api/tv/snapshot') return reply({group:'us',market:'US',quotes,summary:quotes,total:12,available:12,directoryTotal:24,generatedAt:stamp});
    if(u.pathname==='/api/market/special-news'&&u.searchParams.get('topic')==='stocks-under-1') return reply({success:true,topic:'stocks-under-1',items:stories,tickerItems:[{...quotes[0],available:true,asOf:stamp}]});
    if(u.pathname.startsWith('/api/')) return reply({});
    return request(input,init);
  };
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const until=async(fn,label)=>{for(let i=0;i<200;i++){const v=fn();if(v)return v;await wait(100);}throw Error(label);};
  const el=s=>document.querySelector(s);
  const click=async key=>(await until(()=>el('[data-tv-focus-key="'+key+'"]'),key)).click();
  try{
    await until(()=>window.ReactNativeWebView && window.__sfmTvIosLaunch && window.__sfmPhonePresentation,'SFM native bridge');
    await until(()=>el('[data-tv-root]') && !el('.sfm-startup'), 'receiver ready');
    if(!el('[data-tv-focus-key="menu:strips"]')) await click('menu-toggle');
    await click('menu:strips');
    const market=await until(()=>el('.tv-market-strip-track[data-marquee=true]'),'market track');
    const position=e=>e.getBoundingClientRect().x;
    const before=position(market);await wait(1200);const marketDistance=Math.abs(position(market)-before);
    if(marketDistance<24)throw Error('Market travel '+marketDistance);
    await click('menu-toggle');await click('menu:underDollarNews');
    const wire=await until(()=>el('.tv-under-dollar-headlines .tv-headline-loop'),'headline track');
    const first=position(wire);await wait(1200);const headlineDistance=position(wire)-first;
    if(headlineDistance<20)throw Error('Arabic headline travel '+headlineDistance);
    if(wire.querySelectorAll('a').length!==27||!wire.textContent.includes('QA26'))throw Error('Incomplete feed');
    if(!el('.tv-quote-marquee'))throw Error('Missing separate price ticker');
    await request('/__result',{method:'POST',body:JSON.stringify({ok:true,marketDistance,headlineDistance,headlines:27,nativeBridge:true})});
  }catch(e){await request('/__result',{method:'POST',body:JSON.stringify({ok:false,error:String(e),view:el('[data-tv-root]')?.dataset.tvView})});}
})();
