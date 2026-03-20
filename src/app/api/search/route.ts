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

function detectDaysAgo(snippet: string): number {
  // Returns days ago — always returns a number, defaults to 999 (old/unknown)
  const s = snippet.toLowerCase();
  const hoursMatch = s.match(/(\d+)\s*hours?\s*ago/);
  if (hoursMatch) return 0;
  const daysMatch = s.match(/(\d+)\s*days?\s*ago/);
  if (daysMatch) return parseInt(daysMatch[1]);
  const weeksMatch = s.match(/(\d+)\s*weeks?\s*ago/);
  if (weeksMatch) return parseInt(weeksMatch[1]) * 7;
  const monthsMatch = s.match(/(\d+)\s*months?\s*ago/);
  if (monthsMatch) return parseInt(monthsMatch[1]) * 30;
  const yearsMatch = s.match(/(\d+)\s*years?\s*ago/);
  if (yearsMatch) return parseInt(yearsMatch[1]) * 365;
  if (s.includes('year ago')) return 365;
  return 999; // unknown date — treat as old
}

// STRICT: title must contain ALL meaningful query words (2+ words required)
function isTitleRelevant(title: string, query: string): boolean {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'for', 'and', 'or', 'to', 'in', 'of', 'it', 'do', 'how', 'what', 'why', 'when', 'which']);
  const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2 && !stopWords.has(w));
  const titleLower = title.toLowerCase();
  
  if (queryWords.length === 0) return false;
  if (queryWords.length === 1) return titleLower.includes(queryWords[0]);
  
  // For multi-word queries: title must contain at least 2 query words
  const matchCount = queryWords.filter(w => titleLower.includes(w)).length;
  return matchCount >= Math.min(2, queryWords.length);
}

function calcSEOScore(item: {
  source: string;
  title: string;
  snippet: string;
  daysAgo: number;
  comments: number;
  answers: number;
}): number {
  let score = 40;
  const t = item.title.toLowerCase();

  // Engagement signals
  if (item.source === 'quora') {
    if (item.answers >= 10)     score += 30;
    else if (item.answers >= 5) score += 20;
    else if (item.answers >= 2) score += 10;
    else if (item.answers >= 1) score += 5;
  } else {
    if (item.comments >= 100)     score += 25;
    else if (item.comments >= 50) score += 18;
    else if (item.comments >= 20) score += 12;
    else if (item.comments >= 5)  score += 6;
  }

  // Recency bonus
  
    if (item.daysAgo <= 7)        score += 20;
    else if (item.daysAgo <= 30)  score += 12;
    else if (item.daysAgo <= 90)  score += 6;
    else if (item.daysAgo <= 365) score += 2;

  // Title quality
  if (t.includes('?')) score += 8;
  ['salary', 'cutoff', 'worth', 'failed', 'vs', 'strategy', 'how to', 'should i', 'without coaching', 'best', 'preparation', 'score', 'exam', 'syllabus', 'pattern'].forEach(w => {
    if (t.includes(w)) score += 4;
  });

  return Math.min(score, 99);
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) return NextResponse.json({ error: 'No query' }, { status: 400 });

  const baseQuery = cleanQuery(query);

  // 2 SerpAPI calls — Reddit (last 1 year) + Quora (all time)
  const [redditRes, quoraRes] = await Promise.allSettled([
    fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(baseQuery + ' site:reddit.com')}&api_key=${SERP_KEY}&num=10&gl=in&hl=en&tbs=qdr:y`),
    fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(baseQuery + ' site:quora.com')}&api_key=${SERP_KEY}&num=10&gl=in&hl=en`),
  ]);

  const results: Array<{
    source: string;
    title: string;
    url: string;
    displayLink: string;
    snippet: string;
    comments: number;
    answers: number;
    daysAgo: number;
    seoScore: number;
  }> = [];

  const seen = new Set<string>();

  // Process Reddit
  if (redditRes.status === 'fulfilled') {
    try {
      const data = await redditRes.value.json();
      for (const r of (data.organic_results || []) as SerpResult[]) {
        if (seen.has(r.link)) continue;
        // STRICT title relevance check
        if (!isTitleRelevant(r.title, baseQuery)) continue;
        seen.add(r.link);
        const snippet = r.snippet || '';
        const daysAgo = detectDaysAgo(snippet);
        const comments = extractCommentCount(snippet);
        const item = {
          source: 'reddit',
          title: r.title,
          url: r.link,
          displayLink: r.displayed_link || 'reddit.com',
          snippet,
          comments,
          answers: 0,
          daysAgo,
          seoScore: 0,
        };
        item.seoScore = calcSEOScore(item);
        results.push(item);
      }
    } catch (e) {}
  }

  // Process Quora
  if (quoraRes.status === 'fulfilled') {
    try {
      const data = await quoraRes.value.json();
      for (const r of (data.organic_results || []) as SerpResult[]) {
        if (seen.has(r.link)) continue;
        // STRICT title relevance check
        if (!isTitleRelevant(r.title, baseQuery)) continue;
        seen.add(r.link);
        const snippet = r.snippet || '';
        const answers = extractAnswerCount(snippet);
        const daysAgo = detectDaysAgo(snippet);
        const item = {
          source: 'quora',
          title: r.title.replace(/ - Quora$/, '').replace(/ \| Quora$/, ''),
          url: r.link,
          displayLink: 'quora.com',
          snippet,
          comments: 0,
          answers,
          daysAgo,
          seoScore: 0,
        };
        item.seoScore = calcSEOScore(item);
        results.push(item);
      }
    } catch (e) {}
  }

  // Sort by recency first, then SEO score
  // Items with known daysAgo come first, sorted newest to oldest
  // Items with unknown date sorted by SEO score after
  results.sort((a, b) => {
    const aHasDate = true;
    const bHasDate = true;

    if (aHasDate && bHasDate) return a.daysAgo! - b.daysAgo!; // newer first
    if (aHasDate && !bHasDate) return -1; // dated content first
    if (!aHasDate && bHasDate) return 1;
    return b.seoScore - a.seoScore; // both undated: sort by score
  });

  return NextResponse.json({
    items: results,
    _meta: { total: results.length }
  });
}
