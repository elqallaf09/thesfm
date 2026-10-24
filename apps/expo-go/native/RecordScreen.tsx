import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Share, Switch, Text, useWindowDimensions, View } from 'react-native';
import { resourceFor, type Field, type Resource, type Row } from './catalog';
import { deleteRecord, loadRecords, message, product, saveRecord } from './api';
import { formValues, recordPayload, totalsByCurrency } from './records';
import { Button, Busy, Card, Copy, ErrorNote, Input, Page, s, Title } from './ui';
import { dataChanged, onDetailBack, openScreen } from './navigation';

export function RecordScreen({ resource }: { resource: Resource }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [selection, setSelection] = useState<Row | null>(null);
  const [editing, setEditing] = useState(false);
  const [access, setAccess] = useState({ view: false, write: false, remove: false });
  const load = useCallback(async (offset = 0) => {
    setLoading(true); setError('');
    try { const result = await loadRecords(resource, offset); setRows(previous => offset ? [...previous, ...result.rows] : result.rows); setAccess(result.access); setHasMore(result.rows.length === 100); }
    catch (reason) { setError(message(reason)); }
    finally { setLoading(false); }
  }, [resource]);
  useEffect(() => { void load(); }, [load]);
  const back = useCallback(() => { if (editing) { setEditing(false); return true; } if (selection) { setSelection(null); return true; } return false; }, [editing, selection]);
  useEffect(() => onDetailBack(back), [back]);
  const filtered = rows.filter(row => (!filter || row.status === filter) && (!query.trim() || resource.fields.some(field => String(row[field.key] ?? '').toLowerCase().includes(query.trim().toLowerCase()))));
  const status = resource.fields.find(field => field.key === 'status');
  const heading = selection ? String(selection[resource.primary] || resource.title) : resource.title;
  const remove = () => Alert.alert('حذف السجل؟', 'سيُحذف هذا السجل من حسابك على جميع أجهزتك.', [{ text: 'إلغاء', style: 'cancel' }, { text: 'حذف', style: 'destructive', onPress: async () => {
    if (!selection?.id) return;
    setLoading(true); setError('');
    try { await deleteRecord(resource, selection.id); setSelection(null); dataChanged(); await load(); }
    catch (reason) { setError(message(reason)); } finally { setLoading(false); }
  } }]);
  if (editing) return <RecordForm resource={resource} original={selection || {}} onCancel={() => setEditing(false)} onSaved={row => { setSelection(row); setEditing(false); dataChanged(); void load(); }} />;
  return <Page><Title>{heading}</Title><ErrorNote text={error} />
    {loading ? <Busy /> : null}
    {selection ? <>
      <Button title="العودة إلى القائمة" secondary onPress={() => setSelection(null)} />
      <Card>{resource.fields.map(field => <View style={s.field} key={field.key}><Text style={s.label}>{field.label}</Text><Copy>{display(field, formValues(resource, selection)[field.key])}</Copy></View>)}</Card>
      {resource.path === '/market-watchlist' ? <Button title="تفاصيل الأداة" onPress={() => openScreen(`/symbol-details/${encodeURIComponent(String(selection.symbol))}`)} /> : null}
      {access.write && !resource.readOnly ? <Button title="تعديل السجل" onPress={() => setEditing(true)} disabled={loading} /> : null}
      {access.remove && !resource.readOnly ? <Button title="حذف السجل" danger onPress={remove} disabled={loading} /> : null}
      <Button title="مشاركة السجل" secondary onPress={() => { void Share.share({ message: [resource.title, ...resource.fields.map(field => `${field.label}: ${display(field, formValues(resource, selection)[field.key])}`)].join('\n') }); }} />
    </> : <>
      <View style={s.row}><Button title="تحديث" secondary onPress={() => { void load(); }} disabled={loading} />{access.write && !resource.readOnly ? <Button title="＋ إضافة سجل" onPress={() => { setSelection(null); setEditing(true); }} /> : null}</View>
      {resource.readOnly ? <Copy>مراكز حسابك المسجلة وقيمها المتاحة. السعر غير المتوفر يظهر بعلامة —.</Copy> : null}
      {resource.path === '/alerts' ? <Copy>إدارة شروط التنبيه المحفوظة في حسابك. إشعارات الدفع للهاتف غير مفعلة في هذه النسخة.</Copy> : null}
      <Input label="البحث في السجلات المحمّلة" value={query} onChange={setQuery} />
      {status?.options ? <View style={s.row}><Button title="الكل" secondary={filter !== ''} onPress={() => setFilter('')} />{status.options.map(([key, label]) => <Button key={key} title={label} secondary={filter !== key} onPress={() => setFilter(key)} />)}</View> : null}
      <Copy>{filtered.length} سجل{hasMore ? ' — يوجد المزيد' : ''}</Copy>
      {totalsByCurrency(filtered).map(([code, value]) => <Copy key={code}>{value.toLocaleString('en-US', { maximumFractionDigits: 3 })} {code}</Copy>)}
      {filtered.map(row => <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`تفاصيل ${String(row[resource.primary] || resource.title)}`} onPress={() => { setError(''); setSelection(row); }}><Card><Title>{String(row[resource.primary] || row.employee_name || resource.title)}</Title><Copy>{resource.fields.filter(field => field.key !== resource.primary).slice(0, 3).map(field => display(field, formValues(resource, row)[field.key])).filter(x => x !== '—').join(' · ')}</Copy></Card></Pressable>)}
      {!loading && !error && !filtered.length ? <Card><Copy>{query || filter ? 'لا توجد نتائج مطابقة.' : 'لا توجد سجلات بعد. أضف أول سجل للبدء.'}</Copy></Card> : null}
      {hasMore ? <Button title="تحميل المزيد" secondary onPress={() => { void load(rows.length); }} disabled={loading} /> : null}
      {error ? <Button title="إعادة المحاولة" onPress={() => { void load(); }} disabled={loading} /> : null}
    </>}
  </Page>;
}

