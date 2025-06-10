/**
 * Security Type Definitions for Voice Assistant Action Execution
 * 
 * This file defines all security-related interfaces and types used
 * for secure communication and action validation.
 */

// ============================================================================
// SECURITY TOKEN MANAGEMENT
// ============================================================================

/**
 * Security token structure
 */
export interface SecurityToken {
  value: string;                   // Token value
  expiresAt: number;              // Expiration timestamp
  issuedAt: number;               // Issue timestamp
  scope: TokenScope[];            // What this token allows
  algorithm: string;              // Signing algorithm
  issuer: string;                 // Who issued the token
}

/**
 * Token scope definitions
 */
export type TokenScope = 
  | 'action:execute'              // Execute actions
  | 'page:read'                   // Read page information
  | 'element:find'                // Find elements
  | 'navigation:control'          // Control navigation
  | 'form:submit'                 // Submit forms
  | 'custom:*'                    // Custom actions
  | '*';                          // All permissions

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;                 // Token is valid
  expired: boolean;               // Token has expired
  scopes: TokenScope[];           // Valid scopes
  errors: string[];               // Validation errors
  remainingTime?: number;         // Time until expiration (ms)
}

// ============================================================================
// ORIGIN AND CSP VALIDATION
// ============================================================================

/**
 * Origin validation configuration
 */
export interface OriginValidationConfig {
  allowedOrigins: string[];       // Explicitly allowed origins
  allowedPatterns: RegExp[];      // Regex patterns for origins
  allowLocalhost: boolean;        // Allow localhost for development
  allowFileProtocol: boolean;     // Allow file:// protocol
  requireHttps: boolean;          // Require HTTPS in production
}

/**
 * Origin validation result
 */
export interface OriginValidationResult {
  valid: boolean;                 // Origin is valid
  origin: string;                 // Validated origin
  reason?: string;                // Reason if invalid
  isSecure: boolean;              // Uses HTTPS
  isDevelopment: boolean;         // Is development environment
}

/**
 * Content Security Policy information
 */
export interface CSPInfo {
  hasCSP: boolean;                // Page has CSP header
  allowsInlineScripts: boolean;   // Allows inline scripts
  allowsEval: boolean;            // Allows eval()
  scriptSources: string[];        // Allowed script sources
  connectSources: string[];       // Allowed connect sources
  violations: CSPViolation[];     // Recent violations
}

export interface CSPViolation {
  directive: string;              // Violated directive
  blockedURI: string;             // Blocked URI
  timestamp: number;              // When violation occurred
  lineNumber?: number;            // Line number of violation
}

// ============================================================================
// ACTION SECURITY POLICIES
// ============================================================================

/**
 * Security policy for actions
 */
export interface ActionSecurityPolicy {
  allowedActions: ActionSecurityRule[];    // Allowed action rules
  blockedActions: ActionSecurityRule[];    // Blocked action rules
  requireConfirmation: ConfirmationRule[]; // Actions requiring confirmation
  rateLimits: RateLimitRule[];            // Rate limiting rules
  sensitivePages: SensitivePageRule[];     // Sensitive page restrictions
}

/**
 * Action security rule
 */
export interface ActionSecurityRule {
  actionType: string;             // Action type or pattern
  selector?: string;              // Element selector pattern
  pagePattern?: RegExp;           // Page URL pattern
  timeRestriction?: TimeRestriction; // Time-based restrictions
  userAgent?: RegExp;             // User agent restrictions
  reason?: string;                // Why this rule exists
}

/**
 * Confirmation requirement rule
 */
export interface ConfirmationRule {
  actionType: string;             // Action requiring confirmation
  selector?: string;              // Element selector pattern
  pagePattern?: RegExp;           // Page URL pattern
  confirmationMessage: string;    // Message to show user
  timeout: number;                // Confirmation timeout (ms)
}

/**
 * Rate limiting rule
 */
export interface RateLimitRule {
  actionType: string;             // Action type
  maxActions: number;             // Maximum actions
  timeWindow: number;             // Time window (ms)
  blockDuration: number;          // Block duration after limit (ms)
}

