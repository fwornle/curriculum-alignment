import { llmService } from '../../src/services/llm-config.service';
import { logger } from '../../src/services/logging.service';

export interface VectorSearchResult {
  results: SearchResult[];
  queryInfo: QueryInfo;
}

export interface SearchResult {
  id: string;
  type: 'course' | 'program' | 'curriculum' | 'document' | 'university';
  title: string;
  content: string;
  summary?: string;
  score: number;
  similarity?: number;
  metadata: ResultMetadata;
  highlights?: Highlight[];
  relatedResults?: RelatedResult[];
}

export interface ResultMetadata {
  university: string;
  program?: string;
  course?: string;
  documentType: string;
  language: string;
  lastUpdated: string;
  credits?: number;
  level?: string;
  prerequisites?: string[];
  subjects?: string[];
  tags?: string[];
  url?: string;
  source: string;
}

export interface Highlight {
  field: string;
  text: string;
  startOffset: number;
  endOffset: number;
}

export interface RelatedResult {
  id: string;
  title: string;
  type: string;
  similarity: number;
}

export interface QueryInfo {
  originalQuery: string;
  expandedQuery?: string;
  embedding?: number[];
  searchStrategy: string;
  filtersApplied: string[];
  searchTime: number;
}

export interface SearchFilters {
  documentTypes?: string[];
  universities?: string[];
  programs?: string[];
  courses?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  languages?: string[];
  creditRange?: {
    min: number;
    max: number;
  };
  levels?: string[];
  subjects?: string[];
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  threshold?: number;
  includeMetadata?: boolean;
  includeContent?: boolean;
  includeSimilarity?: boolean;
  expandQuery?: boolean;
  rerank?: boolean;
  groupResults?: boolean;
}

export interface VectorDocument {
  id: string;
  title: string;
  content: string;
  type: string;
  university: string;
  language: string;
  metadata?: any;
  embedding?: number[];
}

export class VectorEngine {
  private indexConfig: any;
  private modelConfig: any;
  private mockData: VectorDocument[];

  constructor(indexConfig?: any, modelConfig?: any) {
    this.indexConfig = indexConfig || {
      collection: 'curricula',
      embeddingModel: 'text-embedding-ada-002',
      dimensions: 1536
    };
    
    this.modelConfig = modelConfig || {
      provider: 'openai',
      model: 'text-embedding-ada-002',
      temperature: 0.0,
      maxTokens: 8191
    };

    this.mockData = this.initializeMockData();
  }

