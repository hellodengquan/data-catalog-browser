<template>
  <div class="import-panel">
    <div class="panel-header">
      <div class="header-title">
        <Upload :size="20" />
        <span>批量元数据导入</span>
      </div>
      <div class="header-actions">
        <button class="btn ghost" @click="showTemplate = !showTemplate">
          <FileText :size="14" /> 导入模板
        </button>
        <button class="btn primary" @click="openUploadModal">
          <Plus :size="14" /> 新建导入
        </button>
      </div>
    </div>

    <div v-if="showTemplate" class="template-section">
      <div class="template-header">
        <span class="template-title">导入模板参考</span>
        <button class="btn ghost small" @click="downloadTemplate">
          <Download :size="12" /> 下载 JSON
        </button>
      </div>
      <div class="template-content">
        <pre class="template-code"><code>{{ currentTemplate }}</code></pre>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-group">
        <span class="filter-label">类型</span>
        <select v-model="typeFilter" class="filter-select">
          <option value="">全部</option>
          <option value="metadata">元数据</option>
          <option value="lineage">血缘关系</option>
        </select>
      </div>
      <div class="filter-group">
        <span class="filter-label">状态</span>
        <select v-model="statusFilter" class="filter-select">
          <option value="">全部</option>
          <option value="processing">处理中</option>
          <option value="completed">已完成</option>
          <option value="partial">部分成功</option>
          <option value="failed">失败</option>
        </select>
      </div>
      <div class="stats-summary">
        <span class="stat-item">共 {{ filteredRecords.length }} 条</span>
        <span class="stat-item">处理中 {{ processingCount }}</span>
      </div>
    </div>

    <div class="panel-content">
      <div v-if="filteredRecords.length" class="record-list">
        <div
          v-for="record in filteredRecords"
          :key="record.id"
          class="record-card"
          @click="toggleDetail(record)"
        >
          <div class="card-main">
            <div class="card-header">
              <div class="record-title">
                <span class="record-type" :class="record.type">
                  {{ record.type === 'metadata' ? '元数据' : '血缘' }}
                </span>
                <span class="record-name">{{ record.title }}</span>
              </div>
              <span
                class="status-badge"
                :style="{ background: getStatusInfo(record.status).color + '22', color: getStatusInfo(record.status).color }"
              >
                <span class="status-dot" :style="{ background: getStatusInfo(record.status).color }"></span>
                {{ getStatusInfo(record.status).label }}
              </span>
            </div>
            <div class="card-meta">
              <span><FileText :size="12" /> {{ record.fileName }}</span>
              <span><User :size="12" /> {{ record.operatorName }}</span>
              <span><Clock :size="12" /> {{ record.createdAt }}</span>
            </div>
            <div class="card-stats">
              <div class="stat">
                <span class="stat-label">总数</span>
                <span class="stat-value">{{ record.totalCount }}</span>
              </div>
              <div class="stat success">
                <span class="stat-label">成功</span>
                <span class="stat-value">{{ record.successCount }}</span>
              </div>
              <div class="stat danger" v-if="record.failedCount > 0">
                <span class="stat-label">失败</span>
                <span class="stat-value">{{ record.failedCount }}</span>
              </div>
            </div>
            <div v-if="record.errorMessage" class="error-message">
              <AlertCircle :size="14" /> {{ record.errorMessage }}
            </div>
          </div>
          <div class="card-actions">
            <button v-if="record.status === 'processing'" class="btn small ghost" @click.stop="cancelImport(record)">
              <XCircle :size="14" /> 取消
            </button>
            <button v-if="record.failedCount > 0 && record.status !== 'processing'" class="btn small ghost" @click.stop="retryImport(record)">
              <RefreshCw :size="14" /> 重试
            </button>
            <ChevronRight :size="20" class="expand-icon" :class="{ expanded: expandedId === record.id }" />
          </div>
        </div>

        <div v-if="expandedId === record.id" class="record-detail" v-for="record in filteredRecords" :key="'detail-' + record.id">
          <div v-if="record.details.successful?.length" class="detail-section">
            <h4 class="section-title success"><CheckCircle2 :size="16" /> 成功导入 ({{ record.details.successful.length }})</h4>
            <div class="id-list">
              <span v-for="id in record.details.successful.slice(0, 10)" :key="id" class="id-tag success">{{ id }}</span>
              <span v-if="record.details.successful.length > 10" class="id-tag">+{{ record.details.successful.length - 10 }} 更多</span>
            </div>
          </div>
          <div v-if="record.details.failed?.length" class="detail-section">
            <h4 class="section-title danger"><XCircle :size="16" /> 导入失败 ({{ record.details.failed.length }})</h4>
            <div class="failed-list">
              <div v-for="(item, idx) in record.details.failed" :key="idx" class="failed-item">
                <span class="failed-name">{{ item.name }}</span>
                <span class="failed-reason">{{ item.reason }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <Inbox :size="48" class="empty-icon" />
        <p>暂无导入记录</p>
        <button class="btn primary" @click="openUploadModal">开始第一次导入</button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showUploadModal" class="modal-overlay" @click.self="closeUploadModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>新建批量导入</h3>
            <button class="close-btn" @click="closeUploadModal">
              <X :size="20" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>导入类型</label>
              <select v-model="importType" class="form-control">
                <option value="metadata">元数据导入</option>
                <option value="lineage">血缘关系导入</option>
              </select>
            </div>
            <div class="form-group">
              <label>导入标题</label>
              <input v-model="importTitle" type="text" class="form-control" placeholder="请输入导入标题" />
            </div>
            <div class="form-group">
              <label>文件名</label>
              <input v-model="importFileName" type="text" class="form-control" placeholder="例如：user_domain_datasets.json" />
            </div>
            <div class="form-group">
              <label>导入内容（JSON）</label>
              <textarea
                v-model="importContent"
                class="form-control textarea"
                rows="10"
                :placeholder="importType === 'metadata' ? '请粘贴 JSON 格式的数据集元数据...' : '请粘贴 JSON 格式的血缘边...'"
              ></textarea>
            </div>
            <div v-if="validationResult" class="validation-result" :class="validationResult.valid ? 'valid' : 'invalid'">
              <CheckCircle2 v-if="validationResult.valid" :size="16" />
              <AlertCircle v-else :size="16" />
              <span>
                {{ validationResult.records.length }} 条记录可导入
                <template v-if="validationResult.errors.length > 0">，{{ validationResult.errors.length }} 条错误</template>
              </span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn ghost" @click="validateContent">
              <CheckCircle2 :size="14" /> 验证格式
            </button>
            <button class="btn ghost" @click="closeUploadModal">取消</button>
            <button class="btn primary" @click="submitImport" :disabled="isImporting">
              <Loader2 v-if="isImporting" :size="14" class="spin" />
              <Upload v-else :size="14" />
              {{ isImporting ? '导入中...' : '开始导入' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Upload, Plus, FileText, Download, User, Clock, AlertCircle, CheckCircle2, XCircle, RefreshCw, ChevronRight, Inbox, X, Loader2 } from 'lucide-vue-next'
import { importService } from '../utils/importService'

const typeFilter = ref('')
const statusFilter = ref('')
const expandedId = ref(null)
const showTemplate = ref(false)
const showUploadModal = ref(false)
const importType = ref('metadata')
const importTitle = ref('')
const importFileName = ref('')
const importContent = ref('')
const validationResult = ref(null)
const isImporting = ref(false)

const records = computed(() => importService.getImportRecords())

const filteredRecords = computed(() => {
  let result = records.value
  if (typeFilter.value) {
    result = result.filter(r => r.type === typeFilter.value)
  }
  if (statusFilter.value) {
    result = result.filter(r => r.status === statusFilter.value)
  }
  return result
})

const processingCount = computed(() =>
  records.value.filter(r => r.status === 'processing').length
)

const currentTemplate = computed(() =>
  importService.getImportTemplate(importType.value)
)

watch([typeFilter], () => {
  importContent.value = ''
  validationResult.value = null
})

function getStatusInfo(status) {
  return importService.getStatusInfo(status)
}

function toggleDetail(record) {
  expandedId.value = expandedId.value === record.id ? null : record.id
}

function validateContent() {
  if (!importContent.value.trim()) {
    validationResult.value = { valid: false, records: [], errors: [{ reason: '内容不能为空' }] }
    return
  }
  try {
    validationResult.value = importService.validateImport(importContent.value, importType.value)
    validationResult.value.valid = validationResult.value.errors.length === 0
  } catch (e) {
    validationResult.value = { valid: false, records: [], errors: [{ reason: 'JSON 格式错误' }] }
  }
}

async function submitImport() {
  if (!importTitle.value.trim()) {
    alert('请输入导入标题')
    return
  }
  if (!importContent.value.trim()) {
    alert('请输入导入内容')
    return
  }

  validateContent()
  if (validationResult.value && validationResult.value.records.length === 0) {
    alert('没有可导入的有效记录')
    return
  }

  isImporting.value = true
  try {
    const result = await importService.startImport({
      type: importType.value,
      title: importTitle.value,
      fileName: importFileName.value || 'import.json',
      content: importContent.value
    })

    if (result.success) {
      alert(`导入完成：${result.stats.success} 条成功，${result.stats.failed} 条失败`)
      closeUploadModal()
    }
  } finally {
    isImporting.value = false
  }
}

function openUploadModal() {
  showUploadModal.value = true
  importTitle.value = ''
  importFileName.value = ''
  importContent.value = ''
  validationResult.value = null
}

function closeUploadModal() {
  showUploadModal.value = false
}

function downloadTemplate() {
  const blob = new Blob([currentTemplate.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `import-template-${importType.value}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function cancelImport(record) {
  if (confirm('确定要取消此次导入吗？')) {
    importService.cancelImport(record.id)
  }
}

function retryImport(record) {
  importService.retryImport(record.id)
}
</script>

<style scoped>
.import-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.template-section {
  margin: 16px 20px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.template-title {
  font-weight: 600;
  color: var(--text-primary);
}

.template-content {
  max-height: 200px;
  overflow-y: auto;
  background: #1a1a1a;
  border-radius: 8px;
  padding: 12px;
}

.template-code {
  margin: 0;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
  color: #e5e7eb;
  white-space: pre-wrap;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.filter-select {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
}

.stats-summary {
  margin-left: auto;
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-muted);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.record-card:hover {
  border-color: var(--color-primary);
}

.card-main {
  flex: 1;
  min-width: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.record-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.record-type {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.record-type.metadata {
  background: #3b82f622;
  color: #3b82f6;
}

.record-type.lineage {
  background: #8b5cf622;
  color: #8b5cf6;
}

.record-name {
  font-weight: 600;
  color: var(--text-primary);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.card-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.card-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.card-stats {
  display: flex;
  gap: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 11px;
  color: var(--text-muted);
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat.success .stat-value {
  color: #10b981;
}

.stat.danger .stat-value {
  color: #ef4444;
}

.error-message {
  margin-top: 12px;
  padding: 8px 12px;
  background: #ef444411;
  color: #ef4444;
  border-radius: 8px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-icon {
  color: var(--text-muted);
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.record-detail {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-top: none;
  border-radius: 0 0 12px 12px;
  margin-top: -8px;
  padding: 16px;
}

.detail-section {
  margin-bottom: 16px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}

.section-title.success {
  color: #10b981;
}

.section-title.danger {
  color: #ef4444;
}

.id-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.id-tag {
  padding: 4px 10px;
  background: var(--bg-primary);
  border-radius: 6px;
  font-size: 12px;
  font-family: 'SF Mono', Monaco, monospace;
}

.id-tag.success {
  background: #10b98111;
  color: #10b981;
}

.failed-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.failed-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #ef444411;
  border-radius: 6px;
  font-size: 12px;
}

.failed-name {
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text-primary);
}

.failed-reason {
  color: #ef4444;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-muted);
  text-align: center;
  gap: 12px;
}

.empty-icon {
  margin-bottom: 8px;
  opacity: 0.5;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  border-radius: 8px;
}

.close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-control {
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
}

.form-control.textarea {
  resize: vertical;
  min-height: 150px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
}

.form-control:focus {
  outline: none;
  border-color: var(--color-primary);
}

.validation-result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
}

.validation-result.valid {
  background: #10b98111;
  color: #10b981;
}

.validation-result.invalid {
  background: #ef444411;
  color: #ef4444;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.btn.small {
  padding: 6px 12px;
  font-size: 12px;
}
</style>
