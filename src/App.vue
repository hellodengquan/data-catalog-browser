<template>
  <div class="app-container" @click="handleAppClick">
    <header class="app-header">
      <div class="header-left">
        <div class="logo">
          <Database :size="24" />
          <span class="logo-text">数据目录浏览器</span>
        </div>
      </div>
      <div class="header-center">
        <SearchBar
          :datasets="datasets"
          :selectedDatasetId="selectedDatasetId"
          @select="handleDatasetSelect"
          @search="handleSearch"
        />
      </div>
      <div class="header-right">
        <span class="dataset-count">共 {{ datasetCount }} 个数据集</span>
      </div>
    </header>

    <div class="app-body">
      <aside class="sidebar" :class="{ 'is-collapsed': isSidebarCollapsed }">
        <div class="sidebar-header">
          <div class="sidebar-title">
            <FolderTree :size="18" />
            <span>分类导航</span>
          </div>
          <div class="sidebar-actions">
            <button class="action-btn" @click="expandAll" title="展开全部">
              <ChevronsDown :size="16" />
            </button>
            <button class="action-btn" @click="collapseAll" title="收起全部">
              <ChevronsUp :size="16" />
            </button>
            <button class="action-btn" @click="toggleSidebar" :title="isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'">
              <PanelLeftClose v-if="!isSidebarCollapsed" :size="16" />
              <PanelLeftOpen v-else :size="16" />
            </button>
          </div>
        </div>
        <div class="sidebar-content" v-show="!isSidebarCollapsed">
          <CategoryTree
            :treeData="categoryTree"
            :selectedDatasetId="selectedDatasetId"
            :expandedIds="expandedIds"
            @select="handleDatasetSelect"
            @toggle="handleToggle"
          />
        </div>
      </aside>

      <main class="main-content">
        <DatasetPreview
          :dataset="selectedDataset"
          :highlightKeyword="searchKeyword"
        />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Database,
  FolderTree,
  ChevronsDown,
  ChevronsUp,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-vue-next'
import { categoryTree, datasets } from './data/mockData'
import CategoryTree from './components/CategoryTree.vue'
import SearchBar from './components/SearchBar.vue'
import DatasetPreview from './components/DatasetPreview.vue'

const selectedDatasetId = ref('')
const expandedIds = ref(new Set(['1', '2']))
const searchKeyword = ref('')
const isSidebarCollapsed = ref(false)

const datasetCount = computed(() => Object.keys(datasets).length)

const selectedDataset = computed(() => {
  if (!selectedDatasetId.value) return null
  return datasets[selectedDatasetId.value] || null
})

const getAllNodeIds = (nodes) => {
  const ids = []
  const traverse = (nodeList) => {
    nodeList.forEach(node => {
      if (node.children && node.children.length > 0) {
        ids.push(node.id)
        traverse(node.children)
      }
    })
  }
  traverse(nodes)
  return ids
}

const handleDatasetSelect = (datasetId) => {
  selectedDatasetId.value = datasetId
}

const handleToggle = (nodeId) => {
  const newExpandedIds = new Set(expandedIds.value)
  if (newExpandedIds.has(nodeId)) {
    newExpandedIds.delete(nodeId)
  } else {
    newExpandedIds.add(nodeId)
  }
  expandedIds.value = newExpandedIds
}

const handleSearch = (keyword) => {
  searchKeyword.value = keyword
}

const expandAll = () => {
  const allIds = getAllNodeIds(categoryTree)
  expandedIds.value = new Set(allIds)
}

const collapseAll = () => {
  expandedIds.value = new Set()
}

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const handleAppClick = (e) => {
  if (!e.target.closest('.search-bar')) {
  }
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: #f3f4f6;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 24px;
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.header-left {
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo svg {
  color: #3b82f6;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.5px;
}

.header-center {
  flex: 1;
  max-width: 700px;
}

.header-right {
  flex-shrink: 0;
}

.dataset-count {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
  padding: 6px 12px;
  background-color: #f9fafb;
  border-radius: 20px;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 280px;
  background-color: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
}

.sidebar.is-collapsed {
  width: 48px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}

.sidebar.is-collapsed .sidebar-header {
  justify-content: center;
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.sidebar.is-collapsed .sidebar-title span {
  display: none;
}

.sidebar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sidebar.is-collapsed .sidebar-actions .action-btn:not(:last-child) {
  display: none;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 3px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background-color: #9ca3af;
}

.main-content {
  flex: 1;
  overflow: hidden;
  background-color: #ffffff;
}

.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: #f3f4f6;
}

.main-content::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background-color: #9ca3af;
}
</style>
