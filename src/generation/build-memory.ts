// ─── Build Memory System ─────────────────────────────────────────
// RAG (Retrieval-Augmented Generation) for build outputs.
// Stores successful builds, extracts patterns, and provides
// relevant context to the LLM for better generation.
//
// This is the "build brain" that learns from every successful
// output and gets smarter over time.

import * as fs from 'fs';
import * as path from 'path';
import type { IntentDNA, FeatureSpec } from './intent-dna.js';
import type { EnrichedIntent, FeatureBlueprint } from './feature-enricher.js';

// ─── Types ───────────────────────────────────────────────────────

export interface BuildMemoryEntry {
  id: string;
  timestamp: number;

  // Input
  prompt: string;
  intent: IntentDNA;
  enriched: EnrichedIntent;

  // Output
  files_generated: string[];
  build_success: boolean;
  output_quality_score: number;    // 0-100

  // Patterns extracted
  patterns: BuildPattern[];
  domain_patterns: DomainPattern[];

  // Metadata
  duration_ms: number;
  llm_calls: number;
  tokens_used: number;
}

export interface BuildPattern {
  type: 'component_structure' | 'styling_approach' | 'state_management' | 'api_pattern' | 'layout_pattern';
  description: string;
  code_snippet: string;
  success_rate: number;            // how often this pattern works
  usage_count: number;
}

export interface DomainPattern {
  domain: string;
  feature: string;
  pattern: string;
  example: string;
  success_rate: number;
}

export interface MemorySearchResult {
  entry: BuildMemoryEntry;
  similarity: number;              // 0-1
  relevant_patterns: BuildPattern[];
}

// ─── Embedding (simple TF-IDF-like) ─────────────────────────────

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

