# Coordinator Agent

The Coordinator Agent serves as the central orchestrator for the Multi-Agent Curriculum Alignment System, managing workflows, coordinating communication between agents, and maintaining system-wide state.

## Overview

- **Function Name**: `curriculum-alignment-coordinator-{environment}`
- **Runtime**: Node.js 18.x
- **Memory**: 512MB
- **Timeout**: 5 minutes
- **Concurrency**: 50 concurrent executions

## Responsibilities

1. **Workflow Orchestration** - Initiates and manages multi-agent workflows
2. **Agent Communication** - Routes messages between specialized agents
3. **State Management** - Maintains workflow state and progress tracking
4. **Error Coordination** - Handles system-wide error recovery
5. **Resource Management** - Manages agent resource allocation and scaling

## API Endpoints

### POST /coordinator/initiate-workflow
Initiates a new curriculum analysis workflow.

**Request:**
```json
{
  "workflowType": "curriculum-analysis",
  "program": "Computer Science",
  "university": "Central European University",
  "requestedBy": "user-123",
  "priority": "normal",
  "configuration": {
    "includeAccreditation": true,
    "semanticAnalysis": true,
    "generateReport": true
  }
}
```

**Response:**
```json
{
  "workflowId": "wf_20240101_123456",
  "status": "initiated",
  "estimatedDuration": "15-30 minutes",
  "stepsPlanned": 8,
  "nextAction": "document-collection",
  "timestamp": "2024-01-01T12:34:56Z"
}
```

### GET /coordinator/workflow/{workflowId}/status
Retrieves the current status of a workflow.

**Response:**
```json
{
  "workflowId": "wf_20240101_123456",
  "status": "in-progress",
  "currentStep": "semantic-analysis",
  "stepsCompleted": 5,
  "stepsTotal": 8,
  "progress": 62.5,
  "agents": {
    "web-search": "completed",
    "document-processing": "completed", 
    "semantic-search": "in-progress",
    "accreditation-expert": "pending"
  },
  "estimatedTimeRemaining": "8 minutes",
  "lastUpdated": "2024-01-01T12:45:30Z"
}
```

### POST /coordinator/workflow/{workflowId}/cancel
Cancels an active workflow and cleans up resources.

**Response:**
```json
{
  "workflowId": "wf_20240101_123456",
  "status": "cancelled",
  "reason": "user-requested",
  "resourcesCleaned": true,
  "timestamp": "2024-01-01T12:50:00Z"
}
```

### GET /coordinator/agents/status
Returns the status of all agents in the system.

**Response:**
```json
{
  "systemStatus": "healthy",
  "agents": {
    "coordinator": {
      "status": "active",
      "health": "healthy",
      "activeWorkflows": 3,
      "queueDepth": 12,
      "lastHealthCheck": "2024-01-01T12:55:00Z"
    },
    "web-search": {
      "status": "active", 
      "health": "healthy",
      "activeTasks": 2,
      "avgResponseTime": "2.3s"
    }
    // ... other agents
  },
  "totalActiveWorkflows": 15,
  "systemLoad": "moderate"
}
```

## Event Processing

The Coordinator Agent processes various event types:

### Workflow Events
- `workflow.initiated` - New workflow started
- `workflow.step.completed` - Individual step finished
- `workflow.completed` - Entire workflow finished
- `workflow.failed` - Workflow failed with errors

### Agent Events
- `agent.task.assigned` - Task assigned to agent
- `agent.task.completed` - Agent completed task
- `agent.health.degraded` - Agent health issues
- `agent.scaled` - Agent instances scaled

### System Events
- `system.overload` - System under high load
- `resource.low` - Resource constraints detected
- `error.escalated` - Critical error requiring intervention

## Workflow Types

### Curriculum Analysis Workflow
1. **Document Collection** - Gather curriculum documents
2. **Web Research** - Search for external references
3. **Document Processing** - Extract and structure content
4. **Semantic Analysis** - Perform semantic matching
5. **Accreditation Review** - Check against standards
6. **Quality Assurance** - Validate results
7. **Report Generation** - Create final analysis
8. **Delivery** - Send results to user

### Program Comparison Workflow
1. **Multi-Program Collection** - Gather multiple programs
2. **Standardization** - Normalize data formats
3. **Comparative Analysis** - Identify similarities/differences
4. **Gap Analysis** - Find missing components
5. **Recommendation Generation** - Suggest improvements
6. **Report Compilation** - Create comparison report

## Error Handling

