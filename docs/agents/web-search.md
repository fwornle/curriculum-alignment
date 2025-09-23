# Web Search Agent

The Web Search Agent is responsible for gathering external curriculum and program information from universities, accreditation bodies, and educational resources across the web.

## Overview

- **Function Name**: `curriculum-alignment-web-search-{environment}`
- **Runtime**: Node.js 18.x
- **Memory**: 256MB
- **Timeout**: 2 minutes
- **Concurrency**: 20 concurrent executions

## Responsibilities

1. **University Website Search** - Find official curriculum documents
2. **Accreditation Body Search** - Locate relevant standards and requirements
3. **Academic Database Search** - Query educational repositories
4. **Competitive Analysis** - Research similar programs at other institutions
5. **Trend Analysis** - Identify emerging curriculum trends

## API Endpoints

### POST /web-search/search
Performs a comprehensive web search for curriculum-related information.

**Request:**
```json
{
  "searchType": "curriculum",
  "query": {
    "program": "Computer Science",
    "university": "Central European University",
    "degree": "Bachelor",
    "keywords": ["programming", "algorithms", "data structures"]
  },
  "sources": ["university-websites", "accreditation-bodies", "academic-databases"],
  "maxResults": 50,
  "language": "en"
}
```

**Response:**
```json
{
  "searchId": "search_20240101_123456",
  "status": "completed",
  "results": {
    "university-websites": [
      {
        "url": "https://www.ceu.edu/academics/computer-science",
        "title": "Computer Science Program - CEU",
        "relevanceScore": 0.95,
        "lastModified": "2024-01-01",
        "content": {
          "courses": ["CS101", "CS201", "CS301"],
          "credits": 120,
          "duration": "4 years"
        }
      }
    ],
    "accreditation-bodies": [
      {
        "url": "https://www.abet.org/accreditation/accreditation-criteria/",
        "title": "ABET Computer Science Criteria",
        "relevanceScore": 0.88,
        "standard": "ABET-CAC",
        "requirements": ["mathematics", "science", "computing"]
      }
    ]
  },
  "totalResults": 42,
  "searchTime": "12.3s",
  "timestamp": "2024-01-01T12:34:56Z"
}
```

### POST /web-search/targeted-search
Performs targeted search for specific curriculum components.

**Request:**
```json
{
  "target": "course-descriptions",
  "program": "Computer Science",
  "institution": "MIT",
  "filters": {
    "level": "undergraduate",
    "subject": "algorithms",
    "format": "course-catalog"
  }
}
```

**Response:**
```json
{
  "searchId": "targeted_20240101_123456",
  "status": "completed",
  "courses": [
    {
      "code": "6.006",
      "title": "Introduction to Algorithms",
      "credits": 3,
      "description": "Introduction to mathematical analysis of algorithms...",
      "prerequisites": ["6.001", "18.06"],
      "url": "https://catalog.mit.edu/subjects/6/",
      "extractedAt": "2024-01-01T12:34:56Z"
    }
  ],
  "extractionConfidence": 0.92
}
```

### GET /web-search/search/{searchId}/status
Retrieves the status of a search operation.

**Response:**
```json
{
  "searchId": "search_20240101_123456",
  "status": "in-progress",
  "progress": {
    "totalSources": 10,
    "sourcesCompleted": 7,
    "resultsFound": 35,
    "currentSource": "accreditation-bodies"
  },
  "estimatedTimeRemaining": "30s"
}
```

## Search Sources

### University Websites
- Official curriculum pages
- Course catalogs
- Program descriptions
- Faculty pages
- Academic handbooks

### Accreditation Bodies
- ABET (Engineering/Computing)
- AACSB (Business)
- LCME (Medicine)
- Regional accreditors
- International standards

### Academic Databases
- Course catalogs repositories
- Curriculum sharing platforms
- Educational research databases
- Professional society resources

## Search Strategies

### Intelligent Query Building
```javascript
const buildSearchQuery = (params) => {
  const {program, university, degree, keywords} = params;
  
  return [
    `"${program}" curriculum "${university}"`,
    `${degree} ${program} course requirements`,
    `"${program}" syllabus site:${getDomainFromUniversity(university)}`,
    ...keywords.map(k => `${program} ${k} curriculum`)
  ];
};
```

### Content Extraction
```javascript
const extractCurriculumData = (html, url) => {
  const $ = cheerio.load(html);
  
  return {
    courses: extractCourseList($),
    requirements: extractRequirements($),
    credits: extractCreditRequirements($),
    structure: extractProgramStructure($),
    metadata: {
      url,
      lastModified: extractLastModified($),
      language: detectLanguage(html)
    }
  };
};
```

### Relevance Scoring
```javascript
const calculateRelevanceScore = (content, query) => {
  const factors = {
    titleMatch: 0.3,
    keywordDensity: 0.25,
    sourceAuthority: 0.2,
    contentFreshness: 0.15,
    structuralMatch: 0.1
  };
  
  return Object.entries(factors).reduce((score, [factor, weight]) => {
    return score + (evaluateFactor(content, query, factor) * weight);
  }, 0);
};
```

## Rate Limiting and Politeness

### Request Throttling
```javascript
const rateLimiter = {
  'university-websites': {
    requestsPerSecond: 1,
    burstLimit: 5,
    backoffMs: 2000
  },
  'search-engines': {
    requestsPerSecond: 10,
    burstLimit: 50,
    backoffMs: 100
  }
};
```

