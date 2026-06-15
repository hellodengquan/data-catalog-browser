<template>
  <div class="category-tree">
    <div v-for="node in treeData" :key="node.id" class="tree-node">
      <div
        class="node-content"
        :class="{
          'has-children': node.children && node.children.length > 0,
          'is-leaf': node.datasetId,
          'is-expanded': expandedIds.has(node.id),
          'is-active': selectedDatasetId === node.datasetId
        }"
        @click="handleNodeClick(node)"
      >
        <span v-if="node.children && node.children.length > 0" class="toggle-icon">
          <ChevronRight v-if="!expandedIds.has(node.id)" :size="16" />
          <ChevronDown v-else :size="16" />
        </span>
        <span v-else class="leaf-spacer"></span>
        <span class="node-icon">
          <Folder v-if="node.children && node.children.length > 0" :size="16" />
          <Database v-else :size="16" />
        </span>
        <span class="node-name">{{ node.name }}</span>
      </div>
      <div
        v-if="node.children && node.children.length > 0 && expandedIds.has(node.id)"
        class="node-children"
      >
        <CategoryTree
          :treeData="node.children"
          :selectedDatasetId="selectedDatasetId"
          :expandedIds="expandedIds"
          @select="$emit('select', $event)"
          @toggle="handleToggle"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ChevronRight, ChevronDown, Folder, Database } from 'lucide-vue-next'

const props = defineProps({
  treeData: {
    type: Array,
    required: true
  },
  selectedDatasetId: {
    type: String,
    default: ''
  },
  expandedIds: {
    type: Set,
    default: () => new Set()
  }
})

const emit = defineEmits(['select', 'toggle'])

const handleNodeClick = (node) => {
  if (node.datasetId) {
    emit('select', node.datasetId)
  } else if (node.children && node.children.length > 0) {
    handleToggle(node.id)
  }
}

const handleToggle = (nodeId) => {
  emit('toggle', nodeId)
}
</script>

<style scoped>
.category-tree {
  user-select: none;
}

.tree-node {
  margin-left: 4px;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s ease;
  font-size: 14px;
}

.node-content:hover {
  background-color: #f3f4f6;
}

.node-content.is-active {
  background-color: #eff6ff;
  color: #2563eb;
  font-weight: 500;
}

.node-content.is-active .node-icon {
  color: #2563eb;
}

.toggle-icon {
  display: flex;
  align-items: center;
  color: #6b7280;
  flex-shrink: 0;
}

.leaf-spacer {
  width: 16px;
  flex-shrink: 0;
}

.node-icon {
  display: flex;
  align-items: center;
  color: #6b7280;
  flex-shrink: 0;
}

.node-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-children {
  margin-left: 16px;
}
</style>
