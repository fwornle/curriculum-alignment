# Browser Agent

The Browser Agent performs automated web browsing and data extraction using headless browser technology to navigate complex websites, handle JavaScript-rendered content, and extract structured curriculum data.

## Overview

- **Function Name**: `curriculum-alignment-browser-{environment}`
- **Runtime**: Node.js 18.x
- **Memory**: 1024MB
- **Timeout**: 3 minutes
- **Concurrency**: 10 concurrent executions

## Responsibilities

1. **JavaScript-Heavy Sites** - Navigate sites requiring JavaScript execution
2. **Interactive Content** - Handle forms, dropdowns, and dynamic content
3. **PDF Extraction** - Download and process curriculum PDFs
4. **Screenshot Capture** - Visual documentation of content
5. **Structured Data Extraction** - Extract data from complex page layouts

## API Endpoints

### POST /browser/navigate
Navigates to a webpage and extracts content.

**Request:**
```json
{
  "url": "https://www.university.edu/academics/computer-science",
  "extractionRules": {
    "courses": {
      "selector": ".course-listing .course",
      "fields": {
        "code": ".course-code",
        "title": ".course-title", 
        "credits": ".course-credits",
        "description": ".course-description"
      }
    },
    "requirements": {
      "selector": ".program-requirements ul li",
      "textContent": true
    }
  },
  "options": {
    "waitForSelector": ".course-listing",
    "timeout": 30000,
    "captureScreenshot": true,
    "followRedirects": true
  }
}
```

**Response:**
```json
{
  "navigationId": "nav_20240101_123456",
  "status": "completed",
  "url": "https://www.university.edu/academics/computer-science",
  "data": {
    "courses": [
      {
        "code": "CS 101",
        "title": "Introduction to Programming",
        "credits": "3",
        "description": "Fundamentals of programming using Python..."
      }
    ],
    "requirements": [
      "Complete 120 credit hours",
      "Maintain 2.0 GPA minimum",
      "Complete capstone project"
    ]
  },
  "metadata": {
    "loadTime": 2.3,
    "screenshotUrl": "s3://bucket/screenshots/nav_20240101_123456.png",
    "finalUrl": "https://www.university.edu/academics/computer-science",
    "pageTitle": "Computer Science Program"
  },
  "timestamp": "2024-01-01T12:34:56Z"
}
```

### POST /browser/form-interaction
Interacts with forms to access protected or filtered content.

**Request:**
```json
{
  "url": "https://catalog.university.edu/search",
  "interactions": [
    {
      "type": "select",
      "selector": "#department",
      "value": "Computer Science"
    },
    {
      "type": "select", 
      "selector": "#level",
      "value": "Undergraduate"
    },
    {
      "type": "click",
      "selector": "#search-button"
    },
    {
      "type": "waitFor",
      "selector": ".search-results",
      "timeout": 10000
    }
  ],
  "extractAfter": {
    "courses": {
      "selector": ".search-results .course-item",
      "fields": {
        "code": ".course-code",
        "title": ".course-title"
      }
    }
  }
}
```

**Response:**
```json
{
  "interactionId": "int_20240101_123456",
  "status": "completed",
  "interactions": [
    {
      "step": 1,
      "action": "select #department",
      "status": "success"
    },
    {
      "step": 2, 
      "action": "select #level",
      "status": "success"
    },
    {
      "step": 3,
      "action": "click #search-button", 
      "status": "success"
    }
  ],
  "extractedData": {
    "courses": [
      {
        "code": "CS 101",
        "title": "Intro to Programming"
      }
    ]
  }
}
```

### POST /browser/pdf-download
Downloads and extracts content from PDF documents.

**Request:**
```json
{
  "url": "https://university.edu/catalog/CS-curriculum.pdf",
  "extractionType": "curriculum",
  "options": {
    "maxPages": 50,
    "ocrEnabled": true,
    "extractTables": true,
    "language": "en"
  }
}
```

**Response:**
```json
{
  "downloadId": "pdf_20240101_123456",
  "status": "completed",
  "metadata": {
    "filename": "CS-curriculum.pdf",
    "size": "2.4MB",
    "pages": 45,
    "downloadUrl": "s3://bucket/pdfs/pdf_20240101_123456.pdf"
  },
  "extractedContent": {
    "text": "Computer Science Curriculum\n\nCore Requirements:\n...",
    "tables": [
      {
        "page": 3,
        "headers": ["Course", "Credits", "Prerequisites"],
        "rows": [
          ["CS 101", "3", "None"],
          ["CS 201", "4", "CS 101"]
        ]
      }
    ],
    "courses": [
      {
        "code": "CS 101",
        "title": "Introduction to Programming",
        "credits": 3,
        "page": 5
      }
    ]
  }
}
```

