import type { CalendarSourceReport } from '@/lib/providers/economic-calendar/types';
import type { NormalizedEconomicEvent } from '@/lib/market/normalizeEconomicEvents';

const COPY = {
  ar: { title: 'مصادر تقويم THE SFM', note: 'نجمع المواعيد من جهات مستقلة. القيم الفعلية والتوقعات تظهر فقط عندما ينشرها مصدر؛ مستوى التأثير للمواعيد الرسمية تقدير تصنيفي من THE SFM.', success: 'تم التحقق', stale: 'نسخة محفوظة — تعذر التحديث', failed: 'تعذر الاتصال', count: 'أحداث مفهرسة', checked: 'آخر فحص', old: 'موعد محفوظ؛ يحتاج إعادة التحقق', awaiting: 'بانتظار القيمة المنشورة' },
  en: { title: 'THE SFM calendar sources', note: 'Schedules come from independent publishers. Actuals and forecasts appear only when supplied; impact for official schedules is classified by THE SFM.', success: 'Verified', stale: 'Saved copy — refresh failed', failed: 'Unavailable', count: 'indexed events', checked: 'Last checked', old: 'Saved schedule; needs rechecking', awaiting: 'Awaiting published value' },
  fr: { title: 'Sources du calendrier THE SFM', note: 'Les dates proviennent de sources indépendantes. Les résultats et prévisions ne sont affichés que si une source les fournit ; THE SFM classe l’impact des calendriers officiels.', success: 'Vérifié', stale: 'Copie conservée — échec de mise à jour', failed: 'Indisponible', count: 'événements indexés', checked: 'Dernière vérification', old: 'Calendrier conservé ; à revérifier', awaiting: 'En attente de la valeur publiée' },
};
const names: Record<string, string> = { bea: 'BEA · US', bls: 'BLS · US', boc: 'Bank of Canada · CA', ons: 'ONS · GB', finnhub: 'Finnhub', fmp: 'FMP', tradingeconomics: 'Trading Economics' };

export function EconomicCalendarSources({ sources, locale }: { sources?: CalendarSourceReport[]; locale: string }) {
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  if (!sources?.length) return null;
  return <details className="economic-calendar-filter-card">
    <summary>{copy.title} · {sources.filter(source => source.status === 'success').length}/{sources.length}</summary>
    <p>{copy.note}</p>
    <ul>{sources.map(source => <li key={source.provider}>
      <b dir="ltr">{names[source.provider] ?? source.provider}</b> — {copy[source.status]} · {source.count} {copy.count}
      <small> · {copy.checked}: <time dateTime={source.checkedAt}>{new Date(source.checkedAt).toLocaleString(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale)}</time></small>
    </li>)}</ul>
  </details>;
}

export function CalendarEventSource({ event, locale }: { event: NormalizedEconomicEvent; locale: string }) {
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  return <span className="calendar-source-badge" dir="auto" style={{ whiteSpace: 'normal', overflowWrap: 'anywhere', flexWrap: 'wrap' }}>
    {event.sourceUrl ? <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">{event.source}</a> : event.source}
    {event.stale ? <small> · {copy.old}</small> : null}
    {event.retrievedAt ? <small> · <time dateTime={event.retrievedAt}>{new Date(event.retrievedAt).toLocaleString(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale)}</time></small> : null}
  </span>;
}

export function calendarSearchText(event: NormalizedEconomicEvent) {
  const title = event.eventName.toLowerCase();
  const aliases = [
    [/gdp|gross domestic product/, 'الناتج المحلي الإجمالي النمو croissance PIB'],
    [/consumer price|inflation/, 'التضخم أسعار المستهلك inflation IPC'],
    [/employment|labour|labor|payroll/, 'العمالة التوظيف الوظائف البطالة emploi chômage'],
    [/interest rate|policy rate|monetary/, 'الفائدة السياسة النقدية taux intérêt monétaire'],
    [/personal income|outlays/, 'الدخل الشخصي الإنفاق الاستهلاك revenus dépenses'],
    [/retail sales/, 'مبيعات التجزئة ventes détail'],
    [/trade|international transactions/, 'التجارة المعاملات الدولية commerce'],
  ] as const;
  const country = event.country === 'US' ? 'أمريكا امريكا الولايات المتحدة' : event.country === 'GB' ? 'بريطانيا المملكة المتحدة' : event.country === 'CA' ? 'كندا' : '';
  return [event.eventName, event.country, event.currency, event.source, country, ...aliases.filter(([pattern]) => pattern.test(title)).map(([, words]) => words)].join(' ').toLowerCase();
}
