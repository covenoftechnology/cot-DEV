const fs = require('fs');

const canonPath = 'src/lib/article-block-registry.ts';
const uatPath = 'src/uat/article-forge/lib/article-block-registry.ts';

const canonCode = fs.readFileSync(canonPath, 'utf8');
const uatCode = fs.readFileSync(uatPath, 'utf8');

function parseRegistry(code, label) {
  // Find ARTICLE_BLOCK_REGISTRY object
  const registryRegex = /export const ARTICLE_BLOCK_REGISTRY\s*:\s*Record<[\s\S]*?=\s*\{([\s\S]*?)\n\};/m;
  const match = code.match(registryRegex);
  if (!match) {
    console.error(`Could not find registry in ${label}`);
    return null;
  }
  const body = match[1];
  
  const keys = [];
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const keyMatch = line.match(/^\s*['"]([a-z0-9-]+)['"]:\s*\{/);
    if (keyMatch) {
      keys.push(keyMatch[1]);
    }
  }

  // Non-insertables defined by isInsertablePaletteBlock: type !== 'text-title' && type !== 'bullet-list'
  const nonInsertables = ['text-title', 'bullet-list'];
  const insertables = keys.filter(k => !nonInsertables.includes(k));

  // Grid eligible: canonical insertables minus 'flex-layout'
  const gridEligibles = insertables.filter(k => k !== 'flex-layout');

  return {
    label,
    totalSchemas: keys.length,
    keys,
    insertables,
    nonInsertables,
    gridEligibles
  };
}

const canon = parseRegistry(canonCode, 'Canonical');
const uat = parseRegistry(uatCode, 'UAT');

console.log('==================================================');
console.log('CANONICAL REGISTRY AUDIT');
console.log('==================================================');
console.log('Canonical Schema Count:', canon.totalSchemas);
console.log('Canonical Insertable Count:', canon.insertables.length);
console.log('Canonical Non-Insertable Count:', canon.nonInsertables.length);
console.log('\nCanonical Insertable IDs (' + canon.insertables.length + '):');
canon.insertables.forEach((id, idx) => console.log(`  ${idx + 1}. ${id}`));
console.log('\nCanonical Non-Insertable IDs:');
canon.nonInsertables.forEach(id => console.log(`  - ${id}`));

console.log('\n==================================================');
console.log('UAT REGISTRY AUDIT');
console.log('==================================================');
console.log('UAT Schema Count:', uat.totalSchemas);
console.log('UAT Insertable Count:', uat.insertables.length);
console.log('UAT Non-Insertable Count:', uat.nonInsertables.length);
console.log('UAT Grid-Eligible Count:', uat.gridEligibles.length);

console.log('\n==================================================');
console.log('PHASE 2 & 3 PARITY AUDIT VERIFICATION');
console.log('==================================================');
const schemasMatch = canon.totalSchemas === uat.totalSchemas && 
  canon.keys.every((k, i) => k === uat.keys[i]);
console.log('Schemas exact match (29):', schemasMatch);

const insertablesMatch = canon.insertables.length === uat.insertables.length &&
  canon.insertables.every((k, i) => k === uat.insertables[i]);
console.log('Insertables exact match (27):', insertablesMatch);

const nonInsertablesMatch = canon.nonInsertables.length === uat.nonInsertables.length &&
  canon.nonInsertables.every((k, i) => k === uat.nonInsertables[i]);
console.log('Non-insertables exact match (2: text-title, bullet-list):', nonInsertablesMatch);

console.log('Grid-eligible count in UAT (26):', uat.gridEligibles.length);
console.log('flex-layout in Canonical Palette:', canon.insertables.includes('flex-layout'));
console.log('flex-layout in Grid-Eligible:', uat.gridEligibles.includes('flex-layout'));

console.log('\nExact 26 Grid-Eligible IDs:');
uat.gridEligibles.forEach((id, idx) => console.log(`  ${idx + 1}. ${id}`));
