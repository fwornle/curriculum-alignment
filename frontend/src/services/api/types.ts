// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface APIError {
  message: string;
  code: string;
  details?: Record<string, any>;
  statusCode: number;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Authentication Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: 'Bearer';
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  preferences: Record<string, any>;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

// Program Types
export interface Program {
  id: string;
  name: string;
  degree: string;
  university: string;
  department: string;
  description: string;
  totalCredits: number;
  duration: string;
  level: 'undergraduate' | 'graduate';
  courses: Course[];
  requirements: ProgramRequirement[];
  lastUpdated: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  programId: string;
  name: string;
  code: string;
  credits: number;
  description?: string;
  learningOutcomes?: string[];
  prerequisites?: string[];
  semester?: string;
  year?: number;
}

export interface ProgramRequirement {
  id: string;
  type: 'core' | 'elective' | 'specialization';
  name: string;
  description: string;
  credits: number;
  courses: string[];
}

// Analysis Types
export interface Analysis {
  id: string;
  type: 'gap-analysis' | 'comparison' | 'alignment' | 'benchmark';
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  parameters: AnalysisParameters;
  results?: AnalysisResults;
  error?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
  createdBy: string;
}

export interface AnalysisParameters {
  sourceProgram?: string;
  targetProgram?: string;
  targetPrograms?: string[];
  standards?: string[];
  metrics?: string[];
  filters?: Record<string, any>;
}

export interface AnalysisResults {
  overallScore?: number;
  similarities?: Array<{
    category: string;
    score: number;
    details?: string;
  }>;
  differences?: Array<{
    category: string;
    description: string;
    severity?: 'low' | 'medium' | 'high';
  }>;
  gaps?: Array<{
    area: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
  recommendations?: string[];
  metrics?: Record<string, number>;
}

// Analysis Request Types
export interface CreateAnalysisRequest {
  type: 'gap-analysis' | 'comparison' | 'alignment' | 'benchmark';
  name: string;
  description?: string;
  parameters: AnalysisParameters;
}

export interface UpdateAnalysisRequest {
  name?: string;
  description?: string;
  parameters?: AnalysisParameters;
}

export type AnalysisResult = AnalysisResults;

// Workflow Types
export interface Workflow {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  agents: WorkflowAgent[];
  createdAt: string;
  updatedAt: string;
  estimatedCompletion?: string;
  error?: string;
}

export interface WorkflowAgent {
  agentType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: string;
  endTime?: string;
  error?: string;
  results?: any;
}

// Report Types
export interface Report {
  id: string;
  name: string;
  type: 'gap-analysis' | 'comparison' | 'benchmark' | 'custom';
  format: 'pdf' | 'excel' | 'word' | 'html';
  status: 'generating' | 'completed' | 'failed';
  parameters: ReportParameters;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
  createdBy: string;
  size?: number;
  pages?: number;
}

export interface ReportParameters {
  analysisId?: string;
  programIds?: string[];
  sections: string[];
  includeCharts: boolean;
  includeRawData: boolean;
  template: string;
  customOptions?: Record<string, any>;
}

// Document Types
export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'txt' | 'csv';
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  downloadUrl?: string;
  metadata: DocumentMetadata;
  createdAt: string;
  processedAt?: string;
  uploadedBy: string;
}

export interface DocumentMetadata {
  originalName: string;
  contentType: string;
  extractedContent?: string;
  processedData?: Record<string, any>;
  pageCount?: number;
  wordCount?: number;
  processingErrors?: string[];
}

// LLM Configuration Types
export interface LLMProvider {
  id: string;
  name: string;
  isActive: boolean;
  models: LLMModel[];
  apiKeyConfigured: boolean;
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface LLMModel {
  id: string;
  name: string;
  providerId: string;
  costPerToken: number;
  maxTokens: number;
  capabilities: string[];
  isActive: boolean;
}

export interface LLMConfiguration {
  id: string;
  agentType: string;
  providerId: string;
  modelId: string;
  parameters: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Chat Types
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    agentType?: string;
    model?: string;
    tokens?: number;
    processingTime?: number;
  };
}

export interface ChatSession {
  id: string;
  name?: string;
  userId: string;
  messages: ChatMessage[];
  context: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// System Status Types
export interface SystemStatus {
  agents: AgentStatus[];
  database: DatabaseStatus;
  services: ServiceStatus[];
  costs: CostMetrics;
  performance: PerformanceMetrics;
  timestamp: string;
}

export interface AgentStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastHeartbeat: string;
  responseTime: number;
  errorRate: number;
  activeJobs: number;
  version: string;
}

export interface DatabaseStatus {
  status: 'healthy' | 'degraded' | 'down';
  connectionPool: {
    active: number;
    idle: number;
    total: number;
    max: number;
  };
  queryTime: number;
  errorRate: number;
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  endpoint: string;
  responseTime: number;
  errorRate: number;
  lastCheck: string;
}

export interface CostMetrics {
  daily: number;
  monthly: number;
  projected: number;
  budget: number;
  breakdown: {
    llm: number;
    storage: number;
    compute: number;
    bandwidth: number;
  };
}

export interface PerformanceMetrics {
  avgResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

// Request/Response Helpers
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  skipAuth?: boolean;
  skipErrorHandling?: boolean;
  signal?: AbortSignal;
}

export interface ListParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

// Utility Types
export type APIMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}