<template>
  <div class="federation-panel">
    <div class="panel-header">
      <div class="header-title">
        <Globe :size="20" />
        <span>联邦目录</span>
      </div>
      <div class="header-actions">
        <button class="btn ghost" @click="handleSyncAll" :disabled="syncInProgress">
          <RefreshCw :size="14" :class="{ spinning: syncInProgress }" /> 全部同步
        </button>
        <button class="btn ghost" @click="handleAddInstance">
          <Plus :size="14" /> 添加实例
        </button>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-item" v-for="stat in federationStats" :key="stat.key">
        <span class="stat-value">{{ stat.value }}</span>
        <span class="stat-label">{{ stat.label }}</span>
      </div>
    </div>

    <div class="search-bar">
      <Search :size="16" />
      <input
        v-model="searchKeyword"
        type="text"
        placeholder="搜索联邦数据集..."
        class="search-input"
        @keyup.enter="handleSearch"
      />
      <select v-model="selectedInstance" class="instance-select">
        <option value="">全部实例</option>
        <option v-for="inst in enabledInstances" :key="inst.id" :value="inst.id">
          {{ inst.name }}
        </option>
      </select>
    </div>

    <div class="instances-section">
      <div class="section-title">
        <Server :size="16" />
        <span>实例列表</span>
      </div>
      <div class="instances-grid">
        <div
          v-for="inst in allInstances"
          :key="inst.id"
          class="instance-card"
          :class="{ selected: selectedInstance === inst.id }"
          @click="handleSelectInstance(inst.id)"
        >
          <div class="instance-header">
            <div class="instance-name">{{ inst.name }}</div>
            <div class="instance-status" :style="{ color: getStatusInfo(inst.status).color }">
              <span class="status-dot" :style="{ background: getStatusInfo(inst.status).color }"></span>
              {{ getStatusInfo(inst.status).label }}
            </div>
          </div>
          <div class="instance-meta">
            <span><MapPin :size="12" /> {{ inst.location }}</span>
            <span><Database :size="12" /> {{ inst.datasetCount }} 数据集</span>
          </div>
          <div class="instance-health">
            <div class="health-bar">
              <div class="health-fill" :style="{ width: inst.healthScore + '%', background: getHealthColor(inst.healthScore) }"></div>
            </div>
            <span class="health-score">{{ inst.healthScore }}%</span>
          </div>
          <div class="instance-actions">
            <button v-if="inst.enabled" class="btn tiny ghost" @click.stop="handleSyncInstance(inst.id)">
              <RefreshCw :size="12" /> 同步
            </button>
            <button class="btn tiny ghost" @click.stop="handleToggleInstance(inst)">
              {{ inst.enabled ? '禁用' : '启用' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="datasets-section">
      <div class="section-title">
        <Database :size="16" />
        <span>联邦数据集</span>
        <span class="dataset-count" v-if="federatedDatasets.length">
          {{ federatedDatasets.length }} 个
        </span>
      </div>
      <div class="panel-content">
        <div class="dataset-list">
          <div
            v-for="ds in displayDatasets"
            :key="ds.id"
            class="dataset-card"
          >
            <div class="dataset-header">
              <div class="dataset-info">
                <span class="dataset-name">{{ ds.name }}</span>
                <span class="dataset-badge federated">联邦</span>
                <span v-if="ds.localId" class="dataset-badge mapped">已映射</span>
              </div>
              <span class="dataset-instance">{{ getInstanceName(ds.instanceId) }}</span>
            </div>
            <p class="dataset-description">{{ ds.description }}</p>
            <div class="dataset-fields">
              <span v-for="(f, idx) in ds.fields.slice(0, 3)" :key="idx" class="field-tag">
                {{ f.name }}: {{ f.type }}
              </span>
              <span v-if="ds.fields.length > 3" class="field-more">+{{ ds.fields.length - 3 }}</span>
            </div>
            <div class="dataset-actions">
              <button v-if="!ds.localId" class="btn small primary" @click="handleImport(ds)">
                <Download :size="14" /> 导入本地
              </button>
              <button v-else class="btn small" @click="handleViewLocal(ds.localId)">
                <ExternalLink :size="14" /> 查看本地
              </button>
              <button class="btn small ghost" @click="handleMap(ds)">
                <Link :size="14" /> {{ ds.localId ? '重新映射' : '映射' }}
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
import { Globe, RefreshCw, Plus, Search, Server, MapPin, Database, Download, ExternalLink, Link } from 'lucide-vue-next'
import { federationService } from '../utils/federationService.js'
import { users } from '../data/mockData.js'

const emit = defineEmits(['close', 'selectDataset'])

const searchKeyword = ref('')
const selectedInstance = ref('')
const syncInProgress = computed(() => federationService.syncInProgress.value)

const currentUser = computed(() => users[0])

const allInstances = computed(() => federationService.getAllInstances())
const enabledInstances = computed(() => federationService.getAllInstances(true))

const federatedDatasets = computed(() => {
  if (selectedInstance.value) {
    return federationService.getFederatedDatasets(selectedInstance.value)
  }
  return federationService.getFederatedDatasets()
})

const displayDatasets = computed(() => {
  if (!searchKeyword.value) return federatedDatasets.value
  const kw = searchKeyword.value.toLowerCase()
  return federatedDatasets.value.filter(ds =>
    ds.name.toLowerCase().includes(kw) ||
    ds.description?.toLowerCase().includes(kw)
  )
})

const stats = computed(() => federationService.getFederationStats())

const federationStats = computed(() => [
  { key: 'instances', label: '实例数', value: stats.value.instanceCount },
  { key: 'online', label: '在线', value: stats.value.onlineCount },
  { key: 'datasets', label: '数据集', value: stats.value.totalDatasets },
  { key: 'mapped', label: '已映射', value: stats.value.mappedCount },
  { key: 'health', label: '健康度', value: stats.value.averageHealth + '%' }
])

function getStatusInfo(status) {
  return federationService.instanceHealthStatusMap[status] || { label: status, color: '#6b7280' }
}

function getHealthColor(score) {
  if (score >= 90) return '#10b981'
  if (score >= 70) return '#f59e0b'
  return '#ef4444'
}

function getInstanceName(instanceId) {
  return federationService.getInstance(instanceId)?.name || instanceId
}

function handleSearch() {
  federationService.searchFederated(searchKeyword.value, selectedInstance.value ? [selectedInstance.value] : null)
}

function handleSelectInstance(instanceId) {
  selectedInstance.value = selectedInstance.value === instanceId ? '' : instanceId
}

async function handleSyncInstance(instanceId) {
  await federationService.syncInstance(instanceId)
}

async function handleSyncAll() {
  await federationService.syncAllInstances()
}

function handleToggleInstance(inst) {
  federationService.toggleInstance(inst.id)
}

function handleAddInstance() {
  const name = prompt('请输入实例名称：', '新实例')
  if (name) {
    const endpoint = prompt('请输入实例端点：', 'https://')
    if (endpoint) {
      federationService.addInstance({
        name,
        endpoint,
        location: prompt('请输入位置：', '上海'),
        type: 'datacenter'
      })
    }
  }
}

function handleImport(ds) {
  if (confirm(`确定要导入联邦数据集「${ds.name}」吗？`)) {
    const result = federationService.importFederatedDataset(ds.id, ds.instanceId, currentUser.value.id)
    if (result) {
      alert(`导入成功！本地数据集 ID: ${result.id}`)
    }
  }
}

function handleViewLocal(localId) {
  emit('selectDataset', localId)
  emit('close')
}

function handleMap(ds) {
  const localId = prompt('请输入本地数据集 ID 进行映射：', ds.localId || '')
  if (localId) {
    federationService.mapToLocalDataset(ds.id, ds.instanceId, localId)
  }
}
</script>

<style scoped>
.federation-panel {
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
  font-size: 20px;
  font-weight: 700;
  color: #2563eb;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  background: #fff;
}

.search-input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
}

.instance-select {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  min-width: 150px;
}

.instances-section, .datasets-section {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.datasets-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 12px;
  color: #374151;
}

.dataset-count {
  font-size: 12px;
  font-weight: 400;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 10px;
}

.instances-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.instance-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}

.instance-card:hover {
  border-color: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
}

.instance-card.selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.instance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.instance-name {
  font-weight: 600;
  font-size: 14px;
}

.instance-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.instance-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}

.instance-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.instance-health {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.health-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.health-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.health-score {
  font-size: 12px;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
}

.instance-actions {
  display: flex;
  gap: 8px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
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
}

.dataset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
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

.dataset-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.dataset-badge.federated {
  background: #dbeafe;
  color: #1d4ed8;
}

.dataset-badge.mapped {
  background: #d1fae5;
  color: #047857;
}

.dataset-instance {
  font-size: 12px;
  color: #6b7280;
}

.dataset-description {
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 8px;
  line-height: 1.5;
}

.dataset-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.field-tag {
  font-size: 11px;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
  color: #4b5563;
}

.field-more {
  font-size: 11px;
  color: #6b7280;
}

.dataset-actions {
  display: flex;
  gap: 8px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
