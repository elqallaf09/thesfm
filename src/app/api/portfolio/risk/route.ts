import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromBearerToken } from "@/lib/server/adminAccess";
import { loadCanonicalInvestmentPositions, InvestmentCanonicalNotReadyError } from "@/lib/investments/canonicalPositions.server";
import { concentration } from "@/lib/portfolio-risk/core";
import { validatePositionValuations } from "@/lib/portfolio-risk/valuation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const respond = (body: unknown, status: number) => NextResponse.json(body, { status, headers });

/** Read-only, authenticated snapshot. Historical metrics remain unavailable until verified NAV history exists. */
export async function GET(request: Request) {
  if (process.env.SFM_PORTFOLIO_RISK_ENABLED !== "1") return respond({ code: "RISK_FEATURE_DISABLED" }, 404);
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const token = bearer || (await cookies()).get("sfm_access_token")?.value;
  if (!token) return respond({ code: "UNAUTHENTICATED" }, 401);
  const user = await getUserFromBearerToken(token);
  if (!user?.id) return respond({ code: "UNAUTHENTICATED" }, 401);
  try {
    const { positions } = await loadCanonicalInvestmentPositions(user.id);
    if (!positions.length) return respond({ code: "NO_VERIFIED_POSITIONS", data: null }, 422);
    const valuations = validatePositionValuations(
      positions.map(position => position.valuation),
      Date.now(),
    );
    if (!valuations.ok) return respond({ code: valuations.code, data: null }, 422);
    const result = concentration(valuations.weights);
    if ("error" in result) return respond({ code: result.error, data: null }, 422);
    return respond({
      methodologyVersion: "risk-v1",
      currency: valuations.currency,
      asOf: valuations.oldestValuationAt,
      holdingsCount: positions.length,
      concentration: result,
      historicalMetrics: null,
      historicalMetricsStatus: "VERIFIED_NAV_HISTORY_NOT_CONNECTED",
      dataQuality: { status: "partial", coverage: "verified_current_positions_only" },
    }, 200);
  } catch (error) {
    if (error instanceof InvestmentCanonicalNotReadyError) return respond({ code: "CANONICAL_INVESTMENTS_NOT_READY", data: null }, 503);
    return respond({ code: "RISK_DATA_UNAVAILABLE", data: null }, 503);
  }
}
