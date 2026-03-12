import type { DataStore, CalendarEvent, Campaign, SearchConsoleRow, KeywordRow, PageTrafficRow } from '@/types'

const STORAGE_KEY = 'testbook_seo_data'

// Limits to prevent localStorage overflow
const LIMITS = {
  searchConsole: 500,
  keywords: 1000,
  pageTraffic: 500,
}

export const DEFAULT_EVENTS: CalendarEvent[] = [
  { id: 'e1',  name: 'UPSC Prelims 2026',         date: '2026-05-24', category: 'exam',        urgency: 'high',   source: 'default' },
  { id: 'e2',  name: 'SSC CGL 2026 Notification', date: '2026-04-01', category: 'govt',        urgency: 'high',   source: 'default' },
  { id: 'e3',  name: 'Board Results (CBSE)',       date: '2026-05-15', category: 'season',      urgency: 'high',   source: 'default' },
  { id: 'e4',  name: 'NEET UG 2026',              date: '2026-05-03', category: 'exam',        urgency: 'high',   source: 'default' },
  { id: 'e5',  name: 'JEE Advanced 2026',         date: '2026-05-17', category: 'exam',        urgency: 'high',   source: 'default' },
  { id: 'e6',  name: 'IBPS PO 2026 Notification', date: '2026-06-10', category: 'govt',        urgency: 'medium', source: 'default' },
  { id: 'e7',  name: 'CUET 2026 Registration',    date: '2026-04-05', category: 'exam',        urgency: 'high',   source: 'default' },
  { id: 'e8',  name: 'CAT 2026 Registration',     date: '2026-08-01', category: 'competitive', urgency: 'low',    source: 'default' },
  { id: 'e9',  name: 'RRB NTPC 2026',             date: '2026-07-15', category: 'govt',        urgency: 'medium', source: 'default' },
  { id: 'e10', name: 'GATE 2027 Notification',    date: '2026-09-01', category: 'exam',        urgency: 'low',    source: 'default' },
  { id: 'e11', name: 'SSC CHSL 2026',             date: '2026-06-25', category: 'govt',        urgency: 'medium', source: 'default' },
  { id: 'e12', name: 'UP Board Result 2026',      date: '2026-05-25', category: 'season',      urgency: 'medium', source: 'default' },
  { id: 'e13', name: 'UPSC Mains 2026',           date: '2026-09-20', category: 'exam',        urgency: 'medium', source: 'default' },
  { id: 'e14', name: 'CLAT 2027',                 date: '2026-12-01', category: 'exam',        urgency: 'low',    source: 'default' },
  { id: 'e15', name: 'SBI PO 2026',               date: '2026-11-10', category: 'govt',        urgency: 'low',    source: 'default' },
  { id: 'e16', name: 'UPSC Prelims Prep Window',  date: '2026-03-20', category: 'season',      urgency: 'high',   source: 'default' },
  { id: 'e17', name: 'JEE Main Session 2',        date: '2026-04-10', category: 'exam',        urgency: 'high',   source: 'default' },
  { id: 'e18', name: 'AFCAT 2026',                date: '2026-06-20', category: 'govt',        urgency: 'low',    source: 'default' },
]

export const DEFAULT_CAMPAIGNS: Campaign[] = [
  { id: 'c1', name: 'UPSC 2026 Prelims Push',  color: '#E05A1A', start_date: '2026-03-15', end_date: '2026-05-24', target_pages: 42, done_pages: 12, status: 'live',    keywords: ['UPSC syllabus 2026', 'UPSC mock test'] },
  { id: 'c2', name: 'Board Results 2026',       color: '#185FA5', start_date: '2026-04-15', end_date: '2026-05-25', target_pages: 18, done_pages: 0,  status: 'planned', keywords: ['board result 2026', 'CBSE result'] },
  { id: 'c3', name: 'SSC CGL 2026',             color: '#3B6D11', start_date: '2026-04-01', end_date: '2026-07-30', target_pages: 35, done_pages: 5,  status: 'prep',    keywords: ['SSC CGL 2026', 'SSC CGL syllabus'] },
  { id: 'c4', name: 'NEET & JEE Season 2026',  color: '#854F0B', start_date: '2026-03-20', end_date: '2026-05-17', target_pages: 29, done_pages: 8,  status: 'live',    keywords: ['NEET 2026', 'JEE Advanced 2026'] },
  { id: 'c5', name: 'IBPS PO 2026',             color: '#532AB7', start_date: '2026-06-01', end_date: '2026-08-15', target_pages: 22, done_pages: 0,  status: 'planned', keywords: ['IBPS PO 2026', 'bank PO'] },
]

