/**
 * Message Type Definitions for Voice Assistant Action Execution
 * 
 * This file defines all message interfaces used for communication between
 * the voice assistant widget and helper script via postMessage.
 */

// ============================================================================
// CORE MESSAGE TYPES
// ============================================================================

/**
 * Base interface for all messages
 */
export interface BaseMessage {
  id: string;                    // Unique message identifier
  type: MessageType;             // Message type discriminator
  timestamp: number;             // Unix timestamp when message was created
  source: MessageSource;         // Who sent this message
  securityToken?: string;        // Security token for authentication
}

/**
 * All possible message types
 */
export type MessageType = 
  | 'ACTION_EXECUTE'       // Execute an action on the page
  | 'ACTION_COMMAND'       // Command to execute action (alias for ACTION_EXECUTE)
  | 'ACTION_RESULT'        // Result of action execution
  | 'HEALTH_CHECK'         // Check if helper script is alive
  | 'HEALTH_RESPONSE'      // Response to health check
  | 'GET_PAGE_INFO'        // Request page information
  | 'PAGE_INFO_RESPONSE'   // Page information response
  | 'ERROR'                // Error occurred
  | 'HANDSHAKE_REQUEST'    // Initial connection handshake
  | 'HANDSHAKE_RESPONSE'   // Handshake response
  | 'TOKEN_SYNC'           // Synchronize security tokens
  | 'TOKEN_SYNC_ACK';      // Token sync acknowledgment

/**
 * Message source identification
 */
export type MessageSource = 
  | 'voice-assistant'      // Message from voice assistant widget
  | 'helper-script'        // Message from helper script
  | 'widget-bridge';       // Message from widget-helper bridge

// ============================================================================
// ACTION EXECUTION MESSAGES
// ============================================================================

/**
 * Command to execute an action on the page
 */
export interface ActionCommand extends BaseMessage {
  type: 'ACTION_EXECUTE' | 'ACTION_COMMAND';
  payload: {
    action: ActionType | string;     // Type of action to execute (allow string for flexibility)
    target: ElementSelector | ElementTarget; // How to find the target element
    data?: ActionData;              // Additional data for the action
    options?: ActionOptions;        // Execution options
    context?: ActionContext;        // Additional context information
  };
}

/**
 * Result of action execution
 */
export interface ActionResult extends BaseMessage {
  type: 'ACTION_RESULT';
  commandId: string;               // ID of the original command
  success: boolean;                // Whether action succeeded
  payload: {
    executedAction: ActionType;
    elementFound: boolean;
    elementDetails?: ElementDetails;
    error?: ActionError;
    screenshot?: string;           // Base64 screenshot for verification
    nextSuggestions?: string[];    // What the user can do next
    performanceMetrics?: PerformanceMetrics;
  };
}

// ============================================================================
// ACTION TYPES AND DATA
// ============================================================================

/**
 * All supported action types
 */
export type ActionType = 
  // Click actions
  | 'click' | 'double_click' | 'right_click'
  // Input actions
  | 'type' | 'clear' | 'select_text' | 'paste'
  // Form actions
  | 'submit' | 'select_option' | 'check' | 'uncheck'
  // Navigation actions
  | 'scroll' | 'scroll_to_element' | 'navigate'
  // Focus actions
  | 'focus' | 'blur' | 'hover'
  // Advanced actions
  | 'drag_drop' | 'key_press' | 'wait'
  // Custom actions
  | 'custom';

/**
 * Data associated with specific actions
 */
export type ActionData = 
  | TypeActionData
  | SelectActionData
  | ScrollActionData
  | DragDropActionData
  | KeyPressActionData
  | NavigateActionData
  | CustomActionData;

export interface TypeActionData {
  text: string;                    // Text to type
  clearFirst?: boolean;            // Clear field before typing
  pressEnter?: boolean;            // Press enter after typing
  typingSpeed?: number;            // Delay between keystrokes (ms)
}

export interface SelectActionData {
  value?: string;                  // Value to select
  text?: string;                   // Text to select by
  index?: number;                  // Index to select
}

