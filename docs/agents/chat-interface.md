# Chat Interface Agent

The Chat Interface Agent provides natural language interaction capabilities, allowing users to query the system, request analyses, and receive results through conversational interfaces including web chat, API endpoints, and integration platforms.

## Overview

- **Function Name**: `curriculum-alignment-chat-interface-{environment}`
- **Runtime**: Node.js 18.x
- **Memory**: 384MB
- **Timeout**: 2 minutes
- **Concurrency**: 50 concurrent executions

## Responsibilities

1. **Natural Language Processing** - Understand user queries and intent
2. **Query Translation** - Convert natural language to system commands
3. **Response Generation** - Create human-readable responses from system data
4. **Session Management** - Maintain conversation context and history
5. **Multi-Modal Interface** - Support text, voice, and structured interactions

## API Endpoints

### POST /chat-interface/message
Processes a natural language message and returns an appropriate response.

**Request:**
```json
{
  "message": {
    "text": "Compare the Computer Science program at CEU with MIT's program",
    "sessionId": "session_20240101_123456",
    "userId": "user_123",
    "context": {
      "previousQueries": ["What accreditation standards apply to CS programs?"],
      "currentFocus": "curriculum-comparison"
    }
  },
  "options": {
    "responseFormat": "conversational",
    "includeVisualization": true,
    "detailLevel": "summary",
    "language": "en"
  }
}
```

**Response:**
```json
{
  "messageId": "msg_20240101_123456",
  "response": {
    "text": "I'll help you compare the Computer Science programs at CEU and MIT. Let me analyze both curricula for you.\n\n**Key Similarities:**\n- Both programs emphasize strong programming fundamentals\n- Similar mathematics requirements (32+ credit hours)\n- Capstone project requirements\n\n**Notable Differences:**\n- MIT has more extensive systems programming coverage\n- CEU offers stronger emphasis on theoretical computer science\n- MIT requires 128 credits vs CEU's 120 credits\n\n**Alignment Score:** 84% - These programs are substantially similar with good transferability.\n\nWould you like me to provide a detailed course-by-course comparison or focus on any specific area?",
    "format": "markdown",
    "confidence": 0.92
  },
  "actionsTaken": [
    {
      "action": "curriculum-comparison",
      "status": "completed",
      "workflowId": "wf_20240101_123456",
      "duration": "15.2s"
    }
  ],
  "suggestedFollowUps": [
    "Show me the detailed course mapping",
    "What courses would a CEU student need to take if transferring to MIT?",
    "How do both programs compare against ABET standards?"
  ],
  "attachments": [
    {
      "type": "comparison-chart",
      "url": "https://s3.example.com/visualizations/comparison_20240101_123456.png",
      "description": "Visual comparison of curriculum structures"
    }
  ],
  "metadata": {
    "processingTime": "2.1s",
    "agentsInvolved": ["coordinator", "semantic-search", "accreditation-expert"],
    "confidenceScore": 0.92
  }
}
```

### POST /chat-interface/query
Processes structured queries with specific intent and parameters.

**Request:**
```json
{
  "query": {
    "intent": "analyze-curriculum",
    "parameters": {
      "program": "Computer Science",
      "university": "Central European University",
      "analysisType": "accreditation-compliance",
      "standards": ["ABET-CAC", "EUR-ACE"]
    },
    "userId": "user_123",
    "sessionId": "session_20240101_123456"
  }
}
```

**Response:**
```json
{
  "queryId": "query_20240101_123456",
  "status": "completed",
  "results": {
    "workflowId": "wf_20240101_123456",
    "analysisComplete": true,
    "summary": {
      "overallCompliance": 0.87,
      "status": "substantially-compliant",
      "majorFindings": [
        "Strong programming and mathematics foundation",
        "Missing dedicated computer ethics course",
        "Excellent capstone project requirement"
      ]
    },
    "humanReadableResponse": "The CEU Computer Science program shows strong compliance with both ABET-CAC (89% compliance) and EUR-ACE (85% compliance) standards. The program excels in programming fundamentals and mathematical foundation. However, adding a dedicated computer ethics course would improve compliance to full accreditation standards."
  },
  "nextSteps": [
    "Review detailed compliance report",
    "Get recommendations for improvement",
    "Compare with other programs"
  ]
}
```

### GET /chat-interface/session/{sessionId}
Retrieves conversation history and context for a session.

