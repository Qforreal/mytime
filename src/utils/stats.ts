import type { AppData, FocusRecord, Task } from '../types'
import { addDays, startOfWeekKey, toDateKey } from './date'

export function focusSecondsForDate(records: FocusRecord[], dateKey: string): number {
  return records
    .filter((record) => toDateKey(new Date(record.endedAt)) === dateKey)
    .reduce((total, record) => total + record.durationSeconds, 0)
}

export function focusSummaryThisWeek(records: FocusRecord[], date = new Date()) {
  const start = startOfWeekKey(date)
  const end = addDays(start, 6)
  const weekRecords = records.filter((record) => {
    const key = toDateKey(new Date(record.endedAt))
    return key >= start && key <= end
  })

  return {
    focusSeconds: weekRecords.reduce((total, record) => total + record.durationSeconds, 0),
    pomodoros: weekRecords.length,
    activeDays: new Set(
      weekRecords
        .filter((record) => record.durationSeconds > 0)
        .map((record) => toDateKey(new Date(record.endedAt))),
    ).size,
  }
}

export function focusSecondsThisWeek(records: FocusRecord[]): number {
  return focusSummaryThisWeek(records).focusSeconds
}

export function taskCompletionRate(tasks: Task[]): number {
  if (tasks.length === 0) return 0
  return Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100)
}

export function todaySummary(data: AppData) {
  const today = toDateKey()
  const tasks = data.tasks.filter((task) => task.date === today)
  const completed = tasks.filter((task) => task.completed).length
  const focusSeconds = focusSecondsForDate(data.focusRecords, today)
  return {
    tasks,
    completed,
    focusSeconds,
    completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  }
}

export interface DailyTrend {
  date: string
  label: string
  focusMinutes: number
  completedTasks: number
}

export function lastSevenDays(data: AppData): DailyTrend[] {
  const today = toDateKey()
  const formatter = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' })
  return Array.from({ length: 7 }, (_, index) => addDays(today, index - 6)).map((date) => ({
    date,
    label: date === today ? '今天' : formatter.format(new Date(`${date}T12:00:00`)),
    focusMinutes: Math.round(focusSecondsForDate(data.focusRecords, date) / 60),
    completedTasks: data.tasks.filter((task) => task.date === date && task.completed).length,
  }))
}

export function weekTaskSummary(tasks: Task[]) {
  const start = startOfWeekKey()
  const end = addDays(start, 6)
  const weekTasks = tasks.filter((task) => task.date >= start && task.date <= end)
  return {
    total: weekTasks.length,
    completed: weekTasks.filter((task) => task.completed).length,
    rate: taskCompletionRate(weekTasks),
  }
}