  async semanticSearch(
    query: string,
    filters?: SearchFilters,
    options?: SearchOptions
  ): Promise<VectorSearchResult> {
    const startTime = Date.now();

    try {
      logger.info('Performing semantic search', {
        query,
        collection: this.indexConfig.collection,
        filters: filters ? Object.keys(filters) : []
      });

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Expand query if requested
      let expandedQuery = query;
      if (options?.expandQuery) {
        expandedQuery = await this.expandQuery(query);
      }

      // Search in vector database
      let candidates = await this.searchVectorDatabase(queryEmbedding, filters, options);
      
      // Apply text-based filtering for better relevance
      candidates = this.applyTextFiltering(candidates, expandedQuery || query);
      
      // Score and rank results
      const scoredResults = this.scoreResults(candidates, queryEmbedding, query);
      
      // Apply threshold
      const threshold = options?.threshold || 0.5;
      const filteredResults = scoredResults.filter(result => result.score >= threshold);
      
      // Limit results
      const limit = options?.limit || 20;
      const offset = options?.offset || 0;
      const paginatedResults = filteredResults.slice(offset, offset + limit);
      
      // Add highlights if content is included
      if (options?.includeContent !== false) {
        for (const result of paginatedResults) {
          result.highlights = this.generateHighlights(result.content, query);
        }
      }
      
      // Add related results
      for (const result of paginatedResults) {
        result.relatedResults = await this.findRelatedResults(result.id, 3);
      }

      const searchTime = Date.now() - startTime;
      
      const queryInfo: QueryInfo = {
        originalQuery: query,
        expandedQuery: expandedQuery !== query ? expandedQuery : undefined,
        embedding: options?.includeSimilarity ? queryEmbedding.slice(0, 5) : undefined, // Only first 5 dimensions for brevity
        searchStrategy: 'semantic_vector',
        filtersApplied: this.getAppliedFilters(filters),
        searchTime
      };

      logger.info('Semantic search completed', {
        query,
        resultCount: paginatedResults.length,
        searchTime,
        threshold
      });

      return {
        results: paginatedResults,
        queryInfo
      };

    } catch (error) {
      logger.error('Semantic search failed', {
        query,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async textSearch(
    query: string,
    filters?: SearchFilters,
    options?: SearchOptions
  ): Promise<VectorSearchResult> {
    const startTime = Date.now();

    try {
      logger.info('Performing text search', { query });

      // Perform keyword-based search
      let results = this.performKeywordSearch(query, this.mockData);
      
      // Apply filters
      results = this.applyFilters(results, filters);
      
      // Score based on text relevance
      const scoredResults = this.scoreTextResults(results, query);
      
      // Apply pagination
      const limit = options?.limit || 20;
      const offset = options?.offset || 0;
      const paginatedResults = scoredResults.slice(offset, offset + limit);
      
      // Add highlights
      for (const result of paginatedResults) {
        result.highlights = this.generateHighlights(result.content, query);
      }

      const searchTime = Date.now() - startTime;
      
      const queryInfo: QueryInfo = {
        originalQuery: query,
        searchStrategy: 'text_keyword',
        filtersApplied: this.getAppliedFilters(filters),
        searchTime
      };

      return {
        results: paginatedResults,
        queryInfo
      };

    } catch (error) {
      logger.error('Text search failed', {
        query,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async hybridSearch(
    query: string,
    filters?: SearchFilters,
    options?: SearchOptions
  ): Promise<VectorSearchResult> {
    const startTime = Date.now();

    try {
      logger.info('Performing hybrid search', { query });

      // Perform both semantic and text search
      const semanticResults = await this.semanticSearch(query, filters, { ...options, limit: 50 });
      const textResults = await this.textSearch(query, filters, { ...options, limit: 50 });
      
      // Combine and rerank results
      const combinedResults = this.combineSearchResults(
        semanticResults.results,
        textResults.results,
        query
      );
      
      // Apply final pagination
      const limit = options?.limit || 20;
      const offset = options?.offset || 0;
      const paginatedResults = combinedResults.slice(offset, offset + limit);

      const searchTime = Date.now() - startTime;
      
      const queryInfo: QueryInfo = {
        originalQuery: query,
        searchStrategy: 'hybrid_semantic_text',
        filtersApplied: this.getAppliedFilters(filters),
        searchTime
      };

      return {
        results: paginatedResults,
        queryInfo
      };

    } catch (error) {
      logger.error('Hybrid search failed', {
        query,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async findSimilar(documentId: string, options?: SearchOptions): Promise<SearchResult[]> {
    try {
      logger.info('Finding similar documents', { documentId });

      // Find the source document
      const sourceDoc = this.mockData.find(doc => doc.id === documentId);
      if (!sourceDoc) {
        throw new Error(`Document ${documentId} not found`);
      }

      // Generate embedding for source document if not available
      const sourceEmbedding = sourceDoc.embedding || await this.generateEmbedding(sourceDoc.content);
      
      // Find similar documents
      const candidates = this.mockData.filter(doc => doc.id !== documentId);
      const similarResults: SearchResult[] = [];

      for (const candidate of candidates) {
        const candidateEmbedding = candidate.embedding || await this.generateEmbedding(candidate.content);
        const similarity = this.calculateCosineSimilarity(sourceEmbedding, candidateEmbedding);
        
        if (similarity > 0.7) { // Similarity threshold
          similarResults.push({
            id: candidate.id,
            type: candidate.type as any,
            title: candidate.title,
            content: candidate.content,
            score: similarity,
            similarity,
            metadata: {
              university: candidate.university,
              documentType: candidate.type,
              language: candidate.language,
              lastUpdated: new Date().toISOString(),
              source: 'similarity_search'
            }
          });
        }
      }

      // Sort by similarity and limit
      const limit = options?.limit || 10;
      return similarResults
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, limit);

    } catch (error) {
      logger.error('Find similar failed', {
        documentId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  async indexDocument(document: VectorDocument): Promise<VectorDocument> {
    try {
      logger.info('Indexing document', { documentId: document.id });

      // Generate embedding
      const embedding = await this.generateEmbedding(document.content);
      
      // Add to mock data
      const indexedDoc = {
        ...document,
        embedding
      };
      
      // Remove existing document if it exists
      this.mockData = this.mockData.filter(doc => doc.id !== document.id);
      this.mockData.push(indexedDoc);

      logger.info('Document indexed successfully', { documentId: document.id });
      return indexedDoc;

    } catch (error) {
      logger.error('Document indexing failed', {
        documentId: document.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getDocument(documentId: string): Promise<SearchResult | null> {
    const doc = this.mockData.find(d => d.id === documentId);
    if (!doc) return null;

    return {
      id: doc.id,
      type: doc.type as any,
      title: doc.title,
      content: doc.content,
      score: 1.0,
      metadata: {
        university: doc.university,
        documentType: doc.type,
        language: doc.language,
        lastUpdated: new Date().toISOString(),
        source: 'direct_retrieval'
      }
    };
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    const initialLength = this.mockData.length;
    this.mockData = this.mockData.filter(doc => doc.id !== documentId);
    return this.mockData.length < initialLength;
  }

  async deleteCollection(collection: string): Promise<boolean> {
    // Mock implementation - in production would delete from Qdrant
    logger.info('Deleting collection', { collection });
    return true;
  }

  async getSuggestions(partial: string, limit: number = 10): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Generate suggestions based on existing documents
    const terms = new Set<string>();
    
    for (const doc of this.mockData) {
      const words = doc.title.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.startsWith(partial.toLowerCase()) && word.length > partial.length) {
          terms.add(word);
        }
      }
    }
    
    // Add common academic terms
    const commonTerms = [
      'computer science', 'machine learning', 'artificial intelligence',
      'data science', 'software engineering', 'database systems',
      'algorithms', 'programming', 'mathematics', 'statistics'
    ];
    
    for (const term of commonTerms) {
      if (term.startsWith(partial.toLowerCase())) {
        terms.add(term);
      }
    }
    
    return Array.from(terms).slice(0, limit);
  }

  async rerankResults(results: SearchResult[], query: string): Promise<SearchResult[]> {
    // Simple reranking based on query term frequency in title
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    return results.map(result => {
      let bonus = 0;
      const titleLower = result.title.toLowerCase();
      
      for (const term of queryTerms) {
        if (titleLower.includes(term)) {
          bonus += 0.1;
        }
      }
      
      return {
        ...result,
        score: Math.min(1.0, result.score + bonus)
      };
    }).sort((a, b) => b.score - a.score);
  }

  groupResults(results: SearchResult[]): SearchResult[] {
    // Group by university and take top result from each
    const grouped = new Map<string, SearchResult>();
    
    for (const result of results) {
      const key = result.metadata.university;
      if (!grouped.has(key) || (grouped.get(key)?.score || 0) < result.score) {
        grouped.set(key, result);
      }
    }
    
    return Array.from(grouped.values()).sort((a, b) => b.score - a.score);
  }

  async healthCheck(): Promise<void> {
    try {
      // Test embedding generation
      const testEmbedding = await this.generateEmbedding('test');
      if (!testEmbedding || testEmbedding.length === 0) {
        throw new Error('Embedding generation failed');
      }

      // Test mock data
      if (this.mockData.length === 0) {
        throw new Error('No mock data available');
      }

      // Test search functionality
      const testSearch = await this.textSearch('computer science', {}, { limit: 1 });
      if (!testSearch.results) {
        throw new Error('Search functionality not working');
      }

      logger.info('Vector engine health check passed');
    } catch (error) {
      throw new Error(`Vector engine health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Mock embedding generation - in production use actual embedding service
      if (this.modelConfig.provider === 'openai') {
        // Simulate OpenAI embedding API call
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate API delay
      }
      
      // Generate mock embedding with specified dimensions
      const dimensions = this.indexConfig.dimensions || 1536;
      const embedding = Array(dimensions).fill(0).map(() => Math.random() * 2 - 1); // Values between -1 and 1
      
      // Normalize the embedding
      const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map(val => val / norm);
      
    } catch (error) {
      logger.error('Embedding generation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async expandQuery(query: string): Promise<string> {
    try {
      // Use LLM to expand the query with related terms
      const prompt = `Expand this search query with related academic terms: "${query}". 
      Return only the expanded query, no explanation.`;
      
      const expanded = await llmService.generateCompletion(
        this.modelConfig.provider,
        this.modelConfig.model,
        prompt,
        { temperature: 0.3, maxTokens: 100 }
      );
      
      return expanded.trim() || query;
    } catch (error) {
      logger.warn('Query expansion failed', { query, error: error instanceof Error ? error.message : String(error) });
      return query;
    }
  }

  private async searchVectorDatabase(
    queryEmbedding: number[],
    filters?: SearchFilters,
    options?: SearchOptions
  ): Promise<VectorDocument[]> {
    // Mock vector database search using cosine similarity
    const candidates: Array<VectorDocument & { similarity: number }> = [];
    
    for (const doc of this.mockData) {
      // Generate embedding if not available
      if (!doc.embedding) {
        doc.embedding = await this.generateEmbedding(doc.content);
      }
      
      const similarity = this.calculateCosineSimilarity(queryEmbedding, doc.embedding);
      candidates.push({ ...doc, similarity });
    }
    
    // Sort by similarity
    candidates.sort((a, b) => b.similarity - a.similarity);
    
    // Apply filters
    let filtered = this.applyFilters(candidates, filters);
    
    // Return top candidates
    const limit = Math.min(options?.limit || 50, 100);
    return filtered.slice(0, limit);
  }

  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private applyTextFiltering(candidates: VectorDocument[], query: string): VectorDocument[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    return candidates.filter(doc => {
      const content = (doc.title + ' ' + doc.content).toLowerCase();
      return queryTerms.some(term => content.includes(term));
    });
  }

  private scoreResults(candidates: VectorDocument[], queryEmbedding: number[], query: string): SearchResult[] {
    return candidates.map(doc => {
      // Combine vector similarity with text relevance
      const vectorScore = doc.embedding ? 
        this.calculateCosineSimilarity(queryEmbedding, doc.embedding) : 0;
      
      const textScore = this.calculateTextRelevance(doc, query);
      
      // Weighted combination
      const finalScore = (vectorScore * 0.7) + (textScore * 0.3);
      
      return {
        id: doc.id,
        type: doc.type as any,
        title: doc.title,
        content: doc.content,
        score: finalScore,
        similarity: vectorScore,
        metadata: {
          university: doc.university,
          documentType: doc.type,
          language: doc.language,
          lastUpdated: new Date().toISOString(),
          source: 'vector_search'
        }
      };
    });
  }

  private calculateTextRelevance(doc: VectorDocument, query: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const content = (doc.title + ' ' + doc.content).toLowerCase();
    
    let matches = 0;
    let titleMatches = 0;
    
    for (const term of queryTerms) {
      if (content.includes(term)) matches++;
      if (doc.title.toLowerCase().includes(term)) titleMatches++;
    }
    
    const termScore = matches / queryTerms.length;
    const titleBonus = titleMatches * 0.2;
    
    return Math.min(1.0, termScore + titleBonus);
  }

  private performKeywordSearch(query: string, documents: VectorDocument[]): VectorDocument[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    return documents.filter(doc => {
      const content = (doc.title + ' ' + doc.content).toLowerCase();
      return queryTerms.some(term => content.includes(term));
    });
  }

  private scoreTextResults(results: VectorDocument[], query: string): SearchResult[] {
    return results.map(doc => ({
      id: doc.id,
      type: doc.type as any,
      title: doc.title,
      content: doc.content,
      score: this.calculateTextRelevance(doc, query),
      metadata: {
        university: doc.university,
        documentType: doc.type,
        language: doc.language,
        lastUpdated: new Date().toISOString(),
        source: 'text_search'
      }
    })).sort((a, b) => b.score - a.score);
  }

  private combineSearchResults(
    semanticResults: SearchResult[],
    textResults: SearchResult[],
    query: string
  ): SearchResult[] {
    const combined = new Map<string, SearchResult>();
    
    // Add semantic results with higher weight
    for (const result of semanticResults) {
      combined.set(result.id, {
        ...result,
        score: result.score * 0.8 // Slight preference for semantic
      });
    }
    
    // Merge text results
    for (const result of textResults) {
      if (combined.has(result.id)) {
        // Combine scores
        const existing = combined.get(result.id)!;
        existing.score = (existing.score + result.score * 0.6) / 2;
      } else {
        combined.set(result.id, {
          ...result,
          score: result.score * 0.6
        });
      }
    }
    
    return Array.from(combined.values()).sort((a, b) => b.score - a.score);
  }

  private applyFilters(results: VectorDocument[], filters?: SearchFilters): VectorDocument[] {
    if (!filters) return results;
    
    return results.filter(doc => {
      // University filter
      if (filters.universities && !filters.universities.includes(doc.university)) {
        return false;
      }
      
      // Document type filter
      if (filters.documentTypes && !filters.documentTypes.includes(doc.type)) {
        return false;
      }
      
      // Language filter
      if (filters.languages && !filters.languages.includes(doc.language)) {
        return false;
      }
      
      // Add more filter logic as needed
      
      return true;
    });
  }

  private generateHighlights(content: string, query: string): Highlight[] {
    const highlights: Highlight[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    for (const term of queryTerms) {
      let startIndex = 0;
      while ((startIndex = contentLower.indexOf(term, startIndex)) !== -1) {
        highlights.push({
          field: 'content',
          text: content.substring(startIndex, startIndex + term.length),
          startOffset: startIndex,
          endOffset: startIndex + term.length
        });
        startIndex += term.length;
      }
    }
    
    return highlights;
  }

  private async findRelatedResults(documentId: string, limit: number): Promise<RelatedResult[]> {
    // Simple implementation - find documents from same university
    const sourceDoc = this.mockData.find(doc => doc.id === documentId);
    if (!sourceDoc) return [];
    
    const related = this.mockData
      .filter(doc => doc.id !== documentId && doc.university === sourceDoc.university)
      .slice(0, limit);
    
    return related.map(doc => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      similarity: 0.8 // Mock similarity
    }));
  }

  private getAppliedFilters(filters?: SearchFilters): string[] {
    if (!filters) return [];
    
    const applied: string[] = [];
    if (filters.universities) applied.push('universities');
    if (filters.documentTypes) applied.push('documentTypes');
    if (filters.languages) applied.push('languages');
    if (filters.dateRange) applied.push('dateRange');
    if (filters.creditRange) applied.push('creditRange');
    if (filters.levels) applied.push('levels');
    if (filters.subjects) applied.push('subjects');
    
    return applied;
  }

  private initializeMockData(): VectorDocument[] {
    return [
      {
        id: 'cs101_ceu',
        title: 'Introduction to Computer Science',
        content: 'Fundamental concepts of computer science including programming, algorithms, and data structures. Students will learn problem-solving techniques and basic programming in Python.',
        type: 'course',
        university: 'Central European University',
        language: 'en'
      },
      {
        id: 'cs102_ceu',
        title: 'Data Structures and Algorithms',
        content: 'Advanced study of data structures including trees, graphs, and hash tables. Algorithm analysis and design patterns. Implementation in Java.',
        type: 'course',
        university: 'Central European University',
        language: 'en'
      },
      {
        id: 'ml201_ceu',
        title: 'Machine Learning Fundamentals',
        content: 'Introduction to machine learning concepts, supervised and unsupervised learning, neural networks, and deep learning applications.',
        type: 'course',
        university: 'Central European University',
        language: 'en'
      },
      {
        id: 'db301_ceu',
        title: 'Database Systems',
        content: 'Relational database design, SQL, transaction processing, and distributed databases. Hands-on experience with PostgreSQL and MongoDB.',
        type: 'course',
        university: 'Central European University',
        language: 'en'
      },
      {
        id: 'cs_program_ceu',
        title: 'Computer Science Bachelor Program',
        content: 'Comprehensive 4-year program covering all aspects of computer science from theoretical foundations to practical applications. Includes internships and capstone project.',
        type: 'program',
        university: 'Central European University',
        language: 'en'
      },
      {
        id: 'ai_ms_ceu',
        title: 'Artificial Intelligence Master Program',
        content: 'Advanced 2-year program focusing on AI technologies, machine learning, natural language processing, and computer vision.',
        type: 'program',
        university: 'Central European University',
        language: 'en'
      },
      {
        id: 'math101_bme',
        title: 'Calculus I',
        content: 'Differential and integral calculus, limits, continuity, and applications to physical problems.',
        type: 'course',
        university: 'Budapest University of Technology',
        language: 'en'
      },
      {
        id: 'physics201_bme',
        title: 'General Physics',
        content: 'Classical mechanics, thermodynamics, and electromagnetism with laboratory experiments.',
        type: 'course',
        university: 'Budapest University of Technology',
        language: 'en'
      },
      {
        id: 'eng_program_bme',
        title: 'Engineering Physics Program',
        content: 'Interdisciplinary program combining physics, mathematics, and engineering principles.',
        type: 'program',
        university: 'Budapest University of Technology',
        language: 'en'
      },
      {
        id: 'stats301_elte',
        title: 'Statistical Analysis',
        content: 'Descriptive and inferential statistics, hypothesis testing, regression analysis, and statistical software usage.',
        type: 'course',
        university: 'Eötvös Loránd University',
        language: 'en'
      }
    ];
  }
}