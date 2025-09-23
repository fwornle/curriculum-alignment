/**
 * Browser Agent Lambda Function
 * 
 * Specialized agent for web scraping and browser automation using Stagehand/MCP.
 * Handles dynamic content extraction, JavaScript-rendered pages, and complex
 * navigation scenarios for extracting curriculum and university data.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { StagehandIntegration, BrowserTask, BrowserResult } from './stagehand-integration';
import { logger } from '../../src/services/logging.service';
import { metrics } from '../../src/services/metrics.service';
import { errorHandler } from '../../src/utils/error-handler';
import { costTracking } from '../../src/services/cost-tracking.service';
import { storage } from '../../src/services/storage.service';
import { query } from '../../src/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * Browser request types
 */
export enum BrowserRequestType {
  EXTRACT_CURRICULUM = 'extract_curriculum',
  NAVIGATE_TIMEEDIT = 'navigate_timeedit',
  SCRAPE_COURSE_CATALOG = 'scrape_course_catalog',
  EXTRACT_FACULTY_INFO = 'extract_faculty_info',
  DOWNLOAD_DOCUMENTS = 'download_documents',
  VALIDATE_LINKS = 'validate_links',
  SCREENSHOT_PAGE = 'screenshot_page',
}

/**
 * Browser request structure
 */
interface BrowserRequest {
  workflowId: string;
  stepId: string;
  type: BrowserRequestType;
  parameters: {
    url: string;
    target?: {
      type: 'curriculum' | 'courses' | 'faculty' | 'documents' | 'timeedit';
      selectors?: string[];
      expectedCount?: number;
      timeout?: number;
    };
    navigation?: {
      steps: Array<{
        action: 'click' | 'type' | 'wait' | 'scroll' | 'hover';
        selector?: string;
        text?: string;
        delay?: number;
      }>;
      maxRetries?: number;
    };
    extraction?: {
      fields: Array<{
        name: string;
        selector: string;
        attribute?: string;
        required?: boolean;
        transform?: 'text' | 'html' | 'url' | 'number' | 'date';
      }>;
      pagination?: {
        nextButtonSelector: string;
        maxPages: number;
      };
    };
    options?: {
      respectRobots?: boolean;
      useProxy?: boolean;
      enableJavaScript?: boolean;
      customHeaders?: Record<string, string>;
      delay?: number;
      timeout?: number;
    };
  };
  dependencyResults?: Record<string, any>;
}

/**
 * Extracted content structure
 */
interface ExtractedContent {
  id: string;
  url: string;
  title?: string;
  content: {
    text?: string;
    html?: string;
    structured?: Record<string, any>;
  };
  metadata: {
    extractedAt: string;
    contentType: string;
    confidence: number;
    source: string;
  };
  links?: Array<{
    url: string;
    text: string;
    type: 'curriculum' | 'course' | 'document' | 'other';
  }>;
  documents?: Array<{
    url: string;
    name: string;
    type: string;
    size?: number;
  }>;
}

/**
 * Browser response structure
 */
interface BrowserResponse {
  success: boolean;
  results: {
    extracted: ExtractedContent[];
    screenshots?: string[];
    downloads?: string[];
    summary: {
      pagesProcessed: number;
      extractionTime: number;
      successRate: number;
    };
    metadata: {
      taskId: string;
      timestamp: string;
      browser: string;
      userAgent: string;
    };
  };
  error?: string;
}

/**
 * Global Stagehand integration instance
 */
const stagehand = new StagehandIntegration();

/**
 * Lambda handler for browser agent
 */
