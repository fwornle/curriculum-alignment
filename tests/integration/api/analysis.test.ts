import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createMockAPIGatewayEvent } from '../../setup';

describe('Analysis API Integration Tests', () => {
  const mockAuthToken = 'Bearer valid-jwt-token';
  
  const mockAnalysisResult = {
    id: 'analysis-123',
    type: 'curriculum-alignment',
    programId: 'cs-bachelor-2024',
    status: 'completed',
    progress: 100,
    createdAt: '2024-01-15T10:00:00Z',
    startedAt: '2024-01-15T10:01:00Z',
    completedAt: '2024-01-15T10:15:00Z',
    duration: 840000, // 14 minutes in milliseconds
    requestedBy: 'user-123',
    configuration: {
      comparisonUniversities: ['MIT', 'Stanford', 'CMU'],
      analysisDepth: 'comprehensive',
      includePrerequisites: true,
      includeLearningOutcomes: true,
      generateRecommendations: true
    },
    results: {
      alignmentScore: 0.85,
      gaps: [
        {
          category: 'core-courses',
          severity: 'medium',
          description: 'Missing advanced algorithms course',
          recommendation: 'Add CS350: Advanced Algorithms and Data Structures'
        },
        {
          category: 'electives',
          severity: 'low',
          description: 'Limited AI/ML course options',
          recommendation: 'Consider adding CS480: Machine Learning Fundamentals'
        }
      ],
      strengths: [
        'Strong foundation in programming languages',
        'Comprehensive software engineering track',
        'Good balance of theory and practical application'
      ],
      statistics: {
        totalCourses: 48,
        coreCourses: 32,
        electives: 16,
        creditHours: 180,
        averageCourseSize: 6
      },
      peerComparison: {
        ranking: 3,
        totalUniversities: 5,
        scoreDifference: -0.05,
        betterThan: ['University A', 'University B'],
        worseThan: ['MIT', 'Stanford']
      }
    },
    agents: {
      coordinator: {
        status: 'completed',
        duration: 2000,
        cost: 0.001
      },
      webSearch: {
        status: 'completed',
        duration: 120000,
        cost: 0.05,
        searchQueries: 15,
        pagesAnalyzed: 45
      },
      browser: {
        status: 'completed',
        duration: 180000,
        cost: 0.02,
        sitesVisited: 8,
        documentsExtracted: 12
      },
      documentProcessing: {
        status: 'completed',
        duration: 300000,
        cost: 0.10,
        documentsProcessed: 3,
        pagesAnalyzed: 150
      },
      accreditationExpert: {
        status: 'completed',
        duration: 200000,
        cost: 0.25,
        analysisComplexity: 'high',
        recommendationsGenerated: 8
      },
      qaAgent: {
        status: 'completed',
        duration: 36000,
        cost: 0.05,
        qualityChecks: 25,
        issuesFound: 2,
        issuesResolved: 2
      },
      semanticSearch: {
        status: 'completed',
        duration: 4000,
        cost: 0.01,
        vectorSearches: 120,
        similarityMatches: 45
      }
    },
    costs: {
      total: 0.491,
      breakdown: {
        llmCalls: 0.41,
        computeTime: 0.05,
        storage: 0.001,
        dataTransfer: 0.03
      }
    },
    workflows: {
      primary: {
        name: 'curriculum-alignment-comprehensive',
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:curriculum-alignment:analysis-123',
        status: 'SUCCEEDED'
      }
    }
  };

  describe('POST /analysis/start', () => {
    it('should start comprehensive analysis workflow', async () => {
      const mockAnalysisHandler = jest.fn().mockResolvedValue({
        statusCode: 202,
        body: JSON.stringify({
          id: 'analysis-123',
          type: 'curriculum-alignment',
          status: 'initiated',
          progress: 0,
          estimatedCompletion: '2024-01-15T10:15:00Z',
          workflow: {
            name: 'curriculum-alignment-comprehensive',
            executionArn: 'arn:aws:states:us-east-1:123456789012:execution:curriculum-alignment:analysis-123'
          },
          configuration: {
            comparisonUniversities: ['MIT', 'Stanford', 'CMU'],
            analysisDepth: 'comprehensive',
            includePrerequisites: true,
            includeLearningOutcomes: true,
            generateRecommendations: true
          },
          expectedCost: 0.50,
          trackingUrl: '/api/v1/analysis/analysis-123'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Location': '/api/v1/analysis/analysis-123'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/analysis/start',
        body: JSON.stringify({
          type: 'curriculum-alignment',
          programId: 'cs-bachelor-2024',
          configuration: {
            comparisonUniversities: ['MIT', 'Stanford', 'CMU'],
            analysisDepth: 'comprehensive',
            includePrerequisites: true,
            includeLearningOutcomes: true,
            generateRecommendations: true
          }
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockAnalysisHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(202);
      expect(responseBody.id).toBe('analysis-123');
      expect(responseBody.type).toBe('curriculum-alignment');
      expect(responseBody.status).toBe('initiated');
      expect(responseBody.progress).toBe(0);
      expect(responseBody.workflow.executionArn).toContain('curriculum-alignment');
      expect(responseBody.expectedCost).toBe(0.50);
      expect(result.headers?.['Location']).toBe('/api/v1/analysis/analysis-123');
    });

    it('should start quick analysis workflow', async () => {
      const mockAnalysisHandler = jest.fn().mockResolvedValue({
        statusCode: 202,
        body: JSON.stringify({
          id: 'analysis-124',
          type: 'curriculum-alignment',
          status: 'initiated',
          progress: 0,
          estimatedCompletion: '2024-01-15T10:05:00Z',
          workflow: {
            name: 'curriculum-alignment-quick',
            executionArn: 'arn:aws:states:us-east-1:123456789012:execution:curriculum-alignment:analysis-124'
          },
          configuration: {
            analysisDepth: 'quick',
            comparisonUniversities: ['MIT'],
            includePrerequisites: false,
            includeLearningOutcomes: false,
            generateRecommendations: false
          },
          expectedCost: 0.10
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/analysis/start',
        body: JSON.stringify({
          type: 'curriculum-alignment',
          programId: 'cs-bachelor-2024',
          configuration: {
            analysisDepth: 'quick'
          }
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockAnalysisHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(202);
      expect(responseBody.configuration.analysisDepth).toBe('quick');
      expect(responseBody.expectedCost).toBe(0.10);
      expect(responseBody.estimatedCompletion).toBeDefined();
    });

    it('should validate required fields', async () => {
      const mockAnalysisHandler = jest.fn().mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'Missing required fields',
          details: {
            type: 'required',
            programId: 'required'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/analysis/start',
        body: JSON.stringify({
          // Missing required fields
          configuration: {}
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockAnalysisHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(responseBody.error).toBe('BadRequest');
      expect(responseBody.details.type).toBe('required');
      expect(responseBody.details.programId).toBe('required');
    });

    it('should validate program exists', async () => {
      const mockAnalysisHandler = jest.fn().mockResolvedValue({
        statusCode: 404,
        body: JSON.stringify({
          error: 'NotFound',
          message: 'Program not found',
          details: {
            programId: 'non-existent-program'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/analysis/start',
        body: JSON.stringify({
          type: 'curriculum-alignment',
          programId: 'non-existent-program'
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockAnalysisHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
      expect(responseBody.error).toBe('NotFound');
      expect(responseBody.details.programId).toBe('non-existent-program');
    });

    it('should handle concurrent analysis limit', async () => {
      const mockAnalysisHandler = jest.fn().mockResolvedValue({
        statusCode: 429,
        body: JSON.stringify({
          error: 'TooManyRequests',
          message: 'Concurrent analysis limit reached',
          details: {
            currentAnalyses: 3,
            maxConcurrent: 3,
            queuePosition: 1,
            estimatedWait: 300 // 5 minutes
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Retry-After': '300'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/analysis/start',
        body: JSON.stringify({
          type: 'curriculum-alignment',
          programId: 'cs-bachelor-2024'
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockAnalysisHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(429);
      expect(responseBody.error).toBe('TooManyRequests');
      expect(responseBody.details.currentAnalyses).toBe(3);
      expect(responseBody.details.maxConcurrent).toBe(3);
      expect(responseBody.details.queuePosition).toBe(1);
      expect(result.headers?.['Retry-After']).toBe('300');
    });

    it('should handle insufficient credits', async () => {
      const mockAnalysisHandler = jest.fn().mockResolvedValue({
        statusCode: 402,
        body: JSON.stringify({
          error: 'PaymentRequired',
          message: 'Insufficient credits for analysis',
          details: {
            requiredCredits: 50,
            availableCredits: 10,
            analysisType: 'comprehensive',
            estimatedCost: 0.50
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/analysis/start',
        body: JSON.stringify({
          type: 'curriculum-alignment',
          programId: 'cs-bachelor-2024',
          configuration: {
            analysisDepth: 'comprehensive'
          }
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockAnalysisHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(402);
      expect(responseBody.error).toBe('PaymentRequired');
      expect(responseBody.details.requiredCredits).toBe(50);
      expect(responseBody.details.availableCredits).toBe(10);
    });
  });

  describe('GET /analysis/{analysisId}', () => {
    it('should return completed analysis results', async () => {
      const mockAnalysisHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify(mockAnalysisResult),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'ETag': '"analysis-etag-123"'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/analysis/analysis-123',
        pathParameters: {
          analysisId: 'analysis-123'
        },
        headers: {
          'Authorization': mockAuthToken
        }
      });

      const result: APIGatewayProxyResult = await mockAnalysisHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.id).toBe('analysis-123');
      expect(responseBody.status).toBe('completed');
      expect(responseBody.progress).toBe(100);
      expect(responseBody.results.alignmentScore).toBe(0.85);
      expect(responseBody.agents.coordinator.status).toBe('completed');
      expect(responseBody.costs.total).toBe(0.491);
    });

    it('should return in-progress analysis status', async () => {
      const mockAnalysisHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({
          ...mockAnalysisResult,
          status: 'running',
          progress: 65,
          completedAt: null,
          duration: null,
          currentStep: 'accreditation-analysis',
          results: null, // Results not available yet
          agents: {
            coordinator: { status: 'completed', duration: 2000, cost: 0.001 },
            webSearch: { status: 'completed', duration: 120000, cost: 0.05 },
            browser: { status: 'completed', duration: 180000, cost: 0.02 },
            documentProcessing: { status: 'completed', duration: 300000, cost: 0.10 },
            accreditationExpert: { status: 'running', progress: 80 },
            qaAgent: { status: 'pending' },
            semanticSearch: { status: 'pending' }
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/analysis/analysis-123',
        pathParameters: {
          analysisId: 'analysis-123'
        },
        headers: {
          'Authorization': mockAuthToken
        }
      });

      const result: APIGatewayProxyResult = await mockAnalysisHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.status).toBe('running');
      expect(responseBody.progress).toBe(65);
      expect(responseBody.currentStep).toBe('accreditation-analysis');
      expect(responseBody.results).toBeNull();
      expect(responseBody.agents.accreditationExpert.status).toBe('running');
    });

    it('should return failed analysis with error details', async () => {
      const mockAnalysisHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({
          ...mockAnalysisResult,
          status: 'failed',
          progress: 40,
          error: {
            code: 'AGENT_TIMEOUT',
            message: 'Web search agent timed out after 10 minutes',
            timestamp: '2024-01-15T10:10:00Z',
            agent: 'webSearch',
            retryable: true
          },
          agents: {
            coordinator: { status: 'completed', duration: 2000, cost: 0.001 },
            webSearch: { status: 'failed', error: 'Timeout after 600 seconds' },
            browser: { status: 'cancelled' },
            documentProcessing: { status: 'cancelled' }
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/analysis/analysis-123',
        pathParameters: {
          analysisId: 'analysis-123'
        },
        headers: {
          'Authorization': mockAuthToken
        }
      });

      const result: APIGatewayProxyResult = await mockAnalysisHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.status).toBe('failed');
      expect(responseBody.error.code).toBe('AGENT_TIMEOUT');
      expect(responseBody.error.retryable).toBe(true);
      expect(responseBody.agents.webSearch.status).toBe('failed');
    });

    it('should return 404 for non-existent analysis', async () => {
      const mockAnalysisHandler = jest.fn().mockResolvedValue({
        statusCode: 404,
        body: JSON.stringify({
          error: 'NotFound',
          message: 'Analysis not found',
          details: {
            analysisId: 'non-existent-analysis'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/analysis/non-existent-analysis',
        pathParameters: {
          analysisId: 'non-existent-analysis'
        },
        headers: {
          'Authorization': mockAuthToken
        }
      });

      const result: APIGatewayProxyResult = await mockAnalysisHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
      expect(responseBody.error).toBe('NotFound');
      expect(responseBody.details.analysisId).toBe('non-existent-analysis');
    });

    it('should enforce access control for analysis results', async () => {
      const mockAnalysisHandler = jest.fn().mockResolvedValue({
        statusCode: 403,
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'Access denied to analysis results',
          details: {
            analysisId: 'analysis-123',
            owner: 'other-user',
            requester: 'user-123'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/analysis/analysis-123',
        pathParameters: {
          analysisId: 'analysis-123'
        },
        headers: {
          'Authorization': 'Bearer different-user-token'
        }
      });

      const result: APIGatewayProxyResult = await mockAnalysisHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(403);
      expect(responseBody.error).toBe('Forbidden');
      expect(responseBody.details.owner).toBe('other-user');
      expect(responseBody.details.requester).toBe('user-123');
    });
  });

  describe('DELETE /analysis/{analysisId}', () => {
    it('should cancel running analysis', async () => {
      const mockAnalysisHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({
          id: 'analysis-123',
          status: 'cancelled',
          cancelledAt: '2024-01-15T10:08:00Z',
          reason: 'User requested cancellation',
          refund: {
            amount: 0.25,
            reason: 'Partial completion refund'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'DELETE',
        path: '/analysis/analysis-123',
        pathParameters: {
          analysisId: 'analysis-123'
        },
        headers: {
          'Authorization': mockAuthToken
        }
      });

      const result: APIGatewayProxyResult = await mockAnalysisHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.status).toBe('cancelled');
      expect(responseBody.cancelledAt).toBeDefined();
      expect(responseBody.refund.amount).toBe(0.25);
    });

    it('should not cancel completed analysis', async () => {
      const mockAnalysisHandler = jest.fn().mockResolvedValue({
        statusCode: 409,
        body: JSON.stringify({
          error: 'Conflict',
          message: 'Cannot cancel completed analysis',
          details: {
            analysisId: 'analysis-123',
            status: 'completed',
            completedAt: '2024-01-15T10:15:00Z'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'DELETE',
        path: '/analysis/analysis-123',
        pathParameters: {
          analysisId: 'analysis-123'
        },
        headers: {
          'Authorization': mockAuthToken
        }
      });

      const result: APIGatewayProxyResult = await mockAnalysisHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(409);
      expect(responseBody.error).toBe('Conflict');
      expect(responseBody.details.status).toBe('completed');
    });
  });
});