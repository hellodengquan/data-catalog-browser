import { ref, computed } from 'vue'
import {
  users,
  teams,
  datasets,
  datasetTeamMapping,
  sensitivityLevels,
  approvalRequests
} from '../data/mockData'

class PermissionService {
  constructor() {
    this.currentUserId = ref('u-022')
    this._approvalRequests = ref([...approvalRequests])
    this._approvals = this._approvalRequests
    this._permissions = ref(new Map())
    this._initDefaultPermissions()
  }

  get _approvalsMap() {
    const map = {}
    this._approvalRequests.value.forEach(r => {
      map[r.id] = r
    })
    return map
  }

  get _approvals() {
    return this._approvalsMap
  }

  set _approvals(val) {
    if (Array.isArray(val)) {
      this._approvalRequests = ref(val)
    }
  }

  _initDefaultPermissions() {
    const perms = this._permissions.value

    Object.values(teams).forEach(team => {
      team.members.forEach(memberId => {
        const key = `team:${team.id}:${memberId}`
        perms.set(key, {
          userId: memberId,
          teamId: team.id,
          role: memberId === team.manager ? 'manager' : 'member',
          grantedAt: '2024-01-01'
        })
      })
    })

    this._approvalRequests.value.forEach(req => {
      if (req.status === 'approved') {
        req.fieldsRequested.forEach(fieldName => {
          const key = `field:${req.datasetId}:${fieldName}:${req.requesterId}`
          perms.set(key, {
            userId: req.requesterId,
            datasetId: req.datasetId,
            fieldName,
            grantedBy: req.currentApproverId,
            grantedAt: req.approvedAt,
            expiresAt: req.expiryAt,
            approvalId: req.id
          })
        })
      }
    })
  }

  get currentUser() {
    return computed(() => users[this.currentUserId.value])
  }

  get currentUserIdValue() {
    return this.currentUserId.value
  }

  getUserTeams(userId = this.currentUserId.value) {
    const result = []
    Object.values(teams).forEach(team => {
      if (team.members.includes(userId)) {
        result.push({
          ...team,
          userRole: team.manager === userId ? 'manager' : 'member'
        })
      }
    })
    return result
  }

  isTeamMember(teamId, userId = this.currentUserId.value) {
    const team = teams[teamId]
    return team ? team.members.includes(userId) : false
  }

  isTeamManager(teamId, userId = this.currentUserId.value) {
    const team = teams[teamId]
    return team ? team.manager === userId : false
  }

  isAdmin(userId = this.currentUserId.value) {
    const user = users[userId]
    return user?.role === 'admin'
  }

  getDatasetTeam(datasetId) {
    const mapping = datasetTeamMapping[datasetId]
    if (!mapping) return null
    return teams[mapping.teamId] || null
  }

  getDatasetSensitivity(datasetId) {
    const mapping = datasetTeamMapping[datasetId]
    if (!mapping) return null
    const levelInfo = sensitivityLevels[mapping.sensitivityLevel]
    return {
      level: mapping.sensitivityLevel,
      label: levelInfo?.label,
      color: levelInfo?.color,
      numericLevel: levelInfo?.level,
      description: levelInfo?.description,
      requiresApproval: mapping.requiresApproval
    }
  }

  getDatasetsByTeam(teamId) {
    return Object.keys(datasetTeamMapping)
      .filter(dsId => datasetTeamMapping[dsId].teamId === teamId)
      .map(dsId => datasets[dsId])
      .filter(Boolean)
  }

  canViewDataset(datasetId, userId = this.currentUserId.value) {
    if (this.isAdmin(userId)) return { allowed: true, reason: 'admin' }

    const sensitivity = this.getDatasetSensitivity(datasetId)
    const datasetTeam = this.getDatasetTeam(datasetId)

    if (!sensitivity) return { allowed: true, reason: 'no-restriction' }

    if (sensitivity.level === 'public') {
      return { allowed: true, reason: 'public' }
    }

    if (sensitivity.level === 'internal') {
      return { allowed: true, reason: 'internal-user' }
    }

    if (datasetTeam && this.isTeamMember(datasetTeam.id, userId)) {
      return { allowed: true, reason: 'team-member' }
    }

    if (sensitivity.level === 'confidential' || sensitivity.level === 'restricted') {
      const hasApproval = this.hasActiveApproval(datasetId, userId)
      if (hasApproval) {
        return { allowed: true, reason: 'approved' }
      }
    }

    return {
      allowed: false,
      reason: sensitivity.level === 'restricted' ? 'restricted-no-access' : 'approval-required',
      requiresApproval: sensitivity.requiresApproval
    }
  }