export const handler = async (
  event: APIGatewayProxyEvent | BrowserRequest,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = context.awsRequestId;
  const startTime = Date.now();
  
  logger.info('Browser Agent invoked', {
    requestId,
    functionName: context.functionName,
    remainingTime: context.getRemainingTimeInMillis(),
  });

  try {
    // Parse request - handle both API Gateway and direct invocation
    let browserRequest: BrowserRequest;
    
    if ('httpMethod' in event) {
      // API Gateway event
      if (!event.body) {
        return createErrorResponse(400, 'Request body is required');
      }
      
      try {
        browserRequest = JSON.parse(event.body);
      } catch (error) {
        return createErrorResponse(400, 'Invalid JSON in request body');
      }
    } else {
      // Direct Lambda invocation
      browserRequest = event as BrowserRequest;
    }

    // Validate request
    if (!browserRequest.workflowId || !browserRequest.stepId || !browserRequest.type) {
      return createErrorResponse(400, 'workflowId, stepId, and type are required');
    }

    if (!browserRequest.parameters?.url) {
      return createErrorResponse(400, 'URL parameter is required');
    }

    // Check robots.txt if enabled
    if (browserRequest.parameters.options?.respectRobots !== false) {
      const robotsAllowed = await checkRobotsPermission(browserRequest.parameters.url);
      if (!robotsAllowed) {
        return createErrorResponse(403, 'Robots.txt disallows scraping this URL');
      }
    }

    // Initialize browser session
    await stagehand.initialize({
      headless: true,
      userAgent: 'Mozilla/5.0 (compatible; CurriculumAlignment/1.0; +https://example.com/bot)',
      timeout: browserRequest.parameters.options?.timeout || 30000,
    });

    // Execute browser task based on type
    let response: BrowserResponse;
    
    try {
      switch (browserRequest.type) {
        case BrowserRequestType.EXTRACT_CURRICULUM:
          response = await handleExtractCurriculum(browserRequest, requestId);
          break;
          
        case BrowserRequestType.NAVIGATE_TIMEEDIT:
          response = await handleNavigateTimeEdit(browserRequest, requestId);
          break;
          
        case BrowserRequestType.SCRAPE_COURSE_CATALOG:
          response = await handleScrapeCatalog(browserRequest, requestId);
          break;
          
        case BrowserRequestType.EXTRACT_FACULTY_INFO:
          response = await handleExtractFaculty(browserRequest, requestId);
          break;
          
        case BrowserRequestType.DOWNLOAD_DOCUMENTS:
          response = await handleDownloadDocuments(browserRequest, requestId);
          break;
          
        case BrowserRequestType.VALIDATE_LINKS:
          response = await handleValidateLinks(browserRequest, requestId);
          break;
          
        case BrowserRequestType.SCREENSHOT_PAGE:
          response = await handleScreenshot(browserRequest, requestId);
          break;
          
        default:
          return createErrorResponse(400, `Unknown browser task type: ${browserRequest.type}`);
      }
    } finally {
      // Always close browser session
      await stagehand.close();
    }

    // Store results
    await storeBrowserResults(browserRequest, response);

    // Record metrics
    const duration = Date.now() - startTime;
    metrics.recordAgentMetrics({
      agentType: 'browser',
      executionCount: 1,
      averageDuration: duration,
      successRate: response.success ? 100 : 0,
      errorCount: response.success ? 0 : 1,
    });

    // Track costs (browser operations are typically more expensive)
    await costTracking.trackAWS({
      service: 'lambda',
      resourceType: 'browser-agent',
      usage: duration,
      unit: 'milliseconds',
      cost: (duration / 1000) * 0.0000166667 * 2, // 2GB memory allocation
      region: process.env.AWS_REGION,
    });

    logger.info('Browser task completed', {
      requestId,
      workflowId: browserRequest.workflowId,
      type: browserRequest.type,
      success: response.success,
      pagesProcessed: response.results.summary.pagesProcessed,
      duration,
    });

    return createSuccessResponse(response);

  } catch (error) {
    logger.error('Browser Agent error', error as Error, { requestId });
    
    // Ensure browser is closed
    try {
      await stagehand.close();
    } catch (closeError) {
      logger.warn('Failed to close browser', { error: (closeError as Error).message });
    }
    
    const duration = Date.now() - startTime;
    metrics.recordAgentMetrics({
      agentType: 'browser',
      executionCount: 1,
      averageDuration: duration,
      successRate: 0,
      errorCount: 1,
    });

    return createErrorResponse(500, 'Browser operation failed');
  }
};

/**
 * Handle curriculum extraction
 */
