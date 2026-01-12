/**
 * Neo Studio Types
 * Type definitions for the studio inspection and navigation system
 */

// Selection types
export type SelectionType = 'page' | 'component' | 'dataModel' | 'flow' | 'record' | 'field';

export interface Selection {
  type: SelectionType;
  id: string;
  path?: string[];
  parentId?: string;
}

// Undo/Redo
export interface HistoryEntry {
  id: string;
  timestamp: number;
  type: 'create' | 'update' | 'delete' | 'navigate';
  description: string;
  target: {
    type: SelectionType;
    id: string;
    name?: string;
  };
  before?: unknown;
  after?: unknown;
}

export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
  maxSize: number;
}

// Voice command types
export interface VoiceCommand {
  pattern: RegExp;
  action: string;
  description: string;
  handler: (matches: RegExpMatchArray, context: VoiceContext) => void;
}

export interface VoiceContext {
  currentApp: AppData | null;
  currentSelection: Selection | null;
  navigate: (path: string) => void;
  select: (selection: Selection) => void;
  inspect: (panel: InspectorPanel) => void;
  speak: (text: string) => void;
}

export type InspectorPanel = 'pages' | 'components' | 'app' | 'data' | 'workflows' | 'publish' | 'integrations' | 'ai-suggestions';

// App data structure for studio
export interface AppData {
  id: string;
  name: string;
  description?: string;
  category: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  schema: {
    pages: PageData[];
    components: ComponentData[];
    dataModels: DataModelData[];
    flows: FlowData[];
  };
  theme: ThemeData;
  data: Record<string, unknown[]>;
}

export interface PageData {
  id: string;
  name: string;
  route: string;
  layout: Record<string, unknown>;
  components: ComponentData[];
}

export interface ComponentData {
  id: string;
  componentId: string;
  props?: Record<string, unknown>;
  children?: ComponentData[];
  styles?: Record<string, unknown>;
}

export interface DataModelData {
  id: string;
  name: string;
  fields: FieldData[];
  relationships?: unknown[];
}

export interface FieldData {
  id: string;
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
  defaultValue?: unknown;
  reference?: {
    targetModel: string;
    displayField: string;
  };
}

export interface FlowData {
  id: string;
  name: string;
  description?: string;
  trigger: {
    type: string;
    componentId?: string;
    modelId?: string;
    event?: string;
  };
  actions: FlowActionData[];
  enabled: boolean;
}

export interface FlowActionData {
  type: string;
  modelId?: string;
  recordId?: string;
  data?: Record<string, unknown>;
  targetPageId?: string;
  message?: string;
}

export interface ThemeData {
  colors: Record<string, string>;
  typography: Record<string, unknown>;
  spacing: Record<string, unknown>;
  borderRadius?: Record<string, unknown>;
  shadows?: Record<string, unknown>;
}

// Studio state
export interface StudioState {
  app: AppData | null;
  loading: boolean;
  error: string | null;
  selection: Selection | null;
  activePanel: InspectorPanel;
  expandedNodes: Set<string>;
  history: HistoryState;
  voiceEnabled: boolean;
  isListening: boolean;
}

// Tree node for hierarchical display
export interface TreeNode {
  id: string;
  label: string;
  icon?: string;
  type: SelectionType;
  children?: TreeNode[];
  data?: unknown;
  expanded?: boolean;
  selected?: boolean;
}
