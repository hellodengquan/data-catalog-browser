import { ref, computed } from 'vue'
import {
  users,
  datasets,
  datasetSubscriptions as initialSubscriptions,
  changeNotifications as initialNotifications,
  notificationTypeMap
} from '../data/mockData'

class SubscriptionService {
  constructor() {
    this.currentUserId = ref('u-022')
    this._subscriptions = ref([...initialSubscriptions])
    this._notifications = ref([...initialNotifications])
  }

  get currentUser() {
    return computed(() => users[this.currentUserId.value])
  }

  switchUser(userId) {
    if (users[userId]) {
      this.currentUserId.value = userId
      return true
    }
    return false
  }

  getMySubscriptions(userId = this.currentUserId.value) {
    return this._subscriptions.value.filter(s => s.userId === userId)
  }

  isSubscribed(datasetId, userId = this.currentUserId.value) {
    return this._subscriptions.value.some(
      s => s.userId === userId && s.datasetId === datasetId
    )
  }

  getSubscription(datasetId, userId = this.currentUserId.value) {
    return this._subscriptions.value.find(
      s => s.userId === userId && s.datasetId === datasetId
    )
  }

  subscribe(datasetId, options = {}, userId = this.currentUserId.value) {
    const existing = this.getSubscription(datasetId, userId)
    if (existing) {
      if (options.notifyTypes) {
        existing.notifyTypes = options.notifyTypes
      }
      return { success: true, subscription: existing, isNew: false }
    }

    const user = users[userId]
    const dataset = datasets[datasetId]
    if (!user || !dataset) {
      return { success: false, error: '用户或数据集不存在' }
    }

    const newSub = {
      id: `sub-${String(this._subscriptions.value.length + 1).padStart(3, '0')}`,
      userId,
      datasetId,
      notifyTypes: options.notifyTypes || ['schema_change', 'data_update', 'owner_change', 'quality_alert'],
      createdAt: this._formatDate(new Date())
    }

    this._subscriptions.value.push(newSub)
    return { success: true, subscription: newSub, isNew: true }
  }

  unsubscribe(datasetId, userId = this.currentUserId.value) {
    const idx = this._subscriptions.value.findIndex(
      s => s.userId === userId && s.datasetId === datasetId
    )
    if (idx >= 0) {
      this._subscriptions.value.splice(idx, 1)
      return true
    }
    return false
  }

  updateSubscription(datasetId, options, userId = this.currentUserId.value) {
    const sub = this.getSubscription(datasetId, userId)
    if (!sub) return false
    Object.assign(sub, options)
    return true
  }

  getMyNotifications(userId = this.currentUserId.value, options = {}) {
    const mySubDatasetIds = new Set(
      this.getMySubscriptions(userId).map(s => s.datasetId)
    )

    let notifications = this._notifications.value.filter(n => {
      if (!mySubDatasetIds.has(n.datasetId)) return false

      const sub = this.getSubscription(n.datasetId, userId)
      if (!sub) return false

      if (sub.notifyTypes && !sub.notifyTypes.includes(n.type)) return false

      if (options.unreadOnly && n.readBy.includes(userId)) return false
      return true
    })

    if (options.limit) {
      notifications = notifications.slice(0, options.limit)
    }

    return notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  getUnreadCount(userId = this.currentUserId.value) {
    return this.getMyNotifications(userId, { unreadOnly: true }).length
  }

  markAsRead(notificationId, userId = this.currentUserId.value) {
    const notif = this._notifications.value.find(n => n.id === notificationId)
    if (notif && !notif.readBy.includes(userId)) {
      notif.readBy.push(userId)
      return true
    }
    return false
  }

  markAllAsRead(userId = this.currentUserId.value) {
    let count = 0
    this._notifications.value.forEach(n => {
      if (!n.readBy.includes(userId)) {
        n.readBy.push(userId)
        count++
      }
    })
    return count
  }

  createNotification(notificationData) {
    const newNotif = {
      id: `notif-${String(this._notifications.value.length + 1).padStart(3, '0')}`,
      createdAt: this._formatDate(new Date()),
      readBy: [],
      ...notificationData
    }
    this._notifications.value.unshift(newNotif)
    return newNotif
  }

  notifySchemaChange(datasetId, content, operatorId) {
    const dataset = datasets[datasetId]
    const operator = users[operatorId]
    return this.createNotification({
      datasetId,
      type: 'schema_change',
      title: `${dataset?.name || datasetId} Schema 变更`,
      content,
      operatorId,
      operatorName: operator?.name || '系统'
    })
  }

  notifyDataUpdate(datasetId, content, operatorId) {
    const dataset = datasets[datasetId]
    const operator = users[operatorId]
    return this.createNotification({
      datasetId,
      type: 'data_update',
      title: `${dataset?.name || datasetId} 数据更新`,
      content,
      operatorId,
      operatorName: operator?.name || '系统'
    })
  }

  notifyOwnerChange(datasetId, oldOwner, newOwner, operatorId) {
    const dataset = datasets[datasetId]
    const operator = users[operatorId]
    const oldUser = users[oldOwner]
    const newUser = users[newOwner]
    return this.createNotification({
      datasetId,
      type: 'owner_change',
      title: `${dataset?.name || datasetId} 负责人变更`,
      content: `负责人从 ${oldUser?.name || oldOwner} 变更为 ${newUser?.name || newOwner}`,
      operatorId,
      operatorName: operator?.name || '系统'
    })
  }

  getSubscribers(datasetId) {
    return this._subscriptions.value
      .filter(s => s.datasetId === datasetId)
      .map(s => ({
        ...s,
        user: users[s.userId]
      }))
  }

  getSubscribersForDataset(datasetId) {
    return this._subscriptions.value
      .filter(s => s.datasetId === datasetId)
  }

  sendNotification(userId, notificationData) {
    return this.createNotification({
      ...notificationData,
      userId: userId
    })
  }

  getNotificationTypeInfo(type) {
    return notificationTypeMap[type] || notificationTypeMap['data_update']
  }

  resetSubscriptions() {
    this._subscriptions.value = [...initialSubscriptions]
    this._notifications.value = [...initialNotifications]
  }

  _formatDate(date) {
    const pad = n => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }
}

export const subscriptionService = new SubscriptionService()