async function handleExtractCurriculum(
  request: BrowserRequest,
  requestId: string
): Promise<BrowserResponse> {
  const taskStart = Date.now();
  
  try {
    const { url, target, extraction } = request.parameters;
    
    logger.info('Starting curriculum extraction', {
      requestId,
      url,
      target: target?.type,
    });

    // Create browser task
    const task: BrowserTask = {
      id: uuidv4(),
      type: 'extract',
      url,
      config: {
        waitForSelector: target?.selectors?.[0] || '.curriculum, .course-list, .program-structure',
        timeout: target?.timeout || 30000,
        enableJavaScript: true,
      },
      extraction: {
        fields: extraction?.fields || [
          {
            name: 'title',
            selector: 'h1, .page-title, .program-title',
            transform: 'text',
            required: true,
          },
          {
            name: 'courses',
            selector: '.course, .subject, .module',
            transform: 'html',
            required: false,
          },
          {
            name: 'requirements',
            selector: '.requirements, .prerequisites',
            transform: 'text',
            required: false,
          },
        ],
        pagination: extraction?.pagination,
      },
    };

    // Execute browser task
    const result = await errorHandler.execute(
      () => stagehand.executeTask(task),
      {
        operationName: 'extract_curriculum',
        correlationId: requestId,
        timeout: 120000, // 2 minute timeout
      }
    );

    // Process and structure the extracted data
    const extracted: ExtractedContent[] = [{
      id: uuidv4(),
      url,
      title: result.data?.title,
      content: {
        text: result.data?.text,
        html: result.data?.html,
        structured: result.data?.structured,
      },
      metadata: {
        extractedAt: new Date().toISOString(),
        contentType: 'curriculum',
        confidence: result.confidence || 0.8,
        source: 'browser_agent',
      },
      links: result.links || [],
    }];

    const taskTime = Date.now() - taskStart;

    return {
      success: true,
      results: {
        extracted,
        summary: {
          pagesProcessed: 1,
          extractionTime: taskTime,
          successRate: 100,
        },
        metadata: {
          taskId: task.id,
          timestamp: new Date().toISOString(),
          browser: 'chromium',
          userAgent: result.userAgent || 'unknown',
        },
      },
    };

  } catch (error) {
    logger.error('Curriculum extraction failed', error as Error, { requestId });
    return createFailureResponse(Date.now() - taskStart, (error as Error).message);
  }
}

/**
 * Handle TimeEdit navigation
 */
async function handleNavigateTimeEdit(
  request: BrowserRequest,
  requestId: string
): Promise<BrowserResponse> {
  const taskStart = Date.now();
  
  try {
    const { url, navigation } = request.parameters;
    
    logger.info('Starting TimeEdit navigation', {
      requestId,
      url,
      stepsCount: navigation?.steps?.length || 0,
    });

    // Create browser task for TimeEdit
    const task: BrowserTask = {
      id: uuidv4(),
      type: 'navigate',
      url,
      config: {
        enableJavaScript: true,
        timeout: 60000,
      },
      navigation: {
        steps: navigation?.steps || [
          {
            action: 'wait',
            selector: '.timeEditContainer, #timeEditFrame',
            delay: 2000,
          },
          {
            action: 'click',
            selector: '.course-view, .schedule-view',
          },
          {
            action: 'wait',
            delay: 3000,
          },
        ],
        maxRetries: navigation?.maxRetries || 3,
      },
      extraction: {
        fields: [
          {
            name: 'schedules',
            selector: '.schedule-item, .course-schedule',
            transform: 'html',
            required: false,
          },
          {
            name: 'courses',
            selector: '.course-info, .course-details',
            transform: 'text',
            required: false,
          },
        ],
      },
    };

    // Execute navigation task
    const result = await errorHandler.execute(
      () => stagehand.executeTask(task),
      {
        operationName: 'navigate_timeedit',
        correlationId: requestId,
        timeout: 180000, // 3 minute timeout for complex navigation
      }
    );

    const extracted: ExtractedContent[] = [{
      id: uuidv4(),
      url,
      title: 'TimeEdit Schedule Data',
      content: {
        structured: {
          schedules: result.data?.schedules,
          courses: result.data?.courses,
        },
      },
      metadata: {
        extractedAt: new Date().toISOString(),
        contentType: 'timeedit',
        confidence: result.confidence || 0.7,
        source: 'browser_agent',
      },
    }];

    const taskTime = Date.now() - taskStart;

    return {
      success: true,
      results: {
        extracted,
        summary: {
          pagesProcessed: 1,
          extractionTime: taskTime,
          successRate: 100,
        },
        metadata: {
          taskId: task.id,
          timestamp: new Date().toISOString(),
          browser: 'chromium',
          userAgent: result.userAgent || 'unknown',
        },
      },
    };

  } catch (error) {
    logger.error('TimeEdit navigation failed', error as Error, { requestId });
    return createFailureResponse(Date.now() - taskStart, (error as Error).message);
  }
}

