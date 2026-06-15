<template>
  <div class="lifecycle-panel">
    <div class="panel-header">
      <div class="header-title">
        <Archive :size="20" />
        <span>生命周期管理</span>
      </div>
      <div class="header-actions">
        <button class="btn ghost" @click="handleScan">
          <Scan :size="14" /> 扫描待归档
        </button>
        <button v-if="archiveQueue.length" class="btn ghost" @click="handleBulkArchive">
          <Package :size="14" /> 批量归档 ({{ archiveQueue.length }})
        </button>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-item" v-for="stat in lifecycleStats" :key="stat.key">
        <span class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</span>
        <span class="stat-label">{{ stat.label }}</span>
      </div>
    </div>

    <div class="tab-bar">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab-btn"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >
        {{ t.label }}
        <span v-if="t.count" class="tab-count">{{ t.count }}</span>
      </button>
    </div>

    <div class="panel-content">
      <div v-if="activeTab === 'active'" class="dataset-list">
        <div
          v-for="state in activeDatasets"
          :key="state.datasetId"
          class="dataset-card"
        >
          <div class="card-header">
            <div class="dataset-info">
              <span class="dataset-name">{{ getDatasetName(state.datasetId) }}</span>
              <span class="state-badge active">活跃</span>
            </div>
            <span class="dataset-id">{{ state.datasetId }}</span>
          </div>
          <div class="card-meta">
            <span><Calendar :size="12" /> 创建于 {{ state.createdAt }}</span>
            <span><Clock :size="12" /> 最后访问 {{ state.lastAccessedAt }}</span>
            <span><TrendingUp :size="12" /> 30天访问 {{ state.accessCount30d }}</span>
          </div>
          <div class="card-policy">
            <span class="policy-label">保留策略:</span>
            <span class="policy-value">{{ getPolicyInfo(state.retentionPolicy).label }}</span>
            <span class="policy-desc">{{ getPolicyInfo(state.retentionPolicy).description }}</span>
          </div>
          <div class="card-risk" v-if="lifecycleService.shouldArchive(state.datasetId)">
            <AlertTriangle :size="14" style="color: #ef4444;" />
            <span class="risk-text">已达到归档条件，建议归档</span>
          </div>
          <div class="card-actions">
            <button class="btn small ghost" @click="handleChangePolicy(state)">
              <Settings :size="12" /> 调整策略
            </button>
            <button class="btn small" @click="handleAddToQueue(state.datasetId)">
              <Plus :size="12" /> 加入归档队列
            </button>
            <button class="btn small" @click="handleArchive(state)">
              <Archive :size="12" /> 立即归档
            </button>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'archived'" class="dataset-list">
        <div
          v-for="state in archivedDatasets"
          :key="state.datasetId"
          class="dataset-card archived"
        >
          <div class="card-header">
            <div class="dataset-info">
              <span class="dataset-name">{{ getDatasetName(state.datasetId) }}</span>
              <span class="state-badge archived">已归档</span>
            </div>
            <span class="dataset-id">{{ state.datasetId }}</span>
          </div>
          <div class="card-meta">
            <span><Calendar :size="12" /> 归档于 {{ state.archivedAt }}</span>
            <span><User :size="12" /> 负责人 {{ getOwnerName(state.ownerId) }}</span>
          </div>
          <div class="card-reason" v-if="state.archiveReason">
            <FileText :size="14" /> {{ state.archiveReason }}
          </div>
          <div class="card-actions">
            <button class="btn small primary" @click="handleRestore(state)">
              <RotateCcw :size="12" /> 恢复
            </button>
            <button class="btn small ghost" @click="handleView(state.datasetId)">
              <Eye :size="12" /> 查看元数据
            </button>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'deprecated'" class="dataset-list">
        <div
          v-for="state in deprecatedDatasets"
          :key="state.datasetId"
          class="dataset-card deprecated"
        >
          <div class="card-header">
            <div class="dataset-info">
              <span class="dataset-name">{{ getDatasetName(state.datasetId) }}</span>
              <span class="state-badge deprecated">已废弃</span>
            </div>
            <span class="dataset-id">{{ state.datasetId }}</span>
          </div>
          <div class="card-meta">
            <span><Calendar :size="12" /> 废弃于 {{ state.deprecatedAt }}</span>
            <span v-if="state.successorDatasetId">
              <ArrowRight :size="12" /> 替代数据集: {{ state.successorDatasetId }}
            </span>
          </div>
          <div class="card-reason" v-if="state.deprecationNote">
            <AlertCircle :size="14" /> {{ state.deprecationNote }}
          </div>
          <div class="card-actions">
            <button class="btn small" @click="handleRestore(state)">
              <RotateCcw :size="12" /> 恢复
            </button>
            <button class="btn small ghost" @click="handleViewSuccessor(state.successorDatasetId)" v-if="state.successorDatasetId">
              <ExternalLink :size="12" /> 查看替代
            </button>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'candidates'" class="candidates-section">
        <div v-if="candidates.length === 0" class="empty-state">
          <CheckCircle :size="48" />
          <p>所有活跃数据集均正常，暂无待归档项</p>
        </div>
        <div v-else class="dataset-list">
          <div
            v-for="state in candidates"
            :key="state.datasetId"
            class="dataset-card candidate"
          >
            <div class="card-header">
              <div class="dataset-info">
                <span class="dataset-name">{{ getDatasetName(state.datasetId) }}</span>
                <span class="risk-badge" :class="state.riskLevel">
                  {{ getRiskLabel(state.riskLevel) }}风险
                </span>
              </div>
              <span class="days-info">{{ state.daysSinceLastAccess }} 天未访问</span>
            </div>
            <div class="card-meta">
              <span><Clock :size="12" /> 最后访问 {{ state.lastAccessedAt }}</span>
              <span><TrendingDown :size="12" /> 30天访问 {{ state.accessCount30d }}</span>
            </div>
            <div class="card-actions">
              <label class="checkbox-label">
                <input type="checkbox" :checked="isInQueue(state.datasetId)" @change="toggleQueue(state.datasetId)" />
                <span>加入归档</span>
              </label>
              <button class="btn small ghost" @click="handleView(state.datasetId)">
                <Eye :size="12" /> 查看
              </button>
              <button class="btn small" @click="handleArchive(state)">
                <Archive :size="12" /> 立即归档
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Archive, Scan, Package, Calendar, Clock, TrendingUp, TrendingDown,
  AlertTriangle, Settings, Plus, RotateCcw, Eye, FileText, AlertCircle,
  CheckCircle, ArrowRight, ExternalLink, User
} from 'lucide-vue-next'
import { lifecycleService } from '../utils/lifecycleService.js'
import { datasets, users } from '../data/mockData.js'

