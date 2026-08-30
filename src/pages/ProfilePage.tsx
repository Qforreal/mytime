import { BookHeart, CheckCircle2, Clock3, Database, Download, FileUp, Heart, Moon, Settings, Sun, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from '../components/Modal'
import { learningMethods, learningTips } from '../data/learningContent'
import { useAppStore } from '../store/AppStore'
import { formatClock, formatFocusDuration, toDateKey } from '../utils/date'
import { focusSecondsThisWeek, taskCompletionRate } from '../utils/stats'

interface ProfilePageProps {
  navigate: (page: string) => void
  showToast: (text: string, type?: 'success' | 'info') => void
}

export function ProfilePage({ navigate, showToast }: ProfilePageProps) {
  const {
    data,
    updateSettings,
    exportData,
    importData,
    clearData,
    clearFocusRecords,
  } = useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [confirm, setConfirm] = useState<'all' | 'focus' | null>(null)
  const favorites = useMemo(
    () => ({
      methods: learningMethods.filter((item) => data.favoriteMethodIds.includes(item.id)),
      tips: learningTips.filter((item) => data.favoriteTipIds.includes(item.id)),
    }),
    [data.favoriteMethodIds, data.favoriteTipIds],
  )
  const sortedRecords = [...data.focusRecords].sort((a, b) => b.endedAt.localeCompare(a.endedAt))
  const completedTasks = data.tasks.filter((task) => task.completed).length

  const toggleNotifications = async () => {
    if (data.settings.notifications) {
      updateSettings({ notifications: false })
      showToast('专注完成提醒已关闭', 'info')
      return
    }
    if (!('Notification' in window)) {
      showToast('当前浏览器不支持系统通知', 'info')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      updateSettings({ notifications: true })
      showToast('专注完成提醒已开启')
    } else {
      showToast('未获得通知权限，可在浏览器设置中重新开启', 'info')
    }
  }

  const downloadData = () => {
    const blob = new Blob([exportData()], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `知时数据-${toDateKey()}.json`
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    showToast('数据已导出')
  }

  const handleImport = async (file?: File) => {
    if (!file) return
    const result = importData(await file.text())
    if (result.ok) showToast('数据已导入')
    else showToast(result.error, 'info')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="page profile-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">我的</p>
          <h1>你的学习空间</h1>
          <p>记录、收藏和偏好都保存在本机。</p>
        </div>
        <div className="theme-quick">
          <Sun aria-hidden="true" />
          <label className="switch" aria-label="深色模式">
            <input type="checkbox" checked={data.settings.darkMode} onChange={(event) => updateSettings({ darkMode: event.target.checked })} />
            <span />
          </label>
          <Moon aria-hidden="true" />
        </div>
      </header>

      <section className="profile-stats" aria-label="累计学习统计">
        <div><Clock3 aria-hidden="true" /><span>本周专注</span><strong>{formatFocusDuration(focusSecondsThisWeek(data.focusRecords))}</strong></div>
        <div><CheckCircle2 aria-hidden="true" /><span>累计完成</span><strong>{completedTasks} 项</strong></div>
        <div><BookHeart aria-hidden="true" /><span>收藏内容</span><strong>{favorites.methods.length + favorites.tips.length} 条</strong></div>
        <div><Database aria-hidden="true" /><span>任务完成率</span><strong>{taskCompletionRate(data.tasks)}%</strong></div>
      </section>

      <div className="profile-layout">
        <div className="profile-main">
          <section className="content-section favorites-section">
            <div className="section-heading"><div><h2>我的收藏</h2><p>学习方法与每日技巧</p></div></div>
            {favorites.methods.length || favorites.tips.length ? (
              <div className="favorite-list">
                {favorites.methods.map((method) => (
                  <button key={method.id} type="button" onClick={() => navigate('methods')}>
                    <Heart aria-hidden="true" fill="currentColor" /><div><strong>{method.name}</strong><span>学习方法 · {method.shortDescription}</span></div>
                  </button>
                ))}
                {favorites.tips.map((tip) => (
                  <button key={tip.id} type="button" onClick={() => navigate('tips')}>
                    <Heart aria-hidden="true" fill="currentColor" /><div><strong>{tip.title}</strong><span>学习技巧 · {tip.summary}</span></div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state compact-empty"><Heart aria-hidden="true" /><strong>还没有收藏</strong><p>在方法库或学习 Tips 中收藏内容。</p></div>
            )}
          </section>

          <section className="content-section records-all-section">
            <div className="section-heading">
              <div><h2>专注记录</h2><p>共 {sortedRecords.length} 次</p></div>
              {sortedRecords.length > 0 && <button className="text-button danger-text" type="button" onClick={() => setConfirm('focus')}>清空记录</button>}
            </div>
            {sortedRecords.length ? (
              <ul className="record-list all-records">
                {sortedRecords.slice(0, 20).map((record) => {
                  const task = data.tasks.find((item) => item.id === record.taskId)
                  return (
                    <li key={record.id}><div className="record-icon"><Clock3 aria-hidden="true" /></div><div><strong>{task?.title ?? '自由专注'}</strong><span>{new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(record.endedAt))} · {formatClock(record.startedAt)} - {formatClock(record.endedAt)}</span></div><b>{formatFocusDuration(record.durationSeconds)}</b></li>
                  )
                })}
              </ul>
            ) : (
              <div className="empty-state compact-empty"><Clock3 aria-hidden="true" /><strong>还没有专注记录</strong><p>完成番茄钟后会显示在这里。</p></div>
            )}
          </section>
        </div>

        <aside className="settings-panel">
          <section className="settings-section">
            <div className="settings-heading"><Settings aria-hidden="true" /><div><h2>设置</h2><p>调整你的专注节奏</p></div></div>
            <div className="setting-row">
              <div><strong>深色模式</strong><span>减少暗处使用时的亮度</span></div>
              <label className="switch"><input aria-label="深色模式" type="checkbox" checked={data.settings.darkMode} onChange={(event) => updateSettings({ darkMode: event.target.checked })} /><span /></label>
            </div>
            <div className="setting-row">
              <div><strong>完成提醒</strong><span>计时结束时发送系统通知</span></div>
              <label className="switch"><input aria-label="完成提醒" type="checkbox" checked={data.settings.notifications} onChange={() => void toggleNotifications()} /><span /></label>
            </div>
            <div className="setting-inputs">
              <label className="field"><span>专注时长</span><div className="number-with-unit"><input type="number" min="5" max="90" step="5" value={data.settings.focusMinutes} onChange={(event) => updateSettings({ focusMinutes: Math.min(90, Math.max(5, Number(event.target.value) || 25)) })} /><em>分钟</em></div></label>
              <label className="field"><span>休息时长</span><div className="number-with-unit"><input type="number" min="1" max="30" value={data.settings.breakMinutes} onChange={(event) => updateSettings({ breakMinutes: Math.min(30, Math.max(1, Number(event.target.value) || 5)) })} /><em>分钟</em></div></label>
            </div>
          </section>

          <section className="settings-section data-section">
            <div className="settings-heading"><Database aria-hidden="true" /><div><h2>数据管理</h2><p>导出备份或迁移数据</p></div></div>
            <button className="button button-secondary button-block" type="button" onClick={downloadData}><Download aria-hidden="true" /> 导出数据</button>
            <button className="button button-secondary button-block" type="button" onClick={() => inputRef.current?.click()}><FileUp aria-hidden="true" /> 导入数据</button>
            <input ref={inputRef} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void handleImport(event.target.files?.[0])} />
            <button className="button button-danger-quiet button-block" type="button" onClick={() => setConfirm('all')}><Trash2 aria-hidden="true" /> 清除学习数据</button>
            <p className="data-note">数据仅保存在当前浏览器。清除浏览器站点数据也会删除记录。</p>
          </section>
        </aside>
      </div>

      <ConfirmDialog open={confirm === 'focus'} title="清空专注记录" message="所有专注时长与番茄记录都会被删除，确定继续吗？" confirmLabel="清空记录" danger onClose={() => setConfirm(null)} onConfirm={() => { clearFocusRecords(); showToast('专注记录已清空') }} />
      <ConfirmDialog open={confirm === 'all'} title="清除学习数据" message="任务、专注记录和收藏都会被清除，设置会保留。此操作无法恢复。" confirmLabel="确认清除" danger onClose={() => setConfirm(null)} onConfirm={() => { clearData(); showToast('学习数据已清除') }} />
    </div>
  )
}
