import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../store/AppStore'
import type { TimerMode, TimerSnapshot } from '../types'

const TIMER_KEY = 'zhishi.timer.v1'

function initialSnapshot(focusMinutes: number): TimerSnapshot {
  return {
    mode: 'focus',
    status: 'idle',
    durationSeconds: focusMinutes * 60,
    remainingSeconds: focusMinutes * 60,
    lastStartedAt: null,
    sessionStartedAt: null,
  }
}

function loadTimer(focusMinutes: number, breakMinutes: number): TimerSnapshot {
  try {
    const raw = localStorage.getItem(TIMER_KEY)
    if (!raw) return initialSnapshot(focusMinutes)
    const parsed = JSON.parse(raw) as Partial<TimerSnapshot>
    if (
      (parsed.mode !== 'focus' && parsed.mode !== 'break') ||
      (parsed.status !== 'idle' && parsed.status !== 'running' && parsed.status !== 'paused') ||
      typeof parsed.durationSeconds !== 'number' ||
      typeof parsed.remainingSeconds !== 'number'
    ) {
      return initialSnapshot(focusMinutes)
    }
    const hydrated = { ...initialSnapshot(focusMinutes), ...parsed }
    if (hydrated.status === 'idle') {
      const duration = (hydrated.mode === 'focus' ? focusMinutes : breakMinutes) * 60
      return { ...hydrated, durationSeconds: duration, remainingSeconds: duration }
    }
    return hydrated
  } catch {
    return initialSnapshot(focusMinutes)
  }
}

function remainingAt(snapshot: TimerSnapshot, now: number): number {
  if (snapshot.status !== 'running' || snapshot.lastStartedAt === null) {
    return Math.max(0, snapshot.remainingSeconds)
  }
  const elapsed = Math.floor((now - snapshot.lastStartedAt) / 1000)
  return Math.max(0, snapshot.remainingSeconds - elapsed)
}

function sessionIdFor(snapshot: TimerSnapshot): string {
  return snapshot.sessionId ?? `focus-${snapshot.sessionStartedAt ?? snapshot.lastStartedAt ?? 'unknown'}`
}