**Response:**
```json
{
  "sessionId": "session_20240101_123456",
  "userId": "user_123",
  "startTime": "2024-01-01T12:00:00Z",
  "lastActivity": "2024-01-01T12:34:56Z",
  "messageCount": 8,
  "context": {
    "currentTopic": "curriculum-comparison",
    "activeWorkflows": ["wf_20240101_123456"],
    "userPreferences": {
      "detailLevel": "summary",
      "responseFormat": "conversational",
      "language": "en"
    }
  },
  "conversationHistory": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "type": "user",
      "content": "Hello, I need help comparing CS programs",
      "intent": "greeting-request"
    },
    {
      "timestamp": "2024-01-01T12:00:05Z",
      "type": "assistant",
      "content": "I'd be happy to help you compare Computer Science programs. Which programs would you like to compare?",
      "actions": []
    }
  ]
}
```

### POST /chat-interface/intent
Analyzes user input to determine intent and extract parameters.

**Request:**
```json
{
  "input": {
    "text": "Show me how CEU's CS program compares to ABET standards",
    "context": {
      "previousIntent": "program-analysis",
      "userProfile": {
        "role": "academic-advisor",
        "institution": "CEU"
      }
    }
  }
}
```

**Response:**
```json
{
  "intentAnalysis": {
    "primary": {
      "intent": "accreditation-analysis",
      "confidence": 0.94,
      "parameters": {
        "program": "Computer Science",
        "university": "CEU",
        "standard": "ABET",
        "analysisType": "compliance-check"
      }
    },
    "secondary": [
      {
        "intent": "curriculum-evaluation",
        "confidence": 0.76
      }
    ],
    "entities": [
      {
        "type": "program",
        "value": "Computer Science",
        "confidence": 0.98
      },
      {
        "type": "institution", 
        "value": "CEU",
        "confidence": 0.95
      },
      {
        "type": "standard",
        "value": "ABET",
        "confidence": 0.92
      }
    ]
  }
}
```

## Natural Language Processing

### Intent Recognition
```javascript
const intentClassifier = {
  intents: {
    'curriculum-comparison': {
      patterns: [
        /compare\s+(?:the\s+)?(.+?)\s+(?:program|curriculum)\s+(?:at|from)\s+(.+?)\s+(?:with|to|and)\s+(.+)/i,
        /how\s+(?:does|do)\s+(.+?)\s+compare\s+(?:to|with|against)\s+(.+)/i,
        /(?:differences|similarities)\s+between\s+(.+?)\s+and\s+(.+)/i
      ],
      examples: [
        "Compare MIT's CS program with Stanford",
        "How does CEU compare to other universities?",
        "What are the differences between these programs?"
      ],
      confidence: 0.9
    },
    
    'accreditation-analysis': {
      patterns: [
        /(?:check|analyze|evaluate)\s+(.+?)\s+(?:against|for)\s+(.+?)\s+(?:standards?|accreditation)/i,
        /(?:is|does)\s+(.+?)\s+(?:meet|comply\s+with)\s+(.+?)\s+(?:standards?|requirements?)/i,
        /(?:abet|eur-ace|accreditation)\s+(?:compliance|analysis)/i
      ],
      examples: [
        "Check CEU's program against ABET standards",
        "Does this curriculum meet EUR-ACE requirements?",
        "ABET compliance analysis for CS program"
      ],
      confidence: 0.88
    },
    
    'gap-analysis': {
      patterns: [
        /(?:what|which)\s+(?:courses?|requirements?)\s+(?:are\s+)?(?:missing|lacking|needed)/i,
        /(?:gaps?|deficiencies)\s+in\s+(.+)/i,
        /(?:identify|find)\s+(?:missing|lacking)\s+(?:courses?|components?)/i
      ],
      examples: [
        "What courses are missing from this program?",
        "Identify gaps in the curriculum",
        "Find missing requirements for accreditation"
      ],
      confidence: 0.85
    }
  },
  
  classify: async (text, context) => {
    const results = [];
    
    for (const [intentName, intentConfig] of Object.entries(this.intents)) {
      let maxScore = 0;
      let bestMatch = null;
      
      for (const pattern of intentConfig.patterns) {
        const match = text.match(pattern);
        if (match) {
          const score = calculatePatternScore(match, text, intentConfig);
          if (score > maxScore) {
            maxScore = score;
            bestMatch = match;
          }
        }
      }
      
      if (maxScore > 0.6) {
        results.push({
          intent: intentName,
          confidence: maxScore * intentConfig.confidence,
          parameters: extractParameters(bestMatch, intentName),
          match: bestMatch
        });
      }
    }
    
    // Apply context-based adjustments
    if (context) {
      results.forEach(result => {
        result.confidence *= getContextBoost(result.intent, context);
      });
    }
    
    return results.sort((a, b) => b.confidence - a.confidence);
  }
};
```