  canViewField(datasetId, fieldName, userId = this.currentUserId.value) {
    const datasetAccess = this.canViewDataset(datasetId, userId)
    if (!datasetAccess.allowed) return datasetAccess

    const sensitivity = this.getDatasetSensitivity(datasetId)
    const datasetTeam = this.getDatasetTeam(datasetId)

    if (sensitivity?.level === 'public' || sensitivity?.level === 'internal') {
      return { allowed: true, reason: datasetAccess.reason }
    }

    if (datasetTeam && this.isTeamMember(datasetTeam.id, userId)) {
      return { allowed: true, reason: 'team-member' }
    }

    if (this.hasFieldApproval(datasetId, fieldName, userId)) {
      return { allowed: true, reason: 'field-approved' }
    }

    return {
      allowed: false,
      reason: 'field-approval-required',
      requiresApproval: true
    }
  }

  hasActiveApproval(datasetId, userId = this.currentUserId.value) {
    return this._approvalRequests.value.some(
      req => req.datasetId === datasetId &&
        req.requesterId === userId &&
        req.status === 'approved' &&
        this._isNotExpired(req.expiryAt)
    )
  }

  hasFieldApproval(datasetId, fieldName, userId = this.currentUserId.value) {
    const key = `field:${datasetId}:${fieldName}:${userId}`
    const perm = this._permissions.value.get(key)
    if (!perm) return false
    return this._isNotExpired(perm.expiresAt)
  }

  getApprovedFields(datasetId, userId = this.currentUserId.value) {
    const req = this._approvalRequests.value.find(
      r => r.datasetId === datasetId &&
        r.requesterId === userId &&
        r.status === 'approved' &&
        this._isNotExpired(r.expiryAt)
    )
    return req ? req.fieldsRequested : []
  }

  _isNotExpired(expiryAt) {
    if (!expiryAt) return true
    return new Date(expiryAt) > new Date()
  }

