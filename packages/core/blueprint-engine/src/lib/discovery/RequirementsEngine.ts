/**
 * Requirements Engine
 * Interprets user input + answers into a structured requirements package
 */

import type { IndustryKit, IndustryKitId } from '../../kits/industries/types.js';
import { getIndustryKit, listIndustryKits } from '../../kits/industries/index.js';

export interface RequirementsInput {
  text: string;
  answers?: Record<string, unknown>;
}

export interface RequirementsPackage {
  industryId: IndustryKitId;
  professionId?: string;
  businessArchetype: 'solo' | 'team' | 'company';
  requiredFeatures: string[];
  recommendedEntities: string[];
  recommendedPages: string[];
  requiredWorkflows: string[];
  automationNeeds: string[];
  uiStyle: {
    density: 'compact' | 'comfortable';
    theme: 'light' | 'neutral' | 'bold';
    dashboardType: 'operations' | 'sales' | 'service' | 'health';
  };
  userRole: 'owner' | 'manager' | 'staff';
  expectedComplexity: 'low' | 'medium' | 'high';
  optionalModules: string[];
  selectedModules: string[];
  kit: IndustryKit;
}

const ROLE_HINTS: Record<string, RequirementsPackage['userRole']> = {
  owner: 'owner',
  manager: 'manager',
  staff: 'staff',
  technician: 'staff',
};

const ARCHETYPE_HINTS: Array<[RegExp, RequirementsPackage['businessArchetype']]> = [
  [/team|crew|staff|employees|multi-user/i, 'team'],
  [/company|enterprise|office/i, 'company'],
];

export class RequirementsEngine {
  analyze(input: RequirementsInput): RequirementsPackage {
    const text = input.text.trim();
    const answers = input.answers || {};
    const kit = this.resolveKit(text, answers);

    const professionId = this.resolveProfession(text, kit);
    const businessArchetype = this.resolveArchetype(text, answers);
    const userRole = this.resolveRole(text, answers);
    const requiredFeatures = this.resolveRequiredFeatures(text, kit);
    const selectedModules = this.resolveModules(requiredFeatures, kit);

    return {
      industryId: kit.id,
      professionId,
      businessArchetype,
      requiredFeatures,
      recommendedEntities: kit.entities.map((e) => e.id),
      recommendedPages: kit.pageTypes,
      requiredWorkflows: kit.workflows,
      automationNeeds: kit.automationRules,
      uiStyle: {
        density: businessArchetype === 'company' ? 'compact' : 'comfortable',
        theme: kit.uiStyle,
        dashboardType: kit.dashboardType,
      },
      userRole,
      expectedComplexity: kit.complexity,
      optionalModules: kit.optionalModules,
      selectedModules,
      kit,
    };
  }

  private resolveKit(text: string, answers: Record<string, unknown>): IndustryKit {
    const lower = text.toLowerCase();
    const kits = listIndustryKits();
    let best: { kit: IndustryKit; score: number } | null = null;

    for (const kit of kits) {
      let score = 0;
      for (const keyword of kit.keywords) {
        if (lower.includes(keyword)) score += 2;
      }
      if (kit.professions.some((p) => lower.includes(p.toLowerCase()))) {
        score += 3;
      }
      if (answers.industry && String(answers.industry).toLowerCase() === kit.id) {
        score += 4;
      }
      if (!best || score > best.score) {
        best = { kit, score };
      }
    }

    return best?.kit || getIndustryKit('services');
  }

  private resolveProfession(text: string, kit: IndustryKit): string | undefined {
    const lower = text.toLowerCase();
    const match = kit.professions.find((p) => lower.includes(p.toLowerCase()));
    return match ? match.toLowerCase().replace(/\s+/g, '-') : undefined;
  }

  private resolveArchetype(text: string, answers: Record<string, unknown>): RequirementsPackage['businessArchetype'] {
    const answer = String(answers.businessType || '');
    if (answer) {
      if (/team|crew|small/i.test(answer)) return 'team';
      if (/company|enterprise/i.test(answer)) return 'company';
    }

    for (const [regex, archetype] of ARCHETYPE_HINTS) {
      if (regex.test(text)) return archetype;
    }

    return 'solo';
  }

  private resolveRole(text: string, answers: Record<string, unknown>): RequirementsPackage['userRole'] {
    const answer = String(answers.role || '');
    if (answer && ROLE_HINTS[answer.toLowerCase()]) {
      return ROLE_HINTS[answer.toLowerCase()];
    }
    for (const [hint, role] of Object.entries(ROLE_HINTS)) {
      if (text.toLowerCase().includes(hint)) return role;
    }
    return 'owner';
  }

  private resolveRequiredFeatures(text: string, kit: IndustryKit): string[] {
    const lower = text.toLowerCase();
    const features = new Set<string>(kit.requiredModules);

    if (/schedule|calendar|appointment/i.test(lower)) features.add('scheduling');
    if (/invoice|payment|billing/i.test(lower)) features.add('invoices');
    if (/quote|estimate/i.test(lower)) features.add('quotes');
    if (/inventory|materials|stock/i.test(lower)) features.add('inventory');
    if (/message|chat|sms|email/i.test(lower)) features.add('messaging');
    if (/team|technician|staff/i.test(lower)) features.add('staff');
    if (/order|reservation|table/i.test(lower)) features.add('orders');

    return Array.from(features);
  }

  private resolveModules(required: string[], kit: IndustryKit): string[] {
    const modules = new Set<string>([...kit.requiredModules, ...required]);
    for (const optional of kit.optionalModules) {
      if (!modules.has(optional) && required.length < 8) {
        modules.add(optional);
      }
    }
    return Array.from(modules);
  }
}