## Browser Management

### Headless Browser Configuration
```javascript
const browserConfig = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
  ],
  defaultViewport: {
    width: 1280,
    height: 720
  },
  timeout: 30000
};
```

### Page Interaction Strategies
```javascript
const interactionStrategies = {
  async waitForContent(page, selector, timeout = 10000) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      return false;
    }
  },

  async extractWithRetry(page, selector, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          return await this.extractElements(page, elements);
        }
        await page.waitForTimeout(1000);
      } catch (error) {
        if (i === maxRetries - 1) throw error;
      }
    }
    return [];
  }
};
```

### Dynamic Content Handling
```javascript
const handleDynamicContent = async (page, options) => {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');
  
  // Handle infinite scroll
  if (options.infiniteScroll) {
    await autoScroll(page);
  }
  
  // Handle lazy loading
  if (options.lazyLoad) {
    await triggerLazyLoad(page);
  }
  
  // Wait for specific content
  if (options.waitForSelector) {
    await page.waitForSelector(options.waitForSelector);
  }
};
```

## Content Extraction

### Structured Data Extraction
```javascript
const extractStructuredData = async (page, rules) => {
  const results = {};
  
  for (const [key, rule] of Object.entries(rules)) {
    try {
      if (rule.fields) {
        // Complex extraction with multiple fields
        results[key] = await page.evaluate((selector, fields) => {
          const elements = document.querySelectorAll(selector);
          return Array.from(elements).map(el => {
            const item = {};
            for (const [fieldKey, fieldSelector] of Object.entries(fields)) {
              const fieldEl = el.querySelector(fieldSelector);
              item[fieldKey] = fieldEl ? fieldEl.textContent.trim() : null;
            }
            return item;
          });
        }, rule.selector, rule.fields);
      } else if (rule.textContent) {
        // Simple text extraction
        results[key] = await page.evaluate((selector) => {
          const elements = document.querySelectorAll(selector);
          return Array.from(elements).map(el => el.textContent.trim());
        }, rule.selector);
      }
    } catch (error) {
      console.error(`Extraction failed for ${key}:`, error);
      results[key] = [];
    }
  }
  
  return results;
};
```

### PDF Processing
```javascript
const processPDF = async (pdfBuffer, options) => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const numPages = pdfDoc.getPageCount();
  
  const results = {
    text: '',
    tables: [],
    metadata: {
      pages: numPages,
      title: pdfDoc.getTitle(),
      author: pdfDoc.getAuthor()
    }
  };
  
  for (let i = 0; i < Math.min(numPages, options.maxPages || 50); i++) {
    const page = pdfDoc.getPage(i);
    
    // Extract text
    const textContent = await page.getTextContent();
    results.text += textContent.items.map(item => item.str).join(' ');
    
    // Extract tables if requested
    if (options.extractTables) {
      const tables = await extractTablesFromPage(page);
      results.tables.push(...tables.map(table => ({ ...table, page: i + 1 })));
    }
  }
  
  return results;
};
```

## Error Handling

### Navigation Errors
```javascript
const navigationErrorHandlers = {
  async handleTimeout(page, url) {
    console.warn(`Navigation timeout for ${url}`);
    // Try to capture what loaded
    const content = await page.content();
    if (content.length > 1000) {
      return { partial: true, content };
    }
    throw new Error('Page failed to load');
  },

  async handleNetworkError(error, url) {
    if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      throw new Error(`Domain not found: ${url}`);
    }
    if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      throw new Error(`Connection refused: ${url}`);
    }
    throw error;
  },

  async handleJavaScriptError(page, error) {
    console.warn('JavaScript error on page:', error);
    // Continue with extraction, might still get some content
    return { jsErrors: true, error: error.message };
  }
};
```

### Content Extraction Errors
```javascript
const extractionErrorHandlers = {
  async handleMissingSelector(page, selector) {
    // Try alternative selectors
    const alternatives = generateAlternativeSelectors(selector);
    
    for (const altSelector of alternatives) {
      try {
        const elements = await page.$$(altSelector);
        if (elements.length > 0) {
          return { selector: altSelector, elements };
        }
      } catch (error) {
        continue;
      }
    }
    
    return { error: 'No matching elements found' };
  },

  async handleParsingError(content, error) {
    // Try to extract what we can
    const fallbackExtraction = await performFallbackExtraction(content);
    return {
      warning: 'Partial extraction due to parsing error',
      data: fallbackExtraction,
      error: error.message
    };
  }
};
```

