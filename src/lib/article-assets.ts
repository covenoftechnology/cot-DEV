import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { ArticleBlock, ArticleDocument } from '../types/article-document';
import { isValidSlug } from './article-taxonomy';
import {
  getActiveSectionBlocks,
  isExternalResourceUrl,
  MANAGED_DRAFT_UPLOAD_PREFIX,
} from './article-grid/geometry';

export const ALLOWED_ARTICLE_IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
]);

export type ArticleAssetErrorCode =
  | 'INVALID_ASSET_PATH'
  | 'UNSUPPORTED_ASSET_EXTENSION'
  | 'MISSING_SOURCE_ASSET'
  | 'ASSET_MIGRATION_FAILED'
  | 'CROSS_SLUG_DEPENDENCY_REMAINS';

export class ArticleAssetError extends Error {
  public readonly statusCode: number;
  public readonly code: ArticleAssetErrorCode;

  constructor(code: ArticleAssetErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = 'ArticleAssetError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function sanitizeAssetFilename(filename: string): string {
  const base = path.basename(filename);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function isSafeArticleSlugPath(baseDir: string, slug: string): boolean {
  if (!isValidSlug(slug)) return false;
  const resolvedBase = path.resolve(baseDir);
  const target = path.resolve(resolvedBase, slug);
  const rel = path.relative(resolvedBase, target);
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel) && !rel.includes(path.sep + '..');
}

export function resolvePathSafelyUnderBase(baseDir: string, ...segments: string[]): string | null {
  const resolvedBase = path.resolve(baseDir);
  const target = path.resolve(resolvedBase, ...segments);
  const rel = path.relative(resolvedBase, target);
  if (!rel || rel === '.' || rel.startsWith('..') || path.isAbsolute(rel) || rel.includes(path.sep + '..')) {
    return null;
  }
  return target;
}

export function validateSafeImageFilename(rawFilename: string): {
  valid: boolean;
  filename?: string;
  ext?: string;
  code?: ArticleAssetErrorCode;
  reason?: string;
} {
  if (!rawFilename || typeof rawFilename !== 'string') {
    return { valid: false, code: 'INVALID_ASSET_PATH', reason: 'Image filename is empty.' };
  }
  if (
    rawFilename === '.' ||
    rawFilename === '..' ||
    rawFilename.includes('..') ||
    rawFilename.includes('/') ||
    rawFilename.includes('\\') ||
    rawFilename.includes('%') ||
    rawFilename.includes('?') ||
    rawFilename.includes('#') ||
    rawFilename.includes('\0')
  ) {
    return {
      valid: false,
      code: 'INVALID_ASSET_PATH',
      reason: `Unsafe image filename "${rawFilename}".`,
    };
  }
  const sanitized = sanitizeAssetFilename(rawFilename);
  if (!sanitized || sanitized !== rawFilename) {
    return {
      valid: false,
      code: 'INVALID_ASSET_PATH',
      reason: `Image filename "${rawFilename}" contains forbidden characters.`,
    };
  }
  const ext = path.extname(sanitized).toLowerCase();
  if (!ALLOWED_ARTICLE_IMAGE_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      code: 'UNSUPPORTED_ASSET_EXTENSION',
      reason: `Unsupported image extension "${ext || '(none)'}" in "${rawFilename}".`,
    };
  }
  return { valid: true, filename: sanitized, ext };
}

export interface ParsedArticleOwnedImageUrl {
  kind: 'article-image';
  slug: string;
  filename: string;
  ext: string;
  normalizedUrl: string;
}

export interface ParsedManagedUploadImageUrl {
  kind: 'managed-upload';
  filename: string;
  ext: string;
  normalizedUrl: string;
}

export type ClassifiedArticleImageUrl =
  | { kind: 'empty' }
  | { kind: 'external'; url: string }
  | ParsedArticleOwnedImageUrl
  | ParsedManagedUploadImageUrl
  | { kind: 'other'; url: string };

function assertNoForbiddenPathTokens(trimmed: string): void {
  if (
    trimmed.includes('..') ||
    trimmed.includes('\\') ||
    trimmed.includes('//') ||
    trimmed.includes('\0') ||
    trimmed.includes('?') ||
    trimmed.includes('#') ||
    /%2e|%2f|%5c|%00/i.test(trimmed)
  ) {
    throw new ArticleAssetError(
      'INVALID_ASSET_PATH',
      `Invalid article asset path "${trimmed}": path traversal or unsafe characters are forbidden.`
    );
  }
}

