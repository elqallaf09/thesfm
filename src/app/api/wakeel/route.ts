import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json({
    success: false,
    status: 'misconfigured',
    code: 'WAKEEL_FINANCIAL_CONTEXT_NOT_CONFIGURED',
    message: 'خدمة وكيل متوقفة مؤقتاً حتى يتم ربطها ببيانات مالية حقيقية ومعزولة للمستخدم.',
    messageEn: 'Wakeel is temporarily unavailable until it is connected to real, user-isolated financial data.',
    messageFr: 'Wakeel est temporairement indisponible jusqu’à son raccordement à des données financières réelles et isolées par utilisateur.',
    instrumentation: 'not_measured',
  }, {
    status: 503,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
