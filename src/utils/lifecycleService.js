import { reactive } from 'vue'
import { datasetLifecycleStates, lifecycleStateMap, retentionPolicyMap } from '../data/mockData.js'

const lifecycleStates = reactive([...datasetLifecycleStates])
const archiveQueue = reactive([])
const lifecycleEvents = reactive([])

function getLifecycleState(datasetId) {
  return lifecycleStates.find(s => s.datasetId === datasetId) || null
}

function getLifecycleStateDisplay(datasetId) {
  const state = getLifecycleState(datasetId)
  if (!state) return null
  return lifecycleStateMap[state.currentState] || null
}

function transitionState(datasetId, targetState, metadata = {}) {
  const state = getLifecycleState(datasetId)
  if (!state) return null

  const validTransitions = {
    'active': ['pending_archive', 'archived', 'deprecated'],
    'pending_archive': ['active', 'archived'],
    'archived': ['active'],
    'deprecated': ['active', 'archived']
  }

  if (!validTransitions[state.currentState]?.includes(targetState)) {
    throw new Error(`Invalid state transition: ${state.currentState} -> ${targetState}`)
  }

  const event = {
    id: `lifecycle-event-${Date.now()}`,
    datasetId,
    fromState: state.currentState,
    toState: targetState,
    timestamp: formatDateTime(new Date()),
    operatorId: metadata.operatorId || null,
    operatorName: metadata.operatorName || null,
    reason: metadata.reason || null
  }
  lifecycleEvents.unshift(event)

  state.currentState = targetState

  if (targetState === 'archived') {
    state.archivedAt = formatDateTime(new Date())
    state.archiveReason = metadata.reason || null
  }
  if (targetState === 'deprecated') {
    state.deprecatedAt = formatDateTime(new Date())
    state.deprecationNote = metadata.reason || null
    state.successorDatasetId = metadata.successorDatasetId || null
  }
  if (targetState === 'active' && state.archivedAt) {
    state.archivedAt = null
    state.archiveReason = null
  }
  if (targetState === 'active' && state.deprecatedAt) {
    state.deprecatedAt = null
    state.deprecationNote = null
    state.successorDatasetId = null
  }

  return state
}

function archiveDataset(datasetId, metadata = {}) {
  return transitionState(datasetId, 'archived', metadata)
}

function restoreDataset(datasetId, metadata = {}) {
  const state = getLifecycleState(datasetId)
  if (!state) return null
  if (state.currentState === 'archived') {
    return transitionState(datasetId, 'active', { ...metadata, reason: '手动恢复已归档数据集' })
  }
  if (state.currentState === 'deprecated') {
    return transitionState(datasetId, 'active', { ...metadata, reason: '手动恢复已废弃数据集' })
  }
  return null
}

function deprecateDataset(datasetId, successorDatasetId, note, metadata = {}) {
  return transitionState(datasetId, 'deprecated', {
    ...metadata,
    successorDatasetId,
    reason: note
  })
}

function updateRetentionPolicy(datasetId, policyKey) {
  const state = getLifecycleState(datasetId)
  if (!state) return null
  const policy = retentionPolicyMap[policyKey]
  if (!policy) return null
  state.retentionPolicy = policyKey
  state.archiveAfterDays = policy.archiveDays
  state.deleteAfterDays = policy.deleteDays
  return state
}

function shouldArchive(datasetId) {
  const state = getLifecycleState(datasetId)
  if (!state || state.currentState !== 'active' || !state.archiveAfterDays) return false
  const lastAccessed = new Date(state.lastAccessedAt)
  const daysSinceAccess = Math.floor((Date.now() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24))
  return daysSinceAccess >= state.archiveAfterDays && state.accessCount30d < 100
}

function findCandidatesForArchive() {
  return lifecycleStates
    .filter(s => s.currentState === 'active' && shouldArchive(s.datasetId))
    .map(s => ({
      ...s,
      daysSinceLastAccess: Math.floor((Date.now() - new Date(s.lastAccessedAt).getTime()) / (1000 * 60 * 60 * 24)),
      riskLevel: calculateArchiveRisk(s)
    }))
}

function calculateArchiveRisk(state) {
  if (state.accessCount30d > 1000) return 'high'
  if (state.accessCount30d > 100) return 'medium'
  return 'low'
}

function addToArchiveQueue(datasetId, reason = '') {
  const existing = archiveQueue.find(q => q.datasetId === datasetId)
  if (existing) return null

  const state = getLifecycleState(datasetId)
  if (!state) return null

  const queueItem = {
    datasetId,
    addedAt: formatDateTime(new Date()),
    reason,
    state
  }
  archiveQueue.push(queueItem)
  return queueItem
}

function removeFromArchiveQueue(datasetId) {
  const idx = archiveQueue.findIndex(q => q.datasetId === datasetId)
  if (idx === -1) return false
  archiveQueue.splice(idx, 1)
  return true
}

function getLifecycleStats() {
  return {
    total: lifecycleStates.length,
    active: lifecycleStates.filter(s => s.currentState === 'active').length,
    archived: lifecycleStates.filter(s => s.currentState === 'archived').length,
    deprecated: lifecycleStates.filter(s => s.currentState === 'deprecated').length,
    pendingArchive: lifecycleStates.filter(s => s.currentState === 'pending_archive').length,
    byPolicy: lifecycleStates.reduce((acc, s) => {
      acc[s.retentionPolicy] = (acc[s.retentionPolicy] || 0) + 1
      return acc
    }, {}),
    storageSaved: lifecycleStates
      .filter(s => s.currentState === 'archived')
      .reduce((acc, s) => acc + (s.accessCount30d < 10 ? 100 : 10), 0)
  }
}

function getLifecycleEvents(datasetId = null, limit = 50) {
  let filtered = lifecycleEvents
  if (datasetId) {
    filtered = filtered.filter(e => e.datasetId === datasetId)
  }
  return filtered.slice(0, limit)
}

function bulkArchive(datasetIds, metadata = {}) {
  const results = []
  datasetIds.forEach(id => {
    try {
      const result = archiveDataset(id, metadata)
      results.push({ datasetId: id, success: true, state: result })
    } catch (e) {
      results.push({ datasetId: id, success: false, error: e.message })
    }
  })
  return results
}

function bulkRestore(datasetIds, metadata = {}) {
  const results = []
  datasetIds.forEach(id => {
    try {
      const result = restoreDataset(id, metadata)
      results.push({ datasetId: id, success: true, state: result })
    } catch (e) {
      results.push({ datasetId: id, success: false, error: e.message })
    }
  })
  return results
}

function formatDateTime(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const lifecycleService = {
  lifecycleStates,
  archiveQueue,
  lifecycleEvents,
  getLifecycleState,
  getLifecycleStateDisplay,
  transitionState,
  archiveDataset,
  restoreDataset,
  deprecateDataset,
  updateRetentionPolicy,
  shouldArchive,
  findCandidatesForArchive,
  addToArchiveQueue,
  removeFromArchiveQueue,
  getLifecycleStats,
  getLifecycleEvents,
  bulkArchive,
  bulkRestore,
  lifecycleStateMap,
  retentionPolicyMap,
  reset: function() {
    lifecycleStates.splice(0, lifecycleStates.length, ...datasetLifecycleStates)
    archiveQueue.splice(0, archiveQueue.length)
    lifecycleEvents.splice(0, lifecycleEvents.length)
  }
}
