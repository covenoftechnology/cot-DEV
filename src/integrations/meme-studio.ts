import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  getAllMemeCategoryObjects,
  saveMemeCategoryObjects,
  resolveMemeCategory,
  countMemesUsingCategory,
  getMemeCategories,
  getMemeCategoryGlyphs,
  getAllMemes,
  getMemeById,
  getMemeBySlug,
  isValidMemeSlug,
  normalizeMemeSlug,
  validateMemeDocument,
  type MemeCategory,
  type MemeDocument,
} from '../lib/memes';

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function isSafeSlugPath(baseDir: string, slug: string): boolean {
  if (!isValidMemeSlug(slug)) return false;
  const target = path.resolve(baseDir, slug);
  const rel = path.relative(baseDir, target);
  return !rel.startsWith('..') && !path.isAbsolute(rel) && !rel.includes(path.sep + '..');
}

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename || '');
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

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

/**
 * Verifies that `imageSrc` points to an existing file in `src/memes/<slug>/images/<filename>`.
 */
function verifyMemeImageExistsOnDisk(memesDir: string, slug: string, imageSrc: string): boolean {
  if (!imageSrc || typeof imageSrc !== 'string') return false;
  const expectedPrefix = `/memes/${slug}/images/`;
  if (!imageSrc.startsWith(expectedPrefix)) return false;
  const filename = imageSrc.slice(expectedPrefix.length);
  if (!filename || sanitizeFilename(filename) !== filename) return false;
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) return false;
  const filePath = path.join(memesDir, slug, 'images', filename);
  return fs.existsSync(filePath);
}

/**
 * Removes unreferenced image files inside `src/memes/<slug>/images/` after saving a meme,
 * keeping only the active image referenced by `imageSrc`.
 */
async function cleanupUnreferencedMemeImages(memesDir: string, slug: string, activeImageSrc: string) {
  const imagesDir = path.join(memesDir, slug, 'images');
  if (!fs.existsSync(imagesDir)) return;
  const expectedPrefix = `/memes/${slug}/images/`;
  const activeFile = activeImageSrc && activeImageSrc.startsWith(expectedPrefix)
    ? activeImageSrc.slice(expectedPrefix.length)
    : null;
  try {
    const files = await fsp.readdir(imagesDir);
    for (const file of files) {
      if (activeFile && file === activeFile) continue;
      if (file.startsWith('.')) continue;
      await fsp.unlink(path.join(imagesDir, file)).catch(() => {});
    }
  } catch (_) {}
}

