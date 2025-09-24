# Security Management Guide

This guide covers security configuration, compliance, and security management procedures for the MACAS system.

## Security Architecture

### 🔐 Authentication and Authorization

**Multi-Factor Authentication Setup:**
```javascript
// backend/src/middleware/mfa.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');

class MFAService {
  static async generateSecret(userId) {
    const secret = speakeasy.generateSecret({
      name: `MACAS (${userId})`,
      issuer: 'Central European University',
      length: 32
    });
    
    // Store secret in database
    await User.updateMFASecret(userId, secret.base32);
    
    return {
      secret: secret.base32,
      qrCode: await QRCode.toDataURL(secret.otpauth_url),
      backupCodes: this.generateBackupCodes()
    };
  }
  
  static async verifyToken(userId, token) {
    const user = await User.findById(userId);
    if (!user.mfa_secret) {
      throw new Error('MFA not configured');
    }
    
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps of variance
    });
    
    if (verified) {
      await User.updateLastMFAVerification(userId);
    }
    
    return verified;
  }
  
  static generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }
    return codes;
  }
}

// MFA middleware
const requireMFA = async (req, res, next) => {
  const { user } = req;
  
  if (user.mfa_enabled && !req.session.mfa_verified) {
    return res.status(403).json({
      error: 'MFA_REQUIRED',
      message: 'Multi-factor authentication required'
    });
  }
  
  next();
};

module.exports = { MFAService, requireMFA };
```

**Role-Based Access Control (RBAC):**
```javascript
// backend/src/middleware/rbac.js
const permissions = {
  admin: [
    'users:create', 'users:read', 'users:update', 'users:delete',
    'programs:create', 'programs:read', 'programs:update', 'programs:delete',
    'documents:create', 'documents:read', 'documents:update', 'documents:delete',
    'analysis:create', 'analysis:read', 'analysis:update', 'analysis:delete',
    'reports:create', 'reports:read', 'reports:update', 'reports:delete',
    'system:configure', 'system:monitor', 'system:backup'
  ],
  faculty: [
    'programs:create', 'programs:read', 'programs:update',
    'documents:create', 'documents:read', 'documents:update',
    'analysis:create', 'analysis:read',
    'reports:create', 'reports:read'
  ],
  user: [
    'programs:read',
    'documents:read',
    'analysis:read',
    'reports:read'
  ]
};

const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    const { user } = req;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userPermissions = permissions[user.role] || [];
    
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: `Permission '${requiredPermission}' required`
      });
    }
    
    next();
  };
};

// Resource-based access control
const checkResourceAccess = (resourceType) => {
  return async (req, res, next) => {
    const { user } = req;
    const resourceId = req.params.id;
    
    try {
      let hasAccess = false;
      
      switch (resourceType) {
        case 'program':
          const program = await Program.findById(resourceId);
          hasAccess = user.role === 'admin' || 
                     program.created_by === user.id ||
                     program.collaborators.includes(user.id);
          break;
          
        case 'document':
          const document = await Document.findById(resourceId);
          const docProgram = await Program.findById(document.program_id);
          hasAccess = user.role === 'admin' || 
                     docProgram.created_by === user.id ||
                     docProgram.collaborators.includes(user.id);
          break;
          
        default:
          hasAccess = user.role === 'admin';
      }
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: 'Access denied to this resource'
        });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ error: 'Access check failed' });
    }
  };
};

module.exports = { checkPermission, checkResourceAccess, permissions };
```

### 🛡️ Data Encryption

