/**
 * RAG Element Matcher
 * 
 * Integrates with the RAG system to enable smart element finding using
 * natural language descriptions and website content knowledge
 */

import { ElementTarget } from '../types/messages';

interface RAGConfig {
  apiUrl: string;
  websiteId: string;
  apiKey?: string;
  timeout?: number;
  debug?: boolean;
}

interface ElementQuery {
  description: string;
  action?: string;
  context?: string;
  pageUrl?: string;
}

interface RAGResponse {
  success: boolean;
  elements: RAGElement[];
  confidence: number;
  reasoning: string;
  alternatives?: RAGElement[];
}

interface RAGElement {
  selector: string;
  strategy: 'css' | 'xpath' | 'text' | 'attribute';
  confidence: number;
  description: string;
  elementType: string;
  attributes?: Record<string, string>;
  position?: { x: number; y: number };
  textContent?: string;
  reasoning?: string;
}

interface CacheEntry {
  query: string;
  response: RAGResponse;
  timestamp: number;
  pageUrl: string;
}

export class RAGElementMatcher {
  private config: RAGConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private requestQueue: Map<string, Promise<RAGResponse>> = new Map();

  constructor(config: RAGConfig) {
    this.config = {
      timeout: 10000,
      debug: false,
      ...config
    };
  }

  /**
   * Main method to find elements using natural language description
   */
  async findElements(query: ElementQuery): Promise<ElementTarget[]> {
    try {
      this.log('Finding elements for query:', query.description);

      // Check cache first
      const cacheKey = this.generateCacheKey(query);
      const cached = this.checkCache(cacheKey);
      if (cached) {
        this.log('Found cached result');
        return this.convertRAGElementsToTargets(cached.elements);
      }

      // Check if request is already in progress
      let responsePromise = this.requestQueue.get(cacheKey);
      if (!responsePromise) {
        responsePromise = this.queryRAGSystem(query);
        this.requestQueue.set(cacheKey, responsePromise);
      }

      const response = await responsePromise;
      this.requestQueue.delete(cacheKey);

      if (response.success) {
        // Cache successful response
        this.cacheResponse(cacheKey, response, query.pageUrl || window.location.href);
        
        this.log(`Found ${response.elements.length} elements with confidence ${response.confidence}`);
        return this.convertRAGElementsToTargets(response.elements);
      } else {
        this.log('RAG query failed, falling back to heuristics');
        return this.fallbackHeuristicMatching(query);
      }

    } catch (error) {
      this.log('RAG element matching error:', error);
      return this.fallbackHeuristicMatching(query);
    }
  }

  /**
   * Find the best single element for an action
   */
  async findBestElement(query: ElementQuery): Promise<ElementTarget | null> {
    const elements = await this.findElements(query);
    
    if (elements.length === 0) {
      return null;
    }

    // Return the highest confidence element
    return elements[0];
  }

