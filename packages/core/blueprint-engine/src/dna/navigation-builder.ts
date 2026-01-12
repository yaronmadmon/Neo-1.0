/**
 * Navigation Builder
 * 
 * Generates complete navigation structure:
 * - Sidebar configuration with grouping
 * - Navbar configuration
 * - Breadcrumbs
 * - Navigation rules and routing
 * - Menu hierarchy
 */

import type { UnifiedNavigation, UnifiedPage, UnifiedEntity } from './schema.js';
import type { DetectedFeature } from '../intelligence/types.js';

// ============================================================
// TYPES
// ============================================================

export interface NavigationBuildContext {
  pages: UnifiedPage[];
  entities: UnifiedEntity[];
  features?: DetectedFeature[];
  appName?: string;
  industry?: string;
}

interface MenuGroup {
  id: string;
  label?: string;
  order: number;
  collapsible?: boolean;
}

// ============================================================
// NAVIGATION BUILDER
// ============================================================

export class NavigationBuilder {
  private defaultGroups: MenuGroup[] = [
    { id: 'main', order: 0 },
    { id: 'data', label: 'Data', order: 10 },
    { id: 'reports', label: 'Reports', order: 20 },
    { id: 'settings', label: 'Settings', order: 100 },
  ];

  /**
   * Generate complete navigation structure
   */
  build(ctx: NavigationBuildContext): UnifiedNavigation {
    const sidebarGroups = this.buildSidebarGroups(ctx);
    const navbarActions = this.buildNavbarActions(ctx);
    const rules = this.buildNavigationRules(ctx.pages);
    const defaultPage = this.determineDefaultPage(ctx.pages);

    return {
      sidebar: {
        enabled: true,
        position: 'left',
        collapsible: true,
        defaultCollapsed: false,
        width: '256px',
        groups: sidebarGroups,
        footerItems: this.buildFooterItems(ctx),
      },
      navbar: {
        enabled: true,
        showLogo: true,
        showSearch: this.shouldShowSearch(ctx),
        showNotifications: this.shouldShowNotifications(ctx),
        showUserMenu: true,
        actions: navbarActions,
      },
      breadcrumbs: {
        enabled: true,
        showHome: true,
        separator: '/',
      },
      rules,
      defaultPage,
      notFoundPage: '404',
      loginRedirect: 'login',
    };
  }

  // ============================================================
  // SIDEBAR BUILDING
  // ============================================================

  private buildSidebarGroups(ctx: NavigationBuildContext): NonNullable<UnifiedNavigation['sidebar']>['groups'] {
    const groups: NonNullable<UnifiedNavigation['sidebar']>['groups'] = [];
    const pagesByGroup = this.groupPages(ctx.pages, ctx.entities);

    // Main group (dashboard and primary pages)
    const mainPages = pagesByGroup.get('main') || [];
    if (mainPages.length > 0) {
      groups.push({
        id: 'main',
        items: mainPages.map(page => this.pageToMenuItem(page, ctx)),
      });
    }

    // Data/entity pages
    const dataPages = pagesByGroup.get('data') || [];
    if (dataPages.length > 0) {
      groups.push({
        id: 'data',
        label: 'Data',
        collapsible: dataPages.length > 4,
        items: dataPages.map(page => this.pageToMenuItem(page, ctx)),
      });
    }

    // View pages (calendar, kanban, etc.)
    const viewPages = pagesByGroup.get('views') || [];
    if (viewPages.length > 0) {
      groups.push({
        id: 'views',
        label: 'Views',
        collapsible: true,
        items: viewPages.map(page => this.pageToMenuItem(page, ctx)),
      });
    }

    // Reports/analytics pages
    const reportPages = pagesByGroup.get('reports') || [];
    if (reportPages.length > 0) {
      groups.push({
        id: 'reports',
        label: 'Reports',
        collapsible: true,
        items: reportPages.map(page => this.pageToMenuItem(page, ctx)),
      });
    }

    // Settings group
    const settingsPages = pagesByGroup.get('settings') || [];
    if (settingsPages.length > 0) {
      groups.push({
        id: 'settings',
        label: 'Settings',
        collapsible: true,
        items: settingsPages.map(page => this.pageToMenuItem(page, ctx)),
      });
    }

    return groups;
  }

