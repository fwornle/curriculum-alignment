# Authentication Guide

This guide covers all authentication methods available in the MACAS API, security best practices, and troubleshooting common authentication issues.

## Authentication Overview

MACAS API supports two primary authentication methods:

1. **API Key Authentication** - Recommended for server-to-server integrations
2. **OAuth 2.0** - Required for user-specific actions and web applications

All API requests must be authenticated. Unauthenticated requests will receive a `401 Unauthorized` response.

## API Key Authentication

### Obtaining API Keys

**For CEU Users:**
1. Log into the MACAS dashboard at https://curriculum-alignment.ceu.edu
2. Navigate to **Settings** → **API Keys**
3. Click **"Generate New API Key"**
4. Provide a descriptive name for identification
5. Select appropriate permissions (read, write, admin)
6. Copy the generated key immediately (it won't be shown again)

**Key Properties:**
- Keys are unique 64-character strings
- They don't expire automatically but can be revoked
- Each key can have specific permissions assigned
- Keys are tied to your user account and inherit your base permissions

### Using API Keys

Include the API key in the `X-API-Key` header:

```http
GET /v1/programs
Host: api.curriculum-alignment.ceu.edu
X-API-Key: your-api-key-here
Content-Type: application/json
```

**Examples in different languages:**

```bash
# curl
curl -X GET "https://api.curriculum-alignment.ceu.edu/v1/programs" \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json"
```

```python
# Python with requests
import requests

headers = {
    'X-API-Key': 'your-api-key-here',
    'Content-Type': 'application/json'
}

response = requests.get(
    'https://api.curriculum-alignment.ceu.edu/v1/programs',
    headers=headers
)
```

```javascript
// JavaScript with fetch
const headers = {
    'X-API-Key': 'your-api-key-here',
    'Content-Type': 'application/json'
};

fetch('https://api.curriculum-alignment.ceu.edu/v1/programs', { headers })
    .then(response => response.json())
    .then(data => console.log(data));
```

```java
// Java with OkHttp
OkHttpClient client = new OkHttpClient();

Request request = new Request.Builder()
    .url("https://api.curriculum-alignment.ceu.edu/v1/programs")
    .addHeader("X-API-Key", "your-api-key-here")
    .addHeader("Content-Type", "application/json")
    .build();

Response response = client.newCall(request).execute();
```

### API Key Permissions

API keys can have the following permission scopes:

| Permission | Description | Endpoints Accessible |
|------------|-------------|----------------------|
| **read** | Read-only access | GET endpoints only |
| **write** | Read and write access | GET, POST, PUT, PATCH endpoints |
| **admin** | Full administrative access | All endpoints including user management |
| **analyze** | Analysis execution | Analysis and report generation endpoints |
| **bulk** | Bulk operations | Bulk import/export endpoints |

**Permission Inheritance:**
- `admin` includes all other permissions
- `write` includes `read` permission
- `analyze` includes `read` permission for analysis-related resources

### API Key Management

**Viewing Your Keys:**
```http
GET /v1/auth/api-keys
X-API-Key: your-admin-api-key
```

**Response:**
```json
{
  "data": [
    {
      "id": "key-uuid",
      "name": "Production Integration",
      "permissions": ["read", "write"],
      "lastUsed": "2024-03-15T10:30:00Z",
      "createdAt": "2024-01-15T09:00:00Z",
      "isActive": true
    }
  ]
}
```

**Revoking Keys:**
```http
DELETE /v1/auth/api-keys/{keyId}
X-API-Key: your-admin-api-key
```

## OAuth 2.0 Authentication

OAuth 2.0 is required for:
- Web applications that act on behalf of users
- Applications needing user-specific permissions
- External partner integrations

### OAuth 2.0 Flow

MACAS supports the Authorization Code flow with PKCE (Proof Key for Code Exchange) for enhanced security.

#### Step 1: Authorization Request

Redirect users to the authorization endpoint:

```
https://auth.ceu.edu/oauth/authorize?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  response_type=code&
  scope=read write&
  state=RANDOM_STATE_VALUE&
  code_challenge=CODE_CHALLENGE&
  code_challenge_method=S256
```

**Parameters:**
- `client_id`: Your application's client ID
- `redirect_uri`: Your registered redirect URI
- `response_type`: Always `code` for authorization code flow
- `scope`: Requested permissions (`read`, `write`, `admin`)
- `state`: Random value to prevent CSRF attacks
- `code_challenge`: Base64URL-encoded SHA256 hash of code verifier
- `code_challenge_method`: Always `S256`

**PKCE Implementation:**
```javascript
// Generate code verifier and challenge
function generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64URLEncode(array);
}

function generateCodeChallenge(verifier) {
    const hash = crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return hash.then(buffer => base64URLEncode(new Uint8Array(buffer)));
}

function base64URLEncode(buffer) {
    return btoa(String.fromCharCode(...buffer))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
```

#### Step 2: Authorization Response

After user consent, they're redirected to your callback URL:

```
https://yourapp.com/callback?
  code=AUTHORIZATION_CODE&
  state=SAME_STATE_VALUE
```

#### Step 3: Token Exchange

Exchange the authorization code for tokens:

```http
POST https://auth.ceu.edu/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET&
code=AUTHORIZATION_CODE&
redirect_uri=YOUR_REDIRECT_URI&
code_verifier=CODE_VERIFIER
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read write"
}
```

#### Step 4: Using Access Tokens

Include the access token in the Authorization header:

```http
GET /v1/programs
Host: api.curriculum-alignment.ceu.edu
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
```

### Token Refresh

Access tokens expire after 1 hour. Use the refresh token to get new tokens:

```http
POST https://auth.ceu.edu/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET&
refresh_token=REFRESH_TOKEN
```

**Automated Token Refresh Example:**
```javascript
class MacasApiClient {
    constructor(clientId, clientSecret, redirectUri) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
    }

    async makeRequest(method, endpoint, data = null) {
        // Check if token needs refresh
        if (this.tokenExpiry && Date.now() >= this.tokenExpiry) {
            await this.refreshAccessToken();
        }

        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
        };

        const response = await fetch(`https://api.curriculum-alignment.ceu.edu/v1${endpoint}`, {
            method,
            headers,
            body: data ? JSON.stringify(data) : null
        });

        if (response.status === 401) {
            // Token might be expired, try refresh
            await this.refreshAccessToken();
            return this.makeRequest(method, endpoint, data); // Retry once
        }

        return response.json();
    }

    async refreshAccessToken() {
        const response = await fetch('https://auth.ceu.edu/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: this.refreshToken
            })
        });

        const tokens = await response.json();
        this.accessToken = tokens.access_token;
        this.refreshToken = tokens.refresh_token;
        this.tokenExpiry = Date.now() + (tokens.expires_in * 1000);
    }
}
```

### OAuth Scopes

OAuth scopes define the level of access granted to your application:

| Scope | Description | API Permissions |
|-------|-------------|-----------------|
| **read** | Read-only access to user's resources | GET endpoints |
| **write** | Read and write access | GET, POST, PUT, PATCH endpoints |
| **admin** | Administrative access | All endpoints (if user has admin role) |

**Requesting Multiple Scopes:**
```
scope=read write admin
```

## Security Best Practices

### API Key Security

**✅ Do:**
- Store API keys in environment variables or secure credential stores
- Use different keys for different environments (dev, staging, production)
- Regularly rotate API keys
- Use minimal required permissions for each key
- Monitor API key usage for anomalies

**❌ Don't:**
- Hardcode API keys in source code
- Commit API keys to version control
- Share API keys via email or insecure channels
- Use production keys in development environments
- Use admin keys for routine operations

**Secure Storage Examples:**

```bash
# Environment variables
export MACAS_API_KEY="your-api-key-here"
export MACAS_API_URL="https://api.curriculum-alignment.ceu.edu/v1"
```

```python
# Python with python-decouple
from decouple import config

