# Semantic Search Agent

The Semantic Search Agent performs advanced semantic analysis and matching of curriculum content, enabling deep understanding of course relationships, learning objectives alignment, and conceptual similarity detection.

## Overview

- **Function Name**: `curriculum-alignment-semantic-search-{environment}`
- **Runtime**: Node.js 18.x
- **Memory**: 768MB
- **Timeout**: 4 minutes
- **Concurrency**: 20 concurrent executions

## Responsibilities

1. **Semantic Embedding** - Generate vector embeddings for curriculum content
2. **Similarity Analysis** - Calculate semantic similarity between curricula
3. **Concept Mapping** - Map related concepts across different curricula
4. **Gap Identification** - Identify semantic gaps in curriculum coverage
5. **Learning Objective Alignment** - Align learning outcomes across programs

## API Endpoints

### POST /semantic-search/embed
Generates semantic embeddings for curriculum content.

**Request:**
```json
{
  "content": {
    "type": "curriculum",
    "data": {
      "program": "Computer Science",
      "courses": [
        {
          "code": "CS 101",
          "title": "Introduction to Programming",
          "description": "Fundamentals of programming using Python. Topics include variables, control structures, functions, and basic data structures.",
          "learningObjectives": [
            "Write basic Python programs",
            "Understand programming fundamentals",
            "Implement simple algorithms"
          ]
        }
      ]
    }
  },
  "embeddingOptions": {
    "model": "sentence-transformers",
    "granularity": "course-level",
    "includeObjectives": true,
    "language": "en"
  }
}
```

**Response:**
```json
{
  "embeddingId": "emb_20240101_123456",
  "status": "completed",
  "embeddings": {
    "courses": [
      {
        "code": "CS 101",
        "title": "Introduction to Programming",
        "embedding": {
          "vector": [0.1234, -0.5678, 0.9012, ...],
          "dimensions": 768,
          "model": "sentence-transformers-all-MiniLM-L6-v2"
        },
        "objectives": [
          {
            "text": "Write basic Python programs",
            "embedding": {
              "vector": [0.2345, -0.6789, 0.1234, ...],
              "dimensions": 768
            }
          }
        ]
      }
    ],
    "metadata": {
      "totalItems": 1,
      "averageConfidence": 0.94,
      "embeddingTime": "2.1s"
    }
  },
  "timestamp": "2024-01-01T12:34:56Z"
}
```

### POST /semantic-search/compare
Performs semantic comparison between curricula or curriculum components.

**Request:**
```json
{
  "comparison": {
    "type": "curriculum-to-curriculum",
    "source": {
      "program": "Computer Science",
      "university": "University A",
      "courses": [...]
    },
    "target": {
      "program": "Computer Science", 
      "university": "University B",
      "courses": [...]
    }
  },
  "comparisonOptions": {
    "similarity": "cosine",
    "threshold": 0.7,
    "detailedMapping": true,
    "includeConcepts": true
  }
}
```

**Response:**
```json
{
  "comparisonId": "comp_20240101_123456",
  "status": "completed",
  "results": {
    "overallSimilarity": 0.84,
    "courseMappings": [
      {
        "sourceCourse": {
          "code": "CS 101",
          "title": "Introduction to Programming"
        },
        "targetCourse": {
          "code": "COMP 110", 
          "title": "Programming Fundamentals"
        },
        "similarity": 0.91,
        "confidence": 0.88,
        "mappingType": "direct"
      }
    ],
    "conceptAlignment": {
      "aligned": [
        {
          "concept": "programming-fundamentals",
          "similarity": 0.95,
          "sourceReferences": ["CS 101", "CS 102"],
          "targetReferences": ["COMP 110", "COMP 111"]
        }
      ],
      "gaps": [
        {
          "concept": "software-engineering-principles",
          "missingIn": "target",
          "severity": "medium",
          "recommendation": "Add software engineering course"
        }
      ]
    },
    "statistics": {
      "totalComparisons": 156,
      "strongMatches": 89,
      "weakMatches": 34,
      "noMatches": 33
    }
  }
}
```

### POST /semantic-search/find-similar
Finds semantically similar content based on a query.

