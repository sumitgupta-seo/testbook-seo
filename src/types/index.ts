// Search Console data row
export interface SearchConsoleRow {
  page: string
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  date?: string
}

// Keyword performance (year-over-year)
export interface KeywordRow {
  keyword: string
  clicks_prev: number
  clicks_curr: number
  impressions_prev: number
  impressions_curr: number
  position_prev: number
  position_curr: number
  trend: 'up' | 'down' | 'flat'
  change_pct: number
}

// Page traffic
export interface PageTrafficRow {
  url: string
  page_title: string
  sessions: number
  pageviews: number
  bounce_rate: number
  avg_time: string
  month: string
}

// Calendar event
export interface CalendarEvent {
  id: string
  name: string
  date: string
  category: 'exam' | 'govt' | 'season' | 'competitive' | 'custom'
  urgency: 'high' | 'medium' | 'low'
  notes?: string
  prep_start?: string
  source: 'default' | 'imported' | 'manual'
}

// Content brief
export interface ContentBrief {
  id: string
  exam: string
  content_type: string
  primary_keyword: string
  secondary_keywords: string[]
  word_count: string
  meta_title: string
  meta_description: string
  h1: string
  outline: string[]
  created_at: string
}

// Campaign
export interface Campaign {
  id: string
  name: string
  color: string
  start_date: string
  end_date: string
  target_pages: number
  done_pages: number
  status: 'live' | 'prep' | 'planned' | 'done'
  keywords: string[]
  notes?: string
}

// AI insight
export interface AiInsight {
  type: 'opportunity' | 'warning' | 'trend' | 'action'
  title: string
  body: string
  source: string
  priority: 'high' | 'medium' | 'low'
}

// Uploaded data store (in-memory / localStorage)
export interface DataStore {
  searchConsole: SearchConsoleRow[]
  keywords: KeywordRow[]
  pageTraffic: PageTrafficRow[]
  calendarEvents: CalendarEvent[]
  campaigns: Campaign[]
  briefs: ContentBrief[]
  lastUpdated: Record<string, string>
}
