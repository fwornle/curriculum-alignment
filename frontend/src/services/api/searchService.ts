import { apiClient } from './apiClient'

// Generic types for search entities (avoiding import dependencies)
interface Program {
  id: string
  name: string
  description?: string
  type: string
  institution?: string
  tags?: string[]
}

interface Course {
  id: string
  name: string
  description?: string
  level: string
  credits?: number
  tags?: string[]
}

// Search types and interfaces
export interface SearchQuery {
  term: string
  entities?: SearchEntity[]
  filters?: SearchFilters
  sort?: SearchSort
  pagination?: SearchPagination
  fuzzy?: boolean
}

export type SearchEntity = 'programs' | 'courses' | 'documents' | 'reports' | 'analyses'

export interface SearchFilters {
  programType?: string[]
  courseLevel?: string[]
  dateRange?: {
    start: string
    end: string
  }
  tags?: string[]
  category?: string[]
  status?: string[]
  author?: string
  institution?: string
}

export interface SearchSort {
  field: 'relevance' | 'date' | 'title' | 'popularity'
  direction: 'asc' | 'desc'
}

export interface SearchPagination {
  page: number
  pageSize: number
}

export interface SearchResult<T = any> {
  id: string
  entity: SearchEntity
  title: string
  description?: string
  excerpt?: string
  score: number
  highlights?: string[]
  metadata: {
    createdAt: string
    updatedAt: string
    author?: string
    institution?: string
    tags?: string[]
    category?: string
  }
  data: T
}

export interface SearchResponse<T = any> {
  results: SearchResult<T>[]
  totalCount: number
  totalPages: number
  currentPage: number
  pageSize: number
  facets: SearchFacets
  suggestions?: string[]
  searchTime: number
}

export interface SearchFacets {
  entities: FacetCount[]
  programTypes?: FacetCount[]
  courseLevels?: FacetCount[]
  tags?: FacetCount[]
  categories?: FacetCount[]
  institutions?: FacetCount[]
  authors?: FacetCount[]
}

export interface FacetCount {
  value: string
  count: number
}

export interface SearchSuggestion {
  term: string
  type: 'autocomplete' | 'spelling' | 'synonym'
  score: number
}

class SearchService {
  private baseUrl = '/api/search'

