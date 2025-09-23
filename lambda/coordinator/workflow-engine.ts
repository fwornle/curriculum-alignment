/**
 * Workflow Engine
 * 
 * Core workflow orchestration engine responsible for managing multi-agent
 * workflows, handling state transitions, and coordinating agent execution.
 */

import { 
  SFNClient, 
  StartExecutionCommand, 
  DescribeExecutionCommand, 
  StopExecutionCommand,
  ListExecutionsCommand,
} from '@aws-sdk/client-sfn';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { env } from '../../src/config/environment';
import { logger } from '../../src/services/logging.service';
import { metrics } from '../../src/services/metrics.service';
import { query } from '../../src/database';
import { AgentType, WorkflowStatus } from '../../src/database/models';
import { ErrorFactory } from '../../src/types/errors';
import { costTracking } from '../../src/services/cost-tracking.service';
import { websocket } from '../../src/services/websocket.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Workflow request structure
 */
export interface WorkflowRequest {
  workflowId: string;
  type: 'curriculum_analysis' | 'peer_comparison' | 'gap_analysis';
  parameters: Record<string, any>;
  requestId: string;
  userId?: string;
  priority: 'speed' | 'accuracy' | 'cost';
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  name: string;
  agentType: AgentType;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  dependencies: string[];
  parameters: Record<string, any>;
  results?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  progress?: number;
  estimatedDuration?: number;
  actualDuration?: number;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  workflowId: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  currentStep?: WorkflowStep;
  completedSteps: WorkflowStep[];
  results?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
  totalDuration?: number;
  metadata: Record<string, any>;
}

/**
 * Agent configuration
 */
interface AgentConfig {
  functionName: string;
  timeout: number;
  memory: number;
  maxRetries: number;
  estimatedDuration: number;
}

/**
 * Workflow template definitions
 */
const WORKFLOW_TEMPLATES = {
  curriculum_analysis: [
    {
      id: 'web_search',
      name: 'Discover Peer Programs',
      agentType: 'web-search' as AgentType,
      dependencies: [],
      estimatedDuration: 120000, // 2 minutes
    },
    {
      id: 'document_processing',
      name: 'Process Documents',
      agentType: 'document-processing' as AgentType,
      dependencies: ['web_search'],
      estimatedDuration: 300000, // 5 minutes
    },
    {
      id: 'accreditation_analysis',
      name: 'Analyze Accreditation Requirements',
      agentType: 'accreditation-expert' as AgentType,
      dependencies: ['document_processing'],
      estimatedDuration: 180000, // 3 minutes
    },
    {
      id: 'gap_analysis',
      name: 'Identify Curriculum Gaps',
      agentType: 'accreditation-expert' as AgentType,
      dependencies: ['accreditation_analysis'],
      estimatedDuration: 240000, // 4 minutes
    },
    {
      id: 'quality_assurance',
      name: 'Quality Assurance Review',
      agentType: 'qa' as AgentType,
      dependencies: ['gap_analysis'],
      estimatedDuration: 60000, // 1 minute
    },
  ],
  peer_comparison: [
    {
      id: 'web_search',
      name: 'Find Peer Programs',
      agentType: 'web-search' as AgentType,
      dependencies: [],
      estimatedDuration: 90000,
    },
    {
      id: 'comparison_analysis',
      name: 'Compare Programs',
      agentType: 'accreditation-expert' as AgentType,
      dependencies: ['web_search'],
      estimatedDuration: 180000,
    },
    {
      id: 'qa_review',
      name: 'Quality Review',
      agentType: 'qa' as AgentType,
      dependencies: ['comparison_analysis'],
      estimatedDuration: 45000,
    },
  ],
  gap_analysis: [
    {
      id: 'document_analysis',
      name: 'Analyze Current Curriculum',
      agentType: 'document-processing' as AgentType,
      dependencies: [],
      estimatedDuration: 180000,
    },
    {
      id: 'gap_identification',
      name: 'Identify Gaps',
      agentType: 'accreditation-expert' as AgentType,
      dependencies: ['document_analysis'],
      estimatedDuration: 240000,
    },
    {
      id: 'qa_validation',
      name: 'Validate Results',
      agentType: 'qa' as AgentType,
      dependencies: ['gap_identification'],
      estimatedDuration: 60000,
    },
  ],
};

