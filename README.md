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

This repository contains the **unified backend API** that powers all three platforms, handling authentication, bookings, **online payments (Noqoody Gateway)**, reviews, notifications, and business verification.

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **TypeScript** | Type-safe development |
| **PostgreSQL** | Primary database |
| **Cloudinary** | Image/document storage |
| **Noqoody** | Payment gateway (Qatar) |
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
6. **Payment-First Booking**: Online payments are processed before booking creation

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
├── services/                   # External service integrations
│   └── noqoody.service.ts     # Noqoody payment gateway
└── modules/                    # Feature modules (see below)
```

### Configuration Files

- **check-env.ts**: Environment variable validation
- **tsconfig.json**: TypeScript configuration
- **package.json**: Dependencies and scripts

---

## 🗄 Database Schema

**Location**: `Call_To_Clean_DB_Schema_Postgres.sql` (root directory)

### Database Tables (19 Total + 1 Materialized View)

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
| **payment_transactions** | Payment gateway transactions (Noqoody) |
| **payment_logs** | Payment audit trail |

### Key Features

- **UUID Primary Keys** for all tables
- **ENUM Types** for status fields
- **Triggers** for auto-generating booking/transaction numbers
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
- **Payment method support**: Cash or Online (Noqoody)

**Routes**: `/api/bookings/*`

**Key Endpoints**:
- `POST /api/bookings` - Create booking (cash payment only)
- `GET /api/bookings/me` - User's bookings
- `PATCH /api/bookings/:id/status` - Update status
- `GET /api/bookings/:id` - Booking details

**Status Flow**:
```
pending → accepted → in_progress → completed
                   ↘ cancelled
                   ↘ rejected
```

**Payment Methods**:
- **Cash**: Booking created immediately, payment on service completion
- **Noqoody**: Payment processed first, booking created after successful payment

---

### 💳 **payments** - Payment Gateway Integration (NEW)

**Payment Gateway**: Noqoody (Qatar-based payment gateway)

**Features**:
- Online payment processing (credit/debit cards)
- Payment transaction tracking
- Payment validation and verification
- Automatic booking creation after successful payment
- Commission calculation and earnings tracking
- Payment audit logging

**Routes**: `/api/v1/payments/*`

**Key Endpoints**:
- `POST /api/v1/payments/initiate` - Initiate payment (creates transaction, NOT booking)
- `GET /api/v1/payments/validate/:transactionReference` - Validate payment (creates booking if successful)
- `GET /api/v1/payments/booking/:bookingId/status` - Get payment status
- `GET /api/v1/payments/transaction/:transactionId` - Get transaction details (admin only)
- `POST /api/v1/payments/transaction/:transactionId/refund` - Process refund (admin only)

**Payment Flow**:

**Cash Payment (Traditional)**:
```
1. Customer fills booking form
2. POST /api/bookings → Booking created (payment_method: 'cash', payment_status: 'pending')
3. Service delivered
4. Customer pays cash
5. Provider marks as paid (optional)
```

**Online Payment (Noqoody)**:
```
1. Customer fills booking form
2. POST /api/v1/payments/initiate
   - Input: Booking data (service, date, time, addons, etc.)
   - Output: Payment URL, transaction reference
   - Note: NO booking created yet!

3. Customer redirected to Noqoody payment page
4. Customer completes payment on Noqoody

5. GET /api/v1/payments/validate/:transactionReference
   - Backend calls Noqoody API to verify payment
   - If payment successful:
     ✅ Booking created with payment_status: 'paid'
     ✅ Earnings record created
     ✅ Notifications sent to customer and provider
   - If payment failed:
     ❌ No booking created
     ❌ Customer can retry

6. Customer sees booking confirmation
```

**Payment Transaction States**:
- `pending` - Payment initiated, awaiting completion
- `processing` - Payment being processed by Noqoody
- `completed` - Payment successful, booking created
- `failed` - Payment failed
- `cancelled` - Payment cancelled by user
- `expired` - Payment link expired (30 min timeout)
- `refunded` - Payment refunded by admin

**Database Tables**:
- **payment_transactions**: Main payment records
  - `transaction_reference` (auto-generated: PAY-2026-00000001)
  - `booking_id` (NULL until payment completes)
  - `gateway_transaction_id` (Noqoody's UUID)
  - `amount`, `currency`, `status`
  - `payment_url` (Noqoody payment page)
  - Gateway request/response payloads (JSONB)
  - Timestamps (initiated_at, completed_at, etc.)

- **payment_logs**: Audit trail for all payment operations
  - `log_type`: request, response, callback, error, status_change
  - `message`, `data` (JSONB)

**Noqoody Integration**:
- **Authentication**: OAuth2 token-based (14-day expiry, auto-refresh)
- **Payment Generation**: `POST /api/PaymentLink/GenerateLinks`
- **Payment Validation**: `GET /api/Members/GetTransactionDetailStatusByClientReference`
- **Security**: HMAC-SHA256 signature verification
- **Note**: Noqoody does NOT support webhooks - uses polling/validation approach

**Why Payment-First Design?**

The system creates bookings **ONLY after successful payment** for online payments. This prevents:
- ❌ Orphaned bookings with failed payments
- ❌ Provider confusion from unpaid bookings
- ❌ Complex cleanup logic
- ❌ Database pollution

**Benefits**:
- ✅ Clean database (no failed payment bookings)
- ✅ Clear provider notifications (only paid bookings)
- ✅ Better user experience (immediate confirmation)
- ✅ Simplified refund process

**Environment Variables Required**:
```bash
# Noqoody Sandbox (Development)
NOQOODY_SANDBOX_URL=https://sandbox.enoqoody.com
NOQOODY_SANDBOX_USERNAME=your-username
NOQOODY_SANDBOX_PASSWORD=your-password
NOQOODY_SANDBOX_PROJECT_CODE=your-project-code
NOQOODY_SANDBOX_CLIENT_SECRET=your-client-secret

# Noqoody Live (Production)
NOQOODY_LIVE_URL=https://noqoodypay.com/sdk
NOQOODY_LIVE_USERNAME=your-username
NOQOODY_LIVE_PASSWORD=your-password
NOQOODY_LIVE_PROJECT_CODE=your-project-code
NOQOODY_LIVE_CLIENT_SECRET=your-client-secret

# Mobile App URL (for payment return)
MOBILE_APP_URL=servio://payment

# API URL (for Noqoody callbacks - not currently used)
API_URL=https://api.yourdomain.com
```

**How to Get Noqoody Credentials**:
1. Sign up at [noqoodypay.com](https://noqoodypay.com) or [sandbox.enoqoody.com](https://sandbox.enoqoody.com)
2. Contact Noqoody support for sandbox credentials
3. Receive: Username, Password, Project Code, Client Secret
4. Can also fetch via API: `GET /api/Members/GetUserSettings` (after login)

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
- Notification types: booking updates, verification status, payment confirmations

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
- Noqoody account (for payment gateway)

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

# ✅ NEW: Noqoody Payment Gateway (Sandbox)
NOQOODY_SANDBOX_URL=https://sandbox.enoqoody.com
NOQOODY_SANDBOX_USERNAME=your-sandbox-username
NOQOODY_SANDBOX_PASSWORD=your-sandbox-password
NOQOODY_SANDBOX_PROJECT_CODE=your-project-code
NOQOODY_SANDBOX_CLIENT_SECRET=your-client-secret

# ✅ NEW: Noqoody Payment Gateway (Production)
NOQOODY_LIVE_URL=https://noqoodypay.com/sdk
NOQOODY_LIVE_USERNAME=your-live-username
NOQOODY_LIVE_PASSWORD=your-live-password
NOQOODY_LIVE_PROJECT_CODE=your-project-code
NOQOODY_LIVE_CLIENT_SECRET=your-client-secret

# ✅ NEW: Mobile App & API URLs
MOBILE_APP_URL=servio://payment  # Deep link scheme for payment return
API_URL=https://api.yourdomain.com  # Your backend API URL
```

### Optional Variables
```bash
# Server Configuration (Usually auto-set by hosting platform)
PORT=5000                    # Default: 5000
NODE_ENV=production          # Default: development (uses sandbox Noqoody)
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

### 4. Noqoody Credentials (NEW)

1. **Sandbox (Development)**:
   - Sign up at [sandbox.enoqoody.com](https://sandbox.enoqoody.com)
   - Contact Noqoody support to request sandbox credentials
   - Receive: Username, Password, Project Code, Client Secret

2. **Live (Production)**:
   - Sign up at [noqoodypay.com](https://noqoodypay.com)
   - Complete business verification
   - Contact Noqoody support for live credentials
   - Receive: Username, Password, Project Code, Client Secret

3. **Alternative**: Fetch credentials via API
```bash
   # After login, call:
   GET https://sandbox.enoqoody.com/api/Members/GetUserSettings
   # Returns: ProjectCode and ClientSecret
```

**Note**: The backend automatically uses sandbox credentials when `NODE_ENV !== 'production'`

### 5. Frontend Origins

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

# Noqoody Sandbox
NOQOODY_SANDBOX_URL=https://sandbox.enoqoody.com
NOQOODY_SANDBOX_USERNAME=sandbox-user
NOQOODY_SANDBOX_PASSWORD=sandbox-pass
NOQOODY_SANDBOX_PROJECT_CODE=PROJ123
NOQOODY_SANDBOX_CLIENT_SECRET=secret123

# Mobile & API URLs
MOBILE_APP_URL=servio://payment
API_URL=http://localhost:5000

PORT=5000
NODE_ENV=development
```

### Option 2: System Environment Variables (Production - VPS)

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
      PARTNER_ORIGIN: 'https://partner.yourdomain.com',
      
      // Noqoody Live
      NOQOODY_LIVE_URL: 'https://noqoodypay.com/sdk',
      NOQOODY_LIVE_USERNAME: 'live-user',
      NOQOODY_LIVE_PASSWORD: 'live-pass',
      NOQOODY_LIVE_PROJECT_CODE: 'PROJ456',
      NOQOODY_LIVE_CLIENT_SECRET: 'live-secret',
      
      MOBILE_APP_URL: 'servio://payment',
      API_URL: 'https://api.yourdomain.com'
    }
  }]
}

// Start: pm2 start ecosystem.config.js
```

---

## 🚨 **Common Issues & Solutions**

### Issue: Payment Initiation Fails
**Symptom**: `Failed to generate payment link`

**Solution**:
1. Verify all Noqoody credentials are set correctly
2. Check `NODE_ENV` - uses sandbox in development, live in production
3. Test credentials directly with Noqoody API
4. Verify Noqoody account is active (not expired)
5. Check API logs for specific error messages

### Issue: Payment Validation Fails
**Symptom**: Payment successful on Noqoody but booking not created

**Solution**:
1. Check `payment_transactions` table for transaction status
2. Verify `payment_logs` table for error details
3. Ensure customer has valid email and phone in database
4. Check backend logs for validation errors
5. Verify booking data in `gateway_request_payload` is complete

### Issue: CORS Errors
**Symptom**: Browser shows `Access-Control-Allow-Origin` error

**Solution**:
1. Check `ADMIN_ORIGIN` and `PARTNER_ORIGIN` exactly match your frontend URLs
2. **Remove trailing slashes** (`/`) from origins
3. Ensure protocol matches (http vs https)
4. Include port number if not 80/443

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
NOQOODY_SANDBOX_URL: https://sandbox.enoqoody.com
NOQOODY_LIVE_URL: https://noqoodypay.com/sdk
PORT: 5000
NODE_ENV: production
```

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

### Services

**`noqoody.service.ts` (NEW)**
- **Purpose**: Integrate with Noqoody payment gateway
- **Features**:
  - OAuth2 token management (auto-refresh)
  - Payment link generation
  - Payment validation
  - HMAC-SHA256 signature generation
  - Automatic sandbox/live environment switching
- **Methods**:
  - `getAccessToken()` - Authenticates with Noqoody
  - `generatePaymentLink()` - Creates payment URL
  - `validatePayment()` - Verifies payment status
  - `generateSecureHash()` - HMAC-SHA256 signature
- **Token Caching**: Tokens cached with 14-day expiry (minus 5 min safety margin)

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

**`expo-push.service.ts`**
- **Purpose**: Send push notifications to mobile app users
- **Features**:
  - Validates Expo push tokens before sending
  - Fetches user's `fcm_token` from database
  - Sends notifications with title, body, and custom data
  - Priority: `high` with sound enabled

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
- ✅ HMAC-SHA256 payment signature verification
- ✅ Payment transaction audit logging

---

## 📊 Key Business Logic

### Booking Flow

**Cash Payment**:
1. Customer creates booking → **Status: pending**, **Payment Status: pending**
2. Provider accepts/rejects → **Status: accepted/rejected**
3. Provider starts service → **Status: in_progress**
4. Provider completes → **Status: completed**
5. Customer can review (1-5 stars)

**Online Payment (Noqoody)**:
1. Customer selects online payment → **No booking created yet**
2. Payment transaction created → **Status: pending**
3. Customer pays on Noqoody
4. Payment validated → **Booking created**, **Status: pending**, **Payment Status: paid**
5. Provider accepts → **Status: accepted**
6. Provider starts service → **Status: in_progress**
7. Provider completes → **Status: completed**
8. Customer can review (1-5 stars)

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

### Payment Transaction Workflow

**Payment Initiation**:
```typescript
1. Customer completes booking form
2. POST /api/v1/payments/initiate with booking data
3. Backend:
   - Validates service, calculates total amount
   - Fetches customer email/phone
   - Creates payment_transaction (booking_id: NULL)
   - Stores booking data in gateway_request_payload (JSONB)
   - Calls Noqoody generatePaymentLink API
   - Stores payment_url, session_id, uuid
4. Returns payment URL to customer
5. Customer redirected to Noqoody payment page
```

**Payment Validation**:
```typescript
1. Customer completes payment on Noqoody
2. Customer returns to app
3. GET /api/v1/payments/validate/:transactionReference
4. Backend:
   - Calls Noqoody validatePayment API
   - If payment successful:
     a. Creates booking from gateway_request_payload data
     b. Updates payment_transaction.booking_id
     c. Sets booking.payment_status = 'paid'
     d. Creates earnings record
     e. Sends notifications to customer and provider
   - If payment failed/pending:
     a. Returns status to customer
     b. No booking created
5. Returns booking_id if successful
```

**Why Booking Data in Transaction?**
- Payment transactions are created BEFORE bookings
- Booking data stored in `gateway_request_payload` (JSONB field)
- After successful payment, this data is used to create the booking
- Prevents orphaned bookings from failed payments

**Transaction Reference Format**:
```
PAY-2026-00000001
PAY-YYYY-NNNNNNNN (auto-generated via trigger)
```

---

## 🧪 Testing

### Manual Testing - Payment Flow

**Sandbox Testing** (Development):
```bash
# 1. Set environment to development
NODE_ENV=development

# 2. Ensure sandbox credentials are set
NOQOODY_SANDBOX_USERNAME=your-sandbox-user
NOQOODY_SANDBOX_PASSWORD=your-sandbox-pass

# 3. Test payment initiation
POST /api/v1/payments/initiate
{
  "service_id": "uuid-here",
  "scheduled_date": "2026-01-15",
  "scheduled_time": "10:00:00",
  "address_id": "uuid-here"
}

# 4. Use test card on Noqoody sandbox:
# Card: 4111 1111 1111 1111
# CVV: 123
# Expiry: Any future date

# 5. Validate payment
GET /api/v1/payments/validate/PAY-2026-00000001

# 6. Check database
SELECT * FROM payment_transactions WHERE transaction_reference = 'PAY-2026-00000001';
SELECT * FROM bookings WHERE payment_transaction_id = 'transaction-uuid';
```

**Production Testing**:
```bash
# 1. Set environment to production
NODE_ENV=production

# 2. Ensure live credentials are set
NOQOODY_LIVE_USERNAME=your-live-user
NOQOODY_LIVE_PASSWORD=your-live-pass

# 3. Test with real card (small amount)
# 4. Verify in Noqoody dashboard
# 5. Check booking creation in database
```

### Unit Tests (if configured)
```bash
# Run tests
npm test

# Check TypeScript types
npm run type-check

# Lint code
npm run lint
```

---

## 📈 Monitoring & Logging

### Payment Logs

All payment operations are logged in `payment_logs` table:
```sql
-- View payment logs for a transaction
SELECT 
  log_type,
  message,
  data,
  created_at
FROM payment_logs
WHERE payment_transaction_id = 'uuid-here'
ORDER BY created_at DESC;

-- View recent payment errors
SELECT 
  pt.transaction_reference,
  pl.message,
  pl.data,
  pl.created_at
FROM payment_logs pl
JOIN payment_transactions pt ON pt.id = pl.payment_transaction_id
WHERE pl.log_type = 'error'
ORDER BY pl.created_at DESC
LIMIT 20;
```

### Payment Statistics
```sql
-- Payment success rate (last 30 days)
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
  COUNT(*) as total,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed')::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as success_rate_percent
FROM payment_transactions
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Revenue by payment method
SELECT 
  b.payment_method,
  COUNT(*) as booking_count,
  SUM(b.subtotal) as total_revenue,
  AVG(b.subtotal) as avg_booking_value
FROM bookings b
WHERE b.payment_status = 'paid'
  AND b.created_at >= NOW() - INTERVAL '30 days'
GROUP BY b.payment_method;

-- Pending payments (over 30 minutes old)
SELECT 
  transaction_reference,
  amount,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_elapsed
FROM payment_transactions
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC;
```

### Commission Analytics
```sql
-- Total platform revenue (commissions)
SELECT 
  SUM(commission_amount) as total_commission,
  COUNT(*) as paid_bookings,
  AVG(commission_amount) as avg_commission
FROM bookings
WHERE payment_status = 'paid'
  AND created_at >= NOW() - INTERVAL '30 days';

-- Revenue by provider
SELECT 
  u.first_name || ' ' || u.last_name as provider_name,
  COUNT(b.id) as bookings_completed,
  SUM(b.subtotal) as gross_revenue,
  SUM(b.commission_amount) as platform_commission,
  SUM(b.provider_earnings) as provider_earnings,
  AVG(b.commission_rate) as avg_commission_rate
FROM bookings b
JOIN users u ON u.id = b.provider_id
WHERE b.payment_status = 'paid'
  AND b.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.first_name, u.last_name
ORDER BY gross_revenue DESC
LIMIT 10;
```

---

## 🔧 Troubleshooting

### Debug Payment Issues

**Enable Detailed Logging**:
```typescript
// In src/services/noqoody.service.ts
console.log('Noqoody Request:', requestData);
console.log('Noqoody Response:', responseData);
```

**Check Noqoody Token**:
```sql
-- Tokens are cached in memory, but you can test authentication:
-- Use Postman/curl to call:
POST https://sandbox.enoqoody.com/token
Content-Type: application/x-www-form-urlencoded

username=your-username
&password=your-password
&grant_type=password
```

**Verify Payment Hash**:
```typescript
// Hash must match exactly for Noqoody to accept payment
// Format: {Email}{Name}{Mobile}{Description}{ProjectCode}{Reference}{Amount}
// Example: test@test.comJohn Doe+97412345678Service Payment123ABC-REF-001150.00

// Verify in backend logs or use:
const crypto = require('crypto');
const hash = crypto
  .createHmac('sha256', CLIENT_SECRET)
  .update(dataString)
  .digest('hex');
console.log('Generated hash:', hash);
```

**Common Payment Errors**:

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid credentials` | Wrong username/password | Verify Noqoody credentials |
| `Invalid project code` | Wrong project code | Check PROJECT_CODE matches account |
| `Invalid hash` | HMAC signature mismatch | Verify CLIENT_SECRET, check hash generation |
| `Customer email required` | User missing email | Ensure customer has email in database |
| `Payment expired` | Link older than 30 min | Generate new payment link |
| `Transaction not found` | Invalid reference | Check transaction_reference format |

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Run TypeScript build: `npm run build`
- [ ] Verify all environment variables are set
- [ ] Test database connection
- [ ] Verify Cloudinary credentials
- [ ] Test Noqoody integration (sandbox first)
- [ ] Check CORS origins match frontend URLs
- [ ] Run database migrations
- [ ] Verify SSL/TLS certificates

### Production Environment

- [ ] Set `NODE_ENV=production` (uses Noqoody live credentials)
- [ ] Use strong `JWT_SECRET` (32+ characters)
- [ ] Enable HTTPS for API
- [ ] Set up database backups
- [ ] Configure monitoring/alerts
- [ ] Set up payment webhook logging
- [ ] Enable rate limiting (if needed)
- [ ] Configure firewall rules

### Post-Deployment

- [ ] Test payment flow end-to-end
- [ ] Verify notifications are sent
- [ ] Check payment logs for errors
- [ ] Monitor commission calculations
- [ ] Test refund workflow (if implemented)
- [ ] Verify booking creation after payment
- [ ] Check earnings tracking
- [ ] Test with real payment (small amount)

---

## 🎯 Performance Optimization

### Database Indexes

All critical queries are indexed:
```sql
-- Payment-related indexes
CREATE INDEX idx_payment_transactions_booking ON payment_transactions(booking_id);
CREATE INDEX idx_payment_transactions_reference ON payment_transactions(transaction_reference);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_bookings_payment_transaction ON bookings(payment_transaction_id);

-- Booking indexes
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_provider ON bookings(provider_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_scheduled ON bookings(scheduled_date, scheduled_time);
```

### Query Optimization

- Use prepared statements (parameterized queries)
- Limit result sets with pagination
- Use database transactions for multi-step operations
- Cache frequently accessed data (e.g., categories)

### Noqoody Token Caching

The system caches Noqoody access tokens to reduce API calls:
- Token valid for 14 days
- Cached with 5-minute safety margin
- Auto-refresh on expiry
- Reduces authentication overhead by ~99%

---

## 📚 Additional Resources

- **Database Schema**: `Call_To_Clean_DB_Schema_Postgres.sql`
- **Environment Check**: `check-env.ts`
- **TypeScript Config**: `tsconfig.json`
- **Noqoody API Docs**: Contact Noqoody support for documentation
- **Cloudinary Docs**: [cloudinary.com/documentation](https://cloudinary.com/documentation)
- **Expo Push Notifications**: [docs.expo.dev/push-notifications](https://docs.expo.dev/push-notifications/overview/)

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/payment-improvements`
2. Make changes and test thoroughly
3. Update relevant documentation
4. Test payment flow in sandbox
5. Submit pull request with description

---

## 📝 License

[Your License Here]

---

## 💬 Support

For issues or questions:
- **Backend Issues**: Check logs and `payment_logs` table
- **Payment Issues**: Verify Noqoody credentials and check sandbox first
- **Database Issues**: Check connection string and migrations
- **CORS Issues**: Verify frontend origin URLs match exactly

---

## 📊 API Response Examples

### Payment Initiation Success
```json
{
  "success": true,
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "transactionReference": "PAY-2026-00000042",
  "paymentUrl": "https://sandbox.enoqoody.com/payment/abc123",
  "sessionId": "session-uuid-here",
  "uuid": "noqoody-uuid-here",
  "message": "Payment initiated successfully"
}
```

### Payment Validation Success
```json
{
  "success": true,
  "status": "completed",
  "message": "Payment validated and booking created successfully",
  "bookingId": "660e8400-e29b-41d4-a716-446655440000"
}
```

### Payment Validation Pending
```json
{
  "success": false,
  "status": "pending",
  "message": "Payment not yet completed"
}
```

### Payment Validation Failed
```json
{
  "success": false,
  "status": "failed",
  "message": "Payment validation failed",
  "error": "Payment declined by bank"
}
```

### Get Payment Status
```json
{
  "hasPayment": true,
  "paymentMethod": "noqoody",
  "paymentStatus": "paid",
  "transaction": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "transaction_reference": "PAY-2026-00000042",
    "provider": "noqoody",
    "amount": "250.00",
    "currency": "QAR",
    "status": "completed",
    "completed_at": "2026-01-10T14:30:00Z",
    "created_at": "2026-01-10T14:25:00Z"
  }
}
```

---

## 🔐 Security Best Practices

### Payment Security
- ✅ Never store credit card details
- ✅ Use HTTPS for all payment endpoints
- ✅ Validate HMAC signatures from Noqoody
- ✅ Log all payment operations for audit
- ✅ Implement rate limiting on payment endpoints
- ✅ Set payment link expiry (30 minutes)
- ✅ Validate transaction ownership before processing

### Data Protection
- ✅ Encrypt sensitive data at rest
- ✅ Use environment variables for secrets
- ✅ Implement proper access control
- ✅ Sanitize all user inputs
- ✅ Use parameterized SQL queries
- ✅ Enable database connection pooling
- ✅ Implement request logging
