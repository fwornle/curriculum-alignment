# QA Agent

The QA Agent ensures quality and validates analysis results across all stages of the curriculum alignment process, providing comprehensive quality assurance for data integrity, analysis accuracy, and output reliability.

## Overview

- **Function Name**: `curriculum-alignment-qa-agent-{environment}`
- **Runtime**: Node.js 18.x
- **Memory**: 256MB
- **Timeout**: 2 minutes
- **Concurrency**: 30 concurrent executions

## Responsibilities

1. **Data Validation** - Verify integrity and completeness of input data
2. **Analysis Verification** - Validate accuracy of processing results
3. **Cross-Reference Checking** - Ensure consistency across multiple sources
4. **Quality Scoring** - Assign confidence and quality scores to outputs
5. **Error Detection** - Identify and flag potential issues or inconsistencies

## API Endpoints

### POST /qa-agent/validate-data
Validates the quality and integrity of input data.

**Request:**
```json
{
  "dataType": "curriculum",
  "data": {
    "program": "Computer Science",
    "university": "Central European University",
    "courses": [
      {
        "code": "CS 101",
        "title": "Introduction to Programming",
        "credits": 3,
        "prerequisites": []
      }
    ],
    "requirements": {
      "totalCredits": 120,
      "coreCredits": 60,
      "electiveCredits": 60
    }
  },
  "validationRules": {
    "strictMode": true,
    "checkDuplicates": true,
    "validateCredits": true,
    "verifyPrerequisites": true
  }
}
```

**Response:**
```json
{
  "validationId": "val_20240101_123456",
  "status": "completed",
  "overallQuality": {
    "score": 0.92,
    "grade": "A",
    "status": "high-quality"
  },
  "validationResults": {
    "dataIntegrity": {
      "score": 0.95,
      "status": "passed",
      "checks": {
        "completeness": "passed",
        "consistency": "passed",
        "format": "passed"
      }
    },
    "contentQuality": {
      "score": 0.89,
      "status": "passed",
      "issues": [
        {
          "type": "warning",
          "field": "courses[5].description",
          "message": "Course description unusually short",
          "severity": "low"
        }
      ]
    },
    "logicalConsistency": {
      "score": 0.94,
      "status": "passed",
      "checks": {
        "creditTotals": "passed",
        "prerequisiteChains": "passed",
        "degreeRequirements": "passed"
      }
    }
  },
  "recommendations": [
    {
      "priority": "medium",
      "category": "data-enhancement",
      "description": "Consider adding more detailed course descriptions",
      "affectedItems": 3
    }
  ],
  "timestamp": "2024-01-01T12:34:56Z"
}
```

### POST /qa-agent/verify-analysis
Verifies the accuracy and reliability of analysis results.

**Request:**
```json
{
  "analysisType": "curriculum-alignment",
  "originalData": {
    "sourceCurriculum": "...",
    "targetCurriculum": "..."
  },
  "analysisResults": {
    "alignmentScore": 0.87,
    "gaps": [
      {
        "category": "missing-course",
        "description": "Advanced Algorithms not present",
        "severity": "medium"
      }
    ],
    "recommendations": [
      {
        "action": "add-course",
        "course": "CS 485 - Advanced Algorithms",
        "justification": "Required for ABET compliance"
      }
    ]
  },
  "verificationOptions": {
    "crossCheck": true,
    "confidenceThreshold": 0.8,
    "validateRecommendations": true
  }
}
```

**Response:**
```json
{
  "verificationId": "ver_20240101_123456",
  "status": "completed",
  "verificationResults": {
    "accuracy": {
      "score": 0.91,
      "status": "high-confidence",
      "methodology": "cross-reference-validation"
    },
    "completeness": {
      "score": 0.88,
      "status": "substantially-complete",
      "missingElements": ["cost-analysis", "timeline-estimates"]
    },
    "consistency": {
      "score": 0.94,
      "status": "highly-consistent",
      "conflictCount": 0
    }
  },
  "qualityAssessment": {
    "overallGrade": "A-",
    "confidence": 0.91,
    "reliability": "high",
    "usabilityScore": 0.89
  },
  "issues": [
    {
      "type": "suggestion",
      "category": "enhancement",
      "description": "Add implementation timeline for recommendations",
      "impact": "medium"
    }
  ],
  "approved": true
}
```

