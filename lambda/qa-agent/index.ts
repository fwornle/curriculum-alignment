import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../src/services/logging.service';
import { errorHandler } from '../../src/utils/error-handler';
import { costTracker } from '../../src/services/cost-tracking.service';
import { llmService } from '../../src/services/llm-config.service';
import { TerminologyEngine } from './terminology-engine';

interface QARequest {
  content: {
    type: 'text' | 'document' | 'curriculum' | 'course_description';
    data: string | Document | CurriculumData;
    source?: string;
    metadata?: {
      language?: string;
      domain?: string;
      version?: string;
      author?: string;
    };
  };
  qaOptions: {
    checks: QACheckType[];
    standards?: QAStandard[];
    customRules?: CustomRule[];
    terminologyDictionary?: string; // Dictionary ID or name
    outputFormat?: 'summary' | 'detailed' | 'report';
    severity?: 'all' | 'high' | 'critical';
  };
  modelConfig?: {
    provider: 'openai' | 'anthropic' | 'cohere';
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

interface Document {
  title: string;
  content: string;
  sections?: Section[];
  metadata?: any;
}

interface CurriculumData {
  programName: string;
  courses: Course[];
  requirements: string[];
  learningOutcomes: string[];
}

interface Course {
  code: string;
  name: string;
  description: string;
  credits: number;
  prerequisites?: string[];
  learningOutcomes?: string[];
}

interface Section {
  title: string;
  content: string;
  level: number;
}

type QACheckType = 
  | 'terminology'
  | 'consistency'
  | 'completeness'
  | 'clarity'
  | 'formatting'
  | 'structure'
  | 'grammar'
  | 'spelling'
  | 'style'
  | 'compliance'
  | 'accuracy'
  | 'readability';

interface QAStandard {
  name: string;
  rules: StandardRule[];
  domain: string;
  version: string;
}

interface StandardRule {
  id: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern?: string;
  validator?: string;
}

interface CustomRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  replacement?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

interface QAResponse {
  success: boolean;
  requestId: string;
  data?: {
    overall: QAOverall;
    issues: QAIssue[];
    corrections: Correction[];
    metrics: QAMetrics;
    terminology: TerminologyReport;
    recommendations: QARecommendation[];
    metadata: {
      analysisDate: string;
      contentType: string;
      checksPerformed: string[];
      processingTime: number;
      confidence: number;
      rulesApplied: number;
    };
    costs: {
      llmUsage: number;
      processing: number;
      total: number;
    };
  };
  error?: string;
  details?: any;
}

interface QAOverall {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'excellent' | 'good' | 'acceptable' | 'needs_improvement' | 'poor';
  summary: string;
  criticalIssues: number;
  totalIssues: number;
}

interface QAIssue {
  id: string;
  type: QACheckType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  location: {
    section?: string;
    line?: number;
    column?: number;
    context?: string;
  };
  suggestion: string;
  confidence: number;
  rule?: string;
  examples?: string[];
}

interface Correction {
  id: string;
  type: 'replacement' | 'insertion' | 'deletion' | 'restructure';
  original: string;
  corrected: string;
  reason: string;
  confidence: number;
  location: {
    start: number;
    end: number;
    section?: string;
  };
  automatic: boolean;
}

interface QAMetrics {
  readability: {
    fleschKincaid: number;
    grade: string;
    level: 'elementary' | 'middle' | 'high_school' | 'college' | 'graduate';
  };
  consistency: {
    terminology: number;
    formatting: number;
    style: number;
    overall: number;
  };
  completeness: {
    requiredSections: number;
    totalSections: number;
    missingElements: string[];
    completionRate: number;
  };
  quality: {
    clarity: number;
    accuracy: number;
    coherence: number;
    overall: number;
  };
}

interface TerminologyReport {
  standardTerms: number;
  nonStandardTerms: number;
  inconsistencies: TerminologyIssue[];
  suggestions: TerminologySuggestion[];
  coverage: number;
  compliance: number;
}

interface TerminologyIssue {
  term: string;
  variants: string[];
  standardForm: string;
  occurrences: number;
  severity: 'low' | 'medium' | 'high';
}

interface TerminologySuggestion {
  term: string;
  suggestion: string;
  reason: string;
  confidence: number;
  domain: string;
}

interface QARecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  actions: string[];
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  logger.info('QA Agent request received', {
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
    
    let response: QAResponse;

    switch (method) {
      case 'POST':
        if (pathSegments.includes('analyze')) {
          const requestBody = JSON.parse(event.body || '{}') as QARequest;
          response = await handleAnalyzeContent(requestBody, event, requestId);
        } else if (pathSegments.includes('check')) {
          const requestBody = JSON.parse(event.body || '{}');
          response = await handleQuickCheck(requestBody, requestId);
        } else if (pathSegments.includes('correct')) {
          const requestBody = JSON.parse(event.body || '{}');
          response = await handleAutoCorrect(requestBody, requestId);
        } else if (pathSegments.includes('validate')) {
          const requestBody = JSON.parse(event.body || '{}');
          response = await handleValidateCompliance(requestBody, requestId);
        } else {
          throw new Error(`Unsupported operation: ${event.path}`);
        }
        break;

      case 'GET':
        if (pathSegments.includes('health')) {
          response = await handleHealthCheck(requestId);
        } else if (pathSegments.includes('dictionaries')) {
          response = await handleGetDictionaries(requestId);
        } else if (pathSegments.includes('standards')) {
          response = await handleGetStandards(requestId);
        } else if (pathSegments.includes('rules')) {
          response = await handleGetRules(requestId);
        } else if (pathSegments.includes('report')) {
          const reportId = pathSegments[pathSegments.indexOf('report') + 1];
          response = await handleGetReport(reportId, requestId);
        } else {
          throw new Error(`Unsupported operation: ${event.path}`);
        }
        break;

      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    const processingTime = Date.now() - startTime;
    
    logger.info('QA Agent request completed', {
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
    
    logger.error('QA Agent error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime
    });

    await costTracker.trackCost('qa-agent', 'error', 0.001, {
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

async function handleAnalyzeContent(
  request: QARequest,
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<QAResponse> {
  const startTime = Date.now();

  try {
    logger.info('Analyzing content for QA', {
      requestId,
      contentType: request.content.type,
      checks: request.qaOptions.checks,
      outputFormat: request.qaOptions.outputFormat
    });

    // Initialize terminology engine
    const terminologyEngine = new TerminologyEngine(
      request.qaOptions.terminologyDictionary,
      request.modelConfig
    );

    // Extract text content
    const textContent = extractTextContent(request.content);
    
    // Perform QA checks
    const issues: QAIssue[] = [];
    const corrections: Correction[] = [];
    
    for (const checkType of request.qaOptions.checks) {
      const checkResults = await performQACheck(
        checkType,
        textContent,
        request.qaOptions,
        terminologyEngine,
        requestId
      );
      issues.push(...checkResults.issues);
      corrections.push(...checkResults.corrections);
    }

    // Filter by severity if specified
    const filteredIssues = filterIssuesBySeverity(issues, request.qaOptions.severity);

    // Calculate metrics
    const metrics = await calculateQAMetrics(textContent, issues, request.qaOptions);
    
    // Generate terminology report
    const terminology = await terminologyEngine.analyzeTerminology(textContent);
    
    // Calculate overall score and status
    const overall = calculateOverallQA(filteredIssues, metrics);
    
    // Generate recommendations
    const recommendations = generateQARecommendations(filteredIssues, metrics, overall);

    const processingTime = Date.now() - startTime;
    
    // Track costs
    const costs = await costTracker.trackCost('qa-agent', 'analysis', 0.03, {
      requestId,
      contentType: request.content.type,
      checksPerformed: request.qaOptions.checks.length,
      processingTime,
      issuesFound: filteredIssues.length
    });

    // Calculate confidence
    const confidence = calculateAnalysisConfidence(filteredIssues, metrics, overall);

    logger.info('QA analysis completed', {
      requestId,
      processingTime,
      issuesFound: filteredIssues.length,
      overallScore: overall.score,
      confidence
    });

    return {
      success: true,
      requestId,
      data: {
        overall,
        issues: filteredIssues,
        corrections,
        metrics,
        terminology,
        recommendations,
        metadata: {
          analysisDate: new Date().toISOString(),
          contentType: request.content.type,
          checksPerformed: request.qaOptions.checks,
          processingTime,
          confidence,
          rulesApplied: filteredIssues.length
        },
        costs: {
          llmUsage: costs.details?.llm || 0,
          processing: costs.amount,
          total: costs.amount + (costs.details?.llm || 0)
        }
      }
    };

  } catch (error) {
    logger.error('QA content analysis failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'QA content analysis failed',
      details: error instanceof Error ? error.stack : undefined
    };
  }
}

async function handleQuickCheck(
  request: any,
  requestId: string
): Promise<QAResponse> {
  try {
    logger.info('Performing quick QA check', { requestId });

    // Perform basic checks only
    const issues = await performBasicChecks(request.content || '');
    const overall = {
      score: Math.max(0, 100 - issues.length * 5),
      grade: 'B' as const,
      status: 'good' as const,
      summary: `Quick check found ${issues.length} issues`,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      totalIssues: issues.length
    };

    return {
      success: true,
      requestId,
      data: {
        overall,
        issues,
        corrections: [],
        metrics: {} as QAMetrics,
        terminology: {
          standardTerms: 0,
          nonStandardTerms: 0,
          inconsistencies: [],
          suggestions: [],
          coverage: 0,
          compliance: 0
        },
        recommendations: [],
        metadata: {
          analysisDate: new Date().toISOString(),
          contentType: 'text',
          checksPerformed: ['basic'],
          processingTime: 100,
          confidence: 0.8,
          rulesApplied: issues.length
        },
        costs: {
          llmUsage: 0.001,
          processing: 0.005,
          total: 0.006
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Quick check failed'
    };
  }
}

async function handleAutoCorrect(
  request: any,
  requestId: string
): Promise<QAResponse> {
  try {
    logger.info('Performing auto-correction', { requestId });

    const terminologyEngine = new TerminologyEngine();
    const corrections = await terminologyEngine.autoCorrect(request.content || '');

    return {
      success: true,
      requestId,
      data: {
        overall: {
          score: 95,
          grade: 'A',
          status: 'excellent',
          summary: `Applied ${corrections.length} automatic corrections`,
          criticalIssues: 0,
          totalIssues: corrections.length
        },
        issues: [],
        corrections,
        metrics: {} as QAMetrics,
        terminology: {
          standardTerms: 0,
          nonStandardTerms: 0,
          inconsistencies: [],
          suggestions: [],
          coverage: 0,
          compliance: 0
        },
        recommendations: [],
        metadata: {
          analysisDate: new Date().toISOString(),
          contentType: 'text',
          checksPerformed: ['auto_correct'],
          processingTime: 200,
          confidence: 0.9,
          rulesApplied: corrections.length
        },
        costs: {
          llmUsage: 0.005,
          processing: 0.008,
          total: 0.013
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Auto-correction failed'
    };
  }
}

async function handleValidateCompliance(
  request: any,
  requestId: string
): Promise<QAResponse> {
  try {
    logger.info('Validating compliance', { requestId });

    const complianceIssues = await validateAgainstStandards(
      request.content || '',
      request.standards || []
    );

    const overall = {
      score: Math.max(0, 100 - complianceIssues.length * 10),
      grade: complianceIssues.length === 0 ? 'A' as const : 'C' as const,
      status: complianceIssues.length === 0 ? 'excellent' as const : 'needs_improvement' as const,
      summary: `Compliance check found ${complianceIssues.length} violations`,
      criticalIssues: complianceIssues.filter(i => i.severity === 'critical').length,
      totalIssues: complianceIssues.length
    };

    return {
      success: true,
      requestId,
      data: {
        overall,
        issues: complianceIssues,
        corrections: [],
        metrics: {} as QAMetrics,
        terminology: {
          standardTerms: 0,
          nonStandardTerms: 0,
          inconsistencies: [],
          suggestions: [],
          coverage: 0,
          compliance: overall.score
        },
        recommendations: [],
        metadata: {
          analysisDate: new Date().toISOString(),
          contentType: 'compliance',
          checksPerformed: ['compliance'],
          processingTime: 150,
          confidence: 0.95,
          rulesApplied: complianceIssues.length
        },
        costs: {
          llmUsage: 0.003,
          processing: 0.005,
          total: 0.008
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Compliance validation failed'
    };
  }
}

async function handleHealthCheck(requestId: string): Promise<QAResponse> {
  try {
    // Test terminology engine
    const terminologyEngine = new TerminologyEngine();
    await terminologyEngine.healthCheck();

    // Test LLM service
    const llmHealth = await llmService.healthCheck();

    const health = {
      status: 'healthy',
      services: {
        terminologyEngine: 'healthy',
        llm: llmHealth ? 'healthy' : 'degraded'
      },
      timestamp: new Date().toISOString()
    };

    return {
      success: true,
      requestId,
      data: {
        overall: {
          score: 100,
          grade: 'A',
          status: 'excellent',
          summary: 'All QA services operational',
          criticalIssues: 0,
          totalIssues: 0
        },
        issues: [],
        corrections: [],
        metrics: {} as QAMetrics,
        terminology: {
          standardTerms: 0,
          nonStandardTerms: 0,
          inconsistencies: [],
          suggestions: [],
          coverage: 0,
          compliance: 0
        },
        recommendations: [],
        metadata: {
          analysisDate: new Date().toISOString(),
          contentType: 'health',
          checksPerformed: ['health'],
          processingTime: 0,
          confidence: 1.0,
          rulesApplied: 0
        },
        costs: {
          llmUsage: 0,
          processing: 0,
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

async function handleGetDictionaries(requestId: string): Promise<QAResponse> {
  const dictionaries = [
    {
      id: 'academic_cs',
      name: 'Academic Computer Science',
      terms: 2500,
      domain: 'computer_science',
      lastUpdated: '2024-01-01'
    },
    {
      id: 'general_academic',
      name: 'General Academic',
      terms: 5000,
      domain: 'academic',
      lastUpdated: '2024-01-01'
    }
  ];

  return {
    success: true,
    requestId,
    data: {
      overall: {
        score: 100,
        grade: 'A',
        status: 'excellent',
        summary: 'Dictionaries available',
        criticalIssues: 0,
        totalIssues: 0
      },
      issues: [],
      corrections: [],
      metrics: {} as QAMetrics,
      terminology: {
        standardTerms: 0,
        nonStandardTerms: 0,
        inconsistencies: [],
        suggestions: [],
        coverage: 0,
        compliance: 0
      },
      recommendations: [],
      metadata: {
        analysisDate: new Date().toISOString(),
        contentType: 'dictionaries',
        checksPerformed: ['info'],
        processingTime: 0,
        confidence: 1.0,
        rulesApplied: 0
      },
      costs: {
        llmUsage: 0,
        processing: 0,
        total: 0
      }
    }
  };
}

async function handleGetStandards(requestId: string): Promise<QAResponse> {
  const standards = [
    {
      name: 'Academic Writing Standard',
      rules: [
        { id: 'aw1', description: 'Use clear, concise language', category: 'style', severity: 'medium' },
        { id: 'aw2', description: 'Maintain consistent terminology', category: 'terminology', severity: 'high' }
      ],
      domain: 'academic',
      version: '1.0'
    }
  ];

  return {
    success: true,
    requestId,
    data: {
      overall: {
        score: 100,
        grade: 'A',
        status: 'excellent',
        summary: 'Standards available',
        criticalIssues: 0,
        totalIssues: 0
      },
      issues: [],
      corrections: [],
      metrics: {} as QAMetrics,
      terminology: {
        standardTerms: 0,
        nonStandardTerms: 0,
        inconsistencies: [],
        suggestions: [],
        coverage: 0,
        compliance: 0
      },
      recommendations: [],
      metadata: {
        analysisDate: new Date().toISOString(),
        contentType: 'standards',
        checksPerformed: ['info'],
        processingTime: 0,
        confidence: 1.0,
        rulesApplied: 0
      },
      costs: {
        llmUsage: 0,
        processing: 0,
        total: 0
      }
    }
  };
}

async function handleGetRules(requestId: string): Promise<QAResponse> {
  return handleGetStandards(requestId); // Same as standards for now
}

async function handleGetReport(
  reportId: string,
  requestId: string
): Promise<QAResponse> {
  // Mock implementation - would retrieve from database
  return {
    success: true,
    requestId,
    data: {
      overall: {
        score: 85,
        grade: 'B',
        status: 'good',
        summary: `Report ${reportId}`,
        criticalIssues: 0,
        totalIssues: 3
      },
      issues: [],
      corrections: [],
      metrics: {} as QAMetrics,
      terminology: {
        standardTerms: 0,
        nonStandardTerms: 0,
        inconsistencies: [],
        suggestions: [],
        coverage: 0,
        compliance: 0
      },
      recommendations: [],
      metadata: {
        analysisDate: new Date().toISOString(),
        contentType: 'report',
        checksPerformed: ['report'],
        processingTime: 0,
        confidence: 1.0,
        rulesApplied: 0
      },
      costs: {
        llmUsage: 0,
        processing: 0,
        total: 0
      }
    }
  };
}

// Helper functions
function extractTextContent(content: any): string {
  if (typeof content.data === 'string') {
    return content.data;
  }
  
  if (content.data && typeof content.data === 'object') {
    if (content.data.content) return content.data.content;
    if (content.data.courses) {
      return content.data.courses.map((course: any) => 
        `${course.name}: ${course.description || ''}`
      ).join('\n');
    }
  }
  
  return JSON.stringify(content.data || '');
}

async function performQACheck(
  checkType: QACheckType,
  content: string,
  options: any,
  terminologyEngine: TerminologyEngine,
  requestId: string
): Promise<{ issues: QAIssue[]; corrections: Correction[] }> {
  const issues: QAIssue[] = [];
  const corrections: Correction[] = [];

  try {
    switch (checkType) {
      case 'terminology':
        const termResults = await terminologyEngine.checkTerminology(content);
        issues.push(...termResults.issues);
        corrections.push(...termResults.corrections);
        break;
        
      case 'grammar':
        const grammarIssues = await checkGrammar(content);
        issues.push(...grammarIssues);
        break;
        
      case 'spelling':
        const spellingIssues = await checkSpelling(content);
        issues.push(...spellingIssues);
        break;
        
      case 'consistency':
        const consistencyIssues = checkConsistency(content);
        issues.push(...consistencyIssues);
        break;
        
      case 'formatting':
        const formattingIssues = checkFormatting(content);
        issues.push(...formattingIssues);
        break;
        
      case 'readability':
        const readabilityIssues = checkReadability(content);
        issues.push(...readabilityIssues);
        break;
        
      default:
        logger.warn('Unknown QA check type', { checkType, requestId });
    }
  } catch (error) {
    logger.error('QA check failed', {
      checkType,
      error: error instanceof Error ? error.message : String(error),
      requestId
    });
  }

  return { issues, corrections };
}

async function performBasicChecks(content: string): Promise<QAIssue[]> {
  const issues: QAIssue[] = [];
  
  // Basic length check
  if (content.length < 100) {
    issues.push({
      id: 'basic_1',
      type: 'completeness',
      severity: 'medium',
      category: 'length',
      description: 'Content appears too short',
      location: { context: 'entire document' },
      suggestion: 'Consider expanding the content',
      confidence: 0.8
    });
  }
  
  // Basic structure check
  if (!content.includes('\n') && content.length > 500) {
    issues.push({
      id: 'basic_2',
      type: 'formatting',
      severity: 'low',
      category: 'structure',
      description: 'No paragraph breaks found',
      location: { context: 'entire document' },
      suggestion: 'Add paragraph breaks for better readability',
      confidence: 0.9
    });
  }
  
  return issues;
}

async function checkGrammar(content: string): Promise<QAIssue[]> {
  // Mock grammar checking - in production use a service like LanguageTool
  const issues: QAIssue[] = [];
  
  // Simple passive voice detection
  const passivePattern = /\b(is|are|was|were|been|being)\s+\w+ed\b/gi;
  const matches = content.match(passivePattern);
  
  if (matches && matches.length > content.split(' ').length * 0.2) {
    issues.push({
      id: 'grammar_1',
      type: 'style',
      severity: 'low',
      category: 'voice',
      description: 'Excessive use of passive voice',
      location: { context: 'throughout document' },
      suggestion: 'Consider using more active voice constructions',
      confidence: 0.7
    });
  }
  
  return issues;
}

async function checkSpelling(content: string): Promise<QAIssue[]> {
  // Mock spelling checking - in production use a spelling service
  const issues: QAIssue[] = [];
  
  // Simple check for common misspellings
  const misspellings = {
    'teh': 'the',
    'recieve': 'receive',
    'seperate': 'separate',
    'definately': 'definitely'
  };
  
  for (const [wrong, correct] of Object.entries(misspellings)) {
    if (content.toLowerCase().includes(wrong)) {
      issues.push({
        id: `spelling_${wrong}`,
        type: 'spelling',
        severity: 'medium',
        category: 'spelling',
        description: `Misspelled word: "${wrong}"`,
        location: { context: `Should be "${correct}"` },
        suggestion: `Replace "${wrong}" with "${correct}"`,
        confidence: 0.95
      });
    }
  }
  
  return issues;
}

function checkConsistency(content: string): QAIssue[] {
  const issues: QAIssue[] = [];
  
  // Check for inconsistent capitalization
  const sentences = content.split(/[.!?]+/);
  let inconsistentCaps = 0;
  
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    if (trimmed.length > 0 && /^[a-z]/.test(trimmed)) {
      inconsistentCaps++;
    }
  });
  
  if (inconsistentCaps > sentences.length * 0.1) {
    issues.push({
      id: 'consistency_1',
      type: 'consistency',
      severity: 'medium',
      category: 'capitalization',
      description: 'Inconsistent sentence capitalization',
      location: { context: 'multiple sentences' },
      suggestion: 'Ensure all sentences start with capital letters',
      confidence: 0.8
    });
  }
  
  return issues;
}

function checkFormatting(content: string): QAIssue[] {
  const issues: QAIssue[] = [];
  
  // Check for multiple spaces
  if (content.includes('  ')) {
    issues.push({
      id: 'formatting_1',
      type: 'formatting',
      severity: 'low',
      category: 'spacing',
      description: 'Multiple consecutive spaces found',
      location: { context: 'various locations' },
      suggestion: 'Use single spaces between words',
      confidence: 0.95
    });
  }
  
  // Check for inconsistent line endings
  const crlfCount = (content.match(/\r\n/g) || []).length;
  const lfCount = (content.match(/(?<!\r)\n/g) || []).length;
  
  if (crlfCount > 0 && lfCount > 0) {
    issues.push({
      id: 'formatting_2',
      type: 'formatting',
      severity: 'low',
      category: 'line_endings',
      description: 'Inconsistent line endings',
      location: { context: 'throughout document' },
      suggestion: 'Use consistent line endings (LF or CRLF)',
      confidence: 0.9
    });
  }
  
  return issues;
}

function checkReadability(content: string): QAIssue[] {
  const issues: QAIssue[] = [];
  
  // Simple readability check based on sentence length
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordsPerSentence = sentences.reduce((sum, sentence) => {
    return sum + sentence.trim().split(/\s+/).length;
  }, 0) / sentences.length;
  
  if (avgWordsPerSentence > 25) {
    issues.push({
      id: 'readability_1',
      type: 'readability',
      severity: 'medium',
      category: 'sentence_length',
      description: 'Sentences are too long on average',
      location: { context: `Average: ${avgWordsPerSentence.toFixed(1)} words` },
      suggestion: 'Break down complex sentences for better readability',
      confidence: 0.8
    });
  }
  
  return issues;
}

function filterIssuesBySeverity(issues: QAIssue[], severity?: string): QAIssue[] {
  if (!severity || severity === 'all') return issues;
  
  const severityLevels = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
  const minLevel = severityLevels[severity as keyof typeof severityLevels] || 1;
  
  return issues.filter(issue => {
    const issueLevel = severityLevels[issue.severity];
    return issueLevel >= minLevel;
  });
}

async function calculateQAMetrics(content: string, issues: QAIssue[], options: any): Promise<QAMetrics> {
  // Calculate Flesch-Kincaid readability
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const words = content.split(/\s+/).filter(w => w.length > 0).length;
  const syllables = words * 1.5; // Rough estimate
  
  const fleschKincaid = sentences > 0 && words > 0 ? 
    206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words)) : 0;
  
  let grade = 'College';
  if (fleschKincaid >= 90) grade = 'Elementary';
  else if (fleschKincaid >= 80) grade = 'Middle School';
  else if (fleschKincaid >= 70) grade = 'High School';
  else if (fleschKincaid >= 60) grade = 'College';
  else grade = 'Graduate';
  
  const terminologyIssues = issues.filter(i => i.type === 'terminology').length;
  const formattingIssues = issues.filter(i => i.type === 'formatting').length;
  const styleIssues = issues.filter(i => i.type === 'style').length;
  
  return {
    readability: {
      fleschKincaid: Math.round(fleschKincaid),
      grade,
      level: grade.toLowerCase().replace(' ', '_') as any
    },
    consistency: {
      terminology: Math.max(0, 100 - terminologyIssues * 10),
      formatting: Math.max(0, 100 - formattingIssues * 15),
      style: Math.max(0, 100 - styleIssues * 12),
      overall: Math.max(0, 100 - (terminologyIssues + formattingIssues + styleIssues) * 5)
    },
    completeness: {
      requiredSections: 5, // Mock
      totalSections: 5,
      missingElements: [],
      completionRate: 100
    },
    quality: {
      clarity: Math.max(0, 100 - issues.filter(i => i.type === 'clarity').length * 20),
      accuracy: Math.max(0, 100 - issues.filter(i => i.type === 'accuracy').length * 25),
      coherence: Math.max(0, 100 - issues.filter(i => i.category === 'structure').length * 15),
      overall: Math.max(0, 100 - issues.length * 3)
    }
  };
}

function calculateOverallQA(issues: QAIssue[], metrics: QAMetrics): QAOverall {
  const criticalIssues = issues.filter(i => i.severity === 'critical').length;
  const totalIssues = issues.length;
  
  let score = 100 - (criticalIssues * 20) - (totalIssues * 2);
  score = Math.max(0, Math.min(100, score));
  
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  let status: 'excellent' | 'good' | 'acceptable' | 'needs_improvement' | 'poor';
  
  if (score >= 90) { grade = 'A'; status = 'excellent'; }
  else if (score >= 80) { grade = 'B'; status = 'good'; }
  else if (score >= 70) { grade = 'C'; status = 'acceptable'; }
  else if (score >= 60) { grade = 'D'; status = 'needs_improvement'; }
  else { grade = 'F'; status = 'poor'; }
  
  const summary = `Quality score: ${score}/100 with ${totalIssues} issues (${criticalIssues} critical)`;
  
  return {
    score,
    grade,
    status,
    summary,
    criticalIssues,
    totalIssues
  };
}

function generateQARecommendations(issues: QAIssue[], metrics: QAMetrics, overall: QAOverall): QARecommendation[] {
  const recommendations: QARecommendation[] = [];
  
  // Critical issues first
  if (overall.criticalIssues > 0) {
    recommendations.push({
      id: 'rec_critical',
      priority: 'critical',
      category: 'quality',
      title: 'Address Critical Issues',
      description: `Fix ${overall.criticalIssues} critical quality issues immediately`,
      actions: ['Review critical issues', 'Apply fixes', 'Re-validate content'],
      expectedImpact: 'Significant improvement in content quality',
      effort: 'high'
    });
  }
  
  // Readability improvements
  if (metrics.readability?.fleschKincaid < 60) {
    recommendations.push({
      id: 'rec_readability',
      priority: 'medium',
      category: 'readability',
      title: 'Improve Readability',
      description: 'Content readability is below recommended level',
      actions: ['Simplify complex sentences', 'Use shorter paragraphs', 'Add transition words'],
      expectedImpact: 'Better user comprehension and engagement',
      effort: 'medium'
    });
  }
  
  // Consistency improvements
  if (metrics.consistency?.overall < 80) {
    recommendations.push({
      id: 'rec_consistency',
      priority: 'medium',
      category: 'consistency',
      title: 'Improve Consistency',
      description: 'Standardize terminology and formatting throughout',
      actions: ['Create style guide', 'Apply consistent formatting', 'Standardize terminology'],
      expectedImpact: 'More professional and coherent content',
      effort: 'medium'
    });
  }
  
  return recommendations;
}

async function validateAgainstStandards(content: string, standards: any[]): Promise<QAIssue[]> {
  const issues: QAIssue[] = [];
  
  // Mock compliance validation
  for (const standard of standards) {
    for (const rule of standard.rules || []) {
      if (rule.pattern && content.search(new RegExp(rule.pattern, 'i')) === -1) {
        issues.push({
          id: `compliance_${rule.id}`,
          type: 'compliance',
          severity: rule.severity || 'medium',
          category: rule.category || 'compliance',
          description: `Compliance violation: ${rule.description}`,
          location: { context: 'document structure' },
          suggestion: `Ensure content meets ${standard.name} requirements`,
          confidence: 0.9,
          rule: rule.id
        });
      }
    }
  }
  
  return issues;
}

function calculateAnalysisConfidence(issues: QAIssue[], metrics: QAMetrics, overall: QAOverall): number {
  let confidence = 0.8; // Base confidence
  
  // Increase confidence if fewer issues found
  if (issues.length < 5) confidence += 0.1;
  
  // Increase confidence if no critical issues
  if (overall.criticalIssues === 0) confidence += 0.05;
  
  // Decrease confidence if many low-confidence issues
  const lowConfidenceIssues = issues.filter(i => i.confidence < 0.7).length;
  if (lowConfidenceIssues > issues.length * 0.3) confidence -= 0.1;
  
  return Math.max(0.5, Math.min(1.0, confidence));
}