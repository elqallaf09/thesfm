"""One-time, exact replacements for the recovered #139 implementation.
Runs only on the feature branch; a mismatched source aborts rather than guessing.
"""
from pathlib import Path

def replace(path, old, new):
    target = Path(path)
    text = target.read_text()
    if text.count(old) != 1:
        raise RuntimeError(f'Expected one integration anchor in {path}: {old[:65]!r}')
    target.write_text(text.replace(old, new, 1))

root='src/lib/sharia-research/'
replace(root+'types.ts', "  filedAt: string | null;\n  currency: string;", "  filedAt: string | null;\n  reportedAt?: string | null;\n  sourceDateKind?: 'issuer_report_signature';\n  currency: string;")
replace(root+'types.ts', 'export type ShariaScreeningResult = {', "export type FieldCoverage = {\n  field: NormalizedFinancialField;\n  state: 'missing' | 'outdated_period' | 'invalid' | 'exact' | 'bounded';\n  reportedValues: number;\n  financialPeriod: string | null;\n};\n\nexport type ShariaScreeningResult = {\n  fieldCoverage?: FieldCoverage[];")
replace(root+'secFinancialExtraction.ts', 'export type SecFacts = { entityName?: string;', 'export type SecFacts = { reportingPeriod?: string; expectedAccession?: string; entityName?: string;')
replace(root+'secFinancialExtraction.ts', '.find(fact => !fact.start && fact.val > 0);', ".find(fact => !fact.start && fact.val > 0\n    && (!(payload.reportingPeriod ?? document.reportingPeriod) || fact.end === (payload.reportingPeriod ?? document.reportingPeriod))\n    && (!payload.expectedAccession || fact.accn === payload.expectedAccession));")
replace(root+'inlineXbrl.ts', '  return { facts };', '  return { facts, reportingPeriod: filing.reportDate, expectedAccession: filing.accessionNumber };')
replace(root+'secFinancialExtraction.ts', "  emit('accounts_receivable', [select(us('AccountsReceivableNetCurrent', 'AccountsReceivableNet'))], 'lower', 'Reported net receivables; unreported non-current receivables are not assumed zero.');", """  const totalReceivables = select(us('AccountsReceivableNet'));
  const currentReceivables = select(us('AccountsReceivableNetCurrent'));
  const noncurrentReceivables = select(us('AccountsReceivableNetNoncurrent'));
  if (totalReceivables) emit('accounts_receivable', [totalReceivables], 'exact', 'Reported consolidated net accounts receivable.');
  else emit('accounts_receivable', [currentReceivables, noncurrentReceivables], currentReceivables && noncurrentReceivables ? 'exact' : 'lower',
    'Disjoint reported current and non-current net receivables; absent components were not assumed zero.');""")
replace(root+'secFinancialExtraction.ts', "  // Debt securities are NOT interchangeable", """  emit('interest_bearing_debt', [select([...us('Liabilities'), ...ifrs('Liabilities')])], 'upper',
    'All consolidated liabilities conservatively bound interest-bearing debt above. This is not an exact debt amount.');

  // Debt securities are NOT interchangeable""")
replace(root+'secFinancialExtraction.ts', "  emit('interest_bearing_securities', debtSecurities ? [debtSecurities] : [currentSecurities, longSecurities], 'lower', 'Disclosed debt-security lower bound; unknown trading/held-to-maturity categories are not zero.');", """  const securityParts = (debtSecurities ? [debtSecurities] : [currentSecurities, longSecurities]).filter((fact): fact is Fact => Boolean(fact));
  if (securityParts.length) {
    emit('interest_bearing_securities', securityParts, 'lower', 'Disclosed debt-security lower bound; possible cash-equivalent overlap is deducted conservatively.');
    const item = values[values.length - 1];
    // Broad debt-security notes may already include cash equivalents. Removing
    // the entire reported cash balance yields a safe disjoint LOWER bound, not
    // a claim that the remaining amount is the actual investment balance.
    item.value = cash ? Math.max(0, item.value - cash.val) : 0;
    item.normalizationFormula = cash
      ? `max(0, (${item.originalField}) - ${cash.taxonomy}:${cash.tag}) to avoid overlapping cash equivalents`
      : 'No non-overlapping positive lower bound without the cash-equivalent balance; this derived zero is NOT a reported zero.';
    item.validation!.note = item.normalizationFormula;
  }""")
