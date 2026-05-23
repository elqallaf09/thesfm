import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type OrganizationCsvRow = {
  name_ar: string;
  name_en?: string;
  license_number?: string;
  country?: string;
  city?: string;
  organization_type?: string;
  website_url?: string;
  phone?: string;
  email?: string;
  verification_status?: string;
  data_source?: string;
};

const [, , csvPath] = process.argv;

if (!csvPath) {
  throw new Error('Usage: tsx scripts/import-charity-organizations.ts ./organizations.csv');
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. Never expose the service role key to the frontend.');
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseCsv(content: string): OrganizationCsvRow[] {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]).map(header => header.trim());
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {}) as OrganizationCsvRow;
  });
}

const rows = parseCsv(readFileSync(resolve(csvPath), 'utf8'))
  .filter(row => row.name_ar?.trim())
  .map(row => ({
    name_ar: row.name_ar.trim(),
    name_en: row.name_en?.trim() || null,
    license_number: row.license_number?.trim() || null,
    country: row.country?.trim() || 'Kuwait',
    city: row.city?.trim() || null,
    organization_type: row.organization_type?.trim() || 'charity',
    website_url: row.website_url?.trim() || null,
    phone: row.phone?.trim() || null,
    email: row.email?.trim() || null,
    verification_status: row.verification_status?.trim() || 'unverified',
    data_source: row.data_source?.trim() || null,
    is_active: true,
  }));

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const { error } = await supabase
  .from('charity_organizations')
  .upsert(rows, { onConflict: 'license_number' });

if (error) throw error;

console.log(`Imported ${rows.length} charity organizations.`);
