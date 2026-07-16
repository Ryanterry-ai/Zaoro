const { runBuildPipeline } = require('./dist/generation/build-pipeline.js');
const { buildBREContext } = require('./dist/bos/intake-parser.js');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../supplement-store-preview');

async function main() {
  const ctx = buildBREContext('Build a fully functional, interactive, responsive multi brands e commerce supplement store for Indian customers');
  const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: outDir });

  fs.mkdirSync(outDir, { recursive: true });

  for (const file of result.renderResult.files) {
    const normalizedPath = file.path.replace(/^\.\.\//g, '');
    const filePath = path.join(outDir, normalizedPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content);
  }

  console.log('Done! wrote', result.renderResult.files.length, 'files to', outDir);
}

main().catch(console.error);
