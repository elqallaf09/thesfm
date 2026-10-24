import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Modal, SafeAreaView, ScrollView, Switch, View } from 'react-native';
import { localized, type MobileField, type MobilePage, type MobileRecord, type MobileResource, type PhoneProduct } from '../../../src/lib/mobile/resourceContract';
import { MobileRequestError, type MobileSessionClient } from './session';
import { Button, Busy, Empty, ErrorNotice, formatValue, Input, Label, Panel, useUI } from './ui';

export function RecordsScreen({ client, product, resource }: { client: MobileSessionClient; product: PhoneProduct; resource: MobileResource }) {
  const { t, language, colors } = useUI();
  const [records, setRecords] = useState<MobileRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<MobileRecord | 'new' | null>(null);
  const sequence = useRef(0);
  const path = `/api/mobile/${product}/records/${resource.id}`;
  const load = useCallback(async (after?: string) => {
    const requestId = ++sequence.current;
    setBusy(true); setError('');
    try {
      const page = await client.request<MobilePage>(`${path}?limit=50${after ? `&cursor=${encodeURIComponent(after)}` : ''}`);
      if (requestId !== sequence.current) return;
      setRecords(previous => after ? [...previous, ...page.records.filter(row => !previous.some(existing => existing.id === row.id))] : page.records);
      setCursor(page.nextCursor);
    } catch (error) { if (requestId === sequence.current) setError(error instanceof MobileRequestError ? error.code : 'LOAD_UNAVAILABLE'); }
    finally { if (requestId === sequence.current) setBusy(false); }
  }, [client, path]);
  useEffect(() => { const counter = sequence; void load(); return () => { ++counter.current; }; }, [load]);
  const remove = (record: MobileRecord) => Alert.alert(t(['حذف السجل', 'Delete record', 'Supprimer']), t(['سيُحذف السجل من حساب الموقع أيضًا. هل تريد المتابعة؟', 'This also deletes the record from your website account. Continue?', 'Cet enregistrement sera aussi supprimé de votre compte sur le site. Continuer ?']), [
    { text: t(['إلغاء', 'Cancel', 'Annuler']), style: 'cancel' },
    { text: t(['حذف', 'Delete', 'Supprimer']), style: 'destructive', onPress: () => { setBusy(true); void client.request(path, { method: 'DELETE', body: JSON.stringify({ id: record.id }) }).then(() => load()).catch(error => { setError(error.code ?? 'SAVE_UNAVAILABLE'); setBusy(false); }); } },
  ]);
  const visible = records.filter(row => resource.fields.some(field => String(row[field.key] ?? '').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  return <View style={{ flex: 1, gap: 12 }}>
    <Label large>{localized(resource.label, language)}</Label>
    <Input label={t(['البحث في السجلات المحملة', 'Search loaded records', 'Rechercher les enregistrements chargés'])} value={query} onChange={setQuery} />
    {!resource.readOnly ? <Button label={t(['إضافة سجل', 'Add record', 'Ajouter'])} onPress={() => setEditing('new')} disabled={busy} /> : null}
    {error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}
    <FlatList data={visible} keyExtractor={row => row.id} refreshing={busy} onRefresh={() => { void load(); }} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
      ListEmptyComponent={busy ? <Busy /> : !error ? <Empty /> : null}
      renderItem={({ item }) => <Panel><Label large>{String(item[resource.titleKey] || item.symbol || '—')}</Label>{resource.fields.filter(field => field.key !== resource.titleKey && item[field.key] != null).map(field => <View key={field.key}><Label muted>{localized(field.label, language)}</Label><Label>{field.type === 'boolean' ? item[field.key] ? t(['نعم', 'Yes', 'Oui']) : t(['لا', 'No', 'Non']) : formatValue(item[field.key])}</Label></View>)}
        {resource.id === 'holdings' && item.native_market_value != null ? <><Label>{t(['القيمة بعملة الأصل', 'Value in asset currency', 'Valeur en devise d’origine'])}: {formatValue(item.native_market_value)} {String(item.native_currency ?? '')}</Label>{item.converted_market_value != null ? <Label>{t(['القيمة المحولة', 'Converted value', 'Valeur convertie'])}: {formatValue(item.converted_market_value)} {String(item.user_currency ?? '')}</Label> : null}</> : null}
        {!resource.readOnly ? <View style={{ gap: 8 }}><Button label={t(['تعديل', 'Edit', 'Modifier'])} onPress={() => setEditing(item)} disabled={busy} /><Button danger label={t(['حذف', 'Delete', 'Supprimer'])} onPress={() => remove(item)} disabled={busy} /></View> : null}
      </Panel>}
      ListFooterComponent={cursor ? <Button label={busy ? t(['جارٍ التحميل', 'Loading', 'Chargement']) : t(['تحميل المزيد', 'Load more', 'Charger la suite'])} onPress={() => { if (cursor) void load(cursor); }} disabled={busy} /> : null} />
    <Modal visible={editing !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>{editing ? <RecordForm key={typeof editing === 'string' ? editing : editing.id} resource={resource} record={editing === 'new' ? null : editing} onCancel={() => setEditing(null)} onSave={async values => {
        await client.request(path, { method: editing === 'new' ? 'POST' : 'PATCH', body: JSON.stringify({ ...values, ...(editing !== 'new' ? { id: editing.id } : {}) }) });
        setEditing(null); await load();
      }} /> : null}</SafeAreaView>
    </Modal>
  </View>;
}
function normalizeNumber(value: string) { return value.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/٫/g, '.').replace(/٬/g, ''); }
function RecordForm({ resource, record, onCancel, onSave }: { resource: MobileResource; record: MobileRecord | null; onCancel: () => void; onSave: (values: Record<string, unknown>) => Promise<void> }) {
  const { language, t } = useUI();
  const [values, setValues] = useState<Record<string, string | boolean>>(() => Object.fromEntries(resource.fields.map(field => [field.key, record?.[field.key] == null ? field.type === 'boolean' ? false : field.type === 'choice' ? field.options?.[0] ?? '' : '' : field.type === 'boolean' ? Boolean(record[field.key]) : String(record[field.key])])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    const body: Record<string, unknown> = {};
    for (const field of resource.fields) {
      const value = values[field.key];
      if (value === '' && !field.required) continue;
      if (field.required && value === '') { setError('INVALID_RECORD'); return; }
      const parsed = field.type === 'number' ? Number(normalizeNumber(String(value))) : field.type === 'currency' ? String(value).toUpperCase().trim() : value;
      if (field.type === 'number' && (!Number.isFinite(parsed) || Number(parsed) < 0)) { setError('INVALID_RECORD'); return; }
      body[field.key] = parsed;
    }
    setBusy(true); setError('');
    try { await onSave(body); } catch (error) { setError(error instanceof MobileRequestError ? error.code : 'SAVE_UNAVAILABLE'); }
    finally { setBusy(false); }
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}><Label large>{localized(resource.label, language)}</Label>
    {resource.fields.map(field => <Field key={field.key} field={field} value={values[field.key]} setValue={value => setValues(previous => ({ ...previous, [field.key]: value }))} />)}
    {error ? <ErrorNotice code={error} /> : null}
    <Button label={busy ? t(['جارٍ الحفظ', 'Saving', 'Enregistrement']) : t(['حفظ في حسابي', 'Save to my account', 'Enregistrer sur mon compte'])} onPress={() => { void save(); }} disabled={busy} />
    <Button label={t(['إلغاء', 'Cancel', 'Annuler'])} onPress={onCancel} disabled={busy} />
  </ScrollView>;
}
function Field({ field, value, setValue }: { field: MobileField; value: string | boolean; setValue: (value: string | boolean) => void }) {
  const { language } = useUI();
  const label = `${localized(field.label, language)}${field.required ? ' *' : ''}${field.type === 'date' ? ' (YYYY-MM-DD)' : ''}${field.type === 'currency' ? ' (KWD / USD / EUR)' : ''}`;
  if (field.type === 'boolean') return <View><Label>{label}</Label><Switch accessibilityLabel={label} value={Boolean(value)} onValueChange={setValue} /></View>;
  if (field.type === 'choice') return <View style={{ gap: 8 }}><Label>{label}</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{field.options?.map(option => <Button key={option} label={option} selected={value === option} onPress={() => setValue(option)} />)}</View></View>;
  return <Input label={label} value={String(value)} onChange={setValue} numeric={field.type === 'number'} email={field.type === 'email'} />;
}
