/**
 * Dynamic App Sidebar
 * A sidebar component that accepts dynamic navigation items from the app schema
 * Based on shadcn sidebar-07 but with configurable props
 */

import * as React from 'react';
import {
  BarChartIcon,
  CalendarIcon,
  ClipboardListIcon,
  FolderIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

// Icon map for dynamic icons from schema
const ICON_MAP: Record<string, LucideIcon> = {
  '📊': LayoutDashboardIcon,
  '📋': ListIcon,
  '📅': CalendarIcon,
  '📈': BarChartIcon,
  '👤': UsersIcon,
  '👥': UsersIcon,
  '📦': FolderIcon,
  '✅': ClipboardListIcon,
  '➕': PlusIcon,
  // Default icons by page type
  'dashboard': LayoutDashboardIcon,
  'list': ListIcon,
  'calendar': CalendarIcon,
  'chart': BarChartIcon,
  'users': UsersIcon,
  'form': ClipboardListIcon,
  'default': FolderIcon,
};

export interface NavItem {
  pageId: string;
  icon?: string;
  label: string;
  route: string;
  type?: string;
}

export interface DynamicAppSidebarProps {
  /** App name shown in header */
  appName: string;
  /** App icon (emoji or component) */
  appIcon?: React.ReactNode;
  /** Primary navigation items */
  navItems: NavItem[];
  /** Secondary/utility navigation items */
  secondaryItems?: NavItem[];
  /** User info for footer */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  /** Currently active page ID */
  activePageId?: string;
  /** Callback when navigation item is clicked */
  onNavigate?: (pageId: string, route: string) => void;
  /** Sidebar collapsed by default */
  defaultCollapsed?: boolean;
  /** Children (main content) */
  children?: React.ReactNode;
}

/**
 * Get icon component from string (emoji or icon name)
 */
function getIconComponent(icon?: string, type?: string): LucideIcon {
  if (icon && ICON_MAP[icon]) {
    return ICON_MAP[icon];
  }
  if (type && ICON_MAP[type]) {
    return ICON_MAP[type];
  }
  return ICON_MAP['default'];
}

/**
 * Dynamic App Sidebar Component
 */
export function DynamicAppSidebar({
  appName,
  appIcon,
  navItems,
  secondaryItems,
  user,
  activePageId,
  onNavigate,
  defaultCollapsed = false,
  children,
}: DynamicAppSidebarProps) {
  // Convert nav items to format expected by NavMain
  const mainNavItems = React.useMemo(() => {
    return navItems.map(item => ({
      title: item.label,
      url: item.route,
      icon: getIconComponent(item.icon, item.type),
      isActive: item.pageId === activePageId,
    }));
  }, [navItems, activePageId]);

  // Secondary navigation (settings, help, etc.)
  const secondaryNavItems = React.useMemo(() => {
    const defaults = [
      { title: 'Settings', url: '#settings', icon: SettingsIcon },
      { title: 'Help', url: '#help', icon: HelpCircleIcon },
      { title: 'Search', url: '#search', icon: SearchIcon },
    ];
    
    if (!secondaryItems?.length) {
      return defaults;
    }
    
    return secondaryItems.map(item => ({
      title: item.label,
      url: item.route,
      icon: getIconComponent(item.icon, item.type),
    }));
  }, [secondaryItems]);

  // Default user if not provided
  const displayUser = user || {
    name: 'User',
    email: 'user@example.com',
  };

  return (
    <SidebarProvider defaultOpen={!defaultCollapsed}>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:!p-1.5"
              >
                <a href="/" className="flex items-center gap-2">
                  {appIcon || <LayoutDashboardIcon className="h-5 w-5" />}
                  <span className="text-base font-semibold truncate">{appName}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        
        <SidebarContent>
          <NavMain items={mainNavItems} />
          <NavSecondary items={secondaryNavItems} className="mt-auto" />
        </SidebarContent>
        
        <SidebarFooter>
          <NavUser user={displayUser} />
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset>
        {/* Header with sidebar trigger */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1" />
        </header>
        
        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

/**
 * Simplified App Shell - just the sidebar without provider
 * Use this when you want to manage the provider yourself
 */
export function AppShellSidebar({
  appName,
  appIcon,
  navItems,
  secondaryItems,
  user,
  activePageId,
  onNavigate,
}: Omit<DynamicAppSidebarProps, 'children' | 'defaultCollapsed'>) {
  // Convert nav items to format expected by NavMain
  const mainNavItems = React.useMemo(() => {
    return navItems.map(item => ({
      title: item.label,
      url: item.route,
      icon: getIconComponent(item.icon, item.type),
      isActive: item.pageId === activePageId,
    }));
  }, [navItems, activePageId]);

  // Secondary navigation
  const secondaryNavItems = React.useMemo(() => {
    const defaults = [
      { title: 'Settings', url: '#settings', icon: SettingsIcon },
      { title: 'Help', url: '#help', icon: HelpCircleIcon },
    ];
    
    if (!secondaryItems?.length) {
      return defaults;
    }
    
    return secondaryItems.map(item => ({
      title: item.label,
      url: item.route,
      icon: getIconComponent(item.icon, item.type),
    }));
  }, [secondaryItems]);

  const displayUser = user || { name: 'User', email: 'user@example.com' };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/" className="flex items-center gap-2">
                {appIcon || <LayoutDashboardIcon className="h-5 w-5" />}
                <span className="text-base font-semibold truncate">{appName}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <NavMain items={mainNavItems} />
        <NavSecondary items={secondaryNavItems} className="mt-auto" />
      </SidebarContent>
      
      <SidebarFooter>
        <NavUser user={displayUser} />
      </SidebarFooter>
    </Sidebar>
  );
}

export default DynamicAppSidebar;
