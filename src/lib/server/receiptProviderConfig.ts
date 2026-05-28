import { createPrivateKey, createSign } from 'node:crypto';

export type ReceiptProviderErrorCode =
  | 'google_env_missing'
  | 'google_credentials_json_invalid'
  | 'google_credentials_private_key_invalid'
  | 'google_client_init_failed'
  | 'google_processor_path_invalid'
  | 'google_process_document_failed'
  | 'google_permission_denied'
  | 'google_processor_not_found'
  | 'google_invalid_location'
  | 'google_api_not_enabled'
  | 'google_invalid_credentials'
  | 'google_invalid_argument'
  | 'google_unsupported_file_type'
  | 'google_quota_exceeded'
  | 'google_request_failed'
  | 'openai_env_missing'
  | 'openai_fallback_failed'
  | 'no_provider_configured';

export type GoogleReceiptCredentials = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
  token_uri?: string;
};

export type GoogleReceiptConfig = {
  projectId: string;
  location: string;
  processorId: string;
  processorPath: string;
  credentials: GoogleReceiptCredentials;
};

type GoogleErrorBody = {
  error?: {
    code?: number;
    status?: string;
    message?: string;
    details?: Array<{ reason?: string; domain?: string; metadata?: Record<string, string> }>;
  };
};

const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const GOOGLE_TOKEN_AUDIENCE = 'https://oauth2.googleapis.com/token';

let cachedGoogleToken: { token: string; expiresAt: number } | null = null;

export type ReceiptProviderStatus = {
  google: {
    configured: boolean;
    hasProjectId: boolean;
    hasLocation: boolean;
    hasProcessorId: boolean;
    hasCredentialsJson: boolean;
    credentialsJsonValid: boolean;
    projectIdMatchesCredentials: boolean;
    clientInitValid: boolean;
    processorPathBuilt: boolean;
    error?: ReceiptProviderErrorCode;
  };
  openai: {
    configured: boolean;
    hasApiKey: boolean;
  };
};

export function normalizeGooglePrivateKey(privateKey?: string) {
  return privateKey ? privateKey.replace(/\\n/g, '\n') : undefined;
}

function repairRawGoogleJson(raw: string) {
  return raw.replace(/"private_key"\s*:\s*"([\s\S]*?)"\s*(,\s*"client_email"|,\s*"client_id"|,\s*"project_id"|,\s*"private_key_id"|,\s*"token_uri"|})/m, (_match, key: string, tail: string) => {
    return `"private_key":${JSON.stringify(key)}${tail}`;
  });
}

export function parseGoogleCredentialsJson(raw?: string): {
  credentials?: GoogleReceiptCredentials;
  jsonParses: boolean;
  valid: boolean;
  privateKeyValid: boolean;
  error?: ReceiptProviderErrorCode;
} {
  if (!raw?.trim()) {
    return { jsonParses: false, valid: false, privateKeyValid: false, error: 'google_env_missing' };
  }

  for (const candidate of [raw, repairRawGoogleJson(raw)]) {
    try {
      const parsed = JSON.parse(candidate) as GoogleReceiptCredentials;
      const credentials = {
        ...parsed,
        private_key: normalizeGooglePrivateKey(parsed.private_key),
      };
      if (!credentials.client_email || !credentials.project_id) {
        return { credentials, jsonParses: true, valid: false, privateKeyValid: false, error: 'google_credentials_json_invalid' };
      }
      if (!credentials.private_key) {
        return { credentials, jsonParses: true, valid: false, privateKeyValid: false, error: 'google_credentials_private_key_invalid' };
      }
      try {
        createPrivateKey(credentials.private_key);
      } catch {
        return { credentials, jsonParses: true, valid: false, privateKeyValid: false, error: 'google_credentials_private_key_invalid' };
      }
      return { credentials, jsonParses: true, valid: true, privateKeyValid: true };
    } catch {
      // Try the repaired candidate before returning a safe diagnostic.
    }
  }

  return { jsonParses: false, valid: false, privateKeyValid: false, error: 'google_credentials_json_invalid' };
}

function cleanEnv(value?: string) {
  return value?.trim() || '';
}

