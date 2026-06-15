import {
  datasets,
  datasetTeamMapping,
  teams,
  users,
  fieldLineage,
  sensitivityLevels
} from '../data/mockData'

const OPENLINEAGE_SPEC_VERSION = '1.0.0'
const PRODUCER = 'https://catalog.internal/data-catalog-browser/v1.0.0'

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function getCurrentISO() {
  return new Date().toISOString()
}

function parseStorageLocation(location) {
  if (!location) return { name: 'unknown', namespace: 'default://default' }

  const storageSchemeMap = {
    hive: 'hdfs',
    kafka: 'kafka',
    mysql: 'mysql',
    mariadb: 'mysql',
    postgres: 'postgres',
    clickhouse: 'clickhouse',
    redis: 'redis',
    elasticsearch: 'es',
    es: 'es',
    mongodb: 'mongodb',
    mongo: 'mongodb',
    s3: 's3',
    minio: 's3',
    oss: 's3',
    hdfs: 'hdfs'
  }

  const match = location.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//)
  if (match) {
    const protocol = match[1].toLowerCase()
    const rest = location.slice(match[0].length)
    const slashIdx = rest.indexOf('/')
    if (slashIdx > 0) {
      return {
        namespace: `${protocol}://${rest.slice(0, slashIdx)}`,
        name: rest.slice(slashIdx + 1)
      }
    }
    return { namespace: `${protocol}://default`, name: rest || 'default' }
  }

  const slashMatch = location.match(/^\s*([a-zA-Z0-9_-]+)\s*\/\s*(.+)$/)
  if (slashMatch) {
    const storageType = slashMatch[1].trim().toLowerCase()
    const path = slashMatch[2].trim()
    const scheme = storageSchemeMap[storageType] || storageType
    const firstSlash = path.indexOf('/')
    if (firstSlash > 0) {
      return {
        namespace: `${scheme}://${path.slice(0, firstSlash)}`,
        name: path.slice(firstSlash + 1)
      }
    }
    return {
      namespace: `${scheme}://default`,
      name: path
    }
  }

  return { namespace: 'default://default', name: location.trim() }
}

function mapFieldType(type) {
  const typeLower = type.toLowerCase()
  if (typeLower.includes('int') || typeLower.includes('bigint') || typeLower.includes('tinyint') || typeLower.includes('smallint')) {
    return 'INTEGER'
  } else if (typeLower.includes('decimal') || typeLower.includes('double') || typeLower.includes('float') || typeLower.includes('number')) {
    return 'FLOAT'
  } else if (typeLower.includes('timestamp') || typeLower.includes('datetime') || typeLower.includes('date')) {
    return typeLower.includes('time') ? 'TIMESTAMP' : 'DATE'
  } else if (typeLower.includes('bool')) {
    return 'BOOLEAN'
  } else if (typeLower.includes('map') || typeLower.includes('json') || typeLower.includes('array')) {
    return 'COMPLEX'
  } else if (typeLower.includes('text') || typeLower.includes('clob') || typeLower.includes('blob')) {
    return 'CLOB'
  } else {
    return 'STRING'
  }
}

