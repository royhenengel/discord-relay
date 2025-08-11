import { loadAssistantPrefs } from './assistant_prefs'

export type Modes = Record<string, boolean>

let cache: Modes | null = null

export async function getModes(): Promise<Modes> {
  if (!cache) {
    const prefs = await loadAssistantPrefs()
    cache = { ...prefs.modes }
  }
  return { ...cache }
}

export async function setMode(name: string, value: boolean) {
  const prefs = await loadAssistantPrefs()
  const next = { ...prefs.modes, [name]: value }
  prefs.modes = next
  // persist
  const { setAssistantPrefs } = await import('../storage/assistant_config_repo')
  await setAssistantPrefs(prefs)
  cache = { ...next }
}

export function listModesText(m: Modes): string {
  const lines = Object.entries(m).map(([k, v]) => `${k} — ${v ? 'ON' : 'OFF'}`)
  return lines.join('\n')
}