**Encryption at Rest:**
```javascript
// backend/src/utils/encryption.js
const crypto = require('crypto');
const bcrypt = require('bcrypt');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.saltLength = 16;
    this.tagLength = 16;
    this.masterKey = Buffer.from(process.env.ENCRYPTION_MASTER_KEY, 'hex');
  }
  
  // Encrypt sensitive data
  encrypt(plaintext) {
    const salt = crypto.randomBytes(this.saltLength);
    const key = crypto.pbkdf2Sync(this.masterKey, salt, 100000, this.keyLength, 'sha256');
    const iv = crypto.randomBytes(this.ivLength);
    
    const cipher = crypto.createCipher(this.algorithm, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine salt + iv + tag + encrypted data
    return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]).toString('base64');
  }
  
  // Decrypt sensitive data
  decrypt(encryptedData) {
    const data = Buffer.from(encryptedData, 'base64');
    
    const salt = data.slice(0, this.saltLength);
    const iv = data.slice(this.saltLength, this.saltLength + this.ivLength);
    const tag = data.slice(this.saltLength + this.ivLength, this.saltLength + this.ivLength + this.tagLength);
    const encrypted = data.slice(this.saltLength + this.ivLength + this.tagLength);
    
    const key = crypto.pbkdf2Sync(this.masterKey, salt, 100000, this.keyLength, 'sha256');
    
    const decipher = crypto.createDecipher(this.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  // Hash passwords
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }
  
  // Verify passwords
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
  
  // Generate secure API keys
  generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  // Generate secure tokens
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('base64url');
  }
}

module.exports = new EncryptionService();
```

**Database Field Encryption:**
```sql
-- Create encrypted column types
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_field(data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(pgp_sym_encrypt(data, key), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_field(encrypted_data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(decode(encrypted_data, 'base64'), key);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add encrypted columns for sensitive data
ALTER TABLE users ADD COLUMN encrypted_personal_data TEXT;
ALTER TABLE documents ADD COLUMN encrypted_metadata TEXT;

-- Create indexes on encrypted fields (for searchable encryption)
CREATE INDEX idx_users_encrypted_search ON users 
    USING GIN(to_tsvector('english', decrypt_field(encrypted_personal_data, current_setting('app.encryption_key'))));
```

### 🌐 Network Security

**Nginx Security Configuration:**
```nginx
# /etc/macas/nginx/security.conf

# Security headers
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

# Content Security Policy
add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https: blob:;
    connect-src 'self' wss: https:;
    media-src 'self';
    object-src 'none';
    child-src 'self';
    worker-src 'self';
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'self';
    upgrade-insecure-requests;
" always;

# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Hide server information
server_tokens off;
more_clear_headers Server;

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=1r/m;

# Request size limits
client_max_body_size 50M;
client_body_buffer_size 128k;
client_header_buffer_size 1k;
large_client_header_buffers 4 4k;

# Timeout settings
client_body_timeout 12;
client_header_timeout 12;
keepalive_timeout 15;
send_timeout 10;

# Buffer overflow protection
client_body_buffer_size 128k;
client_header_buffer_size 1k;
client_max_body_size 50m;
large_client_header_buffers 4 4k;
```

**WAF Configuration with ModSecurity:**
```nginx
# Load ModSecurity module
load_module modules/ngx_http_modsecurity_module.so;

http {
    # ModSecurity configuration
    modsecurity on;
    modsecurity_rules_file /etc/nginx/modsec/main.conf;
    
    # OWASP Core Rule Set
    include /etc/nginx/modsec/owasp-crs/*.conf;
    
    server {
        listen 443 ssl http2;
        server_name curriculum-alignment.ceu.edu;
        
        # Apply rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
        }
        
        location /auth/ {
            limit_req zone=auth burst=5 nodelay;
            proxy_pass http://backend;
        }
        
        location /upload {
            limit_req zone=upload burst=3 nodelay;
            proxy_pass http://backend;
        }
        
        # Block common attack patterns
        location ~ /\. {
            deny all;
            access_log off;
            log_not_found off;
        }
        
        # Block access to sensitive files
        location ~* \.(sql|log|conf|ini|env)$ {
            deny all;
            access_log off;
            log_not_found off;
        }
    }
}
```

## Security Monitoring

### 🔍 Intrusion Detection

