'use client'

import { useState, useEffect } from 'react'
import { loadStore, saveStore, emptyStore } from '@/lib/store'
import type { DataStore } from '@/types'
import Sidebar from './Sidebar'
import OverviewTab from './tabs/OverviewTab'
import CalendarTab from './tabs/CalendarTab'
import BriefsTab from './tabs/BriefsTab'
import CampaignsTab from './tabs/CampaignsTab'
import UploadTab from './tabs/UploadTab'
import InsightsTab from './tabs/InsightsTab'

export type TabId = 'overview' | 'calendar' | 'briefs' | 'campaigns' | 'upload' | 'insights'

export default function Dashboard() {
  const [store, setStore] = useState<DataStore>(emptyStore())
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const s = loadStore()
    setStore(s)
    setHydrated(true)
  }, [])

  const updateStore = (updates: Partial<DataStore>) => {
    setStore(prev => {
      const next = { ...prev, ...updates }
      saveStore(next)
      return next
    })
  }

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400 text-sm">Loading dashboard…</div>
      </div>
    )
  }

  const hasData = store.searchConsole.length > 0 || store.keywords.length > 0 || store.pageTraffic.length > 0

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} hasData={hasData} />

      <main className="flex-1 ml-56 p-6 max-w-screen-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Testbook Seasonal SEO</h1>
            <p className="text-sm text-gray-500">Automation Dashboard — FY 2025–26</p>
          </div>
          <div className="flex items-center gap-3">
            {hasData && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                ✓ Data loaded
              </span>
            )}
            <button
              onClick={() => setActiveTab('upload')}
              className="text-sm bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              + Import data
            </button>
          </div>
        </div>

        {/* Tabs */}
        {activeTab === 'overview'   && <OverviewTab   store={store} onTabChange={setActiveTab} />}
        {activeTab === 'calendar'   && <CalendarTab   store={store} updateStore={updateStore} />}
        {activeTab === 'briefs'     && <BriefsTab     store={store} updateStore={updateStore} />}
        {activeTab === 'campaigns'  && <CampaignsTab  store={store} updateStore={updateStore} />}
        {activeTab === 'upload'     && <UploadTab     store={store} updateStore={updateStore} onDone={() => setActiveTab('overview')} />}
        {activeTab === 'insights'   && <InsightsTab   store={store} />}
      </main>
    </div>
  )
}
