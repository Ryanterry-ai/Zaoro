import { normalizePath } from './module-resolver.js';

export interface DependencyNode {
  file: string; 
  exports: string[];
  imports: string[]; 
  signatures: Record<string, string>; 
}

export interface DependencyEdge {
  from: string; 
  to: string;   
  type: 'import' | 're-export' | 'dynamic';
}

export class ASTDependencyGraph {
  private nodes = new Map<string, DependencyNode>();
  private edges: DependencyEdge[] = [];

  public addFile(node: DependencyNode): void {
    const canonicalFile = normalizePath(node.file);
    this.nodes.set(canonicalFile, {
      file: canonicalFile,
      exports: [...node.exports],
      imports: [...node.imports], 
      signatures: { ...node.signatures }
    });
  }

  public addEdge(edge: DependencyEdge): void {
    const canonicalEdge: DependencyEdge = {
      from: normalizePath(edge.from),
      to: normalizePath(edge.to),
      type: edge.type
    };

    const exists = this.edges.some(
      (e) => e.from === canonicalEdge.from && 
             e.to === canonicalEdge.to && 
             e.type === canonicalEdge.type
    );
    if (!exists) {
      this.edges.push(canonicalEdge);
    }
  }

  public getDependents(file: string): string[] {
    const target = normalizePath(file);
    return this.edges
      .filter((e) => e.to === target)
      .map((e) => e.from);
  }

  public getDependencies(file: string): string[] {
    const source = normalizePath(file);
    return this.edges
      .filter((e) => e.from === source)
      .map((e) => e.to);
  }

  public getNode(file: string): DependencyNode | undefined {
    return this.nodes.get(normalizePath(file));
  }

  public getAllNodes(): DependencyNode[] {
    return Array.from(this.nodes.values());
  }

  public getAllEdges(): DependencyEdge[] {
    return [...this.edges];
  }

  public clear(): void {
    this.nodes.clear();
    this.edges = [];
  }
}