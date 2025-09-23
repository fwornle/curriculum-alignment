import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../lambda/qa-agent/index';
import { TerminologyEngine } from '../../lambda/qa-agent/terminology-engine';
import { MockAWSServices } from './mocks/aws-services.mock';
import { MockLLMService } from './mocks/llm-service.mock';

// Mock dependencies
jest.mock('aws-sdk');
jest.mock('../../src/services/logging.service');
jest.mock('../../src/services/cost-tracking.service');

const mockAWS = new MockAWSServices();
const mockLLM = new MockLLMService();

describe('QA Agent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAWS.reset();
    mockLLM.reset();
  });

  describe('Lambda Handler', () => {
    it('should handle content analysis request', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'analyze-content' },
        body: JSON.stringify({
          content: 'This is a sample curriculum document with Artifical Intelligence and machine learning topics.',
          qaOptions: {
            checks: ['terminology', 'grammar', 'consistency', 'formatting'],
            strictMode: false,
            autoCorrect: true
          }
        }),
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.analysis).toBeDefined();
      expect(body.analysis.issues).toBeInstanceOf(Array);
      expect(body.analysis.corrections).toBeInstanceOf(Array);
      expect(body.analysis.qualityScore).toBeGreaterThan(0);
    });

    it('should handle quick terminology check', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'quick-check' },
        body: JSON.stringify({
          text: 'The AI and ML courses cover DL techniques.',
          checkType: 'terminology'
        }),
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.suggestions).toBeDefined();
      expect(body.confidence).toBeGreaterThan(0);
    });

    it('should handle auto-correction request', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'auto-correct' },
        body: JSON.stringify({
          content: 'Students will learns about artifical intelligence and machien learning.',
          correctionOptions: {
            fixGrammar: true,
            fixSpelling: true,
            standardizeTerminology: true,
            preserveFormatting: true
          }
        }),
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.correctedContent).toBeDefined();
      expect(body.corrections).toBeInstanceOf(Array);
      expect(body.correctedContent).not.toBe(JSON.parse(event.body!).content);
    });

    it('should handle compliance validation', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'validate-compliance' },
        body: JSON.stringify({
          content: 'Course syllabus for CS101 Introduction to Programming',
          complianceStandards: ['academic-writing', 'curriculum-guidelines', 'accessibility'],
          strictMode: true
        }),
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.complianceResults).toBeDefined();
      expect(body.complianceResults.overallScore).toBeGreaterThan(0);
      expect(body.complianceResults.standardResults).toBeInstanceOf(Array);
    });

    it('should handle reporting request', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        pathParameters: { action: 'generate-report' },
        queryStringParameters: {
          analysisId: 'test-analysis-123',
          format: 'detailed'
        },
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.report).toBeDefined();
      expect(body.report.summary).toBeDefined();
      expect(body.report.details).toBeDefined();
    });

    it('should handle unauthorized requests', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'analyze-content' },
        body: JSON.stringify({}),
        headers: {}
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('Terminology Engine', () => {
    let terminologyEngine: TerminologyEngine;

    beforeEach(() => {
      terminologyEngine = new TerminologyEngine({
        enableLLMEnhancement: true,
        llmModel: 'gpt-4',
        strictMode: false,
        confidenceThreshold: 0.8,
        enableCustomRules: true
      });
    });

    it('should standardize academic terminology', async () => {
      const content = 'The AI course covers ML and DL topics with NLP applications.';
      
      const result = await terminologyEngine.checkTerminology(content);

      expect(result.standardizations).toBeInstanceOf(Array);
      expect(result.standardizations.some(s => s.original === 'AI' && s.standardized === 'Artificial Intelligence')).toBe(true);
      expect(result.standardizations.some(s => s.original === 'ML' && s.standardized === 'Machine Learning')).toBe(true);
      expect(result.standardizations.some(s => s.original === 'DL' && s.standardized === 'Deep Learning')).toBe(true);
      expect(result.standardizations.some(s => s.original === 'NLP' && s.standardized === 'Natural Language Processing')).toBe(true);
    });

    it('should identify terminology inconsistencies', async () => {
      const content = `
        The Artificial Intelligence course covers AI fundamentals.
        Machine Learning techniques and ML algorithms are taught.
        artificial intelligence applications in ml are explored.
      `;

      const result = await terminologyEngine.checkTerminology(content);

      expect(result.inconsistencies).toBeInstanceOf(Array);
      expect(result.inconsistencies.length).toBeGreaterThan(0);
      
      const aiInconsistency = result.inconsistencies.find(i => 
        i.variations.includes('Artificial Intelligence') && 
        i.variations.includes('AI') && 
        i.variations.includes('artificial intelligence')
      );
      expect(aiInconsistency).toBeDefined();
    });

    it('should apply built-in computer science terminology rules', async () => {
      const content = 'Students learn about API design, UI/UX principles, and DB management.';

      const result = await terminologyEngine.checkTerminology(content);

      expect(result.standardizations).toBeInstanceOf(Array);
      expect(result.standardizations.some(s => s.original === 'API' && s.standardized === 'Application Programming Interface')).toBe(true);
      expect(result.standardizations.some(s => s.original === 'UI/UX' && s.standardized === 'User Interface/User Experience')).toBe(true);
      expect(result.standardizations.some(s => s.original === 'DB' && s.standardized === 'Database')).toBe(true);
    });

    it('should handle custom terminology rules', async () => {
      terminologyEngine.addCustomRule({
        pattern: /\bCEU\b/g,
        replacement: 'Central European University',
        category: 'institution',
        confidence: 0.95
      });

      const content = 'CEU offers excellent computer science programs.';

      const result = await terminologyEngine.checkTerminology(content);

      expect(result.standardizations.some(s => 
        s.original === 'CEU' && 
        s.standardized === 'Central European University'
      )).toBe(true);
    });

    it('should detect and correct spelling errors in technical terms', async () => {
      const content = 'The algoritm uses machien learning and artifical intelligence.';

      const result = await terminologyEngine.checkTerminology(content);

      expect(result.corrections).toBeInstanceOf(Array);
      expect(result.corrections.some(c => c.original === 'algoritm' && c.corrected === 'algorithm')).toBe(true);
      expect(result.corrections.some(c => c.original === 'machien' && c.corrected === 'machine')).toBe(true);
      expect(result.corrections.some(c => c.original === 'artifical' && c.corrected === 'artificial')).toBe(true);
    });

    it('should maintain context-aware terminology', async () => {
      const content = `
        Computer Science Department
        Course: CS101 - Introduction to Programming
        This course covers programming fundamentals using Python.
      `;

      const result = await terminologyEngine.checkTerminology(content);

      // Should preserve proper course codes and technical contexts
      expect(result.preservedTerms).toContain('CS101');
      expect(result.preservedTerms).toContain('Python');
      expect(result.contextAnalysis.domain).toBe('computer-science');
    });

    it('should handle performance with large documents', async () => {
      const largeContent = Array(1000).fill(
        'The AI and ML courses cover artificial intelligence, machine learning, and deep learning topics.'
      ).join(' ');

      const startTime = Date.now();
      const result = await terminologyEngine.checkTerminology(largeContent);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.standardizations).toBeInstanceOf(Array);
      expect(result.processingStats.processingTimeMs).toBeLessThan(5000);
    });
  });

  describe('Quality Assessment', () => {
    it('should perform comprehensive quality analysis', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'analyze-content' },
        body: JSON.stringify({
          content: `
            # Course Syllabus: Introduction to AI
            
            This course covers artificial intelligence fundamentals.
            Students will learns about:
            - Machine learning algoritms
            - Neural networks and DL
            - NLP applications
            
            Prerequisites: CS101, MATH201
          `,
          qaOptions: {
            checks: ['terminology', 'grammar', 'consistency', 'formatting', 'structure', 'readability'],
            strictMode: true,
            autoCorrect: false
          }
        }),
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      // Should detect grammar errors
      expect(body.analysis.issues.some((issue: any) => 
        issue.type === 'grammar' && issue.message.includes('learns')
      )).toBe(true);
      
      // Should detect spelling errors
      expect(body.analysis.issues.some((issue: any) => 
        issue.type === 'spelling' && issue.message.includes('algoritms')
      )).toBe(true);
      
      // Should identify terminology standardization opportunities
      expect(body.analysis.issues.some((issue: any) => 
        issue.type === 'terminology' && issue.message.includes('DL')
      )).toBe(true);
      
      expect(body.analysis.qualityScore).toBeGreaterThan(0);
      expect(body.analysis.qualityScore).toBeLessThan(1);
    });

    it('should provide actionable improvement suggestions', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'analyze-content' },
        body: JSON.stringify({
          content: 'This course has lots of AI stuff and ML things students should know.',
          qaOptions: {
            checks: ['clarity', 'formality', 'specificity'],
            strictMode: false,
            autoCorrect: false
          }
        }),
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.analysis.suggestions).toBeInstanceOf(Array);
      expect(body.analysis.suggestions.length).toBeGreaterThan(0);
      
      // Should suggest more specific language
      expect(body.analysis.suggestions.some((suggestion: any) => 
        suggestion.type === 'specificity'
      )).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should complete end-to-end content analysis workflow', async () => {
      const testContent = `
        Course: Advanced Machine Learning
        
        This course covers advancced ML techniques including:
        - Supervised lerning algorithms
        - Unsupervised learning methods  
        - Deep lerning architectures
        - Reinforcment learning
        
        Students will implementation various ML models.
      `;

      // Step 1: Analyze content
      const analyzeEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'analyze-content' },
        body: JSON.stringify({
          content: testContent,
          qaOptions: {
            checks: ['all'],
            strictMode: false,
            autoCorrect: false
          }
        }),
        headers: { 'Authorization': 'Bearer test-token' }
      };

      const analyzeResult = await handler(analyzeEvent as APIGatewayProxyEvent);
      expect(analyzeResult.statusCode).toBe(200);
      
      const analysis = JSON.parse(analyzeResult.body).analysis;
      expect(analysis.issues.length).toBeGreaterThan(0);

      // Step 2: Apply auto-corrections
      const correctEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'auto-correct' },
        body: JSON.stringify({
          content: testContent,
          correctionOptions: {
            fixGrammar: true,
            fixSpelling: true,
            standardizeTerminology: true,
            preserveFormatting: true
          }
        }),
        headers: { 'Authorization': 'Bearer test-token' }
      };

      const correctResult = await handler(correctEvent as APIGatewayProxyEvent);
      expect(correctResult.statusCode).toBe(200);
      
      const corrections = JSON.parse(correctResult.body);
      expect(corrections.correctedContent).toBeDefined();
      expect(corrections.correctedContent).not.toBe(testContent);
      
      // Should fix spelling errors
      expect(corrections.correctedContent).toContain('advanced');
      expect(corrections.correctedContent).toContain('learning');
      expect(corrections.correctedContent).toContain('implement');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed content gracefully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'analyze-content' },
        body: JSON.stringify({
          content: null,
          qaOptions: { checks: ['terminology'] }
        }),
        headers: { 'Authorization': 'Bearer test-token' }
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Invalid content');
    });

    it('should handle LLM service failures', async () => {
      mockLLM.simulateNetworkError();

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'analyze-content' },
        body: JSON.stringify({
          content: 'Test content for analysis',
          qaOptions: { checks: ['terminology'] }
        }),
        headers: { 'Authorization': 'Bearer test-token' }
      };

      const result = await handler(event as APIGatewayProxyEvent);

      // Should gracefully handle LLM failures and provide fallback analysis
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.analysis).toBeDefined();
      expect(body.analysis.warnings).toContain('LLM enhancement unavailable');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent analysis requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        httpMethod: 'POST',
        pathParameters: { action: 'analyze-content' },
        body: JSON.stringify({
          content: `Test content ${i} for concurrent analysis`,
          qaOptions: { checks: ['terminology', 'grammar'] }
        }),
        headers: { 'Authorization': 'Bearer test-token' }
      }));

      const results = await Promise.all(
        requests.map(req => handler(req as APIGatewayProxyEvent))
      );

      results.forEach(result => {
        expect(result.statusCode).toBe(200);
      });
    });

    it('should process large documents efficiently', async () => {
      const largeContent = Array(500).fill(
        'This is a test sentence for performance evaluation. It contains various AI and ML terms that need analysis.'
      ).join(' ');

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'analyze-content' },
        body: JSON.stringify({
          content: largeContent,
          qaOptions: { checks: ['terminology'] }
        }),
        headers: { 'Authorization': 'Bearer test-token' }
      };

      const startTime = Date.now();
      const result = await handler(event as APIGatewayProxyEvent);
      const processingTime = Date.now() - startTime;

      expect(result.statusCode).toBe(200);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});