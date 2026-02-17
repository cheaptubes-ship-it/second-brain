import OpenAI from 'openai'
import { z } from 'zod'

export const ClassificationSchema = z.object({
  filed_to: z.enum(['people', 'projects', 'ideas', 'admin', 'needs_review']),
  confidence: z.number().min(0).max(1).optional(),
  // Destination fields (only some apply)
  people: z
    .object({
      name: z.string().min(1),
      context: z.string().optional(),
      follow_ups: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
  projects: z
    .object({
      name: z.string().min(1),
      status: z.enum(['active', 'waiting', 'blocked', 'someday', 'done']).optional(),
      next_action: z.string().optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
  ideas: z
    .object({
      name: z.string().min(1),
      one_liner: z.string().optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
  admin: z
    .object({
      name: z.string().min(1),
      due_date: z.string().optional(), // YYYY-MM-DD if known
      status: z.enum(['todo', 'done']).optional(),
      notes: z.string().optional(),
    })
    .optional(),
})

export type Classification = z.infer<typeof ClassificationSchema>

export async function classifyThought(text: string): Promise<Classification> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      filed_to: 'needs_review',
      confidence: 0,
    }
  }

  const client = new OpenAI({ apiKey })

  const system =
    'You are classifying a short personal note into one of: people, projects, ideas, admin, needs_review. ' +
    'Return STRICT JSON that matches the provided schema. Prefer needs_review when unsure.'

  const prompt = `Text: ${JSON.stringify(text)}`

  const res = await client.chat.completions.create({
    model: process.env.SB_CLASSIFIER_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content:
          prompt +
          '\n\nSchema:\n' +
          '{filed_to: "people"|"projects"|"ideas"|"admin"|"needs_review", confidence?:0..1, people?:{name,context?,follow_ups?,tags?}, projects?:{name,status?,next_action?,notes?,tags?}, ideas?:{name,one_liner?,notes?,tags?}, admin?:{name,due_date?,status?,notes?}}',
      },
    ],
    response_format: { type: 'json_object' },
  })

  const jsonText = res.choices?.[0]?.message?.content ?? ''
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    parsed = null
  }

  const out = ClassificationSchema.safeParse(parsed)
  if (!out.success) {
    return { filed_to: 'needs_review', confidence: 0 }
  }
  return out.data
}
