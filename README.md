# Impostor Who? — yuklab olish sahifasi

Bu papka — **Impostor Who?** o'yinining APK faylini tarqatish uchun tayyor landing sayt.
Faqat 3 ta fayl: `index.html`, `og-image.png`, `download/impostor-who-v1.0.apk`.
Build qadami, npm, framework — hech narsa kerak emas. Oddiy statik sayt.

```
impostor-who-site/
├── index.html                        # butun sayt (HTML + CSS + JS, bitta faylda)
├── og-image.png                      # Telegram/WhatsApp havola ko'rinishi uchun rasm
├── README.md                         # shu fayl
├── download/
│   └── impostor-who-v1.0.apk         # tarqatiladigan ilova (1.2 MB, release)
│
└── play/                             # WEB (PWA) versiya — iOS, Android, kompyuter
    ├── index.html                    # o'yin sahifasi
    ├── game.js                       # butun o'yin mantig'i (Android ilova bilan bir xil)
    ├── style.css                     # dizayn (ilovaning o'z uslubi)
    ├── data.js                       # so'zlar bazasi — GameData.kt dan AVTOMATIK eksport
    ├── manifest.webmanifest          # PWA: bosh ekranga qo'shish
    ├── sw.js                         # service worker: offline ishlash
    ├── icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
    └── tools/export-data.py          # GameData.kt -> data.js eksport qilgich
```

> 🌐 Saytda ikkita yo'l bor: **APK** (Android, offline ilova) va **`/play/`** — brauzerda
> o'ynaladigan versiya. iPhone foydalanuvchisi uchun asosiy tugma avtomatik `/play/` ga
> o'tadi (APK iPhone'da o'rnatilmaydi).

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
| Fayl hajmi | 1.2 MB — GitHub'ning 100 MB limitidan ancha kichik, muammo yo'q |
| Domen | `impostorwho.uz` kabi domen ~$10/yil; hozircha bepul subdomen yetarli |

---

## 4. Yangi versiya chiqqanda nima o'zgartiriladi

1. Yangi APK'ni `download/` ga qo'ying: `impostor-who-v1.1.apk`
2. `index.html` da quyidagilarni yangilang (Ctrl+F bilan qidiring):
   - `impostor-who-v1.0.apk` → yuklab olish havolalari (4 joyda: nav, asosiy tugma, footer, mobil panel)
   - `1.2 MB` → yangi hajm (4 joyda)
   - `v1.0` → yangi versiya raqami (bir necha joyda)
   - `674324...` → yangi SHA-256 (pastdagi buyruq bilan olinadi)
3. Eskisini o'chirib tashlamang — eski foydalanuvchilar uchun qoldirish mumkin.
4. Saytni qaytadan deploy qiling.

SHA-256 ni hisoblash:
```bash
sha256sum download/impostor-who-v1.1.apk
```

---

## 5. Hozirgi APK haqida (release build)

| | |
|---|---|
| Versiya | 1.0 (versionCode 1) |
| Paket nomi | `com.example.impostorwho` |
| Hajm | 1 227 618 bayt (1.2 MB) |
| Imzo | APK Signature Scheme **v2** — `CN=Impostor Who` (o'z release kaliti) |
| Minimal Android | 7.0 (API 24) |
| SHA-256 | `6743244981846f8c514b03ad038362a430eccde1f837fc0bf48748628e172ff4` |

Build sozlamalari: R8 (`optimization.enable = true`) + resurs shrink yoqilgan —
shu sababli hajm debug build'dan **15 barobar kichik** (18.9 MB → 1.2 MB).

### 🔑 Kalit haqida — eng muhim narsa

Release imzolash kaliti: `ImpostorWHO/keystore/impostor-who-release.jks`
(parollar `ImpostorWHO/keystore.properties` da; ikkisi ham `.gitignore` da).

> ⛔ **Bu kalitni yo'qotsangiz, ilovani hech qachon yangilay olmaysiz** — Google Play ham,
> foydalanuvchilar ham yangi versiyani o'rnata olmaydi (imzo mos kelmaydi).
> Zaxira nusxasini xavfsiz joyga (parol menejeri yoki shifrlangan arxivga) saqlang.
>
> Sertifikat barmoq izi (SHA-256):
> `59:A0:B3:62:58:BE:E3:C8:08:C7:8C:EA:E7:14:B9:B5:37:63:EB:F0:A8:FB:9B:61:A7:F5:DD:ED:DB:FA:20:0E`
> Amal qilish muddati: 2054-02-12

> ℹ️ Agar biror kishi saytdagi **eski debug** versiyani o'rnatib olgan bo'lsa,
> yangi release versiyani o'rnatishdan oldin uni **o'chirib tashlashi** kerak
> (imzo kaliti boshqa).
