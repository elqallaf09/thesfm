import os, sys
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')
url=os.environ.get('TRADER_AUDIT_URL','http://127.0.0.1:4308/index.html?route=markets%2Fforex')
with sync_playwright() as p:
  b=p.chromium.launch(headless=True)
  page=b.new_page(viewport={'width':1024,'height':768}, device_scale_factor=1)
  page.goto(url, wait_until='domcontentloaded', timeout=60000)
  page.wait_for_selector('.markets-grid')
  page.wait_for_timeout(1500)
  data=page.evaluate('''() => {
    const chain=[];
    let el=document.querySelector('.markets-grid');
    while(el){
      const r=el.getBoundingClientRect(); const cs=getComputedStyle(el);
      chain.push({tag:el.tagName.toLowerCase(), cls:String(el.className), x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height), display:cs.display, gridCols:cs.gridTemplateColumns, padding:cs.padding, margin:cs.margin, overflow:cs.overflow, direction:cs.direction, justifySelf:cs.justifySelf, alignSelf:cs.alignSelf});
      el=el.parentElement;
      if(chain.length>12) break;
    }
    const all=['.terminal-shell','.terminal-main','.terminal-page','.markets-hub-page','.markets-selector-card','.markets-grid','.market-opportunity-layout','.markets-quality-strip'].map(sel=>{const e=document.querySelector(sel); if(!e)return null; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return {sel,x:Math.round(r.x),w:Math.round(r.width),display:cs.display,gridCols:cs.gridTemplateColumns,padding:cs.padding,margin:cs.margin,direction:cs.direction};});
    return {chain, all, doc:document.documentElement.scrollWidth, vw:innerWidth};
  }''')
  import json; print(json.dumps(data, ensure_ascii=False, indent=2))
  b.close()
