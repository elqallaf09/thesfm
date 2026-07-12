import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PUBLIC_COMPANY_LISTING_SELECT_COLUMNS,
  normalizePublicCompanyListing,
} from '@/lib/server/companyListingHelpers';

const FORBIDDEN_PUBLIC_FIELDS = [
  'user_id',
  'stripe_customer_id',
  'stripe_subscription_id',
  'full_address',
  'google_maps_url',
  'latitude',
  'longitude',
  'license_number',
  'update_status',
  'pending_update',
  'deletion_requested',
  'deletion_requested_at',
  'last_owner_update_at',
  'admin_notes',
  'reviewed_at',
  'reviewed_by',
  'updated_at',
] as const;

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('public company-listing privacy contract', () => {
  it('keeps private ownership, billing, workflow and exact-location columns out of the public select', () => {
    const selectedColumns = PUBLIC_COMPANY_LISTING_SELECT_COLUMNS.split(',');
    expect(selectedColumns).toEqual(expect.arrayContaining([
      'id',
      'company_name',
      'category',
      'country',
      'city',
      'short_description',
      'services',
      'logo_url',
      'status',
      'approved_at',
    ]));
    for (const field of FORBIDDEN_PUBLIC_FIELDS) {
      expect(selectedColumns).not.toContain(field);
    }
  });

  it('projects only intended public fields even when passed a privileged database row', () => {
    const result = normalizePublicCompanyListing({
      id: 'company-1',
      user_id: 'owner-private',
      stripe_customer_id: 'cus_private',
      stripe_subscription_id: 'sub_private',
      company_name: 'Public Company',
      category: 'investment',
      country: 'Kuwait',
      city: 'Kuwait City',
      full_address: 'Private exact address',
      google_maps_url: 'https://maps.example/private',
      latitude: 29.3,
      longitude: 47.9,
      short_description: 'Public summary',
      long_description: 'Public profile',
      website_url: 'https://company.example',
      email: 'CONTACT@COMPANY.EXAMPLE',
      phone: '+965 12345678',
      whatsapp: '+965 12345678',
      linkedin_url: 'https://www.linkedin.com/company/public-company',
      twitter_url: 'https://x.com/publiccompany',
      instagram_url: 'https://www.instagram.com/publiccompany',
      founded_year: 2020,
      license_number: 'private-license',
      regulator_name: 'Public regulator',
      services: ['Advisory'],
      logo_url: 'https://company.example/logo.png',
      cover_image_url: 'https://company.example/cover.png',
      status: 'approved',
      update_status: 'pending_update',
      pending_update: { private: true },
      deletion_requested: true,
      deletion_requested_at: '2026-01-01T00:00:00.000Z',
      last_owner_update_at: '2026-01-01T00:00:00.000Z',
      admin_notes: 'private note',
      reviewed_at: '2026-01-02T00:00:00.000Z',
      reviewed_by: 'reviewer-private',
      is_featured: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      approved_at: '2025-01-02T00:00:00.000Z',
    });

    expect(result).toMatchObject({
      id: 'company-1',
      company_name: 'Public Company',
      category: 'investment',
      country: 'Kuwait',
      city: 'Kuwait City',
      short_description: 'Public summary',
      services: ['Advisory'],
      status: 'approved',
      is_featured: true,
    });
    for (const field of FORBIDDEN_PUBLIC_FIELDS) {
      expect(result).not.toHaveProperty(field);
    }
  });

  it('requires both public list and public detail routes to use the public projection', () => {
    const listRoute = source('src/app/api/company-listings/route.ts');
    const detailRoute = source('src/app/api/company-listings/[id]/route.ts');
    expect(listRoute).toContain('.select(PUBLIC_SELECT_COLUMNS)');
    expect(listRoute).toContain('normalizePublicCompanyListing(');
    expect(detailRoute).toContain('.select(PUBLIC_SELECT_COLUMNS)');
    expect(detailRoute).toContain(".eq('status', 'approved')");
    expect(detailRoute).toContain('normalizePublicCompanyListing(');
  });
});
