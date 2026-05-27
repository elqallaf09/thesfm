import { createPrivateKey } from 'node:crypto';

export type GoogleReceiptCredentials = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
  token_uri?: string;
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
    error?: string;
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
  valid: boolean;
  error?: string;
} {
  if (!raw?.trim()) {
    return { valid: false, error: 'missing_google_credentials_json' };
  }

  for (const candidate of [raw, repairRawGoogleJson(raw)]) {
    try {
      const parsed = JSON.parse(candidate) as GoogleReceiptCredentials;
      const credentials = {
        ...parsed,
        private_key: normalizeGooglePrivateKey(parsed.private_key),
      };
      if (!credentials.client_email || !credentials.private_key || !credentials.project_id) {
        return { credentials, valid: false, error: 'invalid_google_credentials_json' };
      }
      return { credentials, valid: true };
    } catch {
      // Try the repaired candidate before returning a safe diagnostic.
    }
  }

  return { valid: false, error: 'invalid_google_credentials_json' };
}

export function getReceiptProviderStatus(): ReceiptProviderStatus {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID?.trim();
  const location = process.env.GOOGLE_DOCUMENT_AI_LOCATION?.trim();
  const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID?.trim();
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const parsed = parseGoogleCredentialsJson(credentialsJson);
  const hasProjectId = Boolean(projectId);
  const hasLocation = Boolean(location);
  const hasProcessorId = Boolean(processorId);
  const hasCredentialsJson = Boolean(credentialsJson?.trim());
  let clientInitValid = false;

  if (parsed.valid && parsed.credentials?.private_key) {
    try {
      createPrivateKey(parsed.credentials.private_key);
      clientInitValid = true;
    } catch {
      clientInitValid = false;
    }
  }

  const projectIdMatchesCredentials = Boolean(projectId && parsed.credentials?.project_id && projectId === parsed.credentials.project_id);
  const error = !hasProjectId
    ? 'missing_google_project_id'
    : !hasLocation
      ? 'missing_google_location'
      : !hasProcessorId
        ? 'missing_google_processor_id'
        : !hasCredentialsJson
          ? 'missing_google_credentials_json'
          : !parsed.valid
            ? parsed.error || 'invalid_google_credentials_json'
            : !clientInitValid
              ? 'google_client_init_failed'
              : undefined;

  return {
    google: {
      configured: Boolean(hasProjectId && hasLocation && hasProcessorId && hasCredentialsJson && parsed.valid && clientInitValid),
      hasProjectId,
      hasLocation,
      hasProcessorId,
      hasCredentialsJson,
      credentialsJsonValid: parsed.valid,
      projectIdMatchesCredentials,
      clientInitValid,
      ...(error ? { error } : {}),
    },
    openai: {
      configured: Boolean(process.env.OPENAI_API_KEY),
      hasApiKey: Boolean(process.env.OPENAI_API_KEY),
    },
  };
}

export function getGoogleReceiptConfig() {
  const status = getReceiptProviderStatus();
  const parsed = parseGoogleCredentialsJson(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  if (!status.google.configured || !parsed.credentials) {
    return {
      config: null,
      error: status.google.error || 'provider_unavailable',
    };
  }
  return {
    config: {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID?.trim() || '',
      location: process.env.GOOGLE_DOCUMENT_AI_LOCATION?.trim() || '',
      processorId: process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID?.trim() || '',
      credentials: parsed.credentials,
    },
    error: undefined,
  };
}
