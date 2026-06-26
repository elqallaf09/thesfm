import crypto from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';

type SmtpMailInput = {
  to: string | string[];
  subject: string;
  text?: string | null;
  html?: string | null;
  replyTo?: string | null;
  fromName?: string;
  from?: string;
};

type SmtpEnvelope = {
  from: string;
  to: string[];
};

type SmtpMailResult = {
  accepted: string[];
  rejected: string[];
  envelope: SmtpEnvelope;
  response: string;
  responseCode: number;
};

type SmtpErrorDetails = {
  name: string;
  message: string;
  responseCode?: number;
  response?: string;
  command?: string;
  rejected?: string[];
  envelope?: SmtpEnvelope;
  code?: string;
  stack?: string;
};

type MailValidationResult = {
  ok: boolean;
  payload?: {
    to: string[];
    subject: string;
    text: string | null;
    html: string | null;
    replyTo?: string | null;
    from: string;
    fromName?: string;
  };
  errors: string[];
  rejected: string[];
};

export class SmtpMailError extends Error {
  responseCode?: number;
  response?: string;
  command?: string;
  rejected?: string[];
  envelope?: SmtpEnvelope;
  code?: string;

  constructor(message: string, details: Omit<SmtpErrorDetails, 'name' | 'message' | 'stack'> = {}) {
    super(message);
    this.name = 'SmtpMailError';
    this.responseCode = details.responseCode;
    this.response = details.response;
    this.command = details.command;
    this.rejected = details.rejected;
    this.envelope = details.envelope;
    this.code = details && 'code' in details ? String((details as { code?: unknown }).code) : undefined;
  }
}

function headerSafe(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function encodeHeader(value: string) {
  const safe = headerSafe(value);
  return /^[\x00-\x7F]*$/.test(safe) ? safe : `=?UTF-8?B?${Buffer.from(safe, 'utf8').toString('base64')}?=`;
}

function createSmtpReader(socket: net.Socket | tls.TLSSocket) {
  let buffer = '';
  const waiters: Array<(value: string) => void> = [];

  socket.on('data', chunk => {
    buffer += chunk.toString('utf8');
    flush();
  });

  function hasCompleteResponse() {
    const lines = buffer.split(/\r?\n/).filter(Boolean);
    return lines.length > 0 && /^\d{3} /.test(lines[lines.length - 1]);
  }

  function flush() {
    if (!waiters.length || !hasCompleteResponse()) return;
    const resolve = waiters.shift();
    const response = buffer;
    buffer = '';
    resolve?.(response);
  }

  return function readResponse(timeoutMs = 15000) {
    return new Promise<string>((resolve, reject) => {
      let wrapped: (response: string) => void;
      const timer = setTimeout(() => {
        const index = waiters.indexOf(wrapped);
        if (index >= 0) waiters.splice(index, 1);
        reject(new SmtpMailError('SMTP response timed out'));
      }, timeoutMs);

      wrapped = (response: string) => {
        clearTimeout(timer);
        resolve(response);
      };
      waiters.push(wrapped);
      flush();
    });
  };
}

function responseCode(response: string) {
  const match = response.match(/^(\d{3})/m);
  return match ? Number(match[1]) : 0;
}

function maskCommand(command: string) {
  if (/^AUTH\s+LOGIN/i.test(command)) return 'AUTH LOGIN';
  if (/^[A-Za-z0-9+/=]{12,}$/.test(command)) return '[SMTP credential payload]';
  return command;
}

async function expectSmtp(
  responsePromise: Promise<string>,
  allowed: number[],
  context: {
    command?: string;
    envelope?: SmtpEnvelope;
    rejected?: string[];
  } = {},
) {
  const response = await responsePromise;
  const code = responseCode(response);
  if (!allowed.includes(code)) {
    throw new SmtpMailError(`SMTP error ${code || 'unknown'}`, {
      responseCode: code,
      response,
      command: context.command,
      envelope: context.envelope,
      rejected: context.rejected,
    });
  }
  return { response, responseCode: code };
}

async function writeCommand(
  socket: net.Socket | tls.TLSSocket,
  readResponse: ReturnType<typeof createSmtpReader>,
  command: string,
  allowed: number[],
  context: {
    envelope?: SmtpEnvelope;
    rejected?: string[];
    logCommand?: string;
  } = {},
) {
  socket.write(`${command}\r\n`);
  return expectSmtp(readResponse(), allowed, {
    command: context.logCommand ?? maskCommand(command),
    envelope: context.envelope,
    rejected: context.rejected,
  });
}

function dotStuff(value: string) {
  return value.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
}

async function createPlainSocket(host: string, port: number) {
  return new Promise<net.Socket>((resolve, reject) => {
    const socket = net.connect({ host, port });
    socket.once('connect', () => resolve(socket));
    socket.once('error', reject);
    socket.setTimeout(20000, () => socket.destroy(new SmtpMailError('SMTP connection timed out')));
  });
}

async function createTlsSocket(host: string, port: number) {
  return new Promise<tls.TLSSocket>((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host });
    socket.once('secureConnect', () => resolve(socket));
    socket.once('error', reject);
    socket.setTimeout(20000, () => socket.destroy(new SmtpMailError('SMTP TLS connection timed out')));
  });
}

