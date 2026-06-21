import { ASTDependencyGraph } from '../graph/ast-dependency-graph.js';
import { ASTPatch } from '../types/index.js';
import { normalizePath } from '../graph/module-resolver.js';

export interface PatchImpact {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  affectedFiles: string[];
  transitiveDepth: number;
  dependentCount: number;
  reason: string;
}

export class ImpactAnalyzer {
  constructor(private graph: ASTDependencyGraph) {}

  public analyze(patch: ASTPatch): PatchImpact {
    const canonicalPath = normalizePath(patch.targetFile);
    const dependents = this.graph.getDependents(canonicalPath);
    
    const pathSet = new Set<string>();
    const maxDepth = this.calculateMaxDepth(canonicalPath, pathSet);
    
    const visited = new Set<string>();
    const transitiveDependents = this.calculateTransitiveDependents(canonicalPath, visited);

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (transitiveDependents.length > 5 || maxDepth > 3) {
      riskLevel = 'HIGH';
    } else if (dependents.length > 0) {
      riskLevel = 'MEDIUM';
    }

    return {
      riskLevel,
      affectedFiles: transitiveDependents,
      transitiveDepth: maxDepth,
      dependentCount: dependents.length,
      reason: `Patch affects ${dependents.length} direct dependents with a transitive blast-radius of ${transitiveDependents.length} files across depth ${maxDepth}.`
    };
  }

  private calculateMaxDepth(file: string, pathSet: Set<string>): number {
    if (pathSet.has(file)) return 0; 
    pathSet.add(file);

    const dependents = this.graph.getDependents(file);
    
    let maxSubDepth = 0;
    for (const dep of dependents) {
      const depth = this.calculateMaxDepth(dep, pathSet);
      if (depth > maxSubDepth) {
        maxSubDepth = depth;
      }
    }

    pathSet.delete(file);
    return dependents.length > 0 ? maxSubDepth + 1 : 0;
  }

  private calculateTransitiveDependents(file: string, visited: Set<string>): string[] {
    const dependentsList: string[] = [];
    const dfs = (node: string) => {
      const direct = this.graph.getDependents(node);
      for (const dep of direct) {
        if (!visited.has(dep)) {
          visited.add(dep);
          dependentsList.push(dep);
          dfs(dep);
        }
      }
    };
    dfs(file);
    return dependentsList;
  }
}