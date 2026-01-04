# Backend API Documentation

> A comprehensive service marketplace platform backend built with **Node.js, Express, TypeScript, and PostgreSQL**

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Module Documentation](#-module-documentation)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Patterns](#-api-patterns)
- [Utilities & Middleware](#-utilities--middleware)
- [Common Development Tasks](#-common-development-tasks)
- [Security Features](#-security-features)
- [Key Business Logic](#-key-business-logic)

---

## 🎯 Overview

**Servio** is a three-platform ecosystem connecting customers with service providers through a marketplace model:

- **Customer Mobile App** (React Native + Expo)
- **Service Provider Web Portal** (Next.js)
- **Admin Panel** (Next.js)

This repository contains the **unified backend API** that powers all three platforms, handling authentication, bookings, payments, reviews, notifications, and business verification.

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **TypeScript** | Type-safe development |
| **PostgreSQL** | Primary database |
| **Cloudinary** | Image/document storage |
| **Expo Push Notifications** | Mobile push notifications |
| **JWT** | Authentication |

---

## 🏗 Architecture

### Modular Monolith Pattern

The backend follows a **feature-based modular architecture** where each module is self-contained with its own:

```
module/
├── *.controller.ts    # Request/response handling
├── *.repository.ts    # Database queries
├── *.routes.ts        # Route definitions
└── *.types.ts         # TypeScript interfaces
```

### Key Architectural Decisions

1. **Repository Pattern**: Separates business logic from data access
2. **Modular Structure**: Each feature is isolated for maintainability
3. **TypeScript First**: Full type safety across the codebase
4. **JWT Authentication**: Stateless auth with role-based access control
5. **Centralized Middleware**: Reusable auth, validation, and error handling

---

## 📁 Project Structure

```
src/
├── app.ts                      # Express app configuration
├── server.ts                   # Server entry point
├── config/                     # Configuration files
│   ├── database.ts            # PostgreSQL connection
│   ├── cloudinary.ts          # Cloudinary setup
│   └── multer.ts              # File upload configuration
├── middleware/                 # Global middleware
│   └── auth.middleware.ts     # JWT authentication
├── utils/                      # Utility functions
│   ├── cloudinary-upload.ts   # Cloudinary upload helper
│   ├── cloudinary-delete-by-url.ts  # Delete Cloudinary assets
│   └── expo-push.service.ts   # Push notifications
└── modules/                    # Feature modules (see below)
```

### Configuration Files

- **check-env.ts**: Environment variable validation
- **tsconfig.json**: TypeScript configuration
- **package.json**: Dependencies and scripts

---

## 🗄 Database Schema

**Location**: `Call_To_Clean_DB_Schema_Postgres.sql` (root directory)

### Database Tables (17 Total)

| Table | Purpose |
|-------|---------|
| **users** | All user accounts (customers, providers, admins) |
| **business_profiles** | Service provider business information |
| **verification_documents** | Business verification docs (CR, license) |
| **verification_history** | Audit trail for verification changes |
| **categories** | Service categories |
| **services** | Services offered by providers |
| **service_addons** | Optional add-ons for services |
| **provider_availability** | Weekly schedules |
| **provider_blocked_dates** | Unavailable dates |
| **addresses** | Customer delivery addresses |
| **bookings** | Service bookings/orders |
| **booking_addons** | Add-ons included in bookings |
| **favorites** | User favorites (services/providers) |
| **notifications** | In-app notifications |
| **earnings** | Provider earnings tracking |
| **reviews** | Service reviews with responses |
| **password_reset_tokens** | Password reset functionality |

### Key Features

- **UUID Primary Keys** for all tables
- **ENUM Types** for status fields
- **Triggers** for auto-generating booking numbers
- **Foreign Key Constraints** for referential integrity
- **Indexes** on frequently queried columns
- **Materialized View** for review statistics

---

## 📦 Module Documentation

### 🔐 **auth** - Authentication
- User registration (customer/provider)
- Login with JWT tokens
- Password reset flow
- Token validation

**Routes**: `/api/auth/*`

---

### 👤 **users** - User Management
- CRUD operations for all user types
- Role-based user queries
- Provider listings with filters
- User profile management

**Routes**: `/api/users/*`

**Key Endpoints**:
- `GET /api/users/providers/:id` - Public provider details
- `GET /api/users/providers` - List all verified providers
- `PATCH /api/users/:id` - Update user profile

---

### 🏢 **businessProfiles** - Business Management
- Provider business profile CRUD
- Business information updates
- Commission rate management (admin only)

**Routes**: `/api/business-profiles/*`

---

### ✅ **verification** - Business Verification
- Document upload (CR, Trade License)
- Admin approval/rejection workflow
- Verification status tracking
- Document management

**Routes**: `/api/verification/*`

**Key Endpoints**:
- `POST /api/verification/documents` - Upload verification docs
- `PATCH /api/verification/documents/:id/verify` - Approve document (admin)
- `PATCH /api/verification/documents/:id/reject` - Reject document (admin)

---

### 📂 **categories** - Service Categories
- Category management
- Active/inactive toggles
- Sort ordering

**Routes**: `/api/categories/*`

---

### 🛠 **services** - Service Management
- Service CRUD by providers
- Multi-image upload via Cloudinary
- Service archival (soft delete)
- Public service browsing

**Routes**: `/api/services/*`

**Key Endpoints**:
- `GET /api/services` - List services (with filters)
- `GET /api/services/:id` - Service details
- `POST /api/services` - Create service (provider only)
- `PATCH /api/services/:id/archive` - Archive service

---

### ➕ **addons** - Service Add-ons
- Add-on management per service
- Pricing and availability
- Active/inactive control

**Routes**: `/api/addons/*`

---

### 📅 **availability** - Provider Scheduling
- Weekly availability schedules
- Time slot management
- Blocked dates for vacations/holidays
- Real-time slot checking

**Routes**: `/api/availability/*`

**Key Endpoints**:
- `GET /api/availability/provider/:id/slots` - Get available time slots
- `POST /api/availability/provider/:id/schedule` - Set weekly hours
- `POST /api/availability/provider/:id/block-date` - Block specific dates

---

### 📍 **addresses** - Customer Addresses
- Address CRUD for customers
- Default address management
- Location coordinates (lat/lng)

**Routes**: `/api/addresses/*`

---

### 📅 **bookings** - Booking Management
- Create bookings with payment calculation
- Status workflow (pending → accepted → in_progress → completed)
- Cancellation with reasons
- Commission calculation
- Auto-generated booking numbers (BK-2026-000001)

**Routes**: `/api/bookings/*`

**Key Endpoints**:
- `POST /api/bookings` - Create booking
- `GET /api/bookings/me` - User's bookings
- `PATCH /api/bookings/:id/status` - Update status
- `GET /api/bookings/:id` - Booking details

**Status Flow**:
```
pending → accepted → in_progress → completed
                   ↘ cancelled
                   ↘ rejected
```

---

### ⭐ **reviews** - Review System
- Post-service reviews (1-5 stars)
- Provider responses to reviews
- Admin flagging for inappropriate content
- Review statistics aggregation

**Routes**: `/api/reviews/*`

**Key Endpoints**:
- `POST /api/reviews` - Create review (completed bookings only)
- `GET /api/reviews/service/:id` - Service reviews with statistics
- `PATCH /api/reviews/:id/respond` - Provider response
- `PATCH /api/reviews/:id/flag` - Admin flag review

---

### ❤️ **favorites** - Favorites System
- Toggle favorites for services/providers
- Separate service and provider favorites
- Favorite status checking

**Routes**: `/api/favorites/*`

**Key Endpoints**:
- `POST /api/favorites/:serviceId/toggle` - Toggle service favorite
- `POST /api/favorites/provider/:providerId/toggle` - Toggle provider favorite
- `GET /api/favorites` - List user favorites

---

### 🔔 **notifications** - Notification System
- Push notifications via Expo
- In-app notification history
- Read/unread tracking
- Notification types: booking updates, verification status, etc.

**Routes**: `/api/notifications/*`

**Key Endpoints**:
- `GET /api/notifications` - List notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read

**Notification Types**:
- `booking_created`, `booking_accepted`, `booking_rejected`
- `booking_in_progress`, `booking_completed`, `booking_cancelled`
- `verification_approved`, `verification_rejected`
- `payment_received`, `new_message`

---

### 💰 **earnings** - Earnings Tracking
- Provider earnings per booking
- Commission tracking
- Earnings history
- Date-range filtering

**Routes**: `/api/earnings/*`

---

### 📊 **adminDashboard** - Admin Analytics
- Platform statistics
- Revenue metrics
- User/booking/provider counts
- Recent activity

**Routes**: `/api/admin/dashboard/*`

---

### 🔍 **search** - Unified Search
- Search across services and providers
- Category filtering
- Keyword search
- Pagination support

**Routes**: `/api/search/*`

---

### 📤 **upload** - File Upload
- Cloudinary integration
- Image optimization
- PDF document upload
- Public URL generation

**Routes**: `/api/upload/*`

---

### 👤 **profile** - User Profile
- Get current user profile
- Update profile information
- FCM token management for push notifications

**Routes**: `/api/profile/*`

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Cloudinary account
- Expo account (for push notifications)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
psql -U postgres -d your_db < Call_To_Clean_DB_Schema_Postgres.sql

# Start development server
npm run dev
```

### Build & Deploy

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

---

## 🔑 Environment Variables

### Required Variables

These variables **MUST** be set in your hosting environment:

```bash
# Database Connection
DATABASE_URL=postgresql://user:password@host:5432/database_name
# Example: postgresql://servio_user:securepass@db-host.com:5432/servio_db

# JWT Authentication
JWT_SECRET=your-super-secret-random-string-min-32-chars
# Generate: openssl rand -base64 32

# Cloudinary (Image & Document Storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name       # From Cloudinary dashboard
CLOUDINARY_API_KEY=123456789012345          # From Cloudinary dashboard
CLOUDINARY_API_SECRET=your-api-secret       # From Cloudinary dashboard

# CORS Origins (Frontend URLs)
ADMIN_ORIGIN=https://admin.yourdomain.com
PARTNER_ORIGIN=https://partner.yourdomain.com
# NO trailing slash! The backend automatically removes it.
```

### Optional Variables

```bash
# Server Configuration (Usually auto-set by hosting platform)
PORT=5000                    # Default: 5000
NODE_ENV=production          # Default: development
```

---

## 🌐 **CORS Configuration Explained**

The backend uses **dynamic CORS** to allow requests from your frontend applications.

### Deployment Scenarios

#### **Scenario 1: Separate Hosting (Recommended)**
```bash
# Backend on one server
# Admin dashboard on another server/service
# Partner portal on another server/service

ADMIN_ORIGIN=https://admin.yourdomain.com
PARTNER_ORIGIN=https://partner.yourdomain.com
```

#### **Scenario 2: VPS with Different Ports**
```bash
# All hosted on same VPS (e.g., 203.0.113.5)
# Backend: port 5000
# Admin: port 3000
# Partner: port 3001

ADMIN_ORIGIN=http://203.0.113.5:3000
PARTNER_ORIGIN=http://203.0.113.5:3001
```

#### **Scenario 3: VPS with Nginx Reverse Proxy**
```bash
# All on same VPS with Nginx handling domains

ADMIN_ORIGIN=https://admin.yourdomain.com
PARTNER_ORIGIN=https://partner.yourdomain.com

# Nginx proxies:
# admin.yourdomain.com -> localhost:3000
# partner.yourdomain.com -> localhost:3001
# api.yourdomain.com -> localhost:5000
```

#### **Scenario 4: Local Development**
```bash
ADMIN_ORIGIN=http://localhost:3000
PARTNER_ORIGIN=http://localhost:3001
```

**Important**: No code changes needed in `app.ts` for any scenario - just update environment variables!

---

## 🔧 **Getting Environment Variables**

### 1. Database URL (PostgreSQL)

**Format**: `postgresql://username:password@host:port/database`

**Examples**:
```bash
# Local PostgreSQL
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/servio_db

# Remote PostgreSQL
DATABASE_URL=postgresql://servio_user:securepass@192.168.1.100:5432/servio_db

# Managed Database (with SSL)
DATABASE_URL=postgresql://user:pass@db-host.com:5432/dbname?sslmode=require
```

**Setup**:
1. Create PostgreSQL database
2. Run schema: `psql -U username -d servio_db < Call_To_Clean_DB_Schema_Postgres.sql`
3. Copy connection string

### 2. JWT Secret

Generate a secure random string:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Or use online generator (use a trusted source)
```

**Requirements**: Minimum 32 characters, random, keep it secret!

### 3. Cloudinary Credentials

1. Sign up at [cloudinary.com](https://cloudinary.com) (free tier available)
2. Go to Dashboard
3. Copy: **Cloud Name**, **API Key**, **API Secret**

**Free tier includes**:
- 25GB storage
- 25GB monthly bandwidth
- Image transformations (resize, crop, optimize)
- PDF document upload

### 4. Frontend Origins

Set these to match your deployed frontend URLs:

```bash
# Production
ADMIN_ORIGIN=https://admin.yourdomain.com
PARTNER_ORIGIN=https://partner.yourdomain.com

# Development
ADMIN_ORIGIN=http://localhost:3000
PARTNER_ORIGIN=http://localhost:3001

# VPS with IP
ADMIN_ORIGIN=http://203.0.113.5:3000
PARTNER_ORIGIN=http://203.0.113.5:3001
```

**Rules**:
- Must match exact URL (including protocol: http/https)
- No trailing slash
- Include port if not 80/443

---

## ⚙️ **Setting Environment Variables**

### Option 1: Using .env File (Development)

Create `.env` in project root:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/servio_db
JWT_SECRET=your-generated-secret-here
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-api-secret
ADMIN_ORIGIN=http://localhost:3000
PARTNER_ORIGIN=http://localhost:3001
PORT=5000
```

### Option 2: System Environment Variables (Production - VPS)

**Linux/Mac**:
```bash
# Add to ~/.bashrc or ~/.profile
export DATABASE_URL="postgresql://user:pass@localhost:5432/servio_db"
export JWT_SECRET="your-secret"
export CLOUDINARY_CLOUD_NAME="your-cloud"
export CLOUDINARY_API_KEY="your-key"
export CLOUDINARY_API_SECRET="your-secret"
export ADMIN_ORIGIN="https://admin.yourdomain.com"
export PARTNER_ORIGIN="https://partner.yourdomain.com"

# Reload
source ~/.bashrc
```

**PM2 Ecosystem File** (recommended for VPS):
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'servio-api',
    script: './dist/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/servio_db',
      JWT_SECRET: 'your-secret',
      CLOUDINARY_CLOUD_NAME: 'your-cloud',
      CLOUDINARY_API_KEY: 'your-key',
      CLOUDINARY_API_SECRET: 'your-secret',
      ADMIN_ORIGIN: 'https://admin.yourdomain.com',
      PARTNER_ORIGIN: 'https://partner.yourdomain.com'
    }
  }]
}

// Start: pm2 start ecosystem.config.js
```

**Docker**:
```dockerfile
# In docker-compose.yml
services:
  api:
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/servio_db
      - JWT_SECRET=your-secret
      - CLOUDINARY_CLOUD_NAME=your-cloud
      - CLOUDINARY_API_KEY=your-key
      - CLOUDINARY_API_SECRET=your-secret
      - ADMIN_ORIGIN=https://admin.yourdomain.com
      - PARTNER_ORIGIN=https://partner.yourdomain.com
```

### Option 3: Cloud Platform (PaaS)

Most cloud platforms provide environment variable management in their dashboards:
- Heroku: Settings → Config Vars
- Railway: Variables tab
- Render: Environment tab
- DigitalOcean App Platform: Settings → Environment Variables
- AWS Elastic Beanstalk: Configuration → Software
- Google Cloud Run: Environment Variables section

---

## 🚨 **Common Issues & Solutions**

### Issue: CORS Errors
**Symptom**: Browser shows `Access-Control-Allow-Origin` error

**Solution**:
1. Check `ADMIN_ORIGIN` and `PARTNER_ORIGIN` exactly match your frontend URLs
2. **Remove trailing slashes** (`/`) from origins
3. Ensure protocol matches (http vs https)
4. Include port number if not 80/443

**Example**:
```bash
# ❌ Wrong
ADMIN_ORIGIN=https://admin.yourdomain.com/
ADMIN_ORIGIN=admin.yourdomain.com

# ✅ Correct
ADMIN_ORIGIN=https://admin.yourdomain.com
```

### Issue: Database Connection Failed
**Symptom**: `❌ Database connection failed`

**Solution**:
1. Verify `DATABASE_URL` format is correct
2. Check PostgreSQL is running: `systemctl status postgresql`
3. Test connection: `psql "postgresql://user:pass@host:5432/dbname"`
4. Verify firewall allows port 5432
5. Check pg_hba.conf allows remote connections (if needed)

### Issue: Images Not Uploading
**Symptom**: Cloudinary upload errors

**Solution**:
1. Verify all three Cloudinary variables are set correctly
2. Test credentials in Cloudinary dashboard
3. Check API key is active (not expired)
4. Verify quota limits (free tier: 25GB/month)

### Issue: Push Notifications Not Sending
**Symptom**: Notifications not received on mobile

**Solution**:
1. Ensure users have valid Expo push tokens in database
2. Check `fcm_token` field in `users` table is not null
3. Verify mobile app has notification permissions enabled
4. Test with single user first

### Issue: "Cannot find module" errors
**Symptom**: Import errors when running compiled code

**Solution**:
```bash
# Rebuild TypeScript
npm run build

# Verify dist/ folder exists
ls dist/

# Check node_modules
npm install
```

---

## 🔍 **Environment Validation**

Run this to verify all required variables are set:

```bash
# Development
npx ts-node check-env.ts

# Production (after build)
node dist/check-env.js
```

**Example Output**:
```
Environment variables check:
DATABASE_URL: ***SET***
JWT_SECRET: ***SET***
CLOUDINARY_CLOUD_NAME: your-cloud-name
CLOUDINARY_API_KEY: 123456789012345
CLOUDINARY_API_SECRET: ***SET***
ADMIN_ORIGIN: https://admin.yourdomain.com
PARTNER_ORIGIN: https://partner.yourdomain.com
PORT: 5000
NODE_ENV: production
```

**What it checks**:
- DATABASE_URL, JWT_SECRET, CLOUDINARY_API_SECRET are masked for security
- All other variables show their actual values
- Quick verification that all required variables are present

---

## 🔄 API Patterns

### Request/Response Flow

```
Client Request
    ↓
Express Router (*.routes.ts)
    ↓
Auth Middleware (validates JWT)
    ↓
Controller (*.controller.ts) - Business logic
    ↓
Repository (*.repository.ts) - Database queries
    ↓
PostgreSQL Database
    ↓
Response sent to client
```

### Authentication

All protected routes require a JWT token:

```bash
Authorization: Bearer <jwt_token>
```

**Roles**: `customer`, `provider`, `admin`

**Token Payload**:
```typescript
{
  userId: string;
  email: string;
  role: 'customer' | 'provider' | 'admin';
}
```

### CORS (Cross-Origin Resource Sharing)

The API uses **dynamic CORS** based on environment variables.

**Allowed Origins**:
- Development: `http://localhost:3000`, `http://localhost:3001`
- Production: `ADMIN_ORIGIN` and `PARTNER_ORIGIN` env variables

**Configuration** (`app.ts`):
```typescript
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.ADMIN_ORIGIN,    // https://admin.vercel.app
  process.env.PARTNER_ORIGIN,  // https://partner.vercel.app
];
```

**Note**: Trailing slashes are automatically removed from origins for consistency.

### Error Responses

```json
{
  "error": "Error message here",
  "details": "Optional detailed error info"
}
```

### Success Responses

```json
{
  "message": "Success message",
  "data": { ... }
}
```

---

## 🛡 Utilities & Middleware

### Middleware

**`auth.middleware.ts`**
- Validates JWT tokens from `Authorization: Bearer <token>` header
- Extracts user info from token payload
- Attaches `req.user` with: `{ userId, email, role }`
- Role-based access control (customer, provider, admin)
- Returns `401 Unauthorized` if token invalid/expired

### Utilities

**`cloudinary-upload.ts`**
- **Purpose**: Upload images/PDFs to Cloudinary from file buffers
- **Features**:
  - Auto-detection of file type (`resourceType: 'auto'`)
  - Image transformations (resize, crop) for images only
  - Folder organization (`folder: 'servio'`)
  - Returns secure HTTPS URL
- **Usage**:
  ```typescript
  const result = await uploadToCloudinary(buffer, {
    folder: 'servio/services',
    width: 800,
    height: 600,
    resourceType: 'auto' // or 'image', 'raw' for PDFs
  });
  console.log(result.secure_url);
  ```

**`cloudinary-delete-by-url.ts`**
- **Purpose**: Delete files from Cloudinary using their public URL
- **Features**:
  - Extracts `public_id` from Cloudinary URL
  - Handles versioned URLs (`/v123456789/`)
  - Removes file extensions automatically
  - Supports nested folders
- **Example**:
  ```typescript
  // Input: https://res.cloudinary.com/.../servio/abc123.jpg
  // Extracted: servio/abc123
  await deleteCloudinaryImageByUrl(url);
  ```

**`expo-push.service.ts`**
- **Purpose**: Send push notifications to mobile app users
- **Features**:
  - Validates Expo push tokens before sending
  - Fetches user's `fcm_token` from database
  - Sends notifications with title, body, and custom data
  - Priority: `high` with sound enabled
  - Channel: `default`
- **Usage**:
  ```typescript
  await sendPushNotificationToUser({
    userId: 'user-uuid',
    title: 'Booking Accepted',
    body: 'Your booking has been accepted!',
    data: { booking_id: 'booking-uuid' }
  });
  ```
- **Note**: Users must have `fcm_token` set in database (from mobile app)

---

## 📝 Common Development Tasks

### Adding a New Module

1. Create folder in `src/modules/`
2. Add files: `*.controller.ts`, `*.repository.ts`, `*.routes.ts`, `*.types.ts`
3. Register routes in `src/app.ts`

### Database Changes

1. Update `Call_To_Clean_DB_Schema_Postgres.sql`
2. Run migration on database
3. Update TypeScript types in module `*.types.ts`

### Adding New Endpoints

1. Define route in `*.routes.ts`
2. Implement controller function in `*.controller.ts`
3. Add database query in `*.repository.ts`
4. Update TypeScript types if needed

---

## 🔐 Security Features

- ✅ JWT-based authentication
- ✅ Password hashing (bcrypt)
- ✅ Role-based access control
- ✅ SQL injection prevention (parameterized queries)
- ✅ Environment variable validation
- ✅ CORS configuration
- ✅ Input validation and sanitization

---

## 📊 Key Business Logic

### Booking Flow

1. Customer creates booking → **Status: pending**
2. Provider accepts/rejects → **Status: accepted/rejected**
3. Provider starts service → **Status: in_progress**
4. Provider completes → **Status: completed**
5. Customer can review (1-5 stars)

### Commission Calculation

```typescript
commission_amount = subtotal × (commission_rate / 100)
provider_earnings = subtotal - commission_amount
```

Default commission: **15%** (customizable per provider by admin)

### Verification Workflow

1. Provider uploads Commercial Registration + Trade License
2. Admin reviews documents
3. Admin approves/rejects each document
4. When both approved → Business profile auto-verified
5. Notification sent to provider

---

## 🧪 Testing

```bash
# Run tests (if configured)
npm test

# Check TypeScript types
npm run type-check
```

---

## 📚 Additional Resources

- **Database Schema**: `Call_To_Clean_DB_Schema_Postgres.sql`
- **Environment Check**: `check-env.ts`
- **TypeScript Config**: `tsconfig.json`

