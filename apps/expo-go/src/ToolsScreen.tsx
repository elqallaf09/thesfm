import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, formatValue, Input, Label, Panel, useUI } from './ui';
import { calculateCompound, calculateLoan, calculateZakat } from './calculators';
export function ToolsScreen({ initialPath }: { initialPath?: string }) {
  const { t } = useUI(); const [tool, setTool] = useState(initialPath?.includes('loan') ? 'loan' : initialPath?.includes('compound') ? 'compound' : 'zakat');
  const [principal, setPrincipal] = useState(''); const [rate, setRate] = useState(''); const [years, setYears] = useState(''); const [monthly, setMonthly] = useState(''); const [nisab, setNisab] = useState('');
  const normalize = (value: string) => Number(value.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/٫/g, '.'));
  const p = normalize(principal), r = normalize(rate), y = normalize(years), m = normalize(monthly), n = normalize(nisab);
  const result = principal.trim() ? tool === 'zakat' ? nisab.trim() ? calculateZakat(p, n) : null : tool === 'loan' ? years.trim() && rate.trim() ? calculateLoan(p, r, y) : null : years.trim() && rate.trim() ? calculateCompound(p, r, y, m) : null : null;
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 24 }}><Label large>{t(['الحاسبات المالية', 'Financial calculators', 'Calculateurs financiers'])}</Label>
    <Button label={t(['الزكاة', 'Zakat', 'Zakat'])} selected={tool === 'zakat'} onPress={() => setTool('zakat')} /><Button label={t(['النمو المركب', 'Compound growth', 'Croissance composée'])} selected={tool === 'compound'} onPress={() => setTool('compound')} /><Button label={t(['القرض', 'Loan', 'Prêt'])} selected={tool === 'loan'} onPress={() => setTool('loan')} />
    <Panel><Input numeric label={t(tool === 'zakat' ? ['الأموال الزكوية بعد الالتزامات', 'Eligible assets after liabilities', 'Actifs éligibles après dettes'] : ['المبلغ الأساسي', 'Principal', 'Capital initial'])} value={principal} onChange={setPrincipal} />
      {tool === 'zakat' ? <><Input numeric label={t(['النصاب بعملة الأموال نفسها', 'Nisab in the same currency', 'Nisab dans la même devise'])} value={nisab} onChange={setNisab} /><Label muted>{t(['أدخل نصابًا موثقًا بتاريخ الحساب. النتيجة تفترض اكتمال الحول القمري وتستخدم نسبة 2.5%.', 'Enter a verified nisab for the calculation date. Assumes a full lunar year at 2.5%.', 'Saisissez un nisab vérifié à la date du calcul. Suppose une année lunaire complète à 2,5 %.'])}</Label></> : <><Input numeric label={t(['النسبة السنوية %', 'Annual rate %', 'Taux annuel %'])} value={rate} onChange={setRate} /><Input numeric label={t(['عدد السنوات', 'Years', 'Années'])} value={years} onChange={setYears} />{tool === 'compound' ? <Input numeric label={t(['الإضافة الشهرية', 'Monthly contribution', 'Versement mensuel'])} value={monthly} onChange={setMonthly} /> : null}</>}
      <Label large>{t(['النتيجة', 'Result', 'Résultat'])}: {formatValue(result)}</Label><Label muted>{t(['النتيجة بعملة المدخلات. الحساب تقديري ولا يحفظ سجلًا تلقائيًا.', 'Result uses your input currency. This estimate does not automatically create a record.', 'Le résultat utilise la devise saisie. Cette estimation ne crée pas automatiquement d’enregistrement.'])}</Label>
    </Panel>
  </ScrollView>;
}