/**
 * Sensitive page rule
 */
export interface SensitivePageRule {
  pagePattern: RegExp;            // Page URL pattern
  allowedActions: string[];       // Only these actions allowed
  blockedActions: string[];       // These actions blocked
  requireExplicitPermission: boolean; // Require explicit permission
}

/**
 * Time-based restriction
 */
export interface TimeRestriction {
  allowedHours?: number[];        // Allowed hours (0-23)
  allowedDays?: number[];         // Allowed days (0-6, Sunday=0)
  timezone?: string;              // Timezone for restrictions
}

// ============================================================================
// PERMISSION MANAGEMENT
// ============================================================================

/**
 * Permission levels
 */
export type PermissionLevel = 
  | 'none'                        // No permissions
  | 'read'                        // Read-only access
  | 'interact'                    // Can interact with elements
  | 'navigate'                    // Can navigate pages
  | 'admin';                      // Full administrative access

/**
 * Permission request
 */
export interface PermissionRequest {
  requestId: string;              // Unique request ID
  action: string;                 // Requested action
  element?: ElementSecurityInfo;  // Target element info
  justification: string;          // Why permission is needed
  expiresAt: number;              // When request expires
  metadata: Record<string, any>;  // Additional metadata
}

/**
 * Permission response
 */
export interface PermissionResponse {
  requestId: string;              // Matching request ID
  granted: boolean;               // Permission granted
  level: PermissionLevel;         // Granted permission level
  expiresAt?: number;             // When permission expires
  conditions?: string[];          // Additional conditions
  reason?: string;                // Reason if denied
}

/**
 * Element security information
 */
export interface ElementSecurityInfo {
  tagName: string;                // Element tag
  id?: string;                    // Element ID
  className?: string;             // Element classes
  type?: string;                  // Input type
  href?: string;                  // Link href
  action?: string;                // Form action
  isSensitive: boolean;           // Is sensitive element
  sensitiveReason?: string;       // Why it's sensitive
  riskLevel: SecurityRiskLevel;   // Risk level
}

export type SecurityRiskLevel = 
  | 'low'                         // Low risk
  | 'medium'                      // Medium risk
  | 'high'                        // High risk
  | 'critical';                   // Critical risk

// ============================================================================
// SECURITY MONITORING
// ============================================================================

/**
 * Security event
 */
export interface SecurityEvent {
  id: string;                     // Event ID
  type: SecurityEventType;        // Event type
  severity: SecuritySeverity;     // Event severity
  timestamp: number;              // When event occurred
  source: string;                 // Event source
  details: SecurityEventDetails;  // Event details
  resolved: boolean;              // Event resolved
  resolvedAt?: number;            // When resolved
}

export type SecurityEventType = 
  | 'token_invalid'               // Invalid token used
  | 'origin_violation'            // Invalid origin
  | 'rate_limit_exceeded'         // Rate limit exceeded
  | 'permission_denied'           // Permission denied
  | 'suspicious_activity'         // Suspicious behavior
  | 'csp_violation'               // CSP violation
  | 'sensitive_data_access'       // Sensitive data accessed
  | 'malformed_message'           // Malformed message received
  | 'unauthorized_action';        // Unauthorized action attempted

export type SecuritySeverity = 
  | 'info'                        // Informational
  | 'warning'                     // Warning
  | 'error'                       // Error
  | 'critical';                   // Critical security issue

/**
 * Security event details
 */
export interface SecurityEventDetails {
  userAgent: string;              // User agent
  ipAddress?: string;             // IP address (if available)
  sessionId?: string;             // Session ID
  messageId?: string;             // Related message ID
  actionType?: string;            // Action type
  elementInfo?: ElementSecurityInfo; // Element information
  error?: string;                 // Error message
  metadata: Record<string, any>;  // Additional metadata
}

// ============================================================================
// SECURITY CONFIGURATION
// ============================================================================

/**
 * Master security configuration
 */
