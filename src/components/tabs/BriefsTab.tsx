'use client'

import { useState } from 'react'
import type { DataStore, ContentBrief } from '@/types'
import { KEYWORD_MAP } from '@/lib/store'

interface Props { store: DataStore; updateStore: (u: Partial<DataStore>) => void }

export default function BriefsTab({ store, updateStore }: Props) {
  const [exam, setExam] = useState('')
  const [contentType, setContentType] = useState('Exam guide page')
  const [customKw, setCustomKw] = useState('')
  const [selectedKws, setSelectedKws] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const kwSuggestions = KEYWORD_MAP[exam] || []

  const toggleKw = (kw: string) =>
    setSelectedKws(prev => prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw])

  const generate = async () => {
    if (!exam) return
    setLoading(true)
    setError('')
    const kws = [...selectedKws]
    if (customKw.trim()) kws.unshift(customKw.trim())
    if (!kws.length) kwSuggestions.slice(0, 4).forEach(k => kws.push(k))

    try {
      const res = await fetch('/api/analyze-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam, contentType, keywords: kws }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const brief: ContentBrief = {
        id: `brief_${Date.now()}`,
        exam,
        content_type: contentType,
        primary_keyword: data.primary_keyword || kws[0] || exam,
        secondary_keywords: data.secondary_keywords || kws.slice(1, 5),
        word_count: data.word_count_target || '2000-2500',
        meta_title: data.meta_title || `${exam} 2025 | Testbook`,
        meta_description: data.meta_description || '',
        h1: data.h1 || exam,
        outline: data.outline || [],
        created_at: new Date().toISOString(),
      }
      updateStore({ briefs: [brief, ...store.briefs] })
      setExam('')
      setSelectedKws([])
      setCustomKw('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  const deleteBrief = (id: string) =>
    updateStore({ briefs: store.briefs.filter(b => b.id !== id) })

  return (
    <div className="space-y-5">
      {/* Generator */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Generate SEO content brief</h2>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-1">
            <label className="block text-xs text-gray-500 mb-1">Exam / topic *</label>
            <select value={exam} onChange={e => { setExam(e.target.value); setSelectedKws([]) }} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400">
              <option value="">— Select exam —</option>
              {Object.keys(KEYWORD_MAP).map(k => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Content type</label>
            <select value={contentType} onChange={e => setContentType(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400">
              {['Exam guide page','Syllabus page','Cut-off analysis','Free mock test','Results page','Notification page','Blog post'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Custom keyword (optional)</label>
            <input type="text" value={customKw} onChange={e => setCustomKw(e.target.value)} placeholder="e.g. UPSC syllabus 2025 PDF" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
          </div>
        </div>

        {kwSuggestions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Suggested keywords — click to select:</p>
            <div className="flex flex-wrap gap-2">
              {kwSuggestions.map(kw => (
                <button
                  key={kw}
                  onClick={() => toggleKw(kw)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selectedKws.includes(kw) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400'}`}
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <button
          onClick={generate}
          disabled={!exam || loading}
          className="text-sm bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? <span className="animate-spin">⟳</span> : null}
          {loading ? 'Generating with AI…' : 'Generate brief'}
        </button>
        <p className="text-xs text-gray-400 mt-2">Uses Claude AI via your API key in <code>.env.local</code>. Falls back to template if key not set.</p>
      </div>

      {/* Briefs list */}
      {store.briefs.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">◧</p>
          <p className="text-sm">No briefs yet — generate your first one above.</p>
        </div>
      )}

      <div className="space-y-4">
        {store.briefs.map(brief => (
          <div key={brief.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{brief.exam} — {brief.content_type}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Generated {new Date(brief.created_at).toLocaleDateString('en-IN')}</p>
              </div>
              <button onClick={() => deleteBrief(brief.id)} className="text-xs text-gray-300 hover:text-red-500">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">Meta title</p>
                <p className="text-sm text-gray-800">{brief.meta_title}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">H1</p>
                <p className="text-sm text-gray-800">{brief.h1}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-gray-500 font-medium mb-1">Meta description</p>
                <p className="text-sm text-gray-700">{brief.meta_description}</p>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xs text-gray-500 font-medium mb-2">Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-full font-medium">{brief.primary_keyword}</span>
                {brief.secondary_keywords.map(kw => (
                  <span key={kw} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{kw}</span>
                ))}
              </div>
            </div>

            {brief.outline.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Content outline · {brief.word_count} words</p>
                <div className="space-y-1">
                  {brief.outline.map((h, i) => (
                    <div key={i} className="text-xs text-gray-700 pl-3 border-l-2 border-gray-200 py-0.5">{h}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
