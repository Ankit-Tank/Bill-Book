/**
 * Common API error and response shapes
 */

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface ActionSuccessResponse {
  success: boolean;
  message: string;
}
