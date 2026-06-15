import { reactive } from 'vue'
import { subscriberActivityMetrics } from '../data/mockData.js'
import { datasets } from '../data/mockData.js'

const activityMetrics = reactive([...subscriberActivityMetrics])
const userActivityLog = reactive([])

function getActivityForDataset(datasetId) {
  return activityMetrics.find(m => m.datasetId === datasetId) || null
}

function getTopDatasetsByActivity(metric = 'viewCount30d', limit = 10) {
  return [...activityMetrics]
    .filter(m => datasets[m.datasetId])
    .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
    .slice(0, limit)
    .map(m => ({
      ...m,
      dataset: datasets[m.datasetId]
    }))
}

function recordActivity(datasetId, userId, activityType, metadata = {}) {
  const logEntry = {
    id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    datasetId,
    userId,
    activityType,
    timestamp: formatDateTime(new Date()),
    metadata
  }
  userActivityLog.unshift(logEntry)

  const metric = getActivityForDataset(datasetId) || createDefaultMetric(datasetId)
  const now = new Date()
  const todayKey = `${now.getMonth() + 1}/${now.getDate()}`

  if (metric.last30DaysData.length === 0 || metric.last30DaysData[metric.last30DaysData.length - 1].date !== todayKey) {
    metric.last30DaysData.push({ date: todayKey, views: 0, queries: 0, downloads: 0 })
    if (metric.last30DaysData.length > 30) metric.last30DaysData.shift()
  }

  const todayData = metric.last30DaysData[metric.last30DaysData.length - 1]
  if (activityType === 'view') {
    todayData.views++
    metric.viewCount30d++
  } else if (activityType === 'query') {
    todayData.queries++
    metric.queryCount30d++
  } else if (activityType === 'download') {
    todayData.downloads++
    metric.downloadCount30d++
  }

  return logEntry
}

function createDefaultMetric(datasetId) {
  const metric = {
    datasetId,
    subscriberCount: 0,
    viewCount30d: 0,
    queryCount30d: 0,
    downloadCount30d: 0,
    avgSessionDuration: 0,
    activeUsers7d: 0,
    activeUsers30d: 0,
    churnRate: 0,
    subscriptionGrowthRate: 0,
    last30DaysData: []
  }
  activityMetrics.push(metric)
  return metric
}

function getActivityTrend(datasetId, days = 15) {
  const metric = getActivityForDataset(datasetId)
  if (!metric || !metric.last30DaysData.length) {
    return { dates: [], views: [], queries: [], downloads: [], total: [] }
  }

  const data = metric.last30DaysData.slice(-days)
  return {
    dates: data.map(d => d.date),
    views: data.map(d => d.views),
    queries: data.map(d => d.queries),
    downloads: data.map(d => d.downloads),
    total: data.map(d => d.views + d.queries + d.downloads)
  }
}

function getEngagementScore(datasetId) {
  const metric = getActivityForDataset(datasetId)
  if (!metric) return 0

  const viewScore = Math.min(100, metric.viewCount30d / 10000 * 100)
  const queryScore = Math.min(100, metric.queryCount30d / 5000 * 100)
  const downloadScore = Math.min(100, metric.downloadCount30d / 500 * 100)
  const subscriberScore = Math.min(100, metric.subscriberCount / 20 * 100)
  const retentionScore = Math.min(100, (1 - (metric.churnRate || 0)) * 100)
  const growthScore = Math.min(100, Math.max(0, (metric.subscriptionGrowthRate || 0) + 0.5) * 200)

  return Math.round(
    viewScore * 0.3 +
    queryScore * 0.25 +
    downloadScore * 0.15 +
    subscriberScore * 0.15 +
    retentionScore * 0.1 +
    growthScore * 0.05
  )
}

function getActivityHeatmap(datasetId) {
  const metric = getActivityForDataset(datasetId)
  if (!metric) return []

  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)

  return days.map((day, di) =>
    hours.map((hour, hi) => ({
      day,
      hour,
      value: Math.floor(Math.random() * (di < 5 ? 50 : 20))
    }))
  )
}

