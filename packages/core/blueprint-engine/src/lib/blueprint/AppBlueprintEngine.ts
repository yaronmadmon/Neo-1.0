import type { AppBlueprint, EntityDef, FieldDef, ProcessedIntent } from '../../types.js';
import type { IndustryFieldSpec, IndustryEntitySpec } from '../../kits/industries/types.js';
import { RequirementsEngine } from '../discovery/RequirementsEngine.js';
import { ProfessionExpander } from './ProfessionExpander.js';
import { PageGenerator } from '../materializer/PageGenerator.js';
import { WorkflowEngine } from '../workflows/WorkflowEngine.js';

export class AppBlueprintEngine {
  private requirements = new RequirementsEngine();
  private expander = new ProfessionExpander();
  private pageGenerator = new PageGenerator();
  private workflowEngine = new WorkflowEngine();

  generate(intent: ProcessedIntent): AppBlueprint {
    const requirements = this.requirements.analyze({
      text: intent.rawInput || intent.extractedDetails?.appName || 'Business App',
      answers: intent.discoveredInfo,
    });

    const expansion = this.expander.expand(requirements.kit, requirements.professionId);
    const modules = this.mergeModules(requirements.selectedModules, expansion.extraModules);
    const entities = this.buildEntities(requirements.kit.entities);
    this.addBundleEntities(entities, modules);
    const pages = this.pageGenerator.generatePages({
      appName: requirements.kit.name,
      kit: requirements.kit,
      entities,
      modules,
      requiredPageTitles: expansion.extraPages,
    });
    pages.forEach((page, index) => {
      page.navigation = {
        showInSidebar: page.navigation?.showInSidebar ?? true,
        showInNavbar: page.navigation?.showInNavbar,
        parentPageId: page.navigation?.parentPageId,
        order: index,
      };
    });
    const workflows = this.workflowEngine.build({ entities, kit: requirements.kit, modules });

    const appName = intent.extractedDetails?.appName || `${requirements.kit.name} App`;

    return {
      id: this.slugify(appName),
      version: 1,
      name: appName,
      description: requirements.kit.name + ' industry app',
      behavior: requirements.kit.id,
      entities,
      pages,
      workflows,
      navigation: {
        rules: pages.map((page) => ({
          id: `nav-${page.id}`,
          from: '*',
          to: page.id,
          trigger: 'link',
        })),
        defaultPage: pages[0]?.id || 'dashboard',
        sidebar: {
          enabled: true,
          position: 'left',
          collapsible: true,
          items: pages
            .filter((page) => page.navigation?.showInSidebar !== false)
            .map((page, index) => ({
              pageId: page.id,
              label: page.name,
              icon: page.icon,
              badge: undefined,
              order: index,
            })),
        },
      },
      theme: {
        primaryColor: requirements.kit.uiStyle === 'bold' ? '#0f172a' : '#8b5cf6',
        secondaryColor: '#4f46e5',
        accentColor: '#f97316',
        mode: 'light',
        borderRadius: 'medium',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      settings: {
        locale: 'en',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm',
        currency: 'USD',
      },
    };
  }

  private buildEntities(entities: IndustryEntitySpec[]): EntityDef[] {
    return entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      pluralName: entity.pluralName,
      fields: entity.fields.map((field) => this.toFieldDef(field)),
      displayConfig: this.buildDisplayConfig(entity.fields),
      timestamps: { createdAt: true, updatedAt: true },
    }));
  }

  private toFieldDef(field: IndustryFieldSpec): FieldDef {
    return {
      id: field.id,
      name: field.name,
      type: field.type,
      required: field.required ?? false,
      description: field.description,
      enumOptions: field.enumOptions,
      displayOptions: field.displayOptions,
      reference: field.reference
        ? {
            targetEntity: field.reference.targetEntity,
            displayField: field.reference.displayField,
            relationship: 'many-to-many',
          }
        : undefined,
    };
  }

  private buildDisplayConfig(fields: IndustryFieldSpec[]): EntityDef['displayConfig'] {
    const titleField = fields.find((f) => f.id === 'name' || f.id === 'jobTitle' || f.id === 'projectName')?.id || fields[0]?.id || 'name';
    const subtitleField = fields.find((f) => f.id === 'status')?.id;
    return {
      titleField,
      subtitleField,
      listFields: fields.slice(0, 4).map((f) => f.id),
      searchFields: fields.slice(0, 3).map((f) => f.id),
    };
  }

  private addBundleEntities(entities: EntityDef[], modules: string[]): void {
    const existing = new Set(entities.map((entity) => entity.id));
    const templates: Record<string, EntityDef> = {
      gallery: this.createGenericEntity('gallery', 'Gallery Item', 'Gallery'),
      document: this.createGenericEntity('document', 'Document', 'Documents'),
      payment: this.createPaymentEntity(),
      notification: this.createGenericEntity('notification', 'Notification', 'Notifications'),
      role: this.createGenericEntity('role', 'Role', 'Roles'),
    };

    for (const moduleId of modules) {
      const bundle = modules.includes(moduleId) ? moduleId : null;
      if (bundle === 'gallery' && !existing.has('gallery')) {
        entities.push(templates.gallery);
        existing.add('gallery');
      }
      if (bundle === 'documents' && !existing.has('document')) {
        entities.push(templates.document);
        existing.add('document');
      }
      if (bundle === 'payments' && !existing.has('payment')) {
        entities.push(templates.payment);
        existing.add('payment');
      }
      if (bundle === 'notifications' && !existing.has('notification')) {
        entities.push(templates.notification);
        existing.add('notification');
      }
      if (bundle === 'permissions' && !existing.has('role')) {
        entities.push(templates.role);
        existing.add('role');
      }
    }
  }

  private createGenericEntity(id: string, name: string, pluralName: string): EntityDef {
    return {
      id,
      name,
      pluralName,
      fields: [
        { id: 'name', name: 'Name', type: 'string', required: true },
        { id: 'description', name: 'Description', type: 'richtext', required: false },
        {
          id: 'status',
          name: 'Status',
          type: 'enum',
          enumOptions: [
            { value: 'active', label: 'Active' },
            { value: 'archived', label: 'Archived' },
          ],
          required: false,
        },
      ],
      displayConfig: {
        titleField: 'name',
        subtitleField: 'status',
        listFields: ['name', 'status'],
        searchFields: ['name'],
      },
      timestamps: { createdAt: true, updatedAt: true },
    };
  }

  private createPaymentEntity(): EntityDef {
    return {
      id: 'payment',
      name: 'Payment',
      pluralName: 'Payments',
      fields: [
        { id: 'paymentNumber', name: 'Payment Number', type: 'string', required: true },
        { id: 'amount', name: 'Amount', type: 'currency', required: true },
        { id: 'paymentDate', name: 'Payment Date', type: 'date', required: false },
        {
          id: 'status',
          name: 'Status',
          type: 'enum',
          enumOptions: [
            { value: 'pending', label: 'Pending' },
            { value: 'completed', label: 'Completed' },
            { value: 'failed', label: 'Failed' },
          ],
          required: false,
        },
      ],
      displayConfig: {
        titleField: 'paymentNumber',
        subtitleField: 'status',
        listFields: ['paymentNumber', 'amount', 'status'],
        searchFields: ['paymentNumber'],
      },
      timestamps: { createdAt: true, updatedAt: true },
    };
  }

  private mergeModules(base: string[], extras: string[]): string[] {
    const set = new Set<string>(base);
    for (const moduleId of extras) set.add(moduleId);
    set.add('dashboard');
    set.add('settings');
    return Array.from(set);
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
