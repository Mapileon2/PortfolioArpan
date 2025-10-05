# Portfolio SaaS Setup Guide

## Quick Start

Follow these steps to get your Portfolio SaaS system running with Supabase:

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase Database

1. Go to your Supabase project dashboard: https://app.supabase.com/project/fzyrsurzgepeawvfjved
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL commands to create all tables and policies

### 3. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

### 4. Access Your Application

- **Main Portfolio**: http://localhost:3000/
- **Admin Login**: http://localhost:3000/admin-login
- **Admin Dashboard**: http://localhost:3000/admin
- **Admin Settings**: http://localhost:3000/admin-settings

## First Time Setup

### Create Your First Admin User

1. Go to http://localhost:3000/admin-login
2. Click "Sign Up" tab
3. Create an account with your email and password
4. Go to your Supabase dashboard → Authentication → Users
5. Find your user and update their role to 'admin' in the user_profiles table

### Configure Your Portfolio

1. Login to the admin dashboard
2. Go to Settings to configure:
   - Site title and description
   - User roles and permissions
   - API keys for integrations
   - Backup settings
   - Security policies

## Database Tables Created

The setup creates these main tables:

- `user_profiles` - User information and roles
- `projects` - Portfolio projects
- `case_studies` - Detailed case studies
- `carousel_images` - Homepage carousel images
- `skills` - Skills and expertise
- `testimonials` - Client testimonials
- `timeline` - Career timeline
- `api_keys` - API access management
- `analytics_events` - Usage analytics
- `security_logs` - Security monitoring
- `site_settings` - Global settings

## Features Available

### ✅ Authentication & Security
- JWT-based authentication with Supabase
- Role-based access control (Super Admin, Admin, Editor, Viewer)
- Session management with automatic refresh
- Security monitoring and logging
- Rate limiting and brute force protection

### ✅ User Management
- Multi-user support with invitations
- Role-based permissions
- User activity tracking
- Profile management

### ✅ Content Management
- Projects and case studies
- Carousel image management
- Skills and testimonials
- Timeline management

### ✅ SaaS Features
- API key management
- Analytics dashboard
- Backup and restore
- Integration management
- Settings management

### ✅ Admin Interface
- Modern, responsive design
- Real-time updates
- Comprehensive settings panel
- Security monitoring

## API Endpoints

The server provides these API endpoints:

### Public Endpoints
- `GET /api/projects` - Get all projects
- `GET /api/case-studies` - Get all case studies
- `GET /api/carousel-images` - Get carousel images

### Authenticated Endpoints
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/users` - Get users (admin only)
- `GET /api/analytics/dashboard` - Get analytics
- `GET /api/settings` - Get site settings
- `PUT /api/settings` - Update settings

## Customization

### Adding New Features
1. Add database tables in `supabase-schema.sql`
2. Create API endpoints in `server.js`
3. Add frontend functionality in the appropriate JS files
4. Update the admin interface as needed

### Styling
- Modify the CSS in the HTML files
- Update Tailwind classes for design changes
- Add custom CSS for advanced styling

### Integrations
- Add new integrations in `js/saas-features.js`
- Configure API endpoints for third-party services
- Update the settings panel to manage integrations

## Troubleshooting

### Common Issues

**"Cannot connect to Supabase"**
- Check your Supabase URL and API key in `js/supabase-client.js`
- Ensure your Supabase project is active
- Check network connectivity

**"Authentication failed"**
- Verify the database schema is properly set up
- Check Row Level Security policies
- Ensure user_profiles table exists

**"Permission denied"**
- Check user roles in the user_profiles table
- Verify RLS policies are correctly configured
- Ensure the user has the required permissions

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('auth_debug', 'true');
```

## Security Considerations

### Production Deployment
1. Use environment variables for sensitive data
2. Enable HTTPS/SSL
3. Configure proper CORS settings
4. Set up rate limiting
5. Enable security headers
6. Regular security audits

### Supabase Security
1. Configure Row Level Security policies
2. Set up proper authentication rules
3. Use service role key only on server-side
4. Enable email confirmation for new users
5. Configure password policies

## Support

If you encounter issues:
1. Check the browser console for errors
2. Review the server logs
3. Verify Supabase configuration
4. Check the troubleshooting section above

## Next Steps

1. Customize the design to match your brand
2. Add your portfolio content
3. Configure integrations (Google Analytics, etc.)
4. Set up automated backups
5. Configure email notifications
6. Deploy to production

Your Portfolio SaaS system is now ready to use! 🚀