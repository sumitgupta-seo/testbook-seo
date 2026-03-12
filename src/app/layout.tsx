import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Testbook Seasonal SEO | Automation Dashboard',
  description: 'Seasonal SEO automation for testbook.com — calendar, briefs, campaigns, and AI insights',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen antialiased">{children}</body>
    </html>
  )
}
