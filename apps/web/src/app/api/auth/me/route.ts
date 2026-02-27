import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 },
      );
    }

    const res = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
