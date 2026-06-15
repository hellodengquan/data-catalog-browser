<template>
  <div class="lineage-graph">
    <div class="graph-header">
      <div class="graph-title">
        <GitBranch :size="18" />
        <span>字段血缘关系图</span>
      </div>
      <div class="graph-controls">
        <button class="ctrl-btn" @click="zoomIn" title="放大">
          <ZoomIn :size="16" />
        </button>
        <button class="ctrl-btn" @click="zoomOut" title="缩小">
          <ZoomOut :size="16" />
        </button>
        <button class="ctrl-btn" @click="resetView" title="重置视图">
          <Maximize2 :size="16" />
        </button>
        <div class="zoom-level">{{ Math.round(scale * 100) }}%</div>
      </div>
    </div>

    <div class="graph-legend">
      <span class="legend-item" v-for="(info, type) in transformTypeInfo" :key="type">
        <span class="legend-line" :style="{ background: info.color }"></span>
        <span>{{ info.label }}</span>
      </span>
    </div>

    <div
      class="graph-container"
      ref="graphContainerRef"
      @mousedown="startPan"
      @mousemove="onMouseMove"
      @mouseup="endPan"
      @mouseleave="endPan"
      @wheel="onWheel"
    >
      <svg
        class="graph-svg"
        :width="viewBox.width"
        :height="viewBox.height"
        @click="onCanvasClick"
      >
        <defs>
          <marker
            v-for="(info, type) in transformTypeInfo"
            :key="`arrow-${type}`"
            :id="`arrowhead-${type}`"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" :fill="info.color" />
          </marker>
          <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15" />
          </filter>
        </defs>

        <g :transform="`translate(${panX}, ${panY}) scale(${scale})`">
          <g class="edges-layer">
            <g
              v-for="edge in visibleEdges"
              :key="edge.id"
              class="edge-wrapper"
            >
              <path
                :d="edge.pathD"
                :stroke="edge.color"
                fill="none"
                stroke-width="2"
                :marker-end="`url(#arrowhead-${edge.transformType})`"
                :class="{ 'edge-highlighted': isEdgeHighlighted(edge) }"
                :opacity="isEdgeDimmed(edge) ? 0.2 : 0.85"
              />
              <title>{{ edge.description }}</title>
            </g>
          </g>

          <g class="nodes-layer">
            <g
              v-for="node in layoutNodes"
              :key="node.key"
              class="node-wrapper"
              :transform="`translate(${node.x}, ${node.y})`"
              @click.stop="onNodeClick(node)"
            >
              <g v-if="node.type === 'dataset'">
                <rect
                  :width="datasetNodeWidth"
                  :height="node.height"
                  rx="8"
                  ry="8"
                  class="dataset-node"
                  :class="{
                    'dataset-node-focused': node.datasetId === currentDatasetId,
                    'dataset-node-selected': selectedNode?.key === node.key
                  }"
                  :fill="node.teamColor || '#e0e7ff'"
                  filter="url(#node-shadow)"
                />
                <text
                  :x="datasetNodeWidth / 2"
                  y="24"
                  text-anchor="middle"
                  class="dataset-name-text"
                >
                  {{ truncateText(node.label, 18) }}
                </text>
                <text
                  :x="datasetNodeWidth / 2"
                  y="42"
                  text-anchor="middle"
                  class="dataset-meta-text"
                >
                  {{ node.fieldCount }} 个字段
                </text>

                <g
                  v-for="(field, idx) in node.fields"
                  :key="field.name"
                  class="field-anchor"
                  :transform="`translate(0, ${56 + idx * 28})`"
                >
                  <rect
                    :x="isUpstream(node.datasetId) ? datasetNodeWidth - 8 : 0"
                    y="4"
                    width="16"
                    height="16"
                    rx="8"
                    :fill="fieldColor"
                    :stroke="selectedField?.datasetId === node.datasetId && selectedField?.fieldName === field.name ? '#2563eb' : 'transparent'"
                    stroke-width="2"
                    class="field-dot"
                  />
                  <text
                    :x="isUpstream(node.datasetId) ? datasetNodeWidth - 30 : 24"
                    y="17"
                    :text-anchor="isUpstream(node.datasetId) ? 'end' : 'start'"
                    class="field-name-text"
                    :class="{
                      'field-selected': selectedField?.datasetId === node.datasetId && selectedField?.fieldName === field.name,
                      'field-highlighted': isFieldHighlighted(node.datasetId, field.name)
                    }"
                  >
                    {{ truncateText(field.name, 14) }}
                  </text>
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>

    <div class="graph-detail" v-if="selectedField || selectedNode">
      <div class="detail-header">
        <span class="detail-title">
          <Info :size="16" />
          {{ selectedField ? '字段血缘详情' : '数据集详情' }}
        </span>
        <button class="close-btn" @click="clearSelection">
          <X :size="16" />
        </button>
      </div>
      <div v-if="selectedField" class="detail-content">
        <div class="detail-row">
          <span class="detail-label">所属数据集</span>
          <span class="detail-value">{{ datasets[selectedField.datasetId]?.name }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">字段名</span>
          <span class="detail-value mono">{{ selectedField.fieldName }}</span>
        </div>
        <div class="detail-section">
          <div class="section-label">
            <ArrowLeft :size="14" /> 上游来源 ({{ upstreamFields.length }})
          </div>
          <div class="related-list" v-if="upstreamFields.length">
            <div
              v-for="item in upstreamFields"
              :key="`up-${item.edgeId}`"
              class="related-item"
              @click="goToField(item.sourceDataset, item.sourceField)"
            >
              <span class="related-dataset">{{ datasets[item.sourceDataset]?.name }}</span>
              <ChevronRight :size="14" />
              <span class="related-field mono">{{ item.sourceField }}</span>
              <span class="related-transform" :style="{ color: item.color }">
                {{ item.transformLabel }}
              </span>
            </div>
          </div>
          <div v-else class="no-related">无上游依赖</div>
        </div>
        <div class="detail-section">
          <div class="section-label">
            <ArrowRight :size="14" /> 下游影响 ({{ downstreamFields.length }})
          </div>
          <div class="related-list" v-if="downstreamFields.length">
            <div
              v-for="item in downstreamFields"
              :key="`down-${item.edgeId}`"
              class="related-item"
              @click="goToField(item.targetDataset, item.targetField)"
            >
              <span class="related-dataset">{{ datasets[item.targetDataset]?.name }}</span>
              <ChevronRight :size="14" />
              <span class="related-field mono">{{ item.targetField }}</span>
              <span class="related-transform" :style="{ color: item.color }">
                {{ item.transformLabel }}
              </span>
            </div>
          </div>
          <div v-else class="no-related">无下游影响</div>
        </div>
      </div>
      <div v-else-if="selectedNode" class="detail-content">
        <div class="detail-row">
          <span class="detail-label">数据集</span>
          <span class="detail-value">{{ datasets[selectedNode.datasetId]?.name }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">关联血缘边</span>
          <span class="detail-value">{{ datasetEdges.length }} 条</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  GitBranch,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  X,
  ArrowLeft,
  ArrowRight,
  ChevronRight
} from 'lucide-vue-next'
import { datasets, fieldLineage, datasetTeamMapping, teams } from '../data/mockData'

const props = defineProps({
  currentDatasetId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['selectDataset'])

const datasetNodeWidth = 220
const fieldColor = '#2563eb'

const scale = ref(1)
const panX = ref(40)
const panY = ref(40)
const isPanning = ref(false)
const lastMouseX = ref(0)
const lastMouseY = ref(0)
const selectedNode = ref(null)
const selectedField = ref(null)
const graphContainerRef = ref(null)

const viewBox = computed(() => ({
  width: 1600,
  height: 900
}))

const transformTypeInfo = computed(() => fieldLineage.transformTypes)

const currentTeam = computed(() => {
  if (!props.currentDatasetId) return null
  const mapping = datasetTeamMapping[props.currentDatasetId]
  return mapping ? teams[mapping.teamId] : null
})

const relatedEdges = computed(() => {
  if (!props.currentDatasetId) return fieldLineage.edges
  const dsId = props.currentDatasetId
  return fieldLineage.edges.filter(
    e => e.sourceDataset === dsId || e.targetDataset === dsId
  )
})

const relatedDatasetIds = computed(() => {
  const ids = new Set()
  if (props.currentDatasetId) ids.add(props.currentDatasetId)
  relatedEdges.value.forEach(e => {
    ids.add(e.sourceDataset)
    ids.add(e.targetDataset)
  })
  return Array.from(ids)
})

const visibleEdges = computed(() => {
  const nodePositions = layoutNodes.value.reduce((acc, n) => {
    acc[n.datasetId] = n
    return acc
  }, {})

  return relatedEdges.value.map(edge => {
    const sourceNode = nodePositions[edge.sourceDataset]
    const targetNode = nodePositions[edge.targetDataset]
    if (!sourceNode || !targetNode) return null

    const sourceFieldIdx = sourceNode.fields.findIndex(f => f.name === edge.sourceField)
    const targetFieldIdx = targetNode.fields.findIndex(f => f.name === edge.targetField)

    const sourceY = sourceNode.y + 56 + (sourceFieldIdx >= 0 ? sourceFieldIdx : 0) * 28 + 12
    const targetY = targetNode.y + 56 + (targetFieldIdx >= 0 ? targetFieldIdx : 0) * 28 + 12

    const sourceX = sourceNode.x + datasetNodeWidth
    const targetX = targetNode.x

    const dx = (targetX - sourceX) * 0.5
    const dy = 0

    const controlPoint1X = sourceX + dx
    const controlPoint1Y = sourceY + dy
    const controlPoint2X = targetX - dx
    const controlPoint2Y = targetY + dy

    const pathD = `M ${sourceX} ${sourceY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${targetX} ${targetY}`

    return {
      ...edge,
      pathD,
      color: transformTypeInfo.value[edge.transformType]?.color || '#6b7280'
    }
  }).filter(Boolean)
})

const layoutNodes = computed(() => {
  const dsIds = relatedDatasetIds.value
  if (dsIds.length === 0) return []

  const layers = computeLayers(dsIds, relatedEdges.value)
  const layerCount = Math.max(...Array.from(layers.values())) + 1
  const layerNodes = Array.from({ length: layerCount }, () => [])

  dsIds.forEach(dsId => {
    const layer = layers.get(dsId) || 0
    layerNodes[layer].push(dsId)
  })

  const layerWidth = 340
  const verticalGap = 24

  const nodes = []
  layerNodes.forEach((dsIdsInLayer, layerIdx) => {
    let currentY = 20
    dsIdsInLayer.forEach((dsId, idx) => {
      const ds = datasets[dsId]
      if (!ds) return

      const fields = collectFields(dsId, relatedEdges.value, ds.fields)
      const height = 56 + fields.length * 28 + 16

      const teamMapping = datasetTeamMapping[dsId]
      const team = teamMapping ? teams[teamMapping.teamId] : null
      const teamColor = team ? hexToRgba(team.color, 0.25) : '#e0e7ff'

      nodes.push({
        key: `ds-${dsId}`,
        type: 'dataset',
        datasetId: dsId,
        label: ds.name,
        x: 40 + layerIdx * layerWidth,
        y: currentY,
        height,
        fieldCount: ds.fields.length,
        fields,
        teamColor
      })

      currentY += height + verticalGap
    })

    if (dsIdsInLayer.length > 1) {
      let totalHeight = currentY - verticalGap - 20
      let offset = (viewBox.value.height - totalHeight) / 2 - 20
      nodes.filter(n => layerNodes[layerIdx].includes(n.datasetId)).forEach(n => {
        n.y += Math.max(offset, 0)
      })
    }
  })

  return nodes
})

function computeLayers(datasetIds, edges) {
  const layers = new Map()
  const inDegree = new Map()
  const graph = new Map()

  datasetIds.forEach(id => {
    inDegree.set(id, 0)
    graph.set(id, [])
    layers.set(id, 0)
  })

  edges.forEach(e => {
    if (datasetIds.includes(e.sourceDataset) && datasetIds.includes(e.targetDataset)) {
      const children = graph.get(e.sourceDataset) || []
      children.push(e.targetDataset)
      graph.set(e.sourceDataset, children)
      inDegree.set(e.targetDataset, (inDegree.get(e.targetDataset) || 0) + 1)
    }
  })

  const queue = []
  datasetIds.forEach(id => {
    if (inDegree.get(id) === 0) queue.push(id)
  })

  const maxLayer = Math.ceil(datasetIds.length / 2)
  let processed = 0

  while (queue.length > 0 && processed < datasetIds.length) {
    const node = queue.shift()
    processed++
    const children = graph.get(node) || []
    children.forEach(child => {
      layers.set(child, Math.min(maxLayer, (layers.get(node) || 0) + 1))
      const newInDegree = (inDegree.get(child) || 0) - 1
      inDegree.set(child, newInDegree)
      if (newInDegree === 0) queue.push(child)
    })
  }

  const centerDsId = props.currentDatasetId || datasetIds[0]
  if (centerDsId && layers.has(centerDsId)) {
    const centerLayer = layers.get(centerDsId)
    const targetLayer = 1
    const shift = targetLayer - centerLayer
    datasetIds.forEach(id => {
      const current = layers.get(id)
      layers.set(id, Math.max(0, Math.min(maxLayer, current + shift)))
    })
  }

  return layers
}

function collectFields(datasetId, edges, allFields) {
  const fieldNames = new Set()
  edges.forEach(e => {
    if (e.sourceDataset === datasetId) fieldNames.add(e.sourceField)
    if (e.targetDataset === datasetId) fieldNames.add(e.targetField)
  })

  if (fieldNames.size === 0) {
    return allFields.slice(0, Math.min(5, allFields.length))
  }

  const result = []
  allFields.forEach(f => {
    if (fieldNames.has(f.name)) result.push(f)
  })
  return result
}

const datasetEdges = computed(() => {
  if (!selectedNode.value) return []
  const dsId = selectedNode.value.datasetId
  return relatedEdges.value.filter(e => e.sourceDataset === dsId || e.targetDataset === dsId)
})

const upstreamFields = computed(() => {
  if (!selectedField.value) return []
  const { datasetId, fieldName } = selectedField.value
  return relatedEdges.value
    .filter(e => e.targetDataset === datasetId && e.targetField === fieldName)
    .map(e => ({
      edgeId: e.id,
      sourceDataset: e.sourceDataset,
      sourceField: e.sourceField,
      transformType: e.transformType,
      transformLabel: transformTypeInfo.value[e.transformType]?.label || e.transformType,
      color: transformTypeInfo.value[e.transformType]?.color || '#6b7280',
      description: e.description
    }))
})

const downstreamFields = computed(() => {
  if (!selectedField.value) return []
  const { datasetId, fieldName } = selectedField.value
  return relatedEdges.value
    .filter(e => e.sourceDataset === datasetId && e.sourceField === fieldName)
    .map(e => ({
      edgeId: e.id,
      targetDataset: e.targetDataset,
      targetField: e.targetField,
      transformType: e.transformType,
      transformLabel: transformTypeInfo.value[e.transformType]?.label || e.transformType,
      color: transformTypeInfo.value[e.transformType]?.color || '#6b7280',
      description: e.description
    }))
})

function isUpstream(datasetId) {
  if (!props.currentDatasetId || datasetId === props.currentDatasetId) return false
  return relatedEdges.value.some(e => e.sourceDataset === datasetId && e.targetDataset === props.currentDatasetId)
}

function isEdgeHighlighted(edge) {
  if (!selectedField.value) return false
  const sf = selectedField.value
  return (
    (edge.sourceDataset === sf.datasetId && edge.sourceField === sf.fieldName) ||
    (edge.targetDataset === sf.datasetId && edge.targetField === sf.fieldName)
  )
}

function isEdgeDimmed(edge) {
  if (!selectedField.value) return false
  return !isEdgeHighlighted(edge)
}

function isFieldHighlighted(datasetId, fieldName) {
  if (!selectedField.value) return false
  const edgeIds = new Set([
    ...upstreamFields.value.map(f => f.edgeId),
    ...downstreamFields.value.map(f => f.edgeId)
  ])
  return relatedEdges.value.some(e =>
    edgeIds.has(e.id) &&
    ((e.sourceDataset === datasetId && e.sourceField === fieldName) ||
      (e.targetDataset === datasetId && e.targetField === fieldName))
  )
}

function onNodeClick(node) {
  if (node.type === 'dataset') {
    selectedNode.value = node
    selectedField.value = null
    emit('selectDataset', node.datasetId)
  }
}

function onCanvasClick() {
  clearSelection()
}

function clearSelection() {
  selectedNode.value = null
  selectedField.value = null
}

function goToField(datasetId, fieldName) {
  selectedField.value = { datasetId, fieldName }
  if (datasetId !== props.currentDatasetId) {
    emit('selectDataset', datasetId)
  }
}

function startPan(e) {
  if (e.target.closest('.field-anchor') || e.target.closest('.node-wrapper')) return
  isPanning.value = true
  lastMouseX.value = e.clientX
  lastMouseY.value = e.clientY
}

function onMouseMove(e) {
  if (!isPanning.value) return
  const dx = (e.clientX - lastMouseX.value) / scale.value
  const dy = (e.clientY - lastMouseY.value) / scale.value
  panX.value += dx
  panY.value += dy
  lastMouseX.value = e.clientX
  lastMouseY.value = e.clientY
}

function endPan() {
  isPanning.value = false
}

function onWheel(e) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  scale.value = Math.min(2, Math.max(0.4, scale.value + delta))
}

function zoomIn() {
  scale.value = Math.min(2, scale.value + 0.15)
}

function zoomOut() {
  scale.value = Math.max(0.4, scale.value - 0.15)
}

function resetView() {
  scale.value = 1
  panX.value = 40
  panY.value = 40
  clearSelection()
}

function truncateText(text, maxLen) {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

watch(() => props.currentDatasetId, () => {
  clearSelection()
  resetView()
}, { flush: 'post' })

onMounted(() => {
})
</script>

<style scoped>
.lineage-graph {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  background-color: #fafbfc;
}

.graph-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.graph-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s ease;
}

.ctrl-btn:hover {
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}

.zoom-level {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  min-width: 40px;
  text-align: right;
}

.graph-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 8px 16px;
  border-bottom: 1px solid #f3f4f6;
  background-color: #ffffff;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.legend-line {
  display: block;
  width: 20px;
  height: 3px;
  border-radius: 2px;
}

