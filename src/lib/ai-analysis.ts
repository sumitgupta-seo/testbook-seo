import type { AiInsight, SearchConsoleRow, KeywordRow, PageTrafficRow, CalendarEvent } from '@/types'

// ── Derive AI insights from uploaded data ─────────────────────────
export function deriveInsights(opts: {
  sc: SearchConsoleRow[]
  kw: KeywordRow[]
  traffic: PageTrafficRow[]
  events: CalendarEvent[]
}): AiInsight[] {
  const insights: AiInsight[] = []
  const today = new Date()

  // 1. Upcoming events with no content
  const soonEvents = opts.events
    .filter((e) => {
      const d = new Date(e.date)
      const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      return diff > 0 && diff <= 45
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  soonEvents.slice(0, 3).forEach((e) => {
    const days = Math.round((new Date(e.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    insights.push({
      type: 'action',
      title: `Prep content for ${e.name}`,
      body: `Only ${days} days until ${e.name}. Create exam guide, syllabus, and mock test pages now for maximum indexing time.`,
      source: 'Calendar',
      priority: days < 20 ? 'high' : 'medium',
    })
  })

  // 2. Keywords with declining position
  const declining = opts.kw
    .filter((k) => k.trend === 'down' && k.position_curr > k.position_prev + 3)
    .sort((a, b) => b.impressions_curr - a.impressions_curr)
    .slice(0, 3)

  declining.forEach((k) => {
    insights.push({
      type: 'warning',
      title: `Position drop: "${k.keyword}"`,
      body: `Dropped from position ${k.position_prev.toFixed(1)} → ${k.position_curr.toFixed(1)}. High-impression keyword needs content refresh or internal link boost.`,
      source: 'Keyword data',
      priority: k.impressions_curr > 5000 ? 'high' : 'medium',
    })
  })

  // 3. Rising keywords (opportunities)
  const rising = opts.kw
    .filter((k) => k.trend === 'up' && k.change_pct > 20)
    .sort((a, b) => b.change_pct - a.change_pct)
    .slice(0, 3)

  rising.forEach((k) => {
    insights.push({
      type: 'opportunity',
      title: `Trending up: "${k.keyword}"`,
      body: `Clicks up ${k.change_pct}% YoY. Consider creating a dedicated landing page or expanding existing coverage.`,
      source: 'Keyword data',
      priority: 'medium',
    })
  })

  // 4. High CTR but low position (quick wins from Search Console)
  const quickWins = opts.sc
    .filter((r) => r.position > 5 && r.position <= 15 && r.ctr > 0.05 && r.impressions > 500)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 3)

  quickWins.forEach((r) => {
    insights.push({
      type: 'opportunity',
      title: `Quick win: "${r.query}"`,
      body: `Page at position ${r.position.toFixed(1)} with ${(r.ctr * 100).toFixed(1)}% CTR — top-5 ranking could unlock ${Math.round(r.impressions * 0.15).toLocaleString()} extra monthly clicks.`,
      source: 'Search Console',
      priority: r.impressions > 2000 ? 'high' : 'medium',
    })
  })

  // 5. High bounce pages
  const highBounce = opts.traffic
    .filter((p) => p.bounce_rate > 0.7 && p.sessions > 200)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 2)

  highBounce.forEach((p) => {
    insights.push({
      type: 'warning',
      title: `High bounce: ${p.page_title || p.url}`,
      body: `${(p.bounce_rate * 100).toFixed(0)}% bounce rate on a high-traffic page. Add internal links, improve above-the-fold content, or add a mock test CTA.`,
      source: 'Page traffic',
      priority: 'medium',
    })
  })

  // Sort by priority
  const order = { high: 0, medium: 1, low: 2 }
  return insights.sort((a, b) => order[a.priority] - order[b.priority])
}

// ── Demand index for monthly calendar bar chart ───────────────────
export function computeMonthlyDemand(sc: SearchConsoleRow[]): Record<string, number> {
  const map: Record<string, number> = {}
  sc.forEach((r) => {
    if (!r.date) return
    const m = r.date.substring(0, 7) // YYYY-MM
    map[m] = (map[m] || 0) + r.clicks
  })
  return map
}

// ── Top queries from Search Console ──────────────────────────────
export function topQueries(sc: SearchConsoleRow[], limit = 10): SearchConsoleRow[] {
  const agg: Record<string, SearchConsoleRow> = {}
  sc.forEach((r) => {
    if (!agg[r.query]) agg[r.query] = { ...r }
    else {
      agg[r.query].clicks += r.clicks
      agg[r.query].impressions += r.impressions
    }
  })
  return Object.values(agg)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, limit)
}
