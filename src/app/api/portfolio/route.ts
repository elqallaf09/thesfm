import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    success: false,
    status: 'unsupported',
    code: 'PORTFOLIO_AGGREGATION_NOT_IMPLEMENTED',
    message: 'ملخص المحفظة الموحد غير متاح حتى يتم ربط مصادر البيانات الحقيقية.',
    messageEn: 'The unified portfolio summary is unavailable until its real data sources are connected.',
    messageFr: 'Le résumé unifié du portefeuille est indisponible tant que ses sources de données réelles ne sont pas connectées.',
    data: null,
  }, {
    status: 503,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
