<template>
  <div class="alert-panel">
    <div class="panel-header">
      <div class="header-title">
        <AlertTriangle :size="20" />
        <span>质量告警中心</span>
        <span v-if="firingCount > 0" class="firing-badge">{{ firingCount }}</span>
      </div>
      <div class="header-actions">
        <button class="btn ghost" @click="togglePolling">
          <component :is="polling ? Pause : Play" :size="14" /> {{ polling ? '停止监控' : '开始监控' }}
        </button>
        <button class="btn ghost" @click="refresh">
          <RefreshCw :size="14" /> 刷新
        </button>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-item" v-for="stat in summaryStats" :key="stat.key">
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
      <div v-if="activeTab === 'firing'" class="alert-list">
        <div
          v-for="alert in firingAlerts"
          :key="alert.id"
          class="alert-card firing"
        >
          <div class="card-header">
            <div class="alert-severity" :style="{ background: getSeverityInfo(alert.severity).color }">
              <AlertTriangle :size="16" />
            </div>
            <div class="alert-info">
              <span class="alert-title">{{ getSeverityInfo(alert.severity).label }}: {{ getRuleTypeInfo(alert.ruleType).label }} 异常</span>
              <span class="alert-time">触发于 {{ alert.triggeredAt }}</span>
            </div>
            <div class="alert-status" :style="{ color: getStatusInfo(alert.status).color }">
              {{ getStatusInfo(alert.status).label }}
            </div>
          </div>
          <div class="card-body">
            <p class="alert-field">
              字段：<strong>{{ alert.datasetId }}.{{ alert.fieldName }}</strong>
            </p>
            <div class="alert-values">
              <span class="actual-value">实际值: <strong>{{ alert.actualValue }}</strong></span>
              <span class="expected-value">期望值: <strong>{{ alert.expectedValue }}</strong></span>
            </div>
            <div v-if="alert.resolutionNote" class="alert-note">
              <MessageSquare :size="14" /> {{ alert.resolutionNote }}
            </div>
          </div>
          <div class="card-actions">
            <button class="btn small" @click="handleAcknowledge(alert)">
              <Check :size="14" /> 确认
            </button>
            <button class="btn small primary" @click="handleResolve(alert)">
              <CheckCircle :size="14" /> 解决
            </button>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'rules'" class="rules-list">
        <div
          v-for="rule in alertRulesForDataset"
          :key="rule.id"
          class="rule-card"
        >
          <div class="rule-header">
            <div class="rule-status">
              <span class="status-dot" :class="{ enabled: rule.enabled }"></span>
              <span class="rule-type">{{ getRuleTypeInfo(rule.ruleType).label }}</span>
            </div>
            <span class="rule-severity" :style="{ color: getSeverityInfo(rule.severity).color }">
              {{ getSeverityInfo(rule.severity).label }}
            </span>
          </div>
          <div class="rule-body">
            <span class="rule-field">{{ rule.fieldName }}</span>
            <span class="rule-condition">
              {{ getRuleTypeInfo(rule.ruleType).description }}: 阈值 {{ rule.operator }} {{ rule.threshold }}
            </span>
          </div>
          <div class="rule-footer">
            <span class="rule-channels">
              通知渠道: {{ rule.notifyChannels.join(', ') }}
            </span>
            <button class="btn ghost small" @click="handleToggleRule(rule)">
              {{ rule.enabled ? '禁用' : '启用' }}
            </button>
            <button class="btn ghost small" @click="handleSimulate(rule)">
              <Zap :size="12" /> 模拟
            </button>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'history'" class="history-list">
        <div
          v-for="alert in allAlerts"
          :key="alert.id"
          class="alert-card"
          :class="alert.status"
        >
          <div class="card-header">
            <div class="alert-severity" :style="{ background: getSeverityInfo(alert.severity).color + '44', color: getSeverityInfo(alert.severity).color }">
              <AlertCircle :size="16" />
            </div>
            <div class="alert-info">
              <span class="alert-title">{{ getRuleTypeInfo(alert.ruleType).label }} 告警</span>
              <span class="alert-field-small">{{ alert.datasetId }}.{{ alert.fieldName }}</span>
            </div>
            <div class="alert-status" :style="{ color: getStatusInfo(alert.status).color }">
              {{ getStatusInfo(alert.status).label }}
            </div>
          </div>
          <div class="card-meta">
            <span>触发: {{ alert.triggeredAt }}</span>
            <span v-if="alert.resolvedAt">解决: {{ alert.resolvedAt }}</span>
            <span v-if="alert.resolverName">处理人: {{ alert.resolverName }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { AlertTriangle, AlertCircle, Check, CheckCircle, RefreshCw, Play, Pause, MessageSquare, Zap } from 'lucide-vue-next'
import { alertService } from '../utils/alertService.js'
import { users } from '../data/mockData.js'

const props = defineProps({
  datasetId: String
})

const emit = defineEmits(['close'])

const activeTab = ref('firing')
const polling = computed(() => alertService.polling.value)

const currentUser = computed(() => users[0])

const alertRulesForDataset = computed(() => {
  if (props.datasetId) {
    return alertService.getRulesForDataset(props.datasetId)
  }
  return alertService.alertRules
})

const firingAlerts = computed(() => {
  if (props.datasetId) {
    return alertService.getFiringAlerts(props.datasetId)
  }
  return alertService.getFiringAlerts()
})

const allAlerts = computed(() => {
  if (props.datasetId) {
    return alertService.getAlertsForDataset(props.datasetId)
  }
  return [...alertService.alertHistory].sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt))
})

