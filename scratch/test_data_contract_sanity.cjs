const fs = require('fs');
const path = require('path');
const http = require('http');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runSanityCheck() {
  console.log('\n======================================================');
  console.log('COVEN UAT ARTICLE FORGE — DATA CONTRACT SANITY AUDIT');
  console.log('======================================================\n');

  // Test 1: Geometry Engine createDefaultGridComposerV2 & Non-Enumerable Aliases
  console.log('Test Suite 1: Geometry Engine & In-Memory Shims');
  const { createDefaultGridComposerV2, migrateSectionToGridComposerV2, attachNonEnumerableAliases } = require('../src/uat/article-forge/grid/geometry.ts');

  const defaultGrid = createDefaultGridComposerV2();
  assert(defaultGrid.columns === 4, 'Default grid columns === 4');
  assert(Array.isArray(defaultGrid.layoutItems) && defaultGrid.layoutItems.length === 0, 'defaultGrid.layoutItems is empty array');
  assert(defaultGrid.slots === defaultGrid.layoutItems, 'defaultGrid.slots getter returns exact layoutItems instance');

  // Test JSON serialization of defaultGrid
  const serializedDefault = JSON.parse(JSON.stringify(defaultGrid));
  assert(Array.isArray(serializedDefault.layoutItems), 'Serialized JSON has layoutItems');
  assert(!('slots' in serializedDefault), 'Serialized JSON does NOT contain "slots" key');

  // Test 2: Migration of Legacy Draft (Phase 3/4 slots structure)
  console.log('\nTest Suite 2: Legacy Draft Migration Contract');
  const legacySection = {
    id: 'sec_legacy_1',
    title: 'Legacy Section',
    layout: {
      columns: 3,
      rows: 3,
      slots: [
        {
          id: 'slot_1',
          columnStart: 1,
          columnEnd: 2,
          rowStart: 1,
          rowEnd: 2,
          block: { id: 'blk_1', type: 'paragraph', data: { text: 'Legacy block 1' } }
        },
        {
          id: 'slot_2',
          columnStart: 2,
          columnEnd: 4,
          rowStart: 2,
          rowEnd: 3,
          block: { id: 'blk_2', type: 'callout', data: { text: 'Legacy block 2' } }
        }
      ]
    },
    visualGrid: {
      columns: 3,
      rows: 3,
      slots: [
        {
          id: 'slot_1',
          columnStart: 1,
          columnEnd: 2,
          rowStart: 1,
          rowEnd: 2,
          block: { id: 'blk_1', type: 'paragraph', data: { text: 'Legacy block 1' } }
        },
        {
          id: 'slot_2',
          columnStart: 2,
          columnEnd: 4,
          rowStart: 2,
          rowEnd: 3,
          block: { id: 'blk_2', type: 'callout', data: { text: 'Legacy block 2' } }
        }
      ]
    }
  };

  const migratedVg = migrateSectionToGridComposerV2(legacySection);
  assert(migratedVg.columns === 4, 'Migrated grid columns === 4');
  assert(Array.isArray(migratedVg.layoutItems) && migratedVg.layoutItems.length === 2, 'Migrated visualGrid has layoutItems (length 2)');
  assert(legacySection.layout === legacySection.visualGrid, 'legacySection.layout in-memory getter returns visualGrid instance');
  assert(legacySection.visualGrid.slots === legacySection.visualGrid.layoutItems, 'legacySection.visualGrid.slots in-memory getter returns layoutItems');

  // Test serialization of migrated section
  const serializedMigrated = JSON.parse(JSON.stringify(legacySection));
  assert(serializedMigrated.visualGrid !== undefined, 'Serialized migrated section contains visualGrid');
  assert(Array.isArray(serializedMigrated.visualGrid.layoutItems), 'Serialized migrated visualGrid contains layoutItems');
  assert(!('slots' in serializedMigrated.visualGrid), 'Serialized migrated visualGrid does NOT contain "slots"');
  assert(!('layout' in serializedMigrated), 'Serialized migrated section does NOT contain duplicate "layout"');

  // Test 3: Referential Integrity & Divergence Prevention Test
  console.log('\nTest Suite 3: Zero-Divergence Proof (Referential Identity)');
  const dummyItem = {
    id: 'item_probe_99',
    columnStart: 1,
    columnSpan: 2,
    columnEnd: 3,
    rowStart: 3,
    rowSpan: 1,
    rowEnd: 4,
    block: { id: 'blk_probe', type: 'heading', data: { text: 'Probe' } }
  };
  legacySection.visualGrid.layoutItems.push(dummyItem);
  assert(legacySection.visualGrid.slots.length === 3, 'Pushing to layoutItems immediately updates slots (count 3)');
  assert(legacySection.visualGrid.slots[2].id === 'item_probe_99', 'Item accessed via .slots is identical');
  assert(legacySection.visualGrid.slots === legacySection.visualGrid.layoutItems, 'Referential identity holds: slots === layoutItems (divergence mathematically 0%)');

  // Test 4: Live HTTP API Save & Disk Normalization Test
  console.log('\nTest Suite 4: Persistence Normalization on Disk (.uat-article-forge/drafts/)');
  const testStudioId = 'uat_contract_probe_' + Date.now();
  const testDoc = {
    version: 1,
    studioId: testStudioId,
    revision: 1,
    slug: 'contract-probe',
    meta: {
      title: 'Contract Sanity Probe Document',
      category: 'Architecture',
      difficulty: 'Lv. 1'
    },
    sections: [
      {
        id: 'sec_probe_1',
        title: 'Probe Section',
        // Deliberately attach legacy duplicate layout and slots to test normalization
        layout: { columns: 4, rows: 3, layoutItems: [dummyItem], slots: [dummyItem] },
        visualGrid: { columns: 4, rows: 3, layoutItems: [dummyItem], slots: [dummyItem] },
        blocks: []
      }
    ]
  };

  const postData = JSON.stringify({ doc: testDoc });
  const postReq = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 4321,
      path: '/__uat-article-forge/draft',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  assert(postReq.statusCode === 200 && postReq.data.ok === true, 'Save HTTP 200 OK');

  // Read actual saved file directly from disk
  const diskPath = path.join(process.cwd(), '.uat-article-forge', 'drafts', `${testStudioId}.json`);
  assert(fs.existsSync(diskPath), `Persisted JSON file exists on disk: ${diskPath}`);

  const diskContentRaw = fs.readFileSync(diskPath, 'utf-8');
  const diskDoc = JSON.parse(diskContentRaw);

  assert(diskDoc.sections[0].visualGrid !== undefined, 'Disk JSON contains visualGrid');
  assert(Array.isArray(diskDoc.sections[0].visualGrid.layoutItems), 'Disk JSON visualGrid contains layoutItems');
  assert(diskDoc.sections[0].visualGrid.layoutItems.length === 1, 'Disk JSON layoutItems length === 1');
  assert(!('slots' in diskDoc.sections[0].visualGrid), 'Disk JSON visualGrid does NOT contain "slots" (0 duplicate arrays)');
  assert(!('layout' in diskDoc.sections[0]), 'Disk JSON section does NOT contain duplicate "layout" (0 duplicate objects)');
  assert(!diskContentRaw.includes('"slots":'), 'Raw JSON string has zero occurrences of "slots":');
  assert(!diskContentRaw.includes('"layout":'), 'Raw JSON string has zero occurrences of "layout":');

  // Clean up probe draft
  fs.unlinkSync(diskPath);
  assert(!fs.existsSync(diskPath), 'Probe draft cleaned up cleanly');

  console.log('\n======================================================');
  console.log(`TOTAL SANITY TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSanityCheck().catch(err => {
  console.error('Fatal sanity check error:', err);
  process.exit(1);
});

