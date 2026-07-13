'use client';

import { formatDate, formatDateTime, formatNumber, normalizeDigits } from '@/lib/locale';
import {
  semanticStandaloneDocumentStyles,
  semanticStandaloneStylesheetLinks,
} from '@/lib/visual-system/standaloneDocument';

export type FeasibilityExportLang = 'ar' | 'en' | 'fr';

type FeasibilityExportInput = {
  projectName: string;
  currency?: string | null;
  financialData?: Record<string, unknown> | null;
  feasibilityScore?: number | string | null;
  feasibilityStatus?: string | null;
  reportDate?: string | null;
  recommendations?: unknown;
};

export type FeasibilityStudyExportRow = {
  project_name: string;
  report_date: string;
  currency: string;
  capital: string;
  total_revenue: string;
  total_expenses: string;
  net_profit: string;
  break_even: string;
  score: string;
  status: string;
  recommendations: string;
};

const FINANCIAL_EXPORT_FIELDS = new Set<keyof FeasibilityStudyExportRow>([
  'currency',
  'capital',
  'total_revenue',
  'total_expenses',
  'net_profit',
  'break_even',
  'score',
]);

const NOT_SPECIFIED: Record<FeasibilityExportLang, string> = {
  ar: 'غير متوفر',
  en: 'Not available',
  fr: 'Non disponible',
};

const MONTHS: Record<FeasibilityExportLang, string> = {
  ar: 'شهر',
  en: 'months',
  fr: 'mois',
};

const STATUS_LABELS: Record<FeasibilityExportLang, Record<string, string>> = {
  ar: {
    feasible: 'قابل للتنفيذ',
    needs_review: 'يحتاج مراجعة',
    high_risk: 'مخاطر مرتفعة',
  },
  en: {
    feasible: 'Feasible',
    needs_review: 'Needs review',
    high_risk: 'High risk',
  },
  fr: {
    feasible: 'Faisable',
    needs_review: 'À revoir',
    high_risk: 'Risque élevé',
  },
};

const PDF_LABELS: Record<FeasibilityExportLang, Record<keyof FeasibilityStudyExportRow, string>> = {
  ar: {
    project_name: 'اسم المشروع',
    report_date: 'تاريخ التقرير',
    currency: 'العملة',
    capital: 'رأس المال',
    total_revenue: 'الإيرادات',
    total_expenses: 'المصروفات',
    net_profit: 'صافي الربح',
    break_even: 'نقطة التعادل',
    score: 'التقييم/الدرجة',
    status: 'الحالة',
    recommendations: 'التوصيات',
  },
  en: {
    project_name: 'Project name',
    report_date: 'Report date',
    currency: 'Currency',
    capital: 'Capital',
    total_revenue: 'Revenue',
    total_expenses: 'Expenses',
    net_profit: 'Net profit',
    break_even: 'Break-even point',
    score: 'Score',
    status: 'Status',
    recommendations: 'Recommendations',
  },
  fr: {
    project_name: 'Nom du projet',
    report_date: 'Date du rapport',
    currency: 'Devise',
    capital: 'Capital',
    total_revenue: 'Revenus',
    total_expenses: 'Dépenses',
    net_profit: 'Bénéfice net',
    break_even: 'Seuil de rentabilité',
    score: 'Évaluation / score',
    status: 'Statut',
    recommendations: 'Recommandations',
  },
};

