/**
 * Communication Type Definitions for Voice Assistant Action Execution
 * 
 * This file defines all communication-related interfaces and types used
 * for managing postMessage communication between widget and helper script.
 */

import type { AnyMessage, MessageType, MessageSource } from './messages';
import type { SecurityConfig, SecurityEvent } from './security';

// ============================================================================
// COMMUNICATION MANAGER INTERFACES
// ============================================================================

/**
 * Base communication manager interface
 */
export interface CommunicationManager {
  // Connection management
  connect(): Promise<boolean>;
  disconnect(): void;
  isConnected(): boolean;
  
  // Message handling
  sendMessage(message: AnyMessage): Promise<void>;
  addMessageHandler(type: MessageType, handler: MessageHandler): void;
  removeMessageHandler(type: MessageType): void;
  
  // Event handling
  on(event: CommunicationEvent, handler: EventHandler): void;
  off(event: CommunicationEvent, handler: EventHandler): void;
  emit(event: CommunicationEvent, data?: any): void;
  
  // Health and status
  getStatus(): CommunicationStatus;
  performHealthCheck(): Promise<HealthCheckResult>;
}

/**
 * Widget-side communication manager interface
 */
export interface WidgetCommunicationManager extends CommunicationManager {
  // Command sending
  sendCommand(command: any): Promise<any>;
  sendCommandWithRetry(command: any, maxRetries: number): Promise<any>;
  
  // Helper script management
  injectHelperScript(): Promise<boolean>;
  checkHelperScript(): Promise<boolean>;
  sendHealthCheck(): Promise<any>;
  
  // Configuration
  updateConfig(config: Partial<CommunicationConfig>): void;
  getConfig(): CommunicationConfig;
}

/**
 * Helper script communication manager interface
 */
export interface HelperCommunicationManager extends CommunicationManager {
  // Action handling
  addActionHandler(actionType: string, handler: ActionHandler): void;
  removeActionHandler(actionType: string): void;
  
  // Page information
  getPageInfo(): PageInformation;
  watchPageChanges(callback: PageChangeCallback): void;
  
  // Element management
  findElement(selector: any): Promise<Element | null>;
  highlightElement(element: Element): void;
  unhighlightElement(element: Element): void;
}

// ============================================================================
// HANDLERS AND CALLBACKS
// ============================================================================

/**
 * Message handler function type
 */
export type MessageHandler = (message: AnyMessage, context: MessageContext) => Promise<void> | void;

/**
 * Action handler function type
 */
export type ActionHandler = (command: any) => Promise<any>;

/**
 * Event handler function type
 */
export type EventHandler = (data: any) => void;

/**
 * Page change callback function type
 */
export type PageChangeCallback = (changes: PageChange[]) => void;

/**
 * Message context information
 */
export interface MessageContext {
  origin: string;                 // Message origin
  timestamp: number;              // When received
  messageId: string;              // Message ID
  sessionId?: string;             // Session ID
  userAgent: string;              // User agent
  isSecure: boolean;              // Secure origin
  metadata: Record<string, any>;  // Additional context
}

// ============================================================================
// COMMUNICATION EVENTS
// ============================================================================

/**
 * Communication event types
 */
export type CommunicationEvent = 
  | 'connected'                   // Connection established
  | 'disconnected'                // Connection lost
  | 'message_sent'                // Message sent
  | 'message_received'            // Message received
  | 'error'                       // Communication error
  | 'security_violation'          // Security violation
  | 'health_check'                // Health check performed
  | 'config_updated'              // Configuration updated
  | 'helper_ready'                // Helper script ready
  | 'helper_error'                // Helper script error
  | 'rate_limited'                // Rate limit hit
  | 'timeout'                     // Communication timeout
  | 'action:result';              // Action result received

/**
 * Event data for different event types
 */
