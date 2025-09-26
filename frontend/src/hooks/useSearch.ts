import { useState, useCallback, useEffect, useMemo } from 'react'
import { 
  searchService, 
  type SearchQuery, 
  type SearchResult, 
  type SearchResponse, 
  type SearchFilters, 
  type SearchEntity, 
  type SearchSuggestion,
  type SearchFacets
} from '../services/api/searchService'

interface UseSearchOptions {
  debounceMs?: number
  autoSearch?: boolean
  saveToHistory?: boolean
  entity?: SearchEntity
}

interface SearchState {
  isLoading: boolean
  error: string | null
  results: SearchResult[]
  totalCount: number
  totalPages: number
  currentPage: number
  pageSize: number
  facets: SearchFacets | null
  suggestions: string[]
  searchTime: number
}

const initialState: SearchState = {
  isLoading: false,
  error: null,
  results: [],
  totalCount: 0,
  totalPages: 0,
  currentPage: 1,
  pageSize: 20,
  facets: null,
  suggestions: [],
  searchTime: 0
}

export function useSearch(options: UseSearchOptions = {}) {
  const { debounceMs = 300, autoSearch = false, saveToHistory = true, entity } = options
  
  const [searchState, setSearchState] = useState<SearchState>(initialState)
  const [query, setQuery] = useState<SearchQuery>({
    term: '',
    entities: entity ? [entity] : undefined,
    fuzzy: true,
    pagination: { page: 1, pageSize: 20 }
  })
  
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // Perform search
  const performSearch = useCallback(async (searchQuery: SearchQuery) => {
    if (!searchQuery.term.trim()) {
      setSearchState(initialState)
      return
    }

    setSearchState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await searchService.search(searchQuery)
      
      setSearchState({
        isLoading: false,
        error: null,
        results: response.results,
        totalCount: response.totalCount,
        totalPages: response.totalPages,
        currentPage: response.currentPage,
        pageSize: response.pageSize,
        facets: response.facets,
        suggestions: response.suggestions || [],
        searchTime: response.searchTime
      })

      // Save to history if enabled
      if (saveToHistory) {
        searchService.saveSearch(searchQuery.term, entity)
      }
    } catch (error: any) {
      setSearchState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Search failed'
      }))
    }
  }, [saveToHistory, entity])

  // Debounced search
  const search = useCallback((newQuery: Partial<SearchQuery>) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const updatedQuery = { ...query, ...newQuery }
    setQuery(updatedQuery)

    if (autoSearch) {
      const timer = setTimeout(() => {
        performSearch(updatedQuery)
      }, debounceMs)
      setDebounceTimer(timer)
    }
  }, [query, debounceTimer, performSearch, autoSearch, debounceMs])

  // Manual search trigger
  const searchNow = useCallback((searchQuery?: Partial<SearchQuery>) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      setDebounceTimer(null)
    }

    const finalQuery = searchQuery ? { ...query, ...searchQuery } : query
    performSearch(finalQuery)
  }, [query, debounceTimer, performSearch])

  // Update search term
  const setTerm = useCallback((term: string) => {
    search({ term })
  }, [search])

  // Update filters
  const setFilters = useCallback((filters: SearchFilters) => {
    search({ filters, pagination: { ...query.pagination!, page: 1 } })
  }, [search, query.pagination])

  // Change page
  const setPage = useCallback((page: number) => {
    search({ pagination: { ...query.pagination!, page } })
  }, [search, query.pagination])

  // Update page size
  const setPageSize = useCallback((pageSize: number) => {
    search({ 
      pagination: { page: 1, pageSize }
    })
  }, [search])

  // Clear search
  const clear = useCallback(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      setDebounceTimer(null)
    }
    setQuery({ ...query, term: '' })
    setSearchState(initialState)
  }, [query, debounceTimer])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  return {
    // State
    ...searchState,
    query,
    
    // Actions
    setTerm,
    setFilters,
    setPage,
    setPageSize,
    search: searchNow,
    clear,
    
    // Computed
    hasResults: searchState.results.length > 0,
    hasQuery: query.term.trim().length > 0,
    isEmpty: !searchState.isLoading && searchState.results.length === 0 && query.term.trim().length > 0
  }
}

export function useSearchSuggestions(term: string, entity?: SearchEntity) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const fetchSuggestions = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      const results = await searchService.getSuggestions(searchTerm, entity)
      setSuggestions(results)
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [entity])

  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const timer = setTimeout(() => {
      fetchSuggestions(term)
    }, 200)

    setDebounceTimer(timer)

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [term, fetchSuggestions])

  return {
    suggestions,
    isLoading
  }
}

export function useSearchFacets(entity?: SearchEntity) {
  const [facets, setFacets] = useState<SearchFacets | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchFacets = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await searchService.getFacets(entity)
      setFacets(result)
    } catch (error) {
      console.error('Failed to fetch facets:', error)
      setFacets(null)
    } finally {
      setIsLoading(false)
    }
  }, [entity])

  useEffect(() => {
    fetchFacets()
  }, [fetchFacets])

  return {
    facets,
    isLoading,
    refresh: fetchFacets
  }
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchRecent = useCallback(async () => {
    setIsLoading(true)
    try {
      const searches = await searchService.getRecentSearches()
      setRecentSearches(searches)
    } catch (error) {
      console.error('Failed to fetch recent searches:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearHistory = useCallback(async () => {
    try {
      await searchService.clearHistory()
      setRecentSearches([])
    } catch (error) {
      console.error('Failed to clear search history:', error)
    }
  }, [])

  useEffect(() => {
    fetchRecent()
  }, [fetchRecent])

  return {
    recentSearches,
    isLoading,
    refresh: fetchRecent,
    clearHistory
  }
}

export function useSimilarContent(entityId: string, entity: SearchEntity) {
  const [similarContent, setSimilarContent] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchSimilar = useCallback(async () => {
    if (!entityId) return

    setIsLoading(true)
    try {
      const results = await searchService.findSimilar(entityId, entity)
      setSimilarContent(results)
    } catch (error) {
      console.error('Failed to fetch similar content:', error)
      setSimilarContent([])
    } finally {
      setIsLoading(false)
    }
  }, [entityId, entity])

  useEffect(() => {
    fetchSimilar()
  }, [fetchSimilar])

  return {
    similarContent,
    isLoading,
    refresh: fetchSimilar
  }
}

// Specialized hooks for specific entities
export function useProgramSearch() {
  return useSearch({ entity: 'programs' })
}

export function useCourseSearch() {
  return useSearch({ entity: 'courses' })
}

export function useDocumentSearch() {
  return useSearch({ entity: 'documents' })
}

export function useReportSearch() {
  return useSearch({ entity: 'reports' })
}