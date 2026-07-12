import { NextResponse } from 'next/server';

function retiredProxyResponse() {
  return NextResponse.json({
    success: false,
    status: 'unsupported',
    code: 'ZOER_PROXY_RETIRED',
    message: 'تم إيقاف تكامل Zoer القديم لأسباب أمنية.',
    messageEn: 'The legacy Zoer integration has been retired for security reasons.',
    messageFr: 'L’ancienne intégration Zoer a été retirée pour des raisons de sécurité.',
  }, {
    status: 410,
    headers: { 'Cache-Control': 'public, max-age=86400, immutable' },
  });
}

export const GET = retiredProxyResponse;
export const POST = retiredProxyResponse;
export const PUT = retiredProxyResponse;
export const PATCH = retiredProxyResponse;
export const DELETE = retiredProxyResponse;
