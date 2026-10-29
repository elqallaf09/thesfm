function secureOrigin(value, label) {
  if (!value) return;
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label} must be an HTTPS origin`); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) throw new Error(`${label} must be an HTTPS origin`);
}
function publicKeyOnly(key) {
  if (!key || key.startsWith('sb_publishable_')) return;
  let role;
  try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role; } catch { /* Reject all unrecognized key formats. */ }
  if (role !== 'anon') throw new Error('Mobile configuration requires a publishable or anon Supabase key');
}
function validateMobileConfig(extra, options = {}) {
  if (options.requireAuth && (!extra.supabaseUrl || !extra.supabaseAnonKey)) {
    throw new Error('Release builds require EXPO_PUBLIC_SFM_SUPABASE_URL and EXPO_PUBLIC_SFM_SUPABASE_ANON_KEY');
  }
  secureOrigin(extra.apiBaseUrl, 'SFM API URL');
  secureOrigin(extra.supabaseUrl, 'Supabase URL');
  publicKeyOnly(extra.supabaseAnonKey);
}
module.exports = { validateMobileConfig };