function extractDisplayName(value: string) {
  const match = value.match(/^\s*"?([^"<]*)"?\s*<[^>]+>\s*$/);
  return headerSafe(match?.[1] || '');
}

function emailAddress(value: string | null | undefined) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const bracketMatch = raw.match(/<([^>]+)>/);
  const candidate = (bracketMatch?.[1] ?? raw).trim().replace(/^mailto:/i, '');
  return /^[^\s<>,;@]+@[^\s<>,;@]+\.[^\s<>,;@]+$/.test(candidate) ? candidate : null;
}

export function maskEmailForLog(input: string | null | undefined) {
  const email = emailAddress(input);
  if (!email) return '[redacted]';
  const [name, domain] = email.split('@');
  if (!name || !domain) return '[redacted]';
  const maskedName = name.length <= 2 ? `${name[0] ?? ''}*` : `${name.slice(0, 2)}***`;
  return `${maskedName}@${domain}`;
}

export function sanitizeEmail(value: unknown) {
  return emailAddress(value === null || value === undefined ? '' : String(value).trim());
}

export function validateMailPayload(input: {
  to: unknown;
  subject: unknown;
  text?: unknown;
  html?: unknown;
  replyTo?: unknown;
  from?: unknown;
  fromName?: string;
}): MailValidationResult {
  const config = smtpConfig();
  const errors: string[] = [];
  const rejected: string[] = [];

  if (!config) {
    return { ok: false, errors: ['SMTP mail service is not configured'], rejected };
  }

  const from = sanitizeEmail(input.from ?? config.from);
  if (!from) {
    errors.push('SMTP sender email is required and must be valid');
  }

  const subject = cleanSubject(typeof input.subject === 'string' ? input.subject : '');
  const text = cleanBody(typeof input.text === 'string' ? input.text : null);
  const html = cleanBody(typeof input.html === 'string' ? input.html : null);
  const toInputs = Array.isArray(input.to)
    ? input.to.map(item => String(item ?? '').trim())
    : [String(input.to ?? '').trim()];
  const to = toInputs.map(item => sanitizeEmail(item)).filter((item): item is string => Boolean(item));
  const invalidTo = toInputs.filter(item => item && !sanitizeEmail(item));
  const replyTo = sanitizeEmail(input.replyTo);

  if (!to.length) {
    errors.push(input.to ? 'SMTP recipient is invalid' : 'SMTP recipient is required');
    rejected.push(...invalidTo);
  }
  if (!subject) {
    errors.push('SMTP subject is required');
  }
  if (!text && !html) {
    errors.push('SMTP text or HTML body is required');
  }
  if (input.replyTo !== undefined && input.replyTo !== null && input.replyTo !== '' && !replyTo) {
    errors.push('SMTP reply-to is invalid');
  }

  const payload = {
    to,
    subject,
    text,
    html,
    replyTo: input.replyTo ? replyTo ?? null : null,
    from: from ?? config.from,
    fromName: input.fromName,
  };

  if (errors.length) {
    return {
      ok: false,
      payload,
      errors,
      rejected,
    };
  }

  return { ok: true, payload, errors, rejected };
}

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const rawFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
  const from = emailAddress(rawFrom);
  const fromName = rawFrom ? extractDisplayName(rawFrom) : '';

  if (!host || !port || !user || !pass || !from) return null;
  return { host, port, user, pass, from, fromName };
}

