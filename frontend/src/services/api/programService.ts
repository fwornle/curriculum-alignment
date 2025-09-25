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
   * Upload a document to a program using S3 presigned URLs
   */
  async uploadDocument(
    programId: string, 
    file: File, 
    metadata: UploadProgramDocumentRequest,
    onProgress?: (progress: number) => void
  ): Promise<APIResponse<ProgramDocument>> {
    try {
      // Step 1: Request presigned URL from backend
      const presignedResponse = await apiClient.post<{
        uploadUrl: string;
        fileKey: string;
        documentId: string;
      }>(`/programs/${programId}/documents/presigned-url`, {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        documentType: metadata.documentType,
        title: metadata.title,
        description: metadata.description
      });

      if (!presignedResponse.success) {
        return {
          success: false,
          error: presignedResponse.error || 'Failed to get presigned URL',
          timestamp: new Date().toISOString()
        };
      }

      const { uploadUrl, fileKey, documentId } = presignedResponse.data;

      // Step 2: Upload file directly to S3
      await this.uploadToS3(file, uploadUrl, onProgress);

      // Step 3: Notify backend that upload is complete
      const completeResponse = await apiClient.post<ProgramDocument>(`/programs/${programId}/documents/upload-complete`, {
        documentId,
        fileKey,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });

      return completeResponse;
    } catch (error) {
      console.error('Upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Upload file directly to S3 using presigned URL
   */
  private async uploadToS3(
    file: File,
    presignedUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`S3 upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('S3 upload failed'));
      };

      xhr.ontimeout = () => {
        reject(new Error('S3 upload timeout'));
      };

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.timeout = 300000; // 5 minute timeout for large files
      xhr.send(file);
    });
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