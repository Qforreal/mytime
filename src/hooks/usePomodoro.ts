import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../store/AppStore'
import type { TimerMode, TimerSnapshot } from '../types'

const TIMER_KEY = 'zhishi.timer.v1'
const NATIVE_NOTIFICATION_ID = 9001
// Bump the channel id so installs that already created the old silent channel
// receive the new audible channel configuration.
const NATIVE_CHANNEL_ID = 'pomodoro-complete-v2'
const NATIVE_SOUND_FILE = 'pomodoro_complete.wav'
const MAX_TIMER_SECONDS = 90 * 60

export interface TimerCompletionNotice {
  id: string
  mode: TimerMode
  message: string
  completedAt: string
}

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
      !Number.isFinite(parsed.durationSeconds) ||
      typeof parsed.remainingSeconds !== 'number' ||
      !Number.isFinite(parsed.remainingSeconds) ||
      parsed.durationSeconds < 1 ||
      parsed.durationSeconds > MAX_TIMER_SECONDS ||
      parsed.remainingSeconds < 0 ||
      parsed.remainingSeconds > parsed.durationSeconds
    ) {
      return initialSnapshot(focusMinutes)
    }
    const hydrated: TimerSnapshot = {
      ...initialSnapshot(focusMinutes),
      mode: parsed.mode,
      status: parsed.status,
      durationSeconds: parsed.durationSeconds,
      remainingSeconds: parsed.remainingSeconds,
      lastStartedAt: typeof parsed.lastStartedAt === 'number' && Number.isFinite(parsed.lastStartedAt) && parsed.lastStartedAt > 0
        ? Math.min(Date.now(), Math.max(0, parsed.lastStartedAt))
        : null,
      sessionStartedAt: isIsoTimestamp(parsed.sessionStartedAt) ? parsed.sessionStartedAt : null,
      sessionId: typeof parsed.sessionId === 'string' && parsed.sessionId.length <= 160 ? parsed.sessionId : undefined,
      taskId: typeof parsed.taskId === 'string' && parsed.taskId.length <= 120 ? parsed.taskId : undefined,
    }
    if (hydrated.status === 'idle') {
      const duration = (hydrated.mode === 'focus' ? focusMinutes : breakMinutes) * 60
      return { ...hydrated, durationSeconds: duration, remainingSeconds: duration }
    }
    if (hydrated.status === 'running' && hydrated.lastStartedAt === null) {
      return { ...hydrated, status: 'paused' }
    }
    return hydrated
  } catch {
    return initialSnapshot(focusMinutes)
  }
}

function remainingAt(snapshot: TimerSnapshot, now: number): number {
  const storedRemaining = Math.min(
    Math.max(0, snapshot.remainingSeconds),
    Math.max(1, snapshot.durationSeconds),
  )
  if (snapshot.status !== 'running' || snapshot.lastStartedAt === null) {
    return storedRemaining
  }
  const elapsed = Math.max(0, Math.floor((now - snapshot.lastStartedAt) / 1000))
  return Math.max(0, storedRemaining - elapsed)
}

function completionDeadline(snapshot: TimerSnapshot, now: number): number {
  if (snapshot.lastStartedAt !== null && Number.isFinite(snapshot.lastStartedAt) && snapshot.lastStartedAt > 0) {
    const deadline = snapshot.lastStartedAt + Math.max(0, snapshot.remainingSeconds) * 1000
    if (Number.isFinite(deadline)) return Math.min(now, deadline)
  }
  return now
}

function sessionIdFor(snapshot: TimerSnapshot): string {
  return snapshot.sessionId ?? `focus-${snapshot.sessionStartedAt ?? snapshot.lastStartedAt ?? 'unknown'}`
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value))
}

function notificationCopy(mode: TimerMode) {
  return mode === 'focus'
    ? { title: '专注完成', body: '本次专注已完成，起来休息一下。' }
    : { title: '休息结束', body: '休息结束，可以开始下一轮专注了。' }
}