export interface SecurityConfig {
  tokenManagement: TokenManagementConfig;      // Token configuration
  originValidation: OriginValidationConfig;    // Origin validation
  actionPolicy: ActionSecurityPolicy;          // Action security policy
  monitoring: SecurityMonitoringConfig;        // Security monitoring
  encryption: EncryptionConfig;                // Encryption settings
  development: DevelopmentSecurityConfig;      // Development overrides
}

/**
 * Token management configuration
 */
export interface TokenManagementConfig {
  algorithm: string;              // Token signing algorithm
  secretKey: string;              // Secret key for signing
  expirationTime: number;         // Default expiration (ms)
  rotationInterval: number;       // Rotation interval (ms)
  maxTokensPerSession: number;    // Max tokens per session
  revokeOnSuspiciousActivity: boolean; // Auto-revoke on suspicious activity
}

/**
 * Security monitoring configuration
 */
export interface SecurityMonitoringConfig {
  enabled: boolean;               // Enable monitoring
  logLevel: SecuritySeverity;     // Minimum log level
  maxEvents: number;              // Max events to store
  eventRetention: number;         // Event retention time (ms)
  alertThresholds: {
    tokenViolations: number;      // Token violations before alert
    rateLimitViolations: number;  // Rate limit violations before alert
    timeWindow: number;           // Time window for counting (ms)
  };
  notificationEndpoints: string[]; // Where to send alerts
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  encryptMessages: boolean;       // Encrypt all messages
  algorithm: string;              // Encryption algorithm
  keyDerivation: string;          // Key derivation method
  saltLength: number;             // Salt length for key derivation
  ivLength: number;               // IV length for encryption
}

/**
 * Development security configuration
 */
export interface DevelopmentSecurityConfig {
  allowInsecureOrigins: boolean;  // Allow HTTP in development
  allowSelfSignedCerts: boolean;  // Allow self-signed certificates
  disableTokenValidation: boolean; // Disable token validation
  verboseLogging: boolean;        // Enable verbose security logs
  mockSecurityChecks: boolean;    // Mock security checks for testing
}

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

/**
 * Security check result
 */
export interface SecurityCheckResult {
  passed: boolean;                // Security check passed
  level: SecurityRiskLevel;       // Risk level
  checks: SecurityCheckDetail[];  // Individual check results
  recommendations: string[];      // Security recommendations
  score: number;                  // Security score (0-100)
}

/**
 * Individual security check detail
 */
export interface SecurityCheckDetail {
  name: string;                   // Check name
  passed: boolean;                // Check passed
  severity: SecuritySeverity;     // Check severity
  message: string;                // Check message
  recommendation?: string;        // Recommendation if failed
}

/**
 * Security audit log entry
 */
export interface SecurityAuditLog {
  id: string;                     // Log entry ID
  timestamp: number;              // Log timestamp
  sessionId: string;              // Session ID
  action: string;                 // Action performed
  result: 'success' | 'failure' | 'blocked'; // Action result
  securityLevel: SecurityRiskLevel; // Security level required
  metadata: Record<string, any>;  // Additional metadata
}

// ============================================================================
// SECURITY EXCEPTIONS
// ============================================================================

/**
 * Security exception
 */
export interface SecurityException extends Error {
  code: SecurityErrorCode;        // Error code
  severity: SecuritySeverity;     // Error severity
  details: SecurityEventDetails;  // Error details
  recoverable: boolean;           // Can be recovered from
  suggestions: string[];          // Recovery suggestions
}

export type SecurityErrorCode = 
  | 'TOKEN_EXPIRED'               // Token has expired
  | 'TOKEN_INVALID'               // Token is invalid
  | 'ORIGIN_BLOCKED'              // Origin is blocked
  | 'ACTION_FORBIDDEN'            // Action is forbidden
  | 'RATE_LIMITED'                // Rate limit exceeded
  | 'PERMISSION_DENIED'           // Permission denied
  | 'CSP_BLOCKED'                 // Blocked by CSP
  | 'SENSITIVE_DATA'              // Sensitive data access
  | 'SUSPICIOUS_ACTIVITY'         // Suspicious activity detected
  | 'CONFIGURATION_ERROR';        // Security configuration error 