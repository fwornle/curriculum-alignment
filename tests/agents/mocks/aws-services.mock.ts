import { jest } from '@jest/globals';

export interface MockExecutionResult {
  status: string;
  startDate?: Date;
  stopDate?: Date;
  stateMachineArn: string;
  input?: string;
  output?: string;
  error?: string;
}

export interface MockHistoryEvent {
  type: string;
  timestamp: Date;
  stateEnteredEventDetails?: { name: string };
  stateExitedEventDetails?: { name: string };
  taskFailedEventDetails?: { error: string; cause: string };
}

export class MockAWSServices {
  public stepFunctions: MockStepFunctions;
  public sqs: MockSQS;
  public s3: MockS3;
  public dynamoDB: MockDynamoDB;
  public eventBridge: MockEventBridge;
  public cloudWatch: MockCloudWatch;
  public sns: MockSNS;

  constructor() {
    this.stepFunctions = new MockStepFunctions();
    this.sqs = new MockSQS();
    this.s3 = new MockS3();
    this.dynamoDB = new MockDynamoDB();
    this.eventBridge = new MockEventBridge();
    this.cloudWatch = new MockCloudWatch();
    this.sns = new MockSNS();
  }

  reset(): void {
    this.stepFunctions.reset();
    this.sqs.reset();
    this.s3.reset();
    this.dynamoDB.reset();
    this.eventBridge.reset();
    this.cloudWatch.reset();
    this.sns.reset();
  }
}

export class MockStepFunctions {
  public startExecution = jest.fn();
  public stopExecution = jest.fn();
  public describeExecution = jest.fn();
  public getExecutionHistory = jest.fn();
  public listExecutions = jest.fn();

  private executions: Map<string, MockExecutionResult> = new Map();
  private executionHistories: Map<string, MockHistoryEvent[]> = new Map();
  private runningExecutions: string[] = [];
  private failureMethods: Map<string, Error> = new Map();

  constructor() {
    this.setupDefaultMocks();
  }

  private setupDefaultMocks(): void {
    this.startExecution.mockImplementation((params: any) => {
      if (this.failureMethods.has('startExecution')) {
        throw this.failureMethods.get('startExecution');
      }

      const executionArn = `arn:aws:states:us-east-1:123456789012:execution:test:${params.name || Date.now()}`;
      return {
        promise: () => Promise.resolve({
          executionArn,
          startDate: new Date()
        })
      };
    });

    this.describeExecution.mockImplementation((params: any) => {
      if (this.failureMethods.has('describeExecution')) {
        throw this.failureMethods.get('describeExecution');
      }

      const executionId = this.extractExecutionId(params.executionArn);
      const execution = this.executions.get(executionId);

      if (!execution) {
        throw new Error('Execution not found');
      }

      return {
        promise: () => Promise.resolve({
          executionArn: params.executionArn,
          stateMachineArn: execution.stateMachineArn,
          name: executionId,
          status: execution.status,
          startDate: execution.startDate,
          stopDate: execution.stopDate,
          input: execution.input,
          output: execution.output,
          error: execution.error
        })
      };
    });

    this.getExecutionHistory.mockImplementation((params: any) => {
      if (this.failureMethods.has('getExecutionHistory')) {
        throw this.failureMethods.get('getExecutionHistory');
      }

      const executionId = this.extractExecutionId(params.executionArn);
      const history = this.executionHistories.get(executionId) || [];

      return {
        promise: () => Promise.resolve({
          events: history
        })
      };
    });

    this.listExecutions.mockImplementation((params: any) => {
      if (this.failureMethods.has('listExecutions')) {
        throw this.failureMethods.get('listExecutions');
      }

      const executions = Array.from(this.executions.entries())
        .filter(([_, exec]) => !params.statusFilter || exec.status === params.statusFilter)
        .map(([id, exec]) => ({
          executionArn: `arn:aws:states:us-east-1:123456789012:execution:test:${id}`,
          stateMachineArn: exec.stateMachineArn,
          name: id,
          status: exec.status,
          startDate: exec.startDate,
          stopDate: exec.stopDate
        }));

      return {
        promise: () => Promise.resolve({ executions })
      };
    });
  }

  mockExecution(executionId: string, execution: MockExecutionResult): void {
    this.executions.set(executionId, execution);
  }

  mockExecutionHistory(executionId: string, events: MockHistoryEvent[]): void {
    this.executionHistories.set(executionId, events);
  }

  mockRunningExecutions(executionIds: string[]): void {
    this.runningExecutions = executionIds;
    executionIds.forEach(id => {
      this.mockExecution(id, {
        status: 'RUNNING',
        startDate: new Date(),
        stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:test'
      });
    });
  }

