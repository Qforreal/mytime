import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import type { AppData, FocusRecord, Settings, Task } from '../types'
import { uid } from '../utils/date'

const STORAGE_KEY = 'zhishi.app.data.v1'

export const defaultData: AppData = {
  version: 1,
  tasks: [],
  focusRecords: [],
  favoriteMethodIds: [],
  favoriteTipIds: [],
  settings: {
    darkMode: false,
    notifications: false,
    focusMinutes: 25,
    breakMinutes: 5,
    weekStartsOnMonday: true,
  },
}

type TaskInput = Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>
type Action =
  | { type: 'task/add'; payload: TaskInput }
  | { type: 'task/update'; id: string; payload: Partial<TaskInput> }
  | { type: 'task/delete'; id: string }
  | { type: 'task/toggle'; id: string }
  | { type: 'focus/add'; payload: FocusRecord }
  | { type: 'focus/clear' }
  | { type: 'favorite/method'; id: string }
  | { type: 'favorite/tip'; id: string }
  | { type: 'settings/update'; payload: Partial<Settings> }
  | { type: 'data/replace'; payload: AppData }
  | { type: 'data/clear' }

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'task/add':
      return {
        ...state,
        tasks: [
          ...state.tasks,
          {
            ...action.payload,
            id: uid('task'),
            createdAt: new Date().toISOString(),
            completed: false,
          },
        ],
      }
    case 'task/update':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id ? { ...task, ...action.payload } : task,
        ),
      }
    case 'task/delete':
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.id) }
    case 'task/toggle':
      return {
        ...state,
        tasks: state.tasks.map((task) => {
          if (task.id !== action.id) return task
          const completed = !task.completed
          return {
            ...task,
            completed,
            completedAt: completed ? new Date().toISOString() : undefined,
          }
        }),
      }
    case 'focus/add':
      if (
        action.payload.sessionId &&
        state.focusRecords.some((record) => record.sessionId === action.payload.sessionId)
      ) {
        return state
      }
      return { ...state, focusRecords: [...state.focusRecords, action.payload] }
    case 'focus/clear':
      return { ...state, focusRecords: [] }
    case 'favorite/method':
      return {
        ...state,
        favoriteMethodIds: toggleId(state.favoriteMethodIds, action.id),
      }
    case 'favorite/tip':
      return { ...state, favoriteTipIds: toggleId(state.favoriteTipIds, action.id) }
    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'data/replace':
      return action.payload
    case 'data/clear':
      return { ...defaultData, settings: state.settings }
    default:
      return state
  }
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isFiniteNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value))
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function isOptionalString(value: unknown, maxLength: number): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.length <= maxLength)
}

const taskCategories = new Set(['学习', '作业', '阅读', '休息', '其他'])

function isTask(value: unknown): value is Task {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 120 &&
    typeof value.title === 'string' && value.title.trim().length > 0 && value.title.length <= 80 &&
    typeof value.category === 'string' && taskCategories.has(value.category) &&
    isDateKey(value.date) &&
    (value.startTime === undefined || (typeof value.startTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.startTime))) &&
    isFiniteNumber(value.durationMinutes, 5, 720) &&
    isOptionalString(value.note, 240) &&
    typeof value.completed === 'boolean' &&
    isIsoDate(value.createdAt) &&
    (value.completedAt === undefined || isIsoDate(value.completedAt))
  )
}

function isFocusRecord(value: unknown): value is FocusRecord {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 120 &&
    isOptionalString(value.sessionId, 160) &&
    isIsoDate(value.startedAt) &&
    isIsoDate(value.endedAt) &&
    Date.parse(value.endedAt) >= Date.parse(value.startedAt) &&
    isFiniteNumber(value.durationSeconds, 0, 86_400) &&
    isFiniteNumber(value.plannedMinutes, 1, 720) &&
    isOptionalString(value.taskId, 120) &&
    typeof value.completed === 'boolean'
  )
}

function isSettings(value: unknown): value is Settings {
  if (!isRecord(value)) return false
  return (
    typeof value.darkMode === 'boolean' &&
    typeof value.notifications === 'boolean' &&
    isFiniteNumber(value.focusMinutes, 5, 90) &&
    isFiniteNumber(value.breakMinutes, 1, 30) &&
    typeof value.weekStartsOnMonday === 'boolean'
  )
}

