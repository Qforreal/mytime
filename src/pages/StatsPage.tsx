import { CheckCircle2, Clock3, Flame, ListChecks, Target, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../store/AppStore'
import { formatFocusDuration, toDateKey } from '../utils/date'
import { focusSecondsForDate, focusSummaryThisWeek, lastSevenDays, weekTaskSummary } from '../utils/stats'

export function StatsPage() {
  const { data } = useAppStore()
  const [todayKey, setTodayKey] = useState(() => toDateKey())
  useEffect(() => {
    const refreshDate = () => setTodayKey(toDateKey())
    const timer = window.setInterval(refreshDate, 60_000)
    refreshDate()
    return () => window.clearInterval(timer)
  }, [])
  const todayDate = useMemo(() => new Date(`${todayKey}T12:00:00`), [todayKey])
  const trend = useMemo(() => lastSevenDays(data, todayKey), [data, todayKey])
  const weekTasks = useMemo(() => weekTaskSummary(data.tasks, todayDate), [data.tasks, todayDate])
  const todaySeconds = useMemo(() => focusSecondsForDate(data.focusRecords, todayKey), [data.focusRecords, todayKey])
  const weekFocus = useMemo(() => focusSummaryThisWeek(data.focusRecords, todayDate), [data.focusRecords, todayDate])
  const totalTrendMinutes = trend.reduce((sum, day) => sum + day.focusMinutes, 0)

  return (
    <div className="page stats-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">数据统计</p>
          <h1>用真实记录校准学习节奏</h1>
          <p>关注趋势，不追求无意义的数字增长。</p>
        </div>
      </header>

      <section className="metrics-grid stats-metrics" aria-label="学习统计概览">
        <Metric icon={<Clock3 />} color="green" label="今日专注" value={formatFocusDuration(todaySeconds)} />
        <Metric icon={<TrendingUp />} color="blue" label="本周专注" value={formatFocusDuration(weekFocus.focusSeconds)} />
        <Metric icon={<CheckCircle2 />} color="amber" label="本周完成" value={`${weekTasks.completed} 项`} />
        <Metric icon={<Target />} color="rose" label="任务完成率" value={`${weekTasks.rate}%`} />
        <Metric icon={<Flame />} color="green" label="本周番茄" value={`${weekFocus.pomodoros} 个`} />
      </section>

      <div className="stats-layout">
        <section className="content-section trend-section">
          <div className="section-heading">
            <div>
              <h2>近 7 天学习趋势</h2>
              <p>按每次专注结束日期统计</p>
            </div>
            <div className="chart-summary">
              <strong>{totalTrendMinutes}</strong><span>分钟</span>
            </div>
          </div>
          <FocusTrendChart data={trend} />
        </section>

        <aside className="stats-side">
          <section className="weekly-insight">
            <div className="panel-icon"><ListChecks aria-hidden="true" /></div>
            <span>本周概览</span>
            <h2>{weekFocus.activeDays ? `已学习 ${weekFocus.activeDays} 天` : '从今天开始记录'}</h2>
            <p>
              {weekTasks.total
                ? `计划 ${weekTasks.total} 项，已完成 ${weekTasks.completed} 项。`
                : '本周还没有计划，先安排一个可执行的小目标。'}
            </p>
            <div className="insight-progress">
              <div><span>任务完成</span><b>{weekTasks.rate}%</b></div>
              <div
                className="metric-progress"
                role="progressbar"
                aria-label={`本周任务完成率 ${weekTasks.rate}%`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={weekTasks.rate}
              >
                <span style={{ width: `${weekTasks.rate}%` }} />
              </div>
            </div>
          </section>

          <section className="content-section daily-table-section">
            <div className="section-heading"><div><h2>每日明细</h2><p>最近 7 天</p></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>日期</th><th>专注</th><th>完成</th></tr></thead>
                <tbody>
                  {trend.map((day) => (
                    <tr key={day.date}><td>{day.label}</td><td>{day.focusMinutes} 分钟</td><td>{day.completedTasks} 项</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Metric({ icon, color, label, value }: { icon: React.ReactNode; color: string; label: string; value: string }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon metric-${color}`} aria-hidden="true">{icon}</div>
      <div><span>{label}</span><strong className="duration-value">{value}</strong></div>
    </div>
  )
}

function FocusTrendChart({ data }: { data: ReturnType<typeof lastSevenDays> }) {
  const maxValue = Math.max(30, ...data.map((day) => day.focusMinutes))
  const chartTop = 24
  const chartBottom = 210
  const usableHeight = chartBottom - chartTop
  return (
    <div className="chart-wrap">
      <svg className="trend-chart" viewBox="0 0 720 270" role="img" aria-labelledby="trend-title trend-desc">
        <title id="trend-title">近 7 天专注时间趋势</title>
        <desc id="trend-desc">{data.map((day) => `${day.label} ${day.focusMinutes} 分钟`).join('，')}</desc>
        <defs>
          <linearGradient id="chart-gradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--blue)" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => {
          const y = chartBottom - usableHeight * ratio
          return (
            <g key={ratio}>
              <line x1="58" y1={y} x2="700" y2={y} className="chart-gridline" />
              <text x="48" y={y + 4} textAnchor="end" className="chart-axis-label">{Math.round(maxValue * ratio)}</text>
            </g>
          )
        })}
        <text x="16" y="22" className="chart-unit">分钟</text>
        {data.map((day, index) => {
          const x = 76 + index * 89
          const height = day.focusMinutes ? Math.max(4, (day.focusMinutes / maxValue) * usableHeight) : 0
          const y = chartBottom - height
          return (
            <g key={day.date} className="chart-bar-group">
              <rect x={x} y={chartTop} width="44" height={usableHeight} rx="5" className="chart-track" />
              <rect x={x} y={y} width="44" height={height} rx="5" className="chart-bar">
                <title>{day.label}：{day.focusMinutes} 分钟</title>
              </rect>
              <text x={x + 22} y={Math.max(18, y - 8)} textAnchor="middle" className="chart-value">{day.focusMinutes}</text>
              <text x={x + 22} y="240" textAnchor="middle" className="chart-day">{day.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
