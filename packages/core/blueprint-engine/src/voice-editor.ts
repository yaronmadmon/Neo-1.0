/**
 * Voice Editing Layer
 * Enables voice or text commands to modify the AppBlueprint
 * Interprets change requests, updates blueprint, and triggers re-materialization
 */

import { randomUUID } from 'node:crypto';
import type {
  AppBlueprint,
  EntityDef,
  PageDef,
  WorkflowDef,
  FieldDef,
  FieldType,
  ComponentDef,
} from './types.js';
import { BlueprintEngine } from './blueprint-engine.js';
import { detectBehavior, getBehaviorBundle } from './behavior-bundles.js';

// ============================================================
// VOICE COMMAND TYPES
// ============================================================

export interface VoiceCommand {
  rawText: string;
  intent: CommandIntent;
  confidence: number;
  entities: ExtractedEntities;
}

export interface CommandIntent {
  action: 'add' | 'remove' | 'update' | 'change' | 'show' | 'hide' | 'move' | 'rename';
  target: 'page' | 'entity' | 'field' | 'workflow' | 'component' | 'theme' | 'layout';
  modifier?: string;
}

export interface ExtractedEntities {
  pageName?: string;
  pageType?: string;
  entityName?: string;
  fieldName?: string;
  fieldType?: string;
  componentType?: string;
  colorValue?: string;
  positionValue?: string;
  sizeValue?: string;
  values?: string[];
}

export interface EditResult {
  success: boolean;
  changes: Change[];
  newBlueprint: AppBlueprint;
  message: string;
}

export interface Change {
  type: 'added' | 'removed' | 'updated';
  target: string;
  targetType: string;
  description: string;
}

// ============================================================
// COMMAND PATTERNS
// ============================================================

