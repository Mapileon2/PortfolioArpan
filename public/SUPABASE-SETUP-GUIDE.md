# 🚀 Supabase Database Setup Guide

## Step 1: Apply Database Schema

1. **Open Supabase Dashboard**: https://fzyrsurzgepeawvfjved.supabase.co
2. **Go to SQL Editor** (left sidebar)
3. **Copy the entire content** from `supabase-schema.sql`
4. **Paste and execute** in SQL Editor
5. **Wait for completion** - you should see success messages

## Step 2: Configure Authentication

1. **Go to Authentication > Settings**
2. **Enable Email Auth** (should be enabled by default)
3. **Configure Email Templates** (optional)
4. **Set Site URL**: `http://localhost:3003`
5. **Add Redirect URLs**:
   - `http://localhost:3003/admin-dashboard.html`
   - `http://localhost:3003/admin-login.html`

## Step 3: Set Up Row Level Security (RLS)

The schema already includes RLS policies, but verify:

1. **Go to Database > Tables**
2. **Check each table** has RLS enabled (green shield icon)
3. **Verify policies** are created (click on table → RLS tab)

## Step 4: Create Your First Admin User

### Option A: Through Supabase Dashboard
1. **Go to Authentication > Users**
2. **Click "Add User"**
3. **Enter your email and password**
4. **Set role in user_metadata**: `{"role": "super_admin"}`

### Option B: Through Your App
1. **Use the registration form** in your app
2. **The trigger will automatically create a user profile**

## Step 5: Test the Connection

1. **Open**: http://localhost:3003/test-supabase.html
2. **Check console** for connection status
3. **Verify** all API calls work

## Step 6: Switch to Full Auth System

1. **Update admin-dashboard.html** to use Supabase auth
2. **Test login** at http://localhost:3003/admin-login.html
3. **Verify** all features work

## Troubleshooting

### Common Issues:

1. **RLS Blocking Queries**
   - Check policies are correctly set
   - Verify user roles match policy conditions

2. **Auth Not Working**
   - Check Site URL in Supabase settings
   - Verify redirect URLs are correct

3. **Tables Not Created**
   - Check for SQL errors in the editor
   - Run schema in smaller chunks if needed

### Debug Tools:

- **Test Connection**: http://localhost:3003/test-supabase.html
- **Auth Test**: http://localhost:3003/test-auth.html
- **Browser Console**: Check for error messages

## Next Steps After Setup:

1. **Create content** (projects, case studies)
2. **Configure integrations** (Cloudinary, etc.)
3. **Set up analytics** tracking
4. **Customize permissions** and roles
5. **Deploy to production**

---

**Need Help?** Check the console logs and error messages for specific issues.