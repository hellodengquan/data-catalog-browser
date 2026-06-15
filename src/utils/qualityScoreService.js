import { ref, computed } from 'vue'
import {
  datasets,
  fieldQualityMetrics as initialMetrics,
  datasetScores as initialScores,
  scoreDimensionLabels
} from '../data/mockData'

class QualityScoreService {
  constructor() {
    this._metrics = ref(JSON.parse(JSON.stringify(initialMetrics)))
    this._scores = ref(JSON.parse(JSON.stringify(initialScores)))
    this._sortBy = ref('overall')
    this._sortOrder = ref('desc')
  }

  get sortBy() {
    return this._sortBy.value
  }

  get sortOrder() {
    return this._sortOrder.value
  }

  get dimensionLabels() {
    return scoreDimensionLabels
  }

  getSortOptions() {
    return [
      { key: 'overall', label: '综合评分' },
      { key: 'quality', label: '数据质量' },
      { key: 'usability', label: '易用性' },
      { key: 'completeness', label: '元数据完整性' },
      { key: 'lineageCoverage', label: '血缘覆盖度' },
      { key: 'name', label: '名称' },
      { key: 'updateTime', label: '更新时间' }
    ]
  }

  setSortBy(key) {
    if (this._sortBy.value === key) {
      this._sortOrder.value = this._sortOrder.value === 'desc' ? 'asc' : 'desc'
    } else {
      this._sortBy.value = key
      this._sortOrder.value = 'desc'
    }
  }

  getFieldQuality(datasetId, fieldName) {
    const datasetMetrics = this._metrics.value[datasetId]
    if (!datasetMetrics) return null
    return datasetMetrics[fieldName] || null
  }

  getDatasetFieldMetrics(datasetId) {
    return this._metrics.value[datasetId] || {}
  }

  getDatasetScore(datasetId) {
    return this._scores.value[datasetId] || {
      overall: 0,
      quality: 0,
      usability: 0,
      completeness: 0,
      lineageCoverage: 0
    }
  }

  getAllDatasetScores() {
    return { ...this._scores.value }
  }

  getScoreColor(score) {
    if (score >= 90) return '#10b981'
    if (score >= 80) return '#3b82f6'
    if (score >= 70) return '#f59e0b'
    return '#ef4444'
  }

  getScoreLevel(score) {
    if (score >= 90) return 'excellent'
    if (score >= 80) return 'good'
    if (score >= 70) return 'fair'
    return 'poor'
  }

  getScoreLabel(score) {
    const levels = {
      excellent: '优秀',
      good: '良好',
      fair: '一般',
      poor: '较差'
    }
    return levels[this.getScoreLevel(score)]
  }

  getMetricLabel(metricKey) {
    const labels = {
      completeness: '完整性',
      accuracy: '准确性',
      uniqueness: '唯一性',
      timeliness: '时效性',
      overallScore: '综合分'
    }
    return labels[metricKey] || metricKey
  }

  getMetricColor(value) {
    if (value >= 0.95) return '#10b981'
    if (value >= 0.85) return '#3b82f6'
    if (value >= 0.70) return '#f59e0b'
    return '#ef4444'
  }

  sortDatasets(datasetList) {
    const sortBy = this._sortBy.value
    const sortOrder = this._sortOrder.value

    return [...datasetList].sort((a, b) => {
      let valA, valB

      if (sortBy === 'name') {
        valA = a.name || ''
        valB = b.name || ''
      } else if (sortBy === 'updateTime') {
        valA = new Date(a.updatedTime || 0).getTime()
        valB = new Date(b.updatedTime || 0).getTime()
      } else {
        const scoreA = this.getDatasetScore(a.id || a)
        const scoreB = this.getDatasetScore(b.id || b)
        valA = scoreA[sortBy] || 0
        valB = scoreB[sortBy] || 0
      }

      if (typeof valA === 'string') {
        return sortOrder === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB)
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB
    })
  }

