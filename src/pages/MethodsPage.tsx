import { ArrowRight, BookOpen, Check, Heart, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { learningMethods } from '../data/learningContent'
import { useAppStore } from '../store/AppStore'
import type { StudyMethod } from '../types'
import { toDateKey } from '../utils/date'

interface MethodsPageProps {
  showToast: (text: string) => void
}

const filters = ['全部', '理解与记忆', '专注与时间', '任务与目标'] as const

export function MethodsPage({ showToast }: MethodsPageProps) {
  const { data, toggleFavoriteMethod, addTask } = useAppStore()
  const [filter, setFilter] = useState<(typeof filters)[number]>('全部')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<StudyMethod | null>(null)
  const [practiceOpen, setPracticeOpen] = useState(false)
  const [practiceText, setPracticeText] = useState('')

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return learningMethods.filter((method) => {
      const inFilter = filter === '全部' || method.tags.includes(filter)
      const inQuery =
        !normalized ||
        `${method.name} ${method.shortDescription} ${method.description} ${method.tags.join(' ')}`
          .toLowerCase()
          .includes(normalized)
      return inFilter && inQuery
    })
  }, [filter, query])

  const favorite = selected ? data.favoriteMethodIds.includes(selected.id) : false

  const openPractice = (method: StudyMethod) => {
    setSelected(method)
    setPracticeText(method.practicePrompt)
    setPracticeOpen(true)
  }

  return (
    <div className="page methods-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">学习方法</p>
          <h1>找到适合当前问题的方法</h1>
          <p>少学套路，多做一次具体实践。</p>
        </div>
      </header>

      <div className="library-toolbar">
        <label className="search-field local-search">
          <Search aria-hidden="true" />
          <span className="sr-only">搜索学习方法</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索方法或用途" />
        </label>
        <div className="filter-row" role="group" aria-label="方法分类">
          {filters.map((item) => (
            <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      {visible.length ? (
        <div className="method-grid">
          {visible.map((method) => {
            const isFavorite = data.favoriteMethodIds.includes(method.id)
            return (
              <article className="method-card" key={method.id}>
                <div className={`method-mark mark-${method.color}`}><BookOpen aria-hidden="true" /></div>
                <button
                  className={`icon-button method-favorite ${isFavorite ? 'is-favorite' : ''}`}
                  type="button"
                  aria-label={isFavorite ? `取消收藏 ${method.name}` : `收藏 ${method.name}`}
                  aria-pressed={isFavorite}
                  data-tooltip={isFavorite ? '取消收藏' : '收藏'}
                  onClick={() => {
                    toggleFavoriteMethod(method.id)
                    showToast(isFavorite ? '已取消收藏' : '已收藏方法')
                  }}
                >
                  <Heart aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
                <div className="method-tags">
                  {method.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <h2>{method.name}</h2>
                <p>{method.shortDescription}</p>
                <div className="method-actions">
                  <button className="text-button" type="button" onClick={() => setSelected(method)}>
                    查看方法 <ArrowRight aria-hidden="true" />
                  </button>
                  <button className="button button-quiet" type="button" onClick={() => openPractice(method)}>
                    <Sparkles aria-hidden="true" /> 实践
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty-state large-empty">
          <Search aria-hidden="true" />
          <strong>没有找到匹配的方法</strong>
          <p>换一个关键词或分类试试。</p>
        </div>
      )}

      <Modal
        open={Boolean(selected) && !practiceOpen}
        title={selected?.name ?? ''}
        description={selected?.shortDescription}
        onClose={() => setSelected(null)}
        width="lg"
      >
        {selected && (
          <div className="method-detail">
            <section>
              <h3>方法简介</h3>
              <p>{selected.description}</p>
            </section>
            <section>
              <h3>使用步骤</h3>
              <ol className="steps-list">
                {selected.steps.map((step, index) => (
                  <li key={step}>
                    <span>{index + 1}</span>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>
            </section>
            <div className="practice-box">
              <strong>实践建议</strong>
              <p>{selected.practicePrompt}</p>
            </div>
            <div className="modal-actions between-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  toggleFavoriteMethod(selected.id)
                  showToast(favorite ? '已取消收藏' : '已收藏方法')
                }}
              >
                <Heart aria-hidden="true" fill={favorite ? 'currentColor' : 'none'} />
                {favorite ? '取消收藏' : '收藏方法'}
              </button>
              <button className="button button-primary" type="button" onClick={() => openPractice(selected)}>
                <Sparkles aria-hidden="true" /> 开始实践
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={practiceOpen}
        title={`实践 · ${selected?.name ?? ''}`}
        description="把方法变成今天的一次行动"
        onClose={() => setPracticeOpen(false)}
      >
        <div className="form-stack">
          <label className="field field-full">
            <span>实践内容</span>
            <textarea value={practiceText} onChange={(event) => setPracticeText(event.target.value)} rows={5} maxLength={240} />
          </label>
          <div className="practice-note">
            <Check aria-hidden="true" />
            <span>创建后会加入今天的任务，预计 25 分钟。</span>
          </div>
          <div className="modal-actions">
            <button className="button button-secondary" type="button" onClick={() => setPracticeOpen(false)}>取消</button>
            <button
              className="button button-primary"
              type="button"
              disabled={!practiceText.trim()}
              onClick={() => {
                addTask({
                  title: practiceText.trim(),
                  category: '学习',
                  date: toDateKey(),
                  durationMinutes: 25,
                  note: selected ? `使用${selected.name}` : undefined,
                })
                setPracticeOpen(false)
                setSelected(null)
                showToast('实践已加入今日任务')
              }}
            >
              加入今日任务
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
