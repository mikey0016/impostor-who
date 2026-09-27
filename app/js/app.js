/* ============================================================
   Ayg'oqchi — web platforma (auth gate + tablar + o'yin)
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var gameLoaded = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function show(id) {
    ['setup-error', 'auth-view', 'hub'].forEach(function (v) {
      $(v).style.display = (v === id) ? 'block' : 'none';
    });
  }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function ensureGame() {
    if (gameLoaded) return Promise.resolve();
    /* data.js keyin game.js — game.js yuklanishi bilan o'yin #app ga chiziladi */
    return loadScript('js/data.js')
      .then(function () { return loadScript('js/game.js'); })
      .then(function () { gameLoaded = true; });
  }

  /* ---------------- tablar ---------------- */
  function switchTab(name) {
    ['game', 'market', 'top', 'profile'].forEach(function (t) {
      $('tab-' + t).style.display = (t === name) ? 'block' : 'none';
      var b = document.querySelector('[data-tab="' + t + '"]');
      if (b) b.classList.toggle('active', t === name);
    });
    if (name === 'top') renderTop();
    if (name === 'market') renderMarket();
    if (name === 'profile') renderProfile();
  }

  /* ---------------- yuqori panel ---------------- */
  function renderTopbar(p) {
    var vip = p && p.inv && p.inv.vip ? ' 👑' : '';
    $('tb-name').textContent = (p ? p.name : '…') + vip;
    $('tb-coins').textContent = '🪙 ' + (p ? (p.coins || 0) : 0);
  }

  /* ---------------- profil ---------------- */
  function renderProfile() {
    var p = window.AygEco.me();
    if (!p) return;
    renderTopbar(p);
    $('pf-name').textContent = p.name + ((p.inv && p.inv.vip) ? ' 👑' : '');
    $('pf-coins').textContent = p.coins || 0;
    $('pf-games').textContent = p.games || 0;
    $('pf-wins').textContent = p.wins || 0;
    $('pf-spy').textContent = p.spyWins || 0;
    var d = $('daily-btn');
    if (window.AygEco.canDaily()) {
      d.disabled = false;
      d.textContent = '🎁 Kunlik bonus: +50 coin';
    } else {
      d.disabled = true;
      d.textContent = '🎁 Ertaga yana keling';
    }
  }

  /* ---------------- market ---------------- */
  function renderMarket() {
    var p = window.AygEco.me();
    if (!p) return;
    renderTopbar(p);
    var inv = p.inv || { theme: 'default' };
    var html = '<div class="sec-t">🎨 Karta mavzulari</div><div class="grid">';
    Object.keys(window.AygEco.THEMES).forEach(function (id) {
      var t = window.AygEco.THEMES[id];
      var owned = (id === 'default') || !!inv['own_' + id] || inv.theme === id;
      var active = inv.theme === id;
      html += '<div class="card m-item theme-' + id + '">' +
        '<div class="m-name">' + esc(t.name) + '</div>' +
        '<div class="m-desc">' + (t.price ? t.price + ' coin' : 'Bepul') + '</div>' +
        (active ? '<button class="mini" disabled>Tanlangan ✓</button>'
          : owned ? '<button class="mini" data-apply="' + id + '">Tanlash</button>'
          : '<button class="mini buy" data-buy="' + id + '">Sotib olish · ' + t.price + ' 🪙</button>') +
        '</div>';
    });
    html += '</div><div class="sec-t">⭐ Maxsus</div><div class="grid">';
    window.AygEco.ITEMS.forEach(function (it) {
      var owned = !!inv[it.id];
      html += '<div class="card m-item"><div class="m-name">' + esc(it.name) + '</div>' +
        '<div class="m-desc">' + esc(it.desc) + ' · ' + it.price + ' coin</div>' +
        (owned ? '<button class="mini" disabled>Olingan ✓</button>'
          : '<button class="mini buy" data-buy="' + it.id + '">Sotib olish · ' + it.price + ' 🪙</button>') +
        '</div>';
    });
    html += '</div><div class="muted" id="m-msg" style="text-align:center;min-height:22px"></div>';
    $('market-list').innerHTML = html;

    Array.prototype.forEach.call($('market-list').querySelectorAll('[data-buy]'), function (b) {
      b.onclick = function () {
        b.disabled = true;
        window.AygEco.buy(b.getAttribute('data-buy')).then(function (r) {
          $('m-msg').textContent = (r === 'owned') ? 'Allaqachon sizniki' : '✅ Sotib olindi!';
          renderMarket();
        }).catch(function (e) {
          $('m-msg').textContent = (e && e.message === 'coins') ? '❌ Coin yetmaydi — o‘ynab toping!' : 'Xatolik, qayta urining';
          b.disabled = false;
        });
      };
    });
    Array.prototype.forEach.call($('market-list').querySelectorAll('[data-apply]'), function (b) {
      b.onclick = function () {
        window.AygEco.applyTheme(b.getAttribute('data-apply')).then(renderMarket).catch(function () {});
      };
    });
  }

  /* ---------------- reyting ---------------- */
  function renderTop() {
    var box = $('top-list');
    box.innerHTML = '<div class="muted" style="text-align:center">Yuklanmoqda…</div>';
    window.AygEco.leaderboard().then(function (rows) {
      if (!rows.length) { box.innerHTML = '<div class="muted" style="text-align:center">Hali hech kim yo‘q — birinchi bo‘ling!</div>'; return; }
      var me = window.AygAuth && window.AygAuth._uid;
      box.innerHTML = rows.map(function (r, i) {
        var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
        return '<div class="card top-row' + (r.id === me ? ' me' : '') + '">' +
          '<span class="rank">' + medal + '</span>' +
          '<span class="nm">' + esc(r.name) + (r.vip ? ' 👑' : '') + '</span>' +
          '<span class="sp"></span>' +
          '<span class="cn">🪙 ' + r.coins + '</span>' +
          '<span class="wn">🏆 ' + r.wins + '</span></div>';
      }).join('');
    }).catch(function () {
      box.innerHTML = '<div class="muted" style="text-align:center">Yuklanmadi — internetni tekshiring</div>';
    });
  }

  /* ---------------- auth formasi ---------------- */
  var mode = 'login';
  function setMode(m) {
    mode = m;
    $('tab-login').classList.toggle('active', m === 'login');
    $('tab-register').classList.toggle('active', m === 'register');
    $('name-row').style.display = (m === 'register') ? 'block' : 'none';
    $('auth-go').textContent = (m === 'register') ? 'Ro‘yxatdan o‘tish (+100 🪙)' : 'Kirish';
    $('auth-err').textContent = '';
  }

  function authError(e) {
    var c = (e && e.code) || '';
    if (c.indexOf('email-already-in-use') >= 0) return 'Bu email band — kiring yoki boshqa email ishlating';
    if (c.indexOf('wrong-password') >= 0 || c.indexOf('invalid-credential') >= 0) return 'Email yoki parol xato';
    if (c.indexOf('weak-password') >= 0) return 'Parol kamida 6 ta belgidan iborat bo‘lsin';
    if (c.indexOf('invalid-email') >= 0) return 'Email noto‘g‘ri kiritilgan';
    if (c.indexOf('popup-closed') >= 0) return 'Google oynasi yopildi';
    if (c.indexOf('operation-not-allowed') >= 0) return 'Bu kirish usuli Firebase’da yoqilmagan (yo‘riqnomaga qarang)';
    return 'Xatolik: ' + (e && e.message ? e.message : 'qayta urining');
  }

  function bindAuth() {
    $('tab-login').onclick = function () { setMode('login'); };
    $('tab-register').onclick = function () { setMode('register'); };
    $('auth-go').onclick = function () {
      var email = $('auth-email').value.trim();
      var pass = $('auth-pass').value;
      var name = $('auth-name').value.trim();
      $('auth-err').textContent = '';
      if (!email || !pass) { $('auth-err').textContent = 'Email va parolni kiriting'; return; }
      $('auth-go').disabled = true;
      var pr = (mode === 'register')
        ? window.AygAuth.register(name || email.split('@')[0], email, pass)
        : window.AygAuth.login(email, pass);
      pr.catch(function (e) {
        $('auth-err').textContent = authError(e);
        $('auth-go').disabled = false;
      });
    };
    $('auth-google').onclick = function () {
      $('auth-err').textContent = '';
      window.AygAuth.loginGoogle().catch(function (e) { $('auth-err').textContent = authError(e); });
    };
  }

  /* ---------------- boot ---------------- */
  function boot() {
    if (!window.FIREBASE_READY) { show('setup-error'); return; }

    firebase.initializeApp(window.FIREBASE_CONFIG);
    var auth = firebase.auth();
    var db = firebase.firestore();
    window.AygAuth.init(auth, db);
    bindAuth();
    setMode('login');

    Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'), function (b) {
      b.onclick = function () { switchTab(b.getAttribute('data-tab')); };
    });
    $('logout-btn').onclick = function () { window.AygAuth.logout(); };
    $('daily-btn').onclick = function () {
      window.AygEco.daily().then(function (n) { renderProfile(); });
    };
    $('save-name').onclick = function () {
      var v = $('new-name').value;
      window.AygEco.rename(v).then(function () {
        $('new-name').value = '';
        renderProfile();
      }).catch(function () {});
    };

    window.AygAuth.onAuth(function (user) {
      $('auth-go').disabled = false;
      if (!user) {
        window.AygAuth._uid = null;
        show('auth-view');
        return;
      }
      window.AygAuth._uid = user.uid;
      window.AygEco.init(db, user.uid);
      window.AygEco.onProfile(function (p) {
        renderTopbar(p);
        if ($('tab-profile').style.display !== 'none') renderProfile();
        if ($('tab-market').style.display !== 'none') renderMarket();
      });
      show('hub');
      switchTab('game');
      ensureGame().catch(function () {
        document.getElementById('boot').textContent = 'O‘yin yuklanmadi — sahifani yangilang';
      });
    });

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
