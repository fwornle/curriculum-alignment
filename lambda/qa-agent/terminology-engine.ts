import { llmService } from '../../src/services/llm-config.service';
import { logger } from '../../src/services/logging.service';

export interface TerminologyResult {
  issues: TerminologyIssue[];
  corrections: TerminologyCorrection[];
  report: TerminologyReport;
}

export interface TerminologyIssue {
  id: string;
  type: 'terminology' | 'consistency' | 'style';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  location: {
    section?: string;
    line?: number;
    column?: number;
    context?: string;
  };
  suggestion: string;
  confidence: number;
  rule?: string;
  examples?: string[];
}

export interface TerminologyCorrection {
  id: string;
  type: 'replacement' | 'insertion' | 'deletion' | 'restructure';
  original: string;
  corrected: string;
  reason: string;
  confidence: number;
  location: {
    start: number;
    end: number;
    section?: string;
  };
  automatic: boolean;
}

export interface TerminologyReport {
  standardTerms: number;
  nonStandardTerms: number;
  inconsistencies: TerminologyInconsistency[];
  suggestions: TerminologySuggestion[];
  coverage: number;
  compliance: number;
}

export interface TerminologyInconsistency {
  term: string;
  variants: string[];
  standardForm: string;
  occurrences: number;
  severity: 'low' | 'medium' | 'high';
}

export interface TerminologySuggestion {
  term: string;
  suggestion: string;
  reason: string;
  confidence: number;
  domain: string;
}

export interface TerminologyDictionary {
  id: string;
  name: string;
  domain: string;
  terms: TerminologyEntry[];
  aliases: Map<string, string>;
  rules: TerminologyRule[];
}

export interface TerminologyEntry {
  term: string;
  definition: string;
  domain: string;
  aliases: string[];
  deprecated?: boolean;
  preferred?: string;
  category: string;
  examples?: string[];
}

export interface TerminologyRule {
  id: string;
  pattern: string;
  replacement: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  examples: { wrong: string; correct: string }[];
}

export class TerminologyEngine {
  private dictionary: TerminologyDictionary;
  private modelConfig: any;
  private customRules: TerminologyRule[];

  constructor(dictionaryId?: string, modelConfig?: any) {
    this.dictionary = this.loadDictionary(dictionaryId || 'academic_cs');
    this.modelConfig = modelConfig || {
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229',
      temperature: 0.2,
      maxTokens: 2000
    };
    this.customRules = [];
  }

  async analyzeTerminology(content: string): Promise<TerminologyReport> {
    try {
      logger.info('Analyzing terminology', { contentLength: content.length });

      // Extract terms from content
      const extractedTerms = this.extractTerms(content);
      
      // Check against dictionary
      const standardTerms = this.checkStandardTerms(extractedTerms);
      const nonStandardTerms = extractedTerms.length - standardTerms.length;
      
      // Find inconsistencies
      const inconsistencies = this.findInconsistencies(content, extractedTerms);
      
      // Generate suggestions
      const suggestions = await this.generateSuggestions(extractedTerms, content);
      
      // Calculate coverage and compliance
      const coverage = this.calculateCoverage(extractedTerms);
      const compliance = this.calculateCompliance(standardTerms.length, extractedTerms.length);

      return {
        standardTerms: standardTerms.length,
        nonStandardTerms,
        inconsistencies,
        suggestions,
        coverage,
        compliance
      };

    } catch (error) {
      logger.error('Terminology analysis failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        standardTerms: 0,
        nonStandardTerms: 0,
        inconsistencies: [],
        suggestions: [],
        coverage: 0,
        compliance: 0
      };
    }
  }

  async checkTerminology(content: string): Promise<TerminologyResult> {
    try {
      const issues: TerminologyIssue[] = [];
      const corrections: TerminologyCorrection[] = [];

      // Apply built-in rules
      const builtInResults = this.applyBuiltInRules(content);
      issues.push(...builtInResults.issues);
      corrections.push(...builtInResults.corrections);

      // Apply dictionary rules
      const dictionaryResults = this.applyDictionaryRules(content);
      issues.push(...dictionaryResults.issues);
      corrections.push(...dictionaryResults.corrections);

      // Apply custom rules
      const customResults = this.applyCustomRules(content);
      issues.push(...customResults.issues);
      corrections.push(...customResults.corrections);

      // Enhanced analysis using LLM
      if (this.modelConfig) {
        const llmResults = await this.performLLMAnalysis(content);
        issues.push(...llmResults.issues);
        corrections.push(...llmResults.corrections);
      }

      // Generate comprehensive report
      const report = await this.analyzeTerminology(content);

      return {
        issues,
        corrections,
        report
      };

    } catch (error) {
      logger.error('Terminology check failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        issues: [],
        corrections: [],
        report: {
          standardTerms: 0,
          nonStandardTerms: 0,
          inconsistencies: [],
          suggestions: [],
          coverage: 0,
          compliance: 0
        }
      };
    }
  }

