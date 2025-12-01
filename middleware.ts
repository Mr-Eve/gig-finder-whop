import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Remove restrictive headers that Vercel might add
  response.headers.delete('X-Frame-Options');
  
  // Set permissive headers for iframe embedding
  response.headers.set('Content-Security-Policy', "frame-ancestors 'self' https://*.whop.com https://whop.com *");
  response.headers.set('X-Frame-Options', 'ALLOWALL');

  return response;
}

export const config = {
  matcher: '/:path*',
};

