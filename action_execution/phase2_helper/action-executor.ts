/**
 * Action Executor
 * 
 * Handles execution of various DOM actions on elements:
 * - Click actions (left, right, double click)
 * - Text input and keyboard events
 * - Scrolling and navigation
 * - Form interactions
 * - Hover and focus events
 * - Screenshot and visual feedback
 */

interface ActionExecutorConfig {
  timeout?: number;
  debug?: boolean;
  enableScreenshots?: boolean;
  retryAttempts?: number;
  clickDelay?: number;
  typeDelay?: number;
}

interface ActionOptions {
  timeout?: number;
  force?: boolean;
  waitForAnimation?: boolean;
  screenshot?: boolean;
  coordinates?: { x: number; y: number };
  modifiers?: string[]; // ctrl, shift, alt, meta
}

interface ActionResult {
  success: boolean;
  message: string;
  screenshot?: string;
  elementState?: {
    visible: boolean;
    enabled: boolean;
    focused: boolean;
    value?: string;
  };
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
}

export class ActionExecutor {
  private config: ActionExecutorConfig;
  private actionHistory: Array<{action: string, element: Element, result: ActionResult}> = [];

  constructor(config: ActionExecutorConfig = {}) {
    this.config = {
      timeout: 10000,
      debug: false,
      enableScreenshots: false,
      retryAttempts: 3,
      clickDelay: 100,
      typeDelay: 50,
      ...config
    };
  }

  /**
   * Main action execution method
   */
  async executeAction(
    action: string, 
    element: Element, 
    options: ActionOptions = {}
  ): Promise<ActionResult> {
    const startTime = Date.now();
    
    try {
      // Validate element
      if (!this.validateElement(element)) {
        throw new Error('Element is not valid or not in DOM');
      }

      // Wait for element to be ready
      await this.waitForElementReady(element, options.timeout || this.config.timeout!);

      // Execute the action
      let result: ActionResult;
      
      switch (action.toLowerCase()) {
        case 'click':
          result = await this.click(element, options);
          break;
          
        case 'rightclick':
        case 'right-click':
          result = await this.rightClick(element, options);
          break;
          
        case 'doubleclick':
        case 'double-click':
          result = await this.doubleClick(element, options);
          break;
          
        case 'type':
        case 'input':
          result = await this.type(element, options.value || '', options);
          break;
          
        case 'clear':
          result = await this.clear(element, options);
          break;
          
        case 'scroll':
          result = await this.scroll(element, options);
          break;
          
        case 'hover':
          result = await this.hover(element, options);
          break;
          
        case 'focus':
          result = await this.focus(element, options);
          break;
          
        case 'blur':
          result = await this.blur(element, options);
          break;
          
        case 'submit':
          result = await this.submit(element, options);
          break;
          
        case 'select':
          result = await this.select(element, options.value || '', options);
          break;
          
        case 'check':
        case 'uncheck':
          result = await this.toggleCheckbox(element, action === 'check', options);
          break;
          
        case 'screenshot':
          result = await this.takeScreenshot(element, options);
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Add timing information
      result.timing = {
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime
      };

      // Store in history
      this.actionHistory.push({
        action,
        element,
        result
      });

      this.log(`Action '${action}' completed successfully in ${result.timing.duration}ms`);
      return result;

    } catch (error) {
      const errorResult: ActionResult = {
        success: false,
        message: `Action '${action}' failed: ${error.message}`,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        },
        error: {
          type: error.constructor.name,
          message: error.message,
          stack: this.config.debug ? error.stack : undefined
        }
      };

      this.log(`Action '${action}' failed:`, error.message);
      return errorResult;
    }
  }

