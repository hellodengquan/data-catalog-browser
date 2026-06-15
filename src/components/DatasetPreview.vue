<template>
  <div class="dataset-preview" v-if="dataset">
    <div class="preview-header">
      <div class="header-icon">
        <Database :size="28" />
      </div>
      <div class="header-info">
        <h1 class="dataset-name">{{ dataset.name }}</h1>
        <div class="dataset-tags">
          <span v-for="tag in dataset.tags" :key="tag" class="dataset-tag">
            {{ tag }}
          </span>
        </div>
      </div>
    </div>

    <div class="preview-section">
      <p class="dataset-description">{{ dataset.description }}</p>
    </div>

    <div class="preview-section">
      <h2 class="section-title">
        <Info :size="18" />
        <span>基本信息</span>
      </h2>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">数据负责人</span>
          <span class="info-value">{{ dataset.owner }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">更新频率</span>
          <span class="info-value">{{ dataset.updateFrequency }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">数据量级</span>
          <span class="info-value">{{ dataset.dataVolume }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">存储位置</span>
          <span class="info-value mono">{{ dataset.storageLocation }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">创建时间</span>
          <span class="info-value">{{ dataset.createdTime }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">更新时间</span>
          <span class="info-value">{{ dataset.updatedTime }}</span>
        </div>
      </div>
    </div>

    <div class="preview-section">
      <div class="section-header">
        <h2 class="section-title">
          <Table :size="18" />
          <span>字段信息</span>
          <span class="field-count">(共 {{ dataset.fields.length }} 个字段)</span>
        </h2>
        <div class="field-search-wrapper">
          <Search :size="16" class="field-search-icon" />
          <input
            v-model="fieldSearchText"
            type="text"
            class="field-search-input"
            placeholder="搜索字段..."
          />
        </div>
      </div>
      <div class="fields-table-container">
        <table class="fields-table">
          <thead>
            <tr>
              <th class="th-name">字段名</th>
              <th class="th-type">类型</th>
              <th class="th-desc">描述</th>
              <th class="th-null">可空</th>
              <th class="th-sample">示例值</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="field in filteredFields"
              :key="field.name"
              class="field-row"
              :class="{ 'is-highlighted': isFieldHighlighted(field) }"
            >
              <td class="td-name mono" v-html="highlightFieldText(field.name)"></td>
              <td class="td-type">
                <span class="type-badge" :class="getTypeClass(field.type)">
                  {{ field.type }}
                </span>
              </td>
              <td class="td-desc" v-html="highlightFieldText(field.description)"></td>
              <td class="td-null">
                <span
                  class="null-badge"
                  :class="field.nullable ? 'is-nullable' : 'not-nullable'"
                >
                  <Check v-if="field.nullable" :size="12" />
                  <X v-else :size="12" />
                  {{ field.nullable ? '是' : '否' }}
                </span>
              </td>
              <td class="td-sample mono">{{ field.sample }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredFields.length === 0" class="no-fields">
          <SearchX :size="32" />
          <p>没有找到匹配的字段</p>
        </div>
      </div>
    </div>
  </div>

  <div class="empty-preview" v-else>
    <div class="empty-content">
      <Database :size="64" class="empty-icon" />
      <h2 class="empty-title">选择一个数据集</h2>
      <p class="empty-desc">从左侧分类树中选择数据集，或使用搜索功能查找</p>
      <div class="empty-tips">
        <div class="tip-item">
          <ChevronRight :size="16" />
          <span>点击文件夹图标展开分类</span>
        </div>
        <div class="tip-item">
          <ChevronRight :size="16" />
          <span>点击数据集名称查看详情</span>
        </div>
        <div class="tip-item">
          <ChevronRight :size="16" />
          <span>支持搜索名称、描述、标签和字段</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Database,
  Info,
  Table,
  Search,
  SearchX,
  Check,
  X,
  ChevronRight
} from 'lucide-vue-next'

const props = defineProps({
  dataset: {
    type: Object,
    default: null
  },
  highlightKeyword: {
    type: String,
    default: ''
  }
})

const fieldSearchText = ref('')

const filteredFields = computed(() => {
  if (!props.dataset) return []
  if (!fieldSearchText.value.trim()) return props.dataset.fields

  const keyword = fieldSearchText.value.toLowerCase().trim()
  return props.dataset.fields.filter(
    field =>
      field.name.toLowerCase().includes(keyword) ||
      field.description.toLowerCase().includes(keyword)
  )
})

const getTypeClass = (type) => {
  const typeLower = type.toLowerCase()
  if (typeLower.includes('int') || typeLower.includes('bigint') || typeLower.includes('tinyint')) {
    return 'type-number'
  } else if (typeLower.includes('string') || typeLower.includes('text') || typeLower.includes('varchar')) {
    return 'type-string'
  } else if (typeLower.includes('decimal') || typeLower.includes('double') || typeLower.includes('float')) {
    return 'type-decimal'
  } else if (typeLower.includes('timestamp') || typeLower.includes('date') || typeLower.includes('time')) {
    return 'type-date'
  } else if (typeLower.includes('bool') || typeLower.includes('boolean')) {
    return 'type-boolean'
  } else if (typeLower.includes('map') || typeLower.includes('array') || typeLower.includes('json')) {
    return 'type-complex'
  }
  return 'type-default'
}

const isFieldHighlighted = (field) => {
  if (!props.highlightKeyword) return false
  const keyword = props.highlightKeyword.toLowerCase().trim()
  return (
    field.name.toLowerCase().includes(keyword) ||
    field.description.toLowerCase().includes(keyword)
  )
}

const highlightFieldText = (text) => {
  const keywords = []
  if (fieldSearchText.value.trim()) {
    keywords.push(fieldSearchText.value.trim())
  }
  if (props.highlightKeyword && props.highlightKeyword.trim()) {
    keywords.push(props.highlightKeyword.trim())
  }
  
  if (keywords.length === 0) return text
  
  let result = text
  keywords.forEach(keyword => {
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    result = result.replace(regex, '<span class="highlight">$1</span>')
  })
  return result
}
</script>

<style scoped>
.dataset-preview {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
}

.preview-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-radius: 12px;
  flex-shrink: 0;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.dataset-name {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.dataset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dataset-tag {
  display: inline-block;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  background-color: #eff6ff;
  color: #2563eb;
  border-radius: 20px;
}

.preview-section {
  margin-bottom: 28px;
}

.dataset-description {
  font-size: 14px;
  line-height: 1.7;
  color: #4b5563;
  margin: 0;
  padding: 16px;
  background-color: #f9fafb;
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.field-count {
  font-size: 13px;
  font-weight: 400;
  color: #9ca3af;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.info-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.info-value.mono {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace;
  font-size: 13px;
  color: #2563eb;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.field-search-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  min-width: 200px;
}

.field-search-wrapper:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.field-search-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.field-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  background: transparent;
  min-width: 0;
}

.fields-table-container {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.fields-table {
  width: 100%;
  border-collapse: collapse;
}

.fields-table thead {
  background-color: #f9fafb;
}

.fields-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e5e7eb;
}

.fields-table td {
  padding: 12px 16px;
  font-size: 13px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.fields-table tbody tr:last-child td {
  border-bottom: none;
}

.fields-table tbody tr:hover {
  background-color: #f9fafb;
}

.field-row.is-highlighted {
  background-color: #fefce8;
}

.field-row.is-highlighted:hover {
  background-color: #fef9c3;
}

.th-name, .td-name {
  width: 22%;
  min-width: 120px;
}

.th-type, .td-type {
  width: 15%;
  min-width: 100px;
}

.th-desc, .td-desc {
  width: 35%;
  min-width: 200px;
}

.th-null, .td-null {
  width: 10%;
  min-width: 80px;
  text-align: center;
}

.th-sample, .td-sample {
  width: 18%;
  min-width: 120px;
}

.td-name {
  font-weight: 600;
  color: #1f2937;
}

.td-desc {
  color: #6b7280;
  line-height: 1.5;
}

.mono {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace;
}

.type-badge {
  display: inline-block;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace;
}

.type-number {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.type-string {
  background-color: #dcfce7;
  color: #15803d;
}

.type-decimal {
  background-color: #fae8ff;
  color: #a21caf;
}

.type-date {
  background-color: #fef3c7;
  color: #b45309;
}

.type-boolean {
  background-color: #fee2e2;
  color: #b91c1c;
}

.type-complex {
  background-color: #f3f4f6;
  color: #4b5563;
}

.type-default {
  background-color: #e5e7eb;
  color: #374151;
}

.null-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
}

.null-badge.is-nullable {
  background-color: #fef3c7;
  color: #92400e;
}

.null-badge.not-nullable {
  background-color: #fee2e2;
  color: #b91c1c;
}

.td-sample {
  color: #4b5563;
  font-size: 12px;
}

.highlight {
  background-color: #fef08a;
  color: #854d0e;
  padding: 0 2px;
  border-radius: 2px;
}

.no-fields {
  padding: 40px 20px;
  text-align: center;
  color: #9ca3af;
}

.no-fields p {
  margin: 12px 0 0 0;
  font-size: 14px;
}

.empty-preview {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.empty-content {
  text-align: center;
  max-width: 400px;
}

.empty-icon {
  color: #d1d5db;
  margin-bottom: 20px;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #6b7280;
  margin: 0 0 8px 0;
}

.empty-desc {
  font-size: 14px;
  color: #9ca3af;
  margin: 0 0 24px 0;
  line-height: 1.6;
}

.empty-tips {
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 16px 20px;
  text-align: left;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: #6b7280;
}

.tip-item svg {
  color: #3b82f6;
  flex-shrink: 0;
}
</style>
