export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: Record<string, unknown>) => Promise<MCPToolResult>;
}

export interface MCPToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPSession {
  id: string;
  workspaceId: string;
  tools: MCPTool[];
  resources: MCPResource[];
  createdAt: number;
}

export interface PlaywrightScreenshot {
  url: string;
  title: string;
  screenshot: string;
  layout: LayoutMap;
  styles: DesignTokens;
  links: string[];
  images: ImageAsset[];
}

export interface LayoutMap {
  viewport: { width: number; height: number };
  elements: LayoutElement[];
}

export interface LayoutElement {
  tag: string;
  selector: string;
  bounds: { x: number; y: number; width: number; height: number };
  styles: Record<string, string>;
  text?: string;
  children?: LayoutElement[];
}

export interface DesignTokens {
  colors: string[];
  fonts: string[];
  fontSizes: string[];
  spacings: string[];
  borderRadii: string[];
  shadows: string[];
}

export interface ImageAsset {
  src: string;
  alt: string;
  width: number;
  height: number;
  format: string;
}

export interface GitHubConfig {
  token?: string;
  owner?: string;
  repo?: string;
}

export interface SupabaseConfig {
  url?: string;
  serviceRoleKey?: string;
  anonKey?: string;
}