  shouldFail(method: string, error: Error): void {
    this.failureMethods.set(method, error);
  }

  private extractExecutionId(executionArn: string): string {
    return executionArn.split(':').pop() || '';
  }

  reset(): void {
    this.executions.clear();
    this.executionHistories.clear();
    this.runningExecutions = [];
    this.failureMethods.clear();
    jest.clearAllMocks();
  }
}

export class MockSQS {
  public sendMessage = jest.fn();
  public receiveMessage = jest.fn();
  public deleteMessage = jest.fn();
  public getQueueAttributes = jest.fn();

  private messages: Map<string, any[]> = new Map();
  private failureMethods: Map<string, Error> = new Map();

  constructor() {
    this.setupDefaultMocks();
  }

  private setupDefaultMocks(): void {
    this.sendMessage.mockImplementation((params: any) => {
      if (this.failureMethods.has('sendMessage')) {
        throw this.failureMethods.get('sendMessage');
      }

      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const queueMessages = this.messages.get(params.QueueUrl) || [];
      queueMessages.push({
        MessageId: messageId,
        Body: params.MessageBody,
        Attributes: params.MessageAttributes
      });
      this.messages.set(params.QueueUrl, queueMessages);

      return {
        promise: () => Promise.resolve({ MessageId: messageId })
      };
    });

    this.receiveMessage.mockImplementation((params: any) => {
      if (this.failureMethods.has('receiveMessage')) {
        throw this.failureMethods.get('receiveMessage');
      }

      const queueMessages = this.messages.get(params.QueueUrl) || [];
      const messagesToReturn = queueMessages.splice(0, params.MaxNumberOfMessages || 1);

      return {
        promise: () => Promise.resolve({
          Messages: messagesToReturn.map(msg => ({
            ...msg,
            ReceiptHandle: `receipt-${msg.MessageId}`
          }))
        })
      };
    });

    this.getQueueAttributes.mockImplementation((params: any) => {
      if (this.failureMethods.has('getQueueAttributes')) {
        throw this.failureMethods.get('getQueueAttributes');
      }

      const queueMessages = this.messages.get(params.QueueUrl) || [];

      return {
        promise: () => Promise.resolve({
          Attributes: {
            ApproximateNumberOfMessages: queueMessages.length.toString(),
            ApproximateNumberOfMessagesNotVisible: '0',
            ApproximateNumberOfMessagesDelayed: '0'
          }
        })
      };
    });
  }

  addMessage(queueUrl: string, message: any): void {
    const queueMessages = this.messages.get(queueUrl) || [];
    queueMessages.push(message);
    this.messages.set(queueUrl, queueMessages);
  }

  shouldFail(method: string, error: Error): void {
    this.failureMethods.set(method, error);
  }

  reset(): void {
    this.messages.clear();
    this.failureMethods.clear();
    jest.clearAllMocks();
  }
}

export class MockS3 {
  public putObject = jest.fn();
  public getObject = jest.fn();
  public deleteObject = jest.fn();
  public headObject = jest.fn();
  public listObjects = jest.fn();

  private objects: Map<string, any> = new Map();
  private failureMethods: Map<string, Error> = new Map();

  constructor() {
    this.setupDefaultMocks();
  }

  private setupDefaultMocks(): void {
    this.putObject.mockImplementation((params: any) => {
      if (this.failureMethods.has('putObject')) {
        throw this.failureMethods.get('putObject');
      }

      const key = `${params.Bucket}/${params.Key}`;
      this.objects.set(key, {
        Body: params.Body,
        ContentType: params.ContentType,
        Metadata: params.Metadata
      });

      return {
        promise: () => Promise.resolve({ ETag: '"mock-etag"' })
      };
    });

    this.getObject.mockImplementation((params: any) => {
      if (this.failureMethods.has('getObject')) {
        throw this.failureMethods.get('getObject');
      }

      const key = `${params.Bucket}/${params.Key}`;
      const object = this.objects.get(key);

      if (!object) {
        throw new Error('NoSuchKey');
      }

      return {
        promise: () => Promise.resolve(object)
      };
    });
  }

  addObject(bucket: string, key: string, body: any, metadata?: any): void {
    const fullKey = `${bucket}/${key}`;
    this.objects.set(fullKey, {
      Body: body,
      Metadata: metadata || {}
    });
  }

  shouldFail(method: string, error: Error): void {
    this.failureMethods.set(method, error);
  }

  reset(): void {
    this.objects.clear();
    this.failureMethods.clear();
    jest.clearAllMocks();
  }
}

export class MockDynamoDB {
  public putItem = jest.fn();
  public getItem = jest.fn();
  public query = jest.fn();
  public scan = jest.fn();
  public deleteItem = jest.fn();
  public updateItem = jest.fn();

