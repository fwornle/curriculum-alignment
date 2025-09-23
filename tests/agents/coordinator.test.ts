import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../lambda/coordinator/index';
import { WorkflowEngine } from '../../lambda/coordinator/workflow-engine';
import { MockAWSServices } from './mocks/aws-services.mock';
import { MockLLMService } from './mocks/llm-service.mock';

// Mock AWS services
jest.mock('aws-sdk');
jest.mock('../../src/services/logging.service');
jest.mock('../../src/services/cost-tracking.service');

const mockAWS = new MockAWSServices();
const mockLLM = new MockLLMService();

describe('Coordinator Agent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAWS.reset();
    mockLLM.reset();
  });

  describe('Lambda Handler', () => {
    it('should handle workflow initiation request', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'initiate-workflow' },
        body: JSON.stringify({
          workflowType: 'curriculum-analysis',
          program: 'Computer Science',
          university: 'CEU',
          requestedBy: 'test-user'
        }),
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.workflowId).toBeDefined();
      expect(body.status).toBe('initiated');
      expect(body.estimatedDuration).toBeDefined();
    });

    it('should handle workflow status request', async () => {
      const workflowId = 'test-workflow-123';
      mockAWS.stepFunctions.mockExecution(workflowId, {
        status: 'RUNNING',
        startDate: new Date(),
        stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:test'
      });

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        pathParameters: { action: 'workflow-status' },
        queryStringParameters: { workflowId },
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.workflowId).toBe(workflowId);
      expect(body.status).toBe('running');
      expect(body.progress).toBeDefined();
    });

    it('should handle invalid action', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'invalid-action' },
        body: JSON.stringify({}),
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid action');
    });

    it('should handle unauthorized requests', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'initiate-workflow' },
        body: JSON.stringify({}),
        headers: {}
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('Workflow Engine', () => {
    let workflowEngine: WorkflowEngine;

    beforeEach(() => {
      workflowEngine = new WorkflowEngine({
        region: 'us-east-1',
        stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:test',
        enableCostTracking: true,
        enableMetrics: true,
        maxConcurrentWorkflows: 10
      });
    });

    it('should initiate curriculum analysis workflow', async () => {
      const request = {
        workflowType: 'curriculum-analysis',
        program: 'Computer Science',
        university: 'CEU',
        documents: ['curriculum.pdf', 'syllabus.docx'],
        requestedBy: 'test-user'
      };

      const result = await workflowEngine.initiateWorkflow(request);

      expect(result.workflowId).toBeDefined();
      expect(result.status).toBe('initiated');
      expect(result.estimatedDuration).toBeGreaterThan(0);
      expect(mockAWS.stepFunctions.startExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('curriculum-analysis'),
          input: expect.stringContaining(request.program)
        })
      );
    });

    it('should get workflow status with progress', async () => {
      const workflowId = 'test-workflow-123';
      mockAWS.stepFunctions.mockExecution(workflowId, {
        status: 'RUNNING',
        startDate: new Date(),
        stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:test'
      });

      mockAWS.stepFunctions.mockExecutionHistory(workflowId, [
        { type: 'ExecutionStarted', timestamp: new Date() },
        { type: 'TaskStateEntered', timestamp: new Date(), stateEnteredEventDetails: { name: 'ValidateInput' } },
        { type: 'TaskStateExited', timestamp: new Date() },
        { type: 'TaskStateEntered', timestamp: new Date(), stateEnteredEventDetails: { name: 'ParallelDataCollection' } }
      ]);

      const status = await workflowEngine.getWorkflowStatus(workflowId);

      expect(status.workflowId).toBe(workflowId);
      expect(status.status).toBe('running');
      expect(status.progress).toBeGreaterThan(0);
      expect(status.currentStep).toBe('ParallelDataCollection');
      expect(status.completedSteps).toContain('ValidateInput');
    });

    it('should handle workflow failure', async () => {
      const workflowId = 'test-workflow-failed';
      mockAWS.stepFunctions.mockExecution(workflowId, {
        status: 'FAILED',
        stopDate: new Date(),
        stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:test'
      });

      const status = await workflowEngine.getWorkflowStatus(workflowId);

      expect(status.status).toBe('failed');
      expect(status.error).toBeDefined();
    });

    it('should calculate workflow progress correctly', async () => {
      const workflowId = 'test-workflow-progress';
      
      // Mock execution history showing 3 out of 5 steps completed
      mockAWS.stepFunctions.mockExecutionHistory(workflowId, [
        { type: 'ExecutionStarted', timestamp: new Date() },
        { type: 'TaskStateEntered', timestamp: new Date(), stateEnteredEventDetails: { name: 'Step1' } },
        { type: 'TaskStateExited', timestamp: new Date() },
        { type: 'TaskStateEntered', timestamp: new Date(), stateEnteredEventDetails: { name: 'Step2' } },
        { type: 'TaskStateExited', timestamp: new Date() },
        { type: 'TaskStateEntered', timestamp: new Date(), stateEnteredEventDetails: { name: 'Step3' } }
      ]);

      const progress = await workflowEngine.calculateProgress(workflowId);

      expect(progress).toBeGreaterThan(50);
      expect(progress).toBeLessThan(100);
    });

    it('should handle concurrent workflow limit', async () => {
      // Set up engine with low concurrency limit
      const limitedEngine = new WorkflowEngine({
        region: 'us-east-1',
        stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:test',
        enableCostTracking: true,
        enableMetrics: true,
        maxConcurrentWorkflows: 1
      });

      // Mock one running workflow
      mockAWS.stepFunctions.mockRunningExecutions(['workflow-1']);

      const request = {
        workflowType: 'curriculum-analysis',
        program: 'Computer Science',
        university: 'CEU',
        requestedBy: 'test-user'
      };

      await expect(limitedEngine.initiateWorkflow(request)).rejects.toThrow('Maximum concurrent workflows reached');
    });
  });

  describe('Integration Tests', () => {
    it('should complete end-to-end workflow initiation and status tracking', async () => {
      // Test full workflow from API call to Step Functions execution
      const initiateEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'initiate-workflow' },
        body: JSON.stringify({
          workflowType: 'curriculum-analysis',
          program: 'Computer Science',
          university: 'CEU',
          requestedBy: 'test-user'
        }),
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      // Initiate workflow
      const initiateResult = await handler(initiateEvent as APIGatewayProxyEvent);
      expect(initiateResult.statusCode).toBe(200);
      
      const { workflowId } = JSON.parse(initiateResult.body);

      // Mock running execution
      mockAWS.stepFunctions.mockExecution(workflowId, {
        status: 'RUNNING',
        startDate: new Date(),
        stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:test'
      });

      // Check status
      const statusEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        pathParameters: { action: 'workflow-status' },
        queryStringParameters: { workflowId },
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      const statusResult = await handler(statusEvent as APIGatewayProxyEvent);
      expect(statusResult.statusCode).toBe(200);
      
      const statusBody = JSON.parse(statusResult.body);
      expect(statusBody.workflowId).toBe(workflowId);
      expect(statusBody.status).toBe('running');
    });
  });

  describe('Error Handling', () => {
    it('should handle Step Functions API failures', async () => {
      mockAWS.stepFunctions.shouldFail('startExecution', new Error('Service unavailable'));

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'initiate-workflow' },
        body: JSON.stringify({
          workflowType: 'curriculum-analysis',
          program: 'Computer Science',
          university: 'CEU',
          requestedBy: 'test-user'
        }),
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Internal server error');
    });

    it('should handle malformed request body', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'initiate-workflow' },
        body: 'invalid-json',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Invalid request body');
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        httpMethod: 'POST',
        pathParameters: { action: 'initiate-workflow' },
        body: JSON.stringify({
          workflowType: 'curriculum-analysis',
          program: `Program-${i}`,
          university: 'CEU',
          requestedBy: 'test-user'
        }),
        headers: {
          'Authorization': 'Bearer test-token'
        }
      }));

      const results = await Promise.all(
        requests.map(req => handler(req as APIGatewayProxyEvent))
      );

      results.forEach(result => {
        expect(result.statusCode).toBe(200);
      });

      // Verify all workflows were started
      expect(mockAWS.stepFunctions.startExecution).toHaveBeenCalledTimes(10);
    });

    it('should complete workflow initiation within acceptable time', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        pathParameters: { action: 'initiate-workflow' },
        body: JSON.stringify({
          workflowType: 'curriculum-analysis',
          program: 'Computer Science',
          university: 'CEU',
          requestedBy: 'test-user'
        }),
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      const startTime = Date.now();
      const result = await handler(event as APIGatewayProxyEvent);
      const duration = Date.now() - startTime;

      expect(result.statusCode).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});