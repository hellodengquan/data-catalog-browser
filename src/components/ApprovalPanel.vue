<template>
  <div class="approval-panel">
    <div class="panel-header">
      <div class="header-title">
        <FileCheck :size="20" />
        <span>审批管理</span>
      </div>
      <div class="header-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span v-if="tab.count > 0" class="tab-badge" :class="tab.key">{{ tab.count }}</span>
        </button>
      </div>
    </div>

    <div v-if="activeTab === 'pending'" class="panel-content">
      <div class="request-list" v-if="pendingRequests.length">
        <div
          v-for="request in pendingRequests"
          :key="request.id"
          class="request-card pending"
        >
          <div class="card-header">
            <div class="request-info">
              <Clock :size="14" class="status-icon pending" />
              <span class="request-id">{{ request.id }}</span>
              <span class="request-time">{{ request.createdAt }}</span>
            </div>
            <div class="approver-info">
              <span class="approver-label">审批人：</span>
              <span class="approver-name">{{ request.currentApproverName }}</span>
            </div>
          </div>
          <div class="card-body">
            <div class="info-row">
              <span class="label">数据集</span>
              <span class="value dataset-name">{{ request.datasetName }}</span>
            </div>
            <div class="info-row">
              <span class="label">申请人</span>
              <span class="value">{{ request.requesterName }} ({{ getTeamName(request.requesterTeam) }})</span>
            </div>
            <div class="info-row reason-row">
              <span class="label">申请理由</span>
              <p class="value reason-text">{{ request.reason }}</p>
            </div>
            <div class="info-row">
              <span class="label">申请字段</span>
              <div class="value field-chips">
                <span v-for="f in request.fieldsRequested" :key="f" class="field-chip mono">
                  {{ f }}
                </span>
              </div>
            </div>
          </div>
          <div class="card-footer" v-if="canApprove(request)">
            <button class="btn approve-btn" @click="handleApprove(request)">
              <Check :size="16" /> 通过
            </button>
            <button class="btn reject-btn" @click="openRejectModal(request)">
              <X :size="16" /> 拒绝
            </button>
            <span class="expiry-hint">有效期至：{{ request.expiryAt }}</span>
          </div>
          <div class="card-footer" v-else>
            <span class="pending-hint">
              <Clock :size="14" /> 等待审批中
            </span>
            <span class="expiry-hint">有效期至：{{ request.expiryAt }}</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <CheckCircle2 :size="48" class="empty-icon success" />
        <p>暂无待审批申请</p>
      </div>
    </div>

    <div v-if="activeTab === 'my'" class="panel-content">
      <div class="request-list" v-if="myRequests.length">
        <div
          v-for="request in myRequests"
          :key="request.id"
          class="request-card"
          :class="request.status"
        >
          <div class="card-header">
            <div class="request-info">
              <component
                :is="getStatusIcon(request.status)"
                :size="14"
                class="status-icon"
                :class="request.status"
              />
              <span class="status-badge" :class="request.status">
                {{ getStatusLabel(request.status) }}
              </span>
              <span class="request-id">{{ request.id }}</span>
            </div>
            <span class="request-time">{{ request.createdAt }}</span>
          </div>
          <div class="card-body">
            <div class="info-row">
              <span class="label">数据集</span>
              <span class="value dataset-name">{{ request.datasetName }}</span>
            </div>
            <div class="info-row reason-row">
              <span class="label">申请理由</span>
              <p class="value reason-text">{{ request.reason }}</p>
            </div>
            <div class="info-row">
              <span class="label">申请字段 ({{ request.fieldsRequested.length }})</span>
              <div class="value field-chips small">
                <span v-for="f in request.fieldsRequested.slice(0, 5)" :key="f" class="field-chip mono small">
                  {{ f }}
                </span>
                <span v-if="request.fieldsRequested.length > 5" class="more-chip">
                  +{{ request.fieldsRequested.length - 5 }}
                </span>
              </div>
            </div>
            <div v-if="request.approvalHistory && request.approvalHistory.length" class="history-section">
              <div class="history-label">
                <History :size="14" /> 审批记录
              </div>
              <div v-for="(h, idx) in request.approvalHistory" :key="idx" class="history-item">
                <span class="history-user">{{ h.approverName }}</span>
                <span class="history-action" :class="h.action">{{ h.action === 'approved' ? '同意' : '拒绝' }}</span>
                <span class="history-time">{{ h.time }}</span>
              </div>
              <p v-if="request.approvalHistory[0]?.comment" class="history-comment">
                {{ request.approvalHistory[0].comment }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <FileX :size="48" class="empty-icon" />
        <p>暂无申请记录</p>
      </div>
    </div>

    <div v-if="activeTab === 'apply'" class="panel-content">
      <div class="apply-form">
        <div class="form-title">
          <FilePlus :size="18" />
          <span>新建访问申请</span>
        </div>
        <div class="form-group">
          <label class="form-label">选择数据集 *</label>
          <select v-model="newRequest.datasetId" class="form-select" @change="onDatasetChange">
            <option value="">-- 请选择需要申请的数据集 --</option>
            <option
              v-for="ds in approvableDatasets"
              :key="ds.id"
              :value="ds.id"
            >
              {{ ds.name }} ({{ getSensitivityLabel(ds.id) }})
            </option>
          </select>
          <p v-if="newRequest.datasetId && getDatasetSensitivity(newRequest.datasetId)" class="form-hint">
            <Info :size="12" />
            {{ getDatasetSensitivity(newRequest.datasetId)?.description }}
          </p>
        </div>

        <div class="form-group" v-if="newRequest.datasetId">
          <label class="form-label">
            选择字段 *
            <span class="select-all" @click="toggleSelectAllFields">
              {{ allFieldsSelected ? '取消全选' : '全选' }}
            </span>
          </label>
          <div class="field-checkbox-grid">
            <label
              v-for="field in currentDatasetFields"
              :key="field.name"
              class="field-checkbox"
            >
              <input
                type="checkbox"
                :value="field.name"
                v-model="newRequest.fieldsRequested"
              />
              <span class="checkbox-custom"></span>
              <span class="field-info">
                <span class="field-name mono">{{ field.name }}</span>
                <span class="field-desc">{{ field.description }}</span>
              </span>
            </label>
          </div>
        </div>

        <div class="form-group" v-if="newRequest.datasetId">
          <label class="form-label">申请理由 *</label>
          <textarea
            v-model="newRequest.reason"
            class="form-textarea"
            rows="4"
            placeholder="请详细说明申请访问的业务用途..."
          ></textarea>
        </div>

        <div class="form-actions">
          <button class="btn btn-secondary" @click="resetForm">
            <RotateCcw :size="14" /> 重置
          </button>
          <button
            class="btn btn-primary"
            :disabled="!canSubmit"
            @click="submitRequest"
          >
            <Send :size="14" /> 提交申请
          </button>
        </div>

        <div v-if="submitResult" class="submit-result" :class="submitResult.type">
          {{ submitResult.message }}
        </div>
      </div>
    </div>

    <div v-if="showRejectModal" class="modal-overlay" @click.self="closeRejectModal">
      <div class="modal-content">
        <div class="modal-header">
          <XCircle :size="20" class="reject-icon" />
          <h3>拒绝申请</h3>
          <button class="modal-close" @click="closeRejectModal">
            <X :size="18" />
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">请输入拒绝申请的原因（必填）：</p>
          <textarea
            v-model="rejectComment"
            class="form-textarea"
            rows="4"
            placeholder="请说明拒绝原因，帮助申请人了解问题所在..."
          ></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeRejectModal">取消</button>
          <button
            class="btn reject-btn"
            :disabled="!rejectComment.trim()"
            @click="confirmReject"
          >
            确认拒绝
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, markRaw, reactive } from 'vue'
import {
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  History,
  FileX,
  FilePlus,
  Info,
  Send,
  RotateCcw,
  Check,
  X
} from 'lucide-vue-next'
import { datasets, teams, sensitivityLevels, approvalStatusMap } from '../data/mockData'
import { permissionService } from '../utils/permissionService'

