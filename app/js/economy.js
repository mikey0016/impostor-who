/* ============================================================
   Ayg'oqchi — coin, market, reyting, o'yin hooklari (Firestore)
   Mukofotlar: ro'yxat +100, o'yin +10, ayg'oqchi yutsa +15,
   jamoa yutsa +5, kunlik bonus +50. Boost (2x) marketdan.
   ============================================================ */
(function () {
  'use strict';

  var db = null;
  var uid = null;
  var profile = null;
  var profileCbs = [];
  var currentRound = -1;
  var votedRounds = {};
  var todayStr = function () { return new Date().toISOString().slice(0, 10); };

  /* ---------------- market katalogi ---------------- */
  var THEMES = {
    default: { name: 'Standart', price: 0, pal: null, css: '' },
    olov:    { name: 'Olov 🔥', price: 200, pal: ['#FF9A8B', '#FF6A88', '#FF99AC', '#FFD9A8', '#FF4D4D'], css: 'olov' },
    okean:   { name: 'Okean 🌊', price: 200, pal: ['#A8E8F0', '#7FC8F8', '#5AA9E6', '#B8F0FF', '#2E86C1'], css: 'okean' },
    oltin:   { name: 'Oltin 👑', price: 500, pal: ['#FFE89A', '#FFD75E', '#F5C542', '#FFF3C4', '#C9A227'], css: 'oltin' },
    neon:    { name: 'Neon ⚡', price: 800, pal: ['#C6F432', '#7CFC00', '#39FF14', '#CCFF00', '#ADFF2F'], css: 'neon' }
  };
  var ITEMS = [
    { id: 'vip', kind: 'vip', name: 'VIP toj 👑', desc: 'Ismingiz yonida toj — reytingda ajralib turing', price: 1000 },
    { id: 'boost', kind: 'boost', name: 'Omadli tanga 🍀', desc: 'Barcha mukofotlar 2x (doimiy)', price: 1500 }
  ];

  function mult() { return (profile && profile.inv && profile.inv.boost) ? 2 : 1; }

  function emit() {
    profileCbs.forEach(function (cb) { try { cb(profile); } catch (e) {} });
    applyTheme();
  }

  function applyTheme() {
    try {
      var t = (profile && profile.inv && profile.inv.theme) || 'default';
      document.body.setAttribute('data-gtheme', THEMES[t] ? t : 'default');
    } catch (e) {}
  }

  function savePatch(patch) {
    patch.updatedAt = new Date().toISOString();
    return db.collection('users').doc(uid).update(patch);
  }

  /* ---------------- o'yin hooklari (game.js chaqiradi) ---------------- */
  window.AygApp = {
    /* REVEAL ekrani ochilganda: o'yin sanaladi +10 */
    onReveal: function (roundSeq, playerCount) {
      if (!uid || !profile) return;
      currentRound = roundSeq;
      var gain = 10 * mult();
      savePatch({
        coins: profile.coins + gain,
        games: (profile.games || 0) + 1
      }).catch(function () {});
    },
    /* Oxirgi ekranda "kim yutdi" ovozi: bir turda 1 marta */
    onVote: function (kind, roundSeq) {
      if (!uid || !profile) return 0;
      if (votedRounds[roundSeq]) return 0;
      votedRounds[roundSeq] = true;
      var gain, patch = {};
      if (kind === 'spy') {
        gain = 15 * mult();
        patch.spyWins = (profile.spyWins || 0) + 1;
        patch.wins = (profile.wins || 0) + 1;
      } else {
        gain = 5 * mult();
        patch.wins = (profile.wins || 0) + 1;
      }
      patch.coins = profile.coins + gain;
      savePatch(patch).catch(function () { delete votedRounds[roundSeq]; });
      return gain;
    },
    /* Market mavzusidagi avatar ranglari (game.js so'raydi) */
    avatarPalette: function () {
      var t = (profile && profile.inv && profile.inv.theme) || 'default';
      return (THEMES[t] && THEMES[t].pal) || null;
    }
  };

  window.AygEco = {
    THEMES: THEMES,
    ITEMS: ITEMS,
    init: function (d, id) {
      db = d;
      uid = id;
      db.collection('users').doc(uid).onSnapshot(function (snap) {
        if (snap.exists) { profile = snap.data(); emit(); }
      });
    },
    onProfile: function (cb) {
      profileCbs.push(cb);
      if (profile) { try { cb(profile); } catch (e) {} }
    },
    me: function () { return profile; },
    mult: mult,
    /* Kunlik bonus: kuniga 1 marta +50 */
    daily: function () {
      if (!profile || profile.lastDaily === todayStr()) return Promise.resolve(0);
      var gain = 50;
      return savePatch({ coins: profile.coins + gain, lastDaily: todayStr() }).then(function () { return gain; });
    },
    canDaily: function () { return !!profile && profile.lastDaily !== todayStr(); },
    /* Ism o'zgartirish */
    rename: function (name) {
      name = String(name || '').trim().slice(0, 20);
      if (!name) return Promise.reject(new Error('empty'));
      return savePatch({ name: name });
    },
    /* Sotib olish */
    buy: function (id) {
      if (!profile) return Promise.reject(new Error('noprofile'));
      var inv = profile.inv || { theme: 'default' };
      var patch = {};
      if (THEMES[id]) {
        if (inv['own_' + id]) return Promise.resolve('owned');
        if (id !== 'default' && profile.coins < THEMES[id].price) return Promise.reject(new Error('coins'));
        patch.coins = profile.coins - THEMES[id].price;
        patch['inv.own_' + id] = true;
        patch['inv.theme'] = id;
      } else if (id === 'vip' || id === 'boost') {
        if (inv[id]) return Promise.resolve('owned');
        var item = id === 'vip' ? ITEMS[0] : ITEMS[1];
        if (profile.coins < item.price) return Promise.reject(new Error('coins'));
        patch.coins = profile.coins - item.price;
        patch['inv.' + id] = true;
      } else {
        return Promise.reject(new Error('unknown'));
      }
      return savePatch(patch).then(function () { return 'ok'; });
    },
    applyTheme: function (id) {
      if (!THEMES[id]) return Promise.reject(new Error('unknown'));
      var inv = profile ? (profile.inv || {}) : {};
      if (id !== 'default' && !inv['own_' + id]) return Promise.reject(new Error('locked'));
      return savePatch({ 'inv.theme': id });
    },
    /* Top-20 reyting */
    leaderboard: function () {
      return db.collection('users').orderBy('coins', 'desc').limit(20).get().then(function (qs) {
        var out = [];
        qs.forEach(function (d) {
          var p = d.data();
          out.push({ id: d.id, name: p.name || 'O‘yinchi', coins: p.coins || 0, wins: p.wins || 0, vip: !!(p.inv && p.inv.vip) });
        });
        return out;
      });
    }
  };
})();
