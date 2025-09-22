/**
 * AWS Cognito Configuration for Curriculum Alignment System
 * Provides TypeScript configuration for Cognito authentication
 */

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';

// Environment configuration
const region = process.env.AWS_REGION || 'eu-central-1';
const environment = process.env.NODE_ENV || 'dev';

// Cognito configuration interface
export interface CognitoConfig {
  region: string;
  userPoolId: string;
  userPoolWebClientId: string;
  userPoolMobileClientId: string;
  identityPoolId: string;
  userPoolDomain: string;
  redirectSignIn: string;
  redirectSignOut: string;
  responseType: 'code' | 'token';
  scopes: string[];
  authenticatedRole: string;
  unauthenticatedRole?: string;
}

// User attributes interface
export interface CognitoUserAttributes {
  email: string;
  given_name: string;
  family_name: string;
  'custom:department'?: string;
  'custom:role'?: string;
  'custom:university_id'?: string;
  'custom:access_level'?: string;
}

// User group types
export enum UserGroups {
  ADMINISTRATORS = 'administrators',
  FACULTY = 'faculty',
  STUDENTS = 'students'
}

// Access levels
export enum AccessLevels {
  ADMIN = 'admin',
  FACULTY = 'faculty',
  STUDENT = 'student',
  GUEST = 'guest'
}

// Department types for CEU
export enum CEUDepartments {
  COMPUTER_SCIENCE = 'Computer Science',
  MATHEMATICS = 'Mathematics',
  ECONOMICS = 'Economics',
  POLITICAL_SCIENCE = 'Political Science',
  HISTORY = 'History',
  PHILOSOPHY = 'Philosophy',
  BUSINESS = 'Business',
  LAW = 'Law',
  PUBLIC_POLICY = 'Public Policy',
  ENVIRONMENTAL_SCIENCE = 'Environmental Science'
}

// Role types
export enum UserRoles {
  PROFESSOR = 'professor',
  ASSOCIATE_PROFESSOR = 'associate_professor',
  ASSISTANT_PROFESSOR = 'assistant_professor',
  LECTURER = 'lecturer',
  TEACHING_ASSISTANT = 'teaching_assistant',
  STUDENT = 'student',
  ADMIN_STAFF = 'admin_staff',
  IT_STAFF = 'it_staff'
}

// Default Cognito configuration
export const defaultCognitoConfig: CognitoConfig = {
  region,
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  userPoolWebClientId: process.env.COGNITO_WEB_CLIENT_ID || '',
  userPoolMobileClientId: process.env.COGNITO_MOBILE_CLIENT_ID || '',
  identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID || '',
  userPoolDomain: process.env.COGNITO_USER_POOL_DOMAIN || '',
  redirectSignIn: process.env.NODE_ENV === 'production' 
    ? `https://${environment}.curriculum-alignment.ceu.edu/auth/callback`
    : 'http://localhost:3000/auth/callback',
  redirectSignOut: process.env.NODE_ENV === 'production'
    ? `https://${environment}.curriculum-alignment.ceu.edu/auth/logout`
    : 'http://localhost:3000/auth/logout',
  responseType: 'code',
  scopes: ['email', 'openid', 'profile', 'aws.cognito.signin.user.admin'],
  authenticatedRole: process.env.COGNITO_AUTHENTICATED_ROLE || '',
  unauthenticatedRole: process.env.COGNITO_UNAUTHENTICATED_ROLE
};

// Cognito service clients
export const cognitoIdentityProviderClient = new CognitoIdentityProviderClient({
  region: defaultCognitoConfig.region
});

export const cognitoIdentityClient = new CognitoIdentityClient({
  region: defaultCognitoConfig.region
});

// Authentication URLs
export const getAuthUrls = (config: CognitoConfig = defaultCognitoConfig) => {
  const baseUrl = `https://${config.userPoolDomain}.auth.${config.region}.amazoncognito.com`;
  
  return {
    signIn: `${baseUrl}/login?client_id=${config.userPoolWebClientId}&response_type=${config.responseType}&scope=${config.scopes.join('+')}&redirect_uri=${encodeURIComponent(config.redirectSignIn)}`,
    signUp: `${baseUrl}/signup?client_id=${config.userPoolWebClientId}&response_type=${config.responseType}&scope=${config.scopes.join('+')}&redirect_uri=${encodeURIComponent(config.redirectSignIn)}`,
    signOut: `${baseUrl}/logout?client_id=${config.userPoolWebClientId}&logout_uri=${encodeURIComponent(config.redirectSignOut)}`,
    forgotPassword: `${baseUrl}/forgotPassword?client_id=${config.userPoolWebClientId}&response_type=${config.responseType}&scope=${config.scopes.join('+')}&redirect_uri=${encodeURIComponent(config.redirectSignIn)}`
  };
};

// JWT Token interface
export interface CognitoTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// User info interface
export interface CognitoUser {
  username: string;
  email: string;
  emailVerified: boolean;
  givenName: string;
  familyName: string;
  department?: string;
  role?: string;
  universityId?: string;
  accessLevel?: string;
  groups: string[];
  sub: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

// Authentication state interface
export interface AuthState {
  isAuthenticated: boolean;
  user: CognitoUser | null;
  tokens: CognitoTokens | null;
  loading: boolean;
  error: string | null;
}

// Password policy configuration
export const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  temporaryPasswordValidityDays: 7
};

// MFA configuration
export const mfaConfig = {
  enabled: true,
  smsEnabled: true,
  totpEnabled: true,
  backupCodes: true
};

