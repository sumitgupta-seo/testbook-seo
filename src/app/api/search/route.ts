import { NextRequest, NextResponse } from 'next/server';

interface SerpResult {
  title: string;
  link: string;
  displayed_link?: string;
  snippet?: string;
}

const SERP_KEY = 'ffda63053015f623666ad2e88cbba58825e2b01a119a764bfc3f84b46ee23c7b';

// Generic Quora pages that appear for every Indian exam query - block them
const BLOCKED_TITLE_PATTERNS = [
  'testbook', 'gradeup', 'adda247', 'unacademy app',
  'best top 5 app', 'best website for', 'best app for all',
  'is testbook enough', 'bank pariksha ki taiyari',
];

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
  const s = snippet.toLowerCase();
  if (s.match(/\d+\s*hours?\s*ago/)) return 1;
  const d = s.match(/(\d+)\s*days?\s*ago/);   if (d) return parseInt(d[1]);
  const w = s.match(/(\d+)\s*weeks?\s*ago/);  if (w) return parseInt(w[1]) * 7;
  const m = s.match(/(\d+)\s*months?\s*ago/); if (m) return parseInt(m[1]) * 30;
  const y = s.match(/(\d+)\s*years?\s*ago/);  if (y) return parseInt(y[1]) * 365;
  if (s.includes('year ago')) return 365;
  return 999;
}

function isRelevant(title: string, query: string): boolean {
  const titleLower = title.toLowerCase();
  
  // Block generic pages that appear for every query
  if (BLOCKED_TITLE_PATTERNS.some(p => titleLower.includes(p))) return false;

  const stopWords = new Set(['the','a','an','is','are','was','for','and','or','to','in','of','it','do','how','what','why','when','which','kya','hai','ke','ka','ki','liye']);
  const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2 && !stopWords.has(w));
  
  if (queryWords.length === 0) return false;
  
  // Title must contain at least 1 query word for single word queries
  // Title must contain at least 2 query words for multi-word queries  
  const matchCount = queryWords.filter(w => titleLower.includes(w)).length;
  const required = 1; // 1 word match enough - volume over precision
  return matchCount >= required;
}

function calcSEOScore(item: {
  source: string;
  title: string;
  daysAgo: number;
  comments: number;
  answers: number;
}): number {
  let score = 40;
  const t = item.title.toLowerCase();

  // Engagement
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

  // Recency
  if (item.daysAgo <= 7)        score += 20;
  else if (item.daysAgo <= 30)  score += 12;
  else if (item.daysAgo <= 90)  score += 6;
  else if (item.daysAgo <= 365) score += 2;

  // Title intent
  if (t.includes('?')) score += 8;
  ['salary','cutoff','worth','failed','vs','strategy','how to','should i','without coaching','best','preparation','syllabus','pattern','score'].forEach(w => {
    if (t.includes(w)) score += 4;
  });

  return Math.min(score, 99);
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) return NextResponse.json({ error: 'No query' }, { status: 400 });

  const baseQuery = cleanQuery(query);

  // Add current year to push fresher results to top
  const currentYear = new Date().getFullYear();
  const redditQuery = `${baseQuery} ${currentYear} site:reddit.com`;
  const quoraQuery = `${baseQuery} site:quora.com`;

  // 2 SerpAPI calls — Reddit with year signal + Quora all time
  const [redditRes, quoraRes] = await Promise.allSettled([
    fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(redditQuery)}&api_key=${SERP_KEY}&num=10&gl=in&hl=en&sort=date`),
    fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(quoraQuery)}&api_key=${SERP_KEY}&num=10&gl=in&hl=en`),
  ]);

  const results: Array<{
    source: string; title: string; url: string; displayLink: string;
    snippet: string; comments: number; answers: number; daysAgo: number; seoScore: number;
  }> = [];

  const seen = new Set<string>();

  for (const [res, source] of [[redditRes, 'reddit'], [quoraRes, 'quora']] as const) {
    if (res.status !== 'fulfilled') continue;
    try {
      const data = await res.value.json();
      for (const r of (data.organic_results || []) as SerpResult[]) {
        if (seen.has(r.link)) continue;
        if (!isRelevant(r.title, baseQuery)) continue;
        seen.add(r.link);
        const snippet = r.snippet || '';
        const daysAgo = detectDaysAgo(snippet);
        const comments = source === 'reddit' ? extractCommentCount(snippet) : 0;
        const answers = source === 'quora' ? extractAnswerCount(snippet) : 0;
        const item = {
          source,
          title: source === 'quora' ? r.title.replace(/ - Quora$/, '').replace(/ \| Quora$/, '') : r.title,
          url: r.link,
          displayLink: source === 'reddit' ? (r.displayed_link || 'reddit.com') : 'quora.com',
          snippet,
          comments,
          answers,
          daysAgo,
          seoScore: 0,
        };
        item.seoScore = calcSEOScore(item);
        results.push(item);
      }
    } catch (e) { continue; }
  }

  // Sort: newest first, then by SEO score for same age
  results.sort((a, b) => {
    if (a.daysAgo !== b.daysAgo) return a.daysAgo - b.daysAgo;
    return b.seoScore - a.seoScore;
  });

  return NextResponse.json({ items: results, _meta: { total: results.length } });
}
