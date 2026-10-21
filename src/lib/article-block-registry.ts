export interface BlockDefinition {
  type: string;
  label: string;
  category: string;
  description: string;
  defaultData: Record<string, any>;
}

export const ARTICLE_BLOCK_CATEGORIES = [
  '01 Basic Typography',
  '02 Lists & Steps',
  '03 Column Layouts',
  '04 Images & Media',
  '05 Cards & Comparisons',
  '06 Technical Tables',
  '07 Callouts & Quotes',
  '08 Code Inscriptions',
  '09 Interactive Blocks',
  '10 Closing Content',
] as const;

export const ARTICLE_BLOCK_REGISTRY: Record<string, BlockDefinition> = {
  // ── 01. BASIC TYPOGRAPHY ──
  'title-text': {
    type: 'title-text',
    label: 'Title + Text',
    category: '01 Basic Typography',
    description: 'Thematic kicker, section heading, and body paragraphs.',
    defaultData: {
      heading: '',
      paragraphs: [''],
    },
  },
  'text-title': {
    type: 'text-title',
    label: 'Text + Title',
    category: '01 Basic Typography',
    description: 'Introductory bridge paragraph transitioning into a secondary heading.',
    defaultData: {
      intro: '',
      heading: '',
      paragraph: '',
    },
  },
  'solo-text': {
    type: 'solo-text',
    label: 'Solo Text',
    category: '01 Basic Typography',
    description: 'Continuous editorial narrative paragraphs with inline formatting.',
    defaultData: {
      paragraphs: [''],
    },
  },

  // ── 02. LISTS & STEPS ──
  'bullet-list': {
    type: 'bullet-list',
    label: 'Bullet List',
    category: '02 Lists & Steps',
    description: 'Summarize key points in signature diamond bullet style.',
    defaultData: {
      items: [
        { id: 'b_item_1', text: '' },
      ],
    },
  },
  'nested-bullets': {
    type: 'nested-bullets',
    label: 'Nested Bullet List',
    category: '02 Lists & Steps',
    description: 'Hierarchical bullets with primary and sub-level items.',
    defaultData: {
      items: [
        {
          id: 'nb_item_1',
          text: '',
          children: [],
        },
      ],
    },
  },
  'numbered-steps': {
    type: 'numbered-steps',
    label: 'Numbered Steps',
    category: '02 Lists & Steps',
    description: 'Sequential procedures, rituals, or setup instructions.',
    defaultData: {
      steps: [
        { id: 'step_1', badge: '01', title: '', text: '' },
      ],
    },
  },

  // ── 03. COLUMN LAYOUTS ──
  'text-image': {
    type: 'text-image',
    label: 'Text + Image',
    category: '03 Column Layouts',
    description: '50/50 layout with technical copy on left and diagram on right.',
    defaultData: {
      text: '',
      imageSrc: '',
      alt: '',
      caption: '',
    },
  },
  'image-text': {
    type: 'image-text',
    label: 'Image + Text',
    category: '03 Column Layouts',
    description: '50/50 layout with diagram on left and narrative on right.',
    defaultData: {
      imageSrc: '',
      alt: '',
      caption: '',
      text: '',
    },
  },
  'two-columns': {
    type: 'two-columns',
    label: 'Two Text Columns',
    category: '03 Column Layouts',
    description: 'Parallel concepts or complementary subsystems side-by-side.',
    defaultData: {
      col1Title: '',
      col1Text: '',
      col2Title: '',
      col2Text: '',
    },
  },
  'three-columns': {
    type: 'three-columns',
    label: 'Three Columns',
    category: '03 Column Layouts',
    description: 'Three foundational pillars or architectural tiers.',
    defaultData: {
      columns: [
        { id: 'col_1', kicker: 'PILLAR I', title: '', text: '' },
        { id: 'col_2', kicker: 'PILLAR II', title: '', text: '' },
        { id: 'col_3', kicker: 'PILLAR III', title: '', text: '' },
      ],
    },
  },

  // ── 04. IMAGES & MEDIA ──
  'single-image': {
    type: 'single-image',
    label: 'Single Image',
    category: '04 Images & Media',
    description: 'Standard bounded diagram or figure with caption.',
    defaultData: {
      src: '',
      alt: '',
      caption: '',
    },
  },
  'full-image': {
    type: 'full-image',
    label: 'Full Width Image',
    category: '04 Images & Media',
    description: 'Full-width technical diagram spanning the editorial column.',
    defaultData: {
      src: '',
      alt: '',
      caption: '',
    },
  },
  'two-images': {
    type: 'two-images',
    label: 'Two Images Grid',
    category: '04 Images & Media',
    description: 'Side-by-side comparison of two visual artifacts.',
    defaultData: {
      img1Src: '',
      img1Alt: '',
      img1Caption: '',
      img2Src: '',
      img2Alt: '',
      img2Caption: '',
    },
  },
  'three-images': {
    type: 'three-images',
    label: 'Three Images Grid',
    category: '04 Images & Media',
    description: 'Triad of visual assets or state progressions.',
    defaultData: {
      img1Src: '',
      img1Alt: '',
      img1Caption: '',
      img2Src: '',
      img2Alt: '',
      img2Caption: '',
      img3Src: '',
      img3Alt: '',
      img3Caption: '',
    },
  },
  'gallery-scroll': {
    type: 'gallery-scroll',
    label: 'Horizontal Gallery Scroll',
    category: '04 Images & Media',
    description: 'Horizontal scrollable gallery of model artifacts or cards.',
    defaultData: {
      cards: [
        { id: 'g_card_1', src: '', alt: '', caption: '' },
      ],
      hint: '✦ Scroll horizontally to inspect model artifacts',
    },
  },

  // ── 05. CARDS & COMPARISONS ──
  'card-grid-2': {
    type: 'card-grid-2',
    label: '2-Card Grid',
    category: '05 Cards & Comparisons',
    description: 'Two feature pattern cards with glyph icons.',
    defaultData: {
      card1Icon: '✧',
      card1Title: '',
      card1Desc: '',
      card2Icon: '◈',
      card2Title: '',
      card2Desc: '',
    },
  },
  'card-grid-3': {
    type: 'card-grid-3',
    label: '3-Card Grid',
    category: '05 Cards & Comparisons',
    description: 'Three functional modules or architectural components.',
    defaultData: {
      card1Icon: '✧',
      card1Title: '',
      card1Desc: '',
      card2Icon: '⚙',
      card2Title: '',
      card2Desc: '',
      card3Icon: '✦',
      card3Title: '',
      card3Desc: '',
    },
  },
  'comparison': {
    type: 'comparison',
    label: '50/50 Comparison',
    category: '05 Cards & Comparisons',
    description: 'Compare two technologies, approaches, or channels side-by-side.',
    defaultData: {
      col1Icon: '✉',
      col1Header: 'SIDE A',
      col1Items: [
        { id: 'cmp_1', text: '' },
      ],
      col2Icon: '◈',
      col2Header: 'SIDE B',
      col2Items: [
        { id: 'cmp_2', text: '' },
      ],
    },
  },
  'stats-metrics': {
    type: 'stats-metrics',
    label: 'Stats & Metrics',
    category: '05 Cards & Comparisons',
    description: 'Quantitative benchmark numbers and metrics in three cards.',
    defaultData: {
      stat1Num: '',
      stat1Label: '',
      stat1Sub: '',
      stat2Num: '',
      stat2Label: '',
      stat2Sub: '',
      stat3Num: '',
      stat3Label: '',
      stat3Sub: '',
    },
  },

  // ── 06. TECHNICAL TABLES ──
  'technical-table': {
    type: 'technical-table',
    label: 'Technical Table',
    category: '06 Technical Tables',
    description: 'Responsive specification table with status badges.',
    defaultData: {
      columns: [
        { id: 'col_feat', label: 'Feature' },
        { id: 'col_status', label: 'Status' },
      ],
      rows: [
        { id: 'row_1', cells: { col_feat: '', col_status: '' } },
      ],
    },
  },

  // ── 07. CALLOUTS & QUOTES ──
  'callout': {
    type: 'callout',
    label: 'Callout Advisory',
    category: '07 Callouts & Quotes',
    description: 'System warnings, practical tips, or arcane notices.',
    defaultData: {
      calloutType: 'note',
      text: '',
    },
  },
  'pullquote': {
    type: 'pullquote',
    label: 'Pullquote',
    category: '07 Callouts & Quotes',
    description: 'Prominent philosophical principle or quote.',
    defaultData: {
      quote: '',
      author: '',
    },
  },

  // ── 08. CODE INSCRIPTIONS ──
  'code-block': {
    type: 'code-block',
    label: 'Code Block',
    category: '08 Code Inscriptions',
    description: 'Syntax-highlighted code with copy button and filename header.',
    defaultData: {
      title: '',
      language: 'typescript',
      code: '',
    },
  },

  // ── 09. INTERACTIVE BLOCKS ──
  'faq': {
    type: 'faq',
    label: 'FAQ Accordion',
    category: '09 Interactive Blocks',
    description: 'Collapsible questions and answers for architectural doubts.',
    defaultData: {
      items: [
        {
          id: 'faq_1',
          question: '',
          answer: '',
        },
      ],
    },
  },
  'exercise': {
    type: 'exercise',
    label: 'Exercise / Trial Scenario',
    category: '09 Interactive Blocks',
    description: 'Interactive scenario trial with collapsible answer reveal.',
    defaultData: {
      badge: 'TRIAL SCENARIO 01',
      scenario: '',
      buttonText: '✦ Reveal Answer',
      solutionTitle: 'Solution: Recommended Pattern',
      solutionText: '',
    },
  },
  'article-trial': {
    type: 'article-trial',
    label: 'Article Trial',
    category: '09 Interactive Blocks',
    description: 'Trial challenge with structured questions where initiates test mastery and claim Aether.',
    defaultData: {
      title: "You've reached the trial",
      intro: 'Test your mastery of this knowledge scroll. Earn Aether and prove your standing among the initiates.',
      buttonText: 'BEGIN THE TRIAL',
      questions: [
        {
          id: 'q_1',
          question: '',
          answers: [
            { id: 'a_1', text: '', correct: true },
            { id: 'a_2', text: '', correct: false },
          ],
          explanation: '',
        },
      ],
    },
  },

  // ── 10. CLOSING CONTENT ──
  'key-takeaways': {
    type: 'key-takeaways',
    label: 'Key Takeaways',
    category: '10 Closing Content',
    description: 'Summary of core doctrines before concluding the scroll.',
    defaultData: {
      title: 'Key Takeaways for the Initiate',
      items: [
        { id: 'takeaway_1', term: '', desc: '' },
      ],
    },
  },
  'related-docs': {
    type: 'related-docs',
    label: 'Related Documentation',
    category: '10 Closing Content',
    description: 'Cards linking to official documentation or complementary scrolls.',
    defaultData: {
      items: [
        {
          id: 'rd_1',
          type: 'internal',
          title: '',
          slug: '',
          url: '',
          ctaText: 'Study scroll',
        },
      ],
    },
  },
};

export function getBlockRegistryList(): BlockDefinition[] {
  return Object.values(ARTICLE_BLOCK_REGISTRY);
}

export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return ARTICLE_BLOCK_REGISTRY[type];
}
