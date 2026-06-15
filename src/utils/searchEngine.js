import Fuse from 'fuse.js'
import { datasets, teams, datasetTeamMapping, sensitivityLevels } from '../data/mockData'

class FullTextSearchEngine {
  constructor() {
    this.documents = []
    this.fuse = null
    this.invertedIndex = new Map()
    this.buildIndex()
  }

  buildIndex() {
    this.documents = Object.values(datasets).map(dataset => {
      const teamMapping = datasetTeamMapping[dataset.id] || {}
      const team = teams[teamMapping.teamId] || {}
      const sensitivity = sensitivityLevels[teamMapping.sensitivityLevel] || {}

      const fieldText = dataset.fields.map(f => `${f.name} ${f.description}`).join(' ')
      const tagText = dataset.tags.join(' ')

      this.indexTerms(dataset.name, dataset.id, 'name')
      this.indexTerms(dataset.description, dataset.id, 'description')
      this.indexTerms(tagText, dataset.id, 'tags')
      this.indexTerms(fieldText, dataset.id, 'fields')
      this.indexTerms(team.name || '', dataset.id, 'team')

      return {
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        tags: dataset.tags,
        fields: dataset.fields.map(f => ({ name: f.name, description: f.description })),
        teamName: team.name,
        teamId: teamMapping.teamId,
        sensitivityLevel: teamMapping.sensitivityLevel,
        sensitivityLabel: sensitivity.label,
        fieldText,
        owner: dataset.owner,
        storageLocation: dataset.storageLocation
      }
    })

    const options = {
      includeScore: true,
      includeMatches: true,
      threshold: 0.55,
      location: 0,
      distance: 200,
      maxPatternLength: 64,
      minMatchCharLength: 2,
      useExtendedSearch: true,
      keys: [
        {
          name: 'name',
          weight: 0.35
        },
        {
          name: 'description',
          weight: 0.2
        },
        {
          name: 'tags',
          weight: 0.2
        },
        {
          name: 'fieldText',
          weight: 0.15
        },
        {
          name: 'teamName',
          weight: 0.05
        },
        {
          name: 'owner',
          weight: 0.03
        },
        {
          name: 'storageLocation',
          weight: 0.02
        }
      ]
    }

    this.fuse = new Fuse(this.documents, options)
  }

  indexTerms(text, datasetId, field) {
    if (!text) return
    const terms = this.tokenize(text)
    terms.forEach(term => {
      const normalized = term.toLowerCase()
      if (!this.invertedIndex.has(normalized)) {
        this.invertedIndex.set(normalized, new Set())
      }
      const entry = this.invertedIndex.get(normalized)
      entry.add(`${datasetId}:${field}`)
    })
  }

