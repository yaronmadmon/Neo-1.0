-- Migration: 001_user_and_apps
-- Description: Create tables for users, sessions, plans, subscriptions, and apps
-- Created: 2026-01-28

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Users table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),  -- null for OAuth users
  name VARCHAR(255),
  avatar_url TEXT,
  auth_provider VARCHAR(50) DEFAULT 'local',  -- 'local', 'google', 'github'
  auth_provider_id VARCHAR(255),  -- OAuth provider user ID
  email_verified BOOLEAN DEFAULT FALSE,
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- User sessions table
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(512) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Subscription plans table
-- ============================================
CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(50) PRIMARY KEY,  -- 'free', 'pro', 'enterprise'
  name VARCHAR(100) NOT NULL,
  price_monthly INTEGER NOT NULL DEFAULT 0,  -- cents
  price_yearly INTEGER NOT NULL DEFAULT 0,   -- cents
  app_limit INTEGER,  -- null = unlimited
  features JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- User subscriptions table
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active',  -- 'active', 'canceled', 'past_due', 'trialing'
  stripe_subscription_id VARCHAR(255),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Apps table (persistent storage)
-- ============================================
CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  schema JSONB NOT NULL,
  theme JSONB,
  data JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider, auth_provider_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_apps_user_id ON apps(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
CREATE INDEX IF NOT EXISTS idx_apps_is_public ON apps(is_public);

-- ============================================
-- Insert default plans
-- ============================================
INSERT INTO plans (id, name, price_monthly, price_yearly, app_limit, features) VALUES
  ('free', 'Free', 0, 0, 3, '{"templates": "basic", "support": "community", "storage": "100mb"}'),
  ('pro', 'Pro', 1900, 19000, 25, '{"templates": "premium", "support": "email", "storage": "5gb", "customDomains": true, "analytics": true}'),
  ('enterprise', 'Enterprise', 9900, 99000, NULL, '{"templates": "all", "support": "priority", "storage": "unlimited", "customDomains": true, "analytics": true, "sso": true, "audit": true}')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  app_limit = EXCLUDED.app_limit,
  features = EXCLUDED.features;

-- ============================================
-- Function to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- Triggers for updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_apps_updated_at ON apps;
CREATE TRIGGER update_apps_updated_at
  BEFORE UPDATE ON apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
