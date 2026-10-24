export type MobileSession = { accessToken: string; refreshToken: string; expiresAt: number };
export type SessionStorage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };
export class MobileRequestError extends Error {
  constructor(public code: string, public status = 0) { super(code); }
}
export type MobileMfaType = 'totp' | 'email';
/** A first-factor session held only in memory until the server accepts MFA. */
export class PendingMobileMfa extends Error {
  readonly expiresAt = Date.now() + 10 * 60_000;
  challenge: string | null = null;
  finished = false;
  constructor(readonly type: MobileMfaType, readonly session: MobileSession, readonly epoch: number) { super('MFA_REQUIRED'); }
}
type Config = { product: string; supabaseUrl: string; publicKey: string; apiBaseUrl: string; storage: SessionStorage; fetcher?: typeof fetch; now?: () => number };
function parseSession(value: unknown, now: number): MobileSession {
  const row = value as Record<string, unknown> | null;
  if (!row || typeof row.access_token !== 'string' || !row.access_token || typeof row.refresh_token !== 'string' || !row.refresh_token || typeof row.expires_in !== 'number' || row.expires_in <= 0) throw new MobileRequestError('INVALID_SESSION');
  return { accessToken: row.access_token, refreshToken: row.refresh_token, expiresAt: now + row.expires_in * 1000 };
}
export class MobileSessionClient {
  private session: MobileSession | null = null;
  private refreshFlight: Promise<MobileSession> | null = null;
  private epoch = 0;
  private listeners = new Set<() => void>();
  private mfaRequiredListener: ((pending: PendingMobileMfa) => void) | null = null;
  private cache = new Map<string, { value: unknown; expires: number }>();
  private inflight = new Map<string, Promise<unknown>>();
  private persistTail: Promise<void> = Promise.resolve();
  private key: string;
  constructor(private config: Config) { this.key = `sfm-${config.product}-session`; }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  subscribeMfaRequired(listener: (pending: PendingMobileMfa) => void) {
    this.mfaRequiredListener = listener;
    return () => { if (this.mfaRequiredListener === listener) this.mfaRequiredListener = null; };
  }
  get signedIn() { return this.session !== null; }
  get generation() { return this.epoch; }
  private now() { return this.config.now?.() ?? Date.now(); }
  private emit() { this.listeners.forEach(listener => listener()); }
  private persist(session: MobileSession | null) {
    const run = () => session ? this.config.storage.setItem(this.key, JSON.stringify(session)) : this.config.storage.removeItem(this.key);
    const task = this.persistTail.then(run, run);
    this.persistTail = task.catch(() => {});
    return task;
  }
  private configured() {
    if (!this.config.supabaseUrl || !this.config.publicKey) throw new MobileRequestError('AUTH_NOT_CONFIGURED');
  }
  private async transport(url: string, init: RequestInit = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await (this.config.fetcher ?? fetch)(url, { ...init, cache: 'no-store', signal: controller.signal });
      const body = await response.json().catch(() => null) as Record<string, unknown> | null;
      return { response, body };
    } catch { throw new MobileRequestError('NETWORK_UNAVAILABLE'); }
    finally { clearTimeout(timeout); }
  }
  private requirePending(pending: PendingMobileMfa) {
    if (pending.finished || pending.expiresAt <= this.now() || pending.epoch !== this.epoch) throw new MobileRequestError('CHALLENGE_EXPIRED');
  }
  private async sessionSecurity(session: MobileSession, epoch: number) {
    const { response, body } = await this.transport(`${this.config.apiBaseUrl.replace(/\/$/, '')}/api/mobile/session`, { headers: { Authorization: `Bearer ${session.accessToken}` }, redirect: 'error' });
    if (epoch !== this.epoch) throw new MobileRequestError('STALE_SESSION');
    if (response.status === 403 && body?.code === 'MFA_REQUIRED') {
      const type = body.mfaType;
      if (type === 'totp' || type === 'email') throw new PendingMobileMfa(type, session, epoch);
      throw new MobileRequestError('MFA_REQUIRED', response.status);
    }
    if (!response.ok || body?.ok !== true) throw new MobileRequestError(String(body?.code ?? 'AUTH_UNAVAILABLE'), response.status);
  }
  private async mfaTransport(path: string, session: MobileSession, init: RequestInit = {}) {
    this.configured();
    return this.transport(`${this.config.supabaseUrl.replace(/\/$/, '')}${path}`, { ...init, redirect: 'error', headers: { apikey: this.config.publicKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json', ...init.headers } });
  }
  async restore() {
    const epoch = this.epoch;
    const saved = await this.config.storage.getItem(this.key);
    if (!saved || epoch !== this.epoch) return;
    try {
      const value = JSON.parse(saved) as MobileSession;
      if (!value.accessToken || !value.refreshToken || !Number.isFinite(value.expiresAt)) throw new Error('INVALID_SESSION');
      this.session = value;
      this.emit();
    } catch { await this.signOut(false); }
    // Keep renewable tokens during a temporary outage. Never turn network errors into logout.
  }
  async signIn(email: string, password: string) {
    this.configured();
    const epoch = ++this.epoch;
    this.session = null; this.clearCache(); this.emit();
    await this.persist(null);
    const { response, body } = await this.transport(`${this.config.supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: this.config.publicKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }),
    });
    if (!response.ok) throw new MobileRequestError(response.status === 400 ? 'INVALID_CREDENTIALS' : `AUTH_${response.status}`, response.status);
    const session = parseSession(body, this.now());
    await this.sessionSecurity(session, epoch);
    await this.acceptSession(session, epoch);
  }
  private async acceptSession(session: MobileSession, epoch: number) {
    if (epoch !== this.epoch) throw new MobileRequestError('STALE_SESSION');
    await this.persist(session);
    if (epoch !== this.epoch) throw new MobileRequestError('STALE_SESSION');
    this.session = session; this.emit();
  }
  async exchangeCode(code: string, verifier: string) {
    this.configured();
    const epoch = ++this.epoch;
    this.session = null; this.clearCache(); this.emit();
    await this.persist(null);
    const { response, body } = await this.transport(`${this.config.supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=pkce`, {
      method: 'POST', headers: { apikey: this.config.publicKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    });
    if (!response.ok) throw new MobileRequestError('OAUTH_FAILED', response.status);
    const session = parseSession(body, this.now());
    await this.sessionSecurity(session, epoch);
    await this.acceptSession(session, epoch);
  }
  async beginMfaIfRequired() {
    const epoch = this.epoch;
    const session = await this.activeSession();
    await this.sessionSecurity(session, epoch);
    return null;
  }
  async sendMfaEmail(pending: PendingMobileMfa) {
    this.requirePending(pending);
    if (pending.type !== 'email') throw new MobileRequestError('INVALID_CHALLENGE');
    const { response, body } = await this.transport(`${this.config.apiBaseUrl.replace(/\/$/, '')}/api/auth/mfa/mobile-email`, {
      method: 'POST', headers: { Authorization: `Bearer ${pending.session.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start' }), redirect: 'error',
    });
    this.requirePending(pending);
    if (!response.ok || typeof body?.challenge !== 'string' || !body.challenge) throw new MobileRequestError(String(body?.code ?? 'AUTH_UNAVAILABLE'), response.status);
    pending.challenge = body.challenge;
  }
  async verifyMfa(pending: PendingMobileMfa, code: string) {
    this.requirePending(pending);
    if (!/^\d{6}$/.test(code)) throw new MobileRequestError('INVALID_CODE');
    let body: Record<string, unknown> | null;
    if (pending.type === 'totp') {
      const account = await this.mfaTransport('/auth/v1/user', pending.session);
      const factors = Array.isArray(account.body?.factors) ? account.body.factors as Array<{ id?: unknown; factor_type?: unknown; status?: unknown }> : [];
      const factor = factors.find(item => typeof item.id === 'string' && item.factor_type === 'totp' && item.status === 'verified');
      const factorId = typeof factor?.id === 'string' ? factor.id : null;
      if (!account.response.ok || !factorId) throw new MobileRequestError('AUTH_UNAVAILABLE', account.response.status);
      this.requirePending(pending);
      const challenge = await this.mfaTransport(`/auth/v1/factors/${encodeURIComponent(factorId)}/challenge`, pending.session, { method: 'POST', body: '{}' });
      if (!challenge.response.ok || typeof challenge.body?.id !== 'string') throw new MobileRequestError(String(challenge.body?.code ?? 'AUTH_UNAVAILABLE'), challenge.response.status);
      this.requirePending(pending);
      const verified = await this.mfaTransport(`/auth/v1/factors/${encodeURIComponent(factorId)}/verify`, pending.session, { method: 'POST', body: JSON.stringify({ challenge_id: challenge.body.id, code }) });
      if (!verified.response.ok) throw new MobileRequestError(String(verified.body?.code ?? 'INVALID_CODE'), verified.response.status);
      body = verified.body;
    } else {
      if (!pending.challenge) throw new MobileRequestError('CHALLENGE_REQUIRED');
      const verified = await this.transport(`${this.config.apiBaseUrl.replace(/\/$/, '')}/api/auth/mfa/mobile-email`, {
        method: 'POST', headers: { Authorization: `Bearer ${pending.session.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', challenge: pending.challenge, code }), redirect: 'error',
      });
      if (!verified.response.ok) throw new MobileRequestError(String(verified.body?.code ?? 'INVALID_CODE'), verified.response.status);
      body = verified.body;
    }
    this.requirePending(pending);
    const session = parseSession(body, this.now());
    await this.sessionSecurity(session, pending.epoch);
    this.requirePending(pending);
    await this.acceptSession(session, pending.epoch);
    pending.finished = true;
  }
  async cancelMfa(pending: PendingMobileMfa) {
    if (pending.finished) return;
    pending.finished = true;
    if (pending.epoch === this.epoch) await this.signOut(false);
    await this.mfaTransport('/auth/v1/logout?scope=local', pending.session, { method: 'POST' }).catch(() => {});
  }
  private async activeSession(force = false): Promise<MobileSession> {
    const current = this.session;
    if (!current) throw new MobileRequestError('UNAUTHORIZED', 401);
    if (!force && current.expiresAt > this.now() + 60_000) return current;
    if (this.refreshFlight) return this.refreshFlight;
    const epoch = this.epoch;
    const flight = (async () => {
      this.configured();
      const { response, body } = await this.transport(`${this.config.supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST', headers: { apikey: this.config.publicKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: current.refreshToken }),
      });
      if (!response.ok) {
        if ([400, 401, 403].includes(response.status) && epoch === this.epoch) await this.signOut(false);
        throw new MobileRequestError([400, 401, 403].includes(response.status) ? 'SESSION_EXPIRED' : 'AUTH_UNAVAILABLE', response.status);
      }
      const session = parseSession(body, this.now());
      await this.acceptSession(session, epoch);
      return session;
    })();
    this.refreshFlight = flight;
    try { return await flight; } finally { if (this.refreshFlight === flight) this.refreshFlight = null; }
  }
  clearCache() { this.cache.clear(); this.inflight.clear(); }
  async request<T>(path: string, init: RequestInit = {}, ttlMs = 0): Promise<T> {
    if (!path.startsWith('/api/') || path.includes('://') || path.includes('\\')) throw new MobileRequestError('INVALID_API_PATH');
    const epoch = this.epoch;
    const key = `${epoch}:${path}`;
    const reading = !init.method || init.method === 'GET';
    if (reading && this.inflight.has(key)) return this.inflight.get(key) as Promise<T>;
    const task = (async () => {
      let session = await this.activeSession();
      if (epoch !== this.epoch) throw new MobileRequestError('STALE_SESSION');
      try { await this.sessionSecurity(session, epoch); }
      catch (reason) {
        if (reason instanceof PendingMobileMfa) this.mfaRequiredListener?.(reason);
        throw reason;
      }
      const cached = this.cache.get(key);
      if (reading && ttlMs && cached && cached.expires > this.now()) return cached.value as T;
      const send = () => this.transport(`${this.config.apiBaseUrl.replace(/\/$/, '')}${path}`, { ...init, redirect: 'error', headers: { ...init.headers, 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` } });
      let result = await send();
      if (result.response.status === 401) {
        session = await this.activeSession(true);
        if (epoch !== this.epoch) throw new MobileRequestError('STALE_SESSION');
        try { await this.sessionSecurity(session, epoch); }
        catch (reason) {
          if (reason instanceof PendingMobileMfa) this.mfaRequiredListener?.(reason);
          throw reason;
        }
        result = await send();
      }
      if (epoch !== this.epoch) throw new MobileRequestError('STALE_SESSION');
      if (!result.response.ok) {
        if (result.response.status === 401) await this.signOut(false);
        throw new MobileRequestError(String(result.body?.code ?? result.body?.error ?? 'REQUEST_FAILED'), result.response.status);
      }
      if (!reading) this.clearCache();
      else if (ttlMs) this.cache.set(key, { value: result.body, expires: this.now() + ttlMs });
      return result.body as T;
    })();
    if (reading) this.inflight.set(key, task);
    try { return await task; } finally { if (this.inflight.get(key) === task) this.inflight.delete(key); }
  }
  async signOut(revoke = true) {
    const previous = this.session;
    ++this.epoch;
    this.session = null; this.refreshFlight = null; this.clearCache(); this.emit();
    await this.persist(null);
    if (revoke && previous) {
      await this.transport(`${this.config.supabaseUrl.replace(/\/$/, '')}/auth/v1/logout?scope=local`, { method: 'POST', headers: { apikey: this.config.publicKey, Authorization: `Bearer ${previous.accessToken}` } }).catch(() => {});
    }
  }
}
