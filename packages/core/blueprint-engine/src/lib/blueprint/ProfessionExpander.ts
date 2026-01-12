import type { IndustryKit } from '../../kits/industries/types.js';

export interface ProfessionExpansion {
  extraModules: string[];
  extraPages: string[];
  extraEntities: string[];
  notes?: string[];
}

export class ProfessionExpander {
  expand(kit: IndustryKit, professionId?: string): ProfessionExpansion {
    const id = (professionId || '').toLowerCase();

    if (kit.id === 'plumber' || id.includes('plumber')) {
      return {
        extraModules: ['gallery', 'job-pipeline', 'quotes', 'invoices', 'inventory', 'staff', 'messaging', 'calendar', 'tasks'],
        extraPages: [
          'Jobs',
          'Clients',
          'Invoices',
          'Quotes',
          'Materials',
          'Schedule',
          'Gallery',
          'Messaging',
          'Dashboard',
          'Job Timeline',
          'Technicians',
          'Settings',
        ],
        extraEntities: ['job', 'client', 'invoice', 'quote', 'material', 'appointment', 'message', 'staff'],
        notes: ['Add emergency flag and warranty tracking to job data'],
      };
    }

    if (kit.id === 'contractor' || id.includes('contractor')) {
      return {
        extraModules: ['job-pipeline', 'documents', 'quotes', 'invoices', 'tasks', 'staff'],
        extraPages: ['Projects', 'Clients', 'Quotes', 'Invoices', 'Schedule', 'Tasks', 'Staff', 'Settings'],
        extraEntities: ['project', 'client', 'quote', 'invoice', 'task', 'staff'],
      };
    }

    if (kit.id === 'electrician' || id.includes('electrician')) {
      return {
        extraModules: ['job-pipeline', 'inventory', 'staff', 'scheduling'],
        extraPages: ['Jobs', 'Clients', 'Schedule', 'Invoices', 'Quotes', 'Materials', 'Staff', 'Settings'],
        extraEntities: ['job', 'client', 'appointment', 'invoice', 'quote', 'material', 'staff'],
      };
    }

    return {
      extraModules: [],
      extraPages: [],
      extraEntities: [],
    };
  }
}
