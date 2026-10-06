/* ============================================================
   Coven of Technology — CONTENT
   All site text, labels, and data live here.
   Edit this file for normal content updates; nothing in app.js
   needs to change. Loaded before app.js so the component can read
   window.SITE_CONTENT and window.QUIZ_QUESTIONS at mount time.
   ============================================================ */

/* ── Site content ─────────────────────────────────────────── */
window.SITE_CONTENT = {

    // ── Brand ─────────────────────────────────────────────────────
    brand: {
      name:      'COVEN · OF · TECHNOLOGY',
      footerBy:  'Crafted with 💜 by former Salesforce Marketing Champion \'25, Mich Alvarez',
      copyright: '© Coven of Technology, 2024',
      contact:   'hello@covenoftechnology.cloud',
      termsDate: 'THE NEW MOON, JUNE 2026',
    },

    // ── Landing hero ──────────────────────────────────────────────
    hero: {
      kicker:       '☽ \u00a0 A coven for the Salesforce craft \u00a0 ☾',
      headline1:    'Master the craft.',
      headline2:    'Earn your rank.',
      body:         'Read the scrolls, pass the trials, and rise from Novice to Archmage — a gamified grimoire of Salesforce mastery, mentorship, and the quiet art of business analysis.',
      ctaPrimary:   'BEGIN YOUR INITIATION',
      ctaSecondary: 'BROWSE THE GRIMOIRE',
    },

    // ── Hero stats bar ────────────────────────────────────────────
    stats: [
      { value: '128',   label: 'Scrolls'   },
      { value: '44',    label: 'Trials'    },
      { value: '2,340', label: 'Initiates' },
    ],

    // ── Ranks ─────────────────────────────────────────────────────
    // isTop marks the final gold rank displayed differently everywhere.
    ranks: [
      { glyph: '✧', name: 'Novice',    aether: '0 Aether',      isTop: false },
      { glyph: '✦', name: 'Shaper',    aether: '400 Aether',    isTop: false },
      { glyph: '⚙', name: 'Mechanic',  aether: '1,200 Aether',  isTop: false },
      { glyph: '❖', name: 'Warden',    aether: '3,000 Aether',  isTop: false },
      { glyph: '★', name: 'Enchanter', aether: '7,000 Aether',  isTop: false },
      { glyph: '☽', name: 'Witch',     aether: '13,000 Aether', isTop: false },
      { glyph: '✶', name: 'Archmage',  aether: '24,000 Aether', isTop: true  },
    ],

    // ── Featured scrolls (landing page demo placeholders) ────────
    featuredScrolls: [
      { tag: 'THE MENTOR\'S WAY',  title: 'Guiding Apprentices: The Art of the Mentor',    body: 'How to grow new admins without casting their decisions for them.',                 meta: '9 min · ✦ 90 Aether',  thumbBg: 'repeating-linear-gradient(135deg,rgba(185,143,216,.10) 0 10px,rgba(185,143,216,.03) 10px 20px)' },
      { tag: 'DIVINATION · BA',    title: 'Reading the Omens: Requirements Divination',    body: 'Ask the questions that surface what stakeholders truly need.',                     meta: '14 min · ✦ 140 Aether', thumbBg: 'repeating-linear-gradient(135deg,rgba(216,181,107,.08) 0 10px,rgba(216,181,107,.02) 10px 20px)' },
    ],

    // ── Spell Book scrolls (user state + legacy demo placeholders) ─
    // Real articles link via articleId and resolve editorial metadata from the articles system (window.COVEN_ARTICLES_INDEX).
    // Demo scrolls without an article folder retain their placeholder copy.
    libraryScrolls: [
      // Real article user state (title, tag, rank, thumbBg resolved from articles metadata index)
      { articleId: 'apex-triggers-without-tears', locked: false, progress: 65,  progressColor: 'linear-gradient(90deg,#c49a4e,#e3c47e)', statusLabel: '65% complete',   cta: 'Continue →' },
      // Demo scrolls not yet written in markdown
      { tag: 'MENTORSHIP',     rank: 'Shaper',   locked: false, progress: 100, progressColor: 'linear-gradient(90deg,#7bbf6a,#a9e09a)', statusLabel: '✓ Trial passed', statusColor: '#a9e09a', cta: 'Review →', title: 'Guiding Apprentices: The Art of the Mentor',  body: 'Grow new admins without casting for them.',     thumbBg: 'repeating-linear-gradient(135deg,rgba(185,143,216,.10) 0 10px,rgba(185,143,216,.03) 10px 20px)' },
      { tag: 'BA · DIVINATION',rank: 'Shaper',   locked: false, progress: 0,   progressColor: 'linear-gradient(90deg,#c49a4e,#e3c47e)', statusLabel: 'Not started',    cta: 'Begin →',    title: 'Reading the Omens: Requirements Divination',          body: 'Surface what stakeholders truly need.',         thumbBg: 'repeating-linear-gradient(135deg,rgba(216,181,107,.08) 0 10px,rgba(216,181,107,.02) 10px 20px)' },
      { tag: 'FLOW',           rank: 'Mechanic', locked: false, progress: 20,  progressColor: 'linear-gradient(90deg,#c49a4e,#e3c47e)', statusLabel: '20% complete',   cta: 'Continue →', title: 'Flow Sorcery: Automations That Don\'t Backfire',      body: 'Orchestrate without summoning chaos.',          thumbBg: 'repeating-linear-gradient(135deg,rgba(216,181,107,.08) 0 10px,rgba(216,181,107,.02) 10px 20px)' },
      { tag: 'ARCHITECTURE',   rank: 'Witch',    locked: true,  title: 'The Grand Design: Scalable Org Architecture',           body: 'Sealed until you reach the rank of Witch.',   lockNote: 'Locked · 13,000 Aether to unlock' },
      { tag: 'LEADERSHIP',     rank: 'Warden',   locked: true,  title: 'Convening the Circle: Leading Discovery Workshops',     body: 'Sealed until you reach the rank of Warden.',  lockNote: 'Locked · 3,000 Aether to unlock' },
    ],

    // ── Leaderboard ───────────────────────────────────────────────
    leaderboard: {
      // Podium displayed left→right as: 2nd · 1st · 3rd
      podium: [
        { position: '2nd', isFirst: false, initial: 'L', name: 'Lyra Nightquill',  rankLabel: 'Witch',                 aether: '✦ 15,420' },
        { position: '1st', isFirst: true,  initial: 'V', name: 'Vesper Ashgrove',  rankLabel: 'Archmage of the Coven', aether: '✦ 24,860' },
        { position: '3rd', isFirst: false, initial: 'T', name: 'Thorne Blackwood', rankLabel: 'Witch',                 aether: '✦ 13,940' },
      ],
      // Set isUser:true to highlight the "you" row
      rows: [
        { rankNum: 4, initial: 'S', name: 'Sable Morrow',   role: 'Enchanter', accuracy: '94%', aether: '✦ 9,210', isUser: false },
        { rankNum: 5, initial: 'R', name: 'Rowan Vale',     role: 'Enchanter', accuracy: '88%', aether: '✦ 7,980', isUser: false },
        { rankNum: 6, initial: 'I', name: 'Indigo Frost',   role: 'Warden',    accuracy: '91%', aether: '✦ 4,140', isUser: false },
        { rankNum: 7, initial: 'M', name: 'You — Morgaine', role: 'Shaper',    accuracy: '86%', aether: '✦ 740',   isUser: true  },
      ],
    },

    // ── Featured meme (hero on Grimoire of Memes page) ────────────
    featuredMeme: {
      label:       '🔮 CACKLE OF THE DAY',
      title:       '"When someone edits the production org directly… on a Friday… at 4:59 PM"',
      attribution: 'Submitted by Thorne Blackwood, Witch · may the governor limits have mercy.',
      r1: '😂 612', r2: '🔥 388', r3: '👻 207',
    },

    // ── Meme grid ─────────────────────────────────────────────────
    // Each card: tag, title, r1 + r2 reaction pills, thumbBg
    memes: [
      { tag: '💥 DEPLOY DISASTERS',   title: '"It passed in sandbox, I swear it passed in sandbox"',               r1: '😂 247', r2: '🔥 132', thumbBg: 'repeating-linear-gradient(135deg,rgba(185,143,216,.12) 0 10px,rgba(185,143,216,.03) 10px 20px)' },
      { tag: '🔮 STAKEHOLDER SPELLS', title: '"POV: the stakeholder said \'it\'s just a quick change\'"',          r1: '😂 389', r2: '👻 92',  thumbBg: 'repeating-linear-gradient(135deg,rgba(216,181,107,.10) 0 10px,rgba(216,181,107,.03) 10px 20px)' },
      { tag: '🧙 ADMIN LIFE',         title: '"Why is EVERYONE a System Administrator?"',                          r1: '😂 156', r2: '🔥 98',  thumbBg: 'repeating-linear-gradient(135deg,rgba(185,143,216,.12) 0 10px,rgba(185,143,216,.03) 10px 20px)' },
      { tag: '⚡ APEX PAIN',          title: '"Me summoning a Flow to avoid writing one line of Apex"',            r1: '😂 203', r2: '🔥 167', thumbBg: 'repeating-linear-gradient(135deg,rgba(216,181,107,.10) 0 10px,rgba(216,181,107,.03) 10px 20px)' },
      { tag: '🧙 ADMIN LIFE',         title: '"Validation rule: 1 · My Friday plans: 0"',                         r1: '😂 312', r2: '🔥 144', thumbBg: 'repeating-linear-gradient(135deg,rgba(185,143,216,.12) 0 10px,rgba(185,143,216,.03) 10px 20px)' },
      { tag: '🔮 STAKEHOLDER SPELLS', title: '"\'We don\'t need another custom object,\' I whisper into the void"', r1: '😂 178', r2: '👻 71',  thumbBg: 'repeating-linear-gradient(135deg,rgba(216,181,107,.10) 0 10px,rgba(216,181,107,.03) 10px 20px)' },
    ],

    // ── Profile / logged-in user ───────────────────────────────────
    // rankIndex: 0=Novice, 1=Shaper … 6=Archmage
    profile: {
      name:            'Morgaine the Curious',
      initial:         'M',
      rankIndex:       1,
      rankLabel:       'SHAPER',
      aether:          740,
      aetherToNext:    1200,
      aetherNextLabel: '460 Aether until Mechanic',
      path:            'Salesforce path · Mentee of the Oracle of Orgs · Member since the New Moon, 2025',
      stats: [
        { value: '18',   label: 'Scrolls read'  },
        { value: '12',   label: 'Trials passed' },
        { value: '86%',  label: 'Accuracy'      },
        { value: '🔥 9', label: 'Day streak'    },
        { value: '#7',   label: 'Coven rank →',  clickable: true, valueColor: '#d8b56b' },
      ],
      recentActivity: [
        { glyph: '✦', text: 'Passed the',          bold: 'Trial of Mentorship', when: '2 days ago',  badge: '+90',     badgeColor: '#e8cf95' },
        { glyph: '☽', text: 'Earned the sigil',     bold: 'First Light',         when: '4 days ago',  badge: 'sigil',   badgeColor: '#b98fd8' },
        { glyph: '✦', text: 'Completed the scroll', bold: 'Guiding Apprentices', when: '1 week ago',  badge: '+50',     badgeColor: '#e8cf95' },
        { glyph: '✧', text: 'Rose to the rank of',  bold: 'Shaper',             when: '2 weeks ago', badge: 'rank up', badgeColor: '#b98fd8' },
      ],
    },

  };

