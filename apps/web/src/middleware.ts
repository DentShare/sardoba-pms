import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Auth middleware for Sardoba PMS.
 * - Redirects unauthenticated users to /login
 * - Redirects authenticated users away from /login to /calendar
 * - Allows the landing page '/' without auth
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;

  // If visiting /login and already authenticated, redirect to /calendar
  if (pathname === '/login' && accessToken) {
    return NextResponse.redirect(new URL('/calendar', request.url));
  }

  // If visiting a protected route without auth, redirect to /login
  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the intended destination for redirect after login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Matcher config:
 * - Protect all routes except:
 *   - / (landing page)
 *   - /login (auth page)
 *   - /api/* (API routes)
 *   - /_next/* (Next.js internals)
 *   - /favicon.ico and static assets
 */
export const config = {
  matcher: [
    '/((?!api|_next|favicon|login|$).*)',
  ],
};
