import { describe, expect, it, vi } from 'vitest';
import { MobileSessionClient, PendingMobileMfa, type SessionStorage } from '../../../apps/expo-go/src/session';
import { registrationCopy, registrationError, type Registration } from '../../../apps/expo-go/src/registration';

const input: Registration = { username: 'Member_1', email: ' Member@example.com ', password: ' a long password ', confirmation: ' a long password ', termsAccepted: true, language: 'ar' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const session = { access_token: 'verified-access', refresh_token: 'rotating-refresh', expires_in: 3600, user: { id: 'new-user' } };
function setup(fetcher: typeof fetch, product = 'finance') {
  const values = new Map<string, string>();
  const storage: SessionStorage = { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async key => { values.delete(key); } };
  return { values, client: new MobileSessionClient({ product, supabaseUrl: 'https://auth.example', apiBaseUrl: 'https://api.example', publicKey: 'test-public-key', storage, fetcher }) };
}

describe('native registration validation and translations', () => {
  it.each([
    [{ username: 'x' }, 'INVALID_USERNAME'], [{ username: 'x@y' }, 'INVALID_USERNAME'],
    [{ email: 'invalid' }, 'INVALID_EMAIL'], [{ email: `${'x'.repeat(250)}@example.com` }, 'INVALID_EMAIL'],
    [{ password: '12345' }, 'INVALID_PASSWORD'], [{ password: 'x'.repeat(1025) }, 'INVALID_PASSWORD'],
    [{ confirmation: 'different' }, 'PASSWORD_MISMATCH'], [{ termsAccepted: false }, 'TERMS_REQUIRED'],
  ] as const)('rejects %j before sending any credentials', async (change, expected) => {
    const fetcher = vi.fn(); const { client } = setup(fetcher);
    await expect(client.signUp({ ...input, ...change })).rejects.toMatchObject({ code: expected });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('accepts Unicode usernames and preserves password whitespace', () => {
    expect(registrationError({ ...input, username: 'محمد_القلاف' })).toBeNull();
    expect(registrationError({ ...input, confirmation: input.password.trim() })).toBe('PASSWORD_MISMATCH');
  });
  it('keeps all copy and actionable errors aligned across languages', () => {
    for (const language of ['ar', 'en', 'fr'] as const) {
      expect(Object.keys(registrationCopy[language]).sort()).toEqual(Object.keys(registrationCopy.en).sort());
      expect(Object.keys(registrationCopy[language].errors).sort()).toEqual(Object.keys(registrationCopy.en.errors).sort());
      expect(Object.values(registrationCopy[language].errors).every(Boolean)).toBe(true);
    }
  });
});

describe('shared account registration', () => {
  it.each(['finance', 'investor', 'business'])('%s waits for email confirmation without saving a session or password', async product => {
    const fetcher = vi.fn(async () => json({ id: 'new-user', identities: [] }));
    const { client, values } = setup(fetcher, product);
    expect(await client.signUp(input)).toBe('confirmation_required');
    expect(client.signedIn).toBe(false); expect(values.size).toBe(0);
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(url).pathname).toBe('/auth/v1/signup');
    expect(new URL(url).searchParams.get('redirect_to')).toBe('https://api.example/login?lang=ar');
    expect(options.redirect).toBe('error'); expect(options.cache).toBe('no-store');
    expect(new Headers(options.headers).get('apikey')).toBe('test-public-key');
    expect(JSON.parse(options.body as string)).toEqual({ email: 'member@example.com', password: input.password, data: {
      username: 'member_1', display_name: 'Member_1', email: 'member@example.com', preferred_lang: 'ar', default_currency: 'KWD', terms_accepted_at: expect.any(String),
    } });
    await expect(client.request('/api/mobile/account')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
  it.each(['user_already_exists', 'email_exists'])('does not reveal an existing account for %s', async error_code => {
    const { client, values } = setup(vi.fn(async () => json({ error_code, msg: 'Private provider detail' }, 422)));
    expect(await client.signUp(input)).toBe('confirmation_required'); expect(values.size).toBe(0);
  });
  it.each([
    [429, 'over_email_send_rate_limit', 'RATE_LIMITED'], [422, 'weak_password', 'WEAK_PASSWORD'],
    [422, 'email_address_invalid', 'INVALID_EMAIL'], [400, 'signup_disabled', 'SIGNUP_DISABLED'],
    [500, 'internal_error', 'AUTH_UNAVAILABLE'], [400, 'captcha_failed', 'AUTH_UNAVAILABLE'],
  ])('keeps provider protections for status %s and code %s', async (status, error_code, expected) => {
    const { client, values } = setup(vi.fn(async () => json({ error_code, msg: 'Private provider detail' }, Number(status))));
    await expect(client.signUp(input)).rejects.toMatchObject({ code: expected }); expect(values.size).toBe(0);
  });
  it('rejects malformed success and network failures', async () => {
    await expect(setup(vi.fn(async () => json({}))).client.signUp(input)).rejects.toMatchObject({ code: 'AUTH_UNAVAILABLE' });
    await expect(setup(vi.fn(async () => { throw new Error('offline'); })).client.signUp(input)).rejects.toMatchObject({ code: 'NETWORK_UNAVAILABLE' });
  });
  it('accepts a provider-issued session only after the server security gate', async () => {
    let checked = false;
    const { client, values } = setup(vi.fn(async url => {
      if (String(url).includes('/signup')) return json(session);
      checked = true; expect(values.size).toBe(0); return json({ ok: true });
    }));
    expect(await client.signUp(input)).toBe('signed_in'); expect(checked).toBe(true);
    expect(values.get('sfm-finance-session')).toContain('rotating-refresh');
    expect([...values.values()].join()).not.toContain(input.password);
  });
  it.each(['totp', 'email'])('holds signup credentials in memory when %s MFA is required', async mfaType => {
    const { client, values } = setup(vi.fn(async url => String(url).includes('/signup') ? json(session) : json({ code: 'MFA_REQUIRED', mfaType }, 403)));
    await expect(client.signUp(input)).rejects.toBeInstanceOf(PendingMobileMfa);
    expect(client.signedIn).toBe(false); expect(values.size).toBe(0);
  });
  it('fails closed when the MFA security service is unavailable', async () => {
    const { client, values } = setup(vi.fn(async url => String(url).includes('/signup') ? json(session) : json({ code: 'AUTH_UNAVAILABLE' }, 503)));
    await expect(client.signUp(input)).rejects.toMatchObject({ code: 'AUTH_UNAVAILABLE' }); expect(values.size).toBe(0);
  });
  it('cannot revive a session when registration completes after logout', async () => {
    let finish!: (response: Response) => void;
    const { client, values } = setup(vi.fn(async () => new Promise<Response>(resolve => { finish = resolve; })));
    const operation = client.signUp(input);
    const rejected = expect(operation).rejects.toMatchObject({ code: 'STALE_SESSION' });
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    await client.signOut(false); finish(json(session)); await rejected;
    expect(client.signedIn).toBe(false); expect(values.size).toBe(0);
  });
  it('keeps an unconfirmed user signed out, then signs in through MFA after email confirmation', async () => {
    let confirmed = false;
    const fetcher = vi.fn(async url => {
      if (String(url).includes('/signup')) return json({ id: 'new-user' });
      if (String(url).includes('/token')) return confirmed ? json(session) : json({ error_code: 'email_not_confirmed' }, 400);
      return json({ ok: true });
    });
    const { client, values } = setup(fetcher);
    await client.signUp(input);
    await expect(client.signIn(input.email, input.password)).rejects.toMatchObject({ code: 'EMAIL_NOT_CONFIRMED' });
    expect(values.size).toBe(0);
    confirmed = true; await client.signIn(input.email, input.password);
    expect(client.signedIn).toBe(true);
    expect(values.get('sfm-finance-session')).toContain('verified-access');
  });
  it('resends signup mail without creating or accepting a session', async () => {
    const fetcher = vi.fn(async () => json({})); const { client, values } = setup(fetcher);
    await client.resendConfirmation(input.email, 'fr');
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(url).pathname).toBe('/auth/v1/resend');
    expect(new URL(url).searchParams.get('redirect_to')).toBe('https://api.example/login?lang=fr');
    expect(JSON.parse(options.body as string)).toEqual({ type: 'signup', email: 'member@example.com' });
    expect(values.size).toBe(0); expect(client.signedIn).toBe(false);
  });
  it('requests recovery through the existing rate-limited server route', async () => {
    const fetcher = vi.fn(async () => json({ ok: true }, 202)); const { client, values } = setup(fetcher);
    await client.requestPasswordReset(input.email);
    expect(fetcher).toHaveBeenCalledWith('https://api.example/api/auth/password-reset/request', expect.objectContaining({ redirect: 'error', body: JSON.stringify({ identifier: 'member@example.com' }) }));
    expect(values.size).toBe(0);
  });
});
