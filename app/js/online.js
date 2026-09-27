/* ============================================================
   Ayg'oqchi — ONLINE rejim (kod bilan xona, Firestore)
   Oqim: HOME → LOBBY → PLAYING → REVEALED
   Protokol (Android bilan bir xil):
   - rooms/{CODE}: hostUid, hostName, status, settings,
     players[{uid,name}], playerUids[], roundNo,
     round{category, starterUid, starterName, spyUids} | null,
     result{spyNames[], word, impWord} | null
   - rooms/{CODE}/secrets/{uid}: {word, impostor} (faqat egasi o'qiydi)
   Eslatma: round.spyUids hamma o'quvchiga ko'rinadi (do'stlar
   o'yini uchun qabul qilindi — devtools ochgan ko'rishi mumkin).
   ============================================================ */
(function () {
  'use strict';

  var CODE_LEN = 6;
  var CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var MAX_PLAYERS = 20;

  var O = {
    box: null, exit: null, unsub: null,
    code: null, room: null, secret: null,
    busy: false, err: '', joinCode: '',
    secretShown: false, rewarded: '', voted: ''
  };

  /* ---------------- yordamchilar ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function db() { return firebase.firestore(); }
  function me() { try { return firebase.auth().currentUser; } catch (e) { return null; } }
  function myUid() { var u = me(); return u ? u.uid : null; }
  function myName() {
    try {
      var p = window.AygEco && window.AygEco.me && window.AygEco.me();
      if (p && p.name) return String(p.name).slice(0, 20);
    } catch (e) {}
    var u = me();
    if (u && u.displayName) return String(u.displayName).slice(0, 20);
    if (u && u.email) return u.email.split('@')[0].slice(0, 20);
    return 'O‘yinchi';
  }
  function isHost() { return O.room && O.room.hostUid === myUid(); }
  function maxImp(n) { return Math.max(1, Math.floor(n / 2)); }
  function ava(name, i) {
    var ch = (String(name).trim().charAt(0) || '?').toUpperCase();
    var pal = ['#FFB5A7', '#C9B6F0', '#A8E8D0', '#FFD9A8', '#C6F432'];
    return '<span style="background:' + pal[(i || 0) % pal.length] +
      ';width:30px;height:30px;flex:0 0 30px;font-size:13px;display:grid;' +
      'place-items:center;border-radius:50%;font-weight:900;color:#1A1A1A">' + esc(ch) + '</span>';
  }
  function errHTML() {
    return O.err ? '<div class="card" style="padding:12px 16px;margin-top:12px;color:#B00020;font-size:14px">' + esc(O.err) + '</div>' : '';
  }

  /* web single versiyadagi bilan bir xil (GAME_DATA dan) */
  function similarWord(word, category) {
    var D = window.GAME_DATA;
    var w = String(word).toLowerCase();
    var cp = D.curatedPairs || {};
    if (cp[w]) return cp[w];
    for (var k in cp) {
      if (cp[k].toLowerCase() === w) return k.charAt(0).toUpperCase() + k.slice(1);
    }
    var clusters = D.clusters || [];
    for (var i = 0; i < clusters.length; i++) {
      var g = clusters[i];
      if (g.some(function (x) { return x.toLowerCase() === w; })) {
        var c = g.filter(function (x) { return x.toLowerCase() !== w; });
        if (c.length) return rnd(c);
      }
    }
    var others = (category.words || []).filter(function (x) { return x.toLowerCase() !== w; });
    return others.length ? rnd(others) : word;
  }

  function genCode() {
    var s = '';
    for (var i = 0; i < CODE_LEN; i++) s += CODE_ABC[Math.floor(Math.random() * CODE_ABC.length)];
    return s;
  }

  /* ---------------- xona CRUD ---------------- */
  function roomRef(code) { return db().collection('rooms').doc(code); }

  function subscribe(code) {
    if (O.unsub) { try { O.unsub(); } catch (e) {} O.unsub = null; }
    O.unsub = roomRef(code).onSnapshot(function (snap) {
      if (!snap.exists) {
        cleanup();
        O.err = 'Xona yopildi';
        renderHome();
        return;
      }
      O.room = snap.data();
      if (O.room.status === 'playing' && O.secretRound !== O.room.roundNo) {
        O.secret = null;
        O.secretShown = false;
        fetchSecret();
      }
      else render();
    }, function () {
      O.err = 'Ulanishda xatolik — internetni tekshiring';
      render();
    });
  }

  function cleanup() {
    if (O.unsub) { try { O.unsub(); } catch (e) {} O.unsub = null; }
    O.code = null; O.room = null; O.secret = null; O.secretRound = -1;
    O.secretShown = false; O.rewarded = ''; O.voted = ''; O.voteMsg = '';
  }

  function createRoom() {
    if (O.busy) return;
    O.busy = true; O.err = ''; render();
    var code = genCode();
    var tries = 0;
    var attempt = function () {
      roomRef(code).get().then(function (snap) {
        if (snap.exists && tries < 5) { tries++; code = genCode(); attempt(); return; }
        var now = new Date().toISOString();
        roomRef(code).set({
          hostUid: myUid(), hostName: myName(),
          status: 'lobby', createdAt: now,
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          settings: { categoryId: 'random', impostorCount: 1, hintOn: true },
          players: [{ uid: myUid(), name: myName() }],
          playerUids: [myUid()],
          roundNo: 0, round: null, result: null,
          updatedAt: now
        }).then(function () {
          O.busy = false; O.code = code;
          subscribe(code);
        }).catch(function () {
          O.busy = false; O.err = 'Xona ochilmadi — qayta urining'; render();
        });
      }).catch(function () {
        O.busy = false; O.err = 'Internetni tekshiring'; render();
      });
    };
    attempt();
  }

  function joinRoom(raw) {
    var code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN);
    if (code.length !== CODE_LEN) { O.err = '6 belgili kod kiriting'; render(); return; }
    if (O.busy) return;
    O.busy = true; O.err = ''; render();
    roomRef(code).get().then(function (snap) {
      if (!snap.exists) { O.busy = false; O.err = 'Bunday xona topilmadi'; render(); return; }
      var r = snap.data();
      if (r.status !== 'lobby') { O.busy = false; O.err = 'O‘yin boshlanib ketgan'; render(); return; }
      if ((r.players || []).length >= MAX_PLAYERS) { O.busy = false; O.err = 'Xona to‘la'; render(); return; }
      if ((r.playerUids || []).indexOf(myUid()) >= 0) {
        O.busy = false; O.code = code; subscribe(code); return;
      }
      var players = (r.players || []).concat([{ uid: myUid(), name: myName() }]);
      var uids = (r.playerUids || []).concat([myUid()]);
      roomRef(code).update({
        players: players, playerUids: uids,
        updatedAt: new Date().toISOString()
      }).then(function () {
        O.busy = false; O.code = code; subscribe(code);
      }).catch(function () {
        O.busy = false; O.err = 'Kirishda xatolik'; render();
      });
    }).catch(function () {
      O.busy = false; O.err = 'Internetni tekshiring'; render();
    });
  }

  function leaveRoom() {
    if (!O.code || !O.room) { cleanup(); renderHome(); return; }
    var code = O.code;
    var rest = (O.room.players || []).filter(function (p) { return p.uid !== myUid(); });
    var restUids = (O.room.playerUids || []).filter(function (u) { return u !== myUid(); });
    var done = function () { cleanup(); renderHome(); };
    if (!rest.length) {
      roomRef(code).delete().then(done).catch(done);
      return;
    }
    var patch = {
      players: rest, playerUids: restUids,
      updatedAt: new Date().toISOString()
    };
    if (O.room.hostUid === myUid()) {
      patch.hostUid = rest[0].uid;
      patch.hostName = rest[0].name;
    }
    roomRef(code).update(patch).then(done).catch(done);
  }

  function fetchSecret() {
    roomRef(O.code).collection('secrets').doc(myUid()).get().then(function (snap) {
      if (snap.exists) { O.secret = snap.data(); O.secretRound = O.room ? O.room.roundNo : 0; }
      render();
    }).catch(function () { render(); });
  }

  function reveal() {
    if (!isHost() || O.busy) return;
    O.busy = true; O.err = ''; render();
    var spies = (O.room.players || []).filter(function (p) {
      return ((O.room.round || {}).spyUids || []).indexOf(p.uid) >= 0;
    });
    // So'zlarni host tur boshlaganda eslab qolgan (O.lastWords).
    // Host sahifani yangilagan bo'lsa — o'z secret'idan tiklaymiz.
    var applyResult = function (word, impWord) {
      return roomRef(O.code).update({
        status: 'revealed',
        result: {
          spyNames: spies.map(function (p) { return p.name; }),
          word: word, impWord: impWord,
          hintOn: O.room.settings && O.room.settings.hintOn !== false
        },
        updatedAt: new Date().toISOString()
      }).then(function () {
        O.busy = false;
      }).catch(function () {
        O.busy = false; O.err = 'Ochishda xatolik'; render();
      });
    };
    if (O.lastWords) {
      applyResult(O.lastWords.word, O.lastWords.impWord);
    } else {
      roomRef(O.code).collection('secrets').doc(myUid()).get().then(function (snap) {
        var s = snap.exists ? snap.data() : { word: '', impostor: false };
        if (s.impostor) applyResult('', s.word);
        else applyResult(s.word, '');
      }).catch(function () {
        O.busy = false; O.err = 'Ochishda xatolik'; render();
      });
    }
  }

  /* ---------------- coin hooklari ---------------- */
  function rewardPlaying() {
    try {
      var key = O.code + '-' + O.room.roundNo;
      if (O.rewarded === key) return;
      O.rewarded = key;
      if (window.AygApp && typeof window.AygApp.onReveal === 'function') {
        window.AygApp.onReveal(key, (O.room.players || []).length);
      }
    } catch (e) {}
  }

  function vote(kind) {
    try {
      var key = O.code + '-' + O.room.roundNo;
      if (O.voted === key) return;
      if (window.AygApp && typeof window.AygApp.onVote === 'function') {
        var gain = window.AygApp.onVote(kind, key);
        if (gain > 0) {
          O.voted = key;
          O.voteMsg = '✅ +' + gain + ' coin!';
        } else {
          O.voteMsg = 'Bu tur uchun ovoz berilgan';
        }
        render();
      }
    } catch (e) {}
  }

  /* ---------------- ekranlar ---------------- */
  function topbar(title) {
    return '<div class="topbar">' +
      '<button class="icon-btn" data-oexit="1">←</button><div class="spacer"></div>' +
      '<div class="brand" style="font-size:17px">' + esc(title) + '</div>' +
      '<div class="spacer"></div><div style="width:38px"></div>' +
      '</div>';
  }

  function playerChips(players) {
    return '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">' +
      players.map(function (p, i) {
        var host = O.room && p.uid === O.room.hostUid ? ' 👑' : '';
        var you = p.uid === myUid() ? ' (siz)' : '';
        return '<span style="display:inline-flex;align-items:center;gap:7px;background:#fff;' +
          'border:1px solid #E9E9E6;border-radius:50px;padding:7px 13px 7px 7px;' +
          'font-size:13.5px;font-weight:700">' + ava(p.name, i) + esc(p.name) + host + you + '</span>';
      }).join('') + '</div>';
  }

  function renderHome() {
    O.box.innerHTML = '<div class="screen">' +
      topbar('ONLINE') +
      '<div class="stack">' +
        '<div>' +
          '<div class="label">XONA OCHISH</div>' +
          '<div class="card" style="margin-top:8px;padding:18px">' +
            '<div class="muted" style="margin-bottom:12px">Do‘stlaringiz kod orqali qo‘shiladi. Kamida 3 kishi.</div>' +
            '<button class="cta" id="o-create"' + (O.busy ? ' disabled' : '') + '>' +
            (O.busy ? 'Ochilmoqda…' : 'XONA OCHISH') + '</button>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div class="label">KOD BILAN KIRISH</div>' +
          '<div class="card" style="margin-top:8px;padding:18px">' +
            '<input id="o-code" placeholder="Masalan: KX7Q2M" maxlength="6" autocapitalize="characters" autocomplete="off" ' +
              'style="width:100%;border:1px solid #E9E9E6;border-radius:12px;padding:13px;font-size:17px;' +
              'font-weight:800;letter-spacing:3px;text-transform:uppercase;text-align:center">' +
            '<button class="dark-pill" id="o-join" style="margin-top:12px"' + (O.busy ? ' disabled' : '') + '>KIRISH</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      errHTML() +
      '</div>';
    document.getElementById('o-create').onclick = createRoom;
    var go = function () { joinRoom(document.getElementById('o-code').value); };
    document.getElementById('o-join').onclick = go;
    document.getElementById('o-code').onkeydown = function (e) { if (e.key === 'Enter') go(); };
    bindExit();
  }

  function renderLobby() {
    var D = window.GAME_DATA;
    var players = O.room.players || [];
    var host = isHost();
    var st = O.room.settings || { categoryId: 'random', impostorCount: 1, hintOn: true };

    var opts = '<option value="random">🎲 Tasodifiy</option>' + D.categories.map(function (c) {
      return '<option value="' + c.id + '"' + (st.categoryId === c.id ? ' selected' : '') + '>' +
        c.emoji + ' ' + esc(c.name) + '</option>';
    }).join('');

    var settings = host
      ? '<div class="label" style="margin-top:16px">SOZLAMALAR (faqat host)</div>' +
        '<div class="card" style="margin-top:8px;padding:16px">' +
          '<div class="muted" style="margin-bottom:6px">Kategoriya</div>' +
          '<select id="o-cat" style="width:100%;padding:12px;border-radius:12px;border:1px solid #E9E9E6;font-size:15px">' + opts + '</select>' +
          '<div class="row" style="margin-top:12px"><div><b id="o-impn">' + (st.impostorCount || 1) + ' ayg‘oqchi</b>' +
          '<div class="muted">Maks: ' + maxImp(Math.max(players.length, 3)) + '</div></div><div class="spacer"></div>' +
          '<button class="mini" id="o-impm">−</button> <button class="mini" id="o-impp">+</button></div>' +
          '<label style="display:flex;align-items:center;gap:10px;margin-top:12px;font-size:14.5px;font-weight:700">' +
          '<input type="checkbox" id="o-hint"' + (st.hintOn !== false ? ' checked' : '') + ' style="width:20px;height:20px"> ' +
          'Ayg‘oqchiga o‘xshash so‘z berish</label>' +
        '</div>'
      : '<div class="muted" style="margin-top:16px;text-align:center">Host o‘yinni boshlashini kuting…</div>';

    O.box.innerHTML = '<div class="screen">' +
      topbar('XONA') +
      '<div class="card" style="padding:20px;text-align:center">' +
        '<div class="muted">DO‘STLARINGIZGA KODNI AYting</div>' +
        '<div id="o-roomcode" style="font-size:42px;font-weight:900;letter-spacing:8px;margin:6px 0;cursor:pointer">' + esc(O.code) + '</div>' +
        '<div class="muted" style="font-size:12px">Bosilsa nusxalanadi</div>' +
      '</div>' +
      '<div style="margin-top:14px"><div class="label">O‘YINCHILAR · ' + players.length + '</div>' +
      playerChips(players) + '</div>' +
      settings +
      '<div style="height:14px"></div>' +
      (host
        ? '<button class="cta" id="o-start"' + (O.busy || players.length < 3 ? ' disabled' : '') + '>' +
          (players.length < 3 ? 'KAMIDA 3 KISHI KERAK' : 'O‘YINNI BOSHLASH') + '</button>'
        : '') +
      '<button class="link-btn" id="o-leave" style="margin-top:10px">Xonadan chiqish</button>' +
      errHTML() +
      '</div>';

    document.getElementById('o-roomcode').onclick = function () {
      try {
        if (navigator.clipboard) navigator.clipboard.writeText(O.code);
        O.err = 'Kod nusxalandi: ' + O.code; render();
      } catch (e) {}
    };
    document.getElementById('o-leave').onclick = leaveRoom;
    if (host) {
      var pushSettings = function (patch) {
        var s = {
          categoryId: st.categoryId || 'random',
          impostorCount: st.impostorCount || 1,
          hintOn: st.hintOn !== false
        };
        Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
        roomRef(O.code).update({
          settings: s, updatedAt: new Date().toISOString()
        }).catch(function () {});
      };
      document.getElementById('o-cat').onchange = function (e) { pushSettings({ categoryId: e.target.value }); };
      document.getElementById('o-impm').onclick = function () {
        pushSettings({ impostorCount: Math.max(1, (st.impostorCount || 1) - 1) });
      };
      document.getElementById('o-impp').onclick = function () {
        pushSettings({ impostorCount: Math.min(maxImp(Math.max(players.length, 3)), (st.impostorCount || 1) + 1) });
      };
      document.getElementById('o-hint').onchange = function (e) { pushSettings({ hintOn: e.target.checked }); };
      var startBtn = document.getElementById('o-start');
      if (startBtn) startBtn.onclick = startRound;
    }
    bindExit();
  }

  function renderPlaying() {
    rewardPlaying();
    var r = O.room.round || {};
    var starter = r.starterName ? '<b>' + esc(r.starterName) + '</b> suhbatni boshlaydi!' : '';
    var card;
    if (!O.secret) {
      card = '<div class="card" style="padding:26px;text-align:center"><div class="muted">So‘zingiz yuklanmoqda…</div></div>';
    } else if (!O.secretShown) {
      card = '<div class="card" id="o-wordcard" style="padding:40px 20px;text-align:center;cursor:pointer">' +
        '<div style="font-size:40px">👆</div><div style="font-weight:900;letter-spacing:2px;margin-top:10px">SO‘ZNI KO‘RISH</div>' +
        '<div class="muted">Hech kim qaramayotganiga ishonch hosil qiling!</div></div>';
    } else if (O.secret.impostor) {
      card = '<div class="card" id="o-wordcard" style="padding:30px 20px;text-align:center;cursor:pointer;background:#1A1A1A;color:#fff">' +
        '<div style="font-weight:900;color:#FF6B6B;letter-spacing:1px">SIZ AYG‘OQCHISIZ! 🕵️</div>' +
        (O.secret.word
          ? '<div class="muted" style="color:#bbb;margin-top:8px">Sizga berilgan so‘z:</div>' +
            '<div style="font-size:30px;font-weight:900;margin-top:4px">' + esc(O.secret.word) + '</div>'
          : '<div class="muted" style="color:#bbb;margin-top:8px">So‘z berilmadi — tinglab toping 😈</div>') +
        '<div class="muted" style="color:#777;margin-top:10px;font-size:12px">Yashirish uchun bosing</div></div>';
    } else {
      card = '<div class="card" id="o-wordcard" style="padding:30px 20px;text-align:center;cursor:pointer">' +
        '<div class="muted">' + esc((r.category || '').toUpperCase()) + '</div>' +
        '<div style="font-size:34px;font-weight:900;margin-top:4px">' + esc(O.secret.word) + '</div>' +
        '<div class="muted" style="margin-top:10px;font-size:12px">Yashirish uchun bosing</div></div>';
    }

    O.box.innerHTML = '<div class="screen">' +
      topbar('MUHOKAMA') +
      '<div class="muted" style="text-align:center">' + starter + ' Har kim navbat bilan so‘zini tasvirlasin.</div>' +
      '<div style="height:12px"></div>' + card +
      '<div style="margin-top:12px"><div class="label">XONADA · ' + (O.room.players || []).length + '</div>' +
      playerChips(O.room.players || []) + '</div>' +
      '<div style="height:14px"></div>' +
      (isHost() ? '<button class="dark-pill" id="o-reveal"' + (O.busy ? ' disabled' : '') + '>AYG‘OQCHINI OCHISH</button>' : '') +
      '<button class="link-btn" id="o-leave" style="margin-top:10px">Chiqish</button>' +
      errHTML() +
      '</div>';
    var wc = document.getElementById('o-wordcard');
    if (wc) wc.onclick = function () { O.secretShown = !O.secretShown; render(); };
    document.getElementById('o-leave').onclick = leaveRoom;
    var rv = document.getElementById('o-reveal');
    if (rv) rv.onclick = reveal;
    bindExit();
  }

  function renderRevealed() {
    var res = O.room.result || { spyNames: [], word: '', impWord: '', hintOn: true };
    var spies = res.spyNames.map(function (n, i) {
      return '<div style="display:flex;align-items:center;gap:10px;justify-content:center;margin:4px 0">' +
        ava(n, i) + '<b>' + esc(n) + '</b></div>';
    }).join('');
    var canVote = O.voted !== (O.code + '-' + O.room.roundNo);

    O.box.innerHTML = '<div class="screen">' +
      topbar('NATJA') +
      '<div class="card" style="padding:24px 18px;text-align:center">' +
        '<div class="muted">AYG‘OQCHI ' + (res.spyNames.length > 1 ? 'LAR' : '') + '</div>' +
        '<div style="margin:10px 0">' + (spies || '<div class="muted">—</div>') + '</div>' +
        '<div class="imp-tag" style="display:inline-block;background:#1A1A1A;color:#fff;border-radius:50px;padding:8px 18px;font-weight:900">AYG‘OQCHI!</div>' +
        '<div style="height:14px"></div>' +
        '<div>Haqiqiy so‘z: <b>' + esc(res.word || '—') + '</b></div>' +
        (res.hintOn !== false
          ? '<div class="muted">Ayg‘oqchi so‘zi: <b>' + esc(res.impWord || '—') + '</b></div>'
          : '<div class="muted">Ayg‘oqchiga so‘z berilmagan edi</div>') +
      '</div>' +
      '<div style="height:12px"></div>' +
      '<div style="display:flex;gap:10px">' +
        '<button class="mini" id="o-vspy" style="flex:1"' + (canVote ? '' : ' disabled') + '>🕵️ Ayg‘oqchi yutdi</button>' +
        '<button class="mini" id="o-vteam" style="flex:1"' + (canVote ? '' : ' disabled') + '>👥 Jamoa yutdi</button>' +
      '</div>' +
      '<div class="muted" id="o-vmsg" style="text-align:center;min-height:20px;margin-top:6px">' + esc(O.voteMsg || '') + '</div>' +
      (isHost() ? '<button class="cta" id="o-again"' + (O.busy ? ' disabled' : '') + '>▶| YANGI TUR</button>' : '') +
      '<button class="link-btn" id="o-leave" style="margin-top:10px">' + (isHost() ? 'Xonani yopish' : 'Chiqish') + '</button>' +
      errHTML() +
      '</div>';
    document.getElementById('o-vspy').onclick = function () { vote('spy'); };
    document.getElementById('o-vteam').onclick = function () { vote('team'); };
    document.getElementById('o-leave').onclick = leaveRoom;
    var ag = document.getElementById('o-again');
    if (ag) ag.onclick = startRound;
    bindExit();
  }

  function render() {
    if (!O.room) { renderHome(); return; }
    if (O.room.status === 'lobby') renderLobby();
    else if (O.room.status === 'playing') renderPlaying();
    else renderRevealed();
  }

  function bindExit() {
    Array.prototype.forEach.call(O.box.querySelectorAll('[data-oexit]'), function (b) {
      b.onclick = function () {
        if (O.code) leaveRoom();
        O.exit();
      };
    });
  }

  /* ---------------- tashqi API (game.js chaqiradi) ---------------- */
  window.AygOnline = {
    show: function (container, onExit) {
      O.box = container; O.exit = onExit;
      O.err = '';
      if (!window.GAME_DATA) {
        container.innerHTML = '<div class="screen">' + topbar('ONLINE') +
          '<div class="card" style="padding:20px;text-align:center">Ma’lumot yuklanmadi 😕</div></div>';
        bindExit();
        return;
      }
      try {
        if (!firebase.auth().currentUser) {
          container.innerHTML = '<div class="screen">' + topbar('ONLINE') +
            '<div class="card" style="padding:20px;text-align:center">' +
            '<div class="muted">Online uchun avval kiring (yuqoridagi Profil orqali).</div></div></div>';
          bindExit();
          return;
        }
      } catch (e) {
        container.innerHTML = '<div class="screen">' + topbar('ONLINE') +
          '<div class="card" style="padding:20px;text-align:center">' +
          '<div class="muted">Firebase ulanmagan.</div></div></div>';
        bindExit();
        return;
      }
      renderHome();
    },
    hide: function () {
      if (O.unsub) { try { O.unsub(); } catch (e) {} O.unsub = null; }
    }
  };

  /* ---------------- tur boshlash (host) ---------------- */
  function startRound() {
    if (!isHost() || O.busy) return;
    var D = window.GAME_DATA;
    var players = O.room.players || [];
    if (players.length < 3) { O.err = 'Kamida 3 o‘yinchi kerak'; render(); return; }
    var st = O.room.settings || {};
    var impCount = Math.max(1, Math.min(Number(st.impostorCount) || 1, maxImp(players.length)));
    var pool = (st.categoryId && st.categoryId !== 'random')
      ? D.categories.filter(function (c) { return c.id === st.categoryId; })
      : D.categories;
    if (!pool.length) pool = D.categories;
    var cat = rnd(pool);
    var word = rnd(cat.words);
    var impWord = st.hintOn === false ? '' : similarWord(word, cat);
    O.lastWords = { word: word, impWord: impWord };

    var order = shuffle(players.map(function (p) { return p.uid; }));
    var spyUids = order.slice(0, impCount);
    var starter = rnd(players);
    var roundNo = (O.room.roundNo || 0) + 1;

    O.busy = true; O.err = ''; render();
    var batch = db().batch();
    batch.update(roomRef(O.code), {
      status: 'playing',
      round: {
        category: cat.name, categoryId: cat.id,
        starterUid: starter.uid, starterName: starter.name,
        spyUids: spyUids
      },
      result: null, roundNo: roundNo,
      updatedAt: new Date().toISOString()
    });
    players.forEach(function (p) {
      var spy = spyUids.indexOf(p.uid) >= 0;
      batch.set(roomRef(O.code).collection('secrets').doc(p.uid), {
        word: spy ? impWord : word,
        impostor: spy
      });
    });
    O.secret = null; O.secretShown = false; O.voted = ''; O.voteMsg = '';
    batch.commit().then(function () {
      O.busy = false;
    }).catch(function () {
      O.busy = false; O.err = 'Boshlashda xatolik'; render();
    });
  };
})();