export function exportDatasetToOpenLineage(datasetId, options = {}) {
  const dataset = datasets[datasetId]
  if (!dataset) {
    throw new Error(`Dataset not found: ${datasetId}`)
  }

  const storage = parseStorageLocation(dataset.storageLocation)
  const teamMapping = datasetTeamMapping[datasetId] || {}
  const team = teams[teamMapping.teamId]
  const manager = team ? users[team.manager] : null
  const sensitivity = sensitivityLevels[teamMapping.sensitivityLevel]

  const facets = {
    schema: {
      _producer: PRODUCER,
      _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/SchemaDatasetFacet.json',
      fields: dataset.fields.map((field, idx) => ({
        name: field.name,
        type: mapFieldType(field.type),
        description: field.description,
        nullable: field.nullable !== false,
        index: idx,
        isPrimaryKey: field.name.toLowerCase().includes('_id') && field.nullable === false
      }))
    },
    description: {
      _producer: PRODUCER,
      _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/DocumentationDatasetFacet.json',
      description: dataset.description
    },
    ownership: {
      _producer: PRODUCER,
      _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/OwnershipDatasetFacet.json',
      owners: [
        {
          name: team?.name || dataset.owner,
          type: 'TEAM'
        },
        ...(manager ? [{
          name: manager.email,
          type: 'PERSON'
        }] : [])
      ]
    },
    version: {
      _producer: PRODUCER,
      _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/VersionDatasetFacet.json',
      datasetVersion: dataset.updatedTime
    },
    lifecycle: {
      _producer: PRODUCER,
      lifecycleStateChange: options.lifecycleState || 'LIFECYCLE_STATE_NORMAL'
    },
    securityClassification: {
      _producer: PRODUCER,
      _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/SecurityClassificationDatasetFacet.json',
      classification: sensitivity?.level || 'internal'
    },
    dataSource: {
      _producer: PRODUCER,
      _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/DatasourceDatasetFacet.json',
      name: storage.namespace,
      uri: dataset.storageLocation
    },
    team: {
      _producer: PRODUCER,
      teamId: teamMapping.teamId,
      teamName: team?.name,
      requiresApproval: teamMapping.requiresApproval || false
    },
    tags: {
      _producer: PRODUCER,
      _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/TagsDatasetFacet.json',
      tags: dataset.tags.map(t => ({ name: t }))
    },
    sensitivity: {
      _producer: PRODUCER,
      level: teamMapping.sensitivityLevel,
      label: sensitivity?.label,
      color: sensitivity?.color
    },
    custom: {
      _producer: PRODUCER,
      tags: dataset.tags,
      updateFrequency: dataset.updateFrequency,
      dataVolume: dataset.dataVolume,
      sensitivityLevel: teamMapping.sensitivityLevel,
      requiresApproval: teamMapping.requiresApproval || false,
      team: team ? {
        id: team.id,
        name: team.name,
        description: team.description,
        manager: manager?.name
      } : null
    }
  }

  const runFacet = {
    producer: PRODUCER,
    schemaURL: 'https://openlineage.io/spec/1-0-0/OpenLineage.json',
    spark_version: {
      _producer: PRODUCER,
      sparkVersion: '3.4.0',
      appName: dataset?.name || 'data-catalog-browser'
    }
  }

  return {
    eventType: 'COMPLETE',
    eventTime: getCurrentISO(),
    run: {
      runId: generateUUID(),
      facets: runFacet
    },
    job: {
      namespace: 'data-catalog',
      name: 'dataset-metadata-export',
      facets: {
        sourceCodeLocation: {
          _producer: PRODUCER,
          repoUrl: options.repoUrl || 'https://catalog.internal/data-catalog-browser',
          branch: 'main'
        }
      }
    },
    inputs: [],
    outputs: [{
      namespace: storage.namespace,
      name: storage.name,
      facets
    }],
    producer: PRODUCER,
    schemaURL: 'https://openlineage.io/spec/1-0-0/OpenLineage.json#/$defs/RunEvent'
  }
}

