import crypto from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';

type SmtpMailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string | null;
  fromName?: string;
};

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
  if (!allowed.includes(code)) throw new Error(`SMTP error ${code || 'unknown'}`);
  return response;
}

async function writeCommand(
  socket: net.Socket | tls.TLSSocket,
  readResponse: ReturnType<typeof createSmtpReader>,
  command: string,
  allowed: number[],
) {
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
    socket.setTimeout(20000, () => socket.destroy(new Error('SMTP connection timed out')));
  });
}

async function createTlsSocket(host: string, port: number) {
  return new Promise<tls.TLSSocket>((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host });
    socket.once('secureConnect', () => resolve(socket));
    socket.once('error', reject);
    socket.setTimeout(20000, () => socket.destroy(new Error('SMTP TLS connection timed out')));
  });
}

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.CONTACT_FROM_EMAIL || user;

  if (!host || !port || !user || !pass || !from) return null;
  return { host, port, user, pass, from };
}

function recipients(value: string | string[]) {
  return (Array.isArray(value) ? value : [value])
    .map(item => item.trim())
    .filter(Boolean);
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
    SMTP_FROM: process.env.SMTP_FROM || process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !String(value ?? '').trim())
    .map(([key]) => key);

  return {
    configured: missing.length === 0,
    missing,
  };
}

export async function sendSmtpMail(input: SmtpMailInput) {
  const config = smtpConfig();
  if (!config) {
    throw Object.assign(new Error('SMTP email is not configured'), { code: 'smtp_not_configured' });
  }

  const to = recipients(input.to);
  if (!to.length) throw new Error('SMTP email recipient is required');

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
  for (const recipient of to) {
    await writeCommand(socket, readResponse, `RCPT TO:<${recipient}>`, [250, 251]);
  }
  await writeCommand(socket, readResponse, 'DATA', [354]);

  const boundary = `sfm-${crypto.randomUUID()}`;
  const fromName = input.fromName || 'THE SFM';
  const headers = [
    `From: ${encodeHeader(fromName)} <${config.from}>`,
    `To: ${to.join(', ')}`,
    input.replyTo ? `Reply-To: ${headerSafe(input.replyTo)}` : '',
    `Subject: ${encodeHeader(input.subject)}`,
    `Message-ID: <${crypto.randomUUID()}@the-sfm.com>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean);

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    input.text,
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    input.html || input.text.replace(/\n/g, '<br>'),
    `--${boundary}--`,
  ].join('\r\n');

  socket.write(`${dotStuff([...headers, '', body].join('\r\n'))}\r\n.\r\n`);
  await expectSmtp(readResponse(), [250]);
  await writeCommand(socket, readResponse, 'QUIT', [221, 250]);
  socket.end();
}
