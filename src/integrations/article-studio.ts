import type { AstroIntegration } from 'astro';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ArticleDocument } from '../types/article-document';

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
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

function validateSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  // lower case, alphanumeric and single hyphens, no traversal
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function generateMetaTs(meta: any, slug: string): string {
  const safeTitle = JSON.stringify(meta.title || 'Untitled Scroll');
  const safeDesc = JSON.stringify(meta.description || '');
  const safeAuthor = JSON.stringify(meta.author || 'Oracle of Orgs');
  const safeCat = JSON.stringify(meta.category || 'Architecture');
  const safeTags = JSON.stringify(Array.isArray(meta.tags) ? meta.tags : []);
  const safeRank = JSON.stringify(meta.rank || 'Mechanic');
  const safeReadingTime = JSON.stringify(meta.readingTime || '12 min');
  const aetherReward = typeof meta.aetherReward === 'number' ? meta.aetherReward : 120;
  const safeDate = JSON.stringify(meta.publishedDate || new Date().toISOString().split('T')[0]);
  const safeMeta = JSON.stringify(meta.meta || `${meta.readingTime || '12 min'} · ✦ ${aetherReward} Aether`);
  const status = JSON.stringify(meta.status || 'published');
  const featured = Boolean(meta.featured);
  const order = typeof meta.order === 'number' ? meta.order : 10;
  const wide = meta.wide !== undefined ? Boolean(meta.wide) : true;
  const cover = (meta.cover && typeof meta.cover === 'string' && meta.cover.trim() && meta.cover !== '/favicon.svg') ? JSON.stringify(meta.cover.trim()) : 'undefined';
  const coverCaption = (cover !== 'undefined' && meta.coverCaption && typeof meta.coverCaption === 'string' && meta.coverCaption.trim()) ? JSON.stringify(meta.coverCaption.trim()) : 'undefined';
  const thumbBg = meta.thumbBg
    ? JSON.stringify(meta.thumbBg)
    : JSON.stringify('repeating-linear-gradient(135deg,rgba(216,181,107,.08) 0 10px,rgba(216,181,107,.02) 10px 20px)');

  return `import type { ArticleMeta } from '../../types/article';

const meta: ArticleMeta = {
  title: ${safeTitle},
  description: ${safeDesc},
  author: ${safeAuthor},
  category: ${safeCat},
  tags: ${safeTags},
  rank: ${safeRank},
  readingTime: ${safeReadingTime},
  aetherReward: ${aetherReward},
  publishedDate: ${safeDate},
  meta: ${safeMeta},
  status: ${status},
  featured: ${featured},
  order: ${order},
  wide: ${wide},
  cover: ${cover},
  coverCaption: ${coverCaption},
  thumbBg: ${thumbBg},
};

export default meta;
`;
}

