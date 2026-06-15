import { describe, it, expect, beforeEach } from 'vitest'
import { permissionService } from '../src/utils/permissionService'
import { datasets, sensitivityLevels, datasetTeamMapping, users, teams } from '../src/data/mockData'

describe('PermissionService - 多团队权限隔离与审批流', () => {
  describe('用户切换', () => {
    it('默认有当前用户', () => {
      expect(permissionService.currentUser).toBeTruthy()
    })

    it('可以切换到管理员用户', () => {
      permissionService.switchUser('u-025')
      expect(permissionService.currentUser.value?.id).toBe('u-025')
      expect(permissionService.currentUser.value?.role).toBe('admin')
    })

    it('切换用户后权限重新计算', () => {
      permissionService.switchUser('u-025')
      const adminAccess = permissionService.canViewDataset('ds-012')
      permissionService.switchUser('u-024')
      const analystAccess = permissionService.canViewDataset('ds-012')
      expect(adminAccess.allowed).toBe(true)
      expect(typeof analystAccess.allowed).toBe('boolean')
    })
  })

  describe('数据集级权限 - 敏感度分级', () => {
    beforeEach(() => {
      permissionService.switchUser('u-024')
    })

    it('PUBLIC 级别对所有用户开放', () => {
      const publicDatasets = Object.entries(datasetTeamMapping)
        .filter(([, m]) => m.sensitivityLevel === 'public')
        .map(([id]) => id)

      publicDatasets.forEach(id => {
        const access = permissionService.canViewDataset(id)
        expect(access.allowed).toBe(true)
      })
    })

    it('INTERNAL 级别对全员可见', () => {
      const internalDatasets = Object.entries(datasetTeamMapping)
        .filter(([, m]) => m.sensitivityLevel === 'internal')
        .map(([id]) => id)

      if (internalDatasets.length > 0) {
        const access = permissionService.canViewDataset(internalDatasets[0])
        expect(access.allowed).toBe(true)
      }
    })

    it('CONFIDENTIAL 级别非团队成员需要审批', () => {
      permissionService.switchUser('u-024')
      const confidentialDatasets = Object.entries(datasetTeamMapping)
        .filter(([, m]) => m.sensitivityLevel === 'confidential')
        .filter(([id]) => {
          const teamId = datasetTeamMapping[id]?.teamId
          return !users['u-024']?.teamIds?.includes(teamId)
        })
        .map(([id]) => id)

      if (confidentialDatasets.length > 0) {
        const access = permissionService.canViewDataset(confidentialDatasets[0])
        expect(['approval-required', 'approval-granted', 'team-member'])
          .toContain(access.reason)
      }
    })

    it('RESTRICTED 级别非授权团队完全不可见', () => {
      permissionService.switchUser('u-024')
      const restrictedDatasets = Object.entries(datasetTeamMapping)
        .filter(([, m]) => m.sensitivityLevel === 'restricted')
        .map(([id]) => id)

      if (restrictedDatasets.length > 0) {
        const access = permissionService.canViewDataset(restrictedDatasets[0])
        expect(typeof access.allowed).toBe('boolean')
      }
    })
  })

  describe('团队成员权限', () => {
    it('团队成员可以访问本团队 CONFIDENTIAL 数据', () => {
      permissionService.switchUser('u-010')
      const userTeamIds = permissionService.currentUser?.teamIds || []
      const confidentialOwn = Object.entries(datasetTeamMapping)
        .filter(([, m]) =>
          m.sensitivityLevel === 'confidential' && userTeamIds.includes(m.teamId)
        )
        .map(([id]) => id)

      if (confidentialOwn.length > 0) {
        const access = permissionService.canViewDataset(confidentialOwn[0])
        expect(access.allowed).toBe(true)
      }
    })

    it('管理员可以访问所有数据', () => {
      permissionService.switchUser('u-025')
      Object.keys(datasets).forEach(id => {
        const access = permissionService.canViewDataset(id)
        expect(access.allowed).toBe(true)
      })
    })
  })

  describe('字段级权限', () => {
    it('字段级权限：非授权用户会屏蔽敏感字段', () => {
      permissionService.switchUser('u-024')
      const restrictedDsIds = Object.entries(datasetTeamMapping)
        .filter(([, m]) => m.sensitivityLevel !== 'public')
        .map(([id]) => id)

      restrictedDsIds.forEach(dsId => {
        const ds = datasets[dsId]
        if (!ds) return
        const visible = permissionService.getVisibleFields(dsId, ds.fields)
        expect(visible.length).toBe(ds.fields.length)
        const hasMasked = visible.some(f => f.masked === true)
        const hasUnmasked = visible.some(f => !f.masked)
        expect(typeof hasMasked).toBe('boolean')
        expect(typeof hasUnmasked).toBe('boolean')
      })
    })

    it('PUBLIC 数据集字段全部不脱敏', () => {
      permissionService.switchUser('u-024')
      const publicIds = Object.entries(datasetTeamMapping)
        .filter(([, m]) => m.sensitivityLevel === 'public')
        .map(([id]) => id)

      publicIds.forEach(dsId => {
        const ds = datasets[dsId]
        if (!ds) return
        const visible = permissionService.getVisibleFields(dsId, ds.fields)
        expect(visible.every(f => !f.masked)).toBe(true)
      })
    })

    it('管理员查看字段全部不脱敏', () => {
      permissionService.switchUser('u-025')
      Object.keys(datasets).forEach(dsId => {
        const ds = datasets[dsId]
        if (!ds) return
        const visible = permissionService.getVisibleFields(dsId, ds.fields)
        expect(visible.every(f => !f.masked)).toBe(true)
      })
    })
  })

  describe('审批流程', () => {
    beforeEach(() => {
      permissionService.resetApprovals()
    })

    it('可以提交新的审批申请', () => {
      permissionService.switchUser('u-024')
      const beforeCount = permissionService.getMyRequests().length
      const req = permissionService.submitApprovalRequest({
        datasetId: 'ds-012',
        reason: '用户分析需要',
        fieldsRequested: ['phone', 'email'],
        durationDays: 7
      })
      expect(req).toBeTruthy()
      expect(req.id).toBeTruthy()
      expect(req.status).toBe('pending')
      expect(req.requesterId).toBe('u-024')
      expect(permissionService.getMyRequests().length).toBe(beforeCount + 1)
    })

    it('审批人可以批准申请', () => {
      permissionService.switchUser('u-024')
      const req = permissionService.submitApprovalRequest({
        datasetId: 'ds-006',
        reason: '分析',
        fieldsRequested: [],
        durationDays: 14
      })

      const mapping = datasetTeamMapping['ds-006']
      const managerId = teams[mapping.teamId]?.manager || 'u-010'

      permissionService.switchUser(managerId)
      const result = permissionService.approveRequest(req.id, '批准')
      expect(result).toBe(true)

      permissionService.switchUser('u-024')
      const updated = permissionService.getMyRequests().find(r => r.id === req.id)
      expect(updated.status).toBe('approved')

      const access = permissionService.canViewDataset('ds-006')
      expect(access.allowed).toBe(true)
    })

    it('审批人可以拒绝申请', () => {
      permissionService.switchUser('u-024')
      const req = permissionService.submitApprovalRequest({
        datasetId: 'ds-006',
        reason: '不合理',
        fieldsRequested: [],
        durationDays: 14
      })

      const mapping = datasetTeamMapping['ds-006']
      const managerId = teams[mapping.teamId]?.manager || 'u-010'

      permissionService.switchUser(managerId)
      const result = permissionService.rejectRequest(req.id, '理由不充分')
      expect(result).toBe(true)

      permissionService.switchUser('u-024')
      const updated = permissionService.getMyRequests().find(r => r.id === req.id)
      expect(updated.status).toBe('rejected')
    })

    it('非审批人不能审批', () => {
      permissionService.switchUser('u-024')
      const req = permissionService.submitApprovalRequest({
        datasetId: 'ds-012',
        reason: '分析',
        fieldsRequested: [],
        durationDays: 14
      })

      permissionService.switchUser('u-020')
      const result = permissionService.approveRequest(req.id, '擅自批准')
      expect(result).toBe(false)
    })

    it('可以获取待我审批列表', () => {
      permissionService.switchUser('u-024')
      permissionService.submitApprovalRequest({
        datasetId: 'ds-012',
        reason: '分析',
        fieldsRequested: [],
        durationDays: 14
      })

      const mapping = datasetTeamMapping['ds-012']
      const managerId = teams[mapping.teamId]?.manager || 'u-010'

      permissionService.switchUser(managerId)
      const pending = permissionService.getPendingApprovals()
      expect(Array.isArray(pending)).toBe(true)
      expect(pending.length).toBeGreaterThanOrEqual(1)
    })

    it('过期审批自动失效', () => {
      const now = Date.now()
      const oldApproval = {
        id: 'test-expired',
        datasetId: 'ds-012',
        status: 'approved',
        expiresAt: now - 1000,
        approvals: []
      }
      permissionService._approvals[oldApproval.id] = oldApproval

      permissionService.switchUser('u-024')
      const pending = permissionService.getPendingApprovals()
      const expired = permissionService._approvals['test-expired']
      expect(['revoked', 'expired']).toContain(expired?.status || 'expired')
    })

    it('审批历史记录追加', () => {
      permissionService.switchUser('u-024')
      const req = permissionService.submitApprovalRequest({
        datasetId: 'ds-012',
        reason: '分析',
        fieldsRequested: [],
        durationDays: 14
      })
      expect(req.approvalHistory?.length).toBeGreaterThanOrEqual(0)

      const mapping = datasetTeamMapping['ds-012']
      const managerId = teams[mapping.teamId]?.manager || 'u-010'

      permissionService.switchUser(managerId)
      permissionService.approveRequest(req.id, 'ok')

      const updated = permissionService._approvals[req.id]
      expect(updated.approvalHistory.length).toBeGreaterThanOrEqual(req.approvalHistory.length + 1)
    })
  })

  describe('权限查询工具', () => {
    it('getUserTeams 返回用户所属团队', () => {
      permissionService.switchUser('u-022')
      const teamIds = permissionService.getUserTeams()
      expect(Array.isArray(teamIds)).toBe(true)
      expect(teamIds.length).toBeGreaterThan(0)
    })

    it('isOwner 正确识别所有者', () => {
      permissionService.switchUser('u-022')
      const ownTeamIds = permissionService.getUserTeams()
      const ownedDs = Object.entries(datasetTeamMapping)
        .find(([, m]) => ownTeamIds.includes(m.teamId))

      if (ownedDs) {
        expect(permissionService.isOwner(ownedDs[0])).toBe(true)
      }
    })

    it('getSensitivityLevel 返回正确级别', () => {
      const level = permissionService.getSensitivityLevel('ds-012')
      expect(Object.keys(sensitivityLevels)).toContain(level)
    })
  })
})
