# Aaishree Data Service Center - Daily Report Generator

## Overview
A fullstack TypeScript application for generating, saving, and managing daily business reports. The application allows users to input services and expenses, generate formatted reports, and print them. Admin authentication is required to delete reports.

## Project Structure
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js + TypeScript
- **Database**: MongoDB (stores reports and admin users)
- **Authentication**: Passport.js with local strategy (username/password)

## Key Features
1. **Report Creation**: Enter services and expenses to generate daily reports
2. **Report History**: View, search, and manage all saved reports
3. **Print Functionality**: Professional print-ready format optimized for A4 paper
4. **Admin Dashboard**: Protected admin area for managing reports
5. **Authentication**: 
   - Login/Register system for admins
   - Password protection for deleting reports
   - Public can view and create reports
   - Only authenticated admins can delete reports

## Architecture

### Frontend Pages
- `/` - Home page (report creation form)
- `/history` - Report history (view all saved reports)
- `/login` - Admin login/register page
- `/admin` - Admin dashboard (protected route)

### API Routes
- `POST /api/register` - Create new admin account
- `POST /api/login` - Admin login
- `POST /api/logout` - Admin logout
- `GET /api/user` - Get current user session
- `POST /api/reports` - Create new report
- `GET /api/reports` - Get all reports
- `GET /api/reports/:id` - Get report by ID
- `GET /api/reports/date/:date` - Get report by date
- `DELETE /api/reports/:id` - Delete report (requires admin authentication)

### Database Collections
- `reports` - Daily business reports with services, expenses, and calculations
- `users` - Admin user accounts with encrypted passwords

## Recent Changes

### November 9, 2025 - Security Hardening
- ✅ **Enhanced Password Security**
  - Strong password requirements (min 8 chars, uppercase, lowercase, number, special char)
  - Username validation (alphanumeric + underscore only)
- ✅ **Rate Limiting Protection**
  - Login: Max 5 attempts per 15 minutes per IP
  - Account lockout: 30 minutes after 5 failed login attempts
  - Automatic unlocking after timeout period
- ✅ **Security Headers (Helmet.js)**
  - Content Security Policy (CSP)
  - XSS Protection
  - MIME type sniffing prevention
  - Clickjacking protection
- ✅ **Session Security**
  - Auto-generated session secrets if not configured
  - HttpOnly cookies (prevents XSS cookie theft)
  - SameSite=strict (CSRF protection)
  - Reduced session lifetime (24 hours vs 7 days)
  - Custom session cookie name (hides framework)
- ✅ **Account Protection**
  - Failed login attempt tracking
  - Temporary account lockout mechanism
  - Clear security error messages

### November 9, 2025 - Build & Database
- ✅ Made MongoDB connection graceful and optional
- ✅ App can start without MONGODB_URI (with limited features)
- ✅ Database connection failures show warnings instead of crashes
- ✅ Fixed build configuration (removed old index.html from root)
- ✅ Production build now works successfully
- ✅ API routes handle database unavailability with proper error messages

### November 8, 2025
- ✅ Added admin authentication system
- ✅ Created login/register pages
- ✅ Implemented protected routes for admin dashboard
- ✅ Added password requirement for deleting reports
- ✅ Updated UI to show admin/login buttons based on auth status
- ✅ Set up MongoDB connection for users and reports
- ✅ Configured authentication middleware with Passport.js

## Environment Variables
- `MONGODB_URI` - MongoDB connection string (optional - app runs with limited features if not set)
- `SESSION_SECRET` - Session encryption key (auto-generated if not provided)
- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Server port (default: 5000)
- `ADMIN_USERNAME` - Default admin username (default: "admin")
- `ADMIN_PASSWORD` - Default admin password (default: "admin123")

## Development Workflow
- Run `npm run dev` to start the development server
- Frontend uses Vite HMR for fast development
- Backend serves both API routes and the Vite dev server
- All routes prefixed with `/api` are backend routes
- Everything else is handled by React Router (wouter)

## User Preferences
- Uses Indian Rupee (INR) currency format
- Date format: Indian locale
- Professional business-focused design (Material Design approach)

## Tech Stack Details
- **Frontend**: React 18, Vite 5, TypeScript, Tailwind CSS, shadcn/ui, Wouter (routing), TanStack Query
- **Backend**: Express, TypeScript, Passport.js, MongoDB driver
- **Database**: MongoDB with collections for reports and users
- **Session**: In-memory session store (memorystore) for development
- **Security**: bcrypt-style password hashing (scrypt), secure sessions
