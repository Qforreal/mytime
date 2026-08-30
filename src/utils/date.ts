export function toDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(key: string, amount: number): string {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + amount)
  return toDateKey(date)
}

export function startOfWeekKey(date = new Date()): string {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = copy.getDay()
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1))
  return toDateKey(copy)
}

export function isInCurrentWeek(iso: string): boolean {
  const key = toDateKey(new Date(iso))
  const start = startOfWeekKey()
  return key >= start && key <= addDays(start, 6)
}

export function formatFullDate(date = new Date()): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date)
}

export function formatShortDate(key: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(fromDateKey(key))
}

export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatFocusDuration(seconds: number): string {
  if (seconds <= 0) return '0 分钟'
  if (seconds < 60) return '< 1 分钟'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
