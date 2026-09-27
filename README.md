# Ayg'oqchi — yuklab olish sahifasi

**Ayg'oqchi** o'yinining tarqatish sayti: Android uchun **APK** va iOS uchun **IPA**.
Statik sayt — build qadami, npm, framework kerak emas.

```
impostor-who/
├── index.html                            # butun sayt (HTML + CSS + JS, bitta faylda)
├── og-image.png                          # Telegram/WhatsApp havola ko'rinishi uchun rasm
├── README.md                             # shu fayl
└── download/
    ├── aygoqchi-v1.0.apk                 # Android (18.9 MB, DEBUG imzo)
    └── aygoqchi-v1.0-ios.ipa             # iOS (11.6 MB, IMZOSIZ — Sideloadly bilan o'rnatiladi)
```

---

## 1. Saytda nima bor

| Bo'lim | Nima |
|---|---|
| Hero | Ikkita tugma: **Android APK** (lime) va **iOS IPA** (oq) |
| 📱 Android'ga o'rnatish | 4 qadam + Play Protect ogohlantirishi haqida tushuntirish |
| 🍎 iOS'ga o'rnatish | 4 qadam (Sideloadly) + 7 kunlik cheklov haqida ogohlantirish |
| Imkoniyatlar | 9 ta karta |
| Savol-javob | 6 ta savol |
| SHA-256 | APK tekshiruv kodi (nusxa olish tugmasi bilan) |

**iPhone aniqlash:** sahifa JS orqali iOS'ni aniqlaydi va asosiy tugmani avtomatik
iOS `.ipa` faylga o'tkazadi (iPhone'da APK o'rnatib bo'lmaydi).

---

## 2. Lokal sinov

```bash
python -m http.server 8080
# brauzerda: http://localhost:8080
```

---

## 3. Internetga joylash

Sayt allaqachon GitHub Pages'da: **https://mikey0016.github.io/impostor-who/**

Yangilash uchun:

```bash
git add -A
git commit -m "yangilanish"
git push
```

1 daqiqadan keyin o'zgarish saytda ko'rinadi.

---

## 4. Yangi versiya chiqqanda

1. **Android APK** — `ImpostorWHO` reposida (kodda nom `Ayg'oqchi`, paket `uz.aygoqchi`):
   ```bash
   cd ImpostorWHO
   ./gradlew :app:assembleRelease        # keystore.properties kerak
   # -> app/build/outputs/apk/release/app-release.apk
   ```
   Faylni `download/aygoqchi-v1.1.apk` sifatida qo'ying.

2. **iOS IPA** — GitHub Actions avtomatik yasaydi:
   ```bash
   gh run list --limit 1
   gh run download <RUN_ID> -n aygoqchi-ios-ipa
   # -> Aygoqchi-unsigned.ipa
   ```
   Faylni `download/aygoqchi-v1.1-ios.ipa` sifatida qo'ying.

3. `index.html` da yangilang:
   - `aygoqchi-v1.0.apk` / `aygoqchi-v1.0-ios.ipa` → yangi fayl nomlari
   - `18.9 MB` / `11.6 MB` → yangi hajmlar
   - `v1.0` → yangi versiya raqami
   - SHA-256 kod (pastdagi buyruq bilan olinadi)

4. SHA-256:
   ```bash
   sha256sum download/aygoqchi-v1.1.apk
   ```

---

## 5. Hozirgi fayllar

### Android APK

| | |
|---|---|
| Versiya | 1.0 (versionCode 1) |
| Paket nomi | `com.example.impostorwho` (eski build — yangi kodda `uz.aygoqchi`) |
| Hajm | 18 928 031 bayt (18.9 MB) |
| Imzo | ⚠️ **DEBUG kalit** (`CN=Android Debug`) — release kalitga o'tkazish uchun qayta yig'ish kerak |
| Minimal Android | 7.0 (API 24) |
| SHA-256 | `9de9586309b60146844b369fff433a679bb7720c6b58579ae24a82cddb9c4fb2` |

> ℹ️ Kod `Ayg'oqchi` / `uz.aygoqchi` ga o'tkazildi — saytdagi APK keyingi build'da
> yangilanadi (hozirgisi eski nomdagi build).

### iOS IPA

| | |
|---|---|
| Imzo | ⚠️ **IMZOSIZ** — Sideloadly/AltStore Apple ID bilan imzolaydi |
| Hajm | 11 584 137 bayt (11.6 MB) |
| Ichida | `Payload/ImpostorWho.app` (arm64, Release — eski nomdagi build) |
| Minimal iOS | 15.0 |
| SHA-256 | `98c066d57011e25d554903a2e6e010a049fbc812157f5b393e29da4d010f62c3` |

**Nega imzosiz?** Apple'da imzolash uchun Mac + Apple Developer akkaunti ($99/yil) kerak.
Imzosiz `.ipa` faylni foydalanuvchi o'z Apple ID'si bilan **bepul** imzolaydi
(Sideloadly orqali), lekin imzo **7 kunda** muddati tugaydi — qayta imzolash kifoya.

---

## 6. ⚠️ Eng muhim: keystore

Android release kaliti: `ImpostorWHO/keystore/impostor-who-release.jks`
(parollar `ImpostorWHO/keystore.properties` da; ikkisi ham git'ga tushmaydi).

> ⛔ **Yo'qolsa, Android ilovani hech qachon yangilab bo'lmaydi.** Zaxira nusxasini saqlang.

Sertifikat barmoq izi (SHA-256):
`59:A0:B3:62:58:BE:E3:C8:08:C7:8C:EA:E7:14:B9:B5:37:63:EB:F0:A8:FB:9B:61:A7:F5:DD:ED:DB:FA:20:0E`

---

## 7. Tarix

- **1-commit:** dastlabki sayt (faqat APK) + brauzerda o'ynash (PWA) versiyasi
- **2-commit:** release APK (R8, o'z kaliti bilan imzolangan)
- **3-commit:** iOS `.ipa` qo'shildi, brauzerda o'ynash **olib tashlandi**
- **APK qaytarildi:** 1.2 MB release o'rniga 18.9 MB debug versiya (foydalanuvchi so'rovi)
- **Nom o'zgardi:** `Impostor Who?` → **Ayg'oqchi** (mualliflik huquqi sababli);
  kodda paket `uz.aygoqchi`, fayllar `aygoqchi-v1.0.*`

> ℹ️ PWA versiyasi (brauzerda o'ynash) git tarixida saqlanadi — kerak bo'lsa qaytarish mumkin:
> `git show <commit>:play/index.html`
