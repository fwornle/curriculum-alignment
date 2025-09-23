import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../src/services/logging.service';
import { errorHandler } from '../../src/utils/error-handler';
import { costTracker } from '../../src/services/cost-tracking.service';
import { storageService } from '../../src/services/storage.service';
import { DocumentParser } from './parsers/document-parser';
import { ExcelParser } from './parsers/excel-parser';
import { WordParser } from './parsers/word-parser';
import { PDFParser } from './parsers/pdf-parser';

interface DocumentRequest {
  documentUrl: string;
  documentType: 'excel' | 'word' | 'pdf' | 'auto';
  extractionOptions?: {
    tables?: boolean;
    text?: boolean;
    metadata?: boolean;
    images?: boolean;
  };
  validationRules?: {
    requiredFields?: string[];
    formatValidation?: boolean;
    sizeLimit?: number;
  };
  outputFormat?: 'json' | 'structured' | 'markdown';
}

interface DocumentResponse {
  success: boolean;
  requestId: string;
  data?: {
    content: any;
    metadata: {
      documentType: string;
      pageCount?: number;
      wordCount?: number;
      tableCount?: number;
      extractedAt: string;
      fileSize: number;
      format: string;
    };
    validation: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
    processingTime: number;
    costs: {
      storage: number;
      processing: number;
      total: number;
    };
  };
  error?: string;
  details?: any;
}

