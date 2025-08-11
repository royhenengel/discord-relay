import { getAssistantPrefs } from '../storage/assistant_config_repo'
import { getModes, setMode, listModesText } from './modes'

type Action = {
  name: string
  run: (ctx: { text: string }) => Promise<string>
}

function hasToken(text: string, token: string): boolean {
  const re = new RegExp(`\\b${token.replace(/[+.*?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  return re.test(text)
}

export async function routeText(text: string): Promise<string | null> {
  const prefs = await getAssistantPrefs()
  const t = text.trim()

  // toggle autosync
  if (hasToken(t, 'autosync-on')) {
    await setMode('autosync', true)
    return 'autosync set to ON'
  }
  if (hasToken(t, 'autosync-off')) {
    await setMode('autosync', false)
    return 'autosync set to OFF'
  }

  // silence / verbose are temporary output styles
  if (hasToken(t, 'silence')) return 'silence mode for this reply'
  if (hasToken(t, 'verbose')) return 'verbose mode for this reply'

  // status-modes full set
  if (hasToken(t, 'status-modes')) {
    const modes = await getModes()
    const v = [
      'Control keywords',
      prefs.control_keywords.join('\n'),
      '',
      'Modes and status',
      listModesText(modes),
      '',
      'Command keywords',
      prefs.command_keywords.join('\n'),
      '',
      'Utility commands',
      prefs.utility_commands.join('\n'),
      '',
      'Implicit commands and triggers',
      prefs.implicit_triggers.join('\n')
    ].join('\n')
    return v
  }

  // modes-short compact list
  if (hasToken(t, 'modes-short')) {
    const modes = await getModes()
    const lines = Object.entries(modes).map(([k, v]) => `${k}:${v ? 'ON' : 'OFF'}`)
    return lines.join('  ')
  }

  // recap
  if (hasToken(t, 'recap')) {
    return 'recap pending. status and next actions will be integrated once modules plug in'
  }

  // stuck or stuch
  if (hasToken(t, 'stuck') || hasToken(t, 'stuch')) {
    return 'stuck acknowledged. pausing and proposing the simplest next step'
  }

  // ship-it, fast-path, deep-review, fix-forward, rollback
  if (hasToken(t, 'ship-it')) return 'ship-it acknowledged'
  if (hasToken(t, 'fast-path')) return 'fast-path acknowledged'
  if (hasToken(t, 'deep-review')) return 'deep-review acknowledged'
  if (hasToken(t, 'fix-forward')) return 'fix-forward acknowledged'
  if (hasToken(t, 'rollback')) return 'rollback acknowledged'

  // name-mode and full-review-mode tokens are informational
  if (hasToken(t, 'name-mode')) return 'name-mode enforced'
  if (hasToken(t, 'full-review-mode')) return 'full-review-mode enforced'

  // time+simplicity keyword is informational
  if (hasToken(t, 'time+simplicity')) return 'time+simplicity enforced'

  return null
}