const COMMAND_PATTERNS: Array<{
  patterns: RegExp[];
  intent: CommandIntent;
  extract: (match: RegExpMatchArray, input: string) => ExtractedEntities;
}> = [
  // Add page patterns
  {
    patterns: [
      /add\s+(?:a\s+)?(?:new\s+)?(\w+)\s+page/i,
      /create\s+(?:a\s+)?(?:new\s+)?(\w+)\s+page/i,
      /add\s+(?:a\s+)?page\s+(?:for\s+)?(\w+)/i,
      /add\s+(?:a\s+)?(\w+)\s+view/i,
    ],
    intent: { action: 'add', target: 'page' },
    extract: (match, input) => {
      const pageName = match[1];
      const pageType = detectPageType(input);
      return { pageName, pageType };
    },
  },
  
  // Add entity/table patterns
  {
    patterns: [
      /add\s+(?:a\s+)?(?:new\s+)?(\w+)\s+(?:table|entity|model)/i,
      /create\s+(?:a\s+)?(?:new\s+)?(\w+)\s+(?:table|entity|model)/i,
      /add\s+(?:a\s+)?(\w+)\s+section/i,
    ],
    intent: { action: 'add', target: 'entity' },
    extract: (match, input) => {
      const entityName = match[1];
      const fields = extractFieldsFromInput(input);
      return { entityName, values: fields };
    },
  },
  
  // Add field patterns
  {
    patterns: [
      /add\s+(?:a\s+)?(?:new\s+)?(\w+)\s+field\s+to\s+(\w+)/i,
      /add\s+(\w+)\s+(?:column|field)\s+(?:to|in)\s+(\w+)/i,
      /(\w+)\s+should\s+have\s+(?:a\s+)?(\w+)\s+field/i,
    ],
    intent: { action: 'add', target: 'field' },
    extract: (match, input) => {
      let fieldName: string;
      let entityName: string;
      
      if (match[2]) {
        fieldName = match[1];
        entityName = match[2];
      } else {
        entityName = match[1];
        fieldName = extractFieldNameFromInput(input);
      }
      
      const fieldType = detectFieldType(input, fieldName);
      return { entityName, fieldName, fieldType };
    },
  },
  
  // Change/update field patterns
  {
    patterns: [
      /change\s+(\w+)\s+to\s+show\s+(\w+)/i,
      /update\s+(\w+)\s+to\s+display\s+(\w+)/i,
      /make\s+(\w+)\s+show\s+(\w+)/i,
    ],
    intent: { action: 'update', target: 'field' },
    extract: (match) => ({
      entityName: match[1],
      fieldName: match[2],
    }),
  },
  
  // Remove patterns
  {
    patterns: [
      /remove\s+(?:the\s+)?(\w+)\s+(?:page|table|field)/i,
      /delete\s+(?:the\s+)?(\w+)\s+(?:page|table|field)/i,
    ],
    intent: { action: 'remove', target: 'page' },
    extract: (match, input) => {
      const name = match[1];
      const target = input.toLowerCase().includes('field') ? 'field' : 
                     input.toLowerCase().includes('table') ? 'entity' : 'page';
      return { pageName: name, entityName: name, fieldName: name };
    },
  },
  
  // Rename patterns
  {
    patterns: [
      /rename\s+(\w+)\s+to\s+(\w+)/i,
      /change\s+(\w+)\s+name\s+to\s+(\w+)/i,
    ],
    intent: { action: 'rename', target: 'page' },
    extract: (match) => ({
      pageName: match[1],
      values: [match[2]],
    }),
  },
  
  // Theme patterns
  {
    patterns: [
      /change\s+(?:the\s+)?(?:primary\s+)?color\s+to\s+(\w+)/i,
      /make\s+(?:it\s+)?(\w+)\s+(?:colored|theme)/i,
      /use\s+(\w+)\s+(?:as\s+)?(?:the\s+)?(?:primary\s+)?color/i,
    ],
    intent: { action: 'change', target: 'theme' },
    extract: (match) => ({
      colorValue: match[1],
    }),
  },
  
  // Show/hide patterns
  {
    patterns: [
      /show\s+(?:the\s+)?(\w+)\s+(?:in\s+)?(?:the\s+)?sidebar/i,
      /add\s+(\w+)\s+to\s+(?:the\s+)?sidebar/i,
    ],
    intent: { action: 'show', target: 'page', modifier: 'sidebar' },
    extract: (match) => ({ pageName: match[1] }),
  },
  {
    patterns: [
      /hide\s+(?:the\s+)?(\w+)\s+(?:from\s+)?(?:the\s+)?sidebar/i,
      /remove\s+(\w+)\s+from\s+(?:the\s+)?sidebar/i,
    ],
    intent: { action: 'hide', target: 'page', modifier: 'sidebar' },
    extract: (match) => ({ pageName: match[1] }),
  },
  
  // Add form patterns
  {
    patterns: [
      /add\s+(?:a\s+)?(?:new\s+)?(\w+)\s+form/i,
      /create\s+(?:a\s+)?form\s+for\s+(\w+)/i,
    ],
    intent: { action: 'add', target: 'page', modifier: 'form' },
    extract: (match) => ({
      pageName: match[1],
      pageType: 'form',
    }),
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function detectPageType(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('form') || lower.includes('add') || lower.includes('create') || lower.includes('edit')) return 'form';
  if (lower.includes('list') || lower.includes('all') || lower.includes('view')) return 'list';
  if (lower.includes('detail') || lower.includes('single') || lower.includes('view')) return 'detail';
  if (lower.includes('dashboard') || lower.includes('overview') || lower.includes('summary')) return 'dashboard';
  if (lower.includes('calendar') || lower.includes('schedule')) return 'calendar';
  if (lower.includes('board') || lower.includes('kanban')) return 'kanban';
  if (lower.includes('table') || lower.includes('grid')) return 'table';
  return 'list';
}

function detectFieldType(input: string, fieldName: string): FieldType {
  const lower = input.toLowerCase();
  const name = fieldName.toLowerCase();
  
  // From input hints
  if (lower.includes('date') && lower.includes('time')) return 'datetime';
  if (lower.includes('date')) return 'date';
  if (lower.includes('number') || lower.includes('quantity') || lower.includes('count')) return 'number';
  if (lower.includes('price') || lower.includes('amount') || lower.includes('cost') || lower.includes('money')) return 'currency';
  if (lower.includes('email')) return 'email';
  if (lower.includes('phone')) return 'phone';
  if (lower.includes('url') || lower.includes('link') || lower.includes('website')) return 'url';
  if (lower.includes('image') || lower.includes('photo') || lower.includes('picture')) return 'image';
  if (lower.includes('file') || lower.includes('document') || lower.includes('attachment')) return 'file';
  if (lower.includes('yes/no') || lower.includes('true/false') || lower.includes('checkbox')) return 'boolean';
  if (lower.includes('status') || lower.includes('type') || lower.includes('category')) return 'enum';
  
  // From field name
  if (name.includes('email')) return 'email';
  if (name.includes('phone') || name.includes('mobile')) return 'phone';
  if (name.includes('date') || name.includes('birthday') || name.includes('due')) return 'date';
  if (name.includes('price') || name.includes('amount') || name.includes('cost') || name.includes('total')) return 'currency';
  if (name.includes('quantity') || name.includes('count') || name.includes('number') || name.includes('age')) return 'number';
  if (name.includes('image') || name.includes('photo') || name.includes('picture') || name.includes('avatar')) return 'image';
  if (name.includes('url') || name.includes('link') || name.includes('website')) return 'url';
  if (name.includes('active') || name.includes('enabled') || name.includes('completed') || name.includes('done')) return 'boolean';
  if (name.includes('status') || name.includes('type') || name.includes('category') || name.includes('priority')) return 'enum';
  
  return 'string';
}

function extractFieldsFromInput(input: string): string[] {
  // Extract field names from patterns like "with amount, date, and status"
  const withMatch = input.match(/with\s+(.+?)(?:\s+field|\s*$)/i);
  if (withMatch) {
    return withMatch[1].split(/[,\s+and\s+]+/).map(f => f.trim()).filter(f => f.length > 0);
  }
  
  // Look for "+" separated fields
  const plusMatch = input.match(/\+\s*(\w+)/g);
  if (plusMatch) {
    return plusMatch.map(m => m.replace(/^\+\s*/, ''));
  }
  
  return [];
}

function extractFieldNameFromInput(input: string): string {
  // Extract field name from various patterns
  const patterns = [
    /(\w+)\s+field/i,
    /field\s+(?:called\s+)?(\w+)/i,
    /add\s+(\w+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  
  return 'newField';
}

function colorNameToHex(colorName: string): string {
  const colors: Record<string, string> = {
    'red': '#ef4444',
    'orange': '#f97316',
    'yellow': '#eab308',
    'green': '#22c55e',
    'teal': '#14b8a6',
    'cyan': '#06b6d4',
    'blue': '#3b82f6',
    'indigo': '#6366f1',
    'purple': '#8b5cf6',
    'pink': '#ec4899',
    'rose': '#f43f5e',
    'gray': '#6b7280',
    'slate': '#64748b',
  };
  return colors[colorName.toLowerCase()] || colorName;
}

// ============================================================
// VOICE EDITOR
// ============================================================

export class VoiceEditor {
  private blueprintEngine: BlueprintEngine;

  constructor() {
    this.blueprintEngine = new BlueprintEngine();
  }

  /**
   * Parse a voice/text command into structured format
   */
  parseCommand(input: string): VoiceCommand {
    const normalizedInput = input.trim().toLowerCase();
    
    for (const pattern of COMMAND_PATTERNS) {
      for (const regex of pattern.patterns) {
        const match = normalizedInput.match(regex);
        if (match) {
          return {
            rawText: input,
            intent: pattern.intent,
            confidence: 0.8,
            entities: pattern.extract(match, input),
          };
        }
      }
    }
    
    // Fallback: try to detect intent from keywords
    return this.fallbackParse(input);
  }

  /**
   * Fallback parsing when no pattern matches
   */
  private fallbackParse(input: string): VoiceCommand {
    const lower = input.toLowerCase();
    
    // Detect action
    let action: CommandIntent['action'] = 'add';
    if (lower.includes('remove') || lower.includes('delete')) action = 'remove';
    else if (lower.includes('change') || lower.includes('update') || lower.includes('modify')) action = 'update';
    else if (lower.includes('rename')) action = 'rename';
    else if (lower.includes('show')) action = 'show';
    else if (lower.includes('hide')) action = 'hide';
    
    // Detect target
    let target: CommandIntent['target'] = 'page';
    if (lower.includes('field') || lower.includes('column')) target = 'field';
    else if (lower.includes('table') || lower.includes('entity') || lower.includes('model')) target = 'entity';
    else if (lower.includes('workflow') || lower.includes('flow') || lower.includes('action')) target = 'workflow';
    else if (lower.includes('color') || lower.includes('theme')) target = 'theme';
    else if (lower.includes('layout')) target = 'layout';
    
    // Extract entities using simple word extraction
    const words = input.split(/\s+/);
    const entities: ExtractedEntities = {};
    
    // Find capitalized words as potential names
    const capitalizedWords = words.filter(w => /^[A-Z]/.test(w));
    if (capitalizedWords.length > 0) {
      if (target === 'page') entities.pageName = capitalizedWords[0];
      else if (target === 'entity') entities.entityName = capitalizedWords[0];
      else if (target === 'field') entities.fieldName = capitalizedWords[0];
    }
    
    return {
      rawText: input,
      intent: { action, target },
      confidence: 0.5,
      entities,
    };
  }

  /**
   * Apply a voice command to a blueprint
   */
  applyCommand(blueprint: AppBlueprint, command: VoiceCommand): EditResult {
    const changes: Change[] = [];
    let newBlueprint = { ...blueprint };

    try {
      switch (command.intent.target) {
        case 'page':
          newBlueprint = this.handlePageCommand(newBlueprint, command, changes);
          break;
        case 'entity':
          newBlueprint = this.handleEntityCommand(newBlueprint, command, changes);
          break;
        case 'field':
          newBlueprint = this.handleFieldCommand(newBlueprint, command, changes);
          break;
        case 'theme':
          newBlueprint = this.handleThemeCommand(newBlueprint, command, changes);
          break;
        case 'workflow':
          newBlueprint = this.handleWorkflowCommand(newBlueprint, command, changes);
          break;
        default:
          return {
            success: false,
            changes: [],
            newBlueprint: blueprint,
            message: `Unsupported command target: ${command.intent.target}`,
          };
      }

      return {
        success: true,
        changes,
        newBlueprint,
        message: changes.map(c => c.description).join('. '),
      };
    } catch (error: any) {
      return {
        success: false,
        changes: [],
        newBlueprint: blueprint,
        message: error.message || 'Failed to apply command',
      };
    }
  }

  /**
   * Handle page-related commands
   */
  private handlePageCommand(blueprint: AppBlueprint, command: VoiceCommand, changes: Change[]): AppBlueprint {
    const { action, modifier } = command.intent;
    const { pageName, pageType } = command.entities;

    switch (action) {
      case 'add': {
        const newPage = this.createPage(pageName || 'New Page', pageType || 'list', blueprint);
        blueprint.pages.push(newPage);
        
        // Update navigation
        if (!blueprint.navigation.sidebar?.items.find(i => i.pageId === newPage.id)) {
          blueprint.navigation.sidebar?.items.push({
            pageId: newPage.id,
            icon: this.getPageIcon(newPage.type),
            label: newPage.name,
          });
        }
        
        changes.push({
          type: 'added',
          target: newPage.name,
          targetType: 'page',
          description: `Added ${newPage.name} page`,
        });
        break;
      }
      
      case 'remove': {
        const pageIndex = blueprint.pages.findIndex(p => 
          p.name.toLowerCase() === pageName?.toLowerCase() ||
          p.id.toLowerCase() === pageName?.toLowerCase()
        );
        if (pageIndex > -1) {
          const removed = blueprint.pages.splice(pageIndex, 1)[0];
          
          // Remove from navigation
          if (blueprint.navigation.sidebar) {
            blueprint.navigation.sidebar.items = blueprint.navigation.sidebar.items.filter(
              i => i.pageId !== removed.id
            );
          }
          
          changes.push({
            type: 'removed',
            target: removed.name,
            targetType: 'page',
            description: `Removed ${removed.name} page`,
          });
        }
        break;
      }
      
      case 'show': {
        if (modifier === 'sidebar') {
          const page = blueprint.pages.find(p => 
            p.name.toLowerCase() === pageName?.toLowerCase()
          );
          if (page && page.navigation) {
            page.navigation.showInSidebar = true;
            changes.push({
              type: 'updated',
              target: page.name,
              targetType: 'page',
              description: `${page.name} is now visible in sidebar`,
            });
          }
        }
        break;
      }
      
      case 'hide': {
        if (modifier === 'sidebar') {
          const page = blueprint.pages.find(p => 
            p.name.toLowerCase() === pageName?.toLowerCase()
          );
          if (page && page.navigation) {
            page.navigation.showInSidebar = false;
            changes.push({
              type: 'updated',
              target: page.name,
              targetType: 'page',
              description: `${page.name} is now hidden from sidebar`,
            });
          }
        }
        break;
      }
      
      case 'rename': {
        const page = blueprint.pages.find(p => 
          p.name.toLowerCase() === pageName?.toLowerCase()
        );
        if (page && command.entities.values?.[0]) {
          const oldName = page.name;
          page.name = command.entities.values[0];
          changes.push({
            type: 'updated',
            target: page.name,
            targetType: 'page',
            description: `Renamed ${oldName} to ${page.name}`,
          });
        }
        break;
      }
    }

    return blueprint;
  }

  /**
   * Handle entity-related commands
   */
  private handleEntityCommand(blueprint: AppBlueprint, command: VoiceCommand, changes: Change[]): AppBlueprint {
    const { action } = command.intent;
    const { entityName, values } = command.entities;

    switch (action) {
      case 'add': {
        const newEntity = this.createEntity(entityName || 'Item', values);
        blueprint.entities.push(newEntity);
        
        // Also create pages for the entity
        const listPage = this.createPage(newEntity.pluralName, 'list', blueprint, newEntity.id);
        const formPage = this.createPage(`Add ${newEntity.name}`, 'form', blueprint, newEntity.id);
        blueprint.pages.push(listPage, formPage);
        
        // Add to navigation
        blueprint.navigation.sidebar?.items.push({
          pageId: listPage.id,
          icon: '📋',
          label: newEntity.pluralName,
        });
        
        changes.push({
          type: 'added',
          target: newEntity.name,
          targetType: 'entity',
          description: `Added ${newEntity.name} table with ${newEntity.fields.length} fields and created pages`,
        });
        break;
      }
      
      case 'remove': {
        const entityIndex = blueprint.entities.findIndex(e => 
          e.name.toLowerCase() === entityName?.toLowerCase()
        );
        if (entityIndex > -1) {
          const removed = blueprint.entities.splice(entityIndex, 1)[0];
          
          // Remove related pages
          blueprint.pages = blueprint.pages.filter(p => p.entity !== removed.id);
          
          // Remove from navigation
          if (blueprint.navigation.sidebar) {
            blueprint.navigation.sidebar.items = blueprint.navigation.sidebar.items.filter(
              i => !i.pageId.includes(removed.id)
            );
          }
          
          changes.push({
            type: 'removed',
            target: removed.name,
            targetType: 'entity',
            description: `Removed ${removed.name} table and its pages`,
          });
        }
        break;
      }
    }

    return blueprint;
  }

  /**
   * Handle field-related commands
   */
  private handleFieldCommand(blueprint: AppBlueprint, command: VoiceCommand, changes: Change[]): AppBlueprint {
    const { action } = command.intent;
    const { entityName, fieldName, fieldType } = command.entities;

    const entity = blueprint.entities.find(e => 
      e.name.toLowerCase() === entityName?.toLowerCase() ||
      e.id.toLowerCase() === entityName?.toLowerCase()
    );

    if (!entity) {
      throw new Error(`Entity "${entityName}" not found`);
    }

    switch (action) {
      case 'add': {
        if (!fieldName) throw new Error('Field name is required');
        
        const newField: FieldDef = {
          id: fieldName.toLowerCase().replace(/\s+/g, ''),
          name: fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
          type: (fieldType as FieldDef['type']) || 'string',
          required: false,
        };
        
        // Add enum options if it's an enum type
        if (newField.type === 'enum') {
          newField.enumOptions = [
            { value: 'option1', label: 'Option 1', color: '#60a5fa' },
            { value: 'option2', label: 'Option 2', color: '#34d399' },
            { value: 'option3', label: 'Option 3', color: '#fbbf24' },
          ];
        }
        
        entity.fields.push(newField);
        
        // Update display config
        if (entity.displayConfig?.listFields && entity.displayConfig.listFields.length < 5) {
          entity.displayConfig.listFields.push(newField.id);
        }
        
        changes.push({
          type: 'added',
          target: `${entity.name}.${newField.name}`,
          targetType: 'field',
          description: `Added ${newField.name} (${newField.type}) field to ${entity.name}`,
        });
        break;
      }
      
      case 'remove': {
        const fieldIndex = entity.fields.findIndex(f => 
          f.name.toLowerCase() === fieldName?.toLowerCase() ||
          f.id.toLowerCase() === fieldName?.toLowerCase()
        );
        
        if (fieldIndex > -1 && entity.fields[fieldIndex].id !== 'id') {
          const removed = entity.fields.splice(fieldIndex, 1)[0];
          
          // Remove from display config
          if (entity.displayConfig?.listFields) {
            entity.displayConfig.listFields = entity.displayConfig.listFields.filter(f => f !== removed.id);
          }
          
          changes.push({
            type: 'removed',
            target: `${entity.name}.${removed.name}`,
            targetType: 'field',
            description: `Removed ${removed.name} field from ${entity.name}`,
          });
        }
        break;
      }
      
      case 'update': {
        const field = entity.fields.find(f => 
          f.name.toLowerCase() === fieldName?.toLowerCase()
        );
        
        if (field && fieldType) {
          const oldType = field.type;
          field.type = fieldType as FieldDef['type'];
          
          changes.push({
            type: 'updated',
            target: `${entity.name}.${field.name}`,
            targetType: 'field',
            description: `Changed ${field.name} type from ${oldType} to ${field.type}`,
          });
        }
        break;
      }
    }

    return blueprint;
  }

  /**
   * Handle theme-related commands
   */
  private handleThemeCommand(blueprint: AppBlueprint, command: VoiceCommand, changes: Change[]): AppBlueprint {
    const { colorValue } = command.entities;
    const commandText = command.rawText || '';
    const lowerText = commandText.toLowerCase();
    
    // Enhanced theme parsing (inline for now to avoid circular dependencies)
    // Pattern: "make it [preset]"
    const presetMatch = lowerText.match(/make\s+(?:it|this|the\s+app)\s+(?:more\s+)?(modern|minimal|professional|bold|playful|elegant|tech|nature|clean|sleek|simple|colorful|fun|serious|corporate|business|fancy|luxurious|techy|futuristic|organic|green|eco|dark|light|strong|powerful)/i);
    
    // Pattern: "use [color] [tones|color]"
    const colorMatch = lowerText.match(/use\s+(\w+)\s*(?:tones?|colors?)?/i);
    
    // Pattern: "dark mode" or "light mode"
    const modeMatch = lowerText.match(/(dark|light)\s*(?:mode|theme)?/i);
    
    // Pattern: "[use|with] rounded [corners]"
    const roundedMatch = lowerText.match(/(?:use|with|make\s+it)\s+rounded\s*(?:corners?)?/i);
    
    if (colorValue || colorMatch) {
      const colorName = colorValue || colorMatch?.[1];
      if (colorName) {
        const hexColor = colorNameToHex(colorName);
        
        if (!blueprint.theme) {
          blueprint.theme = {
            primaryColor: hexColor,
            mode: 'light',
            borderRadius: 'medium',
          };
        } else {
          blueprint.theme.primaryColor = hexColor;
        }
        
        changes.push({
          type: 'updated',
          target: 'theme',
          targetType: 'theme',
          description: `Changed primary color to ${colorName}`,
        });
      }
    }
    
    if (modeMatch) {
      const mode = modeMatch[1] as 'light' | 'dark';
      if (!blueprint.theme) {
        blueprint.theme = {
          primaryColor: '#6366f1',
          mode: mode,
          borderRadius: 'medium',
        };
      } else {
        blueprint.theme.mode = mode;
      }
      
      changes.push({
        type: 'updated',
        target: 'theme',
        targetType: 'theme',
        description: `Switched to ${mode} mode`,
      });
    }
    
    if (roundedMatch) {
      if (!blueprint.theme) {
        blueprint.theme = {
          primaryColor: '#6366f1',
          mode: 'light',
          borderRadius: 'large',
        };
      } else {
        blueprint.theme.borderRadius = 'large';
      }
      
      changes.push({
        type: 'updated',
        target: 'theme',
        targetType: 'theme',
        description: 'Changed to rounded corners',
      });
    }
    
    // Note: Full theme engine integration would use voiceThemeParser
    // but requires async/await which needs refactoring handleThemeCommand
    
    return blueprint;
  }

  /**
   * Handle workflow-related commands
   */
  private handleWorkflowCommand(blueprint: AppBlueprint, command: VoiceCommand, changes: Change[]): AppBlueprint {
    // Workflow commands would be handled here
    // For now, just return the blueprint unchanged
    return blueprint;
  }

  /**
   * Create a new page
   */
  private createPage(name: string, type: string, blueprint: AppBlueprint, entityId?: string): PageDef {
    const pageId = name.toLowerCase().replace(/\s+/g, '-');
    
    return {
      id: pageId,
      name,
      route: `/${pageId}`,
      type: type as PageDef['type'],
      entity: entityId,
      layout: {
        type: 'single-column',
        sections: [
          { id: 'header', type: 'header', components: [] },
          { id: 'main', type: 'main', components: [] },
        ],
      },
      components: [
        {
          id: `${pageId}-title`,
          type: 'text',
          props: { text: name, variant: 'h1' },
        },
      ],
      navigation: {
        showInSidebar: true,
        order: blueprint.pages.length,
      },
    };
  }

  /**
   * Create a new entity
   */
  private createEntity(name: string, fields?: string[]): EntityDef {
    const entityId = name.toLowerCase().replace(/\s+/g, '-');
    
    const entityFields: FieldDef[] = [
      { id: 'id', name: 'ID', type: 'string', required: true, unique: true, displayOptions: { hidden: true } },
      { id: 'name', name: 'Name', type: 'string', required: true },
    ];
    
    // Add extracted fields
    if (fields && fields.length > 0) {
      for (const fieldName of fields) {
        if (fieldName.toLowerCase() !== 'name') {
          entityFields.push({
            id: fieldName.toLowerCase().replace(/\s+/g, ''),
            name: fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
            type: detectFieldType('', fieldName),
            required: false,
          });
        }
      }
    }
    
    // Add timestamps
    entityFields.push(
      { id: 'createdAt', name: 'Created At', type: 'datetime', required: false },
      { id: 'updatedAt', name: 'Updated At', type: 'datetime', required: false }
    );
    
    return {
      id: entityId,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      pluralName: this.pluralize(name.charAt(0).toUpperCase() + name.slice(1)),
      fields: entityFields,
      displayConfig: {
        titleField: 'name',
        listFields: entityFields.slice(1, 5).map(f => f.id),
        searchFields: ['name'],
      },
    };
  }

  /**
   * Get icon for page type
   */
  private getPageIcon(type: string): string {
    const icons: Record<string, string> = {
      'dashboard': '📊',
      'list': '📋',
      'form': '📝',
      'detail': '📄',
      'calendar': '📅',
      'kanban': '📌',
      'table': '📊',
      'chart': '📈',
    };
    return icons[type] || '📄';
  }

  /**
   * Pluralize a word
   */
  private pluralize(word: string): string {
    if (word.endsWith('y')) return word.slice(0, -1) + 'ies';
    if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) return word + 'es';
    return word + 's';
  }

  /**
   * Process a voice/text command and return the modified blueprint
   */
  async processCommand(blueprint: AppBlueprint, input: string): Promise<EditResult> {
    const command = this.parseCommand(input);
    return this.applyCommand(blueprint, command);
  }
}

// Export singleton
export const voiceEditor = new VoiceEditor();
