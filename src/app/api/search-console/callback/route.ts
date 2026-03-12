import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?gsc_error=${error || 'no_code'}`
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${appUrl}/api/search-console/callback`

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    if (!tokenRes.ok || tokens.error) {
      console.error('Token exchange failed:', tokens)
      return NextResponse.redirect(`${appUrl}/?gsc_error=token_failed`)
    }

    // Store tokens in secure httpOnly cookies (valid for session)
    const cookieStore = await cookies()
    cookieStore.set('gsc_access_token',  tokens.access_token,  { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3600 })
    if (tokens.refresh_token) {
      cookieStore.set('gsc_refresh_token', tokens.refresh_token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
    }

    return NextResponse.redirect(`${appUrl}/?gsc_connected=true`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(`${appUrl}/?gsc_error=server_error`)
  }
}