function isSafePathPart(value: string) {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

export function buildGoogleProcessorPath(projectId: string, location: string, processorId: string) {
  if (!projectId || !location || !processorId) return undefined;
  if (!isSafePathPart(projectId) || !isSafePathPart(location) || !isSafePathPart(processorId)) return undefined;
  return `projects/${projectId}/locations/${location}/processors/${processorId}`;
}

export function getReceiptProviderStatus(): ReceiptProviderStatus {
  const projectId = cleanEnv(process.env.GOOGLE_CLOUD_PROJECT_ID);
  const location = cleanEnv(process.env.GOOGLE_DOCUMENT_AI_LOCATION);
  const processorId = cleanEnv(process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID);
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const parsed = parseGoogleCredentialsJson(credentialsJson);
  const hasProjectId = Boolean(projectId);
  const hasLocation = Boolean(location);
  const hasProcessorId = Boolean(processorId);
  const hasCredentialsJson = Boolean(credentialsJson?.trim());
  const processorPath = buildGoogleProcessorPath(projectId, location, processorId);
  const projectIdMatchesCredentials = Boolean(projectId && parsed.credentials?.project_id && projectId === parsed.credentials.project_id);
  const error: ReceiptProviderErrorCode | undefined = !hasProjectId || !hasLocation || !hasProcessorId || !hasCredentialsJson
    ? 'google_env_missing'
    : parsed.error
      ? parsed.error
      : !processorPath
        ? 'google_processor_path_invalid'
        : undefined;

  return {
    google: {
      configured: Boolean(hasProjectId && hasLocation && hasProcessorId && hasCredentialsJson && parsed.valid && processorPath),
      hasProjectId,
      hasLocation,
      hasProcessorId,
      hasCredentialsJson,
      credentialsJsonValid: parsed.valid,
      projectIdMatchesCredentials,
      clientInitValid: parsed.privateKeyValid,
      processorPathBuilt: Boolean(processorPath),
      ...(error ? { error } : {}),
    },
    openai: {
      configured: Boolean(process.env.OPENAI_API_KEY),
      hasApiKey: Boolean(process.env.OPENAI_API_KEY),
    },
  }
}

export function getGoogleReceiptConfig(): { config: GoogleReceiptConfig | null; error?: ReceiptProviderErrorCode } {
  const status = getReceiptProviderStatus();
  const parsed = parseGoogleCredentialsJson(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  const projectId = cleanEnv(process.env.GOOGLE_CLOUD_PROJECT_ID);
  const location = cleanEnv(process.env.GOOGLE_DOCUMENT_AI_LOCATION);
  const processorId = cleanEnv(process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID);
  const processorPath = buildGoogleProcessorPath(projectId, location, processorId);
  if (!status.google.configured || !parsed.credentials || !processorPath) {
    return {
      config: null,
      error: status.google.error || 'google_env_missing',
    };
  }
  return {
    config: {
      projectId,
      location,
      processorId,
      processorPath,
      credentials: parsed.credentials,
    },
  };
}

export async function getGoogleAccessToken(credentials: GoogleReceiptCredentials) {
  if (cachedGoogleToken && cachedGoogleToken.expiresAt > Date.now() + 60_000) {
    return cachedGoogleToken.token;
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new ReceiptProviderDiagnosticError('google_credentials_json_invalid');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: credentials.client_email,
    scope: GOOGLE_SCOPE,
    aud: GOOGLE_TOKEN_AUDIENCE,
    exp: now + 3600,
    iat: now,
  })).toString('base64url');
  const unsigned = `${header}.${payload}`;
  let assertion: string;
  try {
    const signer = createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    const signature = signer.sign(credentials.private_key).toString('base64url');
    assertion = `${unsigned}.${signature}`;
  } catch {
    throw new ReceiptProviderDiagnosticError('google_credentials_private_key_invalid');
  }

  let response: Response;
  try {
    response = await fetch(credentials.token_uri || GOOGLE_TOKEN_AUDIENCE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
  } catch {
    throw new ReceiptProviderDiagnosticError('google_client_init_failed');
  }

  if (!response.ok) {
    const code = response.status === 401 || response.status === 403
      ? 'google_invalid_credentials'
      : 'google_client_init_failed';
    throw new ReceiptProviderDiagnosticError(code, response.status);
  }

  const token = await response.json() as { access_token?: string; expires_in?: number };
  if (!token.access_token) throw new ReceiptProviderDiagnosticError('google_client_init_failed');
  cachedGoogleToken = {
    token: token.access_token,
    expiresAt: Date.now() + Math.max(60, token.expires_in || 3600) * 1000,
  };
  return token.access_token;
}

export class ReceiptProviderDiagnosticError extends Error {
  code: ReceiptProviderErrorCode;
  status?: number;
  reason?: string;

  constructor(code: ReceiptProviderErrorCode, status?: number, reason?: string) {
    super(code);
    this.name = 'ReceiptProviderDiagnosticError';
    this.code = code;
    this.status = status;
    this.reason = reason;
  }
}

export function maskGoogleClientEmail(email?: string) {
  if (!email) return undefined;
  const [name, domain] = email.split('@');
  if (!domain) return 'invalid-email';
  const prefix = name.length <= 4 ? `${name.slice(0, 1)}***` : `${name.slice(0, 3)}***${name.slice(-1)}`;
  return `${prefix}@${domain}`;
}

export function classifyGoogleDocumentAiError(status?: number, reason?: string, message?: string): ReceiptProviderErrorCode {
  const safeReason = `${reason || ''} ${message || ''}`.toLowerCase();
  if (status === 401 || /unauthenticated|invalid[_\s-]*credentials|invalid_grant|invalid jwt/.test(safeReason)) return 'google_invalid_credentials';
  if (/api has not been used|api.*disabled|service disabled|accessNotConfigured/i.test(`${reason || ''} ${message || ''}`)) return 'google_api_not_enabled';
  if (status === 403 || /permission[_\s-]*denied|iam|forbidden/.test(safeReason)) return 'google_permission_denied';
  if (status === 404 || /not[_\s-]*found|processor.*not found/.test(safeReason)) return 'google_processor_not_found';
  if (/location|regional endpoint|invalid.*region/.test(safeReason)) return 'google_invalid_location';
  if (/mime|unsupported.*file|unsupported.*content|content type/.test(safeReason)) return 'google_unsupported_file_type';
  if (status === 400 || /invalid[_\s-]*argument|bad request/.test(safeReason)) return 'google_invalid_argument';
  if (status === 429 || /quota|resource[_\s-]*exhausted|rate limit/.test(safeReason)) return 'google_quota_exceeded';
  return 'google_request_failed';
}

export async function readGoogleErrorResponse(response: Response): Promise<{ code: ReceiptProviderErrorCode; status: number; reason?: string; message?: string }> {
  let reason: string | undefined;
  let message: string | undefined;
  try {
    const body = await response.json() as GoogleErrorBody;
    reason = body.error?.status || body.error?.details?.find(detail => detail.reason)?.reason;
    message = body.error?.message;
  } catch {
    reason = undefined;
    message = undefined;
  }
  return {
    code: classifyGoogleDocumentAiError(response.status, reason, message),
    status: response.status,
    reason,
    message,
  };
}

export async function getGoogleClientDiagnostic(test?: 'google-metadata') {
  const { config, error } = getGoogleReceiptConfig();
  if (!config) {
    return {
      initialized: false,
      processorPathBuilt: false,
      errorCode: error || 'google_env_missing',
      errorMessage: safeProviderErrorMessage(error || 'google_env_missing'),
    };
  }

  const base = {
    initialized: true,
    processorPathBuilt: Boolean(config.processorPath),
    processorPath: config.processorPath,
    serviceAccount: maskGoogleClientEmail(config.credentials.client_email),
  };

  if (test !== 'google-metadata') {
    return base;
  }

  try {
    const token = await getGoogleAccessToken(config.credentials);
    const endpoint = `https://${config.location}-documentai.googleapis.com/v1/${config.processorPath}`;
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const detail = await readGoogleErrorResponse(response);
      return {
        ...base,
        canReadProcessor: false,
        errorCode: detail.code,
        errorMessage: safeProviderErrorMessage(detail.code),
        googleStatus: detail.status,
        googleReason: detail.reason,
      };
    }
    return {
      ...base,
      canReadProcessor: true,
    };
  } catch (error) {
    if (error instanceof ReceiptProviderDiagnosticError) {
      return {
        ...base,
        canReadProcessor: false,
        errorCode: error.code,
        errorMessage: safeProviderErrorMessage(error.code),
        googleStatus: error.status,
        googleReason: error.reason,
      };
    }
    return {
      ...base,
      canReadProcessor: false,
      errorCode: 'google_request_failed' as const,
      errorMessage: safeProviderErrorMessage('google_request_failed'),
    };
  };
}

