import { BookOpen, Check, Clock3, Pencil, Trash2 } from 'lucide-react'
import type { Task } from '../types'

interface TaskListProps {
  tasks: Task[]
  emptyTitle?: string
  emptyText?: string
  onToggle: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

export function TaskList({
  tasks,
  emptyTitle = '今天还没有任务',
  emptyText = '添加一个清晰的小目标，开始今天的学习。',
  onToggle,
  onEdit,
  onDelete,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <BookOpen aria-hidden="true" />
        <strong>{emptyTitle}</strong>
        <p>{emptyText}</p>
      </div>
    )
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <li key={task.id} className={`task-row ${task.completed ? 'is-completed' : ''}`}>
          <button
            className="task-check"
            type="button"
            aria-label={task.completed ? `取消完成：${task.title}` : `完成任务：${task.title}`}
            aria-pressed={task.completed}
            onClick={() => onToggle(task.id)}
          >
            {task.completed && <Check aria-hidden="true" />}
          </button>
          <div className="task-main">
            <div className="task-title-line">
              <span className="task-title">{task.title}</span>
              <span className={`category-tag category-${task.category}`}>{task.category}</span>
            </div>
            <div className="task-meta">
              <Clock3 aria-hidden="true" />
              <span>{task.startTime ? `${task.startTime} · ` : ''}{task.durationMinutes} 分钟</span>
              {task.note && <span className="task-note">{task.note}</span>}
            </div>
          </div>
          <div className="row-actions">
            <button className="icon-button" type="button" aria-label={`编辑：${task.title}`} data-tooltip="编辑" onClick={() => onEdit(task)}>
              <Pencil aria-hidden="true" />
            </button>
            <button className="icon-button danger-icon" type="button" aria-label={`删除：${task.title}`} data-tooltip="删除" onClick={() => onDelete(task)}>
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
