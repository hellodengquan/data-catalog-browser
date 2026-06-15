<template>
  <div class="notification-panel">
    <div class="panel-header">
      <div class="header-title">
        <Bell :size="20" />
        <span>通知中心</span>
        <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
      </div>
      <div class="header-actions">
        <button v-if="unreadCount > 0" class="btn ghost" @click="markAllAsRead">
          <Check :size="14" /> 全部已读
        </button>
        <button class="btn ghost" @click="refresh">
          <RefreshCw :size="14" /> 刷新
        </button>
      </div>
    </div>

    <div class="filter-bar">
      <button
        v-for="f in filters"
        :key="f.key"
        class="filter-btn"
        :class="{ active: activeFilter === f.key }"
        @click="activeFilter = f.key"
      >
        <span class="f-dot" :style="{ background: f.color }"></span>
        {{ f.label }}
      </button>
    </div>

    <div class="panel-content">
      <div v-if="filteredNotifications.length" class="notification-list">
        <div
          v-for="notif in filteredNotifications"
          :key="notif.id"
          class="notification-card"
          :class="{ unread: !isRead(notif) }"
          @click="handleRead(notif)"
        >
          <div class="card-left">
            <div class="notif-icon" :style="{ background: getTypeInfo(notif.type).color + '22', color: getTypeInfo(notif.type).color }">
              <component :is="getTypeIcon(notif.type)" :size="20" />
            </div>
          </div>
          <div class="card-main">
            <div class="card-header">
              <span class="notif-title">{{ notif.title }}</span>
              <span class="notif-time">{{ notif.createdAt }}</span>
            </div>
            <p class="notif-content">{{ notif.content }}</p>
            <div class="notif-meta">
              <span class="notif-type" :style="{ color: getTypeInfo(notif.type).color }">
                {{ getTypeInfo(notif.type).label }}
              </span>
              <span class="notif-operator">操作人：{{ notif.operatorName }}</span>
              <span class="notif-dataset" @click.stop="handleSelectDataset(notif.datasetId)">
                <Database :size="12" /> {{ getDatasetName(notif.datasetId) }}
              </span>
            </div>
          </div>
          <div class="card-right">
            <div v-if="!isRead(notif)" class="unread-dot"></div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <Inbox :size="48" class="empty-icon" />
        <p>暂无通知</p>
        <p class="empty-hint">订阅数据集后将收到变更通知</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, markRaw } from 'vue'
import { Bell, Check, RefreshCw, Database, FileEdit, RefreshCw as RefreshIcon, UserCog, FileCheck, Inbox } from 'lucide-vue-next'
import { subscriptionService } from '../utils/subscriptionService'
import { datasets } from '../data/mockData'

const emit = defineEmits(['selectDataset'])

const activeFilter = ref('all')

const filters = computed(() => [
  { key: 'all', label: '全部', color: '#6b7280' },
  { key: 'unread', label: '未读', color: '#ef4444' },
  { key: 'schema_change', label: 'Schema 变更', color: '#8b5cf6' },
  { key: 'data_update', label: '数据更新', color: '#0ea5e9' },
  { key: 'owner_change', label: '负责人变更', color: '#f97316' }
])

const iconMap = {
  schema_change: markRaw(FileEdit),
  data_update: markRaw(RefreshIcon),
  owner_change: markRaw(UserCog),
  approval: markRaw(FileCheck)
}

const notifications = computed(() =>
  subscriptionService.getMyNotifications()
)

const unreadCount = computed(() =>
  subscriptionService.getUnreadCount()
)

const filteredNotifications = computed(() => {
  if (activeFilter.value === 'unread') {
    return subscriptionService.getMyNotifications(undefined, { unreadOnly: true })
  }
  if (activeFilter.value !== 'all') {
    return notifications.value.filter(n => n.type === activeFilter.value)
  }
  return notifications.value
})

function getTypeIcon(type) {
  return iconMap[type] || markRaw(RefreshIcon)
}

function getTypeInfo(type) {
  return subscriptionService.getNotificationTypeInfo(type)
}

function isRead(notif) {
  return notif.readBy.includes(subscriptionService.currentUserId.value)
}

function getDatasetName(datasetId) {
  return datasets[datasetId]?.name || datasetId
}

function handleRead(notif) {
  if (!isRead(notif)) {
    subscriptionService.markAsRead(notif.id)
  }
}

function handleSelectDataset(datasetId) {
  emit('selectDataset', datasetId)
}

function markAllAsRead() {
  subscriptionService.markAllAsRead()
}

function refresh() {
  activeFilter.value = 'all'
}
</script>

<style scoped>
.notification-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.unread-badge {
  background: var(--color-danger);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.filter-bar {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color);
  overflow-x: auto;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.filter-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filter-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.f-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.notification-card:hover {
  border-color: var(--color-primary);
  transform: translateX(4px);
}

.notification-card.unread {
  background: var(--color-primary) + '08';
  border-color: var(--color-primary) + '33';
}

.card-left {
  flex-shrink: 0;
}

.notif-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-main {
  flex: 1;
  min-width: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.notif-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.notif-time {
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
  margin-left: 12px;
}

.notif-content {
  margin: 0 0 8px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.notif-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.notif-type {
  font-weight: 500;
}

.notif-dataset {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--color-primary);
}

.notif-dataset:hover {
  text-decoration: underline;
}

.card-right {
  display: flex;
  align-items: flex-start;
  padding-top: 4px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-muted);
  text-align: center;
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 8px;
  font-size: 14px;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
