import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

/**
 * Catch-all API proxy route.
 * Reads the access_token from HttpOnly cookies and forwards it as an
 * Authorization header to the NestJS backend. This allows the frontend
 * to make authenticated API calls without exposing the JWT to JavaScript.
 */
async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const targetPath = path.join('/');
  const url = new URL(request.url);
  const queryString = url.search;
  const targetUrl = `${API_URL}/${targetPath}${queryString}`;

  const accessToken = request.cookies.get('access_token')?.value;
  const contentType = request.headers.get('content-type') || 'application/json';
  const isMultipart = contentType.includes('multipart/form-data');

  // Build headers, forwarding the original Content-Type (including boundary for multipart)
  const headers: Record<string, string> = {};

  if (!isMultipart) {
    headers['Content-Type'] = contentType;
  }
  // For multipart, let fetch set the Content-Type with the correct boundary

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Forward the request body for methods that support it
  let body: BodyInit | null = null;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    try {
      if (isMultipart) {
        // Forward FormData as-is so fetch can set the proper boundary
        body = await request.formData();
      } else {
        body = await request.text();
      }
    } catch {
      // No body
    }
  }

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    // Handle 204 No Content responses
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { message: 'Backend service unavailable' },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