  getApprovalRequests(filters = {}) {
    let result = [...this._approvalRequests.value]

    if (filters.status) {
      result = result.filter(r => r.status === filters.status)
    }
    if (filters.datasetId) {
      result = result.filter(r => r.datasetId === filters.datasetId)
    }
    if (filters.requesterId) {
      result = result.filter(r => r.requesterId === filters.requesterId)
    }
    if (filters.approverId) {
      result = result.filter(r => r.currentApproverId === filters.approverId)
    }

    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  getPendingApprovals(userId = this.currentUserId.value) {
    return this._approvalRequests.value.filter(
      req => req.status === 'pending' && req.currentApproverId === userId
    )
  }

  submitApprovalRequest(data) {
    const dataset = datasets[data.datasetId]
    const datasetTeam = this.getDatasetTeam(data.datasetId)
    if (!dataset || !datasetTeam) {
      return { success: false, error: '无效的数据集' }
    }

    const sensitivity = this.getDatasetSensitivity(data.datasetId)
    if (!sensitivity?.requiresApproval) {
      return { success: false, error: '该数据集无需审批即可访问' }
    }

    const newId = `apr-${String(this._approvalRequests.value.length + 1).padStart(3, '0')}`
    const user = users[this.currentUserId.value]
    const userTeams = this.getUserTeams()
    const now = new Date()
    const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const request = {
      id: newId,
      datasetId: data.datasetId,
      datasetName: dataset.name,
      requesterId: this.currentUserId.value,
      requesterName: user?.name || '未知用户',
      requesterTeam: userTeams[0]?.id || null,
      reason: data.reason,
      fieldsRequested: data.fieldsRequested || [],
      status: 'pending',
      currentApproverId: datasetTeam.manager,
      currentApproverName: users[datasetTeam.manager]?.name || '团队负责人',
      createdAt: this._formatDate(now),
      expiryAt: this._formatDate(expiry),
      approvalHistory: []
    }

    this._approvalRequests.value.push(request)
    const snapshot = JSON.parse(JSON.stringify(request))
    Object.defineProperty(snapshot, 'success', { value: true, enumerable: true })
    return snapshot
  }

  approveRequest(requestId, comment = '', userId = this.currentUserId.value) {
    const request = this._approvalRequests.value.find(r => r.id === requestId)
    if (!request) return false

    if (request.currentApproverId !== userId && !this.isAdmin(userId)) {
      return false
    }

    request.status = 'approved'
    request.approvedAt = this._formatDate(new Date())
    request.approvalHistory.push({
      approverId: userId,
      approverName: users[userId]?.name || '系统',
      action: 'approved',
      comment,
      time: request.approvedAt
    })

    request.fieldsRequested.forEach(fieldName => {
      const key = `field:${request.datasetId}:${fieldName}:${request.requesterId}`
      this._permissions.value.set(key, {
        userId: request.requesterId,
        datasetId: request.datasetId,
        fieldName,
        grantedBy: userId,
        grantedAt: request.approvedAt,
        expiresAt: request.expiryAt,
        approvalId: request.id
      })
    })

    return true
  }

  rejectRequest(requestId, comment = '', userId = this.currentUserId.value) {
    const request = this._approvalRequests.value.find(r => r.id === requestId)
    if (!request) return false

    if (request.currentApproverId !== userId && !this.isAdmin(userId)) {
      return false
    }

    request.status = 'rejected'
    request.rejectedAt = this._formatDate(new Date())
    request.approvalHistory.push({
      approverId: userId,
      approverName: users[userId]?.name || '系统',
      action: 'rejected',
      comment,
      time: request.rejectedAt
    })

    return true
  }

  filterVisibleDatasets(datasetList, userId = this.currentUserId.value) {
    return datasetList.filter(ds => {
      const access = this.canViewDataset(ds.id || ds, userId)
      return access.allowed
    })
  }

  getVisibleFields(datasetId, allFields, userId = this.currentUserId.value) {
    if (this.isAdmin(userId)) {
      return allFields.map(f => ({ ...f, accessible: true }))
    }

    const sensitivity = this.getDatasetSensitivity(datasetId)
    const datasetTeam = this.getDatasetTeam(datasetId)

    if (sensitivity?.level === 'public' || sensitivity?.level === 'internal') {
      return allFields.map(f => ({ ...f, accessible: true }))
    }

    if (datasetTeam && this.isTeamMember(datasetTeam.id, userId)) {
      return allFields.map(f => ({ ...f, accessible: true }))
    }

    const approvedFields = new Set(this.getApprovedFields(datasetId, userId))

    return allFields.map(f => ({
      ...f,
      accessible: approvedFields.has(f.name),
      masked: !approvedFields.has(f.name)
    }))
  }

  switchUser(userId) {
    if (users[userId]) {
      this.currentUserId.value = userId
      return true
    }
    return false
  }

  _formatDate(date) {
    const pad = n => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }

  getAllTeams() {
    return Object.values(teams)
  }

  getAllUsers() {
    return Object.values(users)
  }

  resetApprovals() {
    this._approvalRequests.value = [...approvalRequests]
    this._permissions.value = new Map()
    this._initDefaultPermissions()
  }

  getSensitivityLevel(datasetId) {
    const mapping = datasetTeamMapping[datasetId]
    if (!mapping) return null
    return mapping.sensitivityLevel
  }

  getMyRequests(userId = this.currentUserId.value) {
    return this._approvalRequests.value
      .filter(r => r.requesterId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  isOwner(datasetId, userId = this.currentUserId.value) {
    const team = this.getDatasetTeam(datasetId)
    if (!team) return false
    return team.manager === userId || this.isAdmin(userId) || team.members.includes(userId)
  }
}

export const permissionService = new PermissionService()
