import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cleanEnv } from '@/lib/market/providerConfig';
import { isAdminAccessCodeConfigured, isValidAdminAccessCode } from '@/lib/server/adminAccess';
import { getGoogleClientDiagnostic, getReceiptProviderStatus, parseGoogleCredentialsJson } from '@/lib/server/receiptProviderConfig';

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
