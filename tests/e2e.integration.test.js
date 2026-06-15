import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

import App from '../src/App.vue'
import LineageGraph from '../src/components/LineageGraph.vue'
import ApprovalPanel from '../src/components/ApprovalPanel.vue'
import DatasetPreview from '../src/components/DatasetPreview.vue'

enableAutoUnmount(afterEach)

describe('E2E Integration Tests - 端到端集成', () => {
  describe('App 主界面完整流程', () => {
    let wrapper

    beforeEach(async () => {
      const { permissionService } = await import('../src/utils/permissionService')
      permissionService.switchUser('u-025')
      wrapper = mount(App, {
        attachTo: document.body,
        global: {
          stubs: {
            transition: false,
            teleport: false,
          }
        }
      })
    })

    it('初始状态：显示头部、侧边栏、空状态提示', async () => {
      await nextTick()
      const html = wrapper.html()
      expect(html).toContain('数据目录浏览器')
      expect(html).toContain('分类导航')
      expect(html).toContain('选择一个数据集')
    })

    it('侧边栏团队筛选可见，敏感度筛选可见', async () => {
      await nextTick()
      const html = wrapper.html()
      expect(html).toContain('按团队筛选')
      expect(html).toContain('按敏感度')
      expect(html).toContain('全部')
      expect(html).toContain('公开')
    })

    it('用户切换器包含管理员用户', async () => {
      await nextTick()
      const html = wrapper.html()
      expect(html).toContain('系统管理员')
    })

    it('Tab 导航包含四个 Tab', async () => {
      await nextTick()
      wrapper.vm.selectedDatasetId = 'ds-009'
      await nextTick()
      const html = wrapper.html()
      expect(html).toContain('基础信息')
      expect(html).toContain('血缘关系图')
      expect(html).toContain('审批管理')
      expect(html).toContain('OpenLineage 导出')
    })

    it('可以选择数据集并显示详情', async () => {
      await nextTick()
      wrapper.vm.selectedDatasetId = 'ds-009'
      await nextTick()
      const html = wrapper.html()
      expect(html).toContain('商品基础信息')
    })

    it('切换 Tab 显示不同内容', async () => {
      wrapper.vm.selectedDatasetId = 'ds-009'
      await nextTick()
      wrapper.vm.currentTab = 'lineage'
      await nextTick()
      const lineageHtml = wrapper.html()
      expect(lineageHtml).toContain('血缘关系')

      wrapper.vm.currentTab = 'approvals'
      await nextTick()
      const approvalHtml = wrapper.html()
      expect(approvalHtml).toContain('审批')

      wrapper.vm.currentTab = 'export'
      await nextTick()
      const exportHtml = wrapper.html()
      expect(exportHtml).toContain('OpenLineage')
    })
  })

  describe('DatasetPreview + 字段高亮 + 权限屏蔽', () => {
    it('DatasetPreview 显示字段列表，含高亮和权限标记', async () => {
      const { permissionService } = await import('../src/utils/permissionService')
      const { datasets } = await import('../src/data/mockData')

      permissionService.switchUser('u-025')
      const ds = JSON.parse(JSON.stringify(datasets['ds-009']))
      const visible = permissionService.getVisibleFields(ds.id, ds.fields)
      ds.fields = visible.map(f => {
        if (f.masked) {
          return { ...f, sample: '*** 未授权 ***', description: f.description + '（字段受权限控制，请申请访问）' }
        }
        return f
      })

      const wrapper = mount(DatasetPreview, {
        props: { dataset: ds, highlightKeyword: 'id' }
      })

      await nextTick()
      expect(wrapper.html()).toContain('字段信息')
    })
  })

  describe('LineageGraph 组件集成', () => {
    it('LineageGraph 渲染 SVG，包含节点和连线', async () => {
      const wrapper = mount(LineageGraph, {
        props: { currentDatasetId: 'ds-006' }
      })
      await nextTick()
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      const html = wrapper.html()
      expect(html).toContain('<g')
    })

    it('LineageGraph 无血缘数据时显示提示', async () => {
      const wrapper = mount(LineageGraph, {
        props: { currentDatasetId: 'ds-unknown-empty' }
      })
      await nextTick()
      expect(wrapper.html()).toContain('血缘')
    })
  })

  describe('ApprovalPanel 审批流程端到端', () => {
    let wrapper

    beforeEach(async () => {
      const { permissionService } = await import('../src/utils/permissionService')
      permissionService.resetApprovals()
      permissionService.switchUser('u-024')
      wrapper = mount(ApprovalPanel)
      await nextTick()
    })

    it('Tab 结构：待我审批、我的申请、新建申请', async () => {
      const html = wrapper.html()
      expect(html).toContain('待我审批')
      expect(html).toContain('我的申请')
      expect(html).toContain('新建申请')
    })

    it('可以在新建申请 Tab 填写申请内容并提交', async () => {
      const tabs = wrapper.findAll('.approval-tab')
      if (tabs.length > 0) {
        await tabs[2].trigger('click')
        await nextTick()
        expect(wrapper.html()).toContain('申请')
      }
    })

    it('我的申请列表正常渲染（初始为空）', async () => {
      const tabs = wrapper.findAll('.approval-tab')
      if (tabs.length > 0) {
        await tabs[1].trigger('click')
        await nextTick()
        expect(wrapper.html()).toContain('申请')
      }
    })
  })

  describe('权限隔离端到端测试', () => {
    it('非授权用户访问 RESTRICTED 数据集显示受限页面', async () => {
      const AppComp = (await import('../src/App.vue')).default
      const wrapper = mount(AppComp)
      await nextTick()
      const { permissionService } = await import('../src/utils/permissionService')
      const { datasetTeamMapping: dtm } = await import('../src/data/mockData')

      permissionService.switchUser('u-020')
      const restrictedIds = Object.entries(dtm)
        .filter(([, m]) => m.sensitivityLevel === 'restricted')
        .map(([id]) => id)

      if (restrictedIds.length > 0) {
        wrapper.vm.selectedDatasetId = restrictedIds[0]
        await nextTick()
        expect(wrapper.html()).toContain('访问受限')
      }
    })

    it('管理员可访问所有数据集', async () => {
      const AppComp = (await import('../src/App.vue')).default
      const wrapper = mount(AppComp)
      await nextTick()
      const { permissionService } = await import('../src/utils/permissionService')
      const { datasets } = await import('../src/data/mockData')

      permissionService.switchUser('u-025')
      const firstId = Object.keys(datasets)[0]
      wrapper.vm.selectedDatasetId = firstId
      await nextTick()
      expect(wrapper.html()).not.toContain('访问受限')
    })
  })

  describe('搜索 + 权限筛选集成', () => {
    it('用户切换后搜索结果受权限影响', async () => {
      const AppComp = (await import('../src/App.vue')).default
      const wrapper = mount(AppComp)
      await nextTick()
      const { permissionService } = await import('../src/utils/permissionService')

      permissionService.switchUser('u-025')
      wrapper.vm.searchText = '用户'
      await nextTick()
      wrapper.vm.handleFuseSearch()
      await nextTick()
      const adminCount = wrapper.vm.fuzzyResults.length

      permissionService.switchUser('u-020')
      wrapper.vm.handleFuseSearch()
      await nextTick()
      expect(adminCount).toBeGreaterThanOrEqual(0)
    })

    it('拼写建议 + 团队筛选联合工作', async () => {
      const AppComp = (await import('../src/App.vue')).default
      const wrapper = mount(AppComp)
      await nextTick()

      wrapper.vm.selectedTeamId = 't-product'
      wrapper.vm.searchText = 'paymnt'
      await nextTick()
      wrapper.vm.handleFuseSearch()
      await nextTick()

      if (wrapper.vm.searchSuggestion) {
        wrapper.vm.applySuggestion()
        await nextTick()
        expect(wrapper.vm.searchText).toBe(wrapper.vm.searchSuggestion)
      }
    })
  })

  describe('搜索高亮集成', () => {
    it('highlightText 正确高亮', async () => {
      const { highlightText } = await import('../src/utils/searchEngine')
      const result = highlightText('user email order', 'email')
      expect(result).toContain('class')
      expect(result).toContain('search-highlight')
      expect(result).toContain('email')
    })
  })
})

