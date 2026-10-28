/**
 * BillBook API Client
 * 
 * HTTP client for communicating with the Flask REST API backend.
 * Features:
 * - HTTPS base URL from EXPO_PUBLIC_API_URL
 * - Automatic X-API-Key and Content-Type headers
 * - Standardized error envelope mapping { error: { code, message } }
 * - Timeout and network offline error handling
 */

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string = 'NETWORK_ERROR', status: number = 0) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

// Local development defaults only. Production/web builds must set EXPO_PUBLIC_API_URL
// and EXPO_PUBLIC_API_KEY at build time.
const DEFAULT_API_URL = 'http://localhost:5000/api/v1';
const DEFAULT_DEV_API_KEY = 'billbook-secret-dev-key';

class ApiClient {
  private getBaseUrl(): string {
    const url = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
    // Strip trailing slash
    return url.replace(/\/+$/, '');
  }

  private getApiKey(): string {
    return process.env.EXPO_PUBLIC_API_KEY || (__DEV__ ? DEFAULT_DEV_API_KEY : '');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = 10000
  ): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.getBaseUrl()}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-API-Key': this.getApiKey(),
      ...(options.headers as Record<string, string>),
    };

    // If body is present and not multipart, ensure Content-Type is json
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', () => controller.abort());
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      const contentType = response.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorInfo = data?.error || {};
        const code = errorInfo.code || `HTTP_${response.status}`;
        const message = errorInfo.message || response.statusText || 'Request failed';
        throw new ApiClientError(message, code, response.status);
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err instanceof ApiClientError) {
        throw err;
      }

      if (err.name === 'AbortError') {
        throw new ApiClientError('Network request timed out. Please check your connection.', 'TIMEOUT', 408);
      }

      const networkMsg = err.message || 'Unable to connect to server. Please check your internet connection.';
      throw new ApiClientError(networkMsg, 'NETWORK_ERROR', 0);
    }
  }

  async get<T>(
    endpoint: string,
    queryParams?: Record<string, string | number | boolean | undefined>,
    timeoutMs: number = 15000
  ): Promise<T> {
    let url = endpoint;
    if (queryParams) {
      const parts: string[] = [];
      Object.entries(queryParams).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
        }
      });
      if (parts.length > 0) {
        url += (url.includes('?') ? '&' : '?') + parts.join('&');
      }
    }
    return this.request<T>(url, { method: 'GET' }, timeoutMs);
  }

  async post<T>(
    endpoint: string,
    body?: any,
    requestOptions?: RequestInit,
    timeoutMs: number = 15000
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
        ...requestOptions,
      },
      timeoutMs
    );
  }

  async patch<T>(endpoint: string, body?: any, timeoutMs: number = 15000): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      },
      timeoutMs
    );
  }

  async delete<T>(endpoint: string, timeoutMs: number = 15000): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, timeoutMs);
  }
}

export const apiClient = new ApiClient();
