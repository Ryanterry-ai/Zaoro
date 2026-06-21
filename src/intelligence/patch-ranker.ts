import { ASTPatch } from '../types/index.js';
import { ImpactAnalyzer } from './impact-analyzer.js';

export class PatchRanker {
  constructor(private analyzer: ImpactAnalyzer) {}

  public rank(patches: ASTPatch[]): ASTPatch[] {
    return patches
      .map((patch) => {
        const impact = this.analyzer.analyze(patch);
        
        const graphCentralityWeight = impact.affectedFiles.length * 15;
        const dependentCountWeight = impact.dependentCount * 25;
        const transitiveDepthPenalty = impact.transitiveDepth * 10;
        const isolationBonus = impact.affectedFiles.length === 0 ? 50 : 0;

        const riskScore = graphCentralityWeight + dependentCountWeight + transitiveDepthPenalty - isolationBonus;

        return { patch, riskScore };
      })
      .sort((a, b) => a.riskScore - b.riskScore) 
      .map((p) => p.patch);
  }
}