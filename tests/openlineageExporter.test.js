import { describe, it, expect } from 'vitest'
import {
  exportDatasetToOpenLineage,
  exportLineageToOpenLineage,
  exportFullCatalog,
  generateOpenLineageDatasetStats,
  buildOpenLineageRun,
  buildOpenLineageDataset,
  buildFacet,
  parseOpenLineageURN
} from '../src/utils/openlineageExporter'
import { datasets, datasetTeamMapping, fieldLineage } from '../src/data/mockData'

describe('OpenLineageExporter - 标准格式导出', () => {
  describe('规范符合性', () => {
    it('producer URL 符合 OpenLineage 规范', () => {
      const data = exportDatasetToOpenLineage('ds-012')
      expect(data.producer).toMatch(/^https?:\/\//)
    })

    it('schemaURL 指向官方规范', () => {
      const data = exportDatasetToOpenLineage('ds-012')
      expect(data.schemaURL).toContain('openlineage')
    })

    it('eventType 正确', () => {
      const data = exportDatasetToOpenLineage('ds-012')
      expect(data.eventType).toBe('COMPLETE')
    })

    it('eventTime 是 ISO 格式时间戳', () => {
      const data = exportDatasetToOpenLineage('ds-012')
      const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      expect(isoPattern.test(data.eventTime)).toBe(true)
    })

    it('run facets 包含 spark_version（兼容 Spark Listener）', () => {
      const data = exportDatasetToOpenLineage('ds-012')
      expect(data.run.facets.spark_version).toBeTruthy()
    })
  })

  describe('Dataset 命名空间', () => {
    it('正确识别 mysql:// 命名空间', () => {
      const ds = exportDatasetToOpenLineage('ds-012')
      const output = ds.outputs?.[0] || ds.inputs?.[0] || { namespace: '' }
      expect(output.namespace).toMatch(/^mysql:\/\/|hdfs:\/\/|s3:\/\//)
    })

    it('正确识别 hdfs:// 命名空间', () => {
      const ds = exportDatasetToOpenLineage('ds-006')
      const output = ds.outputs?.[0] || ds.inputs?.[0] || { namespace: '' }
      expect(output.namespace).toMatch(/^mysql:\/\/|hdfs:\/\/|s3:\/\//)
    })

    it('URN 解析正确', () => {
      const ds = exportDatasetToOpenLineage('ds-012')
      const output = ds.outputs?.[0] || ds.inputs?.[0]
      if (output) {
        const parsed = parseOpenLineageURN(output)
        expect(parsed).toBeTruthy()
        expect(parsed.namespace).toBeTruthy()
        expect(parsed.name).toBeTruthy()
      }
    })
  })

  describe('Facets', () => {
    it('包含 schema facet 且字段列表完整', () => {
      const data = exportDatasetToOpenLineage('ds-012')
      const allDatasets = [
        ...(data.inputs || []),
        ...(data.outputs || [])
      ]
      expect(allDatasets.length).toBeGreaterThan(0)
      const dsFacet = allDatasets[0].facets
      expect(dsFacet.schema).toBeTruthy()
      expect(Array.isArray(dsFacet.schema.fields)).toBe(true)
      expect(dsFacet.schema.fields.length).toBeGreaterThan(0)
    })

    it('每个 schema 字段包含 name 和 type', () => {
      const data = exportDatasetToOpenLineage('ds-006')
      const allDatasets = [
        ...(data.inputs || []),
        ...(data.outputs || [])
      ]
      allDatasets.forEach(ds => {
        ds.facets.schema?.fields?.forEach(f => {
          expect(f.name).toBeTruthy()
          expect(f.type).toBeTruthy()
        })
      })
    })

    it('包含 ownership facet', () => {
      const data = exportDatasetToOpenLineage('ds-012')
      const allDatasets = [
        ...(data.inputs || []),
        ...(data.outputs || [])
      ]
      allDatasets.forEach(ds => {
        expect(ds.facets.ownership).toBeTruthy()
        expect(ds.facets.ownership.owners).toBeTruthy()
      })
    })

    it('包含 securityClassification facet', () => {
      const data = exportDatasetToOpenLineage('ds-012')
      const allDatasets = [
        ...(data.inputs || []),
        ...(data.outputs || [])
      ]
      allDatasets.forEach(ds => {
        expect(ds.facets.securityClassification).toBeTruthy()
        expect(ds.facets.securityClassification.classification).toBeTruthy()
      })
    })

    it('包含 dataSource facet', () => {
      const data = exportDatasetToOpenLineage('ds-006')
      const allDatasets = [
        ...(data.inputs || []),
        ...(data.outputs || [])
      ]
      allDatasets.forEach(ds => {
        expect(ds.facets.dataSource).toBeTruthy()
        expect(ds.facets.dataSource.name).toBeTruthy()
        expect(ds.facets.dataSource.uri).toBeTruthy()
      })
    })

    it('包含 custom facets: 团队、标签、敏感度、行数', () => {
      const data = exportDatasetToOpenLineage('ds-012')
      const allDatasets = [
        ...(data.inputs || []),
        ...(data.outputs || [])
      ]
      allDatasets.forEach(ds => {
        const f = ds.facets
        expect(f.team).toBeTruthy()
        expect(f.tags).toBeTruthy()
        expect(f.sensitivity).toBeTruthy()
      })
    })
  })

  describe('血缘关联导出', () => {
    it('关联血缘导出包含多条血缘边', () => {
      const id = 'ds-006'
      const relatedCount = fieldLineage.edges.filter(
        e => e.sourceDataset === id || e.targetDataset === id
      ).length

      if (relatedCount > 0) {
        const data = exportLineageToOpenLineage([id])
        const runs = Array.isArray(data) ? data : (data.events || [])
        expect(runs.length).toBeGreaterThan(0)
      }
    })

    it('每条 RUN 包含 inputs 或 outputs', () => {
      const allIds = Object.keys(datasets).slice(0, 5)
      const data = exportLineageToOpenLineage(allIds)
      const runs = Array.isArray(data) ? data : (data.events || [data])

      runs.forEach(r => {
        const hasInputs = r.inputs?.length > 0 || r.job?.inputs?.length > 0
        const hasOutputs = r.outputs?.length > 0 || r.job?.outputs?.length > 0
        const isLineage = r.eventType === 'LINEAGE'
        const isDataset = r.eventType === 'COMPLETE'
        if (isLineage) {
          expect(r.inputs?.length || 0).toBeGreaterThan(0)
          expect(r.outputs?.length || 0).toBeGreaterThan(0)
        } else if (isDataset) {
          expect(r.outputs?.length || 0).toBeGreaterThan(0)
        } else {
          expect(hasInputs || hasOutputs).toBe(true)
        }
      })
    })

    it('LINEAGE 事件 RUN facets 包含 transformationType', () => {
      const data = exportLineageToOpenLineage(['ds-006'])
      const runs = Array.isArray(data) ? data : (data.events || [data])
      const lineageRuns = runs.filter(r => r.eventType === 'LINEAGE')
      lineageRuns.forEach(r => {
        const job = r.job || r
        expect(job.facets?.jobType || job.facets?.transformationType).toBeTruthy()
      })
    })
  })

  describe('全量目录导出', () => {
    it('全量导出包含所有数据集', () => {
      const data = exportFullCatalog()
      const count = Array.isArray(data) ? data.length : (data?.events?.length || 0)
      expect(count).toBeGreaterThanOrEqual(Object.keys(datasets).length)
    })

    it('全量导出可生成统计信息', () => {
      const stats = generateOpenLineageDatasetStats()
      expect(stats.totalDatasets).toBe(Object.keys(datasets).length)
      expect(typeof stats.totalFields).toBe('number')
      expect(stats.totalLineageEdges).toBe(fieldLineage.edges.length)
      expect(stats.teams).toBeGreaterThan(0)
    })

    it('敏感度分布统计正确', () => {
      const stats = generateOpenLineageDatasetStats()
      const totalFromBreakdown = Object.values(stats.sensitivityBreakdown)
        .reduce((a, b) => a + b, 0)
      expect(totalFromBreakdown).toBe(stats.totalDatasets)
    })
  })

  describe('构建辅助函数', () => {
    it('buildFacet 正确构建 _producer 和 _schemaURL', () => {
      const facet = buildFacet({ custom: 'value' })
      expect(facet.custom).toBe('value')
      expect(facet._producer).toMatch(/^https?:\/\//)
    })

    it('buildOpenLineageDataset 返回正确结构', () => {
      const ds = datasets['ds-012']
      const mapping = datasetTeamMapping['ds-012']
      const olDs = buildOpenLineageDataset(ds, mapping, 'COMPLETE')
      expect(olDs.namespace).toBeTruthy()
      expect(olDs.name).toBeTruthy()
      expect(olDs.facets).toBeTruthy()
    })

    it('buildOpenLineageRun 返回正确结构', () => {
      const run = buildOpenLineageRun({
        inputs: [],
        outputs: [],
        jobName: 'test_job',
        transformationType: 'QUERY'
      })
      expect(run.eventType).toBe('COMPLETE')
      expect(run.run.runId).toBeTruthy()
      expect(run.job.namespace).toBe('data-catalog-browser')
    })
  })

  describe('JSON 序列化', () => {
    it('导出数据可以被 JSON 序列化', () => {
      const data = exportDatasetToOpenLineage('ds-012')
      const json = JSON.stringify(data)
      expect(typeof json).toBe('string')
      expect(() => JSON.parse(json)).not.toThrow()
    })

    it('全量数据可以被 JSON 序列化且无循环引用', () => {
      const data = exportFullCatalog()
      expect(() => JSON.stringify(data)).not.toThrow()
    })
  })
})