### POST /qa-agent/cross-reference
Performs cross-reference validation across multiple data sources.

**Request:**
```json
{
  "sources": [
    {
      "id": "source1",
      "type": "university-catalog",
      "data": { "courses": [...] }
    },
    {
      "id": "source2", 
      "type": "accreditation-standard",
      "data": { "requirements": [...] }
    }
  ],
  "crossCheckRules": {
    "matchThreshold": 0.85,
    "allowPartialMatches": true,
    "flagConflicts": true
  }
}
```

**Response:**
```json
{
  "crossReferenceId": "xref_20240101_123456",
  "status": "completed",
  "consistencyScore": 0.89,
  "matches": [
    {
      "element": "CS 101 Introduction to Programming",
      "sources": ["source1", "source2"],
      "confidence": 0.95,
      "status": "confirmed"
    }
  ],
  "conflicts": [
    {
      "element": "Total credit requirements",
      "sources": ["source1", "source2"],
      "values": [120, 128],
      "severity": "medium",
      "requiresResolution": true
    }
  ],
  "gaps": [
    {
      "element": "CS 485 Advanced Algorithms",
      "presentIn": ["source2"],
      "missingFrom": ["source1"],
      "impact": "accreditation-compliance"
    }
  ]
}
```

### GET /qa-agent/quality-report/{entityId}
Generates a comprehensive quality report for a specific entity.

**Response:**
```json
{
  "entityId": "curriculum_cs_ceu_2024",
  "entityType": "curriculum",
  "qualityReport": {
    "overallScore": 0.88,
    "grade": "B+",
    "lastAssessed": "2024-01-01T12:34:56Z",
    "dimensions": {
      "completeness": {
        "score": 0.91,
        "metrics": {
          "dataFields": "95% complete",
          "courseDescriptions": "89% complete",
          "prerequisites": "100% complete"
        }
      },
      "accuracy": {
        "score": 0.87,
        "verificationMethod": "multi-source-validation",
        "confidence": "high"
      },
      "consistency": {
        "score": 0.86,
        "internalConsistency": 0.92,
        "externalConsistency": 0.80
      },
      "timeliness": {
        "score": 0.90,
        "lastUpdated": "2024-01-01",
        "ageInDays": 5
      }
    },
    "recommendations": [
      {
        "priority": "high",
        "action": "Update course prerequisites for CS 301",
        "rationale": "Inconsistent with current curriculum structure"
      }
    ]
  }
}
```

## Quality Assessment Framework

### Data Quality Dimensions
```javascript
const qualityDimensions = {
  completeness: {
    weight: 0.25,
    measures: ['field-completeness', 'record-completeness', 'schema-completeness'],
    threshold: 0.8
  },
  
  accuracy: {
    weight: 0.25,
    measures: ['source-verification', 'cross-validation', 'format-validation'],
    threshold: 0.85
  },
  
  consistency: {
    weight: 0.20,
    measures: ['internal-consistency', 'cross-source-consistency', 'temporal-consistency'],
    threshold: 0.8
  },
  
  timeliness: {
    weight: 0.15,
    measures: ['data-freshness', 'update-frequency', 'relevance-period'],
    threshold: 0.7
  },
  
  validity: {
    weight: 0.15,
    measures: ['format-compliance', 'business-rule-compliance', 'range-validation'],
    threshold: 0.9
  }
};
```

