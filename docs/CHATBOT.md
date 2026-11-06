# Chatbot geliştirme — Enes ve Taylan

## Başlangıç noktası

`features/chatbot/` bağımsız çalışma alanıdır. Henüz modele istek gönderen servis, açık chatbot API route'u veya canlı widget yoktur. Hazır olanlar:

- `contracts.ts`: sınırlı mesaj geçmişi, cevap ve kaynak veri biçimleri.
- `public-context.ts`: sadece izin verilen public alanları seçen saf dönüştürücü.
- `server/context.ts`: yayımlanmış, arşivlenmemiş etkinlik/ekip içeriğini okur.
- `ui/`: arayüz bileşenleri için ayrılmış yer.
- `scripts/verify-chatbot.mjs`: sözleşme ve veri sızıntısı regresyon kontrolleri.

## Önerilen iş bölümü

Enes ve Taylan, biri `ui/` ve erişilebilir konuşma akışını, diğeri `server/` ve sağlayıcı bağlantısını üstlenebilir. API sözleşmesini birlikte sabitleyin. Genel mimari/yayın değişikliklerini Bekirlerle PR üzerinden inceleyin.

## İlk tamamlanacak dikey akış

1. Public kulüp/etkinlik sorusunu `ChatbotRequest` olarak al.
2. Yeni `app/api/chatbot/route.ts` içinde gövde boyutu, şema, aynı kaynak ve istek sınırını uygula.
3. Sunucu sağlayıcısını `features/chatbot/server/provider.ts` gibi bir modülde çağır. Sağlayıcı anahtarını yalnızca ortamdan oku.
4. `getPublicChatbotContext()` çıktısını sınırlı bilgi bağlamı olarak kullan. Talimatlar ve bilgi verisini birbirine karıştırma.
5. Timeout, iptal, maliyet/uzunluk sınırı, servis kapalı ve yeniden deneme durumlarını uygula.
6. Yanıtı `ChatbotReply` olarak dön; kaynakları yalnızca gerçekten kullanılan, public site sayfalarına bağla.
7. Widget'ı küçük bir istemci giriş bileşeniyle bağla. Ana sayfanın ilk yüklemesine ağır bağımlılık ekleme.

Örnek istek:

```json
{ "messages": [{ "role": "user", "content": "Yaklaşan atölyeleri nereden görebilirim?" }] }
```

Örnek yanıt biçimi (uygulanmış servis değildir):

```json
{
  "answer": "Etkinlikler sayfasından güncel programı inceleyebilirsin.",
  "sources": [{ "title": "Etkinlikler", "href": "/etkinlikler" }]
}
```

## Sınırlar

- İstemci `system`, `tool`, model adı, API anahtarı veya sağlayıcı adresi belirleyemez.
- Geçmiş en fazla 12 mesaj; her mesaj en fazla 2.000 karakter. Son mesaj kullanıcıya ait olmalı.
- Sunucu bağlamı kulüp açıklaması, en fazla 30 yayımlanmış etkinlik ve 50 yayımlanmış ekip profilinden oluşur. Dönüştürücü açık alan listesi kullanır.
- Üye hesapları, özel e-postalar, başvurular, QR/bilet anahtarları, işlem geçmişi ve yönetici işlemleri modele aktarılmaz.
- Ham SQL, terminal komutu, dosya sistemi veya genel amaçlı URL çağırma aracı verilmez.
- HTML'i doğrudan render etme; Markdown kullanılırsa güvenli sınırlı renderer ve bağlantı doğrulaması gerekir.
- Yanıt yetki veremez, kayıt oluşturamaz veya kontenjan garantisi sunamaz. İşlem yapılacaksa uygulamanın kendi doğrulanmış akışına yönlendirir.
- Kullanıcı mesajlarını kalıcı saklama/analytics'e gönderme ayrı ürün kararıdır; varsayılan olarak ekleme.

`npm run test:chatbot` mevcut altyapıyı doğrular. Sağlayıcı bağlandığında timeout, hata, iptal, eşzamanlı istek, yanıltıcı içerik, özel veri sızıntısı ve mobil/klavye erişimi testlerini ekleyin. Bu dosya henüz bir sağlayıcı seçmez ve gerçek API anahtarı içermez.
