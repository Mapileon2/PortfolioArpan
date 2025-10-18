# 🐛 Preview Functionality Debug Guide

## 🚨 **Issue**: Preview showing "Case Study Not Found" error

**Error Message**: "Preview data not available or expired. Please try again from the editor."

---

## 🔍 **Debugging Steps**

### **Step 1: Test with Debug Tools**

#### **Option A: Use Step-by-Step Test**
```
URL: test-preview-step-by-step.html
```
1. Open the step-by-step test
2. Follow each step to isolate the issue
3. Check where the process fails

#### **Option B: Use Debug Preview Tool**
```
URL: debug-preview.html
```
1. Create test data
2. Check localStorage
3. Test preview URL
4. Monitor console output

### **Step 2: Manual Browser Testing**

#### **Open Browser Console** (F12)
1. Go to `case_study_editor_complete.html`
2. Open browser console (F12 → Console tab)
3. Fill in some content in the editor
4. Click Preview button
5. **Check console output** for:
   ```
   🔍 Preview Debug Info:
   📊 Preview Data: {...}
   🔗 Preview URL: case_study_display.html?preview=true&id=...
   💾 LocalStorage Key: caseStudyPreviewData
   ```

#### **Check LocalStorage** (F12 → Application tab)
1. Go to Application tab in browser dev tools
2. Expand "Local Storage" in left sidebar
3. Click on your domain (e.g., `localhost:3013`)
4. Look for key: `caseStudyPreviewData`
5. **Verify data exists** and is not empty

### **Step 3: Check Preview Display Page**

#### **When Preview Opens**
1. **Check URL** in address bar:
   ```
   Should be: case_study_display.html?preview=true&id=preview-123456789
   ```

2. **Open Console** on preview page (F12)
3. **Look for debug output**:
   ```
   📖 Loading preview data from editor...
   🔍 Debug Info:
   - URL: http://localhost:3013/case_study_display.html?preview=true&id=...
   - URL Params: ?preview=true&id=...
   💾 LocalStorage data length: 1234
   📊 Parsed preview data: {...}
   🕒 Data age (minutes): 0
   ✅ Case study data set
   ✅ Preview data loaded successfully
   ```

---

## 🔧 **Common Issues & Fixes**

### **Issue 1: LocalStorage Empty**
**Symptoms**: Console shows "No preview data found in localStorage"

**Causes**:
- Preview button not working in editor
- JavaScript error in editor
- Browser blocking localStorage

**Fix**:
```javascript
// Test in browser console:
localStorage.setItem('test', 'working');
console.log(localStorage.getItem('test')); // Should show 'working'
```

### **Issue 2: URL Parameters Missing**
**Symptoms**: Preview URL doesn't have `?preview=true&id=...`

**Causes**:
- Editor preview function not generating correct URL
- Browser blocking popup windows

**Fix**: Check if popup blocker is enabled

### **Issue 3: Data Expired**
**Symptoms**: Console shows "Preview data expired"

**Causes**:
- Data older than 5 minutes
- System clock issues

**Fix**: Create fresh data or extend expiry time

### **Issue 4: Cross-Origin Issues**
**Symptoms**: LocalStorage not accessible between pages

**Causes**:
- Different protocols (http vs https)
- Different ports
- Different domains

**Fix**: Ensure both pages use same origin

---

## 🧪 **Quick Tests**

### **Test 1: Manual LocalStorage Test**
```javascript
// Run in browser console on editor page:
const testData = {
    caseStudyTitle: "Test",
    sections: { hero: { enabled: true, title: "Test" } },
    isPreview: true,
    timestamp: Date.now(),
    previewId: "test-123"
};
localStorage.setItem('caseStudyPreviewData', JSON.stringify(testData));
console.log('Test data stored');

// Then open: case_study_display.html?preview=true&id=test-123
```

### **Test 2: Check Editor Preview Function**
```javascript
// Run in browser console on editor page:
console.log(typeof dashboard); // Should show 'object'
console.log(typeof dashboard.previewCaseStudy); // Should show 'function'

// Test the function:
dashboard.previewCaseStudy();
```

### **Test 3: Check Display Page Detection**
```javascript
// Run in browser console on display page:
const urlParams = new URLSearchParams(window.location.search);
console.log('Preview param:', urlParams.get('preview'));
console.log('ID param:', urlParams.get('id'));
console.log('LocalStorage data:', localStorage.getItem('caseStudyPreviewData'));
```

---

## 🎯 **Expected Working Flow**

### **1. Editor Side** ✅
```
User clicks Preview button
→ collectFormData() gathers all form data
→ Data stored in localStorage with key 'caseStudyPreviewData'
→ New tab opens with URL: case_study_display.html?preview=true&id=preview-123
→ Console shows debug info
```

### **2. Display Side** ✅
```
Display page loads
→ Detects preview=true in URL
→ Loads data from localStorage
→ Verifies data is fresh (< 5 minutes)
→ Renders case study content
→ Shows yellow "Preview Mode" banner
```

---

## 🚀 **Troubleshooting Commands**

### **Clear All Data**
```javascript
localStorage.clear();
console.log('All localStorage cleared');
```

### **Check Browser Support**
```javascript
console.log('LocalStorage supported:', typeof Storage !== "undefined");
console.log('Current origin:', window.location.origin);
```

### **Force Create Test Data**
```javascript
const testData = {
    caseStudyTitle: "Debug Test",
    sections: {
        hero: {
            enabled: true,
            title: "Debug Hero",
            subtitle: "Testing",
            description: "This is a debug test"
        }
    },
    isPreview: true,
    timestamp: Date.now(),
    previewId: `debug-${Date.now()}`
};
localStorage.setItem('caseStudyPreviewData', JSON.stringify(testData));
window.open(`case_study_display.html?preview=true&id=${testData.previewId}`, '_blank');
```

---

## 📋 **Debug Checklist**

- [ ] Editor page loads without JavaScript errors
- [ ] Preview button is clickable
- [ ] Console shows debug output when Preview clicked
- [ ] LocalStorage contains 'caseStudyPreviewData' key
- [ ] Preview URL has correct parameters
- [ ] Display page detects preview mode
- [ ] Display page can access localStorage
- [ ] Data is not expired (< 5 minutes old)
- [ ] No browser popup blocker interference

---

## 🔗 **Debug Tools**

- **Step-by-Step Test**: `test-preview-step-by-step.html`
- **Debug Preview**: `debug-preview.html`
- **Browser Console**: F12 → Console
- **LocalStorage Inspector**: F12 → Application → Local Storage

**Run these tools to identify exactly where the preview process is failing!**