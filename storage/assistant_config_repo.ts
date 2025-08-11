import { supabaseAdmin } from '../config/supabase'

export type AssistantPrefs = {
  control_keywords: string[]
  modes: Record<string, boolean>
  command_keywords: string[]
  utility_commands: string[]
  implicit_triggers: string[]
}

export async function getAssistantPrefs(): Promise<AssistantPrefs> {
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from('assistant_config')
    .select('value_json')
    .eq('key', 'assistant_prefs')
    .maybeSingle()

  if (error) throw error
  if (!data?.value_json) throw new Error('Missing assistant_config key "assistant_prefs"')

  return data.value_json as AssistantPrefs
}

export async function setAssistantPrefs(prefs: AssistantPrefs): Promise<void> {
  const sb = supabaseAdmin()
  const { error } = await sb
    .from('assistant_config')
    .upsert({ key: 'assistant_prefs', value_json: prefs as unknown as Record<string, unknown> })
  if (error) throw error
}

export async function getAssistantSecret(key: string): Promise<string> {
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from('assistant_config')
    .select('value_json')
    .eq('key', key)
    .eq('is_secret', true)
    .maybeSingle()

  if (error) throw error
  if (!data?.value_json) throw new Error(`Missing secret ${key}`)
  const token = (data.value_json as Record<string, string>).token
  if (!token) throw new Error(`Secret ${key} missing "token" field`)
  return token
}