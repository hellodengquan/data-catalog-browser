<template>
  <div class="search-bar">
    <div class="search-input-wrapper">
      <Search class="search-icon" :size="18" />
      <input
        v-model="searchText"
        type="text"
        class="search-input"
        placeholder="搜索数据集名称、描述、标签或字段..."
        @input="handleSearch"
        @keyup.enter="handleSearch"
      />
      <button
        v-if="searchText"
        class="clear-btn"
        @click="clearSearch"
        title="清空搜索"
      >
        <X :size="16" />
      </button>
    </div>
    <div v-if="searchText && searchResults.length > 0" class="search-results">
      <div class="results-header">
        <span class="results-count">找到 {{ searchResults.length }} 个相关数据集</span>
      </div>
      <div class="results-list">
        <div
          v-for="result in searchResults"
          :key="result.id"
          class="result-item"
          :class="{ 'is-active': selectedDatasetId === result.id }"
          @click="handleSelect(result.id)"
        >
          <div class="result-icon">
            <Database :size="18" />
          </div>
          <div class="result-info">
            <div class="result-name" v-html="highlightText(result.name, searchText)"></div>
            <div class="result-desc" v-html="highlightText(result.description, searchText)"></div>
            <div class="result-tags">
              <span
                v-for="tag in result.tags"
                :key="tag"
                class="result-tag"
                :class="{ 'tag-match': isTextMatch(tag, searchText) }"
              >
                {{ tag }}
              </span>
            </div>
            <div v-if="result.matchedFields && result.matchedFields.length > 0" class="matched-fields">
              <span class="matched-fields-label">匹配字段：</span>
              <span
                v-for="field in result.matchedFields"
                :key="field.name"
                class="matched-field"
                v-html="highlightText(field.name, searchText)"
              ></span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="searchText && searchResults.length === 0" class="search-results no-results">
      <div class="no-results-content">
        <SearchX :size="40" class="no-results-icon" />
        <p>未找到匹配的数据集</p>
        <p class="no-results-tip">请尝试其他关键词</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search, X, Database, SearchX } from 'lucide-vue-next'

const props = defineProps({
  datasets: {
    type: Object,
    required: true
  },
  selectedDatasetId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select', 'search'])

const searchText = ref('')

const searchResults = computed(() => {
  if (!searchText.value.trim()) return []
  
  const keyword = searchText.value.toLowerCase().trim()
  const results = []
  
  Object.values(props.datasets).forEach(dataset => {
    const nameMatch = dataset.name.toLowerCase().includes(keyword)
    const descMatch = dataset.description.toLowerCase().includes(keyword)
    const tagMatch = dataset.tags.some(tag => tag.toLowerCase().includes(keyword))
    const matchedFields = dataset.fields.filter(field => 
      field.name.toLowerCase().includes(keyword) || 
      field.description.toLowerCase().includes(keyword)
    )
    const fieldMatch = matchedFields.length > 0
    
    if (nameMatch || descMatch || tagMatch || fieldMatch) {
      results.push({
        ...dataset,
        matchedFields: fieldMatch ? matchedFields : null,
        matchScore: (nameMatch ? 3 : 0) + (descMatch ? 1 : 0) + (tagMatch ? 2 : 0) + (fieldMatch ? 1.5 : 0)
      })
    }
  })
  
  return results.sort((a, b) => b.matchScore - a.matchScore)
})

const handleSearch = () => {
  emit('search', searchText.value)
}

const clearSearch = () => {
  searchText.value = ''
  emit('search', '')
}

const handleSelect = (datasetId) => {
  emit('select', datasetId)
}

const highlightText = (text, keyword) => {
  if (!keyword.trim()) return text
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<span class="highlight">$1</span>')
}

const isTextMatch = (text, keyword) => {
  return text.toLowerCase().includes(keyword.toLowerCase().trim())
}
</script>

<style scoped>
.search-bar {
  position: relative;
  width: 100%;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 12px;
  transition: all 0.2s ease;
}

.search-input-wrapper:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.search-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  padding: 12px 10px;
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
}

.search-input::placeholder {
  color: #9ca3af;
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.clear-btn:hover {
  background-color: #f3f4f6;
  color: #6b7280;
}

.search-results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: 500px;
  overflow-y: auto;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  z-index: 100;
}

.results-header {
  padding: 10px 16px;
  border-bottom: 1px solid #f3f4f6;
  background-color: #f9fafb;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.results-count {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.results-list {
  padding: 4px 0;
}

.result-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid #f9fafb;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover {
  background-color: #f9fafb;
}

.result-item.is-active {
  background-color: #eff6ff;
}

.result-icon {
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
  color: #6b7280;
  flex-shrink: 0;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
  line-height: 1.4;
}

.result-desc {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}

.result-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}

.result-tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  background-color: #f3f4f6;
  color: #6b7280;
  border-radius: 4px;
}

.result-tag.tag-match {
  background-color: #fef3c7;
  color: #92400e;
}

.matched-fields {
  font-size: 12px;
  color: #6b7280;
}

.matched-fields-label {
  color: #9ca3af;
}

.matched-field {
  display: inline-block;
  margin-right: 8px;
  color: #4b5563;
}

.highlight {
  background-color: #fef08a;
  color: #854d0e;
  padding: 0 2px;
  border-radius: 2px;
}

.no-results {
  padding: 40px 20px;
}

.no-results-content {
  text-align: center;
  color: #9ca3af;
}

.no-results-icon {
  margin-bottom: 12px;
  opacity: 0.5;
}

.no-results-content p {
  margin: 4px 0;
  font-size: 14px;
}

.no-results-tip {
  font-size: 13px;
  color: #d1d5db;
}
</style>