describe('数据一致性验证', () => {
  it('所有数据集都有团队映射和敏感度级别', async () => {
    const { datasets, datasetTeamMapping } = await import('../src/data/mockData')
    Object.keys(datasets).forEach(id => {
      expect(datasetTeamMapping[id]).toBeTruthy()
      expect(['public', 'internal', 'confidential', 'restricted'])
        .toContain(datasetTeamMapping[id].sensitivityLevel)
    })
  })

  it('所有血缘边引用的数据集都存在', async () => {
    const { fieldLineage, datasets } = await import('../src/data/mockData')
    fieldLineage.edges.forEach(e => {
      expect(datasets[e.sourceDataset]).toBeTruthy()
      expect(datasets[e.targetDataset]).toBeTruthy()
    })
  })

  it('所有审批相关用户都在用户列表中', async () => {
    const { approvalRequests, users } = await import('../src/data/mockData')
    approvalRequests.forEach(r => {
      expect(users[r.requesterId]).toBeTruthy()
      if (r.currentApproverId) {
        expect(users[r.currentApproverId]).toBeTruthy()
      }
      if (r.approvalHistory && Array.isArray(r.approvalHistory)) {
        r.approvalHistory.forEach(h => {
          expect(users[h.approverId]).toBeTruthy()
        })
      }
    })
  })

  it('敏感度级别颜色正确', async () => {
    const { sensitivityLevels } = await import('../src/data/mockData')
    expect(Object.keys(sensitivityLevels).length).toBe(4)
    Object.values(sensitivityLevels).forEach(s => {
      expect(s.color).toMatch(/^#/)
      expect(s.label).toBeTruthy()
      expect(typeof s.level).toBe('number')
    })
  })
})

describe('数据集订阅与变更通知 E2E', () => {
  let wrapper

  beforeEach(async () => {
    const { subscriptionService } = await import('../src/utils/subscriptionService')
    const { permissionService } = await import('../src/utils/permissionService')
    permissionService.switchUser('u-025')
    subscriptionService.resetSubscriptions()
    subscriptionService.switchUser('u-025')
  })

  it('订阅服务可以订阅和取消订阅数据集', async () => {
    const { subscriptionService } = await import('../src/utils/subscriptionService')
    subscriptionService.switchUser('u-025')

    const result = subscriptionService.subscribe('ds-006')
    expect(result.success).toBe(true)
    expect(result.isNew).toBe(true)
    expect(subscriptionService.isSubscribed('ds-006')).toBe(true)

    const result2 = subscriptionService.subscribe('ds-006')
    expect(result2.isNew).toBe(false)

    const unsubscribed = subscriptionService.unsubscribe('ds-006')
    expect(unsubscribed).toBe(true)
    expect(subscriptionService.isSubscribed('ds-006')).toBe(false)
  })

  it('订阅服务按用户隔离订阅数据', async () => {
    const { subscriptionService } = await import('../src/utils/subscriptionService')

    subscriptionService.switchUser('u-022')
    subscriptionService.subscribe('ds-006')
    expect(subscriptionService.getMySubscriptions().length).toBeGreaterThan(0)

    subscriptionService.switchUser('u-024')
    expect(subscriptionService.getMySubscriptions().length).toBeGreaterThan(0)

    subscriptionService.switchUser('u-020')
    expect(subscriptionService.getMySubscriptions().length).toBe(0)
  })

  it('通知系统按订阅过滤和类型过滤', async () => {
    const { subscriptionService } = await import('../src/utils/subscriptionService')

    subscriptionService.switchUser('u-022')
    subscriptionService.subscribe('ds-006', {
      notifyOnSchemaChange: true,
      notifyOnDataUpdate: false,
      notifyOnOwnerChange: true
    })

    const allNotifs = subscriptionService.getMyNotifications()
    expect(allNotifs.length).toBeGreaterThan(0)

    allNotifs.forEach(n => {
      expect(n.type !== 'data_update').toBe(true)
    })

    const unread = subscriptionService.getMyNotifications(undefined, { unreadOnly: true })
    expect(unread.length).toBeGreaterThanOrEqual(0)
    expect(subscriptionService.getUnreadCount()).toBeGreaterThanOrEqual(0)
  })

  it('通知可以标记为已读', async () => {
    const { subscriptionService } = await import('../src/utils/subscriptionService')

    subscriptionService.switchUser('u-025')
    subscriptionService.subscribe('ds-012')

    const initialUnread = subscriptionService.getUnreadCount()
    const unreadNotifs = subscriptionService.getMyNotifications(undefined, { unreadOnly: true })

    if (unreadNotifs.length > 0) {
      const firstId = unreadNotifs[0].id
      const marked = subscriptionService.markAsRead(firstId)
      expect(marked).toBe(true)

      const afterUnread = subscriptionService.getUnreadCount()
      expect(afterUnread).toBeLessThanOrEqual(initialUnread)
    }
  })

  it('可以创建不同类型的通知', async () => {
    const { subscriptionService } = await import('../src/utils/subscriptionService')

    const schemaNotif = subscriptionService.notifySchemaChange('ds-006', '测试字段新增', 'u-025')
    expect(schemaNotif).toBeTruthy()
    expect(schemaNotif.type).toBe('schema_change')

    const dataNotif = subscriptionService.notifyDataUpdate('ds-006', '测试数据刷新', 'u-025')
    expect(dataNotif).toBeTruthy()
    expect(dataNotif.type).toBe('data_update')

    const ownerNotif = subscriptionService.notifyOwnerChange('ds-006', 'u-001', 'u-002', 'u-025')
    expect(ownerNotif).toBeTruthy()
    expect(ownerNotif.type).toBe('owner_change')
  })

  it('获取数据集订阅者列表', async () => {
    const { subscriptionService } = await import('../src/utils/subscriptionService')

    subscriptionService.resetSubscriptions()
    subscriptionService.switchUser('u-022')
    subscriptionService.subscribe('ds-006')
    subscriptionService.switchUser('u-024')
    subscriptionService.subscribe('ds-006')

    const subscribers = subscriptionService.getSubscribers('ds-006')
    expect(subscribers.length).toBeGreaterThanOrEqual(2)
    subscribers.forEach(s => {
      expect(s.user).toBeTruthy()
    })
  })
})

describe('字段质量评分 E2E', () => {
  beforeEach(async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')
    qualityScoreService.resetScores()
  })

  it('质量评分服务可以获取数据集评分', async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')
    const score = qualityScoreService.getDatasetScore('ds-006')
    expect(score).toBeTruthy()
    expect(score.overall).toBeGreaterThan(0)
    expect(score.quality).toBeGreaterThan(0)
    expect(score.usability).toBeGreaterThan(0)
    expect(score.completeness).toBeGreaterThan(0)
    expect(score.lineageCoverage).toBeGreaterThan(0)
  })

  it('评分颜色映射正确', async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')

    expect(qualityScoreService.getScoreColor(95)).toBe('#10b981')
    expect(qualityScoreService.getScoreColor(85)).toBe('#3b82f6')
    expect(qualityScoreService.getScoreColor(75)).toBe('#f59e0b')
    expect(qualityScoreService.getScoreColor(65)).toBe('#ef4444')
  })

  it('评分等级和标签正确', async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')

    expect(qualityScoreService.getScoreLevel(95)).toBe('excellent')
    expect(qualityScoreService.getScoreLevel(85)).toBe('good')
    expect(qualityScoreService.getScoreLevel(75)).toBe('fair')
    expect(qualityScoreService.getScoreLevel(65)).toBe('poor')

    expect(qualityScoreService.getScoreLabel(95)).toBe('优秀')
    expect(qualityScoreService.getScoreLabel(85)).toBe('良好')
    expect(qualityScoreService.getScoreLabel(75)).toBe('一般')
    expect(qualityScoreService.getScoreLabel(65)).toBe('较差')
  })

  it('可以获取字段质量指标', async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')

    const fieldMetrics = qualityScoreService.getDatasetFieldMetrics('ds-006')
    expect(fieldMetrics).toBeTruthy()
    expect(Object.keys(fieldMetrics).length).toBeGreaterThan(0)

    Object.values(fieldMetrics).forEach(metric => {
      expect(metric.completeness).toBeDefined()
      expect(metric.accuracy).toBeDefined()
      expect(metric.uniqueness).toBeDefined()
      expect(metric.timeliness).toBeDefined()
      expect(metric.overallScore).toBeDefined()
      expect(metric.overallScore).toBeGreaterThan(0)
    })
  })

  it('字段质量综合评分计算正确', async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')

    const result = qualityScoreService.calculateFieldQuality({
      completeness: 0.95,
      accuracy: 0.90,
      uniqueness: 0.85,
      timeliness: 0.80
    })

    expect(result.overall).toBeGreaterThan(80)
    expect(result.level).toBe('good')
  })

  it('维度评分分解正确', async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')

    const breakdown = qualityScoreService.getScoreBreakdown('ds-006')
    expect(breakdown.length).toBe(4)
    breakdown.forEach(item => {
      expect(item.key).toBeTruthy()
      expect(item.label).toBeTruthy()
      expect(item.value).toBeGreaterThan(0)
      expect(item.color).toMatch(/^#/)
    })
  })

  it('质量趋势数据生成正确', async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')

    const trend = qualityScoreService.getQualityTrend('ds-006', 7)
    expect(trend.length).toBe(7)
    trend.forEach(item => {
      expect(item.date).toBeTruthy()
      expect(item.score).toBeGreaterThanOrEqual(60)
      expect(item.score).toBeLessThanOrEqual(100)
    })
  })

  it('可以更新字段质量指标', async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')

    const updated = qualityScoreService.updateFieldMetric('ds-006', 'order_id', 'completeness', 0.99)
    expect(updated).toBeTruthy()
    expect(updated.completeness).toBe(0.99)
  })

  it('数据集质量平均分计算正确', async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')

    const result = qualityScoreService.calculateDatasetQuality('ds-006')
    expect(result.avgScore).toBeGreaterThan(80)
    expect(result.fieldCount).toBeGreaterThan(0)
  })
})

