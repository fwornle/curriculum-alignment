/**
 * Authentication Middleware
 * 
 * Middleware for validating JWT tokens, handling authentication,
 * and enforcing role-based access control.
 */

import { Request, Response, NextFunction } from 'express';
import { authService, JWTTokenPayload } from '../services/auth.service';
import { User, UserRole } from '../database/models';

/**
 * Extended Request interface with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: User;
  tokenPayload?: JWTTokenPayload;
  sessionId?: string;
}

/**
 * Authentication result for middleware
 */
interface AuthMiddlewareResult {
  success: boolean;
  user?: User;
  tokenPayload?: JWTTokenPayload;
  error?: string;
  statusCode?: number;
}

/**
 * Role hierarchy for access control
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  'readonly': 1,
  'student': 2,
  'staff': 3,
  'faculty': 4,
  'admin': 5,
};

/**
 * Extract JWT token from request headers
 */
function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    // Support for API keys or other formats
    if (authHeader.startsWith('Token ')) {
      return authHeader.substring(6);
    }
  }

  // Check for token in query parameters (for WebSocket upgrades)
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  // Check for token in cookies
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
}

/**
 * Validate authentication token
 */
async function validateAuthToken(token: string): Promise<AuthMiddlewareResult> {
  try {
    const validation = await authService.validateToken(token);
    
    if (!validation.valid || !validation.user) {
      return {
        success: false,
        error: 'Invalid or expired token',
        statusCode: 401,
      };
    }

    return {
      success: true,
      user: validation.user,
      tokenPayload: validation.payload,
    };

  } catch (error) {
    console.error('Token validation error:', error);
    return {
      success: false,
      error: 'Token validation failed',
      statusCode: 401,
    };
  }
}

/**
 * Basic authentication middleware
 * Validates JWT token and attaches user to request
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractTokenFromRequest(req);
  
  if (!token) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'No authentication token provided',
    });
    return;
  }

  validateAuthToken(token)
    .then((result) => {
      if (!result.success) {
        res.status(result.statusCode || 401).json({
          error: 'Authentication failed',
          message: result.error,
        });
        return;
      }

      // Attach user and token information to request
      req.user = result.user;
      req.tokenPayload = result.tokenPayload;
      req.sessionId = result.tokenPayload?.jti || `session_${Date.now()}`;

      next();
    })
    .catch((error) => {
      console.error('Authentication middleware error:', error);
      res.status(500).json({
        error: 'Authentication service error',
        message: 'Internal server error during authentication',
      });
    });
}

/**
 * Optional authentication middleware
 * Validates token if present but doesn't require authentication
 */
export function optionalAuthenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractTokenFromRequest(req);
  
  if (!token) {
    // No token provided, continue without authentication
    next();
    return;
  }

  validateAuthToken(token)
    .then((result) => {
      if (result.success) {
        req.user = result.user;
        req.tokenPayload = result.tokenPayload;
        req.sessionId = result.tokenPayload?.jti || `session_${Date.now()}`;
      }
      // Continue regardless of validation result
      next();
    })
    .catch((error) => {
      console.error('Optional authentication error:', error);
      // Continue even if there's an error
      next();
    });
}

/**
 * Role-based authorization middleware factory
 */
export function requireRole(minimumRole: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
      return;
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role];
    const requiredRoleLevel = ROLE_HIERARCHY[minimumRole];

    if (userRoleLevel < requiredRoleLevel) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Minimum role required: ${minimumRole}, current role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}

/**
 * Specific role requirement middleware factory
 */
export function requireSpecificRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required roles: ${allowedRoles.join(', ')}, current role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRole('admin');

/**
 * Faculty or higher middleware
 */
export const requireFaculty = requireRole('faculty');

/**
 * Staff or higher middleware
 */
export const requireStaff = requireRole('staff');

/**
 * Student or higher middleware (basically any authenticated user except readonly)
 */
export const requireStudent = requireRole('student');

/**
 * Ownership validation middleware factory
 * Ensures user can only access their own resources
 */
export function requireOwnership(userIdField: string = 'userId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
      return;
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // Extract user ID from request parameters or body
    const resourceUserId = req.params[userIdField] || req.body[userIdField] || req.query[userIdField];
    
    if (!resourceUserId) {
      res.status(400).json({
        error: 'Invalid request',
        message: `Missing ${userIdField} parameter`,
      });
      return;
    }

    if (resourceUserId !== req.user.user_id) {
      res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources',
      });
      return;
    }

    next();
  };
}

/**
 * Rate limiting middleware factory
 * Basic rate limiting based on user ID
 */
export function rateLimit(maxRequests: number, windowMs: number) {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userId = req.user?.user_id || req.ip;
    const now = Date.now();
    
    const userRequests = requestCounts.get(userId);
    
    if (!userRequests || now > userRequests.resetTime) {
      // Reset or initialize counter
      requestCounts.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (userRequests.count >= maxRequests) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${maxRequests} per ${windowMs / 1000} seconds`,
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000),
      });
      return;
    }

    // Increment counter
    userRequests.count++;
    next();
  };
}

/**
 * API key authentication middleware
 * For service-to-service communication
 */
export function authenticateApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    res.status(401).json({
      error: 'API key required',
      message: 'X-API-Key header is required',
    });
    return;
  }

  // In a real implementation, you would validate the API key against a database
  // For now, we'll use a simple environment variable check
  const validApiKey = process.env.INTERNAL_API_KEY;
  
  if (!validApiKey || apiKey !== validApiKey) {
    res.status(401).json({
      error: 'Invalid API key',
      message: 'The provided API key is invalid',
    });
    return;
  }

  // Create a service user context
  req.user = {
    user_id: 'service-account',
    email: 'service@curriculum-alignment.internal',
    role: 'admin' as UserRole,
    ui_preferences: {},
    llm_model_preferences: {},
    created_at: new Date(),
    updated_at: new Date(),
  };

  next();
}

/**
 * WebSocket authentication middleware
 */
export async function authenticateWebSocket(token: string): Promise<{ success: boolean; user?: User; error?: string }> {
  if (!token) {
    return {
      success: false,
      error: 'Authentication token required',
    };
  }

  const result = await validateAuthToken(token);
  
  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: true,
    user: result.user,
  };
}

/**
 * Audit logging middleware
 * Logs authenticated user actions
 */
export function auditLog(action: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (req.user) {
      console.log(`[AUDIT] User ${req.user.email} (${req.user.role}) performed action: ${action}`, {
        userId: req.user.user_id,
        userRole: req.user.role,
        action,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method,
      });
    }
    next();
  };
}

/**
 * CORS middleware with authentication awareness
 */
export function authenticatedCors(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Set basic CORS headers
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
}

/**
 * Export all middleware functions
 */
export default {
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireSpecificRole,
  requireAdmin,
  requireFaculty,
  requireStaff,
  requireStudent,
  requireOwnership,
  rateLimit,
  authenticateApiKey,
  authenticateWebSocket,
  auditLog,
  authenticatedCors,
};