const emit = defineEmits(['close', 'selectDataset'])

const activeTab = ref('candidates')
const archiveQueue = computed(() => lifecycleService.archiveQueue)

const allStates = computed(() => lifecycleService.lifecycleStates)

const activeDatasets = computed(() =>
  allStates.value.filter(s => s.currentState === 'active')
)

const archivedDatasets = computed(() =>
  allStates.value.filter(s => s.currentState === 'archived')
)

const deprecatedDatasets = computed(() =>
  allStates.value.filter(s => s.currentState === 'deprecated')
)

const candidates = computed(() =>
  lifecycleService.findCandidatesForArchive()
)

const stats = computed(() => lifecycleService.getLifecycleStats())

const lifecycleStats = computed(() => [
  { key: 'total', label: '数据集总数', value: stats.value.total, color: '#3b82f6' },
  { key: 'active', label: '活跃', value: stats.value.active, color: '#10b981' },
  { key: 'archived', label: '已归档', value: stats.value.archived, color: '#6b7280' },
  { key: 'deprecated', label: '已废弃', value: stats.value.deprecated, color: '#ef4444' },
  { key: 'candidates', label: '待归档', value: candidates.value.length, color: '#f59e0b' }
])

const tabs = computed(() => [
  { key: 'candidates', label: '待归档扫描', count: candidates.value.length },
  { key: 'active', label: '活跃数据集', count: activeDatasets.value.length },
  { key: 'archived', label: '已归档', count: archivedDatasets.value.length },
  { key: 'deprecated', label: '已废弃', count: deprecatedDatasets.value.length }
])

function getDatasetName(datasetId) {
  return datasets[datasetId]?.name || datasetId
}

function getOwnerName(ownerId) {
  return users[ownerId]?.name || ownerId
}

function getPolicyInfo(policyKey) {
  return lifecycleService.retentionPolicyMap[policyKey] || { label: policyKey, description: '' }
}

function getRiskLabel(level) {
  return { high: '高', medium: '中', low: '低' }[level] || level
}

function isInQueue(datasetId) {
  return archiveQueue.value.some(q => q.datasetId === datasetId)
}

function toggleQueue(datasetId) {
  if (isInQueue(datasetId)) {
    lifecycleService.removeFromArchiveQueue(datasetId)
  } else {
    lifecycleService.addToArchiveQueue(datasetId)
  }
}