  private tables: Map<string, Map<string, any>> = new Map();
  private failureMethods: Map<string, Error> = new Map();

  constructor() {
    this.setupDefaultMocks();
  }

  private setupDefaultMocks(): void {
    this.putItem.mockImplementation((params: any) => {
      if (this.failureMethods.has('putItem')) {
        throw this.failureMethods.get('putItem');
      }

      const table = this.tables.get(params.TableName) || new Map();
      const key = this.extractKey(params.Item);
      table.set(key, params.Item);
      this.tables.set(params.TableName, table);

      return {
        promise: () => Promise.resolve({})
      };
    });

    this.getItem.mockImplementation((params: any) => {
      if (this.failureMethods.has('getItem')) {
        throw this.failureMethods.get('getItem');
      }

      const table = this.tables.get(params.TableName);
      const key = this.extractKey(params.Key);
      const item = table?.get(key);

      return {
        promise: () => Promise.resolve({ Item: item })
      };
    });
  }

  private extractKey(item: any): string {
    // Simple key extraction - assumes single string key
    const keyValue = Object.values(item)[0] as any;
    return keyValue.S || keyValue.toString();
  }

  addItem(tableName: string, item: any): void {
    const table = this.tables.get(tableName) || new Map();
    const key = this.extractKey(item);
    table.set(key, item);
    this.tables.set(tableName, table);
  }

  shouldFail(method: string, error: Error): void {
    this.failureMethods.set(method, error);
  }

  reset(): void {
    this.tables.clear();
    this.failureMethods.clear();
    jest.clearAllMocks();
  }
}

export class MockEventBridge {
  public putEvents = jest.fn();

  private events: any[] = [];
  private failureMethods: Map<string, Error> = new Map();

  constructor() {
    this.setupDefaultMocks();
  }

  private setupDefaultMocks(): void {
    this.putEvents.mockImplementation((params: any) => {
      if (this.failureMethods.has('putEvents')) {
        throw this.failureMethods.get('putEvents');
      }

      this.events.push(...params.Entries);

      return {
        promise: () => Promise.resolve({
          FailedEntryCount: 0,
          Entries: params.Entries.map((_: any, index: number) => ({
            EventId: `event-${index}-${Date.now()}`
          }))
        })
      };
    });
  }

  getEvents(): any[] {
    return [...this.events];
  }

  shouldFail(method: string, error: Error): void {
    this.failureMethods.set(method, error);
  }

  reset(): void {
    this.events = [];
    this.failureMethods.clear();
    jest.clearAllMocks();
  }
}

export class MockCloudWatch {
  public putMetricData = jest.fn();
  public getMetricStatistics = jest.fn();

  private metrics: any[] = [];
  private failureMethods: Map<string, Error> = new Map();

  constructor() {
    this.setupDefaultMocks();
  }

  private setupDefaultMocks(): void {
    this.putMetricData.mockImplementation((params: any) => {
      if (this.failureMethods.has('putMetricData')) {
        throw this.failureMethods.get('putMetricData');
      }

      this.metrics.push(...params.MetricData);

      return {
        promise: () => Promise.resolve({})
      };
    });

    this.getMetricStatistics.mockImplementation((params: any) => {
      if (this.failureMethods.has('getMetricStatistics')) {
        throw this.failureMethods.get('getMetricStatistics');
      }

      return {
        promise: () => Promise.resolve({
          Datapoints: [
            { Timestamp: new Date(), Value: 10, Unit: 'Count' },
            { Timestamp: new Date(), Value: 15, Unit: 'Count' }
          ]
        })
      };
    });
  }

  getMetrics(): any[] {
    return [...this.metrics];
  }

  shouldFail(method: string, error: Error): void {
    this.failureMethods.set(method, error);
  }

  reset(): void {
    this.metrics = [];
    this.failureMethods.clear();
    jest.clearAllMocks();
  }
}

export class MockSNS {
  public publish = jest.fn();

  private messages: any[] = [];
  private failureMethods: Map<string, Error> = new Map();

  constructor() {
    this.setupDefaultMocks();
  }

  private setupDefaultMocks(): void {
    this.publish.mockImplementation((params: any) => {
      if (this.failureMethods.has('publish')) {
        throw this.failureMethods.get('publish');
      }

      this.messages.push(params);

      return {
        promise: () => Promise.resolve({
          MessageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        })
      };
    });
  }

  getMessages(): any[] {
    return [...this.messages];
  }

  shouldFail(method: string, error: Error): void {
    this.failureMethods.set(method, error);
  }

  reset(): void {
    this.messages = [];
    this.failureMethods.clear();
    jest.clearAllMocks();
  }
}