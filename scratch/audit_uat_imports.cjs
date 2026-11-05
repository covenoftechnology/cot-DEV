const fs = require('fs');
const path = require('path');

function getAllFiles(dir, exts = ['.ts', '.tsx', '.js', '.jsx', '.astro', '.css']) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

const uatFiles = [
  ...getAllFiles('src/uat'),
  ...getAllFiles('src/pages/lab')
];

const importRecords = [];

for (const file of uatFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relFile = path.relative(process.cwd(), file).replace(/\\/g, '/');
  
  // Find ES imports: from '...' or import '...'
  const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    importRecords.push({ file: relFile, importPath });
  }

  // Find require statements
  const reqRegex = /require\(['"]([^'"]+)['"]\)/g;
  while ((match = reqRegex.exec(content)) !== null) {
    importRecords.push({ file: relFile, importPath: match[1] });
  }
}

// Filter imports that point outside src/uat or src/pages/lab (i.e. into canonical src/ or node_modules)
const externalImports = [];
for (const rec of importRecords) {
  // If it's a node module or relative within uat/lab, check resolution
  if (rec.importPath.startsWith('.')) {
    const dir = path.dirname(rec.file);
    const resolved = path.normalize(path.join(dir, rec.importPath)).replace(/\\/g, '/');
    if (!resolved.startsWith('src/uat') && !resolved.startsWith('src/pages/lab')) {
      externalImports.push({ file: rec.file, importPath: rec.importPath, resolved });
    }
  } else if (!rec.importPath.startsWith('@') && !rec.importPath.includes('/') || rec.importPath.startsWith('astro')) {
    // node_modules / standard packages (astro, path, fs, etc.)
  } else {
    externalImports.push({ file: rec.file, importPath: rec.importPath, resolved: rec.importPath });
  }
}

console.log('=== EXTERNAL IMPORTS AUDIT ===\n');
console.log('Total external imports found:', externalImports.length);

const grouped = {};
for (const item of externalImports) {
  if (!grouped[item.resolved]) grouped[item.resolved] = [];
  grouped[item.resolved].push(item.file);
}

for (const [target, importers] of Object.entries(grouped)) {
  console.log(`\nTarget: ${target}`);
  console.log(`Used by (${importers.length} files):`);
  importers.forEach(f => console.log(`  - ${f}`));
}