const firingCount = computed(() => firingAlerts.value.length)

const stats = computed(() => alertService.getAlertStats(props.datasetId))

const summaryStats = computed(() => [
  { key: 'total', label: '告警总数', value: stats.value.total, color: '#6b7280' },
  { key: 'firing', label: '触发中', value: stats.value.firing, color: '#ef4444' },
  { key: 'acknowledged', label: '已确认', value: stats.value.acknowledged, color: '#f59e0b' },
  { key: 'resolved', label: '已解决', value: stats.value.resolved, color: '#10b981' }
])

const tabs = computed(() => [
  { key: 'firing', label: '当前告警', count: firingCount.value },
  { key: 'rules', label: '告警规则', count: alertRulesForDataset.value.length },
  { key: 'history', label: '历史记录', count: stats.value.total }
])

function getSeverityInfo(severity) {
  return alertService.alertSeverityMap[severity] || { label: severity, color: '#6b7280' }
}

function getStatusInfo(status) {
  return alertService.alertStatusMap[status] || { label: status, color: '#6b7280' }
}

function getRuleTypeInfo(type) {
  return alertService.alertRuleTypeMap[type] || { label: type, description: '' }
}

function togglePolling() {
  if (polling.value) {
    alertService.stopPolling()
  } else {
    alertService.startPolling(30000)
  }
}

function refresh() {
  alertService.evaluateRule
}

function handleAcknowledge(alert) {
  alertService.acknowledgeAlert(alert.id, currentUser.value.id, currentUser.value.name)
}

function handleResolve(alert) {
  const note = prompt('请输入解决说明：', '问题已修复')
  if (note !== null) {
    alertService.resolveAlert(alert.id, currentUser.value.id, currentUser.value.name, note)
  }
}

function handleToggleRule(rule) {
  alertService.toggleAlertRule(rule.id)
}

function handleSimulate(rule) {
  const result = alertService.simulateAlert(rule.id)
  if (result && !result.passed) {
    alert('模拟告警已触发！')
  }
}
</script>

<style scoped>
.alert-panel {
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

.firing-badge {
  background: #ef4444;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
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

.alert-list, .rules-list, .history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.alert-card.firing {
  border-color: #fecaca;
  background: #fef2f2;
}

.alert-card.acknowledged {
  border-color: #fde68a;
  background: #fffbeb;
}

.alert-card.resolved {
  border-color: #a7f3d0;
  background: #f0fdf4;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.alert-severity {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.alert-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.alert-title {
  font-weight: 600;
  font-size: 14px;
}

.alert-time, .alert-field-small {
  font-size: 12px;
  color: #6b7280;
}

.alert-status {
  font-weight: 600;
  font-size: 13px;
}

.card-body {
  padding: 12px;
}

.alert-field {
  font-size: 13px;
  margin-bottom: 8px;
}

.alert-values {
  display: flex;
  gap: 24px;
  font-size: 13px;
  margin-bottom: 8px;
}

.actual-value {
  color: #ef4444;
}

.expected-value {
  color: #10b981;
}

.alert-note {
  background: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #f3f4f6;
  background: white;
}

.rule-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.rule-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d1d5db;
}

.status-dot.enabled {
  background: #10b981;
}

.rule-type {
  font-weight: 600;
  font-size: 14px;
}

.rule-severity {
  font-size: 12px;
  font-weight: 600;
}

.rule-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.rule-field {
  font-size: 13px;
  color: #374151;
}

.rule-condition {
  font-size: 12px;
  color: #6b7280;
}

.rule-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rule-channels {
  font-size: 11px;
  color: #9ca3af;
}

.card-meta {
  padding: 8px 12px;
  background: #fafafa;
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: #9ca3af;
}
</style>
