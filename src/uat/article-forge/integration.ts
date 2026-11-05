import type { AstroIntegration } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getUatAdminCenterHtml } from './integration/admin-center-html';

function sanitizeStudioId(id: any): string | null {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  if (!trimmed || !/^[a-zA-Z0-9_-]+$/.test(trimmed) || trimmed.length > 100) return null;
  if (trimmed.includes('..')) return null;
  return trimmed;
}

function sanitizeFilename(filename: any): string | null {
  if (typeof filename !== 'string') return null;
  const base = path.basename(filename.trim());
  if (!base || base.includes('..')) return null;
  const clean = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return clean || null;
}

const ALLOWED_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      // Protect against massive payloads (> 25MB)
      if (data.length > 25 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  });
  res.end(JSON.stringify(data));
}

function validateGridGeometry(sec: any): { valid: boolean; reason?: string } {
  if (!sec || !sec.visualGrid) return { valid: true };
  const vg = sec.visualGrid;
  const cols = vg.columns || 4;
  const rows = vg.rows || 4;
  const slots = Array.isArray(vg.layoutItems) ? vg.layoutItems : (Array.isArray(vg.slots) ? vg.slots : []);

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s.columnStart < 1 || s.rowStart < 1) {
      return { valid: false, reason: `Slot ${s.id || i} start coordinates must be >= 1` };
    }
    const colEnd = s.columnEnd || (s.columnStart + (s.columnSpan || 1));
    const rowEnd = s.rowEnd || (s.rowStart + (s.rowSpan || 1));
    if (colEnd <= s.columnStart || rowEnd <= s.rowStart) {
      return { valid: false, reason: `Slot ${s.id || i} end coordinates must exceed start coordinates` };
    }
    if (colEnd > cols + 1 || rowEnd > rows + 1) {
      return { valid: false, reason: `Slot ${s.id || i} exceeds grid boundaries (${cols}x${rows})` };
    }

    // Check collision against previous slots
    for (let j = 0; j < i; j++) {
      const other = slots[j];
      const otherColEnd = other.columnEnd || (other.columnStart + (other.columnSpan || 1));
      const otherRowEnd = other.rowEnd || (other.rowStart + (other.rowSpan || 1));
      const colOverlap = Math.max(s.columnStart, other.columnStart) < Math.min(colEnd, otherColEnd);
      const rowOverlap = Math.max(s.rowStart, other.rowStart) < Math.min(rowEnd, otherRowEnd);
      if (colOverlap && rowOverlap) {
        return { valid: false, reason: `Slot collision between ${s.id || i} and ${other.id || j}` };
      }
    }

    // Check block type inside slot
    if (s.block) {
      if (s.block.type === 'flex-layout') {
        return { valid: false, reason: `Slot ${s.id} contains forbidden flex-layout` };
      }
    }
  }

  return { valid: true };
}

function deepCloneAndRegenerateIds(doc: any, newStudioId: string): any {
  const cloned = JSON.parse(JSON.stringify(doc));
  cloned.studioId = newStudioId;
  cloned.meta = cloned.meta || {};
  cloned.meta.title = (cloned.meta.title || 'Untitled') + ' (Copy)';
  cloned.slug = (cloned.slug || 'untitled') + '-copy';

  const uid = (prefix: string) => prefix + '_' + Math.random().toString(36).substring(2, 9);

  if (Array.isArray(cloned.sections)) {
    cloned.sections.forEach((sec: any) => {
      sec.id = uid('sec');
      if (sec.visualGrid) {
        const items = Array.isArray(sec.visualGrid.layoutItems) ? sec.visualGrid.layoutItems : (Array.isArray(sec.visualGrid.slots) ? sec.visualGrid.slots : []);
        sec.visualGrid.layoutItems = items.map((slot: any) => {
          const newSlot = { ...slot, id: uid('item') };
          if (newSlot.block) {
            newSlot.block = { ...newSlot.block, id: uid('blk') };
            // Regenerate nested blocks if composite (like callout)
            if (newSlot.block.data && Array.isArray(newSlot.block.data.blocks)) {
              newSlot.block.data.blocks = newSlot.block.data.blocks.map((child: any) => ({
                ...child,
                id: uid('blk')
              }));
            }
          }
          return newSlot;
        });
        delete sec.visualGrid.slots;
      }
      delete sec.layout;
      if (Array.isArray(sec.blocks)) {
        sec.blocks.forEach((b: any) => {
          b.id = uid('blk');
        });
      }
    });
  }

  return cloned;
}

function copyDirectoryRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function rewriteAssetUrlsInDoc(doc: any, oldStudioId: string, newStudioId: string): any {
  const jsonStr = JSON.stringify(doc);
  const oldPrefix = '/__uat-article-forge/assets/' + oldStudioId + '/';
  const newPrefix = '/__uat-article-forge/assets/' + newStudioId + '/';
  const replaced = jsonStr.split(oldPrefix).join(newPrefix);
  return JSON.parse(replaced);
}

export default function uatArticleForgeIntegration(): AstroIntegration {
  return {
    name: 'coven-uat-article-forge',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'vite-plugin-coven-uat-article-forge',
                configureServer(server) {
                  const rootDir = server.config.root || process.cwd();
                  const uatDir = path.join(rootDir, '.uat-article-forge');
                  const draftsDir = path.join(uatDir, 'drafts');
                  const uploadsDir = path.join(uatDir, 'uploads');
                  const tempDir = path.join(uatDir, 'temp');

                  server.middlewares.use(async (req, res, next) => {
                    const rawUrl = req.url || '';
                    const parsedUrl = new URL(rawUrl, 'http://localhost');
                    const pathname = parsedUrl.pathname;

                    // Pre-sync requested draft for preview when ?draft= is passed in URL
                    if (pathname === '/lab/layout-forge/preview') {
                      const draftId = sanitizeStudioId(parsedUrl.searchParams.get('draft'));
                      if (draftId) {
                        const draftPath = path.join(draftsDir, draftId + '.json');
                        if (fs.existsSync(draftPath)) {
                          try {
                            fs.mkdirSync(tempDir, { recursive: true });
                            fs.copyFileSync(draftPath, path.join(tempDir, 'preview.json'));
                          } catch (e) {}
                        }
                      }
                      return next();
                    }

                    // Strictly filter to UAT authoring endpoint namespace
                    if (!pathname.startsWith('/__uat-article-forge/')) {
                      return next();
                    }

                    // 1. GET /__uat-article-forge/drafts - List all UAT drafts (read-only purity)
                    if (pathname === '/__uat-article-forge/drafts' && req.method === 'GET') {
                      try {
                        if (!fs.existsSync(draftsDir)) {
                          return sendJson(res, 200, { ok: true, drafts: [] });
                        }
                        const files = fs.readdirSync(draftsDir).filter(f => f.endsWith('.json'));
                        const drafts: any[] = [];

                        for (const file of files) {
                          const filePath = path.join(draftsDir, file);
                          try {
                            const content = fs.readFileSync(filePath, 'utf-8');
                            const doc = JSON.parse(content);
                            const studioId = doc.studioId || path.basename(file, '.json');
                            
                            // Calculate counts
                            let slotCount = 0;
                            let blockCount = 0;
                            if (Array.isArray(doc.sections)) {
                              for (const sec of doc.sections) {
                                if (sec.visualGrid) {
                                  const items = Array.isArray(sec.visualGrid.layoutItems) ? sec.visualGrid.layoutItems : (Array.isArray(sec.visualGrid.slots) ? sec.visualGrid.slots : []);
                                  slotCount += items.length;
                                  for (const s of items) {
                                    if (s.block) blockCount++;
                                  }
                                }
                                if (Array.isArray(sec.blocks)) {
                                  blockCount += sec.blocks.length;
                                }
                              }
                            }

                            drafts.push({
                              studioId,
                              title: doc.meta?.title || 'Untitled Scroll',
                              slug: doc.slug || '',
                              category: doc.meta?.category || 'General',
                              difficulty: doc.meta?.difficulty || 'Lv. 1',
                              sectionCount: Array.isArray(doc.sections) ? doc.sections.length : 0,
                              slotCount,
                              blockCount,
                              status: doc.status || 'draft',
                              revision: doc.revision || 1,
                              createdAt: doc.createdAt || new Date().toISOString(),
                              updatedAt: doc.updatedAt || new Date().toISOString(),
                            });
                          } catch (parseErr: any) {
                            drafts.push({
                              studioId: path.basename(file, '.json'),
                              title: `[Corrupt Draft: ${file}]`,
                              corrupt: true,
                              error: parseErr.message,
                              updatedAt: new Date().toISOString(),
                              createdAt: new Date().toISOString(),
                              sectionCount: 0,
                              slotCount: 0,
                              blockCount: 0,
                              revision: 0
                            });
                          }
                        }

                        // Sort updatedAt DESC
                        drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

                        return sendJson(res, 200, { ok: true, drafts });
                      } catch (err: any) {
                        return sendJson(res, 500, { ok: false, error: err.message });
                      }
                    }

                    // 2. GET /__uat-article-forge/drafts/:id - Read single UAT draft
                    const draftGetMatch = pathname.match(/^\/__uat-article-forge\/drafts\/([^/]+)$/);
                    if (draftGetMatch && req.method === 'GET') {
                      const id = sanitizeStudioId(draftGetMatch[1]);
                      if (!id) {
                        return sendJson(res, 400, { ok: false, error: 'Invalid studioId format' });
                      }

                      const filePath = path.join(draftsDir, id + '.json');
                      if (!fs.existsSync(filePath)) {
                        return sendJson(res, 404, { ok: false, error: 'Draft not found' });
                      }

                      try {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const doc = JSON.parse(content);

                        // Validate grid geometry
                        if (Array.isArray(doc.sections)) {
                          for (const sec of doc.sections) {
                            const geomCheck = validateGridGeometry(sec);
                            if (!geomCheck.valid) {
                              return sendJson(res, 400, { ok: false, error: geomCheck.reason, draft: doc });
                            }
                          }
                        }

                        return sendJson(res, 200, { ok: true, draft: doc });
                      } catch (err: any) {
                        return sendJson(res, 400, { ok: false, error: 'Corrupt draft JSON: ' + err.message });
                      }
                    }

                    // 3. POST /__uat-article-forge/draft - Save UAT draft (atomic write + stale protection)
                    if (pathname === '/__uat-article-forge/draft' && req.method === 'POST') {
                      try {
                        const body = await readJsonBody(req);
                        const doc = body.doc || body;
                        const expectedRevision = body.expectedRevision !== undefined ? Number(body.expectedRevision) : undefined;

                        if (!doc || typeof doc !== 'object') {
                          return sendJson(res, 400, { ok: false, error: 'Missing document payload' });
                        }

                        const studioId = sanitizeStudioId(doc.studioId);
                        if (!studioId) {
                          return sendJson(res, 400, { ok: false, error: 'Valid studioId required' });
                        }

                        // Validate sections and grid
                        if (!Array.isArray(doc.sections)) {
                          return sendJson(res, 400, { ok: false, error: 'Sections array required' });
                        }

                        for (const sec of doc.sections) {
                          const geomCheck = validateGridGeometry(sec);
                          if (!geomCheck.valid) {
                            return sendJson(res, 400, { ok: false, error: geomCheck.reason });
                          }
                        }

                        // Ensure storage directories exist during write operation
                        fs.mkdirSync(draftsDir, { recursive: true });
                        fs.mkdirSync(tempDir, { recursive: true });

                        const destPath = path.join(draftsDir, studioId + '.json');
                        let nextRevision = 1;
                        let createdAt = doc.createdAt || new Date().toISOString();

                        // Concurrency check if file already exists
                        if (fs.existsSync(destPath)) {
                          try {
                            const existing = JSON.parse(fs.readFileSync(destPath, 'utf-8'));
                            const diskRevision = Number(existing.revision) || 1;
                            if (expectedRevision !== undefined && expectedRevision !== diskRevision) {
                              return sendJson(res, 409, {
                                ok: false,
                                error: 'conflict',
                                message: 'This draft was updated in another tab.',
                                currentRevision: diskRevision,
                                updatedAt: existing.updatedAt
                              });
                            }
                            nextRevision = diskRevision + 1;
                            if (existing.createdAt) createdAt = existing.createdAt;
                          } catch (e) {
                            nextRevision = (doc.revision || 1) + 1;
                          }
                        }

                        doc.studioId = studioId;
                        doc.revision = nextRevision;
                        doc.createdAt = createdAt;
                        doc.updatedAt = new Date().toISOString();

                        // Enforce single authoritative layout contract on disk: visualGrid.layoutItems
                        if (Array.isArray(doc.sections)) {
                          for (const sec of doc.sections) {
                            if (sec.visualGrid) {
                              if (!Array.isArray(sec.visualGrid.layoutItems) && Array.isArray(sec.visualGrid.slots)) {
                                sec.visualGrid.layoutItems = sec.visualGrid.slots;
                              }
                              if (!Array.isArray(sec.visualGrid.layoutItems)) {
                                sec.visualGrid.layoutItems = [];
                              }
                              delete sec.visualGrid.slots;
                            }
                            delete sec.layout;
                          }
                        }

                        // Atomic write via temp file
                        const tempFile = path.join(tempDir, `temp_${studioId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.json`);
                        fs.writeFileSync(tempFile, JSON.stringify(doc, null, 2), 'utf-8');
                        fs.renameSync(tempFile, destPath);

                        return sendJson(res, 200, {
                          ok: true,
                          studioId: doc.studioId,
                          revision: doc.revision,
                          updatedAt: doc.updatedAt,
                          createdAt: doc.createdAt
                        });
                      } catch (err: any) {
                        return sendJson(res, 500, { ok: false, error: err.message });
                      }
                    }

                    // 4. DELETE /__uat-article-forge/drafts/:id - Delete UAT draft and its owned assets
                    const draftDeleteMatch = pathname.match(/^\/__uat-article-forge\/drafts\/([^/]+)$/);
                    if (draftDeleteMatch && req.method === 'DELETE') {
                      const id = sanitizeStudioId(draftDeleteMatch[1]);
                      if (!id) {
                        return sendJson(res, 400, { ok: false, error: 'Invalid studioId format' });
                      }

                      const filePath = path.join(draftsDir, id + '.json');
                      if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                      }

                      // Safely remove owned uploads directory
                      const draftUploadsDir = path.join(uploadsDir, id);
                      if (fs.existsSync(draftUploadsDir)) {
                        fs.rmSync(draftUploadsDir, { recursive: true, force: true });
                      }

                      return sendJson(res, 200, { ok: true, deletedId: id });
                    }

                    // 5. POST /__uat-article-forge/duplicate - Duplicate UAT draft
                    if (pathname === '/__uat-article-forge/duplicate' && req.method === 'POST') {
                      try {
                        const body = await readJsonBody(req);
                        const sourceId = sanitizeStudioId(body.studioId);
                        if (!sourceId) {
                          return sendJson(res, 400, { ok: false, error: 'Source studioId required' });
                        }

                        const sourcePath = path.join(draftsDir, sourceId + '.json');
                        if (!fs.existsSync(sourcePath)) {
                          return sendJson(res, 404, { ok: false, error: 'Source draft not found' });
                        }

                        const sourceDoc = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
                        const newStudioId = 'uat_draft_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

                        let clonedDoc = deepCloneAndRegenerateIds(sourceDoc, newStudioId);

                        // Duplicate assets if present
                        const sourceUploads = path.join(uploadsDir, sourceId);
                        const newUploads = path.join(uploadsDir, newStudioId);
                        if (fs.existsSync(sourceUploads)) {
                          copyDirectoryRecursive(sourceUploads, newUploads);
                          clonedDoc = rewriteAssetUrlsInDoc(clonedDoc, sourceId, newStudioId);
                        }

                        clonedDoc.revision = 1;
                        clonedDoc.createdAt = new Date().toISOString();
                        clonedDoc.updatedAt = new Date().toISOString();

                        // Write new draft atomically
                        fs.mkdirSync(draftsDir, { recursive: true });
                        fs.mkdirSync(tempDir, { recursive: true });
                        const tempFile = path.join(tempDir, `temp_${newStudioId}_${Date.now()}.json`);
                        fs.writeFileSync(tempFile, JSON.stringify(clonedDoc, null, 2), 'utf-8');
                        fs.renameSync(tempFile, path.join(draftsDir, newStudioId + '.json'));

                        return sendJson(res, 200, { ok: true, newStudioId, doc: clonedDoc });
                      } catch (err: any) {
                        return sendJson(res, 500, { ok: false, error: err.message });
                      }
                    }

                    // 6. POST /__uat-article-forge/upload - Upload isolated UAT image
                    if (pathname === '/__uat-article-forge/upload' && req.method === 'POST') {
                      try {
                        const body = await readJsonBody(req);
                        const studioId = sanitizeStudioId(body.studioId);
                        if (!studioId) {
                          return sendJson(res, 400, { ok: false, error: 'Valid studioId required' });
                        }

                        const rawFilename = sanitizeFilename(body.filename || 'image.png');
                        if (!rawFilename) {
                          return sendJson(res, 400, { ok: false, error: 'Valid filename required' });
                        }

                        const ext = path.extname(rawFilename).toLowerCase();
                        if (!ALLOWED_IMAGE_EXTS.has(ext)) {
                          return sendJson(res, 400, { ok: false, error: 'Image format not supported. Permitted: png, jpg, jpeg, webp, gif' });
                        }

                        let dataBuffer: Buffer;
                        if (typeof body.data === 'string') {
                          const base64Data = body.data.includes(',') ? body.data.split(',')[1] : body.data;
                          dataBuffer = Buffer.from(base64Data, 'base64');
                        } else {
                          return sendJson(res, 400, { ok: false, error: 'Base64 image data required' });
                        }

                        // Path traversal check
                        const draftUploadsDir = path.join(uploadsDir, studioId);
                        const targetPath = path.join(draftUploadsDir, rawFilename);
                        const rel = path.relative(uploadsDir, targetPath);
                        if (rel.startsWith('..') || path.isAbsolute(rel)) {
                          return sendJson(res, 403, { ok: false, error: 'Access denied: invalid path traversal' });
                        }

                        fs.mkdirSync(draftUploadsDir, { recursive: true });
                        fs.writeFileSync(targetPath, dataBuffer);

                        const url = `/__uat-article-forge/assets/${studioId}/${rawFilename}`;
                        return sendJson(res, 200, { ok: true, url, filename: rawFilename });
                      } catch (err: any) {
                        return sendJson(res, 500, { ok: false, error: err.message });
                      }
                    }

                    // 7. GET /__uat-article-forge/assets/:studioId/:filename - Serve isolated UAT image
                    const assetMatch = pathname.match(/^\/__uat-article-forge\/assets\/([^/]+)\/([^/]+)$/);
                    if (assetMatch && req.method === 'GET') {
                      const studioId = sanitizeStudioId(assetMatch[1]);
                      const filename = sanitizeFilename(assetMatch[2]);

                      if (!studioId || !filename) {
                        res.writeHead(400);
                        return res.end('Invalid asset path');
                      }

                      const targetPath = path.join(uploadsDir, studioId, filename);
                      const rel = path.relative(uploadsDir, targetPath);
                      if (rel.startsWith('..') || path.isAbsolute(rel)) {
                        res.writeHead(403);
                        return res.end('Access denied');
                      }

                      if (!fs.existsSync(targetPath)) {
                        res.writeHead(404);
                        return res.end('Asset not found');
                      }

                      const ext = path.extname(filename).toLowerCase();
                      const mimeMap: Record<string, string> = {
                        '.png': 'image/png',
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.webp': 'image/webp',
                        '.gif': 'image/gif',
                      };

                      res.writeHead(200, {
                        'Content-Type': mimeMap[ext] || 'application/octet-stream',
                        'Cache-Control': 'no-cache',
                      });
                      return res.end(fs.readFileSync(targetPath));
                    }

                    // 8. POST /__uat-article-forge/preview - Temporary preview state
                    if (pathname === '/__uat-article-forge/preview' && req.method === 'POST') {
                      try {
                        const body = await readJsonBody(req);
                        fs.mkdirSync(tempDir, { recursive: true });
                        fs.writeFileSync(path.join(tempDir, 'preview.json'), JSON.stringify(body.doc || body), 'utf-8');
                        return sendJson(res, 200, { ok: true, previewUrl: '/lab/layout-forge/preview' });
                      } catch (err: any) {
                        return sendJson(res, 500, { ok: false, error: err.message });
                      }
                    }

                    // 9. GET /__uat-article-forge/preview - Read temporary preview state
                    if (pathname === '/__uat-article-forge/preview' && req.method === 'GET') {
                      const previewPath = path.join(tempDir, 'preview.json');
                      if (fs.existsSync(previewPath)) {
                        return sendJson(res, 200, { ok: true, doc: JSON.parse(fs.readFileSync(previewPath, 'utf-8')) });
                      }
                      return sendJson(res, 404, { ok: false, error: 'No preview state active' });
                    }

                    // Default fallback for unmatched UAT paths
                    return sendJson(res, 404, { ok: false, error: 'Unknown UAT endpoint' });
                  });
                },
              },
            ],
          },
        });
      },
    },
  };
}
