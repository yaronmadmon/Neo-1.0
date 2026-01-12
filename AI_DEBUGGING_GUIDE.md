# AI-Assisted Debugging Guide

## 🤖 What I (Auto) Can Do for Debugging

### ✅ **Code Analysis & Search**
- **Read files** - I can read any file in your codebase
- **Search code** - Semantic search to find related code
- **Grep** - Exact string/regex searches across files
- **Analyze structure** - Understand code flow and dependencies
- **Find patterns** - Identify similar issues or code patterns

### ✅ **Static Analysis**
- **Read linter errors** - Check TypeScript, ESLint, and other linter errors
- **Type checking** - Identify type mismatches and issues
- **Build validation** - Run builds and check for compilation errors
- **Dependency analysis** - Check package dependencies and versions

### ✅ **Terminal Operations**
- **Run commands** - Execute npm scripts, build commands, tests
- **Check logs** - Read log files and terminal output
- **File operations** - Create, edit, delete files
- **Git operations** - Commit, push, check status

### ✅ **Problem Solving**
- **Trace errors** - Follow error stack traces through code
- **Suggest fixes** - Propose solutions based on error analysis
- **Implement fixes** - Make code changes to resolve issues
- **Test solutions** - Verify fixes work

## ❌ What I CANNOT Do Directly

### **Interactive Debugging**
- ❌ **Attach to running processes** - I can't use VS Code's debugger directly
- ❌ **Set breakpoints interactively** - I can't pause execution at runtime
- ❌ **Inspect variables at runtime** - I can't see live variable values
- ❌ **Step through code** - I can't step through execution line-by-line

### **Real-time Monitoring**
- ❌ **Watch live logs** - I can't stream logs in real-time
- ❌ **Monitor performance** - I can't see CPU/memory usage directly
- ❌ **Network inspection** - I can't inspect HTTP requests/responses live

## 🔧 How to Integrate Me with Debugging Tools

### **1. VS Code Debugger Integration** ✅ (Already Set Up!)

You have VS Code debugger configured. Here's how to use it with me:

#### **Workflow:**
1. **You start debugging** in VS Code (F5)
2. **Hit a breakpoint** or encounter an issue
3. **Share the error/stack trace** with me
4. **I analyze** the code and suggest fixes
5. **I implement** the fix
6. **You continue debugging** to verify

#### **Example:**
```
You: "I'm debugging and hit an error: 'Cannot read property of undefined' at line 45 in app-routes.ts"
Me: [Reads the file, analyzes the code, finds the issue, fixes it]
You: [Continues debugging, verifies fix works]
```

### **2. Log-Based Debugging** ✅ (Best for AI Integration!)

This is the **BEST** way to work with me:

#### **Enhanced Logging Setup:**
```typescript
// Add detailed logging that I can read
logger.debug('Processing request', {
  requestId: req.id,
  method: req.method,
  url: req.url,
  body: sanitizedBody,
  userId: req.user?.id,
  timestamp: new Date().toISOString()
});
```

#### **Workflow:**
1. **Add detailed logs** to your code (I can help add these)
2. **Run your app** and reproduce the issue
3. **Copy the logs** and share with me
4. **I analyze logs** and identify the problem
5. **I fix the code** based on log analysis

#### **Example:**
```
You: "Here are the logs from my failed request: [paste logs]"
Me: [Analyzes logs, finds the issue at step 3, fixes it]
```

### **3. Error File Sharing**

#### **Workflow:**
1. **Save error output** to a file
2. **Share the file path** with me
3. **I read and analyze** the error
4. **I fix the issue**

#### **Example:**
```bash
# Save error to file
npm run dev 2>&1 | tee error.log

# Then tell me:
# "Check error.log - there's a TypeScript error"
```

### **4. GitHub Integration** ✅ (Already Set Up!)

- **Create issues** with error details
- **I can read issues** and help fix them
- **Link PRs** to issues for tracking

### **5. Remote Debugging Setup**

I can help you set up remote debugging that works with me:

#### **Option A: Debug Logs to File**
```typescript
// Create a debug log file I can read
import fs from 'fs';
const debugLog = (data: any) => {
  fs.appendFileSync('debug.log', JSON.stringify(data) + '\n');
};
```

#### **Option B: Debug API Endpoint**
```typescript
// Create a debug endpoint I can query
server.get('/api/debug/state', async (req, reply) => {
  return {
    appStore: Array.from(appStore.keys()),
    activeConnections: server.server.connections,
    memory: process.memoryUsage(),
    // ... other debug info
  };
});
```

## 🚀 Recommended Debugging Workflow with AI

### **Step 1: Initial Problem**
```
You: "The app creation endpoint is returning 500 errors"
```

### **Step 2: I Investigate**
- I search for the endpoint code
- I check error handling
- I look for similar issues
- I read related files

### **Step 3: I Add Debug Logging**
- I add detailed logs to the problematic area
- I add error context
- I add request/response logging

### **Step 4: You Test**
- You run the app
- You reproduce the issue
- You share the logs with me

### **Step 5: I Fix**
- I analyze the logs
- I identify the root cause
- I implement the fix
- I verify the fix

### **Step 6: You Verify**
- You test the fix
- You confirm it works
- We're done! 🎉

## 🛠️ Enhanced Debugging Tools I Can Set Up

### **1. Debug Helper Scripts**
I can create scripts that:
- Export app state to JSON
- Generate debug reports
- Check configuration
- Validate data structures

### **2. Enhanced Logging**
I can add:
- Request/response logging
- Performance timing
- Memory usage tracking
- Error context capture

### **3. Debug Endpoints**
I can create:
- `/api/debug/state` - Current app state
- `/api/debug/logs` - Recent logs
- `/api/debug/config` - Current configuration
- `/api/debug/test` - Test specific functionality

### **4. Debug Utilities**
I can create:
- Debug command-line tools
- Log analyzers
- Error pattern detectors
- Performance profilers

## 📋 Quick Reference

### **When to Use Me:**
- ✅ Code analysis and search
- ✅ Understanding error messages
- ✅ Finding related code
- ✅ Implementing fixes
- ✅ Adding debug logging
- ✅ Static analysis

### **When to Use VS Code Debugger:**
- ✅ Step-through debugging
- ✅ Inspecting variables
- ✅ Watching expressions
- ✅ Call stack inspection
- ✅ Breakpoint debugging

### **Best Combination:**
1. **Use VS Code** for interactive debugging
2. **Use me** for code analysis and fixes
3. **Use logs** to bridge the gap
4. **Use GitHub** for tracking issues

## 💡 Pro Tips

1. **Share context**: When reporting errors, include:
   - Error message
   - Stack trace
   - What you were trying to do
   - Relevant code snippets

2. **Use structured logs**: I can parse structured logs better than free-form text

3. **Save error output**: Use `tee` or redirect to files I can read

4. **Create minimal repros**: If you can isolate the issue, I can fix it faster

5. **Use GitHub Issues**: Create issues for complex bugs, I can read and help fix them

---

**Want me to set up any of these debugging tools? Just ask!**
