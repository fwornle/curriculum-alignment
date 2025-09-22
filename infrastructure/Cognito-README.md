# AWS Cognito User Pool Configuration

This document describes the AWS Cognito User Pool setup for the Curriculum Alignment System authentication and authorization.

## Overview

The Cognito User Pool provides secure user authentication and authorization with:
- Email-based user registration and verification
- Multi-Factor Authentication (MFA) support
- Role-based access control (RBAC)
- Integration with AWS services through Identity Pools
- Hosted UI for authentication flows

## Architecture

### User Pool Structure
- **User Pool**: Main authentication service
- **User Pool Clients**: Web and mobile application clients
- **Identity Pool**: AWS service access federation
- **User Groups**: Role-based access control
- **Custom Attributes**: CEU-specific user metadata

### Authentication Flow
1. User signs in through Hosted UI or SDK
2. Cognito validates credentials and issues JWT tokens
3. Identity Pool exchanges tokens for AWS credentials
4. Application accesses AWS services with temporary credentials

## Files

### Infrastructure
- `infrastructure/cognito-user-pool.yaml`: CloudFormation template
- `src/auth/cognito-config.ts`: TypeScript configuration
- `scripts/setup-cognito.sh`: Deployment and management script

### Configuration Components
1. **User Pool**: Email authentication with password policies
2. **User Pool Clients**: Web (public) and mobile (confidential)
3. **Identity Pool**: AWS service access federation
4. **User Groups**: Administrators, Faculty, Students
5. **IAM Roles**: Permission sets for each user group

## Deployment

### Prerequisites
- AWS CLI configured with appropriate permissions
- CloudFormation service permissions
- SES verified email (production only)

### Commands

```bash
# Deploy Cognito User Pool
npm run cognito:setup

# Test configuration
npm run cognito:test

# View configuration info
npm run cognito:info

# Create test users (dev only)
npm run cognito:users

# Setup monitoring
npm run cognito:monitor
```

### Environment Variables
```bash
# Required for deployment
export COGNITO_ADMIN_EMAIL="admin@ceu.edu"

# Optional security settings
export NODE_ENV="dev|staging|prod"
export AWS_REGION="eu-central-1"
```

## User Management

### User Groups and Permissions

#### Administrators
- **Group**: `administrators`
- **Access**: Full system access
- **Permissions**: All CRUD operations, user management, system configuration
- **IAM Role**: Admin group role with broad AWS permissions

#### Faculty
- **Group**: `faculty`
- **Access**: Curriculum management
- **Permissions**: Create/read/update curricula, generate reports, run analysis
- **IAM Role**: Faculty group role with limited AWS permissions

#### Students
- **Group**: `students`
- **Access**: Read-only access
- **Permissions**: View curricula and reports
- **IAM Role**: Student group role with minimal AWS permissions

### Custom Attributes

#### Required Attributes
- `email`: User email address (CEU domain for faculty)
- `given_name`: First name
- `family_name`: Last name

#### Custom Attributes
- `custom:department`: CEU department (Computer Science, Mathematics, etc.)
- `custom:role`: User role (professor, student, admin_staff, etc.)
- `custom:university_id`: CEU ID number (8 alphanumeric characters)
- `custom:access_level`: System access level (admin, faculty, student, guest)

## Security Configuration

### Password Policy
- **Minimum Length**: 12 characters (14 in production)
- **Requirements**: Uppercase, lowercase, numbers, symbols
- **Temporary Password**: 7 days validity

### Multi-Factor Authentication
- **SMS MFA**: Available for all users
- **TOTP MFA**: Software token support (Google Authenticator, Authy)
- **Backup Codes**: Generated for account recovery
- **Configuration**: Enabled by default in staging/production

### Advanced Security
- **Risk-Based Authentication**: Adaptive authentication based on user behavior
- **Compromised Credentials**: Automatic detection and blocking
- **Device Tracking**: Remember trusted devices
- **Account Takeover Protection**: Multi-layered protection

### Security Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

## Token Configuration

### JWT Tokens
- **Access Token**: 1 hour validity
- **ID Token**: 1 hour validity
- **Refresh Token**: 30 days validity (14 days in production)

