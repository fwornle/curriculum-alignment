import { jest } from '@jest/globals';

export interface MockLLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

export interface MockEmbeddingResponse {
  embeddings: number[][];
  usage: {
    totalTokens: number;
  };
  model: string;
}

export class MockLLMService {
  private responses: Map<string, MockLLMResponse> = new Map();
  private embeddings: Map<string, MockEmbeddingResponse> = new Map();
  private failureMethods: Map<string, Error> = new Map();
  private callCounts: Map<string, number> = new Map();

  constructor() {
    this.setupDefaultResponses();
  }

  private setupDefaultResponses(): void {
    // Default responses for common prompts
    this.responses.set('curriculum-analysis', {
      content: JSON.stringify({
        gaps: [
          {
            category: 'Core Programming',
            missing: ['Advanced Algorithms', 'Data Structures'],
            severity: 'high',
            recommendation: 'Add CS301 Advanced Algorithms course'
          }
        ],
        alignment: {
          score: 0.85,
          strengths: ['Strong theoretical foundation'],
          weaknesses: ['Limited practical projects']
        },
        recommendations: [
          'Increase hands-on programming assignments',
          'Add industry collaboration projects'
        ]
      }),
      usage: {
        promptTokens: 1500,
        completionTokens: 800,
        totalTokens: 2300
      },
      model: 'gpt-4',
      finishReason: 'stop'
    });

    this.responses.set('terminology-standardization', {
      content: JSON.stringify({
        standardizedTerms: {
          'AI': 'Artificial Intelligence',
          'ML': 'Machine Learning',
          'DL': 'Deep Learning'
        },
        corrections: [
          {
            original: 'Artifical Intelligence',
            corrected: 'Artificial Intelligence',
            confidence: 0.95
          }
        ],
        consistency: {
          score: 0.92,
          issues: ['Inconsistent capitalization of "machine learning"']
        }
      }),
      usage: {
        promptTokens: 800,
        completionTokens: 400,
        totalTokens: 1200
      },
      model: 'gpt-3.5-turbo',
      finishReason: 'stop'
    });

    this.responses.set('quality-assessment', {
      content: JSON.stringify({
        qualityScore: 0.87,
        issues: [
          {
            type: 'formatting',
            severity: 'low',
            message: 'Inconsistent bullet point formatting',
            location: 'Section 3.2'
          },
          {
            type: 'clarity',
            severity: 'medium',
            message: 'Learning objective unclear',
            location: 'Course CS101'
          }
        ],
        corrections: [
          {
            type: 'grammar',
            original: 'student will learns',
            corrected: 'student will learn',
            confidence: 0.99
          }
        ],
        readability: {
          score: 0.78,
          level: 'undergraduate',
          suggestions: ['Use shorter sentences', 'Define technical terms']
        }
      }),
      usage: {
        promptTokens: 1200,
        completionTokens: 600,
        totalTokens: 1800
      },
      model: 'gpt-4',
      finishReason: 'stop'
    });

    // Default embeddings
    this.embeddings.set('computer science curriculum', {
      embeddings: [Array.from({ length: 1536 }, () => Math.random() - 0.5)],
      usage: { totalTokens: 4 },
      model: 'text-embedding-ada-002'
    });
  }

  // Mock LLM completion
  async generateCompletion(
    prompt: string, 
    model: string = 'gpt-4',
    temperature: number = 0.7
  ): Promise<MockLLMResponse> {
    this.incrementCallCount('generateCompletion');

    if (this.failureMethods.has('generateCompletion')) {
      throw this.failureMethods.get('generateCompletion');
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Find matching response based on prompt content
    const matchingKey = Array.from(this.responses.keys()).find(key => 
      prompt.toLowerCase().includes(key.toLowerCase())
    );

    if (matchingKey) {
      const response = this.responses.get(matchingKey)!;
      return {
        ...response,
        model,
        usage: {
          ...response.usage,
          // Add some variation based on prompt length
          promptTokens: Math.floor(prompt.length / 4),
          totalTokens: response.usage.completionTokens + Math.floor(prompt.length / 4)
        }
      };
    }

    // Default generic response
    return {
      content: JSON.stringify({
        analysis: 'Generic analysis completed',
        confidence: 0.75,
        recommendations: ['Review and validate results']
      }),
      usage: {
        promptTokens: Math.floor(prompt.length / 4),
        completionTokens: 200,
        totalTokens: Math.floor(prompt.length / 4) + 200
      },
      model,
      finishReason: 'stop'
    };
  }

  // Mock embedding generation
  async generateEmbedding(
    text: string,
    model: string = 'text-embedding-ada-002'
  ): Promise<MockEmbeddingResponse> {
    this.incrementCallCount('generateEmbedding');

    if (this.failureMethods.has('generateEmbedding')) {
      throw this.failureMethods.get('generateEmbedding');
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));

    // Find matching embedding or generate random one
    const matchingKey = Array.from(this.embeddings.keys()).find(key => 
      text.toLowerCase().includes(key.toLowerCase())
    );

    if (matchingKey) {
      return this.embeddings.get(matchingKey)!;
    }

    // Generate random embedding
    return {
      embeddings: [Array.from({ length: 1536 }, () => Math.random() - 0.5)],
      usage: {
        totalTokens: Math.ceil(text.length / 4)
      },
      model
    };
  }

