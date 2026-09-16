/** The only permitted POST in the public-source fetcher is the exchange's
 * credential-free read protocol. No arbitrary method/body or redirect replay.
 */
export function validatePublicReadForm(input: string | URL, form: Record<string, string>) {
  const url = new URL(input);
  if (url.toString() !== 'https://api2.dfm.ae/web/widgets/v1/data' || !form || typeof form !== 'object' || Array.isArray(form)) {
    throw new Error('PUBLIC_READ_FORM_NOT_ALLOWED');
  }
  const command = form.Command;
  const keys = command === 'shariahlisting' ? ['Command', 'Language']
    : command === 'shariahlistingdetails' ? ['Command', 'Language', 'year', 'quarter', 'exchange'] : [];
  if (!keys.length || Object.keys(form).length !== keys.length || keys.some(key => typeof form[key] !== 'string')
    || Object.keys(form).some(key => !keys.includes(key)) || form.Language !== 'en') throw new Error('PUBLIC_READ_FORM_NOT_ALLOWED');
  if (command === 'shariahlistingdetails' && (!/^20\d{2}$/.test(form.year) || !/^[1-4]$/.test(form.quarter)
    || !['dfm', 'nasdaq'].includes(form.exchange))) throw new Error('PUBLIC_READ_FORM_NOT_ALLOWED');
  return new URLSearchParams(Object.entries(form).sort(([a], [b]) => a.localeCompare(b))).toString();
}
