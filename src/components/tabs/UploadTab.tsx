'use client'

import { useState, useCallback } from 'react'
import type { DataStore } from '@/types'
import {
  parseSearchConsole, parseKeywords, parsePageTraffic,
  parseCalendarImport, readFileAsText
} from '@/lib/parsers'
import { mergeCalendarEvents } from '@/lib/store'
import SearchConsolePanel from '../SearchConsolePanel'

interface Props {
  store: DataStore
  updateStore: (u: Partial<DataStore>) => void
  onDone: () => void
}

type UploadType = 'searchConsole' | 'keywords' | 'pageTraffic' | 'calendar'

interface UploadSlot {
  id: UploadType
  label: string
  desc: string
  columns: string
  color: string
}

const SLOTS: UploadSlot[] = [
  { id: 'searchConsole', label: 'Search Console Export', desc: 'Google Search Console query/page performance CSV', columns: 'page, query, clicks, impressions, ctr, position', color: 'border-blue-200 hover:border-blue-400' },
  { id: 'keywords',      label: 'Keyword Performance (YoY)', desc: 'Previous vs current year keyword data', columns: 'keyword, clicks_prev, clicks_curr, impressions_prev, impressions_curr, position_prev, position_curr', color: 'border-orange-200 hover:border-orange-400' },
  { id: 'pageTraffic',   label: 'Page-Level Traffic', desc: 'Sessions and pageviews per URL (GA export)', columns: 'url, page_title, sessions, pageviews, bounce_rate, avg_time, month', color: 'border-green-200 hover:border-green-400' },
  { id: 'calendar',      label: 'Content Calendar', desc: 'Existing exam calendar — CSV or Excel', columns: 'name, date (DD/MM/YYYY), category, urgency, notes', color: 'border-purple-200 hover:border-purple-400' },
]

interface SlotState { status: 'idle' | 'loading' | 'done' | 'error'; count?: number; filename?: string; error?: string }

