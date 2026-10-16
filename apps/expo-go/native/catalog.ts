export type Product = 'finance' | 'investor' | 'business';
export type Row = Record<string, unknown> & { id?: string };
export type Field = { key: string; label: string; kind?: 'number' | 'date' | 'email' | 'currency' | 'boolean' | 'choice'; required?: boolean; initial?: string; options?: [string, string][]; min?: number; max?: number; relation?: string };
export type Resource = { path: string; title: string; table: string; primary: string; products: Product[]; fields: Field[]; readOnly?: boolean };
const f = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, ...extra });
const name = f('name', 'الاسم', { required: true });
const amount = f('amount', 'المبلغ', { kind: 'number', required: true, min: 0 });
const currency = f('currency', 'العملة', { kind: 'currency', required: true, initial: 'KWD' });
const notes = f('notes', 'ملاحظات');
const date = (key: string, label: string) => f(key, label, { kind: 'date', required: true, initial: 'today' });
const status = (options: [string, string][], initial = options[0][0]) => f('status', 'الحالة', { kind: 'choice', initial, options, required: true });
const contact = [name, f('phone', 'الهاتف'), f('email', 'البريد الإلكتروني', { kind: 'email' }), f('company', 'الشركة'), f('address', 'العنوان'), notes];
const finance: Product[] = ['finance'];
const business: Product[] = ['business'];
const investor: Product[] = ['investor'];

