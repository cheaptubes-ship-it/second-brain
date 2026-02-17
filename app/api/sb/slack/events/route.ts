import { NextResponse } from 'next/server'
import crypto from 'node:crypto'

export const runtime = 'nodejs'

function verifySlackSignature(req: Request, bodyText: string) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) return true // optional

  const ts = req.headers.get('x-slack-request-timestamp')
  const sig = req.headers.get('x-slack-signature')
  if (!ts || !sig) return false

  // Prevent replay attacks (5 minutes)
  const age = Math.abs(Date.now() / 1000 - Number(ts))
  if (!Number.isFinite(age) || age > 60 * 5) return false

  const base = `v0:${ts}:${bodyText}`
  const hmac = crypto.createHmac('sha256', signingSecret).update(base).digest('hex')
  const expected = `v0=${hmac}`

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  try {
    const apiToken = process.env.SB_DEFAULT_API_TOKEN
    if (!apiToken) return NextResponse.json({ ok: false, error: 'Missing SB_DEFAULT_API_TOKEN' }, { status: 500 })

    const bodyText = await req.text()
    if (!verifySlackSignature(req, bodyText)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = JSON.parse(bodyText)

    // URL verification challenge
    if (payload?.type === 'url_verification' && payload?.challenge) {
      return NextResponse.json({ challenge: payload.challenge })
    }

    const event = payload?.event
    if (!event) return NextResponse.json({ ok: true })

    // Ignore bot messages
    if (event.subtype === 'bot_message' || event.bot_id) return NextResponse.json({ ok: true })

    const text = typeof event.text === 'string' ? event.text.trim() : ''
    if (!text) return NextResponse.json({ ok: true })

    const baseUrl = process.env.SB_PUBLIC_BASE_URL
    if (!baseUrl) return NextResponse.json({ ok: false, error: 'Missing SB_PUBLIC_BASE_URL' }, { status: 500 })

    const res = await fetch(`${baseUrl}/api/sb/capture`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: apiToken,
        text,
        source: 'slack',
        source_channel_id: event.channel != null ? String(event.channel) : null,
        source_message_id: event.event_ts != null ? String(event.event_ts) : null,
        source_thread_id: event.thread_ts != null ? String(event.thread_ts) : null,
        source_user_id: event.user != null ? String(event.user) : null,
      }),
    })

    const json = await res.json().catch(() => null)
    if (!res.ok) return NextResponse.json({ ok: false, error: json?.error ?? 'capture_failed' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
