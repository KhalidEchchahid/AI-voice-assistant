/**
 * Voice Assistant Action Execution System - Phase 1
 * 
 * Main entry point for the communication protocol foundation.
 * This exports all the core components needed to integrate
 * voice assistant functionality into your application.
 */

// ============================================================================
// CORE COMMUNICATION COMPONENTS
// ============================================================================

// Communication Manager (Widget Side)
export { WidgetCommunicationManager } from './phase1_communication/widget-communication-manager';

// Security Manager
export { SecurityManager, createSecurityException } from './phase1_communication/security-manager';

// ============================================================================
// CONFIGURATION UTILITIES
// ============================================================================

// Configuration Builder
export { 
  ConfigurationBuilder,
  createDevelopmentConfig,
  createProductionConfig,
  createTestingConfig,
  createMaxSecurityConfig,
  validateConfiguration,
  type Environment
} from './utils/config-builder';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Message Types
export type {
  // Core message interfaces
  AnyMessage,
  MessageType,
  MessageSource,
  MessageValidationResult,
  
  // Specific message types
  HandshakeRequest,
  HandshakeResponse,
  ActionCommand,
  ActionResult,
  HealthCheck,
  HealthResponse,
  ErrorMessage,
  SystemMessage,
  
  // Action and element types
  ActionType,
  ElementSelector,
  ElementSelectionStrategy,
  ActionOptions,
  ActionError,
  
  // Selection strategies
  CSSSelector,
  XPathSelector,
  TextSelector,
  PositionSelector,
  SmartSelector,
  
  // Performance and validation
  PerformanceMetrics,
  ValidationRule
} from './types/messages';

// Security Types
export type {
  // Security configuration
  SecurityConfig,
  SecurityToken,
  TokenValidationResult,
  OriginValidationResult,
  
  // Security policies
  ActionSecurityPolicy,
  ActionSecurityRule,
  ConfirmationRule,
  RateLimitRule,
  SensitivePageRule,
  
  // Security monitoring
  SecurityEvent,
  SecurityEventType,
  SecuritySeverity,
  SecurityCheckResult,
  SecurityException,
  SecurityErrorCode,
  
  // Permission management
  PermissionLevel,
  PermissionRequest,
  PermissionResponse,
  ElementSecurityInfo,
  SecurityRiskLevel,
  
  // Configuration types
  OriginValidationConfig,
  TokenManagementConfig,
  SecurityMonitoringConfig,
  EncryptionConfig,
  DevelopmentSecurityConfig
} from './types/security';

// Communication Types
export type {
  // Manager interfaces
  CommunicationManager,
  WidgetCommunicationManager as IWidgetCommunicationManager,
  HelperCommunicationManager,
  
  // Event handling
  CommunicationEvent,
  EventHandler,
  MessageHandler,
  ActionHandler,
  PageChangeCallback,
  MessageContext,
  
  // Status and health
  CommunicationStatus,
  HealthCheckResult,
  ConnectivityHealth,
  PerformanceHealth,
  SecurityHealth,
  CapabilityHealth,
  
  // Configuration
  CommunicationConfig,
  ConnectionConfig,
  MessageQueueConfig,
  PerformanceConfig,
  DevelopmentConfig,
  MonitoringConfig,
  
  // Connection management
  ConnectionState,
  ConnectionMetrics,
  QueueStrategy,
  DeliveryMode,
  
  // Error handling
  CommunicationError,
  CommunicationErrorCode,
  
  // Statistics
  CommunicationStats,
  MessageStats,
  PerformanceStats,
  ErrorStats,
  SecurityStats,
  
  // Page information
  PageInformation,
  PageChange,
  PageChangeType,
  PageChangeDetails,
  ViewportInfo,
  AccessibilityInfo
} from './types/communication';

// ============================================================================
// INTEGRATION EXAMPLES
// ============================================================================

// Export examples for reference (optional)
export { VoiceAssistantWidget, HelperScriptExample } from './examples/basic-integration';

// ============================================================================
// VERSION AND METADATA
// ============================================================================

export const VERSION = '1.0.0';
export const PHASE = 'Phase 1: Communication Protocol Foundation';
export const STATUS = 'Implemented';

/**
 * System capabilities provided by Phase 1
 */
export const CAPABILITIES = {
  // Core communication
  'secure-messaging': true,
  'token-authentication': true,
  'origin-validation': true,
  'rate-limiting': true,
  
  // Connection management
  'auto-reconnect': true,
  'health-monitoring': true,
  'error-recovery': true,
  'connection-metrics': true,
  
  // Security features
  'security-monitoring': true,
  'audit-logging': true,
  'permission-management': true,
  'csp-compliance': true,
  
  // Development tools
  'debug-logging': true,
  'configuration-validation': true,
  'health-diagnostics': true,
  'performance-tracking': true,
  
  // Not yet implemented (Phase 2+)
  'helper-injection': false,
  'dom-interaction': false,
  'rag-integration': false,
  'smart-element-finding': false
} as const;

/**
 * Quick start function for common use cases
 */
export function createVoiceAssistantCommunication(
  environment: Environment = 'development',
  allowedOrigins: string[] = []
) {
  // Create appropriate configuration
  let config;
  
  switch (environment) {
    case 'production':
      config = createProductionConfig(allowedOrigins);
      break;
    case 'testing':
      config = createTestingConfig();
      break;
    default:
      config = createDevelopmentConfig(allowedOrigins);
  }
  
  // Validate configuration
  const validation = validateConfiguration(config);
  if (!validation.valid) {
    throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
  }
  
  // Create and return manager
  return new WidgetCommunicationManager(config);
}

/**
 * Helper function to check system readiness
 */
export async function checkSystemReadiness(): Promise<{
  ready: boolean;
  checks: { name: string; passed: boolean; message: string }[];
  recommendations: string[];
}> {
  const checks = [];
  
  // Check browser capabilities
  checks.push({
    name: 'Web Crypto API',
    passed: typeof crypto !== 'undefined' && !!crypto.getRandomValues,
    message: 'Required for secure token generation'
  });
  
  checks.push({
    name: 'PostMessage API',
    passed: typeof window !== 'undefined' && !!window.postMessage,
    message: 'Required for cross-frame communication'
  });
  
  checks.push({
    name: 'Promise Support',
    passed: typeof Promise !== 'undefined',
    message: 'Required for async operations'
  });
  
  checks.push({
    name: 'TypeScript Runtime',
    passed: true, // If this code runs, TS compiled successfully
    message: 'TypeScript compilation successful'
  });
  
  const ready = checks.every(check => check.passed);
  const recommendations = [];
  
  if (!ready) {
    recommendations.push('Ensure you are running in a modern browser environment');
    recommendations.push('Check browser compatibility for required APIs');
  } else {
    recommendations.push('System is ready for voice assistant integration');
  }
  
  return { ready, checks, recommendations };
}

// ============================================================================
// LOGGING AND DEBUGGING
// ============================================================================

/**
 * Enable debug logging for development
 */
export function enableDebugLogging(level: 'info' | 'warn' | 'error' = 'info') {
  (window as any).__VOICE_ASSISTANT_DEBUG = level;
  console.log(`🎤 Voice Assistant Debug Logging Enabled (Level: ${level})`);
}

/**
 * Disable debug logging
 */
export function disableDebugLogging() {
  delete (window as any).__VOICE_ASSISTANT_DEBUG;
  console.log('🔇 Voice Assistant Debug Logging Disabled');
} 