import { apiClient } from './apiClient';
import type { 
  APIResponse, 
  Analysis,
  AnalysisWorkflow,
  CreateAnalysisRequest,
  UpdateAnalysisRequest,
  AnalysisResult
} from './types';

export class AnalysisService {
  /**
   * Get all analyses for the current user
   */
  async getAnalyses(): Promise<APIResponse<Analysis[]>> {
    return apiClient.request<Analysis[]>('GET', '/analyses');
  }

  /**
   * Get a specific analysis by ID
   */
  async getAnalysis(analysisId: string): Promise<APIResponse<Analysis>> {
    return apiClient.request<Analysis>('GET', `/analyses/${analysisId}`);
  }

  /**
   * Create a new analysis
   */
  async createAnalysis(analysisData: CreateAnalysisRequest): Promise<APIResponse<Analysis>> {
    return apiClient.request<Analysis>('POST', '/analyses', analysisData);
  }

  /**
   * Update an existing analysis
   */
  async updateAnalysis(analysisId: string, analysisData: UpdateAnalysisRequest): Promise<APIResponse<Analysis>> {
    return apiClient.request<Analysis>('PUT', `/analyses/${analysisId}`, analysisData);
  }

  /**
   * Delete an analysis
   */
  async deleteAnalysis(analysisId: string): Promise<APIResponse<void>> {
    return apiClient.request<void>('DELETE', `/analyses/${analysisId}`);
  }

  /**
   * Start an analysis workflow
   */
  async startAnalysis(analysisId: string): Promise<APIResponse<AnalysisWorkflow>> {
    return apiClient.request<AnalysisWorkflow>('POST', `/analyses/${analysisId}/start`);
  }

  /**
   * Pause an analysis workflow
   */
  async pauseAnalysis(analysisId: string): Promise<APIResponse<AnalysisWorkflow>> {
    return apiClient.request<AnalysisWorkflow>('POST', `/analyses/${analysisId}/pause`);
  }

  /**
   * Stop an analysis workflow
   */
  async stopAnalysis(analysisId: string): Promise<APIResponse<AnalysisWorkflow>> {
    return apiClient.request<AnalysisWorkflow>('POST', `/analyses/${analysisId}/stop`);
  }

  /**
   * Resume a paused analysis workflow
   */
  async resumeAnalysis(analysisId: string): Promise<APIResponse<AnalysisWorkflow>> {
    return apiClient.request<AnalysisWorkflow>('POST', `/analyses/${analysisId}/resume`);
  }

  /**
   * Get analysis results
   */
  async getAnalysisResults(analysisId: string): Promise<APIResponse<AnalysisResult>> {
    return apiClient.request<AnalysisResult>('GET', `/analyses/${analysisId}/results`);
  }

  /**
   * Get analysis workflow status
   */
  async getAnalysisStatus(analysisId: string): Promise<APIResponse<AnalysisWorkflow>> {
    return apiClient.request<AnalysisWorkflow>('GET', `/analyses/${analysisId}/status`);
  }

  /**
   * Get all active workflows
   */
  async getActiveWorkflows(): Promise<APIResponse<AnalysisWorkflow[]>> {
    return apiClient.request<AnalysisWorkflow[]>('GET', '/workflows/active');
  }

  /**
   * Compare curricula (curriculum comparison analysis)
   */
  async compareCurricula(config: {
    programIds: string[];
    comparisonType: 'structural' | 'semantic' | 'both';
    includeGapAnalysis: boolean;
  }): Promise<APIResponse<Analysis>> {
    return apiClient.request<Analysis>('POST', '/analyses/compare-curricula', config);
  }

  /**
   * Run accreditation analysis
   */
  async analyzeAccreditation(config: {
    programId: string;
    standardType: string; // e.g., 'ABET', 'AACSB', 'ACS'
    includeRecommendations: boolean;
  }): Promise<APIResponse<Analysis>> {
    return apiClient.request<Analysis>('POST', '/analyses/accreditation', config);
  }

  /**
   * Run gap analysis
   */
  async analyzeGaps(config: {
    programId: string;
    benchmarkProgramIds: string[];
    analysisDepth: 'basic' | 'detailed' | 'comprehensive';
  }): Promise<APIResponse<Analysis>> {
    return apiClient.request<Analysis>('POST', '/analyses/gap-analysis', config);
  }

  /**
   * Run semantic analysis
   */
  async semanticAnalysis(config: {
    programId: string;
    analysisTypes: string[];
    llmConfig: {
      provider: string;
      model: string;
      temperature: number;
    };
  }): Promise<APIResponse<Analysis>> {
    return apiClient.request<Analysis>('POST', '/analyses/semantic', config);
  }

  /**
   * Export analysis results
   */
  async exportAnalysisResults(
    analysisId: string, 
    format: 'pdf' | 'docx' | 'xlsx' | 'json'
  ): Promise<APIResponse<Blob>> {
    return apiClient.request<Blob>('GET', `/analyses/${analysisId}/export?format=${format}`);
  }

  /**
   * Clone an existing analysis
   */
  async cloneAnalysis(analysisId: string, newName?: string): Promise<APIResponse<Analysis>> {
    return apiClient.request<Analysis>('POST', `/analyses/${analysisId}/clone`, { name: newName });
  }

  /**
   * Get analysis history for a program
   */
  async getProgramAnalysisHistory(programId: string): Promise<APIResponse<Analysis[]>> {
    return apiClient.request<Analysis[]>('GET', `/programs/${programId}/analyses`);
  }

  /**
   * Schedule a recurring analysis
   */
  async scheduleAnalysis(analysisId: string, schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    startDate: string;
    endDate?: string;
  }): Promise<APIResponse<void>> {
    return apiClient.request<void>('POST', `/analyses/${analysisId}/schedule`, schedule);
  }
}

// Export singleton instance
export const analysisService = new AnalysisService();