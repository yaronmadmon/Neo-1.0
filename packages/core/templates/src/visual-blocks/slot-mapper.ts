/**
 * Slot Mapper
 * Maps AppBlueprint data to BlockSlots for visual block rendering
 */

import type { BlockSlots, NavItem, StatCard, ActivityItem, FieldDef } from './types.js';

// ============================================================
// TYPES (Blueprint types - simplified for this module)
// ============================================================

export interface BlueprintPage {
  id: string;
  name: string;
  route: string;
  type?: string;
  icon?: string;
  entity?: string;
  navigation?: {
    showInSidebar?: boolean;
    order?: number;
    group?: string;
  };
}

export interface BlueprintEntity {
  id: string;
  name: string;
  pluralName?: string;
  icon?: string;
  fields?: Array<{
    id: string;
    name: string;
    type: string;
    required?: boolean;
  }>;
}

export interface AppBlueprint {
  id: string;
  name: string;
  description?: string;
  pages: BlueprintPage[];
  entities: BlueprintEntity[];
  workflows?: unknown[];
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

// ============================================================
// SLOT MAPPER
// ============================================================

export class SlotMapper {
  /**
   * Map an AppBlueprint to BlockSlots
   */
  mapBlueprintToSlots(blueprint: AppBlueprint): BlockSlots {
    return {
      // Navigation
      neo_app_name: blueprint.name,
      neo_blueprint_navigation: this.mapNavigation(blueprint.pages),
      
      // Dashboard stats from entities
      dashboard_stats: this.mapDashboardStats(blueprint.entities),
      
      // Recent activity (placeholder - would be populated at runtime)
      recent_activity_title: 'Recent Activity',
      recent_activity_items: [],
      
      // Quick actions from entities
      quick_actions: this.mapQuickActions(blueprint.entities),
      
      // Search config
      search_config: {
        enabled: true,
        placeholder: 'Search...',
      },
    };
  }

  /**
   * Map pages to navigation items
   */
  private mapNavigation(pages: BlueprintPage[]): NavItem[] {
    return pages
      .filter(page => page.navigation?.showInSidebar !== false)
      .sort((a, b) => (a.navigation?.order ?? 99) - (b.navigation?.order ?? 99))
      .map(page => ({
        id: page.id,
        label: page.name,
        icon: page.icon || this.inferIcon(page),
        route: page.route,
      }));
  }

  /**
   * Map entities to dashboard stat cards
   */
  private mapDashboardStats(entities: BlueprintEntity[]): StatCard[] {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    
    return entities.slice(0, 4).map((entity, index) => ({
      id: `stat-${entity.id}`,
      title: entity.pluralName || `${entity.name}s`,
      value: 0, // Will be populated at runtime
      icon: entity.icon || '📊',
      color: colors[index % colors.length],
    }));
  }

  /**
   * Map entities to quick actions
   */
  private mapQuickActions(entities: BlueprintEntity[]): BlockSlots['quick_actions'] {
    return entities.slice(0, 4).map(entity => ({
      id: `add-${entity.id}`,
      label: `Add ${entity.name}`,
      icon: '+',
      action: `navigate:/${entity.id}s/new`,
    }));
  }

  /**
   * Infer icon from page type or name
   */
  private inferIcon(page: BlueprintPage): string {
    const typeIcons: Record<string, string> = {
      'dashboard': '📊',
      'list': '📋',
      'form': '📝',
      'detail': '📄',
      'calendar': '📅',
      'kanban': '📌',
      'settings': '⚙️',
      'table': '📊',
    };

    if (page.type && typeIcons[page.type]) {
      return typeIcons[page.type];
    }

    // Infer from page name
    const nameLower = page.name.toLowerCase();
    if (nameLower.includes('dashboard')) return '📊';
    if (nameLower.includes('calendar')) return '📅';
    if (nameLower.includes('settings')) return '⚙️';
    if (nameLower.includes('report')) return '📈';

    return '📄';
  }

  /**
   * Map entity to list slots
   */
  mapEntityToListSlots(entity: BlueprintEntity): Partial<BlockSlots> {
    return {
      dynamic_list_title: entity.pluralName || `${entity.name}s`,
      dynamic_entity_name: entity.name,
      dynamic_entity_fields: entity.fields?.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        required: f.required,
      })) || [],
    };
  }

  /**
   * Map activity data to slots (for runtime population)
   */
  mapActivityToSlots(activities: Array<{
    id: string;
    title: string;
    description?: string;
    timestamp: string | Date;
    type?: string;
    actorName?: string;
    actorAvatar?: string;
  }>): Partial<BlockSlots> {
    return {
      recent_activity_items: activities.map(activity => ({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        timestamp: activity.timestamp,
        type: (activity.type as ActivityItem['type']) || 'other',
        actor: activity.actorName ? {
          name: activity.actorName,
          avatar: activity.actorAvatar,
        } : undefined,
      })),
    };
  }
}

// ============================================================
// CONVENIENCE FUNCTIONS
// ============================================================

/**
 * Map a blueprint to block slots (convenience function)
 */
export function mapBlueprintToSlots(blueprint: AppBlueprint): BlockSlots {
  const mapper = new SlotMapper();
  return mapper.mapBlueprintToSlots(blueprint);
}

/**
 * Map an entity to list slots (convenience function)
 */
export function mapEntityToListSlots(entity: BlueprintEntity): Partial<BlockSlots> {
  const mapper = new SlotMapper();
  return mapper.mapEntityToListSlots(entity);
}