### Quality Scoring Algorithm
```javascript
const calculateQualityScore = (data, validationResults) => {
  const dimensionScores = {};
  let totalScore = 0;
  
  for (const [dimension, config] of Object.entries(qualityDimensions)) {
    const measures = config.measures.map(measure => 
      evaluateMeasure(data, measure, validationResults)
    );
    
    const dimensionScore = measures.reduce((sum, score) => sum + score, 0) / measures.length;
    dimensionScores[dimension] = dimensionScore;
    totalScore += dimensionScore * config.weight;
  }
  
  return {
    overall: Math.round(totalScore * 100) / 100,
    dimensions: dimensionScores,
    grade: assignGrade(totalScore),
    status: determineStatus(totalScore)
  };
};
```

### Validation Rule Engine
```javascript
const validationRules = {
  curriculum: {
    required: ['program', 'university', 'courses', 'totalCredits'],
    
    'courses.*.code': {
      type: 'string',
      pattern: /^[A-Z]{2,4}\s*\d{3,4}[A-Z]?$/,
      message: 'Course code must follow standard format'
    },
    
    'courses.*.credits': {
      type: 'number',
      min: 0,
      max: 12,
      message: 'Credits must be between 0 and 12'
    },
    
    'totalCredits': {
      type: 'number',
      min: 90,
      max: 200,
      message: 'Total credits should be between 90-200'
    },
    
    custom: [
      {
        name: 'credit-sum-consistency',
        validator: (data) => {
          const courseCredits = data.courses.reduce((sum, course) => 
            sum + (course.credits || 0), 0
          );
          return Math.abs(courseCredits - data.totalCredits) <= 5;
        },
        message: 'Sum of course credits should approximately equal total credits'
      }
    ]
  }
};
```

## Cross-Reference Validation

### Multi-Source Validation
```javascript
const crossValidateData = async (sources, element) => {
  const validationResults = {
    matches: [],
    conflicts: [],
    confidence: 0
  };
  
  // Compare each source pair
  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const comparison = compareElements(
        sources[i].data[element],
        sources[j].data[element]
      );
      
      if (comparison.similarity > 0.85) {
        validationResults.matches.push({
          sources: [sources[i].id, sources[j].id],
          similarity: comparison.similarity,
          element: element
        });
      } else if (comparison.similarity < 0.5) {
        validationResults.conflicts.push({
          sources: [sources[i].id, sources[j].id],
          similarity: comparison.similarity,
          differences: comparison.differences
        });
      }
    }
  }
  
  // Calculate overall confidence
  validationResults.confidence = calculateConfidence(validationResults);
  
  return validationResults;
};
```

### Conflict Resolution
```javascript
const resolveConflicts = (conflicts, sources) => {
  return conflicts.map(conflict => {
    const resolution = {
      conflict: conflict,
      resolution: null,
      confidence: 0,
      method: 'unknown'
    };
    
    // Source authority-based resolution
    const sourceAuthority = sources.map(s => getSourceAuthority(s.type));
    const maxAuthority = Math.max(...sourceAuthority);
    const authoritativeSource = sources[sourceAuthority.indexOf(maxAuthority)];
    
    if (maxAuthority > 0.8) {
      resolution.resolution = authoritativeSource.data;
      resolution.confidence = maxAuthority;
      resolution.method = 'source-authority';
    }
    
    // Majority consensus resolution
    else {
      const consensus = findMajorityConsensus(conflict.values);
      if (consensus.support > 0.6) {
        resolution.resolution = consensus.value;
        resolution.confidence = consensus.support;
        resolution.method = 'majority-consensus';
      }
    }
    
    return resolution;
  });
};
```

## Analysis Verification

