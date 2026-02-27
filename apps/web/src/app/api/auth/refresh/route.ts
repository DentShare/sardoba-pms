import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { message: 'No refresh token' },
        { status: 401 },
      );
    }

    // The backend JwtRefreshStrategy extracts the token from Authorization header
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      const response = NextResponse.json(data, { status: res.status });
      // Clear expired cookies on refresh failure
      response.cookies.delete('access_token');
      response.cookies.set('refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 0,
      });
      return response;
    }

    const response = NextResponse.json({
      expires_in: data.expires_in,
    });

    // Set new access token as HttpOnly cookie
    response.cookies.set('access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: data.expires_in || 86400,
    });

    return response;
  } catch {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
