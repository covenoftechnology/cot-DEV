// scratch/fix_uat_imports.cjs
const fs = require('fs');
const path = require('path');

// 1. ArticleLayout.astro
const layoutPath = path.resolve('src/uat/article-forge/layouts/ArticleLayout.astro');
let layoutContent = fs.readFileSync(layoutPath, 'utf-8');
layoutContent = layoutContent
  .replace("import BaseLayout from './BaseLayout.astro';", "import BaseLayout from '../../../layouts/BaseLayout.astro';")
  .replace("import SpiritProgress from '../components/article/SpiritProgress.astro';", "import SpiritProgress from '../components/SpiritProgress.astro';")
  .replace("import ArticleImageLightbox from '../components/article/ArticleImageLightbox.astro';", "import ArticleImageLightbox from '../components/ArticleImageLightbox.astro';");
fs.writeFileSync(layoutPath, layoutContent, 'utf-8');
console.log('Updated ArticleLayout.astro imports.');

// 2. ArticleRenderer.astro
const rendererPath = path.resolve('src/uat/article-forge/components/ArticleRenderer.astro');
let rendererContent = fs.readFileSync(rendererPath, 'utf-8');
rendererContent = rendererContent
  .replace("import '../../articles/_template/article.css';", "import '../styles/article.css';")
  .replace("import type { ArticleDocument, ArticleSection, ArticleBlock } from '../../types/article-document';", "import type { ArticleDocument, ArticleSection, ArticleBlock } from '../types/article-document';");
fs.writeFileSync(rendererPath, rendererContent, 'utf-8');
console.log('Updated ArticleRenderer.astro imports.');

// 3. ArticleBlockRenderer.astro
const blockRendererPath = path.resolve('src/uat/article-forge/components/ArticleBlockRenderer.astro');
let blockRendererContent = fs.readFileSync(blockRendererPath, 'utf-8');
blockRendererContent = blockRendererContent
  .replace("import { canNestInCallout, MAX_NESTED_LIST_DEPTH, canAddNestedListChild } from '../../lib/article-block-registry';", "import { canNestInCallout, MAX_NESTED_LIST_DEPTH, canAddNestedListChild } from '../lib/article-block-registry';")
  .replace("import type { ArticleDocument, ArticleBlock } from '../../types/article-document';", "import type { ArticleDocument, ArticleBlock } from '../types/article-document';");
fs.writeFileSync(blockRendererPath, blockRendererContent, 'utf-8');
console.log('Updated ArticleBlockRenderer.astro imports.');

