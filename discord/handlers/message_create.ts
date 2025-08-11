import { Message } from 'discord.js'
import { routeText } from '../../core/keyword_router'
import { log } from '../../core/logger'
import { isFromMe } from '../commands'

export async function onMessageCreate(msg: Message) {
  try {
    if (msg.author.bot) return
    if (isFromMe(msg.client.user?.id ?? null, msg.author.id)) return

    const text = msg.content ?? ''
    if (!text.trim()) return

    const result = await routeText(text)
    if (!result) return

    // reply succinctly
    await msg.reply(result.slice(0, 1900))
  } catch (e) {
    log.error('message handler error', { err: String(e) })
  }
}