export function exportLineageToOpenLineage(datasetIds, options = {}) {
  const ids = datasetIds || Object.keys(datasets)

  const events = []
  const processedEdges = new Set()

  ids.forEach(datasetId => {
    const lineage = exportDatasetToOpenLineage(datasetId, options)
    events.push(lineage)

    const relatedEdges = fieldLineage.edges.filter(
      e => (e.sourceDataset === datasetId || e.targetDataset === datasetId) &&
        ids.includes(e.sourceDataset) && ids.includes(e.targetDataset)
    )

    relatedEdges.forEach(edge => {
      const edgeKey = `${edge.sourceDataset}:${edge.sourceField}->${edge.targetDataset}:${edge.targetField}`
      if (processedEdges.has(edgeKey)) return
      processedEdges.add(edgeKey)

      const sourceDs = datasets[edge.sourceDataset]
      const targetDs = datasets[edge.targetDataset]
      if (!sourceDs || !targetDs) return

      const sourceStorage = parseStorageLocation(sourceDs.storageLocation)
      const targetStorage = parseStorageLocation(targetDs.storageLocation)

      const jobTypeMap = {
        direct: 'sql.copy',
        aggregate: 'sql.aggregate',
        join: 'sql.join',
        transform: 'sql.transform',
        filter: 'sql.filter'
      }

      const lineageEvent = {
        eventType: 'LINEAGE',
        eventTime: getCurrentISO(),
        run: {
          runId: generateUUID(),
          facets: {
            parent: {
              _producer: PRODUCER,
              _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/ParentRunFacet.json',
              run: {
                runId: lineage.run.runId
              },
              job: {
                namespace: 'data-catalog',
                name: 'dataset-metadata-export'
              }
            }
          }
        },
        job: {
          namespace: 'data-pipeline',
          name: `${jobTypeMap[edge.transformType] || 'etl'}.${edge.sourceDataset}_to_${edge.targetDataset}`,
          facets: {
            jobType: {
              _producer: PRODUCER,
              jobType: jobTypeMap[edge.transformType] || 'ETL',
              integration: edge.transformType,
              processingType: edge.transformType === 'aggregate' ? 'BATCH' : 'STREAM'
            },
            sql: edge.transformType === 'direct' ? undefined : {
              _producer: PRODUCER,
              query: `-- Auto-generated transformation: ${edge.description}\nSELECT ${edge.targetField} FROM ${sourceDs.storageLocation}`
            }
          }
        },
        inputs: [{
          namespace: sourceStorage.namespace,
          name: sourceStorage.name,
          facets: {
            dataSource: {
              _producer: PRODUCER,
              name: sourceDs.name,
              uri: sourceDs.storageLocation
            },
            inputFields: {
              _producer: PRODUCER,
              _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/InputFieldsDatasetFacet.json',
              fields: [{
                field: edge.sourceField,
                transformationDescription: edge.description,
                transformationType: edge.transformType
              }]
            }
          }
        }],
        outputs: [{
          namespace: targetStorage.namespace,
          name: targetStorage.name,
          facets: {
            dataSource: {
              _producer: PRODUCER,
              name: targetDs.name,
              uri: targetDs.storageLocation
            },
            outputFields: {
              _producer: PRODUCER,
              _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/OutputStatisticsOutputDatasetFacet.json',
              fieldCount: 1
            }
          }
        }],
        producer: PRODUCER,
        schemaURL: 'https://openlineage.io/spec/1-0-0/OpenLineage.json#/$defs/RunEvent'
      }

      events.push(lineageEvent)
    })
  })

  return {
    specVersion: OPENLINEAGE_SPEC_VERSION,
    producedAt: getCurrentISO(),
    producer: PRODUCER,
    eventCount: events.length,
    events
  }
}

export function exportFullCatalog(options = {}) {
  const allDatasetIds = Object.keys(datasets)
  return exportLineageToOpenLineage(allDatasetIds, options)
}