# A primary filing and its SEC aggregate are comparable only for the identical
# accession/context; no unrelated host or period acquires equivalence.
replace(root+'evidenceValidation.ts', "left.accessionNumber === right.accessionNumber && new URL(left.sourceUrl).hostname === new URL(right.sourceUrl).hostname", "left.accessionNumber === right.accessionNumber && (new URL(left.sourceUrl).hostname === new URL(right.sourceUrl).hostname\n        || [left.sourceUrl, right.sourceUrl].every(url => ['www.sec.gov', 'data.sec.gov'].includes(new URL(url).hostname)))")
replace(root+'financialRatioCalculator.ts', "    const groups = rule.numeratorFields.map", """    if (denominator && values.some(value => value !== denominator && value.normalizedField === rule.denominatorField
      && compatibleFinancialValues(value, denominator) && validFinancialValue(value, now)
      && value.validation?.bound === 'exact' && value.value !== denominator.value)) {
      return { ruleId: rule.id, name: rule.name, nameAr: rule.nameAr, nameFr: rule.nameFr,
        numerator: null, denominator: null, value: null, threshold: rule.threshold, operator: rule.operator,
        formula: 'Conflicting current denominator values', status: 'unavailable', reportingPeriod: denominator.periodEnd,
        currency: denominator.currency, inputs: [denominator], warning: 'Conflicting compatible denominator evidence.' };
    }
    const groups = rule.numeratorFields.map""")
replace(root+'shariaAnalyzer.ts', 'EVIDENCE_VERSION, missingFinancialFields, validFinancialValue', 'EVIDENCE_VERSION, missingFinancialFields, validFinancialValue, financialFieldCoverage')
replace(root+'shariaAnalyzer.ts', '    evidenceVersion: EVIDENCE_VERSION,', '    evidenceVersion: EVIDENCE_VERSION,\n    fieldCoverage: financialFieldCoverage(supportedValues, lastFinancialReportDate, new Date(retrievedAt)),')
replace(root+'catalogSync.ts', 'filedAt: value.filedAt, sourceUrl:', 'filedAt: value.filedAt, reportedAt: value.reportedAt, sourceDateKind: value.sourceDateKind, sourceUrl:')
replace(root+'catalogSync.ts', '      missingFinancialFields: result.missingFinancialFields', '      fieldCoverage: result.fieldCoverage ?? [],\n      missingFinancialFields: result.missingFinancialFields')
replace(root+'catalogSync.ts', '  return text;\n}', "  if (['XKUW', 'BOURSA KUWAIT', 'BOURSA KUWAIT - PREMIER MARKET', 'BOURSA KUWAIT - MAIN MARKET', 'KUWAIT STOCK EXCHANGE'].includes(text)) return 'XKUW';\n  return text;\n}")
replace(root+'orchestrator.ts', "import { annualReportsAdapter }", "import { regionalFilingsAdapter } from './regionalFilings';\nimport { annualReportsAdapter }")
replace(root+'orchestrator.ts', '  annualReportsAdapter,\n', '  annualReportsAdapter,\n  regionalFilingsAdapter,\n')