**Request:**
```json
{
  "query": {
    "text": "machine learning algorithms and neural networks",
    "type": "concept-search",
    "context": "computer-science"
  },
  "searchOptions": {
    "maxResults": 20,
    "similarity": "cosine",
    "threshold": 0.6,
    "includeSnippets": true
  },
  "corpus": {
    "source": "indexed-curricula",
    "filters": {
      "domain": "computer-science",
      "level": "undergraduate"
    }
  }
}
```

**Response:**
```json
{
  "searchId": "search_20240101_123456",
  "status": "completed",
  "query": {
    "originalText": "machine learning algorithms and neural networks",
    "processedText": "machine learning algorithms neural networks",
    "embedding": {
      "vector": [0.3456, -0.7890, 0.2345, ...],
      "dimensions": 768
    }
  },
  "results": [
    {
      "item": {
        "type": "course",
        "code": "CS 445",
        "title": "Machine Learning",
        "university": "University A",
        "description": "Introduction to machine learning algorithms including neural networks..."
      },
      "similarity": 0.93,
      "relevanceScore": 0.91,
      "snippet": "...machine learning algorithms including neural networks, decision trees, and support vector machines...",
      "matchedConcepts": ["machine-learning", "neural-networks", "algorithms"]
    }
  ],
  "totalResults": 15,
  "processingTime": "1.8s"
}
```

### POST /semantic-search/analyze-gaps
Identifies semantic gaps in curriculum coverage.

**Request:**
```json
{
  "curriculum": {
    "program": "Computer Science",
    "courses": [...]
  },
  "standards": {
    "type": "accreditation",
    "standard": "ABET-CAC",
    "requirements": [...]
  },
  "gapAnalysisOptions": {
    "threshold": 0.7,
    "includeRecommendations": true,
    "detailLevel": "detailed"
  }
}
```

**Response:**
```json
{
  "gapAnalysisId": "gap_20240101_123456",
  "status": "completed",
  "coverage": {
    "overall": 0.78,
    "byCategory": {
      "programming": 0.95,
      "mathematics": 0.85,
      "systems": 0.72,
      "theory": 0.65,
      "ethics": 0.45
    }
  },
  "gaps": [
    {
      "category": "ethics",
      "concept": "computer-ethics-privacy",
      "severity": "high",
      "coverage": 0.15,
      "expectedCoverage": 0.80,
      "description": "Insufficient coverage of privacy and ethical issues in computing",
      "recommendations": [
        {
          "action": "add-course",
          "suggestion": "CS 485 - Computer Ethics and Privacy",
          "rationale": "Addresses ethical reasoning and privacy concerns"
        }
      ]
    }
  ],
  "strengths": [
    {
      "category": "programming",
      "concept": "programming-fundamentals",
      "coverage": 0.98,
      "description": "Excellent coverage of programming fundamentals"
    }
  ]
}
```

## Semantic Processing Pipeline

### Text Preprocessing
```javascript
const preprocessText = (text, options = {}) => {
  let processed = text;
  
  // Normalize whitespace and case
  processed = processed.toLowerCase().trim();
  
  // Remove special characters but keep academic notation
  processed = processed.replace(/[^\w\s\-\.]/g, ' ');
  
  // Handle academic course codes
  processed = processed.replace(/([A-Z]{2,4})\s*(\d{3,4})/gi, '$1$2');
  
  // Remove stopwords while preserving technical terms
  if (options.removeStopwords) {
    const technicalStopwords = getTechnicalStopwords();
    processed = removeStopwords(processed, technicalStopwords);
  }
  
  // Standardize technical terminology
  processed = standardizeTechnicalTerms(processed);
  
  return processed;
};
```

### Embedding Generation
```javascript
const generateEmbeddings = async (content, model = 'sentence-transformers') => {
  const embeddings = {};
  
  switch (model) {
    case 'sentence-transformers':
      embeddings.vector = await sentenceTransformersEmbed(content);
      embeddings.dimensions = 768;
      break;
      
    case 'openai-ada':
      embeddings.vector = await openAIEmbed(content);
      embeddings.dimensions = 1536;
      break;
      
    case 'bert-base':
      embeddings.vector = await bertEmbed(content);
      embeddings.dimensions = 768;
      break;
      
    default:
      throw new Error(`Unsupported embedding model: ${model}`);
  }
  
  // Normalize vector for cosine similarity
  embeddings.vector = normalizeVector(embeddings.vector);
  embeddings.magnitude = calculateMagnitude(embeddings.vector);
  
  return embeddings;
};
```

