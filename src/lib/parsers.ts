import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { SearchConsoleRow, KeywordRow, PageTrafficRow, CalendarEvent } from '@/types'

// ── Generic CSV parse ──────────────────────────────────────────────
export function parseCSV(content: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s%\/\(\)]+/g, '_').replace(/_+/g, '_'),
  })
  return result.data
}

// ── Generic XLSX parse ─────────────────────────────────────────────
export function parseXLSX(buffer: ArrayBuffer): Record<string, string>[][] {
  const wb = XLSX.read(buffer, { type: 'array' })
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name]
    return XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
  })
}

// ── Search Console CSV (Queries or Pages) ─────────────────────────
// Handles raw GSC export headers like "Top queries", "Top pages", "Clicks" etc.
export function parseSearchConsole(rows: Record<string, string>[]): SearchConsoleRow[] {
  if (!rows.length) return []

  // Build a normalised key lookup from the raw row
  // e.g. "Top queries" → r["Top queries"], "Clicks" → r["Clicks"]
  const getField = (r: Record<string, string>, ...candidates: string[]): string => {
    for (const c of candidates) {
      // exact match first
      if (r[c] !== undefined) return r[c]
      // case-insensitive match
      const key = Object.keys(r).find(k => k.toLowerCase() === c.toLowerCase())
      if (key && r[key] !== undefined) return r[key]
      // partial match
      const partial = Object.keys(r).find(k => k.toLowerCase().includes(c.toLowerCase()))
      if (partial && r[partial] !== undefined) return r[partial]
    }
    return ''
  }

  return rows.map((r) => {
    const query = getField(r, 'Top queries', 'query', 'queries', 'keyword', 'search term', 'Top pages', 'page', 'url')
    const clicks = parseNum(getField(r, 'Clicks', 'clicks'))
    const impressions = parseNum(getField(r, 'Impressions', 'impressions'))
    const ctr = parsePercent(getField(r, 'CTR', 'ctr'))
    const position = parseFloat(getField(r, 'Position', 'position') || '0') || 0

    return { query, page: '', clicks, impressions, ctr, position, date: '' }
  }).filter(r => r.query && r.impressions > 0)
}

// ── Page Traffic CSV ───────────────────────────────────────────────
// Accepts GSC pages export OR GA4 export OR Looker Studio export
// Columns: url/page/top_pages, clicks, impressions, ctr, position
//       OR url, sessions, pageviews, bounce_rate, avg_time
export function parsePageTraffic(rows: Record<string, string>[]): PageTrafficRow[] {
  if (!rows.length) return []

  const keys = Object.keys(rows[0]).map(k => k.toLowerCase())
  const hasClicks = keys.some(k => k.includes('click'))
  const hasSessions = keys.some(k => k.includes('session'))

  return rows.map((r) => {
    const url = r.url || r.page || r.top_pages || r.landing_page || r.top_page || ''
    if (hasClicks && !hasSessions) {
      // GSC pages format: url, clicks, impressions, ctr, position
      return {
        url,
        page_title: r.page_title || r.title || extractTitle(url),
        sessions:   parseNum(r.clicks),       // use clicks as proxy for sessions
        pageviews:  parseNum(r.impressions),   // use impressions as proxy for pageviews
        bounce_rate: parsePercent(r.ctr),
        avg_time:   r.avg_time || r.position || '0',
        month:      r.date || r.month || '',
      }
    }
    // GA4 / standard format
    return {
      url,
      page_title: r.page_title || r.title || r.page_name || extractTitle(url),
      sessions:   parseNum(r.sessions || r.clicks),
      pageviews:  parseNum(r.pageviews || r.page_views || r.impressions),
      bounce_rate: parsePercent(r.bounce_rate || r.ctr),
      avg_time:   r.avg_time || r.avg_session_duration || '0:00',
      month:      r.month || r.date || '',
    }
  }).filter(r => r.url)
}

// ── Keyword performance CSV (YoY) ─────────────────────────────────
export function parseKeywords(rows: Record<string, string>[]): KeywordRow[] {
  return rows.map((r) => {
    const cp = parseNum(r.clicks_prev || r.prev_clicks || '0')
    const cc = parseNum(r.clicks_curr || r.curr_clicks || r.clicks || '0')
    const change = cp > 0 ? Math.round(((cc - cp) / cp) * 100) : 0
    return {
      keyword: r.keyword || r.query || r.search_term || r.top_queries || '',
      clicks_prev: cp,
      clicks_curr: cc,
      impressions_prev: parseNum(r.impressions_prev || r.prev_impressions || '0'),
      impressions_curr: parseNum(r.impressions_curr || r.curr_impressions || r.impressions || '0'),
      position_prev: parseNum(r.position_prev || r.prev_position || '0'),
      position_curr: parseNum(r.position_curr || r.curr_position || r.position || '0'),
      trend: (change > 5 ? 'up' : change < -5 ? 'down' : 'flat') as 'up' | 'down' | 'flat',
      change_pct: change,
    }
  }).filter((r) => r.keyword)
}

// ── Content calendar CSV/XLSX ──────────────────────────────────────
export function parseCalendarImport(rows: Record<string, string>[]): CalendarEvent[] {
  return rows.map((r, i) => {
    const rawDate = r.date || r.exam_date || r.event_date || ''
    const parsed = tryParseDate(rawDate)
    if (!parsed) return null
    const cat = detectCategory(r.category || r.type || r.exam_type || '')
    return {
      id: `imp_${Date.now()}_${i}`,
      name: r.name || r.event || r.exam || r.title || '',
      date: parsed,
      category: cat,
      urgency: detectUrgency(r.urgency || r.priority || ''),
      notes: r.notes || r.description || '',
      source: 'imported' as const,
    }
  }).filter(Boolean) as CalendarEvent[]
}

// ── Helpers ────────────────────────────────────────────────────────
function parseNum(v: string | undefined): number {
  if (!v) return 0
  const clean = String(v).replace(/[,%\s]/g, '')
  return isNaN(Number(clean)) ? 0 : Number(clean)
}

function parsePercent(v: string | undefined): number {
  if (!v) return 0
  const clean = String(v).replace(/%/g, '')
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n > 1 ? n / 100 : n
}

function extractTitle(url: string): string {
  try {
    const path = new URL(url).pathname
    const slug = path.split('/').filter(Boolean).pop() || ''
    return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  } catch {
    return url
  }
}

function tryParseDate(raw: string): string | null {
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  const d = new Date(raw)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}

function detectCategory(raw: string): CalendarEvent['category'] {
  const s = raw.toLowerCase()
  if (s.includes('govt') || s.includes('government') || s.includes('job') || s.includes('ssc') || s.includes('rrb') || s.includes('ibps')) return 'govt'
  if (s.includes('season') || s.includes('result') || s.includes('board')) return 'season'
  if (s.includes('compet') || s.includes('cat') || s.includes('mat') || s.includes('xat')) return 'competitive'
  return 'exam'
}

function detectUrgency(raw: string): CalendarEvent['urgency'] {
  const s = raw.toLowerCase()
  if (s.includes('high') || s.includes('urgent') || s === '1') return 'high'
  if (s.includes('low') || s === '3') return 'low'
  return 'medium'
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export function readFileAsBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}