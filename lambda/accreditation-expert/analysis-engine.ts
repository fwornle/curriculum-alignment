import { llmService } from '../../src/services/llm-config.service';
import { logger } from '../../src/services/logging.service';

export class AnalysisEngine {
  private modelConfig: any;

  constructor(modelConfig?: any) {
    this.modelConfig = modelConfig || {
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229',
      temperature: 0.3,
      maxTokens: 4000
    };
  }

  async analyzeCurriculum(programData: any, options: any): Promise<any> {
    try {
      logger.info('Starting curriculum analysis', {
        programId: programData.id,
        courseCount: programData.courses.length,
        depth: options.depth
      });

      // Basic analysis
      const overview = this.analyzeOverview(programData);
      const structure = await this.analyzeStructure(programData);
      const content = await this.analyzeContent(programData);
      const quality = await this.analyzeQuality(programData, options.depth);

      return {
        overview,
        structure,
        content,
        quality
      };

    } catch (error) {
      logger.error('Curriculum analysis failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async identifyGaps(programData: any, standards: any[], peerPrograms: any[]): Promise<any[]> {
    const gaps: any[] = [];

    try {
      // Content gaps
      const contentGaps = await this.identifyContentGaps(programData, peerPrograms);
      gaps.push(...contentGaps);

      // Structure gaps
      const structureGaps = this.identifyStructureGaps(programData);
      gaps.push(...structureGaps);

      // Standards compliance gaps
      if (standards.length > 0) {
        const standardsGaps = await this.identifyStandardsGaps(programData, standards);
        gaps.push(...standardsGaps);
      }

      // Industry alignment gaps
      const industryGaps = await this.identifyIndustryGaps(programData);
      gaps.push(...industryGaps);

      // Sort by priority
      gaps.sort((a, b) => b.priority - a.priority);

      return gaps;

    } catch (error) {
      logger.error('Gap identification failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  async generateRecommendations(analysis: any, gaps: any[], focusAreas: string[]): Promise<any[]> {
    const recommendations: any[] = [];

    try {
      // Generate recommendations based on gaps
      for (const gap of gaps) {
        const recommendation = await this.generateRecommendationForGap(gap, analysis);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }

      // Generate focus area recommendations
      for (const area of focusAreas) {
        const focusRecommendations = await this.generateFocusAreaRecommendations(area, analysis);
        recommendations.push(...focusRecommendations);
      }

      // Generate general improvement recommendations
      const generalRecommendations = await this.generateGeneralRecommendations(analysis);
      recommendations.push(...generalRecommendations);

      // Prioritize and filter
      return this.prioritizeRecommendations(recommendations);

    } catch (error) {
      logger.error('Recommendation generation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  async checkCompliance(programData: any, standards: any[]): Promise<any> {
    const compliance = {
      overall: {
        status: 'compliant' as const,
        score: 0,
        maxScore: 0
      },
      standards: [] as any[]
    };

    try {
      let totalScore = 0;
      let maxScore = 0;

      for (const standard of standards) {
        const standardCompliance = await this.checkStandardCompliance(programData, standard);
        compliance.standards.push(standardCompliance);
        
        totalScore += standardCompliance.score;
        maxScore += standard.requirements.length * 100; // Assuming 100 points per requirement
      }

      compliance.overall.score = totalScore;
      compliance.overall.maxScore = maxScore;

      // Determine overall status
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      if (percentage >= 90) {
        compliance.overall.status = 'compliant';
      } else if (percentage >= 70) {
        compliance.overall.status = 'partially_compliant';
      } else {
        compliance.overall.status = 'non_compliant';
      }

      return compliance;

    } catch (error) {
      logger.error('Compliance check failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return compliance;
    }
  }

  async benchmarkProgram(programData: any, peerPrograms: any[], benchmarks: any[]): Promise<any> {
    try {
      const comparisons = await this.performBenchmarkComparisons(programData, peerPrograms, benchmarks);
      const position = this.calculatePosition(comparisons);
      const { strengths, weaknesses } = this.identifyStrengthsAndWeaknesses(comparisons);

      return {
        position,
        comparisons,
        strengths,
        weaknesses
      };

    } catch (error) {
      logger.error('Benchmarking failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async comparePrograms(sourceProgram: any, targetPrograms: any[]): Promise<any> {
    // Mock implementation for program comparison
    return {
      overview: {
        totalCourses: sourceProgram?.courses?.length || 0,
        totalCredits: sourceProgram?.credits || 0,
        coreCredits: 0,
        electiveCredits: 0,
        distribution: {}
      },
      structure: {
        progression: { logical: true, prerequisites: { satisfied: 0, total: 0 }, levelDistribution: {}, issues: [] },
        balance: { theory: 50, practice: 50, core: 70, elective: 30, assessment: 'balanced' },
        coherence: { thematicAlignment: 0.8, skillProgression: 0.7, outcomeAlignment: 0.9, overall: 0.8 }
      },
      content: {
        topicCoverage: [],
        skillsDevelopment: { technical: [], soft: [], industry: [] },
        learningOutcomes: { clarity: 0.8, measurability: 0.7, alignment: 0.9, coverage: 0.8, outcomes: [] }
      },
      quality: {
        rigor: 0.8,
        currency: 0.9,
        relevance: 0.85,
        overall: 0.85
      }
    };
  }

  calculateConfidence(analysis: any, gaps: any[], recommendations: any[]): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence based on data quality
    if (analysis?.overview?.totalCourses > 10) {
      confidence += 0.1;
    }

    // Decrease confidence if many gaps found
    if (gaps.length > 10) {
      confidence -= 0.1;
    }

    // Increase confidence if recommendations are specific
    if (recommendations.length > 0 && recommendations.length < 20) {
      confidence += 0.1;
    }

    return Math.max(0.5, Math.min(1.0, confidence));
  }

  async healthCheck(): Promise<void> {
    // Test basic functionality
    try {
      const testProgram = {
        id: 'test',
        name: 'Test Program',
        courses: [
          { code: 'TEST101', name: 'Test Course', credits: 3, type: 'core' }
        ]
      };

      await this.analyzeOverview(testProgram);
      logger.info('Analysis engine health check passed');
    } catch (error) {
      throw new Error(`Analysis engine health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private analyzeOverview(programData: any): any {
    const courses = programData.courses || [];
    
    const totalCourses = courses.length;
    const totalCredits = courses.reduce((sum: number, course: any) => sum + (course.credits || 0), 0);
    const coreCredits = courses
      .filter((course: any) => course.type === 'core')
      .reduce((sum: number, course: any) => sum + (course.credits || 0), 0);
    const electiveCredits = courses
      .filter((course: any) => course.type === 'elective')
      .reduce((sum: number, course: any) => sum + (course.credits || 0), 0);

    const distribution: any = {};
    courses.forEach((course: any) => {
      const type = course.type || 'unknown';
      distribution[type] = (distribution[type] || 0) + (course.credits || 0);
    });

    return {
      totalCourses,
      totalCredits,
      coreCredits,
      electiveCredits,
      distribution
    };
  }

  private async analyzeStructure(programData: any): Promise<any> {
    const courses = programData.courses || [];
    
    // Analyze progression
    const progression = this.analyzeProgression(courses);
    
    // Analyze balance
    const balance = this.analyzeBalance(courses);
    
    // Analyze coherence
    const coherence = await this.analyzeCoherence(courses);

    return {
      progression,
      balance,
      coherence
    };
  }

  private async analyzeContent(programData: any): Promise<any> {
    const courses = programData.courses || [];
    
    // Analyze topic coverage
    const topicCoverage = await this.analyzeTopicCoverage(courses);
    
    // Analyze skills development
    const skillsDevelopment = this.analyzeSkillsDevelopment(courses);
    
    // Analyze learning outcomes
    const learningOutcomes = this.analyzeLearningOutcomes(courses);

    return {
      topicCoverage,
      skillsDevelopment,
      learningOutcomes
    };
  }

  private async analyzeQuality(programData: any, depth: string): Promise<any> {
    const courses = programData.courses || [];
    
    // Basic quality metrics
    let rigor = 0.8;
    let currency = 0.7;
    let relevance = 0.9;

    if (depth === 'detailed' || depth === 'comprehensive') {
      // Enhanced analysis using LLM
      try {
        const prompt = this.buildQualityAnalysisPrompt(courses);
        const llmResponse = await llmService.generateCompletion(
          this.modelConfig.provider,
          this.modelConfig.model,
          prompt,
          {
            temperature: this.modelConfig.temperature,
            maxTokens: 1000
          }
        );

        const qualityMetrics = this.parseQualityMetrics(llmResponse);
        rigor = qualityMetrics.rigor || rigor;
        currency = qualityMetrics.currency || currency;
        relevance = qualityMetrics.relevance || relevance;
      } catch (error) {
        logger.warn('LLM quality analysis failed, using defaults', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const overall = (rigor + currency + relevance) / 3;

    return {
      rigor,
      currency,
      relevance,
      overall
    };
  }

  private analyzeProgression(courses: any[]): any {
    const prerequisites = courses.reduce((acc, course) => {
      acc.total++;
      if (!course.prerequisites || course.prerequisites.length === 0) {
        acc.satisfied++;
      } else {
        // Check if prerequisites exist in the course list
        const prereqsMet = course.prerequisites.every((prereq: string) =>
          courses.some(c => c.code === prereq)
        );
        if (prereqsMet) acc.satisfied++;
      }
      return acc;
    }, { satisfied: 0, total: 0 });

    const levelDistribution: any = {};
    courses.forEach(course => {
      const level = course.level || this.extractLevelFromCode(course.code);
      levelDistribution[level] = (levelDistribution[level] || 0) + 1;
    });

    const issues: string[] = [];
    if (prerequisites.satisfied / prerequisites.total < 0.8) {
      issues.push('Many courses have unmet prerequisites');
    }

    return {
      logical: issues.length === 0,
      prerequisites,
      levelDistribution,
      issues
    };
  }

  private analyzeBalance(courses: any[]): any {
    // Simple heuristic-based balance analysis
    let theoryCount = 0;
    let practiceCount = 0;

    courses.forEach(course => {
      if (course.name.toLowerCase().includes('lab') || 
          course.name.toLowerCase().includes('project') ||
          course.name.toLowerCase().includes('practical')) {
        practiceCount++;
      } else {
        theoryCount++;
      }
    });

    const total = courses.length;
    const theory = total > 0 ? (theoryCount / total) * 100 : 0;
    const practice = total > 0 ? (practiceCount / total) * 100 : 0;

    const coreCount = courses.filter(c => c.type === 'core').length;
    const electiveCount = courses.filter(c => c.type === 'elective').length;
    
    const core = total > 0 ? (coreCount / total) * 100 : 0;
    const elective = total > 0 ? (electiveCount / total) * 100 : 0;

    return {
      theory,
      practice,
      core,
      elective,
      assessment: this.assessBalance(theory, practice, core, elective)
    };
  }

  private async analyzeCoherence(courses: any[]): Promise<any> {
    // Mock implementation - in production would use LLM analysis
    return {
      thematicAlignment: 0.85,
      skillProgression: 0.80,
      outcomeAlignment: 0.90,
      overall: 0.85
    };
  }

  private async analyzeTopicCoverage(courses: any[]): Promise<any[]> {
    const topics = [
      'Programming Fundamentals',
      'Data Structures',
      'Algorithms',
      'Database Systems',
      'Computer Networks',
      'Operating Systems',
      'Software Engineering',
      'Web Development',
      'Machine Learning',
      'Cybersecurity'
    ];

    return topics.map(topic => {
      const coverage = this.calculateTopicCoverage(topic, courses);
      return {
        topic,
        coverage,
        importance: 0.8, // Mock importance
        courses: this.getCoursesForTopic(topic, courses),
        gap: coverage < 0.5
      };
    });
  }

  private analyzeSkillsDevelopment(courses: any[]): any {
    return {
      technical: [
        { skill: 'Programming', coverage: 0.9, level: 'Advanced' },
        { skill: 'System Design', coverage: 0.7, level: 'Intermediate' },
        { skill: 'Database Management', coverage: 0.8, level: 'Intermediate' }
      ],
      soft: [
        { skill: 'Problem Solving', coverage: 0.85, level: 'Advanced' },
        { skill: 'Communication', coverage: 0.6, level: 'Basic' },
        { skill: 'Teamwork', coverage: 0.7, level: 'Intermediate' }
      ],
      industry: [
        { skill: 'Agile Development', coverage: 0.5, demand: 0.9 },
        { skill: 'Cloud Computing', coverage: 0.4, demand: 0.95 },
        { skill: 'DevOps', coverage: 0.3, demand: 0.8 }
      ]
    };
  }

  private analyzeLearningOutcomes(courses: any[]): any {
    const outcomes = courses.flatMap(course => course.learningOutcomes || []);
    
    return {
      clarity: 0.8,
      measurability: 0.7,
      alignment: 0.9,
      coverage: 0.85,
      outcomes: outcomes.map((outcome: string, index: number) => ({
        outcome,
        courses: [courses[index % courses.length].code],
        assessment: 'Written Exam'
      }))
    };
  }

  private async identifyContentGaps(programData: any, peerPrograms: any[]): Promise<any[]> {
    const gaps: any[] = [];

    // Compare with peer programs
    if (peerPrograms.length > 0) {
      const commonTopics = this.getCommonTopics(peerPrograms);
      const ourTopics = this.extractTopics(programData.courses);

      for (const topic of commonTopics) {
        if (!ourTopics.includes(topic)) {
          gaps.push({
            category: 'content',
            severity: 'moderate',
            description: `Missing topic: ${topic}`,
            impact: 'Students may lack competitive knowledge in this area',
            affectedAreas: ['curriculum', 'competitiveness'],
            evidence: [`Common in ${peerPrograms.length} peer programs`],
            priority: 7
          });
        }
      }
    }

    return gaps;
  }

  private identifyStructureGaps(programData: any): any[] {
    const gaps: any[] = [];
    const courses = programData.courses || [];

    // Check for structural issues
    if (courses.length < 30) {
      gaps.push({
        category: 'structure',
        severity: 'major',
        description: 'Insufficient number of courses',
        impact: 'Program may not provide comprehensive education',
        affectedAreas: ['program_depth', 'accreditation'],
        evidence: [`Only ${courses.length} courses, typically need 30+`],
        priority: 8
      });
    }

    if (programData.credits < 120) {
      gaps.push({
        category: 'structure',
        severity: 'critical',
        description: 'Insufficient credit hours',
        impact: 'May not meet degree requirements',
        affectedAreas: ['accreditation', 'degree_requirements'],
        evidence: [`Only ${programData.credits} credits, need 120+`],
        priority: 9
      });
    }

    return gaps;
  }

  private async identifyStandardsGaps(programData: any, standards: any[]): Promise<any[]> {
    const gaps: any[] = [];

    for (const standard of standards) {
      const compliance = await this.checkStandardCompliance(programData, standard);
      
      for (const req of compliance.requirements) {
        if (req.status === 'not_met') {
          gaps.push({
            category: 'standards',
            severity: 'critical',
            description: `Does not meet ${standard.organization} requirement: ${req.requirement}`,
            impact: 'May affect accreditation status',
            affectedAreas: ['accreditation', 'compliance'],
            evidence: req.gaps || [],
            priority: 10
          });
        }
      }
    }

    return gaps;
  }

  private async identifyIndustryGaps(programData: any): Promise<any[]> {
    const gaps: any[] = [];

    // Mock industry gap identification
    const industrySkills = ['Cloud Computing', 'DevOps', 'Agile Development', 'Cybersecurity'];
    const ourCourses = programData.courses || [];

    for (const skill of industrySkills) {
      const hasSkill = ourCourses.some((course: any) => 
        course.name.toLowerCase().includes(skill.toLowerCase())
      );

      if (!hasSkill) {
        gaps.push({
          category: 'industry',
          severity: 'moderate',
          description: `Limited coverage of ${skill}`,
          impact: 'Graduates may lack current industry skills',
          affectedAreas: ['employability', 'industry_readiness'],
          evidence: ['High industry demand', 'Common in job postings'],
          priority: 6
        });
      }
    }

    return gaps;
  }

  private async generateRecommendationForGap(gap: any, analysis: any): Promise<any> {
    return {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'addition',
      priority: gap.severity === 'critical' ? 'critical' : 'high',
      category: gap.category,
      title: `Address ${gap.description}`,
      description: `Recommended action to address identified gap: ${gap.description}`,
      rationale: gap.impact,
      implementation: {
        effort: 'medium',
        timeline: '1-2 semesters',
        resources: ['Faculty', 'Curriculum Committee'],
        dependencies: ['Approval process']
      },
      expectedImpact: 'Improved program quality and compliance',
      metrics: ['Student satisfaction', 'Graduate employment rates']
    };
  }

  private async generateFocusAreaRecommendations(area: string, analysis: any): Promise<any[]> {
    // Mock implementation
    return [{
      id: `focus_${area}_${Date.now()}`,
      type: 'modification',
      priority: 'medium',
      category: 'focus_area',
      title: `Enhance ${area} focus`,
      description: `Strengthen the program's emphasis on ${area}`,
      rationale: 'Requested focus area for improvement',
      implementation: {
        effort: 'medium',
        timeline: '1 semester',
        resources: ['Faculty development']
      },
      expectedImpact: `Improved ${area} outcomes`,
      metrics: [`${area} assessment scores`]
    }];
  }

  private async generateGeneralRecommendations(analysis: any): Promise<any[]> {
    const recommendations: any[] = [];

    // Quality improvement recommendations
    if (analysis.quality?.overall < 0.8) {
      recommendations.push({
        id: `general_quality_${Date.now()}`,
        type: 'modification',
        priority: 'medium',
        category: 'quality',
        title: 'Improve overall program quality',
        description: 'Enhance course content and delivery methods',
        rationale: 'Quality metrics below target threshold',
        implementation: {
          effort: 'high',
          timeline: '2-3 semesters',
          resources: ['Faculty training', 'Curriculum review']
        },
        expectedImpact: 'Higher quality education and better outcomes',
        metrics: ['Quality scores', 'Student evaluations']
      });
    }

    return recommendations;
  }

  private prioritizeRecommendations(recommendations: any[]): any[] {
    const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    
    return recommendations
      .sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0))
      .slice(0, 20); // Limit to top 20 recommendations
  }

  private async checkStandardCompliance(programData: any, standard: any): Promise<any> {
    const requirements = standard.requirements || [];
    const checkedRequirements = [];

    for (const req of requirements) {
      const status = this.checkRequirementCompliance(programData, req);
      checkedRequirements.push({
        requirement: req.description,
        status,
        evidence: status === 'met' ? ['Program meets requirement'] : [],
        gaps: status === 'not_met' ? ['Requirement not satisfied'] : []
      });
    }

    const metCount = checkedRequirements.filter(r => r.status === 'met').length;
    const score = (metCount / requirements.length) * 100;
    const overallStatus = score >= 90 ? 'met' : score >= 70 ? 'partially_met' : 'not_met';

    return {
      standardId: standard.standard,
      status: overallStatus,
      score,
      requirements: checkedRequirements
    };
  }

  private checkRequirementCompliance(programData: any, requirement: any): 'met' | 'partially_met' | 'not_met' {
    // Mock compliance checking
    const criteria = requirement.criteria || [];
    const metCriteria = criteria.filter(() => Math.random() > 0.3).length;
    
    if (metCriteria === criteria.length) return 'met';
    if (metCriteria > criteria.length / 2) return 'partially_met';
    return 'not_met';
  }

  private async performBenchmarkComparisons(programData: any, peerPrograms: any[], benchmarks: any[]): Promise<any[]> {
    const comparisons = [];

    // Compare total credits
    const ourCredits = programData.credits || 0;
    const peerCredits = peerPrograms.map(p => p.totalCredits || 0);
    const avgPeerCredits = peerCredits.reduce((a, b) => a + b, 0) / peerCredits.length || 0;
    
    comparisons.push({
      metric: 'Total Credits',
      ourValue: ourCredits,
      peerAverage: avgPeerCredits,
      bestPractice: Math.max(...peerCredits, 120),
      gap: avgPeerCredits - ourCredits,
      status: ourCredits >= avgPeerCredits ? 'ahead' : 'behind'
    });

    // Compare course count
    const ourCourses = programData.courses?.length || 0;
    const peerCourseCount = peerPrograms.map(p => p.courses?.length || 0);
    const avgPeerCourses = peerCourseCount.reduce((a, b) => a + b, 0) / peerCourseCount.length || 0;

    comparisons.push({
      metric: 'Number of Courses',
      ourValue: ourCourses,
      peerAverage: avgPeerCourses,
      bestPractice: Math.max(...peerCourseCount, 30),
      gap: avgPeerCourses - ourCourses,
      status: ourCourses >= avgPeerCourses ? 'ahead' : 'behind'
    });

    return comparisons;
  }

  private calculatePosition(comparisons: any[]): any {
    const aheadCount = comparisons.filter(c => c.status === 'ahead').length;
    const totalMetrics = comparisons.length;
    const percentile = (aheadCount / totalMetrics) * 100;

    let category: string;
    if (percentile >= 75) category = 'leading';
    else if (percentile >= 60) category = 'above_average';
    else if (percentile >= 40) category = 'average';
    else category = 'below_average';

    return {
      rank: Math.ceil((100 - percentile) / 10), // Rough ranking
      percentile: Math.round(percentile),
      category
    };
  }

  private identifyStrengthsAndWeaknesses(comparisons: any[]): { strengths: string[]; weaknesses: string[] } {
    const strengths = comparisons
      .filter(c => c.status === 'ahead')
      .map(c => `Strong performance in ${c.metric}`);

    const weaknesses = comparisons
      .filter(c => c.status === 'behind')
      .map(c => `Below average in ${c.metric}`);

    return { strengths, weaknesses };
  }

  // Helper methods
  private extractLevelFromCode(code: string): string {
    const match = code.match(/\d+/);
    if (match) {
      const num = parseInt(match[0]);
      if (num < 200) return 'Introductory';
      if (num < 300) return 'Intermediate';
      if (num < 400) return 'Advanced';
      return 'Graduate';
    }
    return 'Unknown';
  }

  private assessBalance(theory: number, practice: number, core: number, elective: number): string {
    if (Math.abs(theory - practice) < 20 && core >= 60 && core <= 80) {
      return 'well_balanced';
    }
    if (theory > 80) return 'theory_heavy';
    if (practice > 60) return 'practice_heavy';
    if (core > 90) return 'inflexible';
    if (elective > 50) return 'too_flexible';
    return 'needs_adjustment';
  }

  private calculateTopicCoverage(topic: string, courses: any[]): number {
    const relevantCourses = courses.filter(course =>
      course.name.toLowerCase().includes(topic.toLowerCase()) ||
      course.description?.toLowerCase().includes(topic.toLowerCase())
    );
    return Math.min(relevantCourses.length / 2, 1.0); // Assume 2 courses = full coverage
  }

  private getCoursesForTopic(topic: string, courses: any[]): string[] {
    return courses
      .filter(course =>
        course.name.toLowerCase().includes(topic.toLowerCase()) ||
        course.description?.toLowerCase().includes(topic.toLowerCase())
      )
      .map(course => course.code);
  }

  private getCommonTopics(peerPrograms: any[]): string[] {
    // Mock implementation - extract common topics from peer programs
    return ['Machine Learning', 'Cloud Computing', 'Cybersecurity', 'Data Science'];
  }

  private extractTopics(courses: any[]): string[] {
    // Mock implementation - extract topics from course names
    return courses.map(course => course.name).slice(0, 10);
  }

  private buildQualityAnalysisPrompt(courses: any[]): string {
    return `Analyze the quality of these computer science courses: ${courses.map(c => c.name).join(', ')}. 
    Rate rigor (0-1), currency (0-1), and relevance (0-1). Return JSON format.`;
  }

  private parseQualityMetrics(response: string): any {
    try {
      return JSON.parse(response);
    } catch {
      return { rigor: 0.8, currency: 0.7, relevance: 0.9 };
    }
  }
}