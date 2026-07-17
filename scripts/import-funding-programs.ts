import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type FundingProgramCsvRow = {
  name_ar: string;
  name_en?: string;
  funding_type?: string;
  country?: string;
  provider_name?: string;
  website_url?: string;
  application_url?: string;
  currency?: string;
  typical_ticket_min?: string;
  typical_ticket_max?: string;
  data_status?: string;
  data_source_url?: string;
};

const FUNDING_TYPES = new Set([
  'self_funding',
  'bank_loan',
  'government_fund',
  'angel',
  'venture_capital',
  'accelerator',
  'incubator',
  'islamic_finance',
  'grant',
  'strategic_partner',
  'other',
]);

const DATA_STATUSES = new Set(['verified', 'pending_review', 'unverified', 'outdated']);
const [, , csvPath] = process.argv;

if (!csvPath) {
  throw new Error('Usage: tsx scripts/import-funding-programs.ts ./funding-programs.csv');
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY are required. Never expose a server key to the frontend.');
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
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

function parseCsv(content: string): FundingProgramCsvRow[] {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]).map(header => header.trim());
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {}) as FundingProgramCsvRow;
  });
}

function normalizeNumber(value?: string) {
  if (!value?.trim()) return null;
  const numberValue = Number(value.replace(/,/g, ''));
  return Number.isFinite(numberValue) ? numberValue : null;
}

const rows = parseCsv(readFileSync(resolve(csvPath), 'utf8'))
  .filter(row => row.name_ar?.trim())
  .map(row => {
    const fundingType = row.funding_type?.trim() || 'other';
    const dataStatus = row.data_status?.trim() || 'unverified';
    return {
      name_ar: row.name_ar.trim(),
      name_en: row.name_en?.trim() || null,
      funding_type: FUNDING_TYPES.has(fundingType) ? fundingType : 'other',
      country: row.country?.trim() || null,
      provider_name: row.provider_name?.trim() || null,
      website_url: row.website_url?.trim() || null,
      application_url: row.application_url?.trim() || null,
      currency: row.currency?.trim().toUpperCase() || 'KWD',
      typical_ticket_min: normalizeNumber(row.typical_ticket_min),
      typical_ticket_max: normalizeNumber(row.typical_ticket_max),
      data_status: DATA_STATUSES.has(dataStatus) ? dataStatus : 'unverified',
      data_source_url: row.data_source_url?.trim() || null,
      is_active: true,
    };
  });

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const { error } = await supabase
  .from('business_funding_programs')
  .upsert(rows, { onConflict: 'name_ar,provider_name,country' });

if (error) throw error;

console.log(`Imported ${rows.length} funding programs.`);
