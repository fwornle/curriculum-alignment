import { jest } from '@jest/globals';

// Global test setup configuration
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.AWS_REGION = 'us-east-1';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  
  // Mock environment variables for AWS services
  process.env.EVENT_BUS_NAME = 'test-event-bus';
  process.env.SQS_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
  process.env.DLQ_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq';
  process.env.STATUS_TABLE_NAME = 'test-agent-status';
  process.env.METRICS_NAMESPACE = 'Test/CurriculumAlignment/Agents';
  
  // Mock authentication
  process.env.COGNITO_USER_POOL_ID = 'us-east-1_testpool';
  process.env.COGNITO_CLIENT_ID = 'test-client-id';
  
  // Mock LLM configuration
  process.env.DEFAULT_LLM_MODEL = 'gpt-4';
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  
  // Mock cost tracking
  process.env.ENABLE_COST_TRACKING = 'true';
  process.env.COST_ALERT_THRESHOLD = '100';
  
  // Mock monitoring
  process.env.ENABLE_PERFORMANCE_MONITORING = 'true';
  process.env.HEARTBEAT_INTERVAL_MS = '60000';
  
  // Disable real network calls
  process.env.MOCK_EXTERNAL_SERVICES = 'true';
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset module registry to ensure clean state
  jest.resetModules();
  
  // Set consistent test timing
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
});

afterEach(() => {
  // Restore real timers
  jest.useRealTimers();
  
  // Clear any pending timers
  jest.clearAllTimers();
  
  // Restore all mocks
  jest.restoreAllMocks();
});

afterAll(() => {
  // Clean up any global resources
  jest.clearAllMocks();
});

// Global mock implementations
jest.mock('aws-sdk', () => ({
  StepFunctions: jest.fn(() => ({
    startExecution: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:test:test-execution',
        startDate: new Date()
      })
    }),
    describeExecution: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        status: 'SUCCEEDED',
        startDate: new Date(),
        stopDate: new Date()
      })
    }),
    getExecutionHistory: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        events: []
      })
    }),
    listExecutions: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        executions: []
      })
    })
  })),
  
  SQS: jest.fn(() => ({
    sendMessage: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        MessageId: 'test-message-id'
      })
    }),
    receiveMessage: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Messages: []
      })
    }),
    deleteMessage: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    getQueueAttributes: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Attributes: {
          ApproximateNumberOfMessages: '0',
          ApproximateNumberOfMessagesNotVisible: '0'
        }
      })
    })
  })),
  
  EventBridge: jest.fn(() => ({
    putEvents: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        FailedEntryCount: 0,
        Entries: []
      })
    })
  })),
  
  DynamoDB: jest.fn(() => ({
    putItem: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    getItem: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Item: null
      })
    }),
    query: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Items: []
      })
    }),
    scan: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Items: []
      })
    }),
    updateItem: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    deleteItem: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    describeTable: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Table: {
          TableStatus: 'ACTIVE',
          ItemCount: 0
        }
      })
    })
  })),
  
  S3: jest.fn(() => ({
    putObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        ETag: '"test-etag"'
      })
    }),
    getObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Body: Buffer.from('test content')
      })
    }),
    deleteObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    headObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        ContentLength: 1000,
        LastModified: new Date()
      })
    }),
    headBucket: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  })),
  
  CloudWatch: jest.fn(() => ({
    putMetricData: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    getMetricStatistics: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Datapoints: []
      })
    })
  })),
  
  SNS: jest.fn(() => ({
    publish: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        MessageId: 'test-sns-message-id'
      })
    })
  })),
  
  Lambda: jest.fn(() => ({
    invoke: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        StatusCode: 200,
        Payload: JSON.stringify({ result: 'success' })
      })
    })
  }))
}));