function numberValue(value: unknown) {
  const number = Number(normalizeDigits(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : null;
}

function firstNumber(values: unknown[]) {
  for (const value of values) {
    const number = numberValue(value);
    if (number !== null) return number;
  }
  return null;
}

function firstText(values: unknown[]) {
  for (const value of values) {
    const text = normalizeDigits(value).trim();
    if (text) return text;
  }
  return '';
}

function moneyValue(value: number | null, currency: string, lang: FeasibilityExportLang) {
  if (value === null) return NOT_SPECIFIED[lang];
  const amount = formatNumber(value, lang, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return lang === 'en' ? `${currency} ${amount}` : `${amount} ${currency}`;
}

function recommendationText(value: unknown, lang: FeasibilityExportLang) {
  if (Array.isArray(value)) {
    const items = value.map(item => normalizeDigits(item).trim()).filter(Boolean);
    return items.length ? items.join('، ') : NOT_SPECIFIED[lang];
  }
  if (value && typeof value === 'object') {
    const items = Object.values(value).map(item => normalizeDigits(item).trim()).filter(Boolean);
    return items.length ? items.join('، ') : NOT_SPECIFIED[lang];
  }
  return normalizeDigits(value).trim() || NOT_SPECIFIED[lang];
}

export function buildFeasibilityStudyExportRow(input: FeasibilityExportInput, lang: FeasibilityExportLang): FeasibilityStudyExportRow {
  const financial = input.financialData ?? {};
  const currency = String(input.currency || 'KWD').toUpperCase();
  const capital = firstNumber([
    financial['requiredCapital'],
    financial['required_capital'],
    financial['capital'],
    financial['initialCapital'],
    financial['initial_capital'],
  ]);
  const revenue = firstNumber([
    financial['expectedMonthlyRevenue'],
    financial['expected_monthly_revenue'],
    financial['monthlyRevenue'],
    financial['monthly_revenue'],
    financial['totalRevenue'],
    financial['total_revenue'],
    financial['revenue'],
  ]);
  const expenses = firstNumber([
    financial['monthlyOpex'],
    financial['monthly_opex'],
    financial['monthlyExpenses'],
    financial['monthly_expenses'],
    financial['totalExpenses'],
    financial['total_expenses'],
    financial['expenses'],
  ]);
  const netProfit = revenue !== null && expenses !== null ? revenue - expenses : null;
  const capex = firstNumber([financial['capex'], financial['capitalExpenses'], financial['capital_expenses']]);
  const breakEvenMonths = firstNumber([
    financial['breakEvenMonths'],
    financial['break_even_months'],
    financial['breakEven'],
    financial['break_even'],
  ]) ?? (capex !== null && netProfit !== null && netProfit > 0 ? capex / netProfit : null);
  const breakEvenText = firstText([financial['breakEvenPoint'], financial['break_even_point']])
    || (breakEvenMonths !== null ? `${formatNumber(breakEvenMonths, lang, { maximumFractionDigits: 1 })} ${MONTHS[lang]}` : NOT_SPECIFIED[lang]);
  const scoreNumber = numberValue(input.feasibilityScore);
  const status = String(input.feasibilityStatus || '').trim();

  return {
    project_name: normalizeDigits(input.projectName) || NOT_SPECIFIED[lang],
    report_date: input.reportDate ? (formatDate(input.reportDate, lang) || NOT_SPECIFIED[lang]) : formatDate(new Date().toISOString(), lang),
    currency,
    capital: moneyValue(capital, currency, lang),
    total_revenue: moneyValue(revenue, currency, lang),
    total_expenses: moneyValue(expenses, currency, lang),
    net_profit: moneyValue(netProfit, currency, lang),
    break_even: breakEvenText,
    score: scoreNumber === null ? NOT_SPECIFIED[lang] : `${formatNumber(scoreNumber, lang, { maximumFractionDigits: 0 })}/100`,
    status: STATUS_LABELS[lang][status] || status || NOT_SPECIFIED[lang],
    recommendations: recommendationText(input.recommendations ?? financial['recommendations'], lang),
  };
}

function cleanPdfText(value: unknown) {
  return normalizeDigits(value)
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
    .replace(/'/g, '&#39;');
}

export function printFeasibilityStudyToPdf(options: {
  title: string;
  rows: FeasibilityStudyExportRow[];
  lang: FeasibilityExportLang;
  dir?: 'rtl' | 'ltr';
}) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=980,height=720');
  if (!printWindow) throw new Error('PDF print window was blocked');

  const labels = PDF_LABELS[options.lang];
  const dir = options.dir ?? (options.lang === 'ar' ? 'rtl' : 'ltr');
  const generatedAtLabel = options.lang === 'ar' ? 'تاريخ الإنشاء' : options.lang === 'fr' ? 'Généré le' : 'Generated at';
  const generatedAt = formatDateTime(new Date(), options.lang);
  const emptyLabel = options.lang === 'ar'
    ? 'لا توجد بيانات دراسة جدوى جاهزة للتصدير.'
    : options.lang === 'fr'
      ? 'Aucune donnée de faisabilité prête à exporter.'
      : 'No feasibility study data is ready to export.';
  const cards = options.rows.length ? options.rows.map(row => `
    <section class="report-card">
      ${Object.entries(row).map(([key, value]) => {
        const field = key as keyof FeasibilityStudyExportRow;
        const valueClass = FINANCIAL_EXPORT_FIELDS.has(field) ? ' class="financial-value"' : '';
        return `
          <div class="report-item">
            <span>${escapeHtml(labels[field] ?? key)}</span>
            <strong${valueClass}>${escapeHtml(value)}</strong>
          </div>
        `;
      }).join('')}
    </section>
  `).join('') : `<section class="empty-state">${escapeHtml(emptyLabel)}</section>`;

  printWindow.document.write(`
    <!doctype html>
    <html lang="${options.lang}" dir="${dir}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(options.title)}</title>
        ${semanticStandaloneStylesheetLinks()}
        <style>
          ${semanticStandaloneDocumentStyles()}
          * { box-sizing: border-box; }
          @page { size: A4; margin: 12mm; }
          body {
            margin: 0;
            padding: 24px;
            background: var(--background);
            color: var(--foreground);
            font-family: var(--font-ui);
            line-height: 1.65;
          }
          .page {
            overflow: hidden;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-panel);
            box-shadow: var(--shadow-card);
          }
          header {
            background: var(--primary);
            color: var(--primary-foreground);
            padding: 28px 30px;
          }
          .brand {
            display: inline-flex;
            border: 1px solid color-mix(in srgb, var(--primary-foreground) 24%, transparent);
            background: color-mix(in srgb, var(--primary-foreground) 12%, transparent);
            border-radius: var(--radius-pill);
            padding: 8px 12px;
            color: var(--primary-foreground);
            font-size: 12px;
            font-weight: 600;
          }
          h1 {
            margin: 12px 0 6px;
            color: var(--primary-foreground);
            font-size: 30px;
            line-height: 1.25;
            font-weight: 700;
          }
          .header-meta {
            color: var(--primary-foreground);
            font-size: 12px;
            font-weight: 500;
          }
          .content {
            padding: 24px;
          }
          .report-card {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            break-inside: avoid;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-card);
            padding: 18px;
            margin-bottom: 16px;
          }
          .report-item {
            border: 1px solid var(--border);
            background: var(--surface-muted);
            border-radius: var(--radius-control);
            padding: 13px;
            min-height: 72px;
          }
          .report-item span {
            display: block;
            color: var(--foreground-muted);
            font-weight: 500;
            font-size: 12px;
            margin-bottom: 8px;
          }
          .report-item strong {
            display: block;
            color: var(--foreground);
            font-weight: 600;
            font-size: 16px;
            line-height: 1.6;
            overflow-wrap: anywhere;
          }
          .report-item strong.financial-value {
            font-family: var(--font-data);
          }
          .empty-state {
            border: 1px solid var(--border);
            background: var(--surface-muted);
            border-radius: var(--radius-card);
            padding: 28px;
            color: var(--foreground-muted);
            font-weight: 500;
            text-align: center;
          }
          footer {
            border-top: 1px solid var(--border);
            background: var(--surface-muted);
            padding: 14px 24px;
            color: var(--foreground-muted);
            font-size: 11px;
            font-weight: 500;
          }
          @media print {
            body { background: var(--surface); padding: 0; }
            .page { border: 0; border-radius: 0; box-shadow: none; }
            .content { padding: 18px; }
          }
          @media (max-width: 720px) {
            body { padding: 18px; }
            .report-card { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <header>
            <div class="brand">THE SFM</div>
            <h1>${escapeHtml(options.title)}</h1>
            <div class="header-meta">${escapeHtml(generatedAtLabel)}: ${escapeHtml(generatedAt)}</div>
          </header>
          <section class="content">${cards}</section>
          <footer>THE SFM</footer>
        </main>
        <script>
          window.setTimeout(function () {
            window.focus();
            window.print();
          }, 150);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
