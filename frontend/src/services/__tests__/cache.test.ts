import { Cache, cache, httpCache } from '../cache'

// Mock fetch for HTTP cache tests
global.fetch = jest.fn()

describe('Cache Service Integration Tests', () => {
  let testCache: Cache

  beforeEach(() => {
    testCache = new Cache({
      maxSize: 1024 * 1024, // 1MB for testing
      maxEntries: 100,
      defaultTTL: 5000, // 5 seconds
      enablePersistence: false, // Disable for testing
      gcInterval: 1000 // 1 second for testing
    })
    jest.clearAllMocks()
  })

  afterEach(() => {
    testCache.destroy()
  })

  describe('Basic Cache Operations', () => {
    test('should store and retrieve data correctly', async () => {
      const testData = { id: 1, name: 'Test Item' }
      
      testCache.set('test-key', testData)
      const retrieved = await testCache.get('test-key')
      
      expect(retrieved).toEqual(testData)
    })

    test('should return null for non-existent keys', async () => {
      const result = await testCache.get('non-existent-key')
      expect(result).toBeNull()
    })

    test('should handle TTL expiration', async () => {
      const testData = { id: 1, name: 'Test Item' }
      
      testCache.set('test-key', testData, { ttl: 100 }) // 100ms TTL
      
      // Should exist immediately
      let retrieved = await testCache.get('test-key')
      expect(retrieved).toEqual(testData)
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should be expired
      retrieved = await testCache.get('test-key')
      expect(retrieved).toBeNull()
    })

    test('should delete entries correctly', () => {
      testCache.set('test-key', { data: 'test' })
      expect(testCache.has('test-key')).toBe(true)
      
      const deleted = testCache.delete('test-key')
      expect(deleted).toBe(true)
      expect(testCache.has('test-key')).toBe(false)
    })

    test('should clear all entries', () => {
      testCache.set('key1', { data: 'test1' })
      testCache.set('key2', { data: 'test2' })
      
      expect(testCache.size()).toBe(2)
      
      testCache.clear()
      expect(testCache.size()).toBe(0)
    })
  })

  describe('Cache Strategies', () => {
    test('cache-first strategy should use cache when available', async () => {
      const mockFn = jest.fn().mockResolvedValue({ data: 'fresh' })
      
      // Prime the cache
      testCache.set('test-key', { data: 'cached' })
      
      const result = await testCache.request('test-key', mockFn, 'cache-first')
      
      expect(result).toEqual({ data: 'cached' })
      expect(mockFn).not.toHaveBeenCalled()
    })

    test('cache-first strategy should fallback to network when cache miss', async () => {
      const mockFn = jest.fn().mockResolvedValue({ data: 'fresh' })
      
      const result = await testCache.request('test-key', mockFn, 'cache-first')
      
      expect(result).toEqual({ data: 'fresh' })
      expect(mockFn).toHaveBeenCalledTimes(1)
      
      // Should be cached now
      const cached = await testCache.get('test-key')
      expect(cached).toEqual({ data: 'fresh' })
    })

    test('network-first strategy should try network first', async () => {
      const mockFn = jest.fn().mockResolvedValue({ data: 'fresh' })
      
      // Prime the cache
      testCache.set('test-key', { data: 'cached' })
      
      const result = await testCache.request('test-key', mockFn, 'network-first')
      
      expect(result).toEqual({ data: 'fresh' })
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    test('network-first strategy should fallback to cache on network error', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Network error'))
      
      // Prime the cache
      testCache.set('test-key', { data: 'cached' })
      
      const result = await testCache.request('test-key', mockFn, 'network-first')
      
      expect(result).toEqual({ data: 'cached' })
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    test('stale-while-revalidate should return cached data immediately', async () => {
      const mockFn = jest.fn().mockResolvedValue({ data: 'fresh' })
      
      // Prime the cache
      testCache.set('test-key', { data: 'cached' })
      
      const result = await testCache.request('test-key', mockFn, 'stale-while-revalidate')
      
      expect(result).toEqual({ data: 'cached' })
      
      // Should still call network for background update
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    test('network-only strategy should always call network', async () => {
      const mockFn = jest.fn().mockResolvedValue({ data: 'fresh' })
      
      // Prime the cache
      testCache.set('test-key', { data: 'cached' })
      
      const result = await testCache.request('test-key', mockFn, 'network-only')
      
      expect(result).toEqual({ data: 'fresh' })
      expect(mockFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Request Deduplication', () => {
    test('should deduplicate concurrent requests', async () => {
      const mockFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: 'result' }), 100))
      )
      
      // Start multiple concurrent requests
      const promises = [
        testCache.request('test-key', mockFn, 'network-only'),
        testCache.request('test-key', mockFn, 'network-only'),
        testCache.request('test-key', mockFn, 'network-only')
      ]
      
      const results = await Promise.all(promises)
      
      // All should return the same result
      expect(results).toEqual([
        { data: 'result' },
        { data: 'result' },
        { data: 'result' }
      ])
      
      // But function should only be called once
      expect(mockFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Cache Invalidation', () => {
    test('should invalidate by key', () => {
      testCache.set('key1', { data: 'test1' })
      testCache.set('key2', { data: 'test2' })
      
      const invalidated = testCache.invalidate('key1')
      
      expect(invalidated).toBe(1)
      expect(testCache.has('key1')).toBe(false)
      expect(testCache.has('key2')).toBe(true)
    })

    test('should invalidate by pattern', () => {
      testCache.set('user:1', { data: 'user1' })
      testCache.set('user:2', { data: 'user2' })
      testCache.set('post:1', { data: 'post1' })
      
      const invalidated = testCache.invalidate(/^user:/)
      
      expect(invalidated).toBe(2)
      expect(testCache.has('user:1')).toBe(false)
      expect(testCache.has('user:2')).toBe(false)
      expect(testCache.has('post:1')).toBe(true)
    })

    test('should invalidate by tags', () => {
      testCache.set('key1', { data: 'test1' }, { tags: ['users', 'active'] })
      testCache.set('key2', { data: 'test2' }, { tags: ['users', 'inactive'] })
      testCache.set('key3', { data: 'test3' }, { tags: ['posts'] })
      
      const invalidated = testCache.invalidateByTags(['users'])
      
      expect(invalidated).toBe(2)
      expect(testCache.has('key1')).toBe(false)
      expect(testCache.has('key2')).toBe(false)
      expect(testCache.has('key3')).toBe(true)
    })
  })

  describe('Cache Statistics', () => {
    test('should track hit and miss rates', async () => {
      // Create some cache hits and misses
      testCache.set('key1', { data: 'test1' })
      
      await testCache.get('key1') // hit
      await testCache.get('key2') // miss
      await testCache.get('key1') // hit
      await testCache.get('key3') // miss
      
      const stats = testCache.getStats()
      
      expect(stats.totalRequests).toBe(4)
      expect(stats.totalHits).toBe(2)
      expect(stats.totalMisses).toBe(2)
      expect(stats.hitRate).toBe(0.5)
      expect(stats.missRate).toBe(0.5)
    })

    test('should track cache size and entry count', () => {
      testCache.set('key1', { data: 'small' })
      testCache.set('key2', { data: 'larger data item' })
      
      const stats = testCache.getStats()
      
      expect(stats.entryCount).toBe(2)
      expect(stats.totalSize).toBeGreaterThan(0)
    })
  })

  describe('Cache Eviction', () => {
    test('should evict entries when size limit exceeded', () => {
      const smallCache = new Cache({
        maxSize: 100, // Very small for testing
        maxEntries: 10
      })
      
      // Fill with data that exceeds size limit
      const largeData = 'x'.repeat(50) // 50 bytes
      
      smallCache.set('key1', { data: largeData })
      smallCache.set('key2', { data: largeData })
      smallCache.set('key3', { data: largeData }) // Should trigger eviction
      
      expect(smallCache.size()).toBeLessThan(3)
      
      smallCache.destroy()
    })

    test('should evict entries when entry limit exceeded', () => {
      const smallCache = new Cache({
        maxEntries: 2,
        maxSize: 1024 * 1024
      })
      
      smallCache.set('key1', { data: 'test1' })
      smallCache.set('key2', { data: 'test2' })
      smallCache.set('key3', { data: 'test3' }) // Should trigger eviction
      
      expect(smallCache.size()).toBe(2)
      
      smallCache.destroy()
    })
  })

  describe('Garbage Collection', () => {
    test('should remove expired entries during GC', async () => {
      const shortTTL = 50 // 50ms
      
      testCache.set('key1', { data: 'test1' }, { ttl: shortTTL })
      testCache.set('key2', { data: 'test2' }, { ttl: shortTTL })
      
      expect(testCache.size()).toBe(2)
      
      // Wait for expiration + GC interval
      await new Promise(resolve => setTimeout(resolve, shortTTL + 1100))
      
      expect(testCache.size()).toBe(0)
    })
  })

  describe('HTTP Cache Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('should cache successful GET requests', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([
          ['etag', '"abc123"'],
          ['last-modified', 'Wed, 21 Oct 2015 07:28:00 GMT']
        ]),
        json: jest.fn().mockResolvedValue({ data: 'test' })
      }

      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await httpCache.get('/api/test')
      
      expect(result).toEqual({ data: 'test' })
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })
    })

    test('should handle 304 Not Modified responses', async () => {
      // First request - cache the response
      const mockResponse1 = {
        ok: true,
        status: 200,
        headers: new Map([['etag', '"abc123"']]),
        json: jest.fn().mockResolvedValue({ data: 'test' })
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse1)
      
      await httpCache.get('/api/test')
      
      // Second request - return 304
      const mockResponse2 = {
        ok: true,
        status: 304,
        headers: new Map([['etag', '"abc123"']])
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse2)
      
      const result = await httpCache.get('/api/test', { etag: '"abc123"' })
      
      expect(result).toEqual({ data: 'test' })
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'If-None-Match': '"abc123"'
        }
      })
    })

    test('should handle request errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      
      await expect(httpCache.get('/api/test')).rejects.toThrow('Network error')
    })

    test('should handle HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)
      
      await expect(httpCache.get('/api/test')).rejects.toThrow('HTTP 500: Internal Server Error')
    })

    test('should invalidate cache on mutations', () => {
      // Prime cache
      cache.set('GET:/api/users', { data: 'cached' })
      cache.set('GET:/api/users/1', { data: 'cached user' })
      
      expect(cache.has('GET:/api/users')).toBe(true)
      expect(cache.has('GET:/api/users/1')).toBe(true)
      
      // Perform mutation
      httpCache.mutate('/api/users/1', 'PUT')
      
      // Should invalidate related entries
      expect(cache.has('GET:/api/users')).toBe(false)
      expect(cache.has('GET:/api/users/1')).toBe(false)
    })
  })
})