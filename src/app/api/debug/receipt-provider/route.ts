import { NextRequest, NextResponse } from 'next/server';
import { getGoogleClientDiagnostic, getReceiptProviderStatus, parseGoogleCredentialsJson } from '@/lib/server/receiptProviderConfig';

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
  const test = request.nextUrl.searchParams.get('test') === 'google-metadata' ? 'google-metadata' : undefined;
  const googleClient = await getGoogleClientDiagnostic(test);

  return NextResponse.json({
    runtime: 'nodejs',
    env: {
      hasGoogleProjectId: status.google.hasProjectId,
      hasGoogleLocation: status.google.hasLocation,
      hasGoogleProcessorId: status.google.hasProcessorId,
      hasGoogleCredentialsJson: status.google.hasCredentialsJson,
      hasOpenAiKey: status.openai.hasApiKey,
    },
    googleCredentials: {
      jsonParses: parsedCredentials.jsonParses,
      hasClientEmail: Boolean(parsedCredentials.credentials?.client_email),
      hasPrivateKey: Boolean(parsedCredentials.credentials?.private_key),
      hasProjectId: Boolean(parsedCredentials.credentials?.project_id),
      projectIdMatchesEnv: status.google.projectIdMatchesCredentials,
    },
    googleClient: {
      initialized: googleClient.initialized,
      processorPathBuilt: googleClient.processorPathBuilt,
      ...('processorPath' in googleClient && googleClient.processorPath ? {
        processorPath: googleClient.processorPath,
      } : {}),
      ...('serviceAccount' in googleClient && googleClient.serviceAccount ? {
        serviceAccount: googleClient.serviceAccount,
      } : {}),
      ...('canReadProcessor' in googleClient ? {
        canReadProcessor: googleClient.canReadProcessor,
      } : {}),
      ...('errorCode' in googleClient && googleClient.errorCode ? {
        errorCode: googleClient.errorCode,
        errorMessage: googleClient.errorMessage,
      } : {}),
      ...('googleStatus' in googleClient && googleClient.googleStatus ? {
        googleStatus: googleClient.googleStatus,
      } : {}),
      ...('googleReason' in googleClient && googleClient.googleReason ? {
        googleReason: googleClient.googleReason,
      } : {}),
    },
    openai: {
      configured: status.openai.configured,
    },
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
