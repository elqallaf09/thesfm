import { Alert, ScrollView, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { MobileRequestError, type MobileSessionClient } from './session';
import { Button, Busy, ErrorNotice, Input, Label, Panel, formatValue, useUI } from './ui';

type DecisionType = 'purchase' | 'investment' | 'project' | 'debt_saving' | 'charity_zakat' | 'budget';
type Analysis = { score?: number | null; status?: string; netAfterDecision?: number | null; savingsAfterDecision?: number | null; missingData?: string[]; riskFlags?: string[] };
type Decision = { id: string; decision_title?: string; estimated_cost?: number; currency?: string; status?: string; created_at?: string; analysis?: Analysis | null };
type DecisionPage = { decisions: Decision[]; canWrite: boolean; canDelete: boolean };
type Form = { title: string; decisionType: DecisionType; estimatedCost: string; monthlyImpact: string; expectedBenefit: string; riskLevel: 'low' | 'medium' | 'high'; targetDate: string; notes: string };
const blank: Form = { title: '', decisionType: 'purchase', estimatedCost: '', monthlyImpact: '', expectedBenefit: '', riskLevel: 'medium', targetDate: '', notes: '' };
const TYPES: Array<{ key: DecisionType; label: [string, string, string] }> = [
  { key: 'purchase', label: ['شراء', 'Purchase', 'Achat'] }, { key: 'investment', label: ['استثمار', 'Investment', 'Investissement'] },
  { key: 'project', label: ['مشروع', 'Project', 'Projet'] }, { key: 'debt_saving', label: ['قرض / دين', 'Loan / debt', 'Prêt / dette'] },
  { key: 'charity_zakat', label: ['زكاة / صدقة', 'Zakat / charity', 'Zakat / charité'] }, { key: 'budget', label: ['ميزانية', 'Budget', 'Budget'] },
];
function number(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : NaN; }
function analysisFor(value: unknown): Analysis | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as Analysis : null; }

