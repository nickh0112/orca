import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  // Validate URL is from allowed domains (security)
  const allowedDomains = [
    'cdninstagram.com',
    'instagram.com',
    'fbcdn.net',
    'tiktokcdn.com',
    'muscdn.com',
  ];

  try {
    const parsedUrl = new URL(url);
    const isAllowed = allowedDomains.some(domain =>
      parsedUrl.hostname.endsWith(domain)
    );

    if (!isAllowed) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
    }

    // Fetch with browser-like headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.instagram.com/',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Fetch failed' }, { status: response.status });
    }

    // Stream the response with proper content-type
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
}
