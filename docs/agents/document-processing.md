# Document Processing Agent

The Document Processing Agent is responsible for processing and analyzing curriculum documents in various formats, extracting structured information, and preparing data for semantic analysis.

## Overview

- **Function Name**: `curriculum-alignment-document-processing-{environment}`
- **Runtime**: Node.js 18.x
- **Memory**: 512MB
- **Timeout**: 5 minutes
- **Concurrency**: 15 concurrent executions

## Responsibilities

1. **Document Parsing** - Process PDFs, Word docs, HTML, and text files
2. **Content Extraction** - Extract courses, requirements, and program structure
3. **Text Normalization** - Standardize formatting and terminology
4. **Data Structuring** - Convert unstructured text to structured data
5. **Quality Validation** - Ensure extracted data accuracy and completeness

## API Endpoints

### POST /document-processing/process
Processes a document and extracts curriculum information.

**Request:**
```json
{
  "document": {
    "url": "https://university.edu/catalog.pdf",
    "type": "pdf",
    "source": "university-website",
    "metadata": {
      "title": "Computer Science Catalog 2024",
      "university": "Central European University",
      "year": "2024"
    }
  },
  "extractionOptions": {
    "extractCourses": true,
    "extractRequirements": true,
    "extractPrerequisites": true,
    "extractPrograms": true,
    "normalizeCodes": true
  }
}
```

**Response:**
```json
{
  "processingId": "proc_20240101_123456",
  "status": "completed",
  "document": {
    "url": "https://university.edu/catalog.pdf",
    "size": "2.4MB",
    "pages": 156,
    "language": "en",
    "confidence": 0.94
  },
  "extractedData": {
    "programs": [
      {
        "name": "Computer Science",
        "degree": "Bachelor of Science",
        "totalCredits": 120,
        "duration": "4 years",
        "department": "School of Mathematics and Computer Science"
      }
    ],
    "courses": [
      {
        "code": "CMSC 101",
        "title": "Introduction to Computer Science",
        "credits": 3,
        "description": "An introduction to computational thinking...",
        "prerequisites": [],
        "corequisites": [],
        "offerings": ["Fall", "Spring"]
      }
    ],
    "requirements": {
      "core": [
        "CMSC 101", "CMSC 201", "CMSC 301"
      ],
      "electives": {
        "minimumCredits": 18,
        "categories": ["Advanced Programming", "Theory", "Systems"]
      },
      "general": [
        "Complete 120 credit hours",
        "Maintain 2.0 GPA",
        "Complete capstone project"
      ]
    }
  },
  "processingTime": "23.4s",
  "timestamp": "2024-01-01T12:34:56Z"
}
```

### POST /document-processing/batch-process
Processes multiple documents in batch.

**Request:**
```json
{
  "documents": [
    {
      "url": "https://university.edu/cs-catalog.pdf",
      "type": "pdf",
      "priority": "high"
    },
    {
      "url": "https://university.edu/math-catalog.pdf", 
      "type": "pdf",
      "priority": "normal"
    }
  ],
  "extractionOptions": {
    "extractCourses": true,
    "extractRequirements": true
  }
}
```

**Response:**
```json
{
  "batchId": "batch_20240101_123456",
  "status": "in-progress",
  "documents": [
    {
      "url": "https://university.edu/cs-catalog.pdf",
      "status": "completed",
      "processingId": "proc_20240101_123457"
    },
    {
      "url": "https://university.edu/math-catalog.pdf",
      "status": "processing",
      "processingId": "proc_20240101_123458"
    }
  ],
  "totalDocuments": 2,
  "completedDocuments": 1,
  "estimatedTimeRemaining": "2 minutes"
}
```

### GET /document-processing/process/{processingId}/status
Retrieves the status of a document processing operation.

**Response:**
```json
{
  "processingId": "proc_20240101_123456",
  "status": "completed",
  "progress": {
    "stage": "completed",
    "stagesCompleted": ["download", "parse", "extract", "validate"],
    "currentStage": null,
    "percentComplete": 100
  },
  "metrics": {
    "downloadTime": "2.1s",
    "parseTime": "8.7s", 
    "extractionTime": "12.6s",
    "totalTime": "23.4s",
    "confidence": 0.94
  }
}
```

