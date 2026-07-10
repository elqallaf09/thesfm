export type ResearchFailureCategory =
  | 'routing'
  | 'authentication'
  | 'source_retrieval'
  | 'extraction'
  | 'analysis';

type ErrorPayload = {
  ok?: boolean;
  success?: boolean;
  code?: string;
  message?: string;
  error?: { code?: string; message?: string };
};

export class ResearchApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly category: ResearchFailureCategory;

  constructor(input: { code: string; status: number; category: ResearchFailureCategory; message?: string }) {
    super(input.message || input.code);
    this.name = 'ResearchApiError';
    this.code = input.code;
    this.status = input.status;
    this.category = input.category;
  }
}

export function researchFailureCategory(code: string, status = 0): ResearchFailureCategory {
  const normalized = code.toUpperCase();
  if (normalized === 'API_ROUTE_NOT_FOUND' || normalized === 'NON_JSON_RESPONSE' || normalized === 'INVALID_JSON_RESPONSE') return 'routing';
  if (status === 401 || normalized.includes('AUTH')) return 'authentication';
  if (normalized.includes('SOURCE') || normalized.includes('FETCH') || normalized.includes('HTTP_')) return 'source_retrieval';
  if (normalized.includes('EXTRACT') || normalized.includes('PDF') || normalized.includes('CONTENT')) return 'extraction';
  return 'analysis';
}

export function researchApiErrorFromCode(code: string, status = 0, message?: string) {
  return new ResearchApiError({ code, status, message, category: researchFailureCategory(code, status) });
}

function safeDevelopmentDiagnostic(path: string, response: Response, code: string, bodyLength: number) {
  if (process.env.NODE_ENV === 'production') return;
  console.error('[sharia-research] API response rejected', {
    path,
    status: response.status,
    contentType: response.headers.get('content-type') || 'missing',
    code,
    bodyLength,
  });
}

/**
 * Parses an API response without assuming it is JSON. Remote HTML is never
 * returned, logged, or exposed to the UI.
 */
export async function parseResearchApiResponse<T extends ErrorPayload>(response: Response, path: string): Promise<T> {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const body = await response.text();
  const isJson = contentType.includes('application/json') || contentType.includes('+json');

  if (!isJson) {
    const code = response.status === 404
      ? 'API_ROUTE_NOT_FOUND'
      : response.status === 401
        ? 'AUTH_REQUIRED'
        : 'NON_JSON_RESPONSE';
    safeDevelopmentDiagnostic(path, response, code, body.length);
    throw researchApiErrorFromCode(code, response.status);
  }

  let payload: T;
  try {
    payload = JSON.parse(body) as T;
  } catch {
    safeDevelopmentDiagnostic(path, response, 'INVALID_JSON_RESPONSE', body.length);
    throw researchApiErrorFromCode('INVALID_JSON_RESPONSE', response.status);
  }

  if (!response.ok || payload.ok === false || payload.success === false) {
    const code = payload.error?.code || payload.code || `HTTP_${response.status}`;
    throw researchApiErrorFromCode(code, response.status, payload.error?.message || payload.message);
  }

  return payload;
}

export async function fetchResearchJson<T extends ErrorPayload>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      cache: 'no-store',
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw researchApiErrorFromCode('RESEARCH_SERVICE_UNREACHABLE');
  }
  return parseResearchApiResponse<T>(response, path);
}
