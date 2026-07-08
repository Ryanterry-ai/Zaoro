import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface HealingResult {
  filesFixed: number;
  errorsFixed: number;
  fixes: string[];
}

/**
 * Deterministic self-healer — fixes common TSX generation errors without LLM.
 * Runs tsc --noEmit, parses output, and applies regex-based fixes.
 */
export function runDeterministicHealing(workspacePath: string): HealingResult {
  const result: HealingResult = { filesFixed: 0, errorsFixed: 0, fixes: [] };

  let tscOutput = '';
  try {
    execSync('npx tsc --noEmit 2>&1', {
      cwd: workspacePath,
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result; // No errors
  } catch (err: any) {
    tscOutput = err.stdout || err.stderr || '';
  }

  if (!tscOutput) return result;

  const errorLines = tscOutput.split('\n').filter(l => l.includes('error TS'));
  const fixedFiles = new Set<string>();

  for (const line of errorLines) {
    const fileMatch = line.match(/^([^(]+)\(/);
    if (!fileMatch || !fileMatch[1]) continue;
    const filePath = path.join(workspacePath, fileMatch[1]);
    if (!fs.existsSync(filePath)) continue;

    const tsCode = line.match(/error (TS\d+)/)?.[1] ?? '';
    const content = fs.readFileSync(filePath, 'utf-8');
    let modified = content;

    // Fix 1: Missing 'use client' on files with hooks
    if (tsCode === '2304' && line.includes('useState')) {
      if (!modified.startsWith("'use client'") && !modified.startsWith('"use client"')) {
        modified = "'use client';\n" + modified;
        result.fixes.push(`Added 'use client' to ${fileMatch[1]}`);
      }
    }

    // Fix 2: Duplicate export default — keep only the last one
    const exportDefaults = modified.match(/export default function \w+/g);
    if (exportDefaults && exportDefaults.length > 1) {
      const lastIdx = modified.lastIndexOf('export default function');
      modified = modified.substring(0, modified.indexOf('export default function')).trimEnd() +
        '\n\n' + modified.substring(lastIdx);
      result.fixes.push(`Removed duplicate export default in ${fileMatch[1]}`);
    }

    // Fix 3: Wrong import path — @/lib/db should be ../../lib/db in API routes
    if (filePath.includes('/app/api/') && modified.includes("from '@/lib/db'")) {
      modified = modified.replace(/from '@\/lib\/db'/g, "from '../../../lib/db'");
      result.fixes.push(`Fixed import path in API route ${fileMatch[1]}`);
    }

    if (modified !== content) {
      fs.writeFileSync(filePath, modified);
      fixedFiles.add(filePath);
    }
  }

  result.filesFixed = fixedFiles.size;
  result.errorsFixed = errorLines.length;
  return result;
}
