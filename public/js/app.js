/* ============================================================
   Coven of Technology — application logic
   The Design Component class (state, navigation, quiz logic, and
   renderVals() which computes inline styles + maps content for the
   template). Content data lives in content.js (window.SITE_CONTENT
   / window.QUIZ_QUESTIONS).

   The DC runtime (assets/support.js) evaluates the inline
   <script data-dc-script> in index.html with DCLogic / StreamableLogic
   / React injected as locals, so this file exposes the class through a
   factory that receives them and the shim in index.html wires it up.
   ============================================================ */

window.CovenComponentFactory = function (DCLogic, StreamableLogic, React) {
  function detectCurrentScreen() {
    if (typeof window === 'undefined') return 'landing';
    var segments = window.location.pathname.split('/').filter(Boolean);
    if (segments.indexOf('article') !== -1) return 'article';
    var path = (segments.pop() || '').toLowerCase();
    if (!path || path === 'index.html' || path === '') return 'landing';
    var name = path.replace('.html', '');
    var known = ['landing', 'library', 'article', 'quiz', 'result', 'leaderboard', 'signup', 'profile', 'terms', 'memes'];
    return known.indexOf(name) !== -1 ? name : 'landing';
  }

  function getStoredLoggedIn() {
    try {
      return typeof window !== 'undefined' && window.localStorage && localStorage.getItem('coven_logged_in') === 'true';
    } catch (e) {
      return false;
    }
  }

  function getStoredQuizCorrect() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return parseInt(sessionStorage.getItem('coven_quiz_correct') || '0', 10);
      }
    } catch (e) {}
    return 0;
  }

  return class Component extends DCLogic {

  // ══════════════════════════════════════════════════════════════════
  //  CONTENT — Edit all site text, labels, and data in this block.
  //             Nothing below this section needs changing for normal
  //             content updates.
  // ══════════════════════════════════════════════════════════════════
  CONTENT = window.SITE_CONTENT;

  // ══════════════════════════════════════════════════════════════════
  //  QUIZ DATA — Questions, options, and explanations.
  // ══════════════════════════════════════════════════════════════════
  questions = window.QUIZ_QUESTIONS;

  // ══════════════════════════════════════════════════════════════════
  //  STATE
  // ══════════════════════════════════════════════════════════════════
  state = {
    screen: detectCurrentScreen(),
    libraryFilter: 'all',
    qIndex: 0,
    selected: null,
    answered: false,
    correct: getStoredQuizCorrect(),
    loggedIn: getStoredLoggedIn()
  };

  // ══════════════════════════════════════════════════════════════════
  //  NAVIGATION
  // ══════════════════════════════════════════════════════════════════
  go(s) {
    if (typeof window !== 'undefined') {
      var isHtml = window.location.pathname.endsWith('.html');
      var target = isHtml ? (s === 'landing' ? 'index.html' : s + '.html') : (s === 'landing' ? '/' : '/' + s);
      var currentScreen = detectCurrentScreen();
      if (currentScreen === s) {
        this.setState({ screen: s });
        window.scrollTo(0, 0);
      } else {
        window.location.href = target;
      }
    } else {
      this.setState({ screen: s });
    }
  }

  login() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('coven_logged_in', 'true');
      }
    } catch (e) {}
    this.setState({ loggedIn: true });
    this.go('profile');
  }

  openProfile() {
    var isLogged = this.state.loggedIn || getStoredLoggedIn();
    if (isLogged) this.go('profile');
    else this.go('signup');
  }

  // ══════════════════════════════════════════════════════════════════
  //  QUIZ LOGIC
  // ══════════════════════════════════════════════════════════════════
  startTrial() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem('coven_quiz_correct');
      }
    } catch (e) {}
    var current = detectCurrentScreen();
    if (current === 'quiz') {
      this.setState({ screen: 'quiz', qIndex: 0, selected: null, answered: false, correct: 0 });
      if (typeof window !== 'undefined') window.scrollTo(0, 0);
    } else {
      this.go('quiz');
    }
  }

  selectOption(i) {
    if (!this.state.answered) this.setState({ selected: i });
  }

  primary() {
    const { answered, selected, qIndex } = this.state;
    if (!answered) {
      if (selected == null) return;
      const isC = this.questions[qIndex].options[selected].correct;
      const newCorrect = this.state.correct + (isC ? 1 : 0);
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem('coven_quiz_correct', newCorrect);
        }
      } catch (e) {}
      this.setState({ answered: true, correct: newCorrect });
      return;
    }
    const last = this.questions.length - 1;
    if (qIndex >= last) {
      this.go('result');
    } else {
      this.setState({ qIndex: qIndex + 1, selected: null, answered: false });
      if (typeof window !== 'undefined') window.scrollTo(0, 0);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  RENDER  — Computes styles and maps CONTENT data for the template.
  //            Change styling constants here; don't touch CONTENT.
  // ══════════════════════════════════════════════════════════════════
  renderVals() {
    const st    = this.state;
    const C     = this.CONTENT;
    const P     = C.profile;
    const total = this.questions.length;
    const q     = this.questions[st.qIndex] || this.questions[0];

    // ── Quiz: options ────────────────────────────────────────────
    const OPT_BASE    = 'display:flex;align-items:center;gap:16px;padding:20px 22px;border-radius:6px;cursor:pointer;';
    const LETTER_BASE = 'width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Cinzel,serif;font-size:14px;flex-shrink:0;';
    const options = q.options.map((o, i) => {
      var style, letterStyle, textStyle = "font-family:'EB Garamond',serif;font-size:17px;color:#cdc3b6;", mark = '', markColor = 'color:#7bbf6a;';
      if (!st.answered) {
        if (st.selected === i) {
          style       = OPT_BASE + 'border:1px solid #d8b56b;background:linear-gradient(180deg,rgba(216,181,107,.14),rgba(139,92,196,.10));box-shadow:0 0 26px rgba(216,181,107,.2)';
          letterStyle = LETTER_BASE + 'background:linear-gradient(180deg,#e3c47e,#c49a4e);color:#221809';
          textStyle   = "font-family:'EB Garamond',serif;font-size:17px;color:#f3ecdf;";
        } else {
          style       = OPT_BASE + 'border:1px solid rgba(216,181,107,.18);background:#15121c';
          letterStyle = LETTER_BASE + 'border:1px solid rgba(216,181,107,.4);color:#d8b56b';
        }
      } else {
        if (o.correct) {
          style       = OPT_BASE + 'border:1px solid #7bbf6a;background:linear-gradient(180deg,rgba(123,191,106,.16),rgba(123,191,106,.04));box-shadow:0 0 26px rgba(123,191,106,.18)';
          letterStyle = LETTER_BASE + 'background:#7bbf6a;color:#0c1c08';
          textStyle   = "font-family:'EB Garamond',serif;font-size:17px;color:#f3ecdf;";
          mark = '✓'; markColor = 'color:#7bbf6a;';
        } else if (st.selected === i) {
          style       = OPT_BASE + 'border:1px solid #c97a7a;background:linear-gradient(180deg,rgba(201,122,122,.14),transparent)';
          letterStyle = LETTER_BASE + 'background:#c97a7a;color:#240c0c';
          textStyle   = "font-family:'EB Garamond',serif;font-size:17px;color:#e6cccc;";
          mark = '✕'; markColor = 'color:#c97a7a;';
        } else {
          style       = OPT_BASE + 'border:1px solid rgba(216,181,107,.1);background:#15121c;opacity:.45';
          letterStyle = LETTER_BASE + 'border:1px solid rgba(216,181,107,.3);color:#9b9189';
        }
      }
      return { letter: o.letter, text: o.text, style: style, letterStyle: letterStyle, textStyle: textStyle, mark: mark, markColor: markColor, onClick: () => this.selectOption(i) };
    });

    const segments = this.questions.map(function(_, i) {
      var filled  = i < st.qIndex || (i === st.qIndex && st.answered);
      var current = i === st.qIndex && !st.answered;
      var bg = filled ? 'linear-gradient(90deg,#c49a4e,#e3c47e)' : current ? 'rgba(216,181,107,.4)' : 'rgba(216,181,107,.14)';
      return { style: 'flex:1;height:6px;border-radius:3px;background:' + bg };
    });

    var selCorrect    = st.answered && q.options[st.selected] && q.options[st.selected].correct;
    var feedbackStyle = 'border-radius:6px;padding:16px 20px;border:1px solid ' +
      (selCorrect ? 'rgba(123,191,106,.4);background:rgba(123,191,106,.07)' : 'rgba(201,122,122,.4);background:rgba(201,122,122,.06)');
    var last = total - 1;
    var primaryLabel, primaryEnabled = true;
    if (!st.answered) { primaryLabel = 'CAST YOUR ANSWER →'; primaryEnabled = st.selected != null; }
    else if (st.qIndex >= last) primaryLabel = 'SEE YOUR RESULT →';
    else primaryLabel = 'NEXT QUESTION →';
    var primaryStyle = primaryEnabled
      ? 'padding:13px 30px;border-radius:3px;background:linear-gradient(180deg,#e3c47e,#c49a4e);color:#221809;font-family:Cinzel,serif;font-weight:600;font-size:14px;letter-spacing:1.5px;box-shadow:0 0 26px rgba(216,181,107,.3);cursor:pointer'
      : 'padding:13px 30px;border-radius:3px;background:#2a2433;color:#6b6470;font-family:Cinzel,serif;font-weight:600;font-size:14px;letter-spacing:1.5px;cursor:not-allowed';

    // ── Quiz: result ─────────────────────────────────────────────
    var earned    = st.correct * 40;
    var passed    = st.correct >= 2;
    var aetherTotal = 740 + earned;
    var resPct    = Math.min(100, Math.round((aetherTotal / 1200) * 100));

    // ── Landing: ranks ───────────────────────────────────────────
    var RKC = 'width:56px;height:56px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:19px;';
    var ranks = C.ranks.map(function(r) {
      return {
        glyph:       r.glyph,
        name:        r.name,
        aether:      r.aether,
        circleStyle: r.isTop
          ? RKC + 'border:1px solid #d8b56b;color:#221809;background:radial-gradient(circle,#e3c47e,#c49a4e);box-shadow:0 0 26px rgba(216,181,107,.5);animation:covGlow 3.2s ease-in-out infinite'
          : RKC + 'border:1px solid rgba(216,181,107,.42);color:#d8b56b;background:radial-gradient(circle,rgba(139,92,196,.45),#0c0916 70%),#0c0916;box-shadow:0 0 18px rgba(216,181,107,.16)',
        nameStyle:   'font-family:Cinzel,serif;font-size:14px;letter-spacing:.5px;color:' + (r.isTop ? '#f3ecdf' : '#ece6dd'),
        aetherStyle: "font-family:'EB Garamond',serif;font-size:13px;margin-top:3px;color:" + (r.isTop ? '#c9a45f' : '#8f857a'),
      };
    });

    // ── Landing: featured scrolls ────────────────────────────────
    var featuredScrolls = C.featuredScrolls.map(function(s) {
      return Object.assign({}, s, {
        thumbStyle: 'height:150px;background:' + s.thumbBg + ';display:flex;align-items:center;justify-content:center;font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:#8a7f70;letter-spacing:1px;border-bottom:1px solid rgba(216,181,107,.12)',
      });
    });

    // ── Library: active + locked scroll cards ────────────────────
    var filter = st.libraryFilter || 'all';
    var BTN_ACTIVE = "font-family:'EB Garamond',serif;font-size:14px;color:#221809;background:linear-gradient(180deg,#e3c47e,#c49a4e);border:1px solid transparent;padding:8px 16px;border-radius:20px;cursor:pointer;";
    var BTN_INACTIVE = "font-family:'EB Garamond',serif;font-size:14px;color:#c5b9a8;border:1px solid rgba(216,181,107,.24);background:transparent;padding:8px 16px;border-radius:20px;cursor:pointer;";
    var filterAllStyle = filter === 'all' ? BTN_ACTIVE : BTN_INACTIVE;
    var filterApexStyle = filter === 'apex' ? BTN_ACTIVE : BTN_INACTIVE;
    var filterMentorshipStyle = filter === 'mentorship' ? BTN_ACTIVE : BTN_INACTIVE;
    var filterBAStyle = filter === 'ba' ? BTN_ACTIVE : BTN_INACTIVE;

    var activeScrolls = C.libraryScrolls.filter(function(s) { return !s.locked; }).map(function(s) {
      return Object.assign({}, s, {
        wrapStyle:         'background:#15121c;border:1px solid rgba(216,181,107,.14);border-radius:6px;overflow:hidden;cursor:pointer',
        thumbStyle:        'height:120px;background:' + s.thumbBg + ';border-bottom:1px solid rgba(216,181,107,.12);display:flex;align-items:center;justify-content:center;font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:#8a7f70',
        tagStyle:          "font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:1px;color:#b98fd8;border:1px solid rgba(185,143,216,.3);border-radius:2px;padding:3px 8px",
        progressBgStyle:   'height:5px;border-radius:3px;background:rgba(216,181,107,.12);margin-bottom:8px',
        progressFillStyle: 'width:' + s.progress + '%;height:100%;border-radius:3px;background:' + s.progressColor,
        statusStyle:       s.statusColor ? 'color:' + s.statusColor : '',
      });
    });
    var lockedScrolls = C.libraryScrolls.filter(function(s) { return s.locked; }).map(function(s) {
      return Object.assign({}, s, {
        wrapStyle:  'background:#100d15;border:1px solid rgba(216,181,107,.1);border-radius:6px;overflow:hidden;position:relative',
        thumbStyle: 'height:120px;background:repeating-linear-gradient(135deg,rgba(216,181,107,.05) 0 10px,rgba(216,181,107,.01) 10px 20px);border-bottom:1px solid rgba(216,181,107,.08);display:flex;align-items:center;justify-content:center;color:#6b6258;font-size:22px',
        tagStyle:   "font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:1px;color:#8f857a;border:1px solid rgba(216,181,107,.18);border-radius:2px;padding:3px 8px",
      });
    });

    // ── Leaderboard: podium + rows ───────────────────────────────
    var podMap = {};
    C.leaderboard.podium.forEach(function(p) { podMap[p.position] = p; });
    var pod1 = podMap['1st'] || {};
    var pod2 = podMap['2nd'] || {};
    var pod3 = podMap['3rd'] || {};

    var ROW = 'display:grid;grid-template-columns:60px 1fr 160px 110px 130px;gap:16px;align-items:center;padding:15px 22px;border-radius:6px;margin-bottom:8px;';
    var leaderboardRows = C.leaderboard.rows.map(function(r) {
      return Object.assign({}, r, {
        rowStyle:      r.isUser ? ROW + 'background:linear-gradient(90deg,rgba(216,181,107,.12),rgba(139,92,196,.08));border:1px solid rgba(216,181,107,.4);box-shadow:0 0 24px rgba(216,181,107,.12)' : ROW + 'background:#15121c;border:1px solid rgba(216,181,107,.08)',
        rankNumStyle:  'font-family:Cinzel,serif;font-size:18px;color:' + (r.isUser ? '#e8cf95' : '#9b9189'),
        avatarStyle:   'width:' + (r.isUser?'36':'34') + 'px;height:' + (r.isUser?'36':'34') + 'px;border-radius:50%;background:radial-gradient(circle,' + (r.isUser?'#4a3568':'#3a2a52') + ',#1a1326);border:1px solid ' + (r.isUser?'#d8b56b':'rgba(216,181,107,.3)') + ';display:flex;align-items:center;justify-content:center;color:#e8cf95;font-family:Cinzel,serif;font-size:' + (r.isUser?'14':'13') + 'px',
        nameStyle:     "font-family:'EB Garamond',serif;font-size:17px;color:" + (r.isUser ? '#f3ecdf' : '#ece6dd'),
        roleStyle:     "font-family:'EB Garamond',serif;font-size:14px;color:" + (r.isUser ? '#e8cf95' : '#b98fd8'),
        accuracyStyle: "font-family:'EB Garamond',serif;font-size:15px;color:" + (r.isUser ? '#f3ecdf' : '#cdc3b6'),
        aetherStyle:   'font-family:Cinzel,serif;font-size:16px;text-align:right;color:' + (r.isUser ? '#e8cf95' : '#d8b56b'),
      });
    });

    // ── Memes ────────────────────────────────────────────────────
    var memes = C.memes.map(function(m) {
      return Object.assign({}, m, {
        thumbStyle: 'height:170px;background:' + m.thumbBg + ';display:flex;align-items:center;justify-content:center;font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:#8a7f70;border-bottom:1px solid rgba(185,143,216,.14)',
      });
    });

    // ── Profile ──────────────────────────────────────────────────
    var aetherPct        = Math.round((P.aether / P.aetherToNext) * 100);
    var aetherBarStyle   = 'width:' + aetherPct + '%;height:7px;border-radius:4px;background:linear-gradient(90deg,#c49a4e,#e3c47e);box-shadow:0 0 14px rgba(216,181,107,.5)';
    var navAetherBarStyle= 'width:' + aetherPct + '%;height:100%;border-radius:3px;background:linear-gradient(90deg,#c49a4e,#e3c47e)';

    var profileStats = P.stats.map(function(s) {
      return Object.assign({}, s, {
        wrapStyle:  'background:#15121c;border:1px solid rgba(216,181,107,.14);border-radius:6px;padding:20px;text-align:center' + (s.clickable ? ';cursor:pointer' : ''),
        wrapHover:  s.clickable ? 'border:1px solid rgba(216,181,107,.4)' : '',
        valueStyle: 'font-family:Cinzel,serif;font-size:30px;color:' + (s.valueColor || '#ece6dd'),
        onClick:    s.clickable ? function() { this.go('leaderboard'); }.bind(this) : undefined,
      });
    }.bind(this));

    var recentActivity = P.recentActivity.map(function(a) {
      return Object.assign({}, a, {
        badgeStyle: 'font-family:Cinzel,serif;font-size:14px;color:' + a.badgeColor,
      });
    });

    // Profile rank progression (earned / current / future states)
    var PRKC = 'width:52px;height:52px;margin:0 auto 12px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;';
    var profileRanks = C.ranks.map(function(r, i) {
      var earned  = i < P.rankIndex;
      var current = i === P.rankIndex;
      return {
        glyph:       earned ? '✓' : r.glyph,
        name:        r.name,
        subtext:     earned ? 'Earned' : current ? 'Current' : r.aether.split(' ')[0],
        circleStyle: current
          ? PRKC + 'border:1px solid #d8b56b;color:#221809;font-size:18px;background:radial-gradient(circle,#e3c47e,#c49a4e);box-shadow:0 0 24px rgba(216,181,107,.5);animation:covGlow 3.2s ease-in-out infinite'
          : earned
          ? PRKC + 'border:1px solid #d8b56b;color:#d8b56b;background:radial-gradient(circle,rgba(139,92,196,.45),#0c0916 70%),#0c0916'
          : PRKC + 'border:1px solid rgba(216,181,107,.3);color:#9b9189;background:#0c0916',
        nameStyle:   'font-family:Cinzel,serif;font-size:13px;color:' + (current ? '#f3ecdf' : earned ? '#ece6dd' : '#b3a99d'),
        subtextStyle: "font-family:'EB Garamond',serif;font-size:12px;margin-top:2px;color:" + (current ? '#e8cf95' : '#8f857a'),
      };
    });

    // Rank trail width: distance from 6% to 6% + (rankIndex / 6 * 88%)
    var trailWidth = P.rankIndex > 0 ? (6 + (P.rankIndex / 6) * 88) + '%' : '0%';
    var profileRankTrailStyle = 'position:absolute;left:6%;width:' + trailWidth + ';top:25px;height:1px;background:linear-gradient(90deg,#c49a4e,#e3c47e);box-shadow:0 0 8px rgba(216,181,107,.5);z-index:0';

    // Continue studying: auto-picks in-progress scrolls
    var continueScrolls = C.libraryScrolls
      .filter(function(s) { return !s.locked && s.progress > 0 && s.progress < 100; })
      .slice(0, 2)
      .map(function(s) {
        return {
          tag:              s.tag,
          title:            s.title,
          thumbStyle:       'width:70px;height:70px;border-radius:6px;background:' + s.thumbBg + ';border:1px solid rgba(216,181,107,.14);flex-shrink:0',
          progressBgStyle:  'height:5px;border-radius:3px;background:rgba(216,181,107,.12);margin-bottom:7px',
          progressFillStyle:'width:' + s.progress + '%;height:100%;border-radius:3px;background:' + s.progressColor,
          progressPct:      s.progress + '%',
        };
      });

    return {
      // Screen flags
      isLanding:     st.screen === 'landing',
      isLibrary:     st.screen === 'library',
      isArticle:     st.screen === 'article',
      isQuiz:        st.screen === 'quiz',
      isResult:      st.screen === 'result',
      isLeaderboard: st.screen === 'leaderboard',
      isSignup:      st.screen === 'signup',
      isProfile:     st.screen === 'profile',
      isTerms:       st.screen === 'terms',
      isMemes:       st.screen === 'memes',
      loggedIn:      st.loggedIn,

      // Navigation
      toLanding:     function() { this.go('landing'); }.bind(this),
      toLibrary:     function() { this.go('library'); }.bind(this),
      toArticle:     function() { this.go('article'); }.bind(this),
      toLeaderboard: function() { this.go('leaderboard'); }.bind(this),
      toSignup:      function() { this.go('signup'); }.bind(this),
      toProfile:     function() { this.openProfile(); }.bind(this),
      toTerms:       function() { this.go('terms'); }.bind(this),
      toMemes:       function() { this.go('memes'); }.bind(this),
      login:         function() { this.login(); }.bind(this),
      startTrial:    function() { this.startTrial(); }.bind(this),

      // Library filters
      filterAllStyle,
      filterApexStyle,
      filterMentorshipStyle,
      filterBAStyle,
      isFilterAll: filter === 'all',
      isFilterApex: filter === 'apex',
      isFilterMentorship: filter === 'mentorship',
      isFilterBA: filter === 'ba',
      showApexCards: filter === 'all' || filter === 'apex',
      showMentorshipCards: filter === 'all' || filter === 'mentorship',
      showBaCards: filter === 'all' || filter === 'ba',
      showLockedCards: filter === 'all',
      setFilterAll: function() { this.setState({ libraryFilter: 'all' }); }.bind(this),
      setFilterApex: function() { this.setState({ libraryFilter: 'apex' }); }.bind(this),
      setFilterMentorship: function() { this.setState({ libraryFilter: 'mentorship' }); }.bind(this),
      setFilterBA: function() { this.setState({ libraryFilter: 'ba' }); }.bind(this),

      // Content (dotted paths used in template)
      brand:               C.brand,
      hero:                C.hero,
      heroStats:           C.stats,
      ranks,
      featuredScrolls,
      activeScrolls,
      lockedScrolls,
      pod1, pod2, pod3,
      leaderboardRows,
      featuredMeme:        C.featuredMeme,
      memes,

      // Profile
      profileInitial:      P.initial,
      profileName:         P.name,
      profileRankBadge:    '✦ ' + P.rankLabel,
      profilePath:         P.path,
      profileAether:       '✦ ' + P.aether,
      profileAetherNext:   P.aetherNextLabel,
      navRankLabel:        P.rankLabel + ' · ✦ ' + P.aether,
      navAetherBarStyle,
      aetherBarStyle,
      profileStats,
      recentActivity,
      profileRanks,
      profileRankTrailStyle,
      continueScrolls,

      // Quiz
      streak:              3,
      questionNum:         'QUESTION ' + (st.qIndex + 1) + ' OF ' + total,
      questionText:        q.q,
      questionSub:         q.sub,
      segments,
      options,
      answered:            st.answered,
      feedbackStyle,
      feedbackTitle:       selCorrect ? '✓ Correctly cast' : '✕ The spell faltered',
      feedbackTitleColor:  selCorrect ? 'color:#9ad389;' : 'color:#d89a9a;',
      feedbackText:        q.explain,
      onPrimary:           function() { this.primary(); }.bind(this),
      primaryLabel,
      primaryStyle,

      // Result
      resultGlyph:         passed ? '✦' : '☾',
      resultKicker:        passed ? '✦ Trial complete' : '☾ The trial eludes you',
      resultTitle:         passed ? 'Trial passed' : 'Not yet, initiate',
      resultBlurb:         passed
        ? 'The coven recognizes your mastery. Your Aether has been credited and your path continues.'
        : 'The triggers got the better of you this time. Revisit the scroll and attempt the trial anew.',
      scoreLabel:          st.correct + ' / ' + total,
      earnedLabel:         '✦ ' + earned,
      accuracyLabel:       Math.round((st.correct / total) * 100) + '%',
      aetherTotalLabel:    aetherTotal.toLocaleString(),
      progressBarStyle:    'width:' + resPct + '%;height:100%;border-radius:5px;background:linear-gradient(90deg,#c49a4e,#e3c47e);box-shadow:0 0 12px rgba(216,181,107,.5)',
    };
  }
};
};
