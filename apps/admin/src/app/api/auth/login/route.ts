import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/v1';

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

    // Verify that the user is a super_admin
    if (data.user?.role !== 'super_admin') {
      return NextResponse.json(
        { message: 'Access denied. Super admin role required.' },
        { status: 403 },
      );
    }

    const response = NextResponse.json({
      user: data.user,
      expires_in: data.expires_in,
    });

    response.cookies.set('access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: data.expires_in || 86400,
    });

    response.cookies.set('refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 604800,
    });

    return response;
  } catch (error) {
    console.error('[Admin Login] Error:', error);
    return NextResponse.json(
      { message: 'Бэкенд API недоступен. Убедитесь, что NestJS сервер запущен на порту 4001.' },
      { status: 502 },
    );
  }
}
