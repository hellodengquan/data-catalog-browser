<template>
  <div class="quality-score-card">
    <div class="card-header">
      <div class="header-title">
        <Star :size="20" class="icon" />
        <span>数据质量评分</span>
      </div>
      <div class="score-badge" :style="{ background: scoreColor + '22', color: scoreColor }">
        {{ overallScore }} 分
      </div>
    </div>

    <div class="score-ring-container">
      <svg class="score-ring" viewBox="0 0 120 120">
        <circle class="ring-bg" cx="60" cy="60" r="50" />
        <circle
          class="ring-fg"
          cx="60" cy="60" r="50"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
          :stroke="scoreColor"
          stroke-linecap="round"
        />
        <text class="ring-text" x="60" y="60" text-anchor="middle" dominant-baseline="middle">
          {{ overallScore }}
        </text>
        <text class="ring-subtext" x="60" y="78" text-anchor="middle" dominant-baseline="middle">
          {{ scoreLabel }}
        </text>
      </svg>
    </div>

    <div class="dimension-list">
      <div v-for="dim in dimensions" :key="dim.key" class="dimension-item">
        <div class="dim-header">
          <span class="dim-label">{{ dim.label }}</span>
          <span class="dim-value" :style="{ color: getScoreColor(dim.value) }">
            {{ dim.value }}
          </span>
        </div>
        <div class="dim-bar">
          <div
            class="dim-bar-fill"
            :style="{ width: dim.value + '%', background: getScoreColor(dim.value) }"
          ></div>
        </div>
      </div>
    </div>

    <div v-if="fieldMetrics && Object.keys(fieldMetrics).length > 0" class="field-quality-section">
      <div class="section-title">
        <FileText :size="16" />
        字段质量详情
      </div>
      <div class="field-list">
        <div
          v-for="(metric, fieldName) in fieldMetrics"
          :key="fieldName"
          class="field-item"
        >
          <div class="field-header">
            <span class="field-name mono">{{ fieldName }}</span>
            <span
              class="field-score"
              :style="{ background: getScoreColor(metric.overallScore) + '22', color: getScoreColor(metric.overallScore) }"
            >
              {{ metric.overallScore }}
            </span>
          </div>
          <div class="field-metrics">
            <span v-for="(val, key) in displayMetrics(metric)" :key="key" class="metric-tag">
              <span class="m-label">{{ getMetricLabel(key) }}</span>
              <span class="m-value" :style="{ color: getMetricColor(val) }">
                {{ Math.round(val * 100) }}%
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showTrend" class="trend-section">
      <div class="section-title">
        <TrendingUp :size="16" />
        近 7 天趋势
      </div>
      <div class="trend-chart">
        <div v-for="(item, idx) in trendData" :key="idx" class="trend-bar-wrap">
          <div class="trend-bar" :style="{ height: item.score + '%', background: getScoreColor(item.score) }">
            <span class="trend-value">{{ item.score }}</span>
          </div>
          <span class="trend-label">{{ item.date }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Star, FileText, TrendingUp } from 'lucide-vue-next'
import { qualityScoreService } from '../utils/qualityScoreService'

const props = defineProps({
  datasetId: { type: String, required: true },
  showTrend: { type: Boolean, default: true },
  showFieldMetrics: { type: Boolean, default: true }
})

const overallScore = computed(() => {
  const score = qualityScoreService.getDatasetScore(props.datasetId)
  return score.overall || 0
})

const scoreColor = computed(() => qualityScoreService.getScoreColor(overallScore.value))
const scoreLabel = computed(() => qualityScoreService.getScoreLabel(overallScore.value))

const circumference = 2 * Math.PI * 50
const dashOffset = computed(() => {
  const progress = (100 - overallScore.value) / 100
  return progress * circumference
})

const dimensions = computed(() => qualityScoreService.getScoreBreakdown(props.datasetId))

const fieldMetrics = computed(() => {
  if (!props.showFieldMetrics) return null
  return qualityScoreService.getDatasetFieldMetrics(props.datasetId)
})

const trendData = computed(() => {
  if (!props.showTrend) return []
  return qualityScoreService.getQualityTrend(props.datasetId, 7)
})

function getScoreColor(score) {
  return qualityScoreService.getScoreColor(score)
}

function getMetricLabel(key) {
  return qualityScoreService.getMetricLabel(key)
}

function getMetricColor(val) {
  return qualityScoreService.getMetricColor(val)
}

function displayMetrics(metric) {
  const { overallScore, ...rest } = metric
  return rest
}
</script>

<style scoped>
.quality-score-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--text-primary);
}

.icon {
  color: var(--color-warning);
}

.score-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 14px;
}

.score-ring-container {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.score-ring {
  width: 120px;
  height: 120px;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: var(--border-color);
  stroke-width: 10;
}

.ring-fg {
  fill: none;
  stroke-width: 10;
  transition: stroke-dashoffset 0.5s ease;
}

.ring-text {
  fill: var(--text-primary);
  font-size: 24px;
  font-weight: 700;
}

.ring-subtext {
  fill: var(--text-muted);
  font-size: 11px;
}

.dimension-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.dimension-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dim-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.dim-value {
  font-size: 13px;
  font-weight: 600;
}

.dim-bar {
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
}

.dim-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  font-size: 14px;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 240px;
  overflow-y: auto;
  padding-right: 8px;
}

.field-item {
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.field-name {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

.field-score {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.field-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.metric-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: var(--bg-secondary);
  border-radius: 12px;
  font-size: 11px;
}

.m-label {
  color: var(--text-muted);
}

.m-value {
  font-weight: 600;
}

.field-quality-section {
  margin-bottom: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.trend-section {
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.trend-chart {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 100px;
  gap: 8px;
  padding: 0 4px;
}

.trend-bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.trend-bar {
  width: 100%;
  min-height: 4px;
  border-radius: 4px 4px 0 0;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  transition: height 0.3s ease;
}

.trend-value {
  position: absolute;
  top: -16px;
  font-size: 10px;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 0.2s;
}

.trend-bar:hover .trend-value {
  opacity: 1;
}

.trend-label {
  font-size: 10px;
  color: var(--text-muted);
}
</style>