function recipients(value: string | string[]) {
  const rawRecipients = Array.isArray(value) ? value : value.split(/[;,]/);
  const parsed = rawRecipients
    .map(item => emailAddress(item))
    .filter((item): item is string => Boolean(item));
  return Array.from(new Set(parsed));
}

function cleanSubject(value: string) {
  return headerSafe(value).slice(0, 180);
}

function cleanBody(value: string | null | undefined) {
  const body = String(value ?? '').trim();
  return body || null;
}

export function isSmtpMailConfigured() {
  return Boolean(smtpConfig());
}

export function getSmtpMailConfigStatus() {
  const required = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT || '587',
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !String(value ?? '').trim())
    .map(([key]) => key);

  if (required.SMTP_FROM && !emailAddress(required.SMTP_FROM)) missing.push('SMTP_FROM_VALID_EMAIL');

  return {
    configured: missing.length === 0,
    missing,
  };
}

export function getSmtpErrorDetails(error: unknown): SmtpErrorDetails {
  if (error instanceof SmtpMailError) {
    return {
      name: error.name,
      message: error.message,
      responseCode: error.responseCode,
      response: error.response,
      command: error.command,
      rejected: error.rejected,
      envelope: error.envelope,
      code: error.code,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      response: (error as { response?: string })?.response,
      responseCode: (error as { responseCode?: number })?.responseCode,
      command: (error as { command?: string })?.command,
      rejected: (error as { rejected?: string[] })?.rejected,
      envelope: (error as { envelope?: SmtpEnvelope })?.envelope,
      code: (error as { code?: string })?.code,
      stack: error.stack,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error ?? 'Unknown SMTP error'),
  };
}

export function logSmtpMailError(scope: string, error: unknown, metadata: Record<string, unknown> = {}) {
  console.error(scope, {
    ...metadata,
    smtp: getSmtpErrorDetails(error),
  });
}

export function smtpErrorUserMessage(error: unknown) {
  const details = getSmtpErrorDetails(error);
  if (details.responseCode === 555) {
    return 'تعذر إرسال البريد بسبب صيغة غير صحيحة في بيانات الرسالة. تمت إضافة التفاصيل إلى سجلات الخادم.';
  }
  if (details.responseCode && details.responseCode >= 500) {
    return 'تعذر إرسال البريد حالياً من مزود البريد. تمت إضافة التفاصيل إلى سجلات الخادم.';
  }
  return 'تعذر إرسال البريد حالياً. تمت إضافة التفاصيل إلى سجلات الخادم.';
}

