'use client'

import { useState, useMemo } from 'react'
import type { DataStore, CalendarEvent } from '@/types'

interface Props { store: DataStore; updateStore: (u: Partial<DataStore>) => void }

const MONTHS = ['Apr 2026','May 2026','Jun 2026','Jul 2026','Aug 2026','Sep 2026','Oct 2026','Nov 2026','Dec 2026','Jan 2027','Feb 2027','Mar 2027']
const MONTH_KEYS = ['2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11','2026-12','2027-01','2027-02','2027-03']

type CatFilter = 'all' | CalendarEvent['category']

export default function CalendarTab({ store, updateStore }: Props) {
  const [filter, setFilter] = useState<CatFilter>('all')
  const [form, setForm] = useState({ name: '', date: '', category: 'exam' as CalendarEvent['category'], urgency: 'medium' as CalendarEvent['urgency'], notes: '' })

  const filtered = useMemo(() =>
    filter === 'all' ? store.calendarEvents : store.calendarEvents.filter(e => e.category === filter),
  [store.calendarEvents, filter])

  const byMonth = useMemo(() => {
    const m: Record<string, CalendarEvent[]> = {}
    MONTH_KEYS.forEach(k => { m[k] = [] })
    filtered.forEach(e => {
      const k = e.date.substring(0, 7)
      if (m[k]) m[k].push(e)
    })
    return m
  }, [filtered])

  const addEvent = () => {
    if (!form.name || !form.date) return
    const ev: CalendarEvent = {
      id: `manual_${Date.now()}`,
      name: form.name,
      date: form.date,
      category: form.category,
      urgency: form.urgency,
      notes: form.notes,
      source: 'manual',
    }
    updateStore({ calendarEvents: [...store.calendarEvents, ev] })
    setForm({ name: '', date: '', category: 'exam', urgency: 'medium', notes: '' })
  }

  const badgeClass = (cat: string) =>
    cat === 'exam' ? 'badge-exam' : cat === 'govt' ? 'badge-govt' : cat === 'season' ? 'badge-season' : cat === 'competitive' ? 'badge-competitive' : 'badge-custom'

  const urgencyDot = (u: string) =>
    u === 'high' ? 'bg-red-500' : u === 'medium' ? 'bg-amber-400' : 'bg-green-500'

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {(['all','exam','govt','season','competitive','custom'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize ${filter === f ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">{filtered.length} events</span>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-4 gap-3">
        {MONTH_KEYS.map((mk, i) => (
          <div key={mk} className="bg-white border border-gray-200 rounded-xl p-3">
            <h4 className="text-xs font-semibold text-gray-500 mb-2 pb-2 border-b border-gray-100">{MONTHS[i]}</h4>
            <div className="space-y-1 min-h-8">
              {byMonth[mk].length === 0 && (
                <p className="text-xs text-gray-300 italic">No events</p>
              )}
              {byMonth[mk].sort((a,b) => a.date.localeCompare(b.date)).map(e => (
                <div key={e.id} className="group relative">
                  <div className={`text-xs px-1.5 py-1 rounded flex items-center gap-1 ${badgeClass(e.category)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${urgencyDot(e.urgency)}`} />
                    <span className="truncate">{e.name}</span>
                    <span className="ml-auto flex-shrink-0 opacity-60">{new Date(e.date).getDate()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add event form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Add custom event</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Event name *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. CTET 2025 registration" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date *</label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value as CalendarEvent['category']}))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400">
              <option value="exam">Entrance Exam</option>
              <option value="govt">Govt Job</option>
              <option value="season">Season / Results</option>
              <option value="competitive">Competitive</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Urgency</label>
            <select value={form.urgency} onChange={e => setForm(p => ({...p, urgency: e.target.value as CalendarEvent['urgency']}))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
            <input type="text" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Additional notes or prep reminders…" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
          </div>
        </div>
        <button onClick={addEvent} disabled={!form.name || !form.date} className="text-sm bg-orange-600 text-white px-5 py-2 rounded-lg hover:bg-orange-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed">
          Add to calendar
        </button>
      </div>
    </div>
  )
}