export function isValidData(value: unknown): value is AppData {
  if (!isRecord(value)) return false
  const data = value as Partial<AppData>
  return (
    data.version === 1 &&
    Array.isArray(data.tasks) && data.tasks.length <= 20_000 && data.tasks.every(isTask) &&
    Array.isArray(data.focusRecords) && data.focusRecords.length <= 50_000 && data.focusRecords.every(isFocusRecord) &&
    Array.isArray(data.favoriteMethodIds) && data.favoriteMethodIds.length <= 100 && data.favoriteMethodIds.every((id) => typeof id === 'string' && id.length <= 120) &&
    Array.isArray(data.favoriteTipIds) && data.favoriteTipIds.length <= 200 && data.favoriteTipIds.every((id) => typeof id === 'string' && id.length <= 120) &&
    isSettings(data.settings)
  )
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultData
    const parsed: unknown = JSON.parse(raw)
    if (!isValidData(parsed)) return defaultData
    return {
      ...defaultData,
      ...parsed,
      settings: { ...defaultData.settings, ...parsed.settings },
    }
  } catch {
    return defaultData
  }
}

interface StoreValue {
  data: AppData
  addTask: (task: TaskInput) => void
  updateTask: (id: string, task: Partial<TaskInput>) => void
  deleteTask: (id: string) => void
  toggleTask: (id: string) => void
  addFocusRecord: (record: Omit<FocusRecord, 'id'>) => void
  clearFocusRecords: () => void
  toggleFavoriteMethod: (id: string) => void
  toggleFavoriteTip: (id: string) => void
  updateSettings: (settings: Partial<Settings>) => void
  clearData: () => void
  exportData: () => string
  importData: (raw: string) => { ok: true } | { ok: false; error: string }
}

const StoreContext = createContext<StoreValue | null>(null)

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [data, dispatch] = useReducer(reducer, undefined, loadData)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('学习数据保存失败，请检查浏览器存储空间。', error)
    }
  }, [data])

  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.darkMode ? 'dark' : 'light'
    document.documentElement.style.colorScheme = data.settings.darkMode ? 'dark' : 'light'
  }, [data.settings.darkMode])

  const addTask = useCallback((task: TaskInput) => dispatch({ type: 'task/add', payload: task }), [])
  const updateTask = useCallback(
    (id: string, task: Partial<TaskInput>) => dispatch({ type: 'task/update', id, payload: task }),
    [],
  )
  const deleteTask = useCallback((id: string) => dispatch({ type: 'task/delete', id }), [])
  const toggleTask = useCallback((id: string) => dispatch({ type: 'task/toggle', id }), [])
  const addFocusRecord = useCallback(
    (record: Omit<FocusRecord, 'id'>) =>
      dispatch({ type: 'focus/add', payload: { ...record, id: uid('focus') } }),
    [],
  )
  const clearFocusRecords = useCallback(() => dispatch({ type: 'focus/clear' }), [])
  const toggleFavoriteMethod = useCallback(
    (id: string) => dispatch({ type: 'favorite/method', id }),
    [],
  )
  const toggleFavoriteTip = useCallback(
    (id: string) => dispatch({ type: 'favorite/tip', id }),
    [],
  )
  const updateSettings = useCallback(
    (settings: Partial<Settings>) => dispatch({ type: 'settings/update', payload: settings }),
    [],
  )
  const clearData = useCallback(() => dispatch({ type: 'data/clear' }), [])
  const exportData = useCallback(() => JSON.stringify(data, null, 2), [data])
  const importData = useCallback((raw: string) => {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!isValidData(parsed)) {
        return { ok: false as const, error: '文件格式不正确，无法导入。' }
      }
      dispatch({
        type: 'data/replace',
        payload: {
          ...defaultData,
          ...parsed,
          settings: { ...defaultData.settings, ...parsed.settings },
        },
      })
      return { ok: true as const }
    } catch {
      return { ok: false as const, error: '无法读取文件，请选择本应用导出的 JSON 文件。' }
    }
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      data,
      addTask,
      updateTask,
      deleteTask,
      toggleTask,
      addFocusRecord,
      clearFocusRecords,
      toggleFavoriteMethod,
      toggleFavoriteTip,
      updateSettings,
      clearData,
      exportData,
      importData,
    }),
    [
      data,
      addTask,
      updateTask,
      deleteTask,
      toggleTask,
      addFocusRecord,
      clearFocusRecords,
      toggleFavoriteMethod,
      toggleFavoriteTip,
      updateSettings,
      clearData,
      exportData,
      importData,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useAppStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useAppStore 必须在 AppStoreProvider 内使用')
  return value
}

export const appStorageKey = STORAGE_KEY
