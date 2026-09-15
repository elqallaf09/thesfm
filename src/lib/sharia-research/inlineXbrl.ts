import { SaxesParser, type SaxesTagNS } from 'saxes';
import { currentDay, isoDay } from './evidenceValidation';
import type { SecFacts, SecFact } from './secFinancialExtraction';
import type { SecFiling } from './secData';

const INSTANCE = 'http://www.xbrl.org/2003/instance';
const INLINE = new Set(['http://www.xbrl.org/2013/inlineXBRL', 'http://www.xbrl.org/2008/inlineXBRL']);
type Context = { id: string; cik: string; scheme: string; start?: string; end?: string; instant?: string; dimensioned: boolean };
type Frame = { tag: SaxesTagNS; text: string; namespaces: Record<string, string>; invalidNumeric?: boolean };
type Numeric = { name: string; context: string; unit: string; value: number; decimals: number };
const attribute = (tag: SaxesTagNS, name: string) => Object.values(tag.attributes).find(item => item.name === name)?.value;

function numericValue(tag: SaxesTagNS, text: string, namespaces: Record<string, string>) {
  if (Object.values(tag.attributes).some(item => item.local === 'nil' && ['true', '1'].includes(item.value))) return null;
  if (attribute(tag, 'sign') || attribute(tag, 'continuedAt') || attribute(tag, 'tupleRef') || attribute(tag, 'target')) return null;
  const format = attribute(tag, 'format');
  let cleaned = text.trim();
  if (format) {
    const [prefix, local] = format.split(':');
    if (!/^https?:\/\/www\.xbrl\.org\/inlineXBRL\/transformation\/\d{4}-\d{2}-\d{2}$/.test(namespaces[prefix] ?? '')) return null;
    if (['fixed-zero', 'zerodash'].includes(local)) {
      if (!/^(?:0|[-–—])$/.test(cleaned)) return null;
      cleaned = '0';
    } else if (['num-dot-decimal', 'numdotdecimal'].includes(local)) {
      if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(cleaned)) return null;
      cleaned = cleaned.replace(/,/g, '');
    } else return null;
  }
  if (!/^\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const scaleText = attribute(tag, 'scale') ?? '0';
  if (!/^-?\d{1,2}$/.test(scaleText) || Math.abs(Number(scaleText)) > 12) return null;
  const decimalsText = attribute(tag, 'decimals');
  if (!decimalsText || !/^(?:INF|-?\d{1,2})$/.test(decimalsText)) return null;
  const value = Number(cleaned) * 10 ** Number(scaleText);
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) return null;
  return { value, decimals: decimalsText === 'INF' ? 20 : Number(decimalsText) };
}

/** Strict, non-executing XHTML reader. DTD entities, dimensions, foreign issuers,
 * unknown transformations and conflicting duplicates never become financial facts.
 * Standard taxonomy fields only; no custom-tag name guesses or segment summation.
 */