export const resources: Resource[] = [
  { path: '/income', title: 'الدخل', table: 'monthly_income_sources', primary: 'label', products: finance, fields: [f('label', 'مصدر الدخل', { required: true }), f('category', 'الفئة', { required: true, initial: 'other' }), amount, currency, date('received_date', 'تاريخ الاستلام'), status([['received', 'مستلم'], ['expected', 'متوقع']]), notes] },
  { path: '/expenses', title: 'المصروفات', table: 'expense_items', primary: 'name', products: finance, fields: [name, amount, currency, date('date', 'التاريخ'), f('category', 'الفئة', { initial: 'other' }), notes] },
  { path: '/savings', title: 'المدخرات', table: 'savings_items', primary: 'name', products: finance, fields: [name, amount, currency, date('saved_at', 'تاريخ الادخار'), f('saving_type', 'نوع الادخار'), f('method', 'طريقة الادخار'), f('goal_id', 'الهدف المرتبط', { relation: '/goals' }), notes] },
  { path: '/goals', title: 'الأهداف المالية', table: 'financial_goals', primary: 'goal', products: finance, fields: [f('goal', 'الهدف', { required: true }), f('amount', 'المبلغ المستهدف', { kind: 'number', required: true, min: 0.001 }), f('currentAmount', 'المدخر حتى الآن', { kind: 'number', initial: '0', min: 0 }), f('monthlyContribution', 'الادخار الشهري', { kind: 'number', initial: '0', min: 0 }), currency, f('duration', 'المدة بالأشهر', { kind: 'number', required: true, min: 1, initial: '12' }), f('description', 'ملاحظات')] },
  { path: '/debts', title: 'الالتزامات', table: 'debts', primary: 'name', products: finance, fields: [name, f('creditor_name', 'الجهة الدائنة', { required: true }), f('original_amount', 'المبلغ الأصلي', { kind: 'number', required: true, min: 0.001 }), f('remaining_amount', 'الرصيد المتبقي', { kind: 'number', required: true, min: 0 }), currency, f('monthly_payment', 'القسط الشهري', { kind: 'number', required: true, min: 0.001 }), date('start_date', 'تاريخ البداية'), f('payment_day', 'يوم السداد', { kind: 'number', min: 1, max: 31, required: true, initial: '1' }), status([['active', 'نشط'], ['paid', 'مسدد'], ['paused', 'متوقف']]), f('auto_add_to_expenses', 'إضافة الأقساط للمصروفات تلقائياً', { kind: 'boolean', initial: 'false' }), notes] },
  { path: '/projects', title: 'المشاريع', table: 'projects', primary: 'name', products: business, fields: [name, f('budget', 'الميزانية المخططة', { kind: 'number', min: 0 }), f('timeline', 'المدة بالأشهر', { kind: 'number', min: 0 }), f('stepsText', 'خطوات التنفيذ — خطوة في كل سطر')] },
  { path: '/customers', title: 'العملاء', table: 'business_customers', primary: 'name', products: business, fields: contact },
  { path: '/suppliers', title: 'الموردون', table: 'business_suppliers', primary: 'name', products: business, fields: [...contact, f('supply_type', 'نوع التوريد')] },
  { path: '/invoices', title: 'الفواتير', table: 'business_invoices', primary: 'title', products: business, fields: [f('title', 'عنوان الفاتورة', { required: true }), f('invoice_number', 'رقم الفاتورة', { required: true }), f('customer_id', 'العميل', { relation: '/customers' }), amount, currency, date('invoice_date', 'تاريخ الفاتورة'), f('due_date', 'تاريخ الاستحقاق', { kind: 'date' }), status([['draft', 'مسودة'], ['sent', 'مرسلة'], ['paid', 'مدفوعة'], ['overdue', 'متأخرة']]), notes] },
  { path: '/sales', title: 'المبيعات', table: 'business_sales', primary: 'product_or_service', products: business, fields: [f('product_or_service', 'المنتج أو الخدمة', { required: true }), f('customer_name', 'اسم العميل', { required: true }), f('invoice_number', 'رقم الفاتورة'), amount, currency, date('sale_date', 'تاريخ البيع'), status([['completed', 'مكتملة'], ['pending', 'معلقة'], ['cancelled', 'ملغاة'], ['refunded', 'مستردة']]), notes] },
  { path: '/operating-expenses', title: 'المصروفات التشغيلية', table: 'business_operating_expenses', primary: 'name', products: business, fields: [name, amount, currency, date('expense_date', 'التاريخ'), f('category', 'الفئة', { kind: 'choice', initial: 'other', options: [['rent', 'إيجار'], ['salaries', 'رواتب'], ['subscriptions', 'اشتراكات'], ['operating_purchases', 'مشتريات'], ['marketing', 'تسويق'], ['maintenance', 'صيانة'], ['shipping_delivery', 'توصيل'], ['other', 'أخرى']] }), f('recurring_monthly', 'متكرر شهرياً', { kind: 'boolean', initial: 'false' }), notes] },
  { path: '/employees', title: 'الفريق والرواتب', table: 'business_employees', primary: 'name', products: business, fields: [name, f('role', 'المسمى الوظيفي'), f('department', 'القسم'), f('salary', 'الراتب', { kind: 'number', required: true, min: 0 }), currency, f('salary_day', 'يوم الراتب', { kind: 'number', min: 1, max: 31, initial: '25', required: true }), f('join_date', 'تاريخ الانضمام', { kind: 'date' }), status([['active', 'نشط'], ['on_leave', 'في إجازة'], ['inactive', 'غير نشط']]), notes] },
  { path: '/market-watchlist', title: 'قائمة المتابعة', table: 'market_watchlist', primary: 'symbol', products: investor, fields: [f('symbol', 'رمز الأداة', { required: true }), f('name', 'الاسم'), f('asset_type', 'نوع الأداة', { kind: 'choice', initial: 'STOCK', required: true, options: [['STOCK', 'أسهم'], ['CRYPTO', 'عملات رقمية'], ['FOREX', 'عملات'], ['INDEX', 'مؤشرات'], ['COMMODITY', 'سلع'], ['FUND', 'صناديق']] })] },
  { path: '/alerts', title: 'تنبيهات الأسعار', table: 'market_price_alerts', primary: 'symbol', products: investor, fields: [f('symbol', 'رمز الأداة', { required: true }), f('asset_type', 'نوع الأداة', { kind: 'choice', initial: 'STOCK', required: true, options: [['STOCK', 'أسهم'], ['CRYPTO', 'عملات رقمية'], ['FOREX', 'عملات'], ['INDEX', 'مؤشرات'], ['COMMODITY', 'سلع'], ['FUND', 'صناديق']] }), f('alert_type', 'نوع التنبيه', { kind: 'choice', required: true, initial: 'above', options: [['above', 'أعلى من'], ['below', 'أقل من']] }), f('threshold', 'السعر المستهدف', { kind: 'number', min: 0.001, required: true })] },
  { path: '/investments', title: 'المحفظة الاستثمارية', table: 'investment_items', primary: 'name', products: ['finance', 'investor'], readOnly: true, fields: [name, f('symbol', 'الرمز'), f('quantity', 'الكمية', { kind: 'number' }), f('purchase_price', 'سعر الشراء', { kind: 'number' }), f('current_market_value', 'القيمة السوقية', { kind: 'number' }), currency] },
];

export const shortcuts: Record<Product, [string, string][]> = {
  finance: [['/income', 'الدخل'], ['/expenses', 'المصروفات'], ['/savings', 'المدخرات'], ['/goals', 'الأهداف'], ['/debts', 'الالتزامات'], ['/zakat-calculator', 'الزكاة']],
  business: [['/projects', 'المشاريع'], ['/customers', 'العملاء'], ['/invoices', 'الفواتير'], ['/sales', 'المبيعات'], ['/suppliers', 'الموردون'], ['/operating-expenses', 'المصروفات'], ['/employees', 'الفريق']],
  investor: [['/global-markets', 'الأسواق'], ['/market-watchlist', 'المتابعة'], ['/investments', 'المحفظة'], ['/alerts', 'التنبيهات'], ['/sharia-stocks', 'الفحص الشرعي'], ['/market-news', 'الأخبار']],
};
export function resourceFor(path: string, product: Product) {
  const normalized = path === '/invest' ? '/investments' : path;
  return resources.find(item => item.path === normalized && item.products.includes(product));
}
export function businessAccess(role: string | null, path: string) {
  return { view: role === 'manager' || role === 'accountant', write: role === 'manager' || (role === 'accountant' && path !== '/employees'), remove: role === 'manager' };
}
