import type { EntityDef, PageDef, PageType } from '../../types.js';
import type { IndustryKit } from '../../kits/industries/types.js';
import { LayoutEngine } from '../ui/LayoutEngine.js';
import { BEHAVIOR_BUNDLES } from '../../behaviors/index.js';

export interface PageGeneratorInput {
  appName: string;
  kit: IndustryKit;
  entities: EntityDef[];
  modules: string[];
  requiredPageTitles?: string[];
}

export class PageGenerator {
  private layoutEngine = new LayoutEngine();

  generatePages(input: PageGeneratorInput): PageDef[] {
    const pages: PageDef[] = [];
    const usedIds = new Set<string>();
    const importantEntities = new Set(['job', 'client', 'invoice', 'quote', 'order', 'project']);
    const maxPages = 16;
    const requiredIds = new Set<string>();

    const addPage = (page: PageDef, force = false) => {
      if (usedIds.has(page.id)) return;
      usedIds.add(page.id);
      if (force || pages.length < maxPages) {
        pages.push(page);
      }
    };

    // Dashboard first
    addPage(this.createPage('dashboard', `${input.kit.name} Dashboard`, 'dashboard'));

    // Behavior bundle pages
    for (const moduleId of input.modules) {
      const bundle = BEHAVIOR_BUNDLES[moduleId];
      if (!bundle) continue;

      bundle.pageTitles.forEach((title, index) => {
        const kind = (bundle.pageKinds[index] || bundle.pageKinds[0]) as PageType;
        const entity = this.resolveEntityForTitle(title, input.entities, bundle.entities);
        addPage(this.createPage(title, title, kind, entity?.id));

        if (kind === 'list' && entity && importantEntities.has(entity.id)) {
          addPage(this.createPage(`${title} Details`, `${title} Details`, 'detail', entity.id, false));
          addPage(this.createPage(`Add ${entity.name}`, `Add ${entity.name}`, 'form', entity.id, false));
        }
      });
    }

    // Required page titles from profession expander
    if (input.requiredPageTitles?.length) {
      for (const title of input.requiredPageTitles) {
        const entity = this.resolveEntityForTitle(title, input.entities);
        const kind = this.guessPageType(title);
        const page = this.createPage(title, title, kind, entity?.id);
        requiredIds.add(page.id);
        addPage(page, true);
      }
    }

    // Settings page fallback
    const settingsPage = this.createPage('Settings', 'Settings', 'custom');
    requiredIds.add(settingsPage.id);
    addPage(settingsPage, true);

    if (pages.length > maxPages) {
      const requiredPages = pages.filter((page) => requiredIds.has(page.id));
      const optionalPages = pages.filter((page) => !requiredIds.has(page.id));
      return [...requiredPages, ...optionalPages].slice(0, maxPages);
    }

    return pages;
  }

  private createPage(idSeed: string, name: string, type: PageType, entityId?: string, showInSidebar = true): PageDef {
    const id = this.slugify(idSeed);
    const layout = this.layoutEngine.layoutForPage(type);
    const components = this.buildComponentsForPage(type, entityId, name);

    return {
      id,
      name,
      route: `/${id}`,
      type,
      entity: entityId,
      layout,
      components,
      navigation: {
        showInSidebar,
        order: 0,
      },
      autoLayout: {
        showHeader: true,
        showSidebar: true,
        showFooter: false,
      },
    };
  }

  private buildComponentsForPage(type: PageType, entityId?: string, title?: string): PageDef['components'] {
    if (type === 'custom' || type === 'timeline' || type === 'grid') {
      return [
        {
          id: `${entityId || 'page'}-title`,
          type: 'text',
          props: { text: title || 'Page', variant: 'h1' },
        },
        {
          id: `${entityId || 'page'}-list`,
          type: 'list',
          props: { source: entityId || 'items' },
        },
      ];
    }

    return [];
  }

  private resolveEntityForTitle(title: string, entities: EntityDef[], preferred?: string[]): EntityDef | undefined {
    const lower = title.toLowerCase();
    if (preferred?.length) {
      const match = entities.find((entity) => preferred.includes(entity.id));
      if (match) return match;
    }

    const overrides: Record<string, string> = {
      technicians: 'staff',
      staff: 'staff',
      schedule: 'appointment',
      calendar: 'appointment',
      messaging: 'message',
      messages: 'message',
      materials: 'material',
      inventory: 'material',
      invoices: 'invoice',
      quotes: 'quote',
      jobs: 'job',
      job: 'job',
      pipeline: 'job',
      timeline: 'job',
      payments: 'payment',
      documents: 'document',
      gallery: 'gallery',
    };

    for (const [keyword, entityId] of Object.entries(overrides)) {
      if (lower.includes(keyword)) {
        const match = entities.find((entity) => entity.id === entityId);
        if (match) return match;
      }
    }

    return entities.find((entity) => {
      return lower.includes(entity.name.toLowerCase()) || lower.includes(entity.pluralName.toLowerCase());
    });
  }

  private guessPageType(title: string): PageType {
    const lower = title.toLowerCase();
    if (lower.includes('dashboard')) return 'dashboard';
    if (lower.includes('calendar') || lower.includes('schedule')) return 'calendar';
    if (lower.includes('pipeline') || lower.includes('kanban')) return 'kanban';
    if (lower.includes('timeline')) return 'timeline';
    if (lower.includes('gallery')) return 'grid';
    if (lower.includes('settings')) return 'custom';
    return 'list';
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