export interface ScrollActionData {
  direction: 'up' | 'down' | 'left' | 'right' | 'to_element';
  distance?: number;               // Pixels to scroll
  smooth?: boolean;                // Smooth scrolling
}

export interface DragDropActionData {
  target: ElementSelector;         // Drop target
  offsetX?: number;                // X offset for drop
  offsetY?: number;                // Y offset for drop
}

export interface KeyPressActionData {
  key: string;                     // Key to press (e.g., 'Enter', 'Tab')
  modifiers?: KeyModifier[];       // Modifier keys
}

export interface NavigateActionData {
  url: string;                     // URL to navigate to
  newTab?: boolean;               // Open in new tab
}

export interface CustomActionData {
  actionName: string;              // Custom action identifier
  parameters: Record<string, any>; // Custom parameters
}

export type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'meta';

// ============================================================================
// ELEMENT SELECTION
// ============================================================================

/**
 * Multiple strategies for finding elements
 */
export interface ElementSelector {
  primary: SelectorStrategy;       // Primary selection method
  fallbacks: SelectorStrategy[];   // Backup selection methods
  validation: ElementValidation;   // Element validation requirements
  timeout?: number;               // How long to wait for element (ms)
}

/**
 * Different strategies for element selection
 */
export type SelectorStrategy = 
  | CSSSelector
  | XPathSelector
  | IDSelector
  | TextSelector
  | PositionSelector
  | SmartSelector
  | AttributeSelector
  | RoleSelector;

/**
 * Element target for action execution (alias for backward compatibility)
 */
export interface ElementTarget {
  strategy: 'css' | 'xpath' | 'text' | 'attribute' | 'smart' | 'position';
  value: string;
  options?: Record<string, any>;
  attribute?: string;
  coordinates?: { x: number; y: number };
  fallbacks?: ElementTarget[];
}

export interface CSSSelector {
  method: 'css';
  value: string;                   // CSS selector string
}

export interface XPathSelector {
  method: 'xpath';
  value: string;                   // XPath expression
}

export interface IDSelector {
  method: 'id';
  value: string;                   // Element ID
}

export interface TextSelector {
  method: 'text';
  value: string;                   // Text content to match
  tag?: string;                    // Tag type (button, a, etc.)
  exact?: boolean;                 // Exact text match vs contains
}

export interface PositionSelector {
  method: 'position';
  x: number;                       // X coordinate
  y: number;                       // Y coordinate
  tolerance: number;               // Pixel tolerance
}

export interface SmartSelector {
  method: 'smart';
  description: string;             // Natural language description
  context?: string;                // Additional context
}

export interface AttributeSelector {
  method: 'attribute';
  attribute: string;               // Attribute name
  value: string;                   // Attribute value
  tag?: string;                    // Tag type filter
}

export interface RoleSelector {
  method: 'role';
  role: string;                    // ARIA role
  name?: string;                   // Accessible name
}

/**
 * Validation requirements for selected elements
 */
export interface ElementValidation {
  mustBeVisible?: boolean;         // Element must be visible
  mustBeClickable?: boolean;       // Element must be clickable
  mustBeEnabled?: boolean;         // Element must be enabled
  mustHaveText?: string;          // Element must contain text
  mustHaveAttribute?: {           // Element must have attribute
    name: string;
    value?: string;
  };
  mustBeInViewport?: boolean;     // Element must be in viewport
  mustNotBeOverlaid?: boolean;    // Element must not be covered
}

// ============================================================================
// ELEMENT DETAILS
// ============================================================================

/**
 * Detailed information about an element
 */
export interface ElementDetails {
  // Basic properties
  tagName: string;
  id: string;
  className: string;
  textContent: string;
  innerHTML: string;
  
  // Attributes
  attributes: Record<string, string>;
  
  // Position and size
  boundingRect: DOMRect;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // State
  isVisible: boolean;
  isClickable: boolean;
  isEnabled: boolean;
  isInViewport: boolean;
  isOverlaid: boolean;
  
  // Accessibility
  ariaRole?: string;
  ariaLabel?: string;
  tabIndex?: number;
  
  // Computed styles (key ones)
  computedStyles: {
    display: string;
    visibility: string;
    opacity: string;
    pointerEvents: string;
    zIndex: string;
  };
  
