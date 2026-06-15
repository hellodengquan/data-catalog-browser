import { reactive, ref } from 'vue'
import { qualityAlertRules, qualityAlertHistory, alertSeverityMap, alertStatusMap, alertRuleTypeMap } from '../data/mockData.js'
import { subscriptionService } from './subscriptionService.js'

const alertRules = reactive([...qualityAlertRules])
const alertHistory = reactive([...qualityAlertHistory])
const alertEvaluations = reactive(new Map())
const subscribers = reactive(new Map())
const polling = ref(false)
let pollInterval = null

function evaluateRule(ruleId, currentValue) {
  const rule = alertRules.find(r => r.id === ruleId)
  if (!rule || !rule.enabled) return { passed: true, value: currentValue }

  let passed = false
  switch (rule.operator) {
    case '<':
      passed = currentValue >= rule.threshold
      break
    case '>':
      passed = currentValue <= rule.threshold
      break
    case '<=':
      passed = currentValue > rule.threshold
      break
    case '>=':
      passed = currentValue < rule.threshold
      break
    case '==':
      passed = currentValue !== rule.threshold
      break
  }

  alertEvaluations.set(ruleId, {
    value: currentValue,
    passed,
    evaluatedAt: formatDateTime(new Date()),
    lastPassedValue: passed ? currentValue : alertEvaluations.get(ruleId)?.lastPassedValue
  })

  if (!passed) {
    triggerAlert(rule, currentValue)
  }

  return { passed, value: currentValue }
}

function triggerAlert(rule, actualValue) {
  const existingFiring = alertHistory.find(
    a => a.ruleId === rule.id && a.status === 'firing'
  )
  if (existingFiring) return

  const alert = {
    id: `alert-hist-${Date.now()}`,
    ruleId: rule.id,
    datasetId: rule.datasetId,
    fieldName: rule.fieldName,
    ruleType: rule.ruleType,
    severity: rule.severity,
    triggeredAt: formatDateTime(new Date()),
    resolvedAt: null,
    actualValue,
    expectedValue: `${rule.operator === '<' ? '>=' : rule.operator === '>' ? '<=' : rule.operator} ${rule.threshold}`,
    status: 'firing',
    resolverId: null,
    resolverName: null,
    resolutionNote: null
  }
  alertHistory.unshift(alert)
  notifySubscribers(alert)
}

function notifySubscribers(alert) {
  const subs = subscriptionService.getSubscribersForDataset(alert.datasetId)
  subs.forEach(sub => {
    if (sub.notifyTypes.includes('quality_alert')) {
      subscriptionService.sendNotification(sub.userId, {
        type: 'quality_alert',
        datasetId: alert.datasetId,
        severity: alert.severity,
        title: `质量告警：${alert.ruleType} 异常`,
        content: `字段 ${alert.fieldName} ${alertRuleTypeMap[alert.ruleType]?.label} 指标异常：实际值 ${alert.actualValue}，期望值 ${alert.expectedValue}`,
        link: `/dataset/${alert.datasetId}?alert=${alert.id}`,
        priority: alert.severity === 'critical' ? 'high' : alert.severity === 'warning' ? 'medium' : 'low'
      })
    }
  })
}

function acknowledgeAlert(alertId, userId, userName) {
  const alert = alertHistory.find(a => a.id === alertId)
  if (!alert) return null
  alert.status = 'acknowledged'
  alert.resolverId = userId
  alert.resolverName = userName
  return alert
}

function resolveAlert(alertId, userId, userName, resolutionNote) {
  const alert = alertHistory.find(a => a.id === alertId)
  if (!alert) return null
  alert.status = 'resolved'
  alert.resolvedAt = formatDateTime(new Date())
  alert.resolverId = userId
  alert.resolverName = userName
  alert.resolutionNote = resolutionNote
  return alert
}

function createAlertRule(ruleData) {
  const newRule = {
    id: `alert-${Date.now()}`,
    ...ruleData,
    enabled: ruleData.enabled ?? true,
    createdAt: formatDateTime(new Date()),
    lastEvaluatedAt: null
  }
  alertRules.push(newRule)
  return newRule
}

function updateAlertRule(ruleId, updates) {
  const idx = alertRules.findIndex(r => r.id === ruleId)
  if (idx === -1) return null
  alertRules[idx] = { ...alertRules[idx], ...updates }
  return alertRules[idx]
}

function deleteAlertRule(ruleId) {
  const idx = alertRules.findIndex(r => r.id === ruleId)
  if (idx === -1) return false
  alertRules.splice(idx, 1)
  return true
}

function toggleAlertRule(ruleId) {
  const rule = alertRules.find(r => r.id === ruleId)
  if (!rule) return null
  rule.enabled = !rule.enabled
  return rule
}

function getRulesForDataset(datasetId) {
  return alertRules.filter(r => r.datasetId === datasetId)
}

function getAlertsForDataset(datasetId, status = null) {
  let filtered = alertHistory.filter(a => a.datasetId === datasetId)
  if (status) {
    filtered = filtered.filter(a => a.status === status)
  }
  return filtered.sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt))
}

function getFiringAlerts(datasetId = null) {
  let filtered = alertHistory.filter(a => a.status === 'firing')
  if (datasetId) {
    filtered = filtered.filter(a => a.datasetId === datasetId)
  }
  return filtered
}

function getAlertStats(datasetId = null) {
  let data = datasetId ? alertHistory.filter(a => a.datasetId === datasetId) : alertHistory
  return {
    total: data.length,
    firing: data.filter(a => a.status === 'firing').length,
    acknowledged: data.filter(a => a.status === 'acknowledged').length,
    resolved: data.filter(a => a.status === 'resolved').length,
    critical: data.filter(a => a.severity === 'critical').length,
    warning: data.filter(a => a.severity === 'warning').length,
    info: data.filter(a => a.severity === 'info').length,
    byType: data.reduce((acc, a) => {
      acc[a.ruleType] = (acc[a.ruleType] || 0) + 1
      return acc
    }, {})
  }
}

function simulateAlert(ruleId) {
  const rule = alertRules.find(r => r.id === ruleId)
  if (!rule) return null
  const badValue = rule.operator === '<' ? rule.threshold * 0.7 : rule.threshold * 1.5
  return evaluateRule(ruleId, badValue)
}

function startPolling(intervalMs = 60000) {
  if (polling.value) return
  polling.value = true
  pollInterval = setInterval(() => {
    alertRules.forEach(rule => {
      if (rule.enabled) {
        const lastValue = alertEvaluations.get(rule.id)?.value || 0.9
        const newValue = lastValue + (Math.random() - 0.5) * 0.1
        evaluateRule(rule.id, Math.max(0, Math.min(1, newValue)))
      }
    })
  }, intervalMs)
}

function stopPolling() {
  polling.value = false
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

function formatDateTime(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const alertService = {
  alertRules,
  alertHistory,
  alertEvaluations,
  polling,
  evaluateRule,
  triggerAlert,
  acknowledgeAlert,
  resolveAlert,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  toggleAlertRule,
  getRulesForDataset,
  getAlertsForDataset,
  getFiringAlerts,
  getAlertStats,
  simulateAlert,
  startPolling,
  stopPolling,
  alertSeverityMap,
  alertStatusMap,
  alertRuleTypeMap,
  reset: function() {
    stopPolling()
    alertRules.splice(0, alertRules.length, ...qualityAlertRules)
    alertHistory.splice(0, alertHistory.length, ...qualityAlertHistory)
    alertEvaluations.clear()
  }
}