### Similarity Calculation
```javascript
const calculateSimilarity = (embedding1, embedding2, method = 'cosine') => {
  switch (method) {
    case 'cosine':
      return cosineSimilarity(embedding1.vector, embedding2.vector);
      
    case 'euclidean':
      return 1 / (1 + euclideanDistance(embedding1.vector, embedding2.vector));
      
    case 'manhattan':
      return 1 / (1 + manhattanDistance(embedding1.vector, embedding2.vector));
      
    case 'jaccard':
      return jaccardSimilarity(
        vectorToSet(embedding1.vector),
        vectorToSet(embedding2.vector)
      );
      
    default:
      throw new Error(`Unsupported similarity method: ${method}`);
  }
};

const cosineSimilarity = (vecA, vecB) => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  return dotProduct / (magnitudeA * magnitudeB);
};
```

## Concept Mapping and Analysis

### Concept Extraction
```javascript
const extractConcepts = (text, domain = 'computer-science') => {
  const concepts = [];
  
  // Domain-specific concept patterns
  const conceptPatterns = getConceptPatterns(domain);
  
  for (const [conceptType, patterns] of Object.entries(conceptPatterns)) {
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      
      concepts.push(...matches.map(match => ({
        text: match[0],
        type: conceptType,
        position: match.index,
        confidence: calculateConceptConfidence(match, text)
      })));
    }
  }
  
  // Use NLP for additional concept extraction
  const nlpConcepts = await extractConceptsWithNLP(text, domain);
  concepts.push(...nlpConcepts);
  
  // Deduplicate and rank concepts
  return deduplicateAndRankConcepts(concepts);
};

const getConceptPatterns = (domain) => {
  const patterns = {
    'computer-science': {
      'programming-languages': [
        /\b(Python|Java|C\+\+|JavaScript|Go|Rust|Swift)\b/gi,
        /\b(programming\s+language|scripting\s+language)\b/gi
      ],
      'algorithms': [
        /\b(algorithm|sorting|searching|graph\s+algorithm)\b/gi,
        /\b(dynamic\s+programming|greedy\s+algorithm)\b/gi
      ],
      'data-structures': [
        /\b(array|linked\s+list|tree|graph|hash\s+table)\b/gi,
        /\b(stack|queue|heap|binary\s+tree)\b/gi
      ],
      'systems': [
        /\b(operating\s+system|database|network|distributed\s+system)\b/gi,
        /\b(computer\s+architecture|system\s+design)\b/gi
      ]
    }
  };
  
  return patterns[domain] || patterns['computer-science'];
};
```

### Curriculum Mapping
```javascript
const mapCurricula = async (sourceCurriculum, targetCurriculum, options) => {
  const mappings = {
    direct: [],
    partial: [],
    conceptual: [],
    unmapped: []
  };
  
  // Generate embeddings for all courses
  const sourceEmbeddings = await generateCurriculumEmbeddings(sourceCurriculum);
  const targetEmbeddings = await generateCurriculumEmbeddings(targetCurriculum);
  
  // Find best matches for each source course
  for (const sourceCourse of sourceEmbeddings) {
    const matches = [];
    
    for (const targetCourse of targetEmbeddings) {
      const similarity = calculateSimilarity(
        sourceCourse.embedding,
        targetCourse.embedding,
        options.similarity
      );
      
      if (similarity >= options.threshold) {
        matches.push({
          targetCourse,
          similarity,
          confidence: calculateMappingConfidence(sourceCourse, targetCourse)
        });
      }
    }
    
    // Sort by similarity and categorize
    matches.sort((a, b) => b.similarity - a.similarity);
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      
      if (bestMatch.similarity >= 0.9 && bestMatch.confidence >= 0.8) {
        mappings.direct.push({
          source: sourceCourse,
          target: bestMatch.targetCourse,
          similarity: bestMatch.similarity,
          type: 'direct'
        });
      } else if (bestMatch.similarity >= 0.7) {
        mappings.partial.push({
          source: sourceCourse,
          target: bestMatch.targetCourse,
          similarity: bestMatch.similarity,
          type: 'partial'
        });
      } else {
        mappings.conceptual.push({
          source: sourceCourse,
          target: bestMatch.targetCourse,
          similarity: bestMatch.similarity,
          type: 'conceptual'
        });
      }
    } else {
      mappings.unmapped.push({
        source: sourceCourse,
        type: 'unmapped'
      });
    }
  }
  
  return mappings;
};
```

