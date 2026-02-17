import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireOwnerKey } from '@/lib/auth'
import { classifyThought } from '@/lib/classify'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })

    const token = typeof body.token === 'string' ? body.token.trim() : null
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    if (!text) return NextResponse.json({ ok: false, error: 'Missing text' }, { status: 400 })

    const owner_key = await requireOwnerKey(token)

    const source = String(body.source ?? 'api')
    const source_message_id = body.source_message_id != null ? String(body.source_message_id) : null
    const source_thread_id = body.source_thread_id != null ? String(body.source_thread_id) : null
    const source_channel_id = body.source_channel_id != null ? String(body.source_channel_id) : null
    const source_user_id = body.source_user_id != null ? String(body.source_user_id) : null

    const supabase = supabaseAdmin()

    const classification = await classifyThought(text)
    const filed_to = classification.filed_to

    let destination_table: string | null = null
    let destination_id: string | null = null

    const today = new Date().toISOString().slice(0, 10)

    if (filed_to === 'people' && classification.people) {
      destination_table = 'sb_people'
      const { data, error } = await supabase
        .from('sb_people')
        .insert({
          owner_key,
          name: classification.people.name,
          context: classification.people.context ?? null,
          follow_ups: classification.people.follow_ups ?? null,
          tags: classification.people.tags ?? [],
          last_touched: today,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      destination_id = data?.id ?? null
    } else if (filed_to === 'projects' && classification.projects) {
      destination_table = 'sb_projects'
      const { data, error } = await supabase
        .from('sb_projects')
        .insert({
          owner_key,
          name: classification.projects.name,
          status: classification.projects.status ?? 'active',
          next_action: classification.projects.next_action ?? null,
          notes: classification.projects.notes ?? null,
          tags: classification.projects.tags ?? [],
          last_touched: today,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      destination_id = data?.id ?? null
    } else if (filed_to === 'ideas' && classification.ideas) {
      destination_table = 'sb_ideas'
      const { data, error } = await supabase
        .from('sb_ideas')
        .insert({
          owner_key,
          name: classification.ideas.name,
          one_liner: classification.ideas.one_liner ?? null,
          notes: classification.ideas.notes ?? null,
          tags: classification.ideas.tags ?? [],
          last_touched: today,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      destination_id = data?.id ?? null
    } else if (filed_to === 'admin' && classification.admin) {
      destination_table = 'sb_admin'
      const { data, error } = await supabase
        .from('sb_admin')
        .insert({
          owner_key,
          name: classification.admin.name,
          due_date: classification.admin.due_date ?? null,
          status: classification.admin.status ?? 'todo',
          notes: classification.admin.notes ?? null,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      destination_id = data?.id ?? null
    }

    const status = filed_to === 'needs_review' || !destination_id ? 'needs_review' : 'filed'

    const { data: logRow, error: logErr } = await supabase
      .from('sb_inbox_log')
      .insert({
        owner_key,
        source,
        source_message_id,
        source_thread_id,
        source_channel_id,
        source_user_id,
        original_text: text,
        filed_to,
        destination_table,
        destination_id,
        confidence: classification.confidence ?? null,
        status,
      })
      .select('id')
      .single()

    if (logErr) throw new Error(logErr.message)

    return NextResponse.json({
      ok: true,
      log_id: logRow?.id ?? null,
      filed_to,
      destination_table,
      destination_id,
      status,
      confidence: classification.confidence ?? null,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
