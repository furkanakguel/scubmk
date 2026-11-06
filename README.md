# SCÜ BMK

Sivas Cumhuriyet Üniversitesi Bilgisayar Mühendisliği Kulübü'nün web sitesi, etkinlik ve üyelik sistemi.

[Kurulum](docs/SETUP.md) · [Mimari](docs/ARCHITECTURE.md) · [Testler](docs/TESTING.md) · [Chatbot geliştirme](docs/CHATBOT.md) · [Katkı rehberi](CONTRIBUTING.md)

## Projede neler var?

- **Kulüp sitesi:** etkinlikler, ekip profilleri ve panelden düzenlenen ana sayfa.
- **Üyelik:** giriş, dijital kartlar ve hesap/kart yönetimi.
- **Etkinlik katılımı:** hesapsız başvuru, BMK dinazorlu QR bilet, indirme/paylaşma ve tek kullanımlık giriş kontrolü.
- **Yönetim:** içerik, afiş/fotoğraf, üye, yetki, başvuru, site ayarları ve canlı içerik önizlemesi.
- **BMK masaüstü:** taşınabilir pencereler, terminal, kişiselleştirme ve kod soruları.
- **BMK Run:** mobil/masaüstü oyun motoru, ses sistemi ve sunucuda doğrulanan skorlar.
- **Chatbot çalışma alanı:** Enes ve Taylan için ayrılmış sözleşmeler ve yalnızca yayımlanmış içeriği hazırlayan sunucu katmanı. Chatbot henüz kullanıma açık değil.

## Hızlı başlangıç

Node.js **24** ve npm gerekir. Docker veya Cloudflare hesabı yerel geliştirme için gerekli değildir.

```sh
git clone https://github.com/furkanakguel/scubmk.git
cd scubmk
npm ci
cp .env.example .dev.vars
```

`.dev.vars` içindeki `BMK_ADMIN_EMAIL` değerini yerel geliştirme için `seedy@sites.test` yap. Bu, yalnızca yerel kimlik taklidinin adresidir; bir giriş şifresi değildir. E-posta gönderim alanları boş kalabilir.

```sh
npm run build
npm run db:migrate:local
npm run dev:team
```

Site: **http://127.0.0.1:5174**. Yönetici kurulumunu [kurulum rehberindeki](docs/SETUP.md) adımlarla yap. Her geliştiricinin verisi kendi bilgisayarındaki, Git'e alınmayan `outputs/team-state/` dizinindedir.

## Kod haritası

| Konum               | İçerik                                                           |
| ------------------- | ---------------------------------------------------------------- |
| `app/`              | Sayfalar, API route'ları ve mevcut alan modülleri                |
| `app/admin/`        | Yönetim paneli, ana sayfa editörü, hesaplar, QR okuyucu          |
| `app/game/`         | Oyun fiziği, çizim, ses, tema ve ekran ölçüleri                  |
| `app/lab/`          | Masaüstü, terminal ve etkileşim mantığı                          |
| `app/home/`         | Ana sayfa modeli ve editör veri akışı                            |
| `app/bilet/`        | Bilet sayfası, QR üretimi ve bilet görseli                       |
| `features/chatbot/` | Chatbot ekibinin bağımsız geliştirme alanı                       |
| `server/`           | Ortak veritabanı, HTTP, kriptografi ve istek sınırı yardımcıları |
| `db/`, `drizzle/`   | Veri şeması ve sıralı SQL migration'ları                         |
| `scripts/`          | Geliştirme araçları ve tekrarlanabilir testler                   |
| `public/`           | Sitede kullanılan herkese açık görsel/font/imleç dosyaları       |
| `docs/`             | Kurulum, mimari, test ve operasyon rehberleri                    |

## Ekip

| Sorumluluk                | Geliştiriciler                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Genel geliştirme ve bakım | [Bekir Yıldız](https://github.com/VoskaDev), [Bekir Çömez](https://github.com/IVeridisQuo) |
| Chatbot                   | [Enes](https://github.com/enesayd07), [Taylan](https://github.com/taylandenizdev)          |
| Repo sahibi / canlı ortam | [Furkan](https://github.com/furkanakguel)                                                  |

Görev dalları ve PR üzerinden çalışıyoruz. İnceleme sorumlulukları `.github/CODEOWNERS` içindedir. Repo erişimi canlı yönetim paneli hesabı vermez.

## Kontroller

```sh
npm run format:check
npm run typecheck
npm run test:unit
npm run check:public
npm run build
```

GitHub Actions bu kontrolleri push ve PR'larda çalıştırır. `test:unit`, çalışan sunucu gerektirmeyen 14 test paketini kapsar. Gerçek HTTP entegrasyonları ve kontrollü yerel yük testi için [test rehberini](docs/TESTING.md) oku.

## Teknoloji ve yayın

React + TypeScript, App Router düzeni, Vinext/Vite, Cloudflare Worker, D1/SQLite ve R2. Yerel `DB` ve `BUCKET` bağlantıları `vite.config.ts` içinde tanımlıdır; derleme için hosting hesabı veya proje manifesti gerekmez. `npm run dev:team` siteyi localhost üzerinde çalıştırır. GitHub'a kod göndermek canlı siteyi otomatik yayımlamaz; üretim kaynakları ve erişim izinleri ayrıca yapılandırılır.

Gerçek hesaplar, anahtarlar, biletler, yüklenen fotoğraflar ve veritabanı yedekleri bu depoda bulunmaz. Otomatik e-posta için ayrıca gönderim servisi kurulmalıdır. [Operasyon rehberi](docs/OPERATIONS.md) mevcut sınırları açıklar.

Kaynak kodu public olarak paylaşılmıştır; ayrıca bir açık kaynak lisansı verilmemiştir. Kulüp kimliği ve görselleri için kullanım izni varsayılmamalıdır. Üçüncü taraf lisansları ilgili dosyalarında korunur.