### Entity Extraction
```javascript
const entityExtractor = {
  entities: {
    'university': {
      patterns: [
        /\b(MIT|Stanford|Harvard|Carnegie\s+Mellon|UC\s+Berkeley)\b/gi,
        /\b(Central\s+European\s+University|CEU)\b/gi,
        /\b([A-Z][a-z]+\s+University(?:\s+of\s+[A-Z][a-z]+)?)\b/gi
      ],
      aliases: {
        'CEU': 'Central European University',
        'MIT': 'Massachusetts Institute of Technology'
      }
    },
    
    'program': {
      patterns: [
        /\b(Computer\s+Science|CS|Software\s+Engineering)\b/gi,
        /\b(Electrical\s+Engineering|Mathematics|Physics)\b/gi,
        /\b(Information\s+Systems|Data\s+Science)\b/gi
      ],
      aliases: {
        'CS': 'Computer Science',
        'SE': 'Software Engineering'
      }
    },
    
    'standard': {
      patterns: [
        /\b(ABET(?:-CAC|-EAC)?|EUR-ACE|Washington\s+Accord)\b/gi,
        /\b(accreditation\s+standards?|quality\s+standards?)\b/gi
      ]
    },
    
    'course-code': {
      patterns: [
        /\b([A-Z]{2,4})\s*(\d{3,4}[A-Z]?)\b/gi
      ]
    }
  },
  
  extract: (text) => {
    const entities = [];
    
    for (const [entityType, config] of Object.entries(this.entities)) {
      for (const pattern of config.patterns) {
        const matches = [...text.matchAll(pattern)];
        
        entities.push(...matches.map(match => ({
          type: entityType,
          value: this.normalizeEntity(match[0], entityType, config),
          raw: match[0],
          position: match.index,
          confidence: this.calculateEntityConfidence(match, text)
        })));
      }
    }
    
    return this.deduplicateEntities(entities);
  },
  
  normalizeEntity: (value, type, config) => {
    const normalized = value.trim();
    
    if (config.aliases && config.aliases[normalized.toUpperCase()]) {
      return config.aliases[normalized.toUpperCase()];
    }
    
    return normalized;
  }
};
```

## Response Generation

### Template-Based Responses
```javascript
const responseTemplates = {
  'curriculum-comparison': {
    'high-similarity': `
The {program} programs at {university1} and {university2} are highly similar with an alignment score of {score}%.

**Key Similarities:**
{similarities}

**Notable Differences:**
{differences}

**Transferability:** {transferability}

Would you like me to provide a detailed course-by-course comparison?
    `,
    
    'moderate-similarity': `
The {program} programs show moderate alignment ({score}%) with some significant differences:

**Areas of Alignment:**
{alignedAreas}

**Key Differences:**
{differences}

**Recommendations:**
{recommendations}

Would you like me to analyze specific areas in more detail?
    `,
    
    'low-similarity': `
These {program} programs have substantial differences (alignment: {score}%):

**Major Differences:**
{majorDifferences}

**Transfer Considerations:**
{transferConsiderations}

**Bridge Recommendations:**
{bridgeRecommendations}

Would you like help identifying specific courses for bridging these gaps?
    `
  },
  
  'accreditation-analysis': {
    'compliant': `
Great news! The {program} program at {university} shows strong compliance with {standards}:

**Compliance Score:** {score}%
**Status:** {status}

**Strengths:**
{strengths}

**Minor Recommendations:**
{recommendations}

The program meets all major accreditation requirements.
    `,
    
    'needs-improvement': `
The {program} program at {university} shows {score}% compliance with {standards}:

**Areas of Strength:**
{strengths}

**Areas Needing Attention:**
{gaps}

**Recommended Actions:**
{recommendations}

