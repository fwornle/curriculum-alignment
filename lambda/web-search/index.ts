/**
 * Web Search Agent Lambda Function
 * 
 * Specialized agent for discovering peer university curricula and programs
 * through web search, academic databases, and structured data extraction.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { SearchEngine, SearchRequest, SearchResult } from './search-engine';
import { logger } from '../../src/services/logging.service';
import { metrics } from '../../src/services/metrics.service';
import { errorHandler } from '../../src/utils/error-handler';
import { costTracking } from '../../src/services/cost-tracking.service';
import { storage } from '../../src/services/storage.service';
import { query } from '../../src/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * Web search request types
 */
export enum SearchRequestType {
  DISCOVER_UNIVERSITIES = 'discover_universities',
  FIND_PROGRAMS = 'find_programs',
  SEARCH_CURRICULA = 'search_curricula',
  EXTRACT_CONTACTS = 'extract_contacts',
  VALIDATE_RESULTS = 'validate_results',
}

/**
 * Search request structure
 */
interface WebSearchRequest {
  workflowId: string;
  stepId: string;
  type: SearchRequestType;
  parameters: {
    query?: string;
    country?: string;
    region?: string;
    programType?: string;
    accreditationBody?: string;
    language?: string;
    targetProgram?: {
      name: string;
      level: 'undergraduate' | 'graduate' | 'postgraduate';
      field: string;
    };
    searchScope?: 'global' | 'regional' | 'national';
    maxResults?: number;
    includePrivate?: boolean;
    includePublic?: boolean;
    minRanking?: number;
  };
  dependencyResults?: Record<string, any>;
}

/**
 * University information structure
 */
interface UniversityInfo {
  id: string;
  name: string;
  country: string;
  region?: string;
  website: string;
  type: 'public' | 'private' | 'mixed';
  established?: number;
  accreditation: {
    bodies: string[];
    status: 'accredited' | 'provisional' | 'not_accredited';
    validUntil?: string;
  };
  ranking?: {
    global?: number;
    national?: number;
    subject?: Record<string, number>;
  };
  contact: {
    email?: string;
    phone?: string;
    address?: string;
  };
  languages: string[];
  metadata: {
    lastUpdated: string;
    confidence: number;
    sources: string[];
  };
}

/**
 * Program information structure
 */
interface ProgramInfo {
  id: string;
  universityId: string;
  name: string;
  level: 'undergraduate' | 'graduate' | 'postgraduate';
  field: string;
  duration: {
    years?: number;
    semesters?: number;
    credits?: number;
  };
  description?: string;
  curriculum?: {
    courses: Array<{
      code?: string;
      name: string;
      credits?: number;
      mandatory: boolean;
      description?: string;
    }>;
    requirements: {
      prerequisites?: string[];
      coreSubjects: string[];
      electives: string[];
      practicum?: boolean;
      thesis?: boolean;
    };
  };
  accreditation?: {
    body?: string;
    status: string;
    validUntil?: string;
  };
  admission: {
    requirements: string[];
    deadlines?: string[];
    fees?: {
      domestic?: number;
      international?: number;
      currency: string;
    };
  };
  urls: {
    main: string;
    curriculum?: string;
    admission?: string;
  };
  metadata: {
    lastUpdated: string;
    confidence: number;
    sources: string[];
  };
}

/**
 * Search response structure
 */
interface SearchResponse {
  success: boolean;
  results: {
    universities?: UniversityInfo[];
    programs?: ProgramInfo[];
    summary: {
      totalFound: number;
      searchTime: number;
      searchQuery: string;
      searchScope: string;
    };
    metadata: {
      searchId: string;
      timestamp: string;
      sources: string[];
      confidence: number;
    };
  };
  error?: string;
}

/**
 * Global search engine instance
 */
const searchEngine = new SearchEngine();

/**
 * Lambda handler for web search agent
 */