export function parseArticleOwnedImageUrl(url: string): ParsedArticleOwnedImageUrl {
  const trimmed = url.trim();
  assertNoForbiddenPathTokens(trimmed);

  const match = trimmed.match(/^\/articles\/([^/]+)\/images\/([^/]+)$/);
  if (!match) {
    throw new ArticleAssetError(
      'INVALID_ASSET_PATH',
      `Malformed article-owned image path "${trimmed}". Expected /articles/<slug>/images/<filename>.`
    );
  }

  const [, slug, rawFile] = match;
  if (!isValidSlug(slug)) {
    throw new ArticleAssetError(
      'INVALID_ASSET_PATH',
      `Invalid source article slug "${slug}" in image path "${trimmed}".`
    );
  }

  const fileCheck = validateSafeImageFilename(rawFile);
  if (!fileCheck.valid || !fileCheck.filename || !fileCheck.ext) {
    throw new ArticleAssetError(
      fileCheck.code || 'INVALID_ASSET_PATH',
      `Invalid image filename in "${trimmed}": ${fileCheck.reason || 'unsafe filename'}`
    );
  }

  return {
    kind: 'article-image',
    slug,
    filename: fileCheck.filename,
    ext: fileCheck.ext,
    normalizedUrl: `/articles/${slug}/images/${fileCheck.filename}`,
  };
}

export function parseManagedUploadImageUrl(url: string): ParsedManagedUploadImageUrl {
  const trimmed = url.trim();
  assertNoForbiddenPathTokens(trimmed);

  const match = trimmed.match(/^\/__article-studio\/uploads\/([^/]+)$/);
  if (!match) {
    throw new ArticleAssetError(
      'INVALID_ASSET_PATH',
      `Malformed managed upload path "${trimmed}". Expected ${MANAGED_DRAFT_UPLOAD_PREFIX}<filename>.`
    );
  }

  const [, rawFile] = match;
  const fileCheck = validateSafeImageFilename(rawFile);
  if (!fileCheck.valid || !fileCheck.filename || !fileCheck.ext) {
    throw new ArticleAssetError(
      fileCheck.code || 'INVALID_ASSET_PATH',
      `Invalid upload filename in "${trimmed}": ${fileCheck.reason || 'unsafe filename'}`
    );
  }

  return {
    kind: 'managed-upload',
    filename: fileCheck.filename,
    ext: fileCheck.ext,
    normalizedUrl: `${MANAGED_DRAFT_UPLOAD_PREFIX}${fileCheck.filename}`,
  };
}

export function classifyArticleImageUrl(url: unknown): ClassifiedArticleImageUrl {
  if (typeof url !== 'string') return { kind: 'empty' };
  const trimmed = url.trim();
  if (!trimmed) return { kind: 'empty' };

  // External HTTP/HTTPS URLs are NEVER downloaded, copied, or rewritten.
  if (isExternalResourceUrl(trimmed)) {
    return { kind: 'external', url: trimmed };
  }

  if (trimmed.startsWith('/articles/')) {
    return parseArticleOwnedImageUrl(trimmed);
  }

  if (trimmed.startsWith(MANAGED_DRAFT_UPLOAD_PREFIX)) {
    return parseManagedUploadImageUrl(trimmed);
  }

  return { kind: 'other', url: trimmed };
}

export interface ArticleImageRefContext {
  fieldPath: string;
  blockType?: string;
  value: string;
  setValue: (nextValue: string) => void;
}

/**
 * Single-source-of-truth image reference walker for ArticleDocument.
 * Covers document cover metadata (canonical + legacy), active Grid & Legacy section blocks,
 * all canonical & legacy image fields, gallery cards, image embeds, composable Callout children,
 * and legacy flex-layout columns (including V1 units).
 */
