/**
 * Security Manager for Voice Assistant Action Execution
 * 
 * Handles all security-related operations including token validation,
 * origin verification, and security policy enforcement.
 */

import type {
  SecurityConfig,
  SecurityToken,
  TokenValidationResult,
  OriginValidationResult,
  SecurityEvent,
  SecurityEventType,
  SecuritySeverity,
  ActionSecurityPolicy,
  SecurityCheckResult,
  SecurityException,
  SecurityErrorCode
} from '../types/security';

import type {
  AnyMessage,
  MessageValidationResult
} from '../types/messages';

export class SecurityManager {
  private config: SecurityConfig;
  private currentToken?: SecurityToken;
  private events: SecurityEvent[] = [];
  private blockedOrigins = new Set<string>();
  private rateLimitTracker = new Map<string, { count: number; resetTime: number }>();
  constructor(config: SecurityConfig) {
    this.config = config;
    this.initializeSecurityMonitoring();
  }

  // ============================================================================
  // TOKEN MANAGEMENT
  // ============================================================================

  /**
   * Generate a new security token
   */
  generateToken(scopes: string[] = ['*']): SecurityToken {
    const now = Date.now();
    const token: SecurityToken = {
      value: this.generateTokenValue(),
      expiresAt: now + this.config.tokenManagement.expirationTime,
      issuedAt: now,
      scope: scopes as any,
      algorithm: this.config.tokenManagement.algorithm,
      issuer: 'voice-assistant-widget'
    };

    this.currentToken = token;
    return token;
  }

  /**
   * Validate a security token
   */
  validateToken(tokenValue: string): TokenValidationResult {
    if (this.config.development.disableTokenValidation) {
      return {
        valid: true,
        expired: false,
        scopes: ['*'],
        errors: []
      };
    }

    if (!this.currentToken || this.currentToken.value !== tokenValue) {
      this.logSecurityEvent('token_invalid', 'error', {
        error: 'Token not found or mismatched',
        userAgent: navigator.userAgent,
        metadata: { tokenPrefix: tokenValue.substring(0, 8) }
      });

      return {
        valid: false,
        expired: false,
        scopes: [],
        errors: ['Invalid token']
      };
    }

    const now = Date.now();
    const expired = now > this.currentToken.expiresAt;

    if (expired) {
      this.logSecurityEvent('token_invalid', 'warning', {
        error: 'Token expired',
        userAgent: navigator.userAgent,
        metadata: { 
          expiredAt: this.currentToken.expiresAt,
          currentTime: now
        }
      });

      return {
        valid: false,
        expired: true,
        scopes: this.currentToken.scope,
        errors: ['Token expired'],
        remainingTime: 0
      };
    }

    return {
      valid: true,
      expired: false,
      scopes: this.currentToken.scope,
      errors: [],
      remainingTime: this.currentToken.expiresAt - now
    };
  }

  /**
   * Rotate the current token
   */
  rotateToken(): SecurityToken {
    const oldToken = this.currentToken;
    const newToken = this.generateToken(oldToken?.scope);
    
    this.logSecurityEvent('token_invalid', 'info', {
      userAgent: navigator.userAgent,
      metadata: {
        action: 'token_rotation',
        oldTokenExpiry: oldToken?.expiresAt,
        newTokenExpiry: newToken.expiresAt
      }
    });

    return newToken;
  }

  // ============================================================================
  // ORIGIN VALIDATION
  // ============================================================================

  /**
   * Validate message origin
   */
  validateOrigin(origin: string): OriginValidationResult {
    // Allow all origins in development mode
    if (this.config.development.allowInsecureOrigins) {
      return {
        valid: true,
        origin,
        isSecure: origin.startsWith('https:'),
        isDevelopment: true
      };
    }

    // Check if origin is blocked
    if (this.blockedOrigins.has(origin)) {
      return {
        valid: false,
        origin,
        reason: 'Origin is blocked due to security violations',
        isSecure: origin.startsWith('https:'),
        isDevelopment: false
      };
    }

    // Check against allowed origins
    const isAllowed = this.config.originValidation.allowedOrigins.includes(origin) ||
                     this.config.originValidation.allowedPatterns.some(pattern => pattern.test(origin));

    if (!isAllowed) {
      this.logSecurityEvent('origin_violation', 'error', {
        userAgent: navigator.userAgent,
        metadata: { 
          origin,
          allowedOrigins: this.config.originValidation.allowedOrigins
        }
      });

      return {
        valid: false,
        origin,
        reason: 'Origin not in allowed list',
        isSecure: origin.startsWith('https:'),
        isDevelopment: false
      };
    }

    // Check HTTPS requirement
    if (this.config.originValidation.requireHttps && !origin.startsWith('https:')) {
      return {
        valid: false,
        origin,
        reason: 'HTTPS required but origin uses HTTP',
        isSecure: false,
        isDevelopment: false
      };
    }

    return {
      valid: true,
      origin,
      isSecure: origin.startsWith('https:'),
      isDevelopment: origin.includes('localhost') || origin.includes('127.0.0.1')
    };
  }