/**
 * Handle course catalog scraping
 */
async function handleScrapeCatalog(
  request: BrowserRequest,
  requestId: string
): Promise<BrowserResponse> {
  const taskStart = Date.now();
  
  try {
    const { url, extraction } = request.parameters;
    
    logger.info('Starting course catalog scraping', {
      requestId,
      url,
      maxPages: extraction?.pagination?.maxPages || 1,
    });

    const task: BrowserTask = {
      id: uuidv4(),
      type: 'extract',
      url,
      config: {
        enableJavaScript: true,
        timeout: 45000,
      },
      extraction: {
        fields: extraction?.fields || [
          {
            name: 'courseCode',
            selector: '.course-code, .course-number',
            transform: 'text',
            required: true,
          },
          {
            name: 'courseName',
            selector: '.course-name, .course-title',
            transform: 'text',
            required: true,
          },
          {
            name: 'credits',
            selector: '.credits, .credit-hours, .ects',
            transform: 'number',
            required: false,
          },
          {
            name: 'description',
            selector: '.course-description, .description',
            transform: 'text',
            required: false,
          },
        ],
        pagination: extraction?.pagination,
      },
    };

    // Execute catalog scraping
    const result = await errorHandler.execute(
      () => stagehand.executeTask(task),
      {
        operationName: 'scrape_catalog',
        correlationId: requestId,
        timeout: 300000, // 5 minute timeout for pagination
      }
    );

    // Structure the course data
    const courses = result.data?.courses || [];
    const extracted: ExtractedContent[] = courses.map((course: any, index: number) => ({
      id: uuidv4(),
      url: `${url}#course-${index}`,
      title: course.courseName || `Course ${index + 1}`,
      content: {
        structured: course,
      },
      metadata: {
        extractedAt: new Date().toISOString(),
        contentType: 'course',
        confidence: 0.9,
        source: 'browser_agent',
      },
    }));

    const taskTime = Date.now() - taskStart;

    return {
      success: true,
      results: {
        extracted,
        summary: {
          pagesProcessed: result.pagesProcessed || 1,
          extractionTime: taskTime,
          successRate: 100,
        },
        metadata: {
          taskId: task.id,
          timestamp: new Date().toISOString(),
          browser: 'chromium',
          userAgent: result.userAgent || 'unknown',
        },
      },
    };

  } catch (error) {
    logger.error('Course catalog scraping failed', error as Error, { requestId });
    return createFailureResponse(Date.now() - taskStart, (error as Error).message);
  }
}

/**
 * Handle faculty information extraction
 */
async function handleExtractFaculty(
  request: BrowserRequest,
  requestId: string
): Promise<BrowserResponse> {
  const taskStart = Date.now();
  
  try {
    const { url } = request.parameters;
    
    logger.info('Starting faculty extraction', { requestId, url });

    const task: BrowserTask = {
      id: uuidv4(),
      type: 'extract',
      url,
      config: {
        enableJavaScript: true,
        timeout: 30000,
      },
      extraction: {
        fields: [
          {
            name: 'name',
            selector: '.faculty-name, .staff-name, h1, h2',
            transform: 'text',
            required: true,
          },
          {
            name: 'title',
            selector: '.faculty-title, .position, .job-title',
            transform: 'text',
            required: false,
          },
          {
            name: 'email',
            selector: '.email, [href^="mailto:"]',
            attribute: 'href',
            transform: 'text',
            required: false,
          },
          {
            name: 'department',
            selector: '.department, .faculty-department',
            transform: 'text',
            required: false,
          },
        ],
      },
    };

    const result = await stagehand.executeTask(task);

    const extracted: ExtractedContent[] = [{
      id: uuidv4(),
      url,
      title: result.data?.name || 'Faculty Information',
      content: {
        structured: result.data,
      },
      metadata: {
        extractedAt: new Date().toISOString(),
        contentType: 'faculty',
        confidence: result.confidence || 0.8,
        source: 'browser_agent',
      },
    }];

    const taskTime = Date.now() - taskStart;

    return {
      success: true,
      results: {
        extracted,
        summary: {
          pagesProcessed: 1,
          extractionTime: taskTime,
          successRate: 100,
        },
        metadata: {
          taskId: task.id,
          timestamp: new Date().toISOString(),
          browser: 'chromium',
          userAgent: result.userAgent || 'unknown',
        },
      },
    };

  } catch (error) {
    logger.error('Faculty extraction failed', error as Error, { requestId });
    return createFailureResponse(Date.now() - taskStart, (error as Error).message);
  }
}