// Security configuration
export const securityConfig = {
  advancedSecurityMode: environment === 'prod' ? 'ENFORCED' : 'AUDIT',
  deviceTracking: true,
  riskConfiguration: {
    compromisedCredentialsRiskConfiguration: {
      actions: {
        eventAction: 'BLOCK'
      }
    },
    accountTakeoverRiskConfiguration: {
      actions: {
        highAction: { eventAction: 'BLOCK', notify: true },
        mediumAction: { eventAction: 'MFA_IF_CONFIGURED', notify: true },
        lowAction: { eventAction: 'NO_ACTION', notify: false }
      }
    }
  }
};

// Custom attribute validation
export const validateUserAttributes = (attributes: Partial<CognitoUserAttributes>): string[] => {
  const errors: string[] = [];
  
  // Email validation
  if (attributes.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attributes.email)) {
    errors.push('Invalid email format');
  }
  
  // CEU email validation for faculty/admin
  if (attributes['custom:role'] && 
      [UserRoles.PROFESSOR, UserRoles.ASSOCIATE_PROFESSOR, UserRoles.ASSISTANT_PROFESSOR].includes(attributes['custom:role'] as UserRoles) &&
      attributes.email && !attributes.email.endsWith('@ceu.edu')) {
    errors.push('Faculty members must use CEU email address');
  }
  
  // University ID validation
  if (attributes['custom:university_id'] && !/^[A-Z0-9]{8}$/.test(attributes['custom:university_id'])) {
    errors.push('University ID must be 8 alphanumeric characters');
  }
  
  // Department validation
  if (attributes['custom:department'] && 
      !Object.values(CEUDepartments).includes(attributes['custom:department'] as CEUDepartments)) {
    errors.push('Invalid department selection');
  }
  
  // Role validation
  if (attributes['custom:role'] && 
      !Object.values(UserRoles).includes(attributes['custom:role'] as UserRoles)) {
    errors.push('Invalid role selection');
  }
  
  // Access level validation
  if (attributes['custom:access_level'] && 
      !Object.values(AccessLevels).includes(attributes['custom:access_level'] as AccessLevels)) {
    errors.push('Invalid access level');
  }
  
  return errors;
};

// Group permission mapping
export const getGroupPermissions = (groups: string[]): string[] => {
  const permissions: Set<string> = new Set();
  
  groups.forEach(group => {
    switch (group) {
      case UserGroups.ADMINISTRATORS:
        permissions.add('system:admin');
        permissions.add('curriculum:create');
        permissions.add('curriculum:read');
        permissions.add('curriculum:update');
        permissions.add('curriculum:delete');
        permissions.add('user:manage');
        permissions.add('reports:generate');
        permissions.add('settings:configure');
        break;
        
      case UserGroups.FACULTY:
        permissions.add('curriculum:create');
        permissions.add('curriculum:read');
        permissions.add('curriculum:update');
        permissions.add('reports:generate');
        permissions.add('analysis:run');
        break;
        
      case UserGroups.STUDENTS:
        permissions.add('curriculum:read');
        permissions.add('reports:view');
        break;
    }
  });
  
  return Array.from(permissions);
};

// Token utility functions
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

export const getTokenPayload = (token: string): any => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

export const getUserFromToken = (idToken: string): CognitoUser | null => {
  const payload = getTokenPayload(idToken);
  if (!payload) return null;
  
  return {
    username: payload['cognito:username'] || payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified,
    givenName: payload.given_name,
    familyName: payload.family_name,
    department: payload['custom:department'],
    role: payload['custom:role'],
    universityId: payload['custom:university_id'],
    accessLevel: payload['custom:access_level'],
    groups: payload['cognito:groups'] || [],
    sub: payload.sub,
    iat: payload.iat,
    exp: payload.exp,
    aud: payload.aud,
    iss: payload.iss
  };
};

// Local storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'cognito_access_token',
  ID_TOKEN: 'cognito_id_token',
  REFRESH_TOKEN: 'cognito_refresh_token',
  USER_INFO: 'cognito_user_info',
  DEVICE_KEY: 'cognito_device_key'
};

// Error codes and messages
export const COGNITO_ERRORS = {
  UserNotConfirmedException: 'User account is not confirmed. Please check your email for verification instructions.',
  NotAuthorizedException: 'Invalid username or password.',
  TooManyRequestsException: 'Too many requests. Please try again later.',
  InvalidParameterException: 'Invalid parameter provided.',
  PasswordResetRequiredException: 'Password reset required. Please reset your password.',
  UserNotFoundException: 'User not found.',
  CodeMismatchException: 'Invalid verification code.',
  ExpiredCodeException: 'Verification code has expired.',
  LimitExceededException: 'Limit exceeded. Please try again later.',
  AliasExistsException: 'An account with this email already exists.',
  UsernameExistsException: 'Username already exists.'
};

// Configuration validation
export const validateCognitoConfig = (config: CognitoConfig): string[] => {
  const errors: string[] = [];
  
  if (!config.userPoolId) errors.push('User Pool ID is required');
  if (!config.userPoolWebClientId) errors.push('Web Client ID is required');
  if (!config.identityPoolId) errors.push('Identity Pool ID is required');
  if (!config.userPoolDomain) errors.push('User Pool Domain is required');
  if (!config.redirectSignIn) errors.push('Redirect Sign In URL is required');
  if (!config.redirectSignOut) errors.push('Redirect Sign Out URL is required');
  
  return errors;
};

// Export default configuration
export default defaultCognitoConfig;