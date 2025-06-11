# 🚀 Environment Setup for Auto-Connect

## Required Environment Variables

Create a `.env.local` file in your project root with these variables:

```bash
# LiveKit Configuration
# Get these values from your LiveKit dashboard: https://cloud.livekit.io/
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
LIVEKIT_WS_URL=wss://your-project.livekit.cloud
```

## 📋 Getting Your LiveKit Credentials

### **Option 1: LiveKit Cloud (Recommended)**
1. Go to [LiveKit Cloud Dashboard](https://cloud.livekit.io/)
2. Sign up or log in
3. Create a new project or select existing one
4. Go to **Settings** → **Keys**
5. Copy your:
   - **API Key** (starts with `API`)
   - **API Secret** (long string)
   - **WebSocket URL** (starts with `wss://`)

### **Option 2: Self-Hosted LiveKit**
```bash
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret  
LIVEKIT_WS_URL=ws://localhost:7880
```

## 🔒 Example Configuration

### **LiveKit Cloud Example:**
```bash
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LIVEKIT_WS_URL=wss://my-project.livekit.cloud
```

### **Local Development Example:**
```bash
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_WS_URL=ws://localhost:7880
```

## ✅ How Auto-Connect Works

1. **Automatic Token Generation**: No more manual token creation
2. **Auto-Connect on Load**: Connects immediately when assistant loads
3. **Seamless Experience**: Zero configuration needed for users

## 🛠️ Setup Steps

1. **Create `.env.local`** in your project root
2. **Add your credentials** from LiveKit dashboard  
3. **Restart your Next.js dev server**: `npm run dev`
4. **Open the assistant** - it will auto-connect!

## 🔍 Troubleshooting

### **"LiveKit configuration missing" Error**
- Check that `.env.local` exists and has all 3 variables
- Restart your Next.js server after adding variables
- Make sure variable names are exactly as shown

### **"Failed to connect" Error**  
- Verify your API key and secret are correct
- Check that your WebSocket URL is reachable
- For LiveKit Cloud, make sure your project is active

### **Token Generation Failed**
- Check browser console for detailed error messages
- Verify environment variables are loaded: `console.log(process.env.LIVEKIT_API_KEY)`

## 🎯 Benefits of Auto-Connect

✅ **No Manual Token Generation** - Tokens created automatically  
✅ **Instant Connection** - Connects on page load  
✅ **Better UX** - Users don't see connection complexity  
✅ **Secure** - Credentials stay on server-side  
✅ **Scalable** - Works for unlimited users  

## 🚀 Ready to Go!

Once configured, your voice assistant will:
1. Auto-generate tokens on the server
2. Connect automatically when loaded
3. Provide seamless voice interaction
4. Execute actions on any webpage

No more manual token management! 🎉 