const emit = defineEmits(['approved', 'rejected', 'submitted'])

const activeTab = ref('pending')
const showRejectModal = ref(false)
const rejectTargetRequest = ref(null)
const rejectComment = ref('')
const submitResult = ref(null)

const newRequest = reactive({
  datasetId: '',
  fieldsRequested: [],
  reason: ''
})

const tabs = computed(() => [
  {
    key: 'pending',
    label: '待我审批',
    count: pendingRequests.value.length
  },
  {
    key: 'my',
    label: '我的申请',
    count: myRequests.value.length
  },
  {
    key: 'apply',
    label: '新建申请',
    count: 0
  }
])

const pendingRequests = computed(() =>
  permissionService.getPendingApprovals()
)

const myRequests = computed(() =>
  permissionService.getApprovalRequests({
    requesterId: permissionService.currentUserIdValue
  })
)

const approvableDatasets = computed(() => {
  const userId = permissionService.currentUserIdValue
  return Object.values(datasets).filter(ds => {
    const access = permissionService.canViewDataset(ds.id, userId)
    return !access.allowed && access.requiresApproval
  })
})

const currentDatasetFields = computed(() => {
  if (!newRequest.datasetId) return []
  const ds = datasets[newRequest.datasetId]
  return ds?.fields || []
})

