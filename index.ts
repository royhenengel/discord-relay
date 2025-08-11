import { makeClient } from './discord/client'
import { onMessageCreate } from './discord/handlers/message_create'
import { loadConfig } from './core/config_loader'
import { getAssistantSecret } from './storage/assistant_config_repo'
import { log } from './core/logger'
import { supabaseAdmin } from './config/supabase'

async function healthCheck() {
  const sb = supabaseAdmin()

  // tables present
  const tables = ['assistant_config', 'bot_config']
  for (const t of tables) {
    const { error } = await sb.from(t).select('id', { count: 'exact', head: true })
    if (error) throw new Error(`DB table check failed for ${t}: ${error.message}`)
  }

  // assistant_prefs exists
  const prefs = await sb
    .from('assistant_config')
    .select('value_json')
    .eq('key', 'assistant_prefs')
    .maybeSingle()
  if (prefs.error) throw new Error(`assistant_prefs read failed: ${prefs.error.message}`)
  if (!prefs.data?.value_json) throw new Error('Missing assistant_config key "assistant_prefs"')

  // discord token present
  const tokenRow = await sb
    .from('assistant_config')
    .select('value_json')
    .eq('key', 'discord_bot_token')
    .maybeSingle()
  if (tokenRow.error) throw new Error(`discord_bot_token read failed: ${tokenRow.error.message}`)
  const token = (tokenRow.data?.value_json as { token?: string } | undefined)?.token
  if (!token || !token.trim()) throw new Error('Missing assistant_config key "discord_bot_token" or empty token')

  log.info('health check ok')
}

async function start() {
  try {
    const { env } = await loadConfig()
    log.info('boot start', { node_env: env.NODE_ENV })

    await healthCheck()

    const discordToken = await getAssistantSecret('discord_bot_token')

    const client = makeClient()
    client.on('ready', () => log.info('discord ready', { user: client.user?.tag }))
    client.on('messageCreate', onMessageCreate)

    await client.login(discordToken)

    log.info('boot ok')
  } catch (e) {
    const err = e as any
    const message = err?.message ?? String(e)
    const stack = err?.stack ?? null
    console.error('[FATAL]', message)
    if (stack) console.error(stack)
    process.exit(1)
  }
}

start()