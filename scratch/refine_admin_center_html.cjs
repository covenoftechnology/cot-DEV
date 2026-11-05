// scratch/refine_admin_center_html.cjs
const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('src/uat/article-forge/integration/admin-center-html.ts');
let code = fs.readFileSync(targetPath, 'utf-8');

// Replace canonical articles fetch with UAT endpoint
code = code.replace(
  "fetch('/__article-studio/articles').then(function(r) { return r.json(); }),",
  "fetch('/__uat-article-forge/articles').then(function(r) { return r.json(); }).catch(function() { return { ok: true, articles: [] }; }),"
);

// Add Duplicate button on draft card
const oldDraftActions = `'<div class="article-card-actions" id="actions-draft-' + draft.studioId + '">' +
            '<button type="button" class="btn btn-secondary btn-sm action-preview-draft" title="Preview draft">Preview ↗</button>' +
            '<a href="/lab/layout-forge/studio?draft=' + encodeURIComponent(draft.studioId) + '" class="btn btn-secondary btn-sm" title="Edit in Studio">Edit ✎</a>' +
            '<button type="button" class="btn btn-danger btn-sm action-delete-draft" title="Delete draft">' + delLabel + '</button>' +
          '</div>';`;

const newDraftActions = `'<div class="article-card-actions" id="actions-draft-' + draft.studioId + '">' +
            '<button type="button" class="btn btn-secondary btn-sm action-preview-draft" title="Preview draft">Preview ↗</button>' +
            '<a href="/lab/layout-forge/studio?draft=' + encodeURIComponent(draft.studioId) + '" class="btn btn-secondary btn-sm" title="Edit in Studio">Edit ✎</a>' +
            '<button type="button" class="btn btn-secondary btn-sm action-dup-draft" title="Duplicate draft">Duplicate ⎘</button>' +
            '<button type="button" class="btn btn-danger btn-sm action-delete-draft" title="Delete draft">' + delLabel + '</button>' +
          '</div>';`;

code = code.replace(oldDraftActions, newDraftActions);

// Add duplicate listener
const oldListeners = `card.querySelector('.action-delete-draft').addEventListener('click', function(e) {
          showDeleteDraftConfirm(draft, card);
        });`;

const newListeners = `card.querySelector('.action-dup-draft').addEventListener('click', function(e) {
          e.currentTarget.disabled = true;
          fetch('/__uat-article-forge/duplicate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studioId: draft.studioId })
          })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.ok) {
              showToast('Draft duplicated successfully: ' + (data.doc?.meta?.title || data.newStudioId), 'success');
              loadData();
            } else {
              showToast(data.error || 'Duplicate failed', 'error');
            }
          })
          .catch(function(err) {
            showToast('Duplicate network error: ' + err.message, 'error');
          });
        });

        card.querySelector('.action-delete-draft').addEventListener('click', function(e) {
          showDeleteDraftConfirm(draft, card);
        });`;

code = code.replace(oldListeners, newListeners);

// Also remove any remaining canonical article mutations in the file
code = code.replaceAll('/__article-studio/articles', '/__uat-article-forge/articles');

fs.writeFileSync(targetPath, code, 'utf-8');
console.log('Successfully refined src/uat/article-forge/integration/admin-center-html.ts');

