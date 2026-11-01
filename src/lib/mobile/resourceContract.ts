/** Versioned, platform-neutral contracts. No credentials or server dependencies. */
export const MOBILE_CONTRACT_VERSION = 1;
export type PhoneProduct = 'finance' | 'investor' | 'business';
export type MobileLanguage = 'ar' | 'en' | 'fr';
export type LocalizedLabel = readonly [ar: string, en: string, fr: string];
export type MobileField = {
  key: string;
  label: LocalizedLabel;
  type: 'text' | 'number' | 'date' | 'currency' | 'email' | 'boolean' | 'choice';
  required?: boolean;
  options?: readonly string[];
  max?: number;
};
export type MobileResource = {
  id: string;
  products: readonly PhoneProduct[];
  paths: readonly string[];
  label: LocalizedLabel;
  titleKey: string;
  fields: readonly MobileField[];
  readOnly?: boolean;
};
const text = (key: string, label: LocalizedLabel, required = false): MobileField => ({ key, label, type: 'text', required });
const amount = (key = 'amount', label: LocalizedLabel = ['المبلغ', 'Amount', 'Montant'], required = true): MobileField => ({ key, label, type: 'number', required });
const date = (key: string, label: LocalizedLabel): MobileField => ({ key, label, type: 'date' });
const choice = (key: string, label: LocalizedLabel, options: string[]): MobileField => ({ key, label, type: 'choice', options });
const name = text('name', ['الاسم', 'Name', 'Nom'], true);
const title = text('title', ['العنوان', 'Title', 'Titre'], true);
const notes = text('notes', ['ملاحظات', 'Notes', 'Notes']);
const currency: MobileField = { key: 'currency', label: ['العملة', 'Currency', 'Devise'], type: 'currency', required: true };
const contact: MobileField[] = [name, text('company', ['الشركة', 'Company', 'Entreprise']), { key: 'email', label: ['البريد الإلكتروني', 'Email', 'E-mail'], type: 'email' }, text('phone', ['الهاتف', 'Phone', 'Téléphone']), text('address', ['العنوان', 'Address', 'Adresse']), notes];
export const MOBILE_RESOURCES: readonly MobileResource[] = [
  { id: 'income', products: ['finance'], paths: ['/income', '/income/add'], label: ['الدخل', 'Income', 'Revenus'], titleKey: 'label', fields: [text('label', ['المصدر', 'Source', 'Source'], true), amount(), currency, text('category', ['التصنيف', 'Category', 'Catégorie'], true), choice('status', ['الحالة', 'Status', 'Statut'], ['received', 'expected']), date('received_date', ['تاريخ الاستلام', 'Received date', 'Date de réception']), notes] },
  { id: 'expenses', products: ['finance'], paths: ['/expenses', '/expenses/add'], label: ['المصروفات', 'Expenses', 'Dépenses'], titleKey: 'name', fields: [name, amount(), currency, text('category', ['التصنيف', 'Category', 'Catégorie']), date('date', ['التاريخ', 'Date', 'Date']), notes] },
  { id: 'savings', products: ['finance'], paths: ['/savings'], label: ['المدخرات', 'Savings', 'Épargne'], titleKey: 'name', fields: [name, amount(), currency, date('saved_at', ['التاريخ', 'Date', 'Date']), notes] },
  { id: 'goals', products: ['finance'], paths: ['/goals', '/goals/add'], label: ['الأهداف المالية', 'Financial goals', 'Objectifs financiers'], titleKey: 'goal', fields: [text('goal', ['الهدف', 'Goal', 'Objectif'], true), amount(), amount('current_amount', ['المبلغ الحالي', 'Current amount', 'Montant actuel'], false), text('duration', ['المدة', 'Duration', 'Durée']), choice('duration_unit', ['وحدة المدة', 'Duration unit', 'Unité de durée'], ['months', 'years']), notes] },
  { id: 'debts', products: ['finance'], paths: ['/debts'], label: ['الديون', 'Debts', 'Dettes'], titleKey: 'name', fields: [name, text('creditor_name', ['الدائن', 'Creditor', 'Créancier']), amount('original_amount', ['المبلغ الأصلي', 'Original amount', 'Montant initial']), amount('remaining_amount', ['المتبقي', 'Remaining', 'Solde']), amount('monthly_payment', ['القسط الشهري', 'Monthly payment', 'Mensualité'], false), currency, date('start_date', ['تاريخ البداية', 'Start date', 'Date de début']), notes] },
  { id: 'holdings', products: ['finance', 'investor'], paths: ['/invest', '/investments', '/ai-analyst/portfolio'], label: ['المحفظة والاستثمارات', 'Portfolio and investments', 'Portefeuille et investissements'], titleKey: 'name', fields: [name, amount(), currency, text('symbol', ['الرمز', 'Symbol', 'Symbole']), text('type', ['النوع', 'Type', 'Type']), amount('quantity', ['الكمية', 'Quantity', 'Quantité'], false), amount('purchase_price', ['سعر الشراء', 'Purchase price', "Prix d’achat"], false), notes] },
  { id: 'watchlist', products: ['investor'], paths: ['/market-watchlist', '/watchlist', '/ai-analyst/watchlist'], label: ['قائمة المتابعة', 'Watchlist', 'Liste de suivi'], titleKey: 'name', fields: [text('symbol', ['الرمز', 'Symbol', 'Symbole'], true), name, text('asset_type', ['فئة الأصل', 'Asset type', "Classe d’actifs"], true), currency, text('exchange', ['البورصة', 'Exchange', 'Bourse']), text('provider_symbol', ['رمز المصدر', 'Provider symbol', 'Symbole fournisseur']), text('country', ['الدولة', 'Country', 'Pays'])] },
  { id: 'alerts', products: ['investor'], paths: ['/alerts', '/market-alerts', '/ai-analyst/alerts'], label: ['التنبيهات السعرية', 'Price alerts', 'Alertes de prix'], titleKey: 'symbol', fields: [text('symbol', ['الرمز', 'Symbol', 'Symbole'], true), text('asset_type', ['فئة الأصل', 'Asset type', "Classe d’actifs"], true), choice('alert_type', ['نوع التنبيه', 'Alert type', "Type d’alerte"], ['above', 'below']), amount('threshold', ['السعر المستهدف', 'Target price', 'Prix cible']), currency] },
  { id: 'projects', products: ['business'], paths: ['/projects'], label: ['المشاريع', 'Projects', 'Projets'], titleKey: 'name', fields: [name, text('budget', ['الميزانية', 'Budget', 'Budget']), text('timeline', ['الجدول الزمني', 'Timeline', 'Calendrier']), choice('duration_unit', ['وحدة المدة', 'Duration unit', 'Unité de durée'], ['months', 'years'])] },
  { id: 'customers', products: ['business'], paths: ['/customers'], label: ['العملاء', 'Customers', 'Clients'], titleKey: 'name', fields: contact },
  { id: 'suppliers', products: ['business'], paths: ['/suppliers'], label: ['الموردون', 'Suppliers', 'Fournisseurs'], titleKey: 'name', fields: [...contact, text('supply_type', ['نوع التوريد', 'Supply type', 'Type de fourniture'])] },
  { id: 'sales', products: ['business'], paths: ['/sales'], label: ['المبيعات', 'Sales', 'Ventes'], titleKey: 'title', fields: [title, amount(), currency, text('invoice_number', ['رقم الفاتورة', 'Invoice number', 'Numéro de facture']), text('customer_name', ['اسم العميل', 'Customer name', 'Nom du client']), choice('status', ['الحالة', 'Status', 'Statut'], ['completed', 'pending', 'cancelled', 'refunded']), date('sale_date', ['تاريخ البيع', 'Sale date', 'Date de vente']), notes] },
  { id: 'invoices', products: ['business'], paths: ['/invoices'], label: ['الفواتير', 'Invoices', 'Factures'], titleKey: 'title', fields: [title, text('invoice_number', ['رقم الفاتورة', 'Invoice number', 'Numéro de facture'], true), amount(), currency, choice('status', ['الحالة', 'Status', 'Statut'], ['draft', 'sent', 'paid', 'overdue']), date('invoice_date', ['تاريخ الفاتورة', 'Invoice date', 'Date de facture']), date('due_date', ['تاريخ الاستحقاق', 'Due date', "Date d’échéance"]), notes] },
  { id: 'employees', products: ['business'], paths: ['/employees'], label: ['الموظفون', 'Employees', 'Employés'], titleKey: 'name', fields: [name, text('department', ['القسم', 'Department', 'Service']), text('role', ['المسمى الوظيفي', 'Job title', 'Poste']), amount('salary', ['الراتب', 'Salary', 'Salaire']), currency, choice('status', ['الحالة', 'Status', 'Statut'], ['active', 'on_leave', 'inactive']), date('join_date', ['تاريخ الالتحاق', 'Join date', "Date d’entrée"]), notes] },
  { id: 'operating-expenses', products: ['business'], paths: ['/operating-expenses'], label: ['المصروفات التشغيلية', 'Operating expenses', 'Charges d’exploitation'], titleKey: 'name', fields: [name, amount(), currency, choice('category', ['التصنيف', 'Category', 'Catégorie'], ['rent', 'salaries', 'subscriptions', 'operating_purchases', 'marketing', 'maintenance', 'shipping_delivery', 'other']), date('expense_date', ['التاريخ', 'Date', 'Date']), { key: 'recurring_monthly', label: ['شهري متكرر', 'Monthly recurring', 'Récurrence mensuelle'], type: 'boolean' }, notes] },
  { id: 'tasks', products: ['business'], paths: ['/tasks'], label: ['المهام', 'Tasks', 'Tâches'], titleKey: 'title', readOnly: true, fields: [title, text('status', ['الحالة', 'Status', 'Statut']), date('due_date', ['تاريخ الاستحقاق', 'Due date', "Date d’échéance"])] },
  { id: 'documents', products: ['business'], paths: ['/documents'], label: ['المستندات', 'Documents', 'Documents'], titleKey: 'title', readOnly: true, fields: [title, text('category', ['التصنيف', 'Category', 'Catégorie']), text('file_name', ['اسم الملف', 'File name', 'Nom du fichier'])] },
];
export type MobileRecord = Record<string, string | number | boolean | null> & { id: string; created_at: string };
export type MobilePage = { ok: true; version: number; records: MobileRecord[]; nextCursor: string | null };
export function resourceFor(product: string, resource: string) {
  return MOBILE_RESOURCES.find(item => item.id === resource && item.products.some(value => value === product));
}
export function localized(label: LocalizedLabel, language: MobileLanguage) {
  return label[language === 'ar' ? 0 : language === 'en' ? 1 : 2];
}
