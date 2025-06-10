/**
 * Element Finder
 * 
 * Smart element detection using multiple strategies:
 * - CSS selectors
 * - XPath expressions  
 * - Text content matching
 * - Position-based selection
 * - Accessibility attributes
 * - Smart AI-enhanced finding
 */

import { ElementTarget } from '../types/messages';

interface ElementFinderConfig {
  timeout?: number;
  retryAttempts?: number;
  debug?: boolean;
  strictMode?: boolean;
  enableSmartFinding?: boolean;
}

interface FindResult {
  element: Element | null;
  strategy: string;
  confidence: number;
  alternatives: Element[];
  metadata: {
    searchTime: number;
    attemptsMade: number;
    strategyUsed: string;
    fallbacksUsed: string[];
  };
}

export class ElementFinder {
  private config: ElementFinderConfig;
  private elementCache: Map<string, WeakRef<Element>> = new Map();
  private lastSearchResults: Map<string, FindResult> = new Map();

  constructor(config: ElementFinderConfig = {}) {
    this.config = {
      timeout: 5000,
      retryAttempts: 3,
      debug: false,
      strictMode: false,
      enableSmartFinding: true,
      ...config
    };
  }

  /**
   * Main method to find an element using the target specification
   */
  async findElement(target: ElementTarget): Promise<Element | null> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(target);
    
    // Check cache first
    const cached = this.checkCache(cacheKey);
    if (cached) {
      this.log('Found element in cache');
      return cached;
    }

