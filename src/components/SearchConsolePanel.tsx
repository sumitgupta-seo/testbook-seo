'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DataStore, SearchConsoleRow } from '@/types'

interface Props {
  store: DataStore
  updateStore: (u: Partial<DataStore>) => void
}

interface GscStatus { connected: boolean; hasRefreshToken: boolean }
interface Site { url: string; permission: string }

export default function SearchConsolePanel({ store, updateStore }: Props) {
  const [status, setStatus]     = useState<GscStatus | null>(null)
  const [sites, setSites]       = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState(process.env.NEXT_PUBLIC_GSC_SITE || '')
  const [loading, setLoading]   = useState(false)
  const [syncing, setSyncing]   = useState(false)
  const [error, setError]       = useState('')
  const [lastSync, setLastSync] = useState<string>('')
  const [dateRange, setDateRange] = useState('90')

  const checkStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/search-console/status')
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ connected: false, hasRefreshToken: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkStatus()
    // Check URL params for OAuth result
    const params = new URLSearchParams(window.location.search)
    if (params.get('gsc_connected') === 'true') {
      window.history.replaceState({}, '', '/')
      checkStatus()
      syncData()
    }
    if (params.get('gsc_error')) {
      setError(`Connection failed: ${params.get('gsc_error')}`)
      window.history.replaceState({}, '', '/')
    }
    const saved = localStorage.getItem('gsc_last_sync')
    if (saved) setLastSync(saved)
  }, [checkStatus])

  const syncData = async () => {
    setSyncing(true)
    setError('')
    try {
      const site = selectedSite || ''
      const params = new URLSearchParams({ type: 'queries', start: getDaysAgo(parseInt(dateRange)), end: getDaysAgo(1) })
      if (site) params.set('site', site)

      const res = await fetch(`/api/search-console/data?${params}`)
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'not_authenticated') {
          setStatus({ connected: false, hasRefreshToken: false })
          setError('Session expired. Please reconnect.')
          return
        }
        setError(data.message || 'Failed to fetch data')
        return
      }

      // Hydrate sites list on first sync
      if (data.sites?.length && !sites.length) {
        setSites(data.sites)
        if (!selectedSite && data.sites[0]) setSelectedSite(data.sites[0].url)
      }

      // Convert to SearchConsoleRow format
      const rows: SearchConsoleRow[] = data.rows.map((r: Record<string, number | string>) => ({
        query:       r.query || '',
        page:        r.page  || '',
        clicks:      r.clicks as number,
        impressions: r.impressions as number,
        ctr:         r.ctr as number,
        position:    r.position as number,
      }))

      updateStore({
        searchConsole: rows,
        lastUpdated: { ...store.lastUpdated, searchConsole: new Date().toISOString() },
      })

      const ts = new Date().toLocaleString('en-IN')
      setLastSync(ts)
      localStorage.setItem('gsc_last_sync', ts)
    } catch (err) {
      setError('Network error — check your connection')
      console.error(err)
    } finally {
      setSyncing(false)
    }
  }

  const disconnect = async () => {
    await fetch('/api/search-console/status', { method: 'DELETE' })
    setStatus({ connected: false, hasRefreshToken: false })
    setSites([])
    setLastSync('')
    localStorage.removeItem('gsc_last_sync')
  }

  const connectGSC = () => {
    window.location.href = '/api/search-console/auth'
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="animate-spin">⟳</span> Checking connection…
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status?.connected ? 'bg-green-500' : 'bg-gray-300'}`} />
          <h3 className="text-sm font-semibold text-gray-800">Google Search Console</h3>
          {status?.connected && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Connected</span>
          )}
        </div>
        {status?.connected && (
          <button onClick={disconnect} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
            Disconnect
          </button>
        )}
      </div>

      {!status?.connected ? (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Connect your Google account to pull live clicks, impressions, CTR and position data directly from Search Console — no CSV exports needed.
          </p>
          <button
            onClick={connectGSC}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
          {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Site selector */}
          {sites.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Property</label>
              <select
                value={selectedSite}
                onChange={e => setSelectedSite(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
              >
                {sites.map(s => (
                  <option key={s.url} value={s.url}>{s.url}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date range */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date range</label>
            <div className="flex gap-2">
              {[['28', 'Last 28 days'], ['90', 'Last 90 days'], ['180', 'Last 6 months']].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setDateRange(v)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${dateRange === v ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          {store.searchConsole.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Queries loaded', val: store.searchConsole.length },
                { label: 'Total clicks',   val: store.searchConsole.reduce((s, r) => s + r.clicks, 0).toLocaleString('en-IN') },
                { label: 'Avg position',   val: (store.searchConsole.reduce((s, r) => s + r.position, 0) / store.searchConsole.length).toFixed(1) },
              ].map(m => (
                <div key={m.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{m.label}</p>
                  <p className="text-base font-semibold text-gray-900 mt-0.5">{m.val}</p>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={syncData}
              disabled={syncing}
              className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors"
            >
              {syncing ? <span className="animate-spin text-base">⟳</span> : '↓'}
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
            {lastSync && (
              <span className="text-xs text-gray-400">Last synced: {lastSync}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}
