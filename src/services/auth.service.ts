/**
 * Authentication Service
 * 
 * Integrates with AWS Cognito for user authentication, JWT validation,
 * and session management with comprehensive error handling.
 */

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  GetUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ChangePasswordCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  AdminGetUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  ListUsersCommand,
  AttributeType,
} from '@aws-sdk/client-cognito-identity-provider';
import { verify, sign, JwtPayload } from 'jsonwebtoken';
import { env, getAWSConfig } from '../config/environment';
import { query, namedQuery } from '../database';
import { User, CreateUserInput, UserRole } from '../database/models';

/**
 * Authentication result interface
 */
export interface AuthenticationResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  user?: User;
  challengeName?: string;
  challengeParameters?: Record<string, string>;
  session?: string;
  error?: string;
}

/**
 * JWT Token payload interface
 */
export interface JWTTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  'cognito:username': string;
  'cognito:groups'?: string[];
  exp: number;
  iat: number;
}

/**
 * User registration input
 */
export interface UserRegistrationInput {
  email: string;
  password: string;
  role: UserRole;
  attributes?: Record<string, string>;
}

/**
 * Password reset input
 */
export interface PasswordResetInput {
  email: string;
  newPassword: string;
  confirmationCode: string;
}

/**
 * User session information
 */
export interface UserSession {
  userId: string;
  email: string;
  role: UserRole;
  cognitoUsername: string;
  groups: string[];
  sessionId: string;
  expiresAt: Date;
  lastActivity: Date;
}

/**
 * Authentication Service Class
 */
export class AuthenticationService {
  private cognitoClient: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;
  private jwtSecret: string;

