// tools/screenshot-diff/index.js
// Bucket A — pixel + structural diff between two screenshots.
// Usage: node tools/screenshot-diff/index.js <original.png> <clone.png> <output-dir>
// Output: diff.png + similarity score

const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const fs = require('fs');
const path = require('path');

function diffScreenshots(originalPath, clonePath, outputDir) {
  const original = PNG.sync.read(fs.readFileSync(originalPath));
  const clone = PNG.sync.read(fs.readFileSync(clonePath));

  const { width, height } = original;
  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(
    original.data,
    clone.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );

  const totalPixels = width * height;
  const similarity = ((totalPixels - diffPixels) / totalPixels) * 100;

  fs.writeFileSync(path.join(outputDir, 'diff.png'), PNG.sync.write(diff));

  const result = {
    original: originalPath,
    clone: clonePath,
    diffPath: path.join(outputDir, 'diff.png'),
    width,
    height,
    totalPixels,
    diffPixels,
    similarity: Math.round(similarity * 100) / 100,
    pass: similarity >= 90,
  };

  fs.writeFileSync(path.join(outputDir, 'diff-result.json'), JSON.stringify(result, null, 2));

  console.log(`Similarity: ${result.similarity}% (${result.pass ? 'PASS' : 'FAIL'})`);
  return result;
}

const [,, originalPath, clonePath, outputDir] = process.argv;
if (!originalPath || !clonePath || !outputDir) {
  console.error('Usage: node index.js <original.png> <clone.png> <output-dir>');
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
diffScreenshots(originalPath, clonePath, outputDir);