  // Mock streaming completion
  async *generateStreamingCompletion(
    prompt: string,
    model: string = 'gpt-4'
  ): AsyncGenerator<{ content: string; done: boolean }> {
    this.incrementCallCount('generateStreamingCompletion');

    if (this.failureMethods.has('generateStreamingCompletion')) {
      throw this.failureMethods.get('generateStreamingCompletion');
    }

    const response = await this.generateCompletion(prompt, model);
    const content = response.content;
    const chunks = content.match(/.{1,20}/g) || [content];

    for (const chunk of chunks) {
      yield { content: chunk, done: false };
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    yield { content: '', done: true };
  }

  // Mock function calling
  async callFunction(
    prompt: string,
    functions: Array<{ name: string; description: string; parameters: any }>,
    model: string = 'gpt-4'
  ): Promise<{ functionCall: { name: string; arguments: string } }> {
    this.incrementCallCount('callFunction');

    if (this.failureMethods.has('callFunction')) {
      throw this.failureMethods.get('callFunction');
    }

    // Return first available function with mock arguments
    const functionName = functions[0]?.name || 'unknown';
    
    return {
      functionCall: {
        name: functionName,
        arguments: JSON.stringify({
          analysis: 'Function call completed',
          parameters: { mock: true }
        })
      }
    };
  }

  // Configuration methods for tests
  setResponse(key: string, response: MockLLMResponse): void {
    this.responses.set(key, response);
  }

  setEmbedding(key: string, embedding: MockEmbeddingResponse): void {
    this.embeddings.set(key, embedding);
  }

  shouldFail(method: string, error: Error): void {
    this.failureMethods.set(method, error);
  }

  getCallCount(method: string): number {
    return this.callCounts.get(method) || 0;
  }

  getTotalTokensUsed(): number {
    return Array.from(this.responses.values())
      .reduce((total, response) => total + response.usage.totalTokens, 0) * 
      (this.getCallCount('generateCompletion') || 1);
  }

  // Test helper: simulate rate limiting
  simulateRateLimit(): void {
    this.shouldFail('generateCompletion', new Error('Rate limit exceeded'));
    this.shouldFail('generateEmbedding', new Error('Rate limit exceeded'));
  }

  // Test helper: simulate network error
  simulateNetworkError(): void {
    this.shouldFail('generateCompletion', new Error('Network error'));
    this.shouldFail('generateEmbedding', new Error('Network error'));
  }

  // Test helper: simulate invalid API key
  simulateAuthError(): void {
    this.shouldFail('generateCompletion', new Error('Invalid API key'));
    this.shouldFail('generateEmbedding', new Error('Invalid API key'));
  }

  private incrementCallCount(method: string): void {
    const current = this.callCounts.get(method) || 0;
    this.callCounts.set(method, current + 1);
  }

  reset(): void {
    this.failureMethods.clear();
    this.callCounts.clear();
    this.setupDefaultResponses();
  }

  // Mock cost calculation
  calculateCost(usage: { promptTokens: number; completionTokens: number }, model: string): number {
    const costPerToken = {
      'gpt-4': { prompt: 0.00003, completion: 0.00006 },
      'gpt-3.5-turbo': { prompt: 0.0000015, completion: 0.000002 },
      'text-embedding-ada-002': { prompt: 0.0000001, completion: 0 }
    };

    const costs = costPerToken[model as keyof typeof costPerToken] || costPerToken['gpt-4'];
    
    return (usage.promptTokens * costs.prompt) + (usage.completionTokens * costs.completion);
  }

  // Performance testing helpers
  setLatency(methodName: string, latencyMs: number): void {
    const originalMethod = (this as any)[methodName];
    
    (this as any)[methodName] = async (...args: any[]) => {
      await new Promise(resolve => setTimeout(resolve, latencyMs));
      return originalMethod.apply(this, args);
    };
  }

  // Quality testing helpers
  setResponseQuality(quality: 'high' | 'medium' | 'low'): void {
    const qualityResponses = {
      high: {
        confidence: 0.95,
        detail: 'comprehensive',
        accuracy: 0.98
      },
      medium: {
        confidence: 0.75,
        detail: 'adequate',
        accuracy: 0.85
      },
      low: {
        confidence: 0.45,
        detail: 'minimal',
        accuracy: 0.60
      }
    };

    const config = qualityResponses[quality];
    
    // Update all responses with quality indicators
    for (const [key, response] of this.responses.entries()) {
      const parsedContent = JSON.parse(response.content);
      parsedContent.quality = config;
      
      this.responses.set(key, {
        ...response,
        content: JSON.stringify(parsedContent)
      });
    }
  }
}