export function usePomodoro() {
  const { data, addFocusRecord, updateSettings } = useAppStore()
  const [snapshot, setSnapshot] = useState<TimerSnapshot>(() =>
    loadTimer(data.settings.focusMinutes, data.settings.breakMinutes),
  )
  const [completionNotice, setCompletionNotice] = useState<TimerCompletionNotice | null>(null)
  const [now, setNow] = useState(0)
  const finishingRef = useRef(false)
  const lastRecordedSessionRef = useRef<string | null>(null)
  const notificationTokenRef = useRef(0)
  const nativeQueueRef = useRef<Promise<void>>(Promise.resolve())
  const audioContextRef = useRef<AudioContext | null>(null)

  const configuredDuration =
    (snapshot.mode === 'focus' ? data.settings.focusMinutes : data.settings.breakMinutes) * 60
  const visibleSnapshot = snapshot.status === 'idle'
    ? { ...snapshot, durationSeconds: configuredDuration, remainingSeconds: configuredDuration }
    : snapshot
  const remainingSeconds = remainingAt(visibleSnapshot, now || visibleSnapshot.lastStartedAt || 0)

  useEffect(() => {
    try {
      localStorage.setItem(TIMER_KEY, JSON.stringify(snapshot))
    } catch {
      // Private browsing and full storage can reject persistence; keep the timer usable in memory.
    }
  }, [snapshot])

  useEffect(() => {
    if (snapshot.status !== 'running') return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [snapshot.status])

  const enqueueNativeOperation = useCallback((operation: () => Promise<void>) => {
    const queued = nativeQueueRef.current.then(operation, operation)
    nativeQueueRef.current = queued.then(() => undefined, () => undefined)
    return queued
  }, [])

  const cancelNativeNotification = useCallback(() => {
    notificationTokenRef.current += 1
    if (!Capacitor.isNativePlatform()) return
    void enqueueNativeOperation(async () => {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: NATIVE_NOTIFICATION_ID }] })
      } catch {
        // There may be no scheduled notification yet; cancellation is best-effort.
      }
    })
  }, [enqueueNativeOperation])

  const scheduleNativeNotification = useCallback(
    (mode: TimerMode, seconds: number) => {
      if (!Capacitor.isNativePlatform() || !data.settings.notifications) return
      const token = ++notificationTokenRef.current
      const copy = notificationCopy(mode)
      const deadlineAt = Date.now() + Math.max(1, Math.ceil(seconds)) * 1000
      void enqueueNativeOperation(async () => {
        try {
          const permission = await LocalNotifications.checkPermissions()
          const granted = permission.display === 'granted'
            ? permission
            : await LocalNotifications.requestPermissions()
          if (granted.display !== 'granted') {
            if (token === notificationTokenRef.current) updateSettings({ notifications: false })
            return
          }
          if (token !== notificationTokenRef.current) return

          let channelId: string | undefined
          try {
            await LocalNotifications.createChannel({
              id: NATIVE_CHANNEL_ID,
              name: '专注提醒',
              description: '番茄钟完成提醒',
              importance: 4,
              vibration: true,
              sound: NATIVE_SOUND_FILE,
            })
            channelId = NATIVE_CHANNEL_ID
          } catch {
            // Android 7.x has no notification channels; schedule on the default channel.
          }
          if (token !== notificationTokenRef.current) return

          const remainingMs = deadlineAt - Date.now()
          if (remainingMs <= 0) return
          const at = new Date(Date.now() + Math.max(1, Math.ceil(remainingMs / 1000)) * 1000)
          await LocalNotifications.schedule({
            notifications: [
              {
                id: NATIVE_NOTIFICATION_ID,
                title: copy.title,
                body: copy.body,
                ...(channelId ? { channelId } : {}),
                ...(Capacitor.getPlatform() === 'android' ? { sound: NATIVE_SOUND_FILE } : {}),
                schedule: { at, allowWhileIdle: true },
                isExactNotification: false,
                foreground: true,
                autoCancel: true,
              },
            ],
          })
          if (token !== notificationTokenRef.current) {
            await LocalNotifications.cancel({ notifications: [{ id: NATIVE_NOTIFICATION_ID }] })
          }
        } catch (error) {
          if (token === notificationTokenRef.current) updateSettings({ notifications: false })
          console.warn('原生番茄钟提醒安排失败。', error)
        }
      })
    },
    [data.settings.notifications, enqueueNativeOperation, updateSettings],
  )

  useEffect(() => {
    if (data.settings.notifications) return
    cancelNativeNotification()
  }, [cancelNativeNotification, data.settings.notifications])

  useEffect(() => {
    if (snapshot.status !== 'running') return
    const remaining = remainingAt(snapshot, Date.now())
    if (remaining <= 0) return
    scheduleNativeNotification(snapshot.mode, remaining)
  }, [scheduleNativeNotification, snapshot])

  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null
    if (audioContextRef.current) return audioContextRef.current
    const AudioContextCtor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return null
    try {
      audioContextRef.current = new AudioContextCtor()
      return audioContextRef.current
    } catch {
      return null
    }
  }, [])

  const primeAudio = useCallback(() => {
    const audioContext = getAudioContext()
    if (audioContext?.state === 'suspended') void audioContext.resume()
  }, [getAudioContext])

  const notify = useCallback(
    (body: string) => {
      if (!data.settings.notifications) return

      // Capacitor WebViews and iOS browsers may not expose Notification. The in-app
      // completion notice is rendered separately; vibration adds a tactile cue.
      if (
        !Capacitor.isNativePlatform() &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission !== 'granted'
      ) {
        // A permission can be revoked outside the app. Keep the persisted toggle
        // honest so the next session can request it again from Settings.
        updateSettings({ notifications: false })
      }
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate([180, 80, 180])
        }
      } catch {
        // Vibration is best-effort and can be rejected by browser/device policy.
      }

      try {
        const audioContext = getAudioContext()
        if (audioContext) {
          if (audioContext.state === 'suspended') void audioContext.resume()
          const oscillator = audioContext.createOscillator()
          const gain = audioContext.createGain()
          oscillator.type = 'sine'
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(660, audioContext.currentTime + 0.18)
          gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.42)
          oscillator.connect(gain)
          gain.connect(audioContext.destination)
          oscillator.start()
          oscillator.stop(audioContext.currentTime + 0.45)
        }
      } catch {
        // Some mobile browsers only allow audio after a gesture; the visual notice remains.
      }

      try {
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification('知时', { body })
        }
      } catch {
        // Notification constructors can throw when permission was revoked or unsupported.
      }
    },
    [data.settings.notifications, getAudioContext, updateSettings],
  )

  useEffect(() => {
    if (snapshot.status !== 'running' || remainingSeconds > 0 || finishingRef.current) return
    finishingRef.current = true

    const endedAt = new Date(completionDeadline(snapshot, Date.now())).toISOString()
    const message =
      snapshot.mode === 'focus' ? '本次专注已完成，起来休息一下。' : '休息结束，可以开始下一轮专注了。'
    setCompletionNotice({
      id: `${snapshot.mode}-${sessionIdFor(snapshot)}-${endedAt}`,
      mode: snapshot.mode,
      message,
      completedAt: endedAt,
    })

    if (snapshot.mode === 'focus') {
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
    }
    cancelNativeNotification()
    notify(message)

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
    cancelNativeNotification,
    notify,
    remainingSeconds,
    snapshot,
  ])

  const clearCompletionNotice = useCallback(() => setCompletionNotice(null), [])

  useEffect(() => {
    if (snapshot.status === 'idle' && snapshot.remainingSeconds > 0) {
      finishingRef.current = false
    }
  }, [snapshot.remainingSeconds, snapshot.status])

  const start = useCallback(
    (taskId?: string) => {
      const currentNow = Date.now()
      primeAudio()
      setNow(currentNow)
      setSnapshot((current) => {
        const configuredDuration =
          (current.mode === 'focus' ? data.settings.focusMinutes : data.settings.breakMinutes) * 60
        // An idle timer always starts with the latest saved setting. A paused timer
        // resumes its existing session and therefore keeps its original duration.
        const liveRemaining = current.status === 'idle' ? configuredDuration : remainingAt(current, currentNow)
        const duration = current.status === 'idle'
          ? configuredDuration
          : liveRemaining > 0
            ? current.durationSeconds
            : configuredDuration
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
    [data.settings.breakMinutes, data.settings.focusMinutes, primeAudio],
  )

  const pause = useCallback(() => {
    const currentNow = Date.now()
    setNow(currentNow)
    cancelNativeNotification()
    setSnapshot((current) => ({
      ...current,
      status: 'paused',
      remainingSeconds: remainingAt(current, currentNow),
      lastStartedAt: null,
    }))
  }, [cancelNativeNotification])

  const reset = useCallback(() => {
    setNow(Date.now())
    cancelNativeNotification()
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
  }, [cancelNativeNotification, data.settings.breakMinutes, data.settings.focusMinutes])

  const end = useCallback(() => {
    const currentNow = Date.now()
    setNow(currentNow)
    cancelNativeNotification()
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
  }, [addFocusRecord, cancelNativeNotification, data.settings.breakMinutes, data.settings.focusMinutes, snapshot])

  const switchMode = useCallback(
    (mode: TimerMode) => {
      const duration =
        (mode === 'focus' ? data.settings.focusMinutes : data.settings.breakMinutes) * 60
      setNow(Date.now())
      cancelNativeNotification()
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
    [cancelNativeNotification, data.settings.breakMinutes, data.settings.focusMinutes],
  )

  const progress = useMemo(
    () => 1 - remainingSeconds / Math.max(1, visibleSnapshot.durationSeconds),
    [remainingSeconds, visibleSnapshot.durationSeconds],
  )

  return {
    snapshot: visibleSnapshot,
    visibleSnapshot,
    remainingSeconds,
    progress,
    start,
    pause,
    reset,
    end,
    switchMode,
    completionNotice,
    clearCompletionNotice,
  }
}

export type PomodoroController = ReturnType<typeof usePomodoro>
export const timerStorageKey = TIMER_KEY
