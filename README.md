# Impostor Who? — yuklab olish sahifasi

Bu papka — **Impostor Who?** o'yinining APK faylini tarqatish uchun tayyor landing sayt.
Faqat 3 ta fayl: `index.html`, `og-image.png`, `download/impostor-who-v1.0.apk`.
Build qadami, npm, framework — hech narsa kerak emas. Oddiy statik sayt.

```
impostor-who-site/
├── index.html                        # butun sayt (HTML + CSS + JS, bitta faylda)
├── og-image.png                      # Telegram/WhatsApp havola ko'rinishi uchun rasm
├── README.md                         # shu fayl
└── download/
    └── impostor-who-v1.0.apk         # tarqatiladigan ilova (18.9 MB)
```

---

## 1. Lokal sinov

Papka ichida:

```bash
python -m http.server 8080
```

So'ng brauzerda `http://localhost:8080` ni oching.
(`index.html` ni to'g'ridan-to'g'ri ikki marta bosib ochish ham mumkin, lekin
`file://` rejimida QR kod ko'rinmaydi — bu normal.)

---

## 2. Internetga joylash (3 variant)

### A) Netlify Drop — eng tez, 30 sekund ⭐
1. https://app.netlify.com/drop saytiga kiring
2. **`impostor-who-site` papkasini** oynaga tashlang (drag & drop)
3. Tayyor — havola olasiz: `https://xxxx-yyyy.netlify.app`
4. Sozlamalar → *Site name* → `impostor-who` kabi chiroyli nom berish mumkin

### B) GitHub Pages — bepul va doimiy
```bash
cd impostor-who-site
git init
git add .
git commit -m "Impostor Who? landing page"
git branch -M main
git remote add origin https://github.com/<USERNAME>/impostor-who.git
git push -u origin main
```
So'ng GitHub'da: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
1-2 daqiqadan keyin: `https://<USERNAME>.github.io/impostor-who/`

> Maslahat: saytni ilova reposining `docs/` papkasiga qo'ysangiz, Pages'ni `main /docs` qilib
> sozlash mumkin — hamma narsa bitta joyda bo'ladi.

### C) Vercel / Cloudflare Pages
```bash
npx vercel deploy --prod          # Vercel
npx wrangler pages deploy .       # Cloudflare Pages
```
Ikkalasi ham bepul, HTTPS avtomatik.

---

## 3. Nimaga e'tibor berish

| Narsa | Holat |
|---|---|
| HTTPS | Netlify/Vercel/GitHub Pages avtomatik beradi — APK yuklab olish uchun shart emas, lekin QR va ishonch uchun yaxshi |
| Fayl turi (MIME) | `.apk` ko'p hostlarda `application/vnd.android.package-archive` bo'ladi; bo'lmasa ham `<a download>` atributi yuklab olishni majburan boshlaydi |
| Fayl hajmi | 18.9 MB — GitHub'ning 100 MB limitidan ancha kichik, muammo yo'q |
| Domen | `impostorwho.uz` kabi domen ~$10/yil; hozircha bepul subdomen yetarli |

---

## 4. Yangi versiya chiqqanda nima o'zgartiriladi

1. Yangi APK'ni `download/` ga qo'ying: `impostor-who-v1.1.apk`
2. `index.html` da quyidagilarni yangilang (Ctrl+F bilan qidiring):
   - `impostor-who-v1.0.apk` → yuklab olish havolalari (4 joyda: nav, asosiy tugma, footer, mobil panel)
   - `18.9 MB` → yangi hajm (5 joyda)
   - `v1.0` → yangi versiya raqami (bir necha joyda)
   - `9de958...` → yangi SHA-256 (pastdagi buyruq bilan olinadi)
3. Eskisini o'chirib tashlamang — eski foydalanuvchilar uchun qoldirish mumkin.
4. Saytni qaytadan deploy qiling.

SHA-256 ni hisoblash:
```bash
sha256sum download/impostor-who-v1.1.apk
```

---

## 5. Hozirgi APK haqida

| | |
|---|---|
| Versiya | 1.0 (versionCode 1) |
| Hajm | 18 928 031 bayt (18.9 MB) |
| Imzo | APK Signature Scheme **v2** — `CN=Android Debug` (debug kalit) |
| Minimal Android | 7.0 (API 24) |
| SHA-256 | `9de9586309b60146844b369fff433a679bb7720c6b58579ae24a82cddb9c4fb2` |

> ⚠️ **Diqqat:** bu **debug** build. U ishlaydi va o'rnatiladi, lekin:
> 1. `CN=Android Debug` kaliti bilan imzolangan — Play Store'ga qabul qilinmaydi;
> 2. R8 o'chirilgan (`optimization { enable = false }`) — hajm 3-4 barobar katta
>    (imzolangan release build ~5-7 MB bo'lardi);
> 3. `android:debuggable` bayrog'i yoqilgan.
>
> Ommaviy tarqatishdan oldin **release build** qilish tavsiya etiladi:
> `signingConfigs` + keystore qo'shib, `optimization.enable = true` qilib,
> `gradlew assembleRelease`. Buni so'rasangiz — sozlab beraman.
