# Mimari ve değişiklik haritası

## İstek akışı

```text
Tarayıcı
  → app/ sayfası veya app/api/ route'u
  → alan doğrulaması + sunucu yetki kontrolü
  → alan modülü (auth, content, operations, game...)
  → server/ ortak yardımcıları
  → D1 (kayıtlar) / R2 (medya)
```

Cloudflare Worker giriş noktası `worker/index.ts`. Zamanlanmış temizlik ve altyapı bağlantıları burada tutulur. React arayüzü Vite/Vinext ile derlenir; standart bir Next sunucusuna geçmek sadece çalıştırma komutunu değiştirmek değildir.

## Bir işi nerede yapmalıyım?

| İş                       | Başlangıç noktası                                                       |
| ------------------------ | ----------------------------------------------------------------------- |
| Ana sayfa görünümü       | `app/page.tsx`, `app/components/`, `app/home/`                          |
| Ana sayfa panel editörü  | `app/admin/HomeEditor.tsx`, `app/admin/preview/`, `app/api/admin/home/` |
| Etkinlik/ekip içeriği    | `app/content.ts`, `app/admin/Admin.tsx`, `app/api/admin/route.ts`       |
| Üye girişi/kartları      | `app/member-auth.ts`, `app/api/member/`, `app/membership-model.ts`      |
| Yönetici girişi/yetkiler | `app/admin-auth.ts`, `app/api/admin/auth/`                              |
| Hesap ve sistem ayarları | `app/admin/Accounts.tsx`, `Operations.tsx`, `app/operations.ts`         |
| Başvuru ve QR giriş      | `app/api/register/`, `app/api/ticket/`, `app/admin/QrScanner.tsx`       |
| Bilet tasarımı/QR        | `app/bilet/`, `app/components/copy-text.ts`                             |
| Oyun                     | `app/game/`, `app/components/BmkRunner.tsx`, `app/api/game/`            |
| Masaüstü ve terminal     | `app/lab/` ve ilgili `app/components/` bileşenleri                      |
| Chatbot                  | `features/chatbot/`; ayrıntı `docs/CHATBOT.md`                          |
| Veri modeli              | `db/schema.ts`, eklemeli `drizzle/*.sql`                                |

## Ortak sunucu katmanı

- `server/database.ts`: D1 binding erişimi.
- `server/http.ts`: JSON yanıtı, aynı kaynak doğrulaması, sınırlı gövde okuma ve hata dönüşümü.
- `server/crypto.ts`: rastgele anahtar üretimi ve özetleme.
- `server/rate-limit.ts`: kimlik/IP tabanlı istek sınırı.
- `app/server.ts`: eski importları koruyan uyumluluk katmanı. Yeni ortak yardımcıları burada büyütmek yerine `server/` altında tut.

Sunucu modülünü `use client` bileşenine import etme. İstemci-sunucu arasında yalnızca gerekli alanları taşıyan, açıkça tanımlanmış veri biçimleri kullan. Veritabanı satırını doğrudan public API'ye yayma.

## Veri ayrımı

`members` herkese açık ekip profilleri; `club_accounts` özel üyelik hesaplarıdır. Aynı şey değildir. Profil sayfası, hesap e-postasına, parola özetine, oturum veya kurtarma anahtarına erişmemelidir.

Bilet erişim anahtarı ve kapı QR anahtarı farklıdır. QR'ı bilmek özel bilet sayfasını okumaya yetmez. Kapı girişi sunucuda atomik, tek kullanımlık işlemdir. Anahtarları URL/log/analytics zincirlerinde yayma.

## Kodun mevcut sınırları

Bu depo, çalışan mevcut sitenin temiz başlangıç sürümüdür. Ortak sunucu katmanı ayrılmış, kaynak biçimlendirilmiş ve yeni chatbot bağımsız alana alınmıştır. **Bütün eski bileşenler baştan yazılmış değildir.** `Admin.tsx`, masaüstü kabuğu, oyun bağlayıcısı ve bazı CSS dosyaları hâlâ büyüktür.

Bu alanlarda yeni davranış eklerken ilgili form/pencere/iş kuralını ayrı modüle çıkar; sunucu yetkisini ve mevcut davranış testlerini koru. Aynı PR'da toplu dosya taşıma, tasarım yenileme ve iş kuralı değişikliği yapma. Yalnızca klasör taşımak mimariyi iyileştirmiş sayılmaz.

## Platform kodu

`scripts/vite/`, `scripts/connector-preview/`, `lib/connector*` ve `vendor/` platform entegrasyonunu içerir. Lisanslarını koru. `.openai/hosting.json` kaynak bağlantısıdır; sır saklama yeri değildir. `docs/archive/` eski tasarım notlarıdır, güncel kurulum talimatı değildir.