export default function UploadTab({ store, updateStore, onDone }: Props) {
  const [slots, setSlots] = useState<Record<UploadType, SlotState>>({
    searchConsole: { status: 'idle' },
    keywords:      { status: 'idle' },
    pageTraffic:   { status: 'idle' },
    calendar:      { status: 'idle' },
  })
  const [drag, setDrag] = useState<UploadType | null>(null)
  const [activeSource, setActiveSource] = useState<'api' | 'csv'>('api')

  const setSlot = (id: UploadType, s: Partial<SlotState>) =>
    setSlots(prev => ({ ...prev, [id]: { ...prev[id], ...s } }))

  const handleFile = useCallback(async (id: UploadType, file: File) => {
    setSlot(id, { status: 'loading', filename: file.name })
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', id)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'Upload failed')

      const rows = json.rows as Record<string, string>[]

      if (id === 'searchConsole') {
        const parsed = parseSearchConsole(rows)
        updateStore({ searchConsole: parsed, lastUpdated: { ...store.lastUpdated, searchConsole: new Date().toISOString() } })
        setSlot(id, { status: 'done', count: parsed.length })
      } else if (id === 'keywords') {
        const parsed = parseKeywords(rows)
        updateStore({ keywords: parsed, lastUpdated: { ...store.lastUpdated, keywords: new Date().toISOString() } })
        setSlot(id, { status: 'done', count: parsed.length })
      } else if (id === 'pageTraffic') {
        const parsed = parsePageTraffic(rows)
        updateStore({ pageTraffic: parsed, lastUpdated: { ...store.lastUpdated, pageTraffic: new Date().toISOString() } })
        setSlot(id, { status: 'done', count: parsed.length })
      } else if (id === 'calendar') {
        const parsed = parseCalendarImport(rows)
        const next = mergeCalendarEvents(store, parsed)
        updateStore(next)
        setSlot(id, { status: 'done', count: parsed.length })
      }
    } catch (e: unknown) {
      setSlot(id, { status: 'error', error: e instanceof Error ? e.message : 'Unknown error' })
    }
  }, [store, updateStore])

  const onDrop = (id: UploadType) => (e: React.DragEvent) => {
    e.preventDefault()
    setDrag(null)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(id, file)
  }

  const onFileInput = (id: UploadType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(id, file)
  }

  const totalLoaded = Object.values(slots).filter(s => s.status === 'done').length
  const scLoaded = store.searchConsole.length > 0

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Import your data</h2>
        <p className="text-sm text-gray-500">Connect Search Console directly via API, or upload CSV/Excel files manually.</p>
      </div>

      {/* Source toggle */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveSource('api')}
          className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors ${activeSource === 'api' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          🔗 Live API
        </button>
        <button
          onClick={() => setActiveSource('csv')}
          className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors ${activeSource === 'csv' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          📁 CSV Upload
        </button>
      </div>

      {/* API panel */}
      {activeSource === 'api' && (
        <div className="space-y-4">
          <SearchConsolePanel store={store} updateStore={updateStore} />
          {scLoaded && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <span className="text-green-600 text-lg">✓</span>
              <div>
                <p className="text-sm font-medium text-green-800">{store.searchConsole.length} queries loaded from Search Console</p>
                <p className="text-xs text-green-600">AI Insights tab is now powered by your real data</p>
              </div>
              <button onClick={onDone} className="ml-auto text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium">
                View dashboard →
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSV panel */}
      {activeSource === 'csv' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            {SLOTS.map(slot => {
              const s = slots[slot.id]
              return (
                <div
                  key={slot.id}
                  className={`drop-zone border-2 rounded-xl p-5 transition-all ${slot.color} ${drag === slot.id ? 'drag-over' : ''} ${s.status === 'done' ? '!border-green-400 bg-green-50' : ''} ${s.status === 'error' ? '!border-red-300 bg-red-50' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDrag(slot.id) }}
                  onDragLeave={() => setDrag(null)}
                  onDrop={onDrop(slot.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">{slot.label}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{slot.desc}</p>
                    </div>
                    {s.status === 'done' && <span className="text-green-600 text-lg">✓</span>}
                    {s.status === 'loading' && <span className="text-gray-400 text-xs animate-pulse">parsing…</span>}
                    {s.status === 'error' && <span className="text-red-500 text-xs">✗</span>}
                  </div>

                  {s.status === 'idle' || s.status === 'loading' ? (
                    <label className="block cursor-pointer">
                      <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileInput(slot.id)} />
                      <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg">
                        <p className="text-2xl mb-1">⬆</p>
                        <p className="text-xs text-gray-500">Drop CSV/Excel here or <span className="text-blue-600 underline">browse</span></p>
                      </div>
                    </label>
                  ) : s.status === 'done' ? (
                    <div>
                      <p className="text-xs text-green-700 font-medium">{s.filename}</p>
                      <p className="text-xs text-green-600">{s.count} rows imported</p>
                      <label className="cursor-pointer">
                        <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileInput(slot.id)} />
                        <span className="text-xs text-blue-600 hover:underline">Replace file</span>
                      </label>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-red-600">{s.error}</p>
                      <label className="cursor-pointer">
                        <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileInput(slot.id)} />
                        <span className="text-xs text-blue-600 hover:underline">Try again</span>
                      </label>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 font-medium mb-0.5">Expected columns:</p>
                    <p className="text-xs text-gray-400 font-mono leading-relaxed">{slot.columns}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-1">Sample CSV templates</h4>
            <div className="flex gap-4 flex-wrap mt-2">
              {SLOTS.map(s => (
                <a key={s.id} href={`/sample-data/${s.id}.csv`} download className="text-xs text-blue-700 underline hover:text-blue-900">
                  ↓ {s.label}
                </a>
              ))}
            </div>
          </div>

          {totalLoaded > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${(totalLoaded / 4) * 100}%` }} />
              </div>
              <span className="text-sm text-gray-600">{totalLoaded}/4 datasets loaded</span>
              <button onClick={onDone} className="text-sm bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium">
                Continue →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
