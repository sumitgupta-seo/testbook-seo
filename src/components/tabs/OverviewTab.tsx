'use client'

import { useMemo } from 'react'
import type { DataStore } from '@/types'
import type { TabId } from '../Dashboard'

const MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar']
const DEMAND  = [85,95,70,55,40,45,65,55,60,75,80,70]

interface Props { store: DataStore; onTabChange: (t: TabId) => void }

export default function OverviewTab({ store, onTabChange }: Props) {
  const today = new Date()

  const upcoming = useMemo(() =>
    [...store.calendarEvents]
      .filter(e => new Date(e.date) > today)
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 6),
  [store.calendarEvents])

  const liveCount = store.campaigns.filter(c => c.status === 'live').length
  const prepCount = store.campaigns.filter(c => c.status === 'prep').length

  const topQueries = useMemo(() => {
    if (!store.searchConsole.length) return []
    const agg: Record<string, { clicks: number; impressions: number }> = {}
    store.searchConsole.forEach(r => {
      if (!agg[r.query]) agg[r.query] = { clicks: 0, impressions: 0 }
      agg[r.query].clicks += r.clicks
      agg[r.query].impressions += r.impressions
    })
    return Object.entries(agg).sort((a,b)=>b[1].impressions-a[1].impressions).slice(0,6)
  }, [store.searchConsole])

  const daysUntil = (dateStr: string) => {
    const d = Math.round((new Date(dateStr).getTime() - today.getTime()) / 86400000)
    return d === 0 ? 'today' : `${d}d`
  }

  const badgeClass = (cat: string) =>
    cat === 'exam' ? 'badge-exam' : cat === 'govt' ? 'badge-govt' : cat === 'season' ? 'badge-season' : 'badge-competitive'

  const urgencyClass = (u: string) =>
    u === 'high' ? 'text-red-700 font-semibold' : u === 'medium' ? 'text-amber-700 font-medium' : 'text-green-700'

  return (
    <div className="space-y-5">
      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Events tracked',     val: store.calendarEvents.length, sub: 'across 8 categories',   col: '' },
          { label: 'Active campaigns',   val: liveCount,                   sub: `${prepCount} in prep`,  col: 'text-orange-600' },
          { label: 'Content briefs',     val: store.briefs.length,         sub: 'generated this session', col: 'text-blue-700' },
          { label: 'SC queries loaded',  val: store.searchConsole.length > 0 ? topQueries.length : '—', sub: store.searchConsole.length > 0 ? 'from Search Console' : 'upload data to see', col: 'text-green-700' },
        ].map(m => (
          <div key={m.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{m.label}</p>
            <p className={`text-2xl font-semibold ${m.col || 'text-gray-900'}`}>{m.val}</p>
            <p className="text-xs text-gray-400 mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Demand chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-800">Monthly search demand (FY 25–26)</h3>
            <button onClick={() => onTabChange('calendar')} className="text-xs text-blue-600 hover:underline">Full calendar →</button>
          </div>
          <div className="flex items-end gap-1.5 h-16">
            {MONTHS.map((m, i) => {
              const pct = DEMAND[i]
              const col = pct > 80 ? '#E05A1A' : pct > 60 ? '#185FA5' : '#d1d5db'
              return (
                <div key={m} className="flex flex-col items-center flex-1 gap-1">
                  <div className="w-full rounded-sm" style={{ height: `${pct * 0.56}px`, background: col }} title={`${m}: ${pct}%`} />
                  <span className="text-[9px] text-gray-400">{m}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-3">
            {[['#E05A1A','High'],['#185FA5','Medium'],['#d1d5db','Low']].map(([c,l])=>(
              <span key={l} className="flex items-center gap-1 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: c }}/>
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-800">Upcoming high-priority events</h3>
            <button onClick={() => onTabChange('calendar')} className="text-xs bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700">View all</button>
          </div>
          <div className="space-y-0.5">
            {upcoming.map(e => (
              <div key={e.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${badgeClass(e.category)}`}>{e.category}</span>
                <span className="flex-1 text-sm text-gray-800 truncate">{e.name}</span>
                <span className="text-xs text-gray-400">{new Date(e.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
                <span className={`text-xs min-w-8 text-right ${urgencyClass(e.urgency)}`}>{daysUntil(e.date)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Top queries */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-800">{store.searchConsole.length > 0 ? 'Top queries (Search Console)' : 'Sample trending queries'}</h3>
            {!store.searchConsole.length && (
              <button onClick={() => onTabChange('upload')} className="text-xs text-blue-600 hover:underline">Import SC data →</button>
            )}
          </div>
          <div className="space-y-0.5">
            {(topQueries.length ? topQueries : SAMPLE_QUERIES).map(([kw, stats], i) => {
              const imp = typeof stats === 'object' ? stats.impressions : (stats as number)
              const max = typeof (topQueries[0]?.[1]) === 'object' ? (topQueries[0][1] as {impressions:number}).impressions : 100000
              const pct = Math.round((imp / max) * 100)
              return (
                <div key={kw} className="flex items-center gap-3 py-1.5">
                  <span className="text-xs text-gray-300 w-4">{i+1}</span>
                  <span className="flex-1 text-sm text-gray-700 truncate">{kw}</span>
                  <span className="text-xs text-gray-400 min-w-12 text-right">{imp.toLocaleString()}</span>
                  <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Campaign health */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-800">Campaign health</h3>
            <button onClick={() => onTabChange('campaigns')} className="text-xs text-blue-600 hover:underline">Manage →</button>
          </div>
          <div className="space-y-2">
            {store.campaigns.slice(0, 5).map(c => {
              const pct = c.target_pages > 0 ? Math.round((c.done_pages / c.target_pages) * 100) : 0
              const barCol = c.status === 'live' ? '#3B6D11' : c.status === 'prep' ? '#E05A1A' : '#185FA5'
              const sc = `status-${c.status}`
              return (
                <div key={c.id} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="flex-1 text-sm text-gray-800 truncate">{c.name}</span>
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barCol }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc}`}>{c.status}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

const SAMPLE_QUERIES: [string, number][] = [
  ['UPSC syllabus 2025', 240000],
  ['board result 2025', 310000],
  ['SSC CGL notification', 180000],
  ['NEET mock test free', 95000],
  ['railway jobs 2025', 120000],
  ['CUET registration 2025', 78000],
]