### Workflow-Level Errors
- **Agent Unavailable**: Retry with backoff, escalate if persistent
- **Timeout**: Extend deadline or partition work
- **Resource Exhaustion**: Queue workflow for later execution
- **Data Corruption**: Restart from last known good state

### Agent Communication Errors
- **Message Lost**: Implement message deduplication and retry
- **Format Errors**: Validate and transform messages
- **Ordering Issues**: Use sequence numbers and reordering

### Recovery Strategies
```javascript
const recoveryStrategies = {
  'agent-timeout': {
    action: 'retry',
    maxAttempts: 3,
    backoffMs: [1000, 5000, 15000]
  },
  'agent-unavailable': {
    action: 'fallback',
    fallbackAgent: 'backup-processor'
  },
  'data-corruption': {
    action: 'restart',
    fromCheckpoint: true
  }
};
```

## Configuration

### Environment Variables
```bash
# Workflow Configuration
MAX_CONCURRENT_WORKFLOWS=50
WORKFLOW_TIMEOUT_MS=1800000  # 30 minutes
CHECKPOINT_INTERVAL_MS=30000 # 30 seconds

# Agent Management
AGENT_HEALTH_CHECK_INTERVAL=60000
AGENT_SCALE_THRESHOLD=80
MAX_RETRY_ATTEMPTS=3

# Resource Limits
MAX_MEMORY_MB=512
MAX_EXECUTION_TIME_MS=300000
```

### Step Function State Machine
The coordinator uses AWS Step Functions for complex workflow orchestration:

```json
{
  "Comment": "Curriculum Analysis Workflow",
  "StartAt": "InitiateWorkflow",
  "States": {
    "InitiateWorkflow": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:coordinator",
      "Next": "DocumentCollection"
    },
    "DocumentCollection": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "WebSearch",
          "States": {
            "WebSearch": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:123456789012:function:web-search",
              "End": true
            }
          }
        },
        {
          "StartAt": "DocumentProcessing", 
          "States": {
            "DocumentProcessing": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:123456789012:function:document-processing",
              "End": true
            }
          }
        }
      ],
      "Next": "SemanticAnalysis"
    }
    // ... additional states
  }
}
```

## Monitoring and Metrics

### Key Metrics
- **Workflow Success Rate**: Percentage of successful workflows
- **Average Execution Time**: Mean time to complete workflows
- **Agent Utilization**: Resource usage across agents
- **Queue Depth**: Number of pending tasks per agent
- **Error Rate**: Frequency of errors by type

### CloudWatch Dashboards
The coordinator publishes metrics to CloudWatch:

```javascript
await cloudWatch.putMetricData({
  Namespace: 'CurriculumAlignment/Coordinator',
  MetricData: [
    {
      MetricName: 'WorkflowsCompleted',
      Value: 1,
      Unit: 'Count',
      Dimensions: [
        { Name: 'WorkflowType', Value: 'curriculum-analysis' },
        { Name: 'Environment', Value: process.env.ENVIRONMENT }
      ]
    }
  ]
}).promise();
```

## Testing

### Unit Tests
```javascript
describe('Coordinator Agent', () => {
  test('should initiate workflow successfully', async () => {
    const request = {
      workflowType: 'curriculum-analysis',
      program: 'Computer Science',
      university: 'CEU'
    };
    
    const result = await coordinator.initiateWorkflow(request);
    
    expect(result.workflowId).toBeDefined();
    expect(result.status).toBe('initiated');
  });
});
```

### Integration Tests
```javascript
describe('Workflow Integration', () => {
  test('should complete full curriculum analysis', async () => {
    const workflowId = await coordinator.initiateWorkflow(testRequest);
    
    // Wait for completion
    await waitForWorkflowCompletion(workflowId);
    
    const status = await coordinator.getWorkflowStatus(workflowId);
    expect(status.status).toBe('completed');
  });
});
```

## Troubleshooting

### Common Issues

1. **Workflow Stuck in Progress**
   - Check agent health status
   - Review CloudWatch logs for errors
   - Verify Step Function execution

2. **High Error Rate**
   - Check agent resource limits
   - Review message queue depths
   - Verify network connectivity

3. **Performance Degradation**
   - Monitor CPU and memory usage
   - Check concurrent execution limits
   - Review database connection pools

### Debug Commands
```bash
# Check workflow status
aws stepfunctions describe-execution --execution-arn <arn>

# View recent errors
aws logs filter-log-events --log-group-name /aws/lambda/coordinator

# Check agent health
curl -X GET https://api.example.com/coordinator/agents/status
```