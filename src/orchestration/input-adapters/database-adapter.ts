import crypto from 'node:crypto';
import { IntentType } from '../types.js';
import type { InputAdapter, AdapterResult } from './types.js';

const DB_CONNECTION_PATTERN = /^(postgres(?:ql)?|mysql|mongodb(?:\\+srv)?|redis|sqlite):\/\//i;

interface ParsedConnection {
  protocol: string;
  host: string;
  port: number | undefined;
  database: string | undefined;
}

export class DatabaseAdapter implements InputAdapter {
  readonly type = IntentType.Database;

  canHandle(input: string): boolean {
    return DB_CONNECTION_PATTERN.test(input.trim());
  }

  async process(input: string, _options?: Record<string, unknown>): Promise<AdapterResult> {
    const conn = this.parseConnection(input);
    const projectName = conn.database
      ? conn.database.charAt(0).toUpperCase() + conn.database.slice(1)
      : 'Database Project';

    const entities = this.inferEntities(conn.protocol);
    const pages = this.inferPages(conn.protocol);
    const integrations = [conn.protocol.toLowerCase(), 'orm'];

    const id = `db-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const manifest = {
      id,
      description: `Database-first project from ${conn.protocol} connection`,
      userInput: input,
      name: projectName,
      techStack: {
        database: this.normalizeDbName(conn.protocol),
      } as Record<string, string | undefined>,
      createdAt: new Date().toISOString(),
      version: 1,
    };

    return {
      manifest,
      adapterType: IntentType.Database,
      confidence: 0.9,
      detectedName: projectName,
      entities,
      pages,
      integrations,
      metadata: {
        protocol: conn.protocol,
        host: conn.host,
        port: conn.port,
        database: conn.database,
        connectionString: this.maskPassword(input),
      },
    };
  }

  private parseConnection(input: string): ParsedConnection {
    const url = new URL(input);
    return {
      protocol: url.protocol.replace(':', ''),
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : undefined,
      database: url.pathname.replace('/:', '').replace(/^\//, '') || undefined,
    };
  }

  private maskPassword(input: string): string {
    return input.replace(/(:\/\/[^:]+):([^@]+)@/, '$1:****@');
  }

  private normalizeDbName(protocol: string): string {
    const map: Record<string, string> = {
      postgres: 'PostgreSQL', postgresql: 'PostgreSQL',
      mysql: 'MySQL', mongodb: 'MongoDB', 'mongodb+srv': 'MongoDB Atlas',
      redis: 'Redis', sqlite: 'SQLite',
    };
    return map[protocol.toLowerCase()] ?? protocol;
  }

  private inferEntities(protocol: string): string[] {
    const lower = protocol.toLowerCase();
    const common = ['User', 'AuditLog'];

    if (lower.includes('postgres') || lower.includes('mysql')) {
      return [...common, 'Account', 'Setting'];
    }
    if (lower.includes('mongo')) {
      return [...common, 'Document', 'Collection'];
    }
    if (lower.includes('redis')) {
      return [...common, 'Session', 'Cache'];
    }
    if (lower.includes('sqlite')) {
      return [...common, 'Config'];
    }

    return common;
  }

  private inferPages(_protocol: string): string[] {
    return ['/', '/login', '/signup', '/dashboard', '/settings'];
  }
}
