/**
 * Search Engine for Web Search Agent
 * 
 * Core search engine implementation for discovering universities, programs,
 * and curricula across academic websites and databases.
 */

import { logger } from '../../src/services/logging.service';
import { errorHandler } from '../../src/utils/error-handler';
import { secrets } from '../../src/services/secrets.service';
import { LLMConfigService } from '../../src/services/llm-config.service';
import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';

/**
 * Search request interface
 */
export interface SearchRequest {
  query: string;
  type: 'universities' | 'programs' | 'curricula';
  filters?: {
    country?: string;
    region?: string;
    universityId?: string;
    programType?: string;
    level?: string;
    field?: string;
    includePrivate?: boolean;
    includePublic?: boolean;
    minRanking?: number;
  };
  maxResults?: number;
  language?: string;
}

/**
 * Search result interface
 */
export interface SearchResult {
  results: any[];
  sources: string[];
  totalFound: number;
  searchTime: number;
  confidence: number;
}

/**
 * University search source
 */
interface UniversitySource {
  name: string;
  baseUrl: string;
  searchPath: string;
  selectors: {
    name: string;
    country: string;
    website: string;
    type?: string;
    ranking?: string;
  };
  rateLimit: number; // requests per minute
}

/**
 * Academic database configuration
 */
interface AcademicDatabase {
  name: string;
  apiUrl: string;
  authType: 'api_key' | 'oauth' | 'none';
  endpoints: {
    universities: string;
    programs: string;
    curricula: string;
  };
  rateLimit: number;
}

/**
 * Search sources configuration
 */
const UNIVERSITY_SOURCES: UniversitySource[] = [
  {
    name: 'QS World University Rankings',
    baseUrl: 'https://www.topuniversities.com',
    searchPath: '/university-rankings/world-university-rankings',
    selectors: {
      name: '.uni-link',
      country: '.country',
      website: '.website-link',
      ranking: '.rank-number',
    },
    rateLimit: 30,
  },
  {
    name: 'Times Higher Education',
    baseUrl: 'https://www.timeshighereducation.com',
    searchPath: '/world-university-rankings',
    selectors: {
      name: '.ranking-institution-title',
      country: '.location',
      website: '.stats-item a',
    },
    rateLimit: 20,
  },
  {
    name: 'Academic Ranking of World Universities',
    baseUrl: 'http://www.shanghairanking.com',
    searchPath: '/rankings/arwu',
    selectors: {
      name: '.univ-name',
      country: '.region',
      website: '.website',
    },
    rateLimit: 15,
  },
];

/**
 * Academic databases
 */
const ACADEMIC_DATABASES: AcademicDatabase[] = [
  {
    name: 'World Higher Education Database',
    apiUrl: 'https://api.whed.net',
    authType: 'api_key',
    endpoints: {
      universities: '/institutions',
      programs: '/programs',
      curricula: '/curricula',
    },
    rateLimit: 100,
  },
  {
    name: 'UNESCO Higher Education Database',
    apiUrl: 'https://api.unesco.org/education',
    authType: 'api_key',
    endpoints: {
      universities: '/institutions',
      programs: '/programs',
      curricula: '/curricula',
    },
    rateLimit: 50,
  },
];

/**
 * Search engine class
 */