export function parseInlineXbrlFacts(html: string, cik: string, filing: SecFiling, now = new Date()): SecFacts {
  if (html.length > 15 * 1024 * 1024 || /<!ENTITY\b|<!DOCTYPE[^>]*(?:SYSTEM|PUBLIC|\[)/i.test(html)) throw new Error('INLINE_XBRL_UNSAFE_DOCUMENT');
  if (!currentDay(filing.reportDate, now) || !currentDay(filing.filingDate, now) || filing.filingDate < filing.reportDate
    || !/^\d{10}-\d{2}-\d{6}$/.test(filing.accessionNumber) || !/^\d{1,10}$/.test(cik)) throw new Error('INLINE_XBRL_INVALID_FILING');
  const contexts = new Map<string, Context>();
  const units = new Map<string, string>();
  const numbers: Numeric[] = [];
  const frames: Frame[] = [];
  let context: Context | undefined;
  let unit: { id: string; currency?: string; invalid: boolean } | undefined;
  const parser = new SaxesParser({ xmlns: true });
  parser.on('opentag', tag => {
    if (frames.length > 150 || numbers.length > 60000 || contexts.size > 20000) throw new Error('INLINE_XBRL_COMPLEXITY_LIMIT');
    const namespaces = { ...(frames.at(-1)?.namespaces ?? {}), ...tag.ns };
    frames.push({ tag, text: '', namespaces });
    if (tag.uri === INSTANCE && tag.local === 'context') {
      if (context) throw new Error('INLINE_XBRL_NESTED_CONTEXT');
      context = { id: attribute(tag, 'id') ?? '', cik: '', scheme: '', dimensioned: false };
    }
    if (context && (tag.local === 'segment' || tag.local === 'scenario' || tag.uri === 'http://xbrl.org/2006/xbrldi')) context.dimensioned = true;
    if (context && tag.uri === INSTANCE && tag.local === 'identifier') context.scheme = attribute(tag, 'scheme') ?? '';
    if (tag.uri === INSTANCE && tag.local === 'unit') unit = { id: attribute(tag, 'id') ?? '', invalid: false };
    if (unit && tag.uri === INSTANCE && tag.local === 'divide') unit.invalid = true;
    const numericParents = frames.slice(0, -1).filter(frame => INLINE.has(frame.tag.uri) && frame.tag.local === 'nonFraction');
    if (INLINE.has(tag.uri) && tag.local === 'nonFraction') for (const parent of numericParents) {
      if (['format', 'scale', 'unitRef', 'sign'].some(key => (attribute(parent.tag, key) ?? '') !== (attribute(tag, key) ?? ''))) {
        parent.invalidNumeric = true; frames[frames.length - 1].invalidNumeric = true;
      }
    }
    if (INLINE.has(tag.uri) && tag.local === 'exclude') numericParents.forEach(parent => { parent.invalidNumeric = true; });
  });
  parser.on('text', text => { if (frames.length) frames[frames.length - 1].text += text; });
  parser.on('cdata', text => { if (frames.length) frames[frames.length - 1].text += text; });
  parser.on('closetag', tag => {
    const frame = frames.pop()!;
    const text = frame.text.trim();
    // Only collect descendants of numeric facts; do not retain the entire report DOM.
    if (frames.length && frames.some(parent => INLINE.has(parent.tag.uri) && parent.tag.local === 'nonFraction')) frames[frames.length - 1].text += frame.text;
    if (context && tag.uri === INSTANCE) {
      if (tag.local === 'identifier') context.cik = text;
      if (tag.local === 'startDate') context.start = text;
      if (tag.local === 'endDate') context.end = text;
      if (tag.local === 'instant') context.instant = text;
      if (tag.local === 'context') {
        if (!context.id || contexts.has(context.id)) throw new Error('INLINE_XBRL_DUPLICATE_CONTEXT');
        contexts.set(context.id, context); context = undefined;
      }
    }
    if (unit && tag.uri === INSTANCE) {
      if (tag.local === 'measure') {
        const [prefix, currency] = text.split(':');
        if (unit.currency || frame.namespaces[prefix] !== 'http://www.xbrl.org/2003/iso4217' || !/^[A-Z]{3}$/.test(currency ?? '')) unit.invalid = true;
        else unit.currency = currency;
      }
      if (tag.local === 'unit') {
        if (!unit.id || units.has(unit.id)) throw new Error('INLINE_XBRL_DUPLICATE_UNIT');
        units.set(unit.id, !unit.invalid && unit.currency ? unit.currency : ''); unit = undefined;
      }
    }
    if (!INLINE.has(tag.uri) || tag.local !== 'nonFraction' || frame.invalidNumeric) return;
    const name = attribute(tag, 'name') ?? '';
    const [prefix, local] = name.split(':');
    const uri = frame.namespaces[prefix] ?? '';
    const taxonomy = /^https?:\/\/fasb\.org\/us-gaap\/\d{4}$/.test(uri) ? 'us-gaap'
      : /^https?:\/\/xbrl\.ifrs\.org\/taxonomy\/\d{4}-\d{2}-\d{2}\/ifrs-full$/.test(uri) ? 'ifrs-full' : null;
    const numeric = numericValue(tag, text, frame.namespaces);
    if (!taxonomy || !local || !numeric) return;
    numbers.push({ name: `${taxonomy}:${local}`, context: attribute(tag, 'contextRef') ?? '', unit: attribute(tag, 'unitRef') ?? '', ...numeric });
  });
  try { parser.write(html).close(); } catch (error) {
    if (error instanceof Error && /^INLINE_XBRL_/.test(error.message)) throw error;
    throw new Error('INLINE_XBRL_MALFORMED_DOCUMENT');
  }
  const normalizedCik = cik.padStart(10, '0');
  const accepted = new Map<string, { number: Numeric; fact: SecFact }>();
  const conflicted = new Set<string>();
  for (const number of numbers) {
    const ctx = contexts.get(number.context);
    const currency = units.get(number.unit);
    if (!ctx || ctx.dimensioned || ctx.scheme !== 'http://www.sec.gov/CIK' || ctx.cik.padStart(10, '0') !== normalizedCik || !currency) continue;
    const end = ctx.instant ?? ctx.end;
    if (end !== filing.reportDate || (ctx.instant && (ctx.start || ctx.end)) || (!ctx.instant && (!isoDay(ctx.start) || ctx.start! >= end))) continue;
    const key = `${number.name}|${currency}|${ctx.start ?? ''}|${end}`;
    const prior = accepted.get(key);
    const tolerance = prior ? Math.max(10 ** -number.decimals, 10 ** -prior.number.decimals) / 2 : 0;
    if (prior && Math.abs(prior.number.value - number.value) > tolerance + 1e-6) { conflicted.add(key); continue; }
    if (prior && prior.number.decimals >= number.decimals) continue;
    accepted.set(key, { number, fact: { val: number.value, end, start: ctx.start, accn: filing.accessionNumber, form: filing.form, filed: filing.filingDate } });
  }
  const facts: NonNullable<SecFacts['facts']> = {};
  for (const [key, item] of accepted) {
    if (conflicted.has(key)) continue;
    const [taxonomy, tag] = item.number.name.split(':');
    const currency = units.get(item.number.unit)!;
    const entry = (facts[taxonomy] ??= {})[tag] ??= { units: {} };
    (entry.units![currency] ??= []).push(item.fact);
  }
  return { facts };
}