  constructor() {
    const awsConfig = getAWSConfig();
    
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: awsConfig.region,
    });
    
    this.userPoolId = awsConfig.cognito.userPoolId;
    this.clientId = awsConfig.cognito.clientId;
    this.jwtSecret = env.security.jwtSecret;

    if (!this.userPoolId || !this.clientId) {
      throw new Error('Cognito configuration is missing. Check COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID');
    }
  }

  /**
   * Authenticate user with email and password
   */
  async authenticate(email: string, password: string): Promise<AuthenticationResult> {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      const response = await this.cognitoClient.send(command);

      if (response.ChallengeName) {
        return {
          success: false,
          challengeName: response.ChallengeName,
          challengeParameters: response.ChallengeParameters,
          session: response.Session,
        };
      }

      if (response.AuthenticationResult) {
        const { AccessToken, RefreshToken, IdToken } = response.AuthenticationResult;
        
        // Get user information from database
        const user = await this.getUserByEmail(email);
        
        if (!user) {
          // If user doesn't exist in our database, create them
          const cognitoUser = await this.getCognitoUserByEmail(email);
          if (cognitoUser) {
            const newUser = await this.createUserFromCognito(cognitoUser);
            return {
              success: true,
              accessToken: AccessToken,
              refreshToken: RefreshToken,
              idToken: IdToken,
              user: newUser,
            };
          }
        }

        return {
          success: true,
          accessToken: AccessToken,
          refreshToken: RefreshToken,
          idToken: IdToken,
          user,
        };
      }

      return {
        success: false,
        error: 'Authentication failed - no result returned',
      };

    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: this.handleCognitoError(error),
      };
    }
  }

  /**
   * Validate JWT token and return user information
   */
  async validateToken(token: string): Promise<{ valid: boolean; user?: User; payload?: JWTTokenPayload }> {
    try {
      // First try to verify with our JWT secret (for internal tokens)
      let payload: JWTTokenPayload;
      
      try {
        payload = verify(token, this.jwtSecret) as JWTTokenPayload;
      } catch {
        // If that fails, it might be a Cognito token - validate with Cognito
        return await this.validateCognitoToken(token);
      }

      // Get user from database
      const user = await this.getUserByEmail(payload.email);
      
      if (!user) {
        return { valid: false };
      }

      return {
        valid: true,
        user,
        payload,
      };

    } catch (error) {
      console.error('Token validation error:', error);
      return { valid: false };
    }
  }

  /**
   * Validate Cognito JWT token
   */
  async validateCognitoToken(token: string): Promise<{ valid: boolean; user?: User; payload?: JWTTokenPayload }> {
    try {
      const command = new GetUserCommand({
        AccessToken: token,
      });

      const response = await this.cognitoClient.send(command);
      
      if (response.Username) {
        const email = response.UserAttributes?.find(attr => attr.Name === 'email')?.Value;
        
        if (email) {
          const user = await this.getUserByEmail(email);
          
          if (user) {
            // Create a payload-like object for consistency
            const payload: JWTTokenPayload = {
              sub: response.Username,
              email,
              role: user.role,
              'cognito:username': response.Username,
              exp: Math.floor(Date.now() / 1000) + 3600, // Assume 1 hour expiry
              iat: Math.floor(Date.now() / 1000),
            };

            return {
              valid: true,
              user,
              payload,
            };
          }
        }
      }

      return { valid: false };

    } catch (error) {
      console.error('Cognito token validation error:', error);
      return { valid: false };
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(refreshToken: string): Promise<AuthenticationResult> {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      });

      const response = await this.cognitoClient.send(command);

      if (response.AuthenticationResult) {
        const { AccessToken, IdToken } = response.AuthenticationResult;
        
        return {
          success: true,
          accessToken: AccessToken,
          idToken: IdToken,
          refreshToken, // Keep the same refresh token
        };
      }

      return {
        success: false,
        error: 'Failed to refresh tokens',
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: this.handleCognitoError(error),
      };
    }
  }

  /**
   * Register a new user
   */
  async registerUser(input: UserRegistrationInput): Promise<AuthenticationResult> {
    try {
      const userAttributes: AttributeType[] = [
        { Name: 'email', Value: input.email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:role', Value: input.role },
      ];

      // Add additional attributes if provided
      if (input.attributes) {
        Object.entries(input.attributes).forEach(([key, value]) => {
          userAttributes.push({ Name: key, Value: value });
        });
      }

      const command = new SignUpCommand({
        ClientId: this.clientId,
        Username: input.email,
        Password: input.password,
        UserAttributes: userAttributes,
      });

      const response = await this.cognitoClient.send(command);

      // Create user in our database
      const newUser = await this.createUser({
        email: input.email,
        role: input.role,
      });

      return {
        success: true,
        user: newUser,
      };

    } catch (error) {
      console.error('User registration error:', error);
      return {
        success: false,
        error: this.handleCognitoError(error),
      };
    }
  }

  /**
   * Initiate password reset
   */
  async initiatePasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email,
      });

      await this.cognitoClient.send(command);

      return { success: true };

    } catch (error) {
      console.error('Password reset initiation error:', error);
      return {
        success: false,
        error: this.handleCognitoError(error),
      };
    }
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(input: PasswordResetInput): Promise<{ success: boolean; error?: string }> {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.clientId,
        Username: input.email,
        ConfirmationCode: input.confirmationCode,
        Password: input.newPassword,
      });

      await this.cognitoClient.send(command);

      return { success: true };

    } catch (error) {
      console.error('Password reset confirmation error:', error);
      return {
        success: false,
        error: this.handleCognitoError(error),
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(accessToken: string, previousPassword: string, proposedPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const command = new ChangePasswordCommand({
        AccessToken: accessToken,
        PreviousPassword: previousPassword,
        ProposedPassword: proposedPassword,
      });

      await this.cognitoClient.send(command);

      return { success: true };

    } catch (error) {
      console.error('Password change error:', error);
      return {
        success: false,
        error: this.handleCognitoError(error),
      };
    }
  }

  /**
   * Create internal JWT token
   */
  createInternalToken(user: User, expiresIn: string = '24h'): string {
    const payload: Partial<JWTTokenPayload> = {
      sub: user.user_id,
      email: user.email,
      role: user.role,
      'cognito:username': user.email,
    };

    return sign(payload, this.jwtSecret, { expiresIn });
  }

  /**
   * Get user by email from database
   */
  private async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await namedQuery<User>(
        'SELECT * FROM users WHERE email = :email LIMIT 1',
        { email }
      );

      return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }

  /**
   * Get Cognito user by email
   */
  private async getCognitoUserByEmail(email: string): Promise<any> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      });

      return await this.cognitoClient.send(command);

    } catch (error) {
      console.error('Error fetching Cognito user:', error);
      return null;
    }
  }

  /**
   * Create user in database
   */
  private async createUser(input: CreateUserInput): Promise<User> {
    const result = await namedQuery<User>(
      `INSERT INTO users (email, role, ui_preferences, llm_model_preferences)
       VALUES (:email, :role, :uiPreferences, :llmPreferences)
       RETURNING *`,
      {
        email: input.email,
        role: input.role,
        uiPreferences: JSON.stringify(input.ui_preferences || {}),
        llmPreferences: JSON.stringify(input.llm_model_preferences || {}),
      }
    );

    return result.rows[0];
  }

  /**
   * Create user from Cognito user data
   */
  private async createUserFromCognito(cognitoUser: any): Promise<User> {
    const email = cognitoUser.UserAttributes?.find((attr: any) => attr.Name === 'email')?.Value;
    const role = cognitoUser.UserAttributes?.find((attr: any) => attr.Name === 'custom:role')?.Value || 'readonly';

    return await this.createUser({
      email,
      role: role as UserRole,
    });
  }

  /**
   * Handle Cognito errors and return user-friendly messages
   */
  private handleCognitoError(error: any): string {
    const errorCode = error.name || error.__type;

    switch (errorCode) {
      case 'NotAuthorizedException':
        return 'Invalid email or password';
      case 'UserNotFoundException':
        return 'User not found';
      case 'UserNotConfirmedException':
        return 'User account not confirmed';
      case 'PasswordResetRequiredException':
        return 'Password reset required';
      case 'UserLambdaValidationException':
        return 'User validation failed';
      case 'InvalidPasswordException':
        return 'Password does not meet requirements';
      case 'TooManyRequestsException':
        return 'Too many requests. Please try again later';
      case 'LimitExceededException':
        return 'Rate limit exceeded. Please try again later';
      case 'InvalidParameterException':
        return 'Invalid request parameters';
      case 'CodeMismatchException':
        return 'Invalid verification code';
      case 'ExpiredCodeException':
        return 'Verification code expired';
      case 'UsernameExistsException':
        return 'User already exists';
      default:
        console.error('Unknown Cognito error:', error);
        return 'Authentication service temporarily unavailable';
    }
  }

  /**
   * Admin: Create user
   */
  async adminCreateUser(email: string, role: UserRole, temporaryPassword?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const command = new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:role', Value: role },
        ],
        TemporaryPassword: temporaryPassword,
        MessageAction: 'SUPPRESS', // Don't send welcome email for now
      });

      await this.cognitoClient.send(command);

      // Create user in our database
      await this.createUser({ email, role });

      return { success: true };

    } catch (error) {
      console.error('Admin user creation error:', error);
      return {
        success: false,
        error: this.handleCognitoError(error),
      };
    }
  }

  /**
   * Admin: Disable user
   */
  async adminDisableUser(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const command = new AdminDisableUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      });

      await this.cognitoClient.send(command);

      return { success: true };

    } catch (error) {
      console.error('Admin user disable error:', error);
      return {
        success: false,
        error: this.handleCognitoError(error),
      };
    }
  }

  /**
   * Admin: Enable user
   */
  async adminEnableUser(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const command = new AdminEnableUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      });

      await this.cognitoClient.send(command);

      return { success: true };

    } catch (error) {
      console.error('Admin user enable error:', error);
      return {
        success: false,
        error: this.handleCognitoError(error),
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthenticationService();
export default authService;