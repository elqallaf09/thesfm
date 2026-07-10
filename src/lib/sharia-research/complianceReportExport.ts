import { formatDate, formatDateTime, formatPercent } from '@/lib/locale';
import type { Lang } from '@/lib/translations';
import type { ShariaResearchTranslator } from '@/lib/translations/sharia-research';
import type { ShariaScreeningResult, SourceType } from './types';
import type { ReportSource } from './reportPresentation';
import { classificationTranslationKey, reportSourceEvidence } from './reportPresentation';

export type ExportRatio = {
  name: string;
  value: number | null;
  threshold: number;
  status: string;
  explanation: string;
};

type ComplianceReportExportOptions = {
  result: ShariaScreeningResult;
  locale: Lang;
  tr: ShariaResearchTranslator;
  ratios: ExportRatio[];
  sources: ReportSource[];
  conclusion: string;
  limitations: string;
};

function clean(value: unknown) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function html(value: unknown) {
  return clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function externalUrl(value: string) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '#';
  } catch {
    return '#';
  }
}

function sourceInformation(sourceType: SourceType, tr: ShariaResearchTranslator) {
  if (['company_ir', 'annual_report', 'quarterly_report', 'fund_prospectus'].includes(sourceType)) return tr('sharia_research_extracted_company');
  if (sourceType === 'exchange_filing') return tr('sharia_research_extracted_listing');
  if (sourceType === 'regulatory_filing' || sourceType === 'financial_data') return tr('sharia_research_extracted_financial');
  if (sourceType === 'methodology' || sourceType === 'sharia_board_document') return tr('sharia_research_extracted_methodology');
  if (sourceType === 'news' || sourceType === 'rss') return tr('sharia_research_extracted_news');
  return tr('sharia_research_extracted_general');
}

