/**
 * Auth Context
 * Provides authentication state and methods throughout the app
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ============================================
// Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  authProvider: 'local' | 'google' | 'github';
  emailVerified: boolean;
  createdAt: string;
}

export interface Subscription {
  planId: string;
  planName: string;
  status: string;
  appLimit: number | null;
  appsUsed: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface UserWithSubscription extends User {
  subscription: Subscription | null;
}

export interface AuthContextValue {
  user: UserWithSubscription | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  providers: string[];
  login: (provider: 'google' | 'github') => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ============================================
// Context
// ============================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================
// Provider
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserWithSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [providers, setProviders] = useState<string[]>([]);

  /**
   * Fetch current user
   */
  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/auth/me', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          return;
        }
      }
      
      setUser(null);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
    }
  }, []);

  /**
   * Fetch available auth providers
   */
  const fetchProviders = useCallback(async () => {
    try {
      const response = await fetch('/auth/providers');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.providers) {
          setProviders(data.providers);
        }
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    }
  }, []);

  /**
   * Initialize auth state
   */
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      
      // Check for auth result in URL
      const params = new URLSearchParams(window.location.search);
      const authResult = params.get('auth');
      const error = params.get('error');
      
      if (authResult === 'success') {
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      } else if (error) {
        console.error('Auth error:', error);
        window.history.replaceState({}, '', window.location.pathname);
      }
      
      await Promise.all([fetchUser(), fetchProviders()]);
      setIsLoading(false);
    };
    
    init();
  }, [fetchUser, fetchProviders]);

  /**
   * Login with OAuth provider
   */
  const login = useCallback((provider: 'google' | 'github') => {
    // Redirect to OAuth endpoint
    window.location.href = `/auth/${provider}`;
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
    }
  }, []);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    providers,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================
// HOC for protected routes
// ============================================

interface WithAuthProps {
  requireAuth?: boolean;
  fallback?: ReactNode;
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthProps = {}
): React.FC<P> {
  const { requireAuth = true, fallback = null } = options;
  
  return function WrappedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      );
    }
    
    if (requireAuth && !isAuthenticated) {
      return <>{fallback}</>;
    }
    
    return <Component {...props} />;
  };
}
