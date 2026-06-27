// tools/audit-log/check.js
// Bucket A — reads JSONL log and fails if Bucket A tools logged LLM calls.
// Usage: node tools/audit-log/check.js <log-file>
// Exit 0 = no violations, Exit 1 = Bucket A tools called LLM

const fs = require('fs');

const BUCKET_A_SKILLS = [
  'crawl-site',
  'extract-design-tokens',
  'localize-assets',
  'schema-codegen',
  'deploy-codegen',
  'deploy-target-selector',
  'quality-gate',
  'dependency-checker',
  'screenshot-diff',
  'content-validator',
  'token-extractor',
  'asset-downloader',
  'crawler',
];

const logFile = process.argv[2];

if (!logFile || !fs.existsSync(logFile)) {
  console.error(`Usage: node check.js <log-file>`);
  console.error(`Log file not found: ${logFile}`);
  process.exit(1);
}

const lines = fs.readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);
const violations = [];

for (let i = 0; i < lines.length; i++) {
  try {
    const entry = JSON.parse(lines[i]);
    if (BUCKET_A_SKILLS.includes(entry.callingSkill)) {
      violations.push({
        line: i + 1,
        callingSkill: entry.callingSkill,
        provider: entry.provider,
        taskType: entry.taskType,
        message: `Bucket A tool "${entry.callingSkill}" logged an LLM call`,
      });
    }
  } catch {
    // Skip malformed lines
  }
}

if (violations.length > 0) {
  console.error(JSON.stringify({ pass: false, violations, total: violations.length }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, totalCalls: lines.length, violations: 0 }));
