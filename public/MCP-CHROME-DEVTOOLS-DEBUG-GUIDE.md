# Chrome DevTools MCP Debugging Guide

## 🐛 Issue Identified

**Error**: `Non of the common Windows Env variables were set`

The Chrome DevTools MCP server is failing to connect because it can't find the required Windows environment variables to locate Chrome.

## 🔧 Solutions

### **Option 1: Set Windows Environment Variables**

1. **Find Chrome Installation Path**:
   ```cmd
   # Common Chrome paths on Windows:
   C:\Program Files\Google\Chrome\Application\chrome.exe
   C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
   %LOCALAPPDATA%\Google\Chrome\Application\chrome.exe
   ```

2. **Set Environment Variables**:
   ```cmd
   # Option A: Set temporarily in current session
   set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
   
   # Option B: Set permanently (requires admin)
   setx CHROME_PATH "C:\Program Files\Google\Chrome\Application\chrome.exe" /M
   ```

3. **Alternative Environment Variables**:
   ```cmd
   # Try these if CHROME_PATH doesn't work:
   set GOOGLE_CHROME_BIN="C:\Program Files\Google\Chrome\Application\chrome.exe"
   set CHROME_BIN="C:\Program Files\Google\Chrome\Application\chrome.exe"
   ```

### **Option 2: Manual Chrome Launch with Debug Port**

1. **Launch Chrome with Remote Debugging**:
   ```cmd
   # Close all Chrome instances first
   taskkill /f /im chrome.exe
   
   # Launch Chrome with debugging port
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug"
   ```

2. **Update MCP Configuration**:
   ```json
   {
     "mcpServers": {
       "chrome-devtools": {
         "command": "uvx",
         "args": ["chrome-devtools-mcp@latest"],
         "env": {
           "CHROME_DEBUG_PORT": "9222",
           "CHROME_DEBUG_HOST": "localhost"
         }
       }
     }
   }
   ```

### **Option 3: Alternative Debugging Methods**

Since MCP is having issues, use these alternative debugging approaches:

#### **Browser Console Debugging**
```javascript
// Open browser console (F12) and run:
console.log('🔍 Debug: Editor instance:', window.editor);
console.log('📊 Debug: Pending images:', window.editor?.pendingImages);
console.log('🖼️ Debug: Image URLs:', {
  hero: document.getElementById('heroImageUrl')?.value,
  problem: document.getElementById('problemImageUrl')?.value
});

// Check for errors
window.addEventListener('error', (e) => {
  console.error('❌ JavaScript Error:', e.error);
});
```

#### **Manual DOM Inspection**
```javascript
// Check image elements
document.querySelectorAll('img').forEach((img, i) => {
  console.log(`Image ${i}:`, {
    src: img.src,
    alt: img.alt,
    loaded: img.complete,
    naturalWidth: img.naturalWidth
  });
});

// Check pending upload elements
document.querySelectorAll('[id*="ImageUrl"]').forEach(input => {
  console.log(`${input.id}:`, input.value);
});
```

## 🧪 Debug the Pending Upload Issue

### **Step-by-Step Debugging**

1. **Open Case Study Editor**:
   ```
   http://localhost:3013/case_study_editor_complete.html
   ```

2. **Open Browser Console** (F12):
   ```javascript
   // Enable debug logging
   window.debugMode = true;
   
   // Check editor state
   console.log('Editor:', window.editor);
   console.log('Pending Images:', window.editor?.pendingImages);
   ```

3. **Upload an Image**:
   - Click upload button
   - Select an image file
   - Watch console for debug messages

4. **Check Preview Mode**:
   - Click Preview button
   - Look for "Pending upload..." placeholders
   - Check console for errors

### **Expected Debug Output**
```
🔍 Debug: Handling pending upload URL: pending-upload-hero-1697123456789 for section: hero
📊 Debug: pendingImages object: {hero: {file: File, section: "hero", timestamp: 1697123456789}}
📋 Debug: Found pending image data: {file: File, section: "hero", timestamp: 1697123456789}
✅ Debug: Creating object URL for single image
```

### **Common Issues & Fixes**

| Issue | Cause | Fix |
|-------|-------|-----|
| "Pending upload..." placeholder | `pendingImages[section]` is null | Check file upload logic |
| Broken image icon | Object URL not created | Verify `URL.createObjectURL()` call |
| Console errors | JavaScript exceptions | Check browser console |
| Images not updating | Preview not refreshing | Check `debouncedUpdatePreview()` |

## 🛠️ Quick Fixes

### **Fix 1: Force Image Preview Update**
```javascript
// Run in browser console to force update
if (window.editor) {
  window.editor.updateIntegratedPreview();
  console.log('✅ Preview updated');
}
```

### **Fix 2: Check Pending Images**
```javascript
// Inspect pending images state
if (window.editor?.pendingImages) {
  Object.keys(window.editor.pendingImages).forEach(section => {
    const pending = window.editor.pendingImages[section];
    console.log(`${section}:`, pending);
    if (pending?.file) {
      console.log(`  File: ${pending.file.name} (${pending.file.size} bytes)`);
    }
  });
}
```

### **Fix 3: Manual Image URL Creation**
```javascript
// Create object URLs manually if needed
if (window.editor?.pendingImages?.hero?.file) {
  const objectUrl = URL.createObjectURL(window.editor.pendingImages.hero.file);
  console.log('Manual object URL:', objectUrl);
  
  // Update image preview
  const heroImg = document.querySelector('#heroImagePreview img');
  if (heroImg) {
    heroImg.src = objectUrl;
  }
}
```

## 📋 Testing Checklist

- [ ] Chrome DevTools MCP connection working
- [ ] Image upload creates pending image data
- [ ] Object URLs generated correctly
- [ ] Preview mode shows actual images (not placeholders)
- [ ] Console shows debug messages
- [ ] No JavaScript errors in console
- [ ] Images display with proper aspect ratios
- [ ] Responsive design works on mobile

## 🚀 Alternative MCP Setup

If Chrome DevTools MCP continues to fail, consider these alternatives:

### **Option A: Use Different MCP Server**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "uvx",
      "args": ["mcp-server-filesystem", "--base-dir", "."]
    }
  }
}
```

### **Option B: Manual Debugging**
Use the debug HTML file and browser console instead of MCP:
```
http://localhost:3013/debug-pending-upload-fix.html
```

## 📞 Support

If issues persist:

1. **Check Chrome Version**: Ensure Chrome is up to date
2. **Restart Kiro**: Close and reopen Kiro IDE
3. **Clear Cache**: Clear browser cache and reload
4. **Check Logs**: Look at Kiro MCP logs for more details
5. **Use Alternatives**: Use browser console debugging instead

---

**Status**: 🔧 **DEBUGGING IN PROGRESS**
**Priority**: 🔴 **HIGH** - Affects core functionality
**Workaround**: ✅ **AVAILABLE** - Use browser console debugging