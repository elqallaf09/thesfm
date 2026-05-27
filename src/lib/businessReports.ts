import { formatDate } from '@/lib/formatDate';
import { formatMoney } from '@/lib/formatMoney';
import { BUSINESS_TEXT, employeeStatusLabel, numericValue, saleStatusLabel, type BusinessLang } from '@/lib/businessOperations';

type ExportColumn<T> = {
  key: string;
  label: string;
  value: (row: T) => unknown;
};

type PdfOptions<T> = {
  title: string;
  lang: BusinessLang;
  columns: ExportColumn<T>[];
  rows: T[];
  totals?: Array<{ label: string; value: string }>;
  filters?: Array<{ label: string; value: string }>;
};

export function isInDateRange(value: unknown, from: string, to: string) {
  const date = value ? new Date(String(value)) : null;
  if (!date || !Number.isFinite(date.getTime())) return true;
  if (from && date < new Date(`${from}T00:00:00`)) return false;
  if (to && date > new Date(`${to}T23:59:59`)) return false;
  return true;
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv<T>(filename: string, rows: T[], columns: ExportColumn<T>[]) {
  const csvRows = [
    columns.map((column) => escapeCsv(column.label)).join(','),
    ...rows.map((row) => columns.map((column) => escapeCsv(column.value(row))).join(',')),
  ];
  downloadBlob(filename, new Blob([`\uFEFF${csvRows.join('\n')}`], { type: 'text/csv;charset=utf-8' }));
}

export async function downloadXlsx<T>(filename: string, rows: T[], columns: ExportColumn<T>[], sheetName: string) {
  const XLSX = await import('xlsx');
  const data = rows.map((row) => Object.fromEntries(columns.map((column) => [column.label, column.value(row)])));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, filename);
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function printPdf<T>({ title, lang, columns, rows, totals = [], filters = [] }: PdfOptions<T>) {
  const text = BUSINESS_TEXT[lang];
  const report = window.open('', '_blank', 'noopener,noreferrer,width=980,height=760');
  if (!report) return false;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const bodyRows = rows.map((row) => `
    <tr>${columns.map((column) => `<td>${escapeHtml(column.value(row))}</td>`).join('')}</tr>
  `).join('');
  report.document.write(`
    <!doctype html>
    <html lang="${lang}" dir="${dir}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body{font-family:Tajawal,Arial,sans-serif;background:#f6f9fc;color:#061B33;margin:0;padding:28px}
          .page{background:white;border:1px solid #d8e7f7;border-radius:22px;padding:24px}
          header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:1px solid #d8e7f7;padding-bottom:16px;margin-bottom:18px}
          h1{margin:0;font-size:26px}.brand{font-weight:950;color:#1D8CFF}.muted{color:#64748B;font-weight:700}
          .meta,.totals{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:14px 0}
          .box{border:1px solid #d8e7f7;background:#f8fbff;border-radius:14px;padding:10px}
          .box span{display:block;color:#64748B;font-size:12px;font-weight:800}.box strong{display:block;margin-top:5px}
          table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border-bottom:1px solid #e3edf8;padding:10px;text-align:start;font-size:12px}th{background:#eef7ff;color:#334155}
          @media print{body{background:white;padding:0}.page{border:0;border-radius:0}}
        </style>
      </head>
      <body>
        <main class="page">
          <header>
            <div><div class="brand">THE SFM</div><h1>${escapeHtml(title)}</h1></div>
            <div class="muted">${escapeHtml(text.generatedAt)}: ${escapeHtml(new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()))}</div>
          </header>
          <section class="meta">
            ${filters.map((item) => `<div class="box"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join('')}
          </section>
          <section class="totals">
            ${totals.map((item) => `<div class="box"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join('')}
          </section>
          <table>
            <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </main>
        <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script>
      </body>
    </html>
  `);
  report.document.close();
  return true;
}

export function saleExportColumns(lang: BusinessLang, currency: string) {
  const text = BUSINESS_TEXT[lang];
  return [
    { key: 'invoice_number', label: text.invoiceNumber, value: (row: any) => row.invoice_number || '' },
    { key: 'customer_name', label: text.customerName, value: (row: any) => row.customer_name || '' },
    { key: 'product_or_service', label: text.productService, value: (row: any) => row.product_or_service || '' },
    { key: 'amount', label: text.amount, value: (row: any) => formatMoney(numericValue(row.amount), row.currency || currency, lang) },
    { key: 'status', label: text.status, value: (row: any) => saleStatusLabel(row.status, lang) },
    { key: 'sale_date', label: text.saleDate, value: (row: any) => row.sale_date ? formatDate(row.sale_date, lang) : '' },
    { key: 'notes', label: text.notes, value: (row: any) => row.notes || '' },
  ];
}

export function employeeExportColumns(lang: BusinessLang, currency: string) {
  const text = BUSINESS_TEXT[lang];
  return [
    { key: 'employee_name', label: text.employeeName, value: (row: any) => row.employee_name || '' },
    { key: 'role', label: text.role, value: (row: any) => row.role || '' },
    { key: 'department', label: text.department, value: (row: any) => row.department || '' },
    { key: 'salary', label: text.salary, value: (row: any) => formatMoney(numericValue(row.salary), currency, lang) },
    { key: 'bonus', label: text.bonus, value: (row: any) => formatMoney(numericValue(row.bonus), currency, lang) },
    { key: 'status', label: text.status, value: (row: any) => employeeStatusLabel(row.status, lang) },
    { key: 'payroll_due_day', label: text.payrollDueDay, value: (row: any) => row.payroll_due_day || 25 },
    { key: 'join_date', label: text.joinDate, value: (row: any) => row.join_date ? formatDate(row.join_date, lang) : '' },
    { key: 'notes', label: text.notes, value: (row: any) => row.notes || '' },
  ];
}

export function monthLabel(value: string, lang: BusinessLang) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

export function aggregateBy<T>(rows: T[], getKey: (row: T) => string, getValue: (row: T) => number) {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const key = getKey(row) || '-';
    map.set(key, (map.get(key) ?? 0) + getValue(row));
  });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export function nextPayrollDate(day: number, base = new Date()) {
  const normalized = Math.max(1, Math.min(Number.isFinite(day) ? day : 25, 31));
  const candidate = new Date(base.getFullYear(), base.getMonth(), normalized);
  if (candidate < new Date(base.getFullYear(), base.getMonth(), base.getDate())) {
    return new Date(base.getFullYear(), base.getMonth() + 1, normalized);
  }
  return candidate;
}

export function daysBetweenCalendar(from: Date, to: Date) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((end - start) / 86400000);
}