export default function articleStudioIntegration(): AstroIntegration {
  return {
    name: 'coven-article-studio',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'vite-plugin-coven-article-studio',
                configureServer(server) {
                  const rootDir = server.config.root || process.cwd();
                  const studioDir = path.join(rootDir, '.article-studio');
                  const draftsDir = path.join(studioDir, 'drafts');
                  const uploadsDir = path.join(studioDir, 'uploads');
                  const previewFile = path.join(studioDir, 'preview.json');
                  const articlesDir = path.join(rootDir, 'src', 'articles');
                  const publicArticlesDir = path.join(rootDir, 'public', 'articles');

                  // Ensure local storage directories exist
                  fs.mkdirSync(draftsDir, { recursive: true });
                  fs.mkdirSync(uploadsDir, { recursive: true });

                  server.middlewares.use(async (req, res, next) => {
                    const rawUrl = req.url || '';
                    const parsedUrl = new URL(rawUrl, 'http://localhost');
                    const pathname = parsedUrl.pathname;

                    // Only handle /__article-studio/ routes
                    if (!pathname.startsWith('/__article-studio/')) {
                      return next();
                    }

                    try {
                      // 1. GET /__article-studio/drafts
                      if (pathname === '/__article-studio/drafts' && req.method === 'GET') {
                        const files = await fsp.readdir(draftsDir);
                        const drafts: any[] = [];
                        for (const file of files) {
                          if (file.endsWith('.json')) {
                            try {
                              const content = await fsp.readFile(path.join(draftsDir, file), 'utf-8');
                              const doc = JSON.parse(content);
                              const stat = await fsp.stat(path.join(draftsDir, file));
                              drafts.push({
                                studioId: doc.studioId || file.replace('.json', ''),
                                slug: doc.slug || '',
                                title: doc.meta?.title || 'Untitled',
                                category: doc.meta?.category || 'Uncategorized',
                                status: doc.meta?.status || 'draft',
                                updatedAt: stat.mtimeMs,
                              });
                            } catch (e) {
                              // Ignore invalid draft
                            }
                          }
                        }
                        drafts.sort((a, b) => b.updatedAt - a.updatedAt);
                        return sendJson(res, 200, { drafts });
                      }

                      // 2. GET /__article-studio/drafts/:id
                      if (pathname.startsWith('/__article-studio/drafts/') && req.method === 'GET') {
                        const draftId = path.basename(pathname);
                        const safeId = sanitizeFilename(draftId).replace(/\.json$/, '');
                        const targetFile = path.join(draftsDir, `${safeId}.json`);
                        if (!fs.existsSync(targetFile)) {
                          return sendJson(res, 404, { error: 'Draft not found.' });
                        }
                        const content = await fsp.readFile(targetFile, 'utf-8');
                        return sendJson(res, 200, JSON.parse(content));
                      }

                      // 3. POST /__article-studio/draft
                      if (pathname === '/__article-studio/draft' && req.method === 'POST') {
                        const doc: ArticleDocument = await readJsonBody(req);
                        if (!doc || !doc.studioId) {
                          return sendJson(res, 400, { error: 'studioId is required.' });
                        }
                        const safeId = sanitizeFilename(doc.studioId);
                        const targetFile = path.join(draftsDir, `${safeId}.json`);
                        await fsp.writeFile(targetFile, JSON.stringify(doc, null, 2), 'utf-8');
                        return sendJson(res, 200, { success: true, studioId: safeId });
                      }

                      // 4. DELETE /__article-studio/drafts/:id
                      if (pathname.startsWith('/__article-studio/drafts/') && req.method === 'DELETE') {
                        const draftId = path.basename(pathname);
                        const safeId = sanitizeFilename(draftId).replace(/\.json$/, '');
                        const targetFile = path.join(draftsDir, `${safeId}.json`);
                        if (fs.existsSync(targetFile)) {
                          await fsp.unlink(targetFile);
                        }
                        return sendJson(res, 200, { success: true });
                      }

                      // 5. POST /__article-studio/preview
                      if (pathname === '/__article-studio/preview' && req.method === 'POST') {
                        const doc: ArticleDocument = await readJsonBody(req);
                        if (!doc) {
                          return sendJson(res, 400, { error: 'Invalid ArticleDocument.' });
                        }
                        await fsp.writeFile(previewFile, JSON.stringify(doc, null, 2), 'utf-8');
                        return sendJson(res, 200, { success: true, previewUrl: '/template-preview/article' });
                      }

                      // 6. GET /__article-studio/preview
                      if (pathname === '/__article-studio/preview' && req.method === 'GET') {
                        if (!fs.existsSync(previewFile)) {
                          return sendJson(res, 404, { error: 'No preview document available.' });
                        }
                        const content = await fsp.readFile(previewFile, 'utf-8');
                        return sendJson(res, 200, JSON.parse(content));
                      }

                      // 7. POST /__article-studio/upload
                      if (pathname === '/__article-studio/upload' && req.method === 'POST') {
                        const body = await readJsonBody(req);
                        const { filename, base64 } = body;
                        if (!filename || !base64) {
                          return sendJson(res, 400, { error: 'filename and base64 data are required.' });
                        }

                        const ext = path.extname(filename).toLowerCase();
                        if (!['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext)) {
                          return sendJson(res, 400, {
                            error: 'Only .png, .jpg, .jpeg, .webp, and .svg images are accepted.',
                          });
                        }

                        const safeName = `${Date.now()}_${sanitizeFilename(filename)}`;
                        const targetPath = path.join(uploadsDir, safeName);

                        // Strip data:image/...;base64, prefix if present
                        const cleanBase64 = base64.replace(/^data:image\/[a-z+]+;base64,/, '');
                        const buffer = Buffer.from(cleanBase64, 'base64');
                        await fsp.writeFile(targetPath, buffer);

                        return sendJson(res, 200, {
                          success: true,
                          filename: safeName,
                          url: `/__article-studio/uploads/${safeName}`,
                        });
                      }

                      // 8. GET /__article-studio/uploads/:filename
                      if (pathname.startsWith('/__article-studio/uploads/') && req.method === 'GET') {
                        const file = path.basename(pathname);
                        const safeName = sanitizeFilename(file);
                        const targetPath = path.join(uploadsDir, safeName);
                        if (!fs.existsSync(targetPath)) {
                          res.writeHead(404);
                          return res.end('Image not found.');
                        }
                        const ext = path.extname(safeName).toLowerCase();
                        const mimeMap: Record<string, string> = {
                          '.png': 'image/png',
                          '.jpg': 'image/jpeg',
                          '.jpeg': 'image/jpeg',
                          '.webp': 'image/webp',
                          '.svg': 'image/svg+xml',
                        };
                        res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
                        const stream = fs.createReadStream(targetPath);
                        return stream.pipe(res);
                      }

                      // 9. POST /__article-studio/publish
                      if (pathname === '/__article-studio/publish' && req.method === 'POST') {
                        const doc: ArticleDocument = await readJsonBody(req);
                        if (!doc || !doc.studioId) {
                          return sendJson(res, 400, { error: 'Valid studioId is required to publish.' });
                        }
                        if (doc.meta?.status !== 'published') {
                          return sendJson(res, 400, {
                            error: 'Set this scroll to Published before publishing.',
                          });
                        }
                        if (!doc.meta?.title?.trim()) {
                          return sendJson(res, 400, { error: 'Title is required.' });
                        }
                        if (!doc.sections || doc.sections.length === 0) {
                          return sendJson(res, 400, { error: 'Add at least one section before publishing.' });
                        }

                        const slug = (doc.slug || '').trim().toLowerCase();
                        if (!validateSlug(slug)) {
                          return sendJson(res, 400, {
                            error: 'Invalid slug. Must be lowercase alphanumeric characters and single hyphens.',
                          });
                        }

                        const articleFolder = path.join(articlesDir, slug);
                        const contentJsonPath = path.join(articleFolder, 'content.json');

                        // CRITICAL RULE 25: Collision check
                        if (fs.existsSync(articleFolder)) {
                          if (!fs.existsSync(contentJsonPath)) {
                            return sendJson(res, 409, {
                              error: 'This slug belongs to a manually-authored article.',
                            });
                          }
                          try {
                            const existingContent = JSON.parse(await fsp.readFile(contentJsonPath, 'utf-8'));
                            if (existingContent.studioId !== doc.studioId) {
                              return sendJson(res, 409, {
                                error: 'This slug belongs to another article. Choose a unique slug.',
                              });
                            }
                          } catch (e) {
                            return sendJson(res, 409, {
                              error: 'This slug belongs to a manually-authored article.',
                            });
                          }
                        }

                        // Create destination article folders
                        const articleImagesDir = path.join(articleFolder, 'images');
                        const publicArticleImagesDir = path.join(publicArticlesDir, slug, 'images');
                        await fsp.mkdir(articleImagesDir, { recursive: true });
                        await fsp.mkdir(publicArticleImagesDir, { recursive: true });

                        // Process referenced uploaded images
                        const processedDoc: ArticleDocument = JSON.parse(JSON.stringify(doc));
                        processedDoc.slug = slug;
                        processedDoc.meta.status = 'published';

                        async function processImageString(srcVal: string): Promise<string> {
                          if (srcVal && srcVal.includes('/__article-studio/uploads/')) {
                            const filename = path.basename(srcVal);
                            const sourcePath = path.join(uploadsDir, filename);
                            if (fs.existsSync(sourcePath)) {
                              const destPath = path.join(articleImagesDir, filename);
                              const pubDestPath = path.join(publicArticleImagesDir, filename);
                              await fsp.copyFile(sourcePath, destPath);
                              await fsp.copyFile(sourcePath, pubDestPath);
                              return `/articles/${slug}/images/${filename}`;
                            }
                          }
                          return srcVal;
                        }

                        // Cover rewrite
                        if (processedDoc.meta.cover) {
                          processedDoc.meta.cover = await processImageString(processedDoc.meta.cover);
                        }

                        // Walk sections and blocks to migrate upload paths
                        for (const sec of processedDoc.sections) {
                          for (const blk of sec.blocks) {
                            const d = blk.data || {};
                            if (d.imageSrc) d.imageSrc = await processImageString(d.imageSrc);
                            if (d.src) d.src = await processImageString(d.src);
                            if (d.img1Src) d.img1Src = await processImageString(d.img1Src);
                            if (d.img2Src) d.img2Src = await processImageString(d.img2Src);
                            if (d.img3Src) d.img3Src = await processImageString(d.img3Src);
                            if (Array.isArray(d.cards)) {
                              for (const c of d.cards) {
                                if (c.src) c.src = await processImageString(c.src);
                              }
                            }
                          }
                        }

                        // Write content.json
                        await fsp.writeFile(contentJsonPath, JSON.stringify(processedDoc, null, 2), 'utf-8');

                        // Write index.astro
                        const indexAstroPath = path.join(articleFolder, 'index.astro');
                        const indexAstroContent = `---
import ArticleRenderer from '../../components/article/ArticleRenderer.astro';
import content from './content.json';
---

<ArticleRenderer document={content} />
`;
                        await fsp.writeFile(indexAstroPath, indexAstroContent, 'utf-8');

                        // Write meta.ts
                        const metaTsPath = path.join(articleFolder, 'meta.ts');
                        const metaTsContent = generateMetaTs(processedDoc.meta, slug);
                        await fsp.writeFile(metaTsPath, metaTsContent, 'utf-8');

                        // Update or remove draft if wanted
                        const draftPath = path.join(draftsDir, `${processedDoc.studioId}.json`);
                        await fsp.writeFile(draftPath, JSON.stringify(processedDoc, null, 2), 'utf-8');

                        return sendJson(res, 200, {
                          success: true,
                          slug,
                          articleUrl: `/article/${slug}`,
                          libraryUrl: '/library',
                        });
                      }

                      // 10. POST /__article-studio/duplicate
                      if (pathname === '/__article-studio/duplicate' && req.method === 'POST') {
                        const body = await readJsonBody(req);
                        const originalDoc: ArticleDocument = body.document;
                        if (!originalDoc) {
                          return sendJson(res, 400, { error: 'Document is required to duplicate.' });
                        }
                        const newStudioId = `studio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                        const duplicatedDoc: ArticleDocument = JSON.parse(JSON.stringify(originalDoc));
                        duplicatedDoc.studioId = newStudioId;

                        // Intelligent title and slug duplication:
                        const rawTitle = (originalDoc.meta?.title || 'Untitled').trim();
                        const baseTitle = rawTitle
                          .replace(/\s*[—–-]\s*Copy(?:\s+\d+)?$/i, '')
                          .replace(/(?:\s*\(Copy\))+$/i, '')
                          .trim();

                        const rawSlug = (originalDoc.slug || 'article').trim();
                        const baseSlug = rawSlug
                          .replace(/(?:-copy)+(-\d+)?$/i, '')
                          .trim();

                        // Read all existing drafts to determine next copy index
                        const files = await fsp.readdir(draftsDir);
                        const existingTitles = new Set<string>();
                        const existingSlugs = new Set<string>();

                        for (const file of files) {
                          if (file.endsWith('.json')) {
                            try {
                              const draftContent = await fsp.readFile(path.join(draftsDir, file), 'utf-8');
                              const d = JSON.parse(draftContent);
                              if (d.meta?.title) existingTitles.add(d.meta.title.toLowerCase());
                              if (d.slug) existingSlugs.add(d.slug.toLowerCase());
                            } catch (e) {}
                          }
                        }

                        let copyTitle = `${baseTitle} — Copy`;
                        let copySlug = `${baseSlug}-copy`;
                        let counter = 2;

                        while (existingTitles.has(copyTitle.toLowerCase()) || existingSlugs.has(copySlug.toLowerCase())) {
                          copyTitle = `${baseTitle} — Copy ${counter}`;
                          copySlug = `${baseSlug}-copy-${counter}`;
                          counter++;
                        }

                        duplicatedDoc.meta.title = copyTitle;
                        duplicatedDoc.slug = copySlug;
                        duplicatedDoc.meta.status = 'draft';

                        const targetFile = path.join(draftsDir, `${newStudioId}.json`);
                        await fsp.writeFile(targetFile, JSON.stringify(duplicatedDoc, null, 2), 'utf-8');

                        return sendJson(res, 200, {
                          success: true,
                          draft: duplicatedDoc,
                        });
                      }

                      // 11. GET /__article-studio/published
                      if (pathname === '/__article-studio/published' && req.method === 'GET') {
                        const articleDirs = await fsp.readdir(articlesDir);
                        const studioArticles: any[] = [];
                        for (const dir of articleDirs) {
                          if (dir.startsWith('_')) continue;
                          const contentPath = path.join(articlesDir, dir, 'content.json');
                          if (fs.existsSync(contentPath)) {
                            try {
                              const content = JSON.parse(await fsp.readFile(contentPath, 'utf-8'));
                              if (content.studioId) {
                                studioArticles.push({
                                  slug: dir,
                                  studioId: content.studioId,
                                  title: content.meta?.title || dir,
                                  category: content.meta?.category || '',
                                  status: content.meta?.status || 'published',
                                });
                              }
                            } catch (e) {
                              // Ignore invalid JSON
                            }
                          }
                        }
                        return sendJson(res, 200, { articles: studioArticles });
                      }

                      return sendJson(res, 404, { error: 'Endpoint not found.' });
                    } catch (error: any) {
                      console.error('[Article Studio Middleware Error]', error);
                      return sendJson(res, 500, { error: error.message || 'Internal Server Error' });
                    }
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