export async function walkArticleImageReferences(
  doc: ArticleDocument,
  visitor: (ref: ArticleImageRefContext) => Promise<void> | void
): Promise<void> {
  if (!doc || typeof doc !== 'object') return;

  async function visitProp(
    owner: Record<string, any>,
    key: string,
    fieldPath: string,
    blockType?: string
  ): Promise<void> {
    if (!owner || typeof owner[key] !== 'string' || !owner[key].trim()) return;
    await visitor({
      fieldPath,
      blockType,
      value: owner[key],
      setValue: (nextValue: string) => {
        owner[key] = nextValue;
      },
    });
  }

  if (doc.meta && typeof doc.meta === 'object') {
    await visitProp(doc.meta as Record<string, any>, 'coverImageSrc', 'meta.coverImageSrc');
    await visitProp(doc.meta as Record<string, any>, 'cover', 'meta.cover');
  }

  async function visitBlock(blk: ArticleBlock, basePath: string): Promise<void> {
    if (!blk || typeof blk !== 'object' || !blk.data || typeof blk.data !== 'object') return;
    const d = blk.data;
    const bType = blk.type;

    await visitProp(d, 'imageSrc', `${basePath}.data.imageSrc`, bType);
    await visitProp(d, 'src', `${basePath}.data.src`, bType);
    await visitProp(d, 'img1Src', `${basePath}.data.img1Src`, bType);
    await visitProp(d, 'img2Src', `${basePath}.data.img2Src`, bType);
    await visitProp(d, 'img3Src', `${basePath}.data.img3Src`, bType);

    if (bType === 'embed' && d.embedType === 'image') {
      await visitProp(d, 'url', `${basePath}.data.url`, bType);
    }

    if (Array.isArray(d.cards)) {
      for (let cIdx = 0; cIdx < d.cards.length; cIdx++) {
        const card = d.cards[cIdx];
        if (card && typeof card === 'object') {
          await visitProp(card, 'src', `${basePath}.data.cards[${cIdx}].src`, bType);
        }
      }
    }

    // Composable Callout child blocks or any nested block array
    if (Array.isArray(d.blocks)) {
      for (let cbIdx = 0; cbIdx < d.blocks.length; cbIdx++) {
        await visitBlock(d.blocks[cbIdx], `${basePath}.data.blocks[${cbIdx}]`);
      }
    }

    // Legacy flex-layout columns (blocks + V1 units)
    if (Array.isArray(d.columns)) {
      for (let colIdx = 0; colIdx < d.columns.length; colIdx++) {
        const col = d.columns[colIdx];
        if (!col || typeof col !== 'object') continue;
        if (Array.isArray(col.blocks)) {
          for (let cbIdx = 0; cbIdx < col.blocks.length; cbIdx++) {
            await visitBlock(col.blocks[cbIdx], `${basePath}.data.columns[${colIdx}].blocks[${cbIdx}]`);
          }
        }
        if (Array.isArray(col.units)) {
          for (let uIdx = 0; uIdx < col.units.length; uIdx++) {
            const unit = col.units[uIdx];
            if (unit && typeof unit === 'object' && unit.type === 'image') {
              await visitProp(unit, 'imageSrc', `${basePath}.data.columns[${colIdx}].units[${uIdx}].imageSrc`, 'flex-unit-image');
              await visitProp(unit, 'src', `${basePath}.data.columns[${colIdx}].units[${uIdx}].src`, 'flex-unit-image');
            }
          }
        }
      }
    }
  }

  const sections = Array.isArray(doc.sections) ? doc.sections : [];
  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    if (!sec || typeof sec !== 'object') continue;
    const activeBlocks = getActiveSectionBlocks(sec);
    for (let bIdx = 0; bIdx < activeBlocks.length; bIdx++) {
      await visitBlock(activeBlocks[bIdx], `sections[${sIdx}].blocks[${bIdx}]`);
    }
  }
}

