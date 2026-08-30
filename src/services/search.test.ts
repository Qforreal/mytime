import { describe, expect, it, vi } from 'vitest'
import { searchCrossrefWorks, searchLearningResources, searchLocalLearningMethods } from './search'

describe('学习资料搜索', () => {
  it('能从本地方法库匹配中文关键词', () => {
    const results = searchLocalLearningMethods('怎样提高记忆效率')
    expect(results.some((result) => result.title === '主动回忆')).toBe(true)
    expect(results.some((result) => result.title === '间隔重复')).toBe(true)
  })

  it('会规范化 Crossref 结果并保留来源', async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          message: {
            items: [
              {
                DOI: '10.1000/test',
                title: ['Testing Active Recall'],
                author: [{ given: 'Ada', family: 'Liu' }],
                publisher: 'University Press',
                'container-title': ['Journal of Learning'],
                issued: { 'date-parts': [[2025]] },
                type: 'journal-article',
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const outcome = await searchCrossrefWorks('active recall', { fetchFn })
    expect(outcome.status).toBe('success')
    expect(outcome.results).toHaveLength(1)
    expect(outcome.results[0].source.doi).toBe('10.1000/test')
    expect(outcome.results[0].source.name).toBe('Journal of Learning')
    expect(outcome.results[0].url).toBe('https://doi.org/10.1000/test')
  })

  it('断网时仍返回本地方法和可靠检索入口', async () => {
    const response = await searchLearningResources('主动回忆', {
      fetchFn: vi.fn(async () => {
        throw new TypeError('offline')
      }),
    })
    expect(response.networkStatus).toBe('network-error')
    expect(response.localCount).toBeGreaterThan(0)
    expect(response.reliableLinkCount).toBe(3)
    expect(response.results.some((result) => result.source.provider === 'ERIC')).toBe(true)
  })
})