## Document Processing Pipeline

### Stage 1: Document Download and Validation
```javascript
const downloadAndValidate = async (documentUrl, options) => {
  // Download document
  const response = await fetch(documentUrl);
  const buffer = await response.buffer();
  
  // Validate file type and size
  const metadata = await analyzeDocument(buffer);
  
  if (metadata.size > MAX_DOCUMENT_SIZE) {
    throw new Error('Document too large');
  }
  
  if (!SUPPORTED_FORMATS.includes(metadata.type)) {
    throw new Error(`Unsupported format: ${metadata.type}`);
  }
  
  return { buffer, metadata };
};
```

### Stage 2: Content Extraction
```javascript
const extractContent = async (buffer, metadata) => {
  const extractors = {
    'pdf': extractFromPDF,
    'docx': extractFromWord,
    'html': extractFromHTML,
    'txt': extractFromText
  };
  
  const extractor = extractors[metadata.type];
  if (!extractor) {
    throw new Error(`No extractor for ${metadata.type}`);
  }
  
  const rawContent = await extractor(buffer, metadata);
  
  return {
    text: rawContent.text,
    structure: rawContent.structure,
    metadata: rawContent.metadata
  };
};
```

### Stage 3: Information Extraction
```javascript
const extractCurriculumInfo = (content, options) => {
  const extractors = {
    courses: extractCourses,
    requirements: extractRequirements,
    programs: extractPrograms,
    prerequisites: extractPrerequisites
  };
  
  const results = {};
  
  for (const [type, extractor] of Object.entries(extractors)) {
    if (options[`extract${capitalize(type)}`]) {
      try {
        results[type] = extractor(content);
      } catch (error) {
        console.warn(`Failed to extract ${type}:`, error);
        results[type] = [];
      }
    }
  }
  
  return results;
};
```

### Stage 4: Data Normalization
```javascript
const normalizeData = (extractedData, options) => {
  return {
    programs: normalizePrograms(extractedData.programs),
    courses: normalizeCourses(extractedData.courses, options),
    requirements: normalizeRequirements(extractedData.requirements),
    prerequisites: normalizePrerequisites(extractedData.prerequisites)
  };
};
```

## Content Extraction Strategies

### Course Information Extraction
```javascript
const extractCourses = (content) => {
  const coursePatterns = [
    // Standard format: "CS 101 - Introduction to Programming (3 credits)"
    /([A-Z]{2,4}\s*\d{3})\s*[-–]\s*([^(]+)\s*\((\d+)\s*credits?\)/gi,
    
    // Table format detection
    /Course\s+Code.*?Title.*?Credits/gi,
    
    // Catalog format: "101. Introduction to Programming"
    /(\d{3})\.\s*([^.]+)\s*\((\d+)\s*cr/gi
  ];
  
  const courses = [];
  
  for (const pattern of coursePatterns) {
    const matches = [...content.matchAll(pattern)];
    
    courses.push(...matches.map(match => ({
      code: match[1]?.trim(),
      title: match[2]?.trim(),
      credits: parseInt(match[3]) || null,
      confidence: calculateConfidence(match)
    })));
  }
  
  return deduplicateCourses(courses);
};
```

### Requirements Extraction
```javascript
const extractRequirements = (content) => {
  const requirementPatterns = {
    core: /core\s+requirements?:?\s*\n([\s\S]*?)(?=\n\s*[A-Z])/gi,
    elective: /elective\s+requirements?:?\s*\n([\s\S]*?)(?=\n\s*[A-Z])/gi,
    general: /general\s+requirements?:?\s*\n([\s\S]*?)(?=\n\s*[A-Z])/gi,
    prerequisite: /prerequisites?:?\s*([^\n]+)/gi
  };
  
  const requirements = {};
  
  for (const [type, pattern] of Object.entries(requirementPatterns)) {
    const matches = [...content.matchAll(pattern)];
    requirements[type] = matches.map(match => 
      cleanRequirementText(match[1] || match[0])
    );
  }
  
  return requirements;
};
```