export class SearchEngine {
  private llmConfig: LLMConfigService;
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    this.llmConfig = new LLMConfigService();
  }

  /**
   * Search for universities
   */
  async searchUniversities(request: SearchRequest): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting university search', {
        query: request.query,
        filters: request.filters,
        maxResults: request.maxResults,
      });

      const allResults: any[] = [];
      const sources: string[] = [];

      // Search using ranking websites
      for (const source of UNIVERSITY_SOURCES) {
        try {
          if (!this.canMakeRequest(source.name, source.rateLimit)) {
            logger.warn('Rate limit exceeded for source', { source: source.name });
            continue;
          }

          const results = await this.searchUniversitySource(source, request);
          allResults.push(...results);
          sources.push(source.name);

          this.recordRequest(source.name);

        } catch (error) {
          logger.warn('University source search failed', {
            source: source.name,
            error: (error as Error).message,
          });
        }
      }

      // Search using academic databases
      for (const database of ACADEMIC_DATABASES) {
        try {
          if (!this.canMakeRequest(database.name, database.rateLimit)) {
            logger.warn('Rate limit exceeded for database', { database: database.name });
            continue;
          }

          const results = await this.searchAcademicDatabase(database, 'universities', request);
          allResults.push(...results);
          sources.push(database.name);

          this.recordRequest(database.name);

        } catch (error) {
          logger.warn('Academic database search failed', {
            database: database.name,
            error: (error as Error).message,
          });
        }
      }

      // Use LLM to enhance and validate results
      const enhancedResults = await this.enhanceUniversityResults(allResults, request);

      // Apply filters and ranking
      const filteredResults = this.filterUniversityResults(enhancedResults, request.filters);
      const rankedResults = this.rankResults(filteredResults, request.query);

      // Limit results
      const finalResults = rankedResults.slice(0, request.maxResults || 50);

      const searchTime = Date.now() - startTime;

      logger.info('University search completed', {
        totalFound: finalResults.length,
        searchTime,
        sources: sources.length,
      });

      return {
        results: finalResults,
        sources,
        totalFound: finalResults.length,
        searchTime,
        confidence: this.calculateConfidence(finalResults, sources.length),
      };

    } catch (error) {
      logger.error('University search failed', error as Error, { query: request.query });
      throw error;
    }
  }

  /**
   * Search for academic programs
   */
  async searchPrograms(request: SearchRequest): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting program search', {
        query: request.query,
        filters: request.filters,
      });

      const allResults: any[] = [];
      const sources: string[] = [];

      // Search using academic databases
      for (const database of ACADEMIC_DATABASES) {
        try {
          if (!this.canMakeRequest(database.name, database.rateLimit)) {
            continue;
          }

          const results = await this.searchAcademicDatabase(database, 'programs', request);
          allResults.push(...results);
          sources.push(database.name);

          this.recordRequest(database.name);

        } catch (error) {
          logger.warn('Program database search failed', {
            database: database.name,
            error: (error as Error).message,
          });
        }
      }

      // If we have a specific university, search its website
      if (request.filters?.universityId) {
        try {
          const universityResults = await this.searchUniversityWebsite(request);
          allResults.push(...universityResults);
          sources.push('university_website');

        } catch (error) {
          logger.warn('University website search failed', {
            error: (error as Error).message,
          });
        }
      }

      // Use LLM to enhance results
      const enhancedResults = await this.enhanceProgramResults(allResults, request);

      // Apply filters and ranking
      const filteredResults = this.filterProgramResults(enhancedResults, request.filters);
      const rankedResults = this.rankResults(filteredResults, request.query);

      const finalResults = rankedResults.slice(0, request.maxResults || 20);
      const searchTime = Date.now() - startTime;

      return {
        results: finalResults,
        sources,
        totalFound: finalResults.length,
        searchTime,
        confidence: this.calculateConfidence(finalResults, sources.length),
      };

    } catch (error) {
      logger.error('Program search failed', error as Error, { query: request.query });
      throw error;
    }
  }

  /**
   * Extract curriculum information
   */
  async extractCurriculum(program: any): Promise<any> {
    try {
      logger.info('Extracting curriculum', {
        programId: program.id,
        programName: program.name,
      });

      // Try to get curriculum from program URLs
      let curriculumData = null;

      if (program.urls?.curriculum) {
        curriculumData = await this.extractCurriculumFromUrl(program.urls.curriculum);
      } else if (program.urls?.main) {
        curriculumData = await this.extractCurriculumFromUrl(program.urls.main);
      }

      // If no direct curriculum found, use LLM to extract from description
      if (!curriculumData && program.description) {
        curriculumData = await this.extractCurriculumFromDescription(program.description);
      }

      return curriculumData;

    } catch (error) {
      logger.error('Curriculum extraction failed', error as Error, {
        programId: program.id,
      });
      return null;
    }
  }

  /**
   * Extract contact information
   */
  async extractContacts(university: any): Promise<any> {
    try {
      logger.info('Extracting contacts', {
        universityId: university.id,
        universityName: university.name,
      });

      const contactInfo: any = {};

      // Try to extract from university website
      if (university.website) {
        const webContacts = await this.extractContactsFromWebsite(university.website);
        Object.assign(contactInfo, webContacts);
      }

      return contactInfo;

    } catch (error) {
      logger.error('Contact extraction failed', error as Error, {
        universityId: university.id,
      });
      return {};
    }
  }

  /**
   * Validate search results
   */
  async validateResults(data: { universities: any[]; programs: any[] }): Promise<{
    validatedUniversities: any[];
    validatedPrograms: any[];
    overallConfidence: number;
  }> {
    try {
      logger.info('Validating search results', {
        universitiesCount: data.universities.length,
        programsCount: data.programs.length,
      });

      // Validate universities
      const validatedUniversities = await Promise.all(
        data.universities.map(uni => this.validateUniversity(uni))
      );

      // Validate programs
      const validatedPrograms = await Promise.all(
        data.programs.map(prog => this.validateProgram(prog))
      );

      // Calculate overall confidence
      const allItems = [...validatedUniversities, ...validatedPrograms];
      const overallConfidence = allItems.length > 0 ?
        allItems.reduce((sum, item) => sum + (item.metadata?.confidence || 0), 0) / allItems.length :
        0;

      return {
        validatedUniversities: validatedUniversities.filter(uni => uni.metadata.confidence > 0.5),
        validatedPrograms: validatedPrograms.filter(prog => prog.metadata.confidence > 0.5),
        overallConfidence,
      };

    } catch (error) {
      logger.error('Result validation failed', error as Error);
      throw error;
    }
  }

  /**
   * Search university source
   */
  private async searchUniversitySource(source: UniversitySource, request: SearchRequest): Promise<any[]> {
    try {
      const url = `${source.baseUrl}${source.searchPath}`;
      const response = await this.makeHttpRequest(url);
      
      const $ = cheerio.load(response.data);
      const results: any[] = [];

      // Extract university information using selectors
      $(source.selectors.name).each((index, element) => {
        const name = $(element).text().trim();
        if (!name) return;

        const university = {
          name,
          country: this.extractText($, element, source.selectors.country),
          website: this.extractUrl($, element, source.selectors.website),
          ranking: this.extractNumber($, element, source.selectors.ranking),
          source: source.name,
        };

        // Apply basic filters
        if (this.matchesCountryFilter(university, request.filters)) {
          results.push(university);
        }
      });

      return results;

    } catch (error) {
      logger.error('Failed to search university source', error as Error, {
        source: source.name,
      });
      return [];
    }
  }

  /**
   * Search academic database
   */
  private async searchAcademicDatabase(
    database: AcademicDatabase,
    type: 'universities' | 'programs' | 'curricula',
    request: SearchRequest
  ): Promise<any[]> {
    try {
      const endpoint = database.endpoints[type];
      const url = `${database.apiUrl}${endpoint}`;
      
      // Build query parameters
      const params: any = {
        q: request.query,
        limit: request.maxResults || 50,
      };

      if (request.filters?.country) {
        params.country = request.filters.country;
      }

      if (request.filters?.field) {
        params.field = request.filters.field;
      }

      // Get API key if required
      let headers: any = {};
      if (database.authType === 'api_key') {
        const apiKey = await this.getApiKey(database.name);
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
      }

      const response = await this.makeHttpRequest(url, { params, headers });
      
      return response.data.results || response.data.items || [];

    } catch (error) {
      logger.error('Failed to search academic database', error as Error, {
        database: database.name,
        type,
      });
      return [];
    }
  }

  /**
   * Search university website for programs
   */
  private async searchUniversityWebsite(request: SearchRequest): Promise<any[]> {
    try {
      // This would implement website scraping for program information
      // For now, return empty array as placeholder
      return [];

    } catch (error) {
      logger.error('University website search failed', error as Error);
      return [];
    }
  }

  /**
   * Enhance university results using LLM
   */
  private async enhanceUniversityResults(results: any[], request: SearchRequest): Promise<any[]> {
    try {
      const model = await this.llmConfig.getModelForAgent('web-search');
      
      // Use LLM to extract and standardize university information
      const prompt = `
        Extract and standardize university information from the following search results.
        Focus on: name, country, website, type (public/private), accreditation status.
        
        Search Results:
        ${JSON.stringify(results.slice(0, 10), null, 2)}
        
        Return structured data with confidence scores (0-1).
      `;

      // This would call the LLM service
      // For now, return results as-is with confidence scores
      return results.map(result => ({
        ...result,
        confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
      }));

    } catch (error) {
      logger.error('Failed to enhance university results', error as Error);
      return results;
    }
  }

  /**
   * Enhance program results using LLM
   */
  private async enhanceProgramResults(results: any[], request: SearchRequest): Promise<any[]> {
    try {
      // Similar to university enhancement but for programs
      return results.map(result => ({
        ...result,
        confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      }));

    } catch (error) {
      logger.error('Failed to enhance program results', error as Error);
      return results;
    }
  }

  /**
   * Extract curriculum from URL
   */
  private async extractCurriculumFromUrl(url: string): Promise<any> {
    try {
      const response = await this.makeHttpRequest(url);
      const $ = cheerio.load(response.data);
      
      // Extract course information
      const courses: any[] = [];
      
      // Look for common course listing patterns
      $('.course, .subject, .module').each((index, element) => {
        const name = $(element).find('.course-name, .title, h3, h4').first().text().trim();
        const code = $(element).find('.course-code, .code').first().text().trim();
        const credits = this.extractNumber($, element, '.credits, .credit-hours');
        
        if (name) {
          courses.push({
            name,
            code: code || undefined,
            credits: credits || undefined,
            mandatory: true, // Default assumption
          });
        }
      });

      return {
        courses,
        requirements: {
          coreSubjects: [],
          electives: [],
          practicum: false,
          thesis: false,
        },
      };

    } catch (error) {
      logger.error('Failed to extract curriculum from URL', error as Error, { url });
      return null;
    }
  }

  /**
   * Extract curriculum from description
   */
  private async extractCurriculumFromDescription(description: string): Promise<any> {
    try {
      // Use LLM to extract curriculum information from program description
      const model = await this.llmConfig.getModelForAgent('web-search');
      
      const prompt = `
        Extract curriculum information from this program description:
        "${description}"
        
        Return structured data including:
        - List of courses/subjects
        - Core requirements
        - Electives
        - Any special requirements (practicum, thesis, etc.)
      `;

      // This would call the LLM service
      // For now, return basic structure
      return {
        courses: [],
        requirements: {
          coreSubjects: [],
          electives: [],
          practicum: false,
          thesis: false,
        },
      };

    } catch (error) {
      logger.error('Failed to extract curriculum from description', error as Error);
      return null;
    }
  }

  /**
   * Extract contacts from website
   */
  private async extractContactsFromWebsite(website: string): Promise<any> {
    try {
      const response = await this.makeHttpRequest(website);
      const $ = cheerio.load(response.data);
      
      const contacts: any = {};
      
      // Look for email addresses
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = response.data.match(emailRegex);
      if (emails && emails.length > 0) {
        contacts.email = emails[0];
      }
      
      // Look for phone numbers
      const phoneRegex = /[\+]?[1-9][\d\s\-\(\)]{7,}[\d]/g;
      const phones = response.data.match(phoneRegex);
      if (phones && phones.length > 0) {
        contacts.phone = phones[0];
      }
      
      return contacts;

    } catch (error) {
      logger.error('Failed to extract contacts from website', error as Error, { website });
      return {};
    }
  }

  /**
   * Validate university information
   */
  private async validateUniversity(university: any): Promise<any> {
    let confidence = university.confidence || 0.5;
    
    // Increase confidence based on available information
    if (university.website && university.website.includes('edu')) confidence += 0.1;
    if (university.ranking && university.ranking > 0) confidence += 0.1;
    if (university.accreditation && university.accreditation.status === 'accredited') confidence += 0.1;
    if (university.contact && university.contact.email) confidence += 0.05;
    
    return {
      ...university,
      metadata: {
        ...university.metadata,
        confidence: Math.min(confidence, 1.0),
      },
    };
  }

  /**
   * Validate program information
   */
  private async validateProgram(program: any): Promise<any> {
    let confidence = program.confidence || 0.5;
    
    // Increase confidence based on available information
    if (program.curriculum && program.curriculum.courses.length > 0) confidence += 0.2;
    if (program.accreditation && program.accreditation.status) confidence += 0.1;
    if (program.admission && program.admission.requirements.length > 0) confidence += 0.1;
    if (program.urls && program.urls.main) confidence += 0.05;
    
    return {
      ...program,
      metadata: {
        ...program.metadata,
        confidence: Math.min(confidence, 1.0),
      },
    };
  }

  /**
   * Filter university results
   */
  private filterUniversityResults(results: any[], filters?: any): any[] {
    if (!filters) return results;
    
    return results.filter(university => {
      if (filters.country && university.country !== filters.country) return false;
      if (filters.includePrivate === false && university.type === 'private') return false;
      if (filters.includePublic === false && university.type === 'public') return false;
      if (filters.minRanking && university.ranking && university.ranking > filters.minRanking) return false;
      
      return true;
    });
  }

  /**
   * Filter program results
   */
  private filterProgramResults(results: any[], filters?: any): any[] {
    if (!filters) return results;
    
    return results.filter(program => {
      if (filters.level && program.level !== filters.level) return false;
      if (filters.field && !program.field.toLowerCase().includes(filters.field.toLowerCase())) return false;
      
      return true;
    });
  }

  /**
   * Rank results by relevance
   */
  private rankResults(results: any[], query: string): any[] {
    return results.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, query);
      const scoreB = this.calculateRelevanceScore(b, query);
      return scoreB - scoreA;
    });
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevanceScore(item: any, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    
    // Check name relevance
    if (item.name && item.name.toLowerCase().includes(queryLower)) {
      score += 10;
    }
    
    // Check field relevance for programs
    if (item.field && item.field.toLowerCase().includes(queryLower)) {
      score += 8;
    }
    
    // Check description relevance
    if (item.description && item.description.toLowerCase().includes(queryLower)) {
      score += 5;
    }
    
    // Add confidence score
    score += (item.confidence || 0.5) * 5;
    
    // Add ranking bonus for universities
    if (item.ranking && item.ranking <= 100) {
      score += (100 - item.ranking) / 10;
    }
    
    return score;
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(results: any[], sourcesCount: number): number {
    if (results.length === 0) return 0;
    
    const avgItemConfidence = results.reduce((sum, item) => 
      sum + (item.confidence || 0.5), 0) / results.length;
    
    const sourceBonus = Math.min(sourcesCount * 0.1, 0.3);
    
    return Math.min(avgItemConfidence + sourceBonus, 1.0);
  }

  /**
   * Utility methods
   */
  private async makeHttpRequest(url: string, config?: any): Promise<AxiosResponse> {
    return await errorHandler.execute(
      () => axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CurriculumAlignment/1.0)',
        },
        ...config,
      }),
      {
        operationName: 'http_request',
        timeout: 35000,
      }
    );
  }

  private extractText($: cheerio.CheerioAPI, element: cheerio.Element, selector: string): string {
    try {
      return $(element).find(selector).first().text().trim() || 
             $(element).closest('tr, li, div').find(selector).first().text().trim();
    } catch {
      return '';
    }
  }

  private extractUrl($: cheerio.CheerioAPI, element: cheerio.Element, selector: string): string {
    try {
      return $(element).find(selector).first().attr('href') || 
             $(element).closest('tr, li, div').find(selector).first().attr('href') || '';
    } catch {
      return '';
    }
  }

  private extractNumber($: cheerio.CheerioAPI, element: cheerio.Element, selector: string): number | undefined {
    try {
      const text = this.extractText($, element, selector);
      const number = parseInt(text.replace(/\D/g, ''));
      return isNaN(number) ? undefined : number;
    } catch {
      return undefined;
    }
  }

  private matchesCountryFilter(item: any, filters?: any): boolean {
    if (!filters?.country) return true;
    return item.country?.toLowerCase().includes(filters.country.toLowerCase());
  }

  private canMakeRequest(source: string, rateLimit: number): boolean {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    
    const requestData = this.requestCounts.get(source);
    
    if (!requestData || now > requestData.resetTime) {
      this.requestCounts.set(source, {
        count: 0,
        resetTime: now + windowMs,
      });
      return true;
    }
    
    return requestData.count < rateLimit;
  }

  private recordRequest(source: string): void {
    const requestData = this.requestCounts.get(source);
    if (requestData) {
      requestData.count++;
    }
  }

  private async getApiKey(serviceName: string): Promise<string | null> {
    try {
      const credentials = await secrets.getExternalServiceCredentials(serviceName.toLowerCase());
      return credentials.api_key;
    } catch (error) {
      logger.warn('Failed to get API key for service', { serviceName });
      return null;
    }
  }
}