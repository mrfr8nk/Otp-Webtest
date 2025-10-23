# WhatsApp Authentication System

## Overview
A secure authentication system that uses WhatsApp OTP (One-Time Password) for user signup and login. Migrated from Vercel serverless functions to Replit Express.js server.

## Recent Changes (October 23, 2025)
- Migrated from Vercel to Replit
- Converted Vercel serverless functions to Express.js server
- Configured server to run on port 5000 with proper host binding (0.0.0.0)
- Added CORS support for API endpoints
- Set up environment variables (MONGODB_URI, JWT_SECRET, OTP_API_URL)

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