API_KEY = config('MACAS_API_KEY')
API_URL = config('MACAS_API_URL', default='https://api.curriculum-alignment.ceu.edu/v1')
```

```javascript
// Node.js with dotenv
require('dotenv').config();

const apiKey = process.env.MACAS_API_KEY;
const apiUrl = process.env.MACAS_API_URL || 'https://api.curriculum-alignment.ceu.edu/v1';
```

### OAuth Security

**PKCE (Proof Key for Code Exchange):**
Always use PKCE for OAuth flows to prevent authorization code interception attacks.

**State Parameter:**
Include a random state parameter to prevent CSRF attacks:

```javascript
// Generate random state
const state = crypto.randomBytes(16).toString('hex');

// Store state in session/localStorage
sessionStorage.setItem('oauth_state', state);

// Include in authorization URL
const authUrl = `https://auth.ceu.edu/oauth/authorize?...&state=${state}`;

// Verify state in callback
const urlParams = new URLSearchParams(window.location.search);
const returnedState = urlParams.get('state');
const storedState = sessionStorage.getItem('oauth_state');

if (returnedState !== storedState) {
    throw new Error('Invalid state parameter - possible CSRF attack');
}
```

**Token Storage:**
- Store tokens securely (encrypted local storage, secure cookies)
- Never store tokens in plain text
- Clear tokens on logout
- Use short-lived access tokens with refresh tokens

### HTTPS Requirements

All API communications must use HTTPS:
- HTTP requests are automatically redirected to HTTPS
- Certificates are validated automatically by most HTTP clients
- Custom certificate validation may be needed in some environments

### Rate Limiting and Abuse Prevention

**Implement Exponential Backoff:**
```python
import time
import random