### Program Structure Extraction
```javascript
const extractPrograms = (content) => {
  const programPatterns = [
    // "Bachelor of Science in Computer Science"
    /(Bachelor|Master|Doctor)\s+of\s+(Science|Arts)\s+in\s+([^.\n]+)/gi,
    
    // "Computer Science Program"
    /([A-Z][a-z\s]+)\s+Program/gi,
    
    // "B.S. Computer Science"
    /(B\.S\.|M\.S\.|Ph\.D\.)\s+([^.\n]+)/gi
  ];
  
  const programs = [];
  
  for (const pattern of programPatterns) {
    const matches = [...content.matchAll(pattern)];
    
    programs.push(...matches.map(match => ({
      degree: match[1] ? `${match[1]} of ${match[2]}` : match[1],
      name: match[3] || match[2],
      code: generateProgramCode(match),
      confidence: calculateConfidence(match)
    })));
  }
  
  return deduplicatePrograms(programs);
};
```

## Quality Validation

### Confidence Scoring
```javascript
const calculateConfidence = (extractedItem, context) => {
  const factors = {
    patternMatch: 0.3,      // How well it matches known patterns
    contextRelevance: 0.25,  // Relevance to surrounding text
    dataCompleteness: 0.2,   // How complete the extracted data is
    formatConsistency: 0.15, // Consistency with other items
    sourceQuality: 0.1       // Quality of source document
  };
  
  let confidence = 0;
  
  for (const [factor, weight] of Object.entries(factors)) {
    confidence += evaluateFactor(extractedItem, factor, context) * weight;
  }
  
  return Math.round(confidence * 100) / 100;
};
```

### Data Validation
```javascript
const validateExtractedData = (data) => {
  const validationResults = {
    courses: validateCourses(data.courses),
    requirements: validateRequirements(data.requirements),
    programs: validatePrograms(data.programs),
    overall: 'valid'
  };
  
  // Calculate overall validation status
  const hasErrors = Object.values(validationResults)
    .some(result => result.status === 'error');
  
  validationResults.overall = hasErrors ? 'error' : 'valid';
  
  return validationResults;
};

const validateCourses = (courses) => {
  const errors = [];
  const warnings = [];
  
  courses.forEach((course, index) => {
    if (!course.code) {
      errors.push(`Course ${index}: Missing course code`);
    }
    
    if (!course.title) {
      errors.push(`Course ${index}: Missing course title`);
    }
    
    if (course.credits && (course.credits < 0 || course.credits > 10)) {
      warnings.push(`Course ${course.code}: Unusual credit value (${course.credits})`);
    }
    
    if (course.confidence < 0.7) {
      warnings.push(`Course ${course.code}: Low confidence (${course.confidence})`);
    }
  });
  
  return {
    status: errors.length > 0 ? 'error' : 'valid',
    errors,
    warnings,
    totalCourses: courses.length
  };
};
```

## Error Handling

### Document Processing Errors
```javascript
const errorHandlers = {
  'DOWNLOAD_FAILED': async (error, url) => {
    // Try alternative URLs or cached versions
    const alternatives = await findAlternativeUrls(url);
    
    for (const altUrl of alternatives) {
      try {
        return await downloadDocument(altUrl);
      } catch (altError) {
        continue;
      }
    }
    
    throw new Error(`Unable to download document: ${url}`);
  },
  
  'PARSE_FAILED': async (error, buffer, metadata) => {
    // Try alternative parsing methods
    if (metadata.type === 'pdf') {
      try {
        return await parseWithOCR(buffer);
      } catch (ocrError) {
        return await parseAsText(buffer);
      }
    }
    
    throw error;
  },
  
  'EXTRACTION_FAILED': async (error, content, options) => {
    // Use fallback extraction methods
    return await performFallbackExtraction(content, options);
  }
};
```

### Partial Processing Support
```javascript
const handlePartialProcessing = (content, error) => {
  const partialResults = {
    status: 'partial',
    error: error.message,
    extractedData: {},
    warnings: []
  };
  
  // Try to extract what we can
  try {
    partialResults.extractedData.courses = extractCourses(content);
    partialResults.warnings.push('Courses extracted successfully');
  } catch (courseError) {
    partialResults.warnings.push('Course extraction failed');
  }
  
  try {
    partialResults.extractedData.programs = extractPrograms(content);
    partialResults.warnings.push('Programs extracted successfully');
  } catch (programError) {
    partialResults.warnings.push('Program extraction failed');
  }
  
  return partialResults;
};
```

