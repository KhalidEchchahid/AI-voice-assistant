/**
 * Configuration Builder for Voice Assistant Action Execution
 * 
 * Provides utilities to build secure and sensible configurations
 * for the communication and security systems.
 */

import type { 
  CommunicationConfig,
  SecurityConfig,
  ConnectionConfig,
  MessageQueueConfig,
  PerformanceConfig,
  DevelopmentConfig,
  MonitoringConfig
} from '../types/communication';

import type {
  OriginValidationConfig,
  TokenManagementConfig,
  ActionSecurityPolicy,
  SecurityMonitoringConfig,
  EncryptionConfig,
  DevelopmentSecurityConfig
} from '../types/security';

/**
 * Environment types for configuration
 */
export type Environment = 'development' | 'testing' | 'production';

/**
 * Configuration builder class
 */
export class ConfigurationBuilder {
  private environment: Environment = 'development';
  private allowedOrigins: string[] = [];
  private customTokenExpiration?: number;
  private customSecurityLevel?: 'low' | 'medium' | 'high' | 'maximum';

  constructor(environment: Environment = 'development') {
    this.environment = environment;
  }

  /**
   * Set environment
   */
  setEnvironment(env: Environment): this {
    this.environment = env;
    return this;
  }

  /**
   * Add allowed origins
   */
  addAllowedOrigins(...origins: string[]): this {
    this.allowedOrigins.push(...origins);
    return this;
  }

  /**
   * Set custom token expiration
   */
  setTokenExpiration(expirationMs: number): this {
    this.customTokenExpiration = expirationMs;
    return this;
  }

  /**
   * Set security level
   */
  setSecurityLevel(level: 'low' | 'medium' | 'high' | 'maximum'): this {
    this.customSecurityLevel = level;
    return this;
  }

  /**
   * Build complete configuration
   */
  build(): CommunicationConfig {
    return {
      targetOrigin: this.getTargetOrigin(),
      timeout: this.getTimeout(),
      retries: this.getRetries(),
      security: this.buildSecurityConfig(),
      connection: this.buildConnectionConfig(),
      messageQueue: this.buildMessageQueueConfig(),
      performance: this.buildPerformanceConfig(),
      development: this.buildDevelopmentConfig(),
      monitoring: this.buildMonitoringConfig()
    };
  }

  /**
   * Build security configuration
   */
  buildSecurityConfig(): SecurityConfig {
    const securityLevel = this.customSecurityLevel || this.getDefaultSecurityLevel();
    
    return {
      tokenManagement: this.buildTokenManagementConfig(securityLevel),
      originValidation: this.buildOriginValidationConfig(securityLevel),
      actionPolicy: this.buildActionSecurityPolicy(securityLevel),
      monitoring: this.buildSecurityMonitoringConfig(securityLevel),
      encryption: this.buildEncryptionConfig(securityLevel),
      development: this.buildDevelopmentSecurityConfig()
    };
  }

  // ============================================================================
  // ENVIRONMENT-SPECIFIC DEFAULTS
  // ============================================================================

  private getTargetOrigin(): string {
    switch (this.environment) {
      case 'development':
        return '*';
      case 'testing':
        return 'https://test.localhost';
      case 'production':
        return window.location.origin;
      default:
        return '*';
    }
  }

  private getTimeout(): number {
    switch (this.environment) {
      case 'development':
        return 10000; // 10 seconds for debugging
      case 'testing':
        return 5000;  // 5 seconds for tests
      case 'production':
        return 3000;  // 3 seconds for production
      default:
        return 5000;
    }
  }

  private getRetries(): number {
    switch (this.environment) {
      case 'development':
        return 1; // Less retries for debugging
      case 'testing':
        return 2; // Some retries for flaky tests
      case 'production':
        return 3; // More retries for reliability
      default:
        return 2;
    }
  }

  private getDefaultSecurityLevel(): 'low' | 'medium' | 'high' | 'maximum' {
    switch (this.environment) {
      case 'development':
        return 'low';
      case 'testing':
        return 'medium';
      case 'production':
        return 'high';
      default:
        return 'medium';
    }
  }

  // ============================================================================
  // SECURITY CONFIGURATION BUILDERS
  // ============================================================================