### Token Claims
```json
{
  "sub": "user-uuid",
  "email": "user@ceu.edu",
  "email_verified": true,
  "given_name": "John",
  "family_name": "Doe",
  "custom:department": "Computer Science",
  "custom:role": "professor",
  "custom:access_level": "faculty",
  "cognito:groups": ["faculty"],
  "aud": "client-id",
  "iss": "https://cognito-idp.region.amazonaws.com/pool-id"
}
```

## Integration Points

### Frontend (React)
```typescript
import { defaultCognitoConfig, getAuthUrls } from './auth/cognito-config';

// Authentication URLs
const authUrls = getAuthUrls();
window.location.href = authUrls.signIn;

// Token validation
const user = getUserFromToken(idToken);
const permissions = getGroupPermissions(user.groups);
```

### Backend (Lambda)
```typescript
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'id',
  clientId: process.env.COGNITO_WEB_CLIENT_ID,
});

const payload = await verifier.verify(token);
```

### API Gateway
- **Authorizer**: Cognito User Pool authorizer
- **Authorization**: Bearer token in Authorization header
- **Scopes**: OpenID Connect scopes for fine-grained access

## Monitoring and Alerts

### CloudWatch Metrics
- Sign-in success/failure rates
- User registration patterns
- MFA adoption rates
- Token usage statistics

### Security Alarms
- High failed sign-in attempts (>10 in 5 minutes)
- Suspicious authentication patterns
- Compromised credential detection
- Account takeover attempts

### SNS Notifications
- Security alerts to administrators
- Account verification emails
- Password reset notifications

## Custom Domain Setup (Optional)

### SSL Certificate
1. Request certificate in **us-east-1** (required for Cognito)
2. Validate domain ownership
3. Configure custom domain in User Pool

### DNS Configuration
```
CNAME: auth.curriculum-alignment.ceu.edu → cognito-domain.auth.region.amazoncognito.com
```

## Development vs Production

### Development Environment
- **MFA**: Disabled for easier testing
- **Password Policy**: Relaxed (8 characters minimum)
- **Test Users**: Automatically created
- **Security Mode**: Audit only

### Production Environment
- **MFA**: Enforced for all users
- **Password Policy**: Strict (14 characters minimum)
- **Test Users**: Not created
- **Security Mode**: Enforced
- **SES Integration**: Required for custom email templates

## Troubleshooting

### Common Issues

1. **User Not Confirmed**
   - Check email verification
   - Manually confirm user in console
   - Verify SES configuration

2. **Invalid Token**
   - Check token expiration
   - Verify audience and issuer
   - Ensure clock synchronization

3. **Access Denied**
   - Verify user group membership
   - Check IAM role permissions
   - Validate token claims

### Debugging Commands
```bash
# Check user status
aws cognito-idp admin-get-user --user-pool-id pool-id --username user@example.com

# List user groups
aws cognito-idp admin-list-groups-for-user --user-pool-id pool-id --username user@example.com

# Decode JWT token
echo "token" | cut -d. -f2 | base64 -d | jq
```

## Cost Optimization

### Free Tier Limits
- **Monthly Active Users**: 50,000 free
- **Additional Users**: $0.0055 per MAU
- **SMS MFA**: $0.50 per delivery

### Best Practices
- Use TOTP instead of SMS for MFA when possible
- Implement proper token caching
- Monitor usage with CloudWatch
- Clean up unused user accounts

## Backup and Recovery

### User Data Backup
- Export user data via Admin APIs
- Backup user attributes and group memberships
- Store backup in encrypted S3 bucket

### Disaster Recovery
- Multi-region User Pool setup (manual)
- Cross-region Identity Pool replication
- Automated backup procedures

## Compliance

### GDPR Compliance
- User data export capabilities
- Right to be forgotten (user deletion)
- Data processing consent management
- Audit trail logging

### Security Standards
- **OWASP**: Authentication and session management
- **NIST**: Password policy compliance
- **ISO 27001**: Security management practices

## Next Steps

1. **Task 9**: Configure API Gateway with Cognito authorizer
2. **Frontend Integration**: Implement authentication flows
3. **User Onboarding**: Create user management interface
4. **Testing**: Comprehensive authentication testing
5. **Documentation**: User guides and training materials

## References

- [Amazon Cognito Developer Guide](https://docs.aws.amazon.com/cognito/)
- [Cognito User Pool API Reference](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/)
- [JWT Token Verification](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html)
- [Security Best Practices](https://docs.aws.amazon.com/cognito/latest/developerguide/security-best-practices.html)