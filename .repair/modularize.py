from pathlib import Path
root=Path('.')
pub=root/'src/trader-app/public'
p=pub/'app.js'; s=p.read_text()
start=s.index('  function drawerResourceKey(');end=s.index('  function drawerTabs(',start)
block=s[start:end];s=s[:start]+s[end:]
helpers=[]
for name in ['drawerLoadedContext','drawerNewsForSymbol','drawerCalendarRows']:
 a=s.index('  function '+name+'(');b=s.index('\n  function ',a+1)
 helpers.append(s[a:b]);s=s[:a]+s[b:]
deps='''state, drawerData, sym, currentLanguage, textPair, h, payloadFeatureState,
    marketForSymbol, currentMarket, marketApi, marketNewsPath, get, findAssetForSymbol,
    legacyRecsFrom, normalizeQuote, norm, symbolAliases, signalToRec, technicalPayloadFromResponse,
    isTechnicalUnavailablePayload, technicalUnavailableReason, arr, mergeRecLists, recs,
    marketUniverseRows, matchRec'''
exports='''drawerResourceKey, drawerResources, drawerTabLoading, drawerLoadStatus,
    loadDrawerData, drawerLoadedContext, drawerNewsForSymbol, drawerCalendarRows'''
setup=f'''  const {{ {exports} }} = window.SFMTraderDrawerData.createController({{
    {deps}
  }});

'''
s=s.replace('  function drawerTabs() {',setup+'  function drawerTabs() {',1)
p.write_text(s)
p=pub/'assets/drawer-data.js';s=p.read_text()
factory='''  // Dependency-injected symbol resources keep UI rendering separate from provider/cache logic.
  function createController({ '''+deps+''' }) {
'''+block+'\n'.join(helpers)+'''\n    return Object.freeze({ '''+exports+''' });
  }
'''
s=s.replace('  window.SFMTraderDrawerData = Object.freeze({ createStore });',factory+'  window.SFMTraderDrawerData = Object.freeze({ createStore, createController });');p.write_text(s)
p=pub/'assets/drawer-mobile.css';s=p.read_text().replace('font-size: 11px','font-size: 12px').replace('border-radius: 6px','border-radius: var(--radius-control)');p.write_text(s)
p=root/'src/__tests__/unit/traderDrawerData.test.ts';s=p.read_text()
s=s.replace("expect(app).toContain('symbols=${encoded}&range=90'); expect(app).toContain('data-drawer-retry');", "const resources = readFileSync('src/trader-app/public/assets/drawer-data.js', 'utf8');\n    expect(resources).toContain('symbols=${encoded}&range=90'); expect(app).toContain('data-drawer-retry');")
s=s.replace("expect(app).toContain('newsForSymbol = symbol');", "expect(resources).toContain('newsForSymbol = symbol');")
p.write_text(s)