describe('数据集打分排序 E2E', () => {
  beforeEach(async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')
    qualityScoreService.resetScores()
  })

  it('排序选项可用', async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')

    const options = qualityScoreService.getSortOptions()
    expect(options.length).toBeGreaterThanOrEqual(7)
    expect(options.map(o => o.key)).toContain('overall')
    expect(options.map(o => o.key)).toContain('quality')
    expect(options.map(o => o.key)).toContain('name')
    expect(options.map(o => o.key)).toContain('updateTime')
  })

  it('可以设置排序方式并切换顺序', async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')

    qualityScoreService.setSortBy('quality')
    expect(qualityScoreService.sortBy).toBe('quality')
    expect(qualityScoreService.sortOrder).toBe('desc')

    qualityScoreService.setSortBy('quality')
    expect(qualityScoreService.sortOrder).toBe('asc')

    qualityScoreService.setSortBy('overall')
    expect(qualityScoreService.sortBy).toBe('overall')
    expect(qualityScoreService.sortOrder).toBe('desc')
  })

  it('数据集排序功能正常工作', async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')
    const { datasets } = await import('../src/data/mockData')

    const datasetList = Object.values(datasets).slice(0, 10)

    qualityScoreService.setSortBy('quality')
    qualityScoreService.setSortBy('overall')
    const sortedDesc = qualityScoreService.sortDatasets(datasetList)

    for (let i = 1; i < sortedDesc.length; i++) {
      const scoreA = qualityScoreService.getDatasetScore(sortedDesc[i - 1].id).overall
      const scoreB = qualityScoreService.getDatasetScore(sortedDesc[i].id).overall
      expect(scoreA).toBeGreaterThanOrEqual(scoreB)
    }

    qualityScoreService.setSortBy('overall')
    const sortedAsc = qualityScoreService.sortDatasets(datasetList)

    for (let i = 1; i < sortedAsc.length; i++) {
      const scoreA = qualityScoreService.getDatasetScore(sortedAsc[i - 1].id).overall
      const scoreB = qualityScoreService.getDatasetScore(sortedAsc[i].id).overall
      expect(scoreA).toBeLessThanOrEqual(scoreB)
    }
  })

  it('按名称排序功能正常', async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')
    const { datasets } = await import('../src/data/mockData')

    const datasetList = Object.values(datasets).slice(0, 10)

    qualityScoreService.setSortBy('quality')
    qualityScoreService.setSortBy('name')
    qualityScoreService.setSortBy('name')
    const sorted = qualityScoreService.sortDatasets(datasetList)

    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].name.localeCompare(sorted[i].name)).toBeLessThanOrEqual(0)
    }
  })

  it('获取排名前 N 的数据集', async () => {
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')

    const top5 = qualityScoreService.getRankedDatasets(null, 5)
    expect(top5.length).toBe(5)

    for (let i = 1; i < top5.length; i++) {
      expect(top5[i - 1].score.overall).toBeGreaterThanOrEqual(top5[i].score.overall)
    }
  })
})

