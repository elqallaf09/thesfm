import { createAdminApiRoute } from '@/lib/server/adminApiRoute';
import {
  getGoogleClientDiagnostic,
  getGoogleReceiptConfig,
  getReceiptProviderStatus,
  parseGoogleCredentialsJson,
} from '@/lib/server/receiptProviderConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createAdminApiRoute({ permission: 'admin_dashboard' }, async ({ request, json }) => {
  const status = getReceiptProviderStatus();
  const parsedCredentials = parseGoogleCredentialsJson(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  const { config } = getGoogleReceiptConfig();
  const shouldTestProcessor = new URL(request.url).searchParams.get('test') === 'processor';
  const processorDiagnostic = shouldTestProcessor
    ? await getGoogleClientDiagnostic('google-metadata')
    : await getGoogleClientDiagnostic();

  return json({
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
  });
});