### Robots.txt Compliance
```javascript
const checkRobotsTxt = async (domain) => {
  try {
    const robotsUrl = `https://${domain}/robots.txt`;
    const response = await fetch(robotsUrl);
    const robotsTxt = await response.text();
    
    return parseRobotsRules(robotsTxt, USER_AGENT);
  } catch (error) {
    // Default to conservative approach
    return { allowed: true, crawlDelay: 1000 };
  }
};
```

## Error Handling

### Network Errors
- **Timeout**: Retry with exponential backoff
- **Rate Limited**: Respect rate limits and retry later
- **DNS Errors**: Skip source and continue with others
- **SSL Errors**: Attempt HTTP fallback if appropriate

### Content Errors
- **Empty Results**: Try alternative search terms
- **Parsing Errors**: Use fallback extraction methods
- **Encoding Issues**: Detect and convert character encoding
- **JavaScript Required**: Use headless browser for dynamic content

### Recovery Strategies
```javascript
const errorHandlers = {
  'RATE_LIMITED': async (error, source) => {
    const retryAfter = error.headers['retry-after'] || 60;
    await delay(retryAfter * 1000);
    return 'retry';
  },
  
  'TIMEOUT': async (error, attempt) => {
    if (attempt < 3) {
      await delay(Math.pow(2, attempt) * 1000);
      return 'retry';
    }
    return 'skip';
  },
  
  'PARSE_ERROR': async (error, content) => {
    // Try alternative parsing methods
    return await tryFallbackExtraction(content);
  }
};
```

## Configuration

### Environment Variables
```bash
# Search Configuration
MAX_SEARCH_RESULTS=100
SEARCH_TIMEOUT_MS=120000
CONCURRENT_SEARCHES=5

# Rate Limiting
DEFAULT_REQUESTS_PER_SECOND=2
MAX_BURST_REQUESTS=10
CRAWL_DELAY_MS=1000

# Content Processing
MAX_CONTENT_SIZE_MB=5
EXTRACT_IMAGES=false
FOLLOW_REDIRECTS=true
```

### Search Engine APIs
```javascript
const searchEngines = {
  google: {
    apiKey: process.env.GOOGLE_SEARCH_API_KEY,
    cx: process.env.GOOGLE_SEARCH_CX,
    endpoint: 'https://www.googleapis.com/customsearch/v1'
  },
  bing: {
    apiKey: process.env.BING_SEARCH_API_KEY,
    endpoint: 'https://api.cognitive.microsoft.com/bing/v7.0/search'
  }
};
```

## Caching Strategy

### Search Result Caching
```javascript
const cacheConfig = {
  searchResults: {
    ttl: 24 * 60 * 60, // 24 hours
    maxSize: 1000,
    key: (query) => `search:${hashQuery(query)}`
  },
  
  extractedContent: {
    ttl: 7 * 24 * 60 * 60, // 7 days
    maxSize: 500,
    key: (url) => `content:${hashUrl(url)}`
  }
};
```

### Cache Invalidation
- **Time-based**: Automatic expiration after TTL
- **Content-based**: Invalidate when source content changes
- **Manual**: Admin-triggered cache clearing

## Monitoring and Metrics

### Key Metrics
- **Search Success Rate**: Percentage of successful searches
- **Average Response Time**: Mean time to complete searches
- **Results Quality Score**: Relevance of returned results
- **Source Coverage**: Number of unique sources accessed
- **Rate Limit Hits**: Frequency of rate limiting

### Performance Monitoring
```javascript
await cloudWatch.putMetricData({
  Namespace: 'CurriculumAlignment/WebSearch',
  MetricData: [
    {
      MetricName: 'SearchLatency',
      Value: searchDuration,
      Unit: 'Milliseconds',
      Dimensions: [
        { Name: 'SearchType', Value: searchType },
        { Name: 'Source', Value: sourceName }
      ]
    }
  ]
}).promise();
```

## Testing

### Unit Tests
```javascript
describe('Web Search Agent', () => {
  test('should build effective search queries', () => {
    const params = {
      program: 'Computer Science',
      university: 'MIT',
      keywords: ['algorithms', 'programming']
    };
    
    const queries = buildSearchQueries(params);
    
    expect(queries).toContain('"Computer Science" curriculum "MIT"');
    expect(queries.length).toBeGreaterThan(0);
  });
  
  test('should extract course information correctly', () => {
    const html = `<h3>CS 101 - Introduction to Programming</h3>
                  <p>Credits: 3</p>`;
    
    const extracted = extractCourseInfo(html);
    
    expect(extracted.code).toBe('CS 101');
    expect(extracted.credits).toBe(3);
  });
});
```

### Integration Tests
```javascript
describe('Search Integration', () => {
  test('should find real curriculum data', async () => {
    const searchRequest = {
      program: 'Computer Science',
      university: 'MIT',
      sources: ['university-websites']
    };
    
    const results = await webSearch.search(searchRequest);
    
    expect(results.totalResults).toBeGreaterThan(0);
    expect(results.results['university-websites']).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

1. **Low Search Results**
   - Check search query effectiveness
   - Verify source accessibility
   - Review rate limiting status

2. **Poor Content Quality**
   - Adjust relevance scoring algorithm
   - Update content extraction rules
   - Filter out low-quality sources

3. **Rate Limiting Errors**
   - Reduce request frequency
   - Implement better backoff strategies
   - Use multiple search engines

### Debug Commands
```bash
# Test search functionality
curl -X POST https://api.example.com/web-search/search \
  -H "Content-Type: application/json" \
  -d '{"program": "Computer Science", "university": "MIT"}'

# Check search status
curl -X GET https://api.example.com/web-search/search/{searchId}/status

# View search metrics
aws logs filter-log-events --log-group-name /aws/lambda/web-search
```