    try {
      const result = await this.findWithRetries(target);
      
      if (result.element) {
        this.cacheElement(cacheKey, result.element);
        this.lastSearchResults.set(cacheKey, result);
        this.log(`Element found using ${result.strategy} in ${Date.now() - startTime}ms`);
      }
      
      return result.element;
      
    } catch (error) {
      this.log('Element finding failed:', error.message);
      return null;
    }
  }

  /**
   * Find multiple elements matching the criteria
   */
  async findElements(target: ElementTarget, maxResults: number = 10): Promise<Element[]> {
    const elements: Element[] = [];
    
    try {
      switch (target.strategy) {
        case 'css':
          elements.push(...Array.from(document.querySelectorAll(target.value)).slice(0, maxResults));
          break;
          
        case 'xpath':
          const xpathResults = this.findByXPath(target.value);
          elements.push(...xpathResults.slice(0, maxResults));
          break;
          
        case 'text':
          const textResults = this.findByText(target.value, true);
          elements.push(...textResults.slice(0, maxResults));
          break;
          
        case 'attribute':
          const attrResults = this.findByAttribute(target.value, target.attribute);
          elements.push(...attrResults.slice(0, maxResults));
          break;
          
        default:
          // Use smart finding for multiple results
          const smartResults = await this.smartFind(target.value, true);
          elements.push(...smartResults.slice(0, maxResults));
      }
      
      return this.filterValidElements(elements);
      
    } catch (error) {
      this.log('Multiple element finding failed:', error);
      return [];
    }
  }

  private async findWithRetries(target: ElementTarget): Promise<FindResult> {
    let lastError: Error | null = null;
    const metadata = {
      searchTime: 0,
      attemptsMade: 0,
      strategyUsed: '',
      fallbacksUsed: [] as string[]
    };

    for (let attempt = 0; attempt < this.config.retryAttempts!; attempt++) {
      metadata.attemptsMade++;
      
      try {
        const result = await this.findWithStrategy(target);
        metadata.searchTime = Date.now();
        metadata.strategyUsed = result.strategy;
        
        return {
          ...result,
          metadata
        };
        
      } catch (error) {
        lastError = error;
        this.log(`Attempt ${attempt + 1} failed:`, error.message);
        
        // Wait before retry
        if (attempt < this.config.retryAttempts! - 1) {
          await this.sleep(500 * (attempt + 1));
        }
      }
    }

    throw lastError || new Error('All attempts failed');
  }

  private async findWithStrategy(target: ElementTarget): Promise<FindResult> {
    const strategies = this.getSearchStrategies(target);
    let bestResult: FindResult | null = null;

    for (const strategy of strategies) {
      try {
        const result = await this.executeStrategy(strategy.method, strategy.value, strategy.options);
        
        if (result.element) {
          // Return immediately if high confidence or strict mode
          if (result.confidence > 0.9 || this.config.strictMode) {
            return result;
          }
          
          // Keep track of best result
          if (!bestResult || result.confidence > bestResult.confidence) {
            bestResult = result;
          }
        }
        
      } catch (error) {
        this.log(`Strategy ${strategy.method} failed:`, error.message);
      }
    }

    if (bestResult) {
      return bestResult;
    }

    throw new Error(`No element found for target: ${JSON.stringify(target)}`);
  }

  private getSearchStrategies(target: ElementTarget): Array<{method: string, value: string, options?: any}> {
    const strategies = [];
    
    // Primary strategy
    strategies.push({
      method: target.strategy,
      value: target.value,
      options: target.options
    });

    // Fallback strategies if provided
    if (target.fallbacks) {
      target.fallbacks.forEach(fallback => {
        strategies.push({
          method: fallback.strategy,
          value: fallback.value,
          options: fallback.options
        });
      });
    }

    // Auto-generate fallback strategies
    if (!this.config.strictMode) {
      strategies.push(...this.generateFallbackStrategies(target));
    }

    return strategies;
  }

  private generateFallbackStrategies(target: ElementTarget): Array<{method: string, value: string, options?: any}> {
    const fallbacks = [];

    switch (target.strategy) {
      case 'css':
        // Try relaxed CSS selector
        const relaxedSelector = this.relaxCssSelector(target.value);
        if (relaxedSelector !== target.value) {
          fallbacks.push({ method: 'css', value: relaxedSelector });
        }
        break;

      case 'text':
        // Try partial text match
        fallbacks.push({ method: 'text', value: target.value, options: { partial: true } });
        // Try case-insensitive match
        fallbacks.push({ method: 'text', value: target.value, options: { caseSensitive: false } });
        break;

      case 'xpath':
        // Try text-based fallback
        fallbacks.push({ method: 'text', value: target.value });
        break;
    }

    // Always try smart finding as last resort
    if (this.config.enableSmartFinding) {
      fallbacks.push({ method: 'smart', value: target.value });
    }

    return fallbacks;
  }

  private async executeStrategy(method: string, value: string, options: any = {}): Promise<FindResult> {
    const startTime = Date.now();
    let element: Element | null = null;
    let alternatives: Element[] = [];
    let confidence = 0;

    switch (method) {
      case 'css':
        element = await this.findByCss(value);
        confidence = element ? 0.9 : 0;
        break;

      case 'xpath':
        const xpathResults = this.findByXPath(value);
        element = xpathResults[0] || null;
        alternatives = xpathResults.slice(1, 5);
        confidence = element ? 0.85 : 0;
        break;

      case 'text':
        const textResults = this.findByText(value, options.partial, options.caseSensitive);
        element = textResults[0] || null;
        alternatives = textResults.slice(1, 5);
        confidence = this.calculateTextConfidence(value, element, options);
        break;

      case 'attribute':
        const attrResults = this.findByAttribute(value, options.attribute);
        element = attrResults[0] || null;
        alternatives = attrResults.slice(1, 5);
        confidence = element ? 0.8 : 0;
        break;

      case 'position':
        element = this.findByPosition(options.x, options.y);
        confidence = element ? 0.7 : 0;
        break;

      case 'smart':
        const smartResults = await this.smartFind(value);
        element = smartResults[0] || null;
        alternatives = smartResults.slice(1, 5);
        confidence = this.calculateSmartConfidence(value, element);
        break;

      default:
        throw new Error(`Unknown strategy: ${method}`);
    }

    return {
      element,
      strategy: method,
      confidence,
      alternatives,
      metadata: {
        searchTime: Date.now() - startTime,
        attemptsMade: 1,
        strategyUsed: method,
        fallbacksUsed: []
      }
    };
  }

  private async findByCss(selector: string): Promise<Element | null> {
    try {
      return document.querySelector(selector);
    } catch (error) {
      this.log('CSS selector error:', error.message);
      return null;
    }
  }

  private findByXPath(xpath: string): Element[] {
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );

      const elements = [];
      for (let i = 0; i < result.snapshotLength; i++) {
        const node = result.snapshotItem(i);
        if (node instanceof Element) {
          elements.push(node);
        }
      }
      return elements;
    } catch (error) {
      this.log('XPath error:', error.message);
      return [];
    }
  }

  private findByText(text: string, partial: boolean = false, caseSensitive: boolean = true): Element[] {
    const elements: Element[] = [];
    const searchText = caseSensitive ? text : text.toLowerCase();
    
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      if (node instanceof Element) {
        const elementText = caseSensitive ? 
          (node.textContent || '').trim() : 
          (node.textContent || '').trim().toLowerCase();
          
        if (partial ? elementText.includes(searchText) : elementText === searchText) {
          elements.push(node);
        }
        
        // Check specific attributes
        const attrs = ['aria-label', 'title', 'alt', 'placeholder'];
        for (const attr of attrs) {
          const attrValue = caseSensitive ? 
            (node.getAttribute(attr) || '') : 
            (node.getAttribute(attr) || '').toLowerCase();
            
          if (partial ? attrValue.includes(searchText) : attrValue === searchText) {
            elements.push(node);
            break;
          }
        }
      }
    }

    return [...new Set(elements)]; // Remove duplicates
  }

  private findByAttribute(value: string, attribute?: string): Element[] {
    const elements: Element[] = [];
    
    if (attribute) {
      // Search for specific attribute
      const selector = `[${attribute}*="${value}"]`;
      elements.push(...Array.from(document.querySelectorAll(selector)));
    } else {
      // Search common attributes
      const attributes = ['id', 'class', 'name', 'data-*', 'aria-label'];
      for (const attr of attributes) {
        const selector = attr === 'data-*' ? 
          `[data-testid*="${value}"], [data-test*="${value}"], [data-cy*="${value}"]` :
          `[${attr}*="${value}"]`;
        elements.push(...Array.from(document.querySelectorAll(selector)));
      }
    }

    return [...new Set(elements)];
  }

  private findByPosition(x: number, y: number): Element | null {
    try {
      return document.elementFromPoint(x, y);
    } catch (error) {
      this.log('Position finding error:', error.message);
      return null;
    }
  }

  private async smartFind(description: string, multiple: boolean = false): Element[] {
    // Smart finding combines multiple strategies and uses AI-like scoring
    const candidates = new Map<Element, number>();
    
    // Collect candidates from various strategies
    const textMatches = this.findByText(description, true, false);
    const partialMatches = this.findByAttribute(description);
    
    // Score text matches
    textMatches.forEach(el => {
      const score = this.calculateSmartScore(el, description);
      candidates.set(el, (candidates.get(el) || 0) + score);
    });
    
    // Score attribute matches
    partialMatches.forEach(el => {
      const score = this.calculateSmartScore(el, description) * 0.8;
      candidates.set(el, (candidates.get(el) || 0) + score);
    });
    
    // Score by element type and interactivity
    candidates.forEach((score, element) => {
      const interactivityBonus = this.getInteractivityScore(element);
      const visibilityBonus = this.getVisibilityScore(element);
      candidates.set(element, score + interactivityBonus + visibilityBonus);
    });

    // Sort by score and return
    const sortedCandidates = Array.from(candidates.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([element]) => element);

    return multiple ? sortedCandidates : sortedCandidates.slice(0, 1);
  }

  private calculateSmartScore(element: Element, description: string): number {
    let score = 0;
    const desc = description.toLowerCase();
    
    // Text content similarity
    const textContent = (element.textContent || '').toLowerCase();
    if (textContent.includes(desc)) {
      score += textContent === desc ? 10 : 5;
    }
    
    // Attribute matching
    const attributes = ['aria-label', 'title', 'alt', 'placeholder', 'name', 'id'];
    attributes.forEach(attr => {
      const value = (element.getAttribute(attr) || '').toLowerCase();
      if (value.includes(desc)) {
        score += value === desc ? 8 : 4;
      }
    });
    
    // Tag name relevance
    const tagName = element.tagName.toLowerCase();
    const actionTags = ['button', 'a', 'input', 'select', 'textarea'];
    if (actionTags.includes(tagName)) {
      score += 3;
    }
    
    return score;
  }

  private getInteractivityScore(element: Element): number {
    let score = 0;
    
    // Interactive elements get higher scores
    const tagName = element.tagName.toLowerCase();
    const interactiveTags = {
      button: 5,
      a: 4,
      input: 4,
      select: 4,
      textarea: 3,
      div: 1,
      span: 1
    };
    
    score += interactiveTags[tagName] || 0;
    
    // Check for click handlers
    if (element.onclick || element.getAttribute('onclick')) {
      score += 2;
    }
    
    // Check for interactive attributes
    if (element.hasAttribute('role') && 
        ['button', 'link', 'menuitem'].includes(element.getAttribute('role')!)) {
      score += 2;
    }
    
    return score;
  }

  private getVisibilityScore(element: Element): number {
    const style = window.getComputedStyle(element);
    
    if (style.display === 'none' || style.visibility === 'hidden') {
      return -10; // Heavy penalty for hidden elements
    }
    
    if (style.opacity === '0') {
      return -5;
    }
    
    // Check if element is in viewport
    const rect = element.getBoundingClientRect();
    const inViewport = rect.top >= 0 && rect.left >= 0 && 
                      rect.bottom <= window.innerHeight && 
                      rect.right <= window.innerWidth;
    
    return inViewport ? 2 : 0;
  }

  private calculateTextConfidence(searchText: string, element: Element | null, options: any): number {
    if (!element) return 0;
    
    const elementText = (element.textContent || '').trim();
    
    if (!options.caseSensitive) {
      return elementText.toLowerCase() === searchText.toLowerCase() ? 0.9 : 0.7;
    }
    
    if (options.partial) {
      return elementText.includes(searchText) ? 0.8 : 0;
    }
    
    return elementText === searchText ? 0.95 : 0;
  }

  private calculateSmartConfidence(description: string, element: Element | null): number {
    if (!element) return 0;
    
    const score = this.calculateSmartScore(element, description);
    
    // Convert score to confidence (0-1)
    return Math.min(score / 20, 1);
  }

  private relaxCssSelector(selector: string): string {
    // Make CSS selector more permissive
    return selector
      .replace(/>/g, ' ') // Replace child selectors with descendant
      .replace(/\+/g, ' ') // Replace sibling selectors
      .replace(/:nth-child\([^)]+\)/g, '') // Remove nth-child selectors
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private filterValidElements(elements: Element[]): Element[] {
    return elements.filter(el => {
      // Filter out hidden or non-interactive elements if strict mode
      if (this.config.strictMode) {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }
      return true;
    });
  }

  private checkCache(key: string): Element | null {
    const ref = this.elementCache.get(key);
    if (ref) {
      const element = ref.deref();
      if (element && document.contains(element)) {
        return element;
      } else {
        this.elementCache.delete(key);
      }
    }
    return null;
  }

  private cacheElement(key: string, element: Element): void {
    this.elementCache.set(key, new WeakRef(element));
  }

  private generateCacheKey(target: ElementTarget): string {
    return `${target.strategy}:${target.value}:${JSON.stringify(target.options || {})}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[ElementFinder]', ...args);
    }
  }

  // Public utility methods
  public clearCache(): void {
    this.elementCache.clear();
    this.lastSearchResults.clear();
  }

  public getLastSearchResult(target: ElementTarget): FindResult | null {
    const key = this.generateCacheKey(target);
    return this.lastSearchResults.get(key) || null;
  }

  public isElementValid(element: Element): boolean {
    return document.contains(element) && 
           window.getComputedStyle(element).display !== 'none';
  }
} 