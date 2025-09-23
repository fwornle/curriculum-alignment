# Multi-Agent Curriculum Alignment System - Agent Documentation

This directory contains comprehensive documentation for all agents in the Multi-Agent Curriculum Alignment System (MACAS). Each agent is designed to handle specific aspects of curriculum analysis and alignment for educational institutions.

## Agent Overview

The MACAS consists of 8 specialized agents working together to provide comprehensive curriculum analysis:

1. **[Coordinator Agent](coordinator.md)** - Orchestrates workflows and manages agent communication
2. **[Web Search Agent](web-search.md)** - Gathers external curriculum and program information
3. **[Browser Agent](browser.md)** - Performs automated web browsing and data extraction
4. **[Document Processing Agent](document-processing.md)** - Processes and analyzes curriculum documents
5. **[Accreditation Expert Agent](accreditation-expert.md)** - Provides accreditation standards expertise
6. **[QA Agent](qa-agent.md)** - Ensures quality and validates analysis results
7. **[Semantic Search Agent](semantic-search.md)** - Performs advanced semantic analysis and matching
8. **[Chat Interface Agent](chat-interface.md)** - Provides user interaction and query processing

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Request  │ -> │  Chat Interface │ -> │   Coordinator   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌────────────────────────────────┼────────────────────────────────┐
                       │                                │                                │
                       v                                v                                v
              ┌─────────────────┐           ┌─────────────────┐             ┌─────────────────┐
              │   Web Search    │           │     Browser     │             │ Document Proc.  │
              └─────────────────┘           └─────────────────┘             └─────────────────┘
                       │                                │                                │
                       └────────────────────────────────┼────────────────────────────────┘
                                                        │
                       ┌────────────────────────────────┼────────────────────────────────┐
                       │                                │                                │
                       v                                v                                v
              ┌─────────────────┐           ┌─────────────────┐             ┌─────────────────┐
              │ Accreditation   │           │   QA Agent      │             │ Semantic Search │
              │     Expert      │           │                 │             │                 │
              └─────────────────┘           └─────────────────┘             └─────────────────┘
```

## Communication Flow

All agents communicate through:
- **AWS EventBridge** - Asynchronous event-driven communication
- **AWS SQS** - Reliable message queuing for task distribution
- **AWS Step Functions** - Workflow orchestration for complex processes
- **DynamoDB** - Shared state management and result storage

## Common Features

All agents implement:
- **Health Checks** - `/health` endpoint for monitoring
- **Error Handling** - Comprehensive error recovery and DLQ support
- **Cost Tracking** - Automatic usage and cost monitoring
- **Metrics Collection** - Performance and operational metrics
- **Authentication** - JWT-based user authentication
- **Logging** - Structured logging with correlation IDs

## Error Handling

Each agent implements a standardized error handling approach:

1. **Validation Errors** - Input validation with detailed error messages
2. **Service Errors** - External service failures with retry logic
3. **Rate Limiting** - Automatic backoff for rate-limited services
4. **Circuit Breaking** - Prevent cascading failures
5. **Dead Letter Queue** - Failed message recovery and analysis

## Performance Monitoring

Agents report the following metrics:
- **Execution Time** - Function execution duration
- **Memory Usage** - Peak memory consumption
- **Error Rates** - Success/failure ratios
- **Cost Tracking** - Per-execution cost analysis
- **Queue Metrics** - Message processing statistics

## Configuration

All agents support environment-specific configuration through:
- Environment variables for runtime settings
- AWS Parameter Store for secure configuration
- AWS Secrets Manager for sensitive data
- DynamoDB for dynamic configuration updates

## Getting Started

1. **Deployment**: Use the deployment scripts in `/scripts/`
2. **Testing**: Run agent tests with `npm test`
3. **Monitoring**: Check CloudWatch dashboards for metrics
4. **Debugging**: Use CloudWatch Logs for troubleshooting

For detailed information about each agent, refer to their individual documentation files in this directory.