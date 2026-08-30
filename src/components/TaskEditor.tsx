import { useState } from 'react'
import type { Task, TaskCategory } from '../types'
import { toDateKey } from '../utils/date'
import { Modal } from './Modal'

export interface TaskFormValue {
  title: string
  category: TaskCategory
  date: string
  startTime?: string
  durationMinutes: number
  note?: string
}

interface TaskEditorProps {
  open: boolean
  task?: Task | null
  initialDate?: string
  onClose: () => void
  onSubmit: (value: TaskFormValue) => void
}

const categories: TaskCategory[] = ['学习', '作业', '阅读', '休息', '其他']

function toInitial(task?: Task | null, date?: string): TaskFormValue {
  return task
    ? {
        title: task.title,
        category: task.category,
        date: task.date,
        startTime: task.startTime,
        durationMinutes: task.durationMinutes,
        note: task.note,
      }
    : {
        title: '',
        category: '学习',
        date: date ?? toDateKey(),
        startTime: '',
        durationMinutes: 30,
        note: '',
      }
}

export function TaskEditor({ open, task, initialDate, onClose, onSubmit }: TaskEditorProps) {
  if (!open) return null

  return (
    <TaskEditorForm
      task={task}
      initialDate={initialDate}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  )
}

function TaskEditorForm({ task, initialDate, onClose, onSubmit }: Omit<TaskEditorProps, 'open'>) {
  const [form, setForm] = useState<TaskFormValue>(() => toInitial(task, initialDate))
  const [error, setError] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) {
      setError('请输入任务名称。')
      return
    }
    if (!form.date) {
      setError('请选择计划日期。')
      return
    }
    if (!Number.isFinite(form.durationMinutes) || form.durationMinutes < 5) {
      setError('预计时长至少为 5 分钟。')
      return
    }
    onSubmit({
      ...form,
      title,
      durationMinutes: Math.round(form.durationMinutes),
      startTime: form.startTime || undefined,
      note: form.note?.trim() || undefined,
    })
    onClose()
  }

  return (
    <Modal
      open
      title={task ? '编辑任务' : '添加任务'}
      description="安排清楚，执行更轻松"
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        <label className="field field-full">
          <span>任务名称</span>
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="例如：复习高等数学第三章"
            maxLength={80}
            autoFocus
          />
        </label>

        <div className="form-grid">
          <label className="field">
            <span>类型</span>
            <select
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value as TaskCategory })
              }
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>日期</span>
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
          </label>

          <label className="field">
            <span>开始时间（可选）</span>
            <input
              type="time"
              value={form.startTime ?? ''}
              onChange={(event) => setForm({ ...form, startTime: event.target.value })}
            />
          </label>

          <label className="field">
            <span>预计时长（分钟）</span>
            <input
              type="number"
              min="5"
              max="720"
              step="5"
              value={form.durationMinutes}
              onChange={(event) =>
                setForm({ ...form, durationMinutes: Number(event.target.value) })
              }
            />
          </label>
        </div>

        <label className="field field-full">
          <span>备注（可选）</span>
          <textarea
            value={form.note ?? ''}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
            placeholder="写下范围、资料或完成标准"
            rows={3}
            maxLength={240}
          />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="modal-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>
            取消
          </button>
          <button className="button button-primary" type="submit">
            {task ? '保存修改' : '添加任务'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
