import crypto from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';
import { NextRequest, NextResponse } from 'next/server';
import { SUPPORT_EMAIL } from '@/lib/constants/contact';

export const runtime = 'nodejs';

const MAX_MESSAGE_LENGTH = 3000;
const MAX_SUBJECT_LENGTH = 120;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

const rateLimit = new Map<string, { count: number; resetAt: number }>();

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  website?: unknown;
};

function jsonError(message: string, status = 400, code = 'invalid_request') {
  return NextResponse.json({ success: false, error: message, code }, { status });
}

function clean(value: unknown, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function headerSafe(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function encodeHeader(value: string) {
  const safe = headerSafe(value);
  return /^[\x00-\x7F]*$/.test(safe) ? safe : `=?UTF-8?B?${Buffer.from(safe, 'utf8').toString('base64')}?=`;
}

function getClientKey(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'anonymous';
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT_MAX) return false;
  current.count += 1;
  return true;
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
        reject(new Error('SMTP response timed out'));
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

async function expectSmtp(responsePromise: Promise<string>, allowed: number[]) {
  const response = await responsePromise;
  const code = responseCode(response);
  if (!allowed.includes(code)) {
    throw new Error(`SMTP error ${code || 'unknown'}`);
  }
  return response;
}

async function writeCommand(socket: net.Socket | tls.TLSSocket, readResponse: ReturnType<typeof createSmtpReader>, command: string, allowed: number[]) {
  socket.write(`${command}\r\n`);
  return expectSmtp(readResponse(), allowed);
}

function dotStuff(value: string) {
  return value.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
}

async function createPlainSocket(host: string, port: number) {
  return new Promise<net.Socket>((resolve, reject) => {
    const socket = net.connect({ host, port });
    socket.once('connect', () => resolve(socket));
    socket.once('error', reject);
    socket.setTimeout(20000, () => {
      socket.destroy(new Error('SMTP connection timed out'));
    });
  });
}

async function createTlsSocket(host: string, port: number) {
  return new Promise<tls.TLSSocket>((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host });
    socket.once('secureConnect', () => resolve(socket));
    socket.once('error', reject);
    socket.setTimeout(20000, () => {
      socket.destroy(new Error('SMTP TLS connection timed out'));
    });
  });
}

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.CONTACT_TO_EMAIL || SUPPORT_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || user || SUPPORT_EMAIL;

  if (!host || !port || !user || !pass || !to || !from) return null;
  return { host, port, user, pass, to, from };
}

async function sendMail(input: { name: string; email: string; subject: string; message: string }) {
  const config = smtpConfig();
  if (!config) {
    throw Object.assign(new Error('Contact email is not configured'), { code: 'smtp_not_configured' });
  }

  let socket: net.Socket | tls.TLSSocket = config.port === 465
    ? await createTlsSocket(config.host, config.port)
    : await createPlainSocket(config.host, config.port);
  let readResponse = createSmtpReader(socket);

  await expectSmtp(readResponse(), [220]);
  await writeCommand(socket, readResponse, `EHLO ${config.host}`, [250]);

  if (config.port !== 465) {
    await writeCommand(socket, readResponse, 'STARTTLS', [220]);
    socket.removeAllListeners('data');
    socket = tls.connect({ socket, servername: config.host });
    readResponse = createSmtpReader(socket);
    await new Promise<void>((resolve, reject) => {
      (socket as tls.TLSSocket).once('secureConnect', resolve);
      socket.once('error', reject);
    });
    await writeCommand(socket, readResponse, `EHLO ${config.host}`, [250]);
  }

  await writeCommand(socket, readResponse, 'AUTH LOGIN', [334]);
  await writeCommand(socket, readResponse, Buffer.from(config.user).toString('base64'), [334]);
  await writeCommand(socket, readResponse, Buffer.from(config.pass).toString('base64'), [235]);

  await writeCommand(socket, readResponse, `MAIL FROM:<${config.from}>`, [250]);
  await writeCommand(socket, readResponse, `RCPT TO:<${config.to}>`, [250, 251]);
  await writeCommand(socket, readResponse, 'DATA', [354]);

  const submittedAt = new Date().toISOString();
  const subject = `[THE SFM Contact] ${input.subject}`;
  const body = [
    'New message from THE SFM Contact page',
    '',
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Subject: ${input.subject}`,
    `Submitted at: ${submittedAt}`,
    'Source: Contact page',
    '',
    'Message:',
    input.message,
  ].join('\n');

  const message = [
    `From: ${encodeHeader('THE SFM Support')} <${config.from}>`,
    `To: ${config.to}`,
    `Reply-To: ${headerSafe(input.email)}`,
    `Subject: ${encodeHeader(subject)}`,
    `Message-ID: <${crypto.randomUUID()}@the-sfm.com>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
  ].join('\r\n');

  socket.write(`${dotStuff(message)}\r\n.\r\n`);
  await expectSmtp(readResponse(), [250]);
  await writeCommand(socket, readResponse, 'QUIT', [221, 250]);
  socket.end();
}

export async function POST(request: NextRequest) {
  const key = getClientKey(request);
  if (!checkRateLimit(key)) {
    return jsonError('Too many contact requests. Please try again later.', 429, 'rate_limited');
  }

  let payload: ContactPayload;
  try {
    payload = await request.json() as ContactPayload;
  } catch {
    return jsonError('Invalid request payload.');
  }

  if (clean(payload.website, 200)) {
    return jsonError('Invalid contact request.', 400, 'spam_detected');
  }

  const name = clean(payload.name, 160);
  const email = clean(payload.email, 254).toLowerCase();
  const subject = clean(payload.subject, MAX_SUBJECT_LENGTH);
  const message = clean(payload.message, MAX_MESSAGE_LENGTH);

  if (!name) return jsonError('Name is required.', 400, 'name_required');
  if (!email || !isValidEmail(email)) return jsonError('A valid email is required.', 400, 'invalid_email');
  if (!subject) return jsonError('Subject is required.', 400, 'subject_required');
  if (!message || message.length < 10) return jsonError('Message must be at least 10 characters.', 400, 'message_required');

  try {
    await sendMail({ name, email, subject, message });
    return NextResponse.json({ success: true });
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : 'send_failed';
    console.error('Contact email send failed:', {
      code,
      message: error instanceof Error ? error.message : String(error),
    });
    if (code === 'smtp_not_configured') {
      return jsonError('Contact email delivery is not configured.', 503, 'smtp_not_configured');
    }
    return jsonError('Could not send contact message.', 502, 'send_failed');
  }
}