replace(root+'secureFetch.ts', "import 'server-only';", "import 'server-only';\nimport { validatePublicReadForm } from './publicReadForm';\nexport { validatePublicReadForm } from './publicReadForm';")
replace(root+'secureFetch.ts', 'export type SecureFetchOptions = {', 'export type SecureFetchOptions = {\n  publicReadForm?: Record<string, string>;')
replace(root+'secureFetch.ts', "  return `${url.toString()}|${(options.acceptedContentTypes ?? []).join(',')}`;", "  return `${url.toString()}|${(options.acceptedContentTypes ?? []).join(',')}|${options.publicReadForm ? validatePublicReadForm(url, options.publicReadForm) : ''}`;")
replace(root+'secureFetch.ts', '      ...options,\n      maxBytes: 512', '      ...options,\n      publicReadForm: undefined,\n      maxBytes: 512')
replace(root+'secureFetch.ts', "    method: 'GET',\n    headers: requestHeaders(options, accepted),", "    method: options.publicReadForm ? 'POST' : 'GET',\n    headers: options.publicReadForm ? { ...requestHeaders(options, accepted), 'content-type': 'application/x-www-form-urlencoded' } : requestHeaders(options, accepted),")
replace(root+'secureFetch.ts', "    request.end();", "    request.end(options.publicReadForm ? validatePublicReadForm(url, options.publicReadForm) : undefined);")
replace(root+'secureFetch.ts', "    if (response.status >= 300 && response.status < 400) {", "    if (response.status >= 300 && response.status < 400) {\n      if (options.publicReadForm) { await discardResponseBody(response); throw new UnsafeUrlError('PUBLIC_READ_REDIRECT_BLOCKED', 'Public read form redirects are not allowed.'); }")
replace(root+'secureFetch.ts', "  options.signal?.throwIfAborted();\n  const resolveSignal", "  options.signal?.throwIfAborted();\n  if (options.publicReadForm) {\n    validatePublicReadForm(input, options.publicReadForm);\n    if (Object.keys(options.headers ?? {}).some(key => /^(authorization|cookie|proxy-authorization)$/i.test(key))) throw new UnsafeUrlError('PUBLIC_READ_CREDENTIALS_BLOCKED', 'Public reads cannot carry credentials.');\n  }\n  const resolveSignal")

replace('src/lib/market/shariahSelfScreening.ts', "import { enrichShariahScreeningData }", "import { reviewFundEvidence } from './shariahFundReview';\nimport { enrichShariahScreeningData }")
replace('src/lib/market/shariahSelfScreening.ts', 'name: string; exchange: string; country: string; updated_at: string', 'name: string; exchange: string; country: string; asset_type: string; updated_at: string')
replace('src/lib/market/shariahSelfScreening.ts', 'let patch: ReturnType<typeof catalogPatchForResearch> | null', 'let patch: ReturnType<typeof catalogPatchForResearch> | Awaited<ReturnType<typeof reviewFundEvidence>> | null')
replace('src/lib/market/shariahSelfScreening.ts', '          const fresh = await enrichShariahScreeningData', "          if (row.asset_type === 'etf') {\n            patch = await reviewFundEvidence(row, admin, signal);\n          } else {\n          const fresh = await enrichShariahScreeningData")
replace('src/lib/market/shariahSelfScreening.ts', '          patch = catalogPatchForResearch(result);\n        } catch', '          patch = catalogPatchForResearch(result);\n          }\n        } catch')

replace(root+'publicCatalog.ts', '  const manual = row.shariah_manual_override', "  const fund = row.asset_type === 'etf' && data.evidenceVersion === EVIDENCE_VERSION\n    && data.methodologyId === 'SFM_FUND_EVIDENCE_REVIEW' && data.methodologyVersion === '1';\n  const manual = row.shariah_manual_override")
replace(root+'publicCatalog.ts', "  const labels = { compliant:", "  if (fund && !manual) status = 'needs_review';\n  const labels = { compliant:")
replace(root+'publicCatalog.ts', '(proven || manual) ? row.shariah_source', '(proven || fund || manual) ? row.shariah_source')
replace(root+'publicCatalog.ts', "} : { ar: SFM_FTSE_POINT_IN_TIME.nameAr", "} : fund ? { ar: 'مراجعة أدلة صندوق — ليست اعتمادًا شرعيًا', en: 'Fund evidence review — not certification', fr: 'Examen des preuves du fonds — sans certification' } : { ar: SFM_FTSE_POINT_IN_TIME.nameAr")
replace(root+'publicCatalog.ts', '    financialRatios: proven && Array.isArray(financial)', '    fieldCoverage: proven && Array.isArray(data.fieldCoverage) ? data.fieldCoverage : [],\n    fundReview: fund ? data.fundReview ?? null : null,\n    financialRatios: !fund && proven && Array.isArray(financial)')