**Security Event Monitoring:**
```javascript
// backend/src/middleware/securityLogger.js
const winston = require('winston');
const geoip = require('geoip-lite');

class SecurityLogger {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: '/var/log/macas/security.log' }),
        new winston.transports.Console({ level: 'warn' })
      ]
    });
  }
  
  logSecurityEvent(eventType, req, additionalData = {}) {
    const ip = req.ip || req.connection.remoteAddress;
    const geo = geoip.lookup(ip);
    const userAgent = req.get('User-Agent');
    
    const event = {
      timestamp: new Date().toISOString(),
      eventType,
      severity: this.getSeverity(eventType),
      source: {
        ip,
        country: geo?.country || 'Unknown',
        city: geo?.city || 'Unknown',
        userAgent,
        sessionId: req.sessionID
      },
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      } : null,
      request: {
        method: req.method,
        url: req.originalUrl,
        headers: this.sanitizeHeaders(req.headers)
      },
      ...additionalData
    };
    
    this.logger.log(event.severity, 'Security Event', event);
    
    // Send to SIEM if critical
    if (event.severity === 'critical') {
      this.sendToSIEM(event);
    }
  }
  
  getSeverity(eventType) {
    const severityMap = {
      'failed_login': 'info',
      'multiple_failed_logins': 'warn',
      'account_locked': 'warn',
      'suspicious_activity': 'warn',
      'privilege_escalation': 'critical',
      'unauthorized_access': 'critical',
      'data_breach': 'critical',
      'injection_attempt': 'critical'
    };
    
    return severityMap[eventType] || 'info';
  }
  
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    delete sanitized.authorization;
    delete sanitized.cookie;
    return sanitized;
  }
  
  async sendToSIEM(event) {
    // Send to external SIEM system
    // Implementation depends on your SIEM solution
    try {
      // Example: Send to Splunk, ELK, or other SIEM
      console.log('Sending critical security event to SIEM:', event.eventType);
    } catch (error) {
      console.error('Failed to send event to SIEM:', error);
    }
  }
}

// Security monitoring middleware
const securityLogger = new SecurityLogger();

const monitorSecurity = (req, res, next) => {
  // Monitor for suspicious patterns
  const suspiciousPatterns = [
    /union.*select/i,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /../i,
    /etc\/passwd/i,
    /\/\*.*\*\//,
    /;.*drop/i
  ];
  
  const requestBody = JSON.stringify(req.body || {});
  const queryString = req.url;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestBody) || pattern.test(queryString)) {
      securityLogger.logSecurityEvent('injection_attempt', req, {
        detectedPattern: pattern.toString(),
        requestBody: requestBody.substring(0, 500),
        queryString
      });
      
      return res.status(400).json({
        error: 'SECURITY_VIOLATION',
        message: 'Suspicious activity detected'
      });
    }
  }
  
  next();
};

module.exports = { SecurityLogger, securityLogger, monitorSecurity };
```

**Failed Login Monitoring:**
```javascript
// backend/src/middleware/loginAttempts.js
const Redis = require('redis');
const redis = Redis.createClient(process.env.REDIS_URL);

class LoginAttemptMonitor {
  constructor() {
    this.maxAttempts = 5;
    this.lockoutDuration = 15 * 60; // 15 minutes
    this.windowDuration = 60 * 60; // 1 hour
  }
  
  async recordFailedAttempt(identifier) {
    const key = `failed_attempts:${identifier}`;
    const attempts = await redis.incr(key);
    await redis.expire(key, this.windowDuration);
    
    if (attempts >= this.maxAttempts) {
      await this.lockAccount(identifier);
      return { locked: true, attempts };
    }
    
    return { locked: false, attempts };
  }
  
  async recordSuccessfulLogin(identifier) {
    const key = `failed_attempts:${identifier}`;
    await redis.del(key);
    await this.unlockAccount(identifier);
  }
  
  async lockAccount(identifier) {
    const lockKey = `account_locked:${identifier}`;
    await redis.setex(lockKey, this.lockoutDuration, 'locked');
    
    // Log security event
    console.log(`Account locked due to multiple failed attempts: ${identifier}`);
    
    // Send alert
    await this.sendLockoutAlert(identifier);
  }
  
  async unlockAccount(identifier) {
    const lockKey = `account_locked:${identifier}`;
    await redis.del(lockKey);
  }
  
  async isAccountLocked(identifier) {
    const lockKey = `account_locked:${identifier}`;
    const locked = await redis.get(lockKey);
    return locked === 'locked';
  }
  
  async getFailedAttempts(identifier) {
    const key = `failed_attempts:${identifier}`;
    return parseInt(await redis.get(key) || '0');
  }
  
  async sendLockoutAlert(identifier) {
    // Send notification to administrators
    const alertData = {
      type: 'ACCOUNT_LOCKOUT',
      identifier,
      timestamp: new Date().toISOString(),
      severity: 'warning'
    };
    
    // Implementation depends on notification system
    console.log('Account lockout alert:', alertData);
  }
}

module.exports = new LoginAttemptMonitor();
```