/** Native Business decision editor. Source account rows stay server-side and MFA/RLS-gated. */
export function MobileDecisionsScreen({ client }: { client: MobileSessionClient }) {
  const { t, language } = useUI(); const [page, setPage] = useState<DecisionPage | null>(null); const [form, setForm] = useState<Form>(blank);
  const [currency, setCurrency] = useState('KWD'); const [selected, setSelected] = useState<Decision | null>(null); const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const tr = (ar: string, en: string, fr: string) => t([ar, en, fr]);
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [data, account] = await Promise.all([
        client.request<DecisionPage>('/api/mobile/business/decisions'),
        client.request<{ profile: { preferred_currency?: string | null; default_currency?: string | null } | null }>('/api/mobile/account'),
      ]);
      setPage(data); setCurrency(account.profile?.preferred_currency || account.profile?.default_currency || 'KWD');
      const first = data.decisions[0] ?? null; setSelected(first); setAnalysis(analysisFor(first?.analysis));
    } catch (reason) { setError(reason instanceof MobileRequestError ? reason.code : 'LOAD_UNAVAILABLE'); } finally { setBusy(false); }
  }, [client]);
  useEffect(() => { void load(); }, [load]);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(previous => ({ ...previous, [key]: value }));
  async function save() {
    if (busy || !page?.canWrite || !form.title.trim() || !(number(form.estimatedCost) > 0) || !(number(form.monthlyImpact || '0') >= 0)) { setError('INVALID_DECISION'); return; }
    setBusy(true); setError('');
    try {
      const result = await client.request<{ decision: Decision; analysis: Analysis }>('/api/mobile/business/decisions', { method: 'POST', body: JSON.stringify({ ...form, title: form.title.trim(), estimatedCost: number(form.estimatedCost), monthlyImpact: number(form.monthlyImpact || '0'), currency, locale: language }) });
      setPage(previous => previous ? { ...previous, decisions: [result.decision, ...previous.decisions.filter(item => item.id !== result.decision.id)] } : previous);
      setSelected(result.decision); setAnalysis(result.analysis); setForm(blank);
    } catch (reason) { setError(reason instanceof MobileRequestError ? reason.code : 'SAVE_UNAVAILABLE'); } finally { setBusy(false); }
  }
  function remove(decision: Decision) {
    Alert.alert(tr('حذف القرار؟', 'Delete decision?', 'Supprimer la décision ?'), tr('سيحذف من حسابك ولا يمكن التراجع عن ذلك.', 'It will be removed from your account and cannot be undone.', 'Elle sera supprimée de votre compte et ne pourra pas être restaurée.'), [
      { text: tr('إلغاء', 'Cancel', 'Annuler'), style: 'cancel' },
      { text: tr('حذف', 'Delete', 'Supprimer'), style: 'destructive', onPress: () => { void (async () => { setBusy(true); setError(''); try { await client.request('/api/mobile/business/decisions', { method: 'DELETE', body: JSON.stringify({ id: decision.id }) }); setPage(previous => previous ? { ...previous, decisions: previous.decisions.filter(item => item.id !== decision.id) } : previous); setSelected(null); setAnalysis(null); } catch (reason) { setError(reason instanceof MobileRequestError ? reason.code : 'SAVE_UNAVAILABLE'); } finally { setBusy(false); } })(); } },
    ]);
  }
  const score = analysis?.score == null ? null : Math.max(0, Math.min(100, 100 - analysis.score));
  const recommendation = analysis?.status === 'initially_suitable' ? tr('مناسب مبدئيًا', 'Initially suitable', 'Adaptée initialement') : analysis?.status === 'high_risk' ? tr('مخاطر مرتفعة', 'High risk', 'Risque élevé') : analysis?.status === 'needs_review' ? tr('تحتاج مراجعة', 'Needs review', 'À examiner') : tr('بيانات غير كافية', 'Insufficient data', 'Données insuffisantes');
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 24 }}>
    <Panel><Label large>{tr('مركز القرارات', 'Decision center', 'Centre de décisions')}</Label><Label muted>{tr('يدخل القرار فقط من هاتفك؛ الحساب والتحليل يستخدمان بيانات حسابك الحية داخل الخادم المحمي.', 'Only the decision leaves your phone; account data is analyzed on the protected server.', 'Seule la décision quitte le téléphone ; les données du compte sont analysées sur le serveur protégé.')}</Label></Panel>
    {error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}{busy && !page ? <Busy /> : null}
    {page?.canWrite ? <Panel><Label large>{tr('حلل قرارًا', 'Analyze a decision', 'Analyser une décision')}</Label><Input label={tr('عنوان القرار', 'Decision title', 'Titre de la décision')} value={form.title} onChange={value => set('title', value)} />
      <Label>{tr('نوع القرار', 'Decision type', 'Type de décision')}</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{TYPES.map(item => <Button key={item.key} label={t(item.label)} selected={form.decisionType === item.key} disabled={busy} onPress={() => set('decisionType', item.key)} />)}</View>
      <Input label={tr('التكلفة المقدرة', 'Estimated cost', 'Coût estimé')} value={form.estimatedCost} onChange={value => set('estimatedCost', value)} numeric /><Input label={tr('الأثر الشهري', 'Monthly impact', 'Impact mensuel')} value={form.monthlyImpact} onChange={value => set('monthlyImpact', value)} numeric />
      <Input label={tr('الفائدة المتوقعة %', 'Expected benefit %', 'Bénéfice attendu %')} value={form.expectedBenefit} onChange={value => set('expectedBenefit', value)} numeric /><Input label={tr('التاريخ المستهدف YYYY-MM-DD', 'Target date YYYY-MM-DD', 'Date cible AAAA-MM-JJ')} value={form.targetDate} onChange={value => set('targetDate', value)} />
      <Label>{tr('مستوى المخاطر', 'Risk level', 'Niveau de risque')}</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{(['low', 'medium', 'high'] as const).map(level => <Button key={level} label={level === 'low' ? tr('منخفض', 'Low', 'Faible') : level === 'high' ? tr('مرتفع', 'High', 'Élevé') : tr('متوسط', 'Medium', 'Moyen')} selected={form.riskLevel === level} disabled={busy} onPress={() => set('riskLevel', level)} />)}</View>
      <Input label={tr('ملاحظات', 'Notes', 'Notes')} value={form.notes} onChange={value => set('notes', value)} /><Label muted>{tr('عملة الحساب: ', 'Account currency: ', 'Devise du compte : ')}{currency}</Label><Button label={tr('حلل واحفظ', 'Analyze and save', 'Analyser et enregistrer')} disabled={busy} onPress={() => { void save(); }} /></Panel> : page ? <Panel><Label>{tr('لا تملك صلاحية تحرير قرارات الأعمال.', 'You do not have permission to edit business decisions.', 'Vous n’avez pas le droit de modifier les décisions professionnelles.')}</Label></Panel> : null}
    <Panel><Label large>{tr('نتيجة التحليل', 'Analysis result', "Résultat de l'analyse")}</Label>{analysis ? <View style={{ gap: 7 }}><Label>{tr('المخاطر: ', 'Risk: ', 'Risque : ')}{score == null ? '-' : `${score}%`}</Label><Label>{tr('الحالة: ', 'Status: ', 'Statut : ')}{recommendation}</Label><Label>{tr('الصافي بعد القرار: ', 'Net after decision: ', 'Solde après décision : ')}{analysis.netAfterDecision == null ? '-' : `${formatValue(analysis.netAfterDecision)} ${currency}`}</Label><Label>{tr('المدخرات بعد القرار: ', 'Savings after decision: ', 'Épargne après décision : ')}{analysis.savingsAfterDecision == null ? '-' : `${formatValue(analysis.savingsAfterDecision)} ${currency}`}</Label>{analysis.missingData?.length ? <Label muted>{tr('بيانات ناقصة: ', 'Missing data: ', 'Données manquantes : ')}{analysis.missingData.join(', ')}</Label> : null}{analysis.riskFlags?.length ? <Label muted>{tr('تنبيهات: ', 'Warnings: ', 'Alertes : ')}{analysis.riskFlags.join(', ')}</Label> : null}</View> : <Label muted>{tr('أدخل قرارًا لتحليل أثره من بيانات حسابك.', 'Enter a decision to analyze its impact using your account data.', 'Saisissez une décision pour analyser son impact avec les données de votre compte.')}</Label>}</Panel>
    <Panel><Label large>{tr('القرارات السابقة', 'Previous decisions', 'Décisions précédentes')}</Label>{page?.decisions.length ? page.decisions.map(item => <Panel key={item.id}><Button label={`${item.decision_title || '-'} · ${formatValue(item.estimated_cost)} ${item.currency || currency}`} selected={selected?.id === item.id} disabled={busy} onPress={() => { setSelected(item); setAnalysis(analysisFor(item.analysis)); }} /><Label muted>{item.status || '-'}{item.created_at ? ` · ${item.created_at.slice(0, 10)}` : ''}</Label>{page.canDelete ? <Button danger label={tr('حذف', 'Delete', 'Supprimer')} disabled={busy} onPress={() => remove(item)} /> : null}</Panel>) : <Label muted>{tr('لا توجد قرارات محفوظة بعد.', 'No saved decisions yet.', 'Aucune décision enregistrée.')}</Label>}</Panel>
    <Button label={tr('تحديث', 'Refresh', 'Actualiser')} disabled={busy} onPress={() => { void load(); }} />
  </ScrollView>;
}
