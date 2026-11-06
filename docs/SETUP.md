# Yerel kurulum

## Gereksinimler

- Node.js 24 (`.nvmrc`). nvm kullanıyorsan repo içinde `nvm install` ve `nvm use`.
- Git ve npm. Bağımlılık sürümlerini `package-lock.json` belirler; temiz kurulumda `npm ci` kullan.
- D1 ve R2 yerelde Wrangler tarafından taklit edilir. Canlı hesaba, hosting manifestine veya API anahtarına ihtiyaç yoktur. Bağlantı adları `vite.config.ts` içinde tanımlıdır.

## İlk çalıştırma

1. README'deki clone ve `npm ci` adımlarını tamamla.
2. `.env.example` dosyasını `.dev.vars` adıyla kopyala. `BMK_ADMIN_EMAIL=seedy@sites.test` yaz. E-posta servisi alanlarını boş bırak.
3. `npm run build` çalıştır. Bu adım `dist/server/wrangler.json` yapılandırmasını oluşturur.
4. `npm run db:migrate:local` çalıştır. Komut yalnızca `outputs/team-state/` yerel veritabanına migration uygular; uygulanmış dosyaları tekrar çalıştırmaz.
5. `npm run dev:team` ile http://127.0.0.1:5174 adresini aç.
6. http://127.0.0.1:5174/signin-with-chatgpt?return_to=/admin/giris adresinden yerel sahip kimliğini doğrula.
7. İlk yönetici ekranında kendi yerel test e-posta adresini ve güçlü şifreni belirle. Hazır ortak şifre yoktur.
8. Panelden bir etkinlik ve ekip profili ekle; yayımla. Ana sayfa gerçek yayımlanmış içerikleri kullanır.

`seedy@sites.test`, platformdaki yerel geliştirme kimliğidir. Panelde belirlediğin BMK yönetici hesabı ayrı bir hesaptır. Üretimde bu taklit kimlik kullanılmaz.

## Güncelleme

```sh
git pull --ff-only
npm ci
npm run build
npm run db:migrate:local
npm run dev:team
```

Schema değişince önce `db/schema.ts`, ardından `npm run db:generate` ile yeni migration hazırlanır. Üretilen SQL'i incele; uygulanmış migration dosyalarını düzenleme.

## Yerel veri dizinleri

| Komut / dizin                   | Amaç                                                      |
| ------------------------------- | --------------------------------------------------------- |
| `dev:team` + `db:migrate:local` | Ekip geliştirmesi; `outputs/team-state/`, port 5174       |
| `npm run dev`, `npm start`      | Eski yerel akış; `.wrangler/state/`, varsayılan port 5173 |
| `outputs/stress-state-v21/`     | Ayrı sentetik yük testi ortamı                            |

Bu dizinler birbirinin yerine kullanılmaz. Migration komutu mevcut telefon testi verisini değiştirmez. Sunucu çalışırken SQLite dosyalarını kopyalama veya düzenleme.

## Sık karşılaşılan sorunlar

- **`no such table`:** doğru veri dizinine migration uygulandığını kontrol et. `dev:team` ile `db:migrate:local` birlikte kullanılmalı.
- **Port 5174 dolu:** önce kendi eski `dev:team` sürecini durdur. Başkasının çalışan test sunucusunu kapatma.
- **İlk sahip kurulumu görünmüyor:** `.dev.vars` adresini ve yerel kimlik doğrulama adımını kontrol et; ortam değiştiyse geliştirme sunucusunu yeniden başlat.
- **Şifre yenileme e-postası gelmiyor:** yerelde gönderim servisi varsayılan olarak kapalıdır. Bu, çalışırmış gibi gösterilmez; API yapılandırma yokken `email_unavailable` döndürür.
- **Telefonda kamera açılmıyor:** ağ üzerinden düz HTTP'de canlı kamera kullanımı tarayıcı tarafından kısıtlanabilir. Fotoğraftan QR okuma alternatifi vardır. Canlı kamera için telefonda güvenilen yerel HTTPS gerekir; yalnızca URL'yi `https` yapmak yeterli değildir.

Yerel geliştirme sunucusu loopback'te kalır. Telefon testine ihtiyaç varsa [`local-phone-proxy.mjs`](../scripts/local-phone-proxy.mjs) ayrı olarak incelenmeli ve yalnızca yerel ağ için yapılandırılmalıdır. Bu kurulum bir internet tüneli açmaz.
