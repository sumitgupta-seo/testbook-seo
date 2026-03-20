import { NextRequest, NextResponse } from 'next/server';

interface SerpResult {
  title: string;
  link: string;
  displayed_link?: string;
  snippet?: string;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  const SERP_KEY = 'ffda63053015f623666ad2e88cbba58825e2b01a119a764bfc3f84b46ee23c7b';

  if (!query) {
    return NextResponse.json({ error: 'No query provided' }, { status: 400 });
  }

  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${SERP_KEY}&num=10&gl=in&hl=en`;
  const res = await fetch(url);
  const data = await res.json();

  const items = (data.organic_results || []).map((r: SerpResult) => ({
    title: r.title,
    link: r.link,
    displayLink: r.displayed_link || r.link,
    snippet: r.snippet || '',
  }));

  return NextResponse.json({ items });
}