  tokenize(text) {
    if (!text) return []
    return text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0)
  }

  search(query, options = {}) {
    if (!query || !query.trim()) {
      return {
        results: [],
        total: 0,
        suggestion: null
      }
    }

    const trimmedQuery = query.trim()
    const searchResults = this.fuse.search(trimmedQuery)

    const results = searchResults.map(result => {
      const originalDataset = datasets[result.item.id]
      const matchedFields = this.extractMatchedFields(originalDataset, result.matches, trimmedQuery)

      return {
        ...result,
        item: {
          ...originalDataset,
          teamName: result.item.teamName,
          teamId: result.item.teamId,
          sensitivityLevel: result.item.sensitivityLevel,
          sensitivityLabel: result.item.sensitivityLabel
        },
        matchedFields,
        highlightRanges: this.buildHighlightRanges(result.matches)
      }
    })

    const filteredResults = options.filterFn
      ? results.filter(r => options.filterFn(r.item))
      : results

    const suggestion = this.generateSuggestion(trimmedQuery)

    return {
      results: filteredResults,
      total: filteredResults.length,
      suggestion,
      query: trimmedQuery
    }
  }

  extractMatchedFields(dataset, matches, query) {
    if (!matches || matches.length === 0) return null

    const keyword = query.toLowerCase()
    const fieldMatch = matches.find(m => m.key === 'fieldText')

    if (fieldMatch) {
      return dataset.fields.filter(
        f => f.name.toLowerCase().includes(keyword) ||
          f.description.toLowerCase().includes(keyword)
      )
    }
    return null
  }

  buildHighlightRanges(matches) {
    if (!matches || matches.length === 0) return {}

    const ranges = {}
    matches.forEach(match => {
      if (match.key && match.indices && match.indices.length > 0) {
        ranges[match.key] = match.indices.map(([start, end]) => ({ start, end }))
      }
    })
    return ranges
  }

  generateSuggestion(query) {
    const terms = this.tokenize(query)
    if (terms.length === 0) return null

    const suggestions = []
    terms.forEach(term => {
      if (term.length < 3) return

      let closest = null
      let minDistance = Infinity

      for (const indexedTerm of this.invertedIndex.keys()) {
        if (Math.abs(indexedTerm.length - term.length) > 3) continue
        const distance = this.levenshteinDistance(term, indexedTerm)
        if (distance > 0 && distance <= 2 && distance < minDistance) {
          minDistance = distance
          closest = indexedTerm
        }
      }

      if (closest && closest !== term) {
        suggestions.push({ original: term, suggestion: closest, distance: minDistance })
      }
    })

    if (suggestions.length === 0) return null

    let corrected = query
    suggestions.forEach(s => {
      const regex = new RegExp(s.original, 'gi')
      corrected = corrected.replace(regex, s.suggestion)
    })

    return corrected !== query ? corrected : null
  }

  levenshteinDistance(a, b) {
    const matrix = []
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    return matrix[b.length][a.length]
  }

  getRelatedDatasets(datasetId, options = {}) {
    const { limit = 5, minMatch = 2 } = options
    const target = datasets[datasetId]
    if (!target) return []

    const targetTerms = new Set([
      ...this.tokenize(target.name),
      ...this.tokenize(target.description),
      ...target.tags.map(t => t.toLowerCase())
    ])

    const scored = Object.values(datasets)
      .filter(d => d.id !== datasetId)
      .map(d => {
        const terms = new Set([
          ...this.tokenize(d.name),
          ...this.tokenize(d.description),
          ...d.tags.map(t => t.toLowerCase())
        ])
        let matchCount = 0
        targetTerms.forEach(t => {
          if (terms.has(t)) matchCount++
        })
        return {
          dataset: d,
          score: matchCount,
          matchingTags: d.tags.filter(t => target.tags.includes(t))
        }
      })
      .filter(s => s.score >= minMatch)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return scored
  }

  searchByTag(tag) {
    const normalizedTag = tag.toLowerCase()
    return this.documents
      .filter(doc => doc.tags.some(t => t.toLowerCase() === normalizedTag))
      .map(doc => ({ item: doc, score: 0, matches: [] }))
  }

  searchByTeam(teamId) {
    return this.documents
      .filter(doc => doc.teamId === teamId)
      .map(doc => ({ item: doc, score: 0, matches: [] }))
  }

  getAllTags() {
    const tagSet = new Set()
    Object.values(datasets).forEach(d => d.tags.forEach(t => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }

  getIndexStats() {
    return {
      totalDocuments: this.documents.length,
      totalTerms: this.invertedIndex.size,
      totalTags: this.getAllTags().length,
      avgFieldsPerDocument: Math.round(
        this.documents.reduce((sum, d) => sum + (d.fields?.length || 0), 0) / this.documents.length
      )
    }
  }
}

export const searchEngine = new FullTextSearchEngine()

export function highlightText(text, query) {
  if (!text || !query || !query.trim()) return text
  const terms = query.trim().split(/\s+/).filter(t => t.length > 0)
  if (terms.length === 0) return text

  let result = text
  terms.forEach(term => {
    const regex = new RegExp(
      `(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    )
    result = result.replace(regex, '<mark class="search-highlight">$1</mark>')
  })
  return result
}