  private buildTokenManagementConfig(securityLevel: string): TokenManagementConfig {
    const expirationTime = this.customTokenExpiration || this.getTokenExpiration(securityLevel);
    
    return {
      algorithm: 'HS256',
      secretKey: this.generateSecretKey(),
      expirationTime,
      rotationInterval: Math.floor(expirationTime * 0.8), // Rotate at 80% of expiration
      maxTokensPerSession: securityLevel === 'maximum' ? 1 : 5,
      revokeOnSuspiciousActivity: securityLevel !== 'low'
    };
  }

  private buildOriginValidationConfig(securityLevel: string): OriginValidationConfig {
    const baseOrigins = [...this.allowedOrigins];
    
    // Add environment-specific origins
    if (this.environment === 'development') {
      baseOrigins.push(
        'http://localhost:3000',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'https://localhost:3000'
      );
    }

    return {
      allowedOrigins: baseOrigins,
      allowedPatterns: this.buildOriginPatterns(securityLevel),
      allowLocalhost: this.environment === 'development',
      allowFileProtocol: this.environment === 'development',
      requireHttps: this.environment === 'production' && securityLevel !== 'low'
    };
  }

  private buildActionSecurityPolicy(securityLevel: string): ActionSecurityPolicy {
    return {
      allowedActions: this.getAllowedActionRules(securityLevel),
      blockedActions: this.getBlockedActionRules(securityLevel),
      requireConfirmation: this.getConfirmationRules(securityLevel),
      rateLimits: this.getRateLimitRules(securityLevel),
      sensitivePages: this.getSensitivePageRules(securityLevel)
    };
  }

  private buildSecurityMonitoringConfig(securityLevel: string): SecurityMonitoringConfig {
    const alertThresholds = this.getAlertThresholds(securityLevel);
    
    return {
      enabled: securityLevel !== 'low',
      logLevel: this.getLogLevel(securityLevel),
      maxEvents: securityLevel === 'maximum' ? 1000 : 500,
      eventRetention: this.getEventRetention(securityLevel),
      alertThresholds,
      notificationEndpoints: [] // To be configured by implementer
    };
  }

  private buildEncryptionConfig(securityLevel: string): EncryptionConfig {
    return {
      encryptMessages: securityLevel === 'maximum',
      algorithm: 'AES-GCM',
      keyDerivation: 'PBKDF2',
      saltLength: 16,
      ivLength: 12
    };
  }

  private buildDevelopmentSecurityConfig(): DevelopmentSecurityConfig {
    return {
      allowInsecureOrigins: this.environment === 'development',
      allowSelfSignedCerts: this.environment !== 'production',
      disableTokenValidation: false, // Never disable completely
      verboseLogging: this.environment === 'development',
      mockSecurityChecks: this.environment === 'testing'
    };
  }

  // ============================================================================
  // COMMUNICATION CONFIGURATION BUILDERS
  // ============================================================================

  private buildConnectionConfig(): ConnectionConfig {
    return {
      autoReconnect: true,
      reconnectInterval: this.environment === 'development' ? 5000 : 3000,
      maxReconnectAttempts: this.environment === 'production' ? 5 : 3,
      connectionTimeout: this.environment === 'development' ? 10000 : 5000,
      keepAlive: true,
      keepAliveInterval: 30000 // 30 seconds
    };
  }

  private buildMessageQueueConfig(): MessageQueueConfig {
    return {
      maxQueueSize: this.environment === 'production' ? 100 : 50,
      queueStrategy: 'priority',
      deliveryMode: 'immediate',
      persistQueue: this.environment === 'production',
      priorityLevels: 3
    };
  }

  private buildPerformanceConfig(): PerformanceConfig {
    return {
      enableCompression: this.environment === 'production',
      enableBatching: false, // Keep simple for Phase 1
      maxMessageSize: 1024 * 1024, // 1MB
      batchSize: 10,
      batchTimeout: 100,
      enableCaching: this.environment === 'production',
      cacheSize: 50
    };
  }

  private buildDevelopmentConfig(): DevelopmentConfig {
    return {
      debug: this.environment === 'development',
      verbose: this.environment === 'development',
      mockMode: false,
      testHooks: this.environment === 'testing',
      devTools: this.environment !== 'production'
    };
  }

