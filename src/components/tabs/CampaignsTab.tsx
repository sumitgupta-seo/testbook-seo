'use client'

import { useState } from 'react'
import type { DataStore, Campaign } from '@/types'

interface Props { store: DataStore; updateStore: (u: Partial<DataStore>) => void }

const COLORS = ['#E05A1A','#185FA5','#3B6D11','#854F0B','#532AB7','#993556','#0F6E56','#185FA5']

export default function CampaignsTab({ store, updateStore }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', target_pages: '', notes: '' })

  const stats = {
    live:    store.campaigns.filter(c => c.status === 'live').length,
    prep:    store.campaigns.filter(c => c.status === 'prep').length,
    planned: store.campaigns.filter(c => c.status === 'planned').length,
    done:    store.campaigns.filter(c => c.status === 'done').length,
  }

  const addCampaign = () => {
    if (!form.name || !form.start_date || !form.end_date) return
    const camp: Campaign = {
      id: `camp_${Date.now()}`,
      name: form.name,
      color: COLORS[store.campaigns.length % COLORS.length],
      start_date: form.start_date,
      end_date: form.end_date,
      target_pages: parseInt(form.target_pages) || 0,
      done_pages: 0,
      status: 'planned',
      keywords: [],
      notes: form.notes,
    }
    updateStore({ campaigns: [...store.campaigns, camp] })
    setForm({ name: '', start_date: '', end_date: '', target_pages: '', notes: '' })
    setShowForm(false)
  }

  const updateStatus = (id: string, status: Campaign['status']) => {
    updateStore({ campaigns: store.campaigns.map(c => c.id === id ? { ...c, status } : c) })
  }

  const updateProgress = (id: string, done: number) => {
    updateStore({ campaigns: store.campaigns.map(c => c.id === id ? { ...c, done_pages: Math.max(0, Math.min(c.target_pages, done)) } : c) })
  }

  const statusClass = (s: string) =>
    s === 'live' ? 'status-live' : s === 'prep' ? 'status-prep' : s === 'planned' ? 'status-planned' : 'status-done'

  const barColor = (s: string) =>
    s === 'live' ? '#3B6D11' : s === 'prep' ? '#E05A1A' : '#185FA5'

  const fmtDate = (d: string) => {
    if (!d) return ''
    const dt = new Date(d)
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Live now',   val: stats.live,    col: 'text-orange-600' },
          { label: 'In prep',    val: stats.prep,    col: 'text-blue-700' },
          { label: 'Planned',    val: stats.planned, col: 'text-gray-700' },
          { label: 'Completed',  val: stats.done,    col: 'text-green-700' },
        ].map(m => (
          <div key={m.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{m.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${m.col}`}>{m.val}</p>
          </div>
        ))}
      </div>

      {/* Campaign tracker */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Campaign tracker</h3>
          <button onClick={() => setShowForm(true)} className="text-sm bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium">+ New campaign</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Campaign','Dates','Pages','Progress','Status','Actions'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {store.campaigns.map(c => {
                const pct = c.target_pages > 0 ? Math.round((c.done_pages / c.target_pages) * 100) : 0
                return (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color }} />
                        <span className="font-medium text-gray-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">
                      {fmtDate(c.start_date)} → {fmtDate(c.end_date)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={c.done_pages}
                          min={0}
                          max={c.target_pages}
                          onChange={e => updateProgress(c.id, parseInt(e.target.value) || 0)}
                          className="w-10 text-xs border border-gray-200 rounded px-1 py-0.5 text-center"
                        />
                        <span className="text-xs text-gray-400">/ {c.target_pages}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor(c.status) }} />
                        </div>
                        <span className="text-xs text-gray-500">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={c.status}
                        onChange={e => updateStatus(c.id, e.target.value as Campaign['status'])}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${statusClass(c.status)}`}
                      >
                        {['planned','prep','live','done'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="py-3">
                      <button onClick={() => updateStore({ campaigns: store.campaigns.filter(cc => cc.id !== c.id) })} className="text-xs text-gray-300 hover:text-red-500">✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">New campaign</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Campaign name *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. UPSC 2025 Prelims Push" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start date *</label>
              <input type="date" value={form.start_date} onChange={e => setForm(p => ({...p, start_date: e.target.value}))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End date *</label>
              <input type="date" value={form.end_date} onChange={e => setForm(p => ({...p, end_date: e.target.value}))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Target pages</label>
              <input type="number" value={form.target_pages} onChange={e => setForm(p => ({...p, target_pages: e.target.value}))} placeholder="e.g. 30" min="1" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Optional notes…" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={addCampaign} disabled={!form.name || !form.start_date || !form.end_date} className="text-sm bg-orange-600 text-white px-5 py-2 rounded-lg hover:bg-orange-700 font-medium disabled:opacity-40">Create campaign</button>
            <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