function formatPersistedMeme(doc: MemeDocument) {
  return {
    id: doc.id,
    slug: doc.slug,
    status: doc.status,
    caption: doc.caption,
    description: doc.description || '',
    categoryId: doc.categoryId,
    imageSrc: doc.imageSrc,
    imageAlt: doc.imageAlt || '',
    ...(doc.publishedAt ? { publishedAt: doc.publishedAt } : {}),
    ...(doc.publishDate ? { publishDate: doc.publishDate } : {}),
    featured: Boolean(doc.featured),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function ensureCategoryRegistered(categoryId: string, categoryName: string): void {
  if (!categoryId) return;
  const allCategories = getAllMemeCategoryObjects();
  const exists = allCategories.some(
    (c) => c.id.toLowerCase() === categoryId.toLowerCase() || c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (!exists) {
    const nowIso = new Date().toISOString();
    const newCategory: MemeCategory = {
      id: categoryId,
      name: categoryName || categoryId,
      glyph: '✦',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    allCategories.push(newCategory);
    saveMemeCategoryObjects(allCategories);
  }
}

/**
 * Handles `/memes/:slug/images/:filename` and `/__meme-studio/*` requests in Vite dev server.
 * Returns `true` if the request was handled, `false` otherwise.
 */
export async function handleMemeStudioRequest(
  req: IncomingMessage,
  res: ServerResponse,
  rootDir: string
): Promise<boolean> {
  const rawUrl = req.url || '';
  const parsedUrl = new URL(rawUrl, 'http://localhost');
  const pathname = decodeURIComponent(parsedUrl.pathname);
  const memesDir = path.join(rootDir, 'src', 'memes');

  fs.mkdirSync(memesDir, { recursive: true });

  // 1. Serve meme images directly from src/memes/<slug>/images/<filename> (SVG disallowed)
  const imageMatch = pathname.match(/^\/memes\/([^/]+)\/images\/([^/]+)$/);
  if (imageMatch && req.method === 'GET') {
    const [, slug, rawFile] = imageMatch;
    if (!isSafeSlugPath(memesDir, slug)) {
      res.writeHead(400);
      res.end('Invalid meme slug.');
      return true;
    }
    const safeFile = sanitizeFilename(rawFile);
    if (!safeFile || safeFile !== rawFile) {
      res.writeHead(400);
      res.end('Invalid image filename.');
      return true;
    }
    const ext = path.extname(safeFile).toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      res.writeHead(403);
      res.end('File type not permitted.');
      return true;
    }
    const targetPath = path.join(memesDir, slug, 'images', safeFile);
    if (!fs.existsSync(targetPath)) {
      res.writeHead(404);
      res.end('Meme image not found.');
      return true;
    }
    res.writeHead(200, {
      'Content-Type': MIME_MAP[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(targetPath).pipe(res);
    return true;
  }

  if (!pathname.startsWith('/__meme-studio/')) {
    return false;
  }

  try {
    // 2. GET /__meme-studio/memes
    if (pathname === '/__meme-studio/memes' && req.method === 'GET') {
      const memes = getAllMemes();
      const categories = getMemeCategories();
      const categoryObjects = getAllMemeCategoryObjects();
      const categoryGlyphs = getMemeCategoryGlyphs();
      sendJson(res, 200, {
        memes,
        categories,
        categoryObjects,
        categoryGlyphs,
      });
      return true;
    }

    // 2b. GET /__meme-studio/categories
    if (pathname === '/__meme-studio/categories' && req.method === 'GET') {
      const categories = getAllMemeCategoryObjects();
      const glyphs = getMemeCategoryGlyphs();
      sendJson(res, 200, {
        categories,
        glyphs,
      });
      return true;
    }

    // 2c. POST /__meme-studio/categories (Create or Edit category)
    if (pathname === '/__meme-studio/categories' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const rawName = typeof body?.name === 'string' ? body.name.trim() : '';
      const rawGlyph = typeof body?.glyph === 'string' ? body.glyph.trim() : '';
      const existingId = typeof body?.id === 'string' ? body.id.trim() : '';

      if (!rawName) {
        sendJson(res, 400, { error: 'Category name is required.' });
        return true;
      }

      const allCategories = getAllMemeCategoryObjects();
      const nowIso = new Date().toISOString();

      // Check duplicate names (excluding current editing category)
      const duplicate = allCategories.find(
        (c) => c.name.toLowerCase() === rawName.toLowerCase() && (!existingId || c.id !== existingId)
      );
      if (duplicate) {
        sendJson(res, 409, { error: `Category "${rawName}" already exists.` });
        return true;
      }

      if (existingId) {
        // Edit existing category
        const idx = allCategories.findIndex((c) => c.id === existingId);
        if (idx === -1) {
          sendJson(res, 404, { error: 'Category to edit was not found.' });
          return true;
        }

        const updatedCategory: MemeCategory = {
          ...allCategories[idx],
          name: rawName,
          glyph: rawGlyph || allCategories[idx].glyph || '✦',
          updatedAt: nowIso,
        };

        allCategories[idx] = updatedCategory;
        saveMemeCategoryObjects(allCategories);

        // With stable categoryId architecture, category name and glyph changes
        // are persisted strictly in categories.json. Zero meme.json files need mutation!

        sendJson(res, 200, { success: true, category: updatedCategory });
        return true;
      }

      // Create new category
      let newId = normalizeMemeSlug(rawName) || `cat_${Date.now().toString(36)}`;
      let counter = 1;
      while (allCategories.some((c) => c.id === newId)) {
        newId = `${normalizeMemeSlug(rawName)}-${counter++}`;
      }

      const newCategory: MemeCategory = {
        id: newId,
        name: rawName,
        glyph: rawGlyph || '✦',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      allCategories.push(newCategory);
      saveMemeCategoryObjects(allCategories);

      sendJson(res, 201, { success: true, category: newCategory });
      return true;
    }

    // 2d. DELETE /__meme-studio/categories/:id
    if (pathname.startsWith('/__meme-studio/categories/') && req.method === 'DELETE') {
      const catId = decodeURIComponent(path.basename(pathname));
      const allCategories = getAllMemeCategoryObjects();
      const targetCat = allCategories.find((c) => c.id === catId);

      if (!targetCat) {
        sendJson(res, 404, { error: 'Category not found.' });
        return true;
      }

      // Safe check: block deletion if category is in use
      const usage = countMemesUsingCategory(catId);
      if (usage.count > 0) {
        sendJson(res, 400, {
          error: `This category is used by ${usage.count} meme(s). Reassign those memes before deleting it.`,
          count: usage.count,
        });
        return true;
      }

      const filtered = allCategories.filter((c) => c.id !== catId);
      saveMemeCategoryObjects(filtered);

      sendJson(res, 200, { success: true, deletedId: catId });
      return true;
    }

    // 3. GET /__meme-studio/memes/:slug
    if (pathname.startsWith('/__meme-studio/memes/') && req.method === 'GET') {
      const slug = path.basename(pathname);
      if (!isSafeSlugPath(memesDir, slug)) {
        sendJson(res, 400, { error: 'Invalid meme slug.' });
        return true;
      }
      const meme = getMemeBySlug(slug);
      if (!meme) {
        sendJson(res, 404, { error: 'Meme not found.' });
        return true;
      }
      sendJson(res, 200, { meme });
      return true;
    }

    // 4. POST /__meme-studio/upload (Strictly rejects SVG)
    if (pathname === '/__meme-studio/upload' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { slug: rawSlug, memeId, filename, base64 } = body || {};

      if (!filename || !base64) {
        sendJson(res, 400, { error: 'filename and base64 image data are required.' });
        return true;
      }

      const lowerName = String(filename).toLowerCase();
      const ext = path.extname(lowerName);

      // Explicitly reject SVG
      if (ext === '.svg' || lowerName.endsWith('.svg') || String(base64).startsWith('data:image/svg+xml')) {
        sendJson(res, 400, {
          error: 'SVG images are not allowed for security reasons. Please upload PNG, JPG, WEBP, or GIF.',
        });
        return true;
      }

      if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
        sendJson(res, 400, {
          error: 'Only .png, .jpg, .jpeg, .webp, and .gif images are accepted.',
        });
        return true;
      }

      const slug = normalizeMemeSlug(rawSlug || '');
      if (!slug || !isSafeSlugPath(memesDir, slug)) {
        sendJson(res, 400, {
          error: 'A valid meme slug or caption is required before uploading an image.',
        });
        return true;
      }

      // Check that target folder does not belong to a different meme ID
      const existingAtSlug = getMemeBySlug(slug);
      if (existingAtSlug && memeId && existingAtSlug.id !== memeId) {
        sendJson(res, 409, {
          error: `Slug "${slug}" is already used by another meme. Choose a unique slug or caption first.`,
        });
        return true;
      }

      const safeBase = sanitizeFilename(filename);
      const safeName = `${Date.now()}_${safeBase}`;
      const imagesDir = path.join(memesDir, slug, 'images');
      await fsp.mkdir(imagesDir, { recursive: true });

      const cleanBase64 = String(base64).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      if (buffer.length === 0) {
        sendJson(res, 400, { error: 'Uploaded image buffer is empty.' });
        return true;
      }

      const targetPath = path.join(imagesDir, safeName);
      await fsp.writeFile(targetPath, buffer);

      const imageSrc = `/memes/${slug}/images/${safeName}`;
      sendJson(res, 200, {
        success: true,
        slug,
        filename: safeName,
        imageSrc,
      });
      return true;
    }

    // 5. POST /__meme-studio/save (Save Draft or Save Changes to Existing Meme)
    if (pathname === '/__meme-studio/save' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const rawDoc = body?.meme || body;
      const previousSlug = typeof body?.previousSlug === 'string' ? normalizeMemeSlug(body.previousSlug) : '';

      // Locate existing meme by stable ID first, or by previousSlug
      const existingById = rawDoc?.id ? getMemeById(rawDoc.id) : undefined;
      const existingByPrevSlug = !existingById && previousSlug ? getMemeBySlug(previousSlug) : undefined;
      const existingDoc = existingById || existingByPrevSlug || null;

      const targetSlug = normalizeMemeSlug(rawDoc?.slug || rawDoc?.caption || '');
      if (!targetSlug || !isSafeSlugPath(memesDir, targetSlug)) {
        sendJson(res, 400, {
          error: 'A valid caption or URL slug is required to save a meme.',
        });
        return true;
      }

      // Check slug collision against other memes
      const existingAtTarget = getMemeBySlug(targetSlug);
      if (existingAtTarget && (!existingDoc || existingAtTarget.id !== existingDoc.id)) {
        sendJson(res, 409, {
          error: `The slug "${targetSlug}" is already in use by another meme.`,
        });
        return true;
      }

      // Migrate images if slug changed from previousSlug or existingDoc.slug
      const sourceSlug = existingDoc?.slug || previousSlug;
      let resolvedImageSrc = typeof rawDoc?.imageSrc === 'string' ? rawDoc.imageSrc.trim() : '';

      if (sourceSlug && sourceSlug !== targetSlug && isSafeSlugPath(memesDir, sourceSlug)) {
        const oldFolder = path.join(memesDir, sourceSlug);
        const newFolder = path.join(memesDir, targetSlug);
        const oldImagesDir = path.join(oldFolder, 'images');
        const newImagesDir = path.join(newFolder, 'images');

        if (fs.existsSync(oldImagesDir)) {
          await fsp.mkdir(newImagesDir, { recursive: true });
          const files = await fsp.readdir(oldImagesDir);
          for (const f of files) {
            await fsp.copyFile(path.join(oldImagesDir, f), path.join(newImagesDir, f));
          }
        }

        if (resolvedImageSrc.startsWith(`/memes/${sourceSlug}/images/`)) {
          resolvedImageSrc = resolvedImageSrc.replace(
            `/memes/${sourceSlug}/images/`,
            `/memes/${targetSlug}/images/`
          );
        }

        const oldJsonPath = path.join(oldFolder, 'meme.json');
        let canRemoveOld = !fs.existsSync(oldJsonPath);
        if (!canRemoveOld && existingDoc && existingDoc.slug === sourceSlug) {
          canRemoveOld = true;
        }
        if (canRemoveOld && fs.existsSync(oldFolder)) {
          await fsp.rm(oldFolder, { recursive: true, force: true });
        }
      }

      const candidatePayload = {
        ...rawDoc,
        slug: targetSlug,
        imageSrc: resolvedImageSrc,
      };

      const isPublishing = candidatePayload.status === 'published';
      const validation = validateMemeDocument(candidatePayload, {
        requirePublishFields: isPublishing,
        existingDoc,
      });

      if (!validation.valid) {
        sendJson(res, 400, { error: validation.errors[0], errors: validation.errors });
        return true;
      }

      if (
        isPublishing &&
        !verifyMemeImageExistsOnDisk(memesDir, targetSlug, validation.document.imageSrc)
      ) {
        sendJson(res, 400, {
          error: 'A meme image is required before publishing. Please upload an image first.',
        });
        return true;
      }

      const memeFolder = path.join(memesDir, targetSlug);
      const memeImagesDir = path.join(memeFolder, 'images');
      await fsp.mkdir(memeImagesDir, { recursive: true });

      ensureCategoryRegistered(validation.document.categoryId, validation.document.category);

      const memeJsonPath = path.join(memeFolder, 'meme.json');
      await fsp.writeFile(memeJsonPath, JSON.stringify(formatPersistedMeme(validation.document), null, 2), 'utf-8');
      await cleanupUnreferencedMemeImages(memesDir, targetSlug, validation.document.imageSrc);

      sendJson(res, 200, {
        success: true,
        meme: validation.document,
      });
      return true;
    }

    // 6. POST /__meme-studio/publish
    if (pathname === '/__meme-studio/publish' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const previousSlug = typeof body?.previousSlug === 'string' ? normalizeMemeSlug(body.previousSlug) : '';

      let rawDoc = body?.meme || body;
      if (rawDoc && typeof rawDoc.slug === 'string' && !rawDoc.caption) {
        const stored = getMemeBySlug(rawDoc.slug);
        if (!stored) {
          sendJson(res, 404, { error: 'Meme not found.' });
          return true;
        }
        rawDoc = { ...stored, status: 'published' };
      }

      const existingById = rawDoc?.id ? getMemeById(rawDoc.id) : undefined;
      const existingBySlug = !existingById && rawDoc?.slug ? getMemeBySlug(normalizeMemeSlug(rawDoc.slug)) : undefined;
      const existingDoc = existingById || existingBySlug || null;

      const targetSlug = normalizeMemeSlug(rawDoc?.slug || rawDoc?.caption || '');
      if (!targetSlug || !isSafeSlugPath(memesDir, targetSlug)) {
        sendJson(res, 400, { error: 'A valid URL slug is required before publishing.' });
        return true;
      }

      const existingAtTarget = getMemeBySlug(targetSlug);
      if (existingAtTarget && (!existingDoc || existingAtTarget.id !== existingDoc.id)) {
        sendJson(res, 409, {
          error: `The slug "${targetSlug}" is already in use by another meme.`,
        });
        return true;
      }

      // Migrate images if slug changed before publish
      const sourceSlug = existingDoc?.slug || previousSlug;
      let resolvedImageSrc = typeof rawDoc?.imageSrc === 'string' ? rawDoc.imageSrc.trim() : '';

      if (sourceSlug && sourceSlug !== targetSlug && isSafeSlugPath(memesDir, sourceSlug)) {
        const oldFolder = path.join(memesDir, sourceSlug);
        const newFolder = path.join(memesDir, targetSlug);
        const oldImagesDir = path.join(oldFolder, 'images');
        const newImagesDir = path.join(newFolder, 'images');

        if (fs.existsSync(oldImagesDir)) {
          await fsp.mkdir(newImagesDir, { recursive: true });
          const files = await fsp.readdir(oldImagesDir);
          for (const f of files) {
            await fsp.copyFile(path.join(oldImagesDir, f), path.join(newImagesDir, f));
          }
        }

        if (resolvedImageSrc.startsWith(`/memes/${sourceSlug}/images/`)) {
          resolvedImageSrc = resolvedImageSrc.replace(
            `/memes/${sourceSlug}/images/`,
            `/memes/${targetSlug}/images/`
          );
        }

        const oldJsonPath = path.join(oldFolder, 'meme.json');
        let canRemoveOld = !fs.existsSync(oldJsonPath);
        if (!canRemoveOld && existingDoc && existingDoc.slug === sourceSlug) {
          canRemoveOld = true;
        }
        if (canRemoveOld && fs.existsSync(oldFolder)) {
          await fsp.rm(oldFolder, { recursive: true, force: true });
        }
      }

      const candidatePayload = {
        ...rawDoc,
        slug: targetSlug,
        imageSrc: resolvedImageSrc,
        status: 'published' as const,
      };

      const validation = validateMemeDocument(candidatePayload, {
        requirePublishFields: true,
        existingDoc,
      });

      if (!validation.valid) {
        sendJson(res, 400, { error: validation.errors[0], errors: validation.errors });
        return true;
      }

      if (!verifyMemeImageExistsOnDisk(memesDir, targetSlug, validation.document.imageSrc)) {
        sendJson(res, 400, {
          error: 'A meme image is required before publishing. Please upload an image first.',
        });
        return true;
      }

      const memeFolder = path.join(memesDir, targetSlug);
      const memeImagesDir = path.join(memeFolder, 'images');
      await fsp.mkdir(memeImagesDir, { recursive: true });

      ensureCategoryRegistered(validation.document.categoryId, validation.document.category);

      const memeJsonPath = path.join(memeFolder, 'meme.json');
      await fsp.writeFile(memeJsonPath, JSON.stringify(formatPersistedMeme(validation.document), null, 2), 'utf-8');
      await cleanupUnreferencedMemeImages(memesDir, targetSlug, validation.document.imageSrc);

      sendJson(res, 200, {
        success: true,
        meme: validation.document,
      });
      return true;
    }

    // 7. POST /__meme-studio/unpublish (Preserves original publishDate!)
    if (pathname === '/__meme-studio/unpublish' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const slug = normalizeMemeSlug(body?.slug || '');
      if (!slug || !isSafeSlugPath(memesDir, slug)) {
        sendJson(res, 400, { error: 'Valid meme slug is required to unpublish.' });
        return true;
      }

      const existing = getMemeBySlug(slug);
      if (!existing) {
        sendJson(res, 404, { error: 'Meme not found.' });
        return true;
      }

      const updated: MemeDocument = {
        ...existing,
        status: 'draft',
        // publishedAt & publishDate strictly preserved!
        updatedAt: new Date().toISOString(),
      };

      const memeJsonPath = path.join(memesDir, slug, 'meme.json');
      await fsp.writeFile(memeJsonPath, JSON.stringify(formatPersistedMeme(updated), null, 2), 'utf-8');

      sendJson(res, 200, {
        success: true,
        meme: updated,
      });
      return true;
    }

    sendJson(res, 404, { error: 'Meme Studio endpoint not found.' });
    return true;
  } catch (err: any) {
    console.error('[Meme Studio Middleware Error]', err);
    sendJson(res, 500, { error: err?.message || 'Internal Server Error' });
    return true;
  }
}

/**
 * Copies ONLY published, active meme images from `src/memes/<slug>/images/<activeFile>`
 * into `dist/memes/<slug>/images/<activeFile>` at build time.
 * Draft images, stale images, unreferenced files, and non-image files are NEVER copied into dist.
 */
export async function copyMemeImagesToDist(rootDir: string, outDir: string): Promise<void> {
  const memesDir = path.join(rootDir, 'src', 'memes');
  if (!fs.existsSync(memesDir)) return;

  try {
    const entries = await fsp.readdir(memesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) {
        continue;
      }
      const slug = entry.name;
      const memeJsonPath = path.join(memesDir, slug, 'meme.json');
      if (!fs.existsSync(memeJsonPath)) continue;

      let doc: MemeDocument;
      try {
        const rawJson = JSON.parse(await fsp.readFile(memeJsonPath, 'utf-8'));
        doc = validateMemeDocument(rawJson).document;
      } catch (err) {
        console.warn(`[Meme Build Warning] Could not parse meme.json in "${slug}":`, err);
        continue;
      }

      // ONLY published memes are emitted to dist
      if (doc.status !== 'published') {
        continue;
      }

      const imageSrc = doc.imageSrc;
      if (!imageSrc || typeof imageSrc !== 'string') {
        console.warn(`[Meme Build Warning] Published meme "${slug}" has no imageSrc.`);
        continue;
      }

      const expectedPrefix = `/memes/${slug}/images/`;
      if (!imageSrc.startsWith(expectedPrefix)) {
        console.warn(`[Meme Build Warning] Published meme "${slug}" imageSrc does not match expected prefix: ${imageSrc}`);
        continue;
      }

      const filename = imageSrc.slice(expectedPrefix.length);
      const safeFilename = sanitizeFilename(filename);
      if (!filename || safeFilename !== filename) {
        console.warn(`[Meme Build Warning] Published meme "${slug}" has invalid filename: ${filename}`);
        continue;
      }

      const ext = path.extname(safeFilename).toLowerCase();
      if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
        console.warn(`[Meme Build Warning] Published meme "${slug}" has disallowed file type: ${ext}`);
        continue;
      }

      const srcImagePath = path.join(memesDir, slug, 'images', safeFilename);
      if (!fs.existsSync(srcImagePath)) {
        console.warn(`[Meme Build Warning] Published meme "${slug}" references missing image: ${srcImagePath}`);
        continue;
      }

      // Copy ONLY that exact active referenced image file
      const dstImagesDir = path.join(outDir, 'memes', slug, 'images');
      await fsp.mkdir(dstImagesDir, { recursive: true });
      await fsp.copyFile(srcImagePath, path.join(dstImagesDir, safeFilename));
    }
  } catch (err) {
    console.warn('[Meme Build Warning] Failed to copy published meme images to dist:', err);
  }
}
