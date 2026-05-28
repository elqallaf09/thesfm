import { createPrivateKey } from 'node:crypto';

export type ReceiptProviderErrorCode =
  | 'google_env_missing'
  | 'google_credentials_json_invalid'
  | 'google_credentials_private_key_invalid'
  | 'google_client_init_failed'
  | 'google_processor_path_invalid'
  | 'google_process_document_failed'
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
  };
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

export function getGoogleClientDiagnostic() {
  const { config, error } = getGoogleReceiptConfig();
  if (!config) {
    return {
      initialized: false,
      processorPathBuilt: false,
      errorCode: error || 'google_env_missing',
      errorMessage: safeProviderErrorMessage(error || 'google_env_missing'),
    };
  }

  return {
    initialized: true,
    processorPathBuilt: Boolean(config.processorPath),
  };
}

export function safeProviderErrorMessage(code: ReceiptProviderErrorCode) {
  const messages: Record<ReceiptProviderErrorCode, string> = {
    google_env_missing: 'One or more Google Document AI environment variables are missing.',
    google_credentials_json_invalid: 'Google service account JSON could not be parsed or is missing required identity fields.',
    google_credentials_private_key_invalid: 'Google service account private_key is missing or invalid.',
    google_client_init_failed: 'Google Document AI client initialization failed.',
    google_processor_path_invalid: 'Google Document AI processor path could not be built.',
    google_process_document_failed: 'Google Document AI process request failed.',
    openai_env_missing: 'OpenAI API key is missing.',
    openai_fallback_failed: 'OpenAI Vision fallback failed.',
    no_provider_configured: 'No receipt scanning provider is configured.',
  };
  return messages[code];
}