### Result Verification Pipeline
```javascript
const verifyAnalysisResults = async (analysis, originalData) => {
  const verificationSteps = [
    {
      name: 'logical-consistency',
      validator: validateLogicalConsistency,
      weight: 0.3
    },
    {
      name: 'data-traceability',
      validator: validateDataTraceability,
      weight: 0.25
    },
    {
      name: 'result-completeness',
      validator: validateResultCompleteness,
      weight: 0.25
    },
    {
      name: 'recommendation-validity',
      validator: validateRecommendations,
      weight: 0.2
    }
  ];
  
  const results = {};
  let overallScore = 0;
  
  for (const step of verificationSteps) {
    try {
      const stepResult = await step.validator(analysis, originalData);
      results[step.name] = stepResult;
      overallScore += stepResult.score * step.weight;
    } catch (error) {
      results[step.name] = {
        score: 0,
        status: 'failed',
        error: error.message
      };
    }
  }
  
  return {
    overallScore: Math.round(overallScore * 100) / 100,
    stepResults: results,
    approved: overallScore >= 0.8
  };
};
```

### Recommendation Validation
```javascript
const validateRecommendations = (analysis, originalData) => {
  const recommendations = analysis.recommendations || [];
  const validationResults = {
    score: 0,
    valid: 0,
    invalid: 0,
    issues: []
  };
  
  for (const recommendation of recommendations) {
    const validationChecks = [
      validateRecommendationFeasibility,
      validateRecommendationRelevance,
      validateRecommendationSpecificity,
      validateRecommendationJustification
    ];
    
    let recommendationScore = 0;
    let passedChecks = 0;
    
    for (const check of validationChecks) {
      try {
        const result = check(recommendation, originalData, analysis);
        if (result.passed) {
          passedChecks++;
          recommendationScore += result.score;
        } else {
          validationResults.issues.push({
            recommendation: recommendation.id || recommendation.description,
            check: check.name,
            issue: result.issue
          });
        }
      } catch (error) {
        validationResults.issues.push({
          recommendation: recommendation.id || recommendation.description,
          check: check.name,
          error: error.message
        });
      }
    }
    
    recommendationScore /= validationChecks.length;
    
    if (recommendationScore >= 0.7) {
      validationResults.valid++;
    } else {
      validationResults.invalid++;
    }
  }
  
  validationResults.score = validationResults.valid / recommendations.length;
  
  return validationResults;
};
```

## Error Detection and Reporting

### Anomaly Detection
```javascript
const detectAnomalies = (data, context) => {
  const anomalies = [];
  const detectors = [
    detectOutliers,
    detectInconsistentPatterns,
    detectMissingExpectedData,
    detectUnexpectedValues
  ];
  
  for (const detector of detectors) {
    try {
      const detected = detector(data, context);
      anomalies.push(...detected);
    } catch (error) {
      console.warn(`Anomaly detector ${detector.name} failed:`, error);
    }
  }
  
  return anomalies.sort((a, b) => b.severity - a.severity);
};

const detectOutliers = (data, context) => {
  const outliers = [];
  
  // Credit hours outliers
  if (data.courses) {
    const credits = data.courses.map(c => c.credits).filter(c => c !== undefined);
    const { mean, stdDev } = calculateStats(credits);
    
    data.courses.forEach((course, index) => {
      if (course.credits && Math.abs(course.credits - mean) > 2 * stdDev) {
        outliers.push({
          type: 'outlier',
          category: 'credit-hours',
          element: `courses[${index}]`,
          value: course.credits,
          expected: `${mean} ± ${stdDev}`,
          severity: 0.6
        });
      }
    });
  }
  
  return outliers;
};
```

### Quality Issue Classification
```javascript
const classifyQualityIssues = (issues) => {
  const classification = {
    critical: [],
    major: [],
    minor: [],
    suggestions: []
  };
  
  for (const issue of issues) {
    const severity = calculateIssueSeverity(issue);
    
    if (severity >= 0.8) {
      classification.critical.push(issue);
    } else if (severity >= 0.6) {
      classification.major.push(issue);
    } else if (severity >= 0.3) {
      classification.minor.push(issue);
    } else {
      classification.suggestions.push(issue);
    }
  }
  
  return classification;
};
```

## Configuration