  /**
   * Block an origin due to security violations
   */
  blockOrigin(origin: string, reason: string): void {
    this.blockedOrigins.add(origin);
    
    this.logSecurityEvent('origin_violation', 'critical', {
      userAgent: navigator.userAgent,
      metadata: {
        action: 'origin_blocked',
        origin,
        reason
      }
    });
  }

  // ============================================================================
  // MESSAGE VALIDATION
  // ============================================================================

  /**
   * Validate a message for security compliance
   */
  validateMessage(message: AnyMessage, origin: string): MessageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate origin
    const originResult = this.validateOrigin(origin);
    if (!originResult.valid) {
      errors.push(`Invalid origin: ${originResult.reason}`);
    }

    // Validate token
    if (message.securityToken) {
      const tokenResult = this.validateToken(message.securityToken);
      if (!tokenResult.valid) {
        errors.push(`Token validation failed: ${tokenResult.errors.join(', ')}`);
      }
    } else {
      warnings.push('No security token provided');
    }

    // Validate message structure
    if (!message.id || !message.type || !message.timestamp || !message.source) {
      errors.push('Message missing required fields');
    }

    // Validate message size
    const messageSize = JSON.stringify(message).length;
    if (messageSize > this.config.tokenManagement.maxTokensPerSession * 1024) {
      errors.push('Message size exceeds maximum allowed');
    }

    // Check rate limiting
    const rateLimitResult = this.checkRateLimit(origin, message.type);
    if (!rateLimitResult.allowed) {
      errors.push(`Rate limit exceeded: ${rateLimitResult.reason}`);
    }

    // Validate timestamp (prevent replay attacks)
    const now = Date.now();
    const timeDiff = Math.abs(now - message.timestamp);
    if (timeDiff > 300000) { // 5 minutes
      errors.push('Message timestamp too old or too far in future');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  /**
   * Check if origin/action is rate limited
   */
  private checkRateLimit(origin: string, messageType: string): { allowed: boolean; reason?: string } {
    const key = `${origin}:${messageType}`;
    const now = Date.now();
    
    // Find applicable rate limit rule
    const rule = this.config.actionPolicy.rateLimits.find(r => 
      r.actionType === messageType || r.actionType === '*'
    );

    if (!rule) {
      return { allowed: true };
    }

    let tracker = this.rateLimitTracker.get(key);
    
    // Reset if time window passed
    if (!tracker || now > tracker.resetTime) {
      tracker = {
        count: 0,
        resetTime: now + rule.timeWindow
      };
      this.rateLimitTracker.set(key, tracker);
    }

    // Check if limit exceeded
    if (tracker.count >= rule.maxActions) {
      this.logSecurityEvent('rate_limit_exceeded', 'warning', {
        userAgent: navigator.userAgent,
        metadata: {
          origin,
          messageType,
          limit: rule.maxActions,
          timeWindow: rule.timeWindow
        }
      });

      return { 
        allowed: false, 
        reason: `Rate limit exceeded: ${rule.maxActions} actions per ${rule.timeWindow}ms` 
      };
    }

    // Increment counter
    tracker.count++;
    return { allowed: true };
  }

  // ============================================================================
  // SECURITY MONITORING
  // ============================================================================

  /**
   * Log a security event
   */
  private logSecurityEvent(
    type: SecurityEventType,
    severity: SecuritySeverity,
    details: any
  ): void {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      type,
      severity,
      timestamp: Date.now(),
      source: 'security-manager',
      details,
      resolved: false
    };

    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.config.monitoring.maxEvents) {
      this.events = this.events.slice(-this.config.monitoring.maxEvents);
    }

    // Log to console in development
    if (this.config.development.verboseLogging) {
      console.warn(`[Security] ${severity.toUpperCase()}: ${type}`, details);
    }