export const handler = async (
  event: APIGatewayProxyEvent | WebSearchRequest,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = context.awsRequestId;
  const startTime = Date.now();
  
  logger.info('Web Search Agent invoked', {
    requestId,
    functionName: context.functionName,
  });

  try {
    // Parse request - handle both API Gateway and direct invocation
    let searchRequest: WebSearchRequest;
    
    if ('httpMethod' in event) {
      // API Gateway event
      if (!event.body) {
        return createErrorResponse(400, 'Request body is required');
      }
      
      try {
        searchRequest = JSON.parse(event.body);
      } catch (error) {
        return createErrorResponse(400, 'Invalid JSON in request body');
      }
    } else {
      // Direct Lambda invocation
      searchRequest = event as WebSearchRequest;
    }

    // Validate request
    if (!searchRequest.workflowId || !searchRequest.stepId || !searchRequest.type) {
      return createErrorResponse(400, 'workflowId, stepId, and type are required');
    }

    // Execute search based on type
    let response: SearchResponse;
    
    switch (searchRequest.type) {
      case SearchRequestType.DISCOVER_UNIVERSITIES:
        response = await handleDiscoverUniversities(searchRequest, requestId);
        break;
        
      case SearchRequestType.FIND_PROGRAMS:
        response = await handleFindPrograms(searchRequest, requestId);
        break;
        
      case SearchRequestType.SEARCH_CURRICULA:
        response = await handleSearchCurricula(searchRequest, requestId);
        break;
        
      case SearchRequestType.EXTRACT_CONTACTS:
        response = await handleExtractContacts(searchRequest, requestId);
        break;
        
      case SearchRequestType.VALIDATE_RESULTS:
        response = await handleValidateResults(searchRequest, requestId);
        break;
        
      default:
        return createErrorResponse(400, `Unknown search type: ${searchRequest.type}`);
    }

    // Store results in database
    await storeSearchResults(searchRequest, response);

    // Record metrics
    const duration = Date.now() - startTime;
    metrics.recordAgentMetrics({
      agentType: 'web-search',
      executionCount: 1,
      averageDuration: duration,
      successRate: response.success ? 100 : 0,
      errorCount: response.success ? 0 : 1,
    });

    // Track costs
    await costTracking.trackLLM({
      provider: 'openai', // Will be determined by search engine
      model: 'gpt-4o-mini',
      inputTokens: 1000, // Estimated
      outputTokens: 2000, // Estimated
      totalTokens: 3000,
      requestCount: 1,
      cost: 0.003, // Estimated based on tokens
      agentType: 'web-search',
    });

    logger.info('Web search completed', {
      requestId,
      workflowId: searchRequest.workflowId,
      type: searchRequest.type,
      success: response.success,
      resultsCount: response.results.summary.totalFound,
      duration,
    });

    return createSuccessResponse(response);

  } catch (error) {
    logger.error('Web Search Agent error', error as Error, { requestId });
    
    const duration = Date.now() - startTime;
    metrics.recordAgentMetrics({
      agentType: 'web-search',
      executionCount: 1,
      averageDuration: duration,
      successRate: 0,
      errorCount: 1,
    });

    return createErrorResponse(500, 'Search operation failed');
  }
};

/**
 * Handle discover universities request
 */
