'use client'

import type { TabId } from './Dashboard'

const NAV = [
  { id: 'overview'  as TabId, label: 'Overview',       icon: '◈' },
  { id: 'calendar'  as TabId, label: 'SEO Calendar',   icon: '◷' },
  { id: 'briefs'    as TabId, label: 'Content Briefs', icon: '◧' },
  { id: 'campaigns' as TabId, label: 'Campaigns',      icon: '◉' },
  { id: 'insights'  as TabId, label: 'AI Insights',    icon: '◆' },
  { id: 'upload'    as TabId, label: 'Import Data',    icon: '⬆' },
]

interface Props {
  activeTab: TabId
  onTabChange: (t: TabId) => void
  hasData: boolean
}

export default function Sidebar({ activeTab, onTabChange, hasData }: Props) {
  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-200 flex flex-col z-10">
      {/* Brand */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center text-white text-xs font-bold">T</div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Testbook SEO</div>
            <div className="text-xs text-gray-400">Seasonal Automation</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
              activeTab === item.id
                ? 'bg-orange-50 text-orange-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
            {item.id === 'insights' && !hasData && (
              <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-1.5 rounded">no data</span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">testbook.com · SEO Team</p>
        <p className="text-xs text-gray-300 mt-0.5">FY 2025–26</p>
      </div>
    </aside>
  )
}