export function openCompliancePdfReport({
  result,
  locale,
  tr,
  ratios,
  sources,
  conclusion,
  limitations,
}: ComplianceReportExportOptions) {
  const report = window.open('', '_blank', 'width=980,height=760');
  if (!report) return false;
  report.opener = null;
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const companyName = locale === 'ar' && result.security.nameAr ? result.security.nameAr : result.security.name;
  const title = `${tr('sharia_research_report_title')} — ${result.security.ticker}`;
  const sourceRows = sources.slice(0, 12).map(source => {
    const document = source.document;
    const findings = reportSourceEvidence(source, result.evidence).slice(0, 2);
    const info = findings.length > 0 ? findings.join(' · ') : sourceInformation(document.sourceType, tr);
    return `<li><div><strong>${html(document.publisher || document.sourceTitle)}</strong><span>${html(formatDate(document.publicationDate || document.filingDate || document.retrievalDate, locale) || tr('sharia_research_unavailable_value'))}</span></div><p dir="auto">${html(info)}</p><a href="${html(externalUrl(document.sourceUrl))}" target="_blank" rel="noreferrer">${html(tr('sharia_research_open_source'))}</a></li>`;
  }).join('');
  const ratioRows = ratios.map(ratio => `<tr>
    <th>${html(ratio.name)}</th>
    <td>${html(ratio.value === null ? tr('sharia_research_unavailable_value') : formatPercent(ratio.value, locale, { maximumFractionDigits: 2 }))}</td>
    <td>≤ ${html(formatPercent(ratio.threshold, locale, { maximumFractionDigits: 2 }))}</td>
    <td>${html(ratio.status)}</td>
    <td>${html(ratio.explanation)}</td>
  </tr>`).join('');
  const status = tr(classificationTranslationKey(result.classification));
  report.document.write(`<!doctype html>
    <html lang="${locale}" dir="${direction}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${html(title)}</title>
        <style>
          @page{size:A4;margin:13mm}
          *{box-sizing:border-box}
          body{margin:0;background:#fff;color:#102238;font-family:Tajawal,"Segoe UI",Arial,sans-serif;font-size:12px;line-height:1.65}
          main{width:100%;margin:0 auto}
          header{border:1px solid #d8e3e8;border-top:5px solid #0e8a7a;border-radius:12px;padding:18px 20px;margin-bottom:14px}
          .brand{color:#0e7367;font-weight:900;letter-spacing:.08em}.title{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-top:8px}.title h1{margin:0;font-size:24px;line-height:1.25}.title strong{font-size:20px;color:#0a5f56}
          .identity,.summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:13px}.fact{border:1px solid #e0e8ec;border-radius:8px;padding:8px 10px}.fact span{display:block;color:#5b6b78;font-size:10px}.fact b{display:block;margin-top:2px;font-size:12px;overflow-wrap:anywhere}
          section{break-inside:avoid;margin-top:14px}h2{margin:0 0 7px;font-size:15px;color:#12344d;border-bottom:1px solid #dce6ea;padding-bottom:5px}p{margin:0;color:#435767}
          table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #dce6ea;padding:7px;text-align:start;vertical-align:top;overflow-wrap:anywhere}thead th{background:#f3f8f8;color:#17465a;font-size:10px}tbody th{font-size:11px}
          ul{list-style:none;padding:0;margin:0;display:grid;gap:7px}li{border:1px solid #e0e8ec;border-radius:8px;padding:8px 10px;break-inside:avoid}li div{display:flex;justify-content:space-between;gap:10px}li span{color:#667986;font-size:10px}li p{margin-top:3px;font-size:11px}a{color:#087468;text-decoration:none;font-weight:800}
          .disclaimer{margin-top:14px;border:1px solid #d9c999;border-inline-start:4px solid #b7791f;border-radius:9px;padding:9px 11px;background:#fffdf7}.footer{display:flex;justify-content:space-between;gap:12px;margin-top:14px;padding-top:8px;border-top:1px solid #dce6ea;color:#697985;font-size:10px}
          @media(max-width:700px){.identity,.summary{grid-template-columns:1fr}.title{display:grid}table{font-size:10px}}
          @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}a{color:#087468}}
        </style>
      </head>
      <body>
        <main>
          <header>
            <div class="brand">THE SFM</div>
            <div class="title"><h1>${html(tr('sharia_research_report_title'))}</h1><strong>${html(status)}</strong></div>
            <div class="identity">
              <div class="fact"><span>${html(tr('sharia_research_report_company'))}</span><b>${html(companyName)}</b></div>
              <div class="fact"><span>${html(tr('sharia_research_symbol'))}</span><b dir="ltr">${html(result.security.ticker)}</b></div>
              <div class="fact"><span>${html(tr('sharia_research_exchange'))}</span><b>${html([result.security.exchange, result.security.country].filter(Boolean).join(' · '))}</b></div>
            </div>
            <div class="summary">
              <div class="fact"><span>${html(tr('sharia_research_confidence'))}</span><b>${html(formatPercent(result.confidence / 100, locale, { maximumFractionDigits: 0 }))}</b></div>
              <div class="fact"><span>${html(tr('sharia_research_verified'))}</span><b>${html(formatDateTime(result.security.lastVerifiedAt || result.retrievedAt, locale))}</b></div>
              <div class="fact"><span>${html(tr('sharia_research_last_report'))}</span><b>${html(formatDate(result.lastFinancialReportDate, locale) || tr('sharia_research_unavailable_value'))}</b></div>
            </div>
          </header>
          <section><h2>${html(tr('sharia_research_conclusion'))}</h2><p>${html(conclusion)}</p></section>
          <section><h2>${html(tr('sharia_research_ratios_title'))}</h2><table><thead><tr><th>${html(tr('sharia_research_ratios_title'))}</th><th>${html(tr('sharia_research_actual_value'))}</th><th>${html(tr('sharia_research_allowed_threshold'))}</th><th>${html(tr('sharia_research_result_title'))}</th><th>${html(tr('sharia_research_business_explanation'))}</th></tr></thead><tbody>${ratioRows}</tbody></table></section>
          <section><h2>${html(tr('sharia_research_report_evidence'))}</h2><ul>${sourceRows || `<li>${html(tr('sharia_research_unavailable_value'))}</li>`}</ul></section>
          <section><h2>${html(tr('sharia_research_limitations'))}</h2><p>${html(limitations)}</p></section>
          <div class="disclaimer"><strong>${html(tr('sharia_research_disclaimer_title'))}</strong><p>${html(tr('sharia_research_disclaimer'))}</p></div>
          <div class="footer"><span>THE SFM</span><span>${html(tr('sharia_research_report_generated'))}: ${html(formatDateTime(new Date(), locale))}</span></div>
        </main>
        <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script>
      </body>
    </html>`);
  report.document.close();
  return true;
}
