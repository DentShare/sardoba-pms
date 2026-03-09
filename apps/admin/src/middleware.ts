import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;

  // If visiting /login and already authenticated, redirect to dashboard
  if (pathname === '/login' && accessToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If visiting a protected route without auth, redirect to /login
  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next|favicon\\.ico|login).*)',
  ],
};
