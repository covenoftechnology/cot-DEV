# Grimoire Article Blocks Library (Cheat Sheet)

Visual patterns library for authoring articles in Coven of Technology (`src/articles/<slug>/index.astro`). Copy the snippet needed directly into your article's `.editorial-layout .main-content` container.

---

## 01. BASIC TYPOGRAPHY

### 1. Title + Text
**Use when:** Starting a new topic section with a thematic kicker, clear heading, and initial narrative paragraphs.

**Snippet:**
```html
<!-- BLOCK: Title + Text -->
<div class="block-typography-title-text">
  <div class="section-kicker">01 · SUBTITLE KICKER</div>
  <h3>Primary Section Heading Pattern</h3>
  <p>
    This is an example paragraph demonstrating a standard title and text block. In technical editorial writing, clear typographic hierarchy ensures clarity and precision.
  </p>
  <p>
    Second paragraph elaborating on the core architectural premise.
  </p>
</div>
<!-- END BLOCK: Title + Text -->
```

**Classes:**
- `block-typography-title-text`
- `section-kicker`

---

### 2. Text + Title
**Use when:** Providing introductory context or a bridge transition before introducing a secondary heading.

**Snippet:**
```html
<!-- BLOCK: Text + Title -->
<div class="block-typography-text-title">
  <p class="text-intro">
    Introductory paragraph setting operational context before transitioning into the subsystem below.
  </p>
  <h3 class="heading-subsequent">Subsequent Subsystem Heading</h3>
  <p>
    Body paragraph delivering the technical breakdown of the newly introduced mechanism.
  </p>
</div>
<!-- END BLOCK: Text + Title -->
```

**Classes:**
- `block-typography-text-title`
- `text-intro`
- `heading-subsequent`

---

### 3. Solo Text
**Use when:** Writing continuous long-form editorial narrative featuring inline styling (bold, italics, links).

**Snippet:**
```html
<!-- BLOCK: Solo Text -->
<div class="block-solo-text">
  <p>
    This long editorial paragraph demonstrates comprehensive inline typography. Within this scroll, initiates can review <strong>bold emphases for critical tokens</strong>, <em>italicized passages denoting sacred axioms</em>, and inline hyperlinks directing the scholar to <a href="/library">The Grimoire Archive</a>.
  </p>
  <p>
    Every line adheres to strict baseline rhythms and carefully tuned contrast ratios against the cosmic canvas.
  </p>
</div>
<!-- END BLOCK: Solo Text -->
```

**Classes:**
- `block-solo-text`

---

## 02. LISTS & STEPS

### 4. Bullet List
**Use when:** Summarizing key items, capabilities, or takeaways in Coven's signature diamond bullet style.

**Snippet:**
```html
<!-- BLOCK: Bullet List -->
<div class="block-bullet-list">
  <h3 class="list-title">Core Archetype Principles</h3>
  <ul class="bullets-list">
    <li><strong>Deterministic Scoring:</strong> Propensity matrices calibrated against 90-day rolling interaction windows.</li>
    <li><strong>Audience Saturation Wards:</strong> Frequency caps preventing contact fatigue before unsubscribe events occur.</li>
    <li><strong>Temporal Synchronization:</strong> Message dispatch windows aligned with local subscriber engagement peaks.</li>
  </ul>
</div>
<!-- END BLOCK: Bullet List -->
```

**Classes:**
- `block-bullet-list`
- `list-title`
- `bullets-list`

---

### 5. Numbered Steps
**Use when:** Providing chronological tutorials, setup procedures, or implementation walkthroughs.

**Snippet:**
```html
<!-- BLOCK: Numbered Steps -->
<div class="block-numbered-steps">
  <h3 class="list-title">Implementation Ritual Steps</h3>
  <ol class="steps-list">
    <li class="step-item">
      <div class="step-badge">01</div>
      <div class="step-content">
        <h4>Telemetry Verification</h4>
        <p>Verify that your business unit has captured a minimum threshold of 50,000 interactions.</p>
      </div>
    </li>
    <li class="step-item">
      <div class="step-badge">02</div>
      <div class="step-content">
        <h4>Feature Activation</h4>
        <p>Navigate to Setup &gt; Einstein &gt; Engagement Scoring and toggle the activation rune.</p>
      </div>
    </li>
    <li class="step-item">
      <div class="step-badge">03</div>
      <div class="step-content">
        <h4>Model Training Horizon</h4>
        <p>Allow 48 to 72 hours for the predictive engine to calculate initial propensity deciles.</p>
      </div>
    </li>
    <li class="step-item">
      <div class="step-badge">04</div>
      <div class="step-content">
        <h4>Journey Builder Deployment</h4>
        <p>Insert Einstein Split activities into active journeys to steer contacts dynamically.</p>
      </div>
    </li>
  </ol>
</div>
<!-- END BLOCK: Numbered Steps -->
```

