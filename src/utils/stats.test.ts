import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppData, FocusRecord, Task } from '../types'
import { defaultData } from '../store/AppStore'
import {
  focusSecondsForDate,
  focusSecondsThisWeek,
  focusSummaryThisWeek,
  lastSevenDays,
  taskCompletionRate,
  weekTaskSummary,
} from './stats'

function task(id: string, date: string, completed: boolean): Task {
  return {
    id,
    title: id,
    category: '学习',
    date,
    durationMinutes: 25,
    completed,
    createdAt: `${date}T08:00:00.000Z`,
  }
}

function record(id: string, endedAt: string, durationSeconds: number): FocusRecord {
  return {
    id,
    startedAt: endedAt,
    endedAt,
    durationSeconds,
    plannedMinutes: 25,
    completed: true,
  }
}

describe('学习统计', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-30T12:00:00+08:00'))
  })

  afterEach(() => vi.useRealTimers())

  it('按本地日期统计今日与本周专注', () => {
    const records = [
      record('a', '2026-08-30T02:00:00.000Z', 600),
      record('b', '2026-08-24T02:00:00.000Z', 1200),
      record('c', '2026-08-23T02:00:00.000Z', 500),
    ]
    expect(focusSecondsForDate(records, '2026-08-30')).toBe(600)
    expect(focusSecondsThisWeek(records)).toBe(1800)
  })

  it('周中只统计本周一至周日的番茄与活跃天', () => {
    vi.setSystemTime(new Date('2026-09-02T12:00:00+08:00'))
    const records = [
      record('last-sunday', '2026-08-30T10:00:00+08:00', 300),
      record('monday', '2026-08-31T10:00:00+08:00', 600),
      record('wednesday-a', '2026-09-02T09:00:00+08:00', 900),
      record('wednesday-b', '2026-09-02T10:00:00+08:00', 300),
      record('sunday', '2026-09-06T10:00:00+08:00', 1200),
      record('next-monday', '2026-09-07T10:00:00+08:00', 1800),
    ]

    expect(focusSummaryThisWeek(records)).toEqual({
      focusSeconds: 3000,
      pomodoros: 4,
      activeDays: 3,
    })
  })

  it('跨周时排除本周上界之后的未来记录', () => {
    vi.setSystemTime(new Date('2026-08-30T12:00:00+08:00'))
    const records = [
      record('monday', '2026-08-24T10:00:00+08:00', 600),
      record('sunday', '2026-08-30T10:00:00+08:00', 900),
      record('future', '2026-09-20T10:00:00+08:00', 3600),
    ]

    expect(focusSummaryThisWeek(records)).toEqual({
      focusSeconds: 1500,
      pomodoros: 2,
      activeDays: 2,
    })
  })

  it('任务完成率与周汇总保持一致', () => {
    const tasks = [task('a', '2026-08-24', true), task('b', '2026-08-30', false), task('c', '2026-08-31', true)]
    expect(taskCompletionRate(tasks)).toBe(67)
    expect(weekTaskSummary(tasks)).toEqual({ total: 2, completed: 1, rate: 50 })
  })

  it('生成连续七天趋势并包含任务完成数', () => {
    const data: AppData = {
      ...defaultData,
      tasks: [task('today', '2026-08-30', true)],
      focusRecords: [record('focus', '2026-08-30T02:00:00.000Z', 1500)],
    }
    const trend = lastSevenDays(data)
    expect(trend).toHaveLength(7)
    expect(trend.at(-1)).toMatchObject({ date: '2026-08-30', label: '今天', focusMinutes: 25, completedTasks: 1 })
  })
})
