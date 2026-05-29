export type UnifiedDocumentSourceModule =
  | 'projects'
  | 'charity'
  | 'income'
  | 'expenses'
  | 'reports'
  | 'pitch_deck'
  | 'business'
  | 'other';

export type UnifiedDocument = {
  id: string;
  recordId: string;
  title: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  sourceModule: UnifiedDocumentSourceModule;
  category?: string;
  relatedName?: string;
  uploadedAt?: string;
  filePath?: string;
  fileUrl?: string;
  sourceUrl?: string;
  documentType?: string;
  status?: string;
  actionUrl?: string;
  notes?: string;
  bucket?: string;
  canDelete?: boolean;
  deleteTable?: 'project_documents' | 'charity_documents';
};

export type UnifiedDocumentSourceRows = {
  projectDocuments?: any[];
  charityDocuments?: any[];
  incomeRows?: any[];
  expenseRows?: any[];
  pitchDecks?: any[];
  generatedReports?: any[];
  strategicDocuments?: any[];
  projects?: any[];
  charityProjects?: any[];
};

function textValue(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function dateValue(...values: unknown[]) {
  const value = textValue(...values);
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : value;
}

function relationMap(rows: any[] = []) {
  return new Map(rows.map(row => [String(row?.id), textValue(row?.name, row?.title, row?.project_name)]));
}

function documentTitle(row: any, fallback: string) {
  return textValue(row?.title, row?.name, row?.file_name, row?.fileName, fallback);
}

function documentTimestamp(document: UnifiedDocument) {
  return document.uploadedAt ? new Date(document.uploadedAt).getTime() || 0 : 0;
}

function documentCompletenessScore(document: UnifiedDocument) {
  return [
    document.filePath,
    document.fileUrl,
    document.fileName,
    document.fileSize,
    document.sourceUrl,
    document.notes,
    document.relatedName,
  ].filter(value => value !== undefined && value !== null && String(value).trim() !== '').length;
}

function normalizedDateKey(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value).trim().toLowerCase();
  return date.toISOString().slice(0, 10);
}

export function unifiedDocumentDedupeKey(document: UnifiedDocument) {
  const fileUrl = textValue(document.fileUrl).toLowerCase();
  if (fileUrl) return `file-url:${fileUrl}`;

  const filePath = textValue(document.filePath).toLowerCase();
  if (filePath) return `file-path:${filePath}`;

  const sourceUrl = textValue(document.sourceUrl).toLowerCase();
  const title = textValue(document.title).toLowerCase();
  const category = textValue(document.category, 'other').toLowerCase();
  const sourceModule = textValue(document.sourceModule, 'other').toLowerCase();
  const relatedName = textValue(document.relatedName).toLowerCase();
  const documentType = textValue(document.documentType, 'document').toLowerCase();

  if (sourceUrl) return ['source', sourceModule, sourceUrl, title, category].join('|');

  if (sourceModule === 'pitch_deck' || sourceModule === 'business') {
    return ['reference', sourceModule, relatedName, title, category, documentType].join('|');
  }

  if (sourceModule === 'projects' && title && category && relatedName) {
    return ['project-title-category', relatedName, title, category].join('|');
  }

  if (sourceModule === 'projects' && title && relatedName) {
    return ['project-title-date', relatedName, title, normalizedDateKey(document.uploadedAt)].join('|');
  }

  if (sourceModule === 'projects') {
    return ['project-record', textValue(document.recordId, document.id)].join('|');
  }

  return [
    'fallback',
    sourceModule,
    title,
    category,
    normalizedDateKey(document.uploadedAt),
  ].join('|');
}

export function dedupeUnifiedDocuments(documents: UnifiedDocument[]) {
  const grouped = new Map<string, UnifiedDocument>();
  const duplicateKeys = new Set<string>();
  for (const document of documents) {
    const key = unifiedDocumentDedupeKey(document);
    const current = grouped.get(key);
    if (current) duplicateKeys.add(key);
    if (
      !current ||
      documentCompletenessScore(document) > documentCompletenessScore(current) ||
      (
        documentCompletenessScore(document) === documentCompletenessScore(current) &&
        documentTimestamp(document) >= documentTimestamp(current)
      )
    ) {
      grouped.set(key, document);
    }
  }
  return {
    documents: Array.from(grouped.values()),
    duplicateKeys: Array.from(duplicateKeys),
  };
}

