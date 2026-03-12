import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies()
  const hasAccess  = !!cookieStore.get('gsc_access_token')?.value
  const hasRefresh = !!cookieStore.get('gsc_refresh_token')?.value
  return NextResponse.json({
    connected: hasAccess || hasRefresh,
    hasRefreshToken: hasRefresh,
  })
}

// DELETE = disconnect / logout
export async function DELETE(_req: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete('gsc_access_token')
  cookieStore.delete('gsc_refresh_token')
  return NextResponse.json({ disconnected: true })
}