  async autoCorrect(content: string): Promise<TerminologyCorrection[]> {
    try {
      const corrections: TerminologyCorrection[] = [];
      let correctedContent = content;

      // Apply automatic corrections from dictionary
      for (const rule of this.dictionary.rules) {
        if (rule.severity === 'high' || rule.severity === 'critical') {
          const regex = new RegExp(rule.pattern, 'gi');
          const matches = correctedContent.match(regex);
          
          if (matches) {
            for (const match of matches) {
              const startIndex = correctedContent.indexOf(match);
              const endIndex = startIndex + match.length;
              
              corrections.push({
                id: `auto_${rule.id}_${Date.now()}`,
                type: 'replacement',
                original: match,
                corrected: rule.replacement,
                reason: rule.description,
                confidence: 0.9,
                location: {
                  start: startIndex,
                  end: endIndex
                },
                automatic: true
              });

              correctedContent = correctedContent.replace(match, rule.replacement);
            }
          }
        }
      }

      // Apply common corrections
      const commonCorrections = this.getCommonCorrections();
      for (const [wrong, correct] of Object.entries(commonCorrections)) {
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        const matches = correctedContent.match(regex);
        
        if (matches) {
          for (const match of matches) {
            const startIndex = correctedContent.indexOf(match);
            const endIndex = startIndex + match.length;
            
            corrections.push({
              id: `common_${wrong}_${Date.now()}`,
              type: 'replacement',
              original: match,
              corrected: correct,
              reason: 'Common terminology correction',
              confidence: 0.95,
              location: {
                start: startIndex,
                end: endIndex
              },
              automatic: true
            });

            correctedContent = correctedContent.replace(match, correct);
          }
        }
      }

      return corrections;

    } catch (error) {
      logger.error('Auto-correction failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  async healthCheck(): Promise<void> {
    try {
      // Test dictionary loading
      if (!this.dictionary || !this.dictionary.terms || this.dictionary.terms.length === 0) {
        throw new Error('Dictionary not loaded properly');
      }

      // Test term extraction
      const testContent = 'This is a test course about computer science and machine learning.';
      const terms = this.extractTerms(testContent);
      if (terms.length === 0) {
        throw new Error('Term extraction not working');
      }

      // Test LLM service if configured
      if (this.modelConfig && this.modelConfig.provider) {
        const llmHealth = await llmService.healthCheck();
        if (!llmHealth) {
          logger.warn('LLM service not available for terminology engine');
        }
      }

      logger.info('Terminology engine health check passed');
    } catch (error) {
      throw new Error(`Terminology engine health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  addCustomRule(rule: TerminologyRule): void {
    this.customRules.push(rule);
  }

  removeCustomRule(ruleId: string): void {
    this.customRules = this.customRules.filter(rule => rule.id !== ruleId);
  }

  private loadDictionary(dictionaryId: string): TerminologyDictionary {
    // Mock dictionary loading - in production, load from database or file
    const academicCSDictionary: TerminologyDictionary = {
      id: 'academic_cs',
      name: 'Academic Computer Science',
      domain: 'computer_science',
      terms: [
        {
          term: 'machine learning',
          definition: 'A subset of artificial intelligence that enables computers to learn and improve from experience',
          domain: 'ai',
          aliases: ['ML', 'statistical learning'],
          category: 'technology',
          examples: ['supervised learning', 'unsupervised learning']
        },
        {
          term: 'algorithm',
          definition: 'A step-by-step procedure for solving a problem or completing a task',
          domain: 'computer_science',
          aliases: ['algo'],
          category: 'methodology',
          examples: ['sorting algorithm', 'search algorithm']
        },
        {
          term: 'data structure',
          definition: 'A way of organizing and storing data in a computer for efficient access and modification',
          domain: 'computer_science',
          aliases: ['data structures'],
          category: 'programming',
          examples: ['array', 'linked list', 'tree', 'graph']
        },
        {
          term: 'object-oriented programming',
          definition: 'A programming paradigm based on the concept of objects and classes',
          domain: 'programming',
          aliases: ['OOP', 'object orientation'],
          category: 'paradigm',
          examples: ['inheritance', 'polymorphism', 'encapsulation']
        },
        {
          term: 'database management system',
          definition: 'Software that handles the storage, retrieval, and updating of data in a database',
          domain: 'database',
          aliases: ['DBMS', 'database system'],
          category: 'system',
          examples: ['MySQL', 'PostgreSQL', 'MongoDB']
        }
      ],
      aliases: new Map([
        ['ML', 'machine learning'],
        ['AI', 'artificial intelligence'],
        ['OOP', 'object-oriented programming'],
        ['DBMS', 'database management system'],
        ['algo', 'algorithm']
      ]),
      rules: [
        {
          id: 'cs_001',
          pattern: '\\bAI\\b',
          replacement: 'artificial intelligence',
          category: 'abbreviation',
          severity: 'medium',
          description: 'Expand AI abbreviation in academic context',
          examples: [
            { wrong: 'AI systems', correct: 'artificial intelligence systems' }
          ]
        },
        {
          id: 'cs_002',
          pattern: '\\bcomputer program\\b',
          replacement: 'software application',
          category: 'terminology',
          severity: 'low',
          description: 'Use more precise terminology',
          examples: [
            { wrong: 'computer program', correct: 'software application' }
          ]
        },
        {
          id: 'cs_003',
          pattern: '\\bweb page\\b',
          replacement: 'web page',
          category: 'spelling',
          severity: 'high',
          description: 'Correct spelling of web page',
          examples: [
            { wrong: 'webpage', correct: 'web page' }
          ]
        }
      ]
    };

    return academicCSDictionary;
  }

  private extractTerms(content: string): string[] {
    // Simple term extraction - in production use NLP libraries
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Extract compound terms (2-3 words)
    const terms = new Set<string>();
    
    // Single word terms
    words.forEach(word => {
      if (this.isRelevantTerm(word)) {
        terms.add(word);
      }
    });

    // Two-word terms
    for (let i = 0; i < words.length - 1; i++) {
      const twoWordTerm = `${words[i]} ${words[i + 1]}`;
      if (this.isRelevantTerm(twoWordTerm)) {
        terms.add(twoWordTerm);
      }
    }

    // Three-word terms
    for (let i = 0; i < words.length - 2; i++) {
      const threeWordTerm = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (this.isRelevantTerm(threeWordTerm)) {
        terms.add(threeWordTerm);
      }
    }

    return Array.from(terms);
  }

  private isRelevantTerm(term: string): boolean {
    // Check if term is in dictionary or matches technical patterns
    const isInDictionary = this.dictionary.terms.some(entry => 
      entry.term === term || entry.aliases.includes(term)
    );
    
    const isTechnicalTerm = /^[a-z]+([\s-][a-z]+)*$/.test(term) && 
      (term.includes('program') || term.includes('system') || term.includes('data') ||
       term.includes('computer') || term.includes('software') || term.includes('algorithm'));

    return isInDictionary || isTechnicalTerm;
  }

  private checkStandardTerms(terms: string[]): string[] {
    return terms.filter(term => {
      return this.dictionary.terms.some(entry => 
        entry.term === term || entry.aliases.includes(term)
      );
    });
  }

  private findInconsistencies(content: string, terms: string[]): TerminologyInconsistency[] {
    const inconsistencies: TerminologyInconsistency[] = [];
    const termVariants = new Map<string, Set<string>>();

    // Group similar terms
    for (const term of terms) {
      const standardForm = this.getStandardForm(term);
      if (!termVariants.has(standardForm)) {
        termVariants.set(standardForm, new Set());
      }
      termVariants.get(standardForm)!.add(term);
    }

    // Find inconsistencies
    for (const [standardForm, variants] of termVariants) {
      if (variants.size > 1) {
        const variantArray = Array.from(variants);
        const occurrences = this.countOccurrences(content, variantArray);
        
        inconsistencies.push({
          term: standardForm,
          variants: variantArray,
          standardForm,
          occurrences,
          severity: variants.size > 3 ? 'high' : 'medium'
        });
      }
    }

    return inconsistencies;
  }

  private getStandardForm(term: string): string {
    // Check if term has a standard form in dictionary
    const dictionaryEntry = this.dictionary.terms.find(entry => 
      entry.term === term || entry.aliases.includes(term)
    );
    
    if (dictionaryEntry) {
      return dictionaryEntry.term;
    }

    // Check aliases map
    return this.dictionary.aliases.get(term) || term;
  }

  private countOccurrences(content: string, terms: string[]): number {
    let count = 0;
    const lowerContent = content.toLowerCase();
    
    for (const term of terms) {
      const regex = new RegExp(`\\b${term.toLowerCase()}\\b`, 'g');
      const matches = lowerContent.match(regex);
      count += matches ? matches.length : 0;
    }
    
    return count;
  }

  private async generateSuggestions(terms: string[], content: string): Promise<TerminologySuggestion[]> {
    const suggestions: TerminologySuggestion[] = [];

    // Check for deprecated terms
    for (const term of terms) {
      const dictionaryEntry = this.dictionary.terms.find(entry => 
        entry.aliases.includes(term) && entry.deprecated
      );
      
      if (dictionaryEntry && dictionaryEntry.preferred) {
        suggestions.push({
          term,
          suggestion: dictionaryEntry.preferred,
          reason: 'Term is deprecated, use preferred alternative',
          confidence: 0.9,
          domain: dictionaryEntry.domain
        });
      }
    }

    // Suggest more specific terms
    const genericTerms = ['system', 'program', 'application', 'tool'];
    for (const genericTerm of genericTerms) {
      if (terms.includes(genericTerm)) {
        const contextualSuggestion = this.getContextualSuggestion(genericTerm, content);
        if (contextualSuggestion) {
          suggestions.push({
            term: genericTerm,
            suggestion: contextualSuggestion,
            reason: 'Consider using more specific terminology',
            confidence: 0.7,
            domain: 'general'
          });
        }
      }
    }

    return suggestions;
  }

  private getContextualSuggestion(term: string, content: string): string | null {
    const lowerContent = content.toLowerCase();
    
    if (term === 'system') {
      if (lowerContent.includes('database')) return 'database management system';
      if (lowerContent.includes('operating')) return 'operating system';
      if (lowerContent.includes('web')) return 'web system';
    }
    
    if (term === 'program') {
      if (lowerContent.includes('web')) return 'web application';
      if (lowerContent.includes('mobile')) return 'mobile application';
      return 'software application';
    }

    return null;
  }

  private calculateCoverage(terms: string[]): number {
    if (terms.length === 0) return 0;
    
    const standardTermsCount = this.checkStandardTerms(terms).length;
    return (standardTermsCount / terms.length) * 100;
  }

  private calculateCompliance(standardTermsCount: number, totalTermsCount: number): number {
    if (totalTermsCount === 0) return 100;
    return (standardTermsCount / totalTermsCount) * 100;
  }

  private applyBuiltInRules(content: string): { issues: TerminologyIssue[]; corrections: TerminologyCorrection[] } {
    const issues: TerminologyIssue[] = [];
    const corrections: TerminologyCorrection[] = [];

    // Built-in rules for common issues
    const builtInRules = [
      {
        pattern: /\bwebsite\b/gi,
        replacement: 'web site',
        description: 'Use standard spelling of web site',
        severity: 'medium' as const
      },
      {
        pattern: /\be-mail\b/gi,
        replacement: 'email',
        description: 'Use modern spelling of email',
        severity: 'low' as const
      },
      {
        pattern: /\binternet\b/gi,
        replacement: 'Internet',
        description: 'Capitalize Internet when referring to the global network',
        severity: 'low' as const
      }
    ];

    for (const rule of builtInRules) {
      const matches = Array.from(content.matchAll(rule.pattern));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          issues.push({
            id: `builtin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'terminology',
            severity: rule.severity,
            category: 'standardization',
            description: rule.description,
            location: {
              line: this.getLineNumber(content, match.index),
              column: this.getColumnNumber(content, match.index),
              context: this.getContext(content, match.index, 20)
            },
            suggestion: `Replace "${match[0]}" with "${rule.replacement}"`,
            confidence: 0.9
          });

          corrections.push({
            id: `correction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'replacement',
            original: match[0],
            corrected: rule.replacement,
            reason: rule.description,
            confidence: 0.9,
            location: {
              start: match.index,
              end: match.index + match[0].length
            },
            automatic: true
          });
        }
      }
    }

    return { issues, corrections };
  }

  private applyDictionaryRules(content: string): { issues: TerminologyIssue[]; corrections: TerminologyCorrection[] } {
    const issues: TerminologyIssue[] = [];
    const corrections: TerminologyCorrection[] = [];

    for (const rule of this.dictionary.rules) {
      const regex = new RegExp(rule.pattern, 'gi');
      const matches = Array.from(content.matchAll(regex));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          issues.push({
            id: `dict_${rule.id}_${match.index}`,
            type: 'terminology',
            severity: rule.severity,
            category: rule.category,
            description: rule.description,
            location: {
              line: this.getLineNumber(content, match.index),
              column: this.getColumnNumber(content, match.index),
              context: this.getContext(content, match.index, 30)
            },
            suggestion: `Replace "${match[0]}" with "${rule.replacement}"`,
            confidence: 0.85,
            rule: rule.id,
            examples: rule.examples.map(ex => `${ex.wrong} → ${ex.correct}`)
          });

          if (rule.severity === 'high' || rule.severity === 'critical') {
            corrections.push({
              id: `dict_correction_${rule.id}_${match.index}`,
              type: 'replacement',
              original: match[0],
              corrected: rule.replacement,
              reason: rule.description,
              confidence: 0.85,
              location: {
                start: match.index,
                end: match.index + match[0].length
              },
              automatic: rule.severity === 'critical'
            });
          }
        }
      }
    }

    return { issues, corrections };
  }

  private applyCustomRules(content: string): { issues: TerminologyIssue[]; corrections: TerminologyCorrection[] } {
    const issues: TerminologyIssue[] = [];
    const corrections: TerminologyCorrection[] = [];

    for (const rule of this.customRules) {
      const regex = new RegExp(rule.pattern, 'gi');
      const matches = Array.from(content.matchAll(regex));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          issues.push({
            id: `custom_${rule.id}_${match.index}`,
            type: 'terminology',
            severity: rule.severity,
            category: rule.category,
            description: rule.description,
            location: {
              line: this.getLineNumber(content, match.index),
              column: this.getColumnNumber(content, match.index),
              context: this.getContext(content, match.index, 25)
            },
            suggestion: `Replace "${match[0]}" with "${rule.replacement}"`,
            confidence: 0.8,
            rule: rule.id
          });

          corrections.push({
            id: `custom_correction_${rule.id}_${match.index}`,
            type: 'replacement',
            original: match[0],
            corrected: rule.replacement,
            reason: rule.description,
            confidence: 0.8,
            location: {
              start: match.index,
              end: match.index + match[0].length
            },
            automatic: false
          });
        }
      }
    }

    return { issues, corrections };
  }

  private async performLLMAnalysis(content: string): Promise<{ issues: TerminologyIssue[]; corrections: TerminologyCorrection[] }> {
    const issues: TerminologyIssue[] = [];
    const corrections: TerminologyCorrection[] = [];

    try {
      if (!this.modelConfig || !this.modelConfig.provider) {
        return { issues, corrections };
      }

      const prompt = this.buildTerminologyAnalysisPrompt(content);
      const response = await llmService.generateCompletion(
        this.modelConfig.provider,
        this.modelConfig.model,
        prompt,
        {
          temperature: this.modelConfig.temperature,
          maxTokens: this.modelConfig.maxTokens
        }
      );

      const analysis = this.parseLLMResponse(response);
      issues.push(...analysis.issues);
      corrections.push(...analysis.corrections);

    } catch (error) {
      logger.warn('LLM terminology analysis failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return { issues, corrections };
  }

  private buildTerminologyAnalysisPrompt(content: string): string {
    return `Analyze the following text for terminology consistency and accuracy in an academic computer science context:

"${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}"

Please identify:
1. Inconsistent terminology usage
2. Non-standard or deprecated terms
3. Opportunities for more precise terminology
4. Formatting issues with technical terms

Return your analysis in JSON format with "issues" and "corrections" arrays.`;
  }

  private parseLLMResponse(response: string): { issues: TerminologyIssue[]; corrections: TerminologyCorrection[] } {
    try {
      const parsed = JSON.parse(response);
      return {
        issues: parsed.issues || [],
        corrections: parsed.corrections || []
      };
    } catch (error) {
      logger.warn('Failed to parse LLM response', { response: response.substring(0, 200) });
      return { issues: [], corrections: [] };
    }
  }

  private getCommonCorrections(): Record<string, string> {
    return {
      'webpage': 'web page',
      'website': 'web site',
      'e-mail': 'email',
      'internet': 'Internet',
      'world wide web': 'World Wide Web',
      'AI': 'artificial intelligence',
      'ML': 'machine learning',
      'DB': 'database',
      'OS': 'operating system'
    };
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private getColumnNumber(content: string, index: number): number {
    const lines = content.substring(0, index).split('\n');
    return lines[lines.length - 1].length + 1;
  }

  private getContext(content: string, index: number, contextLength: number): string {
    const start = Math.max(0, index - contextLength);
    const end = Math.min(content.length, index + contextLength);
    return content.substring(start, end).replace(/\n/g, ' ').trim();
  }
}