/* ── Quiz data — questions, options, explanations ─────────── */
window.QUIZ_QUESTIONS = [
    {
      q:    'To avoid recursive trigger execution, which ward should you cast?',
      sub:  'Choose the single most powerful incantation.',
      options: [
        { letter: 'A', text: 'Add more triggers to the same object',      correct: false },
        { letter: 'B', text: 'Guard the logic with a static boolean flag', correct: true  },
        { letter: 'C', text: 'Increase the SOQL query limit',              correct: false },
        { letter: 'D', text: 'Wrap everything in a try / catch',           correct: false },
      ],
      explain: 'A static boolean flag is the classic recursion ward — it remembers the trigger has already run within the transaction, so the logic fires once and the spiral never begins.',
    },
    {
      q:    'Where should a well-bound trigger keep its actual logic?',
      sub:  'The doorway is not the room.',
      options: [
        { letter: 'A', text: 'Inline, right inside the trigger body',    correct: false },
        { letter: 'B', text: 'In a separate handler / service class',     correct: true  },
        { letter: 'C', text: 'In a scheduled Apex job',                   correct: false },
        { letter: 'D', text: 'In a validation rule',                      correct: false },
      ],
      explain: 'A trigger should decide nothing and delegate everything. Move the logic into a handler class so it stays testable, ordered, and reusable.',
    },
    {
      q:    'Why must your trigger logic always be written to handle bulk records?',
      sub:  'The coven works in covens, never alone.',
      options: [
        { letter: 'A', text: 'Because triggers can receive up to 200 records at once', correct: true  },
        { letter: 'B', text: 'Because Apex forbids single-record code',                correct: false },
        { letter: 'C', text: 'Because flows require it',                               correct: false },
        { letter: 'D', text: 'Only to make the code longer',                           correct: false },
      ],
      explain: 'Salesforce processes records in batches of up to 200 per trigger invocation. Bulkified logic — queries and DML outside loops — keeps you safely within governor limits.',
    },
  ];