export interface EventData {
  connected: { sessionId: string; capabilities: string[] };
  disconnected: { reason: string; willReconnect: boolean };
  message_sent: { messageId: string; type: MessageType; size: number };
  message_received: { messageId: string; type: MessageType; latency: number };
  error: { error: Error; recoverable: boolean };
  security_violation: { event: SecurityEvent; blocked: boolean };
  health_check: { status: CommunicationStatus; latency: number };
  config_updated: { changes: Partial<CommunicationConfig> };
  helper_ready: { version: string; capabilities: string[] };
  helper_error: { error: string; fatal: boolean };
  rate_limited: { limit: number; window: number; retryAfter: number };
  timeout: { messageId: string; timeoutMs: number };
}

// ============================================================================
// COMMUNICATION STATUS AND HEALTH
// ============================================================================

/**
 * Communication status
 */
export interface CommunicationStatus {
  connected: boolean;             // Currently connected
  connecting: boolean;            // Connection in progress
  lastConnected?: number;         // Last successful connection
  connectionAttempts: number;     // Number of connection attempts
  messagesExchanged: number;      // Total messages exchanged
  lastMessageTime?: number;       // Last message timestamp
  latency?: number;               // Average message latency (ms)
  errorCount: number;             // Number of errors
  lastError?: Error;              // Last error encountered
  securityViolations: number;     // Security violations count
  rateLimitHits: number;          // Rate limit violations
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;               // Overall health status
  connectivity: ConnectivityHealth; // Connection health
  performance: PerformanceHealth; // Performance metrics
  security: SecurityHealth;       // Security status
  capabilities: CapabilityHealth; // Feature capabilities
  recommendations: string[];      // Health recommendations
  timestamp: number;              // When check was performed
}

export interface ConnectivityHealth {
  reachable: boolean;             // Can reach other side
  latency: number;                // Current latency (ms)
  packetLoss: number;             // Packet loss percentage
  stability: number;              // Connection stability (0-1)
}

export interface PerformanceHealth {
  averageLatency: number;         // Average latency (ms)
  peakLatency: number;            // Peak latency (ms)
  throughput: number;             // Messages per second
  memoryUsage: number;            // Memory usage (bytes)
  cpuUsage?: number;              // CPU usage percentage
}