/**
 * Handle document downloads
 */
async function handleDownloadDocuments(
  request: BrowserRequest,
  requestId: string
): Promise<BrowserResponse> {
  const taskStart = Date.now();
  
  try {
    const { url } = request.parameters;
    
    logger.info('Starting document downloads', { requestId, url });

    const task: BrowserTask = {
      id: uuidv4(),
      type: 'download',
      url,
      config: {
        enableJavaScript: true,
        timeout: 60000,
      },
      downloads: {
        selectors: ['a[href$=".pdf"]', 'a[href$=".doc"]', 'a[href$=".docx"]', 'a[href$=".xls"]', 'a[href$=".xlsx"]'],
        maxFiles: 10,
        maxSizeBytes: 50 * 1024 * 1024, // 50MB
      },
    };

    const result = await stagehand.executeTask(task);

    // Store downloaded files in S3
    const downloadPaths: string[] = [];
    if (result.downloads) {
      for (const download of result.downloads) {
        try {
          const s3Key = `downloads/${requestId}/${download.filename}`;
          await storage.uploadFile(s3Key, download.content, {
            contentType: download.mimeType,
            metadata: {
              originalUrl: download.url,
              downloadedAt: new Date().toISOString(),
            },
          });
          downloadPaths.push(s3Key);
        } catch (uploadError) {
          logger.warn('Failed to upload downloaded file', {
            filename: download.filename,
            error: (uploadError as Error).message,
          });
        }
      }
    }

    const taskTime = Date.now() - taskStart;

    return {
      success: true,
      results: {
        extracted: [],
        downloads: downloadPaths,
        summary: {
          pagesProcessed: 1,
          extractionTime: taskTime,
          successRate: 100,
        },
        metadata: {
          taskId: task.id,
          timestamp: new Date().toISOString(),
          browser: 'chromium',
          userAgent: result.userAgent || 'unknown',
        },
      },
    };

  } catch (error) {
    logger.error('Document download failed', error as Error, { requestId });
    return createFailureResponse(Date.now() - taskStart, (error as Error).message);
  }
}

/**
 * Handle link validation
 */
async function handleValidateLinks(
  request: BrowserRequest,
  requestId: string
): Promise<BrowserResponse> {
  const taskStart = Date.now();
  
  try {
    const { dependencyResults } = request;
    
    // Get links from previous steps
    const links = extractLinksFromResults(dependencyResults);
    
    logger.info('Starting link validation', {
      requestId,
      linksCount: links.length,
    });

    const validatedLinks: any[] = [];
    let successCount = 0;

    // Validate each link
    for (const link of links.slice(0, 20)) { // Limit to 20 links
      try {
        const isValid = await stagehand.validateUrl(link.url);
        validatedLinks.push({
          url: link.url,
          text: link.text,
          valid: isValid,
          checkedAt: new Date().toISOString(),
        });
        
        if (isValid) successCount++;
        
      } catch (error) {
        validatedLinks.push({
          url: link.url,
          text: link.text,
          valid: false,
          error: (error as Error).message,
          checkedAt: new Date().toISOString(),
        });
      }
    }

    const extracted: ExtractedContent[] = [{
      id: uuidv4(),
      url: 'validation_results',
      title: 'Link Validation Results',
      content: {
        structured: {
          validatedLinks,
          summary: {
            total: validatedLinks.length,
            valid: successCount,
            invalid: validatedLinks.length - successCount,
          },
        },
      },
      metadata: {
        extractedAt: new Date().toISOString(),
        contentType: 'validation',
        confidence: 1.0,
        source: 'browser_agent',
      },
    }];

    const taskTime = Date.now() - taskStart;

    return {
      success: true,
      results: {
        extracted,
        summary: {
          pagesProcessed: validatedLinks.length,
          extractionTime: taskTime,
          successRate: (successCount / validatedLinks.length) * 100,
        },
        metadata: {
          taskId: uuidv4(),
          timestamp: new Date().toISOString(),
          browser: 'chromium',
          userAgent: 'validation-agent',
        },
      },
    };

  } catch (error) {
    logger.error('Link validation failed', error as Error, { requestId });
    return createFailureResponse(Date.now() - taskStart, (error as Error).message);
  }
}

