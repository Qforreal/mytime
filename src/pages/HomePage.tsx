import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Heart, Lightbulb, Plus, Timer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { learningTips } from '../data/learningContent'
import { useAppStore } from '../store/AppStore'
import type { Task } from '../types'
import { formatFocusDuration, formatFullDate, toDateKey } from '../utils/date'
import { todaySummary } from '../utils/stats'
import { ConfirmDialog, Modal } from '../components/Modal'
import { TaskEditor, type TaskFormValue } from '../components/TaskEditor'
import { TaskList } from '../components/TaskList'

interface HomePageProps {
  navigate: (page: string) => void
  showToast: (text: string) => void
}

function dailyTipIndex() {
  const today = new Date()
  const start = new Date(today.getFullYear(), 0, 0)
  const day = Math.floor((today.getTime() - start.getTime()) / 86_400_000)
  return day % learningTips.length
}

export function HomePage({ navigate, showToast }: HomePageProps) {
  const {
    data,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    toggleFavoriteTip,
  } = useAppStore()
  const summary = useMemo(() => todaySummary(data), [data])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [tipOpen, setTipOpen] = useState(false)
  const tip = learningTips[dailyTipIndex()]
  const tipFavorite = data.favoriteTipIds.includes(tip.id)

  const openAdd = () => {
    setEditingTask(null)
    setEditorOpen(true)
  }

  const saveTask = (value: TaskFormValue) => {
    if (editingTask) {
      updateTask(editingTask.id, value)
      showToast('任务已更新')
    } else {
      addTask(value)
      showToast('任务已添加')
    }
  }

  return (
    <div className="page home-page">
      <header className="page-heading home-heading">
        <div>
          <p className="eyebrow">{formatFullDate()}</p>
          <h1>今天，专注做好一件事</h1>
          <p>把计划变成可以开始的小行动。</p>
        </div>
        <button className="button button-primary" type="button" onClick={openAdd}>
          <Plus aria-hidden="true" />
          添加任务
        </button>
      </header>

      <section className="metrics-grid" aria-label="今日概览">
        <div className="metric-card">
          <div className="metric-icon metric-green"><CheckCircle2 aria-hidden="true" /></div>
          <div>
            <span>今日任务</span>
            <strong>{summary.completed}<small> / {summary.tasks.length}</small></strong>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon metric-blue"><CalendarDays aria-hidden="true" /></div>
          <div>
            <span>完成进度</span>
            <strong>{summary.completionRate}<small>%</small></strong>
          </div>
          <div className="metric-progress" aria-label={`完成进度 ${summary.completionRate}%`}>
            <span style={{ width: `${summary.completionRate}%` }} />
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon metric-amber"><Clock3 aria-hidden="true" /></div>
          <div>
            <span>今日专注</span>
            <strong className="duration-value">{formatFocusDuration(summary.focusSeconds)}</strong>
          </div>
        </div>
      </section>

      <div className="home-layout">
        <section className="content-section task-section">
          <div className="section-heading">
            <div>
              <h2>今日任务</h2>
              <p>{summary.tasks.length ? `还有 ${summary.tasks.length - summary.completed} 项待完成` : '从一个小目标开始'}</p>
            </div>
            <button className="text-button" type="button" onClick={() => navigate('plans')}>
              查看计划 <ArrowRight aria-hidden="true" />
            </button>
          </div>
          <TaskList
            tasks={[...summary.tasks].sort((a, b) => Number(a.completed) - Number(b.completed) || (a.startTime ?? '').localeCompare(b.startTime ?? ''))}
            onToggle={(id) => {
              toggleTask(id)
              showToast('任务状态已更新')
            }}
            onEdit={(task) => {
              setEditingTask(task)
              setEditorOpen(true)
            }}
            onDelete={setDeletingTask}
          />
        </section>

        <aside className="home-side">
          <section className="tip-card">
            <div className="tip-topline">
              <span><Lightbulb aria-hidden="true" /> 今日技巧</span>
              <button
                className={`icon-button ${tipFavorite ? 'is-favorite' : ''}`}
                type="button"
                aria-label={tipFavorite ? '取消收藏今日技巧' : '收藏今日技巧'}
                aria-pressed={tipFavorite}
                data-tooltip={tipFavorite ? '取消收藏' : '收藏'}
                onClick={() => {
                  toggleFavoriteTip(tip.id)
                  showToast(tipFavorite ? '已取消收藏' : '已收藏技巧')
                }}
              >
                <Heart aria-hidden="true" fill={tipFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>
            <h2>{tip.title}</h2>
            <p>{tip.summary}</p>
            <button className="text-button" type="button" onClick={() => setTipOpen(true)}>
              查看详情 <ArrowRight aria-hidden="true" />
            </button>
          </section>

          <section className="focus-cta">
            <div className="focus-cta-icon"><Timer aria-hidden="true" /></div>
            <div>
              <span>准备好了吗？</span>
              <h2>开始一轮专注</h2>
            </div>
            <button className="button button-dark" type="button" onClick={() => navigate('pomodoro')}>
              开始 {data.settings.focusMinutes} 分钟
              <ArrowRight aria-hidden="true" />
            </button>
          </section>
        </aside>
      </div>

      <TaskEditor
        open={editorOpen}
        task={editingTask}
        initialDate={toDateKey()}
        onClose={() => setEditorOpen(false)}
        onSubmit={saveTask}
      />

      <ConfirmDialog
        open={Boolean(deletingTask)}
        title="删除任务"
        message={`确定删除“${deletingTask?.title ?? ''}”吗？删除后无法恢复。`}
        confirmLabel="删除"
        danger
        onClose={() => setDeletingTask(null)}
        onConfirm={() => {
          if (deletingTask) deleteTask(deletingTask.id)
          showToast('任务已删除')
        }}
      />

      <Modal open={tipOpen} title={tip.title} description={tip.category} onClose={() => setTipOpen(false)}>
        <div className="article-content">
          <p>{tip.detail}</p>
          <div className="practice-box">
            <strong>今天就试试</strong>
            <p>{tip.action}</p>
          </div>
          <div className="modal-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                toggleFavoriteTip(tip.id)
                showToast(tipFavorite ? '已取消收藏' : '已收藏技巧')
              }}
            >
              <Heart aria-hidden="true" fill={tipFavorite ? 'currentColor' : 'none'} />
              {tipFavorite ? '取消收藏' : '收藏技巧'}
            </button>
            <button className="button button-primary" type="button" onClick={() => setTipOpen(false)}>
              知道了
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
