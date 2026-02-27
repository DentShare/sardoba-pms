import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;

    // Forward logout to backend (fire-and-forget style, but await for proper response)
    if (accessToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch(() => {
        // Ignore backend errors during logout — we clear cookies regardless
      });
    }

    const response = NextResponse.json({ message: 'Logged out' });

    // Clear access token cookie
    response.cookies.set('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });

    // Clear refresh token cookie (must match the path it was set on)
    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 0,
    });

    return response;
  } catch {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
