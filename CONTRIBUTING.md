# Birlikte geliştirme

Önce [kurulumu](docs/SETUP.md) tamamla, ardından [mimari haritayı](docs/ARCHITECTURE.md) oku.

## Sorumluluklar

| Alan                                                 | Sorumlu                      |
| ---------------------------------------------------- | ---------------------------- |
| Genel mimari, frontend, backend, kod inceleme        | @VoskaDev · @IVeridisQuo     |
| Chatbot arayüzü, sağlayıcı bağlantısı ve cevap akışı | @enesayd07 · @taylandenizdev |
| Repo sahibi ve canlı ortam erişimleri                | @furkanakguel                |

Chatbot'un başlangıç noktası [`features/chatbot`](features/chatbot/README.md). GitHub erişimi, sitenin yönetici hesabı veya canlı veritabanına erişim sağlamaz. Canlı erişimler ayrı yönetilir. `CODEOWNERS` inceleme sorumluluğudur; klasör bazlı yazma yasağı değildir.

## Çalışma akışı

1. `main` dalını güncelle ve görev dalı aç: `feat/chatbot-widget`, `fix/ticket-share` gibi.
2. Bir PR'da tek bir davranış değişikliğine odaklan. Sadece dosya taşıma/biçimlendirme ile işlev değişikliğini ayrı tut.
3. `npm run format`, `npm run typecheck`, `npm run test:unit` ve `npm run build` çalıştır.
4. PR açıklamasında değişikliği, testleri ve varsa migration/yayın adımını yaz. İlgili sorumludan inceleme iste.
5. Kontroller ve inceleme tamamlanınca squash merge kullan. GitHub'a merge etmek canlı Sites ortamını otomatik güncellemez.

Yeni backend yardımcıları `server/` altında; alanın iş kuralları ilgili modülde olmalı. Route dosyaları HTTP doğrulaması, yetki kontrolü ve ilgili işlemi çağırma işini üstlenir. Ortak bileşen klasörü yeni bir alanın bütün mantığını koyacağımız yer değildir.

## Değiştirmeden önce

- `drizzle/` altındaki uygulanmış migration'ı değiştirme; yenisini ekle.
- Hesap, davet, QR veya bilet anahtarlarını loglama. Gerçek veriyle test yapma.
- Sunucudan gelen yetki kontrolünü yalnızca arayüzdeki görünürlük kontrolüyle değiştirme.
- Yeni CSS'i alanına özel sınıf altında tut. Global stilleri küçük ve açık gerekçeyle değiştir.
- Test beklenen davranışı doğrulasın; sadece aynı kodu yeniden yazmasın.
- Büyük bileşeni bölerken mevcut importları ve testleri koruyan küçük PR'lar yap.

Kaynak kodunun public olması bir açık kaynak lisansı seçildiği anlamına gelmez. Lisans ve üçüncü taraf marka/görsel izinleri repo sahibinin kararıdır; mevcut `vendor/` lisanslarını koru.
