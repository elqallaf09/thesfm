import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cleanEnv } from '@/lib/market/providerConfig';
import {
  defaultFmpCalendarRange,
  getFmpDividendCalendar,
  getFmpDividendsForSymbol,
  type FmpDividendDiagnostics,
} from '@/lib/market/fmpDividends';
import { isAdminAccessCodeConfigured, isValidAdminAccessCode } from '@/lib/server/adminAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SAMPLE_SYMBOLS = ['IBM', 'XOM', 'JNJ'] as const;

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function requestToken(request: NextRequest) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  return cleanEnv(request.headers.get('x-admin-diagnostics-token'))
    || cleanEnv(bearer)
    || cleanEnv(request.nextUrl.searchParams.get('token'));
}

function isAllowed(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') return true;
  const token = requestToken(request);
  const healthToken = cleanEnv(process.env.MARKET_PROVIDER_HEALTH_TOKEN);
  if (!token) return false;
  if (healthToken && safeEqual(token, healthToken)) return true;
  return isAdminAccessCodeConfigured() && isValidAdminAccessCode(token);
}

function safeDiagnostics(diagnostics: FmpDividendDiagnostics) {
  return {
    fmpConfigured: diagnostics.fmpConfigured,
    endpoint: diagnostics.endpoint,
    responseStatus: diagnostics.responseStatus,
    rawResultCount: diagnostics.rawResultCount,
    normalizedResultCount: diagnostics.normalizedResultCount,
    status: diagnostics.status,
    errorMessage: diagnostics.errorMessage,
    lastUpdated: diagnostics.lastUpdated,
    attempts: diagnostics.attempts,
  };
}

export async function GET(request: NextRequest) {
  if (!isAllowed(request)) {
    return NextResponse.json({ ok: false, code: 'DIVIDEND_PROVIDER_STATUS_FORBIDDEN' }, { status: 403 });
  }

  const range = defaultFmpCalendarRange(30);
  const calendar = await getFmpDividendCalendar({ ...range, force: true });
  const symbolResults = await Promise.all(SAMPLE_SYMBOLS.map(async symbol => {
    const result = await getFmpDividendsForSymbol(symbol);
    return [
      symbol,
      {
        eventCount: result.events.length,
        hasPaymentDate: result.events.some(event => Boolean(event.paymentDate)),
        selectedKind: result.selectedKind,
        selectedHasPaymentDate: Boolean(result.selectedEvent?.paymentDate),
        diagnostics: safeDiagnostics(result.diagnostics),
      },
    ] as const;
  }));

  const diagnostics = [
    calendar.diagnostics,
    ...symbolResults.map(([, value]) => value.diagnostics),
  ];
  const lastErrorMessage = diagnostics
    .map(item => item.errorMessage)
    .find((message): message is string => Boolean(message)) ?? null;

  return NextResponse.json({
    ok: calendar.diagnostics.status === 'success' || calendar.diagnostics.status === 'empty',
    fmpConfigured: calendar.diagnostics.fmpConfigured,
    calendarEndpointStatus: safeDiagnostics(calendar.diagnostics),
    sampleSymbolsStatus: Object.fromEntries(symbolResults),
    eventCount: calendar.events.length,
    lastErrorMessage,
    range,
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
