import { BookOpen, Building2, ExternalLink, FileSearch, GraduationCap, LoaderCircle, Search, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  isAbortError,
  searchLearningResources,
  type LearningSearchResponse,
  type LearningSearchResult,
} from '../services/search'

interface SearchPageProps {
  navigate: (page: string) => void
}

type ResultFilter = 'all' | 'learning-method' | 'academic-work' | 'reliable-search'

const examples = ['主动回忆', '间隔重复 记忆', '睡眠与学习效率']

export function SearchPage({ navigate }: SearchPageProps) {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState<LearningSearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<ResultFilter>('all')
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const runSearch = async (nextQuery = query) => {
    const clean = nextQuery.trim()
    if (!clean) {
      controllerRef.current?.abort()
      controllerRef.current = null
      setResponse(null)
      setLoading(false)
      setError('请输入要查找的学习方法或资料。')
      return
    }
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    setError('')
    setFilter('all')
    setQuery(clean)
    try {
      const result = await searchLearningResources(clean, {
        signal: controller.signal,
        remoteLimit: 8,
        timeoutMs: 10_000,
      })
      if (controllerRef.current !== controller) return
      setResponse(result)
    } catch (searchError) {
      if (controllerRef.current !== controller) return
      if (!isAbortError(searchError)) setError('搜索失败，请稍后再试。')
    } finally {
      if (controllerRef.current === controller) {
        setLoading(false)
        controllerRef.current = null
      }
    }
  }

  const visible = (response?.results ?? []).filter((result) => filter === 'all' || result.kind === filter)

  return (
    <div className="page search-page">
      <header className="page-heading compact-heading">
        <div>
          <p className="eyebrow">资料搜索</p>
          <h1>从可靠来源找到学习依据</h1>
          <p>同时检索方法库与 Crossref 学术出版元数据。</p>
        </div>
      </header>

      <section className="search-hero" aria-label="搜索学习资料">
        <form
          className="main-search"
          onSubmit={(event) => {
            event.preventDefault()
            void runSearch()
          }}
        >
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="resource-search">搜索学习方法和学术资料</label>
          <input
            id="resource-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索学习方法、论文主题或关键词"
            maxLength={120}
          />
          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? <LoaderCircle className="spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
            {loading ? '搜索中' : '搜索'}
          </button>
        </form>
        <div className="search-examples">
          <span>试试：</span>
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => void runSearch(example)}>{example}</button>
          ))}
        </div>
        {error && <p className="form-error search-error" role="alert">{error}</p>}
      </section>

      {loading && !response ? (
        <div className="search-loading" role="status">
          <LoaderCircle className="spin" aria-hidden="true" />
          <strong>正在连接学术资料库</strong>
          <p>同时整理应用内学习方法。</p>
        </div>
      ) : response ? (
        <section className="search-results" aria-live="polite">
          <div className="results-heading">
            <div>
              <h2>“{response.query}”的结果</h2>
              <p>方法 {response.localCount} 条 · 学术资料 {response.academicCount} 条 · 可靠入口 {response.reliableLinkCount} 条</p>
            </div>
            <span className={`network-status status-${response.networkStatus}`}>
              {response.networkStatus === 'success' ? <ShieldCheck aria-hidden="true" /> : <FileSearch aria-hidden="true" />}
              {response.networkStatus === 'success' ? '已联网获取' : '已显示备用来源'}
            </span>
          </div>

          {response.message && <div className="search-notice">{response.message}</div>}

          <div className="filter-row result-filters" role="group" aria-label="筛选搜索结果">
            <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>全部</button>
            <button type="button" aria-pressed={filter === 'learning-method'} onClick={() => setFilter('learning-method')}>学习方法</button>
            <button type="button" aria-pressed={filter === 'academic-work'} onClick={() => setFilter('academic-work')}>学术资料</button>
            <button type="button" aria-pressed={filter === 'reliable-search'} onClick={() => setFilter('reliable-search')}>可靠入口</button>
          </div>

          <div className="result-list">
            {visible.map((result) => <ResultItem key={result.id} result={result} navigate={navigate} />)}
          </div>
          {!visible.length && (
            <div className="empty-state"><FileSearch aria-hidden="true" /><strong>该分类暂无结果</strong><p>可以切换到其他结果分类。</p></div>
          )}
        </section>
      ) : (
        <section className="source-explainer">
          <div><BookOpen aria-hidden="true" /><strong>方法知识库</strong><span>应用内整理的 10 种学习方法</span></div>
          <div><GraduationCap aria-hidden="true" /><strong>Crossref</strong><span>论文、图书与会议资料元数据</span></div>
          <div><Building2 aria-hidden="true" /><strong>官方索引</strong><span>ERIC、PubMed 等可靠检索入口</span></div>
        </section>
      )}
    </div>
  )
}

function ResultItem({ result, navigate }: { result: LearningSearchResult; navigate: (page: string) => void }) {
  const icon =
    result.kind === 'learning-method' ? <BookOpen aria-hidden="true" /> :
      result.kind === 'academic-work' ? <GraduationCap aria-hidden="true" /> :
        <Building2 aria-hidden="true" />
  const kindLabel =
    result.kind === 'learning-method' ? '学习方法' :
      result.kind === 'academic-work' ? '学术资料' : '官方检索入口'
  return (
    <article className="result-item">
      <div className={`result-icon result-${result.kind}`}>{icon}</div>
      <div className="result-content">
        <div className="result-labels">
          <span>{kindLabel}</span>
          {result.source.year && <span>{result.source.year}</span>}
          {result.workType && <span>{result.workType}</span>}
        </div>
        <h3>{result.title}</h3>
        <p>{result.description}</p>
        {result.authors.length > 0 && <p className="result-authors">{result.authors.slice(0, 4).join('、')}</p>}
        <div className="source-line">
          <ShieldCheck aria-hidden="true" />
          <span>来源：{result.source.name}</span>
          {result.source.doi && <code>DOI {result.source.doi}</code>}
        </div>
        <p className="reliability-note">{result.source.reliabilityNote}</p>
      </div>
      {result.kind === 'learning-method' ? (
        <button className="button button-quiet" type="button" onClick={() => navigate('methods')}>查看方法</button>
      ) : result.url ? (
        <a className="button button-quiet" href={result.url} target="_blank" rel="noreferrer">
          查看来源 <ExternalLink aria-hidden="true" />
        </a>
      ) : null}
    </article>
  )
}