  /**
   * Query the RAG system for element information
   */
  private async queryRAGSystem(query: ElementQuery): Promise<RAGResponse> {
    const requestBody = {
      website_id: this.config.websiteId,
      query: this.buildRAGQuery(query),
      query_type: 'element_finding',
      page_url: query.pageUrl || window.location.href,
      context: {
        current_url: window.location.href,
        page_title: document.title,
        user_action: query.action,
        description: query.description,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      this.log('Querying RAG system:', requestBody);

      const response = await fetch(`${this.config.apiUrl}/query-website-knowledge/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`RAG API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseRAGResponse(data, query);

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Build optimized query for RAG system
   */
  private buildRAGQuery(query: ElementQuery): string {
    const parts = [];

    // Add context about the intended action
    if (query.action) {
      parts.push(`I want to ${query.action}`);
    }

    // Add the main description
    parts.push(query.description);

    // Add context if provided
    if (query.context) {
      parts.push(`Context: ${query.context}`);
    }

    // Add current page info
    parts.push(`Current page: ${document.title}`);
    parts.push(`URL: ${window.location.href}`);

    // Add request for specific element information
    parts.push('Please provide CSS selectors, XPath expressions, or text content to locate this element.');

    return parts.join('. ');
  }

  /**
   * Parse RAG system response into structured format
   */
  private parseRAGResponse(data: any, query: ElementQuery): RAGResponse {
    try {
      // Extract element information from RAG response
      const responseText = data.response || data.answer || '';
      const elements = this.extractElementsFromText(responseText, query);

      return {
        success: elements.length > 0,
        elements,
        confidence: this.calculateOverallConfidence(elements),
        reasoning: responseText,
        alternatives: elements.slice(1) // Alternative matches
      };

    } catch (error) {
      this.log('Error parsing RAG response:', error);
      return {
        success: false,
        elements: [],
        confidence: 0,
        reasoning: 'Failed to parse RAG response'
      };
    }
  }

  /**
   * Extract element selectors from RAG response text
   */
  private extractElementsFromText(text: string, query: ElementQuery): RAGElement[] {
    const elements: RAGElement[] = [];

    // Look for CSS selectors
    const cssMatches = text.match(/(?:css selector|selector):\s*([^.\n]+)/gi);
    if (cssMatches) {
      cssMatches.forEach((match, index) => {
        const selector = match.replace(/.*:\s*/, '').trim().replace(/['"]/g, '');
        if (selector) {
          elements.push({
            selector,
            strategy: 'css',
            confidence: 0.9 - (index * 0.1),
            description: query.description,
            elementType: this.inferElementType(selector),
            reasoning: 'Extracted from RAG CSS selector suggestion'
          });
        }
      });
    }

    // Look for XPath expressions
    const xpathMatches = text.match(/(?:xpath|XPath):\s*([^.\n]+)/gi);
    if (xpathMatches) {
      xpathMatches.forEach((match, index) => {
        const xpath = match.replace(/.*:\s*/, '').trim().replace(/['"]/g, '');
        if (xpath.startsWith('//') || xpath.startsWith('/')) {
          elements.push({
            selector: xpath,
            strategy: 'xpath',
            confidence: 0.85 - (index * 0.1),
            description: query.description,
            elementType: this.inferElementTypeFromXPath(xpath),
            reasoning: 'Extracted from RAG XPath suggestion'
          });
        }
      });
    }

    // Look for text content matches
    const textMatches = text.match(/(?:text content|text|label):\s*"([^"]+)"/gi);
    if (textMatches) {
      textMatches.forEach((match, index) => {
        const textContent = match.replace(/.*:\s*"/, '').replace(/"$/, '');
        if (textContent) {
          elements.push({
            selector: textContent,
            strategy: 'text',
            confidence: 0.8 - (index * 0.1),
            description: query.description,
            elementType: 'unknown',
            textContent,
            reasoning: 'Extracted from RAG text content suggestion'
          });
        }
      });
    }

    // Look for attribute-based selectors
    const attrMatches = text.match(/\[([^=]+)=["']([^"']+)["']\]/g);
    if (attrMatches) {
      attrMatches.forEach((match, index) => {
        elements.push({
          selector: match,
          strategy: 'css',
          confidence: 0.75 - (index * 0.1),
          description: query.description,
          elementType: 'unknown',
          reasoning: 'Extracted from RAG attribute selector'
        });
      });
    }

    // If no specific selectors found, try to extract button/link text
    if (elements.length === 0) {
      const buttonTextMatches = text.match(/(?:button|link|click).*?["']([^"']+)["']/gi);
      if (buttonTextMatches) {
        buttonTextMatches.forEach((match, index) => {
          const buttonText = match.replace(/.*["']/, '').replace(/["'].*/, '');
          if (buttonText && buttonText.length > 1) {
            elements.push({
              selector: buttonText,
              strategy: 'text',
              confidence: 0.7 - (index * 0.1),
              description: query.description,
              elementType: 'button',
              textContent: buttonText,
              reasoning: 'Extracted button text from RAG response'
            });
          }
        });
      }
    }

    return elements.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Convert RAG elements to ElementTarget format
   */
  private convertRAGElementsToTargets(ragElements: RAGElement[]): ElementTarget[] {
    return ragElements.map(element => {
      const target: ElementTarget = {
        strategy: element.strategy,
        value: element.selector,
        options: {
          confidence: element.confidence,
          ragReasoning: element.reasoning
        }
      };

      // Add fallbacks for high-confidence elements
      if (element.confidence > 0.8 && element.strategy !== 'text' && element.textContent) {
        target.fallbacks = [{
          strategy: 'text',
          value: element.textContent
        }];
      }

      return target;
    });
  }

  /**
   * Fallback heuristic matching when RAG fails
   */
  private fallbackHeuristicMatching(query: ElementQuery): ElementTarget[] {
    this.log('Using fallback heuristic matching');
    
    const targets: ElementTarget[] = [];
    const description = query.description.toLowerCase();

    // Common button patterns
    if (description.includes('button') || description.includes('click')) {
      targets.push({
        strategy: 'css',
        value: 'button, input[type="button"], input[type="submit"]',
        fallbacks: [
          { strategy: 'text', value: query.description },
          { strategy: 'attribute', value: query.description, attribute: 'aria-label' }
        ]
      });
    }

    // Form input patterns
    if (description.includes('input') || description.includes('type') || description.includes('enter')) {
      targets.push({
        strategy: 'css',
        value: 'input[type="text"], input[type="email"], input[type="password"], textarea',
        fallbacks: [
          { strategy: 'attribute', value: query.description, attribute: 'placeholder' },
          { strategy: 'attribute', value: query.description, attribute: 'name' }
        ]
      });
    }

    // Link patterns
    if (description.includes('link') || description.includes('navigate')) {
      targets.push({
        strategy: 'css',
        value: 'a[href]',
        fallbacks: [
          { strategy: 'text', value: query.description }
        ]
      });
    }

    // Generic text-based fallback
    targets.push({
      strategy: 'text',
      value: query.description
    });

    return targets;
  }

  /**
   * Helper methods
   */
  private inferElementType(selector: string): string {
    if (selector.includes('button')) return 'button';
    if (selector.includes('input')) return 'input';
    if (selector.includes('select')) return 'select';
    if (selector.includes('textarea')) return 'textarea';
    if (selector.includes('a')) return 'link';
    if (selector.includes('form')) return 'form';
    return 'unknown';
  }

  private inferElementTypeFromXPath(xpath: string): string {
    if (xpath.includes('button')) return 'button';
    if (xpath.includes('input')) return 'input';
    if (xpath.includes('select')) return 'select';
    if (xpath.includes('textarea')) return 'textarea';
    if (xpath.includes('a')) return 'link';
    return 'unknown';
  }

  private calculateOverallConfidence(elements: RAGElement[]): number {
    if (elements.length === 0) return 0;
    
    // Weighted average with higher weight for first element
    let totalWeight = 0;
    let weightedSum = 0;

    elements.forEach((element, index) => {
      const weight = 1 / (index + 1);
      weightedSum += element.confidence * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private generateCacheKey(query: ElementQuery): string {
    const keyParts = [
      query.description,
      query.action || '',
      query.context || '',
      query.pageUrl || window.location.href
    ];
    return keyParts.join('|').toLowerCase();
  }

  private checkCache(cacheKey: string): RAGResponse | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    // Check if cache entry is still valid (5 minutes)
    const isValid = Date.now() - entry.timestamp < 5 * 60 * 1000;
    if (!isValid) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Check if page URL still matches
    const currentUrl = window.location.href;
    if (entry.pageUrl !== currentUrl) {
      return null;
    }

    return entry.response;
  }

  private cacheResponse(cacheKey: string, response: RAGResponse, pageUrl: string): void {
    this.cache.set(cacheKey, {
      query: cacheKey,
      response,
      timestamp: Date.now(),
      pageUrl
    });

    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[RAGElementMatcher]', ...args);
    }
  }

  // Public utility methods
  public clearCache(): void {
    this.cache.clear();
    this.log('Cache cleared');
  }

  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  public updateConfig(newConfig: Partial<RAGConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('Config updated:', this.config);
  }

  public async testConnection(): Promise<boolean> {
    try {
      const testQuery: ElementQuery = {
        description: 'test connection',
        action: 'test'
      };

      const response = await this.queryRAGSystem(testQuery);
      return response.success;

    } catch (error) {
      this.log('Connection test failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create RAG matcher with common configurations
 */
export function createRAGElementMatcher(config: RAGConfig): RAGElementMatcher {
  return new RAGElementMatcher(config);
}

/**
 * Auto-configure RAG matcher from environment
 */
export function createAutoConfiguredRAGMatcher(websiteId: string): RAGElementMatcher | null {
  // Try to get config from global variables or environment
  const apiUrl = (window as any).VOICE_ASSISTANT_API_URL || 
                 process.env.NEXT_PUBLIC_API_URL || 
                 'http://localhost:8000';

  const apiKey = (window as any).VOICE_ASSISTANT_API_KEY || 
                 process.env.VOICE_ASSISTANT_API_KEY;

  if (!apiUrl || !websiteId) {
    console.warn('RAG Element Matcher: Missing required configuration');
    return null;
  }

  return new RAGElementMatcher({
    apiUrl,
    websiteId,
    apiKey,
    debug: process.env.NODE_ENV === 'development'
  });
}

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).RAGElementMatcher = RAGElementMatcher;
  (window as any).createRAGElementMatcher = createRAGElementMatcher;
  (window as any).createAutoConfiguredRAGMatcher = createAutoConfiguredRAGMatcher;
} 