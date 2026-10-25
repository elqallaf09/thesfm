import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Linking, Modal, SafeAreaView, ScrollView, Switch, View } from 'react-native';
import { localized, type MobileField, type MobilePage, type MobileRecord, type MobileResource, type PhoneProduct } from '../../../src/lib/mobile/resourceContract';
import { MobileRequestError, type MobileSessionClient } from './session';
import { Button, Busy, Empty, ErrorNotice, formatValue, Input, Label, Panel, useUI } from './ui';
import { useAccountSync } from './accountSync';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ATTACHMENT_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
const PROJECT_DOCUMENT_TYPES = new Set([
  ...ATTACHMENT_TYPES,
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const PROJECT_DOCUMENT_CATEGORIES = ['business_plan', 'contract', 'license', 'invoice', 'receipt', 'supplier', 'employee', 'report', 'financial', 'legal', 'other'] as const;
type MobileAttachmentAccess = { ok: true; attachment: { url: string } };
type MobileProject = { id: string; name?: string };
type PickedDocument = { uri: string; name: string; mimeType: string; size?: number };
function attachmentMimeType(name: string, supplied: string | null | undefined, allowed = ATTACHMENT_TYPES) {
  if (supplied && allowed.has(supplied)) return supplied;
  const extension = name.split('.').at(-1)?.toLowerCase();
  const inferred = extension === 'pdf' ? 'application/pdf' : extension === 'png' ? 'image/png' : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : extension === 'webp' ? 'image/webp'
    : extension === 'doc' ? 'application/msword' : extension === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : extension === 'xls' ? 'application/vnd.ms-excel' : extension === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : null;
  return inferred && allowed.has(inferred) ? inferred : null;
}

export function RecordsScreen({ client, product, resource }: { client: MobileSessionClient; product: PhoneProduct; resource: MobileResource }) {
  const { t, language, colors } = useUI();
  const [records, setRecords] = useState<MobileRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<MobileRecord | 'new' | null>(null);
  const [documentEditor, setDocumentEditor] = useState(false);
  const [documentProjects, setDocumentProjects] = useState<MobileProject[]>([]);
  const [documentProjectId, setDocumentProjectId] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentCategory, setDocumentCategory] = useState<(typeof PROJECT_DOCUMENT_CATEGORIES)[number]>('business_plan');
  const [documentNotes, setDocumentNotes] = useState('');
  const [documentFile, setDocumentFile] = useState<PickedDocument | null>(null);
  const sequence = useRef(0);
  const path = `/api/mobile/${product}/records/${resource.id}`;
  const load = useCallback(async (after?: string, silent = false) => {
    const requestId = ++sequence.current;
    if (!silent) { setBusy(true); setError(''); }
    try {
      const page = await client.request<MobilePage>(`${path}?limit=50${after ? `&cursor=${encodeURIComponent(after)}` : ''}`);
      if (requestId !== sequence.current) return;
      setRecords(previous => after ? [...previous, ...page.records.filter(row => !previous.some(existing => existing.id === row.id))] : page.records);
      setCursor(page.nextCursor);
      setLastSyncedAt(Date.now());
      setError('');
    } catch (error) { if (!silent && requestId === sequence.current) setError(error instanceof MobileRequestError ? error.code : 'LOAD_UNAVAILABLE'); }
    finally { if (!silent && requestId === sequence.current) setBusy(false); }
  }, [client, path]);
  useEffect(() => { const counter = sequence; void load(); return () => { ++counter.current; }; }, [load]);
  useAccountSync(() => { void load(undefined, true); });
  const attachmentPath = `${path}/attachment`;
  const supportsAttachments = product === 'finance' && (resource.id === 'income' || resource.id === 'expenses');
  const supportsPrivateDocuments = product === 'business' && resource.id === 'documents';
  const attachmentUrlField = resource.id === 'income' ? 'attachment_url' : 'receipt_image_url';
  const attachmentNameField = resource.id === 'income' ? 'attachment_name' : 'receipt_file_name';
  const documentCategoryLabel = (category: string) => {
    const labels: Record<string, readonly [string, string, string]> = {
      business_plan: ['خطة عمل', 'Business plan', "Plan d'affaires"], contract: ['عقد', 'Contract', 'Contrat'], license: ['ترخيص', 'License', 'Licence'], invoice: ['فاتورة', 'Invoice', 'Facture'], receipt: ['إيصال', 'Receipt', 'Reçu'], supplier: ['مورد', 'Supplier', 'Fournisseur'], employee: ['موظف', 'Employee', 'Employé'], report: ['تقرير', 'Report', 'Rapport'], financial: ['مالي', 'Financial', 'Financier'], legal: ['قانوني', 'Legal', 'Juridique'], other: ['أخرى', 'Other', 'Autre'],
    };
    return t(labels[category] ?? labels.other);
  };
  async function attach(record: MobileRecord) {
    const picked = await DocumentPicker.getDocumentAsync({ type: [...ATTACHMENT_TYPES], copyToCacheDirectory: false, multiple: false });
    const file = picked.assets?.[0];
    if (picked.canceled || !file) return;
    const mimeType = attachmentMimeType(file.name, file.mimeType);
    if (!mimeType) { setError('UNSUPPORTED_FILE'); return; }
    if (file.size != null && file.size > MAX_ATTACHMENT_BYTES) { setError('FILE_TOO_LARGE'); return; }
    const form = new FormData();
    form.append('recordId', record.id);
    form.append('file', { uri: file.uri, name: file.name || 'attachment', type: mimeType } as unknown as Blob);
    setBusy(true); setError('');
    try { await client.request(attachmentPath, { method: 'POST', body: form }); await load(); }
    catch (error) { setError(error instanceof MobileRequestError ? error.code : 'UPLOAD_UNAVAILABLE'); }
    finally { setBusy(false); }
  }
  async function openDocumentEditor() {
    setBusy(true); setError('');
    try {
      const projects = await client.request<MobilePage>('/api/mobile/business/records/projects?limit=100');
      const rows = projects.records.map(row => ({ id: row.id, name: typeof row.name === 'string' ? row.name : undefined }));
      setDocumentProjects(rows); setDocumentProjectId(rows[0]?.id ?? ''); setDocumentTitle(''); setDocumentCategory('business_plan'); setDocumentNotes(''); setDocumentFile(null); setDocumentEditor(true);
    } catch (error) { setError(error instanceof MobileRequestError ? error.code : 'LOAD_UNAVAILABLE'); }
    finally { setBusy(false); }
  }
  async function chooseProjectDocument() {
    const picked = await DocumentPicker.getDocumentAsync({ type: [...PROJECT_DOCUMENT_TYPES], copyToCacheDirectory: false, multiple: false });
    const file = picked.assets?.[0];
    if (picked.canceled || !file) return;
    const mimeType = attachmentMimeType(file.name, file.mimeType, PROJECT_DOCUMENT_TYPES);
    if (!mimeType) { setError('UNSUPPORTED_FILE'); return; }
    if (file.size != null && file.size > MAX_ATTACHMENT_BYTES) { setError('FILE_TOO_LARGE'); return; }
    setDocumentFile({ uri: file.uri, name: file.name || 'document', mimeType, ...(file.size == null ? {} : { size: file.size }) });
  }
  async function uploadProjectDocument() {
    if (!documentProjectId || !documentTitle.trim() || !documentFile) { setError('INVALID_UPLOAD'); return; }
    const form = new FormData();
    form.append('projectId', documentProjectId); form.append('title', documentTitle.trim()); form.append('category', documentCategory); form.append('notes', documentNotes.trim());
    form.append('file', { uri: documentFile.uri, name: documentFile.name, type: documentFile.mimeType } as unknown as Blob);
    setBusy(true); setError('');
    try { await client.request(attachmentPath, { method: 'POST', body: form }); setDocumentEditor(false); await load(); }
    catch (error) { setError(error instanceof MobileRequestError ? error.code : 'UPLOAD_UNAVAILABLE'); }
    finally { setBusy(false); }
  }
  async function openAttachment(record: MobileRecord) {
    setBusy(true); setError('');
    try {
      const result = await client.request<MobileAttachmentAccess>(`${attachmentPath}?recordId=${encodeURIComponent(record.id)}`);
      if (!result.attachment?.url || !await Linking.canOpenURL(result.attachment.url)) throw new MobileRequestError('ATTACHMENT_UNAVAILABLE');
      await Linking.openURL(result.attachment.url);
    } catch (error) { setError(error instanceof MobileRequestError ? error.code : 'ATTACHMENT_UNAVAILABLE'); }
    finally { setBusy(false); }
  }
  function detach(record: MobileRecord) {
    Alert.alert(t(['إزالة المرفق', 'Remove attachment', 'Supprimer la pièce jointe']), t(resource.id === 'expenses'
      ? ['سيُفصل الإيصال عن سجل المصروف في حسابك على الموقع.', 'This unlinks the receipt from this expense record in your website account.', 'Cette action dissocie le reçu de cette dépense dans votre compte du site.']
      : ['سيُفصل المرفق عن سجل الدخل في حسابك على الموقع.', 'This unlinks the attachment from this income record in your website account.', 'Cette action dissocie la pièce jointe de ce revenu dans votre compte du site.']), [
      { text: t(['إلغاء', 'Cancel', 'Annuler']), style: 'cancel' },
      { text: t(['إزالة', 'Remove', 'Supprimer']), style: 'destructive', onPress: () => { setBusy(true); void client.request(`${attachmentPath}?recordId=${encodeURIComponent(record.id)}`, { method: 'DELETE' }).then(() => load()).catch(error => { setError(error instanceof MobileRequestError ? error.code : 'SAVE_UNAVAILABLE'); setBusy(false); }); } },
    ]);
  }
  const remove = (record: MobileRecord) => Alert.alert(t(['حذف السجل', 'Delete record', 'Supprimer']), t(['سيُحذف السجل من حساب الموقع أيضًا. هل تريد المتابعة؟', 'This also deletes the record from your website account. Continue?', 'Cet enregistrement sera aussi supprimé de votre compte sur le site. Continuer ?']), [
    { text: t(['إلغاء', 'Cancel', 'Annuler']), style: 'cancel' },
    { text: t(['حذف', 'Delete', 'Supprimer']), style: 'destructive', onPress: () => { setBusy(true); void client.request(path, { method: 'DELETE', body: JSON.stringify({ id: record.id }) }).then(() => load()).catch(error => { setError(error.code ?? 'SAVE_UNAVAILABLE'); setBusy(false); }); } },
  ]);
  const visible = records.filter(row => resource.fields.some(field => String(row[field.key] ?? '').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  return <View style={{ flex: 1, gap: 12 }}>
    <Label large>{localized(resource.label, language)}</Label>
    {lastSyncedAt ? <Label muted>{t(['تمت المزامنة مع حسابك', 'Synced with your account', 'Synchronisé avec votre compte'])}: {new Date(lastSyncedAt).toLocaleTimeString(language === 'ar' ? 'ar-KW' : language === 'fr' ? 'fr-FR' : 'en-US')}</Label> : null}
    <Input label={t(['البحث في السجلات المحملة', 'Search loaded records', 'Rechercher les enregistrements chargés'])} value={query} onChange={setQuery} />
    {!resource.readOnly ? <Button label={t(['إضافة سجل', 'Add record', 'Ajouter'])} onPress={() => setEditing('new')} disabled={busy} /> : null}
    {supportsPrivateDocuments ? <Button label={t(['رفع مستند', 'Upload document', 'Téléverser un document'])} onPress={() => { void openDocumentEditor(); }} disabled={busy} /> : null}
    {error ? <ErrorNotice code={error} retry={() => { void load(); }} /> : null}
    <FlatList data={visible} keyExtractor={row => row.id} refreshing={busy} onRefresh={() => { void load(); }} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
      ListEmptyComponent={busy ? <Busy /> : !error ? <Empty /> : null}
      renderItem={({ item }) => <Panel><Label large>{String(item[resource.titleKey] || item.symbol || '—')}</Label>{resource.fields.filter(field => field.key !== resource.titleKey && item[field.key] != null).map(field => <View key={field.key}><Label muted>{localized(field.label, language)}</Label><Label>{field.type === 'boolean' ? item[field.key] ? t(['نعم', 'Yes', 'Oui']) : t(['لا', 'No', 'Non']) : formatValue(item[field.key])}</Label></View>)}
        {resource.id === 'holdings' && item.native_market_value != null ? <><Label>{t(['القيمة بعملة الأصل', 'Value in asset currency', 'Valeur en devise d’origine'])}: {formatValue(item.native_market_value)} {String(item.native_currency ?? '')}</Label>{item.converted_market_value != null ? <Label>{t(['القيمة المحولة', 'Converted value', 'Valeur convertie'])}: {formatValue(item.converted_market_value)} {String(item.user_currency ?? '')}</Label> : null}</> : null}
        {!resource.readOnly ? <View style={{ gap: 8 }}><Button label={t(['تعديل', 'Edit', 'Modifier'])} onPress={() => setEditing(item)} disabled={busy} /><Button danger label={t(['حذف', 'Delete', 'Supprimer'])} onPress={() => remove(item)} disabled={busy} /></View> : null}
        {supportsAttachments ? <View style={{ gap: 8 }}>
          {item[attachmentUrlField] ? <><Label muted>{t(resource.id === 'expenses' ? ['إيصال', 'Receipt', 'Reçu'] : ['مرفق', 'Attachment', 'Pièce jointe'])}: {String(item[attachmentNameField] || t(['ملف مرفق', 'Attached file', 'Fichier joint']))}</Label><Button label={t(['عرض المرفق', 'View attachment', 'Voir la pièce jointe'])} onPress={() => { void openAttachment(item); }} disabled={busy} /><Button danger label={t(['إزالة المرفق', 'Remove attachment', 'Supprimer la pièce jointe'])} onPress={() => detach(item)} disabled={busy} /></> : null}
          <Button label={t(['إرفاق ملف', 'Attach file', 'Joindre un fichier'])} onPress={() => { void attach(item); }} disabled={busy} />
        </View> : null}
        {supportsPrivateDocuments ? <View style={{ gap: 8 }}>
          <Label muted>{t(['مستند مشروع خاص من حسابك في الموقع.', 'Private project document from your website account.', 'Document de projet privé provenant de votre compte du site.'])}</Label>
          <Button label={t(['عرض المستند', 'View document', 'Voir le document'])} onPress={() => { void openAttachment(item); }} disabled={busy} />
        </View> : null}
      </Panel>}
      ListFooterComponent={cursor ? <Button label={busy ? t(['جارٍ التحميل', 'Loading', 'Chargement']) : t(['تحميل المزيد', 'Load more', 'Charger la suite'])} onPress={() => { if (cursor) void load(cursor); }} disabled={busy} /> : null} />
    <Modal visible={editing !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>{editing ? <RecordForm key={typeof editing === 'string' ? editing : editing.id} resource={resource} record={editing === 'new' ? null : editing} onCancel={() => setEditing(null)} onSave={async values => {
        await client.request(path, { method: editing === 'new' ? 'POST' : 'PATCH', body: JSON.stringify({ ...values, ...(editing !== 'new' ? { id: editing.id } : {}) }) });
        setEditing(null); await load();
      }} /> : null}</SafeAreaView>
    </Modal>
    <Modal visible={documentEditor} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDocumentEditor(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Label large>{t(['رفع مستند مشروع', 'Upload project document', 'Téléverser un document de projet'])}</Label>
        <Label>{t(['المشروع', 'Project', 'Projet'])}</Label>
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>{documentProjects.map(project => <Button key={project.id} label={project.name || project.id} selected={documentProjectId === project.id} onPress={() => setDocumentProjectId(project.id)} disabled={busy} />)}</ScrollView>
        {!documentProjects.length ? <Label muted>{t(['لا توجد مشاريع. أنشئ مشروعاً أولاً في حساب الموقع.', 'No projects are available. Create a project in your website account first.', "Aucun projet disponible. Créez d'abord un projet dans votre compte web."])}</Label> : null}
        <Input label={t(['عنوان المستند', 'Document title', 'Titre du document'])} value={documentTitle} onChange={setDocumentTitle} />
        <Label>{t(['التصنيف', 'Category', 'Catégorie'])}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{PROJECT_DOCUMENT_CATEGORIES.map(category => <Button key={category} label={documentCategoryLabel(category)} selected={documentCategory === category} onPress={() => setDocumentCategory(category)} disabled={busy} />)}</View>
        <Input label={t(['ملاحظات', 'Notes', 'Notes'])} value={documentNotes} onChange={setDocumentNotes} />
        {documentFile ? <Label muted>{documentFile.name}{documentFile.size != null ? ` · ${documentFile.size}` : ''}</Label> : null}
        <Button label={t(['اختيار ملف', 'Choose file', 'Choisir un fichier'])} onPress={() => { void chooseProjectDocument(); }} disabled={busy} />
        <Button label={busy ? t(['جارٍ الرفع', 'Uploading', 'Téléversement']) : t(['رفع إلى حسابي', 'Upload to my account', 'Téléverser dans mon compte'])} onPress={() => { void uploadProjectDocument(); }} disabled={busy || !documentProjects.length} />
        <Button label={t(['إلغاء', 'Cancel', 'Annuler'])} onPress={() => setDocumentEditor(false)} disabled={busy} />
      </ScrollView></SafeAreaView>
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