/**
 * Handle page screenshot
 */
async function handleScreenshot(
  request: BrowserRequest,
  requestId: string
): Promise<BrowserResponse> {
  const taskStart = Date.now();
  
  try {
    const { url } = request.parameters;
    
    logger.info('Taking page screenshot', { requestId, url });

    const task: BrowserTask = {
      id: uuidv4(),
      type: 'screenshot',
      url,
      config: {
        enableJavaScript: true,
        timeout: 30000,
      },
      screenshot: {
        fullPage: true,
        quality: 80,
      },
    };

    const result = await stagehand.executeTask(task);

    // Store screenshot in S3
    const screenshotPaths: string[] = [];
    if (result.screenshot) {
      const s3Key = `screenshots/${requestId}/${Date.now()}.png`;
      await storage.uploadFile(s3Key, result.screenshot, {
        contentType: 'image/png',
        metadata: {
          url,
          takenAt: new Date().toISOString(),
        },
      });
      screenshotPaths.push(s3Key);
    }

    const taskTime = Date.now() - taskStart;

    return {
      success: true,
      results: {
        extracted: [],
        screenshots: screenshotPaths,
        summary: {
          pagesProcessed: 1,
          extractionTime: taskTime,
          successRate: 100,
        },
        metadata: {
          taskId: task.id,
          timestamp: new Date().toISOString(),
          browser: 'chromium',
          userAgent: result.userAgent || 'unknown',
        },
      },
    };

  } catch (error) {
    logger.error('Screenshot failed', error as Error, { requestId });
    return createFailureResponse(Date.now() - taskStart, (error as Error).message);
  }
}

/**
 * Check robots.txt permission
 */
async function checkRobotsPermission(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
    
    const response = await fetch(robotsUrl);
    if (!response.ok) {
      // If robots.txt doesn't exist, assume crawling is allowed
      return true;
    }
    
    const robotsText = await response.text();
    
    // Simple robots.txt parsing - check for Disallow rules
    const lines = robotsText.split('\n');
    let userAgentMatch = false;
    
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      
      if (trimmed.startsWith('user-agent:')) {
        const agent = trimmed.split(':')[1].trim();
        userAgentMatch = agent === '*' || agent === 'curriculumalignment';
      }
      
      if (userAgentMatch && trimmed.startsWith('disallow:')) {
        const disallowPath = trimmed.split(':')[1].trim();
        if (disallowPath === '/' || urlObj.pathname.startsWith(disallowPath)) {
          return false;
        }
      }
    }
    
    return true;

  } catch (error) {
    logger.warn('Failed to check robots.txt', { url, error: (error as Error).message });
    // If we can't check robots.txt, err on the side of caution but allow
    return true;
  }
}

/**
 * Extract links from dependency results
 */
function extractLinksFromResults(dependencyResults?: Record<string, any>): any[] {
  const links: any[] = [];
  
  if (dependencyResults) {
    Object.values(dependencyResults).forEach(result => {
      if (result.extracted) {
        result.extracted.forEach((item: any) => {
          if (item.links) {
            links.push(...item.links);
          }
        });
      }
    });
  }
  
  return links;
}

/**
 * Store browser results in database
 */
async function storeBrowserResults(request: BrowserRequest, response: BrowserResponse): Promise<void> {
  try {
    for (const extracted of response.results.extracted) {
      await query(`
        INSERT INTO documents (
          document_id, document_type, source_url, content_data, 
          metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (document_id) DO UPDATE SET
          content_data = $4, metadata = $5, updated_at = NOW()
      `, [
        extracted.id,
        extracted.metadata.contentType,
        extracted.url,
        JSON.stringify(extracted.content),
        JSON.stringify(extracted.metadata),
      ]);
    }

  } catch (error) {
    logger.error('Failed to store browser results', error as Error, {
      workflowId: request.workflowId,
    });
  }
}

/**
 * Create failure response
 */
function createFailureResponse(executionTime: number, error: string): BrowserResponse {
  return {
    success: false,
    results: {
      extracted: [],
      summary: {
        pagesProcessed: 0,
        extractionTime: executionTime,
        successRate: 0,
      },
      metadata: {
        taskId: uuidv4(),
        timestamp: new Date().toISOString(),
        browser: 'chromium',
        userAgent: 'unknown',
      },
    },
    error,
  };
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