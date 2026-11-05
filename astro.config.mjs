// @ts-check
process.env.NAPI_RS_FORCE_WASI = 'true';

import { defineConfig } from 'astro/config';
import articleStudio from './src/integrations/article-studio';
import uatArticleForge from './src/uat/article-forge/integration';

// https://astro.build/config
export default defineConfig({
  site: 'https://covenoftechnology.cloud',
  integrations: [articleStudio(), uatArticleForge()],
});
