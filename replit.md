# WhatsApp Authentication System

## Overview
A secure, professional authentication system that uses WhatsApp OTP (One-Time Password) for user signup and login. Features a stunning navy blue glassmorphism UI with Instagram-style dashboard and complete profile management.

## Recent Changes (October 23, 2025)

### Migration & Backend
- Migrated from Vercel serverless functions to Replit Express.js server
- Fixed critical security issue: Removed JWT_SECRET fallback to prevent token forgery
- Added PORT environment variable support for deployment flexibility
- Fixed CORS to support GET, POST, PUT, DELETE, OPTIONS methods
- Fixed authorization header handling to prevent undefined errors
- Added profile update endpoint (PUT /api/user) with email uniqueness validation

### UI/UX Enhancements
- Redesigned with navy blue glassmorphism theme
- Added professional W.A OTP logo (SVG with gradient text rendering)
- Implemented Instagram-style dashboard with profile header, stats cards, and activity feed
- Added profile update section for editing name and email
- Integrated Lucide icons throughout the application
- Added OTP timer with 60-second countdown and resend functionality
- Implemented toggle switches for "Remember me" and "Stay logged in"
- Added footer with Mr Frank branding and social media icons (Facebook, Twitter, Instagram, LinkedIn, GitHub)
- Smooth animations and transitions throughout
- Fully responsive design for mobile devices

## Project Architecture

### Backend (server.js)
- **Framework**: Express.js
- **Database**: MongoDB (connected via MONGODB_URI)
- **Authentication**: JWT tokens with 7-day expiration
- **Password Security**: bcrypt hashing with salt rounds
- **OTP Service**: External API for WhatsApp OTP delivery

### API Endpoints
- `POST /api/signup` - Request OTP for new user registration
- `POST /api/verify-signup` - Verify OTP and complete signup
- `POST /api/login` - Request OTP for existing user login
- `POST /api/verify-login` - Verify OTP and complete login
- `GET /api/user` - Get current user info (requires Bearer token)
- `PUT /api/user` - Update user profile (name, email) with Bearer token authentication

### Frontend (public/index.html)
- Single-page application with multiple views (signup, login, OTP verification, dashboard)
- Client-side routing and state management
- LocalStorage for JWT token persistence
- Responsive design with gradient purple theme

### Database Collections
- `users` - Verified user accounts
- `pendingSignups` - Temporary storage for signup sessions awaiting OTP verification

## Security Features
- Password hashing with bcrypt
- JWT token-based authentication
- OTP verification via WhatsApp
- CORS headers for API security
- Authorization header validation
- Secure environment variable storage

## Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT signing
- `OTP_API_URL` - External OTP service URL

## Running the Project
The server runs automatically via the configured workflow:
- Command: `node server.js`
- Port: 5000
- Host: 0.0.0.0 (required for Replit)
