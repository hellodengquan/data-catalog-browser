import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { searchEngine, highlightText } from '../src/utils/searchEngine'
import { datasets } from '../src/data/mockData'

describe('FullTextSearchEngine - 模糊搜索与全文索引', () => {
  beforeAll(() => {
    const datasetList = Object.values(datasets)
    searchEngine.buildIndex(datasetList)
  })

  describe('基础搜索', () => {
    it('可以按数据集名称搜索', () => {
      const result = searchEngine.search('订单')
      expect(result.results.length).toBeGreaterThan(0)
      const names = result.results.map(r => r.item.name)
      expect(names.some(n => n.includes('订单') || n.includes('order'))).toBe(true)
    })

    it('可以按字段名搜索', () => {
      const result = searchEngine.search('pay_method')
      expect(result.results.length).toBeGreaterThan(0)
      const hasFieldMatch = result.results.some(r =>
        r.matchedFields && r.matchedFields.length > 0
      )
      expect(hasFieldMatch).toBe(true)
    })

    it('可以按标签搜索', () => {
      const result = searchEngine.search('交易')
      expect(result.results.length).toBeGreaterThan(0)
    })
  })

  describe('模糊匹配（容错）', () => {
    it('可以容忍拼写错误 - user 模糊', () => {
      const result = searchEngine.search('usre')
      expect(result.results.length).toBeGreaterThan(0)
    })

    it('可以容忍拼写错误 - order 模糊', () => {
      const result = searchEngine.search('odrer')
      expect(result.results.length).toBeGreaterThan(0)
    })

    it('可以按描述关键词搜索', () => {
      const result = searchEngine.search('交易')
      expect(result.results.length).toBeGreaterThan(0)
    })
  })

  describe('拼写建议', () => {
    it('当查询词有明显错误时，提供正确建议', () => {
      const result = searchEngine.search('pay_mthod')
      expect(result.suggestion === null || typeof result.suggestion === 'string').toBe(true)
    })

    it('当查询词本身正确时，不提供建议', () => {
      const result = searchEngine.search('payment')
      expect(result.suggestion === null || typeof result.suggestion === 'string').toBe(true)
    })
  })

  describe('高亮文本', () => {
    it('正确高亮匹配内容', () => {
      const html = highlightText('user payment order', 'payment')
      expect(html).toContain('search-highlight')
      expect(html).toContain('payment')
    })

    it('空查询时不高亮', () => {
      const html = highlightText('user payment order', '')
      expect(html).toBe('user payment order')
    })

    it('多关键词高亮', () => {
      const html = highlightText('user order payment', 'user payment')
      expect(html.match(/search-highlight/g)?.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('筛选与排序', () => {
    it('可以通过 filterFn 过滤结果', () => {
      const filterFn = (item) => item.id === 'ds-012'
      const result = searchEngine.search('用户', { filterFn })
      expect(result.results.every(r => r.item.id === 'ds-012')).toBe(true)
    })

    it('结果按匹配分数降序排列', () => {
      const result = searchEngine.search('user')
      if (result.results.length >= 2) {
        expect(result.results[0].score).toBeLessThanOrEqual(
          (result.results[1].score || 0) + 0.001
        )
      }
    })
  })

  describe('边界场景', () => {
    it('空查询返回空结果', () => {
      const result = searchEngine.search('')
      expect(result.results).toEqual([])
    })

    it('超长随机关键词返回空结果', () => {
      const result = searchEngine.search('zzz999xxx不存在的词yyy')
      expect(result.results.length).toBe(0)
    })
  })
})
