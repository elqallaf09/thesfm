// Bounded public Qatar MOJ CC BY metadata/sample verification. No private assets.
const base = 'https://www.data.gov.qa/api/explore/v2.1/catalog/datasets/weekly-real-estates-sales-bulletin';
async function read(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'error', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > 1000000) throw new Error('Response exceeds limit');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
const queries = [
  { select: 'min(registration_date) as first_date,max(registration_date) as last_date,count(*) as records', limit: '1' },
  { select: 'property_type,nw_l_qr,usage,lstkhdm,count(*) as records', group_by: 'property_type,nw_l_qr,usage,lstkhdm', order_by: 'records desc', limit: '40' },
  { select: 'registration_date,municipality_name,sm_lbldy,district_name,sm_lmntq,property_type,nw_l_qr,usage,lstkhdm,area_square_meters,share_area,price_per_square_foot,price_per_square_meter,number_of_shares_2400,share_value,property_value', order_by: 'registration_date desc', limit: '12' },
];
const metadata = await read(base);
console.log(JSON.stringify({ verifiedAt: new Date().toISOString(), dataset: metadata.dataset_id, publisher: metadata.metas.default.publisher, license: metadata.metas.default.license_url }));
for (const query of queries) {
 const url = new URL(`${base}/records`); for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
 const data = await read(url); console.log(JSON.stringify({ query, results: data.results }, null, 2));
}
