import { ref, computed } from 'vue'
import {
  users,
  datasets,
  datasetTeamMapping,
  teams,
  sensitivityLevels,
  importRecords as initialRecords,
  importStatusMap
} from '../data/mockData'

class ImportService {
  constructor() {
    this.currentUserId = ref('u-022')
    this._records = ref([...initialRecords])
  }

  switchUser(userId) {
    if (users[userId]) {
      this.currentUserId.value = userId
      return true
    }
    return false
  }

  getImportRecords(filters = {}) {
    let result = [...this._records.value]

    if (filters.type) {
      result = result.filter(r => r.type === filters.type)
    }
    if (filters.status) {
      result = result.filter(r => r.status === filters.status)
    }
    if (filters.operatorId) {
      result = result.filter(r => r.operatorId === filters.operatorId)
    }

    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  getImportRecord(recordId) {
    return this._records.value.find(r => r.id === recordId)
  }

  getMyImports(userId = this.currentUserId.value) {
    return this.getImportRecords({ operatorId: userId })
  }

  getStatusInfo(status) {
    return importStatusMap[status] || importStatusMap['pending']
  }

  parseMetadataContent(content, type = 'metadata') {
    if (type === 'metadata') {
      return this._parseMetadataRecords(content)
    } else if (type === 'lineage') {
      return this._parseLineageRecords(content)
    }
    return { records: [], errors: [] }
  }

  _parseMetadataRecords(content) {
    const records = []
    const errors = []

    let parsed
    try {
      parsed = typeof content === 'string' ? JSON.parse(content) : content
    } catch (e) {
      return { records: [], errors: [{ row: 0, reason: 'JSON 解析失败：' + e.message }] }
    }

    const items = Array.isArray(parsed) ? parsed : (parsed.records || [])

    items.forEach((item, idx) => {
      const validation = this._validateMetadataRecord(item)
      if (validation.valid) {
        records.push(this._normalizeMetadataRecord(item))
      } else {
        errors.push({ row: idx + 1, name: item.id || item.name, reason: validation.reason })
      }
    })

    return { records, errors }
  }

  _parseLineageRecords(content) {
    const records = []
    const errors = []

    let parsed
    try {
      parsed = typeof content === 'string' ? JSON.parse(content) : content
    } catch (e) {
      return { records: [], errors: [{ row: 0, reason: 'JSON 解析失败：' + e.message }] }
    }

    const items = Array.isArray(parsed) ? parsed : (parsed.edges || [])

    items.forEach((item, idx) => {
      const validation = this._validateLineageRecord(item)
      if (validation.valid) {
        records.push(this._normalizeLineageRecord(item))
      } else {
        errors.push({ row: idx + 1, name: item.id || `${item.sourceDataset}.${item.sourceField}`, reason: validation.reason })
      }
    })

    return { records, errors }
  }

  _validateMetadataRecord(record) {
    if (!record.id && !record.name) {
      return { valid: false, reason: '缺少数据集 ID 或名称' }
    }
    if (!record.owner && !record.teamId) {
      return { valid: false, reason: '缺少所有者或所属团队' }
    }
    if (record.teamId && !teams[record.teamId]) {
      return { valid: false, reason: `团队 ID 不存在：${record.teamId}` }
    }
    if (record.sensitivityLevel && !sensitivityLevels[record.sensitivityLevel]) {
      return { valid: false, reason: `敏感度级别无效：${record.sensitivityLevel}` }
    }
    if (!record.fields || !Array.isArray(record.fields) || record.fields.length === 0) {
      return { valid: false, reason: '字段列表不能为空' }
    }
    return { valid: true }
  }

  _validateLineageRecord(record) {
    if (!record.sourceDataset || !record.targetDataset) {
      return { valid: false, reason: '缺少源数据集或目标数据集' }
    }
    if (!record.sourceField || !record.targetField) {
      return { valid: false, reason: '缺少源字段或目标字段' }
    }
    if (record.sourceDataset && !datasets[record.sourceDataset]) {
      return { valid: false, reason: `源数据集不存在：${record.sourceDataset}` }
    }
    if (record.targetDataset && !datasets[record.targetDataset]) {
      return { valid: false, reason: `目标数据集不存在：${record.targetDataset}` }
    }
    return { valid: true }
  }

  _normalizeMetadataRecord(record) {
    const id = record.id || `ds-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const now = new Date().toISOString().slice(0, 10)

    return {
      id,
      name: record.name || id,
      description: record.description || '',
      owner: record.owner || '',
      storageLocation: record.storageLocation || '',
      updateFrequency: record.updateFrequency || '不定期',
      dataVolume: record.dataVolume || '',
      createdTime: record.createdTime || now,
      updatedTime: record.updatedTime || now,
      tags: record.tags || [],
      fields: record.fields.map((f, idx) => ({
        name: f.name || `field_${idx}`,
        type: f.type || 'STRING',
        description: f.description || '',
        nullable: f.nullable !== false,
        sample: f.sample || ''
      }))
    }
  }

  _normalizeLineageRecord(record) {
    return {
      id: record.id || `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceDataset: record.sourceDataset,
      sourceField: record.sourceField,
      targetDataset: record.targetDataset,
      targetField: record.targetField,
      transformType: record.transformType || 'direct',
      description: record.description || '',
      confidence: record.confidence || 1.0
    }
  }

