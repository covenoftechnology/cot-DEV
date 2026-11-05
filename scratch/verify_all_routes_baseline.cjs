// scratch/verify_all_routes_baseline.cjs
const http = require('http');

const routes = [
  // Canonical Protected Routes
  '/template-preview/studio',
  '/template-preview/article',
  '/template-preview/articles',
  // Standalone Grid Forge
  '/lab/layout-forge',
  // UAT Primary Routes
  '/lab/layout-forge/studio',
  '/lab/layout-forge/preview',
  '/lab/layout-forge/articles',
  // UAT Alias Routes
  '/lab/article-forge/studio',
  '/lab/article-forge/preview',
  '/lab/article-forge/article',
  '/lab/article-forge/articles',
  // Endpoints
  '/__uat-article-forge/drafts',
  '/__uat-article-forge/articles'
];

async function checkRoute(r) {
  return new Promise((resolve) => {
    http.get(`http://localhost:4321${r}`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve({ route: r, status: res.statusCode, length: data.length });
      });
    }).on('error', (err) => {
      resolve({ route: r, status: 'ERROR', error: err.message });
    });
  });
}

async function main() {
  console.log('Verifying all routes on local dev server...');
  let allOk = true;
  for (const r of routes) {
    const res = await checkRoute(r);
    const ok = res.status === 200;
    if (!ok) allOk = false;
    console.log(`${ok ? '✓' : '✗'} [${res.status}] ${res.route} (${res.length || res.error || 0} bytes)`);
  }

  if (allOk) {
    console.log('\n✓ ALL ROUTES RETURNED HTTP 200 OK!');
  } else {
    console.error('\n✗ SOME ROUTES FAILED!');
    process.exit(1);
  }
}

main();