  private buildMonitoringConfig(): MonitoringConfig {
    return {
      enabled: this.environment === 'production',
      sampleRate: this.environment === 'production' ? 0.1 : 1.0,
      metricsEndpoint: undefined, // To be configured
      alertEndpoints: [],
      retentionPeriod: 24 * 60 * 60 * 1000 // 24 hours
    };
  }

  // ============================================================================
  // SECURITY LEVEL HELPERS
  // ============================================================================

  private getTokenExpiration(securityLevel: string): number {
    switch (securityLevel) {
      case 'low':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'medium':
        return 8 * 60 * 60 * 1000;  // 8 hours
      case 'high':
        return 2 * 60 * 60 * 1000;  // 2 hours
      case 'maximum':
        return 30 * 60 * 1000;      // 30 minutes
      default:
        return 8 * 60 * 60 * 1000;
    }
  }

  private buildOriginPatterns(securityLevel: string): RegExp[] {
    const patterns: RegExp[] = [];
    
    if (this.environment === 'development') {
      patterns.push(
        /^https?:\/\/localhost:\d+$/,
        /^https?:\/\/127\.0\.0\.1:\d+$/
      );
    }

    if (securityLevel === 'low') {
      patterns.push(/^https:\/\/.*\.localhost$/);
    }

    return patterns;
  }

  private getAllowedActionRules(securityLevel: string): any[] {
    const baseRules = [
      { actionType: 'click', reason: 'Basic interaction' },
      { actionType: 'type', reason: 'Text input' },
      { actionType: 'scroll', reason: 'Page navigation' },
      { actionType: 'wait', reason: 'Timing control' }
    ];

    if (securityLevel !== 'maximum') {
      baseRules.push(
        { actionType: 'navigate', reason: 'Page navigation' },
        { actionType: 'hover', reason: 'Element interaction' }
      );
    }

    return baseRules;
  }

  private getBlockedActionRules(securityLevel: string): any[] {
    const rules: any[] = [];

    if (securityLevel === 'high' || securityLevel === 'maximum') {
      rules.push(
        { 
          actionType: 'submit',
          selector: 'form[action*="payment"]',
          reason: 'Block payment form submissions'
        },
        {
          actionType: 'click',
          selector: '[data-sensitive="true"]',
          reason: 'Block clicks on sensitive elements'
        }
      );
    }

    if (securityLevel === 'maximum') {
      rules.push(
        {
          actionType: '*',
          pagePattern: /\/admin\//,
          reason: 'Block all actions on admin pages'
        }
      );
    }

    return rules;
  }

  private getConfirmationRules(securityLevel: string): any[] {
    const rules: any[] = [];

    if (securityLevel === 'medium' || securityLevel === 'high') {
      rules.push({
        actionType: 'submit',
        confirmationMessage: 'Do you want to submit this form?',
        timeout: 30000
      });
    }

    if (securityLevel === 'high' || securityLevel === 'maximum') {
      rules.push(
        {
          actionType: 'navigate',
          pagePattern: /^https?:\/\/(?!.*\.(localhost|127\.0\.0\.1)).*/,
          confirmationMessage: 'Navigate to external site?',
          timeout: 15000
        },
        {
          actionType: 'click',
          selector: 'button[type="submit"], input[type="submit"]',
          confirmationMessage: 'Submit this form?',
          timeout: 20000
        }
      );
    }

    return rules;
  }

  private getRateLimitRules(securityLevel: string): any[] {
    const limits: { [key: string]: any } = {
      low: { maxActions: 100, timeWindow: 60000 },      // 100 per minute
      medium: { maxActions: 50, timeWindow: 60000 },    // 50 per minute
      high: { maxActions: 20, timeWindow: 60000 },      // 20 per minute
      maximum: { maxActions: 10, timeWindow: 60000 }    // 10 per minute
    };

    const limit = limits[securityLevel] || limits.medium;

    return [
      {
        actionType: '*',
        maxActions: limit.maxActions,
        timeWindow: limit.timeWindow,
        blockDuration: limit.timeWindow * 2
      },
      {
        actionType: 'submit',
        maxActions: Math.floor(limit.maxActions / 5),
        timeWindow: limit.timeWindow,
        blockDuration: limit.timeWindow * 3
      }
    ];
  }