const allFieldsSelected = computed(() => {
  if (!currentDatasetFields.value.length) return false
  return currentDatasetFields.value.every(f =>
    newRequest.fieldsRequested.includes(f.name)
  )
})

const canSubmit = computed(() => {
  return (
    newRequest.datasetId &&
    newRequest.fieldsRequested.length > 0 &&
    newRequest.reason.trim().length >= 10
  )
})

function getTeamName(teamId) {
  return teams[teamId]?.name || '未知团队'
}

function getStatusIcon(status) {
  const icons = {
    pending: markRaw(Clock),
    approved: markRaw(CheckCircle2),
    rejected: markRaw(XCircle),
    expired: markRaw(Clock)
  }
  return icons[status] || markRaw(Clock)
}

function getStatusLabel(status) {
  return approvalStatusMap[status]?.label || status
}

function getSensitivityLabel(datasetId) {
  const s = permissionService.getDatasetSensitivity(datasetId)
  return s?.label || ''
}

function getDatasetSensitivity(datasetId) {
  return permissionService.getDatasetSensitivity(datasetId)
}

function canApprove(request) {
  return permissionService.isTeamManager(
    permissionService.getDatasetTeam(request.datasetId)?.id,
    permissionService.currentUserIdValue
  ) || permissionService.isAdmin()
}

function handleApprove(request) {
  const result = permissionService.approveRequest(request.id, '已审核通过，请注意合规使用数据。')
  if (result.success) {
    emit('approved', result.data)
  }
}

function openRejectModal(request) {
  rejectTargetRequest.value = request
  rejectComment.value = ''
  showRejectModal.value = true
}

function closeRejectModal() {
  showRejectModal.value = false
  rejectTargetRequest.value = null
  rejectComment.value = ''
}

function confirmReject() {
  if (!rejectTargetRequest.value) return
  const result = permissionService.rejectRequest(
    rejectTargetRequest.value.id,
    rejectComment.value
  )
  if (result.success) {
    emit('rejected', result.data)
    closeRejectModal()
  }
}

function onDatasetChange() {
  newRequest.fieldsRequested = []
}

function toggleSelectAllFields() {
  if (allFieldsSelected.value) {
    newRequest.fieldsRequested = []
  } else {
    newRequest.fieldsRequested = currentDatasetFields.value.map(f => f.name)
  }
}

function resetForm() {
  newRequest.datasetId = ''
  newRequest.fieldsRequested = []
  newRequest.reason = ''
  submitResult.value = null
}

function submitRequest() {
  const result = permissionService.submitApprovalRequest({
    datasetId: newRequest.datasetId,
    reason: newRequest.reason,
    fieldsRequested: [...newRequest.fieldsRequested]
  })

  submitResult.value = result.success
    ? { type: 'success', message: `申请已提交，等待${teams[permissionService.getDatasetTeam(newRequest.datasetId)?.id]?.name || '团队负责人'}审批。` }
    : { type: 'error', message: result.error || '提交失败' }

  if (result.success) {
    emit('submitted', result.data)
    setTimeout(() => {
      activeTab.value = 'my'
      resetForm()
    }, 1500)
  }

  setTimeout(() => {
    submitResult.value = null
  }, 4000)
}
</script>

<style scoped>
.approval-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  background: #fafbfc;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 14px;
}

