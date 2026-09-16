// Public metadata only. No credentials, user properties or protected registries.
const hosts = ['https://www.data.gov.bh', 'https://www.data.gov.qa'];
async function readMetadata(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'error', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > 2000000) throw new Error('Metadata exceeds limit');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
for (const host of hosts) {
  const url = new URL('/api/explore/v2.1/catalog/datasets', host);
  url.searchParams.set('where', 'search("real estate")');
  url.searchParams.set('limit', '20');
  try {
    const data = await readMetadata(url);
    console.log(JSON.stringify({ host, checkedAt: new Date().toISOString(), total: data.total_count, datasets: data.results?.map(d => ({
      id: d.dataset_id, metadata: d.metas, fields: d.fields?.map(f => ({ name: f.name, type: f.type, label: f.label, description: f.description }))
    })) }, null, 2));
  } catch (error) { console.log(JSON.stringify({ host, status: 'UNAVAILABLE', reason: error.message })); }
}