**Classes:**
- `block-numbered-steps`
- `list-title`
- `steps-list`
- `step-item`
- `step-badge`
- `step-content`

---

## 03. COLUMN LAYOUTS

### 6. Text | Image
**Use when:** Placing narrative copy on the left and supporting visual diagram on the right (stacks gracefully on mobile).

**Snippet:**
```html
<!-- BLOCK: Text | Image -->
<div class="layout-text-media">
  <div class="layout-copy">
    <h3>Quadrant Propensity Matrix</h3>
    <p>
      This example demonstrates a 50/50 desktop layout with copy on the left and supporting visual media on the right.
    </p>
  </div>
  <figure class="layout-media">
    <img src={scoringImg.src} alt="Quadrant Propensity Matrix demonstration" width="600" height="420" loading="lazy" />
    <figcaption>Figure — Behavioral quadrant distribution across active contact base.</figcaption>
  </figure>
</div>
<!-- END BLOCK: Text | Image -->
```

**Classes:**
- `layout-text-media`
- `layout-copy`
- `layout-media`

---

### 7. Image | Text
**Use when:** Placing a diagram or illustration on the left and narrative on the right (image stays on top on mobile).

**Snippet:**
```html
<!-- BLOCK: Image | Text -->
<div class="layout-media-text">
  <figure class="layout-media">
    <img src={timingImg.src} alt="Temporal send time optimization distribution" width="600" height="420" loading="lazy" />
    <figcaption>Figure — 168-hour probability matrix modeled per individual subscriber.</figcaption>
  </figure>
  <div class="layout-copy">
    <h3>Temporal Distribution Curves</h3>
    <p>
      This pattern places media on the left and technical narrative on the right using semantic DOM order.
    </p>
  </div>
</div>
<!-- END BLOCK: Image | Text -->
```

**Classes:**
- `layout-media-text`
- `layout-media`
- `layout-copy`

---

### 8. Two Text Columns
**Use when:** Comparing two parallel concepts, components, or complementary subsystems side-by-side.

**Snippet:**
```html
<!-- BLOCK: Two Text Columns -->
<div class="layout-2col">
  <div class="col-box">
    <h3>Inbound Channel Architecture</h3>
    <p>
      Column A focuses on inbound engagement streams and telemetry ingestion.
    </p>
    <ul class="col-list">
      <li>API-triggered transactional events</li>
      <li>Real-time behavioral web events</li>
    </ul>
  </div>
  <div class="col-box">
    <h3>Outbound Orchestration Pipeline</h3>
    <p>
      Column B addresses outbound dispatch engines and automatic throttle policies.
    </p>
    <ul class="col-list">
      <li>Dynamic journey split routing</li>
      <li>Predictive quiet-hour suppression</li>
    </ul>
  </div>
</div>
<!-- END BLOCK: Two Text Columns -->
```

**Classes:**
- `layout-2col`
- `col-box`
- `col-list`

---

### 9. Three Columns
**Use when:** Presenting three foundational pillars, service tiers, or architectural concepts (3 desktop &rarr; 2+1 tablet &rarr; 1 mobile).

**Snippet:**
```html
<!-- BLOCK: Three Columns -->
<div class="layout-3col">
  <div class="col-box">
    <div class="col-kicker">PILLAR I</div>
    <h3>Telemetry Ingestion</h3>
    <p>Captures continuous subscriber behavioral streams across enterprise business units.</p>
  </div>
  <div class="col-box">
    <div class="col-kicker">PILLAR II</div>
    <h3>Predictive Modeling</h3>
    <p>Executes weekly machine learning training cycles, refreshing persona deciles.</p>
  </div>
  <div class="col-box">
    <div class="col-kicker">PILLAR III</div>
    <h3>Journey Activation</h3>
    <p>Translates model scores into deterministic splits inside automated journeys.</p>
  </div>
</div>
<!-- END BLOCK: Three Columns -->
```