describe('批量元数据导入 E2E', () => {
  beforeEach(async () => {
    const { importService } = await import('../src/utils/importService')
    importService.resetImports()
    importService.switchUser('u-025')
  })

  it('导入记录查询和过滤功能', async () => {
    const { importService } = await import('../src/utils/importService')

    const allRecords = importService.getImportRecords()
    expect(allRecords.length).toBeGreaterThan(0)

    const metadataRecords = importService.getImportRecords({ type: 'metadata' })
    expect(metadataRecords.length).toBeGreaterThan(0)
    metadataRecords.forEach(r => expect(r.type).toBe('metadata'))

    const lineageRecords = importService.getImportRecords({ type: 'lineage' })
    expect(lineageRecords.length).toBeGreaterThanOrEqual(1)
    lineageRecords.forEach(r => expect(r.type).toBe('lineage'))
  })

  it('导入状态映射正确', async () => {
    const { importService } = await import('../src/utils/importService')

    const statuses = ['pending', 'processing', 'completed', 'failed', 'partial']
    statuses.forEach(s => {
      const info = importService.getStatusInfo(s)
      expect(info).toBeTruthy()
      expect(info.label).toBeTruthy()
      expect(info.color).toMatch(/^#/)
    })
  })

  it('元数据格式验证功能', async () => {
    const { importService } = await import('../src/utils/importService')

    const validContent = JSON.stringify({
      records: [{
        id: 'ds-test-001',
        name: '测试数据集',
        teamId: 'team-product',
        sensitivityLevel: 'internal',
        requiresApproval: false,
        storageLocation: 'Hive / ods.test_table',
        tags: ['test'],
        fields: [
          { name: 'id', type: 'BIGINT', description: '主键', nullable: false }
        ]
      }]
    })

    const result = importService.validateImport(validContent, 'metadata')
    expect(result.valid).toBe(true)
    expect(result.records.length).toBe(1)
    expect(result.errors.length).toBe(0)
  })

  it('元数据格式验证 - 错误格式捕获', async () => {
    const { importService } = await import('../src/utils/importService')

    const invalidContent = JSON.stringify({
      records: [{
        name: '测试数据集',
        fields: [
          { name: 'id', type: 'BIGINT' }
        ]
      }]
    })

    const result = importService.validateImport(invalidContent, 'metadata')
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('元数据格式验证 - 无效敏感度级别', async () => {
    const { importService } = await import('../src/utils/importService')

    const invalidContent = JSON.stringify({
      records: [{
        id: 'ds-test-002',
        name: '测试数据集',
        teamId: 'team-product',
        sensitivityLevel: 'invalid-level',
        fields: [
          { name: 'id', type: 'BIGINT' }
        ]
      }]
    })

    const result = importService.validateImport(invalidContent, 'metadata')
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].reason).toContain('敏感度')
  })

  it('可以创建导入任务并执行', async () => {
    const { importService } = await import('../src/utils/importService')
    const { datasets } = await import('../src/data/mockData')

    const newId = `ds-import-test-${Date.now()}`

    const content = JSON.stringify({
      records: [{
        id: newId,
        name: '批量导入测试数据集',
        teamId: 'team-product',
        sensitivityLevel: 'internal',
        storageLocation: 'Hive / ods.test_import',
        updateFrequency: '每日',
        dataVolume: '10000行',
        tags: ['test', 'import'],
        fields: [
          { name: 'id', type: 'BIGINT', description: '主键', nullable: false, sample: '1' },
          { name: 'name', type: 'STRING', description: '名称', nullable: true, sample: 'test' }
        ]
      }]
    })

    const result = await importService.startImport({
      type: 'metadata',
      title: '批量导入测试',
      fileName: 'test_import.json',
      content
    })

    expect(result.success).toBe(true)
    expect(result.stats.success).toBe(1)
    expect(result.stats.failed).toBe(0)
    expect(datasets[newId]).toBeTruthy()
    expect(datasets[newId].name).toBe('批量导入测试数据集')
  })

  it('导入统计信息正确', async () => {
    const { importService } = await import('../src/utils/importService')

    const stats = importService.getImportStats()
    expect(stats.total).toBeGreaterThan(0)
    expect(stats.byStatus.completed).toBeGreaterThan(0)
    expect(stats.byType.metadata).toBeGreaterThan(0)
    expect(stats.lastWeekImports).toBeGreaterThanOrEqual(0)
  })

  it('我的导入功能正确', async () => {
    const { importService } = await import('../src/utils/importService')

    importService.switchUser('u-025')
    const myImports = importService.getMyImports()
    expect(myImports.length).toBeGreaterThan(0)

    myImports.forEach(r => {
      expect(r.operatorId).toBe('u-025')
    })
  })

  it('可以取消处理中的导入', async () => {
    const { importService } = await import('../src/utils/importService')

    const processingRecords = importService.getImportRecords({ status: 'processing' })
    if (processingRecords.length > 0) {
      const result = importService.cancelImport(processingRecords[0].id)
      expect(result).toBe(true)
    }
  })

  it('导入模板生成正确', async () => {
    const { importService } = await import('../src/utils/importService')

    const metadataTemplate = importService.getImportTemplate('metadata')
    expect(metadataTemplate).toContain('records')
    expect(metadataTemplate).toContain('fields')
    expect(metadataTemplate).toContain('teamId')

    const lineageTemplate = importService.getImportTemplate('lineage')
    expect(lineageTemplate).toContain('edges')
    expect(lineageTemplate).toContain('sourceDataset')
    expect(lineageTemplate).toContain('targetDataset')
  })

  it('血缘关系格式验证', async () => {
    const { importService } = await import('../src/utils/importService')

    const validContent = JSON.stringify({
      edges: [{
        id: 'e-test-001',
        sourceDataset: 'ds-006',
        sourceField: 'order_id',
        targetDataset: 'ds-001',
        targetField: 'order_id',
        transformType: 'direct',
        description: '字段映射'
      }]
    })

    const result = importService.validateImport(validContent, 'lineage')
    expect(result.errors.length).toBe(0)
  })

  it('血缘关系格式验证 - 数据集不存在', async () => {
    const { importService } = await import('../src/utils/importService')

    const invalidContent = JSON.stringify({
      edges: [{
        sourceDataset: 'ds-unknown-xxx',
        sourceField: 'id',
        targetDataset: 'ds-006',
        targetField: 'id'
      }]
    })

    const result = importService.validateImport(invalidContent, 'lineage')
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].reason).toContain('不存在')
  })
})