  private getSensitivePageRules(securityLevel: string): any[] {
    const rules: any[] = [];

    if (securityLevel === 'high' || securityLevel === 'maximum') {
      rules.push(
        {
          pagePattern: /\/admin/,
          allowedActions: ['scroll', 'wait'],
          blockedActions: ['submit', 'click'],
          requireExplicitPermission: true
        },
        {
          pagePattern: /\/payment|\/checkout|\/billing/,
          allowedActions: ['scroll', 'wait'],
          blockedActions: ['submit'],
          requireExplicitPermission: true
        }
      );
    }

    return rules;
  }

  private getAlertThresholds(securityLevel: string): any {
    const thresholds: { [key: string]: any } = {
      low: { tokenViolations: 10, rateLimitViolations: 5, timeWindow: 300000 },
      medium: { tokenViolations: 5, rateLimitViolations: 3, timeWindow: 300000 },
      high: { tokenViolations: 3, rateLimitViolations: 2, timeWindow: 300000 },
      maximum: { tokenViolations: 1, rateLimitViolations: 1, timeWindow: 300000 }
    };

    return thresholds[securityLevel] || thresholds.medium;
  }

  private getLogLevel(securityLevel: string): 'info' | 'warning' | 'error' | 'critical' {
    switch (securityLevel) {
      case 'low':
        return 'error';
      case 'medium':
        return 'warning';
      case 'high':
      case 'maximum':
        return 'info';
      default:
        return 'warning';
    }
  }

  private getEventRetention(securityLevel: string): number {
    switch (securityLevel) {
      case 'low':
        return 60 * 60 * 1000;      // 1 hour
      case 'medium':
        return 4 * 60 * 60 * 1000;  // 4 hours
      case 'high':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'maximum':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      default:
        return 4 * 60 * 60 * 1000;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateSecretKey(): string {
    // In production, this should be loaded from environment variables
    if (this.environment === 'development') {
      return 'development-secret-key-change-in-production';
    }
    
    // Generate a random key for non-development environments
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a development configuration
 */
export function createDevelopmentConfig(allowedOrigins: string[] = []): CommunicationConfig {
  return new ConfigurationBuilder('development')
    .addAllowedOrigins(...allowedOrigins)
    .setSecurityLevel('low')
    .build();
}

/**
 * Create a production configuration
 */
export function createProductionConfig(allowedOrigins: string[]): CommunicationConfig {
  return new ConfigurationBuilder('production')
    .addAllowedOrigins(...allowedOrigins)
    .setSecurityLevel('high')
    .build();
}

/**
 * Create a testing configuration
 */
export function createTestingConfig(): CommunicationConfig {
  return new ConfigurationBuilder('testing')
    .setSecurityLevel('medium')
    .build();
}

/**
 * Create a configuration for maximum security
 */
export function createMaxSecurityConfig(allowedOrigins: string[]): CommunicationConfig {
  return new ConfigurationBuilder('production')
    .addAllowedOrigins(...allowedOrigins)
    .setSecurityLevel('maximum')
    .setTokenExpiration(10 * 60 * 1000) // 10 minutes
    .build();
}

/**
 * Validate a configuration
 */
export function validateConfiguration(config: CommunicationConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (config.timeout <= 0) {
    errors.push('Timeout must be positive');
  }

  if (config.retries < 0) {
    errors.push('Retries cannot be negative');
  }

  // Security validation
  if (!config.security.tokenManagement.secretKey) {
    errors.push('Secret key is required');
  }

  if (config.security.tokenManagement.expirationTime <= 0) {
    errors.push('Token expiration time must be positive');
  }

  if (config.security.originValidation.allowedOrigins.length === 0 && 
      config.security.originValidation.allowedPatterns.length === 0) {
    warnings.push('No allowed origins configured - this might be too restrictive');
  }

  // Connection validation
  if (config.connection.reconnectInterval <= 0) {
    errors.push('Reconnect interval must be positive');
  }

  if (config.connection.maxReconnectAttempts <= 0) {
    warnings.push('No reconnection attempts configured');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
} 