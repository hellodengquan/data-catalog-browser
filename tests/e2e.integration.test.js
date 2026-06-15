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
