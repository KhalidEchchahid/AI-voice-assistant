# 🎯 Frontend Implementation Request: Voice Assistant Action Bridge

## 📋 **Context & Background**

I'm implementing a voice assistant system where users can give voice commands to interact with webpages. The system has these components:

1. **Backend Agent** (✅ Complete) - Uses RAG + LiveKit to process voice and generate action commands
2. **Helper Script** (✅ Complete) - Executes DOM actions on the webpage  
3. **Voice Widget iframe** (❌ Missing Bridge) - Needs to receive backend commands and forward them

## 🎯 **What I Need You To Do**

**Add LiveKit data message listening capability to the voice widget iframe** so it can:

1. **Listen for data messages** from the backend agent via LiveKit
2. **Parse action command payloads** (JSON format)
3. **Forward commands to the parent window** via postMessage for DOM execution

## 🔧 **Technical Details**

### **Current Voice Widget Setup:**
- **URL**: `https://ai-voice-assistant-nu.vercel.app/`
- **LiveKit Integration**: Already connected for voice communication
- **Missing**: Data message listener for action commands

### **Required Integration:**
- Add event listener: `room.on('dataReceived', handleDataMessage)`
- Decode UTF-8 JSON payloads from backend
- Forward parsed commands via `window.parent.postMessage()`

## 📁 **Code to Add**

Add this JavaScript code to the voice widget iframe:

```javascript
// --- LiveKit Data Message Listener for Action Commands ---
function setupActionCommandBridge(room) {
  if (!room) {
    console.error("Voice Widget: No LiveKit room instance available for action commands");
    return;
  }

  // Listen for data messages from the backend agent
  room.on('dataReceived', (payload, participant, kind, topic) => {
    try {
      console.log("Voice Widget: Received data message from backend:", {
        participant: participant.identity,
        dataSize: payload.length,
        kind: kind,
        topic: topic
      });

      // Decode the data payload (backend sends UTF-8 encoded JSON)
      const textDecoder = new TextDecoder('utf-8');
      const dataString = textDecoder.decode(payload);
      
      console.log("Voice Widget: Decoded data string:", dataString);

      // Parse the JSON action commands
      let actionData;
      try {
        actionData = JSON.parse(dataString);
      } catch (parseError) {
        console.warn("Voice Widget: Failed to parse data as JSON:", parseError);
        return;
      }

      console.log("Voice Widget: Parsed action data:", actionData);

      // Check if this is an action command payload
      if (actionData && actionData.type === "execute_actions") {
        console.log("Voice Widget: Received action commands, forwarding to helper script");
        
        // Forward action commands to parent window (where assistant-loader.js is running)
        forwardActionCommandsToHelper(actionData);
        
        // Optionally update widget UI to show action is being executed
        showActionExecutionFeedback(actionData);
      } else {
        console.log("Voice Widget: Data message is not an action command, ignoring");
      }

    } catch (error) {
      console.error("Voice Widget: Error processing data message:", error);
    }
  });

  console.log("Voice Widget: Action command bridge initialized - listening for backend data messages");
}

// --- Forward Action Commands to Helper Script ---
function forwardActionCommandsToHelper(actionData) {
  try {
    // Create message for helper script
    const message = {
      action: "execute_actions",
      payload: actionData.actions,
      type: "execute_actions",
      actions: actionData.actions,
      metadata: {
        website_id: actionData.website_id,
        user_intent: actionData.user_intent,
        timestamp: new Date().toISOString(),
        source: "voice_assistant_backend"
      }
    };

    console.log("Voice Widget: Sending action commands to helper script:", message);

    // Send to parent window where assistant-loader.js is running
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
      console.log("Voice Widget: Action commands sent to parent window successfully");
    } else {
      console.warn("Voice Widget: No parent window available to send action commands");
    }

  } catch (error) {
    console.error("Voice Widget: Error forwarding action commands:", error);
  }
}

// --- Visual Feedback for Action Execution ---
function showActionExecutionFeedback(actionData) {
  try {
    const actionCount = actionData.actions ? actionData.actions.length : 0;
    const userIntent = actionData.user_intent || "action";
    
    console.log(`Voice Widget: Executing ${actionCount} actions for: ${userIntent}`);
    
    // Add a temporary visual indicator
    if (document.body) {
      document.body.classList.add('executing-actions');
      setTimeout(() => {
        document.body.classList.remove('executing-actions');
      }, 2000);
    }

    // Optional: Display action count in widget
    const statusElement = document.querySelector('.action-status');
    if (statusElement) {
      statusElement.textContent = `Executing ${actionCount} action${actionCount !== 1 ? 's' : ''}...`;
      setTimeout(() => {
        statusElement.textContent = '';
      }, 3000);
    }

  } catch (error) {
    console.error("Voice Widget: Error showing action feedback:", error);
  }
}

// --- Initialize the Bridge ---
function initializeActionCommandBridge() {
  // This function should be called after the LiveKit room is connected
  // Replace 'room' with the actual room instance variable in your widget

  // Try to find the room instance
  let roomInstance = null;
  if (typeof room !== 'undefined' && room) {
    roomInstance = room;
  } else if (typeof roomManager !== 'undefined' && roomManager && roomManager.room) {
    roomInstance = roomManager.room;
  } else if (typeof voiceService !== 'undefined' && voiceService && voiceService.room) {
    roomInstance = voiceService.room;
  }

  if (roomInstance) {
    console.log("Voice Widget: Found LiveKit room instance, setting up action bridge");
    setupActionCommandBridge(roomInstance);
  } else {
    // Wait for room to be available
    let attempts = 0;
    const maxAttempts = 10;
    const checkInterval = 1000;

    const roomCheck = setInterval(() => {
      attempts++;
      
      if (typeof room !== 'undefined' && room) {
        roomInstance = room;
      } else if (typeof roomManager !== 'undefined' && roomManager && roomManager.room) {
        roomInstance = roomManager.room;
      } else if (typeof voiceService !== 'undefined' && voiceService && voiceService.room) {
        roomInstance = voiceService.room;
      }

      if (roomInstance) {
        console.log("Voice Widget: Found LiveKit room instance, setting up action bridge");
        setupActionCommandBridge(roomInstance);
        clearInterval(roomCheck);
      } else if (attempts >= maxAttempts) {
        console.error("Voice Widget: Could not find LiveKit room instance after", maxAttempts, "attempts");
        clearInterval(roomCheck);
      } else {
        console.log(`Voice Widget: Waiting for LiveKit room instance... (attempt ${attempts}/${maxAttempts})`);
      }
    }, checkInterval);
  }
}

// --- CSS for Visual Feedback (Optional) ---
const actionFeedbackCSS = `
  <style>
    body.executing-actions {
      position: relative;
    }
    
    body.executing-actions::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #4776E6, #8E54E9);
      animation: pulse 1.5s ease-in-out infinite;
      z-index: 10000;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }
    
    .action-status {
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 10001;
      transition: opacity 0.3s ease;
    }
  </style>