Would you like detailed implementation guidance for these recommendations?
    `
  }
};

const generateResponse = (template, data, options) => {
  let response = template;
  
  // Replace placeholders with actual data
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`{${key}}`, 'g');
    response = response.replace(placeholder, value);
  }
  
  // Apply formatting based on options
  if (options.responseFormat === 'markdown') {
    response = formatAsMarkdown(response);
  } else if (options.responseFormat === 'html') {
    response = formatAsHTML(response);
  }
  
  return response.trim();
};
```

### Dynamic Response Generation
```javascript
const dynamicResponseGenerator = {
  async generateComparison(comparisonData, options) {
    const score = comparisonData.overallSimilarity * 100;
    let template;
    
    if (score >= 80) {
      template = responseTemplates['curriculum-comparison']['high-similarity'];
    } else if (score >= 60) {
      template = responseTemplates['curriculum-comparison']['moderate-similarity'];
    } else {
      template = responseTemplates['curriculum-comparison']['low-similarity'];
    }
    
    const templateData = {
      program: comparisonData.program,
      university1: comparisonData.source.university,
      university2: comparisonData.target.university,
      score: Math.round(score),
      similarities: this.formatSimilarities(comparisonData.similarities),
      differences: this.formatDifferences(comparisonData.differences),
      transferability: this.assessTransferability(score)
    };
    
    return generateResponse(template, templateData, options);
  },
  
  async generateAccreditationAnalysis(analysisData, options) {
    const score = analysisData.compliance.overall.score * 100;
    const template = score >= 80 ? 
      responseTemplates['accreditation-analysis']['compliant'] :
      responseTemplates['accreditation-analysis']['needs-improvement'];
    
    const templateData = {
      program: analysisData.program,
      university: analysisData.university,
      standards: analysisData.standards.join(', '),
      score: Math.round(score),
      status: analysisData.compliance.overall.status,
      strengths: this.formatStrengths(analysisData.strengths),
      gaps: this.formatGaps(analysisData.gaps),
      recommendations: this.formatRecommendations(analysisData.recommendations)
    };
    
    return generateResponse(template, templateData, options);
  }
};
```

## Session Management

### Conversation Context
```javascript
const sessionManager = {
  sessions: new Map(),
  
  createSession: (userId, options = {}) => {
    const sessionId = `session_${Date.now()}_${userId}`;
    
    const session = {
      id: sessionId,
      userId,
      startTime: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      context: {
        currentTopic: null,
        activeWorkflows: [],
        userPreferences: {
          detailLevel: options.detailLevel || 'summary',
          responseFormat: options.responseFormat || 'conversational',
          language: options.language || 'en'
        },
        entities: new Map(),
        conversationFlow: []
      },
      history: []
    };
    
    this.sessions.set(sessionId, session);
    return session;
  },
  
  updateSession: (sessionId, message, response) => {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    session.lastActivity = new Date();
    session.messageCount++;
    
    // Add to history
    session.history.push({
      timestamp: new Date(),
      type: 'user',
      content: message.text,
      intent: message.detectedIntent
    });
    
    session.history.push({
      timestamp: new Date(),
      type: 'assistant',
      content: response.text,
      actions: response.actionsTaken,
      confidence: response.confidence
    });
    
    // Update context
    this.updateContext(session, message, response);
    
    return session;
  },
  
  updateContext: (session, message, response) => {
    // Update current topic
    if (message.detectedIntent) {
      session.context.currentTopic = message.detectedIntent.intent;
    }
    
    // Update entities
    if (message.entities) {
      message.entities.forEach(entity => {
        session.context.entities.set(entity.type, entity.value);
      });
    }
    
    // Update conversation flow
    session.context.conversationFlow.push({
      intent: message.detectedIntent?.intent,
      entities: message.entities,
      confidence: response.confidence,
      timestamp: new Date()
    });
    
    // Keep only last 10 flow items for memory management
    if (session.context.conversationFlow.length > 10) {
      session.context.conversationFlow = session.context.conversationFlow.slice(-10);
    }
  }
};
```

