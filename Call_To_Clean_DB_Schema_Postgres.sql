-- =====================================================
-- Servio - Services Marketplace Database Schema (LATEST)
-- PostgreSQL (fresh install) - single consolidated schema
-- =====================================================

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('customer', 'provider', 'admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    -- includes noqoody in latest
    CREATE TYPE payment_method AS ENUM ('cash', 'card', 'wallet', 'noqoody');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    -- includes verification_* in latest
    CREATE TYPE notification_type AS ENUM (
      'booking_created',
      'booking_accepted',
      'booking_rejected',
      'booking_in_progress',
      'booking_completed',
      'booking_cancelled',
      'new_message',
      'payment_received',
      'verification_approved',
      'verification_rejected'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'day_of_week') THEN
    CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'favorite_type') THEN
    CREATE TYPE favorite_type AS ENUM ('service', 'provider');
  END IF;

  -- IMPORTANT: enum name expected by old backend code
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status_enum') THEN
    CREATE TYPE verification_status_enum AS ENUM ('pending', 'approved', 'rejected', 'resubmitted');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
    CREATE TYPE document_type AS ENUM ('commercial_registration', 'trade_license', 'other');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_transaction_status') THEN
    CREATE TYPE payment_transaction_status AS ENUM (
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'refunded',
      'expired'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
    CREATE TYPE payment_provider AS ENUM ('cash', 'noqoody');
  END IF;
END $$;

-- =====================================================
-- HELPER: updated_at trigger function
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_id VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  status user_status NOT NULL DEFAULT 'active',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  profile_image VARCHAR(500),
  fcm_token TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- display_id generator
CREATE SEQUENCE IF NOT EXISTS user_display_id_seq START 1;

CREATE OR REPLACE FUNCTION set_user_display_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_id IS NULL THEN
    NEW.display_id := 'USR-' || LPAD(nextval('user_display_id_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_user_display_id ON users;
CREATE TRIGGER trg_set_user_display_id
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION set_user_display_id();

-- =====================================================
-- CATEGORIES
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- BUSINESS PROFILES
-- =====================================================
CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  business_logo VARCHAR(500),
  business_description TEXT,
  business_email VARCHAR(255),
  business_phone VARCHAR(20),

  street_address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Qatar',
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  tax_id VARCHAR(100),
  commission_rate DECIMAL(5,2) DEFAULT 15.00,
  is_active BOOLEAN DEFAULT true,

  verification_status verification_status_enum DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  rejected_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_location ON business_profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_business_profiles_verification_status ON business_profiles(verification_status);

DROP TRIGGER IF EXISTS update_business_profiles_updated_at ON business_profiles;
CREATE TRIGGER update_business_profiles_updated_at
BEFORE UPDATE ON business_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION DOCUMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  document_url VARCHAR(500) NOT NULL,
  document_name VARCHAR(255),
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  cloudinary_public_id TEXT,
  cloudinary_resource_type TEXT,

  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verification_documents_profile ON verification_documents(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_verification_documents_type ON verification_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_verification_documents_verified ON verification_documents(is_verified);
CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_documents_unique_type
ON verification_documents(business_profile_id, document_type);

DROP TRIGGER IF EXISTS update_verification_documents_updated_at ON verification_documents;
CREATE TRIGGER update_verification_documents_updated_at
BEFORE UPDATE ON verification_documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS verification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  previous_status verification_status_enum,
  new_status verification_status_enum NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verification_history_profile ON verification_history(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_created ON verification_history(created_at DESC);

-- =====================================================
-- SERVICES
-- =====================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER,
  images JSONB,
  is_active BOOLEAN DEFAULT true,

  archived_at TIMESTAMP WITH TIME ZONE NULL,
  archived_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  archive_reason TEXT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_archived_at ON services(archived_at);

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SERVICE ADD-ONS
-- =====================================================
CREATE TABLE IF NOT EXISTS service_addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_addons_service ON service_addons(service_id);

DROP TRIGGER IF EXISTS update_service_addons_updated_at ON service_addons;
CREATE TRIGGER update_service_addons_updated_at
BEFORE UPDATE ON service_addons
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PROVIDER AVAILABILITY
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider_id, day_of_week, start_time)
);

CREATE INDEX IF NOT EXISTS idx_provider_availability_provider ON provider_availability(provider_id);

DROP TRIGGER IF EXISTS update_provider_availability_updated_at ON provider_availability;
CREATE TRIGGER update_provider_availability_updated_at
BEFORE UPDATE ON provider_availability
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PROVIDER BLOCKED DATES
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider_id, blocked_date)
);

CREATE INDEX IF NOT EXISTS idx_blocked_dates_provider ON provider_blocked_dates(provider_id);

-- =====================================================
-- ADDRESSES
-- =====================================================
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(50),
  street_address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Qatar',
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_location ON addresses(latitude, longitude);

DROP TRIGGER IF EXISTS update_addresses_updated_at ON addresses;
CREATE TRIGGER update_addresses_updated_at
BEFORE UPDATE ON addresses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- BOOKINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,

  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  status booking_status DEFAULT 'pending',

  service_price DECIMAL(10,2) NOT NULL,
  addons_price DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  provider_earnings DECIMAL(10,2) NOT NULL,

  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00
    CHECK (commission_rate >= 0 AND commission_rate <= 100),

  payment_method payment_method DEFAULT 'cash',
  payment_status payment_status DEFAULT 'pending',

  customer_notes TEXT,
  provider_notes TEXT,
  cancellation_reason TEXT,

  accepted_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,

  payment_transaction_id UUID NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled ON bookings(scheduled_date, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_bookings_number ON bookings(booking_number);

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- booking number generator
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part VARCHAR(4);
  seq_part VARCHAR(6);
BEGIN
  year_part := EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::VARCHAR;

  SELECT LPAD((COUNT(*) + 1)::VARCHAR, 6, '0')
    INTO seq_part
  FROM bookings
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_TIMESTAMP);

  NEW.booking_number := 'BK-' || year_part || '-' || seq_part;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_booking_number ON bookings;
CREATE TRIGGER set_booking_number
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION generate_booking_number();

-- =====================================================
-- BOOKING ADD-ONS
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES service_addons(id) ON DELETE RESTRICT,
  addon_name VARCHAR(255) NOT NULL,
  addon_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_addons_booking ON booking_addons(booking_id);

-- =====================================================
-- FAVORITES
-- =====================================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  favorite_type favorite_type NOT NULL DEFAULT 'service',
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT favorites_type_check CHECK (
    (favorite_type = 'service' AND service_id IS NOT NULL AND provider_id IS NULL) OR
    (favorite_type = 'provider' AND provider_id IS NOT NULL AND service_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_service ON favorites(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_provider ON favorites(provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_type ON favorites(favorite_type);
CREATE UNIQUE INDEX IF NOT EXISTS favorites_unique_service ON favorites(user_id, service_id) WHERE favorite_type = 'service';
CREATE UNIQUE INDEX IF NOT EXISTS favorites_unique_provider ON favorites(user_id, provider_id) WHERE favorite_type = 'provider';

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- EARNINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  amount DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_earnings_provider ON earnings(provider_id);
CREATE INDEX IF NOT EXISTS idx_earnings_booking ON earnings(booking_id);
CREATE INDEX IF NOT EXISTS idx_earnings_created ON earnings(created_at DESC);

-- =====================================================
-- REVIEWS
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  provider_response TEXT,
  provider_response_at TIMESTAMP WITH TIME ZONE,
  is_visible BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT true,
  is_flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  flagged_at TIMESTAMP WITH TIME ZONE,
  flagged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service ON reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_visible ON reviews(is_visible);
CREATE INDEX IF NOT EXISTS idx_reviews_flagged ON reviews(is_flagged);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_visible ON reviews(provider_id, is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_reviews_service_visible ON reviews(service_id, is_visible) WHERE is_visible = true;

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- REVIEW STATISTICS (materialized view)
-- =====================================================
DROP MATERIALIZED VIEW IF EXISTS review_statistics;
CREATE MATERIALIZED VIEW review_statistics AS
SELECT
  service_id,
  provider_id,
  COUNT(*) as total_reviews,
  AVG(rating)::NUMERIC(3,2) as average_rating,
  COUNT(*) FILTER (WHERE rating = 5) as five_star_count,
  COUNT(*) FILTER (WHERE rating = 4) as four_star_count,
  COUNT(*) FILTER (WHERE rating = 3) as three_star_count,
  COUNT(*) FILTER (WHERE rating = 2) as two_star_count,
  COUNT(*) FILTER (WHERE rating = 1) as one_star_count,
  COUNT(*) FILTER (WHERE provider_response IS NOT NULL) as response_count
FROM reviews
WHERE is_visible = true
GROUP BY service_id, provider_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_review_stats_service ON review_statistics(service_id);
CREATE INDEX IF NOT EXISTS idx_review_stats_provider ON review_statistics(provider_id);

-- =====================================================
-- PASSWORD RESET TOKENS
-- =====================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);

-- =====================================================
-- PAYMENT TRANSACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,

  transaction_reference VARCHAR(255) UNIQUE NOT NULL,
  gateway_transaction_id VARCHAR(255),
  gateway_order_id VARCHAR(255),

  provider payment_provider NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'QAR',

  status payment_transaction_status DEFAULT 'pending',

  gateway_request_payload JSONB,
  gateway_response_payload JSONB,
  gateway_callback_payload JSONB,

  payment_url TEXT,
  return_url TEXT,
  cancel_url TEXT,
  callback_url TEXT,

  customer_ip VARCHAR(45),
  user_agent TEXT,

  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,

  error_code VARCHAR(50),
  error_message TEXT,

  refund_amount DECIMAL(10,2),
  refund_reason TEXT,
  refunded_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking ON payment_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_id ON payment_transactions(gateway_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(provider);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at DESC);

DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON payment_transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- transaction reference generator
CREATE OR REPLACE FUNCTION generate_transaction_reference()
RETURNS TRIGGER AS $$
DECLARE
  year_part VARCHAR(4);
  seq_part VARCHAR(8);
BEGIN
  year_part := EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::VARCHAR;

  SELECT LPAD((COUNT(*) + 1)::VARCHAR, 8, '0')
    INTO seq_part
  FROM payment_transactions
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_TIMESTAMP);

  NEW.transaction_reference := 'PAY-' || year_part || '-' || seq_part;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_transaction_reference ON payment_transactions;
CREATE TRIGGER set_transaction_reference
BEFORE INSERT ON payment_transactions
FOR EACH ROW
WHEN (NEW.transaction_reference IS NULL)
EXECUTE FUNCTION generate_transaction_reference();

-- wire bookings.payment_transaction_id FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_payment_transaction_id_fkey'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_payment_transaction_id_fkey
      FOREIGN KEY (payment_transaction_id)
      REFERENCES payment_transactions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_transaction ON bookings(payment_transaction_id);

-- =====================================================
-- PAYMENT LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  log_type VARCHAR(50) NOT NULL,
  message TEXT,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_transaction ON payment_logs(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_type ON payment_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created ON payment_logs(created_at DESC);

-- =====================================================
-- AUTO VERIFY BUSINESS PROFILE (trigger)
-- =====================================================
CREATE OR REPLACE FUNCTION check_and_update_verification_status()
RETURNS TRIGGER AS $$
DECLARE
  required_docs_count INTEGER;
  verified_docs_count INTEGER;
  profile_id UUID;
BEGIN
  profile_id := NEW.business_profile_id;

  SELECT COUNT(DISTINCT document_type)
    INTO required_docs_count
  FROM verification_documents
  WHERE business_profile_id = profile_id
    AND document_type IN ('commercial_registration', 'trade_license');

  SELECT COUNT(DISTINCT document_type)
    INTO verified_docs_count
  FROM verification_documents
  WHERE business_profile_id = profile_id
    AND document_type IN ('commercial_registration', 'trade_license')
    AND is_verified = true;

  IF required_docs_count = 2 AND verified_docs_count = 2 THEN
    UPDATE business_profiles
    SET verification_status = 'approved',
        verified_at = CURRENT_TIMESTAMP
    WHERE id = profile_id
      AND verification_status != 'approved';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_verify_business_profile ON verification_documents;
CREATE TRIGGER auto_verify_business_profile
AFTER UPDATE OF is_verified ON verification_documents
FOR EACH ROW
WHEN (NEW.is_verified = true)
EXECUTE FUNCTION check_and_update_verification_status();

COMMIT;

-- =====================================================
-- SUMMARY
-- =====================================================
-- Tables (19 + 1 materialized view):
-- 1. users (includes display_id + trigger/sequence)
-- 2. business_profiles (verification fields)
-- 3. verification_documents (includes cloudinary_public_id/resource_type)
-- 4. verification_history
-- 5. categories
-- 6. services (includes archived_at/by/reason)
-- 7. service_addons
-- 8. provider_availability
-- 9. provider_blocked_dates
-- 10. addresses
-- 11. bookings (includes commission_rate + payment_transaction_id)
-- 12. booking_addons
-- 13. favorites
-- 14. notifications (includes verification_approved/rejected types)
-- 15. earnings
-- 16. reviews
-- 17. password_reset_tokens
-- 18. payment_transactions
-- 19. payment_logs
-- Materialized View:
-- - review_statistics
--
-- ENUMs (12):
-- - user_role, user_status, booking_status, payment_method, payment_status,
--   notification_type, day_of_week, favorite_type,
--   verification_status_enum, document_type,
--   payment_transaction_status, payment_provider
--
-- Triggers:
-- - updated_at triggers on: users, business_profiles, categories, services,
--   service_addons, provider_availability, addresses, bookings, reviews,
--   verification_documents, payment_transactions
-- - set_booking_number on bookings
-- - set_transaction_reference on payment_transactions
-- - trg_set_user_display_id on users
-- - auto_verify_business_profile on verification_documents
