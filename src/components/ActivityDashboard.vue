<template>
  <div class="activity-panel">
    <div class="panel-header">
      <div class="header-title">
        <BarChart3 :size="20" />
        <span>订阅者活跃度看板</span>
      </div>
      <div class="header-actions">
        <select v-model="timeRange" class="range-select">
          <option value="7">近 7 天</option>
          <option value="15">近 15 天</option>
          <option value="30">近 30 天</option>
        </select>
        <button class="btn ghost" @click="refresh">
          <RefreshCw :size="14" /> 刷新
        </button>
      </div>
    </div>

    <div v-if="activityData" class="content-area">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: #dbeafe; color: #2563eb;">
            <Eye :size="20" />
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ formatNumber(activityData.viewCount30d) }}</span>
            <span class="stat-label">30 天浏览量</span>
          </div>
          <div class="stat-trend up">+12.5%</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #d1fae5; color: #059669;">
            <FileCode :size="20" />
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ formatNumber(activityData.queryCount30d) }}</span>
            <span class="stat-label">30 天查询量</span>
          </div>
          <div class="stat-trend up">+8.3%</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #fef3c7; color: #d97706;">
            <Download :size="20" />
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ formatNumber(activityData.downloadCount30d) }}</span>
            <span class="stat-label">30 天下载量</span>
          </div>
          <div class="stat-trend down">-2.1%</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #ede9fe; color: #7c3aed;">
            <Users :size="20" />
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ activityData.subscriberCount }}</span>
            <span class="stat-label">订阅人数</span>
          </div>
          <div class="stat-trend up">+{{ (activityData.subscriptionGrowthRate * 100).toFixed(1) }}%</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #fce7f3; color: #db2777;">
            <Target :size="20" />
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ engagementScore }}</span>
            <span class="stat-label">参与度评分</span>
          </div>
          <div class="stat-trend up">+3.2</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #fee2e2; color: #dc2626;">
            <UserMinus :size="20" />
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ (activityData.churnRate * 100).toFixed(1) }}%</span>
            <span class="stat-label">用户流失率</span>
          </div>
          <div class="stat-trend down">-0.5%</div>
        </div>
      </div>

      <div class="charts-area">
        <div class="chart-card">
          <div class="chart-header">
            <h4>活跃度趋势</h4>
            <div class="chart-legend">
              <span class="legend-item"><span class="dot" style="background: #3b82f6;"></span>浏览</span>
              <span class="legend-item"><span class="dot" style="background: #10b981;"></span>查询</span>
              <span class="legend-item"><span class="dot" style="background: #f59e0b;"></span>下载</span>
            </div>
          </div>
          <div class="chart-body">
            <svg :viewBox="`0 0 ${trendData.dates.length * 50 + 40} 200`" class="trend-chart">
              <defs>
                <linearGradient id="viewGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path :d="areaPath(trendData.views)" fill="url(#viewGradient)" />
              <polyline :points="linePoints(trendData.views)" fill="none" stroke="#3b82f6" stroke-width="2" />
              <polyline :points="linePoints(trendData.queries)" fill="none" stroke="#10b981" stroke-width="2" />
              <polyline :points="linePoints(trendData.downloads)" fill="none" stroke="#f59e0b" stroke-width="2" />
              <g>
                <text v-for="(date, i) in trendData.dates" :key="i"
                  :x="20 + i * 50" y="190" text-anchor="middle" font-size="10" fill="#6b7280">
                  {{ date }}
                </text>
              </g>
            </svg>
          </div>
        </div>

        <div class="chart-row">
          <div class="chart-card small">
            <div class="chart-header">
              <h4>活动类型分布</h4>
            </div>
            <div class="chart-body">
              <svg viewBox="0 0 200 200" class="pie-chart">
                <path
                  v-for="(item, i) in distributionData"
                  :key="i"
                  :d="pieSlice(i, distributionData.length, item.percentage)"
                  :fill="item.color"
                />
                <circle cx="100" cy="100" r="50" fill="white" />
                <text x="100" y="95" text-anchor="middle" font-size="16" font-weight="bold">
                  {{ totalActivity }}
                </text>
                <text x="100" y="115" text-anchor="middle" font-size="10" fill="#6b7280">
                  总活动
                </text>
              </svg>
              <div class="pie-legend">
                <div v-for="item in distributionData" :key="item.type" class="legend-row">
                  <span class="color-dot" :style="{ background: item.color }"></span>
                  <span class="legend-text">{{ item.type }}</span>
                  <span class="legend-value">{{ item.percentage }}%</span>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-card small">
            <div class="chart-header">
              <h4>订阅留存曲线</h4>
            </div>
            <div class="chart-body">
              <svg viewBox="0 0 300 150" class="retention-chart">
                <polyline
                  :points="retentionPoints"
                  fill="none"
                  stroke="#8b5cf6"
                  stroke-width="2"
                />
                <circle
                  v-for="(v, i) in retentionData.values"
                  :key="i"
                  :cx="20 + i * 50"
                  :cy="120 - v"
                  r="4"
                  fill="#8b5cf6"
                />
                <g>
                  <text v-for="(label, i) in retentionData.labels" :key="i"
                    :x="20 + i * 50" y="140" text-anchor="middle" font-size="10" fill="#6b7280">
                    {{ label }}
                  </text>
                </g>
              </svg>
            </div>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <h4>活跃时段热力图</h4>
          </div>
          <div class="chart-body">
            <div class="heatmap">
              <div v-for="(row, di) in heatmapData" :key="di" class="heatmap-row">
                <div class="row-label">{{ row[0]?.day }}</div>
                <div
                  v-for="(cell, hi) in row"
                  :key="hi"
                  class="heatmap-cell"
                  :style="{ background: getHeatmapColor(cell.value) }"
                  :title="`${cell.day} ${cell.hour}: ${cell.value} 次活动`"
                ></div>
              </div>
              <div class="hour-labels">
                <span v-for="(h, i) in hourLabels" :key="i">{{ h }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <h4>Top 贡献者</h4>
          </div>
          <div class="chart-body">
            <div class="contributors-list">
              <div v-for="(user, i) in topContributors" :key="user.userId" class="contributor-row">
                <span class="rank">{{ i + 1 }}</span>
                <img :src="user.avatar" class="avatar" />
                <div class="user-info">
                  <span class="user-name">{{ user.name }}</span>
                  <span class="user-last-active">上次活跃: {{ user.lastActive }}</span>
                </div>
                <div class="contribution-bar">
                  <div
                    class="bar-fill"
                    :style="{ width: (user.contributions / topContributors[0].contributions * 100) + '%' }"
                  ></div>
                </div>
                <span class="contribution-count">{{ user.contributions }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <Activity :size="48" />
      <p>暂无活跃度数据</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  BarChart3, RefreshCw, Eye, FileCode, Download, Users, Target, UserMinus, Activity
} from 'lucide-vue-next'
import { activityService } from '../utils/activityService.js'

const props = defineProps({
  datasetId: String
})

const timeRange = ref('15')

const activityData = computed(() => {
  if (props.datasetId) {
    return activityService.getActivityForDataset(props.datasetId)
  }
  return activityService.getTopDatasetsByActivity()[0]
})

const engagementScore = computed(() => {
  if (!props.datasetId) return 0
  return activityService.getEngagementScore(props.datasetId)
})

const trendData = computed(() => {
  if (!props.datasetId) return { dates: [], views: [], queries: [], downloads: [], total: [] }
  return activityService.getActivityTrend(props.datasetId, parseInt(timeRange.value))
})

const distributionData = computed(() => {
  if (!props.datasetId) return []
  return activityService.getActivityDistribution(props.datasetId)
})

const totalActivity = computed(() => {
  return distributionData.value.reduce((acc, d) => acc + d.value, 0)
})

const retentionData = computed(() => {
  if (!props.datasetId) return { labels: [], values: [] }
  return activityService.getSubscriberRetention(props.datasetId)
})

const retentionPoints = computed(() => {
  if (!retentionData.value.values.length) return ''
  return retentionData.value.values.map((v, i) => `${20 + i * 50},${120 - v}`).join(' ')
})

const heatmapData = computed(() => {
  if (!props.datasetId) return []
  return activityService.getActivityHeatmap(props.datasetId)
})

const topContributors = computed(() => {
  if (!props.datasetId) return []
  return activityService.getTopContributors(props.datasetId, 5)
})

const hourLabels = ['0', '3', '6', '9', '12', '15', '18', '21']

function formatNumber(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

function linePoints(data) {
  if (!data.length) return ''
  const max = Math.max(...data, 1)
  return data.map((v, i) => `${20 + i * 50},${160 - (v / max) * 140}`).join(' ')
}

function areaPath(data) {
  if (!data.length) return ''
  const max = Math.max(...data, 1)
  const points = data.map((v, i) => `${20 + i * 50},${160 - (v / max) * 140}`)
  return `M20,160 L${points.join(' L')} L${20 + (data.length - 1) * 50},160 Z`
}

function pieSlice(index, total, percentage) {
  const cx = 100, cy = 100, r = 80
  const startAngle = (index / total) * 360 - 90
  const endAngle = ((index + percentage / 100) / total) * 360 * total / total + startAngle - (index / total) * 360
  const largeArc = percentage > 50 ? 1 : 0

  const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180)
  const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180)
  const x2 = cx + r * Math.cos(((startAngle + (percentage / 100) * 360) * Math.PI) / 180)
  const y2 = cy + r * Math.sin(((startAngle + (percentage / 100) * 360) * Math.PI) / 180)

  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`
}

function getHeatmapColor(value) {
  if (value === 0) return '#f3f4f6'
  if (value < 10) return '#bfdbfe'
  if (value < 25) return '#60a5fa'
  if (value < 40) return '#3b82f6'
  return '#1d4ed8'
}

function refresh() {
  // Refresh logic here
}
</script>

<style scoped>
.activity-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: white;
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

.range-select {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.stat-trend {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}

.stat-trend.up {
  color: #059669;
  background: #d1fae5;
}

.stat-trend.down {
  color: #dc2626;
  background: #fee2e2;
}

.charts-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-card.small {
  min-height: 280px;
}

.chart-header {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.chart-legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.chart-body {
  padding: 16px;
}

.trend-chart, .retention-chart {
  width: 100%;
  height: 180px;
}

.pie-chart {
  width: 200px;
  height: 200px;
  display: block;
  margin: 0 auto;
}

.pie-legend {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-text {
  flex: 1;
  color: #4b5563;
}

.legend-value {
  color: #111827;
  font-weight: 600;
}

.heatmap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.heatmap-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.row-label {
  width: 50px;
  font-size: 11px;
  color: #6b7280;
  text-align: right;
  padding-right: 8px;
}

.heatmap-cell {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  cursor: pointer;
  transition: transform 0.1s;
}

.heatmap-cell:hover {
  transform: scale(1.2);
  z-index: 1;
  position: relative;
}

.hour-labels {
  display: flex;
  padding-left: 58px;
  gap: 28px;
  font-size: 10px;
  color: #6b7280;
  margin-top: 8px;
}

.contributors-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contributor-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rank {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
}

.contributor-row:nth-child(1) .rank {
  background: #fef3c7;
  color: #d97706;
}

.contributor-row:nth-child(2) .rank {
  background: #f3f4f6;
  color: #6b7280;
}

.contributor-row:nth-child(3) .rank {
  background: #fee2e2;
  color: #92400e;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e5e7eb;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 100px;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.user-last-active {
  font-size: 11px;
  color: #6b7280;
}

.contribution-bar {
  flex: 1;
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 4px;
  transition: width 0.3s;
}

.contribution-count {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  min-width: 50px;
  text-align: right;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #9ca3af;
}
</style>