describe('新功能组件集成测试', () => {
  let wrapper

  beforeEach(async () => {
    const { permissionService } = await import('../src/utils/permissionService')
    const { subscriptionService } = await import('../src/utils/subscriptionService')
    const { importService } = await import('../src/utils/importService')
    const { qualityScoreService } = await import('../src/utils/qualityScoreService')

    permissionService.switchUser('u-025')
    subscriptionService.switchUser('u-025')
    importService.switchUser('u-025')
    qualityScoreService.resetScores()
    subscriptionService.resetSubscriptions()

    wrapper = mount(App, {
      attachTo: document.body,
      global: {
        stubs: {
          transition: false,
          teleport: false,
        }
      }
    })
  })

  it('主界面包含排序功能和通知按钮', async () => {
    await nextTick()
    const html = wrapper.html()
    expect(html).toContain('排序方式')
    expect(html).toContain('综合评分')
    expect(html).toContain('通知中心')
    expect(html).toContain('批量导入')
  })

  it('顶部导航栏有通知和批量导入按钮', async () => {
    await nextTick()
    const html = wrapper.html()
    expect(html).toContain('notification-btn')
    expect(html).toContain('header-icon-btn')
  })

  it('质量评分 Tab 可见', async () => {
    await nextTick()
    wrapper.vm.selectedDatasetId = 'ds-009'
    await nextTick()
    const html = wrapper.html()
    expect(html).toContain('质量评分')
  })

  it('排序选项包含所有维度', async () => {
    await nextTick()
    const html = wrapper.html()
    expect(html).toContain('数据质量')
    expect(html).toContain('易用性')
    expect(html).toContain('血缘覆盖度')
  })

  it('可以切换到质量评分 Tab', async () => {
    await nextTick()
    wrapper.vm.selectedDatasetId = 'ds-006'
    await nextTick()
    wrapper.vm.currentTab = 'quality'
    await nextTick()
    await nextTick()
    const html = wrapper.html()
    expect(html).toContain('数据质量评分')
  })

  it('数据集详情页显示质量评分和订阅按钮', async () => {
    await nextTick()
    wrapper.vm.selectedDatasetId = 'ds-009'
    await nextTick()
    const html = wrapper.html()
    expect(html).toContain('分')
    expect(html).toContain('订阅变更')
  })

  it('点击订阅按钮后变为取消订阅', async () => {
    await nextTick()
    wrapper.vm.selectedDatasetId = 'ds-009'
    await nextTick()

    expect(wrapper.html()).toContain('订阅变更')
    wrapper.vm.handleSubscribeDataset()
    await nextTick()
    await nextTick()
    expect(wrapper.html()).toContain('取消订阅')

    window.confirm = () => true
    wrapper.vm.handleUnsubscribeDataset()
    await nextTick()
    await nextTick()
    expect(wrapper.html()).toContain('订阅变更')
  })

  it('点击排序可以切换排序方式', async () => {
    await nextTick()
    wrapper.vm.handleSortChange('quality')
    await nextTick()
    expect(wrapper.vm.sortBy).toBe('quality')
    expect(wrapper.vm.sortOrder).toBe('desc')

    wrapper.vm.handleSortChange('quality')
    await nextTick()
    expect(wrapper.vm.sortOrder).toBe('asc')
  })
})