### Gap Analysis Engine
```javascript
const performGapAnalysis = async (curriculum, standards, options) => {
  const analysis = {
    coverage: {},
    gaps: [],
    strengths: []
  };
  
  // Extract concepts from curriculum
  const curriculumConcepts = await extractCurriculumConcepts(curriculum);
  
  // Extract required concepts from standards
  const requiredConcepts = await extractStandardConcepts(standards);
  
  // Calculate coverage for each concept category
  for (const category of Object.keys(requiredConcepts)) {
    const required = requiredConcepts[category];
    const covered = curriculumConcepts[category] || [];
    
    const coverage = calculateConceptCoverage(covered, required);
    analysis.coverage[category] = coverage.score;
    
    if (coverage.score < options.threshold) {
      analysis.gaps.push({
        category,
        concept: coverage.missingConcepts[0], // Primary gap
        severity: calculateGapSeverity(coverage),
        coverage: coverage.score,
        expectedCoverage: 1.0,
        recommendations: generateGapRecommendations(coverage, category)
      });
    } else if (coverage.score > 0.9) {
      analysis.strengths.push({
        category,
        concept: coverage.strongConcepts[0], // Primary strength
        coverage: coverage.score,
        description: `Excellent coverage of ${category}`
      });
    }
  }
  
  analysis.overall = Object.values(analysis.coverage)
    .reduce((sum, score) => sum + score, 0) / Object.keys(analysis.coverage).length;
  
  return analysis;
};
```

## Vector Storage and Indexing

### Vector Database Integration
```javascript
const vectorDB = {
  async store(embeddings, metadata) {
    // Store in vector database (e.g., Pinecone, Weaviate, or Elasticsearch)
    const vectors = embeddings.map((emb, index) => ({
      id: `${metadata.id}_${index}`,
      vector: emb.vector,
      metadata: {
        ...metadata,
        text: emb.originalText,
        type: emb.type,
        timestamp: new Date().toISOString()
      }
    }));
    
    return await this.client.upsert(vectors);
  },
  
  async search(queryVector, options = {}) {
    const searchParams = {
      vector: queryVector,
      topK: options.maxResults || 10,
      filter: options.filters || {},
      includeMetadata: true
    };
    
    const results = await this.client.query(searchParams);
    
    return results.matches.map(match => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata
    }));
  },
  
  async findSimilar(id, options = {}) {
    // Find vectors similar to a specific stored vector
    const vector = await this.client.fetch([id]);
    if (!vector) throw new Error(`Vector ${id} not found`);
    
    return await this.search(vector.vectors[id].values, options);
  }
};
```

### Indexing Strategy
```javascript
const indexingStrategy = {
  hierarchical: {
    // Index at multiple granularity levels
    levels: ['program', 'course', 'module', 'objective'],
    createIndex: async (curriculum) => {
      const indices = {};
      
      // Program level
      indices.program = await generateEmbeddings(
        curriculum.description + ' ' + curriculum.objectives.join(' ')
      );
      
      // Course level
      indices.courses = await Promise.all(
        curriculum.courses.map(course => 
          generateEmbeddings(course.title + ' ' + course.description)
        )
      );
      
      // Objective level
      indices.objectives = await Promise.all(
        curriculum.courses.flatMap(course => 
          course.objectives?.map(obj => generateEmbeddings(obj)) || []
        )
      );
      
      return indices;
    }
  },
  
  conceptual: {
    // Index by extracted concepts
    createIndex: async (curriculum) => {
      const concepts = await extractCurriculumConcepts(curriculum);
      const conceptIndex = {};
      
      for (const [category, conceptList] of Object.entries(concepts)) {
        conceptIndex[category] = await Promise.all(
          conceptList.map(concept => generateEmbeddings(concept.text))
        );
      }
      
      return conceptIndex;
    }
  }
};
```

