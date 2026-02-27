import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    const response = NextResponse.json({
      user: data.user,
      expires_in: data.expires_in,
    });

    // Set access token as HttpOnly cookie
    response.cookies.set('access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: data.expires_in || 86400,
    });

    // Set refresh token as HttpOnly cookie (scoped to /api/auth routes only)
    response.cookies.set('refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 604800, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