  // Context
  parentElements: ElementSummary[];
  siblingElements: ElementSummary[];
}

export interface ElementSummary {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
}

// ============================================================================
// ACTION OPTIONS AND CONTEXT
// ============================================================================

/**
 * Options for action execution
 */
export interface ActionOptions {
  timeout?: number;               // Action timeout (ms)
  retries?: number;               // Number of retries on failure
  waitForNavigation?: boolean;    // Wait for page navigation
  waitForElement?: boolean;       // Wait for element to appear
  verifyAction?: boolean;         // Verify action was successful
  screenshot?: boolean;           // Take screenshot after action
  highlightElement?: boolean;     // Highlight element before action
  delayAfter?: number;           // Delay after action (ms)
}

/**
 * Context information for actions
 */
export interface ActionContext {
  userCommand: string;            // Original user command
  websiteId?: string;             // Website identifier
  pageUrl: string;                // Current page URL
  pageTitle: string;              // Current page title
  userAgent: string;              // Browser user agent
  viewport: {                     // Viewport dimensions
    width: number;
    height: number;
  };
  sessionId?: string;             // User session identifier
}

// ============================================================================
// SYSTEM MESSAGES
// ============================================================================

/**
 * Health check message
 */
export interface HealthCheck extends BaseMessage {
  type: 'HEALTH_CHECK';
  payload: {
    requestedInfo?: HealthInfoType[];
  };
}

/**
 * Health check response
 */
export interface HealthResponse extends BaseMessage {
  type: 'HEALTH_RESPONSE';
  payload: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    capabilities: string[];
    performance: PerformanceMetrics;
    info?: Record<string, any>;
  };
}

export type HealthInfoType = 
  | 'performance' 
  | 'capabilities' 
  | 'memory' 
  | 'errors';

/**
 * Page information request
 */
export interface PageInfoRequest extends BaseMessage {
  type: 'GET_PAGE_INFO';
  payload: {
    includeElements?: boolean;      // Include interactive elements
    includeStructure?: boolean;     // Include page structure
    includeMetadata?: boolean;      // Include page metadata
  };
}

/**
 * Page information response
 */
export interface PageInfoResponse extends BaseMessage {
  type: 'PAGE_INFO_RESPONSE';
  payload: {
    url: string;
    title: string;
    metadata: PageMetadata;
    structure?: PageStructure;
    elements?: InteractiveElement[];
    screenshots?: ScreenshotData;
  };
}

export interface PageMetadata {
  charset: string;
  language: string;
  description?: string;
  keywords?: string[];
  author?: string;
  viewport?: string;
  robots?: string;
}

export interface PageStructure {
  headings: HeadingElement[];
  forms: FormElement[];
  navigation: NavigationElement[];
  main: MainContentElement[];
}

export interface InteractiveElement {
  type: string;                    // Element type (button, input, etc.)
  selector: string;                // CSS selector
  xpath: string;                   // XPath
  text: string;                    // Visible text
  attributes: Record<string, string>;
  position: { x: number; y: number; width: number; height: number; };
  isVisible: boolean;
  isClickable: boolean;
}

export interface HeadingElement {
  level: number;                   // H1, H2, etc.
  text: string;
  id?: string;
}

export interface FormElement {
  action?: string;
  method?: string;
  inputs: FormInput[];
  submitButton?: InteractiveElement;
}

export interface FormInput {
  type: string;                    // input type
  name?: string;
  placeholder?: string;
  required: boolean;
  selector: string;
}

export interface NavigationElement {
  type: 'menu' | 'breadcrumb' | 'pagination';
  items: NavigationItem[];
}

export interface NavigationItem {
  text: string;
  href?: string;
  isActive: boolean;
  selector: string;
}

export interface MainContentElement {
  type: string;
  text: string;
  selector: string;
}

export interface ScreenshotData {
  fullPage?: string;              // Base64 full page screenshot
  viewport?: string;              // Base64 viewport screenshot
  timestamp: number;
}

// ============================================================================
// HANDSHAKE AND SECURITY
// ============================================================================