.header-tabs {
  display: flex;
  gap: 4px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.tab-btn.active {
  background: #eff6ff;
  color: #2563eb;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
  background: #e5e7eb;
  color: #6b7280;
}

.tab-badge.pending {
  background: #fef3c7;
  color: #b45309;
}

.panel-content {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
}

.request-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.request-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.request-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.request-card.pending {
  border-left: 3px solid #f59e0b;
}

.request-card.approved {
  border-left: 3px solid #10b981;
}

.request-card.rejected {
  border-left: 3px solid #ef4444;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f3f4f6;
}

.request-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-icon {
  flex-shrink: 0;
}

.status-icon.pending {
  color: #f59e0b;
}

.status-icon.approved {
  color: #10b981;
}

.status-icon.rejected {
  color: #ef4444;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.status-badge.pending {
  background: #fef3c7;
  color: #b45309;
}

.status-badge.approved {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.rejected {
  background: #fee2e2;
  color: #b91c1c;
}

.request-id {
  font-size: 12px;
  color: #9ca3af;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}

.request-time {
  font-size: 12px;
  color: #9ca3af;
}

.approver-info {
  font-size: 12px;
  color: #6b7280;
}

.approver-label {
  color: #9ca3af;
}

.approver-name {
  font-weight: 500;
  color: #374151;
}

.card-body {
  padding: 14px 16px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .label {
  min-width: 80px;
  flex-shrink: 0;
  font-size: 12px;
  color: #9ca3af;
  padding-top: 2px;
}

.info-row .value {
  flex: 1;
  font-size: 13px;
  color: #374151;
}

.dataset-name {
  font-weight: 600;
  color: #1f2937;
}

.reason-row {
  align-items: flex-start;
}

.reason-text {
  margin: 0;
  line-height: 1.6;
  background: #fafafa;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #f3f4f6;
}

.field-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.field-chip {
  display: inline-block;
  padding: 3px 10px;
  background: #f3f4f6;
  border-radius: 12px;
  font-size: 11px;
  color: #4b5563;
}

.field-chip.small {
  padding: 2px 8px;
  font-size: 10px;
}

.more-chip {
  padding: 2px 8px;
  background: #e5e7eb;
  border-radius: 12px;
  font-size: 10px;
  color: #6b7280;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid #f3f4f6;
  background: #fafbfc;
}

.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.approve-btn {
  background: #10b981;
  color: white;
}

.approve-btn:hover {
  background: #059669;
}

.reject-btn {
  background: #ef4444;
  color: white;
}

.reject-btn:hover {
  background: #dc2626;
}

.expiry-hint {
  margin-left: auto;
  font-size: 11px;
  color: #9ca3af;
}

.pending-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #f59e0b;
  font-weight: 500;
}

.history-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e5e7eb;
}

.history-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  padding: 6px 0;
}

.history-user {
  font-weight: 500;
  color: #374151;
}

.history-action {
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.history-action.approved {
  background: #d1fae5;
  color: #065f46;
}

.history-action.rejected {
  background: #fee2e2;
  color: #b91c1c;
}

.history-time {
  color: #9ca3af;
  margin-left: auto;
}

.history-comment {
  margin: 6px 0 0 0;
  padding: 8px 12px;
  background: #fef2f2;
  border-radius: 6px;
  font-size: 12px;
  color: #7f1d1d;
  line-height: 1.5;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.empty-state p {
  margin: 12px 0 0 0;
  font-size: 14px;
}

.empty-icon {
  opacity: 0.4;
}

.empty-icon.success {
  color: #10b981;
  opacity: 0.6;
}

.apply-form {
  max-width: 640px;
  margin: 0 auto;
}

.form-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 18px;
}

.form-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.select-all {
  font-size: 12px;
  color: #2563eb;
  cursor: pointer;
  font-weight: 400;
}

.select-all:hover {
  text-decoration: underline;
}

.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  background: white;
  cursor: pointer;
  transition: border-color 0.15s;
}

.form-select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #6b7280;
}

.field-checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.field-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}

.field-checkbox:hover {
  background: #f9fafb;
}

.field-checkbox input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.checkbox-custom {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  margin-top: 2px;
  transition: all 0.15s;
  position: relative;
}

.field-checkbox input[type="checkbox"]:checked + .checkbox-custom {
  background: #2563eb;
  border-color: #2563eb;
}

.field-checkbox input[type="checkbox"]:checked + .checkbox-custom::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.field-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.field-name {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
}

.field-desc {
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
  transition: border-color 0.15s;
}

.form-textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-textarea::placeholder {
  color: #9ca3af;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
}

.btn-secondary {
  background: #f3f4f6;
  color: #4b5563;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-result {
  margin-top: 16px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
}

.submit-result.success {
  background: #d1fae5;
  color: #065f46;
}

.submit-result.error {
  background: #fee2e2;
  color: #b91c1c;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 10px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
}

.modal-header h3 {
  flex: 1;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.reject-icon {
  color: #ef4444;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #9ca3af;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 20px;
}

.modal-desc {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #6b7280;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #f3f4f6;
  background: #fafbfc;
}
</style>