    // Check alert thresholds
    this.checkAlertThresholds();
  }

  /**
   * Get recent security events
   */
  getSecurityEvents(limit = 50): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Perform comprehensive security check
   */
  performSecurityCheck(): SecurityCheckResult {
    const checks: any[] = [];
    let score = 100;

    // Check token status
    if (this.currentToken) {
      const tokenValid = this.validateToken(this.currentToken.value).valid;
      checks.push({
        name: 'Token Validation',
        passed: tokenValid,
        severity: 'error',
        message: tokenValid ? 'Token is valid' : 'Token is invalid or expired'
      });
      if (!tokenValid) score -= 25;
    } else {
      checks.push({
        name: 'Token Presence',
        passed: false,
        severity: 'warning',
        message: 'No security token present'
      });
      score -= 15;
    }

    // Check recent security events
    const recentEvents = this.events.filter(e => 
      Date.now() - e.timestamp < 300000 // Last 5 minutes
    );
    
    const criticalEvents = recentEvents.filter(e => e.severity === 'critical').length;
    const errorEvents = recentEvents.filter(e => e.severity === 'error').length;

    checks.push({
      name: 'Recent Security Events',
      passed: criticalEvents === 0 && errorEvents < 3,
      severity: criticalEvents > 0 ? 'critical' : 'warning',
      message: `${criticalEvents} critical, ${errorEvents} error events in last 5 minutes`
    });

    if (criticalEvents > 0) score -= 40;
    if (errorEvents > 0) score -= errorEvents * 5;

    // Check configuration
    const configSecure = this.config.originValidation.requireHttps && 
                        !this.config.development.disableTokenValidation;
    checks.push({
      name: 'Security Configuration',
      passed: configSecure,
      severity: 'warning',
      message: configSecure ? 'Security configuration is appropriate' : 'Security configuration could be strengthened'
    });

    if (!configSecure) score -= 10;

    const level = score >= 80 ? 'low' : score >= 60 ? 'medium' : score >= 40 ? 'high' : 'critical';

    return {
      passed: score >= 70,
      level: level as any,
      checks,
      recommendations: this.generateSecurityRecommendations(checks),
      score: Math.max(0, score)
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Generate a secure token value
   */
  private generateTokenValue(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize security monitoring
   */
  private initializeSecurityMonitoring(): void {
    if (this.config.monitoring.enabled) {
      // Set up periodic cleanup
      setInterval(() => {
        this.cleanupExpiredData();
      }, 60000); // Every minute
    }
  }

  /**
   * Clean up expired data
   */
  private cleanupExpiredData(): void {
    const now = Date.now();
    
    // Clean up old events
    this.events = this.events.filter(event => 
      now - event.timestamp < this.config.monitoring.eventRetention
    );

    // Clean up expired rate limit trackers
    for (const [key, tracker] of this.rateLimitTracker.entries()) {
      if (now > tracker.resetTime) {
        this.rateLimitTracker.delete(key);
      }
    }
  }

  /**
   * Check if alert thresholds are exceeded
   */
  private checkAlertThresholds(): void {
    const thresholds = this.config.monitoring.alertThresholds;
    const timeWindow = thresholds.timeWindow;
    const now = Date.now();
    
    const recentEvents = this.events.filter(e => 
      now - e.timestamp < timeWindow
    );

    const tokenViolations = recentEvents.filter(e => 
      e.type === 'token_invalid'
    ).length;

    const rateLimitViolations = recentEvents.filter(e => 
      e.type === 'rate_limit_exceeded'
    ).length;

    if (tokenViolations >= thresholds.tokenViolations) {
      this.triggerAlert('High number of token violations detected');
    }

    if (rateLimitViolations >= thresholds.rateLimitViolations) {
      this.triggerAlert('High number of rate limit violations detected');
    }
  }

  /**
   * Trigger security alert
   */
  private triggerAlert(message: string): void {
    console.error(`[Security Alert] ${message}`);
    
    // In a real implementation, this would send alerts to configured endpoints
    if (this.config.monitoring.notificationEndpoints.length > 0) {
      console.log('Would send alert to:', this.config.monitoring.notificationEndpoints);
    }
  }

  /**
   * Generate security recommendations
   */
  private generateSecurityRecommendations(checks: any[]): string[] {
    const recommendations: string[] = [];

    const failedChecks = checks.filter(check => !check.passed);
    
    if (failedChecks.some(c => c.name === 'Token Validation')) {
      recommendations.push('Generate a new security token');
    }

    if (failedChecks.some(c => c.name === 'Token Presence')) {
      recommendations.push('Implement token-based authentication');
    }

    if (failedChecks.some(c => c.name === 'Recent Security Events')) {
      recommendations.push('Investigate recent security violations');
    }

    if (failedChecks.some(c => c.name === 'Security Configuration')) {
      recommendations.push('Review and strengthen security configuration');
      recommendations.push('Enable HTTPS requirement in production');
    }

    if (recommendations.length === 0) {
      recommendations.push('Security posture is good - continue monitoring');
    }

    return recommendations;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get current security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration
   */
  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current token
   */
  getCurrentToken(): SecurityToken | undefined {
    return this.currentToken;
  }

  /**
   * Check if security manager is healthy
   */
  isHealthy(): boolean {
    const check = this.performSecurityCheck();
    return check.passed && check.score >= 70;
  }
}

/**
 * Create a security exception
 */
export function createSecurityException(
  code: SecurityErrorCode,
  message: string,
  severity: SecuritySeverity = 'error',
  recoverable = false
): SecurityException {
  const error = new Error(message) as SecurityException;
  error.code = code;
  error.severity = severity;
  error.recoverable = recoverable;
  error.suggestions = [];
  error.details = {
    userAgent: navigator.userAgent,
    metadata: {}
  };

  return error;
} 