  async startImport(options = {}) {
    const {
      type = 'metadata',
      title = '批量导入',
      fileName = 'import.json',
      content,
      operatorId = this.currentUserId.value
    } = options

    const user = users[operatorId]
    const { records, errors } = this.parseMetadataContent(content, type)

    const newRecord = {
      id: `imp-${String(this._records.value.length + 1).padStart(3, '0')}`,
      type,
      title,
      fileName,
      totalCount: records.length + errors.length,
      successCount: 0,
      failedCount: errors.length,
      operatorId,
      operatorName: user?.name || '未知用户',
      status: 'processing',
      createdAt: this._formatDate(new Date()),
      completedAt: null,
      errorMessage: errors.length > 0 ? '部分记录验证失败' : null,
      details: {
        successful: [],
        failed: errors.map(e => ({ name: e.name, reason: e.reason }))
      }
    }

    this._records.value.unshift(newRecord)

    return new Promise((resolve) => {
      setTimeout(() => {
        records.forEach(record => {
          if (type === 'metadata') {
            if (!datasets[record.id]) {
              datasets[record.id] = record
              datasetTeamMapping[record.id] = {
                teamId: record.teamId || Object.keys(teams)[0],
                sensitivityLevel: record.sensitivityLevel || 'internal',
                requiresApproval: record.requiresApproval || false
              }
              newRecord.details.successful.push(record.id)
              newRecord.successCount++
            } else {
              newRecord.details.failed.push({ name: record.id, reason: '数据集 ID 已存在' })
              newRecord.failedCount++
            }
          }
        })

        newRecord.status = newRecord.failedCount === 0 ? 'completed' :
          newRecord.successCount === 0 ? 'failed' : 'partial'
        newRecord.completedAt = this._formatDate(new Date())

        resolve({
          success: true,
          record: newRecord,
          stats: {
            total: newRecord.totalCount,
            success: newRecord.successCount,
            failed: newRecord.failedCount
          }
        })
      }, 100)
    })
  }

  validateImport(content, type = 'metadata') {
    const result = this.parseMetadataContent(content, type)
    return {
      ...result,
      valid: result.errors.length === 0
    }
  }

  getImportStats(userId = this.currentUserId.value) {
    const records = this._records.value
    return {
      total: records.length,
      byStatus: records.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1
        return acc
      }, {}),
      byType: records.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1
        return acc
      }, {}),
      myImports: records.filter(r => r.operatorId === userId).length,
      lastWeekImports: records.filter(r => {
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        return new Date(r.createdAt) >= oneWeekAgo
      }).length
    }
  }

  cancelImport(recordId) {
    const record = this.getImportRecord(recordId)
    if (record && record.status === 'processing') {
      record.status = 'failed'
      record.errorMessage = '用户取消导入'
      record.completedAt = this._formatDate(new Date())
      return true
    }
    return false
  }

  retryImport(recordId) {
    const record = this.getImportRecord(recordId)
    if (!record) return null

    const newRecord = {
      ...record,
      id: `imp-${String(this._records.value.length + 1).padStart(3, '0')}`,
      status: 'processing',
      createdAt: this._formatDate(new Date()),
      completedAt: null,
      successCount: 0,
      failedCount: record.details.failed?.length || 0,
      details: {
        successful: [],
        failed: [...(record.details.failed || [])]
      }
    }

    this._records.value.unshift(newRecord)
    return newRecord
  }

  getImportTemplate(type = 'metadata') {
    if (type === 'metadata') {
      return JSON.stringify({
        records: [
          {
            id: 'ds-xxx',
            name: '数据集名称',
            description: '数据集描述',
            teamId: 'team-data-platform',
            sensitivityLevel: 'internal',
            requiresApproval: false,
            storageLocation: 'Hive / ods.table_name',
            updateFrequency: '每日',
            dataVolume: '100万行',
            tags: ['标签1', '标签2'],
            fields: [
              {
                name: 'id',
                type: 'BIGINT',
                description: '主键',
                nullable: false,
                sample: '10001'
              }
            ]
          }
        ]
      }, null, 2)
    } else if (type === 'lineage') {
      return JSON.stringify({
        edges: [
          {
            id: 'e-xxx',
            sourceDataset: 'ds-001',
            sourceField: 'user_id',
            targetDataset: 'ds-002',
            targetField: 'user_id',
            transformType: 'direct',
            description: '字段映射关系'
          }
        ]
      }, null, 2)
    }
    return '{}'
  }

  resetImports() {
    this._records.value = [...initialRecords]
  }

  _formatDate(date) {
    const pad = n => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }
}

export const importService = new ImportService()
