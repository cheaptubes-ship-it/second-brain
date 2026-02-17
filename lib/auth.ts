import { supabaseAdmin } from './supabaseAdmin'

export async function requireOwnerKey(token: string | null) {
  if (!token) throw new Error('Missing token')
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('sb_api_tokens')
    .select('owner_key, revoked_at')
    .eq('token', token)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data || data.revoked_at) throw new Error('Invalid token')
  return data.owner_key as string
}
