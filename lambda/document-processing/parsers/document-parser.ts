export interface DocumentParser {
  parse(buffer: Buffer, options: ParseOptions): Promise<ProcessedDocument>;
  extractSpecific(buffer: Buffer, options: ExtractionOptions): Promise<any>;
  validate(buffer: Buffer): Promise<void>;
  healthCheck(): Promise<void>;
}

export interface ParseOptions {
  extractionOptions: ExtractionOptions;
  validationRules: ValidationRules;
}

export interface ExtractionOptions {
  tables?: boolean;
  text?: boolean;
  metadata?: boolean;
  images?: boolean;
  formulas?: boolean;
  styles?: boolean;
  annotations?: boolean;
  forms?: boolean;
}

export interface ValidationRules {
  requiredFields?: string[];
  formatValidation?: boolean;
  sizeLimit?: number;
  contentValidation?: boolean;
}

export interface ProcessedDocument {
  content: {
    text?: string;
    tables?: Table[];
    images?: Image[];
    metadata?: DocumentMetadata;
    formulas?: Formula[];
    styles?: Style[];
    annotations?: Annotation[];
    forms?: FormField[];
  };
  structure: {
    pages?: Page[];
    sections?: Section[];
    headers?: string[];
    outline?: OutlineItem[];
  };
  analysis: {
    language?: string;
    topics?: string[];
    entities?: Entity[];
    confidence: number;
    wordCount?: number;
    pageCount?: number;
  };
}

export interface Table {
  id: string;
  headers?: string[];
  rows: string[][];
  position?: {
    page?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  formatting?: {
    borders?: boolean;
    alignment?: string[];
    styles?: any;
  };
}

export interface Image {
  id: string;
  type: string;
  data?: Buffer;
  url?: string;
  position?: {
    page?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  alt?: string;
  caption?: string;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pages?: number;
  words?: number;
  characters?: number;
  version?: string;
  security?: {
    encrypted?: boolean;
    permissions?: string[];
  };
}

export interface Formula {
  id: string;
  formula: string;
  result?: string;
  cell?: string;
  sheet?: string;
}

export interface Style {
  id: string;
  name?: string;
  font?: {
    family?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
  };
  paragraph?: {
    alignment?: string;
    indent?: number;
    spacing?: number;
  };
}

export interface Annotation {
  id: string;
  type: 'comment' | 'highlight' | 'note' | 'link';
  content: string;
  author?: string;
  date?: Date;
  position?: {
    page?: number;
    x?: number;
    y?: number;
  };
}

export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature';
  value?: string;
  required?: boolean;
  options?: string[];
}

export interface Page {
  number: number;
  text?: string;
  images?: Image[];
  tables?: Table[];
  width?: number;
  height?: number;
}

export interface Section {
  title: string;
  level: number;
  content: string;
  subsections?: Section[];
  page?: number;
}

export interface OutlineItem {
  title: string;
  level: number;
  page?: number;
  children?: OutlineItem[];
}

export interface Entity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'course' | 'university' | 'program';
  confidence: number;
  position?: {
    start: number;
    end: number;
  };
}

export abstract class BaseDocumentParser implements DocumentParser {
  abstract parse(buffer: Buffer, options: ParseOptions): Promise<ProcessedDocument>;
  
  abstract extractSpecific(buffer: Buffer, options: ExtractionOptions): Promise<any>;
  
  abstract validate(buffer: Buffer): Promise<void>;
  
  async healthCheck(): Promise<void> {
    // Basic health check - can be overridden by specific parsers
    try {
      // Test with minimal buffer
      const testBuffer = Buffer.alloc(0);
      await this.validate(testBuffer);
    } catch (error) {
      // Expected to fail with empty buffer, but should not crash
      if (error instanceof Error && error.message.includes('crash')) {
        throw error;
      }
    }
  }

  protected analyzeContent(content: any): {
    language?: string;
    topics?: string[];
    entities?: Entity[];
    confidence: number;
  } {
    // Basic content analysis - can be enhanced with NLP services
    const text = this.extractTextContent(content);
    
    return {
      language: this.detectLanguage(text),
      topics: this.extractTopics(text),
      entities: this.extractEntities(text),
      confidence: this.calculateConfidence(content)
    };
  }

