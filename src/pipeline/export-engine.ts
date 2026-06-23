/**
 * Export Engine: ZIP export and GitHub push capabilities for generated applications.
 * Reuses existing MCP GitHub tooling where possible.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(zlib.gzip);

export interface ExportOptions {
  workspacePath: string;
  outputPath?: string;
}

export interface ZipExportResult {
  success: boolean;
  archivePath?: string;
  fileCount: number;
  totalSize: number;
  durationMs: number;
}

export interface GitHubPushOptions {
  workspacePath: string;
  owner: string;
  repo: string;
  branch?: string;
  message: string;
  token?: string;
}

export interface GitHubPushResult {
  success: boolean;
  filesPushed: number;
  filesFailed: number;
  errors: string[];
  durationMs: number;
}

// Minimal ZIP file format implementation
interface ZipLocalFileHeader {
  signature: number;
  versionNeeded: number;
  flags: number;
  compressionMethod: number;
  lastModTime: number;
  lastModDate: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  fileNameLength: number;
  extraFieldLength: number;
  fileName: string;
  extraField: Buffer;
  fileData: Buffer;
}

interface ZipCentralDirectoryEntry {
  signature: number;
  versionMadeBy: number;
  versionNeeded: number;
  flags: number;
  compressionMethod: number;
  lastModTime: number;
  lastModDate: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  fileNameLength: number;
  extraFieldLength: number;
  fileCommentLength: number;
  diskNumberStart: number;
  internalFileAttributes: number;
  externalFileAttributes: number;
  relativeOffsetOfLocalHeader: number;
  fileName: string;
  extraField: Buffer;
  fileComment: Buffer;
}

interface ZipEndOfCentralDirectory {
  signature: number;
  diskNumber: number;
  diskNumberWithStart: number;
  numberOfEntriesOnDisk: number;
  numberOfEntries: number;
  sizeOfCentralDirectory: number;
  offsetOfCentralDirectory: number;
  commentLength: number;
  comment: Buffer;
}

export class ExportEngine {
  /**
   * Generate a production-ready ZIP archive from a workspace.
   */
  async exportZip(options: ExportOptions): Promise<ZipExportResult> {
    const startTime = Date.now();
    const outputPath = options.outputPath ?? path.join(
      path.dirname(options.workspacePath),
      `${path.basename(options.workspacePath)}-export.zip`
    );

    try {
      const files = this.scanWorkspace(options.workspacePath);
      const entries: ZipLocalFileHeader[] = [];

      // Process each file
      for (const filePath of files) {
        const relativePath = path.relative(options.workspacePath, filePath).replace(/\\/g, '/');
        const content = fs.readFileSync(filePath);
        const compressed = await gzipAsync(content);

        const entry = this.createZipEntry(relativePath, content, compressed);
        entries.push(entry);
      }

      // Generate ZIP file
      const zipBuffer = this.buildZipFile(entries);
      fs.writeFileSync(outputPath, zipBuffer);

      const totalSize = entries.reduce((sum, e) => sum + e.uncompressedSize, 0);

      console.log(`[export-engine] ZIP created: ${outputPath} (${entries.length} files, ${totalSize} bytes)`);

      return {
        success: true,
        archivePath: outputPath,
        fileCount: entries.length,
        totalSize,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      console.error(`[export-engine] ZIP export failed: ${err.message}`);
      return {
        success: false,
        fileCount: 0,
        totalSize: 0,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Push workspace files directly to a GitHub repository.
   * Reuses the GitHub API pattern from MCP GitHub tool.
   */
  async pushToGitHub(options: GitHubPushOptions): Promise<GitHubPushResult> {
    const startTime = Date.now();
    const token = options.token ?? process.env.GITHUB_TOKEN ?? '';
    const branch = options.branch ?? 'main';
    const errors: string[] = [];
    let filesPushed = 0;
    let filesFailed = 0;

    if (!token) {
      return {
        success: false,
        filesPushed: 0,
        filesFailed: 0,
        errors: ['GitHub token required. Set GITHUB_TOKEN env or provide token parameter.'],
        durationMs: Date.now() - startTime,
      };
    }

    try {
      const files = this.scanWorkspace(options.workspacePath);

      for (const filePath of files) {
        const relativePath = path.relative(options.workspacePath, filePath).replace(/\\/g, '/');
        const content = fs.readFileSync(filePath, 'utf-8');
        const encodedContent = Buffer.from(content).toString('base64');

        try {
          const sha = await this.getExistingFileSha(token, options.owner, options.repo, relativePath, branch);

          const body: Record<string, unknown> = {
            message: options.message,
            content: encodedContent,
            branch,
          };
          if (sha) body.sha = sha;

          const url = `https://api.github.com/repos/${options.owner}/${options.repo}/contents/${relativePath}`;
          const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify(body),
          });

          if (response.ok) {
            filesPushed++;
            console.log(`[export-engine] Pushed: ${relativePath}`);
          } else {
            const errText = await response.text();
            filesFailed++;
            errors.push(`${relativePath}: ${errText.slice(0, 100)}`);
          }
        } catch (err: any) {
          filesFailed++;
          errors.push(`${relativePath}: ${err.message}`);
        }
      }

      const success = filesFailed === 0;
      console.log(`[export-engine] GitHub push: ${filesPushed} pushed, ${filesFailed} failed`);

      return {
        success,
        filesPushed,
        filesFailed,
        errors,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        filesPushed,
        filesFailed,
        errors: [...errors, err.message],
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate environment template file.
   */
  generateEnvTemplate(workspacePath: string): string {
    const envPath = path.join(workspacePath, '.env.example');
    const content = `# Build.Same Generated Application
# Copy this file to .env and fill in the values

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"

# Authentication
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# API Keys (if applicable)
# OPENAI_API_KEY="sk-..."
# STRIPE_SECRET_KEY="sk_..."
`;

    fs.writeFileSync(envPath, content, 'utf-8');
    return envPath;
  }

  /**
   * Generate README.md for the exported project.
   */
  generateReadme(workspacePath: string, projectName: string): string {
    const readmePath = path.join(workspacePath, 'README.md');
    const content = `# ${projectName}

Generated by Build.Same Engine

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev
\`\`\`

## Project Structure

\`\`\`
├── src/
│   ├── app/          # Next.js App Router pages
│   ├── components/   # React components
│   └── lib/          # Utility libraries
├── prisma/           # Database schema
└── public/           # Static assets
\`\`\`

## Environment Variables

See \`.env.example\` for required environment variables.

## Deployment

This application can be deployed to:
- Vercel (recommended)
- Netlify
- Any Node.js hosting provider

## Generated by Build.Same

This application was generated using Build.Same Engine v4.
`;

    fs.writeFileSync(readmePath, content, 'utf-8');
    return readmePath;
  }

  private createZipEntry(relativePath: string, uncompressed: Buffer, compressed: Buffer): ZipLocalFileHeader {
    const now = new Date();
    const dosTime = ((now.getSeconds() >> 1)) | (now.getMinutes() << 5) | (now.getHours() << 11);
    const dosDate = now.getDate() | ((now.getMonth() + 1) << 5) | ((now.getFullYear() - 1980) << 9);

    const fileNameBuffer = Buffer.from(relativePath, 'utf-8');

    return {
      signature: 0x04034b50,
      versionNeeded: 20,
      flags: 0,
      compressionMethod: 8, // DEFLATE
      lastModTime: dosTime,
      lastModDate: dosDate,
      crc32: this.crc32(uncompressed),
      compressedSize: compressed.length,
      uncompressedSize: uncompressed.length,
      fileNameLength: fileNameBuffer.length,
      extraFieldLength: 0,
      fileName: relativePath,
      extraField: Buffer.alloc(0),
      fileData: compressed,
    };
  }

  private buildZipFile(entries: ZipLocalFileHeader[]): Buffer {
    const parts: Buffer[] = [];
    const centralDirectory: Buffer[] = [];
    let offset = 0;

    // Write local file headers
    for (const entry of entries) {
      const header = Buffer.alloc(30 + entry.fileNameLength + entry.extraFieldLength);
      header.writeUInt32LE(entry.signature, 0);
      header.writeUInt16LE(entry.versionNeeded, 4);
      header.writeUInt16LE(entry.flags, 6);
      header.writeUInt16LE(entry.compressionMethod, 8);
      header.writeUInt16LE(entry.lastModTime, 10);
      header.writeUInt16LE(entry.lastModDate, 12);
      header.writeUInt32LE(entry.crc32, 14);
      header.writeUInt32LE(entry.compressedSize, 18);
      header.writeUInt32LE(entry.uncompressedSize, 22);
      header.writeUInt16LE(entry.fileNameLength, 26);
      header.writeUInt16LE(entry.extraFieldLength, 28);
      Buffer.from(entry.fileName, 'utf-8').copy(header, 30);

      parts.push(header);
      parts.push(entry.fileData);

      // Build central directory entry
      const cdEntry = Buffer.alloc(46 + entry.fileNameLength + entry.extraFieldLength + 0);
      cdEntry.writeUInt32LE(0x02014b50, 0);
      cdEntry.writeUInt16LE(20, 4); // version made by
      cdEntry.writeUInt16LE(entry.versionNeeded, 6);
      cdEntry.writeUInt16LE(entry.flags, 8);
      cdEntry.writeUInt16LE(entry.compressionMethod, 10);
      cdEntry.writeUInt16LE(entry.lastModTime, 12);
      cdEntry.writeUInt16LE(entry.lastModDate, 14);
      cdEntry.writeUInt32LE(entry.crc32, 16);
      cdEntry.writeUInt32LE(entry.compressedSize, 20);
      cdEntry.writeUInt32LE(entry.uncompressedSize, 24);
      cdEntry.writeUInt16LE(entry.fileNameLength, 28);
      cdEntry.writeUInt16LE(entry.extraFieldLength, 30);
      cdEntry.writeUInt16LE(0, 32); // file comment length
      cdEntry.writeUInt16LE(0, 34); // disk number start
      cdEntry.writeUInt16LE(0, 36); // internal file attributes
      cdEntry.writeUInt32LE(0, 38); // external file attributes
      cdEntry.writeUInt32LE(offset, 42); // relative offset of local header
      Buffer.from(entry.fileName, 'utf-8').copy(cdEntry, 46);

      centralDirectory.push(cdEntry);
      offset += 30 + entry.fileNameLength + entry.extraFieldLength + entry.compressedSize;
    }

    // Write central directory
    const cdOffset = offset;
    for (const cd of centralDirectory) {
      parts.push(cd);
      offset += cd.length;
    }

    // Write end of central directory
    const cdSize = offset - cdOffset;
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4); // disk number
    eocd.writeUInt16LE(0, 6); // disk with central directory
    eocd.writeUInt16LE(entries.length, 8); // entries on disk
    eocd.writeUInt16LE(entries.length, 10); // total entries
    eocd.writeUInt32LE(cdSize, 12);
    eocd.writeUInt32LE(cdOffset, 16);
    eocd.writeUInt16LE(0, 20); // comment length

    parts.push(eocd);

    return Buffer.concat(parts);
  }

  private crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i]!;
      for (let j = 0; j < 8; j++) {
        if (crc & 1) {
          crc = (crc >>> 1) ^ 0xedb88320;
        } else {
          crc = crc >>> 1;
        }
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private async getExistingFileSha(
    token: string,
    owner: string,
    repo: string,
    filePath: string,
    branch: string,
  ): Promise<string | null> {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (response.ok) {
        const data = await response.json() as Record<string, unknown>;
        return (data.sha as string) ?? null;
      }
      return null;
    } catch {
      return null;
    }
  }

  private scanWorkspace(dir: string): string[] {
    const results: string[] = [];
    const excludeDirs = new Set(['node_modules', '.next', '.git', 'dist', '.healing-memory.json']);

    const walk = (d: string) => {
      if (!fs.existsSync(d)) return;
      const items = fs.readdirSync(d, { withFileTypes: true });
      for (const item of items) {
        if (excludeDirs.has(item.name) || item.name.startsWith('.')) continue;
        const fullPath = path.join(d, item.name);
        if (item.isDirectory()) {
          walk(fullPath);
        } else if (item.isFile()) {
          results.push(fullPath);
        }
      }
    };

    walk(dir);
    return results;
  }
}
