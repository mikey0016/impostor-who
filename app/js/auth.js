/* ============================================================
   Ayg'oqchi — autentifikatsiya (Firebase Auth)
   Email/parol + Google. Ro'yxatda +100 coin bonus.
   ============================================================ */
(function () {
  'use strict';

  var auth = null;
  var db = null;
  var listeners = [];

  function userDoc(uid) {
    return db.collection('users').doc(uid);
  }

  function freshProfile(name) {
    var now = new Date().toISOString();
    return {
      name: String(name || 'O‘yinchi').slice(0, 20),
      coins: 100,
      games: 0,
      wins: 0,
      spyWins: 0,
      lastDaily: '',
      inv: { theme: 'default', vip: false, boost: false },
      createdAt: now,
      updatedAt: now
    };
  }

  function ensureProfile(user, name) {
    var ref = userDoc(user.uid);
    return ref.get().then(function (snap) {
      if (snap.exists) return;
      return ref.set(freshProfile(name || user.displayName || user.email.split('@')[0]));
    });
  }

  window.AygAuth = {
    init: function (a, d) {
      auth = a;
      db = d;
      auth.onAuthStateChanged(function (u) {
        if (u) {
          ensureProfile(u).catch(function () {}).then(function () {
            listeners.forEach(function (cb) { try { cb(u); } catch (e) {} });
          });
        } else {
          listeners.forEach(function (cb) { try { cb(null); } catch (e) {} });
        }
      });
    },
    onAuth: function (cb) { listeners.push(cb); },
    login: function (email, pass) {
      return auth.signInWithEmailAndPassword(email, pass);
    },
    register: function (name, email, pass) {
      return auth.createUserWithEmailAndPassword(email, pass).then(function (cred) {
        return ensureProfile(cred.user, name).then(function () {
          if (name) return cred.user.updateProfile({ displayName: name });
        });
      });
    },
    loginGoogle: function () {
      var p = new firebase.auth.GoogleAuthProvider();
      return auth.signInWithPopup(p).then(function (cred) {
        return ensureProfile(cred.user);
      });
    },
    logout: function () { return auth.signOut(); },
    db: function () { return db; }
  };
})();