export async function sendSmtpMail(input: SmtpMailInput): Promise<SmtpMailResult> {
  const validation = validateMailPayload(input);
  if (!validation.ok || !validation.payload) {
    const firstError = validation.errors[0] ?? 'SMTP mail payload is invalid';
    throw Object.assign(new SmtpMailError(firstError), { code: 'smtp_invalid_payload' });
  }

  const config = smtpConfig();
  if (!config) {
    throw Object.assign(new SmtpMailError('SMTP email is not configured'), { code: 'smtp_not_configured' });
  }

  const to = validation.payload.to;
  const rejected = validation.rejected;
  const subject = validation.payload.subject;
  const text = validation.payload.text;
  const html = validation.payload.html;
  const replyTo = validation.payload.replyTo;
  const from = validation.payload.from;
  const fromName = headerSafe(validation.payload.fromName || config.fromName || 'THE SFM');
  const envelope: SmtpEnvelope = { from, to };
  const messageId = `<${crypto.randomUUID()}@the-sfm.com>`;
  let socket: net.Socket | tls.TLSSocket | null = null;
  let dataResponse: Awaited<ReturnType<typeof expectSmtp>> | null = null;

  console.info('[EmailService] sending SMTP email', {
    provider: config.host,
    secure: config.port === 465,
    from,
    to,
    subject,
    hasText: Boolean(text),
    hasHtml: Boolean(html),
    replyTo: replyTo ?? null,
    envelope,
  });

  try {
    socket = config.port === 465
      ? await createTlsSocket(config.host, config.port)
      : await createPlainSocket(config.host, config.port);
    let readResponse = createSmtpReader(socket);

    await expectSmtp(readResponse(), [220], { command: 'CONNECT', envelope });
    await writeCommand(socket, readResponse, `EHLO ${config.host}`, [250], { envelope });

    if (config.port !== 465) {
      await writeCommand(socket, readResponse, 'STARTTLS', [220], { envelope });
      socket.removeAllListeners('data');
      socket = tls.connect({ socket, servername: config.host });
      readResponse = createSmtpReader(socket);
      await new Promise<void>((resolve, reject) => {
        (socket as tls.TLSSocket).once('secureConnect', resolve);
        socket?.once('error', reject);
      });
      await writeCommand(socket, readResponse, `EHLO ${config.host}`, [250], { envelope });
    }

    await writeCommand(socket, readResponse, 'AUTH LOGIN', [334], { envelope });
    await writeCommand(socket, readResponse, Buffer.from(config.user).toString('base64'), [334], {
      envelope,
      logCommand: '[SMTP username]',
    });
    await writeCommand(socket, readResponse, Buffer.from(config.pass).toString('base64'), [235], {
      envelope,
      logCommand: '[SMTP password]',
    });

    await writeCommand(socket, readResponse, `MAIL FROM:<${from}>`, [250], { envelope });
    for (const recipient of to) {
      await writeCommand(socket, readResponse, `RCPT TO:<${recipient}>`, [250, 251], { envelope, rejected });
    }
    await writeCommand(socket, readResponse, 'DATA', [354], { envelope });

    const boundary = `sfm-${crypto.randomUUID()}`;
    const headers = [
      `From: ${encodeHeader(fromName)} <${from}>`,
      `To: ${to.join(', ')}`,
      replyTo ? `Reply-To: ${replyTo}` : '',
      `Subject: ${encodeHeader(subject)}`,
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ].filter(Boolean);

    const plainText = text || String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const htmlBody = html || String(text ?? '').replace(/\n/g, '<br>');
    const body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      plainText,
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      htmlBody,
      `--${boundary}--`,
    ].join('\r\n');

    socket.write(`${dotStuff([...headers, '', body].join('\r\n'))}\r\n.\r\n`);
    dataResponse = await expectSmtp(readResponse(), [250], { command: 'DATA body', envelope, rejected });
    await writeCommand(socket, readResponse, 'QUIT', [221, 250], { envelope });
    socket.end();

    return {
      accepted: to,
      rejected: [],
      envelope,
      response: dataResponse.response,
      responseCode: dataResponse.responseCode,
    };
  } catch (error) {
    const smtpError = error instanceof SmtpMailError
      ? error
      : new SmtpMailError(error instanceof Error ? error.message : String(error), { envelope, rejected });
    logSmtpMailError('[EmailService] SMTP send failed', smtpError, {
      provider: config.host,
      from,
      to,
      subject,
    });
    throw smtpError;
  } finally {
    if (socket && !socket.destroyed) socket.destroy();
  }
}

export const EmailService = {
  send: sendSmtpMail,
  isConfigured: isSmtpMailConfigured,
  getConfigStatus: getSmtpMailConfigStatus,
  getErrorDetails: getSmtpErrorDetails,
  logError: logSmtpMailError,
};