ui='src/app/sfm-admin-control/shariah/'
replace(ui+'ShariahAdminClient.tsx', "import ShariahEvidencePanel from './ShariahEvidencePanel';", "import ShariahEvidencePanel from './ShariahEvidencePanel';\nimport ShariahPublishedOpinions from './ShariahPublishedOpinions';")
replace(ui+'ShariahAdminClient.tsx', '<section className="sharia-admin-workspace">', '<ShariahPublishedOpinions />\n      <section className="sharia-admin-workspace">')
replace(ui+'ShariahAdminClient.tsx', "<tr key={`${item.symbol}:${item.exchange ?? ''}`}>", "<tr key={`${item.symbol}:${item.exchange ?? ''}`} data-testid={`shariah-row-${item.id}`}>")
replace(ui+'ShariahEvidencePanel.tsx', "import { useLanguage } from '@/hooks/useLanguage';", "import { useLanguage } from '@/hooks/useLanguage';\nimport type { ComponentProps } from 'react';\nimport ShariahCoverageDetails from './ShariahCoverageDetails';")
replace(ui+'ShariahEvidencePanel.tsx', 'type Evidence = { financialPeriod?', "type Evidence = ComponentProps<typeof ShariahCoverageDetails>['evidence'] & { financialPeriod?")
replace(ui+'ShariahEvidencePanel.tsx', '    {evidence ? <>', '    {evidence ? <>\n      <ShariahCoverageDetails evidence={evidence} />')
replace(ui+'ShariahEvidencePanel.tsx', '    {startedOnce && <p role="status"', '    {startedOnce && <p data-testid="shariah-refresh-progress" role="status"')
replace(ui+'ShariahEvidencePanel.tsx', '    {selected?.error && <div', "    {selected && ['stock', 'etf'].includes(selected.assetType ?? '') && <button type=\"button\" data-testid=\"shariah-refresh-selected\" disabled={busy} onClick={() => void refresh(selected.id)}>{text('تحديث أدلة الأداة المحددة', 'Refresh selected instrument evidence', 'Actualiser les preuves du titre sélectionné')}</button>}\n    {selected?.error && <div")
replace(ui+'ShariahEvidencePanel.tsx', "selected.assetType === 'stock' &&", "['stock', 'etf'].includes(selected.assetType ?? '') &&")
replace('src/app/api/sharia-stocks/screening/route.ts', 'return NextResponse.json({ ok: true, items, counts,', 'return NextResponse.json({ ok: true, revision: process.env.VERCEL_GIT_COMMIT_SHA ?? null, items, counts,')
# The catalog query already selects all columns; the verifier must check the
# actual persisted run ID, never infer successful writes from HTTP 200 alone.
replace('scripts/shariah/verify-production-session.mjs', "      if (data?.revision === proof.revision) { ready = true; break; }", "      const publications = data?.revision === proof.revision ? await fetch(`${ORIGIN}/api/sharia-stocks/publications`, { signal: AbortSignal.timeout(10000), redirect: 'error' }).catch(() => null) : null;\n      if (data?.revision === proof.revision && publications?.ok) { ready = true; break; }")
print('Recovered extraction, safety, catalog, refresh and UI integration applied with exact source anchors.')