/**
 * Agent configurations
 */
const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  'coordinator': {
    functionName: `curriculum-alignment-${env.NODE_ENV}-coordinator`,
    timeout: 300000,
    memory: 512,
    maxRetries: 2,
    estimatedDuration: 30000,
  },
  'web-search': {
    functionName: `curriculum-alignment-${env.NODE_ENV}-web-search`,
    timeout: 300000,
    memory: 256,
    maxRetries: 3,
    estimatedDuration: 120000,
  },
  'browser': {
    functionName: `curriculum-alignment-${env.NODE_ENV}-browser`,
    timeout: 600000,
    memory: 1024,
    maxRetries: 2,
    estimatedDuration: 180000,
  },
  'document-processing': {
    functionName: `curriculum-alignment-${env.NODE_ENV}-document-processing`,
    timeout: 900000,
    memory: 1024,
    maxRetries: 2,
    estimatedDuration: 300000,
  },
  'accreditation-expert': {
    functionName: `curriculum-alignment-${env.NODE_ENV}-accreditation-expert`,
    timeout: 600000,
    memory: 512,
    maxRetries: 2,
    estimatedDuration: 240000,
  },
  'qa': {
    functionName: `curriculum-alignment-${env.NODE_ENV}-qa`,
    timeout: 180000,
    memory: 256,
    maxRetries: 2,
    estimatedDuration: 60000,
  },
  'semantic-search': {
    functionName: `curriculum-alignment-${env.NODE_ENV}-semantic-search`,
    timeout: 120000,
    memory: 256,
    maxRetries: 3,
    estimatedDuration: 30000,
  },
  'chat-interface': {
    functionName: `curriculum-alignment-${env.NODE_ENV}-chat-interface`,
    timeout: 300000,
    memory: 512,
    maxRetries: 2,
    estimatedDuration: 60000,
  },
};

/**
 * Workflow Engine Class
 */
export class WorkflowEngine {
  private sfnClient: SFNClient;
  private lambdaClient: LambdaClient;
  private activeWorkflows: Map<string, WorkflowResult> = new Map();

  constructor() {
    this.sfnClient = new SFNClient({
      region: env.AWS_REGION,
      credentials: env.NODE_ENV === 'development' ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
      } : undefined,
    });