  // Unified search across all entities
  async search(query: SearchQuery): Promise<SearchResponse> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/unified`, {
        ...query,
        fuzzy: query.fuzzy ?? true
      })
      
      return response.data as SearchResponse
    } catch (error: any) {
      console.error('Search failed:', error)
      throw new Error(error.response?.data?.message || 'Search failed')
    }
  }

  // Search specifically for programs
  async searchPrograms(
    term: string, 
    filters?: Pick<SearchFilters, 'programType' | 'dateRange' | 'tags' | 'institution'>,
    pagination?: SearchPagination
  ): Promise<SearchResponse<Program>> {
    const query: SearchQuery = {
      term,
      entities: ['programs'],
      filters,
      pagination: pagination || { page: 1, pageSize: 20 },
      sort: { field: 'relevance', direction: 'desc' }
    }

    return this.search(query) as Promise<SearchResponse<Program>>
  }

  // Search specifically for courses
  async searchCourses(
    term: string, 
    filters?: Pick<SearchFilters, 'courseLevel' | 'dateRange' | 'tags' | 'category'>,
    pagination?: SearchPagination
  ): Promise<SearchResponse<Course>> {
    const query: SearchQuery = {
      term,
      entities: ['courses'],
      filters,
      pagination: pagination || { page: 1, pageSize: 20 },
      sort: { field: 'relevance', direction: 'desc' }
    }

    return this.search(query) as Promise<SearchResponse<Course>>
  }

  // Search documents
  async searchDocuments(
    term: string,
    filters?: Pick<SearchFilters, 'category' | 'dateRange' | 'tags' | 'author'>,
    pagination?: SearchPagination
  ): Promise<SearchResponse> {
    const query: SearchQuery = {
      term,
      entities: ['documents'],
      filters,
      pagination: pagination || { page: 1, pageSize: 20 },
      sort: { field: 'relevance', direction: 'desc' }
    }

    return this.search(query)
  }

  // Search reports and analyses
  async searchReports(
    term: string,
    filters?: Pick<SearchFilters, 'dateRange' | 'tags' | 'author' | 'status'>,
    pagination?: SearchPagination
  ): Promise<SearchResponse> {
    const query: SearchQuery = {
      term,
      entities: ['reports', 'analyses'],
      filters,
      pagination: pagination || { page: 1, pageSize: 20 },
      sort: { field: 'date', direction: 'desc' }
    }

    return this.search(query)
  }

  // Get search suggestions (autocomplete)
  async getSuggestions(partialTerm: string, entity?: SearchEntity): Promise<SearchSuggestion[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/suggestions`, {
        term: partialTerm,
        entity,
        limit: 10
      })
      
      return response.data as SearchSuggestion[]
    } catch (error: any) {
      console.error('Failed to get suggestions:', error)
      return []
    }
  }

  // Get search facets (for filter options)
  async getFacets(entity?: SearchEntity): Promise<SearchFacets> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/facets`, { entity })
      return response.data as SearchFacets
    } catch (error: any) {
      console.error('Failed to get facets:', error)
      return {
        entities: [],
        programTypes: [],
        courseLevels: [],
        tags: [],
        categories: [],
        institutions: [],
        authors: []
      }
    }
  }

  // Advanced semantic search
  async semanticSearch(
    term: string,
    entities?: SearchEntity[],
    threshold?: number
  ): Promise<SearchResponse> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/semantic`, {
        term,
        entities: entities || ['programs', 'courses', 'documents'],
        threshold: threshold || 0.7,
        fuzzy: false // Semantic search doesn't need fuzzy matching
      })
      
      return response.data as SearchResponse
    } catch (error: any) {
      console.error('Semantic search failed:', error)
      throw new Error(error.response?.data?.message || 'Semantic search failed')
    }
  }

  // Search similar content
  async findSimilar(
    entityId: string,
    entity: SearchEntity,
    limit?: number
  ): Promise<SearchResult[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/similar/${entity}/${entityId}`, {
        limit: limit || 5
      })
      
      return response.data as SearchResult[]
    } catch (error: any) {
      console.error('Similar search failed:', error)
      return []
    }
  }

  // Recent searches (user history)
  async getRecentSearches(limit?: number): Promise<string[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/recent`, {
        limit: limit || 10
      })
      
      return response.data as string[]
    } catch (error: any) {
      console.error('Failed to get recent searches:', error)
      return []
    }
  }

  // Save search to history
  async saveSearch(term: string, entity?: SearchEntity): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/history`, {
        term,
        entity,
        timestamp: new Date().toISOString()
      })
    } catch (error: any) {
      console.warn('Failed to save search history:', error)
    }
  }

  // Clear search history
  async clearHistory(): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/history`)
    } catch (error: any) {
      console.error('Failed to clear search history:', error)
      throw new Error('Failed to clear search history')
    }
  }

  // Bulk search operations
  async bulkSearch(queries: SearchQuery[]): Promise<SearchResponse[]> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/bulk`, { queries })
      return response.data as SearchResponse[]
    } catch (error: any) {
      console.error('Bulk search failed:', error)
      throw new Error(error.response?.data?.message || 'Bulk search failed')
    }
  }

  // Search analytics
  async getSearchAnalytics(dateRange?: { start: string; end: string }): Promise<{
    topQueries: Array<{ term: string; count: number }>
    popularEntities: Array<{ entity: SearchEntity; count: number }>
    averageResults: number
    searchTrends: Array<{ date: string; count: number }>
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/analytics`, dateRange)
      return response.data as {
        topQueries: Array<{ term: string; count: number }>
        popularEntities: Array<{ entity: SearchEntity; count: number }>
        averageResults: number
        searchTrends: Array<{ date: string; count: number }>
      }
    } catch (error: any) {
      console.error('Failed to get search analytics:', error)
      return {
        topQueries: [],
        popularEntities: [],
        averageResults: 0,
        searchTrends: []
      } as {
        topQueries: Array<{ term: string; count: number }>
        popularEntities: Array<{ entity: SearchEntity; count: number }>
        averageResults: number
        searchTrends: Array<{ date: string; count: number }>
      }
    }
  }
}

// Export singleton instance
export const searchService = new SearchService()