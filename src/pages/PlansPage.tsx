import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/Modal'
import { TaskEditor, type TaskFormValue } from '../components/TaskEditor'
import { TaskList } from '../components/TaskList'
import { useAppStore } from '../store/AppStore'
import type { Task } from '../types'
import { addDays, formatShortDate, startOfWeekKey, toDateKey } from '../utils/date'

interface PlansPageProps {
  showToast: (text: string) => void
}

export function PlansPage({ showToast }: PlansPageProps) {
  const { data, addTask, updateTask, deleteTask, toggleTask } = useAppStore()
  const [mode, setMode] = useState<'day' | 'week'>('day')
  const [selectedDate, setSelectedDate] = useState(toDateKey())
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editorDate, setEditorDate] = useState(selectedDate)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)

  const weekStart = useMemo(() => startOfWeekKey(new Date(`${selectedDate}T12:00:00`)), [selectedDate])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])
  const dayTasks = data.tasks.filter((task) => task.date === selectedDate)

  const changePeriod = (direction: number) => {
    setSelectedDate((current) => addDays(current, direction * (mode === 'day' ? 1 : 7)))
  }

  const openAdd = (date = selectedDate) => {
    setEditingTask(null)
    setEditorDate(date)
    setEditorOpen(true)
  }

  const saveTask = (value: TaskFormValue) => {
    if (editingTask) {
      updateTask(editingTask.id, value)
      showToast('计划已更新')
    } else {
      addTask(value)
      showToast('计划已添加')
    }
  }

  const commonListProps = {
    onToggle: (id: string) => {
      toggleTask(id)
      showToast('计划状态已更新')
    },
    onEdit: (task: Task) => {
      setEditingTask(task)
      setEditorDate(task.date)
      setEditorOpen(true)
    },
    onDelete: setDeletingTask,
  }

  return (
    <div className="page plans-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">每日计划</p>
          <h1>为重要的事留出时间</h1>
          <p>按日执行，按周校准。</p>
        </div>
        <button className="button button-primary" type="button" onClick={() => openAdd()}>
          <Plus aria-hidden="true" /> 添加计划
        </button>
      </header>

      <div className="plan-toolbar">
        <div className="segmented" role="group" aria-label="计划视图">
          <button type="button" aria-pressed={mode === 'day'} onClick={() => setMode('day')}>日计划</button>
          <button type="button" aria-pressed={mode === 'week'} onClick={() => setMode('week')}>周计划</button>
        </div>
        <div className="date-navigator">
          <button className="icon-button" type="button" aria-label="上一周期" data-tooltip="上一周期" onClick={() => changePeriod(-1)}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <label className="date-field">
            <span className="sr-only">选择日期</span>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
          <button className="icon-button" type="button" aria-label="下一周期" data-tooltip="下一周期" onClick={() => changePeriod(1)}>
            <ChevronRight aria-hidden="true" />
          </button>
          <button className="button button-quiet" type="button" onClick={() => setSelectedDate(toDateKey())}>今天</button>
        </div>
      </div>

      {mode === 'day' ? (
        <section className="content-section">
          <div className="section-heading">
            <div>
              <h2>{formatShortDate(selectedDate)}</h2>
              <p>{dayTasks.length ? `${dayTasks.filter((task) => task.completed).length} / ${dayTasks.length} 项已完成` : '暂无安排'}</p>
            </div>
          </div>
          <TaskList
            tasks={[...dayTasks].sort((a, b) => (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99'))}
            emptyTitle="这一天还没有计划"
            emptyText="留出明确的时间，计划才更容易发生。"
            {...commonListProps}
          />
        </section>
      ) : (
        <section className="week-board" aria-label="本周计划">
          {weekDays.map((date) => {
            const tasks = data.tasks.filter((task) => task.date === date)
            const isToday = date === toDateKey()
            return (
              <div className={`week-day ${isToday ? 'is-today' : ''}`} key={date}>
                <div className="week-day-heading">
                  <div>
                    <strong>{formatShortDate(date)}</strong>
                    <span>{tasks.filter((task) => task.completed).length}/{tasks.length}</span>
                  </div>
                  <button className="icon-button small-icon" type="button" aria-label={`添加 ${formatShortDate(date)} 的计划`} data-tooltip="添加计划" onClick={() => openAdd(date)}>
                    <Plus aria-hidden="true" />
                  </button>
                </div>
                {tasks.length ? (
                  <TaskList tasks={tasks} {...commonListProps} />
                ) : (
                  <button className="week-empty" type="button" onClick={() => openAdd(date)}>添加安排</button>
                )}
              </div>
            )
          })}
        </section>
      )}

      <TaskEditor
        open={editorOpen}
        task={editingTask}
        initialDate={editorDate}
        onClose={() => setEditorOpen(false)}
        onSubmit={saveTask}
      />

      <ConfirmDialog
        open={Boolean(deletingTask)}
        title="删除计划"
        message={`确定删除“${deletingTask?.title ?? ''}”吗？`}
        confirmLabel="删除"
        danger
        onClose={() => setDeletingTask(null)}
        onConfirm={() => {
          if (deletingTask) deleteTask(deletingTask.id)
          showToast('计划已删除')
        }}
      />
    </div>
  )
}
