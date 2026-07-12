import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/server/adminAccess';
import {
  getGoogleClientDiagnostic,
  getGoogleReceiptConfig,
  getReceiptProviderStatus,
  parseGoogleCredentialsJson,
} from '@/lib/server/receiptProviderConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    const auth = await requireAdminApiAccess(request, 'admin_dashboard').catch(() => null);
    if (!auth) {
      return NextResponse.json({ ok: false, code: 'ADMIN_AUTH_CHECK_FAILED' }, { status: 503 });
    }
    if (!auth.ok) {
      return NextResponse.json({ ok: false, code: auth.code }, {
        status: auth.status,
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }
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
