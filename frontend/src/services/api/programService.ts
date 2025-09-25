import { apiClient } from './apiClient';
import type { 
  APIResponse, 
  Program, 
  CreateProgramRequest, 
  UpdateProgramRequest,
  ProgramDocument,
  UploadProgramDocumentRequest
} from './types';

export class ProgramService {
  /**
   * Get all programs for the current user
   */
  async getPrograms(): Promise<APIResponse<Program[]>> {
    return apiClient.request<Program[]>('GET', '/programs');
  }

  /**
   * Get a specific program by ID
   */
  async getProgram(programId: string): Promise<APIResponse<Program>> {
    return apiClient.request<Program>('GET', `/programs/${programId}`);
  }

  /**
   * Create a new program
   */
  async createProgram(programData: CreateProgramRequest): Promise<APIResponse<Program>> {
    return apiClient.request<Program>('POST', '/programs', programData);
  }

  /**
   * Update an existing program
   */
  async updateProgram(programId: string, programData: UpdateProgramRequest): Promise<APIResponse<Program>> {
    return apiClient.request<Program>('PUT', `/programs/${programId}`, programData);
  }

  /**
   * Delete a program
   */
  async deleteProgram(programId: string): Promise<APIResponse<void>> {
    return apiClient.request<void>('DELETE', `/programs/${programId}`);
  }

  /**
   * Get documents for a specific program
   */
  async getProgramDocuments(programId: string): Promise<APIResponse<ProgramDocument[]>> {
    return apiClient.request<ProgramDocument[]>('GET', `/programs/${programId}/documents`);
  }

  /**
   * Upload a document to a program
   */
  async uploadDocument(
    programId: string, 
    file: File, 
    metadata: UploadProgramDocumentRequest,
    onProgress?: (progress: number) => void
  ): Promise<APIResponse<ProgramDocument>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', metadata.documentType);
    formData.append('title', metadata.title);
    if (metadata.description) {
      formData.append('description', metadata.description);
    }

    return apiClient.upload<ProgramDocument>(
      `/programs/${programId}/documents`, 
      file, 
      onProgress
    );
  }

  /**
   * Delete a program document
   */
  async deleteDocument(programId: string, documentId: string): Promise<APIResponse<void>> {
    return apiClient.request<void>('DELETE', `/programs/${programId}/documents/${documentId}`);
  }

  /**
   * Download a program document
   */
  async downloadDocument(programId: string, documentId: string): Promise<APIResponse<Blob>> {
    return apiClient.request<Blob>('GET', `/programs/${programId}/documents/${documentId}/download`);
  }

  /**
   * Get program statistics (document count, analysis status, etc.)
   */
  async getProgramStats(programId: string): Promise<APIResponse<{
    documentCount: number;
    analysisCount: number;
    lastAnalysisDate?: string;
    completionStatus: 'incomplete' | 'complete' | 'in_progress';
  }>> {
    return apiClient.request('GET', `/programs/${programId}/stats`);
  }

  /**
   * Duplicate an existing program
   */
  async duplicateProgram(programId: string, newName: string): Promise<APIResponse<Program>> {
    return apiClient.request<Program>('POST', `/programs/${programId}/duplicate`, { name: newName });
  }

  /**
   * Archive a program (soft delete)
   */
  async archiveProgram(programId: string): Promise<APIResponse<void>> {
    return apiClient.request<void>('PUT', `/programs/${programId}/archive`);
  }

  /**
   * Restore an archived program
   */
  async restoreProgram(programId: string): Promise<APIResponse<void>> {
    return apiClient.request<void>('PUT', `/programs/${programId}/restore`);
  }
}

// Export singleton instance
export const programService = new ProgramService();