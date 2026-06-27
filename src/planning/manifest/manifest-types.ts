/**
 * =============================================================================
 * Build.same V3
 * Manifest Planning Layer - Types
 * =============================================================================
 * Build Manifest contracts consumed by the LLM Gateway and Compiler.
 * The manifest is the single source of truth for code generation.
 */

/* -------------------------------------------------------------------------- */
/*                               BRAND UTILITIES                              */
/* -------------------------------------------------------------------------- */

declare const __brand: unique symbol;

export type Brand<T, Name extends string> = T & {
  readonly [__brand]: Name;
};

/* -------------------------------------------------------------------------- */
/*                               IDENTIFIERS                                  */
/* -------------------------------------------------------------------------- */

export type BuildManifestId = Brand<string, "BuildManifestId">;
export type ManifestFileId = Brand<string, "ManifestFileId">;

/* -------------------------------------------------------------------------- */
/*                                   ENUMS                                    */
/* -------------------------------------------------------------------------- */

export enum ManifestFileType {
  Page = "page",
  Component = "component",
  Config = "config",
  Style = "style",
  Type = "type",
  Utility = "utility",
  Index = "index",
}

/* -------------------------------------------------------------------------- */
/*                           MANIFEST FILE                                    */
/* -------------------------------------------------------------------------- */

export interface ManifestFileMetadata {
  readonly name: string;
  readonly description: string;
  readonly [key: string]: unknown;
}

export interface ManifestFile {
  readonly path: string;
  readonly content: string;
  readonly type: ManifestFileType | string;
  readonly metadata: ManifestFileMetadata;
}

/* -------------------------------------------------------------------------- */
/*                           MANIFEST STATS                                    */
/* -------------------------------------------------------------------------- */

export interface ManifestStats {
  readonly totalPages: number;
  readonly totalComponents: number;
  readonly totalRoutes: number;
  readonly totalServices: number;
}

/* -------------------------------------------------------------------------- */
/*                        ROOT BUILD MANIFEST                                 */
/* -------------------------------------------------------------------------- */

export interface BuildManifest {
  readonly id: string;
  readonly applicationBlueprintId: string;
  readonly businessBlueprintId: string;
  readonly workspaceDir: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly files: ReadonlyArray<ManifestFile>;
  readonly stats: ManifestStats;
}

export type ImmutableBuildManifest = Readonly<BuildManifest>;