  private groupPages(pages: UnifiedPage[], entities: UnifiedEntity[]): Map<string, UnifiedPage[]> {
    const groups = new Map<string, UnifiedPage[]>();

    for (const page of pages) {
      // Skip hidden pages
      if (page.navigation?.showInSidebar === false) continue;

      // Use explicit group if set
      if (page.navigation?.group) {
        this.addToGroup(groups, page.navigation.group, page);
        continue;
      }

      // Determine group based on page type
      const group = this.inferPageGroup(page, entities);
      this.addToGroup(groups, group, page);
    }

    // Sort pages within groups by order
    for (const [key, pageList] of groups) {
      pageList.sort((a, b) => (a.navigation?.order ?? 99) - (b.navigation?.order ?? 99));
    }

    return groups;
  }

  private inferPageGroup(page: UnifiedPage, entities: UnifiedEntity[]): string {
    // Dashboard is always main
    if (page.type === 'dashboard' || page.id === 'dashboard') {
      return 'main';
    }

    // Settings and profile pages
    if (page.type === 'settings' || page.type === 'profile' || page.id.includes('settings')) {
      return 'settings';
    }

    // Report and chart pages
    if (page.type === 'report' || page.type === 'chart' || page.id.includes('report')) {
      return 'reports';
    }

    // Calendar, kanban, timeline are view pages
    if (['calendar', 'kanban', 'timeline', 'gallery'].includes(page.type)) {
      return 'views';
    }

    // List pages for entities go in data
    if (page.type === 'list' && page.entity) {
      // If it's the first/primary entity, put in main
      if (entities[0]?.id === page.entity) {
        return 'main';
      }
      return 'data';
    }

    return 'main';
  }

  private addToGroup(groups: Map<string, UnifiedPage[]>, groupId: string, page: UnifiedPage): void {
    if (!groups.has(groupId)) {
      groups.set(groupId, []);
    }
    groups.get(groupId)!.push(page);
  }

  private pageToMenuItem(
    page: UnifiedPage, 
    ctx: NavigationBuildContext
  ): NonNullable<UnifiedNavigation['sidebar']>['groups'][number]['items'][number] {
    const entity = page.entity ? ctx.entities.find(e => e.id === page.entity) : undefined;
    
    // Build children for nested navigation (e.g., entity list -> calendar, kanban views)
    const children = this.buildChildMenuItems(page, ctx);

    return {
      pageId: page.id,
      label: page.name,
      icon: page.icon || entity?.icon || this.getDefaultIcon(page.type),
      badge: page.navigation?.badge,
      ...(children.length > 0 ? { children } : {}),
    };
  }

  private buildChildMenuItems(
    parentPage: UnifiedPage, 
    ctx: NavigationBuildContext
  ): Array<{ pageId: string; label: string; icon?: string }> {
    const children: Array<{ pageId: string; label: string; icon?: string }> = [];

    // If this is a list page, find related view pages
    if (parentPage.type === 'list' && parentPage.entity) {
      const relatedViews = ctx.pages.filter(p => 
        p.entity === parentPage.entity && 
        ['calendar', 'kanban', 'gallery'].includes(p.type) &&
        p.navigation?.parentPageId === parentPage.id
      );

      for (const view of relatedViews) {
        children.push({
          pageId: view.id,
          label: view.name,
          icon: this.getDefaultIcon(view.type),
        });
      }
    }

    return children;
  }

  private buildFooterItems(ctx: NavigationBuildContext): NonNullable<UnifiedNavigation['sidebar']>['footerItems'] {
    const items: NonNullable<NonNullable<UnifiedNavigation['sidebar']>['footerItems']> = [];

    // Settings link if not already in sidebar
    const hasSettings = ctx.pages.some(p => p.type === 'settings');
    if (hasSettings) {
      items.push({
        pageId: 'settings',
        label: 'Settings',
        icon: '⚙️',
      });
    }

    // Help link
    items.push({
      action: 'open-help',
      label: 'Help',
      icon: '❓',
    });

    // Logout
    items.push({
      action: 'logout',
      label: 'Log Out',
      icon: '🚪',
    });

    return items;
  }

  // ============================================================
  // NAVBAR BUILDING
  // ============================================================

  private buildNavbarActions(ctx: NavigationBuildContext): NonNullable<UnifiedNavigation['navbar']>['actions'] {
    const actions: NonNullable<NonNullable<UnifiedNavigation['navbar']>['actions']> = [];

    // Quick add actions for primary entities
    const primaryEntities = ctx.entities.slice(0, 2);
    for (const entity of primaryEntities) {
      actions.push({
        id: `quick-add-${entity.id}`,
        label: `Add ${entity.name}`,
        icon: '+',
        action: `navigate-${entity.id}-form`,
      });
    }

    return actions;
  }

