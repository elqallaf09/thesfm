import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { boundedSymbols, intelligenceAssetType, intelligenceAssetTypes, type IntelligenceAssetType } from './investorAnalysis';
import { MobileRequestError, type MobileSessionClient } from './session';
import { Button, Busy, ErrorNotice, formatValue, Input, Label, Panel, useUI } from './ui';

type SearchItem = { symbol?: string; displaySymbol?: string; name?: string; assetType?: string; exchange?: string; market?: string; currency?: string };
type Analysis = {
  analysisId?: string; recommendation?: string; confidence?: number; confidenceQuality?: string; risk?: string;
  asset?: { displaySymbol?: string; name?: string; quoteCurrency?: string | null };
  marketPrice?: { available?: boolean; value?: number | null; currency?: string | null };
  targets?: { available?: boolean; lower?: number | null; upper?: number | null; currency?: string | null };
  dataCompleteness?: { percentage?: number; missingRequiredFactors?: string[] };
  warnings?: Array<{ severity?: string; code?: string }>;
};
type ChatMessage = { role: 'user' | 'assistant'; content: string };

/**
 * This is deliberately native and session-bound: the analysis and chat APIs
 * retain their server-side entitlement, allowance, evidence and rate checks.
 */
export function InvestorAnalysisScreen({ client }: { client: MobileSessionClient }) {
  const { language, t } = useUI();
  const tr = (ar: string, en: string, fr: string) => t([ar, en, fr]);
  const [query, setQuery] = useState(''); const [matches, setMatches] = useState<SearchItem[]>([]); const [symbol, setSymbol] = useState('');
  const [assetType, setAssetType] = useState<IntelligenceAssetType>('STOCK'); const [exchange, setExchange] = useState(''); const [currency, setCurrency] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null); const [chat, setChat] = useState<ChatMessage[]>([]); const [message, setMessage] = useState('');
  const [compare, setCompare] = useState(''); const [comparison, setComparison] = useState<Record<string, unknown> | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const selectedSymbol = symbol.trim().toUpperCase();
  const asset = () => ({ symbol: selectedSymbol, assetType, ...(exchange.trim() ? { exchange: exchange.trim() } : {}), ...(currency.trim() ? { quoteCurrency: currency.trim().toUpperCase() } : {}) });

  const search = useCallback(async () => {
    const term = query.trim(); if (!term) { setMatches([]); return; }
    setBusy(true); setError('');
    try { const data = await client.request<{ results?: SearchItem[] }>(`/api/market/search?query=${encodeURIComponent(term)}`, {}, 20_000); setMatches((data.results ?? []).slice(0, 12)); }
    catch (reason) { setError(reason instanceof MobileRequestError ? reason.code : 'DATA_UNAVAILABLE'); }
    finally { setBusy(false); }
  }, [client, query]);
  function choose(item: SearchItem) {
    const next = (item.displaySymbol || item.symbol || '').trim().toUpperCase(); if (!next) return;
    setSymbol(next); setAssetType(intelligenceAssetType(item.assetType)); setExchange(item.exchange || item.market || ''); setCurrency(item.currency || ''); setMatches([]); setAnalysis(null); setComparison(null);
  }
  async function runAnalysis(refresh = false) {
    if (!selectedSymbol) { setError('INVALID_SYMBOL'); return; }
    setBusy(true); setError('');
    try {
      const data = await client.request<{ result?: Analysis }>('/api/intelligence/analyze', { method: 'POST', body: JSON.stringify({ asset: asset(), horizon: 'SWING', locale: language, requestedModules: ['TECHNICAL', 'FUNDAMENTAL', 'SENTIMENT', 'NEWS', 'RISK', 'SHARIA'], source: 'SMART_MARKET_ANALYSIS', forceRefresh: refresh }) });
      if (!data.result) throw new MobileRequestError('ANALYSIS_UNAVAILABLE'); setAnalysis(data.result);
    } catch (reason) { setError(reason instanceof MobileRequestError ? reason.code : 'ANALYSIS_UNAVAILABLE'); }
    finally { setBusy(false); }
  }
  async function sendChat() {
    const content = message.trim(); if (!content || !selectedSymbol) { setError('INVALID_REQUEST'); return; }
    const next = [...chat, { role: 'user' as const, content }].slice(-20); setChat(next); setMessage(''); setBusy(true); setError('');
    try {
      const reply = await client.request<{ ok?: boolean; text?: string }>('/api/intelligence/chat', { method: 'POST', body: JSON.stringify({ domain: 'market', messages: next, asset: { symbol: selectedSymbol, assetType }, locale: language, sourceRoute: '/ai-analyst/assistant', analysisId: analysis?.analysisId ?? null }) });
      if (!reply.ok || !reply.text) throw new MobileRequestError('CHAT_UNAVAILABLE'); setChat(previous => [...previous, { role: 'assistant', content: reply.text! }].slice(-20));
    } catch (reason) { setError(reason instanceof MobileRequestError ? reason.code : 'CHAT_UNAVAILABLE'); }
    finally { setBusy(false); }
  }
  async function compareAssets() {
    const symbols = boundedSymbols(compare); if (symbols.length < 2) { setError('INVALID_COMPARISON'); return; }
    setBusy(true); setError('');
    try { setComparison(await client.request<Record<string, unknown>>(`/api/market/compare?symbols=${encodeURIComponent(symbols.join(','))}&assetType=${encodeURIComponent(assetType.toLowerCase())}`, {}, 20_000)); }
    catch (reason) { setError(reason instanceof MobileRequestError ? reason.code : 'COMPARE_UNAVAILABLE'); }
    finally { setBusy(false); }
  }
  const price = analysis?.marketPrice;
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 28 }}>
    <Panel><Label large>{tr('محلل المستثمر', 'Investor analyst', 'Analyste investisseur')}</Label><Label muted>{tr('تحليل ومحادثة من بيانات سوق موثقة؛ الاستحقاق والحدود تبقى في الخادم.', 'Analysis and chat use verified market data; entitlements and limits stay on the server.', "L'analyse et la discussion utilisent des données vérifiées ; les droits restent côté serveur.")}</Label></Panel>
    <Panel><Input label={tr('البحث بالاسم أو الرمز', 'Search name or symbol', 'Rechercher un nom ou symbole')} value={query} onChange={setQuery} /><Button label={tr('بحث', 'Search', 'Rechercher')} disabled={busy || !query.trim()} onPress={() => { void search(); }} />{matches.map((item, index) => <Button key={`${item.symbol}:${index}`} label={`${item.displaySymbol || item.symbol || '-'} — ${item.name || ''}`} disabled={busy} onPress={() => choose(item)} />)}</Panel>
    <Panel><Input label={tr('الرمز', 'Symbol', 'Symbole')} value={symbol} onChange={value => { setSymbol(value); setAnalysis(null); }} /><Label>{tr('فئة الأصل', 'Asset type', "Type d'actif")}</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{intelligenceAssetTypes.map(type => <Button key={type} label={type} selected={assetType === type} disabled={busy} onPress={() => setAssetType(type)} />)}</View><Input label={tr('البورصة (اختياري)', 'Exchange (optional)', 'Bourse (facultatif)')} value={exchange} onChange={setExchange} /><Input label={tr('عملة التسعير (اختياري)', 'Quote currency (optional)', 'Devise de cotation (facultatif)')} value={currency} onChange={setCurrency} /><Button label={tr('تحليل كامل', 'Run full analysis', "Lancer l'analyse complète")} disabled={busy || !selectedSymbol} onPress={() => { void runAnalysis(); }} /></Panel>
    {error ? <ErrorNotice code={error} retry={() => { if (selectedSymbol) void runAnalysis(); else void search(); }} /> : null}{busy ? <Busy /> : null}
    {analysis ? <AnalysisResult analysis={analysis} symbol={selectedSymbol} onRefresh={() => { void runAnalysis(true); }} busy={busy} tr={tr} /> : null}
    <Panel><Label large>{tr('مقارنة الأصول', 'Compare assets', 'Comparer des actifs')}</Label><Label muted>{tr('أدخل رمزين إلى أربعة رموز مفصولة بفاصلة.', 'Enter two to four comma-separated symbols.', 'Saisissez deux à quatre symboles séparés par des virgules.')}</Label><Input label={tr('الرموز', 'Symbols', 'Symboles')} value={compare} onChange={setCompare} /><Button label={tr('مقارنة', 'Compare', 'Comparer')} disabled={busy} onPress={() => { void compareAssets(); }} />{comparison ? <Comparison data={comparison} /> : null}</Panel>
    <Panel><Label large>{tr('محادثة التحليل', 'Analysis chat', "Discussion d'analyse")}</Label><Label muted>{tr('لا تُرسل إلا الرسالة والرمز المختاران؛ يتحقق الخادم من الهوية والبيانات.', 'Only the message and selected symbol are sent; the server verifies identity and data.', "Seuls le message et l'actif sont envoyés ; le serveur vérifie l'identité et les données.")}</Label>{chat.map((item, index) => <View key={`${item.role}:${index}`} style={{ gap: 3 }}><Label muted>{item.role === 'user' ? tr('أنت', 'You', 'Vous') : tr('المحلل', 'Analyst', 'Analyste')}</Label><Label>{item.content}</Label></View>)}<Input label={tr('سؤالك', 'Your question', 'Votre question')} value={message} onChange={setMessage} /><Button label={tr('إرسال', 'Send', 'Envoyer')} disabled={busy || !selectedSymbol || !message.trim()} onPress={() => { void sendChat(); }} /></Panel>
  </ScrollView>;
}
function AnalysisResult({ analysis, symbol, onRefresh, busy, tr }: { analysis: Analysis; symbol: string; onRefresh: () => void; busy: boolean; tr: (ar: string, en: string, fr: string) => string }) {
  const price = analysis.marketPrice;
  return <Panel><Label large>{tr('نتيجة التحليل', 'Analysis result', "Résultat de l'analyse")}</Label><Label>{analysis.asset?.displaySymbol || symbol}{analysis.asset?.name ? ` — ${analysis.asset.name}` : ''}</Label><Label>{tr('التوصية: ', 'Recommendation: ', 'Recommandation : ')}{analysis.recommendation || '-'}</Label><Label>{tr('المخاطر: ', 'Risk: ', 'Risque : ')}{analysis.risk || '-'}</Label><Label>{tr('الثقة: ', 'Confidence: ', 'Confiance : ')}{analysis.confidence == null ? '-' : `${Math.round(analysis.confidence * (analysis.confidence <= 1 ? 100 : 1))}%`} {analysis.confidenceQuality || ''}</Label>{price?.available ? <Label>{tr('السعر الموثق: ', 'Verified price: ', 'Cours vérifié : ')}{formatValue(price.value)} {price.currency || analysis.asset?.quoteCurrency || ''}</Label> : <Label muted>{tr('السعر الموثق غير متاح حاليًا.', 'A verified current price is unavailable.', 'Un cours actuel vérifié est indisponible.')}</Label>}{analysis.targets?.available ? <Label>{tr('النطاق المستنتج: ', 'Derived range: ', 'Fourchette dérivée : ')}{formatValue(analysis.targets.lower)} – {formatValue(analysis.targets.upper)} {analysis.targets.currency || ''}</Label> : null}<Label>{tr('اكتمال البيانات: ', 'Data completeness: ', 'Complétude des données : ')}{analysis.dataCompleteness?.percentage == null ? '-' : `${Math.round(analysis.dataCompleteness.percentage)}%`}</Label>{analysis.dataCompleteness?.missingRequiredFactors?.length ? <Label muted>{tr('العوامل الناقصة: ', 'Missing factors: ', 'Facteurs manquants : ')}{analysis.dataCompleteness.missingRequiredFactors.join(', ')}</Label> : null}{analysis.warnings?.map((warning, index) => <Label muted key={`${warning.code}:${index}`}>{warning.severity || 'INFO'}: {warning.code || '-'}</Label>)}<Button label={tr('تحديث آمن', 'Refresh safely', 'Actualiser prudemment')} disabled={busy} onPress={onRefresh} /></Panel>;
}
function Comparison({ data }: { data: Record<string, unknown> }) {
  const { t } = useUI(); const rows = Object.entries(data).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)).slice(0, 12);
  return <View style={{ gap: 5 }}><Label muted>{t(['استجابة المقارنة من مزود البيانات الحالي.', 'Comparison response from the current data provider.', 'Réponse de comparaison du fournisseur actuel.'])}</Label>{rows.length ? rows.map(([key, value]) => <Label key={key}>{key}: {formatValue(value)}</Label>) : <Label muted>{t(['لم يُرجع المزود حقولًا قابلة للعرض.', 'The provider returned no displayable fields.', "Le fournisseur n'a renvoyé aucun champ affichable.")}</Label>}</View>;
}