export function safeProviderErrorMessage(code: ReceiptProviderErrorCode) {
  const messages: Record<ReceiptProviderErrorCode, string> = {
    google_env_missing: 'One or more Google Document AI environment variables are missing.',
    google_credentials_json_invalid: 'Google service account JSON could not be parsed or is missing required identity fields.',
    google_credentials_private_key_invalid: 'Google service account private_key is missing or invalid.',
    google_client_init_failed: 'Google Document AI client initialization failed.',
    google_processor_path_invalid: 'Google Document AI processor path could not be built.',
    google_process_document_failed: 'Could not connect to the invoice reading service.',
    google_permission_denied: 'Could not connect to the invoice reading service.',
    google_processor_not_found: 'Google Document AI processor was not found. Check processor ID and location.',
    google_invalid_location: 'Google Document AI processor location is invalid.',
    google_api_not_enabled: 'Google Document AI API is not enabled for this project.',
    google_invalid_credentials: 'Google service account credentials are invalid.',
    google_invalid_argument: 'Google Document AI rejected the request body.',
    google_unsupported_file_type: 'Google Document AI does not support this file type.',
    google_quota_exceeded: 'Google Document AI quota was exceeded.',
    google_request_failed: 'Could not connect to the invoice reading service.',
    openai_env_missing: 'OpenAI API key is missing.',
    openai_fallback_failed: 'OpenAI Vision fallback failed.',
    no_provider_configured: 'No receipt scanning provider is configured.',
  };
  return messages[code];
}
