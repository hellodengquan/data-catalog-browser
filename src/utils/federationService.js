import { reactive, ref } from 'vue'
import { federatedCatalogInstances, federatedDatasetMappings, instanceHealthStatusMap } from '../data/mockData.js'
import { datasets as localDatasets } from '../data/mockData.js'

const instances = reactive([...federatedCatalogInstances])
const datasetMappings = reactive([...federatedDatasetMappings])
const cachedDatasets = reactive(new Map())
const syncInProgress = ref(false)
const syncHistory = reactive([])
const searchResults = reactive([])

function getAllInstances(enabledOnly = false) {
  if (enabledOnly) {
    return instances.filter(i => i.enabled)
  }
  return instances
}

function getInstance(instanceId) {
  return instances.find(i => i.id === instanceId) || null
}

function addInstance(instanceData) {
  const newInstance = {
    id: `instance-${Date.now()}`,
    status: 'offline',
    healthScore: 0,
    datasetCount: 0,
    lineageCount: 0,
    lastSyncAt: null,
    enabled: true,
    ...instanceData,
    createdAt: formatDateTime(new Date())
  }
  instances.push(newInstance)
  return newInstance
}

function updateInstance(instanceId, updates) {
  const idx = instances.findIndex(i => i.id === instanceId)
  if (idx === -1) return null
  instances[idx] = { ...instances[idx], ...updates }
  return instances[idx]
}

function removeInstance(instanceId) {
  const idx = instances.findIndex(i => i.id === instanceId)
  if (idx === -1) return false
  instances.splice(idx, 1)
  const mappingsToRemove = datasetMappings.filter(m => m.instanceId === instanceId)
  mappingsToRemove.forEach(m => {
    const mIdx = datasetMappings.indexOf(m)
    if (mIdx > -1) datasetMappings.splice(mIdx, 1)
  })
  return true
}

function toggleInstance(instanceId) {
  const instance = getInstance(instanceId)
  if (!instance) return null
  instance.enabled = !instance.enabled
  return instance
}

async function syncInstance(instanceId) {
  const instance = getInstance(instanceId)
  if (!instance) return null

  syncInProgress.value = true
  instance.status = 'syncing'

  try {
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700))

    if (Math.random() > 0.2) {
      instance.status = 'online'
      instance.healthScore = Math.floor(80 + Math.random() * 20)
      instance.lastSyncAt = formatDateTime(new Date())

      const newDatasets = generateFederatedDatasets(instanceId)
      cachedDatasets.set(instanceId, newDatasets)

      syncHistory.unshift({
        id: `sync-${Date.now()}`,
        instanceId,
        instanceName: instance.name,
        type: 'full',
        status: 'success',
        syncedAt: formatDateTime(new Date()),
        datasetCount: newDatasets.length,
        error: null
      })

      syncInProgress.value = false
      return { success: true, datasetCount: newDatasets.length }
    } else {
      instance.status = 'degraded'
      instance.healthScore = Math.floor(40 + Math.random() * 30)

      syncHistory.unshift({
        id: `sync-${Date.now()}`,
        instanceId,
        instanceName: instance.name,
        type: 'full',
        status: 'failed',
        syncedAt: formatDateTime(new Date()),
        datasetCount: 0,
        error: '网络超时，连接实例失败'
      })

      syncInProgress.value = false
      return { success: false, error: '网络超时' }
    }
  } catch (e) {
    instance.status = 'offline'
    syncInProgress.value = false
    return { success: false, error: e.message }
  }
}

async function syncAllInstances() {
  const enabledInstances = instances.filter(i => i.enabled)
  const results = []
  for (const inst of enabledInstances) {
    const result = await syncInstance(inst.id)
    results.push({ instanceId: inst.id, ...result })
  }
  return results
}

function generateFederatedDatasets(instanceId) {
  const count = Math.floor(5 + Math.random() * 10)
  const datasets = []
  for (let i = 0; i < count; i++) {
    const id = `ds-f-${instanceId.replace('instance-', '')}-${String(i + 1).padStart(3, '0')}`
    const existingMapping = datasetMappings.find(m => m.federatedId === id && m.instanceId === instanceId)
    datasets.push({
      id,
      instanceId,
      name: `联邦数据集_${instanceId.split('-').pop()}_${String(i + 1).padStart(3, '0')}`,
      description: `来自 ${getInstance(instanceId)?.name} 的联邦数据集`,
      source: 'federated',
      localId: existingMapping?.localId || null,
      fields: [
        { name: 'id', type: 'BIGINT', description: '主键' },
        { name: 'name', type: 'STRING', description: '名称' },
        { name: 'created_at', type: 'DATETIME', description: '创建时间' }
      ]
    })
  }
  return datasets
}