.graph-container {
  position: relative;
  flex: 1;
  min-height: 500px;
  overflow: hidden;
  cursor: grab;
  background-color: #fafafa;
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
}

.graph-container:active {
  cursor: grabbing;
}

.graph-svg {
  display: block;
}

.node-wrapper {
  cursor: pointer;
}

.dataset-node {
  stroke: rgba(0, 0, 0, 0.1);
  stroke-width: 1;
  transition: all 0.2s ease;
}

.dataset-node-focused {
  stroke: #2563eb;
  stroke-width: 2;
}

.dataset-node-selected {
  stroke: #1d4ed8;
  stroke-width: 3;
  filter: url(#node-shadow);
}

.dataset-name-text {
  font-size: 13px;
  font-weight: 600;
  fill: #1f2937;
  pointer-events: none;
}

.dataset-meta-text {
  font-size: 11px;
  fill: #6b7280;
  pointer-events: none;
}

.field-dot {
  transition: all 0.2s ease;
}

.field-anchor:hover .field-dot {
  r: 10;
}

.field-name-text {
  font-size: 12px;
  fill: #374151;
  transition: all 0.15s ease;
  pointer-events: none;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}

.field-name-text:hover {
  font-weight: 600;
  fill: #1f2937;
}

.field-selected {
  fill: #1d4ed8;
  font-weight: 600;
}

.field-highlighted {
  fill: #059669;
  font-weight: 500;
}

.edge-highlighted {
  stroke-width: 4 !important;
}

.graph-detail {
  border-top: 1px solid #e5e7eb;
  max-height: 280px;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background-color: #f9fafb;
  border-bottom: 1px solid #f3f4f6;
  position: sticky;
  top: 0;
  z-index: 1;
}

.detail-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.detail-content {
  padding: 12px 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dashed #f3f4f6;
  margin-bottom: 6px;
}

.detail-label {
  font-size: 12px;
  color: #6b7280;
}

.detail-value {
  font-size: 13px;
  color: #1f2937;
  font-weight: 500;
}

.mono {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}

.detail-section {
  margin-top: 12px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 8px;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.related-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 12px;
}

.related-item:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.related-dataset {
  color: #4b5563;
  flex-shrink: 0;
}

.related-field {
  font-size: 11px;
  color: #1f2937;
  font-weight: 500;
}

.related-transform {
  margin-left: auto;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 4px;
  flex-shrink: 0;
}

.no-related {
  padding: 12px;
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
  background: #fafafa;
  border-radius: 6px;
}
</style>
