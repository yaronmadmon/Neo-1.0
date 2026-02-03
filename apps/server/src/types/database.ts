/**
 * Database Types
 * TypeScript interfaces for database tables
 */

export interface DbUser {
  id: string;
  email: string;
  password_hash: string | null;
  name: string | null;
  avatar_url: string | null;
  auth_provider: 'local' | 'google' | 'github';
  auth_provider_id: string | null;
  email_verified: boolean;
  stripe_customer_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface DbPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  app_limit: number | null;
  features: PlanFeatures;
  created_at: Date;
}

export interface PlanFeatures {
  templates: 'basic' | 'premium' | 'all';
  support: 'community' | 'email' | 'priority';
  storage: string;
  customDomains?: boolean;
  analytics?: boolean;
  sso?: boolean;
  audit?: boolean;
}

export interface DbSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  stripe_subscription_id: string | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DbApp {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  category: string | null;
  schema: Record<string, unknown>;
  theme: Record<string, unknown> | null;
  data: Record<string, unknown>;
  settings: Record<string, unknown>;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

// API response types (what we send to the frontend)
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  authProvider: 'local' | 'google' | 'github';
  emailVerified: boolean;
  createdAt: string;
}

export interface UserWithSubscription extends User {
  subscription: {
    planId: string;
    planName: string;
    status: string;
    appLimit: number | null;
    appsUsed: number;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  appLimit: number | null;
  features: PlanFeatures;
}

// Helper functions to convert between DB and API types
export function dbUserToUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    avatarUrl: dbUser.avatar_url,
    authProvider: dbUser.auth_provider,
    emailVerified: dbUser.email_verified,
    createdAt: dbUser.created_at.toISOString(),
  };
}

export function dbPlanToPlan(dbPlan: DbPlan): Plan {
  return {
    id: dbPlan.id,
    name: dbPlan.name,
    priceMonthly: dbPlan.price_monthly,
    priceYearly: dbPlan.price_yearly,
    appLimit: dbPlan.app_limit,
    features: dbPlan.features,
  };
}
