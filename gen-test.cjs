const fs = require('fs');

const src = fs.readFileSync('src/engine/build-queue.ts', 'utf-8');

// Find the template literal boundaries
const templateStart = src.indexOf('const buildScript = `') + 'const buildScript = '.length + 1;
let templateEnd = -1;
for (let i = templateStart; i < src.length; i++) {
  if (src[i] === '`') { templateEnd = i; break; }
}

const template = src.substring(templateStart, templateEnd);

// Simulate the interpolations
const generated = template
  .replace(/\$\{JSON\.stringify\(this\.workspaceBase\)\}/g, '"/tmp/sandbox"')
  .replace(/\$\{JSON\.stringify\(job\.workspaceId\)\}/g, '"ws-test123"')
  .replace(/\$\{JSON\.stringify\(`\.build-config-\$\{job\.id\}\.json`\)\}/g, '".build-config-ws-test123.json"')
  .replace(/\$\{JSON\.stringify\(`\.build-prompt-\$\{job\.id\}\.json`\)\}/g, '".build-prompt-ws-test123.json"')
  .replace(/\$\{job\.id\}/g, 'ws-test123');

fs.writeFileSync('.build-test-output.ts', generated, 'utf-8');
console.log('Written to .build-test-output.ts');
console.log('Lines:', generated.split('\n').length);
// Show around line 168
const lines = generated.split('\n');
for (let i = 165; i < 175 && i < lines.length; i++) {
  const line = lines[i];
  console.log((i+1) + ': ' + line);
  if (i === 167) {
    console.log('  Column 54 char: ' + JSON.stringify(line[53]));
    console.log('  Context: ' + JSON.stringify(line.substring(48, 60)));
  }
}