// Mock logging service
jest.mock('../src/services/logging.service', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock cost tracking service
jest.mock('../src/services/cost-tracking.service', () => ({
  costTracker: {
    trackAgentExecution: jest.fn().mockResolvedValue(undefined),
    trackLLMUsage: jest.fn().mockResolvedValue(undefined),
    trackCommunicationCost: jest.fn().mockResolvedValue(undefined),
    trackDLQOperation: jest.fn().mockResolvedValue(undefined),
    getAgentCosts: jest.fn().mockResolvedValue({
      hourlyRate: 0.1,
      dailyCost: 2.4,
      monthlyCost: 72,
      llmCost: 1.5,
      infraCost: 0.9,
      totalCost: 2.4
    }),
    updateAgentCosts: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock secrets service
jest.mock('../src/services/secrets.service', () => ({
  secretsService: {
    getSecret: jest.fn().mockResolvedValue('mock-secret-value'),
    setSecret: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock authentication
jest.mock('../src/services/auth.service', () => ({
  authService: {
    validateToken: jest.fn().mockResolvedValue({
      valid: true,
      userId: 'test-user-123',
      roles: ['user']
    }),
    extractUserFromToken: jest.fn().mockReturnValue({
      userId: 'test-user-123',
      email: 'test@example.com',
      roles: ['user']
    })
  }
}));

// Mock fetch for external API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({ result: 'success' }),
    text: () => Promise.resolve('success')
  } as Response)
);

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock setTimeout and setInterval for consistent testing
global.setTimeout = jest.fn((callback, delay) => {
  if (typeof callback === 'function') {
    callback();
  }
  return 1 as any;
});

global.setInterval = jest.fn((callback, delay) => {
  return 1 as any;
});

global.clearTimeout = jest.fn();
global.clearInterval = jest.fn();

// Helper functions for tests
export const createMockAPIGatewayEvent = (overrides: Partial<any> = {}): any => ({
  httpMethod: 'POST',
  path: '/test',
  pathParameters: {},
  queryStringParameters: {},
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token'
  },
  body: JSON.stringify({}),
  isBase64Encoded: false,
  requestContext: {
    requestId: 'test-request-id',
    accountId: '123456789012',
    identity: {
      sourceIp: '127.0.0.1'
    }
  },
  ...overrides
});

export const createMockSQSEvent = (messages: any[] = []): any => ({
  Records: messages.map((message, index) => ({
    messageId: `test-message-${index}`,
    receiptHandle: `test-receipt-${index}`,
    body: JSON.stringify(message),
    attributes: {},
    messageAttributes: {},
    eventSource: 'aws:sqs',
    eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue'
  }))
});

export const createMockStepFunctionEvent = (overrides: any = {}): any => ({
  stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:test',
  executionArn: 'arn:aws:states:us-east-1:123456789012:execution:test:test-execution',
  name: 'test-execution',
  status: 'RUNNING',
  startDate: new Date().toISOString(),
  input: JSON.stringify({ test: 'data' }),
  ...overrides
});

// Performance testing helpers
export const measureExecutionTime = async (fn: () => Promise<any>): Promise<{ result: any; duration: number }> => {
  const startTime = process.hrtime.bigint();
  const result = await fn();
  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
  
  return { result, duration };
};

// Error simulation helpers
export const simulateError = (errorType: 'network' | 'timeout' | 'auth' | 'validation', message?: string) => {
  const errors = {
    network: new Error(message || 'Network connection failed'),
    timeout: new Error(message || 'Request timeout'),
    auth: new Error(message || 'Authentication failed'),
    validation: new Error(message || 'Validation failed')
  };
  
  return errors[errorType];
};

// Data generation helpers
export const generateRandomString = (length: number = 10): string => {
  return Math.random().toString(36).substring(2, 2 + length);
};

export const generateRandomNumber = (min: number = 0, max: number = 100): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const generateMockCurriculumData = () => ({
  program: 'Computer Science',
  university: 'Central European University',
  courses: [
    {
      code: 'CS101',
      name: 'Introduction to Programming',
      credits: 3,
      description: 'Basic programming concepts using Python'
    },
    {
      code: 'CS201',
      name: 'Data Structures and Algorithms',
      credits: 4,
      description: 'Advanced data structures and algorithm analysis'
    }
  ],
  lastUpdated: new Date().toISOString()
});

// Test utilities for async operations
export const waitFor = (condition: () => boolean, timeout: number = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 10);
      }
    };
    
    check();
  });
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};