  getRankedDatasets(datasetIds, limit = 10) {
    const ids = datasetIds || Object.keys(this._scores.value)
    return ids
      .map(id => ({
        id,
        ...datasets[id],
        score: this.getDatasetScore(id)
      }))
      .filter(d => d.id)
      .sort((a, b) => b.score.overall - a.score.overall)
      .slice(0, limit)
  }

  calculateFieldQuality(fieldMetrics) {
    if (!fieldMetrics) return { overall: 0, level: 'poor' }
    const weights = {
      completeness: 0.3,
      accuracy: 0.3,
      uniqueness: 0.2,
      timeliness: 0.2
    }

    let overall = 0
    Object.keys(weights).forEach(key => {
      if (typeof fieldMetrics[key] === 'number') {
        overall += fieldMetrics[key] * weights[key]
      }
    })

    const score = Math.round(overall * 100)
    return {
      overall: score,
      level: this.getScoreLevel(score),
      label: this.getScoreLabel(score)
    }
  }

  calculateDatasetQuality(datasetId) {
    const fieldMetrics = this.getDatasetFieldMetrics(datasetId)
    const fieldNames = Object.keys(fieldMetrics)
    if (fieldNames.length === 0) return { avgScore: 0, fieldCount: 0 }

    let totalScore = 0
    fieldNames.forEach(name => {
      const calc = this.calculateFieldQuality(fieldMetrics[name])
      totalScore += calc.overall
    })

    return {
      avgScore: Math.round(totalScore / fieldNames.length),
      fieldCount: fieldNames.length
    }
  }

  updateFieldMetric(datasetId, fieldName, metricKey, value) {
    if (!this._metrics.value[datasetId]) {
      this._metrics.value[datasetId] = {}
    }
    if (!this._metrics.value[datasetId][fieldName]) {
      this._metrics.value[datasetId][fieldName] = {
        completeness: 0,
        accuracy: 0,
        uniqueness: 0,
        timeliness: 0,
        overallScore: 0
      }
    }
    this._metrics.value[datasetId][fieldName][metricKey] = value

    const calc = this.calculateFieldQuality(this._metrics.value[datasetId][fieldName])
    this._metrics.value[datasetId][fieldName].overallScore = calc.overall

    return this._metrics.value[datasetId][fieldName]
  }

  updateDatasetScore(datasetId, dimension, value) {
    if (!this._scores.value[datasetId]) {
      this._scores.value[datasetId] = {
        overall: 0,
        quality: 0,
        usability: 0,
        completeness: 0,
        lineageCoverage: 0
      }
    }
    this._scores.value[datasetId][dimension] = value

    const weights = {
      quality: 0.4,
      usability: 0.2,
      completeness: 0.2,
      lineageCoverage: 0.2
    }

    let overall = 0
    Object.keys(weights).forEach(key => {
      overall += (this._scores.value[datasetId][key] || 0) * weights[key]
    })
    this._scores.value[datasetId].overall = Math.round(overall)

    return this._scores.value[datasetId]
  }

  getQualityTrend(datasetId, days = 7) {
    const baseScore = this.getDatasetScore(datasetId).overall
    const trend = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const variance = Math.round((Math.random() - 0.5) * 6)
      trend.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        score: Math.max(60, Math.min(100, baseScore + variance))
      })
    }
    return trend
  }

  getScoreBreakdown(datasetId) {
    const score = this.getDatasetScore(datasetId)
    return [
      { key: 'quality', label: '数据质量', value: score.quality, color: this.getScoreColor(score.quality) },
      { key: 'usability', label: '易用性', value: score.usability, color: this.getScoreColor(score.usability) },
      { key: 'completeness', label: '元数据完整性', value: score.completeness, color: this.getScoreColor(score.completeness) },
      { key: 'lineageCoverage', label: '血缘覆盖度', value: score.lineageCoverage, color: this.getScoreColor(score.lineageCoverage) }
    ]
  }

  resetScores() {
    this._metrics.value = JSON.parse(JSON.stringify(initialMetrics))
    this._scores.value = JSON.parse(JSON.stringify(initialScores))
    this._sortBy.value = 'overall'
    this._sortOrder.value = 'desc'
  }
}

export const qualityScoreService = new QualityScoreService()
