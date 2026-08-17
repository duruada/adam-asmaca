# Liderlik tablosu sunucusu

`https://ada.152.53.224.34.sslip.io`

Sınıf/arkadaş grubu liderlik tablosu. Tek dosya Node sunucusu, hiç npm
bağımlılığı yok — Node'un gömülü `http` ve `node:sqlite` modülleri yeterli.

## Gizlilik tasarımı

Çocuk verisi olduğu için en az veri ilkesiyle kuruldu:

- **Hesap yok.** E-posta, şifre, telefon, gerçek isim, cihaz kimliği hiç
  toplanmıyor.
- Sınıf bir **oda kodu** paylaşıyor (`BBUARG` gibi), her çocuk bir takma ad
  seçiyor. Sunucuda duran tek şey takma ad ve skor.
- **Saklama süresi 180 gün** (`RETENTION_DAYS`). Süresi geçen kayıtlar
  açılışta ve günde bir otomatik siliniyor.
- Oda kodu alfabesinde karıştırılabilecek harf yok (`O/0`, `I/1`, `L` dışarıda)
  çünkü kod sesli olarak paylaşılıyor.

## API

| Yöntem | Yol | İş |
| --- | --- | --- |
| `GET` | `/health` | Sağlık kontrolü |
| `POST` | `/api/rooms` | Yeni oda açar, 6 haneli kod döner |
| `GET` | `/api/rooms/:code` | Oda var mı, kaç oyuncu |
| `POST` | `/api/rooms/:code/scores` | Skor gönderir, sırayı döner |
| `GET` | `/api/rooms/:code/leaderboard` | Oyuncu başına en iyi tur, ilk 50 |

Skor gövdesi: `{nickname, correct, mistakes, lightning, avgMs, fastestMs}`

### Sıralama

1. **şimşek** (3 saniye altı doğru cevap) — azalan
2. doğru sayısı — azalan
3. ortalama süre — artan

Birinci ölçüt şimşek, çünkü ölçmek istediğimiz şey otomatiklik. 20 doğru
yapan ama yavaş olan oyuncu, 17 doğru yapıp hızlı olanın altında kalır.

### Kötüye kullanıma karşı

Kimlik doğrulaması yok, o yüzden:

- **Aralık doğrulaması**: `correct+mistakes ≤ 20`, `lightning ≤ correct`,
  süreler 250 ms – 120 sn arası, `fastestMs ≤ avgMs`. Uydurma skorlar eleniyor.
- **Hız sınırı**: IP başına dakikada 20 yazma, 60 okuma (jeton kovası).
- Takma ad temizliği: harf/rakam/boşluk/tire dışındaki her şey atılıyor,
  en fazla 16 karakter.
- Gövde en fazla 4 KB.

## Dağıtım

Sunucu: `152.53.224.34` (Debian 12, ARM64). SSH anahtarı
`~/.ssh/id_ada_de`.

```
/opt/ada-liderlik/          docker-compose.yml, Dockerfile, server.js
liderlik_data (hacim)       SQLite veritabanı
```

Servis **hiçbir port yayınlamıyor**. 80/443 OrbitEye'ın Caddy'sinde olduğu
için, o Caddy'nin gördüğü `orbitcloud_internal` ağına `ada-api` takma adıyla
katılıyor ve dışarıya yalnızca oradan açılıyor.

### Güncelleme

```bash
scp server.js root@152.53.224.34:/opt/ada-liderlik/
ssh root@152.53.224.34 'cd /opt/ada-liderlik && docker compose up -d --build'
```

### Kayıtlar

```bash
ssh root@152.53.224.34 'docker logs --tail 50 ada-liderlik-api'
```

## ⚠ OrbitEye bağımlılığı

Dışarıya açılış, OrbitEye'ın Caddy yapılandırmasına eklenen bir bloğa bağlı:

```
/opt/orbitcloud/deploy/Caddyfile   <- sonuna caddy-site.conf eklendi
```

`/opt/orbitcloud` bir git çalışma kopyası. **Bu değişiklik OrbitEye deposuna
commit'lenmezse, sıradaki dağıtımda kaybolur ve liderlik tablosu sessizce
kapanır.** Blok [caddy-site.conf](caddy-site.conf) dosyasında duruyor.

Yedekler `Caddyfile.yedek-<tarih>` olarak aynı klasörde.

Yeniden uygulamak gerekirse:

```bash
cat /opt/ada-liderlik/caddy-site.conf >> /opt/orbitcloud/deploy/Caddyfile
docker exec orbitcloud-proxy-1 caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile
docker exec orbitcloud-proxy-1 caddy reload   --adapter caddyfile --config /etc/caddy/Caddyfile
```

`caddy reload` kesintisiz: yapılandırma geçersizse Caddy reddedip eskisiyle
çalışmaya devam eder, container yeniden başlamaz.