export function usePomodoro() {
  const { data, addFocusRecord } = useAppStore()
  const [snapshot, setSnapshot] = useState<TimerSnapshot>(() =>
    loadTimer(data.settings.focusMinutes, data.settings.breakMinutes),
  )
  const [now, setNow] = useState(0)
  const finishingRef = useRef(false)
  const lastRecordedSessionRef = useRef<string | null>(null)

  const remainingSeconds = remainingAt(snapshot, now || snapshot.lastStartedAt || 0)

  useEffect(() => {
    localStorage.setItem(TIMER_KEY, JSON.stringify(snapshot))
  }, [snapshot])

  useEffect(() => {
    if (snapshot.status !== 'running') return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [snapshot.status])

  const notify = useCallback(
    (body: string) => {
      if (
        data.settings.notifications &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification('知时', { body })
      }
    },
    [data.settings.notifications],
  )

  useEffect(() => {
    if (snapshot.status !== 'running' || remainingSeconds > 0 || finishingRef.current) return
    finishingRef.current = true

    if (snapshot.mode === 'focus') {
      const endedAt = new Date().toISOString()
      const sessionKey = sessionIdFor(snapshot)
      if (lastRecordedSessionRef.current !== sessionKey) {
        lastRecordedSessionRef.current = sessionKey
        addFocusRecord({
          sessionId: sessionKey,
          startedAt: snapshot.sessionStartedAt ?? new Date(Date.now() - snapshot.durationSeconds * 1000).toISOString(),
          endedAt,
          durationSeconds: snapshot.durationSeconds,
          plannedMinutes: Math.round(snapshot.durationSeconds / 60),
          taskId: snapshot.taskId,
          completed: true,
        })
      }
      notify('本次专注已完成，起来休息一下。')
    } else {
      notify('休息结束，可以开始下一轮专注了。')
    }

    const nextMode: TimerMode = snapshot.mode === 'focus' ? 'break' : 'focus'
    const nextDuration =
      (nextMode === 'focus' ? data.settings.focusMinutes : data.settings.breakMinutes) * 60
    setSnapshot({
      mode: nextMode,
      status: 'idle',
      durationSeconds: nextDuration,
      remainingSeconds: nextDuration,
      lastStartedAt: null,
      sessionStartedAt: null,
    })
    setNow(Date.now())
  }, [
    addFocusRecord,
    data.settings.breakMinutes,
    data.settings.focusMinutes,
    notify,
    remainingSeconds,
    snapshot,
  ])

  useEffect(() => {
    if (snapshot.status === 'idle' && snapshot.remainingSeconds > 0) {
      finishingRef.current = false
    }
  }, [snapshot.remainingSeconds, snapshot.status])

  const start = useCallback(
    (taskId?: string) => {
      const currentNow = Date.now()
      setNow(currentNow)
      setSnapshot((current) => {
        const liveRemaining = remainingAt(current, currentNow)
        const duration =
          liveRemaining > 0
            ? current.durationSeconds
            : (current.mode === 'focus'
                ? data.settings.focusMinutes
                : data.settings.breakMinutes) * 60
        return {
          ...current,
          durationSeconds: duration,
          remainingSeconds: liveRemaining > 0 ? liveRemaining : duration,
          status: 'running',
          lastStartedAt: currentNow,
          sessionStartedAt:
            current.mode === 'focus'
              ? current.sessionStartedAt ?? new Date(currentNow).toISOString()
              : null,
          taskId: current.mode === 'focus' ? taskId ?? current.taskId : undefined,
          sessionId:
            current.mode === 'focus'
              ? current.sessionId ?? `focus-${currentNow}`
              : undefined,
        }
      })
    },
    [data.settings.breakMinutes, data.settings.focusMinutes],
  )

  const pause = useCallback(() => {
    const currentNow = Date.now()
    setNow(currentNow)
    setSnapshot((current) => ({
      ...current,
      status: 'paused',
      remainingSeconds: remainingAt(current, currentNow),
      lastStartedAt: null,
    }))
  }, [])

  const reset = useCallback(() => {
    setNow(Date.now())
    setSnapshot((current) => {
      const duration =
        (current.mode === 'focus' ? data.settings.focusMinutes : data.settings.breakMinutes) * 60
      return {
        ...current,
        status: 'idle',
        durationSeconds: duration,
        remainingSeconds: duration,
        lastStartedAt: null,
        sessionStartedAt: null,
        sessionId: undefined,
        taskId: undefined,
      }
    })
  }, [data.settings.breakMinutes, data.settings.focusMinutes])

  const end = useCallback(() => {
    const currentNow = Date.now()
    setNow(currentNow)
    const liveRemaining = remainingAt(snapshot, currentNow)
    const elapsed = Math.max(0, snapshot.durationSeconds - liveRemaining)
    if (snapshot.mode === 'focus' && elapsed > 0) {
      const sessionKey = sessionIdFor(snapshot)
      if (lastRecordedSessionRef.current !== sessionKey) {
        lastRecordedSessionRef.current = sessionKey
        addFocusRecord({
          sessionId: sessionKey,
          startedAt: snapshot.sessionStartedAt ?? new Date(currentNow - elapsed * 1000).toISOString(),
          endedAt: new Date(currentNow).toISOString(),
          durationSeconds: elapsed,
          plannedMinutes: Math.round(snapshot.durationSeconds / 60),
          taskId: snapshot.taskId,
          completed: liveRemaining === 0,
        })
      }
    }
    const nextMode: TimerMode = snapshot.mode === 'focus' ? 'break' : 'focus'
    const nextDuration =
      (nextMode === 'focus' ? data.settings.focusMinutes : data.settings.breakMinutes) * 60
    setSnapshot({
      mode: nextMode,
      status: 'idle',
      durationSeconds: nextDuration,
      remainingSeconds: nextDuration,
      lastStartedAt: null,
      sessionStartedAt: null,
      sessionId: undefined,
    })
  }, [addFocusRecord, data.settings.breakMinutes, data.settings.focusMinutes, snapshot])

  const switchMode = useCallback(
    (mode: TimerMode) => {
      const duration =
        (mode === 'focus' ? data.settings.focusMinutes : data.settings.breakMinutes) * 60
      setNow(Date.now())
      setSnapshot({
        mode,
        status: 'idle',
        durationSeconds: duration,
        remainingSeconds: duration,
        lastStartedAt: null,
        sessionStartedAt: null,
        sessionId: undefined,
      })
    },
    [data.settings.breakMinutes, data.settings.focusMinutes],
  )

  const progress = useMemo(
    () => 1 - remainingSeconds / Math.max(1, snapshot.durationSeconds),
    [remainingSeconds, snapshot.durationSeconds],
  )

  return {
    snapshot,
    remainingSeconds,
    progress,
    start,
    pause,
    reset,
    end,
    switchMode,
  }
}

export type PomodoroController = ReturnType<typeof usePomodoro>
export const timerStorageKey = TIMER_KEY
