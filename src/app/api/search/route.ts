import { NextRequest, NextResponse } from 'next/server';

interface RedditPost {
  data: {
    title: string;
    permalink: string;
    subreddit: string;
    num_comments: number;
    created_utc: number;
    selftext: string;
  };
}

interface SerpResult {
  title: string;
  link: string;
  displayed_link?: string;
  snippet?: string;
}

const SERP_KEY = 'ffda63053015f623666ad2e88cbba58825e2b01a119a764bfc3f84b46ee23c7b';

const REDDIT_SUBS = [
  'sscCGL', 'GovtExams', 'UPSC_Preparation', 'IndiaCareer',
  'ssc', 'SSCCGL', 'railwayexam', 'bankexams', 'Indian_Academia',
  'CAT_MBA', 'CUET_Exam', 'DefenceExams', 'india', 'AskIndia'
];

async function searchReddit(query: string): Promise<object[]> {
  const results: object[] = [];
  const seen = new Set<string>();

  // Clean query - remove site: operators, keep exam terms
  const cleanQuery = query.replace(/site:\S+/g, '').replace(/OR/g, '').trim();
  // Use first 2 words only for Reddit - broader results
  const baseQuery = cleanQuery.split(' ').slice(0, 2).join(' ');

  const searches = [
    // Global newest
    fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(baseQuery)}&sort=new&limit=50&t=year`, { headers: { 'User-Agent': 'TestbookSEO/1.0' } }),
    // Global top
    fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(baseQuery)}&sort=top&limit=50&t=year`, { headers: { 'User-Agent': 'TestbookSEO/1.0' } }),
    // Subreddit newest
    fetch(`https://www.reddit.com/r/${REDDIT_SUBS.slice(0,6).join('+')}/search.json?q=${encodeURIComponent(baseQuery)}&sort=new&limit=50&restrict_sr=1&t=year`, { headers: { 'User-Agent': 'TestbookSEO/1.0' } }),
    // Subreddit top
    fetch(`https://www.reddit.com/r/${REDDIT_SUBS.slice(0,6).join('+')}/search.json?q=${encodeURIComponent(baseQuery)}&sort=top&limit=50&restrict_sr=1&t=year`, { headers: { 'User-Agent': 'TestbookSEO/1.0' } }),
    // Last month freshest
    fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(baseQuery)}&sort=new&limit=50&t=month`, { headers: { 'User-Agent': 'TestbookSEO/1.0' } }),
  ];

  const responses = await Promise.allSettled(searches);
  for (const res of responses) {
    if (res.status !== 'fulfilled') continue;
    try {
      const data = await res.value.json();
      const posts: RedditPost[] = data?.data?.children || [];
      for (const post of posts) {
        const p = post.data;
        if (!p.title || seen.has(p.permalink)) continue;
        seen.add(p.permalink);
        results.push({
          source: 'reddit',
          title: p.title,
          url: `https://reddit.com${p.permalink}`,
          displayLink: `reddit.com/r/${p.subreddit}`,
          snippet: p.selftext ? p.selftext.substring(0, 200) : '',
          comments: p.num_comments,
          daysAgo: Math.floor((Date.now() / 1000 - p.created_utc) / 86400),
        });
      }
    } catch (e) { continue; }
  }
  return results;
}

async function searchQuora(query: string): Promise<object[]> {
  try {
    // Clean query and use first 3 words
    const cleanQuery = query.replace(/site:\S+/g, '').replace(/OR/g, '').trim();
    const baseQuery = cleanQuery.split(' ').slice(0, 3).join(' ');

    // 1 SerpAPI call — no date filter so we get results
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(baseQuery + ' site:quora.com')}&api_key=${SERP_KEY}&num=10&gl=in&hl=en`;
    const res = await fetch(url);
    const data = await res.json();

    const results: object[] = [];
    for (const r of (data.organic_results || []) as SerpResult[]) {
      // Filter out irrelevant results - title must contain part of query
      const queryWords = baseQuery.toLowerCase().split(' ').filter(w => w.length > 2);
      const titleLower = r.title.toLowerCase();
      const relevant = queryWords.some(w => titleLower.includes(w));
      if (!relevant) continue;

      results.push({
        source: 'quora',
        title: r.title.replace(/ - Quora$/, '').replace(/ \| Quora$/, ''),
        url: r.link,
        displayLink: 'quora.com',
        snippet: r.snippet || '',
        comments: 0,
        daysAgo: null,
      });
    }
    return results;
  } catch (e) {
    return [];
  }
}

function extractAnswerCount(snippet: string): number {
  const match = snippet.match(/(\d+)\+?\s*answers?/i);
  if (match) return parseInt(match[1]);
  return 0;
}

function calcSEOScore(item: {
  source: string;
  comments: number;
  daysAgo: number | null;
  title: string;
  snippet: string;
}): number {
  let score = 40;
  const t = item.title.toLowerCase();
  const s = item.snippet.toLowerCase();

  if (item.source === 'quora') {
    // Score by answer count extracted from snippet
    const answers = extractAnswerCount(item.snippet);
    if (answers >= 10)      score += 30;
    else if (answers >= 5)  score += 20;
    else if (answers >= 2)  score += 10;
    else if (answers >= 1)  score += 5;

    // Recency from snippet text
    if (s.includes('days ago') || s.includes('week ago') || s.includes('weeks ago')) score += 15;
    else if (s.includes('month ago') || s.includes('months ago'))                    score += 8;
    else if (s.includes('year ago'))                                                  score += 3;

  } else {
    // Reddit: real comment count
    if (item.comments >= 100)     score += 25;
    else if (item.comments >= 50) score += 18;
    else if (item.comments >= 20) score += 12;
    else if (item.comments >= 5)  score += 6;

    // Reddit: real recency
    if (item.daysAgo !== null) {
      if (item.daysAgo <= 7)        score += 15;
      else if (item.daysAgo <= 30)  score += 10;
      else if (item.daysAgo <= 90)  score += 5;
    }
  }

  // Title quality — both sources
  if (t.includes('?')) score += 8;
  const highIntent = ['salary', 'cutoff', 'worth', 'failed', 'vs', 'strategy', 'how to', 'should i', 'without coaching', 'best', 'preparation'];
  highIntent.forEach(w => { if (t.includes(w)) score += 5; });

  return Math.min(score, 99);
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) return NextResponse.json({ error: 'No query' }, { status: 400 });

  const [redditRaw, quoraRaw] = await Promise.allSettled([
    searchReddit(query),
    searchQuora(query),
  ]);

  const reddit = (redditRaw.status === 'fulfilled' ? redditRaw.value : []) as object[];
  const quora = (quoraRaw.status === 'fulfilled' ? quoraRaw.value : []) as object[];

  // Deduplicate by URL
  const seen = new Set<string>();
  const all = [...reddit, ...quora].filter((item) => {
    const i = item as { url: string };
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  }) as Array<{
    source: string;
    title: string;
    url: string;
    displayLink: string;
    snippet: string;
    comments: number;
    daysAgo: number | null;
  }>;

  const scored = all.map(item => ({
    ...item,
    seoScore: calcSEOScore(item),
  }));

  // Sort: newest Reddit first, then Quora by score
  scored.sort((a, b) => {
    if (a.daysAgo !== null && b.daysAgo !== null) return a.daysAgo - b.daysAgo;
    if (a.daysAgo !== null) return -1;
    if (b.daysAgo !== null) return 1;
    return b.seoScore - a.seoScore;
  });

  return NextResponse.json({
    items: scored,
    _meta: { reddit: reddit.length, quora: quora.length, total: scored.length }
  });
}
