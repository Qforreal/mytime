import { describe, expect, it } from 'vitest'
import { defaultData, isValidData } from './AppStore'

function validTask() {
  return {
    id: 'task-1',
    title: '复习数学',
    category: '学习',
    date: '2026-08-30',
    durationMinutes: 25,
    completed: false,
    createdAt: '2026-08-30T08:00:00.000Z',
  }
}

function validRecord() {
  return {
    id: 'focus-1',
    sessionId: 'focus-session-1',
    startedAt: '2026-08-30T08:00:00.000Z',
    endedAt: '2026-08-30T08:25:00.000Z',
    durationSeconds: 1_500,
    plannedMinutes: 25,
    completed: true,
  }
}

describe('本地数据校验', () => {
  it('接受完整且字段合法的导出数据', () => {
    expect(isValidData({
      ...defaultData,
      tasks: [validTask()],
      focusRecords: [validRecord()],
      favoriteMethodIds: ['feynman'],
      favoriteTipIds: ['tip-1'],
    })).toBe(true)
  })

  it('拒绝畸形任务、专注记录和设置', () => {
    expect(isValidData({ ...defaultData, tasks: [{ ...validTask(), durationMinutes: 0 }] })).toBe(false)
    expect(isValidData({ ...defaultData, focusRecords: [{ ...validRecord(), endedAt: 'not-a-date' }] })).toBe(false)
    expect(isValidData({ ...defaultData, settings: { ...defaultData.settings, focusMinutes: 120 } })).toBe(false)
  })
})