function display(field: Field, value: string) {
  if (!value) return '—';
  if (field.kind === 'boolean') return value === 'true' ? 'نعم' : 'لا';
  return field.options?.find(([key]) => key === value)?.[1] || value;
}
function RecordForm({ resource, original, onCancel, onSaved }: { resource: Resource; original: Row; onCancel: () => void; onSaved: (row: Row) => void }) {
  const [form, setForm] = useState(() => formValues(resource, original));
  const [relations, setRelations] = useState<Record<string, Row[]>>({});
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const entries = await Promise.all(resource.fields.filter(field => field.relation).map(async field => {
          const related = resourceFor(field.relation!, product);
          return [field.key, related ? (await loadRecords(related)).rows : []] as const;
        }));
        if (!cancelled) setRelations(Object.fromEntries(entries));
      } catch (reason) { if (!cancelled) setError(message(reason)); }
    })();
    return () => { cancelled = true; };
  }, [resource]);
  async function save() {
    if (busy) return;
    setError('');
    try { recordPayload(resource, form, original); } catch (reason) { setError(message(reason)); return; }
    setBusy(true);
    try { onSaved(await saveRecord(resource, form, original)); }
    catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  }
  const set = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  return <Page><Title>{original.id ? 'تعديل' : 'إضافة'} — {resource.title}</Title><Copy>الحقول بعلامة * مطلوبة. الحفظ يحدّث حساب THE SFM نفسه.</Copy><ErrorNote text={error} />
    <View style={[s.row, { alignItems: 'flex-start' }]}>{resource.fields.map(field => <View key={field.key} style={{ width: width >= 700 ? '48%' : '100%', marginBottom: 10 }}>
      {field.kind === 'boolean' ? <View style={s.row}><Text style={s.label}>{field.label}</Text><Switch accessibilityLabel={field.label} value={form[field.key] === 'true'} onValueChange={value => set(field.key, String(value))} /></View> : field.options || field.relation ? <View style={{ gap: 8 }}><Text style={s.label}>{field.label}{field.required ? ' *' : ''}</Text><View style={s.row}>
        {field.relation ? <Button title="بدون ربط" secondary={Boolean(form[field.key])} onPress={() => set(field.key, '')} /> : null}
        {(field.options || (relations[field.key] || []).map(row => [String(row.id), String(row.name || row.goal || row.id)] as [string, string])).map(([key, label]) => <Button key={key} title={label} secondary={form[field.key] !== key} onPress={() => set(field.key, key)} />)}
      </View>{field.relation ? <Copy>تظهر أول 100 جهة متاحة للاختيار.</Copy> : null}</View> : <Input label={`${field.label}${field.required ? ' *' : ''}${field.kind === 'date' ? ' (YYYY-MM-DD)' : ''}`} value={form[field.key]} onChange={value => set(field.key, value)} numeric={field.kind === 'number'} email={field.kind === 'email'} multiline={['notes', 'description', 'stepsText'].includes(field.key)} />}
    </View>)}</View><Button title={busy ? 'جارٍ الحفظ…' : 'حفظ'} onPress={() => { void save(); }} disabled={busy} /><Button title="إلغاء" secondary onPress={onCancel} disabled={busy} />
  </Page>;
}
