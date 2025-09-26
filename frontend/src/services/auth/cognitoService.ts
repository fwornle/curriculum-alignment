import { Amplify } from 'aws-amplify'
import { 
  signIn, 
  signUp, 
  confirmSignUp, 
  signOut, 
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchAuthSession
} from '@aws-amplify/auth'

interface CognitoConfig {
  userPoolId: string
  userPoolClientId: string
  region: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface SignUpData {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface ConfirmSignUpData {
  username: string
  confirmationCode: string
}

export interface ForgotPasswordData {
  username: string
}

export interface ResetPasswordData {
  username: string
  confirmationCode: string
  newPassword: string
}

export interface CognitoUser {
  userId: string
  username: string
  email: string
  firstName: string
  lastName: string
  emailVerified: boolean
  phoneVerified?: boolean
  attributes: Record<string, any>
}

export interface AuthTokens {
  accessToken: string
  idToken: string
  refreshToken: string
  tokenType: string
  expiresAt: number
}

class CognitoService {
  private isConfigured = false

  constructor() {
    this.configure()
  }

  private configure(): void {
    const config: CognitoConfig = {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
      region: import.meta.env.VITE_COGNITO_REGION || 'eu-central-1'
    }

    if (!config.userPoolId || !config.userPoolClientId) {
      console.warn('Cognito configuration missing. Authentication will not work.')
      return
    }

    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: config.userPoolId,
          userPoolClientId: config.userPoolClientId,
          signUpVerificationMethod: 'code',
          loginWith: {
            email: true,
            username: false,
            phone: false
          }
        }
      }
    })

    this.isConfigured = true
  }

  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new Error('Cognito service is not properly configured')
    }
  }

  async signIn(credentials: LoginCredentials): Promise<{
    user: CognitoUser
    tokens: AuthTokens
  }> {
    this.ensureConfigured()

    try {
      const signInResult = await signIn({
        username: credentials.username,
        password: credentials.password
      })

      if (signInResult.isSignedIn) {
        const [currentUser, session] = await Promise.all([
          getCurrentUser(),
          fetchAuthSession()
        ])

        const user = this.mapUserAttributes(currentUser)
        const tokens = this.extractTokens(session)

        return { user, tokens }
      } else {
        throw new Error('Sign in incomplete. Additional steps required.')
      }
    } catch (error: any) {
      throw new Error(error.message || 'Sign in failed')
    }
  }

  async signUp(userData: SignUpData): Promise<{ userId: string; codeDeliveryDetails?: any }> {
    this.ensureConfigured()

    try {
      const signUpResult = await signUp({
        username: userData.username,
        password: userData.password,
        options: {
          userAttributes: {
            email: userData.email,
            given_name: userData.firstName,
            family_name: userData.lastName
          }
        }
      })

      return {
        userId: signUpResult.userId || userData.username,
        codeDeliveryDetails: signUpResult.nextStep
      }
    } catch (error: any) {
      throw new Error(error.message || 'Sign up failed')
    }
  }

  async confirmSignUp(data: ConfirmSignUpData): Promise<void> {
    this.ensureConfigured()

    try {
      await confirmSignUp({
        username: data.username,
        confirmationCode: data.confirmationCode
      })
    } catch (error: any) {
      throw new Error(error.message || 'Email confirmation failed')
    }
  }

  async resendConfirmationCode(username: string): Promise<any> {
    this.ensureConfigured()

    try {
      const result = await resendSignUpCode({ username })
      return result
    } catch (error: any) {
      throw new Error(error.message || 'Failed to resend confirmation code')
    }
  }

  async forgotPassword(data: ForgotPasswordData): Promise<any> {
    this.ensureConfigured()

    try {
      const result = await resetPassword({ username: data.username })
      return result.nextStep
    } catch (error: any) {
      throw new Error(error.message || 'Failed to initiate password reset')
    }
  }

  async confirmResetPassword(data: ResetPasswordData): Promise<void> {
    this.ensureConfigured()

    try {
      await confirmResetPassword({
        username: data.username,
        confirmationCode: data.confirmationCode,
        newPassword: data.newPassword
      })
    } catch (error: any) {
      throw new Error(error.message || 'Password reset failed')
    }
  }

  async signOut(): Promise<void> {
    this.ensureConfigured()

    try {
      await signOut()
    } catch (error: any) {
      // Still clear local state even if Cognito sign out fails
      console.error('Sign out error:', error)
    }
  }

  async getCurrentAuthenticatedUser(): Promise<{
    user: CognitoUser
    tokens: AuthTokens
  } | null> {
    this.ensureConfigured()

    try {
      const [currentUser, session] = await Promise.all([
        getCurrentUser(),
        fetchAuthSession()
      ])

      if (!currentUser || !session.tokens) {
        return null
      }

      const user = this.mapUserAttributes(currentUser)
      const tokens = this.extractTokens(session)

      return { user, tokens }
    } catch (error) {
      return null
    }
  }

  async refreshAuthSession(): Promise<AuthTokens> {
    this.ensureConfigured()

    try {
      const session = await fetchAuthSession({ forceRefresh: true })
      return this.extractTokens(session)
    } catch (error: any) {
      throw new Error(error.message || 'Session refresh failed')
    }
  }

  private mapUserAttributes(user: any): CognitoUser {
    // Extract attributes from the user object
    // In AWS Amplify v6, attributes can be in different locations
    const userAttributes = user.UserAttributes || user.attributes || {}
    
    // Helper function to get attribute value
    const getAttributeValue = (attributeName: string): string => {
      if (Array.isArray(userAttributes)) {
        // If UserAttributes is an array (from AdminGetUser)
        const attr = userAttributes.find((attr: any) => attr.Name === attributeName)
        return attr?.Value || ''
      } else if (typeof userAttributes === 'object') {
        // If attributes is an object
        return userAttributes[attributeName] || ''
      }
      return ''
    }

    return {
      userId: user.userId || user.username || user.sub,
      username: user.username || user.sub,
      email: user.signInDetails?.loginId || getAttributeValue('email') || user.email || '',
      firstName: getAttributeValue('given_name') || '',
      lastName: getAttributeValue('family_name') || '',
      emailVerified: getAttributeValue('email_verified') === 'true',
      phoneVerified: getAttributeValue('phone_number_verified') === 'true',
      attributes: userAttributes || {}
    }
  }

  private extractTokens(session: any): AuthTokens {
    const tokens = session.tokens
    if (!tokens) {
      throw new Error('No tokens available in session')
    }

    return {
      accessToken: tokens.accessToken?.toString() || '',
      idToken: tokens.idToken?.toString() || '',
      refreshToken: tokens.refreshToken?.toString() || '',
      tokenType: 'Bearer',
      expiresAt: tokens.accessToken?.payload?.exp * 1000 || Date.now() + 3600000
    }
  }

  getIsConfigured(): boolean {
    return this.isConfigured
  }
}

export const cognitoService = new CognitoService()