async function computeFileSha256(filePath: string): Promise<string> {
  const buf = await fsp.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function stripLeadingTimestampToken(filename: string): string {
  const ext = path.extname(filename);
  const stem = filename.slice(0, filename.length - ext.length);
  const stripped = stem.replace(/^\d{10,16}_(?:[a-f0-9]{6,12}_)?/i, '');
  const cleanStem = stripped || stem || 'asset';
  return `${cleanStem}${ext}`;
}

function createUniqueFilename(targetDir: string, originalFilename: string): string {
  const cleanBase = sanitizeAssetFilename(stripLeadingTimestampToken(originalFilename));
  const ext = path.extname(cleanBase).toLowerCase();
  const baseWithoutExt = cleanBase.slice(0, cleanBase.length - ext.length) || 'asset';

  for (let attempt = 0; attempt < 25; attempt++) {
    const token = crypto.randomBytes(4).toString('hex');
    const candidate = sanitizeAssetFilename(`${Date.now()}_${token}_${baseWithoutExt}${ext}`);
    const resolved = resolvePathSafelyUnderBase(targetDir, candidate);
    if (resolved && !fs.existsSync(resolved)) {
      return candidate;
    }
  }
  throw new ArticleAssetError(
    'ASSET_MIGRATION_FAILED',
    `Unable to allocate a unique asset filename for "${originalFilename}".`,
    500
  );
}

async function assertRegularFileExists(filePath: string, displayRef: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    throw new ArticleAssetError(
      'MISSING_SOURCE_ASSET',
      `Article asset could not be migrated because the source image is missing: ${displayRef}`
    );
  }
  const stat = await fsp.stat(filePath);
  if (!stat.isFile()) {
    throw new ArticleAssetError(
      'MISSING_SOURCE_ASSET',
      `Article asset could not be migrated because the source path is not a file: ${displayRef}`
    );
  }
}

export async function rollbackCreatedAssetFiles(createdFiles: string[]): Promise<void> {
  for (const filePath of createdFiles) {
    try {
      if (fs.existsSync(filePath)) {
        await fsp.unlink(filePath);
      }
    } catch {
      // Best-effort rollback cleanup
    }
  }
}

export interface DuplicateAssetPrepOptions {
  articlesDir: string;
  uploadsDir: string;
}

export interface DuplicateAssetPrepResult {
  copiedCount: number;
  createdFiles: string[];
  rewrittenRefs: Array<{ fieldPath: string; from: string; to: string }>;
}

/**
 * LAYER 1 — DUPLICATE-TIME ASSET INDEPENDENCE
 * Copies all article-owned local images (/articles/<slug>/images/<file>) and managed draft uploads
 * (/__article-studio/uploads/<file>) into fresh collision-free files inside `.article-studio/uploads/`,
 * and rewrites references in `doc` to `/__article-studio/uploads/<unique-name>`.
 * External HTTP/HTTPS URLs are left untouched.
 * If any asset fails, all newly created upload files are rolled back cleanly.
 */
export async function prepareDuplicateArticleAssets(
  doc: ArticleDocument,
  options: DuplicateAssetPrepOptions
): Promise<DuplicateAssetPrepResult> {
  const { articlesDir, uploadsDir } = options;
  await fsp.mkdir(uploadsDir, { recursive: true });

  const createdFiles: string[] = [];
  const rewrittenRefs: Array<{ fieldPath: string; from: string; to: string }> = [];
  const copiedBySourcePath = new Map<string, string>();

  try {
    await walkArticleImageReferences(doc, async (ref) => {
      const classified = classifyArticleImageUrl(ref.value);
      if (classified.kind === 'empty' || classified.kind === 'external' || classified.kind === 'other') {
        return;
      }

      let sourcePath: string | null = null;
      let originalFilename: string;

      if (classified.kind === 'article-image') {
        if (!isSafeArticleSlugPath(articlesDir, classified.slug)) {
          throw new ArticleAssetError(
            'INVALID_ASSET_PATH',
            `Invalid source article slug "${classified.slug}" in "${ref.value}".`
          );
        }
        const sourceImagesDir = path.join(articlesDir, classified.slug, 'images');
        sourcePath = resolvePathSafelyUnderBase(sourceImagesDir, classified.filename);
        originalFilename = classified.filename;
      } else {
        sourcePath = resolvePathSafelyUnderBase(uploadsDir, classified.filename);
        originalFilename = classified.filename;
      }

      if (!sourcePath) {
        throw new ArticleAssetError(
          'INVALID_ASSET_PATH',
          `Unsafe source asset path "${ref.value}".`
        );
      }

      await assertRegularFileExists(sourcePath, ref.value);

      const existingTargetUrl = copiedBySourcePath.get(sourcePath);
      if (existingTargetUrl) {
        ref.setValue(existingTargetUrl);
        rewrittenRefs.push({ fieldPath: ref.fieldPath, from: ref.value, to: existingTargetUrl });
        return;
      }

      const uniqueName = createUniqueFilename(uploadsDir, originalFilename);
      const destPath = resolvePathSafelyUnderBase(uploadsDir, uniqueName);
      if (!destPath) {
        throw new ArticleAssetError(
          'INVALID_ASSET_PATH',
          `Unsafe destination upload path for "${uniqueName}".`
        );
      }

      await fsp.copyFile(sourcePath, destPath);
      createdFiles.push(destPath);

      const nextUrl = `${MANAGED_DRAFT_UPLOAD_PREFIX}${uniqueName}`;
      copiedBySourcePath.set(sourcePath, nextUrl);
      ref.setValue(nextUrl);
      rewrittenRefs.push({ fieldPath: ref.fieldPath, from: ref.value, to: nextUrl });
    });

    return {
      copiedCount: createdFiles.length,
      createdFiles,
      rewrittenRefs,
    };
  } catch (err) {
    await rollbackCreatedAssetFiles(createdFiles);
    throw err;
  }
}