  protected extractTextContent(content: any): string {
    let text = '';
    
    if (content.text) {
      text += content.text + ' ';
    }
    
    if (content.tables) {
      for (const table of content.tables) {
        if (table.headers) {
          text += table.headers.join(' ') + ' ';
        }
        for (const row of table.rows) {
          text += row.join(' ') + ' ';
        }
      }
    }
    
    return text.trim();
  }

  protected detectLanguage(text: string): string {
    // Simple language detection based on common words
    // In production, use a proper language detection library
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase().split(/\s+/);
    
    const englishCount = words.filter(word => englishWords.includes(word)).length;
    const englishRatio = englishCount / Math.max(words.length, 1);
    
    return englishRatio > 0.1 ? 'en' : 'unknown';
  }

  protected extractTopics(text: string): string[] {
    // Simple topic extraction based on keywords
    const topics = [];
    const lowercaseText = text.toLowerCase();
    
    const topicKeywords = {
      'curriculum': ['curriculum', 'course', 'syllabus', 'program', 'study'],
      'education': ['education', 'learning', 'teaching', 'academic', 'university'],
      'assessment': ['assessment', 'exam', 'test', 'evaluation', 'grade'],
      'research': ['research', 'thesis', 'dissertation', 'study', 'analysis']
    };
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowercaseText.includes(keyword))) {
        topics.push(topic);
      }
    }
    
    return topics;
  }

  protected extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];
    
    // Simple entity extraction patterns
    const patterns = [
      {
        type: 'university' as const,
        regex: /\b([A-Z][a-z]+ University|University of [A-Z][a-z]+)\b/g
      },
      {
        type: 'course' as const,
        regex: /\b([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\b/g
      },
      {
        type: 'date' as const,
        regex: /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/g
      }
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        entities.push({
          text: match[1],
          type: pattern.type,
          confidence: 0.8,
          position: {
            start: match.index,
            end: match.index + match[1].length
          }
        });
      }
    }
    
    return entities;
  }

  protected calculateConfidence(content: any): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on extracted content
    if (content.text && content.text.length > 100) {
      confidence += 0.2;
    }
    
    if (content.tables && content.tables.length > 0) {
      confidence += 0.15;
    }
    
    if (content.metadata && Object.keys(content.metadata).length > 3) {
      confidence += 0.1;
    }
    
    if (content.images && content.images.length > 0) {
      confidence += 0.05;
    }
    
    return Math.min(confidence, 1.0);
  }

  protected createTable(data: any[][], headers?: string[]): Table {
    return {
      id: `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      headers,
      rows: data,
      formatting: {
        borders: true,
        alignment: headers ? headers.map(() => 'left') : []
      }
    };
  }

  protected createImage(data: Buffer, type: string, position?: any): Image {
    return {
      id: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      position
    };
  }

  protected sanitizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\u00A0-\u017F\u0100-\u024F]/g, '')
      .trim();
  }

  protected parseMetadata(rawMetadata: any): DocumentMetadata {
    return {
      title: rawMetadata.title || rawMetadata.Title,
      author: rawMetadata.author || rawMetadata.Author || rawMetadata.creator,
      subject: rawMetadata.subject || rawMetadata.Subject,
      keywords: this.parseKeywords(rawMetadata.keywords || rawMetadata.Keywords),
      creator: rawMetadata.creator || rawMetadata.Creator,
      producer: rawMetadata.producer || rawMetadata.Producer,
      creationDate: this.parseDate(rawMetadata.creationDate || rawMetadata.CreationDate),
      modificationDate: this.parseDate(rawMetadata.modificationDate || rawMetadata.ModDate),
      pages: parseInt(rawMetadata.pages || rawMetadata.Pages) || undefined,
      words: parseInt(rawMetadata.words || rawMetadata.Words) || undefined,
      characters: parseInt(rawMetadata.characters || rawMetadata.Characters) || undefined,
      version: rawMetadata.version || rawMetadata.Version
    };
  }

  private parseKeywords(keywords: any): string[] {
    if (!keywords) return [];
    if (Array.isArray(keywords)) return keywords;
    if (typeof keywords === 'string') {
      return keywords.split(/[,;]/).map(k => k.trim()).filter(k => k.length > 0);
    }
    return [];
  }

  private parseDate(date: any): Date | undefined {
    if (!date) return undefined;
    if (date instanceof Date) return date;
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
  }
}