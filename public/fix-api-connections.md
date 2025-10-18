# 🔧 API Connection Fix Guide

## 🔍 **Issue Identified**

The admin dashboard functionalities are **NOT properly connected** to the homepage because:

### ❌ **Problems Found:**
1. **API Endpoint Mismatch:**
   - Homepage expects: `/api/carousel-images`
   - Admin dashboard uses: `/api/carousel/images`
   - Result: 404 errors for admin API calls

2. **Database Connection Issues:**
   - `/api/carousel-images` returns 500 error
   - Likely missing `order_index` column in database
   - Need to run database fix script

3. **Server Configuration:**
   - Carousel router not properly mounted in main server
   - Two different server configurations exist

### ✅ **Solutions Required:**

## 1. **Fix Database Schema**
Run the `supabase-fix-order-index.sql` script in Supabase SQL Editor

## 2. **Fix Server API Mounting**
Update `server.js` to include carousel router:

```javascript
// Add carousel API routes
const carouselRoutes = require('./api/carousel');
app.use('/api/carousel', carouselRoutes);
```

## 3. **Update Homepage API Calls**
Change homepage to use consistent API endpoints

## 4. **Test Connections**
Verify data flows from admin dashboard to homepage

---

## 🎯 **Expected Result After Fix:**
- ✅ Admin dashboard carousel management → Homepage carousel display
- ✅ Admin dashboard case studies → Homepage projects section  
- ✅ All API endpoints working consistently
- ✅ Data synchronization between admin and public views

## 📋 **Current Status:**
- 🔴 **Carousel API**: Not connected (404/500 errors)
- 🟡 **Case Studies API**: Connected but empty (no data)
- 🔴 **About API**: Not connected (404 error)

## 🚀 **Next Steps:**
1. Run database fix script
2. Update server configuration
3. Test API connections
4. Verify data flow from admin to homepage