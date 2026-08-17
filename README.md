# Ada'nın Adam Asmaca Oyunu

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

## Kurulum dosyası üretme

### Android — otomatik, hesap gerekmez

Bir sürüm etiketi atmak yeterli; [GitHub Actions](.github/workflows/release.yml)
`.apk` üretip Release'e ekler.

```bash
git tag v1.0.0
git push origin v1.0.0
```

Etiket atmadan denemek için: Actions sekmesi → **Release** → *Run workflow*.

Akış EAS kullanmaz, dolayısıyla Expo hesabı veya secret istemez. GitHub'ın
ücretsiz runner'ında `expo prebuild` + `gradlew assembleRelease` çalışır.
Expo'nun Android şablonu release derlemesini `debug.keystore` ile imzaladığı
için çıkan APK doğrudan kurulabilir.

> Bu APK kişisel kullanım/sideload içindir. Play Store'a çıkacaksan kendi
> keystore'unu üretip `android/app/build.gradle` içindeki `release` imza
> yapılandırmasını değiştirmen gerekir.

### iOS — imzasız IPA, Mac ve Apple üyeliği gerekmez

[.github/workflows/ios-ipa.yml](.github/workflows/ios-ipa.yml) GitHub'ın
**macOS runner'ında** imzasız bir `.ipa` üretir. Ne Mac ne de ücretli Apple
Developer üyeliği gerekir: imzalama işini **SideStore / AltStore** telefonda
kendi Apple ID'nle yapar, o yüzden burada bilerek imzalamıyoruz.

Aynı etiket iki akışı da tetikler, ikisi de aynı Release'e dosya ekler:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Etiketsiz denemek için: Actions → **iOS IPA (imzasız)** → *Run workflow*.
Bu durumda dosya Release'e değil, 30 gün saklanan artifact'e düşer.

Kurulum: `.ipa`'yı SideStore veya AltStore ile iPad'e yükle. Ücretsiz Apple
ID kullanılıyorsa imza 7 günde bir yenilenmeli; SideStore bunu aynı ağdaki
cihazda otomatik yapabilir.

> Xcode sürümü kritik: Expo SDK 57'nin Swift kaynağı Xcode 26.6 ister.
> `macos-15` imajı 26.3'te kalıyor ve derleme kırılıyor, bu yüzden akış
> `macos-26` üzerinde çalışıyor. Bu kurgu
> [duruada/ters-ses](https://github.com/duruada/ters-ses) deposunda
> doğrulandı.

### Mağazaya çıkarken

`app.json` içindeki `ios.bundleIdentifier` / `android.package` değerlerini
kendi alan adına göre değiştir (şu an `com.aren.adamasmaca`). App Store için
imzalı build gerekir, o noktada Apple Developer üyeliği devreye girer.

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
| [.github/workflows/release.yml](.github/workflows/release.yml) | Etiket atınca APK üretip Release'e ekleyen akış |
| [.github/workflows/ios-ipa.yml](.github/workflows/ios-ipa.yml) | Etiket atınca imzasız IPA üretip Release'e ekleyen akış |

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
