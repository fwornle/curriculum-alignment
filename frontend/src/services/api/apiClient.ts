import type { 
  APIResponse, 
  RequestOptions, 
  AuthTokens,
  APIMethod 
} from './types';

// Configuration
interface APIClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  maxRetryDelay: number;
}

class APIClientError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, any>;

  constructor(message: string, statusCode: number, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'APIClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

class APIClient {
  private config: APIClientConfig;
  private authTokens: AuthTokens | null = null;
  private refreshPromise: Promise<AuthTokens> | null = null;
  private store: any = null; // Will be set by setStore method
  
  constructor(config: Partial<APIClientConfig> = {}) {
    const defaultBaseURL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? 'http://localhost:3000/api'
      : 'https://ihqwce6c41.execute-api.eu-central-1.amazonaws.com/dev';
      
    this.config = {
      baseURL: (typeof window !== 'undefined' && (window as any).VITE_API_URL) || defaultBaseURL,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      maxRetryDelay: 10000,
      ...config
    };

    // Load tokens from localStorage on initialization
    this.loadTokensFromStorage();
  }

  // Method to inject Redux store for accessing auth state
  public setStore(store: any): void {
    this.store = store;
  }

  // Authentication methods
  public setAuthTokens(tokens: AuthTokens): void {
    this.authTokens = tokens;
    this.saveTokensToStorage(tokens);
  }

  public clearAuthTokens(): void {
    this.authTokens = null;
    this.removeTokensFromStorage();
  }

  public getAuthTokens(): AuthTokens | null {
    // First try to get from Redux store if available
    if (this.store) {
      const state = this.store.getState();
      if (state.auth?.tokens) {
        return state.auth.tokens;
      }
    }
    // Fallback to instance tokens
    return this.authTokens;
  }

  public isAuthenticated(): boolean {
    const tokens = this.getAuthTokens();
    return tokens !== null && !this.isTokenExpired(tokens);
  }

  private isTokenExpired(tokens: AuthTokens = this.getAuthTokens()): boolean {
    if (!tokens) return true;
    return Date.now() >= tokens.expiresAt;
  }

  private loadTokensFromStorage(): void {
    try {
      const storedTokens = localStorage.getItem('auth_tokens');
      if (storedTokens) {
        this.authTokens = JSON.parse(storedTokens);
      }
    } catch (error) {
      console.warn('Failed to load auth tokens from storage:', error);
      this.removeTokensFromStorage();
    }
  }

  private saveTokensToStorage(tokens: AuthTokens): void {
    try {
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    } catch (error) {
      console.error('Failed to save auth tokens to storage:', error);
    }
  }

  private removeTokensFromStorage(): void {
    try {
      localStorage.removeItem('auth_tokens');
    } catch (error) {
      console.warn('Failed to remove auth tokens from storage:', error);
    }
  }

  // Token refresh logic
  private async refreshTokens(): Promise<AuthTokens> {
    // If we have a store, dispatch refresh action
    if (this.store) {
      try {
        const refreshAction = await this.store.dispatch({ type: 'auth/refreshToken' });
        if (refreshAction.payload) {
          return refreshAction.payload;
        }
      } catch (error) {
        console.error('Redux token refresh failed:', error);
      }
    }

    // Fallback to legacy refresh logic
    if (!this.authTokens) {
      throw new APIClientError('No refresh token available', 401, 'NO_REFRESH_TOKEN');
    }

    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const newTokens = await this.refreshPromise;
      this.setAuthTokens(newTokens);
      return newTokens;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<AuthTokens> {
    const tokens = this.getAuthTokens();
    const response = await fetch(`${this.config.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: tokens?.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new APIClientError('Token refresh failed', response.status, 'TOKEN_REFRESH_FAILED');
    }

    const data: APIResponse<AuthTokens> = await response.json();
    
    if (!data.success || !data.data) {
      throw new APIClientError('Invalid refresh response', 400, 'INVALID_REFRESH_RESPONSE');
    }

    return data.data;
  }

  // HTTP request methods
  public async request<T>(
    method: APIMethod,
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.config.baseURL}${endpoint}`;
    const requestOptions = {
      timeout: this.config.timeout,
      retries: this.config.retries,
      retryDelay: this.config.retryDelay,
      ...options,
    };

    return this.executeRequest<T>(method, url, data, requestOptions);
  }

  public async get<T>(
    endpoint: string, 
    params?: Record<string, any>, 
    options?: RequestOptions
  ): Promise<APIResponse<T>> {
    const queryString = params ? this.buildQueryString(params) : '';
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request<T>('GET', url, undefined, options);
  }

  public async post<T>(
    endpoint: string, 
    data?: any, 
    options?: RequestOptions
  ): Promise<APIResponse<T>> {
    return this.request<T>('POST', endpoint, data, options);
  }

  public async put<T>(
    endpoint: string, 
    data?: any, 
    options?: RequestOptions
  ): Promise<APIResponse<T>> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  public async patch<T>(
    endpoint: string, 
    data?: any, 
    options?: RequestOptions
  ): Promise<APIResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  public async delete<T>(
    endpoint: string, 
    options?: RequestOptions
  ): Promise<APIResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  // File upload with progress
  public async upload<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void,
    options?: RequestOptions
  ): Promise<APIResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    const controller = new AbortController();
    const signal = options?.signal || controller.signal;

    try {
      const headers = await this.getHeaders(false, options);
      delete headers['Content-Type']; // Let browser set Content-Type for FormData

      const response = await this.fetchWithProgress(
        `${this.config.baseURL}${endpoint}`,
        {
          method: 'POST',
          headers,
          body: formData,
          signal,
        },
        onProgress
      );

      return this.handleResponse<T>(response);
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }

  // Private helper methods
  private async executeRequest<T>(
    method: APIMethod,
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    let attempt = 0;
    let lastError: Error;

    while (attempt <= (options.retries || this.config.retries)) {
      try {
        const response = await this.performRequest(method, url, data, options);
        return await this.handleResponse<T>(response);
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Don't retry on certain errors
        if (
          error instanceof APIClientError && 
          (error.statusCode === 400 || error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404)
        ) {
          break;
        }

        // Don't retry if we've exhausted attempts
        if (attempt > (options.retries || this.config.retries)) {
          break;
        }

        // Wait before retrying
        const delay = Math.min(
          this.config.retryDelay * Math.pow(2, attempt - 1),
          this.config.maxRetryDelay
        );
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private async performRequest(
    method: APIMethod,
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<Response> {
    const headers = await this.getHeaders(true, options);
    const controller = new AbortController();
    const signal = options.signal || controller.signal;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, options.timeout || this.config.timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal,
      };

      if (data && method !== 'GET') {
        fetchOptions.body = JSON.stringify(data);
      }

      const response = await fetch(url, fetchOptions);
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Public method for getting auth headers for external services
  public async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    
    const tokens = await this.getValidTokens();
    if (tokens) {
      headers['Authorization'] = `${tokens.tokenType} ${tokens.accessToken}`;
    }
    
    return headers;
  }

  private async getHeaders(
    includeContentType: boolean = true,
    options: RequestOptions = {}
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }

    headers['Accept'] = 'application/json';

    // Add authentication header
    if (!options.skipAuth) {
      const tokens = await this.getValidTokens();
      if (tokens) {
        headers['Authorization'] = `${tokens.tokenType} ${tokens.accessToken}`;
      }
    }

    return headers;
  }

  private async getValidTokens(): Promise<AuthTokens | null> {
    const tokens = this.getAuthTokens();
    if (!tokens) {
      return null;
    }

    if (!this.isTokenExpired(tokens)) {
      return tokens;
    }

    try {
      return await this.refreshTokens();
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearAuthTokens();
      
      // If we have a store, dispatch logout action
      if (this.store) {
        this.store.dispatch({ type: 'auth/logout' });
      }
      
      return null;
    }
  }

  private async handleResponse<T>(response: Response): Promise<APIResponse<T>> {
    const contentType = response.headers.get('Content-Type') || '';
    
    let responseData: any;
    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (error) {
        throw new APIClientError('Invalid JSON response', response.status, 'INVALID_JSON');
      }
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const error = this.createErrorFromResponse(response, responseData);
      throw error;
    }

    // Handle different response formats
    if (typeof responseData === 'object' && responseData !== null) {
      // If it looks like an API response, return as is
      if ('success' in responseData || 'data' in responseData || 'error' in responseData) {
        return responseData as APIResponse<T>;
      }
      
      // Otherwise wrap in standard format
      return {
        success: true,
        data: responseData as T,
        timestamp: new Date().toISOString(),
      };
    }

    // Handle text responses
    return {
      success: true,
      data: responseData as T,
      timestamp: new Date().toISOString(),
    };
  }

  private createErrorFromResponse(response: Response, data: any): APIClientError {
    let message = 'Request failed';
    let code = 'REQUEST_FAILED';
    let details: Record<string, any> = {};

    if (typeof data === 'object' && data !== null) {
      message = data.message || data.error || message;
      code = data.code || code;
      details = data.details || {};
    } else if (typeof data === 'string') {
      message = data;
    }

    return new APIClientError(message, response.status, code, details);
  }

  private handleRequestError(error: any): APIClientError {
    if (error instanceof APIClientError) {
      return error;
    }

    if (error.name === 'AbortError') {
      return new APIClientError('Request timeout', 408, 'TIMEOUT');
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new APIClientError('Network error', 0, 'NETWORK_ERROR');
    }

    return new APIClientError(
      error.message || 'Unknown error',
      500,
      'UNKNOWN_ERROR',
      { originalError: error.toString() }
    );
  }

  private buildQueryString(params: Record<string, any>): string {
    const urlParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(item => urlParams.append(key, item.toString()));
        } else {
          urlParams.append(key, value.toString());
        }
      }
    });

    return urlParams.toString();
  }

  private async fetchWithProgress(
    url: string,
    options: RequestInit,
    onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        const response = new Response(xhr.response, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Headers(
            xhr.getAllResponseHeaders()
              .split('\r\n')
              .filter(line => line.length > 0)
              .reduce((headers: Record<string, string>, line) => {
                const [key, value] = line.split(': ');
                if (key && value) {
                  headers[key] = value;
                }
                return headers;
              }, {})
          ),
        });
        resolve(response);
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Request aborted'));
      });

      xhr.open(options.method || 'GET', url);

      // Set headers
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value as string);
        });
      }

      xhr.send(options.body as XMLHttpRequestBodyInit | Document | null);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const apiClient = new APIClient();
export { APIClient, APIClientError };