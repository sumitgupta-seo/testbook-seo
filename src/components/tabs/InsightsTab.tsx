'use client'

import { useMemo } from 'react'
import type { DataStore, AiInsight } from '@/types'
import { deriveInsights } from '@/lib/ai-analysis'

interface Props { store: DataStore }

const TYPE_CONFIG = {
  opportunity: { label: 'Opportunity', class: 'insight-opportunity', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800' },
  warning:     { label: 'Warning',     class: 'insight-warning',     dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800' },
  action:      { label: 'Action',      class: 'insight-action',      dot: 'bg-green-600', badge: 'bg-green-100 text-green-800' },
  trend:       { label: 'Trend',       class: 'insight-trend',       dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800' },
}

const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-gray-100 text-gray-500',
}

export default function InsightsTab({ store }: Props) {
  const hasData = store.searchConsole.length > 0 || store.keywords.length > 0 || store.pageTraffic.length > 0

  const insights: AiInsight[] = useMemo(() =>
    deriveInsights({
      sc: store.searchConsole,
      kw: store.keywords,
      traffic: store.pageTraffic,
      events: store.calendarEvents,
    }),
  [store])

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4">◆</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">No data yet</h3>
        <p className="text-sm text-gray-500 max-w-sm">Upload your Search Console export, keyword performance, and page traffic data to unlock AI-powered SEO insights.</p>
      </div>
    )
  }

  const high   = insights.filter(i => i.priority === 'high')
  const medium = insights.filter(i => i.priority === 'medium')
  const low    = insights.filter(i => i.priority === 'low')

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">AI-derived SEO insights</h2>
        <p className="text-sm text-gray-500">Auto-generated from your Search Console, keyword, and traffic data. {insights.length} insights found.</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'High priority', count: high.length,   col: 'text-red-600' },
          { label: 'Medium',        count: medium.length, col: 'text-amber-600' },
          { label: 'Low',           count: low.length,    col: 'text-gray-500' },
        ].map(m => (
          <div key={m.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{m.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${m.col}`}>{m.count}</p>
          </div>
        ))}
      </div>

      {/* Insight cards */}
      <div className="space-y-3">
        {insights.map((ins, i) => {
          const cfg = TYPE_CONFIG[ins.type]
          return (
            <div key={i} className={`${cfg.class} rounded-xl p-4 bg-white border border-gray-100`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${cfg.dot}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_BADGE[ins.priority]}`}>{ins.priority}</span>
                    <span className="text-xs text-gray-400">Source: {ins.source}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{ins.title}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{ins.body}</p>
                </div>
              </div>
            </div>
          )
        })}

        {insights.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No insights generated — try uploading more data.</div>
        )}
      </div>
    </div>
  )
}