`;

// Add CSS to head if it doesn't exist
if (!document.getElementById('action-feedback-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'action-feedback-styles';
  styleElement.innerHTML = actionFeedbackCSS.replace('<style>', '').replace('</style>', '');
  document.head.appendChild(styleElement);
}

// --- Initialize when ready ---
// Call this after your LiveKit room is connected
// Example integration:
/*
room.connect(url, token).then(() => {
  console.log("Connected to LiveKit room");
  
  // Add this line to initialize action command bridge
  initializeActionCommandBridge();
});
*/

// Auto-initialize with delay
setTimeout(initializeActionCommandBridge, 2000);

// Export for manual initialization
if (typeof window !== 'undefined') {
  window.setupActionCommandBridge = setupActionCommandBridge;
  window.initializeActionCommandBridge = initializeActionCommandBridge;
}
```

## 🚀 **Integration Instructions**

### **Step 1: Add the Code**
- Add the above JavaScript code to your voice widget iframe
- Place it after your existing LiveKit room initialization

### **Step 2: Initialize After Room Connection**
```javascript
// In your existing room connection code:
room.connect(url, token).then(() => {
  console.log("Connected to LiveKit room");
  
  // ADD THIS LINE:
  initializeActionCommandBridge();
});
```

### **Step 3: Update Room Variable Name**
If your LiveKit room variable is named something other than `room`, update the `initializeActionCommandBridge()` function to use your variable name.

## 🔍 **Expected Behavior After Implementation**

### **Console Logs You Should See:**
```
Voice Widget: Action command bridge initialized - listening for backend data messages
Voice Widget: Received data message from backend: {participant: 'agent', dataSize: 245}
Voice Widget: Decoded data string: {"type": "execute_actions", "actions": [...]}
Voice Widget: Received action commands, forwarding to helper script
Voice Widget: Action commands sent to parent window successfully
```

### **User Experience:**
1. User says: "Click the contact button"
2. Widget shows brief loading indicator (top progress bar)
3. Target button gets clicked with red highlight
4. Loading indicator disappears

## 🧪 **Testing**

### **Simple Test:**
1. Open browser console in the widget iframe
2. Backend should send action commands automatically when voice input is processed
3. Look for the console logs mentioned above

### **Manual Test:**
You can test the postMessage forwarding with:
```javascript
// Test the forwarding function directly
forwardActionCommandsToHelper({
  actions: [{
    action: "click",
    selector: "#test-button",
    id: "test_123"
  }],
  website_id: "test",
  user_intent: "test click"
});
```

## ⚠️ **Important Notes**

1. **LiveKit Room Access**: Make sure you access the correct room instance variable
2. **Timing**: Initialize after the room is connected, not before
3. **Console Logs**: Keep the console logs for debugging - they'll help verify the flow works
4. **Error Handling**: The code includes comprehensive error handling for robustness

## 🎯 **Success Criteria**

✅ **When complete, this flow should work:**
1. Backend sends action command via LiveKit data message
2. Widget receives and parses the data
3. Widget forwards command to parent window
4. Parent window executes DOM action
5. User sees the action happen with visual feedback

## 📞 **Questions?**

If you need clarification on:
- Where to add the code in your existing structure
- How to access your LiveKit room instance
- Any integration issues

Just ask! The key is getting the `room.on('dataReceived')` listener set up correctly.

---

**🎯 This completes the missing communication bridge between backend and frontend!** 