## Configuration

### Environment Variables
```bash
# Embedding Configuration
EMBEDDING_MODEL=sentence-transformers
EMBEDDING_DIMENSIONS=768
MAX_SEQUENCE_LENGTH=512

# Search Configuration
DEFAULT_SIMILARITY_THRESHOLD=0.7
MAX_SEARCH_RESULTS=50
ENABLE_CONCEPT_EXTRACTION=true

# Performance
BATCH_SIZE=32
PARALLEL_PROCESSING=true
CACHE_EMBEDDINGS=true
```

### Model Configuration
```javascript
const modelConfig = {
  'sentence-transformers': {
    model: 'all-MiniLM-L6-v2',
    dimensions: 384,
    maxLength: 256,
    language: 'multilingual'
  },
  
  'openai-ada': {
    model: 'text-embedding-ada-002',
    dimensions: 1536,
    maxLength: 8191,
    apiKey: process.env.OPENAI_API_KEY
  },
  
  'custom-bert': {
    model: 'curriculum-bert-v1',
    dimensions: 768,
    maxLength: 512,
    endpoint: process.env.CUSTOM_MODEL_ENDPOINT
  }
};
```

## Monitoring and Metrics

### Performance Metrics
```javascript
const reportSemanticMetrics = async (results) => {
  await cloudWatch.putMetricData({
    Namespace: 'CurriculumAlignment/SemanticSearch',
    MetricData: [
      {
        MetricName: 'EmbeddingGenerationTime',
        Value: results.embeddingTime,
        Unit: 'Milliseconds',
        Dimensions: [
          { Name: 'Model', Value: results.model },
          { Name: 'ContentType', Value: results.contentType }
        ]
      },
      {
        MetricName: 'SimilarityScore',
        Value: results.averageSimilarity,
        Unit: 'Percent'
      },
      {
        MetricName: 'ConceptsExtracted',
        Value: results.conceptCount,
        Unit: 'Count'
      }
    ]
  }).promise();
};
```

## Testing

### Unit Tests
```javascript
describe('Semantic Search Agent', () => {
  test('should generate consistent embeddings', async () => {
    const text = 'Introduction to computer programming';
    
    const embedding1 = await generateEmbeddings(text);
    const embedding2 = await generateEmbeddings(text);
    
    const similarity = calculateSimilarity(embedding1, embedding2);
    expect(similarity).toBeGreaterThan(0.99);
  });
  
  test('should find similar courses', async () => {
    const courses = [
      { title: 'Programming Fundamentals', description: 'Basic programming concepts' },
      { title: 'Introduction to Programming', description: 'Programming basics using Python' },
      { title: 'Advanced Calculus', description: 'Advanced mathematical concepts' }
    ];
    
    const similarities = await findSimilarCourses(courses[0], courses);
    
    expect(similarities[1].similarity).toBeGreaterThan(0.8);
    expect(similarities[2].similarity).toBeLessThan(0.3);
  });
});
```

### Integration Tests
```javascript
describe('Semantic Analysis Integration', () => {
  test('should perform curriculum comparison', async () => {
    const result = await semanticSearch.compare({
      source: testCurriculumA,
      target: testCurriculumB
    });
    
    expect(result.overallSimilarity).toBeDefined();
    expect(result.courseMappings.length).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Common Issues

1. **Low Similarity Scores**
   - Check embedding model suitability
   - Review text preprocessing
   - Adjust similarity thresholds

2. **Poor Concept Extraction**
   - Update concept patterns
   - Improve domain-specific vocabulary
   - Enhance NLP preprocessing

3. **Slow Performance**
   - Enable embedding caching
   - Optimize batch processing
   - Use GPU acceleration if available

### Debug Commands
```bash
# Test semantic comparison
curl -X POST https://api.example.com/semantic-search/compare \
  -H "Content-Type: application/json" \
  -d @test-comparison.json

# Generate embeddings
curl -X POST https://api.example.com/semantic-search/embed \
  -d '{"content": {"type": "course", "data": "..."}}'

# Check semantic metrics
aws logs filter-log-events --log-group-name /aws/lambda/semantic-search \
  --filter-pattern "similarity"
```