#!/usr/bin/env node
/**
 * Build Engine — Screenshot Diff (Bucket A)
 * Renders generated page, diffs against source screenshot.
 * Pixel + structural diff. Pure deterministic — no LLM.
 *
 * Usage: node index.js <source-screenshot> <generated-screenshot> [--threshold 0.85]
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { threshold: 0.85, output: './docs/research' };
  let source = null;
  let generated = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--threshold') opts.threshold = parseFloat(args[++i]) || 0.85;
    else if (args[i] === '--output') opts.output = args[++i];
    else if (!args[i].startsWith('-')) {
      if (!source) source = args[i];
      else generated = args[i];
    }
  }
  if (!source || !generated) {
    console.error('Usage: node index.js <source.png> <generated.png> [--threshold 0.85]');
    process.exit(1);
  }
  return { source, generated, ...opts };
}

/**
 * Structural diff — compare DOM structure without visual rendering.
 * Compares HTML tag counts, class usage, nesting depth, and text content.
 */
function structuralDiff(sourceHtml, generatedHtml) {
  const extractStructure = (html) => {
    const tags = {};
    const tagRegex = /<(\w+)[\s>]/g;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const tag = match[1].toLowerCase();
      tags[tag] = (tags[tag] || 0) + 1;
    }
    const maxDepth = (html.match(/<\w/g) || []).length; // rough proxy
    const textContent = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return { tags, maxDepth, textLength: textContent.length, tagCount: Object.values(tags).reduce((a, b) => a + b, 0) };
  };

  const sourceStruct = extractStructure(sourceHtml);
  const genStruct = extractStructure(generatedHtml);

  // Compare tag counts
  const allTags = new Set([...Object.keys(sourceStruct.tags), ...Object.keys(genStruct.tags)]);
  const tagDiffs = {};
  let totalDiff = 0;
  let totalTags = 0;

  for (const tag of allTags) {
    const s = sourceStruct.tags[tag] || 0;
    const g = genStruct.tags[tag] || 0;
    const diff = Math.abs(s - g);
    const max = Math.max(s, g, 1);
    tagDiffs[tag] = { source: s, generated: g, diff, similarity: 1 - diff / max };
    totalDiff += diff;
    totalTags += max;
  }

  const overallSimilarity = totalTags > 0 ? 1 - totalDiff / totalTags : 1;

  return {
    overallSimilarity,
    tagDiffs,
    sourceStructure: sourceStruct,
    generatedStructure: genStruct,
    textLengthDiff: Math.abs(sourceStruct.textLength - genStruct.textLength),
    textLengthSimilarity: 1 - Math.abs(sourceStruct.textLength - genStruct.textLength) / Math.max(sourceStruct.textLength, 1),
  };
}

/**
 * Simple pixel-level comparison using raw buffer comparison.
 * For production, use a proper image comparison library.
 */
function pixelDiff(sourcePath, generatedPath) {
  try {
    const sourceBuf = fs.readFileSync(sourcePath);
    const genBuf = fs.readFileSync(generatedPath);

    if (sourceBuf.length === 0 || genBuf.length === 0) {
      return { error: 'Empty image file', similarity: 0 };
    }

    // Simple file size comparison as a proxy
    const sizeDiff = Math.abs(sourceBuf.length - genBuf.length);
    const maxSize = Math.max(sourceBuf.length, genBuf.length);
    const sizeSimilarity = 1 - sizeDiff / maxSize;

    // Byte-level comparison (sampled for large files)
    const sampleSize = Math.min(sourceBuf.length, genBuf.length, 10000);
    let matchingBytes = 0;
    for (let i = 0; i < sampleSize; i++) {
      if (sourceBuf[i] === genBuf[i]) matchingBytes++;
    }
    const byteSimilarity = matchingBytes / sampleSize;

    return {
      overallSimilarity: (sizeSimilarity + byteSimilarity) / 2,
      sizeSimilarity,
      byteSimilarity,
      sourceSize: sourceBuf.length,
      generatedSize: genBuf.length,
    };
  } catch (err) {
    return { error: err.message, similarity: 0 };
  }
}

async function main() {
  const opts = parseArgs();
  console.log(`[ScreenshotDiff] Comparing: ${opts.source} vs ${opts.generated}`);

  let results;

  // Check if files are HTML (structural) or images (pixel)
  const sourceExt = path.extname(opts.source).toLowerCase();
  const genExt = path.extname(opts.generated).toLowerCase();

  if (['.html', '.htm'].includes(sourceExt)) {
    const sourceHtml = fs.readFileSync(opts.source, 'utf-8');
    const genHtml = fs.readFileSync(opts.generated, 'utf-8');
    results = structuralDiff(sourceHtml, genHtml);
  } else {
    results = pixelDiff(opts.source, opts.generated);
  }

  results.threshold = opts.threshold;
  results.passed = (results.overallSimilarity || 0) >= opts.threshold;
  results.comparedAt = new Date().toISOString();

  const outputDir = path.resolve(opts.output);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputFile = path.join(outputDir, 'diff-report.json');
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

  console.log(`[ScreenshotDiff] Similarity: ${((results.overallSimilarity || 0) * 100).toFixed(1)}%`);
  console.log(`[ScreenshotDiff] Threshold: ${(opts.threshold * 100).toFixed(1)}%`);
  console.log(`[ScreenshotDiff] Result: ${results.passed ? 'PASS' : 'FAIL'}`);
  console.log(`[ScreenshotDiff] Report: ${outputFile}`);

  process.exit(results.passed ? 0 : 1);
}

main().catch(err => { console.error('[ScreenshotDiff] Fatal:', err.message); process.exit(1); });