export interface SecurityHealth {
  tokenValid: boolean;            // Security token valid
  originVerified: boolean;        // Origin verification passed
  encryptionActive: boolean;      // Encryption active
  violationCount: number;         // Security violations
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface CapabilityHealth {
  coreFeatures: FeatureStatus[];   // Core feature status
  optionalFeatures: FeatureStatus[]; // Optional feature status
  compatibility: CompatibilityInfo; // Browser compatibility
}

export interface FeatureStatus {
  name: string;                   // Feature name
  available: boolean;             // Feature available
  working: boolean;               // Feature working
  version?: string;               // Feature version
  limitations?: string[];         // Known limitations
}

export interface CompatibilityInfo {
  browser: string;                // Browser name
  version: string;                // Browser version
  supportLevel: 'full' | 'partial' | 'limited' | 'none';
  missingFeatures: string[];      // Unsupported features
  workarounds: string[];          // Available workarounds
}

// ============================================================================
// PAGE INFORMATION AND MONITORING
// ============================================================================

/**
 * Page information structure
 */
export interface PageInformation {
  url: string;                    // Current URL
  title: string;                  // Page title
  domain: string;                 // Domain name
  protocol: string;               // Protocol (http/https)
  readyState: DocumentReadyState; // Document ready state
  hasFrames: boolean;             // Has iframes
  csp: CSPInformation;            // CSP information
  viewport: ViewportInfo;         // Viewport information
  accessibility: AccessibilityInfo; // Accessibility features
  performance: PagePerformanceInfo; // Performance metrics
}

export interface CSPInformation {
  present: boolean;               // CSP header present
  scriptSrc: string[];            // Script sources
  connectSrc: string[];           // Connect sources
  violations: number;             // Violation count
}

export interface ViewportInfo {
  width: number;                  // Viewport width
  height: number;                 // Viewport height
  devicePixelRatio: number;       // Device pixel ratio
  orientation?: string;           // Screen orientation
}

export interface AccessibilityInfo {
  hasScreenReader: boolean;       // Screen reader detected
  highContrast: boolean;          // High contrast mode
  reducedMotion: boolean;         // Reduced motion preference
  keyboardNavigation: boolean;    // Keyboard navigation active
}

export interface PagePerformanceInfo {
  loadTime: number;               // Page load time (ms)
  domContentLoaded: number;       // DOMContentLoaded time (ms)
  firstPaint?: number;            // First paint time (ms)
  firstContentfulPaint?: number;  // First contentful paint (ms)
  memoryUsage?: number;           // Memory usage (bytes)
}

/**
 * Page change detection
 */
export interface PageChange {
  type: PageChangeType;           // Type of change
  timestamp: number;              // When change occurred
  details: PageChangeDetails;     // Change details
  affectedElements?: Element[];   // Affected elements
}

export type PageChangeType = 
  | 'navigation'                  // Page navigation
  | 'dom_mutation'                // DOM structure change
  | 'style_change'                // Style/CSS change
  | 'viewport_change'             // Viewport resize
  | 'visibility_change'           // Page visibility change
  | 'scroll'                      // Page scroll
  | 'focus_change';               // Focus change

export interface PageChangeDetails {
  oldValue?: any;                 // Previous value
  newValue?: any;                 // New value
  target?: string;                // Target selector
  property?: string;              // Changed property
  metadata: Record<string, any>;  // Additional details
}

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================

/**
 * Connection configuration
 */
export interface ConnectionConfig {
  autoReconnect: boolean;         // Auto-reconnect on disconnect
  reconnectInterval: number;      // Reconnect interval (ms)
  maxReconnectAttempts: number;   // Max reconnection attempts
  connectionTimeout: number;      // Connection timeout (ms)
  keepAlive: boolean;             // Send keep-alive messages
  keepAliveInterval: number;      // Keep-alive interval (ms)
}

/**
 * Connection state
 */
export type ConnectionState = 
  | 'disconnected'                // Not connected
  | 'connecting'                  // Connection in progress
  | 'connected'                   // Successfully connected
  | 'reconnecting'                // Reconnection in progress
  | 'failed'                      // Connection failed
  | 'closed';                     // Connection closed

/**
 * Connection metrics
 */
export interface ConnectionMetrics {
  totalConnections: number;       // Total connection attempts
  successfulConnections: number;  // Successful connections
  failedConnections: number;      // Failed connections
  reconnections: number;          // Reconnection attempts
  totalUptime: number;            // Total connected time (ms)
  averageSessionDuration: number; // Average session length (ms)
  longestSession: number;         // Longest session (ms)
  currentSessionDuration: number; // Current session length (ms)
}

// ============================================================================
// MESSAGE QUEUING AND DELIVERY
// ============================================================================

/**
 * Message queue configuration
 */
export interface MessageQueueConfig {
  maxQueueSize: number;           // Maximum queue size
  queueStrategy: QueueStrategy;   // Queuing strategy
  deliveryMode: DeliveryMode;     // Delivery mode
  persistQueue: boolean;          // Persist queue to storage
  priorityLevels: number;         // Number of priority levels
}

export type QueueStrategy = 
  | 'fifo'                        // First in, first out
  | 'lifo'                        // Last in, first out
  | 'priority'                    // Priority-based
  | 'round_robin';                // Round-robin

export type DeliveryMode = 
  | 'immediate'                   // Send immediately
  | 'batched'                     // Batch messages
  | 'scheduled'                   // Scheduled delivery
  | 'on_demand';                  // On-demand delivery

/**
 * Queued message
 */
export interface QueuedMessage {
  id: string;                     // Message ID
  message: AnyMessage;            // The message
  priority: number;               // Message priority
  attempts: number;               // Delivery attempts
  queuedAt: number;               // When queued
  expiresAt?: number;             // When expires
  retryAfter?: number;            // Retry after timestamp
  metadata: Record<string, any>;  // Additional metadata
}

/**
 * Message delivery result
 */
export interface MessageDeliveryResult {
  messageId: string;              // Message ID
  delivered: boolean;             // Successfully delivered
  attempts: number;               // Number of attempts
  latency: number;                // Delivery latency (ms)
  error?: Error;                  // Error if failed
  response?: AnyMessage;          // Response message
}

// ============================================================================
// COMMUNICATION CONFIGURATION
// ============================================================================

/**
 * Main communication configuration
 */
export interface CommunicationConfig {
  // Basic settings
  targetOrigin: string;           // Target origin for messages
  timeout: number;                // Default timeout (ms)
  retries: number;                // Default retry count
  