function getOverallActivityStats() {
  const allMetrics = activityMetrics.filter(m => datasets[m.datasetId])

  return {
    totalViews: allMetrics.reduce((acc, m) => acc + (m.viewCount30d || 0), 0),
    totalQueries: allMetrics.reduce((acc, m) => acc + (m.queryCount30d || 0), 0),
    totalDownloads: allMetrics.reduce((acc, m) => acc + (m.downloadCount30d || 0), 0),
    totalSubscribers: allMetrics.reduce((acc, m) => acc + (m.subscriberCount || 0), 0),
    avgEngagement: allMetrics.length > 0
      ? Math.round(allMetrics.reduce((acc, m) => acc + getEngagementScore(m.datasetId), 0) / allMetrics.length)
      : 0,
    activeDatasets: allMetrics.filter(m => (m.viewCount30d || 0) > 0).length,
    totalActiveUsers7d: allMetrics.reduce((acc, m) => acc + (m.activeUsers7d || 0), 0),
    totalActiveUsers30d: allMetrics.reduce((acc, m) => acc + (m.activeUsers30d || 0), 0),
    avgChurnRate: allMetrics.length > 0
      ? Math.round(allMetrics.reduce((acc, m) => acc + (m.churnRate || 0), 0) / allMetrics.length * 100) / 100
      : 0,
    avgGrowthRate: allMetrics.length > 0
      ? Math.round(allMetrics.reduce((acc, m) => acc + (m.subscriptionGrowthRate || 0), 0) / allMetrics.length * 100) / 100
      : 0
  }
}

function getActivityDistribution(datasetId) {
  const metric = getActivityForDataset(datasetId)
  if (!metric) return []

  const total = (metric.viewCount30d || 0) + (metric.queryCount30d || 0) + (metric.downloadCount30d || 0)
  if (total === 0) return []

  return [
    { type: '浏览', value: metric.viewCount30d || 0, percentage: Math.round((metric.viewCount30d || 0) / total * 100), color: '#3b82f6' },
    { type: '查询', value: metric.queryCount30d || 0, percentage: Math.round((metric.queryCount30d || 0) / total * 100), color: '#10b981' },
    { type: '下载', value: metric.downloadCount30d || 0, percentage: Math.round((metric.downloadCount30d || 0) / total * 100), color: '#f59e0b' }
  ]
}

function getRecentActivity(datasetId = null, limit = 50) {
  let filtered = userActivityLog
  if (datasetId) {
    filtered = filtered.filter(a => a.datasetId === datasetId)
  }
  return filtered.slice(0, limit)
}

function getTopContributors(datasetId, limit = 5) {
  const metric = getActivityForDataset(datasetId)
  if (!metric) return []

  const contributors = [
    { userId: 'u-001', name: '张明', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang', contributions: 156, lastActive: '2024-06-15' },
    { userId: 'u-002', name: '李华', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li', contributions: 98, lastActive: '2024-06-14' },
    { userId: 'u-003', name: '王芳', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang', contributions: 67, lastActive: '2024-06-13' },
    { userId: 'u-004', name: '刘强', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liu', contributions: 45, lastActive: '2024-06-12' },
    { userId: 'u-005', name: '陈静', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chen', contributions: 23, lastActive: '2024-06-11' }
  ]

  return contributors.slice(0, limit)
}

function getSubscriberRetention(datasetId) {
  const metric = getActivityForDataset(datasetId)
  if (!metric) return { labels: [], values: [] }

  return {
    labels: ['第1天', '第7天', '第14天', '第30天', '第60天', '第90天'],
    values: [100, 85, 72, 58, 45, 38]
  }
}

function updateSubscriberCount(datasetId, delta) {
  const metric = getActivityForDataset(datasetId) || createDefaultMetric(datasetId)
  metric.subscriberCount = Math.max(0, (metric.subscriberCount || 0) + delta)
  return metric.subscriberCount
}

function formatDateTime(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const activityService = {
  activityMetrics,
  userActivityLog,
  getActivityForDataset,
  getTopDatasetsByActivity,
  recordActivity,
  getActivityTrend,
  getEngagementScore,
  getActivityHeatmap,
  getOverallActivityStats,
  getActivityDistribution,
  getRecentActivity,
  getTopContributors,
  getSubscriberRetention,
  updateSubscriberCount,
  reset: function() {
    activityMetrics.splice(0, activityMetrics.length, ...subscriberActivityMetrics)
    userActivityLog.splice(0, userActivityLog.length)
  }
}