async function handleDiscoverUniversities(
  request: WebSearchRequest,
  requestId: string
): Promise<SearchResponse> {
  const searchStart = Date.now();
  
  try {
    const { parameters } = request;
    const searchQuery = buildUniversitySearchQuery(parameters);
    
    logger.info('Starting university discovery', {
      requestId,
      searchQuery,
      country: parameters.country,
      region: parameters.region,
    });

    // Execute search
    const searchRequest: SearchRequest = {
      query: searchQuery,
      type: 'universities',
      filters: {
        country: parameters.country,
        region: parameters.region,
        includePrivate: parameters.includePrivate ?? true,
        includePublic: parameters.includePublic ?? true,
        minRanking: parameters.minRanking,
      },
      maxResults: parameters.maxResults || 50,
      language: parameters.language || 'en',
    };

    const searchResults = await errorHandler.execute(
      () => searchEngine.searchUniversities(searchRequest),
      {
        operationName: 'search_universities',
        correlationId: requestId,
        timeout: 120000, // 2 minute timeout
      }
    );

    // Process and validate results
    const universities = await Promise.all(
      searchResults.results.map(result => processUniversityResult(result, requestId))
    );

    // Filter out invalid results
    const validUniversities = universities.filter(uni => uni.metadata.confidence > 0.5);

    const searchTime = Date.now() - searchStart;

    return {
      success: true,
      results: {
        universities: validUniversities,
        summary: {
          totalFound: validUniversities.length,
          searchTime,
          searchQuery,
          searchScope: parameters.searchScope || 'global',
        },
        metadata: {
          searchId: uuidv4(),
          timestamp: new Date().toISOString(),
          sources: searchResults.sources,
          confidence: calculateAverageConfidence(validUniversities),
        },
      },
    };

  } catch (error) {
    logger.error('University discovery failed', error as Error, { requestId });
    return {
      success: false,
      results: {
        summary: {
          totalFound: 0,
          searchTime: Date.now() - searchStart,
          searchQuery: '',
          searchScope: 'global',
        },
        metadata: {
          searchId: uuidv4(),
          timestamp: new Date().toISOString(),
          sources: [],
          confidence: 0,
        },
      },
      error: (error as Error).message,
    };
  }
}

/**
 * Handle find programs request
 */
async function handleFindPrograms(
  request: WebSearchRequest,
  requestId: string
): Promise<SearchResponse> {
  const searchStart = Date.now();
  
  try {
    const { parameters, dependencyResults } = request;
    
    // Get universities from previous step or use provided list
    const universities = dependencyResults?.web_search?.universities || [];
    if (universities.length === 0) {
      throw new Error('No universities found in previous step');
    }

    logger.info('Starting program search', {
      requestId,
      universitiesCount: universities.length,
      targetProgram: parameters.targetProgram,
    });

    const allPrograms: ProgramInfo[] = [];
    
    // Search for programs in each university
    for (const university of universities.slice(0, 20)) { // Limit to top 20 universities
      try {
        const searchQuery = buildProgramSearchQuery(parameters, university);
        
        const searchRequest: SearchRequest = {
          query: searchQuery,
          type: 'programs',
          filters: {
            universityId: university.id,
            programType: parameters.programType,
            level: parameters.targetProgram?.level,
            field: parameters.targetProgram?.field,
          },
          maxResults: 10,
          language: parameters.language || 'en',
        };

        const programResults = await searchEngine.searchPrograms(searchRequest);
        
        // Process results
        const programs = await Promise.all(
          programResults.results.map(result => 
            processProgramResult(result, university.id, requestId)
          )
        );

        allPrograms.push(...programs.filter(p => p.metadata.confidence > 0.6));

      } catch (error) {
        logger.warn('Failed to search programs for university', {
          requestId,
          universityId: university.id,
          universityName: university.name,
          error: (error as Error).message,
        });
      }
    }

    const searchTime = Date.now() - searchStart;

    return {
      success: true,
      results: {
        programs: allPrograms,
        summary: {
          totalFound: allPrograms.length,
          searchTime,
          searchQuery: buildProgramSearchQuery(parameters),
          searchScope: parameters.searchScope || 'global',
        },
        metadata: {
          searchId: uuidv4(),
          timestamp: new Date().toISOString(),
          sources: ['university_websites', 'academic_databases'],
          confidence: calculateAverageConfidence(allPrograms),
        },
      },
    };

  } catch (error) {
    logger.error('Program search failed', error as Error, { requestId });
    return {
      success: false,
      results: {
        summary: {
          totalFound: 0,
          searchTime: Date.now() - searchStart,
          searchQuery: '',
          searchScope: 'global',
        },
        metadata: {
          searchId: uuidv4(),
          timestamp: new Date().toISOString(),
          sources: [],
          confidence: 0,
        },
      },
      error: (error as Error).message,
    };
  }
}

/**
 * Handle search curricula request
 */
