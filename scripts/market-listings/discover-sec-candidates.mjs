#!/usr/bin/env node
// Read-only discovery. Never promote a filing to a completed listing automatically.
const agent = process.env.SEC_USER_AGENT?.trim();
if (!agent || !agent.includes('@')) {
  console.error('Set SEC_USER_AGENT to your application name and authorized contact email, per SEC fair-access guidance.');
  process.exitCode = 1;
} else {
  const endpoint = 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&owner=exclude&count=100&output=atom';
  const response = await fetch(endpoint, {
    headers: { 'User-Agent': agent, accept: 'application/atom+xml' },
    signal: AbortSignal.timeout(15_000), redirect: 'error',
  });
  if (!response.ok) throw new Error(`SEC candidate discovery failed: HTTP ${response.status}; do not retry aggressively.`);
  const xml = await response.text();
  if (!xml.includes('<feed') || !xml.includes('http://www.w3.org/2005/Atom')) throw new Error('Unexpected SEC response');
  const decode = text => text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  const candidates = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => ({
    title: decode(entry.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? ''),
    updatedAt: entry.match(/<updated>([^<]+)<\/updated>/)?.[1] ?? null,
    filingUrl: decode(entry.match(/<link\b[^>]*href="([^"]+)"/)?.[1] ?? ''),
    reviewStatus: 'unreviewed-not-listing-evidence',
  })).filter(row => /^https:\/\/www\.sec\.gov\/Archives\//.test(row.filingUrl));
  process.stdout.write(JSON.stringify({ source: endpoint, fetchedAt: new Date().toISOString(), partial: true,
    warning: 'Recent 8-K candidates only, not a completed-listing feed. Read securities tables and actual commencement evidence before adding registry rows. Do not treat expected/priced/closing dates as first trade.', candidates }, null, 2) + '\n');
}
