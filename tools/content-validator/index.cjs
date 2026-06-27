// tools/content-validator/index.js
// Bucket A — checks for Lorem Ipsum, placeholder images, hardcoded content.
// Usage: node tools/content-validator/index.js <project-dir>
// Exit 0 = clean, Exit 1 = violations found.

const fs = require('fs');
const path = require('path');

const PLACEHOLDER_PATTERNS = [
  { pattern: /lorem ipsum/i, type: 'lorem-ipsum' },
  { pattern: /placeholder/i, type: 'placeholder-text' },
  { pattern: /your (business|company|brand) name/i, type: 'placeholder-business' },
  { pattern: /example\.com/i, type: 'example-domain' },
  { pattern: /picsum\.photos/i, type: 'placeholder-image' },
  { pattern: /via\.placeholder\.com/i, type: 'placeholder-image' },
  { pattern: /product (1|2|3|one|two|three)/i, type: 'placeholder-product' },
  { pattern: /service (a|b|c)/i, type: 'placeholder-service' },
  { pattern: /john doe/i, type: 'placeholder-name' },
  { pattern: /jane smith/i, type: 'placeholder-name' },
  { pattern: /todo:/i, type: 'todo-comment' },
  { pattern: /\[placeholder\]/i, type: 'placeholder-bracket' },
];

const SKIP_DIRS = ['node_modules', '.next', 'dist', '.git', '.vercel'];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const violations = [];

    for (const { pattern, type } of PLACEHOLDER_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        violations.push({ file: filePath, type, match: matches[0] });
      }
    }

    return violations;
  } catch {
    return [];
  }
}

function walkDir(dir) {
  const violations = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.includes(entry.name)) {
        violations.push(...walkDir(fullPath));
      }
    } else if (entry.name.match(/\.(tsx?|jsx?|html|css|mdx?)$/)) {
      violations.push(...scanFile(fullPath));
    }
  }

  return violations;
}

const projectDir = process.argv[2] || process.cwd();

if (!fs.existsSync(projectDir)) {
  console.error(JSON.stringify({ pass: false, error: `Directory not found: ${projectDir}` }));
  process.exit(1);
}

const violations = walkDir(projectDir);

if (violations.length > 0) {
  console.error(JSON.stringify({ pass: false, violations, total: violations.length }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, placeholders: 0 }));
