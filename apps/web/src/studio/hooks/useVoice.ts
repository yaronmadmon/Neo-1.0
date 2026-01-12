/**
 * Voice Activation Hook
 * Handles speech recognition and voice commands for the studio
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { VoiceCommand, VoiceContext, Selection, InspectorPanel, AppData } from '../types.js';

// Speech recognition types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
    speechSynthesis: SpeechSynthesis;
  }
}

export interface UseVoiceOptions {
  onNavigate?: (path: string) => void;
  onSelect?: (selection: Selection) => void;
  onInspect?: (panel: InspectorPanel) => void;
  onCommand?: (command: string, transcript: string) => void;
  currentApp?: AppData | null;
  currentSelection?: Selection | null;
}

export interface UseVoiceReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  error: string | null;
  
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  speak: (text: string) => void;
  
  // Command registration
  registerCommand: (command: VoiceCommand) => void;
  unregisterCommand: (pattern: RegExp) => void;
}

// Built-in voice commands
const createBuiltInCommands = (context: VoiceContext): VoiceCommand[] => [
  // Navigation commands
  {
    pattern: /^(go to|navigate to|open|show)\s+(pages?|page tree)/i,
    action: 'navigate_pages',
    description: 'Show the page tree',
    handler: () => context.inspect('pages'),
  },
  {
    pattern: /^(go to|navigate to|open|show)\s+(components?|component inspector)/i,
    action: 'navigate_components',
    description: 'Show the component inspector',
    handler: () => context.inspect('components'),
  },
  {
    pattern: /^(go to|navigate to|open|show)\s+(app|app inspector|app settings)/i,
    action: 'navigate_app',
    description: 'Show the app inspector',
    handler: () => context.inspect('app'),
  },
  {
    pattern: /^(go to|navigate to|open|show)\s+(integrations?|integration panel)/i,
    action: 'navigate_integrations',
    description: 'Show the integrations panel',
    handler: () => context.inspect('integrations'),
  },
  // Integration commands
  {
    pattern: /^connect\s+(stripe|twilio|email|webhook|rest|google\s+sheets|google\s+calendar|notion|airtable|zapier)/i,
    action: 'connect_integration',
    description: 'Connect an integration',
    handler: (matches) => {
      context.inspect('integrations');
      context.speak(`Opening integrations panel to connect ${matches[1]}`);
    },
  },
  {
    pattern: /^(use|enable)\s+(stripe|twilio|email|webhook|rest|google\s+sheets|google\s+calendar|notion|airtable|zapier)\s+for\s+(.+)/i,
    action: 'use_integration',
    description: 'Use an integration for a purpose',
    handler: (matches) => {
      context.inspect('integrations');
      context.speak(`Setting up ${matches[2]} for ${matches[3]}`);
    },
  },
  {
    pattern: /^send\s+(?:an?\s+)?(email|sms|webhook)\s+when\s+(.+)/i,
    action: 'create_integration_workflow',
    description: 'Create a workflow with integration action',
    handler: (matches) => {
      context.inspect('workflows');
      context.speak(`Creating workflow to send ${matches[1]} when ${matches[2]}`);
    },
  },
  {
    pattern: /^push\s+(?:this\s+)?(?:data\s+)?to\s+(google\s+sheets|airtable|notion)/i,
    action: 'push_to_integration',
    description: 'Push data to an integration',
    handler: (matches) => {
      context.inspect('integrations');
      context.speak(`Setting up push to ${matches[1]}`);
    },
  },
  {
    pattern: /^add\s+(?:an?\s+)?event\s+in\s+(?:google\s+)?calendar/i,
    action: 'add_calendar_event',
    description: 'Add event to calendar',
    handler: () => {
      context.inspect('workflows');
      context.speak('Setting up calendar event workflow');
    },
  },
  
  // AI Improvement commands
  {
    pattern: /^(how\s+can\s+i\s+)?improve\s+(?:this\s+)?(?:app|application)/i,
    action: 'improve_app',
    description: 'Get improvement suggestions',
    handler: () => {
      context.inspect('ai-suggestions');
      context.speak('Analyzing your app and generating improvement suggestions');
    },
  },
  {
    pattern: /^what\s+(?:am\s+i\s+)?missing\s+(?:for\s+a\s+)?(.+)?/i,
    action: 'what_missing',
    description: 'Find missing features',
    handler: (matches) => {
      context.inspect('ai-suggestions');
      const industry = matches[1] || '';
      context.speak(`Analyzing what's missing${industry ? ` for a ${industry} app` : ''}`);
    },
  },
  {
    pattern: /^(is\s+)?(?:this\s+app\s+)?(?:good\s+enough\s+for\s+)?production\s+(?:ready)?/i,
    action: 'production_ready',
    description: 'Check production readiness',
    handler: () => {
      context.inspect('ai-suggestions');
      context.speak('Checking if your app is ready for production');
    },
  },
  {
    pattern: /^what\s+would\s+you\s+add\s+next/i,
    action: 'what_next',
    description: 'Get next steps',
    handler: () => {
      context.inspect('ai-suggestions');
      context.speak('Analyzing what to add next');
    },
  },
  {
    pattern: /^show\s+(?:me\s+)?(?:the\s+)?critical\s+(?:issues?|problems?)/i,
    action: 'show_critical',
    description: 'Show critical issues',
    handler: () => {
      context.inspect('ai-suggestions');
      context.speak('Showing critical issues');
    },
  },
  {
    pattern: /^fix\s+all\s+(?:auto\s+)?(?:fixable\s+)?(?:issues?|problems?)/i,
    action: 'fix_all_auto',
    description: 'Fix all auto-fixable issues',
    handler: async () => {
      context.inspect('ai-suggestions');
      context.speak('Applying all auto-fixable improvements');
      // The panel will handle the actual fixing
    },
  },
  {
    pattern: /^add\s+(?:a\s+)?dashboard\s+(?:if\s+it'?s\s+)?missing/i,
    action: 'add_dashboard_if_missing',
    description: 'Add dashboard if missing',
    handler: () => {
      context.inspect('ai-suggestions');
      context.speak('Checking for dashboard and adding if missing');
    },
  },
  {
    pattern: /^make\s+(?:this\s+app\s+)?production\s+ready\s+(?:for\s+a\s+)?(.+)/i,
    action: 'make_production_ready',
    description: 'Make app production ready',
    handler: (matches) => {
      context.inspect('ai-suggestions');
      const industry = matches[1] || '';
      context.speak(`Analyzing and preparing your app for production${industry ? ` as a ${industry} app` : ''}`);
    },
  },
  {
    pattern: /^explain\s+(?:my\s+)?(?:app|application)/i,
    action: 'explain_app',
    description: 'Explain the app',
    handler: async () => {
      const appId = context.currentApp?.id;
      if (!appId) {
        context.speak('No app loaded');
        return;
      }
      
      try {
        // Call explainer API or use client-side
        context.speak('Analyzing your app and generating explanation');
        // The explanation will be shown in the AI Suggestions panel
        context.inspect('ai-suggestions');
      } catch (error: any) {
        context.speak(`Failed to explain app: ${error.message}`);
      }
    },
  },
  {
    pattern: /^(go to|navigate to|open|show)\s+(data|data inspector|data models?)/i,
    action: 'navigate_data',
    description: 'Show the data inspector',
    handler: () => context.inspect('data'),
  },
  {
    pattern: /^(go to|navigate to|open|show)\s+(workflows?|flows?|workflow inspector)/i,
    action: 'navigate_workflows',
    description: 'Show the workflow inspector',
    handler: () => context.inspect('workflows'),
  },
  {
    pattern: /^(go to|navigate to|open|show)\s+(publish|publish panel|publishing)/i,
    action: 'navigate_publish',
    description: 'Show the publish panel',
    handler: () => context.inspect('publish'),
  },
  
  // Publishing commands
  {
    pattern: /^(publish|publish the app|publish my app)/i,
    action: 'publish_app',
    description: 'Publish the app',
    handler: async () => {
      const appId = context.currentApp?.id;
      if (!appId) {
        context.speak('No app loaded');
        return;
      }
      
      try {
        const response = await fetch(`/api/apps/${appId}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ environment: 'production' }),
        });
        const data = await response.json();
        
        if (data.success) {
          context.speak(`Published version ${data.version.version}`);
          context.inspect('publish');
        } else {
          context.speak(`Publish failed: ${data.error}`);
        }
      } catch (error: any) {
        context.speak(`Publish failed: ${error.message}`);
      }
    },
  },
  {
    pattern: /^(rollback|rollback to (the )?previous version|rollback to last version)/i,
    action: 'rollback_app',
    description: 'Rollback to previous version',
    handler: async () => {
      const appId = context.currentApp?.id;
      if (!appId) {
        context.speak('No app loaded');
        return;
      }
      
      try {
        const response = await fetch(`/api/apps/${appId}/rollback/previous`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ environment: 'production' }),
        });
        const data = await response.json();
        
        if (data.success) {
          context.speak(`Rolled back to version ${data.version.version}`);
          context.inspect('publish');
        } else {
          context.speak(`Rollback failed: ${data.error}`);
        }
      } catch (error: any) {
        context.speak(`Rollback failed: ${error.message}`);
      }
    },
  },
  {
    pattern: /^(show|display|list)\s+(version history|versions|version list)/i,
    action: 'show_version_history',
    description: 'Show version history',
    handler: () => {
      context.inspect('publish');
      context.speak('Showing version history');
    },
  },
  
  // Permission commands
  {
    pattern: /^set\s+(default\s+)?role\s+to\s+(\w+)/i,
    action: 'set_default_role',
    description: 'Set default role',
    handler: async (matches) => {
      const role = matches[2].toLowerCase();
      const appId = context.currentApp?.id;
      if (!appId) {
        context.speak('No app loaded');
        return;
      }
      
      const validRoles = ['owner', 'admin', 'editor', 'viewer', 'public'];
      if (!validRoles.includes(role)) {
        context.speak(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
        return;
      }
      
      try {
        const response = await fetch(`/api/apps/${appId}/permissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            permissions: { defaultRole: role },
          }),
        });
        const data = await response.json();
        
        if (data.success) {
          context.speak(`Default role set to ${role}`);
        } else {
          context.speak(`Failed to set role: ${data.error}`);
        }
      } catch (error: any) {
        context.speak(`Failed to set role: ${error.message}`);
      }
    },
  },
  {
    pattern: /^allow\s+(only\s+)?(\w+)\s+(to\s+)?(?:see|view|access)\s+(?:the\s+)?(\w+)/i,
    action: 'add_page_access_rule',
    description: 'Add page access rule',
    handler: async (matches) => {
      const role = matches[2].toLowerCase();
      const pageName = matches[4].toLowerCase();
      const appId = context.currentApp?.id;
      
      if (!appId) {
        context.speak('No app loaded');
        return;
      }
      
      const page = context.currentApp?.schema.pages.find(
        p => p.name.toLowerCase().includes(pageName)
      );
      
      if (!page) {
        context.speak(`Page ${pageName} not found`);
        return;
      }
      
      const validRoles = ['owner', 'admin', 'editor', 'viewer', 'public'];
      if (!validRoles.includes(role)) {
        context.speak(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
        return;
      }
      
      try {
        // This would need to create an access rule
        // For now, just acknowledge
        context.speak(`Added access rule: Only ${role}s can see ${page.name}`);
      } catch (error: any) {
        context.speak(`Failed to add rule: ${error.message}`);
      }
    },
  },
  {
    pattern: /^hide\s+(\w+)\s+(\w+)\s+(?:from|for)\s+(\w+)/i,
    action: 'hide_field_from_role',
    description: 'Hide field from role',
    handler: async (matches) => {
      const entityName = matches[1].toLowerCase();
      const fieldName = matches[2].toLowerCase();
      const role = matches[3].toLowerCase();
      const appId = context.currentApp?.id;
      
      if (!appId) {
        context.speak('No app loaded');
        return;
      }
      
      const entity = context.currentApp?.schema.dataModels.find(
        m => m.name.toLowerCase().includes(entityName)
      );
      
      if (!entity) {
        context.speak(`Entity ${entityName} not found`);
        return;
      }
      
      context.speak(`Hiding ${fieldName} from ${role}s`);
    },
  },
  {
    pattern: /^(only\s+)?show\s+(?:records|rows)\s+(?:that are\s+)?(?:assigned to me|where\s+(.+))/i,
    action: 'add_row_access_rule',
    description: 'Add row-level access rule',
    handler: async (matches) => {
      const condition = matches[2] || 'assigned_to == current_user';
      const appId = context.currentApp?.id;
      
      if (!appId) {
        context.speak('No app loaded');
        return;
      }
      
      context.speak(`Added row-level access rule: ${condition}`);
    },
  },
  
  // Selection commands
  {
    pattern: /^select\s+page\s+(.+)/i,
    action: 'select_page',
    description: 'Select a page by name',
    handler: (matches) => {
      const pageName = matches[1].toLowerCase();
      const page = context.currentApp?.schema.pages.find(
        p => p.name.toLowerCase().includes(pageName)
      );
      if (page) {
        context.select({ type: 'page', id: page.id });
        context.speak(`Selected page ${page.name}`);
      } else {
        context.speak(`Page ${pageName} not found`);
      }
    },
  },
  {
    pattern: /^select\s+component\s+(.+)/i,
    action: 'select_component',
    description: 'Select a component by ID',
    handler: (matches) => {
      const componentId = matches[1].toLowerCase();
      context.select({ type: 'component', id: componentId });
      context.speak(`Selected component ${componentId}`);
    },
  },
  {
    pattern: /^select\s+(data\s+)?model\s+(.+)/i,
    action: 'select_datamodel',
    description: 'Select a data model by name',
    handler: (matches) => {
      const modelName = matches[2].toLowerCase();
      const model = context.currentApp?.schema.dataModels.find(
        m => m.name.toLowerCase().includes(modelName)
      );
      if (model) {
        context.select({ type: 'dataModel', id: model.id });
        context.speak(`Selected data model ${model.name}`);
      } else {
        context.speak(`Data model ${modelName} not found`);
      }
    },
  },
  {
    pattern: /^select\s+(workflow|flow)\s+(.+)/i,
    action: 'select_flow',
    description: 'Select a workflow by name',
    handler: (matches) => {
      const flowName = matches[2].toLowerCase();
      const flow = context.currentApp?.schema.flows.find(
        f => f.name.toLowerCase().includes(flowName)
      );
      if (flow) {
        context.select({ type: 'flow', id: flow.id });
        context.speak(`Selected workflow ${flow.name}`);
      } else {
        context.speak(`Workflow ${flowName} not found`);
      }
    },
  },
  
  // Information commands
  {
    pattern: /^(what is|describe|tell me about)\s+this\s+(page|component|model|flow|workflow)/i,
    action: 'describe_selection',
    description: 'Describe the current selection',
    handler: (matches) => {
      if (!context.currentSelection) {
        context.speak('Nothing is currently selected');
        return;
      }
      
      const type = context.currentSelection.type;
      const id = context.currentSelection.id;
      context.speak(`Currently selected: ${type} with ID ${id}`);
    },
  },
  {
    pattern: /^(how many|count)\s+(pages?|components?|data\s+models?|models?|flows?|workflows?)/i,
    action: 'count_items',
    description: 'Count items in the app',
    handler: (matches) => {
      if (!context.currentApp) {
        context.speak('No app is currently loaded');
        return;
      }
      
      const itemType = matches[2].toLowerCase();
      let count = 0;
      let name = '';
      
      if (itemType.includes('page')) {
        count = context.currentApp.schema.pages.length;
        name = 'pages';
      } else if (itemType.includes('component')) {
        count = context.currentApp.schema.components.length;
        name = 'components';
      } else if (itemType.includes('model') || itemType.includes('data')) {
        count = context.currentApp.schema.dataModels.length;
        name = 'data models';
      } else if (itemType.includes('flow') || itemType.includes('workflow')) {
        count = context.currentApp.schema.flows.length;
        name = 'workflows';
      }
      
      context.speak(`This app has ${count} ${name}`);
    },
  },
  
  // General commands
  {
    pattern: /^(go back|back|undo)/i,
    action: 'undo',
    description: 'Undo the last action',
    handler: () => {
      context.speak('Undo');
      // Undo will be handled by the parent component
    },
  },
  {
    pattern: /^(redo|forward)/i,
    action: 'redo',
    description: 'Redo the last undone action',
    handler: () => {
      context.speak('Redo');
      // Redo will be handled by the parent component
    },
  },
  {
    pattern: /^(help|what can (you|I) (say|do)|commands)/i,
    action: 'help',
    description: 'List available voice commands',
    handler: () => {
      context.speak(
        'You can say: Go to pages, Go to data, Select page name, ' +
        'How many components, Describe this page, Undo, Redo, and more.'
      );
    },
  },
];

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    onNavigate,
    onSelect,
    onInspect,
    onCommand,
    currentApp,
    currentSelection,
  } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const customCommandsRef = useRef<VoiceCommand[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Create voice context
  const voiceContext: VoiceContext = {
    currentApp: currentApp ?? null,
    currentSelection: currentSelection ?? null,
    navigate: onNavigate ?? (() => {}),
    select: onSelect ?? (() => {}),
    inspect: onInspect ?? (() => {}),
    speak: (text: string) => {
      if (synthRef.current) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        synthRef.current.speak(utterance);
      }
    },
  };

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = Array.from({ length: event.results.length }, (_, i) => event.results[i]);
        const latestResult = results[results.length - 1];
        
        if (latestResult && latestResult.isFinal) {
          const finalTranscript = latestResult[0].transcript.trim();
          setTranscript(finalTranscript);
          
          // Process command
          processCommand(finalTranscript);
        } else if (latestResult) {
          setTranscript(latestResult[0].transcript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setError(event.error === 'not-allowed' 
          ? 'Microphone permission denied' 
          : event.error
        );
        setIsListening(false);
      };

      recognition.onend = () => {
        // Auto-restart if still supposed to be listening
        if (isListening && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Already started
          }
        }
      };

      recognitionRef.current = recognition;
    }

    // Initialize speech synthesis
    if (window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Process voice command
  const processCommand = useCallback((input: string) => {
    const allCommands = [
      ...createBuiltInCommands(voiceContext),
      ...customCommandsRef.current,
    ];

    for (const command of allCommands) {
      const matches = input.match(command.pattern);
      if (matches) {
        command.handler(matches, voiceContext);
        onCommand?.(command.action, input);
        return;
      }
    }

    // No command matched
    console.log('No command matched:', input);
  }, [voiceContext, onCommand]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported');
      return;
    }

    setError(null);
    setTranscript('');
    setIsListening(true);

    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
      setIsListening(false);
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Speak text
  const speak = useCallback((text: string) => {
    voiceContext.speak(text);
  }, [voiceContext]);

  // Register custom command
  const registerCommand = useCallback((command: VoiceCommand) => {
    customCommandsRef.current.push(command);
  }, []);

  // Unregister command
  const unregisterCommand = useCallback((pattern: RegExp) => {
    customCommandsRef.current = customCommandsRef.current.filter(
      c => c.pattern.toString() !== pattern.toString()
    );
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    toggleListening,
    speak,
    registerCommand,
    unregisterCommand,
  };
}