**Classes:**
- `layout-3col`
- `col-box`
- `col-kicker`

---

## 04. IMAGES & MEDIA

### 10. Single Image
**Use when:** Displaying a single bounded diagram or illustration with border and caption.

**Snippet:**
```html
<!-- BLOCK: Single Image -->
<figure class="figure-single">
  <img src={coverImg.src} alt="Standard single figure diagram" width="1000" height="480" loading="lazy" />
  <figcaption>Figure — Standard contained figure with subtle border and stylized caption.</figcaption>
</figure>
<!-- END BLOCK: Single Image -->
```

**Classes:**
- `figure-single`

---

### 11. Full Width Image
**Use when:** Displaying large end-to-end architectural blueprints or sequence diagrams across the main content area.

**Snippet:**
```html
<!-- BLOCK: Full Width Image -->
<figure class="figure-full">
  <img src={diagramImg.src} alt="Full width architecture diagram" width="1200" height="600" loading="lazy" />
  <figcaption>Figure — Full-width technical diagram spanning the entire width of the editorial column.</figcaption>
</figure>
<!-- END BLOCK: Full Width Image -->
```

**Classes:**
- `figure-full`

---

### 12. Two Images Grid
**Use when:** Comparing two artifacts or screenshots side-by-side with independent captions.

**Snippet:**
```html
<!-- BLOCK: Two Images Grid -->
<div class="image-grid-2">
  <figure class="figure-item">
    <img src={gridItem1.src} alt="Artifact classification asset" width="600" height="380" loading="lazy" />
    <figcaption>Artifact 01 — Asset clustering and classification model.</figcaption>
  </figure>
  <figure class="figure-item">
    <img src={gridItem2.src} alt="Audience fatigue saturation curve" width="600" height="380" loading="lazy" />
    <figcaption>Artifact 02 — Audience fatigue saturation threshold curve.</figcaption>
  </figure>
</div>
<!-- END BLOCK: Two Images Grid -->
```

**Classes:**
- `image-grid-2`
- `figure-item`

---

### 13. Three Images Grid
**Use when:** Showcasing a triad of related visual assets or state progressions (3 desktop &rarr; 2 tablet &rarr; 1 mobile).

**Snippet:**
```html
<!-- BLOCK: Three Images Grid -->
<div class="image-grid-3">
  <figure class="figure-item">
    <img src={gridItem1.src} alt="Visual feature classification" width="600" height="380" loading="lazy" />
    <figcaption>Matrix A — Visual feature clustering</figcaption>
  </figure>
  <figure class="figure-item">
    <img src={gridItem2.src} alt="Fatigue threshold analysis" width="600" height="380" loading="lazy" />
    <figcaption>Matrix B — Fatigue threshold analysis</figcaption>
  </figure>
  <figure class="figure-item">
    <img src={gridItem3.src} alt="NLP subject line prediction" width="600" height="380" loading="lazy" />
    <figcaption>Matrix C — NLP subject prediction</figcaption>
  </figure>
</div>
<!-- END BLOCK: Three Images Grid -->
```

**Classes:**
- `image-grid-3`
- `figure-item`

---

### 14. Horizontal Gallery Scroll
**Use when:** Displaying a carousel-like sequence of multiple artifacts or UI cards without automated auto-play.

**Snippet:**
```html
<!-- BLOCK: Horizontal Gallery Scroll -->
<div class="horizontal-scroll-wrap">
  <div class="horizontal-scroll" role="region" aria-label="Horizontal image gallery" tabindex="0">
    <figure class="gallery-card">
      <img src={gridItem1.src} alt="Gallery item 1 - Propensity Matrix" width="360" height="230" loading="lazy" />
      <figcaption>01 · Propensity Matrix Overview</figcaption>
    </figure>
    <figure class="gallery-card">
      <img src={gridItem2.src} alt="Gallery item 2 - Saturation Curve" width="360" height="230" loading="lazy" />
      <figcaption>02 · Saturation Decay Curve</figcaption>
    </figure>
    <figure class="gallery-card">
      <img src={gridItem3.src} alt="Gallery item 3 - Frequency Model" width="360" height="230" loading="lazy" />
      <figcaption>03 · Frequency Threshold Model</figcaption>
    </figure>
    <figure class="gallery-card">
      <img src={coverImg.src} alt="Gallery item 4 - Holistic Pipeline" width="360" height="230" loading="lazy" />
      <figcaption>04 · Holistic Pipeline Topology</figcaption>
    </figure>
  </div>
  <div class="gallery-scroll-hint">✦ Scroll horizontally to inspect model artifacts</div>
</div>
<!-- END BLOCK: Horizontal Gallery Scroll -->
```

