import { CheckCircle2, Pause, Play, RotateCcw, Square, TimerReset } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/Modal'
import type { PomodoroController } from '../hooks/usePomodoro'
import { useAppStore } from '../store/AppStore'
import { formatClock, formatFocusDuration, toDateKey } from '../utils/date'
import { focusSecondsForDate, focusSecondsThisWeek } from '../utils/stats'

interface PomodoroPageProps {
  showToast: (text: string) => void
  timer: PomodoroController
}

function timerText(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function PomodoroPage({ showToast, timer }: PomodoroPageProps) {
  const { data } = useAppStore()
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [confirmAction, setConfirmAction] = useState<'reset' | 'end' | null>(null)
  const todaySeconds = focusSecondsForDate(data.focusRecords, toDateKey())
  const weekSeconds = focusSecondsThisWeek(data.focusRecords)
  const todayRecords = useMemo(
    () =>
      data.focusRecords
        .filter((record) => toDateKey(new Date(record.endedAt)) === toDateKey())
        .sort((a, b) => b.endedAt.localeCompare(a.endedAt)),
    [data.focusRecords],
  )
  const availableTasks = data.tasks.filter((task) => task.date === toDateKey() && !task.completed)
  const elapsed = timer.snapshot.durationSeconds - timer.remainingSeconds

  const doReset = () => {
    timer.reset()
    showToast('计时器已重置')
  }

  const doEnd = () => {
    timer.end()
    showToast(timer.snapshot.mode === 'focus' && elapsed > 0 ? '本次专注已记录' : '本轮已结束')
  }

  return (
    <div className="page pomodoro-page">
      <header className="page-heading compact-heading">
        <div>
          <p className="eyebrow">番茄钟</p>
          <h1>保持专注，也记得休息</h1>
          <p>一次只推进一个清晰目标。</p>
        </div>
      </header>

      <div className="pomodoro-layout">
        <section className="timer-panel">
          <div className="segmented timer-mode" role="group" aria-label="计时模式">
            <button
              type="button"
              aria-pressed={timer.snapshot.mode === 'focus'}
              disabled={timer.snapshot.status !== 'idle'}
              onClick={() => timer.switchMode('focus')}
            >
              专注 {data.settings.focusMinutes} 分钟
            </button>
            <button
              type="button"
              aria-pressed={timer.snapshot.mode === 'break'}
              disabled={timer.snapshot.status !== 'idle'}
              onClick={() => timer.switchMode('break')}
            >
              休息 {data.settings.breakMinutes} 分钟
            </button>
          </div>

          <div
            className="timer-ring"
            style={{ '--timer-progress': `${Math.max(0.012, timer.progress) * 360}deg` } as React.CSSProperties}
            role="timer"
            aria-label={`${timer.snapshot.mode === 'focus' ? '专注' : '休息'}剩余 ${timerText(timer.remainingSeconds)}`}
          >
            <div className="timer-face">
              <span>{timer.snapshot.mode === 'focus' ? '专注中' : '休息中'}</span>
              <strong>{timerText(timer.remainingSeconds)}</strong>
              <small>
                {timer.snapshot.status === 'running'
                  ? '正在计时'
                  : timer.snapshot.status === 'paused'
                    ? '已暂停'
                    : '准备开始'}
              </small>
            </div>
          </div>

          {timer.snapshot.mode === 'focus' && (
            <label className="field timer-task-select">
              <span>本轮专注任务</span>
              <select
                value={selectedTaskId}
                disabled={timer.snapshot.status !== 'idle'}
                onChange={(event) => setSelectedTaskId(event.target.value)}
              >
                <option value="">自由专注</option>
                {availableTasks.map((task) => (
                  <option key={task.id} value={task.id}>{task.title}</option>
                ))}
              </select>
            </label>
          )}

          <div className="timer-actions">
            {timer.snapshot.status === 'running' ? (
              <button className="button button-primary button-large" type="button" onClick={timer.pause}>
                <Pause aria-hidden="true" /> 暂停
              </button>
            ) : (
              <button className="button button-primary button-large" type="button" onClick={() => timer.start(selectedTaskId || undefined)}>
                <Play aria-hidden="true" /> {timer.snapshot.status === 'paused' ? '继续' : '开始'}
              </button>
            )}
            <button
              className="icon-button timer-icon-button"
              type="button"
              aria-label="重置计时器"
              data-tooltip="重置"
              onClick={() => elapsed > 0 ? setConfirmAction('reset') : doReset()}
            >
              <RotateCcw aria-hidden="true" />
            </button>
            <button
              className="icon-button timer-icon-button"
              type="button"
              aria-label="结束本轮"
              data-tooltip="结束并记录"
              onClick={() => elapsed > 0 ? setConfirmAction('end') : doEnd()}
            >
              <Square aria-hidden="true" />
            </button>
          </div>
        </section>

        <aside className="focus-summary">
          <div className="mini-metrics">
            <div>
              <span>今日专注</span>
              <strong>{formatFocusDuration(todaySeconds)}</strong>
            </div>
            <div>
              <span>本周专注</span>
              <strong>{formatFocusDuration(weekSeconds)}</strong>
            </div>
            <div>
              <span>今日番茄</span>
              <strong>{todayRecords.length} <small>个</small></strong>
            </div>
          </div>

          <section className="content-section record-section">
            <div className="section-heading">
              <div>
                <h2>今日记录</h2>
                <p>每一小段专注都算数</p>
              </div>
            </div>
            {todayRecords.length ? (
              <ul className="record-list">
                {todayRecords.slice(0, 6).map((record) => {
                  const task = data.tasks.find((item) => item.id === record.taskId)
                  return (
                    <li key={record.id}>
                      <div className="record-icon">
                        {record.completed ? <CheckCircle2 aria-hidden="true" /> : <TimerReset aria-hidden="true" />}
                      </div>
                      <div>
                        <strong>{task?.title ?? '自由专注'}</strong>
                        <span>{formatClock(record.startedAt)} - {formatClock(record.endedAt)}</span>
                      </div>
                      <b>{formatFocusDuration(record.durationSeconds)}</b>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="empty-state compact-empty">
                <TimerReset aria-hidden="true" />
                <strong>还没有专注记录</strong>
                <p>完成或提前结束一轮后会记录在这里。</p>
              </div>
            )}
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmAction === 'reset'}
        title="重置计时器"
        message="当前进度不会写入专注记录，确定重置吗？"
        confirmLabel="重置"
        onClose={() => setConfirmAction(null)}
        onConfirm={doReset}
      />
      <ConfirmDialog
        open={confirmAction === 'end'}
        title="结束本轮"
        message="已专注的时间会写入记录，确定结束吗？"
        confirmLabel="结束并记录"
        onClose={() => setConfirmAction(null)}
        onConfirm={doEnd}
      />
    </div>
  )
}