## Performance Optimization

### Resource Management
```javascript
const optimizeBrowser = async (page) => {
  // Block unnecessary resources
  await page.setRequestInterception(true);
  
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    
    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });
  
  // Disable JavaScript if not needed
  if (!requiresJavaScript) {
    await page.setJavaScriptEnabled(false);
  }
};
```

### Memory Management
```javascript
const browserPool = {
  browsers: [],
  maxInstances: 3,
  
  async getBrowser() {
    if (this.browsers.length < this.maxInstances) {
      const browser = await puppeteer.launch(browserConfig);
      this.browsers.push(browser);
      return browser;
    }
    
    // Return least recently used browser
    return this.browsers.shift();
  },
  
  async releaseBrowser(browser) {
    // Close all pages except one
    const pages = await browser.pages();
    await Promise.all(pages.slice(1).map(page => page.close()));
    
    this.browsers.push(browser);
  }
};
```

## Configuration

### Environment Variables
```bash
# Browser Configuration
BROWSER_TIMEOUT_MS=180000
MAX_BROWSER_INSTANCES=3
BROWSER_MEMORY_LIMIT=1024

# Content Processing
MAX_PAGE_SIZE_MB=10
SCREENSHOT_QUALITY=80
PDF_MAX_PAGES=100

# Performance
DISABLE_IMAGES=true
DISABLE_CSS=true
ENABLE_JAVASCRIPT=true
```

### Extraction Rules
```javascript
const defaultExtractionRules = {
  courses: {
    selectors: [
      '.course-list .course',
      '.curriculum-table tbody tr',
      '[data-course-code]'
    ],
    fields: {
      code: ['.course-code', '[data-course-code]', 'td:first-child'],
      title: ['.course-title', '.course-name', 'td:nth-child(2)'],
      credits: ['.credits', '.course-credits', 'td:last-child']
    }
  },
  
  requirements: {
    selectors: [
      '.requirements ul li',
      '.program-requirements p',
      '.degree-requirements .requirement'
    ]
  }
};
```

## Monitoring and Metrics

### Performance Metrics
```javascript
const metrics = {
  navigationTime: 0,
  extractionTime: 0,
  memoryUsage: 0,
  pagesProcessed: 0,
  errorsEncountered: 0
};

await cloudWatch.putMetricData({
  Namespace: 'CurriculumAlignment/Browser',
  MetricData: [
    {
      MetricName: 'PageLoadTime',
      Value: navigationTime,
      Unit: 'Milliseconds'
    },
    {
      MetricName: 'MemoryUsage',
      Value: memoryUsage,
      Unit: 'Bytes'
    }
  ]
}).promise();
```

## Testing

### Unit Tests
```javascript
describe('Browser Agent', () => {
  test('should extract course data correctly', async () => {
    const mockPage = {
      evaluate: jest.fn().mockResolvedValue([
        { code: 'CS 101', title: 'Intro Programming', credits: '3' }
      ])
    };
    
    const rules = {
      courses: {
        selector: '.course',
        fields: { code: '.code', title: '.title', credits: '.credits' }
      }
    };
    
    const result = await extractStructuredData(mockPage, rules);
    
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].code).toBe('CS 101');
  });
});
```

### Integration Tests
```javascript
describe('Browser Navigation', () => {
  test('should handle real university website', async () => {
    const request = {
      url: 'https://catalog.mit.edu/degree-charts/computer-science-engineering-course-6-3/',
      extractionRules: {
        courses: {
          selector: '.courseblock',
          fields: {
            code: '.coursecode',
            title: '.coursename'
          }
        }
      }
    };
    
    const result = await browserAgent.navigate(request);
    
    expect(result.status).toBe('completed');
    expect(result.data.courses.length).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Common Issues

1. **Browser Crashes**
   - Increase memory allocation
   - Reduce concurrent instances
   - Check for memory leaks

2. **Navigation Timeouts**
   - Increase timeout values
   - Check network connectivity
   - Verify URL accessibility

3. **Extraction Failures**
   - Update extraction selectors
   - Handle dynamic content loading
   - Implement fallback strategies

### Debug Commands
```bash
# Test browser functionality
curl -X POST https://api.example.com/browser/navigate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "extractionRules": {...}}'

# Check browser metrics
aws logs filter-log-events --log-group-name /aws/lambda/browser \
  --filter-pattern "Memory"

# Download screenshots for debugging
aws s3 cp s3://bucket/screenshots/ ./debug/ --recursive
```