const fs = require('fs');
const c = fs.readFileSync('src/engine/build-queue.ts','utf-8');
// Extract the template between backticks
const startMarker = 'const buildScript = `';
const startIdx = c.indexOf(startMarker);
const contentStart = startIdx + startMarker.length;
// Find matching end backtick (the one followed by `;`)
let endIdx = -1;
for (let i = contentStart; i < c.length - 1; i++) {
  if (c[i] === '`' && c[i+1] === ';') { endIdx = i; break; }
}
const template = c.substring(contentStart, endIdx);
// Replace all ${...} interpolations with dummy values
const simulated = template
  .replace(/\$\{JSON\.stringify\(this\.workspaceBase\)/g, '"/tmp/sandbox_workspaces"')
  .replace(/\$\{JSON\.stringify\(job\.workspaceId\)/g, '"ws-test-123"')
  .replace(/\$\{JSON\.stringify\(`\.build-config-\$\{job\.id\}\.json`\)\}/g, '".build-config-ws-test-123.json"')
  .replace(/\$\{JSON\.stringify\(`\.build-prompt-\$\{job\.id\}\.json`\)\}/g, '".build-prompt-ws-test-123.json"')
  .replace(/\$\{job\.id\}/g, 'ws-test-123');
const lines = simulated.split('\n');
console.log('Simulated total lines:', lines.length);
console.log('--- Lines 170-190 ---');
for (let i = 169; i < 190 && i < lines.length; i++) {
  const line = lines[i];
  console.log((i+1) + ': ' + line);
  if (i === 177) {
    // Show character at column 54
    console.log('  Column 54 char:', JSON.stringify(line[53]));
    console.log('  Context:', JSON.stringify(line.substring(48, 58)));
  }
}
