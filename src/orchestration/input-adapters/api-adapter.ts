import crypto from 'node:crypto';
import { IntentType } from '../types.js';
import type { InputAdapter, AdapterResult } from './types.js';

interface Endpoint {
  method: string;
  path: string;
  summary: string | undefined;
  tags: string[];
}

interface ParsedSpec {
  title: string;
  version: string;
  endpoints: Endpoint[];
  entities: string[];
  auth: string[];
}

export class ApiAdapter implements InputAdapter {
  readonly type = IntentType.Codebase;

  canHandle(input: string): boolean {
    const trimmed = input.trim();
    const isJson = this.maybeJson(trimmed);
    const isYaml = this.maybeYaml(trimmed);
    const isDocsUrl = /(swagger|openapi|api-docs|docs)\.(json|yaml|yml)/i.test(trimmed);
    const isSpec = /openapi:|swagger:|info:\s*\{/i.test(trimmed);

    return !!(isJson || isYaml || isDocsUrl || isSpec);
  }

  async process(input: string, _options?: Record<string, unknown>): Promise<AdapterResult> {
    const spec = this.parseSpec(input);
    const projectName = spec.title || 'API Project';

    const entities = this.detectEntities(spec);
    const pages = this.inferPages(spec);

    const id = `api-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const manifest = {
      id,
      description: `API-first project from spec: ${spec.title} v${spec.version}`,
      userInput: input,
      name: projectName,
      createdAt: new Date().toISOString(),
      version: 1,
    };

    return {
      manifest,
      adapterType: IntentType.Codebase,
      confidence: 0.85,
      detectedName: projectName,
      entities,
      pages,
      integrations: [...spec.auth, 'api-gateway'],
      metadata: {
        title: spec.title,
        version: spec.version,
        endpointCount: spec.endpoints.length,
        authMethods: spec.auth,
        tags: [...new Set(spec.endpoints.flatMap(e => e.tags))],
      },
    };
  }

  private maybeJson(text: string): boolean {
    try {
      const parsed = JSON.parse(text.trim());
      return !!(parsed.openapi || parsed.swagger);
    } catch {
      return false;
    }
  }

  private maybeYaml(text: string): boolean {
    return /^openapi:|^swagger:/m.test(text.trim());
  }

  private parseSpec(input: string): ParsedSpec {
    try {
      const parsed = JSON.parse(input.trim());
      return this.parseJsonSpec(parsed);
    } catch {
      return this.parseHeuristic(input);
    }
  }

  private parseJsonSpec(spec: Record<string, unknown>): ParsedSpec {
    const info = spec.info as Record<string, unknown> | undefined;
    const paths = spec.paths as Record<string, Record<string, unknown>> | undefined;

    const endpoints: Endpoint[] = [];
    const entities = new Set<string>();
    const auth: string[] = [];

    if (paths) {
      for (const [path, methods] of Object.entries(paths)) {
        for (const [method, details] of Object.entries(methods)) {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            const d = details as Record<string, unknown>;
            endpoints.push({
              method: method.toUpperCase(),
              path,
              summary: d.summary as string | undefined,
              tags: (d.tags as string[]) ?? [],
            });

            for (const seg of path.split('/').filter(Boolean)) {
              if (!seg.startsWith('{') && !seg.startsWith(':')) {
                entities.add(this.singularize(seg));
              }
            }
          }
        }
      }
    }

    const components = spec.components as Record<string, unknown> | undefined;
    const securitySchemes = (components?.securitySchemes ?? spec.securityDefinitions) as Record<string, unknown> | undefined;

    if (securitySchemes) {
      for (const [_name, scheme] of Object.entries(securitySchemes)) {
        const s = scheme as Record<string, unknown>;
        if (s.type === 'oauth2' || s.type === 'openIdConnect') auth.push('oauth');
        else if (s.type === 'apiKey') auth.push('api-key');
        else if (s.type === 'http' && s.scheme === 'bearer') auth.push('jwt');
        else auth.push((s.scheme as string) ?? 'auth');
      }
    }

    return {
      title: (info?.title as string) ?? 'API Project',
      version: (info?.version as string) ?? '1.0.0',
      endpoints,
      entities: [...entities].length > 0 ? [...entities] : ['User'],
      auth: auth.length > 0 ? auth : ['anonymous'],
    };
  }

  private parseHeuristic(input: string): ParsedSpec {
    const endpoints: Endpoint[] = [];
    const entities = new Set<string>();
    const auth: string[] = [];

    const titleMatch = input.match(/(?:title|name):\s*['"]?([^'"\n]+)['"]?/i);
    const versionMatch = input.match(/version:\s*['"]?([^'"\n]+)['"]?/i);

    const methodPattern = /\b(GET|POST|PUT|PATCH|DELETE)\s+\/([a-z][a-z0-9/{}_-]*)/gi;

    let m: RegExpExecArray | null;
    while ((m = methodPattern.exec(input)) !== null) {
      const method = m[1] ?? 'GET';
      const pathSeg = m[2];
      if (!pathSeg) continue;
      const path = '/' + pathSeg;
      endpoints.push({ method, path, summary: undefined, tags: [] });

      for (const seg of path.split('/').filter(Boolean)) {
        if (!seg.startsWith('{') && !seg.startsWith(':')) {
          entities.add(this.singularize(seg));
        }
      }
    }

    if (/bearer|jwt|oauth/i.test(input)) auth.push('jwt');
    if (/api.?key/i.test(input)) auth.push('api-key');
    if (/basic\s*auth/i.test(input)) auth.push('basic');

    return {
      title: titleMatch?.[1]?.trim() ?? 'API Project',
      version: versionMatch?.[1]?.trim() ?? '1.0.0',
      endpoints,
      entities: [...entities].length > 0 ? [...entities] : ['User'],
      auth: auth.length > 0 ? auth : ['anonymous'],
    };
  }

  private singularize(word: string): string {
    const singular = (() => {
      if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
      if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('ches') || word.endsWith('shes')) return word.slice(0, -2);
      if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
      return word;
    })();
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  }

  private detectEntities(spec: ParsedSpec): string[] {
    const entities = new Set<string>();

    for (const ep of spec.endpoints) {
      for (const seg of ep.path.split('/').filter(Boolean)) {
        if (!seg.startsWith('{') && !seg.startsWith(':')) {
          entities.add(this.singularize(seg));
        }
      }
      for (const tag of ep.tags) {
        entities.add(this.singularize(tag));
      }
    }

    return [...entities].length > 0 ? [...entities] : ['User'];
  }

  private inferPages(spec: ParsedSpec): string[] {
    const pages = new Set<string>();

    const resourcePaths = new Set<string>();
    for (const ep of spec.endpoints) {
      const segments = ep.path.split('/').filter(s => s && !s.startsWith('{') && !s.startsWith(':'));
      const first = segments[0];
      if (first) {
        resourcePaths.add('/' + first.toLowerCase());
      }
    }

    pages.add('/');
    pages.add('/login');
    for (const rp of resourcePaths) {
      pages.add(rp);
      pages.add(`${rp}/:id`);
      pages.add(`${rp}/new`);
    }

    return [...pages];
  }
}
