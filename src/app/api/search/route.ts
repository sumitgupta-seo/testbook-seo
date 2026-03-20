import { NextRequest, NextResponse } from 'next/server';

interface SerpResult {
  title: string;
  link: string;
  displayed_link?: string;
  snippet?: string;
}

const SERP_KEY = 'ffda63053015f623666ad2e88cbba58825e2b01a119a764bfc3f84b46ee23c7b';

function cleanQuery(query: string): string {
  return query.replace(/site:\S+/g, '').replace(/\bOR\b/g, '').trim().split(' ').slice(0, 3).join(' ');
}

function extractAnswerCount(snippet: string): number {
  const match = snippet.match(/(\d+)\+?\s*answers?/i);
  return match ? parseInt(match[1]) : 0;
}

function extractCommentCount(snippet: string): number {
  const match = snippet.match(/(\d+)\+?\s*comments?/i);
  return match ? parseInt(match[1]) : 0;
}

function detectDaysAgo(snippet: string): number | null {
  const s = snippet.toLowerCase();
  if (s.match(/\d+\s*hours?\s*ago/)) return 0;
  if (s.match(/\d+\s*days?\s*ago/)) {
    const m = s.match(/(\d+)\s*days?\s*ago/);
    return m ? parseInt(m[1]) : 3;
  }
  if (s.match(/\d+\s*weeks?\s*ago/)) {
    const m = s.match(/(\d+)\s*weeks?\s*ago/);
    return m ? parseInt(m[1]) * 7 : 14;
  }
  if (s.match(/\d+\s*months?\s*ago/)) {
    const m = s.match(/(\d+)\s*months?\s*ago/);
    return m ? parseInt(m[1]) * 30 : 60;
  }
  if (s.includes('year ago') || s.match(/\d+\s*years?\s*ago/)) return 365;
  return null;
}

function calcSEOScore(item: {
  source: string;
  title: string;
  snippet: string;
  daysAgo: number | null;
  comments: number;
  answers: number;
}): number {
  let score = 40;
  const t = item.title.toLowerCase();

  if (item.source === 'quora') {
    // Answer count is king for Quora
    if (item.answers >= 10)     score += 30;
    else if (item.answers >= 5) score += 20;
    else if (item.answers >= 2) score += 10;
    else if (item.answers >= 1) score += 5;
  } else {
    // Reddit: comments
    if (item.comments >= 100)     score += 25;
    else if (item.comments >= 50) score += 18;
    else if (item.comments >= 20) score += 12;
    else if (item.comments >= 5)  score += 6;
  }

  // Recency — both sources (extracted from snippet)
  if (item.daysAgo !== null) {
    if (item.daysAgo <= 7)        score += 20;
    else if (item.daysAgo <= 30)  score += 12;
    else if (item.daysAgo <= 90)  score += 6;
    else if (item.daysAgo <= 365) score += 2;
  }

  // Title quality
  if (t.includes('?')) score += 8;
  ['salary', 'cutoff', 'worth', 'failed', 'vs', 'strategy', 'how to', 'should i', 'without coaching', 'best', 'preparation', 'score', 'exam'].forEach(w => {
    if (t.includes(w)) score += 4;
  });

  return Math.min(score, 99);
}

function isRelevant(title: string, snippet: string, query: string): boolean {
  const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
  const text = (title + ' ' + snippet).toLowerCase();
  return queryWords.some(w => text.includes(w));
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) return NextResponse.json({ error: 'No query' }, { status: 400 });

  const baseQuery = cleanQuery(query);

  // Run Reddit + Quora searches via SerpAPI in parallel — 2 calls total
  const [redditRes, quoraRes] = await Promise.allSettled([
    fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(baseQuery + ' site:reddit.com')}&api_key=${SERP_KEY}&num=10&gl=in&hl=en&tbs=qdr:y`),
    fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(baseQuery + ' site:quora.com')}&api_key=${SERP_KEY}&num=10&gl=in&hl=en`),
  ]);

  const results: object[] = [];
  const seen = new Set<string>();

  // Process Reddit results
  if (redditRes.status === 'fulfilled') {
    try {
      const data = await redditRes.value.json();
      for (const r of (data.organic_results || []) as SerpResult[]) {
        if (seen.has(r.link) || !isRelevant(r.title, r.snippet || '', baseQuery)) continue;
        seen.add(r.link);
        const snippet = r.snippet || '';
        const daysAgo = detectDaysAgo(snippet);
        const comments = extractCommentCount(snippet);
        results.push({
          source: 'reddit',
          title: r.title,
          url: r.link,
          displayLink: r.displayed_link || 'reddit.com',
          snippet,
          comments,
          daysAgo,
          answers: 0,
        });
      }
    } catch (e) {}
  }

  // Process Quora results
  if (quoraRes.status === 'fulfilled') {
    try {
      const data = await quoraRes.value.json();
      for (const r of (data.organic_results || []) as SerpResult[]) {
        if (seen.has(r.link) || !isRelevant(r.title, r.snippet || '', baseQuery)) continue;
        seen.add(r.link);
        const snippet = r.snippet || '';
        const answers = extractAnswerCount(snippet);
        const daysAgo = detectDaysAgo(snippet);
        results.push({
          source: 'quora',
          title: r.title.replace(/ - Quora$/, '').replace(/ \| Quora$/, ''),
          url: r.link,
          displayLink: 'quora.com',
          snippet,
          comments: 0,
          daysAgo,
          answers,
        });
      }
    } catch (e) {}
  }

  // Score and sort
  const scored = (results as Array<{
    source: string; title: string; url: string; displayLink: string;
    snippet: string; comments: number; daysAgo: number | null; answers: number;
  }>).map(item => ({ ...item, seoScore: calcSEOScore(item) }));

  scored.sort((a, b) => b.seoScore - a.seoScore);

  return NextResponse.json({
    items: scored,
    _meta: { total: scored.length }
  });
}