### Environment Variables
```bash
# Quality Thresholds
QUALITY_THRESHOLD=0.8
CONFIDENCE_THRESHOLD=0.85
APPROVE_THRESHOLD=0.8

# Validation Settings
STRICT_VALIDATION=true
CROSS_REFERENCE_REQUIRED=true
ANOMALY_DETECTION=true

# Reporting
DETAILED_REPORTS=true
INCLUDE_RECOMMENDATIONS=true
MAX_ISSUES_PER_REPORT=50
```

### Quality Rules Configuration
```javascript
const qualityConfig = {
  thresholds: {
    completeness: 0.85,
    accuracy: 0.90,
    consistency: 0.80,
    timeliness: 0.70
  },
  
  weights: {
    dataQuality: 0.4,
    analysisQuality: 0.35,
    outputQuality: 0.25
  },
  
  validation: {
    enableStrictMode: true,
    requireCrossReference: true,
    anomalyDetection: true,
    autoApproval: false
  }
};
```

## Monitoring and Metrics

### Quality Metrics
```javascript
const reportQualityMetrics = async (qualityResults) => {
  await cloudWatch.putMetricData({
    Namespace: 'CurriculumAlignment/QualityAssurance',
    MetricData: [
      {
        MetricName: 'OverallQualityScore',
        Value: qualityResults.overallScore,
        Unit: 'Percent',
        Dimensions: [
          { Name: 'DataType', Value: qualityResults.dataType },
          { Name: 'ValidationMode', Value: qualityResults.mode }
        ]
      },
      {
        MetricName: 'IssuesDetected',
        Value: qualityResults.issues.length,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Severity', Value: 'all' }
        ]
      }
    ]
  }).promise();
};
```

## Testing

### Unit Tests
```javascript
describe('QA Agent', () => {
  test('should validate curriculum data correctly', () => {
    const curriculum = {
      program: 'Computer Science',
      university: 'CEU',
      courses: [
        { code: 'CS 101', title: 'Programming', credits: 3 }
      ],
      totalCredits: 120
    };
    
    const result = validateCurriculumData(curriculum);
    
    expect(result.overallQuality.score).toBeGreaterThan(0.8);
    expect(result.validationResults.dataIntegrity.status).toBe('passed');
  });
  
  test('should detect credit inconsistencies', () => {
    const curriculum = {
      courses: [
        { code: 'CS 101', credits: 3 },
        { code: 'CS 201', credits: 4 }
      ],
      totalCredits: 120 // Should be 7
    };
    
    const result = validateCurriculumData(curriculum);
    
    expect(result.validationResults.logicalConsistency.status).toBe('failed');
  });
});
```

### Integration Tests
```javascript
describe('QA Integration', () => {
  test('should validate real analysis results', async () => {
    const analysisResults = await runTestAnalysis();
    
    const validation = await qaAgent.verifyAnalysis({
      analysisResults,
      originalData: testCurriculum
    });
    
    expect(validation.approved).toBe(true);
    expect(validation.verificationResults.accuracy.score).toBeGreaterThan(0.8);
  });
});
```

## Troubleshooting

### Common Issues

1. **Low Quality Scores**
   - Review data completeness
   - Check validation rules configuration
   - Verify source data quality

2. **Inconsistent Validation Results**
   - Update validation rules
   - Check cross-reference sources
   - Review scoring algorithm weights

3. **High False Positive Rate**
   - Adjust anomaly detection thresholds
   - Refine validation rules
   - Improve context awareness

### Debug Commands
```bash
# Test data validation
curl -X POST https://api.example.com/qa-agent/validate-data \
  -H "Content-Type: application/json" \
  -d @test-curriculum.json

# Generate quality report
curl -X GET https://api.example.com/qa-agent/quality-report/curriculum_cs_ceu_2024

# Check quality metrics
aws logs filter-log-events --log-group-name /aws/lambda/qa-agent \
  --filter-pattern "quality"
```