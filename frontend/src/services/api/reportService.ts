import { apiClient } from './apiClient';
import type { 
  APIResponse, 
  Report,
  ReportParameters,
  CreateReportRequest,
  UpdateReportRequest
} from './types';

export class ReportService {
  /**
   * Get all reports for the current user
   */
  async getReports(): Promise<APIResponse<Report[]>> {
    return apiClient.request<Report[]>('GET', '/reports');
  }

  /**
   * Get a specific report by ID
   */
  async getReport(reportId: string): Promise<APIResponse<Report>> {
    return apiClient.request<Report>('GET', `/reports/${reportId}`);
  }

  /**
   * Create a new report
   */
  async createReport(reportData: CreateReportRequest): Promise<APIResponse<Report>> {
    return apiClient.request<Report>('POST', '/reports', reportData);
  }

  /**
   * Update an existing report
   */
  async updateReport(reportId: string, reportData: UpdateReportRequest): Promise<APIResponse<Report>> {
    return apiClient.request<Report>('PUT', `/reports/${reportId}`, reportData);
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId: string): Promise<APIResponse<void>> {
    return apiClient.request<void>('DELETE', `/reports/${reportId}`);
  }

  /**
   * Generate a report (start report generation process)
   */
  async generateReport(reportId: string): Promise<APIResponse<Report>> {
    return apiClient.request<Report>('POST', `/reports/${reportId}/generate`);
  }

  /**
   * Get report generation status
   */
  async getReportStatus(reportId: string): Promise<APIResponse<{
    status: Report['status'];
    progress: number;
    estimatedCompletion?: string;
    error?: string;
  }>> {
    return apiClient.request('GET', `/reports/${reportId}/status`);
  }

  /**
   * Download a completed report
   */
  async downloadReport(reportId: string): Promise<APIResponse<Blob>> {
    return apiClient.request<Blob>('GET', `/reports/${reportId}/download`);
  }

  /**
   * Cancel report generation
   */
  async cancelReport(reportId: string): Promise<APIResponse<void>> {
    return apiClient.request<void>('POST', `/reports/${reportId}/cancel`);
  }

  /**
   * Generate gap analysis report
   */
  async generateGapAnalysisReport(params: {
    analysisId: string;
    format: 'pdf' | 'excel' | 'word';
    sections: string[];
    includeCharts: boolean;
    includeRecommendations: boolean;
  }): Promise<APIResponse<Report>> {
    return apiClient.request<Report>('POST', '/reports/gap-analysis', params);
  }

  /**
   * Generate curriculum comparison report
   */
  async generateComparisonReport(params: {
    programIds: string[];
    comparisonType: 'detailed' | 'summary';
    format: 'pdf' | 'excel' | 'word';
    includeVisualizations: boolean;
    sections: string[];
  }): Promise<APIResponse<Report>> {
    return apiClient.request<Report>('POST', '/reports/comparison', params);
  }

  /**
   * Generate accreditation compliance report
   */
  async generateAccreditationReport(params: {
    programId: string;
    standardType: string;
    format: 'pdf' | 'word';
    includeEvidence: boolean;
    includeActionPlan: boolean;
  }): Promise<APIResponse<Report>> {
    return apiClient.request<Report>('POST', '/reports/accreditation', params);
  }

  /**
   * Generate benchmark report
   */
  async generateBenchmarkReport(params: {
    programId: string;
    benchmarkProgramIds: string[];
    metrics: string[];
    format: 'pdf' | 'excel';
    includeStatistics: boolean;
  }): Promise<APIResponse<Report>> {
    return apiClient.request<Report>('POST', '/reports/benchmark', params);
  }

  /**
   * Generate custom report from template
   */
  async generateCustomReport(params: {
    templateId: string;
    dataSource: 'analysis' | 'program' | 'comparison';
    sourceId: string;
    format: 'pdf' | 'excel' | 'word' | 'html';
    customParameters?: Record<string, any>;
  }): Promise<APIResponse<Report>> {
    return apiClient.request<Report>('POST', '/reports/custom', params);
  }

  /**
   * Get available report templates
   */
  async getReportTemplates(): Promise<APIResponse<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    supportedFormats: string[];
    parameters: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
    }>;
  }>>> {
    return apiClient.request('GET', '/reports/templates');
  }

  /**
   * Preview report before generation
   */
  async previewReport(params: ReportParameters): Promise<APIResponse<{
    preview: string; // HTML preview
    estimatedPages: number;
    estimatedSize: number;
    sections: string[];
  }>> {
    return apiClient.request('POST', '/reports/preview', params);
  }

  /**
   * Schedule recurring report generation
   */
  async scheduleReport(reportId: string, schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    startDate: string;
    endDate?: string;
    recipients: string[];
    format: 'pdf' | 'excel' | 'word';
  }): Promise<APIResponse<void>> {
    return apiClient.request<void>('POST', `/reports/${reportId}/schedule`, schedule);
  }

  /**
   * Get report sharing settings
   */
  async getReportSharing(reportId: string): Promise<APIResponse<{
    isPublic: boolean;
    shareUrl?: string;
    permissions: Array<{
      userId: string;
      level: 'view' | 'download' | 'edit';
    }>;
  }>> {
    return apiClient.request('GET', `/reports/${reportId}/sharing`);
  }

  /**
   * Update report sharing settings
   */
  async updateReportSharing(reportId: string, sharing: {
    isPublic?: boolean;
    permissions?: Array<{
      userId: string;
      level: 'view' | 'download' | 'edit';
    }>;
  }): Promise<APIResponse<void>> {
    return apiClient.request<void>('PUT', `/reports/${reportId}/sharing`, sharing);
  }

  /**
   * Export multiple reports as archive
   */
  async exportReportsArchive(reportIds: string[], format: 'zip' | 'tar'): Promise<APIResponse<Blob>> {
    return apiClient.request<Blob>('POST', '/reports/export/archive', { reportIds, format });
  }

  /**
   * Get report analytics (views, downloads, etc.)
   */
  async getReportAnalytics(reportId: string, timeRange?: string): Promise<APIResponse<{
    views: number;
    downloads: number;
    shares: number;
    timeline: Array<{
      date: string;
      views: number;
      downloads: number;
    }>;
  }>> {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    return apiClient.request('GET', `/reports/${reportId}/analytics${params}`);
  }

  /**
   * Clone an existing report with new parameters
   */
  async cloneReport(reportId: string, newName: string, newParameters?: ReportParameters): Promise<APIResponse<Report>> {
    return apiClient.request<Report>('POST', `/reports/${reportId}/clone`, {
      name: newName,
      parameters: newParameters
    });
  }
}

// Export singleton instance
export const reportService = new ReportService();