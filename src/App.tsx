import {
  BarChart3,
  Brain,
  CalendarDays,
  Clock3,
  Home,
  Library,
  Lightbulb,
  Menu,
  Search,
  UserRound,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Toast, type ToastMessage } from './components/Toast'
import { Modal } from './components/Modal'
import { usePomodoro } from './hooks/usePomodoro'
import { AdvicePage } from './pages/AdvicePage'
import { HomePage } from './pages/HomePage'
import { MethodsPage } from './pages/MethodsPage'
import { PlansPage } from './pages/PlansPage'
import { PomodoroPage } from './pages/PomodoroPage'
import { ProfilePage } from './pages/ProfilePage'
import { SearchPage } from './pages/SearchPage'
import { StatsPage } from './pages/StatsPage'
import { TipsPage } from './pages/TipsPage'

type PageId = 'home' | 'plans' | 'pomodoro' | 'methods' | 'tips' | 'search' | 'advice' | 'stats' | 'profile'

const pages: { id: PageId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'plans', label: '每日计划', icon: CalendarDays },
  { id: 'pomodoro', label: '番茄钟', icon: Clock3 },
  { id: 'methods', label: '学习方法', icon: Library },
  { id: 'tips', label: '学习 Tips', icon: Lightbulb },
  { id: 'search', label: '资料搜索', icon: Search },
  { id: 'advice', label: 'AI 建议', icon: Brain },
  { id: 'stats', label: '数据统计', icon: BarChart3 },
  { id: 'profile', label: '我的', icon: UserRound },
]

const mobilePrimaryIds: PageId[] = ['home', 'plans', 'pomodoro', 'methods']

function pageFromHash(): PageId {
  const value = window.location.hash.replace('#/', '') as PageId
  return pages.some((page) => page.id === value) ? value : 'home'
}

export function App() {
  const pomodoro = usePomodoro()
  const { snapshot: pomodoroSnapshot, reset: resetPomodoro } = pomodoro
  const [currentPage, setCurrentPage] = useState<PageId>(pageFromHash)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)

  const showToast = useCallback((text: string, type: 'success' | 'info' = 'success') => {
    setToast({ id: Date.now(), text, type })
  }, [])
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (!pomodoro.completionNotice) return
    const timer = window.setTimeout(() => showToast(pomodoro.completionNotice?.message ?? ''), 0)
    return () => window.clearTimeout(timer)
  }, [pomodoro.completionNotice, showToast])

  useEffect(() => {
    const handleHash = () => setCurrentPage(pageFromHash())
    window.addEventListener('hashchange', handleHash)
    if (!window.location.hash) window.history.replaceState(null, '', '#/home')
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  useEffect(() => {
    document.title = `${pages.find((page) => page.id === currentPage)?.label ?? '首页'} · 知时`
    document.querySelector('main')?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [currentPage])

  const navigate = useCallback((page: string) => {
    const next = pages.some((item) => item.id === page) ? (page as PageId) : 'home'
    window.location.hash = `/${next}`
    setCurrentPage(next)
    setMobileMoreOpen(false)
  }, [])

  const activePage = pages.find((page) => page.id === currentPage) ?? pages[0]
  const ActivePageIcon = activePage.icon
  const discardActiveTimer = useCallback(() => {
    if (pomodoroSnapshot.status !== 'idle') resetPomodoro()
  }, [pomodoroSnapshot.status, resetPomodoro])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" type="button" onClick={() => navigate('home')} aria-label="回到首页">
          <span className="brand-mark"><Clock3 aria-hidden="true" /></span>
          <span><strong>知时</strong><small>学习效率</small></span>
        </button>
        <nav className="main-nav" aria-label="主导航">
          {pages.map((page) => {
            const Icon = page.icon
            return (
              <button
                key={page.id}
                type="button"
                className={currentPage === page.id ? 'is-active' : ''}
                aria-current={currentPage === page.id ? 'page' : undefined}
                onClick={() => navigate(page.id)}
              >
                <Icon aria-hidden="true" />
                <span>{page.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="sidebar-foot">
          <span>本地保存</span>
          <small>数据仅留在此设备</small>
        </div>
      </aside>

      <header className="mobile-header">
        <button className="brand" type="button" onClick={() => navigate('home')} aria-label="回到首页">
          <span className="brand-mark"><Clock3 aria-hidden="true" /></span>
          <span><strong>知时</strong><small>学习效率</small></span>
        </button>
        <span className="mobile-page-label"><ActivePageIcon aria-hidden="true" />{activePage.label}</span>
      </header>

      <main className="app-main" tabIndex={-1}>
        {currentPage === 'home' && <HomePage navigate={navigate} showToast={showToast} />}
        {currentPage === 'plans' && <PlansPage showToast={showToast} />}
        {currentPage === 'pomodoro' && <PomodoroPage showToast={showToast} timer={pomodoro} />}
        {currentPage === 'methods' && <MethodsPage showToast={showToast} />}
        {currentPage === 'tips' && <TipsPage showToast={showToast} />}
        {currentPage === 'search' && <SearchPage navigate={navigate} />}
        {currentPage === 'advice' && <AdvicePage showToast={showToast} />}
        {currentPage === 'stats' && <StatsPage />}
        {currentPage === 'profile' && <ProfilePage navigate={navigate} showToast={showToast} onClearData={discardActiveTimer} />}
      </main>

      <nav className="mobile-nav" aria-label="移动端主导航">
        {pages.filter((page) => mobilePrimaryIds.includes(page.id)).map((page) => {
          const Icon = page.icon
          return (
            <button
              key={page.id}
              type="button"
              className={currentPage === page.id ? 'is-active' : ''}
              aria-current={currentPage === page.id ? 'page' : undefined}
              onClick={() => navigate(page.id)}
            >
              <Icon aria-hidden="true" />
              <span>{page.label.replace('每日', '').replace('学习 ', '')}</span>
            </button>
          )
        })}
        <button
          type="button"
          className={!mobilePrimaryIds.includes(currentPage) ? 'is-active' : ''}
          aria-haspopup="dialog"
          aria-expanded={mobileMoreOpen}
          onClick={() => setMobileMoreOpen(true)}
        >
          <Menu aria-hidden="true" />
          <span>{!mobilePrimaryIds.includes(currentPage) ? pages.find((page) => page.id === currentPage)?.label.replace('学习 ', '') : '更多'}</span>
        </button>
      </nav>

      <Modal open={mobileMoreOpen} title="更多功能" description="学习工具与个人数据" onClose={() => setMobileMoreOpen(false)} width="sm">
        <nav className="mobile-more-grid" aria-label="更多功能">
          {pages.filter((page) => !mobilePrimaryIds.includes(page.id)).map((page) => {
            const Icon = page.icon
            return (
              <button key={page.id} type="button" className={currentPage === page.id ? 'is-active' : ''} onClick={() => navigate(page.id)}>
                <Icon aria-hidden="true" />
                <span>{page.label}</span>
              </button>
            )
          })}
        </nav>
      </Modal>

      <Toast toast={toast} onClose={closeToast} />
    </div>
  )
}