## Configuration

### Environment Variables
```bash
# Processing Configuration
MAX_DOCUMENT_SIZE_MB=50
PROCESSING_TIMEOUT_MS=300000
CONCURRENT_EXTRACTIONS=5

# Content Processing
ENABLE_OCR=true
OCR_LANGUAGE=eng
EXTRACT_IMAGES=false
EXTRACT_TABLES=true

# Quality Thresholds
MIN_CONFIDENCE_SCORE=0.7
REQUIRE_COURSE_CODES=true
VALIDATE_CREDIT_HOURS=true
```

### Extraction Configuration
```javascript
const extractionConfig = {
  courses: {
    patterns: [
      /([A-Z]{2,4}\s*\d{3})\s*[-–]\s*([^(]+)\s*\((\d+)\s*credits?\)/gi,
      /(\d{3})\.\s*([^.]+)\s*\((\d+)\s*cr/gi
    ],
    minConfidence: 0.7,
    requiredFields: ['code', 'title']
  },
  
  requirements: {
    patterns: {
      core: /core\s+requirements?:?\s*\n([\s\S]*?)(?=\n\s*[A-Z])/gi,
      elective: /elective\s+requirements?:?\s*\n([\s\S]*?)(?=\n\s*[A-Z])/gi
    },
    minLength: 10
  }
};
```

## Monitoring and Metrics

### Processing Metrics
```javascript
const reportMetrics = async (processingResults) => {
  await cloudWatch.putMetricData({
    Namespace: 'CurriculumAlignment/DocumentProcessing',
    MetricData: [
      {
        MetricName: 'ProcessingTime',
        Value: processingResults.totalTime,
        Unit: 'Milliseconds',
        Dimensions: [
          { Name: 'DocumentType', Value: processingResults.documentType },
          { Name: 'Success', Value: processingResults.success.toString() }
        ]
      },
      {
        MetricName: 'ExtractionConfidence',
        Value: processingResults.confidence,
        Unit: 'Percent'
      }
    ]
  }).promise();
};
```

## Testing

### Unit Tests
```javascript
describe('Document Processing Agent', () => {
  test('should extract courses from course catalog text', () => {
    const text = `
      CS 101 - Introduction to Programming (3 credits)
      CS 201 - Data Structures and Algorithms (4 credits)
    `;
    
    const courses = extractCourses(text);
    
    expect(courses).toHaveLength(2);
    expect(courses[0].code).toBe('CS 101');
    expect(courses[0].credits).toBe(3);
  });
  
  test('should validate extracted course data', () => {
    const courses = [
      { code: 'CS 101', title: 'Programming', credits: 3 },
      { code: '', title: 'Invalid Course', credits: -1 }
    ];
    
    const validation = validateCourses(courses);
    
    expect(validation.status).toBe('error');
    expect(validation.errors).toContain('Course 1: Missing course code');
  });
});
```

### Integration Tests
```javascript
describe('Document Processing Integration', () => {
  test('should process real curriculum PDF', async () => {
    const request = {
      document: {
        url: 'https://example.edu/catalog.pdf',
        type: 'pdf'
      },
      extractionOptions: {
        extractCourses: true,
        extractRequirements: true
      }
    };
    
    const result = await documentProcessor.process(request);
    
    expect(result.status).toBe('completed');
    expect(result.extractedData.courses.length).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Common Issues

1. **Low Extraction Confidence**
   - Review and update extraction patterns
   - Check document quality and formatting
   - Adjust confidence thresholds

2. **Missing Course Information**
   - Verify document contains expected content
   - Update extraction patterns for new formats
   - Check for PDF text extraction issues

3. **Processing Timeouts**
   - Increase timeout limits
   - Optimize extraction algorithms
   - Process documents in smaller chunks

### Debug Commands
```bash
# Test document processing
curl -X POST https://api.example.com/document-processing/process \
  -H "Content-Type: application/json" \
  -d '{"document": {"url": "https://example.edu/catalog.pdf"}}'

# Check processing metrics
aws logs filter-log-events --log-group-name /aws/lambda/document-processing \
  --filter-pattern "confidence"

# Download processed documents for analysis
aws s3 cp s3://bucket/processed-docs/ ./debug/ --recursive
```