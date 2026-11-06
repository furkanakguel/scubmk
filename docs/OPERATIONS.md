# İşletim ve yayın

## Yetki katmanları

1. **GitHub:** kaynak kod, PR ve repo ayarları.
2. **Sites:** yayın, ortam değişkenleri ve platform erişim kapısı.
3. **BMK uygulaması:** sahip, içerik yöneticisi, giriş görevlisi ve normal üyelik hesapları.

Bu katmanlar birbirini otomatik yetkilendirmez. GitHub daveti alan kişi canlı üye verilerini veya yönetim panelini göremez. Public kaynak repo, site erişim ayarını değiştirmez.

## Yönetim paneli

Sahip tüm içerik ve yönetici hesaplarını yönetir. İçerik yöneticisi içerik/medya/başvuru işlerini yapar; giriş görevlisi yalnızca QR kontrolü ve kendi şifresiyle sınırlıdır. Yetkiler her istekte sunucuda doğrulanır.

Ekip profilleri, üyelik hesapları ve yönetici hesapları ayrı alanlardır. Üyenin kart unvanı yönetim paneli yetkisi vermez. Hesap etkinleştirme/davet bağlantıları tek kullanımlıktır; bağlantılar public issue veya PR'da paylaşılmaz.

Ana sayfa editöründe taslak/önizleme/yayın ayrımı vardır. Etkinlik yayın durumu ve başvuru durumu ayrı yönetilir. Kontenjan ve QR giriş işlemi veritabanında koşullu yazımla korunur.

## Ortam değişkenleri

| Değişken          | Amaç                                                              |
| ----------------- | ----------------------------------------------------------------- |
| `BMK_ADMIN_EMAIL` | Platform tarafından doğrulanmış ilk site sahibinin e-posta adresi |
| `RESEND_API_KEY`  | İsteğe bağlı e-posta gönderim anahtarı; yalnızca sunucu           |
| `BMK_MAIL_FROM`   | Doğrulanmış gönderici adresi                                      |

Gönderim yapılandırılmadan e-posta kodu gönderilmez. Yapılandırma göstergesi, gerçek teslimat testi değildir. Gönderici eklendiğinde yeni kod, yanlış/süresi dolmuş kod ve şifre değişimi bildirimi gerçek test posta kutusunda doğrulanmalı.

## Veri ve medya

D1 kayıtları, R2 medya dosyalarını tutar. PNG/JPEG/WebP yükleme doğrulamaları vardır; SVG yükleme kabul edilmez. Public içerik dışındaki medya yetki gerektirir. Varsayılan üst sınır 8 MB; daha düşük sınır panelden seçilebilir.

Panelin sayfalı veri dışa aktarımı **tam yedek değildir**; şifre ve erişim anahtarlarını içermez. D1/R2 yedeği, geri yükleme provası ve saklama süreleri hosting katmanında ayrıca yönetilmelidir. Test çıktıları Git'e veya canlı veriye taşınmaz.

## Yayın

Bu repo yerel geliştirme için bağımsız derlenir; `npm run build` sunucu ve istemci çıktılarını `dist/` altında üretir. Yerel depolama bağlantıları `vite.config.ts` içinde tanımlıdır. Eski Sites yayın manifesti ve metadata paketleme adımı bu kaynaktan kaldırılmıştır; bu kopya eski Sites yayın aracına doğrudan girdi değildir.

GitHub'da otomatik canlı deploy workflow'u yoktur. Mevcut barındırılmış sürüm bu değişiklikle güncellenmez. Yeni bir yayın için hedef hosting'in gerçek D1/R2 kaynakları, ortam ayarları ve kimlik katmanı ayrıca yapılandırılmalıdır. Yerel veritabanı kimliği üretim kaynağı olarak kullanılmaz. Migration'ları önce temiz yerel veritabanında ve mevcut şema yükseltmesinde doğrulayın; geçmiş migration'ları değiştirmeyin.

Başka hosting'e taşıma öncesinde D1/R2, zamanlanmış temizlik, ortam sırları ve güvenilir kimlik proxy'si yeniden kurulmalıdır. İnternetten gelen `oai-authenticated-user-*` başlıkları tek başına kimlik kanıtı değildir.

## QR ve mobil

Kapı QR anahtarı özel bilet erişim anahtarından ayrıdır. Kamera tarayıcısı desteklenen güvenli bağlamda çalışır; düz LAN HTTP'de fotoğraftan okuma ve elle kod alternatifi vardır. Aynı bilet ikinci girişte sunucu tarafından reddedilir.

Bilet kopyalama HTTP ortamları için geri dönüş yolunu, paylaşma desteklenmeyen tarayıcılar için alternatifleri içerir. Gerçek iOS/Android kamera, panoya erişim ve ses çıktısı ayrıca cihaz üzerinde doğrulanmalıdır.
