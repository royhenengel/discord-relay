import { readEnv } from '../config/env'
import { getAppConfig } from '../storage/bot_config_repo'
import { log } from './logger'

export async function loadConfig() {
  const env = readEnv()
  const cfg = await getAppConfig()
  log.info('config loaded', { node_env: env.NODE_ENV, prefix: cfg.bot.prefix })
  return { env, cfg }
}