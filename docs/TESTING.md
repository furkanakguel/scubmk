# Test rehberi

## Her PR için

```sh
npm run format:check
npm run typecheck
npm run test:unit
npm run check:public
npm run build
```

GitHub Actions bu sırayı temiz ortamda çalıştırır. Hiçbir canlı anahtar gerekmez. `check:public` özel/generated dosya yollarını ve bazı yüksek güvenli sır kalıplarını kontrol eder; kapsamlı bir sır taramasının veya güvenlik incelemesinin yerine geçmez.

## Sunucu gerektirmeyen testler

`test:unit` şu 14 paketi çalıştırır:

| Paket                    | Kapsam                                                                      |
| ------------------------ | --------------------------------------------------------------------------- |
| `verify-runner`          | Rastgele parkurlar, çarpışma, hız, uçuş, sunucu simülasyonu                 |
| `verify-game-audio`      | Ses yaşam döngüsü, tekrar başlatma, sessiz/açık durumu                      |
| `verify-workshop`        | Kod soruları ve hata/onarım akışı                                           |
| `verify-desktop`         | Masaüstü pencere davranışları                                               |
| `verify-os-files`        | Public masaüstü dosyaları                                                   |
| `verify-personalization` | Kişiselleştirme verileri                                                    |
| `verify-icon-placement`  | Simge konumu ve sınırlar                                                    |
| `verify-terminal-dino`   | Terminal dinazoru davranışı                                                 |
| `verify-render-policy`   | Görünürlük ve çizim politikası                                              |
| `verify-card-art`        | Kart çizimi ve varyantlar                                                   |
| `verify-security-races`  | Geçici SQLite üzerinde eşzamanlı kimlik/yetki işlemleri                     |
| `verify-recovery`        | Şifre yenileme, süre, deneme ve oturum iptali                               |
| `verify-qr`              | QR anahtarı ayrımı, geçersiz bağlantı, dinazorlu QR ve fotoğraf dönüşümleri |
| `verify-chatbot`         | Mesaj sınırları ve yalnızca public bağlam                                   |

Ses birim testleri gerçek iPhone hoparlörünün duyulduğunu kanıtlamaz. Kamera, paylaşım, indirme, ekran taşması ve ses ayrıca gerçek mobil cihazda denenmelidir.

## Yerel HTTP entegrasyonu

[Kurulum](SETUP.md) tamamlanmış ve `npm run dev:team` açık olmalı. Test için kullandığın yerel yönetici bilgilerini yalnızca işlem ortamına ver. Bash/zsh'de şifreyi komut geçmişine yazmadan:

```sh
export BMK_TEST_URL=http://127.0.0.1:5174
export BMK_TEST_ADMIN_EMAIL=qa@example.test
read -r -s BMK_TEST_ADMIN_PASSWORD
export BMK_TEST_ADMIN_PASSWORD
npm run test:backend
unset BMK_TEST_ADMIN_PASSWORD
```

`read` komutundan sonra yerel test yönetici şifreni yazıp Enter'a bas. Girilen karakterler görünmez. Hesap henüz yoksa CMS testi yerel sahip kimliğiyle kurulum yapabilir; mevcutsa girdiğin bilgiler hesapla eşleşmeli. Gerçek kullanıcı hesabını kullanma.

- `test:backend`: CMS, görsel yükleme, taslaklar, üyeler, başvurular, kontenjan/QR yarışları, davet, oturum iptali ve sistem ayarları.
- `test:editor`: aynı `BMK_TEST_URL` ve yönetici ortamıyla ana sayfa editörü.
- `BMK_GAME_TEST_URL=http://127.0.0.1:5174 npm run test:game`: motor/ses ve gerçek HTTP skor doğrulaması.
- `BMK_QR_INTEGRATION=1 node scripts/verify-qr.mjs`: yerel yönetici bilgileriyle QR HTTP akışı.

Bu testler sentetik kayıtlar oluşturur ve bazı ayarları değiştirir. Yalnızca geliştirici test veritabanında çalıştır.

## Ayrı yük/adversarial testi

Bu ağır akış standart PR kontrolünde otomatik çalışmaz. `verify-stress.mjs` yalnızca `http://127.0.0.1:5175` ve `outputs/stress-state-v21/LOCAL-QA-ONLY` işaretli ortamı kabul eder.

1. `docs/SETUP.md` adımlarıyla `outputs/team-state/` içinde yalnızca sentetik veriler ve bir test yöneticisi oluştur. Gerçek kullanıcı veya telefon test verisi içeren bir dizini kullanma.
2. `dev:team` sunucusunu durdur. `node scripts/seed-stress-fixtures.mjs` ile bu veriyi yeni `outputs/stress-state-v21/` dizinine kopyala ve yük kayıtlarını oluştur. Hedef zaten varsa araç üzerine yazmaz.
3. `npm run build` sonrasında ayrı Worker başlat:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js dev   --config dist/server/wrangler.json --local   --persist-to outputs/stress-state-v21 --ip 127.0.0.1   --port 5175 --inspector-port 0
```

4. Aynı yerel test yöneticisi ortam bilgileriyle çalıştır:

```sh
BMK_TEST_URL=http://127.0.0.1:5175 npm run test:adversarial
BMK_STRESS_URL=http://127.0.0.1:5175 npm run test:stress
```

Yük testi 1/10/25/50/100 eşzamanlı okumayı, kısa sürekli yükü, kontenjan ve QR yarışlarını kapsar. Yerel D1/Worker sonuçları canlı kapasite, DDoS dayanıklılığı veya sıfır hata garantisi değildir. Canlı alan adına yük testi göndermeyin.