    this.lambdaClient = new LambdaClient({
      region: env.AWS_REGION,
      credentials: env.NODE_ENV === 'development' ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
      } : undefined,
    });
  }

  /**
   * Start a new workflow
   */
  async startWorkflow(request: WorkflowRequest): Promise<WorkflowResult> {
    try {
      // Get workflow template
      const template = WORKFLOW_TEMPLATES[request.type];
      if (!template) {
        throw ErrorFactory.businessLogic(
          `Unknown workflow type: ${request.type}`,
          'invalid_workflow_type'
        );
      }

      // Create workflow steps
      const steps: WorkflowStep[] = template.map(stepTemplate => ({
        id: stepTemplate.id,
        name: stepTemplate.name,
        agentType: stepTemplate.agentType,
        status: 'pending',
        dependencies: stepTemplate.dependencies,
        parameters: { ...request.parameters },
        estimatedDuration: stepTemplate.estimatedDuration,
        retryCount: 0,
        maxRetries: AGENT_CONFIGS[stepTemplate.agentType].maxRetries,
      }));

      // Create workflow result
      const workflow: WorkflowResult = {
        workflowId: request.workflowId,
        status: 'running',
        steps,
        completedSteps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedCompletion: this.calculateEstimatedCompletion(steps),
        metadata: {
          requestId: request.requestId,
          userId: request.userId,
          priority: request.priority,
          type: request.type,
        },
      };

      // Store in database
      await this.saveWorkflowToDatabase(workflow);

      // Store in memory for active tracking
      this.activeWorkflows.set(request.workflowId, workflow);

      // Start execution
      this.executeWorkflow(workflow);

      // Broadcast status update
      this.broadcastWorkflowUpdate(workflow);

      logger.info('Workflow started', {
        workflowId: request.workflowId,
        type: request.type,
        stepCount: steps.length,
      });

      return workflow;

    } catch (error) {
      logger.error('Failed to start workflow', error as Error, { 
        workflowId: request.workflowId 
      });
      throw error;
    }
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowResult | null> {
    try {
      // Check active workflows first
      let workflow = this.activeWorkflows.get(workflowId);
      
      if (!workflow) {
        // Load from database
        workflow = await this.loadWorkflowFromDatabase(workflowId);
      }

      return workflow;

    } catch (error) {
      logger.error('Failed to get workflow status', error as Error, { workflowId });
      throw error;
    }
  }

  /**
   * Stop workflow execution
   */
  async stopWorkflow(workflowId: string): Promise<void> {
    try {
      const workflow = this.activeWorkflows.get(workflowId);
      if (!workflow) {
        throw ErrorFactory.businessLogic('Workflow not found or not active', 'workflow_not_found');
      }

      // Update status
      workflow.status = 'cancelled';
      workflow.updatedAt = new Date();
      workflow.completedAt = new Date();

      // Update running steps
      workflow.steps.forEach(step => {
        if (step.status === 'running') {
          step.status = 'failed';
          step.error = 'Workflow cancelled by user';
          step.endTime = new Date();
        }
      });

      // Save to database
      await this.saveWorkflowToDatabase(workflow);

      // Remove from active workflows
      this.activeWorkflows.delete(workflowId);

      // Broadcast update
      this.broadcastWorkflowUpdate(workflow);

      logger.info('Workflow stopped', { workflowId });

    } catch (error) {
      logger.error('Failed to stop workflow', error as Error, { workflowId });
      throw error;
    }
  }

  /**
   * Execute workflow steps
   */
  private async executeWorkflow(workflow: WorkflowResult): Promise<void> {
    try {
      while (workflow.status === 'running') {
        // Find next executable step
        const nextStep = this.findNextStep(workflow);
        
        if (!nextStep) {
          // No more steps to execute
          if (workflow.steps.every(step => step.status === 'completed' || step.status === 'skipped')) {
            // All steps completed successfully
            workflow.status = 'completed';
            workflow.completedAt = new Date();
            
            // Compile final results
            workflow.results = this.compileResults(workflow);
            
            logger.info('Workflow completed successfully', {
              workflowId: workflow.workflowId,
              totalDuration: workflow.completedAt.getTime() - workflow.createdAt.getTime(),
            });
          } else {
            // Some steps failed
            workflow.status = 'failed';
            workflow.completedAt = new Date();
            workflow.error = 'One or more workflow steps failed';
            
            logger.error('Workflow failed', new Error(workflow.error), {
              workflowId: workflow.workflowId,
            });
          }
          
          workflow.updatedAt = new Date();
          await this.saveWorkflowToDatabase(workflow);
          this.broadcastWorkflowUpdate(workflow);
          break;
        }

        // Execute the step
        await this.executeStep(workflow, nextStep);
        
        // Update workflow
        workflow.currentStep = nextStep;
        workflow.updatedAt = new Date();
        
        // Update completed steps list
        workflow.completedSteps = workflow.steps.filter(step => step.status === 'completed');
        
        await this.saveWorkflowToDatabase(workflow);
        this.broadcastWorkflowUpdate(workflow);

        // Small delay to prevent tight loops
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Remove from active workflows when done
      this.activeWorkflows.delete(workflow.workflowId);

    } catch (error) {
      logger.error('Workflow execution error', error as Error, {
        workflowId: workflow.workflowId,
      });
      
      workflow.status = 'failed';
      workflow.error = (error as Error).message;
      workflow.completedAt = new Date();
      workflow.updatedAt = new Date();
      
      await this.saveWorkflowToDatabase(workflow);
      this.broadcastWorkflowUpdate(workflow);
      
      this.activeWorkflows.delete(workflow.workflowId);
    }
  }

  /**
   * Find next executable step
   */
  private findNextStep(workflow: WorkflowResult): WorkflowStep | null {
    return workflow.steps.find(step => {
      if (step.status !== 'pending') {
        return false;
      }

      // Check if all dependencies are completed
      return step.dependencies.every(depId => {
        const depStep = workflow.steps.find(s => s.id === depId);
        return depStep && (depStep.status === 'completed' || depStep.status === 'skipped');
      });
    }) || null;
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(workflow: WorkflowResult, step: WorkflowStep): Promise<void> {
    const startTime = Date.now();
    
    try {
      step.status = 'running';
      step.startTime = new Date();
      step.progress = 0;

      logger.info('Starting workflow step', {
        workflowId: workflow.workflowId,
        stepId: step.id,
        agentType: step.agentType,
      });

      // Get agent configuration
      const agentConfig = AGENT_CONFIGS[step.agentType];
      if (!agentConfig) {
        throw ErrorFactory.configuration(
          `No configuration found for agent type: ${step.agentType}`,
          `agent_config_${step.agentType}`
        );
      }

      // Prepare step parameters
      const stepParameters = {
        workflowId: workflow.workflowId,
        stepId: step.id,
        ...step.parameters,
        // Include results from dependency steps
        dependencyResults: step.dependencies.reduce((acc, depId) => {
          const depStep = workflow.steps.find(s => s.id === depId);
          if (depStep && depStep.results) {
            acc[depId] = depStep.results;
          }
          return acc;
        }, {} as Record<string, any>),
      };

      // Invoke agent Lambda function
      const invokeCommand = new InvokeCommand({
        FunctionName: agentConfig.functionName,
        Payload: JSON.stringify(stepParameters),
        InvocationType: 'RequestResponse',
      });

      const response = await this.lambdaClient.send(invokeCommand);
      
      if (response.FunctionError) {
        throw new Error(`Agent execution failed: ${response.FunctionError}`);
      }

      // Parse response
      const payload = response.Payload ? JSON.parse(Buffer.from(response.Payload).toString()) : {};
      
      if (payload.errorMessage) {
        throw new Error(`Agent error: ${payload.errorMessage}`);
      }

      // Update step with results
      step.status = 'completed';
      step.endTime = new Date();
      step.progress = 100;
      step.results = payload.body ? JSON.parse(payload.body).data : payload;
      step.actualDuration = Date.now() - startTime;

      // Track cost
      await this.trackStepCost(workflow, step, step.actualDuration);

      logger.info('Workflow step completed', {
        workflowId: workflow.workflowId,
        stepId: step.id,
        duration: step.actualDuration,
      });

    } catch (error) {
      step.status = 'failed';
      step.endTime = new Date();
      step.error = (error as Error).message;
      step.actualDuration = Date.now() - startTime;
      
      // Check if we should retry
      if (step.retryCount! < step.maxRetries!) {
        step.retryCount!++;
        step.status = 'pending'; // Reset to pending for retry
        
        logger.warn('Step failed, will retry', {
          workflowId: workflow.workflowId,
          stepId: step.id,
          retryCount: step.retryCount,
          error: (error as Error).message,
        });
        
        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, step.retryCount! - 1), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger.error('Workflow step failed after retries', error as Error, {
          workflowId: workflow.workflowId,
          stepId: step.id,
          retryCount: step.retryCount,
        });
      }
    }
  }

  /**
   * Track cost for workflow step
   */
  private async trackStepCost(workflow: WorkflowResult, step: WorkflowStep, duration: number): Promise<void> {
    try {
      // Estimate cost based on Lambda execution time and memory
      const agentConfig = AGENT_CONFIGS[step.agentType];
      const gbSeconds = (agentConfig.memory / 1024) * (duration / 1000);
      const cost = gbSeconds * 0.0000166667; // AWS Lambda pricing per GB-second

      await costTracking.trackAWS({
        service: 'lambda',
        resourceType: step.agentType,
        usage: duration,
        unit: 'milliseconds',
        cost,
        region: env.AWS_REGION,
      });

      logger.debug('Step cost tracked', {
        workflowId: workflow.workflowId,
        stepId: step.id,
        cost,
        duration,
      });

    } catch (error) {
      logger.warn('Failed to track step cost', { 
        workflowId: workflow.workflowId,
        stepId: step.id,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Calculate estimated completion time
   */
  private calculateEstimatedCompletion(steps: WorkflowStep[]): Date {
    const totalEstimatedDuration = steps.reduce((total, step) => 
      total + (step.estimatedDuration || 60000), 0
    );
    
    return new Date(Date.now() + totalEstimatedDuration);
  }

  /**
   * Compile final results from all steps
   */
  private compileResults(workflow: WorkflowResult): any {
    const results: any = {
      workflowId: workflow.workflowId,
      type: workflow.metadata.type,
      summary: {
        totalSteps: workflow.steps.length,
        completedSteps: workflow.completedSteps.length,
        totalDuration: workflow.completedAt ? 
          workflow.completedAt.getTime() - workflow.createdAt.getTime() : 0,
      },
      stepResults: {},
    };

    // Collect results from each step
    workflow.steps.forEach(step => {
      if (step.results) {
        results.stepResults[step.id] = step.results;
      }
    });

    return results;
  }

  /**
   * Save workflow to database
   */
  private async saveWorkflowToDatabase(workflow: WorkflowResult): Promise<void> {
    try {
      await query(`
        INSERT INTO agent_workflows (
          workflow_id, workflow_type, status, parameters, results,
          created_at, updated_at, completed_at, user_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (workflow_id) DO UPDATE SET
          status = $3,
          results = $5,
          updated_at = $7,
          completed_at = $8,
          metadata = $10
      `, [
        workflow.workflowId,
        workflow.metadata.type,
        workflow.status,
        JSON.stringify(workflow.steps[0]?.parameters || {}),
        JSON.stringify(workflow.results),
        workflow.createdAt,
        workflow.updatedAt,
        workflow.completedAt,
        workflow.metadata.userId,
        JSON.stringify(workflow.metadata),
      ]);

    } catch (error) {
      logger.error('Failed to save workflow to database', error as Error, {
        workflowId: workflow.workflowId,
      });
    }
  }

  /**
   * Load workflow from database
   */
  private async loadWorkflowFromDatabase(workflowId: string): Promise<WorkflowResult | null> {
    try {
      const result = await query(`
        SELECT * FROM agent_workflows WHERE workflow_id = $1
      `, [workflowId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      // Reconstruct workflow object
      const workflow: WorkflowResult = {
        workflowId: row.workflow_id,
        status: row.status,
        steps: [], // Would need to reconstruct from metadata or separate table
        completedSteps: [],
        results: row.results,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
        metadata: row.metadata || {},
      };

      return workflow;

    } catch (error) {
      logger.error('Failed to load workflow from database', error as Error, {
        workflowId,
      });
      return null;
    }
  }

  /**
   * Broadcast workflow update via WebSocket
   */
  private broadcastWorkflowUpdate(workflow: WorkflowResult): void {
    try {
      websocket.broadcastAnalysisProgress({
        analysisId: workflow.workflowId,
        phase: workflow.currentStep?.name || 'Initializing',
        progress: Math.round((workflow.completedSteps.length / workflow.steps.length) * 100),
        currentAgent: workflow.currentStep?.agentType,
        completedAgents: workflow.completedSteps.map(step => step.agentType),
        remainingAgents: workflow.steps
          .filter(step => step.status === 'pending')
          .map(step => step.agentType),
        estimatedTimeRemaining: workflow.estimatedCompletion ? 
          Math.max(0, workflow.estimatedCompletion.getTime() - Date.now()) / 1000 : undefined,
        messages: [`${workflow.currentStep?.name || 'Workflow'} - ${workflow.status}`],
      });

    } catch (error) {
      logger.warn('Failed to broadcast workflow update', {
        workflowId: workflow.workflowId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Health check for workflow engine
   */
  async healthCheck(): Promise<{ status: string; activeWorkflows: number; details: string }> {
    try {
      const activeCount = this.activeWorkflows.size;
      
      return {
        status: 'healthy',
        activeWorkflows: activeCount,
        details: `Workflow engine operational with ${activeCount} active workflows`,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        activeWorkflows: 0,
        details: `Workflow engine error: ${(error as Error).message}`,
      };
    }
  }
}