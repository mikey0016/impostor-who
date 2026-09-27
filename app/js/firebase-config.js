/* ============================================================
   Ayg'oqchi — Firebase sozlamasi
   1. FIREBASE_SETUP.md dagi 5 daqiqalik yo'riqnoma bilan
      Firebase loyihasi oching (bepul).
   2. Pastdagi 4 ta qiymatni o'z loyihangiznikiga almashtiring.
   3. Saytga push qiling — login/register ishlaydi.
   ============================================================ */
window.FIREBASE_CONFIG = {
  apiKey: "SIZNING_API_KEY_SHU_YERGA",
  authDomain: "SIZNING_LOYIHA.firebaseapp.com",
  projectId: "SIZNING_LOYIHA",
  appId: "SIZNING_APP_ID_SHU_YERGA"
};

/* Kalit qo'yilganmi — app shuni tekshiradi */
window.FIREBASE_READY = (function () {
  try {
    var c = window.FIREBASE_CONFIG || {};
    return !!(c.apiKey && c.projectId && c.appId &&
      c.apiKey.indexOf('SIZNING') !== 0);
  } catch (e) { return false; }
})();