**Classes:**
- `horizontal-scroll-wrap`
- `horizontal-scroll`
- `gallery-card`
- `gallery-scroll-hint`

---

## 05. CARDS & COMPARISONS

### 15. 2-Card Grid
**Use when:** Highlighting two major feature cards with glyph icons and descriptions.

**Snippet:**
```html
<!-- BLOCK: 2-Card Grid -->
<div class="card-grid-2">
  <div class="pattern-card">
    <div class="pattern-card-icon">✧</div>
    <h3 class="pattern-card-title">Supervised Propensity Models</h3>
    <p class="pattern-card-desc">Trained on historical engagement outcomes to classify subscribers into deciles.</p>
  </div>
  <div class="pattern-card">
    <div class="pattern-card-icon">◈</div>
    <h3 class="pattern-card-title">Unsupervised Cluster Models</h3>
    <p class="pattern-card-desc">Detects emergent subscriber groupings without pre-labeled categories.</p>
  </div>
</div>
<!-- END BLOCK: 2-Card Grid -->
```

**Classes:**
- `card-grid-2`
- `pattern-card`
- `pattern-card-icon`
- `pattern-card-title`
- `pattern-card-desc`

---

### 16. 3-Card Grid
**Use when:** Categorizing three functional modules or architectural components.

**Snippet:**
```html
<!-- BLOCK: 3-Card Grid -->
<div class="card-grid-3">
  <div class="pattern-card">
    <div class="pattern-card-icon">✉</div>
    <h3 class="pattern-card-title">Asset Propensity</h3>
    <p class="pattern-card-desc">Evaluates image tags, color palettes, and CTA phrasing.</p>
  </div>
  <div class="pattern-card">
    <div class="pattern-card-icon">⚙</div>
    <h3 class="pattern-card-title">Fatigue Horizons</h3>
    <p class="pattern-card-desc">Tracks saturation thresholds, redirecting recipients to passive holding paths.</p>
  </div>
  <div class="pattern-card">
    <div class="pattern-card-icon">✦</div>
    <h3 class="pattern-card-title">Lexical Predictor</h3>
    <p class="pattern-card-desc">Applies natural language analysis to subject lines to detect fatigue.</p>
  </div>
</div>
<!-- END BLOCK: 3-Card Grid -->
```

**Classes:**
- `card-grid-3`
- `pattern-card`
- `pattern-card-icon`
- `pattern-card-title`
- `pattern-card-desc`

---

### 17. 50/50 Comparison
**Use when:** Comparing two technologies, approaches, or channels (e.g., Email vs MobilePush, Before vs After).

**Snippet:**
```html
<!-- BLOCK: 50/50 Comparison -->
<div class="comparison-split">
  <div class="comparison-column">
    <div class="comparison-col-header">
      <span class="comparison-col-icon">✉</span>
      <span>EMAIL STUDIO SIGNALS</span>
    </div>
    <ul class="comparison-list">
      <li>Unique and cumulative open timestamps</li>
      <li>Explicit click tracking and link category affinity</li>
    </ul>
  </div>
  <div class="comparison-column">
    <div class="comparison-col-header">
      <span class="comparison-col-icon">◈</span>
      <span>MOBILEPUSH SIGNALS</span>
    </div>
    <ul class="comparison-list">
      <li>Direct application opens from push banners</li>
      <li>In-app session duration following notification</li>
    </ul>
  </div>
</div>
<!-- END BLOCK: 50/50 Comparison -->
```

**Classes:**
- `comparison-split`
- `comparison-column`
- `comparison-col-header`
- `comparison-col-icon`
- `comparison-list`

---

### 18. Stats & Metrics
**Use when:** Highlighting quantitative metrics, benchmark percentages, or performance results in three columns.

