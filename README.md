# Second Brain (Supabase)

This replaces the Notion DB-based "Second Brain" guide with a Supabase-backed system.

## What it does

- Accepts captured thoughts from **Slack** and **Telegram** (or direct API)
- Classifies them into: **people / projects / ideas / admin / needs_review**
- Writes structured rows into Supabase tables + keeps an audit trail in `sb_inbox_log`

## Supabase schema

Run:
- `supabase/second_brain.sql`

## Environment variables

Required:
- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`

Ingestion:
- `SB_PUBLIC_BASE_URL` (e.g. `https://your-vercel-domain`) — used by Slack/Telegram webhooks to call the capture route
- `SB_DEFAULT_API_TOKEN` — a token that exists in `sb_api_tokens.token`

LLM (optional; without this everything goes to `needs_review`):
- `OPENAI_API_KEY`
- `SB_CLASSIFIER_MODEL` (default `gpt-4o-mini`)

Slack (optional verification):
- `SLACK_SIGNING_SECRET`

Telegram (optional verification):
- `TELEGRAM_WEBHOOK_SECRET`

## API

### Capture (direct)

`POST /api/sb/capture`

```json
{
  "token": "...",
  "text": "Project: finish Q1 report by Friday",
  "source": "api"
}
```

### Slack Events API

`POST /api/sb/slack/events`

Configure a Slack app with Events API and point it to:
`https://YOUR_DOMAIN/api/sb/slack/events`

### Telegram webhook

`POST /api/sb/telegram/webhook`

Configure Telegram bot webhook to:
`https://YOUR_DOMAIN/api/sb/telegram/webhook`

## Dev

```bash
npm run dev
```
