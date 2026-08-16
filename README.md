# Adam Asmaca — Çarpım Tablosu

Çocuklar için çarpım tablosu alıştırması. iPad ve Android tablette çalışan
native uygulama; Expo (React Native) ile yazıldı.

## Oyun kuralları

- Bir turda **20 soru** sorulur, hepsi **10×10'a kadar çarpma** (sonuçlar 1–100).
- Cevap ekrandaki rakam tuşlarıyla girilir.
- Doğru cevap: adam güvende kalır.
- Yanlış cevap: doğru sonuç gösterilir ve adamdan bir parça çizilir.
- **6 hata hakkı** vardır: kafa, gövde, iki kol, iki bacak. Adam tamamlanırsa
  oyun biter.
- 20 soru bitip adam asılmadıysa oyuncu kazanır.
- Bitiş ekranında yanlış yapılan çarpımlar listelenir.

## Çalıştırma

Bilgisayarda geliştirme sunucusunu başlat:

```bash
npm install     # ilk seferde
npm start
```

Terminalde bir QR kod çıkar.

- **iPad:** App Store'dan **Expo Go** kur, Kamera uygulamasıyla QR kodu okut.
- **Android tablet:** Play Store'dan **Expo Go** kur, uygulamanın içindeki
  tarayıcıyla QR kodu okut.

Tablet ile bilgisayar aynı Wi-Fi ağında olmalı. Ağ sorun çıkarırsa tünel
üzerinden bağlan:

```bash
npx expo start --tunnel
```

## Kurulabilir dosya üretme (EAS Build)

Bulutta derlenir, Mac gerekmez. Apple tarafı için Apple Developer hesabı gerekir.

```bash
npm install -g eas-cli
eas login
eas build:configure

eas build --platform android --profile preview   # doğrudan kurulabilen .apk
eas build --platform ios --profile preview       # cihaza kurulabilen .ipa
```

Mağazaya çıkacaksan `preview` yerine `production` profilini kullan ve
`app.json` içindeki `ios.bundleIdentifier` / `android.package` değerlerini
kendi alan adına göre değiştir (şu an `com.aren.adamasmaca`).

## Dosya düzeni

| Dosya | İçerik |
| --- | --- |
| [App.js](App.js) | Ekran düzeni, oyun akışı, cevap kontrolü |
| [src/gameLogic.js](src/gameLogic.js) | Soru üretimi ve ayarlar |
| [src/theme.js](src/theme.js) | Renkler ve ekran boyutuna göre ölçekleme |
| [src/components/Gallows.js](src/components/Gallows.js) | Darağacı ve adamın çizimi |
| [src/components/Keypad.js](src/components/Keypad.js) | Rakam tuş takımı |
| [src/components/TopBar.js](src/components/TopBar.js) | Sayaç, kalan hak, ilerleme çubuğu |
| [src/components/StartScreen.js](src/components/StartScreen.js) | Açılış ekranı |
| [src/components/EndScreen.js](src/components/EndScreen.js) | Sonuç ekranı |
| [web-prototype/](web-prototype/) | Tarayıcıda açılan hızlı önizleme (uygulamanın parçası değil) |

## Ayarları değiştirme

Zorluk ayarları [src/gameLogic.js](src/gameLogic.js) dosyasının başında:

```js
export const TOTAL_QUESTIONS = 20;  // turdaki soru sayısı
export const MAX_FACTOR = 10;       // en büyük çarpan
export const MAX_MISTAKES = 6;      // hata hakkı
```

`MAX_MISTAKES` değiştirilirse [src/components/Gallows.js](src/components/Gallows.js)
içindeki `BODY` dizisindeki parça sayısı da aynı olmalı — yoksa adam
tamamlanmadan oyun biter.
