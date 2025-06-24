// Type definitions for AI Voice Assistant

// LiveKit types
declare global {
  interface Window {
    // AI Assistant Helper (runs in parent window)
    AIAssistantHelper?: {
      version: string;
      executeAction: (action: any) => any;
      executeActions: (commands: any) => any;
      handleLiveKitDataMessage: (data: any) => any;
      findElement: (actionCommand: any) => Element | null;
      highlightElement: (element: Element) => void;
      isReady: () => boolean;
      getSupportedActions: () => string[];
    };
    
    // AI Assistant DOM Monitor (runs in parent window)
    AIAssistantDOMMonitor?: {
      version: string;
      // Main API methods
      findElements: (intent: string, options?: any) => DOMMonitorElement[];
      getAllElements: (filter?: DOMMonitorFilter) => DOMMonitorElement[];
      getElementBySelector: (selector: string) => DOMMonitorElement | null;
      // Status and stats
      getStats: () => DOMMonitorStats;
      getStatus: () => DOMMonitorStatus;
      // Control methods
      refresh: () => { success: boolean; message: string };
      cleanup: () => { success: boolean; message: string; removedElements?: number };
      // Utility methods
      isReady: () => boolean;
      // Internal (for debugging)
      _internal?: any;
    };
    
    // AI Assistant Loader (runs in parent window)
    AIAssistantLoader?: {
      toggle: () => void;
      minimize: () => void;
      show: () => void;
      hide: () => void;
      updateConfig: (newConfig: any) => void;
      sendMessageToIframe: (message: any) => void;
      domMonitor?: {
        findElements: (intent: string, options?: any) => DOMMonitorElement[];
        getStats: () => DOMMonitorStats | null;
        getAllElements: (filter?: any) => DOMMonitorElement[];
        refresh: () => any;
        isReady: () => boolean;
        getStatus: () => any;
      };
    };
  }
}

// DOM Monitor specific types
export interface DOMMonitorElement {
  id?: string;
  elementId?: string;
  element?: {
    element: Element;
  };
  tagName: string;
  text: string;
  role: string;
  selectors: DOMMonitorSelector[];
  attributes: Record<string, string>;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visibility: boolean;
  interactable: boolean;
  accessibilityInfo: {
    role?: string;
    ariaLabel?: string;
    ariaDescribedBy?: string;
    tabIndex?: number;
    disabled?: boolean;
    required?: boolean;
    readonly?: boolean;
  };
  lastSeen: number;
  firstSeen: number;
  updateCount: number;
  confidence?: number;
}

export interface DOMMonitorSelector {
  type: string;
  value: string;
  priority: number;
  confidence: number;
}

export interface DOMMonitorFilter {
  visible?: boolean;
  interactable?: boolean;
  role?: string;
  tag?: string;
}

export interface DOMMonitorStats {
  totalElements: number;
  visibleElements: number;
  interactableElements: number;
  textIndexSize: number;
  roleIndexSize: number;
  selectorIndexSize?: number;
  memoryUsage: number; // in KB
}

export interface DOMMonitorStatus {
  version: string;
  initialized: boolean;
  observing: boolean;
  stats: DOMMonitorStats;
  performance: {
    cacheSize: number;
    memoryUsage: number;
    uptime: number;
  };
}

// DOM Monitor Request/Response types for postMessage communication
export interface DOMMonitorRequest {
  type: "dom_monitor_request";
  request_id: string;
  request_type: "current_state" | "find_elements" | "get_stats";
  intent?: string;
  options?: {
    visible?: boolean;
    interactable?: boolean;
    max_elements?: number;
  };
  timestamp: number;
}

export interface DOMMonitorResponse {
  type: "dom_monitor_response";
  request_id: string;
  success: boolean;
  data?: {
    elements?: DOMMonitorElement[];
    stats?: DOMMonitorStats;
    status?: DOMMonitorStatus;
    page_info?: {
      url: string;
      title: string;
      domain: string;
      timestamp: number;
    };
    truncated?: boolean;
    original_count?: number;
  };
  error?: string;
  timestamp: number;
}

// Action Command types
export interface ActionCommand {
  action: string;
  selector?: string;
  xpath?: string;
  id?: string;
  command_id?: string;
  value?: string;
  text?: string;
  options?: {
    description?: string;
    highlight?: boolean;
    clear_first?: boolean;
    clearFirst?: boolean;
    direction?: string;
    amount?: number;
    hybrid_match?: boolean;
    element_data?: any;
  };
  coordinates?: {
    x: number;
    y: number;
  };
  url?: string;
  timeout?: number;
  delay_before?: number;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  action_id?: string;
  element_found?: boolean;
  value?: string;
  text?: string;
}

export {}; // Make this a module