async function handleSearchCurricula(
  request: WebSearchRequest,
  requestId: string
): Promise<SearchResponse> {
  const searchStart = Date.now();
  
  try {
    const { parameters, dependencyResults } = request;
    
    // Get programs from previous step
    const programs = dependencyResults?.web_search?.programs || [];
    if (programs.length === 0) {
      throw new Error('No programs found in previous step');
    }

    logger.info('Starting curriculum search', {
      requestId,
      programsCount: programs.length,
    });

    const enhancedPrograms: ProgramInfo[] = [];

    // Enhance each program with detailed curriculum information
    for (const program of programs.slice(0, 10)) { // Limit to top 10 programs
      try {
        const curriculumData = await searchEngine.extractCurriculum(program);
        
        if (curriculumData) {
          const enhancedProgram = {
            ...program,
            curriculum: curriculumData,
            metadata: {
              ...program.metadata,
              lastUpdated: new Date().toISOString(),
              confidence: Math.min(program.metadata.confidence + 0.1, 1.0),
            },
          };
          
          enhancedPrograms.push(enhancedProgram);
        }

      } catch (error) {
        logger.warn('Failed to extract curriculum for program', {
          requestId,
          programId: program.id,
          programName: program.name,
          error: (error as Error).message,
        });
      }
    }

    const searchTime = Date.now() - searchStart;

    return {
      success: true,
      results: {
        programs: enhancedPrograms,
        summary: {
          totalFound: enhancedPrograms.length,
          searchTime,
          searchQuery: 'curriculum_extraction',
          searchScope: 'program_specific',
        },
        metadata: {
          searchId: uuidv4(),
          timestamp: new Date().toISOString(),
          sources: ['university_websites', 'curriculum_documents'],
          confidence: calculateAverageConfidence(enhancedPrograms),
        },
      },
    };

  } catch (error) {
    logger.error('Curriculum search failed', error as Error, { requestId });
    return {
      success: false,
      results: {
        summary: {
          totalFound: 0,
          searchTime: Date.now() - searchStart,
          searchQuery: '',
          searchScope: 'program_specific',
        },
        metadata: {
          searchId: uuidv4(),
          timestamp: new Date().toISOString(),
          sources: [],
          confidence: 0,
        },
      },
      error: (error as Error).message,
    };
  }
}

/**
 * Handle extract contacts request
 */
async function handleExtractContacts(
  request: WebSearchRequest,
  requestId: string
): Promise<SearchResponse> {
  const searchStart = Date.now();
  
  try {
    const { dependencyResults } = request;
    
    // Get universities from previous steps
    const universities = dependencyResults?.web_search?.universities || [];
    if (universities.length === 0) {
      throw new Error('No universities found in previous steps');
    }

    logger.info('Starting contact extraction', {
      requestId,
      universitiesCount: universities.length,
    });

    const enhancedUniversities: UniversityInfo[] = [];

    // Extract contact information for each university
    for (const university of universities) {
      try {
        const contactInfo = await searchEngine.extractContacts(university);
        
        const enhancedUniversity = {
          ...university,
          contact: {
            ...university.contact,
            ...contactInfo,
          },
          metadata: {
            ...university.metadata,
            lastUpdated: new Date().toISOString(),
          },
        };

        enhancedUniversities.push(enhancedUniversity);

      } catch (error) {
        logger.warn('Failed to extract contacts for university', {
          requestId,
          universityId: university.id,
          universityName: university.name,
          error: (error as Error).message,
        });
        
        // Keep original university even if contact extraction fails
        enhancedUniversities.push(university);
      }
    }

    const searchTime = Date.now() - searchStart;

    return {
      success: true,
      results: {
        universities: enhancedUniversities,
        summary: {
          totalFound: enhancedUniversities.length,
          searchTime,
          searchQuery: 'contact_extraction',
          searchScope: 'university_specific',
        },
        metadata: {
          searchId: uuidv4(),
          timestamp: new Date().toISOString(),
          sources: ['university_websites', 'contact_pages'],
          confidence: calculateAverageConfidence(enhancedUniversities),
        },
      },
    };

  } catch (error) {
    logger.error('Contact extraction failed', error as Error, { requestId });
    return {
      success: false,
      results: {
        summary: {
          totalFound: 0,
          searchTime: Date.now() - searchStart,
          searchQuery: '',
          searchScope: 'university_specific',
        },
        metadata: {
          searchId: uuidv4(),
          timestamp: new Date().toISOString(),
          sources: [],
          confidence: 0,
        },
      },
      error: (error as Error).message,
    };
  }
}

