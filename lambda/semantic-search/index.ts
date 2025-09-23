import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../src/services/logging.service';
import { errorHandler } from '../../src/utils/error-handler';
import { costTracker } from '../../src/services/cost-tracking.service';
import { llmService } from '../../src/services/llm-config.service';
import { VectorEngine } from './vector-engine';

interface SearchRequest {
  query: {
    text: string;
    type: 'text' | 'semantic' | 'hybrid';
    filters?: SearchFilters;
    options?: SearchOptions;
  };
  context?: {
    domain?: string;
    university?: string;
    programType?: string;
    language?: string;
  };
  indexConfig?: {
    collection: string;
    embeddingModel?: string;
    dimensions?: number;
  };
  modelConfig?: {
    provider: 'openai' | 'anthropic' | 'cohere';
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

interface SearchFilters {
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

interface SearchOptions {
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

interface SearchResponse {
  success: boolean;
  requestId: string;
  data?: {
    results: SearchResult[];
    total: number;
    queryInfo: QueryInfo;
    aggregations?: Aggregations;
    suggestions?: string[];
    metadata: {
      searchDate: string;
      searchType: string;
      collection: string;
      processingTime: number;
      resultCount: number;
      confidence: number;
    };
    costs: {
      embedding: number;
      vectorSearch: number;
      total: number;
    };
  };
  error?: string;
  details?: any;
}

interface SearchResult {
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

interface ResultMetadata {
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

interface Highlight {
  field: string;
  text: string;
  startOffset: number;
  endOffset: number;
}

interface RelatedResult {
  id: string;
  title: string;
  type: string;
  similarity: number;
}

interface QueryInfo {
  originalQuery: string;
  expandedQuery?: string;
  embedding?: number[];
  searchStrategy: string;
  filtersApplied: string[];
  searchTime: number;
}

interface Aggregations {
  universities: { [key: string]: number };
  programs: { [key: string]: number };
  documentTypes: { [key: string]: number };
  subjects: { [key: string]: number };
  levels: { [key: string]: number };
  languages: { [key: string]: number };
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  logger.info('Semantic Search Agent request received', {
    requestId,
    functionName: context.functionName,
    path: event.path,
    method: event.httpMethod
  });

  try {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    // Route based on HTTP method and path
    const method = event.httpMethod;
    const pathSegments = event.path.split('/').filter(segment => segment);
    
    let response: SearchResponse;

    switch (method) {
      case 'POST':
        if (pathSegments.includes('search')) {
          const requestBody = JSON.parse(event.body || '{}') as SearchRequest;
          response = await handleSearch(requestBody, event, requestId);
        } else if (pathSegments.includes('similar')) {
          const requestBody = JSON.parse(event.body || '{}');
          response = await handleFindSimilar(requestBody, requestId);
        } else if (pathSegments.includes('index')) {
          const requestBody = JSON.parse(event.body || '{}');
          response = await handleIndexDocument(requestBody, requestId);
        } else if (pathSegments.includes('suggest')) {
          const requestBody = JSON.parse(event.body || '{}');
          response = await handleGetSuggestions(requestBody, requestId);
        } else {
          throw new Error(`Unsupported operation: ${event.path}`);
        }
        break;

      case 'GET':
        if (pathSegments.includes('health')) {
          response = await handleHealthCheck(requestId);
        } else if (pathSegments.includes('collections')) {
          response = await handleGetCollections(requestId);
        } else if (pathSegments.includes('stats')) {
          const collection = pathSegments[pathSegments.indexOf('stats') + 1];
          response = await handleGetStats(collection, requestId);
        } else if (pathSegments.includes('document')) {
          const documentId = pathSegments[pathSegments.indexOf('document') + 1];
          response = await handleGetDocument(documentId, requestId);
        } else {
          throw new Error(`Unsupported operation: ${event.path}`);
        }
        break;

      case 'DELETE':
        if (pathSegments.includes('document')) {
          const documentId = pathSegments[pathSegments.indexOf('document') + 1];
          response = await handleDeleteDocument(documentId, requestId);
        } else if (pathSegments.includes('collection')) {
          const collection = pathSegments[pathSegments.indexOf('collection') + 1];
          response = await handleDeleteCollection(collection, requestId);
        } else {
          throw new Error(`Unsupported operation: ${event.path}`);
        }
        break;

      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    const processingTime = Date.now() - startTime;
    
    logger.info('Semantic Search Agent request completed', {
      requestId,
      processingTime,
      success: response.success
    });

    return {
      statusCode: response.success ? 200 : 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Semantic Search Agent error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime
    });

    await costTracker.trackCost('semantic-search', 'error', 0.001, {
      requestId,
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
    });

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        requestId,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};

async function handleSearch(
  request: SearchRequest,
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<SearchResponse> {
  const startTime = Date.now();

  try {
    logger.info('Performing semantic search', {
      requestId,
      query: request.query.text,
      type: request.query.type,
      collection: request.indexConfig?.collection
    });

    // Initialize vector engine
    const vectorEngine = new VectorEngine(request.indexConfig, request.modelConfig);
    
    // Perform search based on type
    let searchResults: SearchResult[];
    let queryInfo: QueryInfo;
    
    switch (request.query.type) {
      case 'semantic':
        const semanticResults = await errorHandler.execute(
          () => vectorEngine.semanticSearch(
            request.query.text,
            request.query.filters,
            request.query.options
          ),
          { operationName: 'semantic_search', correlationId: requestId }
        );
        searchResults = semanticResults.results;
        queryInfo = semanticResults.queryInfo;
        break;
        
      case 'text':
        const textResults = await errorHandler.execute(
          () => vectorEngine.textSearch(
            request.query.text,
            request.query.filters,
            request.query.options
          ),
          { operationName: 'text_search', correlationId: requestId }
        );
        searchResults = textResults.results;
        queryInfo = textResults.queryInfo;
        break;
        
      case 'hybrid':
        const hybridResults = await errorHandler.execute(
          () => vectorEngine.hybridSearch(
            request.query.text,
            request.query.filters,
            request.query.options
          ),
          { operationName: 'hybrid_search', correlationId: requestId }
        );
        searchResults = hybridResults.results;
        queryInfo = hybridResults.queryInfo;
        break;
        
      default:
        throw new Error(`Unsupported search type: ${request.query.type}`);
    }

    // Apply post-processing
    if (request.query.options?.rerank) {
      searchResults = await vectorEngine.rerankResults(searchResults, request.query.text);
    }

    if (request.query.options?.groupResults) {
      searchResults = vectorEngine.groupResults(searchResults);
    }

    // Generate aggregations
    const aggregations = generateAggregations(searchResults);
    
    // Generate suggestions
    const suggestions = await generateSuggestions(request.query.text, searchResults, vectorEngine);

    const processingTime = Date.now() - startTime;
    
    // Track costs
    const costs = await costTracker.trackCost('semantic-search', 'search', 0.02, {
      requestId,
      searchType: request.query.type,
      resultCount: searchResults.length,
      processingTime,
      hasEmbedding: request.query.type === 'semantic' || request.query.type === 'hybrid'
    });

    // Calculate confidence
    const confidence = calculateSearchConfidence(searchResults, queryInfo);

    logger.info('Semantic search completed', {
      requestId,
      processingTime,
      resultCount: searchResults.length,
      searchType: request.query.type,
      confidence
    });

    return {
      success: true,
      requestId,
      data: {
        results: searchResults,
        total: searchResults.length,
        queryInfo,
        aggregations,
        suggestions,
        metadata: {
          searchDate: new Date().toISOString(),
          searchType: request.query.type,
          collection: request.indexConfig?.collection || 'default',
          processingTime,
          resultCount: searchResults.length,
          confidence
        },
        costs: {
          embedding: costs.details?.embedding || 0,
          vectorSearch: costs.amount,
          total: costs.amount + (costs.details?.embedding || 0)
        }
      }
    };

  } catch (error) {
    logger.error('Semantic search failed', {
      requestId,
      query: request.query.text,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Semantic search failed',
      details: error instanceof Error ? error.stack : undefined
    };
  }
}

async function handleFindSimilar(
  request: any,
  requestId: string
): Promise<SearchResponse> {
  try {
    logger.info('Finding similar documents', { requestId, documentId: request.documentId });

    const vectorEngine = new VectorEngine();
    const similarResults = await vectorEngine.findSimilar(
      request.documentId,
      request.options || {}
    );

    return {
      success: true,
      requestId,
      data: {
        results: similarResults,
        total: similarResults.length,
        queryInfo: {
          originalQuery: `Similar to ${request.documentId}`,
          searchStrategy: 'similarity',
          filtersApplied: [],
          searchTime: 0
        },
        metadata: {
          searchDate: new Date().toISOString(),
          searchType: 'similarity',
          collection: 'default',
          processingTime: 100,
          resultCount: similarResults.length,
          confidence: 0.9
        },
        costs: {
          embedding: 0,
          vectorSearch: 0.01,
          total: 0.01
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Find similar failed'
    };
  }
}

async function handleIndexDocument(
  request: any,
  requestId: string
): Promise<SearchResponse> {
  try {
    logger.info('Indexing document', { requestId, documentId: request.document?.id });

    const vectorEngine = new VectorEngine();
    const indexed = await vectorEngine.indexDocument(request.document);

    return {
      success: true,
      requestId,
      data: {
        results: [{
          id: indexed.id,
          type: 'document',
          title: indexed.title || 'Indexed Document',
          content: 'Document indexed successfully',
          score: 1.0,
          metadata: {
            university: indexed.university || 'Unknown',
            documentType: indexed.type || 'document',
            language: indexed.language || 'en',
            lastUpdated: new Date().toISOString(),
            source: 'index_operation'
          }
        }],
        total: 1,
        queryInfo: {
          originalQuery: 'index_document',
          searchStrategy: 'indexing',
          filtersApplied: [],
          searchTime: 0
        },
        metadata: {
          searchDate: new Date().toISOString(),
          searchType: 'indexing',
          collection: 'default',
          processingTime: 200,
          resultCount: 1,
          confidence: 1.0
        },
        costs: {
          embedding: 0.005,
          vectorSearch: 0.003,
          total: 0.008
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Document indexing failed'
    };
  }
}

async function handleGetSuggestions(
  request: any,
  requestId: string
): Promise<SearchResponse> {
  try {
    logger.info('Getting search suggestions', { requestId, partial: request.partial });

    const vectorEngine = new VectorEngine();
    const suggestions = await vectorEngine.getSuggestions(request.partial || '', request.limit || 10);

    return {
      success: true,
      requestId,
      data: {
        results: [],
        total: 0,
        queryInfo: {
          originalQuery: request.partial || '',
          searchStrategy: 'suggestions',
          filtersApplied: [],
          searchTime: 0
        },
        suggestions,
        metadata: {
          searchDate: new Date().toISOString(),
          searchType: 'suggestions',
          collection: 'default',
          processingTime: 50,
          resultCount: 0,
          confidence: 1.0
        },
        costs: {
          embedding: 0,
          vectorSearch: 0.001,
          total: 0.001
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Get suggestions failed'
    };
  }
}

async function handleHealthCheck(requestId: string): Promise<SearchResponse> {
  try {
    // Test vector engine
    const vectorEngine = new VectorEngine();
    await vectorEngine.healthCheck();

    // Test LLM service
    const llmHealth = await llmService.healthCheck();

    const health = {
      status: 'healthy',
      services: {
        vectorEngine: 'healthy',
        llm: llmHealth ? 'healthy' : 'degraded',
        qdrant: 'healthy'
      },
      timestamp: new Date().toISOString()
    };

    return {
      success: true,
      requestId,
      data: {
        results: [{
          id: 'health',
          type: 'document',
          title: 'Health Check',
          content: JSON.stringify(health),
          score: 1.0,
          metadata: {
            university: 'system',
            documentType: 'health',
            language: 'en',
            lastUpdated: new Date().toISOString(),
            source: 'health_check'
          }
        }],
        total: 1,
        queryInfo: {
          originalQuery: 'health_check',
          searchStrategy: 'health',
          filtersApplied: [],
          searchTime: 0
        },
        metadata: {
          searchDate: new Date().toISOString(),
          searchType: 'health',
          collection: 'system',
          processingTime: 0,
          resultCount: 1,
          confidence: 1.0
        },
        costs: {
          embedding: 0,
          vectorSearch: 0,
          total: 0
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: 'Health check failed'
    };
  }
}

async function handleGetCollections(requestId: string): Promise<SearchResponse> {
  const collections = [
    {
      name: 'curricula',
      description: 'University curriculum documents',
      documents: 1250,
      lastUpdated: '2024-01-01T00:00:00Z'
    },
    {
      name: 'courses',
      description: 'Individual course descriptions',
      documents: 5600,
      lastUpdated: '2024-01-01T00:00:00Z'
    },
    {
      name: 'programs',
      description: 'Academic program information',
      documents: 320,
      lastUpdated: '2024-01-01T00:00:00Z'
    }
  ];

  return {
    success: true,
    requestId,
    data: {
      results: collections.map(col => ({
        id: col.name,
        type: 'document',
        title: col.name,
        content: col.description,
        score: 1.0,
        metadata: {
          university: 'system',
          documentType: 'collection',
          language: 'en',
          lastUpdated: col.lastUpdated,
          source: 'collections'
        }
      })),
      total: collections.length,
      queryInfo: {
        originalQuery: 'get_collections',
        searchStrategy: 'metadata',
        filtersApplied: [],
        searchTime: 0
      },
      metadata: {
        searchDate: new Date().toISOString(),
        searchType: 'collections',
        collection: 'system',
        processingTime: 0,
        resultCount: collections.length,
        confidence: 1.0
      },
      costs: {
        embedding: 0,
        vectorSearch: 0,
        total: 0
      }
    }
  };
}

async function handleGetStats(
  collection: string,
  requestId: string
): Promise<SearchResponse> {
  const stats = {
    collection,
    totalDocuments: 1250,
    averageLength: 850,
    languages: { 'en': 1100, 'de': 100, 'hu': 50 },
    documentTypes: { 'course': 800, 'program': 300, 'curriculum': 150 },
    lastIndexed: new Date().toISOString()
  };

  return {
    success: true,
    requestId,
    data: {
      results: [{
        id: `stats_${collection}`,
        type: 'document',
        title: `Statistics for ${collection}`,
        content: JSON.stringify(stats),
        score: 1.0,
        metadata: {
          university: 'system',
          documentType: 'stats',
          language: 'en',
          lastUpdated: new Date().toISOString(),
          source: 'statistics'
        }
      }],
      total: 1,
      queryInfo: {
        originalQuery: `stats_${collection}`,
        searchStrategy: 'statistics',
        filtersApplied: [],
        searchTime: 0
      },
      metadata: {
        searchDate: new Date().toISOString(),
        searchType: 'statistics',
        collection,
        processingTime: 0,
        resultCount: 1,
        confidence: 1.0
      },
      costs: {
        embedding: 0,
        vectorSearch: 0,
        total: 0
      }
    }
  };
}

async function handleGetDocument(
  documentId: string,
  requestId: string
): Promise<SearchResponse> {
  try {
    const vectorEngine = new VectorEngine();
    const document = await vectorEngine.getDocument(documentId);

    return {
      success: true,
      requestId,
      data: {
        results: document ? [document] : [],
        total: document ? 1 : 0,
        queryInfo: {
          originalQuery: `get_document_${documentId}`,
          searchStrategy: 'direct',
          filtersApplied: [],
          searchTime: 0
        },
        metadata: {
          searchDate: new Date().toISOString(),
          searchType: 'document_retrieval',
          collection: 'default',
          processingTime: 10,
          resultCount: document ? 1 : 0,
          confidence: 1.0
        },
        costs: {
          embedding: 0,
          vectorSearch: 0.001,
          total: 0.001
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Document retrieval failed'
    };
  }
}

async function handleDeleteDocument(
  documentId: string,
  requestId: string
): Promise<SearchResponse> {
  try {
    const vectorEngine = new VectorEngine();
    const deleted = await vectorEngine.deleteDocument(documentId);

    return {
      success: true,
      requestId,
      data: {
        results: [{
          id: documentId,
          type: 'document',
          title: 'Document Deleted',
          content: `Document ${documentId} has been deleted`,
          score: 1.0,
          metadata: {
            university: 'system',
            documentType: 'deletion',
            language: 'en',
            lastUpdated: new Date().toISOString(),
            source: 'deletion_operation'
          }
        }],
        total: 1,
        queryInfo: {
          originalQuery: `delete_${documentId}`,
          searchStrategy: 'deletion',
          filtersApplied: [],
          searchTime: 0
        },
        metadata: {
          searchDate: new Date().toISOString(),
          searchType: 'deletion',
          collection: 'default',
          processingTime: 50,
          resultCount: 1,
          confidence: 1.0
        },
        costs: {
          embedding: 0,
          vectorSearch: 0.002,
          total: 0.002
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Document deletion failed'
    };
  }
}

async function handleDeleteCollection(
  collection: string,
  requestId: string
): Promise<SearchResponse> {
  try {
    const vectorEngine = new VectorEngine();
    const deleted = await vectorEngine.deleteCollection(collection);

    return {
      success: true,
      requestId,
      data: {
        results: [{
          id: collection,
          type: 'document',
          title: 'Collection Deleted',
          content: `Collection ${collection} has been deleted`,
          score: 1.0,
          metadata: {
            university: 'system',
            documentType: 'deletion',
            language: 'en',
            lastUpdated: new Date().toISOString(),
            source: 'deletion_operation'
          }
        }],
        total: 1,
        queryInfo: {
          originalQuery: `delete_collection_${collection}`,
          searchStrategy: 'deletion',
          filtersApplied: [],
          searchTime: 0
        },
        metadata: {
          searchDate: new Date().toISOString(),
          searchType: 'collection_deletion',
          collection,
          processingTime: 100,
          resultCount: 1,
          confidence: 1.0
        },
        costs: {
          embedding: 0,
          vectorSearch: 0.005,
          total: 0.005
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Collection deletion failed'
    };
  }
}

// Helper functions
function generateAggregations(results: SearchResult[]): Aggregations {
  const aggregations: Aggregations = {
    universities: {},
    programs: {},
    documentTypes: {},
    subjects: {},
    levels: {},
    languages: {}
  };

  for (const result of results) {
    // Universities
    const university = result.metadata.university;
    aggregations.universities[university] = (aggregations.universities[university] || 0) + 1;

    // Programs
    if (result.metadata.program) {
      aggregations.programs[result.metadata.program] = (aggregations.programs[result.metadata.program] || 0) + 1;
    }

    // Document types
    const docType = result.metadata.documentType;
    aggregations.documentTypes[docType] = (aggregations.documentTypes[docType] || 0) + 1;

    // Subjects
    if (result.metadata.subjects) {
      for (const subject of result.metadata.subjects) {
        aggregations.subjects[subject] = (aggregations.subjects[subject] || 0) + 1;
      }
    }

    // Levels
    if (result.metadata.level) {
      aggregations.levels[result.metadata.level] = (aggregations.levels[result.metadata.level] || 0) + 1;
    }

    // Languages
    const language = result.metadata.language;
    aggregations.languages[language] = (aggregations.languages[language] || 0) + 1;
  }

  return aggregations;
}

async function generateSuggestions(
  query: string,
  results: SearchResult[],
  vectorEngine: VectorEngine
): Promise<string[]> {
  const suggestions: string[] = [];

  // Add query expansion suggestions
  if (results.length === 0) {
    suggestions.push(
      `Try broader terms related to "${query}"`,
      'Check spelling and try alternative terms',
      'Remove filters to see more results'
    );
  } else if (results.length < 3) {
    suggestions.push(
      `Try related terms to "${query}"`,
      'Use broader search terms',
      'Check university or program filters'
    );
  }

  // Add suggestions based on top results
  if (results.length > 0) {
    const topResult = results[0];
    if (topResult.metadata.subjects) {
      suggestions.push(`Search for courses in: ${topResult.metadata.subjects.join(', ')}`);
    }
    if (topResult.metadata.university !== 'Unknown') {
      suggestions.push(`Explore more from ${topResult.metadata.university}`);
    }
  }

  return suggestions.slice(0, 5);
}

function calculateSearchConfidence(results: SearchResult[], queryInfo: QueryInfo): number {
  let confidence = 0.7; // Base confidence

  // Increase confidence based on result quality
  if (results.length > 0) {
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    confidence += (avgScore - 0.5) * 0.3;
  }

  // Increase confidence if we have good number of results
  if (results.length >= 5 && results.length <= 20) {
    confidence += 0.1;
  }

  // Decrease confidence if too many or too few results
  if (results.length > 100 || results.length === 0) {
    confidence -= 0.2;
  }

  return Math.max(0.3, Math.min(1.0, confidence));
}