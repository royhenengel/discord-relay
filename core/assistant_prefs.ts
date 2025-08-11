import { getAssistantPrefs, AssistantPrefs } from '../storage/assistant_config_repo'

let cache: AssistantPrefs | null = null

export async function loadAssistantPrefs(): Promise<AssistantPrefs> {
  if (cache) return cache
  cache = await getAssistantPrefs()
  return cache
}

export function clearAssistantPrefsCache() {
  cache = null
}