/**
 * Handle validate results request
 */
async function handleValidateResults(
  request: WebSearchRequest,
  requestId: string
): Promise<SearchResponse> {
  const searchStart = Date.now();
  
  try {
    const { dependencyResults } = request;
    
    // Validate all collected data
    const universities = dependencyResults?.web_search?.universities || [];
    const programs = dependencyResults?.web_search?.programs || [];

    logger.info('Starting result validation', {
      requestId,
      universitiesCount: universities.length,
      programsCount: programs.length,
    });

    // Perform validation checks
    const validationResults = await searchEngine.validateResults({
      universities,
      programs,
    });

    const searchTime = Date.now() - searchStart;

    return {
      success: true,
      results: {
        universities: validationResults.validatedUniversities,
        programs: validationResults.validatedPrograms,
        summary: {
          totalFound: validationResults.validatedUniversities.length + validationResults.validatedPrograms.length,
          searchTime,
          searchQuery: 'validation',
          searchScope: 'comprehensive',
        },
        metadata: {
          searchId: uuidv4(),
          timestamp: new Date().toISOString(),
          sources: ['validation_engine'],
          confidence: validationResults.overallConfidence,
        },
      },
    };

  } catch (error) {
    logger.error('Result validation failed', error as Error, { requestId });
    return {
      success: false,
      results: {
        summary: {
          totalFound: 0,
          searchTime: Date.now() - searchStart,
          searchQuery: '',
          searchScope: 'comprehensive',
        },
        metadata: {
          searchId: uuidv4(),
          timestamp: new Date().toISOString(),
          sources: [],
          confidence: 0,
        },
      },
      error: (error as Error).message,
    };
  }
}

/**
 * Build university search query
 */
function buildUniversitySearchQuery(parameters: any): string {
  const parts = ['universities'];
  
  if (parameters.country) {
    parts.push(`in ${parameters.country}`);
  }
  
  if (parameters.region) {
    parts.push(`in ${parameters.region}`);
  }
  
  if (parameters.programType) {
    parts.push(`with ${parameters.programType} programs`);
  }
  
  if (parameters.accreditationBody) {
    parts.push(`accredited by ${parameters.accreditationBody}`);
  }

  return parts.join(' ');
}

/**
 * Build program search query
 */
function buildProgramSearchQuery(parameters: any, university?: any): string {
  const parts = [];
  
  if (parameters.targetProgram?.name) {
    parts.push(parameters.targetProgram.name);
  }
  
  if (parameters.targetProgram?.level) {
    parts.push(parameters.targetProgram.level);
  }
  
  if (parameters.targetProgram?.field) {
    parts.push(`in ${parameters.targetProgram.field}`);
  }
  
  if (university) {
    parts.push(`at ${university.name}`);
  }

  return parts.join(' ');
}

/**
 * Process university search result
 */
async function processUniversityResult(result: any, requestId: string): Promise<UniversityInfo> {
  // This would contain logic to extract and structure university information
  // from search results, validate data, and assign confidence scores
  
  return {
    id: uuidv4(),
    name: result.name || 'Unknown University',
    country: result.country || 'Unknown',
    region: result.region,
    website: result.website || '',
    type: result.type || 'public',
    established: result.established,
    accreditation: {
      bodies: result.accreditation?.bodies || [],
      status: result.accreditation?.status || 'not_accredited',
      validUntil: result.accreditation?.validUntil,
    },
    ranking: result.ranking,
    contact: {
      email: result.contact?.email,
      phone: result.contact?.phone,
      address: result.contact?.address,
    },
    languages: result.languages || ['en'],
    metadata: {
      lastUpdated: new Date().toISOString(),
      confidence: Math.random() * 0.4 + 0.6, // Simulate confidence between 0.6-1.0
      sources: result.sources || ['web_search'],
    },
  };
}

