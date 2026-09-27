# Ayg'oqchi — Firebase sozlash (5 daqiqa, bepul)

Login/register, coin, market va reyting shu orqali ishlaydi.
Barchasi **bepul tarif (Spark)** ga sig'adi.

## 1. Loyiha ochish

1. [console.firebase.google.com](https://console.firebase.google.com) → Google hisob bilan kiring
2. **Add project** → nom: `aygoqchi` → Google Analytics **o'chirilgan** holda davom eting
3. Loyiha tayyor bo'lgach, chap menyuda **Build** bo'limiga o'ting

## 2. Authentication (login) yoqish

1. **Build → Authentication → Get started**
2. **Sign-in method** → **Email/Password** → **Enable** → Save
3. (Ixtiyoriy) **Google** → Enable → Save — "Google bilan kirish" tugmasi uchun

## 3. Firestore (baza) yoqish

1. **Build → Firestore Database → Create database**
2. **Start in production mode** → Location: `europe-west` (O'zbekistonga yaqin) → Enable
3. **Rules** tab → `firestore.rules` fayl ichidagini nusxalab qo'ying → **Publish**

## 4. Kalitlarni saytga qo'yish

1. Loyiha sozlamasi (⚙️ **Project settings**) → **Your apps** → **Web** (`</>`) → nickname: `aygoqchi-site` → **Register app**
2. `firebaseConfig` dagi 4 ta qiymatni nusxalang
3. Shu repoda `app/js/firebase-config.js` ni ochib qo'ying:

```js
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "aygoqchi.firebaseapp.com",
  projectId: "aygoqchi",
  appId: "..."
};
```

4. Commit + push:

```bash
git add app/js/firebase-config.js
git commit -m "Firebase kalitlari"
git push
```

1 daqiqadan keyin `https://mikey0016.github.io/impostor-who/app/` da
ro'yxatdan o'tish ishlaydi. ✅

## 5. Tekshirish

- `app/` → **Ro'yxat** → ism/email/parol → +100 coin bonusi tushishi kerak
- O'yin o'ynang → REVEAL → +10 coin
- **Profil** → kunlik bonus +50
- **Reyting** → ismingiz ro'yxatda

## Muhim eslatmalar

- `firestore.rules` dagi **+100 chegarasi** — coin aldashdan himoya. Uni olib tashlamang.
- Foydalanuvchi email'i bazaga **saqlanmaydi** (faqat ism + statistika) — reytingni ochiq qoldirish xavfsiz.
- Google login ishlatilsa: **Authentication → Settings → Authorized domains** ga
  `mikey0016.github.io` qo'shing.
