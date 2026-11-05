// scratch/create_comprehensive_preview_draft.cjs
const fs = require('fs');
const path = require('path');

const uatDraftsDir = path.resolve('.uat-article-forge/drafts');
fs.mkdirSync(uatDraftsDir, { recursive: true });

const doc = {
  version: 1,
  studioId: "qa_preview_parity_draft",
  slug: "qa-preview-parity-scroll",
  revision: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  meta: {
    title: "The Architecture of Arcane Layouts",
    description: "An exhaustive masterwork exploring the spatial synthesis of CSS Grid, Section slots, and canonical Coven article blocks.",
    author: "Oracle of Orgs",
    category: "Architecture",
    difficulty: "Lv. 4 - Grimoire",
    tags: ["GRID", "SPATIAL", "COVEN", "UAT"],
    rank: "Master",
    readingTime: "18 min",
    aetherReward: 250,
    status: "draft",
    featured: true,
    wide: true,
    coverImageSrc: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    coverImageAlt: "Arcane silicon grid representing computational memory",
    coverCaption: "Figure 1.0 — The Sacred Matrix of Grid Coordinates",
    showCoverImageOnArticle: true,
    publishedDate: "2026-11-04",
    updatedDate: "2026-11-04"
  },
  sections: [
    {
      id: "sacred-foundations",
      title: "Sacred Foundations",
      kicker: "01 · SPATIAL MATRIX",
      heading: "The Primordial Grid Structure",
      visualGrid: {
        columns: 3,
        rows: 2,
        columnGap: 24,
        rowGap: 24,
        minRowHeight: 90,
        slots: [
          {
            id: "slot-foundations-lead",
            label: "Lead Banner",
            columnStart: 1,
            columnEnd: 4,
            rowStart: 1,
            rowEnd: 2,
            block: {
              id: "blk-foundations-title",
              type: "title-text",
              data: {
                heading: "Grid Coordinates Unveil Higher Geometry",
                paragraphs: [
                  "In the ancient days of digital scribing, content flowed in an unyielding single column. Through the Article Forge, Sections now channel multidimensional power.",
                  "Here we observe how slots anchor reality, harmonizing with <a class=\"article-rich-link\" href=\"/library\">Quantum Matrices</a> across all viewports."
                ],
                showText: true
              }
            }
          },
          {
            id: "slot-foundations-quote",
            label: "Wisdom Quote",
            columnStart: 1,
            columnEnd: 3,
            rowStart: 2,
            rowEnd: 3,
            block: {
              id: "blk-foundations-quote",
              type: "pullquote",
              data: {
                quote: "The visual grid does not merely contain truth; it shapes the cognitive trajectory of the seeker.",
                author: "Grand Magus of Layouts"
              }
            }
          },
          {
            id: "slot-foundations-stat",
            label: "Stat Metric",
            columnStart: 3,
            columnEnd: 4,
            rowStart: 2,
            rowEnd: 3,
            block: {
              id: "blk-foundations-stat",
              type: "stats-metrics",
              data: {
                stat1Num: "100%",
                stat1Label: "Visual Parity",
                stat1Sub: "Exact alignment with canonical Coven presentation",
                stat2Num: "26",
                stat2Label: "Block Types",
                stat2Sub: "Fully supported in Section Grid Slots",
                stat3Num: "0",
                stat3Label: "Editor Chrome",
                stat3Sub: "Pure reader view"
              }
            }
          }
        ]
      },
      blocks: []
    },
    {
      id: "quantum-matrices",
      title: "Quantum Matrices & Code",
      kicker: "02 · SYNTAX & RUNTIME",
      heading: "Executing the Arcane Compilation",
      visualGrid: {
        columns: 2,
        rows: 3,
        columnGap: 20,
        rowGap: 20,
        minRowHeight: 80,
        slots: [
          {
            id: "slot-code",
            label: "Luau Code",
            columnStart: 1,
            columnEnd: 2,
            rowStart: 1,
            rowEnd: 2,
            block: {
              id: "blk-code",
              type: "code-block",
              data: {
                title: "MatrixForge.luau",
                language: "lua",
                code: "-- Sacred Grid Initializer\nlocal Grid = {}\nfunction Grid.forge(columns, rows)\n  return setmetatable({ cols = columns, rows = rows }, Grid)\nend\nreturn Grid"
              }
            }
          },
          {
            id: "slot-cards2",
            label: "2-Card Grid",
            columnStart: 2,
            columnEnd: 3,
            rowStart: 1,
            rowEnd: 2,
            block: {
              id: "blk-cards2",
              type: "card-grid-2",
              data: {
                card1Icon: "✧",
                card1Title: "Spatial Matrix",
                card1Desc: "Grid coordinates shape the canvas structure.",
                card2Icon: "◈",
                card2Title: "Slot Bounds",
                card2Desc: "Slots hold canonical blocks in exact coordinates."
              }
            }
          },
          {
            id: "slot-callout",
            label: "Warning Callout",
            columnStart: 1,
            columnEnd: 3,
            rowStart: 2,
            rowEnd: 3,
            block: {
              id: "blk-callout",
              type: "callout",
              data: {
                calloutType: "warning",
                text: "Dimensional Boundary Warning: Never mutate canonical systems while operating in UAT sandbox coordinates."
              }
            }
          },
          {
            id: "slot-trial",
            label: "Arcane Trial",
            columnStart: 1,
            columnEnd: 2,
            rowStart: 3,
            rowEnd: 4,
            block: {
              id: "blk-trial",
              type: "article-trial",
              data: {
                title: "Section Grid Mastery",
                intro: "Test your mastery of the visual grid.",
                buttonText: "BEGIN THE TRIAL",
                questions: [
                  {
                    id: "q1",
                    question: "What governs the body of every Section in the Article Forge?",
                    answers: [
                      { id: "a1", text: "The Visual Grid", correct: true },
                      { id: "a2", text: "Flexible Layout", correct: false }
                    ],
                    explanation: "The Visual Grid is the direct spatial body of every Section."
                  }
                ]
              }
            }
          },
          {
            id: "slot-exercise",
            label: "Exercise",
            columnStart: 2,
            columnEnd: 3,
            rowStart: 3,
            rowEnd: 4,
            block: {
              id: "blk-exercise",
              type: "exercise",
              data: {
                badge: "TRIAL SCENARIO 01",
                scenario: "How do grid slots behave on mobile screens?",
                buttonText: "✦ Reveal Answer",
                solutionTitle: "Mobile Stacking Pattern",
                solutionText: "Slots stack deterministically in reading order (rowStart ASC, colStart ASC)."
              }
            }
          }
        ]
      },
      blocks: []
    },
    {
      id: "spatial-synthesis",
      title: "Spatial Synthesis & Taxonomy",
      kicker: "03 · MULTI-BLOCK PARITY",
      heading: "Demonstrating Diverse Block Types",
      visualGrid: {
        columns: 4,
        rows: 4,
        columnGap: 16,
        rowGap: 16,
        minRowHeight: 80,
        slots: [
          {
            id: "slot-solo-text",
            label: "Editorial Text",
            columnStart: 1,
            columnEnd: 5,
            rowStart: 1,
            rowEnd: 2,
            block: {
              id: "blk-solo",
              type: "solo-text",
              data: {
                paragraphs: [
                  "Deep block harmonization unites technical typography with arcane design language. Every slot acts as a portal into structured knowledge."
                ]
              }
            }
          },
          {
            id: "slot-nested-bullets",
            label: "Nested Bullets",
            columnStart: 1,
            columnEnd: 3,
            rowStart: 2,
            rowEnd: 3,
            block: {
              id: "blk-nested-bullets",
              type: "nested-bullets",
              data: {
                layout: "vertical",
                items: [
                  {
                    id: "nb1",
                    text: "Article Hierarchy",
                    children: [
                      { id: "nb1_1", text: "Section Grid Architecture" },
                      { id: "nb1_2", text: "Slot Coordinates & Geometry" }
                    ]
                  }
                ]
              }
            }
          },
          {
            id: "slot-empty-spacer",
            label: "Spacer",
            columnStart: 3,
            columnEnd: 4,
            rowStart: 2,
            rowEnd: 3,
            block: null
          },
          {
            id: "slot-takeaways",
            label: "Key Takeaways",
            columnStart: 4,
            columnEnd: 5,
            rowStart: 2,
            rowEnd: 3,
            block: {
              id: "blk-takeaways",
              type: "key-takeaways",
              data: {
                title: "Essential Laws",
                items: [
                  { id: "kt1", term: "Spatial Grid", desc: "Defines section dimensions" },
                  { id: "kt2", term: "Slots", desc: "Enforce spatial boundaries" }
                ]
              }
            }
          },
          {
            id: "slot-comparison",
            label: "Comparison",
            columnStart: 1,
            columnEnd: 3,
            rowStart: 3,
            rowEnd: 4,
            block: {
              id: "blk-comparison",
              type: "comparison",
              data: {
                col1Icon: "✉",
                col1Header: "Traditional Studio",
                col1Items: [{ id: "c1", text: "Linear single column" }],
                col2Icon: "◈",
                col2Header: "Article Forge",
                col2Items: [{ id: "c2", text: "2D Visual Grid Matrix" }]
              }
            }
          },
          {
            id: "slot-steps",
            label: "Numbered Steps",
            columnStart: 3,
            columnEnd: 5,
            rowStart: 3,
            rowEnd: 4,
            block: {
              id: "blk-steps",
              type: "numbered-steps",
              data: {
                steps: [
                  { id: "s1", badge: "01", title: "Configure Grid", text: "Set columns and gaps" },
                  { id: "s2", badge: "02", title: "Span Slots", text: "Create regions visually" }
                ]
              }
            }
          },
          {
            id: "slot-faq",
            label: "FAQ Accordion",
            columnStart: 1,
            columnEnd: 5,
            rowStart: 4,
            rowEnd: 5,
            block: {
              id: "blk-faq",
              type: "faq",
              data: {
                items: [
                  {
                    id: "faq1",
                    question: "Is the visual grid strictly isolated from canonical Article Studio?",
                    answer: "Yes, all grid structures live entirely within UAT Article Forge under .uat-article-forge."
                  }
                ]
              }
            }
          }
        ]
      },
      blocks: []
    }
  ]
};

const targetPath = path.join(uatDraftsDir, 'qa_preview_parity_draft.json');
fs.writeFileSync(targetPath, JSON.stringify(doc, null, 2), 'utf-8');
console.log('Created comprehensive UAT QA preview draft at:', targetPath);