  // Security
  security: SecurityConfig;       // Security configuration
  
  // Connection
  connection: ConnectionConfig;   // Connection settings
  
  // Message handling
  messageQueue: MessageQueueConfig; // Message queue settings
  
  // Performance
  performance: PerformanceConfig; // Performance settings
  
  // Development
  development: DevelopmentConfig; // Development settings
  
  // Monitoring
  monitoring: MonitoringConfig;   // Monitoring settings
}

/**
 * Simplified communication config for Phase 2 compatibility
 */
export interface SimpleCommunicationConfig {
  targetOrigin: string;
  securityToken?: string;
  debug?: boolean;
  connectionTimeout?: number;
  retryAttempts?: number;
  timeout?: number;
}

export interface PerformanceConfig {
  enableCompression: boolean;     // Compress large messages
  enableBatching: boolean;        // Batch small messages
  maxMessageSize: number;         // Maximum message size
  batchSize: number;              // Batch size
  batchTimeout: number;           // Batch timeout (ms)
  enableCaching: boolean;         // Cache frequently used data
  cacheSize: number;              // Cache size limit
}

export interface DevelopmentConfig {
  debug: boolean;                 // Enable debug mode
  verbose: boolean;               // Verbose logging
  mockMode: boolean;              // Mock communication
  testHooks: boolean;             // Enable test hooks
  devTools: boolean;              // DevTools integration
}

export interface MonitoringConfig {
  enabled: boolean;               // Enable monitoring
  sampleRate: number;             // Monitoring sample rate
  metricsEndpoint?: string;       // Metrics endpoint
  alertEndpoints: string[];       // Alert endpoints
  retentionPeriod: number;        // Data retention (ms)
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Communication error
 */
export interface CommunicationError extends Error {
  code: CommunicationErrorCode;   // Error code
  messageId?: string;             // Related message ID
  recoverable: boolean;           // Can be recovered
  retryAfter?: number;            // Retry after (ms)
  details: Record<string, any>;   // Error details
}

export type CommunicationErrorCode = 
  | 'CONNECTION_FAILED'           // Connection failed
  | 'MESSAGE_TIMEOUT'             // Message timeout
  | 'MESSAGE_TOO_LARGE'           // Message too large
  | 'QUEUE_FULL'                  // Message queue full
  | 'INVALID_ORIGIN'              // Invalid origin
  | 'SERIALIZATION_ERROR'         // Serialization error
  | 'NETWORK_ERROR'               // Network error
  | 'PROTOCOL_ERROR'              // Protocol error
  | 'RATE_LIMITED'                // Rate limited
  | 'CONFIGURATION_ERROR';        // Configuration error

/**
 * Communication statistics
 */
export interface CommunicationStats {
  messages: MessageStats;         // Message statistics
  connection: ConnectionMetrics;  // Connection metrics
  performance: PerformanceStats;  // Performance statistics
  errors: ErrorStats;             // Error statistics
  security: SecurityStats;        // Security statistics
}

export interface MessageStats {
  sent: number;                   // Messages sent
  received: number;               // Messages received
  failed: number;                 // Failed messages
  retries: number;                // Message retries
  averageSize: number;            // Average message size
  totalSize: number;              // Total data transferred
}

export interface PerformanceStats {
  averageLatency: number;         // Average latency (ms)
  minLatency: number;             // Minimum latency (ms)
  maxLatency: number;             // Maximum latency (ms)
  throughput: number;             // Messages per second
  bandwidth: number;              // Bytes per second
}

export interface ErrorStats {
  total: number;                  // Total errors
  byType: Record<string, number>; // Errors by type
  recoverable: number;            // Recoverable errors
  fatal: number;                  // Fatal errors
  lastError?: Error;              // Last error
}

export interface SecurityStats {
  violations: number;             // Security violations
  blockedMessages: number;        // Blocked messages
  tokenRotations: number;         // Token rotations
  lastViolation?: SecurityEvent;  // Last violation
}

// ============================================================================