export function downloadJSON(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'openlineage-export.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadNDJSON(data, filename) {
  const events = data.events || Array.isArray(data) ? data : [data]
  const ndjson = events.map(e => JSON.stringify(e)).join('\n')
  const blob = new Blob([ndjson], { type: 'application/x-ndjson' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'openlineage-export.ndjson'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function generateOpenLineageDatasetStats() {
  const ids = Object.keys(datasets)
  const lineageCount = fieldLineage.edges.filter(
    e => ids.includes(e.sourceDataset) && ids.includes(e.targetDataset)
  ).length

  return {
    totalDatasets: ids.length,
    totalFields: ids.reduce((sum, id) => sum + (datasets[id]?.fields?.length || 0), 0),
    totalLineageEdges: lineageCount,
    teams: Object.keys(teams).length,
    sensitivityBreakdown: Object.entries(datasetTeamMapping).reduce((acc, [, mapping]) => {
      const level = mapping.sensitivityLevel || 'unknown'
      acc[level] = (acc[level] || 0) + 1
      return acc
    }, {}),
    namespaceBreakdown: ids.reduce((acc, id) => {
      const storage = parseStorageLocation(datasets[id]?.storageLocation)
      const ns = storage.namespace || 'unknown'
      acc[ns] = (acc[ns] || 0) + 1
      return acc
    }, {})
  }
}

export function buildFacet(facetData, schemaURL = '') {
  return {
    ...facetData,
    _producer: PRODUCER,
    _schemaURL: schemaURL || 'https://openlineage.io/spec/facets/1-0-0/CustomDatasetFacet.json'
  }
}

export function parseOpenLineageURN(ds) {
  if (!ds) return { namespace: '', name: '' }
  return {
    namespace: ds.namespace || '',
    name: ds.name || ''
  }
}

export function buildOpenLineageDataset(dataset, teamMapping, lifecycleState = 'LIFECYCLE_STATE_NORMAL') {
  if (!dataset) return null
  const storage = parseStorageLocation(dataset.storageLocation)
  const team = teams[teamMapping.teamId]
  const manager = team ? users[team.manager] : null
  const sensitivity = sensitivityLevels[teamMapping.sensitivityLevel]

  return {
    namespace: storage.namespace,
    name: storage.name,
    facets: {
      schema: buildFacet({
        fields: dataset.fields.map((field, idx) => ({
          name: field.name,
          type: mapFieldType(field.type),
          description: field.description,
          nullable: field.nullable !== false,
          index: idx
        }))
      }, 'https://openlineage.io/spec/facets/1-0-0/SchemaDatasetFacet.json'),
      dataSource: buildFacet({
        name: storage.namespace,
        uri: `${storage.namespace}://${storage.name}`
      }, 'https://openlineage.io/spec/facets/1-0-0/DatasourceDatasetFacet.json'),
      ownership: buildFacet({
        owners: [
          { name: team?.name || dataset.owner, type: 'TEAM' },
          ...(manager ? [{ name: manager.email, type: 'PERSON' }] : [])
        ]
      }, 'https://openlineage.io/spec/facets/1-0-0/OwnershipDatasetFacet.json'),
      securityClassification: buildFacet({
        classification: sensitivity?.level || 'internal',
        levelLabel: sensitivity?.label
      }, 'https://openlineage.io/spec/facets/1-0-0/SecurityClassificationDatasetFacet.json'),
      documentation: buildFacet({
        description: dataset.description
      }, 'https://openlineage.io/spec/facets/1-0-0/DocumentationDatasetFacet.json'),
      team: buildFacet({
        teamId: teamMapping.teamId,
        teamName: team?.name,
        requiresApproval: teamMapping.requiresApproval || false
      }),
      tags: buildFacet({
        tags: dataset.tags.map(t => ({ name: t }))
      }, 'https://openlineage.io/spec/facets/1-0-0/TagsDatasetFacet.json'),
      sensitivity: buildFacet({
        level: teamMapping.sensitivityLevel,
        label: sensitivity?.label,
        color: sensitivity?.color
      })
    }
  }
}

export function buildOpenLineageRun(options = {}) {
  const {
    inputs = [],
    outputs = [],
    jobName = 'unknown-job',
    jobNamespace = 'data-catalog-browser',
    transformationType = 'QUERY',
    description = '',
    eventType = 'COMPLETE'
  } = options

  return {
    eventType,
    eventTime: getCurrentISO(),
    run: {
      runId: generateUUID(),
      facets: {
        spark_version: buildFacet({
          sparkVersion: '3.4.0',
          appName: jobName
        })
      }
    },
    job: {
      namespace: jobNamespace,
      name: jobName,
      facets: {
        transformationType: buildFacet({
          transformationType,
          description
        }, 'https://openlineage.io/spec/facets/1-0-0/TransformationJobFacet.json'),
        sourceCodeLocation: buildFacet({
          repoUrl: 'https://catalog.internal/data-catalog-browser',
          branch: 'main',
          path: `/jobs/${jobName}`
        })
      },
      inputs,
      outputs
    },
    inputs,
    outputs,
    producer: PRODUCER,
    schemaURL: 'https://openlineage.io/spec/1-0-0/OpenLineage.json#/$defs/RunEvent'
  }
}