### 📊 Security Metrics and Alerting

**Security Metrics Collection:**
```javascript
// backend/src/monitoring/securityMetrics.js
const prometheus = require('prom-client');

// Security-specific metrics
const securityMetrics = {
  failedLogins: new prometheus.Counter({
    name: 'security_failed_login_attempts_total',
    help: 'Total number of failed login attempts',
    labelNames: ['ip', 'user_agent', 'country']
  }),
  
  accountLockouts: new prometheus.Counter({
    name: 'security_account_lockouts_total',
    help: 'Total number of account lockouts',
    labelNames: ['reason']
  }),
  
  suspiciousActivities: new prometheus.Counter({
    name: 'security_suspicious_activities_total',
    help: 'Total number of suspicious activities detected',
    labelNames: ['type', 'severity']
  }),
  
  authenticationEvents: new prometheus.Counter({
    name: 'security_authentication_events_total',
    help: 'Total number of authentication events',
    labelNames: ['event_type', 'result']
  }),
  
  mfaVerifications: new prometheus.Counter({
    name: 'security_mfa_verifications_total',
    help: 'Total number of MFA verification attempts',
    labelNames: ['result']
  }),
  
  permissionDenials: new prometheus.Counter({
    name: 'security_permission_denials_total',
    help: 'Total number of permission denials',
    labelNames: ['resource', 'action', 'user_role']
  })
};

// Middleware to collect security metrics
const collectSecurityMetrics = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Track authentication events
    if (req.path.includes('/auth/')) {
      const result = res.statusCode < 400 ? 'success' : 'failure';
      securityMetrics.authenticationEvents.inc({
        event_type: req.path.split('/').pop(),
        result
      });
      
      if (result === 'failure') {
        const geo = geoip.lookup(req.ip);
        securityMetrics.failedLogins.inc({
          ip: req.ip,
          user_agent: req.get('User-Agent'),
          country: geo?.country || 'Unknown'
        });
      }
    }
    
    // Track permission denials
    if (res.statusCode === 403) {
      securityMetrics.permissionDenials.inc({
        resource: req.path.split('/')[2] || 'unknown',
        action: req.method.toLowerCase(),
        user_role: req.user?.role || 'anonymous'
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = { securityMetrics, collectSecurityMetrics };
```

**Security Alerting Rules:**
```yaml
# /etc/prometheus/security-alerts.yml
groups:
  - name: security
    rules:
      # High rate of failed logins
      - alert: HighFailedLoginRate
        expr: rate(security_failed_login_attempts_total[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High rate of failed login attempts detected"
          description: "{{ $value }} failed login attempts per second in the last 5 minutes"
      
      # Multiple account lockouts
      - alert: MultipleAccountLockouts
        expr: increase(security_account_lockouts_total[15m]) > 5
        for: 0s
        labels:
          severity: critical
        annotations:
          summary: "Multiple account lockouts detected"
          description: "{{ $value }} account lockouts in the last 15 minutes"
      
      # Suspicious activity spike
      - alert: SuspiciousActivitySpike
        expr: rate(security_suspicious_activities_total[10m]) > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Spike in suspicious activities detected"
          description: "{{ $value }} suspicious activities per second in the last 10 minutes"
      
      # Permission denial rate
      - alert: HighPermissionDenialRate
        expr: rate(security_permission_denials_total[5m]) > 20
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High rate of permission denials"
          description: "{{ $value }} permission denials per second in the last 5 minutes"
      
      # MFA failure rate
      - alert: HighMFAFailureRate
        expr: rate(security_mfa_verifications_total{result="failure"}[10m]) / rate(security_mfa_verifications_total[10m]) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High MFA failure rate detected"
          description: "{{ $value | humanizePercentage }} of MFA verifications are failing"
```

