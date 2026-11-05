// scratch/build_uat_admin_center.cjs
const fs = require('fs');
const path = require('path');

const srcPath = path.resolve('src/integrations/article-admin-html.ts');
let code = fs.readFileSync(srcPath, 'utf-8');

// Replace function name
code = code.replace('export function getAdminCenterHtml(): string {', 'export function getUatAdminCenterHtml(): string {');

// Replace title & branding
code = code.replace('<title>Coven Article Center — Local Admin</title>', '<title>Coven Article Center — UAT Article Forge</title>');
code = code.replace('<span class="admin-brand-title">Coven Article Center</span>', '<span class="admin-brand-title">Coven Article Center · UAT</span>');
code = code.replace('<span class="admin-brand-badge">Local Admin</span>', '<span class="admin-brand-badge" style="background:rgba(216,181,107,0.18);border:1px solid rgba(216,181,107,0.4);color:#f3d790">UAT Sandbox</span>');

// Replace navigation routes
code = code.replace("href=\"/template-preview/studio?new=1\"", "href=\"/lab/layout-forge/studio\"");
code = code.replace("href=\"/template-preview/studio\"", "href=\"/lab/layout-forge/studio\"");
code = code.replace("href=\"/template-preview/memes\"", "href=\"/lab/layout-forge/preview\"");
code = code.replace(">Memes Studio<", ">UAT Preview<");

// Replace endpoints in scripts
code = code.replaceAll('/__article-studio/drafts', '/__uat-article-forge/drafts');
code = code.replaceAll('/__article-studio/preview', '/__uat-article-forge/preview');
code = code.replaceAll('/__article-studio/duplicate', '/__uat-article-forge/duplicate');
code = code.replaceAll('/__article-studio/upload', '/__uat-article-forge/upload');

// Replace studio/preview navigation URLs
code = code.replaceAll('/template-preview/studio?draft=', '/lab/layout-forge/studio?draft=');
code = code.replaceAll('/template-preview/studio?article=', '/lab/layout-forge/studio?draft=');
code = code.replaceAll('/template-preview/studio', '/lab/layout-forge/studio');
code = code.replaceAll('/template-preview/article', '/lab/layout-forge/preview');

// Replace duplicate handler to use UAT duplicate endpoint
const oldDupRegex = /fetch\('\/__article-studio\/articles\/' \+ encodeURIComponent\(slug\) \+ '\/create-draft', \{ method: 'POST' \}\)/g;
code = code.replace(oldDupRegex, "fetch('/__uat-article-forge/duplicate', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ studioId: slug }) })");

// Write out to src/uat/article-forge/integration/admin-center-html.ts
const destPath = path.resolve('src/uat/article-forge/integration/admin-center-html.ts');
fs.mkdirSync(path.dirname(destPath), { recursive: true });
fs.writeFileSync(destPath, code, 'utf-8');
console.log('Successfully generated src/uat/article-forge/integration/admin-center-html.ts');

