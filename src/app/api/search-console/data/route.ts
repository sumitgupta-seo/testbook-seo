import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

async function getValidAccessToken(): Promise<string | null> {
  const cookieStore = await cookies()
  const accessToken  = cookieStore.get('gsc_access_token')?.value
  const refreshToken = cookieStore.get('gsc_refresh_token')?.value

  if (accessToken) return accessToken

  // Access token expired — use refresh token
  if (refreshToken) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type:    'refresh_token',
      }),
    })
    const data = await res.json()
    if (data.access_token) {
      cookieStore.set('gsc_access_token', data.access_token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3600 })
      return data.access_token
    }
  }
  return null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const siteUrl   = searchParams.get('site')   || process.env.GSC_SITE_URL || 'https://testbook.com/'
  const startDate = searchParams.get('start')  || getDateDaysAgo(90)
  const endDate   = searchParams.get('end')    || getDateDaysAgo(1)
  const type      = searchParams.get('type')   || 'queries' // queries | pages

  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    return NextResponse.json({ error: 'not_authenticated', message: 'Please connect Google Search Console first' }, { status: 401 })
  }

  try {
    // Fetch top queries or pages
    const body = {
      startDate,
      endDate,
      dimensions: type === 'pages' ? ['page'] : ['query'],
      rowLimit: 100,
      startRow: 0,
    }

    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!res.ok) {
      const err = await res.json()
      if (res.status === 401) {
        return NextResponse.json({ error: 'token_expired', message: 'Please reconnect Search Console' }, { status: 401 })
      }
      if (res.status === 403) {
        return NextResponse.json({ error: 'no_access', message: `No access to ${siteUrl} in Search Console` }, { status: 403 })
      }
      return NextResponse.json({ error: 'gsc_error', message: err.error?.message || 'GSC API error' }, { status: res.status })
    }

    const data = await res.json()
    const rows = (data.rows || []).map((r: GSCRow) => ({
      [type === 'pages' ? 'page' : 'query']: r.keys[0],
      clicks:      r.clicks,
      impressions: r.impressions,
      ctr:         Math.round(r.ctr * 1000) / 1000,
      position:    Math.round(r.position * 10) / 10,
    }))

    // Also fetch verified sites list
    const sitesRes = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
    const sitesData = sitesRes.ok ? await sitesRes.json() : { siteEntry: [] }
    const sites = (sitesData.siteEntry || []).map((s: { siteUrl: string; permissionLevel: string }) => ({
      url: s.siteUrl,
      permission: s.permissionLevel,
    }))

    return NextResponse.json({ rows, sites, dateRange: { startDate, endDate }, siteUrl, total: rows.length })
  } catch (err) {
    console.error('GSC data fetch error:', err)
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
}

interface GSCRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

function getDateDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}