// ── Trim large datasets before saving ─────────────────────────────
export function trimForStorage(store: DataStore): DataStore {
  return {
    ...store,
    // Keep top rows sorted by impressions/sessions descending
    searchConsole: [...store.searchConsole]
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, LIMITS.searchConsole),
    keywords: [...store.keywords]
      .sort((a, b) => b.impressions_curr - a.impressions_curr)
      .slice(0, LIMITS.keywords),
    pageTraffic: [...store.pageTraffic]
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, LIMITS.pageTraffic),
  }
}

export function loadStore(): DataStore {
  if (typeof window === 'undefined') return emptyStore()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    return JSON.parse(raw) as DataStore
  } catch {
    return emptyStore()
  }
}

export function saveStore(store: DataStore): void {
  if (typeof window === 'undefined') return
  try {
    const trimmed = trimForStorage(store)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (e) {
    // If still too large, save only non-data fields
    console.warn('localStorage quota exceeded, saving minimal data', e)
    try {
      const minimal = {
        ...store,
        searchConsole: store.searchConsole.slice(0, 100),
        keywords: store.keywords.slice(0, 200),
        pageTraffic: store.pageTraffic.slice(0, 100),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal))
    } catch {
      console.error('Could not save to localStorage at all')
    }
  }
}

export function emptyStore(): DataStore {
  return {
    searchConsole: [],
    keywords: [],
    pageTraffic: [],
    calendarEvents: DEFAULT_EVENTS,
    campaigns: DEFAULT_CAMPAIGNS,
    briefs: [],
    lastUpdated: {},
  }
}

export function mergeCalendarEvents(store: DataStore, imported: CalendarEvent[]): DataStore {
  const existing = store.calendarEvents.filter(e => e.source === 'default' || e.source === 'manual')
  const deduped = imported.filter(ie => !existing.find(e => e.name === ie.name && e.date === ie.date))
  return {
    ...store,
    calendarEvents: [...existing, ...deduped],
    lastUpdated: { ...store.lastUpdated, calendar: new Date().toISOString() },
  }
}

export const KEYWORD_MAP: Record<string, string[]> = {
  'UPSC Civil Services 2026': ['UPSC syllabus 2026', 'UPSC prelims cut off', 'UPSC mock test free', 'IAS preparation tips', 'UPSC exam date 2026', 'UPSC previous year papers', 'UPSC current affairs 2026', 'UPSC eligibility criteria'],
  'SSC CGL 2026': ['SSC CGL notification 2026', 'SSC CGL syllabus PDF', 'SSC CGL mock test free', 'SSC CGL cut off 2025', 'SSC CGL tier 1 pattern', 'SSC CGL eligibility', 'SSC CGL salary'],
  'IBPS PO 2026': ['IBPS PO 2026 notification', 'IBPS PO syllabus', 'bank PO mock test free', 'IBPS PO previous year paper', 'IBPS PO cut off 2025', 'IBPS PO salary'],
  'CAT 2026': ['CAT 2026 registration date', 'CAT 2026 syllabus', 'CAT mock test free', 'CAT preparation books', 'CAT 100 percentile strategy', 'CAT previous papers'],
  'JEE Advanced 2026': ['JEE Advanced 2026 date', 'JEE Advanced syllabus', 'JEE Advanced mock test', 'JEE Advanced cutoff IIT', 'JEE Advanced chapter wise questions'],
  'NEET UG 2026': ['NEET 2026 exam date', 'NEET syllabus PDF 2026', 'NEET mock test 2026 free', 'NEET cut off marks', 'NEET preparation tips', 'NEET biology important chapters'],
  'Board Exams Results Season': ['CBSE board result 2026', 'UP board result 2026', 'how to check board result online', 'board result marksheet download', 'board toppers list 2026', 'pass percentage board 2026'],
  'RRB NTPC 2026': ['RRB NTPC notification 2026', 'RRB NTPC syllabus PDF', 'RRB NTPC mock test free', 'railway group D 2026', 'RRB NTPC cut off previous year'],
  'CUET 2026': ['CUET 2026 registration date', 'CUET syllabus subject wise', 'CUET mock test free', 'CUET preparation strategy', 'CUET top colleges list', 'CUET cutoff DU'],
  'State PSC': ['UPPSC notification 2026', 'MPPSC exam date 2026', 'state PSC syllabus', 'PSC mock test free', 'state civil services preparation books', 'SDM salary'],
  'GATE 2027': ['GATE 2027 notification', 'GATE syllabus 2027 CSE', 'GATE mock test free', 'GATE previous year papers', 'GATE cutoff IIT', 'GATE preparation strategy'],
}