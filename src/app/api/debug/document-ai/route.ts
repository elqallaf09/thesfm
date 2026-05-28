import { NextRequest, NextResponse } from 'next/server';
import {
  getGoogleClientDiagnostic,
  getGoogleReceiptConfig,
  getReceiptProviderStatus,
  parseGoogleCredentialsJson,
} from '@/lib/server/receiptProviderConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAllowed(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') return true;
  return request.cookies.get('sfm_auth')?.value === 'true';
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
