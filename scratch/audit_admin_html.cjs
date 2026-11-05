const fs = require('fs');
const content = fs.readFileSync('src/integrations/article-admin-html.ts', 'utf-8');
const endpoints = [...content.matchAll(/['"](\/__article-studio\/[^'"]+|\/template-preview\/[^'"]+)['"]/g)].map(m => m[1]);
console.log('Endpoints/Routes:', Array.from(new Set(endpoints)));