  private async click(element: Element, options: ActionOptions): Promise<ActionResult> {
    await this.scrollIntoView(element);
    
    // Custom coordinates or element center
    const rect = element.getBoundingClientRect();
    const x = options.coordinates?.x ?? rect.left + rect.width / 2;
    const y = options.coordinates?.y ?? rect.top + rect.height / 2;

    // Create and dispatch events
    const events = [
      new MouseEvent('mousedown', { 
        bubbles: true, 
        cancelable: true, 
        clientX: x, 
        clientY: y,
        button: 0,
        buttons: 1
      }),
      new MouseEvent('mouseup', { 
        bubbles: true, 
        cancelable: true, 
        clientX: x, 
        clientY: y,
        button: 0,
        buttons: 0
      }),
      new MouseEvent('click', { 
        bubbles: true, 
        cancelable: true, 
        clientX: x, 
        clientY: y,
        button: 0,
        buttons: 0
      })
    ];

    for (const event of events) {
      element.dispatchEvent(event);
      if (this.config.clickDelay) {
        await this.sleep(this.config.clickDelay);
      }
    }

    // Wait for any animations or state changes
    if (options.waitForAnimation) {
      await this.sleep(300);
    }

    return {
      success: true,
      message: 'Element clicked successfully',
      elementState: this.getElementState(element),
      timing: { startTime: 0, endTime: 0, duration: 0 }
    };
  }

