# 📦 Frontend Chat Prompt Package Instructions

## 🎯 **What to Send to Frontend Chat**

When requesting the frontend implementation, send these files in this order:

### **1. Main Prompt** ⭐
- **File**: `FRONTEND_IMPLEMENTATION_PROMPT.md`
- **Purpose**: The complete implementation request with all code and instructions

### **2. Supporting Documentation** 📚

#### **A. STEP_2_IMPLEMENTATION_GUIDE.md**
- **Purpose**: Comprehensive technical guide for Step 2
- **Contains**: Data flow diagrams, debugging instructions, troubleshooting
- **Why**: Provides detailed context for the specific implementation step

#### **B. ACTION_EXECUTION_IMPLEMENTATION.md**  
- **Purpose**: High-level system overview and architecture
- **Contains**: Complete system architecture, component status, implementation phases
- **Why**: Gives full context of the voice assistant system

### **3. Optional References** 🔧

#### **If Asked for More Context:**
- **STEP_1_IMPLEMENTATION_SUMMARY.md** - What was already implemented
- **test_action_bridge.html** - Test page for validation

## 📋 **Recommended Chat Message**

```
Hi! I need help implementing a LiveKit data message bridge in a voice widget iframe. 

**Context**: I'm building a voice assistant that uses RAG + LiveKit to process voice commands and execute DOM actions on webpages. The backend and helper script are complete, but I need to add a communication bridge in the voice widget iframe.

**Request**: Please add LiveKit data message listening capability to receive backend action commands and forward them via postMessage.

**Files attached:**
1. FRONTEND_IMPLEMENTATION_PROMPT.md - Complete implementation request
2. STEP_2_IMPLEMENTATION_GUIDE.md - Technical guide  
3. ACTION_EXECUTION_IMPLEMENTATION.md - System overview

The main prompt has all the code and instructions. The other files provide context and technical details. Let me know if you need clarification on anything!
```

## 🎯 **Essential Files Only** (Minimum)

If you want to keep it simple, just send:

1. **FRONTEND_IMPLEMENTATION_PROMPT.md** ⭐ (Required)
2. **STEP_2_IMPLEMENTATION_GUIDE.md** 📋 (Recommended)

The main prompt is self-contained and has everything needed for implementation.

## ✅ **File Checklist**

- [ ] `FRONTEND_IMPLEMENTATION_PROMPT.md` - Main implementation request
- [ ] `STEP_2_IMPLEMENTATION_GUIDE.md` - Technical guide with debugging
- [ ] `ACTION_EXECUTION_IMPLEMENTATION.md` - System overview
- [ ] (Optional) `STEP_1_IMPLEMENTATION_SUMMARY.md` - Previous implementation
- [ ] (Optional) `test_action_bridge.html` - Test page

## 🎯 **Expected Response**

The frontend chat should:
1. **Understand the context** - Voice assistant with LiveKit integration
2. **Add the provided code** - LiveKit data message listener
3. **Initialize correctly** - After room connection
4. **Test the implementation** - Verify console logs and functionality

## 📞 **If They Need More Info**

If the frontend chat asks for additional details:
- **LiveKit documentation**: They can reference LiveKit docs for `room.on('dataReceived')`
- **Code structure**: The provided code is self-contained
- **Integration points**: Initialize after `room.connect()` completes

---

**🎯 Ready to send! The main prompt contains everything needed for successful implementation.** 