export type TaskCategory = '学习' | '作业' | '阅读' | '休息' | '其他'

export interface Task {
  id: string
  title: string
  category: TaskCategory
  date: string
  startTime?: string
  durationMinutes: number
  note?: string
  completed: boolean
  createdAt: string
  completedAt?: string
}

export interface FocusRecord {
  id: string
  sessionId?: string
  startedAt: string
  endedAt: string
  durationSeconds: number
  plannedMinutes: number
  taskId?: string
  completed: boolean
}

export interface Settings {
  darkMode: boolean
  notifications: boolean
  focusMinutes: number
  breakMinutes: number
  weekStartsOnMonday: boolean
}

export interface AppData {
  version: 1
  tasks: Task[]
  focusRecords: FocusRecord[]
  favoriteMethodIds: string[]
  favoriteTipIds: string[]
  settings: Settings
}

export type TimerMode = 'focus' | 'break'
export type TimerStatus = 'idle' | 'running' | 'paused'

export interface TimerSnapshot {
  mode: TimerMode
  status: TimerStatus
  durationSeconds: number
  remainingSeconds: number
  lastStartedAt: number | null
  sessionStartedAt: string | null
  sessionId?: string
  taskId?: string
}

export interface StudyMethod {
  id: string
  name: string
  shortDescription: string
  description: string
  steps: string[]
  practicePrompt: string
  tags: string[]
  color: 'green' | 'blue' | 'amber' | 'rose'
}

export interface StudyTip {
  id: string
  title: string
  summary: string
  detail: string
  action: string
  category: string
}
