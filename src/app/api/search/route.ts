import { NextRequest, NextResponse } from 'next/server';

interface RedditPost {
  data: {
    title: string;
    url: string;
    permalink: string;
    subreddit: string;
    score: number;
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
  'GovtExamsMemes', 'CAT_MBA', 'CUET_Exam', 'DefenceExams'
];

async function searchReddit(query: string): Promise<object[]> {
  const results: object[] = [];
  const seen = new Set<string>();

  // Extract base exam term (first 2-3 words) for broader search
  const baseQuery = query.split(' ').slice(0,3).join(' ');

  // Search across multiple subreddits in parallel
  const searches = [
    // Global Reddit - newest
    fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(baseQuery)}&sort=new&limit=25&t=year`,
      { headers: { 'User-Agent': 'TestbookSEO/1.0' } }
    ),
    // Global Reddit - top
    fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(baseQuery)}&sort=top&limit=25&t=year`,
      { headers: { 'User-Agent': 'TestbookSEO/1.0' } }
    ),
    // Global Reddit - hot
    fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(baseQuery)}&sort=relevance&limit=25&t=month`,
      { headers: { 'User-Agent': 'TestbookSEO/1.0' } }
    ),
    // Subreddit search - newest
    fetch(
      `https://www.reddit.com/r/${REDDIT_SUBS.slice(0,6).join('+')}/search.json?q=${encodeURIComponent(baseQuery)}&sort=new&limit=25&restrict_sr=1&t=year`,
      { headers: { 'User-Agent': 'TestbookSEO/1.0' } }
    ),
    // Subreddit search - top
    fetch(
      `https://www.reddit.com/r/${REDDIT_SUBS.slice(0,6).join('+')}/search.json?q=${encodeURIComponent(baseQuery)}&sort=top&limit=25&restrict_sr=1&t=year`,
      { headers: { 'User-Agent': 'TestbookSEO/1.0' } }
    ),
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
          upvotes: p.score,
          comments: p.num_comments,
          created_utc: p.created_utc,
          daysAgo: Math.floor((Date.now()/1000 - p.created_utc) / 86400),
        });
      }
    } catch(e) { continue; }
  }

  return results;
}

async function searchQuora(query: string): Promise<object[]> {
  try {
    // Use short base query for better Quora results, last 2 years
    const baseQuery = query.split(' ').slice(0, 3).join(' ');
    
    // Run 2 Quora searches in parallel - recent + all time top
    const [res1, res2] = await Promise.allSettled([
      fetch(
        `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(baseQuery + ' site:quora.com')}&api_key=${SERP_KEY}&num=10&gl=in&hl=en&tbs=qdr:y`,
        {}
      ),
      fetch(
        `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(baseQuery + ' site:quora.com')}&api_key=${SERP_KEY}&num=10&gl=in&hl=en`,
        {}
      ),
    ]);

    const results: object[] = [];
    const seen = new Set<string>();

    for (const res of [res1, res2]) {
      if (res.status !== 'fulfilled') continue;
      const data = await res.value.json();
      for (const r of (data.organic_results || []) as SerpResult[]) {
        if (seen.has(r.link)) continue;
        seen.add(r.link);
        results.push({
          source: 'quora',
          title: r.title.replace(/ - Quora$/, '').replace(/ \| Quora$/, ''),
          url: r.link,
          displayLink: 'quora.com',
          snippet: r.snippet || '',
          upvotes: 0,
          comments: 0,
          created_utc: 0,
          daysAgo: null,
        });
      }
    }
    return results;
  } catch(e) {
    return [];
  }
}

function calcSEOScore(item: {
  source: string;
  upvotes: number;
  comments: number;
  daysAgo: number | null;
  title: string;
  snippet: string;
}): number {
  let score = 40;

  // RECENCY — most important
  if (item.daysAgo !== null) {
    if (item.daysAgo <= 7)   score += 30;
    else if (item.daysAgo <= 30)  score += 22;
    else if (item.daysAgo <= 90)  score += 15;
    else if (item.daysAgo <= 180) score += 8;
    else if (item.daysAgo <= 365) score += 3;
  } else {
    score += 5; // Quora - unknown date, small bonus
  }

  // COMMENTS — second most important
  if (item.comments >= 100) score += 20;
  else if (item.comments >= 50) score += 15;
  else if (item.comments >= 20) score += 10;
  else if (item.comments >= 10) score += 6;
  else if (item.comments >= 3)  score += 3;

  // UPVOTES
  if (item.upvotes >= 500) score += 15;
  else if (item.upvotes >= 100) score += 10;
  else if (item.upvotes >= 50)  score += 7;
  else if (item.upvotes >= 10)  score += 4;

  // TITLE QUALITY
  const t = item.title.toLowerCase();
  if (t.includes('?')) score += 5;
  const highIntentWords = ['vs', 'best', 'worth', 'failed', 'salary', 'cutoff', 'without coaching', 'strategy', 'how to', 'should i'];
  highIntentWords.forEach(w => { if (t.includes(w)) score += 3; });

  return Math.min(score, 99);
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) return NextResponse.json({ error: 'No query' }, { status: 400 });

  // Run Reddit and Quora searches in parallel
  const [redditRaw, quoraRaw] = await Promise.allSettled([
    searchReddit(query),
    searchQuora(query),
  ]);

  const reddit = redditRaw.status === 'fulfilled' ? redditRaw.value : [];
  const quora = quoraRaw.status === 'fulfilled' ? quoraRaw.value : [];

  // Combine, score, sort by recency then score
  const all = [...reddit, ...quora] as Array<{
    source: string;
    title: string;
    url: string;
    displayLink: string;
    snippet: string;
    upvotes: number;
    comments: number;
    created_utc: number;
    daysAgo: number | null;
  }>;

  const scored = all.map(item => ({
    ...item,
    seoScore: calcSEOScore(item),
  }));

  // Sort: Reddit newest first, then by SEO score
  scored.sort((a, b) => {
    // Prioritize recent Reddit posts
    if (a.daysAgo !== null && b.daysAgo !== null) {
      return a.daysAgo - b.daysAgo; // newer first
    }
    if (a.daysAgo !== null) return -1;
    if (b.daysAgo !== null) return 1;
    return b.seoScore - a.seoScore;
  });

  return NextResponse.json({ items: scored });
}
