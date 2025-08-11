import { createClient } from '@supabase/supabase-js'
import { readEnv } from './env'

export function supabaseAdmin() {
  const env = readEnv()
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}