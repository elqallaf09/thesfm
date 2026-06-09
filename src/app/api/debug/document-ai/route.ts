import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cleanEnv } from '@/lib/market/providerConfig';
import { isAdminAccessCodeConfigured, isValidAdminAccessCode } from '@/lib/server/adminAccess';
import {
  getGoogleClientDiagnostic,
  getGoogleReceiptConfig,
  getReceiptProviderStatus,
  parseGoogleCredentialsJson,
} from '@/lib/server/receiptProviderConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function requestToken(request: NextRequest): string | null {
  return (
    request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ??
    cleanEnv(request.nextUrl.searchParams.get('token'))
  );
}

function isAllowed(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const token = requestToken(request);
  if (!token) return false;
  const healthToken = cleanEnv(process.env.MARKET_PROVIDER_HEALTH_TOKEN);
  if (healthToken && safeEqual(token, healthToken)) return true;
  return isAdminAccessCodeConfigured() && isValidAdminAccessCode(token);
}

export async function GET(request: NextRequest) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = getReceiptProviderStatus();
  const parsedCredentials = parseGoogleCredentialsJson(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  const { config } = getGoogleReceiptConfig();
  const shouldTestProcessor = request.nextUrl.searchParams.get('test') === 'processor';
  const processorDiagnostic = shouldTestProcessor
    ? await getGoogleClientDiagnostic('google-metadata')
    : await getGoogleClientDiagnostic();

  return NextResponse.json({
    runtime: 'nodejs',
    env: {
      hasProjectId: status.google.hasProjectId,
      hasLocation: status.google.hasLocation,
      hasProcessorId: status.google.hasProcessorId,
      hasCredentialsJson: status.google.hasCredentialsJson,
    },
    credentials: {
      parses: parsedCredentials.jsonParses,
      hasClientEmail: Boolean(parsedCredentials.credentials?.client_email),
      hasPrivateKey: Boolean(parsedCredentials.credentials?.private_key),
      projectIdInJson: Boolean(parsedCredentials.credentials?.project_id),
    },
    processor: {
      pathBuilt: status.google.processorPathBuilt,
      processorPath: config?.processorPath,
      location: config?.location || process.env.GOOGLE_DOCUMENT_AI_LOCATION || null,
      processorIdPresent: status.google.hasProcessorId,
      ...(shouldTestProcessor && 'canReadProcessor' in processorDiagnostic ? {
        canReadProcessor: processorDiagnostic.canReadProcessor,
      } : {}),
      ...('errorCode' in processorDiagnostic && processorDiagnostic.errorCode ? {
        errorCode: processorDiagnostic.errorCode,
        errorMessage: processorDiagnostic.errorMessage,
      } : {}),
      ...('googleStatus' in processorDiagnostic && processorDiagnostic.googleStatus ? {
        googleStatus: processorDiagnostic.googleStatus,
      } : {}),
      ...('googleReason' in processorDiagnostic && processorDiagnostic.googleReason ? {
        googleReason: processorDiagnostic.googleReason,
      } : {}),
    },
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
