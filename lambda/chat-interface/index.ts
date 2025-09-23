import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../src/services/logging.service';
import { errorHandler } from '../../src/utils/error-handler';
import { costTracker } from '../../src/services/cost-tracking.service';
import { ConversationEngine } from './conversation-engine';

interface ChatRequest {
  message: {
    text: string;
    type: 'text' | 'voice' | 'image';
    attachments?: Attachment[];
  };
  conversation: {
    id?: string;
    userId: string;
    context?: ConversationContext;
    history?: ChatMessage[];
  };
  preferences?: {
    responseLength: 'brief' | 'detailed' | 'comprehensive';
    responseStyle: 'casual' | 'formal' | 'academic';
    includeReferences: boolean;
    language: string;
  };
  modelConfig?: {
    provider: 'openai' | 'anthropic' | 'cohere';
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

interface Attachment {
  type: 'document' | 'image' | 'link';
  url: string;
  name: string;
  mimeType: string;
  size?: number;
}

interface ConversationContext {
  domain: string;
  university?: string;
  program?: string;
  userRole: 'student' | 'faculty' | 'admin' | 'researcher';
  currentTopic?: string;
  relatedDocuments?: string[];
  sessionData?: any;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    type: string;
    confidence?: number;
    sources?: string[];
    attachments?: Attachment[];
  };
}

interface ChatResponse {
  success: boolean;
  requestId: string;
  data?: {
    conversation: {
      id: string;
      message: ChatMessage;
      suggestions: string[];
      relatedQuestions: string[];
      context: ConversationSummary;
    };
    sources: Source[];
    analytics: ChatAnalytics;
    metadata: {
      responseDate: string;
      conversationId: string;
      messageCount: number;
      processingTime: number;
      confidence: number;
      modelUsed: string;
    };
    costs: {
      llmUsage: number;
      searchUsage: number;
      total: number;
    };
  };
  error?: string;
  details?: any;
}

interface ConversationSummary {
  id: string;
  userId: string;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
  topics: string[];
  status: 'active' | 'paused' | 'completed';
  sentiment: 'positive' | 'neutral' | 'negative';
  satisfaction?: number;
}

interface Source {
  id: string;
  title: string;
  type: 'course' | 'program' | 'document' | 'university' | 'policy';
  url?: string;
  relevance: number;
  snippet: string;
  metadata: {
    university: string;
    documentType: string;
    lastUpdated: string;
  };
}

interface ChatAnalytics {
  intentClassification: {
    intent: string;
    confidence: number;
    alternatives: Array<{ intent: string; confidence: number }>;
  };
  entityExtraction: {
    entities: Array<{
      text: string;
      type: string;
      confidence: number;
    }>;
  };
  sentimentAnalysis: {
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    confidence: number;
  };
  topicDetection: {
    topics: Array<{
      topic: string;
      relevance: number;
    }>;
  };
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  logger.info('Chat Interface Agent request received', {
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
    
    let response: ChatResponse;

    switch (method) {
      case 'POST':
        if (pathSegments.includes('chat')) {
          const requestBody = JSON.parse(event.body || '{}') as ChatRequest;
          response = await handleChatMessage(requestBody, event, requestId);
        } else if (pathSegments.includes('feedback')) {
          const requestBody = JSON.parse(event.body || '{}');
          response = await handleFeedback(requestBody, requestId);
        } else if (pathSegments.includes('voice')) {
          const requestBody = JSON.parse(event.body || '{}');
          response = await handleVoiceMessage(requestBody, requestId);
        } else if (pathSegments.includes('analyze')) {
          const requestBody = JSON.parse(event.body || '{}');
          response = await handleAnalyzeMessage(requestBody, requestId);
        } else {
          throw new Error(`Unsupported operation: ${event.path}`);
        }
        break;

      case 'GET':
        if (pathSegments.includes('health')) {
          response = await handleHealthCheck(requestId);
        } else if (pathSegments.includes('conversation')) {
          const conversationId = pathSegments[pathSegments.indexOf('conversation') + 1];
          response = await handleGetConversation(conversationId, requestId);
        } else if (pathSegments.includes('conversations')) {
          const userId = event.queryStringParameters?.userId;
          response = await handleGetConversations(userId, requestId);
        } else if (pathSegments.includes('suggestions')) {
          const context = event.queryStringParameters?.context;
          response = await handleGetSuggestions(context, requestId);
        } else if (pathSegments.includes('topics')) {
          response = await handleGetPopularTopics(requestId);
        } else {
          throw new Error(`Unsupported operation: ${event.path}`);
        }
        break;

      case 'PUT':
        if (pathSegments.includes('conversation')) {
          const conversationId = pathSegments[pathSegments.indexOf('conversation') + 1];
          const requestBody = JSON.parse(event.body || '{}');
          response = await handleUpdateConversation(conversationId, requestBody, requestId);
        } else {
          throw new Error(`Unsupported operation: ${event.path}`);
        }
        break;

      case 'DELETE':
        if (pathSegments.includes('conversation')) {
          const conversationId = pathSegments[pathSegments.indexOf('conversation') + 1];
          response = await handleDeleteConversation(conversationId, requestId);
        } else {
          throw new Error(`Unsupported operation: ${event.path}`);
        }
        break;

      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    const processingTime = Date.now() - startTime;
    
    logger.info('Chat Interface Agent request completed', {
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
    
    logger.error('Chat Interface Agent error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime
    });

    await costTracker.trackCost('chat-interface', 'error', 0.001, {
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

async function handleChatMessage(
  request: ChatRequest,
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<ChatResponse> {
  const startTime = Date.now();

  try {
    logger.info('Processing chat message', {
      requestId,
      userId: request.conversation.userId,
      conversationId: request.conversation.id,
      messageLength: request.message.text.length
    });

    // Initialize conversation engine
    const conversationEngine = new ConversationEngine(request.modelConfig);
    
    // Process the message
    const result = await errorHandler.execute(
      () => conversationEngine.processMessage(
        request.message,
        request.conversation,
        request.preferences || {}
      ),
      { operationName: 'process_message', correlationId: requestId }
    );

    // Generate response
    const assistantMessage = await errorHandler.execute(
      () => conversationEngine.generateResponse(
        result.processedMessage,
        result.conversationState,
        request.preferences || {}
      ),
      { operationName: 'generate_response', correlationId: requestId }
    );

    // Get relevant sources
    const sources = await errorHandler.execute(
      () => conversationEngine.findRelevantSources(
        request.message.text,
        request.conversation.context
      ),
      { operationName: 'find_sources', correlationId: requestId }
    );

    // Analyze the conversation
    const analytics = await errorHandler.execute(
      () => conversationEngine.analyzeMessage(request.message.text),
      { operationName: 'analyze_message', correlationId: requestId }
    );

    // Generate suggestions and related questions
    const suggestions = await conversationEngine.generateSuggestions(
      result.conversationState,
      analytics
    );
    
    const relatedQuestions = await conversationEngine.generateRelatedQuestions(
      request.message.text,
      result.conversationState
    );

    // Update conversation state
    const updatedConversation = await conversationEngine.updateConversation(
      result.conversationState,
      assistantMessage,
      analytics
    );

    const processingTime = Date.now() - startTime;
    
    // Track costs
    const costs = await costTracker.trackCost('chat-interface', 'chat', 0.04, {
      requestId,
      userId: request.conversation.userId,
      conversationId: result.conversationState.id,
      messageLength: request.message.text.length,
      responseLength: assistantMessage.content.length,
      processingTime
    });

    // Calculate confidence
    const confidence = calculateResponseConfidence(assistantMessage, sources, analytics);

    logger.info('Chat message processed successfully', {
      requestId,
      conversationId: result.conversationState.id,
      processingTime,
      responseLength: assistantMessage.content.length,
      confidence
    });

    return {
      success: true,
      requestId,
      data: {
        conversation: {
          id: result.conversationState.id,
          message: assistantMessage,
          suggestions,
          relatedQuestions,
          context: updatedConversation
        },
        sources,
        analytics,
        metadata: {
          responseDate: new Date().toISOString(),
          conversationId: result.conversationState.id,
          messageCount: updatedConversation.messageCount,
          processingTime,
          confidence,
          modelUsed: request.modelConfig?.model || 'default'
        },
        costs: {
          llmUsage: costs.details?.llm || 0,
          searchUsage: costs.details?.search || 0,
          total: costs.amount
        }
      }
    };

  } catch (error) {
    logger.error('Chat message processing failed', {
      requestId,
      userId: request.conversation.userId,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Chat message processing failed',
      details: error instanceof Error ? error.stack : undefined
    };
  }
}

async function handleFeedback(
  request: any,
  requestId: string
): Promise<ChatResponse> {
  try {
    logger.info('Processing user feedback', { requestId, feedback: request.feedback });

    const conversationEngine = new ConversationEngine();
    const processed = await conversationEngine.processFeedback(
      request.conversationId,
      request.messageId,
      request.feedback
    );

    return {
      success: true,
      requestId,
      data: {
        conversation: {
          id: request.conversationId,
          message: {
            id: 'feedback_response',
            role: 'assistant',
            content: 'Thank you for your feedback! This helps us improve our responses.',
            timestamp: new Date().toISOString(),
            metadata: { type: 'feedback_acknowledgment', confidence: 1.0 }
          },
          suggestions: [],
          relatedQuestions: [],
          context: processed.conversation
        },
        sources: [],
        analytics: {
          intentClassification: { intent: 'feedback', confidence: 1.0, alternatives: [] },
          entityExtraction: { entities: [] },
          sentimentAnalysis: { sentiment: 'neutral', score: 0.5, confidence: 0.8 },
          topicDetection: { topics: [{ topic: 'feedback', relevance: 1.0 }] }
        },
        metadata: {
          responseDate: new Date().toISOString(),
          conversationId: request.conversationId,
          messageCount: 0,
          processingTime: 50,
          confidence: 1.0,
          modelUsed: 'feedback_processor'
        },
        costs: {
          llmUsage: 0,
          searchUsage: 0,
          total: 0.001
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Feedback processing failed'
    };
  }
}

async function handleVoiceMessage(
  request: any,
  requestId: string
): Promise<ChatResponse> {
  try {
    logger.info('Processing voice message', { requestId });

    const conversationEngine = new ConversationEngine();
    const transcribed = await conversationEngine.processVoiceMessage(request.audioData);

    // Convert to text chat request and process
    const textRequest: ChatRequest = {
      message: {
        text: transcribed.text,
        type: 'voice'
      },
      conversation: request.conversation,
      preferences: request.preferences
    };

    return await handleChatMessage(textRequest, {} as any, requestId);

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Voice message processing failed'
    };
  }
}

async function handleAnalyzeMessage(
  request: any,
  requestId: string
): Promise<ChatResponse> {
  try {
    logger.info('Analyzing message', { requestId });

    const conversationEngine = new ConversationEngine();
    const analytics = await conversationEngine.analyzeMessage(request.message);

    return {
      success: true,
      requestId,
      data: {
        conversation: {
          id: 'analysis',
          message: {
            id: 'analysis_result',
            role: 'assistant',
            content: JSON.stringify(analytics, null, 2),
            timestamp: new Date().toISOString(),
            metadata: { type: 'analysis_result', confidence: 1.0 }
          },
          suggestions: [],
          relatedQuestions: [],
          context: {
            id: 'analysis',
            userId: 'system',
            startedAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
            messageCount: 1,
            topics: ['analysis'],
            status: 'completed',
            sentiment: 'neutral'
          }
        },
        sources: [],
        analytics,
        metadata: {
          responseDate: new Date().toISOString(),
          conversationId: 'analysis',
          messageCount: 1,
          processingTime: 100,
          confidence: 1.0,
          modelUsed: 'analyzer'
        },
        costs: {
          llmUsage: 0.005,
          searchUsage: 0,
          total: 0.005
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Message analysis failed'
    };
  }
}

async function handleHealthCheck(requestId: string): Promise<ChatResponse> {
  try {
    const conversationEngine = new ConversationEngine();
    await conversationEngine.healthCheck();

    const health = {
      status: 'healthy',
      services: {
        conversationEngine: 'healthy',
        nlp: 'healthy',
        search: 'healthy'
      },
      timestamp: new Date().toISOString()
    };

    return {
      success: true,
      requestId,
      data: {
        conversation: {
          id: 'health',
          message: {
            id: 'health_check',
            role: 'assistant',
            content: JSON.stringify(health),
            timestamp: new Date().toISOString(),
            metadata: { type: 'health_check', confidence: 1.0 }
          },
          suggestions: [],
          relatedQuestions: [],
          context: {
            id: 'health',
            userId: 'system',
            startedAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
            messageCount: 1,
            topics: ['health'],
            status: 'completed',
            sentiment: 'positive'
          }
        },
        sources: [],
        analytics: {
          intentClassification: { intent: 'health_check', confidence: 1.0, alternatives: [] },
          entityExtraction: { entities: [] },
          sentimentAnalysis: { sentiment: 'positive', score: 0.8, confidence: 1.0 },
          topicDetection: { topics: [{ topic: 'health', relevance: 1.0 }] }
        },
        metadata: {
          responseDate: new Date().toISOString(),
          conversationId: 'health',
          messageCount: 1,
          processingTime: 0,
          confidence: 1.0,
          modelUsed: 'health_checker'
        },
        costs: {
          llmUsage: 0,
          searchUsage: 0,
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

async function handleGetConversation(
  conversationId: string,
  requestId: string
): Promise<ChatResponse> {
  try {
    const conversationEngine = new ConversationEngine();
    const conversation = await conversationEngine.getConversation(conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    return {
      success: true,
      requestId,
      data: {
        conversation: {
          id: conversationId,
          message: {
            id: 'conversation_data',
            role: 'assistant',
            content: JSON.stringify(conversation),
            timestamp: new Date().toISOString(),
            metadata: { type: 'conversation_data', confidence: 1.0 }
          },
          suggestions: [],
          relatedQuestions: [],
          context: conversation
        },
        sources: [],
        analytics: {
          intentClassification: { intent: 'get_conversation', confidence: 1.0, alternatives: [] },
          entityExtraction: { entities: [] },
          sentimentAnalysis: { sentiment: 'neutral', score: 0.5, confidence: 1.0 },
          topicDetection: { topics: [] }
        },
        metadata: {
          responseDate: new Date().toISOString(),
          conversationId,
          messageCount: conversation.messageCount,
          processingTime: 10,
          confidence: 1.0,
          modelUsed: 'retrieval'
        },
        costs: {
          llmUsage: 0,
          searchUsage: 0.001,
          total: 0.001
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Conversation retrieval failed'
    };
  }
}

async function handleGetConversations(
  userId: string | undefined,
  requestId: string
): Promise<ChatResponse> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const conversationEngine = new ConversationEngine();
    const conversations = await conversationEngine.getUserConversations(userId);

    return {
      success: true,
      requestId,
      data: {
        conversation: {
          id: 'conversations_list',
          message: {
            id: 'conversations_data',
            role: 'assistant',
            content: JSON.stringify(conversations),
            timestamp: new Date().toISOString(),
            metadata: { type: 'conversations_list', confidence: 1.0 }
          },
          suggestions: [],
          relatedQuestions: [],
          context: {
            id: 'conversations_list',
            userId,
            startedAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
            messageCount: 1,
            topics: ['conversations'],
            status: 'completed',
            sentiment: 'neutral'
          }
        },
        sources: [],
        analytics: {
          intentClassification: { intent: 'get_conversations', confidence: 1.0, alternatives: [] },
          entityExtraction: { entities: [] },
          sentimentAnalysis: { sentiment: 'neutral', score: 0.5, confidence: 1.0 },
          topicDetection: { topics: [] }
        },
        metadata: {
          responseDate: new Date().toISOString(),
          conversationId: 'conversations_list',
          messageCount: 1,
          processingTime: 20,
          confidence: 1.0,
          modelUsed: 'retrieval'
        },
        costs: {
          llmUsage: 0,
          searchUsage: 0.002,
          total: 0.002
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Conversations retrieval failed'
    };
  }
}

async function handleGetSuggestions(
  context: string | undefined,
  requestId: string
): Promise<ChatResponse> {
  const conversationEngine = new ConversationEngine();
  const suggestions = await conversationEngine.getContextualSuggestions(context || 'general');

  return {
    success: true,
    requestId,
    data: {
      conversation: {
        id: 'suggestions',
        message: {
          id: 'suggestions_data',
          role: 'assistant',
          content: 'Here are some suggested questions you can ask',
          timestamp: new Date().toISOString(),
          metadata: { type: 'suggestions', confidence: 1.0 }
        },
        suggestions,
        relatedQuestions: [],
        context: {
          id: 'suggestions',
          userId: 'system',
          startedAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
          messageCount: 1,
          topics: ['suggestions'],
          status: 'completed',
          sentiment: 'neutral'
        }
      },
      sources: [],
      analytics: {
        intentClassification: { intent: 'get_suggestions', confidence: 1.0, alternatives: [] },
        entityExtraction: { entities: [] },
        sentimentAnalysis: { sentiment: 'neutral', score: 0.5, confidence: 1.0 },
        topicDetection: { topics: [] }
      },
      metadata: {
        responseDate: new Date().toISOString(),
        conversationId: 'suggestions',
        messageCount: 1,
        processingTime: 5,
        confidence: 1.0,
        modelUsed: 'suggestions'
      },
      costs: {
        llmUsage: 0,
        searchUsage: 0,
        total: 0
      }
    }
  };
}

async function handleGetPopularTopics(requestId: string): Promise<ChatResponse> {
  const topics = [
    'computer science courses',
    'admission requirements',
    'program comparisons',
    'prerequisite courses',
    'career opportunities',
    'research opportunities',
    'internship programs',
    'study abroad options'
  ];

  return {
    success: true,
    requestId,
    data: {
      conversation: {
        id: 'popular_topics',
        message: {
          id: 'topics_data',
          role: 'assistant',
          content: JSON.stringify(topics),
          timestamp: new Date().toISOString(),
          metadata: { type: 'popular_topics', confidence: 1.0 }
        },
        suggestions: topics,
        relatedQuestions: [],
        context: {
          id: 'popular_topics',
          userId: 'system',
          startedAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
          messageCount: 1,
          topics: ['popular_topics'],
          status: 'completed',
          sentiment: 'neutral'
        }
      },
      sources: [],
      analytics: {
        intentClassification: { intent: 'get_topics', confidence: 1.0, alternatives: [] },
        entityExtraction: { entities: [] },
        sentimentAnalysis: { sentiment: 'neutral', score: 0.5, confidence: 1.0 },
        topicDetection: { topics: topics.map(topic => ({ topic, relevance: 1.0 })) }
      },
      metadata: {
        responseDate: new Date().toISOString(),
        conversationId: 'popular_topics',
        messageCount: 1,
        processingTime: 0,
        confidence: 1.0,
        modelUsed: 'topics'
      },
      costs: {
        llmUsage: 0,
        searchUsage: 0,
        total: 0
      }
    }
  };
}

async function handleUpdateConversation(
  conversationId: string,
  request: any,
  requestId: string
): Promise<ChatResponse> {
  try {
    const conversationEngine = new ConversationEngine();
    const updated = await conversationEngine.updateConversationSettings(
      conversationId,
      request.settings
    );

    return {
      success: true,
      requestId,
      data: {
        conversation: {
          id: conversationId,
          message: {
            id: 'update_confirmation',
            role: 'assistant',
            content: 'Conversation settings updated successfully',
            timestamp: new Date().toISOString(),
            metadata: { type: 'update_confirmation', confidence: 1.0 }
          },
          suggestions: [],
          relatedQuestions: [],
          context: updated
        },
        sources: [],
        analytics: {
          intentClassification: { intent: 'update_conversation', confidence: 1.0, alternatives: [] },
          entityExtraction: { entities: [] },
          sentimentAnalysis: { sentiment: 'positive', score: 0.7, confidence: 1.0 },
          topicDetection: { topics: [] }
        },
        metadata: {
          responseDate: new Date().toISOString(),
          conversationId,
          messageCount: 0,
          processingTime: 20,
          confidence: 1.0,
          modelUsed: 'updater'
        },
        costs: {
          llmUsage: 0,
          searchUsage: 0.001,
          total: 0.001
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Conversation update failed'
    };
  }
}

async function handleDeleteConversation(
  conversationId: string,
  requestId: string
): Promise<ChatResponse> {
  try {
    const conversationEngine = new ConversationEngine();
    const deleted = await conversationEngine.deleteConversation(conversationId);

    return {
      success: true,
      requestId,
      data: {
        conversation: {
          id: conversationId,
          message: {
            id: 'delete_confirmation',
            role: 'assistant',
            content: `Conversation ${conversationId} has been deleted`,
            timestamp: new Date().toISOString(),
            metadata: { type: 'delete_confirmation', confidence: 1.0 }
          },
          suggestions: [],
          relatedQuestions: [],
          context: {
            id: conversationId,
            userId: 'deleted',
            startedAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
            messageCount: 0,
            topics: [],
            status: 'completed',
            sentiment: 'neutral'
          }
        },
        sources: [],
        analytics: {
          intentClassification: { intent: 'delete_conversation', confidence: 1.0, alternatives: [] },
          entityExtraction: { entities: [] },
          sentimentAnalysis: { sentiment: 'neutral', score: 0.5, confidence: 1.0 },
          topicDetection: { topics: [] }
        },
        metadata: {
          responseDate: new Date().toISOString(),
          conversationId,
          messageCount: 0,
          processingTime: 10,
          confidence: 1.0,
          modelUsed: 'deleter'
        },
        costs: {
          llmUsage: 0,
          searchUsage: 0.001,
          total: 0.001
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Conversation deletion failed'
    };
  }
}

// Helper functions
function calculateResponseConfidence(
  message: ChatMessage,
  sources: Source[],
  analytics: ChatAnalytics
): number {
  let confidence = 0.7; // Base confidence

  // Increase confidence if we have relevant sources
  if (sources.length > 0) {
    const avgRelevance = sources.reduce((sum, s) => sum + s.relevance, 0) / sources.length;
    confidence += avgRelevance * 0.2;
  }

  // Increase confidence based on intent classification
  if (analytics.intentClassification.confidence > 0.8) {
    confidence += 0.1;
  }

  // Decrease confidence if sentiment is negative (might indicate confusion)
  if (analytics.sentimentAnalysis.sentiment === 'negative') {
    confidence -= 0.1;
  }

  return Math.max(0.3, Math.min(1.0, confidence));
}