  private shouldShowSearch(ctx: NavigationBuildContext): boolean {
    // Show search if we have searchable entities
    return ctx.entities.some(e => 
      e.display.searchFields && e.display.searchFields.length > 0
    );
  }

  private shouldShowNotifications(ctx: NavigationBuildContext): boolean {
    // Show notifications if the app has notification features
    return ctx.features?.some(f => 
      f.id === 'notifications' || f.id === 'reminders'
    ) ?? false;
  }

  // ============================================================
  // NAVIGATION RULES
  // ============================================================

  private buildNavigationRules(pages: UnifiedPage[]): UnifiedNavigation['rules'] {
    const rules: UnifiedNavigation['rules'] = [];

    for (const page of pages) {
      // Create rule for each page (accessible from anywhere)
      rules.push({
        id: `nav-to-${page.id}`,
        from: '*',
        to: page.id,
        trigger: 'link',
      });

      // Create back navigation for detail/form pages
      if (page.type === 'detail' || page.type === 'form') {
        const listPage = pages.find(p => 
          p.type === 'list' && p.entity === page.entity
        );
        if (listPage) {
          rules.push({
            id: `back-from-${page.id}`,
            from: page.id,
            to: listPage.id,
            trigger: 'button',
          });
        }
      }
    }

    return rules;
  }

  private determineDefaultPage(pages: UnifiedPage[]): string {
    // Priority: dashboard > first list page > first page
    const dashboard = pages.find(p => p.type === 'dashboard' || p.id === 'dashboard');
    if (dashboard) return dashboard.id;

    const firstList = pages.find(p => p.type === 'list');
    if (firstList) return firstList.id;

    return pages[0]?.id || 'home';
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  private getDefaultIcon(pageType: UnifiedPage['type']): string {
    const iconMap: Record<UnifiedPage['type'], string> = {
      'list': '📋',
      'detail': '📄',
      'form': '📝',
      'dashboard': '📊',
      'calendar': '📅',
      'kanban': '📌',
      'table': '📊',
      'gallery': '🖼️',
      'timeline': '📈',
      'map': '🗺️',
      'chart': '📉',
      'report': '📑',
      'wizard': '🧙',
      'settings': '⚙️',
      'profile': '👤',
      'custom': '📄',
    };

    return iconMap[pageType] || '📄';
  }

  /**
   * Generate breadcrumb path for a page
   */
  generateBreadcrumbs(pageId: string, ctx: NavigationBuildContext): Array<{ label: string; pageId?: string }> {
    const page = ctx.pages.find(p => p.id === pageId);
    if (!page) return [];

    const breadcrumbs: Array<{ label: string; pageId?: string }> = [
      { label: 'Home', pageId: 'dashboard' },
    ];

    // Add parent if exists
    if (page.navigation?.parentPageId) {
      const parent = ctx.pages.find(p => p.id === page.navigation?.parentPageId);
      if (parent) {
        breadcrumbs.push({ label: parent.name, pageId: parent.id });
      }
    }

    // Add entity list page for detail/form pages
    if ((page.type === 'detail' || page.type === 'form') && page.entity) {
      const listPage = ctx.pages.find(p => p.type === 'list' && p.entity === page.entity);
      if (listPage && listPage.id !== page.navigation?.parentPageId) {
        breadcrumbs.push({ label: listPage.name, pageId: listPage.id });
      }
    }

    // Add current page (no link)
    breadcrumbs.push({ label: page.name });

    return breadcrumbs;
  }

  /**
   * Determine page hierarchy for nesting
   */
  buildPageHierarchy(pages: UnifiedPage[], entities: UnifiedEntity[]): Map<string, string[]> {
    const hierarchy = new Map<string, string[]>();

    for (const entity of entities) {
      const entityPages = pages.filter(p => p.entity === entity.id);
      const listPage = entityPages.find(p => p.type === 'list');
      
      if (listPage) {
        const children = entityPages
          .filter(p => p.id !== listPage.id && p.navigation?.showInSidebar !== false)
          .map(p => p.id);
        
        if (children.length > 0) {
          hierarchy.set(listPage.id, children);
        }
      }
    }

    return hierarchy;
  }
}