/**
 * Process program search result
 */
async function processProgramResult(result: any, universityId: string, requestId: string): Promise<ProgramInfo> {
  // This would contain logic to extract and structure program information
  
  return {
    id: uuidv4(),
    universityId,
    name: result.name || 'Unknown Program',
    level: result.level || 'undergraduate',
    field: result.field || 'general',
    duration: {
      years: result.duration?.years,
      semesters: result.duration?.semesters,
      credits: result.duration?.credits,
    },
    description: result.description,
    curriculum: result.curriculum,
    accreditation: result.accreditation,
    admission: {
      requirements: result.admission?.requirements || [],
      deadlines: result.admission?.deadlines,
      fees: result.admission?.fees,
    },
    urls: {
      main: result.urls?.main || '',
      curriculum: result.urls?.curriculum,
      admission: result.urls?.admission,
    },
    metadata: {
      lastUpdated: new Date().toISOString(),
      confidence: Math.random() * 0.3 + 0.7, // Simulate confidence between 0.7-1.0
      sources: result.sources || ['university_website'],
    },
  };
}

/**
 * Calculate average confidence score
 */
function calculateAverageConfidence(items: any[]): number {
  if (items.length === 0) return 0;
  
  const total = items.reduce((sum, item) => sum + (item.metadata?.confidence || 0), 0);
  return total / items.length;
}

/**
 * Store search results in database
 */
async function storeSearchResults(request: WebSearchRequest, response: SearchResponse): Promise<void> {
  try {
    // Store universities
    if (response.results.universities) {
      for (const university of response.results.universities) {
        await query(`
          INSERT INTO peer_universities (
            university_id, name, country, region, website, university_type,
            accreditation_info, ranking_info, contact_info, languages_supported, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (university_id) DO UPDATE SET
            name = $2, country = $3, region = $4, website = $5,
            accreditation_info = $7, ranking_info = $8, contact_info = $9,
            languages_supported = $10, metadata = $11, updated_at = NOW()
        `, [
          university.id,
          university.name,
          university.country,
          university.region,
          university.website,
          university.type,
          JSON.stringify(university.accreditation),
          JSON.stringify(university.ranking),
          JSON.stringify(university.contact),
          JSON.stringify(university.languages),
          JSON.stringify(university.metadata),
        ]);
      }
    }

    // Store programs
    if (response.results.programs) {
      for (const program of response.results.programs) {
        await query(`
          INSERT INTO peer_programs (
            program_id, university_id, program_name, program_level, field_of_study,
            duration_info, curriculum_data, accreditation_info, admission_info,
            program_urls, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (program_id) DO UPDATE SET
            program_name = $3, program_level = $4, field_of_study = $5,
            duration_info = $6, curriculum_data = $7, accreditation_info = $8,
            admission_info = $9, program_urls = $10, metadata = $11, updated_at = NOW()
        `, [
          program.id,
          program.universityId,
          program.name,
          program.level,
          program.field,
          JSON.stringify(program.duration),
          JSON.stringify(program.curriculum),
          JSON.stringify(program.accreditation),
          JSON.stringify(program.admission),
          JSON.stringify(program.urls),
          JSON.stringify(program.metadata),
        ]);
      }
    }

  } catch (error) {
    logger.error('Failed to store search results', error as Error, {
      workflowId: request.workflowId,
    });
  }
}

/**
 * Create success response
 */
function createSuccessResponse(data: any): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Create error response
 */
function createErrorResponse(statusCode: number, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: false,
      error: {
        message,
        code: statusCode,
        timestamp: new Date().toISOString(),
      },
    }),
  };
}