/**
 * Initial handshake request
 */
export interface HandshakeRequest extends BaseMessage {
  type: 'HANDSHAKE_REQUEST';
  payload: {
    version: string;                // Protocol version
    capabilities: string[];         // Supported capabilities
    origin: string;                 // Widget origin
    securityToken: string;          // Initial security token
  };
}

/**
 * Handshake response
 */
export interface HandshakeResponse extends BaseMessage {
  type: 'HANDSHAKE_RESPONSE';
  payload: {
    accepted: boolean;              // Handshake accepted
    version: string;                // Helper script version
    capabilities: string[];         // Helper capabilities
    securityToken: string;          // Confirmed security token
    sessionId: string;              // Session identifier
    error?: string;                 // Error if not accepted
  };
}

/**
 * Token synchronization
 */
export interface TokenSync extends BaseMessage {
  type: 'TOKEN_SYNC';
  payload: {
    newToken: string;               // New security token
    expiresAt: number;              // Token expiration timestamp
  };
}

/**
 * Token sync acknowledgment
 */
export interface TokenSyncAck extends BaseMessage {
  type: 'TOKEN_SYNC_ACK';
  payload: {
    tokenReceived: string;          // Confirmed token
    status: 'accepted' | 'rejected';
    error?: string;
  };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Error message
 */
export interface ErrorMessage extends BaseMessage {
  type: 'ERROR';
  payload: {
    error: ActionError;
    originalMessageId?: string;     // ID of message that caused error
    recoverable: boolean;           // Whether error is recoverable
    suggestions?: string[];         // Recovery suggestions
  };
}

/**
 * Action execution error
 */
export interface ActionError {
  type: ActionErrorType | string;
  message: string;
  code?: string;
  details?: Record<string, any>;
  timestamp: number;
  stackTrace?: string;
}

export type ActionErrorType = 
  | 'ELEMENT_NOT_FOUND'           // Target element not found
  | 'ELEMENT_NOT_CLICKABLE'       // Element exists but not clickable
  | 'ELEMENT_NOT_VISIBLE'         // Element exists but not visible
  | 'PERMISSION_DENIED'           // Action not allowed
  | 'TIMEOUT'                     // Action timed out
  | 'NETWORK_ERROR'               // Network connectivity issue
  | 'SECURITY_VIOLATION'          // Security policy violation
  | 'INVALID_SELECTOR'            // Invalid element selector
  | 'INVALID_ACTION'              // Unsupported action type
  | 'INVALID_DATA'                // Invalid action data
  | 'SCRIPT_ERROR'                // JavaScript execution error
  | 'CSP_VIOLATION'               // Content Security Policy violation
  | 'UNKNOWN_ERROR';              // Unexpected error

// ============================================================================
// PERFORMANCE AND MONITORING
// ============================================================================

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  executionTime: number;          // Total execution time (ms)
  elementFindTime: number;        // Time to find element (ms)
  actionExecutionTime: number;    // Time to execute action (ms)
  memoryUsage?: number;           // Memory usage (bytes)
  messageLatency?: number;        // postMessage latency (ms)
  retryCount: number;             // Number of retries
  timestamp: number;              // When metrics were collected
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Union of all possible message types
 */
export type AnyMessage = 
  | ActionCommand
  | ActionResult
  | HealthCheck
  | HealthResponse
  | PageInfoRequest
  | PageInfoResponse
  | HandshakeRequest
  | HandshakeResponse
  | TokenSync
  | TokenSyncAck
  | ErrorMessage;

/**
 * Message validation result
 */
export interface MessageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Communication configuration
 */
export interface CommunicationConfig {
  timeout: number;                // Default timeout (ms)
  retries: number;                // Default retry count
  allowedOrigins: string[];       // Allowed message origins
  securityToken: string;          // Security token
  debug: boolean;                 // Enable debug logging
  maxMessageSize: number;         // Maximum message size (bytes)
  rateLimiting: {
    maxMessagesPerSecond: number;
    maxMessagesPerMinute: number;
    cooldownPeriod: number;       // Cooldown after rate limit (ms)
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export all types for easy importing
export * from './security';
export * from './communication'; 