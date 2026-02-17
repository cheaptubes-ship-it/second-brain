import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// This webhook is intentionally simple:
// - Verify Telegram secret token header (optional but recommended)
// - Extract message text
// - Forward to /api/sb/capture using SB_DEFAULT_API_TOKEN

export async function POST(req: Request) {
  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (secret) {
      const got = req.headers.get('x-telegram-bot-api-secret-token')
      if (got !== secret) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      }
    }

    const apiToken = process.env.SB_DEFAULT_API_TOKEN
    if (!apiToken) return NextResponse.json({ ok: false, error: 'Missing SB_DEFAULT_API_TOKEN' }, { status: 500 })

    const update = await req.json().catch(() => null)
    if (!update) return NextResponse.json({ ok: true })

    const msg = update.message ?? update.edited_message ?? null
    const text = typeof msg?.text === 'string' ? msg.text.trim() : ''
    if (!text) return NextResponse.json({ ok: true })

    const chatId = msg?.chat?.id != null ? String(msg.chat.id) : null
    const messageId = msg?.message_id != null ? String(msg.message_id) : null
    const fromId = msg?.from?.id != null ? String(msg.from.id) : null

    const baseUrl = process.env.SB_PUBLIC_BASE_URL
    if (!baseUrl) {
      return NextResponse.json({ ok: false, error: 'Missing SB_PUBLIC_BASE_URL' }, { status: 500 })
    }

    const res = await fetch(`${baseUrl}/api/sb/capture`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: apiToken,
        text,
        source: 'telegram',
        source_channel_id: chatId,
        source_message_id: messageId,
        source_user_id: fromId,
      }),
    })

    const json = await res.json().catch(() => null)
    if (!res.ok) return NextResponse.json({ ok: false, error: json?.error ?? 'capture_failed' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