### Context-Aware Processing
```javascript
const contextProcessor = {
  enhanceQuery: (query, session) => {
    const enhanced = { ...query };
    
    // Add context from session
    if (session.context.entities.size > 0) {
      enhanced.contextEntities = Object.fromEntries(session.context.entities);
    }
    
    // Infer missing parameters from context
    if (!enhanced.parameters.university && session.context.entities.has('university')) {
      enhanced.parameters.university = session.context.entities.get('university');
    }
    
    if (!enhanced.parameters.program && session.context.entities.has('program')) {
      enhanced.parameters.program = session.context.entities.get('program');
    }
    
    // Add conversation flow context
    enhanced.conversationContext = {
      previousTopics: session.context.conversationFlow.map(f => f.intent),
      currentTopic: session.context.currentTopic,
      messageCount: session.messageCount
    };
    
    return enhanced;
  },
  
  resolveReferences: (text, session) => {
    let resolved = text;
    
    // Resolve pronouns and references
    const referenceMap = {
      'it': session.context.entities.get('program') || 'the program',
      'this program': session.context.entities.get('program') || 'the program',
      'that university': session.context.entities.get('university') || 'the university',
      'these standards': session.context.entities.get('standard') || 'the standards'
    };
    
    for (const [reference, resolution] of Object.entries(referenceMap)) {
      const regex = new RegExp(`\\b${reference}\\b`, 'gi');
      resolved = resolved.replace(regex, resolution);
    }
    
    return resolved;
  }
};
```

## Multi-Modal Support

### Voice Interface Integration
```javascript
const voiceInterface = {
  async processVoiceInput(audioBuffer, sessionId) {
    // Convert speech to text
    const transcription = await speechToText(audioBuffer);
    
    // Process as regular text message
    const response = await this.processMessage({
      text: transcription.text,
      sessionId,
      modality: 'voice',
      confidence: transcription.confidence
    });
    
    // Generate voice response
    const audioResponse = await textToSpeech(response.text, {
      voice: 'professional',
      speed: 'normal',
      language: 'en'
    });
    
    return {
      ...response,
      audio: {
        url: audioResponse.url,
        duration: audioResponse.duration,
        format: 'mp3'
      }
    };
  },
  
  async generateVoiceResponse(text, options = {}) {
    // Optimize text for speech
    const speechText = this.optimizeForSpeech(text);
    
    return await textToSpeech(speechText, {
      voice: options.voice || 'professional',
      speed: options.speed || 'normal',
      language: options.language || 'en',
      ssml: options.enableSSML || false
    });
  },
  
  optimizeForSpeech: (text) => {
    let optimized = text;
    
    // Convert markdown to speech-friendly format
    optimized = optimized.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold
    optimized = optimized.replace(/\*(.*?)\*/g, '$1'); // Remove italic
    optimized = optimized.replace(/^#+\s*/gm, ''); // Remove headers
    
    // Add pauses for better speech flow
    optimized = optimized.replace(/\n\n/g, '. '); // Convert paragraphs
    optimized = optimized.replace(/:\s*/g, ': '); // Pause after colons
    
    // Expand abbreviations
    const expansions = {
      'CS': 'Computer Science',
      'MIT': 'M I T',
      'CEU': 'C E U',
      'ABET': 'A B E T'
    };
    
    for (const [abbrev, expansion] of Object.entries(expansions)) {
      optimized = optimized.replace(new RegExp(`\\b${abbrev}\\b`, 'g'), expansion);
    }
    
    return optimized;
  }
};
```

### Structured Data Interfaces
```javascript
const structuredInterface = {
  async generateChartData(analysisResults, chartType) {
    switch (chartType) {
      case 'comparison-chart':
        return this.createComparisonChart(analysisResults);
      
      case 'compliance-gauge':
        return this.createComplianceGauge(analysisResults);
      
      case 'gap-analysis':
        return this.createGapAnalysisChart(analysisResults);
      
      default:
        throw new Error(`Unsupported chart type: ${chartType}`);
    }
  },
  
  createComparisonChart: (comparisonResults) => {
    return {
      type: 'horizontal-bar',
      title: 'Curriculum Comparison',
      data: {
        labels: comparisonResults.categories,
        datasets: [
          {
            label: comparisonResults.source.university,
            data: comparisonResults.source.scores,
            backgroundColor: '#3498db'
          },
          {
            label: comparisonResults.target.university,
            data: comparisonResults.target.scores,
            backgroundColor: '#e74c3c'
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { max: 100, title: { display: true, text: 'Coverage %' } }
        }
      }
    };
  }
};
```

## Configuration

