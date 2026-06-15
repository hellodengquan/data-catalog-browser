<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-left">
        <div class="logo">
          <Database :size="24" />
          <span class="logo-text">数据目录浏览器</span>
        </div>
      </div>

      <div class="header-center">
        <div class="search-bar-container">
          <div class="search-input-wrapper" :class="{ 'has-focus': searchFocused, 'has-suggestion': !!searchSuggestion }">
            <Search class="search-icon" :size="18" />
            <input
              v-model="searchText"
              type="text"
              class="search-input"
              placeholder="模糊搜索：数据集、字段、标签、团队、描述..."
              @focus="searchFocused = true"
              @blur="searchFocused = false; setTimeout(() => showSearchResults = false, 200)"
              @input="handleFuseSearch"
              @keyup.enter="handleSearchConfirm"
            />
            <button v-if="searchText" class="clear-btn" @click="clearSearch">
              <X :size="16" />
            </button>
            <span v-if="searchStats" class="search-stats">{{ searchStats }}</span>
          </div>

          <div v-if="searchSuggestion && showSearchResults" class="search-suggestion" @mousedown="applySuggestion">
            <Wand2 :size="14" />
            <span>您是不是想找：</span>
            <strong>{{ searchSuggestion }}</strong>
          </div>

          <div v-if="showSearchResults && fuzzyResults.length > 0" class="fuzzy-results">
            <div class="results-header">
              <span>找到 {{ fuzzyResults.length }} 条结果</span>
              <div class="filter-chips">
                <button
                  v-for="s in sensitivityOptions"
                  :key="s.key"
                  class="filter-chip"
                  :class="{ active: sensitivityFilter === s.key }"
                  @mousedown="toggleSensitivityFilter(s.key)"
                >
                  <span class="chip-dot" :style="{ background: s.color }"></span>
                  {{ s.label }}
                </button>
              </div>
            </div>
            <div class="results-scroll">
              <div
                v-for="result in filteredFuzzyResults"
                :key="result.item.id"
                class="result-row"
                :class="{ active: selectedDatasetId === result.item.id }"
                @mousedown="handleDatasetSelect(result.item.id)"
              >
                <div class="result-left">
                  <Database :size="16" class="result-db-icon" />
                  <div class="result-texts">
                    <div class="result-name" v-html="highlightText(result.item.name, effectiveQuery)"></div>
                    <div class="result-meta">
                      <span
                        class="sensitivity-dot"
                        :style="{ background: getSensitivityColor(result.item.id) }"
                      ></span>
                      <span class="team-name">{{ getTeamName(result.item.id) }}</span>
                      <span class="result-tags">
                        <Tag v-for="t in result.item.tags.slice(0, 2)" :key="t" :size="11" />
                        {{ result.item.tags.slice(0, 2).join(' / ') }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="result-right">
                  <div v-if="result.matchedFields && result.matchedFields.length" class="matched-fields-hint">
                    匹配字段:
                    <span class="field-name-list">
                      {{ result.matchedFields.slice(0, 3).map(f => f.name).join(', ') }}
                    </span>
                  </div>
                  <Lock v-if="isDatasetLocked(result.item.id)" :size="14" class="lock-icon" />
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="showSearchResults && searchText" class="fuzzy-results empty">
            <SearchX :size="32" />
            <p>没有找到匹配的数据集</p>
            <p v-if="searchSuggestion" class="hint">尝试点击上方的拼写建议</p>
          </div>
        </div>
      </div>

      <div class="header-right">
        <button class="header-icon-btn" @click="toggleImportPanel" title="批量导入">
          <Upload :size="18" />
        </button>
        <button class="header-icon-btn notification-btn" @click="toggleNotificationPanel" title="通知中心">
          <Bell :size="18" />
          <span v-if="unreadNotificationCount > 0" class="notification-dot">{{ unreadNotificationCount }}</span>
        </button>
        <div class="user-switcher" title="切换用户测试权限">
          <User :size="16" />
          <select v-model="currentUserId" @change="onUserSwitch" class="user-select">
            <option v-for="u in userOptions" :key="u.id" :value="u.id">
              {{ u.name }} ({{ u.roleLabel }})
            </option>
          </select>
        </div>
        <span class="dataset-count">共 {{ visibleDatasetCount }} 个数据集</span>
      </div>
    </header>

    <div class="app-body">
      <aside class="sidebar" :class="{ 'is-collapsed': isSidebarCollapsed }">
        <div class="sidebar-header">
          <div class="sidebar-title">
            <FolderTree :size="18" />
            <span>分类导航</span>
          </div>
          <div class="sidebar-actions">
            <button class="action-btn" @click="expandAll" title="展开全部">
              <ChevronsDown :size="16" />
            </button>
            <button class="action-btn" @click="collapseAll" title="收起全部">
              <ChevronsUp :size="16" />
            </button>
            <button class="action-btn" @click="toggleSidebar" :title="isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'">
              <PanelLeftClose v-if="!isSidebarCollapsed" :size="16" />
              <PanelLeftOpen v-else :size="16" />
            </button>
          </div>
        </div>

        <div class="sidebar-content" v-show="!isSidebarCollapsed">
          <div class="sidebar-section">
            <div class="section-label">按团队筛选</div>
            <div class="team-filter-list">
              <button
                class="team-chip"
                :class="{ active: selectedTeamId === 'all' }"
                @click="selectedTeamId = 'all'"
              >
                <Users :size="13" /> 全部
              </button>
              <button
                v-for="t in teamOptions"
                :key="t.id"
                class="team-chip"
                :class="{ active: selectedTeamId === t.id }"
                @click="selectedTeamId = t.id"
              >
                <span class="chip-dot" :style="{ background: t.color }"></span>
                {{ t.name }}
              </button>
            </div>
          </div>

          <div class="sidebar-divider"></div>

          <div class="sidebar-section">
            <div class="section-label">按敏感度</div>
            <div class="sensitivity-list">
              <div
                v-for="s in sensitivityOptions"
                :key="s.key"
                class="sensitivity-item"
                :class="{ active: selectedSensitivity === s.key, muted: selectedSensitivity && selectedSensitivity !== s.key }"
                @click="toggleSensitivity(s.key)"
              >
                <span class="s-dot" :style="{ background: s.color }"></span>
                <span class="s-label">{{ s.label }}</span>
                <span class="s-count">{{ getSensitivityCount(s.key) }}</span>
              </div>
            </div>
          </div>

          <div class="sidebar-divider"></div>

          <div class="sidebar-section">
            <div class="section-label">排序方式</div>
            <div class="sort-list">
              <div
                v-for="opt in sortOptions"
                :key="opt.key"
                class="sort-item"
                :class="{ active: sortBy === opt.key }"
                @click="handleSortChange(opt.key)"
              >
                <ArrowUpDown :size="13" />
                <span class="sort-label">{{ opt.label }}</span>
                <span v-if="sortBy === opt.key" class="sort-order">
                  {{ sortOrder === 'desc' ? '↓' : '↑' }}
                </span>
              </div>
            </div>
          </div>

          <div class="sidebar-divider"></div>

          <div class="sidebar-section flex-section">
            <div class="section-label">分类目录</div>
            <CategoryTree
              :treeData="filteredCategoryTree"
              :selectedDatasetId="selectedDatasetId"
              :expandedIds="expandedIds"
              @select="handleDatasetSelect"
              @toggle="handleToggle"
            />
          </div>
        </div>
      </aside>

      <main class="main-content">
        <div v-if="!selectedDataset || !canViewCurrentDataset" class="access-restricted">
          <template v-if="selectedDataset && !canViewCurrentDataset">
            <ShieldAlert :size="64" class="restricted-icon" />
            <h2>访问受限</h2>
            <p class="restricted-reason">{{ accessDeniedReason }}</p>
            <div class="restricted-info">
              <div class="ri-row">
                <span class="ri-label">数据集</span>
                <span class="ri-value">{{ selectedDataset.name }}</span>
              </div>
              <div class="ri-row">
                <span class="ri-label">敏感度</span>
                <span class="ri-value">
                  <span class="s-dot" :style="{ background: currentSensitivityColor }"></span>
                  {{ currentSensitivityLabel }}
                </span>
              </div>
              <div class="ri-row">
                <span class="ri-label">所属团队</span>
                <span class="ri-value">{{ getTeamName(selectedDataset.id) }}</span>
              </div>
            </div>
            <button class="btn request-access-btn" @click="openApprovalTab">
              <FilePlus :size="16" /> 申请访问权限
            </button>
          </template>
          <template v-else>
            <Database :size="64" class="empty-icon" />
            <h2>选择一个数据集</h2>
            <p>从左侧分类树中选择数据集，或使用搜索功能查找</p>
            <div class="quick-stats">
              <div class="qs-item">
                <span class="qs-num">{{ totalDatasets }}</span>
                <span class="qs-label">数据集</span>
              </div>
              <div class="qs-item">
                <span class="qs-num">{{ Object.keys(teams).length }}</span>
                <span class="qs-label">团队</span>
              </div>
              <div class="qs-item">
                <span class="qs-num">{{ fieldLineage.edges.length }}</span>
                <span class="qs-label">血缘边</span>
              </div>
            </div>
          </template>
        </div>

        <div v-else class="detail-container">
          <div class="detail-toolbar">
            <div class="dt-left">
              <h1 class="dataset-title">
                {{ selectedDataset.name }}
                <span class="sensitivity-badge" :style="{ background: currentSensitivityColor + '22', color: currentSensitivityColor }">
                  {{ currentSensitivityLabel }}
                </span>
                <span class="team-badge" :style="{ background: currentTeam?.color + '22', color: currentTeam?.color }">
                  <Users :size="12" />
                  {{ currentTeam?.name }}
                </span>
              </h1>
              <p class="dataset-desc">{{ selectedDataset.description }}</p>
            </div>
            <div class="dt-right">
              <button v-if="currentDatasetScore" class="btn ghost score-btn" @click="openQualityTab">
                <Star :size="14" :style="{ color: qualityScoreService.getScoreColor(currentDatasetScore.overall) }" />
                {{ currentDatasetScore.overall }} 分
              </button>
              <button v-if="!isSubscribedToCurrentDataset" class="btn ghost" @click="handleSubscribeDataset">
                <BellRing :size="14" /> 订阅变更
              </button>
              <button v-else class="btn ghost" @click="handleUnsubscribeDataset">
                <BellOff :size="14" /> 取消订阅
              </button>
              <button class="btn ghost" @click="handleExportDataset">
                <Download :size="14" /> 导出
              </button>
              <button v-if="currentTab !== 'approvals'" class="btn primary" @click="openApprovalTab">
                <FileCheck :size="14" /> 审批 ({{ pendingApprovalCount }})
              </button>
            </div>
          </div>

          <div class="tab-bar">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="tab-item"
              :class="{ active: currentTab === tab.key }"
              @click="currentTab = tab.key"
            >
              <component :is="tab.icon" :size="15" />
              <span>{{ tab.label }}</span>
              <span v-if="tab.badge" class="tab-badge-inner">{{ tab.badge }}</span>
            </button>
          </div>

          <div class="tab-content">
            <div v-if="currentTab === 'info'" class="tab-pane">
              <DatasetPreview
                :dataset="enrichedDataset"
                :highlightKeyword="effectiveQuery"
              />
            </div>

            <div v-if="currentTab === 'quality'" class="tab-pane">
              <QualityScoreCard
                v-if="selectedDatasetId"
                :datasetId="selectedDatasetId"
                :showTrend="true"
                :showFieldMetrics="true"
              />
            </div>

            <div v-if="currentTab === 'lineage'" class="tab-pane full-height">
              <LineageGraph
                :currentDatasetId="selectedDatasetId"
                @selectDataset="handleDatasetSelect"
              />
            </div>

            <div v-if="currentTab === 'approvals'" class="tab-pane full-height">
              <ApprovalPanel
                @approved="onApprovalChanged"
                @rejected="onApprovalChanged"
                @submitted="onApprovalChanged"
              />
            </div>

            <div v-if="currentTab === 'export'" class="tab-pane">
              <div class="export-panel">
                <div class="export-title">
                  <Rocket :size="20" />
                  <span>OpenLineage 元数据导出</span>
                </div>

                <div class="export-section">
                  <h3>当前数据集导出</h3>
                  <p class="section-desc">导出「{{ selectedDataset.name }}」的元数据（包含 Schema、所有权、安全等级等 facets）</p>
                  <div class="export-actions">
                    <button class="btn primary" @click="exportSingleJSON">
                      <FileJson :size="14" /> JSON 格式
                    </button>
                  </div>
                </div>

                <div class="export-section">
                  <h3>关联血缘导出</h3>
                  <p class="section-desc">导出当前数据集及所有具有血缘关联的数据集元数据和转换任务</p>
                  <div class="export-actions">
                    <button class="btn primary" @click="exportLineageJSON">
                      <GitBranch :size="14" /> JSON（含血缘）
                    </button>
                    <button class="btn ghost" @click="exportLineageNDJSON">
                      <Terminal :size="14" /> NDJSON（行分隔）
                    </button>
                  </div>
                </div>

                <div class="export-section">
                  <h3>全量目录导出</h3>
                  <p class="section-desc">导出全部 {{ totalDatasets }} 个数据集及其血缘关系（{{ fieldLineage.edges.length }} 条血缘边）</p>
                  <div class="export-actions">
                    <button class="btn primary" @click="exportFullCatalogJSON">
                      <Database :size="14" /> 全量 JSON
                    </button>
                    <button class="btn ghost" @click="exportFullCatalogNDJSON">
                      <Layers :size="14" /> 全量 NDJSON
                    </button>
                  </div>
                </div>

                <div class="export-section stats">
                  <h3>导出统计信息</h3>
                  <div class="stats-grid">
                    <div v-for="(v, k) in catalogStats" :key="k" class="stat-item">
                      <span class="stat-label">{{ getStatLabel(k) }}</span>
                      <span class="stat-value">{{ formatStatValue(v, k) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Teleport to="body">
        <Transition name="slide">
          <div v-if="showNotificationPanel" class="global-panel notification-panel-wrapper">
            <div class="panel-header-bar">
              <span class="panel-header-title">通知中心</span>
              <button class="panel-close-btn" @click="showNotificationPanel = false">
                <X :size="18" />
              </button>
            </div>
            <NotificationPanel @selectDataset="handleNotificationSelectDataset" />
          </div>
        </Transition>
      </Teleport>

      <Teleport to="body">
        <Transition name="slide">
          <div v-if="showImportPanel" class="global-panel import-panel-wrapper">
            <div class="panel-header-bar">
              <span class="panel-header-title">批量元数据导入</span>
              <button class="panel-close-btn" @click="showImportPanel = false">
                <X :size="18" />
              </button>
            </div>
            <ImportPanel />
          </div>
        </Transition>
      </Teleport>

      <Teleport to="body">
        <Transition name="fade">
          <div v-if="showNotificationPanel || showImportPanel" class="overlay-backdrop" @click="showNotificationPanel = false; showImportPanel = false"></div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, markRaw } from 'vue'
import {
  Database,
  Search,
  X,
  FolderTree,
  ChevronsDown,
  ChevronsUp,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Users,
  ShieldAlert,
  FilePlus,
  FileCheck,
  Download,
  Rocket,
  FileJson,
  GitBranch,
  Terminal,
  Layers,
  Lock,
  Wand2,
  SearchX,
  Tag,
  Clock,
  Table as TableIcon,
  Bell,
  Star,
  Upload,
  ArrowUpDown,
  Plus,
  BellRing,
  BellOff
} from 'lucide-vue-next'

import {
  categoryTree as rawCategoryTree,
  datasets,
  teams,
  users,
  datasetTeamMapping,
  sensitivityLevels,
  fieldLineage
} from './data/mockData'

import CategoryTree from './components/CategoryTree.vue'
import DatasetPreview from './components/DatasetPreview.vue'
import LineageGraph from './components/LineageGraph.vue'
import ApprovalPanel from './components/ApprovalPanel.vue'
import NotificationPanel from './components/NotificationPanel.vue'
import QualityScoreCard from './components/QualityScoreCard.vue'
import ImportPanel from './components/ImportPanel.vue'

import { searchEngine, highlightText } from './utils/searchEngine'
import { permissionService } from './utils/permissionService'
import { subscriptionService } from './utils/subscriptionService'
import { qualityScoreService } from './utils/qualityScoreService'
import { importService } from './utils/importService'
import {
  exportDatasetToOpenLineage,
  exportLineageToOpenLineage,
  exportFullCatalog,
  downloadJSON,
  downloadNDJSON,
  generateOpenLineageDatasetStats
} from './utils/openlineageExporter'

const currentUserId = ref('u-022')
const selectedDatasetId = ref('')
const expandedIds = ref(new Set(['1', '2']))
const isSidebarCollapsed = ref(false)
const currentTab = ref('info')
const searchFocused = ref(false)
const showSearchResults = ref(false)
const searchText = ref('')
const searchSuggestion = ref('')
const selectedTeamId = ref('all')
const selectedSensitivity = ref('')
const sortBy = ref('overall')
const sortOrder = ref('desc')
const showNotificationPanel = ref(false)
const showImportPanel = ref(false)

watch(currentUserId, (uid) => {
  permissionService.switchUser(uid)
  subscriptionService.switchUser(uid)
  importService.switchUser(uid)
})

const tabs = computed(() => [
  { key: 'info', label: '基础信息', icon: markRaw(TableIcon) },
  { key: 'quality', label: '质量评分', icon: markRaw(Star), badge: getDatasetOverallScore(selectedDatasetId.value) || null },
  { key: 'lineage', label: '血缘关系图', icon: markRaw(GitBranch) },
  { key: 'approvals', label: '审批管理', icon: markRaw(FileCheck), badge: pendingApprovalCount.value || null },
  { key: 'export', label: 'OpenLineage 导出', icon: markRaw(Rocket) }
])

const userOptions = computed(() =>
  Object.values(users).map(u => ({
    id: u.id,
    name: u.name,
    roleLabel: u.role === 'team_manager' ? '团队负责人' :
      u.role === 'admin' ? '系统管理员' :
        u.role === 'analyst' ? '分析师' : '工程师'
  }))
)

const teamOptions = computed(() =>
  Object.values(teams).map(t => ({
    id: t.id,
    name: t.name,
    color: t.color
  }))
)

const sensitivityOptions = computed(() =>
  Object.entries(sensitivityLevels).map(([key, info]) => ({
    key,
    label: info.label,
    color: info.color
  }))
)

const selectedDataset = computed(() => {
  if (!selectedDatasetId.value) return null
  return datasets[selectedDatasetId.value] || null
})

const enrichedDataset = computed(() => {
  if (!selectedDataset.value) return null
  const ds = JSON.parse(JSON.stringify(selectedDataset.value))
  const fields = permissionService.getVisibleFields(ds.id, ds.fields)
  ds.fields = fields.map(f => {
    if (f.masked) {
      return { ...f, sample: '*** 未授权 ***', description: f.description + '（字段受权限控制，请申请访问）' }
    }
    return f
  })
  return ds
})

const canViewCurrentDataset = computed(() => {
  if (!selectedDatasetId.value) return true
  return permissionService.canViewDataset(selectedDatasetId.value).allowed
})

const accessDeniedReason = computed(() => {
  if (!selectedDatasetId.value) return ''
  const access = permissionService.canViewDataset(selectedDatasetId.value)
  if (access.reason === 'restricted-no-access') {
    return '该数据集属于受限级别，您不在授权团队中且没有有效的访问审批。'
  }
  if (access.reason === 'approval-required') {
    return '该数据集属于机密级别，需要向所有者团队提交访问申请。'
  }
  return '您没有权限访问此数据集。'
})

const currentSensitivityColor = computed(() => {
  if (!selectedDatasetId.value) return '#9ca3af'
  const mapping = datasetTeamMapping[selectedDatasetId.value]
  if (!mapping) return '#9ca3af'
  return sensitivityLevels[mapping.sensitivityLevel]?.color || '#9ca3af'
})

const currentSensitivityLabel = computed(() => {
  if (!selectedDatasetId.value) return ''
  const mapping = datasetTeamMapping[selectedDatasetId.value]
  if (!mapping) return ''
  return sensitivityLevels[mapping.sensitivityLevel]?.label || ''
})

const currentTeam = computed(() => {
  if (!selectedDatasetId.value) return null
  const mapping = datasetTeamMapping[selectedDatasetId.value]
  if (!mapping) return null
  return teams[mapping.teamId] || null
})

const pendingApprovalCount = computed(() =>
  permissionService.getPendingApprovals().length
)

const totalDatasets = computed(() => Object.keys(datasets).length)

const catalogStats = computed(() => generateOpenLineageDatasetStats())

const fuzzyResults = ref([])

const effectiveQuery = computed(() => searchSuggestion.value || searchText.value)

const filteredFuzzyResults = computed(() => {
  let results = fuzzyResults.value
  if (sensitivityFilter.value) {
    results = results.filter(r => {
      const mapping = datasetTeamMapping[r.item.id]
      return mapping?.sensitivityLevel === sensitivityFilter.value
    })
  }
  if (selectedTeamId.value !== 'all') {
    results = results.filter(r => {
      const mapping = datasetTeamMapping[r.item.id]
      return mapping?.teamId === selectedTeamId.value
    })
  }
  return results
})

const searchStats = computed(() => {
  if (!searchText.value || fuzzyResults.value.length === 0) return ''
  return `~${fuzzyResults.value.length} 条结果`
})

const sensitivityFilter = ref('')

const filteredCategoryTree = computed(() => {
  if (selectedTeamId.value === 'all' && !selectedSensitivity.value) {
    return rawCategoryTree
  }
  const filterNode = (nodes) => {
    const result = []
    nodes.forEach(node => {
      if (node.datasetId) {
        const mapping = datasetTeamMapping[node.datasetId]
        const teamMatch = selectedTeamId.value === 'all' || mapping?.teamId === selectedTeamId.value
        const sensMatch = !selectedSensitivity.value || mapping?.sensitivityLevel === selectedSensitivity.value
        if (teamMatch && sensMatch) result.push({ ...node })
      } else if (node.children) {
        const filteredChildren = filterNode(node.children)
        if (filteredChildren.length > 0) {
          result.push({ ...node, children: filteredChildren })
        }
      }
    })
    return result
  }
  return filterNode(rawCategoryTree)
})

const visibleDatasetCount = computed(() => {
  let count = 0
  const walk = (nodes) => {
    nodes.forEach(n => {
      if (n.datasetId) count++
      else walk(n.children || [])
    })
  }
  walk(filteredCategoryTree.value)
  return count
})

function onUserSwitch(uid) {
  permissionService.switchUser(uid)
}

function toggleSensitivityFilter(key) {
  sensitivityFilter.value = sensitivityFilter.value === key ? '' : key
}

function toggleSensitivity(key) {
  selectedSensitivity.value = selectedSensitivity.value === key ? '' : key
}

function getSensitivityCount(level) {
  return Object.values(datasetTeamMapping).filter(m => m.sensitivityLevel === level).length
}

function getSensitivityColor(datasetId) {
  const mapping = datasetTeamMapping[datasetId]
  if (!mapping) return '#9ca3af'
  return sensitivityLevels[mapping.sensitivityLevel]?.color || '#9ca3af'
}

function getTeamName(datasetId) {
  const mapping = datasetTeamMapping[datasetId]
  if (!mapping) return '未分配'
  return teams[mapping.teamId]?.name || '未知团队'
}

function isDatasetLocked(datasetId) {
  return !permissionService.canViewDataset(datasetId).allowed
}

function getAllNodeIds(nodes) {
  const ids = []
  const traverse = (nodeList) => {
    nodeList.forEach(node => {
      if (node.children && node.children.length > 0) {
        ids.push(node.id)
        traverse(node.children)
      }
    })
  }
  traverse(nodes)
  return ids
}

function handleDatasetSelect(datasetId) {
  selectedDatasetId.value = datasetId
  currentTab.value = 'info'
  showSearchResults.value = false
}

function handleToggle(nodeId) {
  const newExpandedIds = new Set(expandedIds.value)
  if (newExpandedIds.has(nodeId)) {
    newExpandedIds.delete(nodeId)
  } else {
    newExpandedIds.add(nodeId)
  }
  expandedIds.value = newExpandedIds
}

function expandAll() {
  const allIds = getAllNodeIds(rawCategoryTree)
  expandedIds.value = new Set(allIds)
}

function collapseAll() {
  expandedIds.value = new Set()
}

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

function handleFuseSearch() {
  showSearchResults.value = true
  const query = searchText.value.trim()
  if (!query) {
    fuzzyResults.value = []
    searchSuggestion.value = ''
    return
  }

  const filterFn = (item) => {
    if (selectedTeamId.value !== 'all') {
      const mapping = datasetTeamMapping[item.id]
      if (mapping?.teamId !== selectedTeamId.value) return false
    }
    return true
  }

  const result = searchEngine.search(query, { filterFn })
  fuzzyResults.value = result.results
  searchSuggestion.value = result.suggestion || ''
}

function applySuggestion() {
  if (!searchSuggestion.value) return
  searchText.value = searchSuggestion.value
  handleFuseSearch()
}

function handleSearchConfirm() {
  if (searchSuggestion.value) {
    applySuggestion()
  }
}

function clearSearch() {
  searchText.value = ''
  fuzzyResults.value = []
  searchSuggestion.value = ''
  showSearchResults.value = false
}

function openApprovalTab() {
  currentTab.value = 'approvals'
}

function onApprovalChanged() {}

function getRelatedDatasetIds() {
  if (!selectedDatasetId.value) return []
  const ids = new Set([selectedDatasetId.value])
  fieldLineage.edges.forEach(e => {
    if (e.sourceDataset === selectedDatasetId.value) ids.add(e.targetDataset)
    if (e.targetDataset === selectedDatasetId.value) ids.add(e.sourceDataset)
  })
  return Array.from(ids)
}

function handleExportDataset() {
  currentTab.value = 'export'
}

function exportSingleJSON() {
  if (!selectedDatasetId.value) return
  const data = exportDatasetToOpenLineage(selectedDatasetId.value)
  downloadJSON(data, `openlineage-${selectedDatasetId.value}.json`)
}

function exportLineageJSON() {
  const ids = getRelatedDatasetIds()
  const data = exportLineageToOpenLineage(ids)
  downloadJSON(data, `openlineage-lineage-${selectedDatasetId.value}.json`)
}

function exportLineageNDJSON() {
  const ids = getRelatedDatasetIds()
  const data = exportLineageToOpenLineage(ids)
  downloadNDJSON(data, `openlineage-lineage-${selectedDatasetId.value}.ndjson`)
}

function exportFullCatalogJSON() {
  const data = exportFullCatalog()
  downloadJSON(data, 'openlineage-full-catalog.json')
}

function exportFullCatalogNDJSON() {
  const data = exportFullCatalog()
  downloadNDJSON(data, 'openlineage-full-catalog.ndjson')
}

const statLabels = {
  totalDatasets: '数据集总数',
  totalFields: '字段总数',
  totalLineageEdges: '血缘边数',
  teams: '团队数',
  sensitivityBreakdown: '敏感度分布',
  namespaceBreakdown: '存储分布'
}

function getStatLabel(key) {
  return statLabels[key] || key
}

function formatStatValue(v, key) {
  if (typeof v === 'object') {
    return Object.entries(v).map(([k, val]) => `${k}: ${val}`).join('  |  ')
  }
  return String(v)
}

watch(searchFocused, (focused) => {
  if (focused && searchText.value) {
    showSearchResults.value = true
    handleFuseSearch()
  }
})

const unreadNotificationCount = computed(() =>
  subscriptionService.getUnreadCount()
)

const isSubscribedToCurrentDataset = computed(() =>
  selectedDatasetId.value ? subscriptionService.isSubscribed(selectedDatasetId.value) : false
)

const currentDatasetScore = computed(() =>
  selectedDatasetId.value ? qualityScoreService.getDatasetScore(selectedDatasetId.value) : null
)

const sortOptions = computed(() => qualityScoreService.getSortOptions())

function getDatasetOverallScore(datasetId) {
  if (!datasetId) return null
  const score = qualityScoreService.getDatasetScore(datasetId)
  return score.overall
}

function handleSortChange(key) {
  qualityScoreService.setSortBy(key)
  sortBy.value = qualityScoreService.sortBy
  sortOrder.value = qualityScoreService.sortOrder
}

function handleSubscribeDataset() {
  if (!selectedDatasetId.value) return
  const result = subscriptionService.subscribe(selectedDatasetId.value)
  if (result.success) {
    alert(result.isNew ? '订阅成功！' : '已更新订阅设置')
  }
}

function handleUnsubscribeDataset() {
  if (!selectedDatasetId.value) return
  if (confirm('确定要取消订阅此数据集吗？')) {
    subscriptionService.unsubscribe(selectedDatasetId.value)
  }
}

function toggleNotificationPanel() {
  showNotificationPanel.value = !showNotificationPanel.value
  showImportPanel.value = false
}

function toggleImportPanel() {
  showImportPanel.value = !showImportPanel.value
  showNotificationPanel.value = false
}

function handleNotificationSelectDataset(datasetId) {
  selectedDatasetId.value = datasetId
  showNotificationPanel.value = false
  currentTab.value = 'info'
}

function openQualityTab() {
  currentTab.value = 'quality'
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: #f3f4f6;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 10px 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  z-index: 20;
}

.header-left { flex-shrink: 0; }
.logo { display: flex; align-items: center; gap: 8px; }
.logo svg { color: #3b82f6; }
.logo-text {
  font-size: 17px;
  font-weight: 700;
  color: #1f2937;
}

.header-center {
  flex: 1;
  max-width: 760px;
  position: relative;
}

.search-bar-container {
  position: relative;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 12px;
  transition: all 0.2s ease;
}

.search-input-wrapper.has-focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.search-icon { color: #9ca3af; flex-shrink: 0; }

.search-input {
  flex: 1;
  padding: 9px 0;
  border: none;
  outline: none;
  font-size: 13px;
  background: transparent;
}

.search-input::placeholder { color: #9ca3af; }

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
}

.clear-btn:hover { background: #f3f4f6; color: #6b7280; }

.search-stats {
  font-size: 11px;
  color: #9ca3af;
  padding: 2px 8px;
  background: #f3f4f6;
  border-radius: 10px;
}

.search-suggestion {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #fef3c7, #fef9c3);
  border: 1px solid #fde68a;
  border-radius: 8px;
  font-size: 13px;
  color: #92400e;
  z-index: 30;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(180, 83, 9, 0.1);
}

.search-suggestion strong { color: #b45309; font-weight: 600; margin-left: 4px; }

.fuzzy-results {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  z-index: 25;
  overflow: hidden;
  max-height: 480px;
}

.fuzzy-results.empty {
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #9ca3af;
  gap: 8px;
}

.fuzzy-results.empty p { margin: 0; font-size: 13px; }
.fuzzy-results.empty .hint { color: #d1d5db; font-size: 12px; }

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #f3f4f6;
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.filter-chips { display: flex; gap: 4px; }

.filter-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border: none;
  background: white;
  border-radius: 12px;
  font-size: 11px;
  color: #6b7280;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  transition: all 0.15s;
}

.filter-chip:hover { background: #f3f4f6; }

.filter-chip.active {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #2563eb;
}

.chip-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.results-scroll {
  max-height: 380px;
  overflow-y: auto;
}

.result-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #fafafa;
}

.result-row:last-child { border-bottom: none; }
.result-row:hover { background: #f9fafb; }
.result-row.active { background: #eff6ff; }

.result-left {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
}

.result-db-icon {
  color: #9ca3af;
  flex-shrink: 0;
  margin-top: 2px;
}

.result-texts { flex: 1; min-width: 0; }

.result-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 11px;
  color: #9ca3af;
}

.sensitivity-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.team-name { color: #6b7280; }

.result-tags {
  display: flex;
  align-items: center;
  gap: 4px;
}

.result-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  margin-left: 12px;
}

.matched-fields-hint {
  font-size: 11px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
}

.field-name-list {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  color: #4b5563;
  font-weight: 500;
  margin-left: 3px;
}

.lock-icon { color: #ef4444; flex-shrink: 0; }

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.user-switcher {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f9fafb;
  border-radius: 6px;
  color: #4b5563;
}

.user-switcher svg { color: #6b7280; flex-shrink: 0; }

.user-select {
  border: none;
  background: transparent;
  outline: none;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  font-weight: 500;
  max-width: 160px;
}

.dataset-count {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  padding: 6px 12px;
  background-color: #f9fafb;
  border-radius: 20px;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 300px;
  background-color: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
}

.sidebar.is-collapsed { width: 48px; }

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}

.sidebar.is-collapsed .sidebar-header { justify-content: center; }

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.sidebar.is-collapsed .sidebar-title span { display: none; }

.sidebar-actions { display: flex; align-items: center; gap: 4px; }

.sidebar.is-collapsed .sidebar-actions .action-btn:not(:last-child) { display: none; }

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.action-btn:hover { background-color: #f3f4f6; color: #374151; }

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 12px;
}

.sidebar-section { display: flex; flex-direction: column; gap: 8px; }
.sidebar-section.flex-section { flex: 1; min-height: 0; overflow: hidden; }

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 4px;
}

.team-filter-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.team-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 14px;
  font-size: 11px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.team-chip:hover { background: #f3f4f6; }

.team-chip.active {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #2563eb;
  font-weight: 500;
}

.sidebar-divider {
  height: 1px;
  background: #f3f4f6;
  margin: 4px 0;
}

.sensitivity-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sensitivity-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 12px;
}

.sensitivity-item:hover { background: #f9fafb; }

.sensitivity-item.active { background: #f3f4f6; }
.sensitivity-item.muted { opacity: 0.5; }

.s-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.s-label { flex: 1; color: #4b5563; font-weight: 500; }

.s-count {
  font-size: 11px;
  color: #9ca3af;
  background: white;
  padding: 1px 7px;
  border-radius: 10px;
}

.sidebar-content::-webkit-scrollbar { width: 6px; }
.sidebar-content::-webkit-scrollbar-track { background: transparent; }
.sidebar-content::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 3px;
}

.main-content {
  flex: 1;
  overflow: hidden;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
}

.access-restricted {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  color: #6b7280;
}

.restricted-icon { color: #ef4444; margin-bottom: 16px; opacity: 0.8; }
.empty-icon { color: #d1d5db; margin-bottom: 16px; }

.access-restricted h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.restricted-reason {
  margin: 0 0 24px 0;
  font-size: 14px;
  line-height: 1.6;
  max-width: 500px;
}

.restricted-info {
  background: #fafafa;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  padding: 14px 20px;
  margin-bottom: 24px;
  min-width: 320px;
}

.ri-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dashed #f3f4f6;
  font-size: 13px;
  align-items: center;
}

.ri-row:last-child { border-bottom: none; }

.ri-label { color: #9ca3af; }

.ri-value {
  color: #374151;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.request-access-btn {
  background: #2563eb;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}

.request-access-btn:hover { background: #1d4ed8; }

.quick-stats {
  display: flex;
  gap: 40px;
  margin-top: 30px;
}

.qs-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.qs-num {
  font-size: 28px;
  font-weight: 700;
  color: #2563eb;
}

.qs-label { font-size: 12px; color: #9ca3af; }

.detail-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 18px 24px 14px;
  border-bottom: 1px solid #f3f4f6;
  gap: 16px;
}

.dataset-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0;
  flex-wrap: wrap;
}

.sensitivity-badge,
.team-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.dataset-desc {
  margin: 8px 0 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #6b7280;
  max-width: 700px;
}

.dt-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.btn.primary { background: #2563eb; color: white; }
.btn.primary:hover { background: #1d4ed8; }

.btn.ghost {
  background: white;
  color: #4b5563;
  border: 1px solid #d1d5db;
}
.btn.ghost:hover { background: #f9fafb; }

.tab-bar {
  display: flex;
  gap: 4px;
  padding: 0 24px;
  border-bottom: 1px solid #f3f4f6;
  background: #fafbfc;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-item:hover {
  color: #374151;
  background: rgba(0, 0, 0, 0.02);
}

.tab-item.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  font-weight: 600;
}

.tab-badge-inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9px;
  background: #fef3c7;
  color: #b45309;
  font-size: 11px;
  font-weight: 600;
}

.tab-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-pane {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.tab-pane.full-height {
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
}

.export-panel {
  padding: 24px;
  max-width: 780px;
  margin: 0 auto;
}

.export-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 24px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f3f4f6;
}

.export-section {
  padding: 18px 20px;
  background: #fafbfc;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  margin-bottom: 14px;
}

.export-section h3 {
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.section-desc {
  margin: 0 0 14px 0;
  font-size: 12px;
  color: #6b7280;
}

.export-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.export-section.stats {
  background: white;
  border: 1px solid #e5e7eb;
}

.export-section.stats h3 { margin-bottom: 12px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 6px;
}

.stat-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
}

.stat-value {
  font-size: 13px;
  color: #1f2937;
  font-weight: 600;
  word-break: break-all;
}

:deep(.search-highlight) {
  background: #fef08a;
  color: #854d0e;
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 500;
}

.empty-hint {
  color: #9ca3af;
  font-size: 13px;
}

.header-icon-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: #f3f4f6;
  color: #4b5563;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.header-icon-btn:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.notification-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sort-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sort-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #6b7280;
  transition: all 0.15s;
}

.sort-item:hover {
  background: #f3f4f6;
  color: #374151;
}

.sort-item.active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 500;
}

.sort-order {
  margin-left: auto;
  font-weight: 600;
}

.score-btn {
  gap: 6px;
}

.global-panel {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 480px;
  max-width: 100vw;
  background: var(--bg-primary);
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.15);
  z-index: 1002;
  display: flex;
  flex-direction: column;
}

.panel-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.panel-header-title {
  font-weight: 600;
  font-size: 16px;
  color: var(--text-primary);
}

.panel-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.panel-close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.overlay-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.notification-panel-wrapper :deep(.notification-panel),
.import-panel-wrapper :deep(.import-panel) {
  height: 100%;
  border-radius: 0;
}
</style>
