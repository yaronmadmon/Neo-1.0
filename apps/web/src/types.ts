/**
 * Shared types for the web app
 */

export interface App {
  id: string;
  name: string;
  category: string;
  description?: string;
  previewUrl: string;
  schema?: {
    pages?: Array<{
      id: string;
      name: string;
      route: string;
      components?: Array<{
        id: string;
        componentId: string;
        props?: Record<string, unknown>;
        children?: Array<unknown>;
      }>;
    }>;
    components?: unknown[];
    dataModels?: unknown[];
    flows?: unknown[];
  };
  data?: Record<string, unknown[]>;
  theme?: {
    colors?: Record<string, string>;
    typography?: Record<string, unknown>;
    spacing?: Record<string, string>;
  };
}
