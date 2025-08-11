type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const envLevel = (process.env.LOG_LEVEL as Level) || 'info'
const threshold = LEVELS[envLevel] ?? LEVELS.info

function ts() {
  return new Date().toISOString()
}

function write(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < threshold) return
  const line = `[${ts()}] ${level.toUpperCase()} ${msg}`
  if (meta) console.log(line, JSON.stringify(meta))
  else console.log(line)
}

export const log = {
  debug: (m: string, meta?: Record<string, unknown>) => write('debug', m, meta),
  info:  (m: string, meta?: Record<string, unknown>) => write('info', m, meta),
  warn:  (m: string, meta?: Record<string, unknown>) => write('warn', m, meta),
  error: (m: string, meta?: Record<string, unknown>) => write('error', m, meta),
}