interface ProcessedDocument {
  content: {
    text?: string;
    tables?: any[];
    images?: any[];
    metadata?: any;
  };
  structure: {
    pages?: any[];
    sections?: any[];
    headers?: string[];
  };
  analysis: {
    language?: string;
    topics?: string[];
    entities?: any[];
    confidence: number;
  };
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  logger.info('Document Processing Agent request received', {
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
    
    let response: DocumentResponse;

    switch (method) {
      case 'POST':
        if (pathSegments.includes('process')) {
          const requestBody = JSON.parse(event.body || '{}') as DocumentRequest;
          response = await handleProcessDocument(requestBody, event, requestId);
        } else if (pathSegments.includes('validate')) {
          const requestBody = JSON.parse(event.body || '{}');
          response = await handleValidateDocument(requestBody, requestId);
        } else if (pathSegments.includes('extract')) {
          const requestBody = JSON.parse(event.body || '{}');
          response = await handleExtractContent(requestBody, requestId);
        } else {
          throw new Error(`Unsupported operation: ${event.path}`);
        }
        break;

      case 'GET':
        if (pathSegments.includes('health')) {
          response = await handleHealthCheck(requestId);
        } else if (pathSegments.includes('status')) {
          const documentId = pathSegments[pathSegments.indexOf('status') + 1];
          response = await handleGetStatus(documentId, requestId);
        } else if (pathSegments.includes('formats')) {
          response = await handleGetSupportedFormats(requestId);
        } else {
          throw new Error(`Unsupported operation: ${event.path}`);
        }
        break;

      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    const processingTime = Date.now() - startTime;
    
    logger.info('Document Processing Agent request completed', {
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
    
    logger.error('Document Processing Agent error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime
    });

    await costTracker.trackCost('document-processing', 'error', 0.001, {
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

async function handleProcessDocument(
  request: DocumentRequest,
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<DocumentResponse> {
  const startTime = Date.now();

  try {
    logger.info('Processing document', {
      requestId,
      documentUrl: request.documentUrl,
      documentType: request.documentType
    });

    // Download document from URL or S3
    const documentBuffer = await errorHandler.execute(
      () => storageService.downloadFile(request.documentUrl),
      { operationName: 'download_document', correlationId: requestId }
    );

    // Detect document type if auto
    let documentType = request.documentType;
    if (documentType === 'auto') {
      documentType = await detectDocumentType(documentBuffer, request.documentUrl);
    }

    // Select appropriate parser
    const parser = createParser(documentType);
    
    // Process document with validation
    const processedDocument = await errorHandler.execute(
      () => parser.parse(documentBuffer, {
        extractionOptions: request.extractionOptions || {},
        validationRules: request.validationRules || {}
      }),
      { operationName: 'parse_document', correlationId: requestId }
    );

    // Validate processed content
    const validation = await validateProcessedDocument(
      processedDocument,
      request.validationRules || {}
    );

    // Format output
    const formattedContent = await formatOutput(
      processedDocument,
      request.outputFormat || 'json'
    );

    const processingTime = Date.now() - startTime;
    
    // Track costs
    const costs = await costTracker.trackCost('document-processing', 'process', 0.01, {
      requestId,
      documentType,
      processingTime,
      fileSize: documentBuffer.length
    });

    logger.info('Document processed successfully', {
      requestId,
      documentType,
      processingTime,
      contentLength: JSON.stringify(formattedContent).length
    });

    return {
      success: true,
      requestId,
      data: {
        content: formattedContent,
        metadata: {
          documentType,
          pageCount: processedDocument.structure.pages?.length,
          wordCount: countWords(processedDocument.content.text || ''),
          tableCount: processedDocument.content.tables?.length || 0,
          extractedAt: new Date().toISOString(),
          fileSize: documentBuffer.length,
          format: request.outputFormat || 'json'
        },
        validation,
        processingTime,
        costs: {
          storage: costs.details?.storage || 0,
          processing: costs.amount,
          total: costs.amount + (costs.details?.storage || 0)
        }
      }
    };

  } catch (error) {
    logger.error('Document processing failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Document processing failed',
      details: error instanceof Error ? error.stack : undefined
    };
  }
}

async function handleValidateDocument(
  request: any,
  requestId: string
): Promise<DocumentResponse> {
  try {
    logger.info('Validating document', { requestId });

    // Download document
    const documentBuffer = await storageService.downloadFile(request.documentUrl);
    
    // Detect document type
    const documentType = await detectDocumentType(documentBuffer, request.documentUrl);
    
    // Basic validation
    const validation = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    // Check file size
    if (request.validationRules?.sizeLimit && documentBuffer.length > request.validationRules.sizeLimit) {
      validation.errors.push(`File size ${documentBuffer.length} exceeds limit ${request.validationRules.sizeLimit}`);
      validation.isValid = false;
    }

    // Check format
    if (request.validationRules?.formatValidation) {
      const isValidFormat = await validateDocumentFormat(documentBuffer, documentType);
      if (!isValidFormat) {
        validation.errors.push(`Invalid ${documentType} format`);
        validation.isValid = false;
      }
    }

    return {
      success: true,
      requestId,
      data: {
        content: { validation: documentType },
        metadata: {
          documentType,
          extractedAt: new Date().toISOString(),
          fileSize: documentBuffer.length,
          format: 'validation'
        },
        validation,
        processingTime: 0,
        costs: {
          storage: 0,
          processing: 0.001,
          total: 0.001
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Document validation failed'
    };
  }
}

async function handleExtractContent(
  request: any,
  requestId: string
): Promise<DocumentResponse> {
  try {
    logger.info('Extracting content from document', { requestId });

    // Download document
    const documentBuffer = await storageService.downloadFile(request.documentUrl);
    
    // Detect document type
    const documentType = await detectDocumentType(documentBuffer, request.documentUrl);
    
    // Create parser and extract specific content
    const parser = createParser(documentType);
    const extractedContent = await parser.extractSpecific(documentBuffer, request.extractionOptions || {});

    return {
      success: true,
      requestId,
      data: {
        content: extractedContent,
        metadata: {
          documentType,
          extractedAt: new Date().toISOString(),
          fileSize: documentBuffer.length,
          format: 'extracted'
        },
        validation: {
          isValid: true,
          errors: [],
          warnings: []
        },
        processingTime: 0,
        costs: {
          storage: 0,
          processing: 0.005,
          total: 0.005
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      requestId,
      error: error instanceof Error ? error.message : 'Content extraction failed'
    };
  }
}

async function handleHealthCheck(requestId: string): Promise<DocumentResponse> {
  try {
    // Test parser availability
    const parsers = {
      excel: new ExcelParser(),
      word: new WordParser(),
      pdf: new PDFParser()
    };

    const health = {
      status: 'healthy',
      parsers: {} as any,
      timestamp: new Date().toISOString()
    };

    // Test each parser
    for (const [type, parser] of Object.entries(parsers)) {
      try {
        await parser.healthCheck();
        health.parsers[type] = 'healthy';
      } catch (error) {
        health.parsers[type] = 'unhealthy';
        health.status = 'degraded';
      }
    }

    return {
      success: true,
      requestId,
      data: {
        content: health,
        metadata: {
          documentType: 'health',
          extractedAt: new Date().toISOString(),
          fileSize: 0,
          format: 'json'
        },
        validation: {
          isValid: true,
          errors: [],
          warnings: []
        },
        processingTime: 0,
        costs: {
          storage: 0,
          processing: 0,
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

async function handleGetStatus(
  documentId: string,
  requestId: string
): Promise<DocumentResponse> {
  // Mock implementation - would query database for processing status
  return {
    success: true,
    requestId,
    data: {
      content: {
        documentId,
        status: 'completed',
        progress: 100
      },
      metadata: {
        documentType: 'status',
        extractedAt: new Date().toISOString(),
        fileSize: 0,
        format: 'json'
      },
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      },
      processingTime: 0,
      costs: {
        storage: 0,
        processing: 0,
        total: 0
      }
    }
  };
}

async function handleGetSupportedFormats(requestId: string): Promise<DocumentResponse> {
  const supportedFormats = {
    formats: [
      {
        type: 'excel',
        extensions: ['.xlsx', '.xls', '.csv'],
        mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'],
        capabilities: ['tables', 'text', 'metadata', 'formulas', 'charts']
      },
      {
        type: 'word',
        extensions: ['.docx', '.doc'],
        mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
        capabilities: ['text', 'tables', 'images', 'metadata', 'styles']
      },
      {
        type: 'pdf',
        extensions: ['.pdf'],
        mimeTypes: ['application/pdf'],
        capabilities: ['text', 'images', 'metadata', 'forms', 'annotations']
      }
    ]
  };

  return {
    success: true,
    requestId,
    data: {
      content: supportedFormats,
      metadata: {
        documentType: 'formats',
        extractedAt: new Date().toISOString(),
        fileSize: 0,
        format: 'json'
      },
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      },
      processingTime: 0,
      costs: {
        storage: 0,
        processing: 0,
        total: 0
      }
    }
  };
}

function createParser(documentType: string): DocumentParser {
  switch (documentType) {
    case 'excel':
      return new ExcelParser();
    case 'word':
      return new WordParser();
    case 'pdf':
      return new PDFParser();
    default:
      throw new Error(`Unsupported document type: ${documentType}`);
  }
}

async function detectDocumentType(buffer: Buffer, url: string): Promise<'excel' | 'word' | 'pdf'> {
  // Check file extension first
  const extension = url.split('.').pop()?.toLowerCase();
  
  if (extension && ['xlsx', 'xls', 'csv'].includes(extension)) {
    return 'excel';
  }
  
  if (extension && ['docx', 'doc'].includes(extension)) {
    return 'word';
  }
  
  if (extension && extension === 'pdf') {
    return 'pdf';
  }

  // Check magic bytes
  const magicBytes = buffer.slice(0, 8);
  
  // PDF magic bytes
  if (magicBytes.indexOf(Buffer.from('PDF')) === 1) {
    return 'pdf';
  }
  
  // ZIP-based formats (docx, xlsx)
  if (magicBytes[0] === 0x50 && magicBytes[1] === 0x4B) {
    // Try to determine if it's Word or Excel by checking internal structure
    // This is a simplified check - in practice you'd examine the ZIP contents
    return 'word'; // Default to word for ZIP files
  }
  
  // Old Office formats
  if (magicBytes[0] === 0xD0 && magicBytes[1] === 0xCF) {
    return 'excel'; // Default to excel for old Office files
  }

  throw new Error('Unable to detect document type');
}

async function validateProcessedDocument(
  document: ProcessedDocument,
  rules: any
): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
  const validation = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[]
  };

  // Check required fields
  if (rules.requiredFields) {
    for (const field of rules.requiredFields) {
      if (!document.content[field]) {
        validation.errors.push(`Required field missing: ${field}`);
        validation.isValid = false;
      }
    }
  }

  // Check content quality
  if (document.analysis.confidence < 0.7) {
    validation.warnings.push('Low confidence in content extraction');
  }

  return validation;
}

async function validateDocumentFormat(buffer: Buffer, documentType: string): Promise<boolean> {
  try {
    const parser = createParser(documentType);
    await parser.validate(buffer);
    return true;
  } catch (error) {
    return false;
  }
}

async function formatOutput(document: ProcessedDocument, format: string): Promise<any> {
  switch (format) {
    case 'json':
      return document;
    
    case 'structured':
      return {
        text: document.content.text,
        tables: document.content.tables,
        metadata: document.content.metadata,
        structure: document.structure
      };
    
    case 'markdown':
      let markdown = '';
      if (document.content.text) {
        markdown += document.content.text + '\n\n';
      }
      if (document.content.tables) {
        for (const table of document.content.tables) {
          markdown += convertTableToMarkdown(table) + '\n\n';
        }
      }
      return { markdown };
    
    default:
      return document;
  }
}

function convertTableToMarkdown(table: any): string {
  if (!table.rows || table.rows.length === 0) return '';
  
  let markdown = '';
  
  // Header row
  if (table.headers) {
    markdown += '| ' + table.headers.join(' | ') + ' |\n';
    markdown += '| ' + table.headers.map(() => '---').join(' | ') + ' |\n';
  }
  
  // Data rows
  for (const row of table.rows) {
    markdown += '| ' + row.join(' | ') + ' |\n';
  }
  
  return markdown;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}