## Compliance and Auditing

### 📋 GDPR Compliance

**Data Subject Rights Implementation:**
```javascript
// backend/src/services/gdprService.js
const EncryptionService = require('../utils/encryption');

class GDPRService {
  // Right to Access - Article 15
  async exportUserData(userId) {
    const userData = {
      personal_data: await this.getUserPersonalData(userId),
      processing_activities: await this.getProcessingActivities(userId),
      data_categories: await this.getDataCategories(userId),
      retention_periods: await this.getRetentionPeriods(userId),
      third_party_sharing: await this.getThirdPartySharing(userId)
    };
    
    // Log data access request
    await this.logGDPRActivity('data_export', userId, {
      exported_records: Object.keys(userData).length,
      timestamp: new Date().toISOString()
    });
    
    return userData;
  }
  
  // Right to Rectification - Article 16
  async updateUserData(userId, updates, requestedBy) {
    const before = await this.getUserPersonalData(userId);
    
    // Apply updates
    const updated = await User.updatePersonalData(userId, updates);
    
    // Log rectification
    await this.logGDPRActivity('data_rectification', userId, {
      requested_by: requestedBy,
      changes: this.calculateChanges(before, updates),
      timestamp: new Date().toISOString()
    });
    
    return updated;
  }
  
  // Right to Erasure - Article 17
  async deleteUserData(userId, reason, requestedBy) {
    // Check if deletion is legally required
    const canDelete = await this.canDeleteUserData(userId);
    
    if (!canDelete.allowed) {
      throw new Error(`Deletion not permitted: ${canDelete.reason}`);
    }
    
    // Perform deletion
    const deletedData = await this.performDataDeletion(userId);
    
    // Log erasure
    await this.logGDPRActivity('data_erasure', userId, {
      reason,
      requested_by: requestedBy,
      deleted_records: deletedData.length,
      timestamp: new Date().toISOString()
    });
    
    return deletedData;
  }
  
  // Right to Data Portability - Article 20
  async exportPortableData(userId, format = 'json') {
    const portableData = {
      user_profile: await this.getPortableUserData(userId),
      programs: await this.getPortableProgramData(userId),
      documents: await this.getPortableDocumentData(userId),
      analysis_results: await this.getPortableAnalysisData(userId)
    };
    
    // Format data based on request
    const formattedData = this.formatPortableData(portableData, format);
    
    await this.logGDPRActivity('data_portability', userId, {
      format,
      exported_size: JSON.stringify(formattedData).length,
      timestamp: new Date().toISOString()
    });
    
    return formattedData;
  }
  
  // Right to Object - Article 21
  async processObjectionRequest(userId, processingType, reason) {
    // Check if objection is valid
    const canObject = await this.canObjectToProcessing(userId, processingType);
    
    if (!canObject.allowed) {
      throw new Error(`Objection not permitted: ${canObject.reason}`);
    }
    
    // Stop or modify processing
    const result = await this.handleProcessingObjection(userId, processingType);
    
    await this.logGDPRActivity('processing_objection', userId, {
      processing_type: processingType,
      reason,
      action_taken: result.action,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }
  
  async logGDPRActivity(activityType, userId, details) {
    await GDPRAuditLog.create({
      activity_type: activityType,
      user_id: userId,
      details: EncryptionService.encrypt(JSON.stringify(details)),
      timestamp: new Date(),
      ip_address: details.ip_address,
      user_agent: details.user_agent
    });
  }
}
```

### 🔍 Security Auditing

