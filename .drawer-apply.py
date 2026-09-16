from pathlib import Path
import subprocess, hashlib
r=Path('.')
checks={'src/trader-app/public/app.js': {'before': '9b8305384aa2f5a95239d7197c229c3dd3d14ffd160f67e0c4c9fa0736a1b13a', 'after': 'b1a0ad68ec8a479d910a59723f8e31a987b579a19fc45d4152396ded0cfac1d7'}, 'src/trader-app/public/cinema.css': {'before': '9d953ace2639629d9d773bc5bb2b9b129b8ad6151cdb36edb3a037c172796832', 'after': '3c589c6879e3abd42b8ea38c399a2780114db00c35222f45b507893495f9222b'}, 'src/trader-app/public/index.html': {'before': 'e0e936219f0f33273632b45e291f193cbac46f5e365bb3b92fe429b718769dfd', 'after': '2da464e052cddd67abcd565ee66be289a1315e20cfeabe2ad4f14fbbc4b8e513'}, 'src/trader-app/public/detail.html': {'before': '556c7584c09a54919acb2f5c24bf29795046852409a6a8fda5657e22b033cf12', 'after': 'c655465d172003902cffee28a35fedf76c590f94985674669eb7421efcd712e1'}, 'src/trader-app/public/service-worker.js': {'before': '9ac9b08dcd6779d5b6fadc9aac806c9dc1894d9832b15c8a918e2ba75dbe2bb6', 'after': '9930d3d468dd4de71af3f673500433abf7681f594ad54bc31a1ae3ea0defbbce'}}
for name, check in checks.items():
 assert hashlib.sha256((r/name).read_bytes()).hexdigest()==check['before'],name

def apply(name,old,new):
 p=r/name;s=p.read_text();assert s.count(old)==1,(name,s.count(old),old[:100]);p.write_text(s.replace(old,new))
app='src/trader-app/public/app.js'
apply(app,'  const Recommendation = window.SFMRecommendation;','  const Recommendation = window.SFMRecommendation;\n  const DrawerFocus = window.SFMTraderDrawerFocus;')
old='''    if (options.restoreFocus !== false) {
      window.requestAnimationFrame(() => {
        if (restore && typeof restore.focus === "function" && document.contains(restore)) {
          restore.focus();
          return;
        }
        const fallback = Array.from(document.querySelectorAll("[data-symbol-details]")).find(node => sym(node.dataset.symbolDetails) === closingSymbol);
        fallback?.focus();
      });
    }'''
apply(app,old,'''    if (options.restoreFocus !== false) DrawerFocus.restoreTrigger(restore, closingSymbol);''')
apply(app,'''    host.hidden = false;
    host.innerHTML = symbolQuickDrawerHtml(drawerLoadedContext(state.drawer.symbol));''','''    const snapshot = DrawerFocus.capture(host);
    host.hidden = false;
    host.innerHTML = symbolQuickDrawerHtml(drawerLoadedContext(state.drawer.symbol));''')
apply(app,'''    if (drawerFocusPending) {
      drawerFocusPending = false;
      window.requestAnimationFrame(() => {
        const target = host.querySelector(`[data-drawer-tab="${state.drawer.tab}"]`) || host.querySelector("[data-drawer-close]");
        target?.focus();
      });
    }''','''    DrawerFocus.restore(host, snapshot, drawerFocusPending);
    drawerFocusPending = false;''')
for name in ['toggleDrawerWatch','toggleDrawerCompare']:
 apply(app,f'''  function {name}(raw) {{
    const symbol = sym(raw);
    if (!symbol) return;
    drawerFocusPending = true;''',f'''  function {name}(raw) {{
    const symbol = sym(raw);
    if (!symbol) return;
    drawerFocusPending = false;''')
apply(app,'if (drawerAlert) { event.preventDefault(); drawerFocusPending = true; createAlert(drawerAlert.dataset.drawerAlert); return; }','if (drawerAlert) { event.preventDefault(); drawerFocusPending = false; createAlert(drawerAlert.dataset.drawerAlert); return; }')
apply(app,'''    const drawer = document.querySelector("[data-symbol-drawer]");
    if (!drawer) return false;''','''    const drawer = document.querySelector("[data-symbol-drawer]");
    if (!drawer || !DrawerFocus.ownsKey(event, drawer)) return false;''')
apply(app,'''    const focusable = Array.from(drawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(node => !node.hidden && node.getAttribute("aria-hidden") !== "true");''','''    const focusable = DrawerFocus.tabStops(drawer);''')
css='src/trader-app/public/cinema.css'
apply(css,'''.drawer-close,
[data-drawer-close] {
  width: 42px;
  height: 42px;''','''.drawer-close,
[data-drawer-close]:not(.symbol-drawer-backdrop) {
  width: 44px;
  height: 44px;''')
apply(css,'''[data-drawer-close]:hover,
[data-drawer-close]:focus-visible {''','''[data-drawer-close]:not(.symbol-drawer-backdrop):hover,
[data-drawer-close]:not(.symbol-drawer-backdrop):focus-visible {''')
base='src/trader-app/public/'
version='20260916-drawer-focus'
for name in ['index.html','detail.html','service-worker.js']:
 p=r/(base+name);s=p.read_text();s=s.replace('20260717-shell-unify-contrast-20260914',version)
 if name=='index.html':
  assert s.count('<script src="/app.js?v=20260717-shell-unify" defer></script>')==1
  s=s.replace('<script src="/app.js?v=20260717-shell-unify" defer></script>',f'<script src="/assets/drawer-focus.js?v={version}" defer></script>\n    <script src="/app.js?v={version}" defer></script>')
 if name=='service-worker.js':
  s=s.replace('"/app.js?v=20260717-shell-unify",',f'"/assets/drawer-focus.js?v={version}",\n  "/app.js?v={version}",')
 p.write_text(s)
for name, check in checks.items():
 assert hashlib.sha256((r/name).read_bytes()).hexdigest()==check['after'],name
subprocess.run(['git','diff','--check'],check=True)
subprocess.run(['git','add','--',*checks],check=True)
assert set(subprocess.check_output(['git','diff','--cached','--name-only'],text=True).splitlines())==set(checks)
subprocess.run(['git','commit','-m','fix(trader): restore drawer focus and full viewport dismissal'],check=True)
subprocess.run(['git','push','origin','HEAD:refs/heads/fix/trader-accessibility-followup'],check=True)
