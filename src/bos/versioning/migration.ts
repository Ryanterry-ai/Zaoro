import type { ApplicationBlueprint } from '../schemas/blueprint/application-blueprint.schema.js';

export interface MigrationStep {
  id: string;
  description: string;
  fromVersion: string;
  toVersion: string;
  transform: (blueprint: ApplicationBlueprint) => ApplicationBlueprint;
  validate: (blueprint: ApplicationBlueprint) => boolean;
}

export interface MigrationReport {
  migrationId: string;
  fromVersion: string;
  toVersion: string;
  stepsExecuted: string[];
  success: boolean;
  errors: string[];
  timestamp: string;
}

export interface VersionManifest {
  version: string;
  createdAt: string;
  blueprintVersion: string;
  knowledgeVersions: Record<string, string>;
  compilerVersion: string;
  checksum: string;
}

export class MigrationGraph {
  private steps: MigrationStep[] = [];

  register(step: MigrationStep): void {
    this.steps.push(step);
  }

  migrate(blueprint: ApplicationBlueprint, targetVersion: string): MigrationReport {
    const report: MigrationReport = {
      migrationId: `migration-${Date.now()}`,
      fromVersion: blueprint.version,
      toVersion: targetVersion,
      stepsExecuted: [],
      success: true,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    let current = { ...blueprint };
    const applicableSteps = this.steps
      .filter(s => this.versionGte(blueprint.version, s.fromVersion) && this.versionLte(s.toVersion, targetVersion))
      .sort((a, b) => this.versionCompare(a.toVersion, b.toVersion));

    for (const step of applicableSteps) {
      try {
        current = step.transform(current);
        if (!step.validate(current)) {
          report.errors.push(`Validation failed after step ${step.id}`);
          report.success = false;
          break;
        }
        report.stepsExecuted.push(step.id);
      } catch (err) {
        report.errors.push(`Step ${step.id} failed: ${err instanceof Error ? err.message : String(err)}`);
        report.success = false;
        break;
      }
    }

    if (report.success) {
      current.version = targetVersion;
      (current as Record<string, unknown>)['updatedAt'] = new Date().toISOString();
    }

    return report;
  }

  createManifest(blueprint: ApplicationBlueprint, knowledgeVersions: Record<string, string>): VersionManifest {
    return {
      version: blueprint.version,
      createdAt: new Date().toISOString(),
      blueprintVersion: blueprint.version,
      knowledgeVersions,
      compilerVersion: '2.0.0',
      checksum: this.computeChecksum(blueprint),
    };
  }

  private computeChecksum(blueprint: ApplicationBlueprint): string {
    const content = JSON.stringify({
      version: blueprint.version,
      industry: blueprint.industry,
      pages: blueprint.pages.length,
      entities: blueprint.entities.length,
    });
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  private versionCompare(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
      if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
    }
    return 0;
  }

  private versionGte(a: string, b: string): boolean {
    return this.versionCompare(a, b) >= 0;
  }

  private versionLte(a: string, b: string): boolean {
    return this.versionCompare(a, b) <= 0;
  }
}

export function createDefaultMigrations(): MigrationStep[] {
  return [
    {
      id: 'migration-1.0-to-2.0',
      description: 'Add navigation, layouts, and permissions to blueprint',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      transform: (bp) => ({
        ...bp,
        navigation: bp.navigation ?? { items: [], style: 'horizontal', sticky: true, logo: true },
        layouts: bp.layouts ?? [],
        permissions: bp.permissions ?? [],
        routes: bp.routes ?? [],
        apis: bp.apis ?? [],
        dashboardWidgets: bp.dashboardWidgets ?? [],
        charts: bp.charts ?? [],
        forms: bp.forms ?? [],
        tables: bp.tables ?? [],
        provenance: bp.provenance ?? { knowledge: [], compilers: [] },
      }),
      validate: (bp) => bp.navigation !== undefined && bp.layouts !== undefined,
    },
  ];
}