  private async rightClick(element: Element, options: ActionOptions): Promise<ActionResult> {
    await this.scrollIntoView(element);
    
    const rect = element.getBoundingClientRect();
    const x = options.coordinates?.x ?? rect.left + rect.width / 2;
    const y = options.coordinates?.y ?? rect.top + rect.height / 2;

    const contextMenuEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 2,
      buttons: 2
    });

    element.dispatchEvent(contextMenuEvent);

    return {
      success: true,
      message: 'Right click executed successfully',
      elementState: this.getElementState(element),
      timing: { startTime: 0, endTime: 0, duration: 0 }
    };
  }

  private async doubleClick(element: Element, options: ActionOptions): Promise<ActionResult> {
    await this.scrollIntoView(element);
    
    const rect = element.getBoundingClientRect();
    const x = options.coordinates?.x ?? rect.left + rect.width / 2;
    const y = options.coordinates?.y ?? rect.top + rect.height / 2;

    // First click
    await this.click(element, { ...options, coordinates: { x, y } });
    await this.sleep(50);
    
    // Double click event
    const dblClickEvent = new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 0
    });

    element.dispatchEvent(dblClickEvent);

    return {
      success: true,
      message: 'Double click executed successfully',
      elementState: this.getElementState(element),
      timing: { startTime: 0, endTime: 0, duration: 0 }
    };
  }

  private async type(element: Element, text: string, options: ActionOptions): Promise<ActionResult> {
    if (!(element instanceof HTMLInputElement) && 
        !(element instanceof HTMLTextAreaElement) && 
        !element.hasAttribute('contenteditable')) {
      throw new Error('Element is not editable');
    }

    await this.scrollIntoView(element);
    await this.focus(element, options);

    // Clear existing content if not appending
    if (!options.append) {
      await this.clear(element, options);
    }

    // Type character by character for realistic input
    for (const char of text) {
      // Key down
      const keyDownEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: char,
        code: this.getKeyCode(char),
        charCode: char.charCodeAt(0),
        keyCode: char.charCodeAt(0)
      });
      element.dispatchEvent(keyDownEvent);

      // Key press
      const keyPressEvent = new KeyboardEvent('keypress', {
        bubbles: true,
        cancelable: true,
        key: char,
        code: this.getKeyCode(char),
        charCode: char.charCodeAt(0),
        keyCode: char.charCodeAt(0)
      });
      element.dispatchEvent(keyPressEvent);

      // Update value
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        const currentValue = element.value;
        const selectionStart = element.selectionStart || currentValue.length;
        const selectionEnd = element.selectionEnd || currentValue.length;
        
        const newValue = currentValue.slice(0, selectionStart) + char + currentValue.slice(selectionEnd);
        element.value = newValue;
        element.selectionStart = element.selectionEnd = selectionStart + 1;
      } else if (element.hasAttribute('contenteditable')) {
        // For contenteditable elements
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(char));
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      // Input event
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      element.dispatchEvent(inputEvent);

      // Key up
      const keyUpEvent = new KeyboardEvent('keyup', {
        bubbles: true,
        cancelable: true,
        key: char,
        code: this.getKeyCode(char),
        charCode: char.charCodeAt(0),
        keyCode: char.charCodeAt(0)
      });
      element.dispatchEvent(keyUpEvent);

      // Delay between characters
      if (this.config.typeDelay) {
        await this.sleep(this.config.typeDelay);
      }
    }

    // Change event after typing
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    element.dispatchEvent(changeEvent);

    return {
      success: true,
      message: `Typed "${text}" successfully`,
      elementState: this.getElementState(element),
      timing: { startTime: 0, endTime: 0, duration: 0 }
    };
  }

  private async clear(element: Element, options: ActionOptions): Promise<ActionResult> {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = '';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (element.hasAttribute('contenteditable')) {
      element.textContent = '';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      throw new Error('Element is not clearable');
    }

    return {
      success: true,
      message: 'Element cleared successfully',
      elementState: this.getElementState(element),
      timing: { startTime: 0, endTime: 0, duration: 0 }
    };
  }

  private async scroll(element: Element, options: ActionOptions): Promise<ActionResult> {
    const scrollOptions: ScrollToOptions = {
      behavior: 'smooth'
    };

    if (options.direction === 'top') {
      scrollOptions.top = 0;
    } else if (options.direction === 'bottom') {
      scrollOptions.top = element.scrollHeight;
    } else if (options.direction === 'up') {
      scrollOptions.top = element.scrollTop - (options.amount || 100);
    } else if (options.direction === 'down') {
      scrollOptions.top = element.scrollTop + (options.amount || 100);
    } else if (options.coordinates) {
      scrollOptions.left = options.coordinates.x;
      scrollOptions.top = options.coordinates.y;
    }

    if (element === document.body || element === document.documentElement) {
      window.scrollTo(scrollOptions);
    } else {
      element.scrollTo(scrollOptions);
    }

    return {
      success: true,
      message: 'Scroll executed successfully',
      elementState: this.getElementState(element),
      timing: { startTime: 0, endTime: 0, duration: 0 }
    };
  }

  private async hover(element: Element, options: ActionOptions): Promise<ActionResult> {
    await this.scrollIntoView(element);
    
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const mouseEnterEvent = new MouseEvent('mouseenter', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y
    });

    const mouseOverEvent = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y
    });

    element.dispatchEvent(mouseEnterEvent);
    element.dispatchEvent(mouseOverEvent);

    return {
      success: true,
      message: 'Hover executed successfully',
      elementState: this.getElementState(element),
      timing: { startTime: 0, endTime: 0, duration: 0 }
    };
  }

  private async focus(element: Element, options: ActionOptions): Promise<ActionResult> {
    if (element instanceof HTMLElement) {
      element.focus();
      
      const focusEvent = new FocusEvent('focus', { bubbles: true, cancelable: true });
      element.dispatchEvent(focusEvent);
    } else {
      throw new Error('Element cannot be focused');
    }

    return {
      success: true,
      message: 'Element focused successfully',
      elementState: this.getElementState(element),
      timing: { startTime: 0, endTime: 0, duration: 0 }
    };
  }

  private async blur(element: Element, options: ActionOptions): Promise<ActionResult> {
    if (element instanceof HTMLElement) {
      element.blur();
      
      const blurEvent = new FocusEvent('blur', { bubbles: true, cancelable: true });
      element.dispatchEvent(blurEvent);
    } else {
      throw new Error('Element cannot be blurred');
    }

    return {
      success: true,
      message: 'Element blurred successfully',
      elementState: this.getElementState(element),
      timing: { startTime: 0, endTime: 0, duration: 0 }
    };
  }

  private async submit(element: Element, options: ActionOptions): Promise<ActionResult> {
    let formElement: HTMLFormElement | null = null;

    if (element instanceof HTMLFormElement) {
      formElement = element;
    } else {
      // Find parent form
      formElement = element.closest('form');
    }

    if (!formElement) {
      throw new Error('No form found to submit');
    }

    // Dispatch submit event
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    const cancelled = !formElement.dispatchEvent(submitEvent);

    if (!cancelled && !options.preventDefault) {
      formElement.submit();
    }

    return {
      success: true,
      message: 'Form submitted successfully',
      elementState: this.getElementState(formElement),
      timing: { startTime: 0, endTime: 0, duration: 0 }
    };
  }

  private async select(element: Element, value: string, options: ActionOptions): Promise<ActionResult> {
    if (!(element instanceof HTMLSelectElement)) {
      throw new Error('Element is not a select element');
    }

    // Find option by value or text
    const option = Array.from(element.options).find(opt => 
      opt.value === value || opt.textContent === value
    );

    if (!option) {
      throw new Error(`Option with value/text "${value}" not found`);
    }

    // Set selected
    element.value = option.value;
    option.selected = true;

    // Dispatch events
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));

    return {
      success: true,
      message: `Selected "${value}" successfully`,
      elementState: this.getElementState(element),
      timing: { startTime: 0, endTime: 0, duration: 0 }
    };
  }

  private async toggleCheckbox(element: Element, checked: boolean, options: ActionOptions): Promise<ActionResult> {
    if (!(element instanceof HTMLInputElement) || 
        (element.type !== 'checkbox' && element.type !== 'radio')) {
      throw new Error('Element is not a checkbox or radio button');
    }

    element.checked = checked;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));

    return {
      success: true,
      message: `${checked ? 'Checked' : 'Unchecked'} successfully`,
      elementState: this.getElementState(element),
      timing: { startTime: 0, endTime: 0, duration: 0 }
    };
  }

  private async takeScreenshot(element: Element, options: ActionOptions): Promise<ActionResult> {
    if (!this.config.enableScreenshots) {
      throw new Error('Screenshots are disabled');
    }

    // This is a placeholder - actual screenshot would require canvas or external library
    const rect = element.getBoundingClientRect();
    const screenshotData = `data:text/plain;base64,${btoa(JSON.stringify({
      element: element.tagName,
      bounds: rect,
      timestamp: Date.now()
    }))}`;

    return {
      success: true,
      message: 'Screenshot taken successfully',
      screenshot: screenshotData,
      elementState: this.getElementState(element),
      timing: { startTime: 0, endTime: 0, duration: 0 }
    };
  }

  // Helper methods
  private validateElement(element: Element): boolean {
    return element && document.contains(element);
  }

  private async waitForElementReady(element: Element, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (this.isElementReady(element)) {
        return;
      }
      await this.sleep(100);
    }
    
    throw new Error('Element not ready within timeout');
  }

  private isElementReady(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  private async scrollIntoView(element: Element): Promise<void> {
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center', 
      inline: 'center' 
    });
    
    // Wait for scroll to complete
    await this.sleep(300);
  }

  private getElementState(element: Element): any {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return {
      visible: style.display !== 'none' && style.visibility !== 'hidden',
      enabled: !(element as HTMLElement).hasAttribute('disabled'),
      focused: document.activeElement === element,
      value: (element as HTMLInputElement).value || element.textContent,
      bounds: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      }
    };
  }

  private getKeyCode(char: string): string {
    const charCode = char.charCodeAt(0);
    if (charCode >= 65 && charCode <= 90) return `Key${char.toUpperCase()}`;
    if (charCode >= 97 && charCode <= 122) return `Key${char.toUpperCase()}`;
    if (charCode >= 48 && charCode <= 57) return `Digit${char}`;
    
    const specialKeys: { [key: string]: string } = {
      ' ': 'Space',
      '\n': 'Enter',
      '\t': 'Tab',
      '\b': 'Backspace'
    };
    
    return specialKeys[char] || `Key${char.toUpperCase()}`;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[ActionExecutor]', ...args);
    }
  }

  // Public methods
  public getActionHistory(): Array<{action: string, element: Element, result: ActionResult}> {
    return [...this.actionHistory];
  }

  public clearHistory(): void {
    this.actionHistory = [];
  }

  public getConfig(): ActionExecutorConfig {
    return { ...this.config };
  }
} 