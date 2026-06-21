export type BusinessType =
  | 'ecommerce'
  | 'saas'
  | 'local-business'
  | 'agency'
  | 'portfolio'
  | 'blog'
  | 'marketplace'
  | 'healthcare'
  | 'fitness'
  | 'restaurant'
  | 'education'
  | 'unknown';

export type BuildCapability =
  | 'generate-app'
  | 'generate-website'
  | 'clone-website'
  | 'analyze-domain'
  | 'extract-components'
  | 'extract-design-system';

export type GenerationIntent =
  | { type: 'build-app'; prompt: string }
  | { type: 'build-website'; prompt: string }
  | { type: 'clone-website'; targetUrl: string }
  | { type: 'analyze-domain'; domain: string }
  | { type: 'extract-components'; domain: string }
  | { type: 'extract-design-system'; domain: string };

export interface DesignTokens {
  colors: Record<string, string>;
  fonts: string[];
  spacing: string[];
  borderRadius: string[];
  shadows: string[];
  breakpoints: Record<string, string>;
}

export interface ExtractedAsset {
  url: string;
  type: 'image' | 'font' | 'icon' | 'video' | 'stylesheet';
  localPath?: string;
  alt?: string | undefined;
  width?: number;
  height?: number;
}

export interface ExtractedComponent {
  name: string;
  type: 'layout' | 'hero' | 'card' | 'form' | 'navigation' | 'footer' | 'section' | 'modal' | 'custom';
  html: string;
  styles: string[];
  props: string[];
  screenshot?: string;
}

export interface ExtractedRoute {
  path: string;
  title: string;
  type: 'page' | 'api' | 'dynamic';
  params?: string[];
}

export interface WebsiteAnalysis {
  domain: string;
  url: string;
  title: string;
  description: string;
  businessType: BusinessType;
  technologies: string[];
  routes: ExtractedRoute[];
  designTokens: DesignTokens;
  assets: ExtractedAsset[];
  components: ExtractedComponent[];
  metadata: Record<string, string>;
  analyzedAt: string;
}

export interface ClonePlan {
  sourceDomain: string;
  routesToBuild: ExtractedRoute[];
  componentsToCreate: ExtractedComponent[];
  assetsToDownload: ExtractedAsset[];
  dataModels: DataModel[];
  designTokens: DesignTokens;
  estimatedFiles: number;
  strategy: 'full-clone' | 'structure-clone' | 'style-clone';
}

export interface DataModel {
  name: string;
  fields: DataField[];
  relations: DataRelation[];
}

export interface DataField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'image' | 'email' | 'price';
  required: boolean;
  unique: boolean;
  description: string;
}

export interface DataRelation {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  target: string;
  foreignKey?: string;
}

export interface BlueprintPage {
  route: string;
  name: string;
  type: 'home' | 'listing' | 'detail' | 'auth' | 'dashboard' | 'static' | 'api' | 'page';
  components: string[];
  dataRequirements: string[];
  description: string;
}

export interface BlueprintLayout {
  name: string;
  areas: string[];
  components: string[];
}

export interface BlueprintComponent {
  name: string;
  type: string;
  props: string[];
  children: string[];
  file: string;
}

export interface BlueprintIntegration {
  name: string;
  type: 'database' | 'auth' | 'payment' | 'email' | 'analytics' | 'cms' | 'storage';
  config: Record<string, string | string[]>;
}

export interface ProjectBlueprint {
  name: string;
  businessType: BusinessType;
  description: string;
  pages: BlueprintPage[];
  layouts: BlueprintLayout[];
  components: BlueprintComponent[];
  databaseModels: DataModel[];
  integrations: BlueprintIntegration[];
  designTokens: DesignTokens;
  techStack: {
    framework: string;
    language: string;
    styling: string;
    database: string;
    orm: string;
  };
  generatedAt: string;
}

export interface CapabilityResult {
  capability: BuildCapability;
  supported: boolean;
  reason: string;
}
