import { llmService } from '../../src/services/llm-config.service';
import { logger } from '../../src/services/logging.service';
import { v4 as uuidv4 } from 'uuid';

export interface ConversationState {
  id: string;
  userId: string;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
  messages: ChatMessage[];
  context: ConversationContext;
  metadata: ConversationMetadata;
  status: 'active' | 'paused' | 'completed';
}

export interface ChatMessage {
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

export interface ConversationContext {
  domain: string;
  university?: string;
  program?: string;
  userRole: 'student' | 'faculty' | 'admin' | 'researcher';
  currentTopic?: string;
  relatedDocuments?: string[];
  sessionData?: any;
}

export interface ConversationMetadata {
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  satisfaction?: number;
  lastAnalysis?: ChatAnalytics;
}

export interface Attachment {
  type: 'document' | 'image' | 'link';
  url: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface ChatAnalytics {
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

export interface ProcessedMessage {
  originalMessage: ChatMessage;
  cleanedText: string;
  intent: string;
  entities: any[];
  context: any;
}

export interface MessagePreferences {
  responseLength: 'brief' | 'detailed' | 'comprehensive';
  responseStyle: 'casual' | 'formal' | 'academic';
  includeReferences: boolean;
  language: string;
}

export interface Source {
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

export interface ConversationSummary {
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

export class ConversationEngine {
  private modelConfig: any;
  private conversations: Map<string, ConversationState>;
  private intentClassifier: IntentClassifier;
  private entityExtractor: EntityExtractor;
  private responseGenerator: ResponseGenerator;

  constructor(modelConfig?: any) {
    this.modelConfig = modelConfig || {
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229',
      temperature: 0.7,
      maxTokens: 2000
    };
    
    this.conversations = new Map();
    this.intentClassifier = new IntentClassifier();
    this.entityExtractor = new EntityExtractor();
    this.responseGenerator = new ResponseGenerator(this.modelConfig);
  }

  async processMessage(
    message: any,
    conversation: any,
    preferences: MessagePreferences
  ): Promise<{ processedMessage: ProcessedMessage; conversationState: ConversationState }> {
    try {
      logger.info('Processing message', {
        conversationId: conversation.id,
        userId: conversation.userId,
        messageLength: message.text.length
      });

      // Get or create conversation state
      const conversationState = await this.getOrCreateConversation(conversation);
      
      // Create chat message
      const chatMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: message.text,
        timestamp: new Date().toISOString(),
        metadata: {
          type: message.type || 'text',
          attachments: message.attachments || []
        }
      };

      // Add message to conversation
      conversationState.messages.push(chatMessage);
      conversationState.messageCount++;
      conversationState.lastMessageAt = chatMessage.timestamp;

      // Clean and preprocess text
      const cleanedText = this.cleanText(message.text);
      
      // Classify intent
      const intent = await this.intentClassifier.classify(cleanedText, conversationState.context);
      
      // Extract entities
      const entities = await this.entityExtractor.extract(cleanedText);
      
      // Update conversation context
      this.updateConversationContext(conversationState, intent, entities);

      const processedMessage: ProcessedMessage = {
        originalMessage: chatMessage,
        cleanedText,
        intent,
        entities,
        context: conversationState.context
      };

      return { processedMessage, conversationState };

    } catch (error) {
      logger.error('Message processing failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async generateResponse(
    processedMessage: ProcessedMessage,
    conversationState: ConversationState,
    preferences: MessagePreferences
  ): Promise<ChatMessage> {
    try {
      logger.info('Generating response', {
        conversationId: conversationState.id,
        intent: processedMessage.intent,
        responseStyle: preferences.responseStyle
      });

      // Generate response based on intent and context
      const responseContent = await this.responseGenerator.generate(
        processedMessage,
        conversationState,
        preferences
      );

      const responseMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'response',
          confidence: 0.85, // Calculate based on various factors
          sources: [] // Would be populated with actual sources
        }
      };

      // Add response to conversation
      conversationState.messages.push(responseMessage);
      conversationState.messageCount++;
      conversationState.lastMessageAt = responseMessage.timestamp;

      return responseMessage;

    } catch (error) {
      logger.error('Response generation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async findRelevantSources(
    query: string,
    context?: ConversationContext
  ): Promise<Source[]> {
    try {
      // Mock implementation - in production would use semantic search service
      const mockSources: Source[] = [
        {
          id: 'cs101_ceu',
          title: 'Introduction to Computer Science - CEU',
          type: 'course',
          relevance: 0.9,
          snippet: 'Fundamental concepts of computer science including programming, algorithms...',
          metadata: {
            university: 'Central European University',
            documentType: 'course_description',
            lastUpdated: '2024-01-01'
          }
        },
        {
          id: 'cs_program_ceu',
          title: 'Computer Science Bachelor Program - CEU',
          type: 'program',
          relevance: 0.8,
          snippet: 'Comprehensive 4-year program covering all aspects of computer science...',
          metadata: {
            university: 'Central European University',
            documentType: 'program_description',
            lastUpdated: '2024-01-01'
          }
        }
      ];

      // Filter by context if provided
      if (context?.university) {
        return mockSources.filter(source => 
          source.metadata.university.toLowerCase().includes(context.university!.toLowerCase())
        );
      }

      return mockSources;

    } catch (error) {
      logger.error('Source finding failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  async analyzeMessage(text: string): Promise<ChatAnalytics> {
    try {
      // Intent classification
      const intent = await this.intentClassifier.classify(text);
      
      // Entity extraction
      const entities = await this.entityExtractor.extract(text);
      
      // Sentiment analysis
      const sentiment = this.analyzeSentiment(text);
      
      // Topic detection
      const topics = this.detectTopics(text);

      return {
        intentClassification: {
          intent: intent.primary,
          confidence: intent.confidence,
          alternatives: intent.alternatives || []
        },
        entityExtraction: {
          entities: entities.map(entity => ({
            text: entity.text,
            type: entity.type,
            confidence: entity.confidence
          }))
        },
        sentimentAnalysis: sentiment,
        topicDetection: {
          topics: topics.map(topic => ({
            topic: topic.name,
            relevance: topic.relevance
          }))
        }
      };

    } catch (error) {
      logger.error('Message analysis failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return default analytics
      return {
        intentClassification: {
          intent: 'general_inquiry',
          confidence: 0.5,
          alternatives: []
        },
        entityExtraction: { entities: [] },
        sentimentAnalysis: {
          sentiment: 'neutral',
          score: 0.5,
          confidence: 0.5
        },
        topicDetection: { topics: [] }
      };
    }
  }

  async generateSuggestions(
    conversationState: ConversationState,
    analytics: ChatAnalytics
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Generate suggestions based on intent
    switch (analytics.intentClassification.intent) {
      case 'course_inquiry':
        suggestions.push(
          'Tell me about the prerequisites for this course',
          'What are the learning outcomes?',
          'How many credits is this course worth?',
          'Are there any lab components?'
        );
        break;
        
      case 'program_inquiry':
        suggestions.push(
          'What are the admission requirements?',
          'How long is this program?',
          'What career opportunities are available?',
          'Are there internship opportunities?'
        );
        break;
        
      case 'comparison_request':
        suggestions.push(
          'Compare with similar programs at other universities',
          'What are the key differences?',
          'Which program has better job prospects?',
          'Show me the curriculum comparison'
        );
        break;
        
      default:
        suggestions.push(
          'Tell me about computer science programs',
          'What courses are available in data science?',
          'Compare universities in Hungary',
          'Show me admission requirements'
        );
    }

    // Add context-based suggestions
    if (conversationState.context.university) {
      suggestions.push(`Tell me more about ${conversationState.context.university}`);
    }

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  async generateRelatedQuestions(
    query: string,
    conversationState: ConversationState
  ): Promise<string[]> {
    const questions: string[] = [];

    // Extract key terms from query
    const keyTerms = this.extractKeyTerms(query);
    
    // Generate questions based on key terms
    for (const term of keyTerms.slice(0, 3)) {
      questions.push(`What else should I know about ${term}?`);
    }

    // Add conversation context questions
    if (conversationState.context.currentTopic) {
      questions.push(`How does this relate to ${conversationState.context.currentTopic}?`);
    }

    // Add general follow-up questions
    questions.push(
      'Can you provide more details?',
      'Are there any alternatives?',
      'What are the next steps?'
    );

    return questions.slice(0, 5);
  }

  async updateConversation(
    conversationState: ConversationState,
    message: ChatMessage,
    analytics: ChatAnalytics
  ): Promise<ConversationSummary> {
    // Update conversation metadata
    conversationState.metadata.lastAnalysis = analytics;
    
    // Update topics
    for (const topic of analytics.topicDetection.topics) {
      if (!conversationState.metadata.topics.includes(topic.topic)) {
        conversationState.metadata.topics.push(topic.topic);
      }
    }
    
    // Update sentiment
    conversationState.metadata.sentiment = analytics.sentimentAnalysis.sentiment;
    
    // Update current topic
    if (analytics.topicDetection.topics.length > 0) {
      conversationState.context.currentTopic = analytics.topicDetection.topics[0].topic;
    }

    // Store conversation
    this.conversations.set(conversationState.id, conversationState);

    return {
      id: conversationState.id,
      userId: conversationState.userId,
      startedAt: conversationState.startedAt,
      lastMessageAt: conversationState.lastMessageAt,
      messageCount: conversationState.messageCount,
      topics: conversationState.metadata.topics,
      status: conversationState.status,
      sentiment: conversationState.metadata.sentiment,
      satisfaction: conversationState.metadata.satisfaction
    };
  }

  async processFeedback(
    conversationId: string,
    messageId: string,
    feedback: any
  ): Promise<{ conversation: ConversationSummary }> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Update satisfaction score
    if (feedback.rating) {
      conversation.metadata.satisfaction = feedback.rating;
    }

    // Log feedback for improvement
    logger.info('User feedback received', {
      conversationId,
      messageId,
      feedback: feedback.type || 'general',
      rating: feedback.rating
    });

    return {
      conversation: {
        id: conversation.id,
        userId: conversation.userId,
        startedAt: conversation.startedAt,
        lastMessageAt: conversation.lastMessageAt,
        messageCount: conversation.messageCount,
        topics: conversation.metadata.topics,
        status: conversation.status,
        sentiment: conversation.metadata.sentiment,
        satisfaction: conversation.metadata.satisfaction
      }
    };
  }

  async processVoiceMessage(audioData: string): Promise<{ text: string }> {
    // Mock voice transcription - in production use speech-to-text service
    logger.info('Processing voice message');
    
    // Simulate transcription
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      text: 'Tell me about computer science programs at CEU' // Mock transcription
    };
  }

  async getConversation(conversationId: string): Promise<ConversationSummary | null> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    return {
      id: conversation.id,
      userId: conversation.userId,
      startedAt: conversation.startedAt,
      lastMessageAt: conversation.lastMessageAt,
      messageCount: conversation.messageCount,
      topics: conversation.metadata.topics,
      status: conversation.status,
      sentiment: conversation.metadata.sentiment,
      satisfaction: conversation.metadata.satisfaction
    };
  }

  async getUserConversations(userId: string): Promise<ConversationSummary[]> {
    const userConversations: ConversationSummary[] = [];
    
    for (const conversation of this.conversations.values()) {
      if (conversation.userId === userId) {
        userConversations.push({
          id: conversation.id,
          userId: conversation.userId,
          startedAt: conversation.startedAt,
          lastMessageAt: conversation.lastMessageAt,
          messageCount: conversation.messageCount,
          topics: conversation.metadata.topics,
          status: conversation.status,
          sentiment: conversation.metadata.sentiment,
          satisfaction: conversation.metadata.satisfaction
        });
      }
    }

    return userConversations.sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }

  async getContextualSuggestions(context: string): Promise<string[]> {
    const suggestions: { [key: string]: string[] } = {
      'computer_science': [
        'What programming languages will I learn?',
        'Are there research opportunities available?',
        'What is the job placement rate for graduates?',
        'Can I specialize in artificial intelligence?'
      ],
      'admissions': [
        'What are the admission requirements?',
        'When is the application deadline?',
        'Do I need to take standardized tests?',
        'Are scholarships available?'
      ],
      'general': [
        'Tell me about computer science programs',
        'Compare universities in Budapest',
        'What are the best engineering programs?',
        'How do I apply for international programs?'
      ]
    };

    return suggestions[context] || suggestions['general'];
  }

  async updateConversationSettings(
    conversationId: string,
    settings: any
  ): Promise<ConversationSummary> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Update settings (mock implementation)
    if (settings.status) {
      conversation.status = settings.status;
    }

    return {
      id: conversation.id,
      userId: conversation.userId,
      startedAt: conversation.startedAt,
      lastMessageAt: conversation.lastMessageAt,
      messageCount: conversation.messageCount,
      topics: conversation.metadata.topics,
      status: conversation.status,
      sentiment: conversation.metadata.sentiment,
      satisfaction: conversation.metadata.satisfaction
    };
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    return this.conversations.delete(conversationId);
  }

  async healthCheck(): Promise<void> {
    try {
      // Test intent classification
      await this.intentClassifier.classify('test message');
      
      // Test entity extraction
      await this.entityExtractor.extract('test message');
      
      // Test response generation
      const mockProcessedMessage: ProcessedMessage = {
        originalMessage: {
          id: 'test',
          role: 'user',
          content: 'test',
          timestamp: new Date().toISOString()
        },
        cleanedText: 'test',
        intent: 'test',
        entities: [],
        context: {}
      };
      
      const mockConversation: ConversationState = {
        id: 'test',
        userId: 'test',
        startedAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        messageCount: 1,
        messages: [],
        context: {
          domain: 'test',
          userRole: 'student'
        },
        metadata: {
          topics: [],
          sentiment: 'neutral'
        },
        status: 'active'
      };
      
      await this.responseGenerator.generate(
        mockProcessedMessage,
        mockConversation,
        { responseLength: 'brief', responseStyle: 'casual', includeReferences: false, language: 'en' }
      );

      logger.info('Conversation engine health check passed');
    } catch (error) {
      throw new Error(`Conversation engine health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Private helper methods
  private async getOrCreateConversation(conversation: any): Promise<ConversationState> {
    if (conversation.id && this.conversations.has(conversation.id)) {
      return this.conversations.get(conversation.id)!;
    }

    const conversationState: ConversationState = {
      id: conversation.id || uuidv4(),
      userId: conversation.userId,
      startedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      messageCount: 0,
      messages: conversation.history || [],
      context: conversation.context || {
        domain: 'curriculum_alignment',
        userRole: 'student'
      },
      metadata: {
        topics: [],
        sentiment: 'neutral'
      },
      status: 'active'
    };

    this.conversations.set(conversationState.id, conversationState);
    return conversationState;
  }

  private cleanText(text: string): string {
    return text
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private updateConversationContext(
    conversationState: ConversationState,
    intent: any,
    entities: any[]
  ): void {
    // Update context based on intent and entities
    if (intent.primary === 'course_inquiry' && entities.length > 0) {
      const courseEntity = entities.find(e => e.type === 'course');
      if (courseEntity) {
        conversationState.context.currentTopic = courseEntity.text;
      }
    }

    if (intent.primary === 'university_inquiry' && entities.length > 0) {
      const universityEntity = entities.find(e => e.type === 'university');
      if (universityEntity) {
        conversationState.context.university = universityEntity.text;
      }
    }
  }

  private analyzeSentiment(text: string): {
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    confidence: number;
  } {
    // Simple sentiment analysis - in production use proper NLP service
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'perfect', 'love'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'worst', 'disappointing'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    for (const word of words) {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    }
    
    const totalSentimentWords = positiveCount + negativeCount;
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let score = 0.5;
    
    if (totalSentimentWords > 0) {
      if (positiveCount > negativeCount) {
        sentiment = 'positive';
        score = 0.5 + (positiveCount / (totalSentimentWords * 2));
      } else if (negativeCount > positiveCount) {
        sentiment = 'negative';
        score = 0.5 - (negativeCount / (totalSentimentWords * 2));
      }
    }
    
    return {
      sentiment,
      score: Math.max(0, Math.min(1, score)),
      confidence: Math.min(1, totalSentimentWords / words.length * 5)
    };
  }

  private detectTopics(text: string): Array<{ name: string; relevance: number }> {
    const topics = [
      { keywords: ['course', 'class', 'subject', 'curriculum'], name: 'courses' },
      { keywords: ['program', 'degree', 'major', 'study'], name: 'programs' },
      { keywords: ['university', 'college', 'institution', 'school'], name: 'universities' },
      { keywords: ['admission', 'application', 'requirement', 'prerequisite'], name: 'admissions' },
      { keywords: ['career', 'job', 'employment', 'opportunity'], name: 'careers' },
      { keywords: ['research', 'project', 'thesis', 'dissertation'], name: 'research' }
    ];

    const detectedTopics: Array<{ name: string; relevance: number }> = [];
    const words = text.toLowerCase().split(/\s+/);
    
    for (const topic of topics) {
      let matches = 0;
      for (const keyword of topic.keywords) {
        if (words.includes(keyword)) matches++;
      }
      
      if (matches > 0) {
        detectedTopics.push({
          name: topic.name,
          relevance: matches / topic.keywords.length
        });
      }
    }
    
    return detectedTopics.sort((a, b) => b.relevance - a.relevance);
  }

  private extractKeyTerms(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    return words
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 5);
  }
}

// Helper classes
class IntentClassifier {
  async classify(text: string, context?: any): Promise<any> {
    // Mock intent classification
    const intents = [
      { name: 'course_inquiry', keywords: ['course', 'class', 'subject'] },
      { name: 'program_inquiry', keywords: ['program', 'degree', 'major'] },
      { name: 'university_inquiry', keywords: ['university', 'college', 'school'] },
      { name: 'comparison_request', keywords: ['compare', 'versus', 'difference'] },
      { name: 'general_inquiry', keywords: [] }
    ];

    const words = text.toLowerCase().split(/\s+/);
    let bestMatch = intents[intents.length - 1]; // Default to general_inquiry
    let bestScore = 0;

    for (const intent of intents) {
      if (intent.keywords.length === 0) continue;
      
      let score = 0;
      for (const keyword of intent.keywords) {
        if (words.includes(keyword)) score++;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = intent;
      }
    }

    return {
      primary: bestMatch.name,
      confidence: Math.min(1, bestScore / 3),
      alternatives: []
    };
  }
}

class EntityExtractor {
  async extract(text: string): Promise<any[]> {
    // Mock entity extraction
    const entities = [];
    const words = text.split(/\s+/);
    
    // Extract university names (capitalized sequences)
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (/^[A-Z][a-z]+$/.test(word) && word.length > 3) {
        entities.push({
          text: word,
          type: 'university',
          confidence: 0.8,
          start: i,
          end: i + 1
        });
      }
    }
    
    // Extract course codes (pattern like CS101, MATH201)
    const coursePattern = /[A-Z]{2,4}\d{3}/g;
    const courseMatches = text.match(coursePattern);
    if (courseMatches) {
      for (const match of courseMatches) {
        entities.push({
          text: match,
          type: 'course',
          confidence: 0.9,
          start: 0,
          end: 0
        });
      }
    }
    
    return entities;
  }
}

class ResponseGenerator {
  private modelConfig: any;

  constructor(modelConfig: any) {
    this.modelConfig = modelConfig;
  }

  async generate(
    processedMessage: ProcessedMessage,
    conversationState: ConversationState,
    preferences: MessagePreferences
  ): Promise<string> {
    try {
      // Build context for response generation
      const context = this.buildResponseContext(processedMessage, conversationState);
      
      // Generate response using LLM
      const prompt = this.buildPrompt(processedMessage, context, preferences);
      
      const response = await llmService.generateCompletion(
        this.modelConfig.provider,
        this.modelConfig.model,
        prompt,
        {
          temperature: this.modelConfig.temperature,
          maxTokens: this.getMaxTokensForLength(preferences.responseLength)
        }
      );

      return this.formatResponse(response, preferences);

    } catch (error) {
      logger.error('Response generation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Fallback response
      return this.generateFallbackResponse(processedMessage.intent);
    }
  }

  private buildResponseContext(
    processedMessage: ProcessedMessage,
    conversationState: ConversationState
  ): string {
    const recentMessages = conversationState.messages.slice(-5);
    const context = `
Previous conversation:
${recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Current user role: ${conversationState.context.userRole}
Current topic: ${conversationState.context.currentTopic || 'general'}
Domain: ${conversationState.context.domain}
    `;
    
    return context.trim();
  }

  private buildPrompt(
    processedMessage: ProcessedMessage,
    context: string,
    preferences: MessagePreferences
  ): string {
    const styleInstructions = {
      'casual': 'Use a friendly, conversational tone.',
      'formal': 'Use a professional, formal tone.',
      'academic': 'Use precise, academic language with technical terminology.'
    };

    const lengthInstructions = {
      'brief': 'Keep the response concise, 1-2 sentences.',
      'detailed': 'Provide a thorough explanation in 2-3 paragraphs.',
      'comprehensive': 'Give a comprehensive answer with multiple aspects covered.'
    };

    return `You are an AI assistant helping with curriculum alignment and university program information.

${context}

Current message: ${processedMessage.originalMessage.content}
Intent: ${processedMessage.intent}

Instructions:
- ${styleInstructions[preferences.responseStyle]}
- ${lengthInstructions[preferences.responseLength]}
- ${preferences.includeReferences ? 'Include references to relevant courses or programs when appropriate.' : 'Focus on direct answers without extensive references.'}
- Language: ${preferences.language}

Please provide a helpful response:`;
  }

  private getMaxTokensForLength(length: string): number {
    switch (length) {
      case 'brief': return 200;
      case 'detailed': return 800;
      case 'comprehensive': return 1500;
      default: return 500;
    }
  }

  private formatResponse(response: string, preferences: MessagePreferences): string {
    // Clean and format the response
    return response
      .trim()
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
      .replace(/\s{2,}/g, ' '); // Limit consecutive spaces
  }

  private generateFallbackResponse(intent: string): string {
    const fallbacks: { [key: string]: string } = {
      'course_inquiry': 'I can help you find information about courses. Could you please provide more specific details about what you\'re looking for?',
      'program_inquiry': 'I\'d be happy to help you learn about academic programs. What specific program or field are you interested in?',
      'university_inquiry': 'I can provide information about universities and their programs. Which university would you like to know more about?',
      'comparison_request': 'I can help you compare different programs or universities. What would you like to compare?',
      'general_inquiry': 'I\'m here to help you with information about curriculum alignment, courses, and university programs. How can I assist you today?'
    };

    return fallbacks[intent] || fallbacks['general_inquiry'];
  }
}