### Environment Variables
```bash
# NLP Configuration
NLP_MODEL=spacy-en-core-web-sm
INTENT_CONFIDENCE_THRESHOLD=0.7
ENTITY_CONFIDENCE_THRESHOLD=0.8

# Response Configuration
DEFAULT_RESPONSE_FORMAT=conversational
MAX_RESPONSE_LENGTH=2000
ENABLE_VOICE_RESPONSE=true

# Session Management
SESSION_TIMEOUT_HOURS=24
MAX_HISTORY_ITEMS=50
ENABLE_CONTEXT_PERSISTENCE=true
```

### Language Models
```javascript
const languageModels = {
  'intent-classification': {
    model: 'distilbert-base-uncased-finetuned-sst-2-english',
    threshold: 0.7,
    labels: ['curriculum-comparison', 'accreditation-analysis', 'gap-analysis']
  },
  
  'entity-extraction': {
    model: 'spacy-en-core-web-sm',
    entities: ['ORG', 'GPE', 'PERSON', 'CUSTOM_PROGRAM', 'CUSTOM_STANDARD']
  },
  
  'response-generation': {
    model: 'gpt-3.5-turbo',
    temperature: 0.3,
    maxTokens: 500
  }
};
```

## Monitoring and Metrics

### Conversation Metrics
```javascript
const reportChatMetrics = async (sessionData, responseData) => {
  await cloudWatch.putMetricData({
    Namespace: 'CurriculumAlignment/ChatInterface',
    MetricData: [
      {
        MetricName: 'ResponseTime',
        Value: responseData.processingTime,
        Unit: 'Milliseconds',
        Dimensions: [
          { Name: 'Intent', Value: responseData.detectedIntent },
          { Name: 'ResponseFormat', Value: responseData.format }
        ]
      },
      {
        MetricName: 'IntentConfidence',
        Value: responseData.intentConfidence,
        Unit: 'Percent'
      },
      {
        MetricName: 'SessionLength',
        Value: sessionData.messageCount,
        Unit: 'Count'
      }
    ]
  }).promise();
};
```

## Testing

### Unit Tests
```javascript
describe('Chat Interface Agent', () => {
  test('should classify intent correctly', async () => {
    const text = 'Compare MIT CS program with Stanford';
    
    const intent = await intentClassifier.classify(text);
    
    expect(intent[0].intent).toBe('curriculum-comparison');
    expect(intent[0].confidence).toBeGreaterThan(0.8);
  });
  
  test('should extract entities correctly', () => {
    const text = 'CEU Computer Science program ABET compliance';
    
    const entities = entityExtractor.extract(text);
    
    expect(entities).toContainEqual(
      expect.objectContaining({ type: 'university', value: 'Central European University' })
    );
    expect(entities).toContainEqual(
      expect.objectContaining({ type: 'program', value: 'Computer Science' })
    );
  });
});
```

### Integration Tests
```javascript
describe('Chat Interface Integration', () => {
  test('should handle complete conversation flow', async () => {
    const session = sessionManager.createSession('test-user');
    
    const response1 = await chatInterface.processMessage({
      text: 'Compare CEU CS with MIT',
      sessionId: session.id
    });
    
    expect(response1.actionsTaken).toContainEqual(
      expect.objectContaining({ action: 'curriculum-comparison' })
    );
    
    const response2 = await chatInterface.processMessage({
      text: 'Show me the detailed mapping',
      sessionId: session.id
    });
    
    expect(response2.text).toContain('course mapping');
  });
});
```

## Troubleshooting

### Common Issues

1. **Poor Intent Recognition**
   - Review training data for intent classifier
   - Update intent patterns and examples
   - Adjust confidence thresholds

2. **Inconsistent Entity Extraction**
   - Update entity patterns
   - Improve normalization rules
   - Add domain-specific aliases

3. **Low Response Quality**
   - Review response templates
   - Improve data formatting functions
   - Enhance context awareness

### Debug Commands
```bash
# Test intent classification
curl -X POST https://api.example.com/chat-interface/intent \
  -H "Content-Type: application/json" \
  -d '{"input": {"text": "Compare MIT with Stanford"}}'

# Send test message
curl -X POST https://api.example.com/chat-interface/message \
  -d '{"message": {"text": "Hello", "sessionId": "test"}}'

# Check conversation metrics
aws logs filter-log-events --log-group-name /aws/lambda/chat-interface \
  --filter-pattern "intent"
```