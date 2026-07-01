
import * as fs from 'fs';
import * as path from 'path';

const WS_BASE = "/tmp/sandbox";
const wsDir = path.join(WS_BASE, "ws-test123");

const PROGRESS_FILE = path.join(wsDir, '.progress');
const _progressEvents = [];
function writeProgress(step, type, message, metadata) {
  _progressEvents.push({ step, type, message, ts: Date.now(), metadata: metadata || undefined });
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(_progressEvents), 'utf-8'); } catch {}
}
function emitLLM(step, type, llmDetail) { writeProgress(step, type, \