function getFederatedDatasets(instanceId = null) {
  if (instanceId) {
    return cachedDatasets.get(instanceId) || []
  }
  const all = []
  instances.forEach(inst => {
    const ds = cachedDatasets.get(inst.id) || []
    all.push(...ds)
  })
  return all
}

function searchFederated(keyword, instanceIds = null) {
  const targetInstances = instanceIds || instances.filter(i => i.enabled).map(i => i.id)
  const results = []

  targetInstances.forEach(instId => {
    const dsList = cachedDatasets.get(instId) || []
    dsList.forEach(ds => {
      if (keyword && ds.name.includes(keyword) || ds.description?.includes(keyword)) {
        results.push(ds)
      }
    })
  })

  searchResults.splice(0, searchResults.length, ...results)
  return results
}

function mapToLocalDataset(federatedId, instanceId, localDatasetId) {
  const existingIdx = datasetMappings.findIndex(
    m => m.federatedId === federatedId && m.instanceId === instanceId
  )
  const mapping = {
    federatedId,
    instanceId,
    localId: localDatasetId
  }
  if (existingIdx > -1) {
    datasetMappings[existingIdx] = mapping
  } else {
    datasetMappings.push(mapping)
  }
  return mapping
}

function unmapDataset(federatedId, instanceId) {
  const idx = datasetMappings.findIndex(
    m => m.federatedId === federatedId && m.instanceId === instanceId
  )
  if (idx === -1) return false
  datasetMappings.splice(idx, 1)
  return true
}

function getLocalMapping(federatedId, instanceId) {
  return datasetMappings.find(
    m => m.federatedId === federatedId && m.instanceId === instanceId
  ) || null
}

function importFederatedDataset(federatedId, instanceId, userId) {
  const fedDatasets = cachedDatasets.get(instanceId) || []
  const fedDataset = fedDatasets.find(d => d.id === federatedId)
  if (!fedDataset) return null

  const newId = `ds-import-${Date.now()}`
  const newDataset = {
    id: newId,
    name: fedDataset.name,
    description: `${fedDataset.description}\n[联邦导入] 源实例: ${getInstance(instanceId)?.name}`,
    teamId: 'team-data-platform',
    ownerId: userId,
    ownerName: '联邦导入',
    sensitivityLevel: 'internal',
    requiresApproval: false,
    storageLocation: `联邦/${getInstance(instanceId)?.name}/${federatedId}`,
    updateFrequency: '按需同步',
    dataVolume: '未知',
    tags: ['federated', 'imported'],
    category: '其他',
    source: 'federated',
    lineage: { upstream: [], downstream: [] },
    fields: fedDataset.fields,
    createdAt: formatDateTime(new Date()),
    updatedAt: formatDateTime(new Date()),
    sampleData: []
  }

  localDatasets[newId] = newDataset
  mapToLocalDataset(federatedId, instanceId, newId)

  return newDataset
}

function getFederationStats() {
  const totalDatasets = instances.reduce((acc, inst) => {
    return acc + (cachedDatasets.get(inst.id)?.length || 0)
  }, 0)
  const mappedCount = datasetMappings.filter(m => m.localId).length

  return {
    instanceCount: instances.length,
    onlineCount: instances.filter(i => i.status === 'online' && i.enabled).length,
    totalDatasets,
    mappedCount,
    unmappedCount: totalDatasets - mappedCount,
    averageHealth: instances.length > 0
      ? Math.round(instances.reduce((acc, i) => acc + i.healthScore, 0) / instances.length)
      : 0,
    syncStatus: syncInProgress.value ? 'syncing' : 'idle',
    lastSyncAt: syncHistory[0]?.syncedAt || null
  }
}

function getSyncHistory(instanceId = null, limit = 20) {
  let filtered = syncHistory
  if (instanceId) {
    filtered = syncHistory.filter(h => h.instanceId === instanceId)
  }
  return filtered.slice(0, limit)
}

function formatDateTime(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const federationService = {
  instances,
  datasetMappings,
  cachedDatasets,
  syncInProgress,
  syncHistory,
  searchResults,
  getAllInstances,
  getInstance,
  addInstance,
  updateInstance,
  removeInstance,
  toggleInstance,
  syncInstance,
  syncAllInstances,
  getFederatedDatasets,
  searchFederated,
  mapToLocalDataset,
  unmapDataset,
  getLocalMapping,
  importFederatedDataset,
  getFederationStats,
  getSyncHistory,
  instanceHealthStatusMap,
  reset: function() {
    instances.splice(0, instances.length, ...federatedCatalogInstances)
    datasetMappings.splice(0, datasetMappings.length, ...federatedDatasetMappings)
    cachedDatasets.clear()
    syncHistory.splice(0, syncHistory.length)
    searchResults.splice(0, searchResults.length)
  }
}