export function normalizeUnifiedDocumentsWithMeta(rows: UnifiedDocumentSourceRows) {
  const projectNames = relationMap(rows.projects);
  const charityProjectNames = relationMap(rows.charityProjects);

  const documents: UnifiedDocument[] = [];

  for (const row of rows.projectDocuments ?? []) {
    const recordId = textValue(row?.id);
    const projectId = textValue(row?.project_id);
    if (!recordId) continue;
    documents.push({
      id: `project-${recordId}`,
      recordId,
      title: documentTitle(row, 'Project document'),
      fileName: textValue(row?.file_name) || undefined,
      fileType: textValue(row?.file_type) || undefined,
      fileSize: numberValue(row?.file_size),
      sourceModule: 'projects',
      category: textValue(row?.category) || 'other',
      relatedName: projectNames.get(projectId) || undefined,
      uploadedAt: dateValue(row?.uploaded_at, row?.created_at),
      filePath: textValue(row?.file_path) || undefined,
      fileUrl: textValue(row?.file_url) || undefined,
      documentType: 'uploaded_file',
      actionUrl: projectId ? `/projects/${projectId}#documents` : '/projects',
      notes: textValue(row?.notes) || undefined,
      bucket: 'project-documents',
      canDelete: true,
      deleteTable: 'project_documents',
    });
  }

  for (const row of rows.charityDocuments ?? []) {
    const recordId = textValue(row?.id);
    const projectId = textValue(row?.project_id);
    if (!recordId) continue;
    documents.push({
      id: `charity-${recordId}`,
      recordId,
      title: documentTitle(row, 'Charity document'),
      fileName: textValue(row?.file_name) || undefined,
      fileType: textValue(row?.file_type) || undefined,
      fileSize: numberValue(row?.file_size),
      sourceModule: 'charity',
      category: textValue(row?.category) || 'other',
      relatedName: charityProjectNames.get(projectId) || undefined,
      uploadedAt: dateValue(row?.uploaded_at, row?.created_at),
      filePath: textValue(row?.file_path) || undefined,
      fileUrl: textValue(row?.file_url) || undefined,
      actionUrl: '/charity-projects#document-vault',
      notes: textValue(row?.notes) || undefined,
      bucket: 'charity-documents',
      canDelete: true,
      deleteTable: 'charity_documents',
    });
  }

  for (const row of rows.incomeRows ?? []) {
    const attachmentUrl = textValue(row?.attachment_url);
    const attachmentName = textValue(row?.attachment_name);
    if (!attachmentUrl) continue;
    const recordId = textValue(row?.id);
    if (!recordId) continue;
    documents.push({
      id: `income-${recordId}`,
      recordId,
      title: attachmentName || textValue(row?.source_name, row?.name, 'Income attachment'),
      fileName: attachmentName || undefined,
      fileType: textValue(row?.attachment_type) || undefined,
      fileSize: numberValue(row?.attachment_size),
      sourceModule: 'income',
      category: 'income',
      relatedName: textValue(row?.source_name, row?.name) || undefined,
      uploadedAt: dateValue(row?.received_date, row?.created_at),
      fileUrl: attachmentUrl || undefined,
      actionUrl: '/income',
      notes: textValue(row?.notes) || undefined,
      canDelete: false,
    });
  }

  for (const row of rows.expenseRows ?? []) {
    const receiptUrl = textValue(row?.receipt_image_url);
    const receiptName = textValue(row?.receipt_file_name);
    if (!receiptUrl) continue;
    const recordId = textValue(row?.id);
    if (!recordId) continue;
    documents.push({
      id: `expense-${recordId}`,
      recordId,
      title: receiptName || textValue(row?.name, 'Expense receipt'),
      fileName: receiptName || undefined,
      fileType: receiptUrl ? 'image' : undefined,
      sourceModule: 'expenses',
      category: 'receipt',
      relatedName: textValue(row?.name) || undefined,
      uploadedAt: dateValue(row?.date, row?.created_at),
      fileUrl: receiptUrl || undefined,
      actionUrl: '/expenses',
      notes: textValue(row?.notes) || undefined,
      canDelete: false,
    });
  }

  for (const row of rows.pitchDecks ?? []) {
    const recordId = textValue(row?.id);
    const projectId = textValue(row?.project_id);
    if (!recordId) continue;
    const relatedName = projectNames.get(projectId) || undefined;
    documents.push({
      id: `pitch-${recordId}`,
      recordId,
      title: relatedName ? `Pitch Deck - ${relatedName}` : 'Pitch Deck',
      sourceModule: 'pitch_deck',
      category: 'pitch_deck',
      relatedName,
      uploadedAt: dateValue(row?.updated_at, row?.created_at),
      actionUrl: projectId ? `/projects/${projectId}#pitchDeck` : '/projects',
      notes: textValue(row?.source) || undefined,
      canDelete: false,
    });
  }

  for (const row of rows.generatedReports ?? []) {
    const recordId = textValue(row?.id);
    if (!recordId) continue;
    documents.push({
      id: `report-${recordId}`,
      recordId,
      title: documentTitle(row, 'Saved report'),
      fileName: textValue(row?.file_name, row?.export_name) || undefined,
      fileType: textValue(row?.file_type, row?.format) || undefined,
      fileSize: numberValue(row?.file_size),
      sourceModule: 'reports',
      category: textValue(row?.report_type, row?.category) || 'report',
      uploadedAt: dateValue(row?.generated_at, row?.created_at, row?.updated_at),
      filePath: textValue(row?.file_path) || undefined,
      fileUrl: textValue(row?.file_url, row?.url) || undefined,
      sourceUrl: textValue(row?.source_url, row?.sourceUrl) || undefined,
      actionUrl: '/reports-center',
      notes: textValue(row?.notes) || undefined,
      canDelete: false,
    });
  }

  for (const row of rows.strategicDocuments ?? []) {
    const recordId = textValue(row?.id);
    const projectId = textValue(row?.project_id);
    if (!recordId) continue;
    const documentType = textValue(row?.document_type, row?.type, 'business');
    documents.push({
      id: `business-${recordId}`,
      recordId,
      title: documentTitle(row, documentType.replace(/_/g, ' ')),
      fileName: textValue(row?.file_name) || undefined,
      fileType: textValue(row?.file_type) || undefined,
      fileSize: numberValue(row?.file_size),
      sourceModule: 'business',
      category: documentType,
      relatedName: projectNames.get(projectId) || undefined,
      uploadedAt: dateValue(row?.updated_at, row?.created_at),
      filePath: textValue(row?.file_path) || undefined,
      fileUrl: textValue(row?.file_url) || undefined,
      sourceUrl: textValue(row?.source_url, row?.sourceUrl) || undefined,
      actionUrl: projectId ? `/investment-offers?project=${projectId}` : '/investment-offers',
      notes: textValue(row?.readiness_status, row?.source) || undefined,
      canDelete: false,
    });
  }

  const displayableDocuments = documents.filter(document => {
    if (document.filePath || document.fileUrl || document.sourceUrl) return true;
    return document.sourceModule === 'pitch_deck' || document.sourceModule === 'business';
  });
  const deduped = dedupeUnifiedDocuments(displayableDocuments);
  return {
    documents: deduped.documents.sort((a, b) => {
      const left = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const right = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return right - left;
    }),
    rawCount: documents.length,
    displayableCount: displayableDocuments.length,
    duplicateKeys: deduped.duplicateKeys,
  };
}

export function normalizeUnifiedDocuments(rows: UnifiedDocumentSourceRows): UnifiedDocument[] {
  return normalizeUnifiedDocumentsWithMeta(rows).documents.sort((a, b) => {
    const left = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
    const right = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
    return right - left;
  });
}
