import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  const SERP_KEY = 'ffda63053015f623666ad2e88cbba58825e2b01a119a764bfc3f84b46ee23c7b';

  if (!query) {
    return NextResponse.json({ error: 'No query provided' }, { status: 400 });
  }

  try {
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${SERP_KEY}&num=10&gl=in&hl=en`;
    const res = await fetch(url);
    const data = await res.json();

    // Extract organic results
    const items = (data.organic_results || []).map((r: any) => ({
      title: r.title,
      link: r.link,
      displayLink: r.displayed_link || r.link,
      snippet: r.snippet || '',
    }));

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: 'Search failed', items: [] }, { status: 500 });
  }
}