**Snippet:**
```html
<!-- BLOCK: Stats & Metrics -->
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-number">12</div>
    <div class="stat-label">Active Journeys</div>
    <div class="stat-sub">Multi-cloud orchestration</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">89%</div>
    <div class="stat-label">Engagement Rate</div>
    <div class="stat-sub">Model-guided optimization</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">42K</div>
    <div class="stat-label">Contacts Scored</div>
    <div class="stat-sub">90-day rolling window</div>
  </div>
</div>
<!-- END BLOCK: Stats & Metrics -->
```

**Classes:**
- `stats-grid`
- `stat-card`
- `stat-number`
- `stat-label`
- `stat-sub`

---

## 06. TABLES

### 19. Responsive Technical Table
**Use when:** Displaying technical feature matrices or API specifications that safely scroll horizontally on mobile.

**Snippet:**
```html
<!-- BLOCK: Responsive Technical Table -->
<div class="table-wrap">
  <table class="coven-table">
    <thead>
      <tr>
        <th>Feature</th>
        <th>Email</th>
        <th>Push</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Engagement Scoring</strong></td>
        <td>Available</td>
        <td>Available</td>
        <td><span class="table-status status-active">Active</span></td>
      </tr>
      <tr>
        <td><strong>Send Time Optimization</strong></td>
        <td>Available</td>
        <td>Beta</td>
        <td><span class="table-status status-beta">Beta</span></td>
      </tr>
      <tr>
        <td><strong>Frequency Throttling</strong></td>
        <td>N/A</td>
        <td>N/A</td>
        <td><span class="table-status status-disabled">Disabled</span></td>
      </tr>
    </tbody>
  </table>
</div>
<!-- END BLOCK: Responsive Technical Table -->
```

**Classes:**
- `table-wrap`
- `coven-table`
- `table-status`
- `status-active`, `status-beta`, `status-disabled`

---

## 07. CALLOUTS & QUOTES

### 20. Callouts (Info, Warning, Tip, Note)
**Use when:** Highlighting critical system warnings, practical tips, or arcane notices.

**Snippet:**
```html
<!-- BLOCK: Callouts (Info, Warning, Tip, Note) -->
<Callout type="info" title="Arcane Telemetry Note">
  <p>Informational advisory regarding telemetry thresholds.</p>
</Callout>

<Callout type="warning" title="Ward of Caution">
  <p>System warning regarding asynchronous conflicts.</p>
</Callout>

<Callout type="tip" title="Craft Mastery Tip">
  <p>Practical developer recommendation or optimization trick.</p>
</Callout>

<Callout type="note" title="Grimoire Reference">
  <p>Reference link or supplemental reading source.</p>
</Callout>
<!-- END BLOCK: Callouts (Info, Warning, Tip, Note) -->
```

**Components:**
- `Callout.astro` (`type="info" | "warning" | "tip" | "note"`)

---

### 21. Pullquote
**Use when:** Giving prominence to a philosophical principle, aphorism, or notable quote.

**Snippet:**
```html
<!-- BLOCK: Pullquote -->
<div class="pullquote">
  <p class="pullquote-text">
    "A predictive algorithm that operates without architectural intent is merely noise cast into the dark."
  </p>
  <span class="pullquote-author">— Coven Principle of Predictive Divination</span>
</div>
<!-- END BLOCK: Pullquote -->
```

**Classes:**
- `pullquote`
- `pullquote-text`
- `pullquote-author`

---

## 08. CODE

### 22. Code Block
**Use when:** Displaying syntax-highlighted code snippets with copy button, filename header, and intact line breaks.

**Snippet:**
```html
<!-- BLOCK: Code Block -->
<CodeBlock title="EinsteinSyncHandler.cls" language="apex">
{`public with sharing class EinsteinSyncHandler {
    public static void run() {
        System.debug('Executing sync handler...');
    }
}`}
</CodeBlock>
<!-- END BLOCK: Code Block -->
```

**Components:**
- `CodeBlock.astro` (`title="..." language="apex | json | js | sql"`)

---

## 09. INTERACTION

### 23. FAQ Accordion
**Use when:** Answering common implementation doubts or architectural questions in collapsible rows.

