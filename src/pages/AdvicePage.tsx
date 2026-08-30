import { Brain, Check, Clock3, Plus, Sparkles, WandSparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAppStore } from '../store/AppStore'
import { formatFocusDuration, toDateKey } from '../utils/date'
import { taskCompletionRate } from '../utils/stats'

interface AdvicePageProps {
  showToast: (text: string) => void
}

interface PlanBlock {
  type: 'focus' | 'break'
  title: string
  minutes: number
  note: string
}

interface GeneratedPlan {
  blocks: PlanBlock[]
  focusMinutes: number
  reason: string
  suggestions: string[]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function generatePlan(
  rawTasks: string,
  availableMinutes: number,
  energy: string,
  averageFocusMinutes: number,
  completionRate: number,
): GeneratedPlan {
  const tasks = rawTasks
    .split(/\n|、|；|;/)
    .map((item) => item.replace(/^[-*\d.、\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 8)
  const fallbackTasks = tasks.length ? tasks : ['梳理当前最重要的学习任务']
  let blockMinutes = clamp(Math.round(averageFocusMinutes / 5) * 5 || 25, 20, 50)
  if (energy === 'low') blockMinutes = Math.min(blockMinutes, 25)
  if (energy === 'high') blockMinutes = Math.max(blockMinutes, 35)
  if (completionRate > 0 && completionRate < 50) blockMinutes = Math.min(blockMinutes, 25)
  const breakMinutes = blockMinutes >= 40 ? 10 : 5
  const blocks: PlanBlock[] = []
  let remaining = availableMinutes
  let taskIndex = 0

  while (remaining >= 15) {
    const focusMinutes = Math.min(blockMinutes, remaining)
    if (focusMinutes < 15) break
    const title = fallbackTasks[taskIndex % fallbackTasks.length]
    blocks.push({
      type: 'focus',
      title,
      minutes: focusMinutes,
      note: taskIndex < fallbackTasks.length ? '先完成最小可交付成果' : '继续推进并检查薄弱点',
    })
    remaining -= focusMinutes
    taskIndex += 1
    if (remaining >= breakMinutes + 15) {
      blocks.push({ type: 'break', title: '离屏休息', minutes: breakMinutes, note: '起身、喝水，不刷短视频' })
      remaining -= breakMinutes
    }
  }

  if (remaining > 0 && blocks.length) {
    blocks[blocks.length - 1].note += `；预留 ${remaining} 分钟收尾缓冲`
  }

  const focusMinutes = blocks.filter((block) => block.type === 'focus').reduce((sum, block) => sum + block.minutes, 0)
  const reason = averageFocusMinutes > 0
    ? `根据你的历史记录，单次有效专注约 ${Math.round(averageFocusMinutes)} 分钟，因此本次采用 ${blockMinutes} 分钟左右的专注块。`
    : `暂时没有足够记录，先采用 ${blockMinutes} 分钟的稳妥专注块；后续会随记录自动调整。`
  const suggestions = [
    completionRate > 0 && completionRate < 60 ? '近期任务完成率偏低，今天减少切换，优先完成一项再开始下一项。' : '先做价值最高或最难启动的任务，把低强度整理留到最后。',
    energy === 'low' ? '当前精力较低，每轮只设一个完成标准，休息时尽量离开屏幕。' : '在前两轮处理理解和推理任务，后续安排复习与整理。',
    '每轮结束用 1 分钟记录成果和下一步，减少再次启动的成本。',
  ]
  return { blocks, focusMinutes, reason, suggestions }
}

export function AdvicePage({ showToast }: AdvicePageProps) {
  const { data, addTask } = useAppStore()
  const [tasks, setTasks] = useState('')
  const [hours, setHours] = useState(2)
  const [energy, setEnergy] = useState('medium')
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(false)

  const profile = useMemo(() => {
    const completedRecords = data.focusRecords.filter((record) => record.durationSeconds >= 60)
    const averageFocusMinutes = completedRecords.length
      ? completedRecords.reduce((sum, record) => sum + record.durationSeconds, 0) / completedRecords.length / 60
      : 0
    return { averageFocusMinutes, completionRate: taskCompletionRate(data.tasks) }
  }, [data.focusRecords, data.tasks])

  const generate = () => {
    if (!tasks.trim()) {
      setError('请先写下至少一项学习任务。')
      return
    }
    if (!Number.isFinite(hours) || hours < 0.5 || hours > 12) {
      setError('剩余时间请填写 0.5 到 12 小时。')
      return
    }
    setError('')
    setAdded(false)
    setPlan(generatePlan(tasks, Math.round(hours * 60), energy, profile.averageFocusMinutes, profile.completionRate))
    window.setTimeout(() => document.getElementById('generated-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  const addPlan = () => {
    if (!plan || added) return
    const start = new Date()
    let offset = 0
    plan.blocks.forEach((block) => {
      if (block.type !== 'focus') {
        offset += block.minutes
        return
      }
      const blockStart = new Date(start.getTime() + offset * 60_000)
      addTask({
        title: block.title,
        category: '学习',
        date: toDateKey(blockStart),
        startTime: `${String(blockStart.getHours()).padStart(2, '0')}:${String(blockStart.getMinutes()).padStart(2, '0')}`,
        durationMinutes: block.minutes,
        note: block.note,
      })
      offset += block.minutes
    })
    setAdded(true)
    showToast('学习计划已加入今日任务')
  }

  return (
    <div className="page advice-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">AI 学习建议</p>
          <h1>把任务与剩余时间变成可执行计划</h1>
          <p>结合你的专注记录和任务完成率动态排程。</p>
        </div>
        <span className="local-ai-badge"><Brain aria-hidden="true" /> 本地智能规划 · 内容不上传</span>
      </header>

      <div className="advice-layout">
        <section className="advice-form-panel">
          <div className="panel-icon"><WandSparkles aria-hidden="true" /></div>
          <h2>告诉我今天要完成什么</h2>
          <p>一行写一项任务，按重要程度排序。</p>
          <div className="form-stack">
            <label className="field field-full">
              <span>学习任务</span>
              <textarea
                value={tasks}
                onChange={(event) => setTasks(event.target.value)}
                rows={7}
                maxLength={600}
                placeholder={'复习线性代数第三章\n完成英语阅读作业\n整理本周错题'}
              />
            </label>
            <div className="form-grid">
              <label className="field">
                <span>剩余时间（小时）</span>
                <input type="number" min="0.5" max="12" step="0.5" value={hours} onChange={(event) => setHours(Number(event.target.value))} />
              </label>
              <label className="field">
                <span>当前精力</span>
                <select value={energy} onChange={(event) => setEnergy(event.target.value)}>
                  <option value="high">很好，适合攻克难题</option>
                  <option value="medium">一般，正常推进</option>
                  <option value="low">偏低，需要轻量节奏</option>
                </select>
              </label>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary button-block" type="button" onClick={generate}>
              <Sparkles aria-hidden="true" /> 生成学习计划
            </button>
          </div>
          <div className="profile-note">
            <Clock3 aria-hidden="true" />
            <span>{profile.averageFocusMinutes ? `你的平均专注 ${formatFocusDuration(profile.averageFocusMinutes * 60)}` : '完成首轮专注后，计划会更贴合你的节奏'}</span>
          </div>
        </section>

        <section className={`generated-plan ${plan ? 'has-plan' : ''}`} id="generated-plan">
          {plan ? (
            <>
              <div className="generated-heading">
                <div>
                  <span>为你生成</span>
                  <h2>{hours} 小时学习安排</h2>
                  <p>有效专注 {plan.focusMinutes} 分钟 · {plan.blocks.filter((block) => block.type === 'focus').length} 个专注块</p>
                </div>
                <button className="button button-primary" type="button" disabled={added} onClick={addPlan}>
                  {added ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
                  {added ? '已加入计划' : '加入今日计划'}
                </button>
              </div>
              <div className="reason-box"><Brain aria-hidden="true" /><p>{plan.reason}</p></div>
              <ol className="plan-timeline">
                {plan.blocks.map((block, index) => (
                  <li className={block.type === 'break' ? 'is-break' : ''} key={`${block.title}-${index}`}>
                    <span className="timeline-index">{block.type === 'focus' ? plan.blocks.slice(0, index + 1).filter((item) => item.type === 'focus').length : '休'}</span>
                    <div>
                      <strong>{block.title}</strong>
                      <p>{block.note}</p>
                    </div>
                    <b>{block.minutes} 分钟</b>
                  </li>
                ))}
              </ol>
              <div className="suggestion-list">
                <h3>执行建议</h3>
                {plan.suggestions.map((suggestion) => <p key={suggestion}><Check aria-hidden="true" />{suggestion}</p>)}
              </div>
            </>
          ) : (
            <div className="empty-plan">
              <Brain aria-hidden="true" />
              <h2>计划会显示在这里</h2>
              <p>它会根据你的任务、可用时间、历史专注长度和完成率调整每轮安排。</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