function handleAddToQueue(datasetId) {
  lifecycleService.addToArchiveQueue(datasetId)
}

function handleScan() {
  const found = lifecycleService.findCandidatesForArchive()
  activeTab.value = 'candidates'
  alert(`扫描完成，发现 ${found.length} 个待归档数据集`)
}

function handleBulkArchive() {
  if (!archiveQueue.value.length) return
  if (confirm(`确定要批量归档 ${archiveQueue.value.length} 个数据集吗？`)) {
    const ids = archiveQueue.value.map(q => q.datasetId)
    const results = lifecycleService.bulkArchive(ids, {
      operatorId: 'u-001',
      operatorName: '系统管理员',
      reason: '批量自动归档'
    })
    const successCount = results.filter(r => r.success).length
    alert(`批量归档完成，成功 ${successCount} 个，失败 ${results.length - successCount} 个`)
    results.forEach(r => {
      if (r.success) lifecycleService.removeFromArchiveQueue(r.datasetId)
    })
  }
}

function handleArchive(state) {
  const reason = prompt('请输入归档原因：', '长期未访问，数据已迁移')
  if (reason !== null) {
    lifecycleService.archiveDataset(state.datasetId, {
      operatorId: 'u-001',
      operatorName: '系统管理员',
      reason
    })
  }
}

function handleRestore(state) {
  const reason = prompt('请输入恢复原因：', '业务需要，重新启用')
  if (reason !== null) {
    lifecycleService.restoreDataset(state.datasetId, {
      operatorId: 'u-001',
      operatorName: '系统管理员',
      reason
    })
  }
}

function handleChangePolicy(state) {
  const policies = Object.keys(lifecycleService.retentionPolicyMap)
  const policyLabels = policies.map(p => `${lifecycleService.retentionPolicyMap[p].label} - ${lifecycleService.retentionPolicyMap[p].description}`).join('\n')
  const idxStr = prompt(`请选择保留策略编号:\n${policies.map((p, i) => `${i + 1}. ${lifecycleService.retentionPolicyMap[p].label} - ${lifecycleService.retentionPolicyMap[p].description}`).join('\n')}`, '1')
  const idx = parseInt(idxStr) - 1
  if (!isNaN(idx) && idx >= 0 && idx < policies.length) {
    lifecycleService.updateRetentionPolicy(state.datasetId, policies[idx])
  }
}

function handleView(datasetId) {
  emit('selectDataset', datasetId)
  emit('close')
}

function handleViewSuccessor(successorId) {
  if (successorId) {
    emit('selectDataset', successorId)
    emit('close')
  }
}
</script>

<style scoped>
.lifecycle-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.stats-bar {
  display: flex;
  padding: 16px;
  gap: 24px;
  border-bottom: 1px solid #f3f4f6;
  background: #fafafa;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
}

.tab-btn {
  flex: 1;
  padding: 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.tab-btn.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

.tab-count {
  background: #e5e7eb;
  color: #6b7280;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 11px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.dataset-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dataset-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s;
}

.dataset-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.dataset-card.archived {
  background: #f9fafb;
  border-style: dashed;
}

.dataset-card.deprecated {
  background: #fef2f2;
  border-color: #fecaca;
}

.dataset-card.candidate {
  border-color: #fde68a;
  background: #fffbeb;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.dataset-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dataset-name {
  font-weight: 600;
  font-size: 14px;
}

.dataset-id {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}

.state-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.state-badge.active {
  background: #d1fae5;
  color: #047857;
}

.state-badge.archived {
  background: #e5e7eb;
  color: #374151;
}

.state-badge.deprecated {
  background: #fee2e2;
  color: #b91c1c;
}

.risk-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.risk-badge.high {
  background: #fee2e2;
  color: #dc2626;
}

.risk-badge.medium {
  background: #fef3c7;
  color: #d97706;
}

.risk-badge.low {
  background: #dbeafe;
  color: #2563eb;
}

.days-info {
  font-size: 12px;
  color: #dc2626;
  font-weight: 500;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}

.card-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-policy {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 8px 12px;
  background: #f3f4f6;
  border-radius: 6px;
  margin-bottom: 8px;
}

.policy-label {
  color: #6b7280;
}

.policy-value {
  font-weight: 600;
  color: #374151;
}

.policy-desc {
  color: #9ca3af;
}

.card-risk {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #fef2f2;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 12px;
}

.risk-text {
  color: #b91c1c;
}

.card-reason {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 12px;
  background: #f3f4f6;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #4b5563;
}

.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #4b5563;
  cursor: pointer;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 16px;
  color: #9ca3af;
}
</style>
