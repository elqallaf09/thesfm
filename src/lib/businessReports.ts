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

function cleanPdfText(value: unknown) {
  return String(value ?? '')
    .replace(/\u00C2\u00B7/g, ' | ')
    .replace(/\u00B7/g, ' | ')
    .replace(/\uFFFD/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value: unknown) {
  return cleanPdfText(value)
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
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const generatedAt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const noDataLabel = lang === 'ar' ? 'لا توجد بيانات في هذا التقرير.' : lang === 'fr' ? 'Aucune donnée dans ce rapport.' : 'No data in this report.';
  const filtersLabel = lang === 'ar' ? 'الفلاتر' : lang === 'fr' ? 'Filtres' : 'Filters';
  const totalsLabel = lang === 'ar' ? 'الملخص' : lang === 'fr' ? 'Résumé' : 'Summary';
  const rowsLabel = lang === 'ar' ? 'السجلات' : lang === 'fr' ? 'Lignes' : 'Rows';
  const bodyRows = rows.length > 0
    ? rows.map((row) => `
      <tr>${columns.map((column) => `<td>${escapeHtml(column.value(row))}</td>`).join('')}</tr>
    `).join('')
    : `<tr><td class="empty-cell" colspan="${Math.max(columns.length, 1)}">${escapeHtml(noDataLabel)}</td></tr>`;
  report.document.write(`
    <!doctype html>
    <html lang="${lang}" dir="${dir}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page{size:A4;margin:12mm}
          *{box-sizing:border-box}
          body{font-family:Tajawal,Arial,sans-serif;background:#eef6ff;color:#071a2f;margin:0;padding:24px;line-height:1.65}
          .page{background:#fff;border:1px solid #d8e7f7;border-radius:26px;overflow:hidden;box-shadow:0 22px 60px rgba(3,18,37,.10)}
          header{background:linear-gradient(135deg,#061a2e,#0b3558 58%,#18d4d4);color:#fff;padding:28px 30px;display:flex;justify-content:space-between;gap:20px;align-items:flex-start}
          h1{margin:10px 0 0;font-size:30px;line-height:1.25;font-weight:950;letter-spacing:0}
          .brand{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.10);border-radius:999px;padding:8px 12px;font-size:12px;font-weight:950;color:#9ff8ef}
          .muted{border:1px solid rgba(255,255,255,.20);background:rgba(6,26,46,.30);border-radius:16px;padding:10px 12px;color:#d9fbff;font-size:12px;font-weight:850;text-align:start;max-width:260px}
          .content{padding:24px}
          .section-title{margin:0 0 10px;color:#0b3558;font-size:14px;font-weight:950}
          .meta,.totals{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:0 0 18px}
          .box{border:1px solid #d8e7f7;background:linear-gradient(135deg,#f8fbff,#eefaff);border-radius:16px;padding:13px 14px;min-height:76px}
          .box span{display:block;color:#64748b;font-size:11px;font-weight:900}.box strong{display:block;margin-top:6px;color:#061a2e;font-size:14px;font-weight:950;overflow-wrap:anywhere}
          .table-wrap{border:1px solid #d8e7f7;border-radius:18px;overflow:hidden;background:#fff}
          table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border-bottom:1px solid #e3edf8;padding:11px 12px;text-align:start;font-size:11px;vertical-align:top;overflow-wrap:anywhere}th{background:#eef7ff;color:#0b3558;font-weight:950}.empty-cell{text-align:center;color:#64748b;font-weight:850;padding:26px}
          footer{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #e3edf8;background:#f8fbff;padding:14px 24px;color:#64748b;font-size:11px;font-weight:850}
          @media print{body{background:white;padding:0}.page{border:0;border-radius:0;box-shadow:none}header{border-radius:0}.content{padding:18px}footer{padding:12px 18px}}
          @media(max-width:720px){body{padding:14px}header{display:grid;padding:22px}.content{padding:16px}.meta,.totals{grid-template-columns:1fr}}
        </style>
      </head>
      <body>
        <main class="page">
          <header>
            <div><div class="brand">THE SFM</div><h1>${escapeHtml(title)}</h1></div>
            <div class="muted">${escapeHtml(text.generatedAt)}: ${escapeHtml(generatedAt)}</div>
          </header>
          <section class="content">
            ${filters.length ? `<h2 class="section-title">${escapeHtml(filtersLabel)}</h2><section class="meta">${filters.map((item) => `<div class="box"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join('')}</section>` : ''}
            ${totals.length ? `<h2 class="section-title">${escapeHtml(totalsLabel)}</h2><section class="totals">${totals.map((item) => `<div class="box"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join('')}</section>` : ''}
            <h2 class="section-title">${escapeHtml(rowsLabel)}</h2>
            <div class="table-wrap">
              <table>
                <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead>
                <tbody>${bodyRows}</tbody>
              </table>
            </div>
          </section>
          <footer><span>THE SFM</span><span>${escapeHtml(title)}</span></footer>
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
  const percentFormatter = new Intl.NumberFormat(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 });
  return [
    { key: 'employee_name', label: text.employeeName, value: (row: any) => row.name || row.employee_name || '' },
    { key: 'role', label: text.role, value: (row: any) => row.role || '' },
    { key: 'department', label: text.department, value: (row: any) => row.department || '' },
    { key: 'salary', label: text.salary, value: (row: any) => formatMoney(numericValue(row.salary), row.currency || currency, lang) },
    { key: 'skill_level', label: text.skillLevel, value: (row: any) => `${percentFormatter.format(numericValue(row.skill_level))}%` },
    { key: 'status', label: text.status, value: (row: any) => employeeStatusLabel(row.status, lang) },
    { key: 'salary_day', label: text.payrollDueDay, value: (row: any) => row.salary_day || row.payroll_due_day || 25 },
    { key: 'join_date', label: text.joinDate, value: (row: any) => row.join_date ? formatDate(row.join_date, lang) : '' },
    { key: 'notes', label: text.notes, value: (row: any) => row.notes || '' },
  ];
}

export function monthLabel(value: string, lang: BusinessLang) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1));
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
