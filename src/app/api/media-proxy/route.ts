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

    // Forward Range header for seeking support
    const rangeHeader = request.headers.get('Range');
    const fetchHeaders: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.instagram.com/',
    };
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const response = await fetch(url, { headers: fetchHeaders });

    // Accept both 200 (full content) and 206 (partial content) responses
    if (!response.ok && response.status !== 206) {
      return NextResponse.json({ error: 'Fetch failed' }, { status: response.status });
    }

    // Build response headers, forwarding relevant ones from upstream
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const responseHeaders: HeadersInit = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Accept-Ranges': response.headers.get('accept-ranges') || 'bytes',
    };

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    const contentRange = response.headers.get('content-range');
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    return new NextResponse(response.body, {
      status: response.status, // Preserve 206 for partial content
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
}