**Snippet:**
```html
<!-- BLOCK: FAQ Accordion -->
<div class="faq-list">
  <details class="faq-item">
    <summary>How long does initial model training take?</summary>
    <div class="faq-body">
      <p>Initial model calibration requires 48 to 72 hours once telemetry thresholds are reached.</p>
    </div>
  </details>
  <details class="faq-item">
    <summary>Can scores be exported to Data Extensions?</summary>
    <div class="faq-body">
      <p>Yes, query the system data extension views using Automation Studio SQL queries.</p>
    </div>
  </details>
</div>
<!-- END BLOCK: FAQ Accordion -->
```

**Classes:**
- `faq-list`
- `faq-item`
- `faq-body`

---

### 24. Exercises with Reveal Answer
**Use when:** Testing reader comprehension with scenario-based trials and an expandable reveal button.

**Snippet:**
```html
<!-- BLOCK: Exercises with Reveal Answer -->
<div class="exercise-group">
  <div class="exercise-card">
    <span class="exercise-badge">TRIAL SCENARIO 01</span>
    <p class="exercise-scenario">
      <strong>Scenario:</strong> Describe the scenario challenge presented to the initiate.
    </p>
    <button type="button" class="reveal-btn" aria-expanded="false" data-target="ans-unique-id">
      <span>✦ Reveal Answer</span>
    </button>
    <div id="ans-unique-id" class="reveal-answer">
      <strong>Solution: Recommended Pattern.</strong>
      <p>Detailed architectural resolution explanation.</p>
    </div>
  </div>
</div>
<!-- END BLOCK: Exercises with Reveal Answer -->
```

**Classes:**
- `exercise-group`
- `exercise-card`
- `exercise-badge`
- `exercise-scenario`
- `reveal-btn`
- `reveal-answer`

---

## 10. CLOSING CONTENT

### 25. Key Takeaways
**Use when:** Summarizing the 3-5 core doctrines the initiate must remember before concluding the scroll.

**Snippet:**
```html
<!-- BLOCK: Key Takeaways -->
<div class="takeaways-box">
  <h3 class="takeaways-title">
    <span>✦</span>
    <span>Key Takeaways for the Initiate</span>
  </h3>
  <ul class="takeaways-list">
    <li><strong>Core Rule 1:</strong> Always calibrate telemetry before activating model splits.</li>
    <li><strong>Core Rule 2:</strong> Guard against audience fatigue using saturation caps.</li>
  </ul>
</div>
<!-- END BLOCK: Key Takeaways -->
```

**Classes:**
- `takeaways-box`
- `takeaways-title`
- `takeaways-list`

---

### 26. Related Documentation
**Use when:** Guiding the reader to external official documentation or complementary Coven scrolls.

**Snippet:**
```html
<!-- BLOCK: Related Documentation -->
<div class="related-grid">
  <a href="#" class="related-card" onclick="return false;">
    <div>
      <div class="related-type">EXTERNAL DOCUMENTATION</div>
      <h4 class="related-title">Official Salesforce Documentation Guide</h4>
    </div>
    <div class="related-cta">
      <span>help.salesforce.com</span>
      <span>↗</span>
    </div>
  </a>

  <a href="/article/apex-triggers-without-tears" class="related-card">
    <div>
      <div class="related-type">COVEN SCROLL · APEX</div>
      <h4 class="related-title">The Apex Incantation: Triggers Without Tears</h4>
    </div>
    <div class="related-cta">
      <span>Study scroll</span>
      <span>→</span>
    </div>
  </a>
</div>
<!-- END BLOCK: Related Documentation -->
```

**Classes:**
- `related-grid`
- `related-card`
- `related-type`
- `related-title`
- `related-cta`

---

### 27. Next Article Navigation
**Use when:** Concluding the scroll with a back-link to the Library and a direct card to the next recommended article.

**Snippet:**
```html
<!-- BLOCK: Next Article -->
<div class="article-nav-block">
  <a href="/library" class="nav-back-link">
    <span>← BACK TO THE GRIMOIRE</span>
  </a>

  <a href="/article/apex-triggers-without-tears" class="nav-next-card">
    <div>
      <div class="nav-next-label">NEXT SCROLL · APEX</div>
      <div class="nav-next-title">The Apex Incantation: Triggers Without Tears</div>
    </div>
    <span class="nav-next-arrow">→</span>
  </a>
</div>
<!-- END BLOCK: Next Article -->
```

**Classes:**
- `article-nav-block`
- `nav-back-link`
- `nav-next-card`
- `nav-next-label`
- `nav-next-title`
- `nav-next-arrow`