export interface PublishAssetMigrationOptions {
  targetSlug: string;
  articlesDir: string;
  uploadsDir: string;
}

export interface PublishAssetMigrationResult {
  copiedCount: number;
  createdFiles: string[];
  rewrittenRefs: Array<{ fieldPath: string; from: string; to: string }>;
}

/**
 * LAYER 2 — PUBLISH-TIME ASSET MIGRATION & CROSS-SLUG DEFENSE
 * (Also designed for direct reuse by future Safe Rename Slug.)
 *
 * - `/__article-studio/uploads/<file>` -> copied into `src/articles/<targetSlug>/images/` & rewritten.
 * - `/articles/<otherSlug>/images/<file>` (`otherSlug !== targetSlug`) -> safely verified, copied into
 *   `src/articles/<targetSlug>/images/`, and rewritten to `/articles/<targetSlug>/images/<destFile>`.
 * - `/articles/<targetSlug>/images/<file>` (same slug) -> verified to exist; NO-OP (not re-copied).
 * - External `http://` / `https://` URLs -> untouched NO-OP (never downloaded or copied).
 * - Missing source files or unsafe paths -> fail cleanly and roll back any newly copied files.
 */
export async function migrateArticleAssetsForPublish(
  doc: ArticleDocument,
  options: PublishAssetMigrationOptions
): Promise<PublishAssetMigrationResult> {
  const { targetSlug, articlesDir, uploadsDir } = options;

  if (!isSafeArticleSlugPath(articlesDir, targetSlug)) {
    throw new ArticleAssetError(
      'INVALID_ASSET_PATH',
      `Invalid target article slug "${targetSlug}".`
    );
  }

  const articleImagesDir = path.join(articlesDir, targetSlug, 'images');
  const createdFiles: string[] = [];
  const rewrittenRefs: Array<{ fieldPath: string; from: string; to: string }> = [];
  const migratedBySourcePath = new Map<string, string>();
  let imagesDirCreatedByUs = false;

  try {
    const ensureImagesDir = async () => {
      if (!fs.existsSync(articleImagesDir)) {
        await fsp.mkdir(articleImagesDir, { recursive: true });
        imagesDirCreatedByUs = true;
      }
    };

    const copyIntoTargetImagesDir = async (
      sourcePath: string,
      preferredFilename: string
    ): Promise<string> => {
      const alreadyMigrated = migratedBySourcePath.get(sourcePath);
      if (alreadyMigrated) {
        return alreadyMigrated;
      }

      await ensureImagesDir();

      const preferredDestPath = resolvePathSafelyUnderBase(articleImagesDir, preferredFilename);
      if (!preferredDestPath) {
        throw new ArticleAssetError(
          'INVALID_ASSET_PATH',
          `Unsafe destination filename "${preferredFilename}".`
        );
      }

      let finalFilename = preferredFilename;
      let finalDestPath = preferredDestPath;
      let needsCopy = true;

      if (fs.existsSync(preferredDestPath)) {
        const [srcHash, dstHash] = await Promise.all([
          computeFileSha256(sourcePath),
          computeFileSha256(preferredDestPath),
        ]);
        if (srcHash === dstHash) {
          needsCopy = false;
        } else {
          finalFilename = createUniqueFilename(articleImagesDir, preferredFilename);
          const uniqueDestPath = resolvePathSafelyUnderBase(articleImagesDir, finalFilename);
          if (!uniqueDestPath) {
            throw new ArticleAssetError(
              'INVALID_ASSET_PATH',
              `Unsafe destination filename "${finalFilename}".`
            );
          }
          finalDestPath = uniqueDestPath;
        }
      }

      if (needsCopy) {
        await fsp.copyFile(sourcePath, finalDestPath);
        createdFiles.push(finalDestPath);
      }

      const finalUrl = `/articles/${targetSlug}/images/${finalFilename}`;
      migratedBySourcePath.set(sourcePath, finalUrl);
      return finalUrl;
    };

    await walkArticleImageReferences(doc, async (ref) => {
      const classified = classifyArticleImageUrl(ref.value);
      if (classified.kind === 'empty' || classified.kind === 'external' || classified.kind === 'other') {
        return;
      }

      if (classified.kind === 'article-image') {
        if (!isSafeArticleSlugPath(articlesDir, classified.slug)) {
          throw new ArticleAssetError(
            'INVALID_ASSET_PATH',
            `Invalid source article slug "${classified.slug}" in "${ref.value}".`
          );
        }

        const sourceImagesDir = path.join(articlesDir, classified.slug, 'images');
        const sourcePath = resolvePathSafelyUnderBase(sourceImagesDir, classified.filename);
        if (!sourcePath) {
          throw new ArticleAssetError(
            'INVALID_ASSET_PATH',
            `Unsafe source image path "${ref.value}".`
          );
        }

        await assertRegularFileExists(sourcePath, ref.value);

        // Same-slug reference: verify existence only, no copy needed (NO-OP).
        if (classified.slug === targetSlug) {
          return;
        }

        // Cross-slug reference: safely copy into targetSlug/images and rewrite.
        const nextUrl = await copyIntoTargetImagesDir(sourcePath, classified.filename);
        ref.setValue(nextUrl);
        rewrittenRefs.push({ fieldPath: ref.fieldPath, from: ref.value, to: nextUrl });
        return;
      }

      // Managed draft upload: copy into targetSlug/images and rewrite.
      const sourcePath = resolvePathSafelyUnderBase(uploadsDir, classified.filename);
      if (!sourcePath) {
        throw new ArticleAssetError(
          'INVALID_ASSET_PATH',
          `Unsafe managed upload path "${ref.value}".`
        );
      }

      await assertRegularFileExists(sourcePath, ref.value);
      const nextUrl = await copyIntoTargetImagesDir(sourcePath, classified.filename);
      ref.setValue(nextUrl);
      rewrittenRefs.push({ fieldPath: ref.fieldPath, from: ref.value, to: nextUrl });
    });

    // Post-migration invariant verification: zero cross-slug or unmigrated upload refs may remain.
    await walkArticleImageReferences(doc, (ref) => {
      const classified = classifyArticleImageUrl(ref.value);
      if (classified.kind === 'managed-upload') {
        throw new ArticleAssetError(
          'CROSS_SLUG_DEPENDENCY_REMAINS',
          `Unmigrated draft upload reference remained after publish migration at ${ref.fieldPath}: ${ref.value}`
        );
      }
      if (classified.kind === 'article-image' && classified.slug !== targetSlug) {
        throw new ArticleAssetError(
          'CROSS_SLUG_DEPENDENCY_REMAINS',
          `Cross-article asset dependency remained after publish migration at ${ref.fieldPath}: ${ref.value}`
        );
      }
    });

    return {
      copiedCount: createdFiles.length,
      createdFiles,
      rewrittenRefs,
    };
  } catch (err) {
    await rollbackCreatedAssetFiles(createdFiles);
    if (imagesDirCreatedByUs && fs.existsSync(articleImagesDir)) {
      try {
        const remaining = await fsp.readdir(articleImagesDir);
        if (remaining.length === 0) {
          await fsp.rmdir(articleImagesDir);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    throw err;
  }
}
