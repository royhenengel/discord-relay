import { supabaseAdmin } from '../config/supabase'

export type AppConfig = {
  bot: {
    prefix: string
    default_modes: Record<string, boolean>
  }
}

export async function getAppConfig(): Promise<AppConfig> {
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from('bot_config')
    .select('value_json')
    .eq('key', 'app')
    .maybeSingle()

  if (error) throw error
  if (!data?.value_json) throw new Error('Missing bot_config key "app"')

  return data.value_json as AppConfig
}