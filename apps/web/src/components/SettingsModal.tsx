/**
 * Settings Modal
 * User settings with Profile, Billing, and Apps tabs using shadcn components
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedApps?: Array<{ id: string; name: string; description?: string; createdAt?: string }>;
  onDeleteApp?: (appId: string) => void;
}

type TabId = 'profile' | 'billing' | 'apps';

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  appLimit: number | null;
  features: Record<string, unknown>;
}

export function SettingsModal({ isOpen, onClose, savedApps = [], onDeleteApp }: SettingsModalProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('apps');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Set default tab based on auth status
  useEffect(() => {
    if (isOpen) {
      setActiveTab(isAuthenticated ? 'profile' : 'apps');
    }
  }, [isOpen, isAuthenticated]);

  // Fetch plans when billing tab is active
  useEffect(() => {
    if (activeTab === 'billing' && plans.length === 0) {
      fetchPlans();
    }
  }, [activeTab]);

  const fetchPlans = async () => {
    setIsLoadingPlans(true);
    try {
      const response = await fetch('/billing/plans');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPlans(data.plans);
        }
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setIsCheckingOut(true);
    try {
      const response = await fetch('/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId, interval: billingInterval }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.url) {
          window.location.href = data.url;
        }
      }
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/billing/portal', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.url) {
          window.location.href = data.url;
        }
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  // Different tabs for guests vs authenticated users
  const guestTabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'apps',
      label: 'Apps',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: 'billing',
      label: 'Plans',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
  ];

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      id: 'apps',
      label: 'Apps',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
  ];

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(0);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        );
      case 'github':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-1">
            {(isAuthenticated ? tabs : guestTabs).map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                {tab.icon}
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Profile Tab - Only for authenticated users */}
          {activeTab === 'profile' && isAuthenticated && user && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                      {user.name?.[0] || user.email[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold">{user.name || 'User'}</h3>
                  <p className="text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    {getProviderIcon(user.authProvider)}
                    <span>Signed in with {user.authProvider === 'google' ? 'Google' : user.authProvider === 'github' ? 'GitHub' : 'Email'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-medium mb-2">Account</h4>
                <p className="text-sm text-muted-foreground">
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Current Plan */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Plan</p>
                      <h3 className="text-2xl font-bold">
                        {isAuthenticated && user?.subscription ? user.subscription.planName : 'Free (Guest)'}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Apps Saved</p>
                      <p className="text-lg font-semibold">
                        {isAuthenticated && user?.subscription 
                          ? `${user.subscription.appsUsed || 0} / ${user.subscription.appLimit || 3}`
                          : `${savedApps.length} (local)`
                        }
                      </p>
                    </div>
                  </div>
                  {!isAuthenticated && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Sign in to sync your apps to the cloud and access premium features.
                    </p>
                  )}
                  {isAuthenticated && user?.subscription?.planId !== 'free' && (
                    <Button
                      onClick={handleManageBilling}
                      variant="link"
                      className="mt-4 p-0 h-auto"
                    >
                      Manage billing →
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Interval Toggle */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  onClick={() => setBillingInterval('monthly')}
                  variant={billingInterval === 'monthly' ? 'default' : 'ghost'}
                  size="sm"
                >
                  Monthly
                </Button>
                <Button
                  onClick={() => setBillingInterval('yearly')}
                  variant={billingInterval === 'yearly' ? 'default' : 'ghost'}
                  size="sm"
                >
                  Yearly (Save 17%)
                </Button>
              </div>

              {/* Plans */}
              {isLoadingPlans ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  {plans.map((plan) => {
                    const isCurrentPlan = user?.subscription?.planId === plan.id;
                    const price = billingInterval === 'monthly' ? plan.priceMonthly : plan.priceYearly;
                    const period = billingInterval === 'monthly' ? '/mo' : '/yr';
                    
                    return (
                      <Card
                        key={plan.id}
                        className={isCurrentPlan ? 'border-primary' : ''}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{plan.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">
                            ${formatPrice(price)}<span className="text-sm font-normal text-muted-foreground">{period}</span>
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {plan.appLimit ? `${plan.appLimit} apps` : 'Unlimited apps'}
                          </p>
                          {isCurrentPlan ? (
                            <div className="mt-4 text-center text-sm text-primary font-medium">
                              Current Plan
                            </div>
                          ) : plan.id === 'free' ? (
                            <div className="mt-4" />
                          ) : !isAuthenticated ? (
                            <p className="mt-4 text-center text-xs text-muted-foreground">
                              Sign in to upgrade
                            </p>
                          ) : (
                            <Button
                              onClick={() => handleUpgrade(plan.id)}
                              disabled={isCheckingOut}
                              className="mt-4 w-full"
                              size="sm"
                            >
                              {isCheckingOut ? 'Loading...' : 'Upgrade'}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Apps Tab */}
          {activeTab === 'apps' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Your Apps</h3>
                <span className="text-sm text-muted-foreground">
                  {savedApps.length} app{savedApps.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {savedApps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No apps yet. Create your first app to get started!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedApps.map((app) => (
                    <Card key={app.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{app.name}</h4>
                          {app.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-md">{app.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => {
                              window.history.pushState({}, '', `/preview/${app.id}`);
                              window.dispatchEvent(new CustomEvent('navigate', { detail: { path: `/preview/${app.id}` } }));
                              onClose();
                            }}
                            variant="ghost"
                            size="icon"
                            title="Open"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Button>
                          {onDeleteApp && (
                            <Button
                              onClick={() => onDeleteApp(app.id)}
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border flex justify-between items-center">
          {isAuthenticated ? (
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-destructive hover:text-destructive"
              size="sm"
            >
              Sign out
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Apps are stored locally in your browser
            </p>
          )}
          <Button onClick={onClose} variant="secondary" size="sm">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
