import { NextResponse } from 'next/server';

export function GET(request: Request) {
  return NextResponse.redirect(new URL('/icons/favicon-32.png', request.url), 308);
}