def api_request_with_backoff(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = func()
            if response.status_code == 429:  # Rate limited
                wait_time = (2 ** attempt) + random.uniform(0, 1)
                time.sleep(wait_time)
                continue
            return response
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            time.sleep(2 ** attempt)
```

**Monitor Usage:**
```python
def monitor_rate_limits(response):
    if 'X-RateLimit-Remaining' in response.headers:
        remaining = int(response.headers['X-RateLimit-Remaining'])
        if remaining < 100:  # Less than 100 requests remaining
            print(f"Warning: Only {remaining} API requests remaining")
```

## Troubleshooting Authentication

### Common Issues and Solutions

#### 401 Unauthorized

**Possible Causes:**
- Invalid or expired API key
- Missing authentication header
- Expired OAuth token
- Revoked credentials

**Solutions:**
```python
def handle_auth_error(response):
    if response.status_code == 401:
        error_data = response.json()
        error_code = error_data.get('error', {}).get('code')
        
        if error_code == 'INVALID_API_KEY':
            print("API key is invalid or expired. Please generate a new key.")
        elif error_code == 'TOKEN_EXPIRED':
            print("OAuth token has expired. Attempting to refresh...")
            # Trigger token refresh
        elif error_code == 'MISSING_AUTH_HEADER':
            print("Authentication header is missing.")
        
        return False
    return True
```

#### 403 Forbidden

**Possible Causes:**
- Insufficient permissions for the requested operation
- Account suspended or deactivated
- Resource access restricted

**Solutions:**
- Verify your API key permissions in the dashboard
- Contact administrator to verify account status
- Check if you have access to the specific resource

#### OAuth Flow Issues

**Authorization Code Not Received:**
- Verify redirect URI matches exactly (including trailing slashes)
- Check that client ID is correct
- Ensure user completed the authorization process

**Token Exchange Fails:**
- Verify client secret is correct
- Check that authorization code hasn't expired (10-minute lifetime)
- Ensure code verifier matches the challenge

**Token Refresh Fails:**
- Check that refresh token hasn't expired (30-day lifetime)
- Verify client credentials are correct
- Ensure refresh token hasn't been revoked

### Testing Authentication

**Test API Key:**
```bash
curl -X GET "https://api.curriculum-alignment.ceu.edu/v1/health" \
  -H "X-API-Key: your-api-key-here" \
  -v  # Verbose output for debugging
```

**Test OAuth Token:**
```bash
curl -X GET "https://api.curriculum-alignment.ceu.edu/v1/users/me" \
  -H "Authorization: Bearer your-oauth-token" \
  -v
```

**Validate Token Information:**
```http
GET /v1/auth/validate
Authorization: Bearer your-oauth-token
```

**Response:**
```json
{
  "data": {
    "valid": true,
    "expiresAt": "2024-03-15T14:00:00Z",
    "scopes": ["read", "write"],
    "user": {
      "id": "uuid-user-id",
      "email": "user@ceu.edu",
      "role": "faculty"
    }
  }
}
```

### Debugging Tools

**HTTP Request Logging:**
```python
import logging
import http.client

# Enable HTTP debugging
http.client.HTTPConnection.debuglevel = 1
logging.basicConfig()
logging.getLogger().setLevel(logging.DEBUG)
requests_log = logging.getLogger("requests.packages.urllib3")
requests_log.setLevel(logging.DEBUG)
requests_log.propagate = True
```

**OAuth Flow Debugging:**
```javascript
// Log OAuth flow steps
function debugOAuthFlow() {
    console.log('1. Authorization URL:', authUrl);
    console.log('2. Code verifier:', codeVerifier);
    console.log('3. Code challenge:', codeChallenge);
    console.log('4. State:', state);
    
    // After callback
    console.log('5. Authorization code:', authCode);
    console.log('6. Token response:', tokenResponse);
}
```

## Migration Guide

### From Legacy Authentication

If you're migrating from a previous authentication system:

1. **Generate New API Keys:**
   - Old credentials will be deprecated
   - Generate new keys with appropriate permissions
   - Test new keys in development environment

2. **Update Code:**
   - Replace old authentication headers
   - Update API endpoints if changed
   - Test all authentication flows

3. **Monitor Usage:**
   - Track API usage during migration
   - Verify all integrations working correctly
   - Monitor error rates

### Best Practices for Production

**Key Rotation:**
```python
class ApiKeyRotation:
    def __init__(self):
        self.primary_key = os.getenv('MACAS_API_KEY_PRIMARY')
        self.backup_key = os.getenv('MACAS_API_KEY_BACKUP')
        
    def make_request(self, method, endpoint, data=None):
        try:
            # Try primary key first
            return self._request_with_key(self.primary_key, method, endpoint, data)
        except AuthenticationError:
            # Fallback to backup key
            return self._request_with_key(self.backup_key, method, endpoint, data)
    
    def _request_with_key(self, key, method, endpoint, data):
        headers = {'X-API-Key': key, 'Content-Type': 'application/json'}
        response = requests.request(method, f"{API_URL}{endpoint}", 
                                  headers=headers, json=data)
        if response.status_code == 401:
            raise AuthenticationError("Invalid API key")
        return response.json()
```

**Health Check Integration:**
```python
def verify_api_access():
    """Verify API access as part of application health check."""
    try:
        response = requests.get(f"{API_URL}/health", 
                              headers={'X-API-Key': API_KEY})
        return response.status_code == 200
    except Exception:
        return False

# Use in application startup
if not verify_api_access():
    raise Exception("Cannot access MACAS API - check credentials")
```

For additional authentication support, contact api-support@ceu.edu.