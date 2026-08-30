import { CalendarCheck, Heart, Lightbulb } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { learningTips } from '../data/learningContent'
import { useAppStore } from '../store/AppStore'
import type { StudyTip } from '../types'

interface TipsPageProps {
  showToast: (text: string) => void
}

function dailyIndex() {
  const now = new Date()
  const day = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 86_400_000)
  return day % learningTips.length
}

export function TipsPage({ showToast }: TipsPageProps) {
  const { data, toggleFavoriteTip } = useAppStore()
  const [selected, setSelected] = useState<StudyTip | null>(null)
  const [category, setCategory] = useState('全部')
  const todayTip = learningTips[dailyIndex()]
  const categories = useMemo(() => ['全部', ...new Set(learningTips.map((tip) => tip.category))], [])
  const visible = category === '全部' ? learningTips : learningTips.filter((tip) => tip.category === category)

  const toggle = (tip: StudyTip) => {
    const isFavorite = data.favoriteTipIds.includes(tip.id)
    toggleFavoriteTip(tip.id)
    showToast(isFavorite ? '已取消收藏' : '已收藏技巧')
  }

  return (
    <div className="page tips-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">学习 Tips</p>
          <h1>每天优化一点学习方式</h1>
          <p>只推荐一个值得今天实践的小技巧。</p>
        </div>
      </header>

      <section className="daily-tip-feature">
        <div className="daily-tip-mark"><CalendarCheck aria-hidden="true" /></div>
        <div className="daily-tip-content">
          <span>今日推荐 · {todayTip.category}</span>
          <h2>{todayTip.title}</h2>
          <p>{todayTip.detail}</p>
          <div className="daily-action"><Lightbulb aria-hidden="true" /><strong>{todayTip.action}</strong></div>
        </div>
        <button
          className={`button button-secondary ${data.favoriteTipIds.includes(todayTip.id) ? 'is-favorite' : ''}`}
          type="button"
          onClick={() => toggle(todayTip)}
        >
          <Heart aria-hidden="true" fill={data.favoriteTipIds.includes(todayTip.id) ? 'currentColor' : 'none'} />
          {data.favoriteTipIds.includes(todayTip.id) ? '已收藏' : '收藏'}
        </button>
      </section>

      <div className="filter-row tips-filter" role="group" aria-label="技巧分类">
        {categories.map((item) => (
          <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
        ))}
      </div>

      <div className="tips-list">
        {visible.map((tip) => {
          const favorite = data.favoriteTipIds.includes(tip.id)
          return (
            <article className="tip-list-item" key={tip.id}>
              <div className="tip-number"><Lightbulb aria-hidden="true" /></div>
              <button className="tip-open" type="button" onClick={() => setSelected(tip)}>
                <span>{tip.category}</span>
                <h2>{tip.title}</h2>
                <p>{tip.summary}</p>
              </button>
              <button
                className={`icon-button ${favorite ? 'is-favorite' : ''}`}
                type="button"
                aria-label={favorite ? `取消收藏 ${tip.title}` : `收藏 ${tip.title}`}
                aria-pressed={favorite}
                data-tooltip={favorite ? '取消收藏' : '收藏'}
                onClick={() => toggle(tip)}
              >
                <Heart aria-hidden="true" fill={favorite ? 'currentColor' : 'none'} />
              </button>
            </article>
          )
        })}
      </div>

      <Modal open={Boolean(selected)} title={selected?.title ?? ''} description={selected?.category} onClose={() => setSelected(null)}>
        {selected && (
          <div className="article-content">
            <p>{selected.detail}</p>
            <div className="practice-box">
              <strong>立即实践</strong>
              <p>{selected.action}</p>
            </div>
            <div className="modal-actions">
              <button className="button button-secondary" type="button" onClick={() => toggle(selected)}>
                <Heart aria-hidden="true" fill={data.favoriteTipIds.includes(selected.id) ? 'currentColor' : 'none'} />
                {data.favoriteTipIds.includes(selected.id) ? '取消收藏' : '收藏技巧'}
              </button>
              <button className="button button-primary" type="button" onClick={() => setSelected(null)}>知道了</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
