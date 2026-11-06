# Güvenlik

Güvenlik açığına ait kullanılabilir saldırı ayrıntılarını, parolaları, bilet/QR kodlarını veya gerçek üye bilgilerini herkese açık issue/PR'a yazma. GitHub'ın **Security → Report a vulnerability** akışı etkinse oradan özel bildirim gönder; değilse repo sahibiyle özel kanaldan iletişim kur.

## Kaynak / çalışma ortamı ayrımı

- `.env*`, `.dev.vars*`, `.wrangler/`, `.sites-runtime/`, `outputs/`, özel anahtarlar ve veritabanı dosyaları Git'e girmez.
- `.env.example` yalnızca boş yapılandırma alanlarını içerir. Gerçek anahtarlar hosting ortamına eklenir.
- Public GitHub repo, canlı siteyi public yapmaz; repo yetkisi site yöneticisi yetkisi değildir.
- İlk site sahibi kurulumu Sites'ın doğruladığı kimliğe bağlıdır. Ayrı bir hosting'e taşınırken `oai-authenticated-user-*` başlıklarına internet istemcisinden güvenilmez; kimlik katmanı yeniden kurulmadan doğrudan internete açılmaz.
- Geliştirme sunucusu yalnızca loopback'te tutulur. Wrangler geliştirme/veritabanı araçları LAN'a veya internete açılmaz. Telefon testi için ayrı sınırlı proxy kullanılır.

## Test sınırı

`npm run test:unit` gerçek kullanıcıya istek göndermez; geçici SQLite ve sentetik kayıtlar kullanır. Entegrasyon/yük testleri yalnızca belgelenmiş yerel test ortamında çalışır. Bu kontroller bağımsız sızma testinin veya canlı kapasite ölçümünün yerine geçmez.

Chatbot'a üretim veritabanı aracı, yönetici API erişimi, bilet erişim anahtarı, üye listesi veya ham SQL yeteneği verilmez. Modelin verdiği metin yetkilendirme kararı sayılmaz. Ayrıntılar: [chatbot sınırları](docs/CHATBOT.md).