**Audit Log System:**
```javascript
// backend/src/services/auditService.js
class AuditService {
  static async logEvent(eventType, userId, resourceId, details) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      event_type: eventType,
      user_id: userId,
      resource_type: details.resourceType,
      resource_id: resourceId,
      action: details.action,
      result: details.result || 'success',
      ip_address: details.ipAddress,
      user_agent: details.userAgent,
      session_id: details.sessionId,
      additional_data: details.additionalData || {}
    };
    
    // Store in audit table
    await AuditLog.create(auditEntry);
    
    // Send to external audit system if configured
    if (process.env.EXTERNAL_AUDIT_ENABLED === 'true') {
      await this.sendToExternalAudit(auditEntry);
    }
  }
  
  static async generateAuditReport(startDate, endDate, filters = {}) {
    const query = {
      timestamp: {
        $gte: startDate,
        $lte: endDate
      },
      ...filters
    };
    
    const auditEntries = await AuditLog.find(query).sort({ timestamp: -1 });
    
    const report = {
      period: { start: startDate, end: endDate },
      total_events: auditEntries.length,
      events_by_type: this.groupByEventType(auditEntries),
      events_by_user: this.groupByUser(auditEntries),
      failed_events: auditEntries.filter(e => e.result !== 'success'),
      security_events: auditEntries.filter(e => e.event_type.includes('security'))
    };
    
    return report;
  }
  
  static async detectSuspiciousActivity() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Multiple failed logins
    const failedLogins = await AuditLog.aggregate([
      { $match: { 
          event_type: 'user_login', 
          result: 'failure',
          timestamp: { $gte: twentyFourHoursAgo }
        }},
      { $group: { 
          _id: '$user_id', 
          count: { $sum: 1 },
          ips: { $addToSet: '$ip_address' }
        }},
      { $match: { count: { $gte: 5 } } }
    ]);
    
    // Unusual access patterns
    const unusualAccess = await AuditLog.aggregate([
      { $match: { timestamp: { $gte: twentyFourHoursAgo } }},
      { $group: { 
          _id: { user_id: '$user_id', ip_address: '$ip_address' },
          count: { $sum: 1 },
          event_types: { $addToSet: '$event_type' }
        }},
      { $match: { count: { $gte: 100 } } } // High activity threshold
    ]);
    
    return {
      failed_logins: failedLogins,
      unusual_access: unusualAccess,
      generated_at: new Date().toISOString()
    };
  }
}
```

**Compliance Monitoring Script:**
```bash
#!/bin/bash
# /opt/macas/scripts/compliance-check.sh

set -euo pipefail

LOG_FILE="/var/log/macas/compliance-check.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

log_message() {
    echo "[$DATE] $1" | tee -a "$LOG_FILE"
}

log_message "Starting compliance check"

# Check SSL certificate expiration
log_message "Checking SSL certificates"
openssl x509 -in /etc/macas/ssl/certificate.pem -checkend 2592000 -noout
if [ $? -ne 0 ]; then
    log_message "WARNING: SSL certificate expires within 30 days"
    # Send alert
    curl -X POST "$SLACK_WEBHOOK_URL" -H 'Content-type: application/json' \
        --data '{"text":"SSL certificate for MACAS expires within 30 days"}'
fi

# Check password policy compliance
log_message "Checking password policy compliance"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    COUNT(*) as non_compliant_users,
    'Password policy check' as check_type
FROM users 
WHERE password_updated < NOW() - INTERVAL '90 days'
OR mfa_enabled = false;
" >> "$LOG_FILE"

# Check data retention compliance
log_message "Checking data retention compliance"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    'Old analysis results' as data_type,
    COUNT(*) as records_to_cleanup
FROM analysis_results 
WHERE created_at < NOW() - INTERVAL '2 years'
AND status = 'completed';

SELECT 
    'Old audit logs' as data_type,
    COUNT(*) as records_to_cleanup
FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '7 years';
" >> "$LOG_FILE"

# Check access control compliance
log_message "Checking access control compliance"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    'Users without recent activity' as check_type,
    COUNT(*) as inactive_users
FROM users 
WHERE last_login < NOW() - INTERVAL '6 months'
AND is_active = true;
" >> "$LOG_FILE"

# Check encryption compliance
log_message "Checking encryption compliance"
find /var/lib/macas/uploads -type f -name "*.pdf" -o -name "*.doc*" | while read file; do
    if ! file "$file" | grep -q "encrypted"; then
        log_message "WARNING: Unencrypted file found: $file"
    fi
done

log_message "Compliance check completed"
```

---

This security management guide provides comprehensive coverage of authentication, authorization, encryption, network security, monitoring, and compliance for the MACAS system.