function computeTF(text: string): Map<string, number> {
  const tokens = tokenize(text);
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  // Normalize
  for (const [k, v] of tf) {
    tf.set(k, v / tokens.length);
  }
  return tf;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  const allKeys = new Set([...a.keys(), ...b.keys()]);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const key of allKeys) {
    const va = a.get(key) || 0;
    const vb = b.get(key) || 0;
    dotProduct += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Build Memory ────────────────────────────────────────────────

export class BuildMemory {
  private entries: BuildMemoryEntry[] = [];
  private memoryDir: string;
  private maxEntries: number;

  constructor(workspaceRoot: string, maxEntries = 500) {
    this.memoryDir = path.join(workspaceRoot, '.build-memory');
    this.maxEntries = maxEntries;

    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }

    this.loadEntries();
  }

  // ─── Storage ─────────────────────────────────────────────────

  private loadEntries(): void {
    try {
      const indexPath = path.join(this.memoryDir, 'index.json');
      if (fs.existsSync(indexPath)) {
        const ids: string[] = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        for (const id of ids.slice(-this.maxEntries)) {
          const entryPath = path.join(this.memoryDir, `${id}.json`);
          if (fs.existsSync(entryPath)) {
            this.entries.push(JSON.parse(fs.readFileSync(entryPath, 'utf-8')));
          }
        }
        console.log(`[build-memory] Loaded ${this.entries.length} entries`);
      }
    } catch (err) {
      console.error(`[build-memory] Failed to load entries: ${(err as Error).message}`);
    }
  }

  private saveEntries(): void {
    try {
      const ids = this.entries.map(e => e.id);
      const indexPath = path.join(this.memoryDir, 'index.json');
      fs.writeFileSync(indexPath, JSON.stringify(ids), 'utf-8');

      // Save only recent entries
      for (const entry of this.entries.slice(-this.maxEntries)) {
        const entryPath = path.join(this.memoryDir, `${entry.id}.json`);
        fs.writeFileSync(entryPath, JSON.stringify(entry, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error(`[build-memory] Failed to save entries: ${(err as Error).message}`);
    }
  }

  // ─── Pattern Extraction ──────────────────────────────────────

  extractPatterns(files: Map<string, string>, intent: IntentDNA): BuildPattern[] {
    const patterns: BuildPattern[] = [];

    for (const [filePath, content] of files) {
      // Component structure patterns
      if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
        // Check for common patterns
        if (content.includes('useState')) {
          patterns.push({
            type: 'state_management',
            description: `Uses useState in ${path.basename(filePath)}`,
            code_snippet: this.extractSnippet(content, 'useState'),
            success_rate: 0.8,
            usage_count: 1,
          });
        }

        if (content.includes('useEffect')) {
          patterns.push({
            type: 'state_management',
            description: `Uses useEffect in ${path.basename(filePath)}`,
            code_snippet: this.extractSnippet(content, 'useEffect'),
            success_rate: 0.7,
            usage_count: 1,
          });
        }

        // Layout patterns
        if (content.includes('grid') || content.includes('grid-cols')) {
          patterns.push({
            type: 'layout_pattern',
            description: `Grid layout in ${path.basename(filePath)}`,
            code_snippet: this.extractSnippet(content, 'grid'),
            success_rate: 0.9,
            usage_count: 1,
          });
        }

        if (content.includes('flex') || content.includes('flex-')) {
          patterns.push({
            type: 'layout_pattern',
            description: `Flexbox layout in ${path.basename(filePath)}`,
            code_snippet: this.extractSnippet(content, 'flex'),
            success_rate: 0.9,
            usage_count: 1,
          });
        }
      }

      // Styling patterns
      if (filePath.endsWith('.css')) {
        if (content.includes(':root')) {
          patterns.push({
            type: 'styling_approach',
            description: `CSS custom properties in ${path.basename(filePath)}`,
            code_snippet: this.extractSnippet(content, ':root'),
            success_rate: 0.85,
            usage_count: 1,
          });
        }
      }

      // API patterns
      if (filePath.includes('api/') && filePath.endsWith('.ts')) {
        if (content.includes('NextResponse') || content.includes('Response')) {
          patterns.push({
            type: 'api_pattern',
            description: `API route in ${filePath}`,
            code_snippet: this.extractSnippet(content, 'Response'),
            success_rate: 0.75,
            usage_count: 1,
          });
        }
      }
    }

    return patterns;
  }

  extractDomainPatterns(intent: IntentDNA, files: Map<string, string>): DomainPattern[] {
    const patterns: DomainPattern[] = [];

    for (const feature of intent.features) {
      // Find files related to this feature
      const featureFiles = [...files.entries()].filter(([f, _]) =>
        f.toLowerCase().includes(feature.name)
      );

      if (featureFiles.length > 0 && featureFiles[0]) {
        const entry = featureFiles[0];
        const filePath = entry[0];
        const content = entry[1];
        patterns.push({
          domain: intent.business_domain,
          feature: feature.name,
          pattern: `Generated ${feature.component_type} for ${feature.name}`,
          example: content.substring(0, 200),
          success_rate: 0.7,
        });
      }
    }

    return patterns;
  }

  private extractSnippet(content: string, keyword: string): string {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.includes(keyword)) {
        const start = Math.max(0, i - 1);
        const end = Math.min(lines.length, i + 3);
        return lines.slice(start, end).join('\n').substring(0, 200);
      }
    }
    return '';
  }

  // ─── Store Build ─────────────────────────────────────────────

  async storeBuild(
    prompt: string,
    intent: IntentDNA,
    enriched: EnrichedIntent,
    files: Map<string, string>,
    buildSuccess: boolean,
    qualityScore: number,
    durationMs: number,
    llmCalls: number,
    tokensUsed: number,
  ): Promise<void> {
    const patterns = this.extractPatterns(files, intent);
    const domainPatterns = this.extractDomainPatterns(intent, files);

    const entry: BuildMemoryEntry = {
      id: `build-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      prompt,
      intent,
      enriched,
      files_generated: [...files.keys()],
      build_success: buildSuccess,
      output_quality_score: qualityScore,
      patterns,
      domain_patterns: domainPatterns,
      duration_ms: durationMs,
      llm_calls: llmCalls,
      tokens_used: tokensUsed,
    };

    this.entries.push(entry);

    // Trim to max entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    this.saveEntries();
    console.log(`[build-memory] Stored build ${entry.id} — ${patterns.length} patterns, ${domainPatterns.length} domain patterns`);
  }

  // ─── Retrieval ───────────────────────────────────────────────

  async findRelevant(prompt: string, domain: string, topK = 5): Promise<MemorySearchResult[]> {
    const queryTF = computeTF(prompt);

    const scored = this.entries
      .filter(e => e.build_success)
      .map(entry => {
        // Combine prompt, domain, and feature names for matching
        const entryText = `${entry.prompt} ${entry.intent.business_domain} ${entry.intent.features.map(f => f.name).join(' ')}`;
        const entryTF = computeTF(entryText);
        const similarity = cosineSimilarity(queryTF, entryTF);

        // Boost score for same domain
        const domainBoost = entry.intent.business_domain === domain ? 0.2 : 0;

        // Boost score for high quality
        const qualityBoost = (entry.output_quality_score / 100) * 0.1;

        return {
          entry,
          similarity: Math.min(1, similarity + domainBoost + qualityBoost),
          relevant_patterns: entry.patterns,
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return scored;
  }

  // ─── Context Generation ──────────────────────────────────────

  async generateContext(prompt: string, domain: string): Promise<string> {
    const relevant = await this.findRelevant(prompt, domain, 3);

    if (relevant.length === 0) {
      return '';
    }

    let context = '\n\n## Build Memory Context\n';
    context += 'Based on similar past successful builds:\n\n';

    for (const result of relevant) {
      context += `### Similar Build (similarity: ${(result.similarity * 100).toFixed(0)}%)\n`;
      context += `- Prompt: "${result.entry.prompt.substring(0, 100)}..."\n`;
      context += `- Domain: ${result.entry.intent.business_domain}\n`;
      context += `- Features: ${result.entry.intent.features.map(f => f.name).join(', ')}\n`;
      context += `- Quality Score: ${result.entry.output_quality_score}/100\n`;

      if (result.relevant_patterns.length > 0) {
        context += `- Patterns that worked:\n`;
        for (const pattern of result.relevant_patterns.slice(0, 3)) {
          context += `  - ${pattern.type}: ${pattern.description} (success rate: ${(pattern.success_rate * 100).toFixed(0)}%)\n`;
        }
      }
      context += '\n';
    }

    // Extract successful patterns across all results
    const allPatterns = relevant.flatMap(r => r.relevant_patterns);
    const patternCounts = new Map<string, { pattern: BuildPattern; count: number }>();
    for (const p of allPatterns) {
      const key = `${p.type}-${p.description}`;
      const existing = patternCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        patternCounts.set(key, { pattern: p, count: 1 });
      }
    }

    const topPatterns = [...patternCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (topPatterns.length > 0) {
      context += '### Recommended Patterns\n';
      context += 'Use these patterns as they have proven successful:\n\n';
      for (const { pattern, count } of topPatterns) {
        context += `- **${pattern.type}**: ${pattern.description} (used ${count}x successfully)\n`;
        if (pattern.code_snippet) {
          context += '  ```\n  ' + pattern.code_snippet.substring(0, 150) + '\n  ```\n';
        }
      }
    }

    return context;
  }

  // ─── Stats ───────────────────────────────────────────────────

  getStats(): {
    totalBuilds: number;
    successRate: number;
    avgQuality: number;
    topDomains: Array<{ domain: string; count: number }>;
    topPatterns: Array<{ type: string; count: number }>;
  } {
    const totalBuilds = this.entries.length;
    const successfulBuilds = this.entries.filter(e => e.build_success);
    const successRate = totalBuilds > 0 ? successfulBuilds.length / totalBuilds : 0;
    const avgQuality = totalBuilds > 0
      ? this.entries.reduce((sum, e) => sum + e.output_quality_score, 0) / totalBuilds
      : 0;

    // Domain distribution
    const domainCounts = new Map<string, number>();
    for (const entry of this.entries) {
      const domain = entry.intent.business_domain;
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    }
    const topDomains = [...domainCounts.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Pattern distribution
    const patternCounts = new Map<string, number>();
    for (const entry of this.entries) {
      for (const pattern of entry.patterns) {
        patternCounts.set(pattern.type, (patternCounts.get(pattern.type) || 0) + 1);
      }
    }
    const topPatterns = [...patternCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { totalBuilds, successRate, avgQuality, topDomains, topPatterns };
  }
}
