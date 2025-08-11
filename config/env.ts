type RequiredEnv = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  NODE_ENV?: string
}

export function readEnv(): RequiredEnv {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NODE_ENV } = process.env
  if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL')
  if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NODE_ENV }
}