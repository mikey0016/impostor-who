/* ============================================================
   Ayg'oqchi — web versiya (app platformasi ichida)
   Android ilovaning mantiqini 1:1 takrorlaydi:
   HOME → EDIT → PASS → STARTED → REVEAL
   So'zlar data.js dan (GameData.kt dan avtomatik eksport).
   ============================================================ */
(function () {
  'use strict';

  var LS = 'aygoqchi_web';
  var D = window.GAME_DATA;
  var app = document.getElementById('app');

  /* ---------------- holat ---------------- */
  var S = {
    phase: 'HOME',            // HOME | EDIT | PASS | STARTED | REVEAL
    mode: 'CLASSIC',
    playerNames: [],
    selectedCategoryIds: new Set(),
    impostorCount: 1,
    hintOn: true,
    players: [],
    round: null,
    passIndex: 0,
    starterIndex: 0,
    sheet: null,              // null | 'CATEGORIES' | 'HELP'
    pressed: false
  };

  /* ---------------- yordamchilar ---------------- */
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function maxImpostors() { return Math.max(1, Math.floor(S.playerNames.length / 2)); }
  function clampImpostors(n) { return Math.max(1, Math.min(Number(n) || 1, maxImpostors())); }

  /* ---------------- saqlash ---------------- */
  function save() {
    try {
      localStorage.setItem(LS, JSON.stringify({
        playerNames: S.playerNames,
        selectedCategoryIds: Array.from(S.selectedCategoryIds),
        impostorCount: S.impostorCount,
        hintOn: S.hintOn
      }));
    } catch (e) { /* private mode */ }
  }

  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { }
    var defIds = D.categories.slice(0, 6).map(function (c) { return c.id; });

    S.playerNames = (d && Array.isArray(d.playerNames) && d.playerNames.length >= 3)
      ? d.playerNames.slice(0, 20).map(function (n) { return String(n); })
      : ['Player 1', 'Player 2', 'Player 3'];

    var ids = (d && Array.isArray(d.selectedCategoryIds) && d.selectedCategoryIds.length)
      ? d.selectedCategoryIds.filter(function (id) {
        return D.categories.some(function (c) { return c.id === id; });
      })
      : defIds;
    if (!ids.length) ids = defIds;
    S.selectedCategoryIds = new Set(ids);

    S.impostorCount = clampImpostors(d && d.impostorCount ? d.impostorCount : 1);
    S.hintOn = !(d && d.hintOn === false);
  }

  /* ---------------- o'yin mantig'i (GameData.similarWord bilan bir xil) ---------------- */
  function similarWord(word, category) {
    var w = String(word).toLowerCase();
    var cp = D.curatedPairs;
    if (cp[w]) return cp[w];
    for (var k in cp) {
      if (cp[k].toLowerCase() === w) return cap(k);   // Android'da kichik harf chiqadi — bu yerda tuzatilgan
    }
    for (var i = 0; i < D.clusters.length; i++) {
      var g = D.clusters[i];
      if (g.some(function (x) { return x.toLowerCase() === w; })) {
        var c = g.filter(function (x) { return x.toLowerCase() !== w; });
        if (c.length) return rnd(c);
      }
    }
    var others = category.words.filter(function (x) { return x.toLowerCase() !== w; });
    return others.length ? rnd(others) : word;
  }

  function startGame() {
    S.seq = (S.seq || 0) + 1;
    var pool = S.selectedCategoryIds.size
      ? D.categories.filter(function (c) { return S.selectedCategoryIds.has(c.id); })
      : D.categories;
    if (!pool.length) pool = D.categories;

    var cat = rnd(pool);
    var word = rnd(cat.words);
    var impWord = similarWord(word, cat);
    var n = S.playerNames.length;

    var idx = shuffle(Array.from({ length: n }, function (_, i) { return i; }))
      .slice(0, clampImpostors(S.impostorCount));

    S.players = S.playerNames.map(function (name, i) {
      return { name: name.trim() || ('Player ' + (i + 1)), impostor: idx.indexOf(i) >= 0 };
    });
    S.round = { category: cat, word: word, imposterWord: impWord };
    S.passIndex = 0;
    S.starterIndex = Math.floor(Math.random() * n);
    S.phase = 'PASS';
    render();
  }

  /* ---------------- umumiy HTML bo'laklari ---------------- */
  function avatarColor(i) {
    try {
      var pal = window.AygApp && typeof window.AygApp.avatarPalette === 'function' && window.AygApp.avatarPalette();
      if (pal && pal.length) return pal[i % pal.length];
    } catch (e) { /* market mavzusi yo'q — standart */ }
    return ['#FFB5A7', '#C9B6F0', '#A8E8D0', '#FFD9A8', '#C6F432'][i % 5];
  }
  function avatar(name, i, size) {
    var ch = (String(name).trim().charAt(0) || '?').toUpperCase();
    var s = size || 28;
    return '<span class="avatar" style="background:' + avatarColor(i) +
      ';width:' + s + 'px;height:' + s + 'px;flex:0 0 ' + s + 'px;font-size:' + Math.round(s * 0.42) +
      'px;display:grid;place-items:center;border-radius:50%;font-weight:900;color:#1A1A1A">' + esc(ch) + '</span>';
  }
  function sparkleDots(count) {
    var out = '';
    for (var i = 0; i < (count || 7); i++) {
      out += '<i style="left:' + (8 + Math.random() * 84).toFixed(1) + '%;bottom:' +
        (5 + Math.random() * 60).toFixed(1) + '%;animation-delay:' + (Math.random() * 3).toFixed(2) + 's"></i>';
    }
    return out;
  }

  /* ---------------- ekranlar ---------------- */
  function homeScreen() {
    var cats = D.categories;
    var maxI = maxImpostors();

    var chips = S.playerNames.map(function (n, i) {
      return '<button class="chip" data-edit="1">' + avatar(n, i) + esc(n) + '<span class="pen">✎</span></button>';
    }).join('') + '<button class="chip add" data-edit="1">＋ Add Player</button>';

    var catCards = cats.map(function (c) {
      var on = S.selectedCategoryIds.has(c.id);
      return '<button class="cat' + (on ? ' selected' : '') + '" data-cat="' + c.id + '">' +
        '<span class="top"><span class="em">' + c.emoji + '</span>' +
        (on ? '<span class="check">✓</span>' : '') + '</span>' +
        '<span class="nm">' + esc(c.name) + '</span>' +
        '<span class="ct">' + c.words.length + ' so\'z</span></button>';
    }).join('');

    return '<div class="screen">' +
      '<div class="topbar">' +
        '<div class="brand">AYG\'OQCHI KIM?</div><div class="spacer"></div>' +
        '<button class="icon-btn" data-sheet="HELP">?</button><div style="width:10px"></div>' +
        '<button class="icon-btn avatar-btn" data-edit="1">👤</button>' +
      '</div>' +

      '<div class="stack">' +
        '<div>' +
          '<div class="label">GAME MODE</div>' +
          '<div class="card" style="margin-top:8px"><div class="seg">' +
            '<button class="pill' + (S.mode === 'CLASSIC' ? ' active' : '') + '" data-mode="CLASSIC">Classic</button>' +
            '<button class="pill' + (S.mode === 'ONLINE' ? ' active' : '') + '" data-mode="ONLINE">Online</button>' +
          '</div></div>' +
        '</div>' +

        '<div>' +
          '<div class="row"><div class="label">PLAYERS · ' + S.playerNames.length + '</div>' +
            '<div class="spacer"></div>' +
            '<button class="link-btn" style="font-size:13px;padding:4px 6px" data-edit="1">Edit</button></div>' +
          '<div class="scroll-x" style="margin-top:8px">' + chips + '</div>' +
        '</div>' +

        '<div>' +
          '<div class="row"><div class="label">CATEGORIES</div><div class="spacer"></div>' +
            '<span class="muted" id="catCount">' + S.selectedCategoryIds.size + ' tanlangan</span></div>' +
          '<div class="scroll-x" style="margin-top:8px">' + catCards + '</div>' +
        '</div>' +

        '<div>' +
          '<div class="label">AYG\'OQCHILAR</div>' +
          '<div class="card" style="margin-top:8px"><div class="setting">' +
            '<div class="txt"><div class="t">' + (S.impostorCount === 1 ? '1 Ayg\'oqchi' : S.impostorCount + ' Ayg\'oqchi') + '</div>' +
            '<div class="s">Maksimum: ' + maxI + ' (o\'yinchilar soniga qarab)</div></div>' +
            '<div class="counter">' +
              '<button class="step" data-imp="-1"' + (S.impostorCount <= 1 ? ' disabled' : '') + '>−</button>' +
              '<span class="count">' + S.impostorCount + '</span>' +
              '<button class="step" data-imp="1"' + (S.impostorCount >= maxI ? ' disabled' : '') + '>+</button>' +
            '</div>' +
          '</div></div>' +
        '</div>' +

        '<div>' +
          '<div class="label">AYG\'OQCHI ISHORASI</div>' +
          '<div class="card" style="margin-top:8px"><div class="setting">' +
            '<div class="txt"><div class="t">O\'xshash so\'z</div>' +
            '<div class="s">Ayg\'oqchiga o\'xshash so\'z beriladi (o\'chirilsa — so\'z berilmaydi)</div></div>' +
            '<label class="switch"><input type="checkbox" id="hintSw"' + (S.hintOn ? ' checked' : '') + '>' +
            '<span class="track"></span><span class="knob"></span></label>' +
          '</div></div>' +
        '</div>' +
      '</div>' +

      '<div class="bottom"><button class="cta" id="startBtn">START GAME</button>' +
      '<div class="muted" style="text-align:center;margin-top:10px">' + S.playerNames.length +
      ' o\'yinchi · ' + S.selectedCategoryIds.size + ' kategoriya · ' +
      (S.impostorCount === 1 ? '1 ayg\'oqchi' : S.impostorCount + ' ayg\'oqchi') + '</div></div>' +
      sheetHTML() +
      '</div>';
  }

  function sheetHTML() {
    if (S.sheet === 'HELP') {
      return '<div class="sheet-wrap">' +
        '<div class="sheet-bg" data-close="1"></div>' +
        '<div class="card sheet"><h3>Qanday o\'ynaladi?</h3>' +
        '<ol>' +
        '<li>Har bir o\'yinchi telefonni olib, <b>bosib ushlab</b> o\'z so\'zini ko\'radi.</li>' +
        '<li>Ko\'pchilik bir xil so\'zni ko\'radi. <b>Ayg\'oqchi</b> esa boshqa (o\'xshash) so\'z oladi — u o\'zini boshqalarga o\'xshatishi kerak.</li>' +
        '<li>Telefon hammadan o\'tgach, <b>muhokama</b> boshlanadi: har kim o\'z so\'zini aytmasdan, uni tasvirlab beradi.</li>' +
        '<li>Ovoz berib, ayg\'oqchini toping. So\'ng <b>REVEAL</b> tugmasi bilan haqiqatni oching!</li>' +
        '</ol>' +
        '<div class="muted">Maslahat: so\'zni to\'g\'ridan-to\'g\'ri aytmang — faqat ishora qiling.</div>' +
        '<button class="dark-pill" style="margin-top:16px" data-close="1">TUSHUNDIM</button>' +
        '</div></div>';
    }
    if (S.sheet === 'CATEGORIES') {
      var rows = D.categories.map(function (c) {
        var on = S.selectedCategoryIds.has(c.id);
        return '<button class="sheet-row' + (on ? ' selected' : '') + '" data-cat="' + c.id + '">' +
          '<span class="em">' + c.emoji + '</span><span class="nm">' + esc(c.name) + '</span>' +
          '<span class="num">' + c.words.length + '</span>' +
          '<span class="check">' + (on ? '✓' : '') + '</span></button>';
      }).join('');
      return '<div class="sheet-wrap">' +
        '<div class="sheet-bg" data-close="1"></div>' +
        '<div class="card sheet">' +
        '<h3>SELECT CATEGORIES</h3><p class="muted">Choose one or more</p>' +
        '<div class="row gap8" style="margin:12px 0">' +
        '<button class="mini" data-all="1">Barchasi</button>' +
        '<button class="mini" data-none="1">Tozalash</button>' +
        '<div class="spacer"></div><span class="muted" id="sheetCount">' + S.selectedCategoryIds.size + ' / ' + D.categories.length + '</span>' +
        '</div>' +
        '<div class="sheet-list">' + rows + '</div>' +
        '<button class="dark-pill" style="margin-top:14px" data-close="1">CONFIRM</button>' +
        '</div></div>';
    }
    return '';
  }

  function editScreen() {
    var rows = S.playerNames.map(function (n, i) {
      return '<div class="pl-row"><span class="pen muted">✎</span>' +
        '<input type="text" value="' + esc(n) + '" data-name="' + i + '" maxlength="18" autocomplete="off">' +
        '<button class="del" data-del="' + i + '"' + (S.playerNames.length <= 3 ? ' disabled' : '') + '>✕</button></div>';
    }).join('');

    return '<div class="screen">' +
      '<div class="topbar">' +
        '<button class="icon-btn" data-back="1">←</button><div class="spacer"></div>' +
        '<div class="brand" style="font-size:17px">EDIT PLAYERS</div>' +
        '<div class="spacer"></div><div style="width:38px"></div>' +
      '</div>' +
      '<div class="muted" style="text-align:center;margin-bottom:16px">3–20 o\'yinchi · ismni bosib tahrirlang</div>' +
      '<div style="flex:1;overflow-y:auto">' + rows + '</div>' +
      '<div class="add-row" style="margin:12px 0">' +
        '<input type="text" id="newName" placeholder="Add player name" maxlength="18" autocomplete="off">' +
        '<button class="add-btn" id="addBtn">＋</button>' +
      '</div>' +
      '<div class="muted" style="text-align:center">Qo\'shilgan: ' + S.playerNames.length + ' / 20</div>' +
      '</div>';
  }

  function passScreen() {
    var p = S.players[S.passIndex];
    var r = S.round;
    if (!p || !r) { S.phase = 'HOME'; return homeScreen(); }

    var bars = S.players.map(function (_, i) {
      var cls = i < S.passIndex ? 'done' : (i === S.passIndex ? 'now' : '');
      return '<i class="' + cls + '"></i>';
    }).join('');

    return '<div class="screen">' +
      '<div class="progress">' + bars + '</div>' +
      '<div class="flash' + (p.impostor ? ' impostor' : '') + '" id="flash">' +
        '<div class="burst"></div><div class="grain"></div><div class="veil"></div>' +
        '<div class="head">' +
          '<div class="pname">' + esc(p.name.toUpperCase()) + '</div>' +
          '<div class="hint">So\'zni boshqalarga aytmang.</div>' +
        '</div>' +
        '<div class="mid"><div class="glass" id="glass"></div></div>' +
      '</div>' +
      '<div style="height:14px"></div>' +
      '<button class="dark-pill" id="nextBtn">' +
        (S.passIndex === S.players.length - 1 ? '▶| FINISH' : '▶| NEXT PLAYER') + '</button>' +
      '</div>';
  }

  function glassIdleHTML() {
    return '<div class="ring">👆</div><div class="hold">HOLD TO REVEAL</div>';
  }

  function glassRevealHTML() {
    var p = S.players[S.passIndex], r = S.round;
    if (p.impostor) {
      var inner = S.hintOn
        ? '<div class="imp-sub">Senga berilgan so\'z:</div><div class="word">' + esc(r.imposterWord) + '</div>'
        : '<div class="imp-sub" style="margin-top:14px">So\'z berilmadi — boshqalarni tinglab, o\'zingiznikini toping 😈</div>';
      return '<div class="word-card"><div class="imp-title">SIZ AYG\'OQCHISIZ!</div>' + inner + '</div>' +
        '<div class="sparkles">' + sparkleDots(7) + '</div>';
    }
    return '<div class="word-card">' +
      '<div class="cat-name">' + esc(r.category.name.toUpperCase()) + '</div>' +
      '<div class="word">' + esc(r.word) + '</div></div>' +
      '<div class="sparkles">' + sparkleDots(7) + '</div>';
  }

  function startedScreen() {
    var starter = S.players[S.starterIndex];
    return '<div class="screen">' +
      '<div class="center">' +
        '<div class="lime-badge">AYG\'OQCHI<br>KIM?</div>' +
        '<div class="big">O\'yin boshlandi! Gapiring va ayg\'oqchini toping.</div>' +
        (starter ? '<div class="starter"><b>' + esc(starter.name) + '</b> suhbatni boshlaydi!</div>' : '') +
        '<div class="muted">Har kim o\'z so\'zini navbat bilan tasvirlab bersin — ayg\'oqchi o\'zini boshqalarga o\'xshatishga harakat qiladi.</div>' +
      '</div>' +
      '<button class="dark-pill" id="revealBtn">AYG\'OQCHI VA SO\'ZNI OCHISH</button>' +
      '<button class="link-btn" data-home="1">New Game</button>' +
      '</div>';
  }

  function endScreen() {
    var r = S.round;
    var imps = S.players.filter(function (p) { return p.impostor; });

    var names = imps.map(function (imp) {
      var idx = S.players.indexOf(imp);
      return '<div class="imp-row">' + avatar(imp.name, idx < 0 ? 0 : idx, 44) +
        '<span class="nm">' + esc(imp.name) + '</span></div>';
    }).join('');

      var wordBlock = S.hintOn
        ? '<div class="words">Ayg\'oqchi so\'zi: ' + esc(r.imposterWord) + '</div>'
        : '<div class="words">Ayg\'oqchiga so\'z berilmagan edi</div>';

    return '<div class="screen">' +
      '<div class="flash end">' +
        '<div class="burst"></div><div class="grain"></div>' +
        '<div class="sparkles" style="border-radius:36px">' + sparkleDots(12) + '</div>' +
        '<div class="kicker">ROUND ENDED</div>' +
        '<div style="height:18px"></div>' +
        '<div class="end-panel">' +
          '<div class="ttl">' + (imps.length > 1 ? 'AYG\'OQCHILAR SHU EDI' : 'AYG\'OQCHI SHU EDI') + '</div>' +
          names +
          '<div class="imp-tag">' + (imps.length > 1 ? 'AYG\'OQCHILAR!' : 'AYG\'OQCHI!') + '</div>' +
        '</div>' +
        '<div style="height:20px"></div>' +
        wordBlock +
        '<div class="divider"></div>' +
        '<div class="words">Haqiqiy so\'z: ' + esc(r.word) + '</div>' +
      '</div>' +
      '<div style="height:14px"></div>' +
      '<div class="vote-row"><button class="mini" id="voteSpy">🕵️ Ayg\'oqchi yutdi</button>' +
      '<button class="mini" id="voteTeam">👥 Jamoa yutdi</button></div>' +
      '<div class="muted" id="voteMsg" style="text-align:center;min-height:20px"></div>' +
      '<button class="dark-pill" id="againBtn">▶| NEW GAME</button>' +
      '</div>';
  }

  /* ---------------- app platformasi hooklari (coin/market) ---------------- */
  function aygHookReveal() {
    try {
      if (window.AygApp && typeof window.AygApp.onReveal === 'function') {
        window.AygApp.onReveal(S.seq || 0, S.players.length);
      }
    } catch (e) { /* platforma ulanmagan — oddiy o'yin */ }
  }

  function aygVote(kind) {
    try {
      if (!(window.AygApp && typeof window.AygApp.onVote === 'function')) return;
      var n = window.AygApp.onVote(kind, S.seq || 0);
      var m = document.getElementById('voteMsg');
      if (m) m.textContent = (n > 0) ? '✅ +' + n + ' coin!' : 'Bu tur uchun ovoz berilgan';
      var a = document.getElementById('voteSpy'), b = document.getElementById('voteTeam');
      if (a) a.disabled = true;
      if (b) b.disabled = true;
    } catch (e) { /* platforma ulanmagan */ }
  }

  /* ---------------- render ---------------- */
  function render() {
    if (S.phase === 'HOME' && S.mode === 'ONLINE' && window.AygOnline) {
      window.AygOnline.show(app, function () { S.mode = 'CLASSIC'; render(); });
      return;
    }
    app.innerHTML = S.phase === 'HOME' ? homeScreen()
      : S.phase === 'EDIT' ? editScreen()
        : S.phase === 'PASS' ? passScreen()
          : S.phase === 'STARTED' ? startedScreen()
            : endScreen();
    bind();
  }

  function updateCatUI() {
    Array.prototype.forEach.call(app.querySelectorAll('[data-cat]'), function (el) {
      var on = S.selectedCategoryIds.has(el.getAttribute('data-cat'));
      el.classList.toggle('selected', on);
      var chk = el.querySelector('.check');

      if (el.classList.contains('sheet-row')) {
        if (!chk) { chk = document.createElement('span'); chk.className = 'check'; el.appendChild(chk); }
        chk.textContent = on ? '✓' : '';
      } else {
        var host = el.querySelector('.top');
        if (on && !chk && host) {
          chk = document.createElement('span'); chk.className = 'check'; chk.textContent = '✓';
          host.appendChild(chk);
        } else if (!on && chk) {
          chk.remove();
        }
      }
    });
    var c1 = document.getElementById('catCount');
    if (c1) c1.textContent = S.selectedCategoryIds.size + ' tanlangan';
    var c2 = document.getElementById('sheetCount');
    if (c2) c2.textContent = S.selectedCategoryIds.size + ' / ' + D.categories.length;
  }

  function bind() {
    /* --- navigatsiya --- */
    Array.prototype.forEach.call(app.querySelectorAll('[data-edit]'), function (b) {
      b.onclick = function () { S.phase = 'EDIT'; S.sheet = null; render(); };
    });
    var back = app.querySelector('[data-back]');
    if (back) back.onclick = function () { S.phase = 'HOME'; render(); };
    var home = app.querySelector('[data-home]');
    if (home) home.onclick = function () { S.phase = 'HOME'; S.round = null; S.players = []; render(); };

    /* --- sheet --- */
    Array.prototype.forEach.call(app.querySelectorAll('[data-sheet]'), function (b) {
      b.onclick = function () { S.sheet = b.getAttribute('data-sheet'); render(); };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-close]'), function (b) {
      b.onclick = function () { S.sheet = null; render(); };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-all]'), function (b) {
      b.onclick = function () { S.selectedCategoryIds = new Set(D.categories.map(function (c) { return c.id; })); save(); updateCatUI(); };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-none]'), function (b) {
      b.onclick = function () { S.selectedCategoryIds = new Set(); save(); updateCatUI(); };
    });

    /* --- kategoriya toggle --- */
    Array.prototype.forEach.call(app.querySelectorAll('[data-cat]'), function (el) {
      el.onclick = function () {
        var id = el.getAttribute('data-cat');
        if (S.selectedCategoryIds.has(id)) S.selectedCategoryIds.delete(id);
        else S.selectedCategoryIds.add(id);
        save(); updateCatUI();
      };
    });

    /* --- rejim / impostor soni / hint --- */
    Array.prototype.forEach.call(app.querySelectorAll('[data-mode]'), function (b) {
      b.onclick = function () { S.mode = b.getAttribute('data-mode'); render(); };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-imp]'), function (b) {
      b.onclick = function () {
        S.impostorCount = clampImpostors(S.impostorCount + Number(b.getAttribute('data-imp')));
        save(); render();
      };
    });
    var hintSw = document.getElementById('hintSw');
    if (hintSw) hintSw.onchange = function () { S.hintOn = hintSw.checked; save(); };

    /* --- HOME: start --- */
    var startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.onclick = startGame;

    /* --- EDIT: ism o'zgartirish / qo'shish / o'chirish --- */
    Array.prototype.forEach.call(app.querySelectorAll('[data-name]'), function (inp) {
      inp.oninput = function () {
        var i = Number(inp.getAttribute('data-name'));
        S.playerNames[i] = inp.value;
        save();
      };
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-del]'), function (b) {
      b.onclick = function () {
        if (S.playerNames.length <= 3) return;
        S.playerNames.splice(Number(b.getAttribute('data-del')), 1);
        S.impostorCount = clampImpostors(S.impostorCount);
        save(); render();
      };
    });
    var addBtn = document.getElementById('addBtn');
    var newName = document.getElementById('newName');
    if (addBtn) {
      var add = function () {
        var v = newName.value.trim();
        if (!v || S.playerNames.length >= 20) { newName.focus(); return; }
        S.playerNames.push(v.slice(0, 18));
        newName.value = '';
        save(); render();
        var nn = document.getElementById('newName');
        if (nn) nn.focus();
      };
      addBtn.onclick = add;
      newName.onkeydown = function (e) { if (e.key === 'Enter') add(); };
    }

    /* --- PASS: bosib ushlab ko'rish --- */
    var flash = document.getElementById('flash');
    var glass = document.getElementById('glass');
    if (flash && glass) {
      var press = function (on) {
        S.pressed = on;
        flash.classList.toggle('pressed', on);
        glass.innerHTML = on ? glassRevealHTML() : glassIdleHTML();
      };
      press(S.pressed);
      flash.addEventListener('pointerdown', function (e) { e.preventDefault(); press(true); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
        flash.addEventListener(ev, function () { if (S.pressed) press(false); });
      });
      flash.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }
    var nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
      nextBtn.onclick = function () {
        if (S.passIndex + 1 >= S.players.length) S.phase = 'STARTED';
        else S.passIndex++;
        render();
      };
    }

    /* --- STARTED / END --- */
    var revealBtn = document.getElementById('revealBtn');
    if (revealBtn) revealBtn.onclick = function () { S.phase = 'REVEAL'; render(); aygHookReveal(); };
    var againBtn = document.getElementById('againBtn');
    if (againBtn) againBtn.onclick = startGame;
    var vS = document.getElementById('voteSpy'), vT = document.getElementById('voteTeam');
    if (vS) vS.onclick = function () { aygVote('spy'); };
    if (vT) vT.onclick = function () { aygVote('team'); };
  }

  /* ---------------- demo rejimi (faqat sinov uchun: ?demo=press|passimp|started|reveal|edit|sheet|help) ---------------- */
  function applyDemo() {
    var m = /[?&]demo=([a-z]+)/i.exec(location.search);
    if (!m) return;
    var kind = m[1].toLowerCase();
    if (kind === 'edit') { S.phase = 'EDIT'; return; }
    if (kind === 'sheet') { S.sheet = 'CATEGORIES'; return; }
    if (kind === 'help') { S.sheet = 'HELP'; return; }

    S.playerNames = ['Alisher', 'Dilnoza', 'Bekzod', 'Zarina', 'Kamola'];
    S.selectedCategoryIds = new Set(D.categories.map(function (c) { return c.id; }));
    S.hintOn = kind !== 'nohint';
    startGame();
    if (kind === 'passimp') {
      for (var i = 0; i < 300 && !S.players[0].impostor; i++) startGame();
    }
    if (kind === 'press') S.pressed = true;
    if (kind === 'pressimp') {
      for (var j = 0; j < 300 && !S.players[0].impostor; j++) startGame();
      S.pressed = true;
    }
    if (kind === 'started') S.phase = 'STARTED';
    if (kind === 'reveal') S.phase = 'REVEAL';
  }

  /* ---------------- ?debug=1 — joylashuvni o'lchash (faqat sinov uchun) ---------------- */
  function debugOverflow() {
    if (!/[?&]debug=1/.test(location.search)) return;
    setTimeout(function () {
      var over = [];
      Array.prototype.forEach.call(document.querySelectorAll('#app .screen *'), function (el) {
        var r = el.getBoundingClientRect();
        if (r.right > window.innerWidth + 1) {
          over.push((el.className || el.tagName) + '→' + Math.round(r.right));
        }
      });
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:999;background:#000;color:#0f0;' +
        'font:11px/1.35 monospace;padding:6px 8px;word-break:break-all';
      d.textContent = 'sw=' + document.documentElement.scrollWidth + ' iw=' + window.innerWidth +
        ' | toshgan: ' + (over.length ? over.slice(0, 7).join(' , ') : 'yo\'q');
      document.body.appendChild(d);
    }, 600);
  }

  /* ---------------- ekran o'chmasin (Wake Lock) ---------------- */
  function keepAwake() {
    if (!('wakeLock' in navigator)) return;
    var lock = null;
    var request = function () {
      navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () { });
    };
    request();
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && (!lock || lock.released)) request();
    });
  }

  /* ---------------- start ---------------- */
  function init() {
    if (!D || !D.categories || !D.categories.length) {
      app.innerHTML = '<div class="screen" style="justify-content:center;text-align:center">' +
        '<div class="big">Ma\'lumot yuklanmadi 😕</div>' +
        '<div class="muted">Sahifani yangilab ko\'ring.</div></div>';
      document.getElementById('boot').style.display = 'none';
      return;
    }
    load();
    document.getElementById('boot').style.display = 'none';
    applyDemo();
    render();
    debugOverflow();
    keepAwake();

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(function () { });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
