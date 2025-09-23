import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../src/services/logging.service';
import { errorHandler } from '../../src/utils/error-handler';
import { costTracker } from '../../src/services/cost-tracking.service';
import { llmService } from '../../src/services/llm-config.service';
import { AnalysisEngine } from './analysis-engine';

interface AccreditationRequest {
  programData: {
    id: string;
    name: string;
    type: 'bachelor' | 'master' | 'phd';
    credits: number;
    duration: number;
    courses: Course[];
    requirements?: string[];
  };
  comparisonData?: {
    peerPrograms: PeerProgram[];
    standards?: AccreditationStandard[];
    benchmarks?: Benchmark[];
  };
  analysisOptions?: {
    depth: 'basic' | 'detailed' | 'comprehensive';
    focusAreas?: string[];
    includeRecommendations?: boolean;
    compareWithStandards?: boolean;
    generateReport?: boolean;
  };
  modelConfig?: {
    provider: 'openai' | 'anthropic' | 'cohere';
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

interface Course {
  code: string;
  name: string;
  credits: number;
  type: 'core' | 'elective' | 'prerequisite';
  description?: string;
  prerequisites?: string[];
  learningOutcomes?: string[];
  assessmentMethods?: string[];
  semester?: string;
  level?: number;
}

interface PeerProgram {
  university: string;
  programName: string;
  country: string;
  ranking?: number;
  courses: Course[];
  totalCredits: number;
  duration: number;
  specializations?: string[];
}

interface AccreditationStandard {
  organization: string;
  standard: string;
  requirements: {
    category: string;
    description: string;
    criteria: string[];
    weight?: number;
  }[];
  region: string;
  lastUpdated: Date;
}

interface Benchmark {
  metric: string;
  value: number | string;
  unit?: string;
  source: string;
  category: 'academic' | 'industry' | 'regulatory';
}

interface AccreditationResponse {
  success: boolean;
  requestId: string;
  data?: {
    analysis: CurriculumAnalysis;
    gaps: GapAnalysis[];
    recommendations: Recommendation[];
    compliance: ComplianceReport;
    benchmarking?: BenchmarkingReport;
    metadata: {
      analysisDate: string;
      programId: string;
      analysisDepth: string;
      modelUsed: string;
      processingTime: number;
      confidence: number;
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

interface CurriculumAnalysis {
  overview: {
    totalCourses: number;
    totalCredits: number;
    coreCredits: number;
    electiveCredits: number;
    distribution: { [category: string]: number };
  };
  structure: {
    progression: ProgressionAnalysis;
    balance: BalanceAnalysis;
    coherence: CoherenceAnalysis;
  };
  content: {
    topicCoverage: TopicCoverage[];
    skillsDevelopment: SkillsAnalysis;
    learningOutcomes: OutcomeAnalysis;
  };
  quality: {
    rigor: number;
    currency: number;
    relevance: number;
    overall: number;
  };
}

interface GapAnalysis {
  category: 'content' | 'structure' | 'standards' | 'industry';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  impact: string;
  affectedAreas: string[];
  evidence: string[];
  priority: number;
}

interface Recommendation {
  id: string;
  type: 'addition' | 'modification' | 'removal' | 'restructure';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  rationale: string;
  implementation: {
    effort: 'low' | 'medium' | 'high';
    timeline: string;
    resources: string[];
    dependencies?: string[];
  };
  expectedImpact: string;
  metrics?: string[];
}

interface ComplianceReport {
  overall: {
    status: 'compliant' | 'partially_compliant' | 'non_compliant';
    score: number;
    maxScore: number;
  };
  standards: {
    standardId: string;
    status: 'met' | 'partially_met' | 'not_met';
    score: number;
    requirements: {
      requirement: string;
      status: 'met' | 'partially_met' | 'not_met';
      evidence?: string[];
      gaps?: string[];
    }[];
  }[];
}

interface BenchmarkingReport {
  position: {
    rank: number;
    percentile: number;
    category: 'leading' | 'above_average' | 'average' | 'below_average';
  };
  comparisons: {
    metric: string;
    ourValue: number | string;
    peerAverage: number | string;
    bestPractice: number | string;
    gap: number;
    status: 'ahead' | 'competitive' | 'behind';
  }[];
  strengths: string[];
  weaknesses: string[];
}

interface ProgressionAnalysis {
  logical: boolean;
  prerequisites: { satisfied: number; total: number };
  levelDistribution: { [level: string]: number };
  issues: string[];
}

interface BalanceAnalysis {
  theory: number;
  practice: number;
  core: number;
  elective: number;
  assessment: string;
}

interface CoherenceAnalysis {
  thematicAlignment: number;
  skillProgression: number;
  outcomeAlignment: number;
  overall: number;
}

interface TopicCoverage {
  topic: string;
  coverage: number;
  importance: number;
  courses: string[];
  gap?: boolean;
}

interface SkillsAnalysis {
  technical: { skill: string; coverage: number; level: string }[];
  soft: { skill: string; coverage: number; level: string }[];
  industry: { skill: string; coverage: number; demand: number }[];
}

interface OutcomeAnalysis {
  clarity: number;
  measurability: number;
  alignment: number;
  coverage: number;
  outcomes: { outcome: string; courses: string[]; assessment: string }[];
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  logger.info('Accreditation Expert Agent request received', {
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
    
    let response: AccreditationResponse;

    switch (method) {
      case 'POST':
        if (pathSegments.includes('analyze')) {
          const requestBody = JSON.parse(event.body || '{}') as AccreditationRequest;
          response = await handleAnalyzeProgram(requestBody, event, requestId);
        } else if (pathSegments.includes('compare')) {
          const requestBody = JSON.parse(event.body || '{}');
          response = await handleComparePrograms(requestBody, requestId);
        } else if (pathSegments.includes('validate')) {
          const requestBody = JSON.parse(event.body || '{}');
          response = await handleValidateCompliance(requestBody, requestId);
        } else if (pathSegments.includes('benchmark')) {
          const requestBody = JSON.parse(event.body || '{}');
          response = await handleBenchmarkProgram(requestBody, requestId);
        } else {
          throw new Error(`Unsupported operation: ${event.path}`);
        }
        break;

      case 'GET':
        if (pathSegments.includes('health')) {
          response = await handleHealthCheck(requestId);
        } else if (pathSegments.includes('standards')) {
          response = await handleGetStandards(requestId);
        } else if (pathSegments.includes('templates')) {
          response = await handleGetTemplates(requestId);
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
    
    logger.info('Accreditation Expert Agent request completed', {
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
    
    logger.error('Accreditation Expert Agent error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime
    });

    await costTracker.trackCost('accreditation-expert', 'error', 0.001, {
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

async function handleAnalyzeProgram(
  request: AccreditationRequest,
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<AccreditationResponse> {
  const startTime = Date.now();

  try {
    logger.info('Analyzing curriculum program', {
      requestId,
      programId: request.programData.id,
      programName: request.programData.name,
      analysisDepth: request.analysisOptions?.depth || 'basic'
    });

    // Initialize analysis engine
    const analysisEngine = new AnalysisEngine(request.modelConfig);
    
    // Perform curriculum analysis
    const analysis = await errorHandler.execute(
      () => analysisEngine.analyzeCurriculum(request.programData, request.analysisOptions || {}),
      { operationName: 'analyze_curriculum', correlationId: requestId }
    );

    // Identify gaps
    const gaps = await errorHandler.execute(
      () => analysisEngine.identifyGaps(
        request.programData,
        request.comparisonData?.standards || [],
        request.comparisonData?.peerPrograms || []
      ),
      { operationName: 'identify_gaps', correlationId: requestId }
    );

    // Generate recommendations
    const recommendations = await errorHandler.execute(
      () => analysisEngine.generateRecommendations(
        analysis,
        gaps,
        request.analysisOptions?.focusAreas || []
      ),
      { operationName: 'generate_recommendations', correlationId: requestId }
    );

    // Check compliance
    const compliance = await errorHandler.execute(
      () => analysisEngine.checkCompliance(
        request.programData,
        request.comparisonData?.standards || []
      ),
      { operationName: 'check_compliance', correlationId: requestId }
    );

    // Perform benchmarking if requested
    let benchmarking: BenchmarkingReport | undefined;
    if (request.comparisonData?.peerPrograms && request.comparisonData.peerPrograms.length > 0) {
      benchmarking = await errorHandler.execute(
        () => analysisEngine.benchmarkProgram(
          request.programData,
          request.comparisonData!.peerPrograms,
          request.comparisonData?.benchmarks || []
        ),
        { operationName: 'benchmark_program', correlationId: requestId }
      );
    }

    const processingTime = Date.now() - startTime;
    
    // Track costs
    const costs = await costTracker.trackCost('accreditation-expert', 'analysis', 0.05, {
      requestId,
      programId: request.programData.id,
      analysisDepth: request.analysisOptions?.depth,
      processingTime,
      courseCount: request.programData.courses.length
    });

    // Calculate confidence score
    const confidence = analysisEngine.calculateConfidence(analysis, gaps, recommendations);

    logger.info('Curriculum analysis completed', {
      requestId,
      programId: request.programData.id,
      processingTime,
      gapsFound: gaps.length,
      recommendationsGenerated: recommendations.length,
      confidence
    });

    return {
      success: true,
      requestId,
      data: {
        analysis,
        gaps,
        recommendations,
        compliance,
        benchmarking,
        metadata: {
          analysisDate: new Date().toISOString(),
          programId: request.programData.id,
          analysisDepth: request.analysisOptions?.depth || 'basic',
          modelUsed: request.modelConfig?.model || 'default',
          processingTime,
          confidence
        },
        costs: {
          llmUsage: costs.details?.llm || 0,
          processing: costs.amount,
          total: costs.amount + (costs.details?.llm || 0)
        }
      }
    };

  } catch (error) {
    logger.error('Curriculum analysis failed', {
      requestId,
      programId: request.programData.id,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Curriculum analysis failed',
      details: error instanceof Error ? error.stack : undefined
    };
  }
}

async function handleComparePrograms(
  request: any,
  requestId: string
): Promise<AccreditationResponse> {
  try {
    logger.info('Comparing programs', { requestId });

    const analysisEngine = new AnalysisEngine();
    const comparison = await analysisEngine.comparePrograms(
      request.sourceProgram,
      request.targetPrograms || []
    );

    return {
      success: true,
      requestId,
      data: {
        analysis: comparison,
        gaps: [],
        recommendations: [],
        compliance: {
          overall: { status: 'compliant' as const, score: 0, maxScore: 0 },
          standards: []
        },
        metadata: {
          analysisDate: new Date().toISOString(),
          programId: request.sourceProgram?.id || 'unknown',
          analysisDepth: 'comparison',
          modelUsed: 'default',
          processingTime: 0,
          confidence: 0.8
        },
        costs: {
          llmUsage: 0.01,
          processing: 0.005,
          total: 0.015
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Program comparison failed'
    };
  }
}

async function handleValidateCompliance(
  request: any,
  requestId: string
): Promise<AccreditationResponse> {
  try {
    logger.info('Validating compliance', { requestId });

    const analysisEngine = new AnalysisEngine();
    const compliance = await analysisEngine.checkCompliance(
      request.program,
      request.standards || []
    );

    return {
      success: true,
      requestId,
      data: {
        analysis: {} as CurriculumAnalysis,
        gaps: [],
        recommendations: [],
        compliance,
        metadata: {
          analysisDate: new Date().toISOString(),
          programId: request.program?.id || 'unknown',
          analysisDepth: 'compliance',
          modelUsed: 'default',
          processingTime: 0,
          confidence: 0.9
        },
        costs: {
          llmUsage: 0.005,
          processing: 0.002,
          total: 0.007
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

async function handleBenchmarkProgram(
  request: any,
  requestId: string
): Promise<AccreditationResponse> {
  try {
    logger.info('Benchmarking program', { requestId });

    const analysisEngine = new AnalysisEngine();
    const benchmarking = await analysisEngine.benchmarkProgram(
      request.program,
      request.peerPrograms || [],
      request.benchmarks || []
    );

    return {
      success: true,
      requestId,
      data: {
        analysis: {} as CurriculumAnalysis,
        gaps: [],
        recommendations: [],
        compliance: {
          overall: { status: 'compliant' as const, score: 0, maxScore: 0 },
          standards: []
        },
        benchmarking,
        metadata: {
          analysisDate: new Date().toISOString(),
          programId: request.program?.id || 'unknown',
          analysisDepth: 'benchmarking',
          modelUsed: 'default',
          processingTime: 0,
          confidence: 0.85
        },
        costs: {
          llmUsage: 0.008,
          processing: 0.003,
          total: 0.011
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Program benchmarking failed'
    };
  }
}

async function handleHealthCheck(requestId: string): Promise<AccreditationResponse> {
  try {
    // Test LLM service availability
    const llmHealth = await llmService.healthCheck();
    
    // Test analysis engine
    const analysisEngine = new AnalysisEngine();
    await analysisEngine.healthCheck();

    const health = {
      status: 'healthy',
      services: {
        llm: llmHealth ? 'healthy' : 'degraded',
        analysisEngine: 'healthy'
      },
      timestamp: new Date().toISOString()
    };

    return {
      success: true,
      requestId,
      data: {
        analysis: health as any,
        gaps: [],
        recommendations: [],
        compliance: {
          overall: { status: 'compliant' as const, score: 0, maxScore: 0 },
          standards: []
        },
        metadata: {
          analysisDate: new Date().toISOString(),
          programId: 'health',
          analysisDepth: 'health',
          modelUsed: 'none',
          processingTime: 0,
          confidence: 1.0
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

async function handleGetStandards(requestId: string): Promise<AccreditationResponse> {
  const standards = [
    {
      organization: 'ABET',
      standard: 'Computing Accreditation Commission',
      requirements: [
        {
          category: 'Student Outcomes',
          description: 'Students must demonstrate specific abilities',
          criteria: [
            'Analyze complex computing problems',
            'Design and implement computing solutions',
            'Communicate effectively'
          ]
        }
      ],
      region: 'US',
      lastUpdated: new Date('2024-01-01')
    }
  ];

  return {
    success: true,
    requestId,
    data: {
      analysis: standards as any,
      gaps: [],
      recommendations: [],
      compliance: {
        overall: { status: 'compliant' as const, score: 0, maxScore: 0 },
        standards: []
      },
      metadata: {
        analysisDate: new Date().toISOString(),
        programId: 'standards',
        analysisDepth: 'info',
        modelUsed: 'none',
        processingTime: 0,
        confidence: 1.0
      },
      costs: {
        llmUsage: 0,
        processing: 0,
        total: 0
      }
    }
  };
}

async function handleGetTemplates(requestId: string): Promise<AccreditationResponse> {
  const templates = {
    analysisTemplate: {
      structure: ['overview', 'content', 'quality'],
      requiredFields: ['totalCourses', 'totalCredits', 'distribution']
    },
    reportTemplate: {
      sections: ['executive_summary', 'analysis', 'gaps', 'recommendations'],
      format: 'markdown'
    }
  };

  return {
    success: true,
    requestId,
    data: {
      analysis: templates as any,
      gaps: [],
      recommendations: [],
      compliance: {
        overall: { status: 'compliant' as const, score: 0, maxScore: 0 },
        standards: []
      },
      metadata: {
        analysisDate: new Date().toISOString(),
        programId: 'templates',
        analysisDepth: 'info',
        modelUsed: 'none',
        processingTime: 0,
        confidence: 1.0
      },
      costs: {
        llmUsage: 0,
        processing: 0,
        total: 0
      }
    }
  };
}

async function handleGetReport(
  reportId: string,
  requestId: string
): Promise<AccreditationResponse> {
  // Mock implementation - would retrieve from database
  return {
    success: true,
    requestId,
    data: {
      analysis: { reportId } as any,
      gaps: [],
      recommendations: [],
      compliance: {
        overall: { status: 'compliant' as const, score: 0, maxScore: 0 },
        standards: []
      },
      metadata: {
        analysisDate: new Date().toISOString(),
        programId: reportId,
        analysisDepth: 'report',
        modelUsed: 'none',
        processingTime: 0,
        confidence: 1.0
      },
      costs: {
        llmUsage: 0,
        processing: 0,
        total: 0
      }
    }
  };
}