import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

function readProjectFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('operational API production guards', () => {
  const providerRoute = readProjectFile('src/app/api/trader/provider-status/route.ts');
  const databaseHealthRoute = readProjectFile('src/app/api/health/database/route.ts');
  const investorViewRoute = readProjectFile('src/app/api/investor/view/route.ts');
  const documentDebugRoute = readProjectFile('src/app/api/debug/document-ai/route.ts');
  const receiptDebugRoute = readProjectFile('src/app/api/debug/receipt-provider/route.ts');
  const rateLimiter = readProjectFile('src/lib/server/rateLimiter.ts');

  it('keeps provider GET read-only and moves mutations behind authenticated admin POST', () => {
    const getHandler = providerRoute.slice(
      providerRoute.indexOf('export async function GET'),
      providerRoute.indexOf('export async function POST'),
    );
    const postHandler = providerRoute.slice(providerRoute.indexOf('export async function POST'));

    expect(getHandler).toContain('MUTATION_REQUIRES_AUTHENTICATED_POST');
    expect(getHandler).toContain('rateLimitRequest');
    expect(getHandler).not.toContain('resetFmpRateLimitCooldown()');
    expect(getHandler).not.toContain('clearTraderQuoteCache()');
    expect(postHandler).toContain("requireAdminApiAccess(request, 'admin_dashboard')");
    expect(postHandler).toContain('resetFmpRateLimitCooldown()');
    expect(postHandler).toContain('clearTraderQuoteCache()');
    expect(providerRoute).not.toContain('ADMIN_DIAGNOSTICS_TOKEN');
    expect(providerRoute).not.toContain("searchParams.get('adminToken')");
    expect(providerRoute).not.toContain('lastError: fmpRuntime.lastError');
  });

  it('keeps public database health coarse and requires admin access for details', () => {
    const publicBody = databaseHealthRoute.slice(
      databaseHealthRoute.indexOf('function publicHealthBody'),
      databaseHealthRoute.indexOf('export async function GET'),
    );

    expect(publicBody).not.toContain('tables');
    expect(publicBody).not.toContain('columns');
    expect(publicBody).not.toContain('missingEnv');
    expect(databaseHealthRoute).toContain("requireAdminApiAccess(request, 'admin_dashboard')");
    expect(databaseHealthRoute).not.toContain('error?.message)}`');
    expect(databaseHealthRoute).toContain("code: 'DATABASE_HEALTH_CHECK_FAILED'");
  });

  it('requires authenticated admin access for production debug routes', () => {
    for (const route of [documentDebugRoute, receiptDebugRoute]) {
      expect(route).toContain("process.env.NODE_ENV === 'production'");
      expect(route).toContain("requireAdminApiAccess(request, 'admin_dashboard')");
      expect(route).not.toContain('MARKET_PROVIDER_HEALTH_TOKEN');
      expect(route).not.toContain("searchParams.get('token')");
      expect(route).not.toContain('isValidAdminAccessCode');
    }
  });

  it('bounds public investor actions and avoids synchronous password checks and wrong-guess writes', () => {
    expect(investorViewRoute).toContain("prefix: 'investor-view'");
    expect(investorViewRoute).toContain("prefix: 'investor-password'");
    expect(investorViewRoute).toContain("prefix: 'investor-question'");
    expect(investorViewRoute).toContain("prefix: 'investor-event'");
    expect(investorViewRoute).toContain('await verifyInvestorPasswordAsync(password, link.password_hash)');
    expect(investorViewRoute).not.toContain('verifyInvestorPassword(password, link.password_hash)');
    expect(investorViewRoute).not.toContain("reason: 'wrong_password'");
    expect(investorViewRoute).toContain('not atomic');
  });

  it('bounds the in-memory limiter and does not keep a serverless process alive', () => {
    expect(rateLimiter).toContain('MAX_STORE_ENTRIES = 10_000');
    expect(rateLimiter).toContain('ensureStoreCapacity(now)');
    expect(rateLimiter).toContain('.unref?.()');
  });
});
