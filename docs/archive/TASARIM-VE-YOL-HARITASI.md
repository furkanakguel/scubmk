# SCÜ BMK — Tasarım ve geliştirme kararı

22 Ekim 2026 · Etkileşim ve hareket sürümü / v0.3

## Amaç

SCÜ Bilgisayar Mühendisliği Kulübü'nün kimliğini; ziyaretçi deneyimi, başvuru ve yönetim işlerinde aynı kalitede hissettirmek. Bir öğrencinin kulübü anlaması, bir etkinliği bulması, hesapsız başvurması ve biletini saklaması temel yolculuk.

## İncelenen referanslar

| Referans                                 | İnceleme                                                                                                                                                                                         | BMK'ye taşınan karar                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| [Lusion](https://lusion.co/)             | Canlı masaüstü görünümü ve içerik. Geniş 3B sahne, az ama güçlü metin, büyük boşluklar.                                                                                                          | Ana sayfaya ait tek, özgün bir 3B imza; görsel alan ve okunabilir içerik dengesi.                  |
| [Igloo](https://www.igloo.inc/)          | Canlı masaüstü açılışı ve [üretici vaka çalışması](https://www.awwwards.com/igloo-inc-case-study.html). Sahneyle bütünleşen teknik yazılar, parçacık dönüşümü, cihaz performansına göre çalışma. | Etkileşimli piksel dinozor; kontrollü detaylar, düşük çözünürlük sınırı, görünmeyen sahnede durma. |
| [Lando Norris](https://landonorris.com/) | Canlı masaüstü açılışı ve sayfa içeriği. Markaya ait baskın ana karakter, güçlü tipografik kimlik.                                                                                               | Genel bir teknoloji küresi yerine BMK'nin kendi dinozorunun kullanımı.                             |
| [Bruno Simon](https://bruno-simon.com/)  | Sayfa içeriği ve yayımlanmış teknik açıklamalar; üç boyutlu etkileşim dünyası, cihaz giriş yöntemleri ve kalite seçenekleri. Tam oyun dolaşımı test edilmedi.                                    | Keşfetmeye davet eden küçük etkileşim; ana işlemlerin kolay erişilebilir kalması.                  |
| [Linear](https://linear.app/)            | Canlı sayfa ve ürün arayüzünün erişilebilir bileşen yapısı. Sık kullanılan işlemler, bilgi hiyerarşisi, sıkışık ama düzenli veri alanları.                                                       | Yönetimde sabit gezinme, başvuru araması, filtreler, hızlı işlemler ve okunabilir durumlar.        |

Bu seçim “dünyanın en iyisi” için nesnel bir sıralama değildir. Özgünlük, etkileşim, marka uyumu ve ürün kullanımını karşılaştıran bir referans kümesidir. Her sitenin mobil performansı ölçülmüş gibi bir iddia yoktur.

## Görsel kimlik

- Kaynak: Kullanıcının paylaştığı mevcut BMK dinozor amblemi ve @cumhuriyetbmk hesabı.
- Orman yeşili #132e22; kırık beyaz #f4f3eb; adaçayı #c4d293; sıcak altın #b79e61.
- Başlık: Space Grotesk. Metin: DM Sans. Küçük teknik açıklamalar: IBM Plex Mono.
- Amblem şu anda ekran görüntüsünden CSS ile çerçevelenir. Nihai yayın için özgün SVG veya yüksek çözünürlüklü şeffaf logo tercih edilir.
- Kahraman görseli: Three.js ile gerçek zamanlı, küp geometrilerden üretilen piksel dinozor. Mevcut logo sistemi yeniden tasarlanmıyor; onun üç boyutlu yorumu kullanılıyor.

## v0.2 — Yeniden kurulan görsel yön

İlk sürümdeki kart ağırlıklı sayfa düzeni yerine, bölümler arasında belirgin bir tempo kuruldu:

1. Koyu açılış: dev tipografi, yansıtıcı metal piksellerden gerçek zamanlı dinozor, küçük koordinat ve figür detayları.
2. Üç hâlli etkileşim: dinozor → dağılan parçalar → BMK harfleri → dinozor. Aynı parçalar farklı biçimlerde birleşir.
3. Kaydırmaya bağlı parçalanma ve kararan sahnenin üstünde kelime kelime belirginleşen manifesto.
4. Kırık beyaz zeminde, farklı boyutlarda afişlerden oluşan etkinlik seçkisi.
5. BMK dinozoru için üretilmiş sinematik kavram görseli; gerçek zamanlı sahneden ayrı bir illüstrasyon. Görselin üretim yöntemi sayfada belirtilir.
6. İlgi alanına göre değişen grafik ve içerikler; heykelsi bilet; geniş katılım çağrısı.
7. Mobilde farklı sahne konumu, boyutu ve boşluklar; dokunma ile aynı üç hâlli etkileşim.
8. Yönetim, başvuru ve bilet ekranlarında aynı yeşil / kırık beyaz aile ve sakin bilgi hiyerarşisi.

Görsel varlıklar: sinematik WebP yaklaşık 217 KB; logo referansı yaklaşık 22 KB. Three.js yalnızca sahne yüklenirken dinamik olarak alınır. Bunlar dosya boyutu ölçümleridir; gerçek cihaz hız skoru değildir.

## Etkileşim kararları

1. Başlık ve ana işlemler ilk anda görünür; yüklenme animasyonuyla bekletilmez.
2. Dinozor fare hareketine tepki verir. “Pikselleri serbest bırak” işlemi dokunmatik ekranda da çalışır.
3. Sahne görünmüyorken ve sekme arka plandayken çizim atlanır; cihaz piksel oranı sınırlıdır.
4. Hareket azaltma tercihinde sürekli salınım kapanır. WebGL yoksa HTML/CSS piksel silueti görünür.
5. Etkinlik filtreleri, açılır sorular, gerçek formlar ve bilet işlemleri normal HTML kontrolleridir.
6. Ana sayfa ve yönetim mobilde ayrı yerleşimlerle çalışır; tablolar gerektiğinde kendi içinde yatay kayar.
7. Form hataları, boş durumlar, kontenjan doluluğu ve yinelenen başvuru durumları açık metinle bildirilir.

## v0.2'de uygulananlar

- Ana sayfa: topluluk, etkinlikler, ilgi alanları, QR akışı, sık sorulanlar, katılım bağlantısı.
- Başvuru: sunucuda doğrulama, kalıcı D1 kaydı, e-posta + etkinlik için tek kayıt, kontenjan kontrolü.
- Bilet: kriptografik erişim anahtarı; sunucuda anahtar özeti; QR; PNG indirme; bağlantı kopyalama; paylaşma; yazdırma; aynı cihazda son biletler.
- Yönetim: sunucuda yönetici e-posta yetkilendirmesi, etkinlik oluşturma, yayımlama/gizleme, başvuru arama/filtreleme/ayrıntı, CSV, son 7 gün grafiği.
- Giriş: QR'nin yönetim ekranına taşıdığı ayrı kodla tek işlemde doğrulama; ikinci kullanımı reddetme. Telefonun kamera uygulaması QR okuyucu olarak kullanılır.
- API: kaynak kontrolü, veri sınırları, başvuru ve bilet sorgusuna hız sınırlaması, kişisel veriler için önbelleksiz yanıtlar.

## Bileti kaybetmeme tasarımı

Şu anda çalışan katmanlar:

1. İndirilen QR bilet görseli; telefon galerisinde / dosyalarda tutulabilir.
2. Tahmin edilemeyen özel bilet bağlantısı; başka cihazda da bilete erişim sağlar.
3. Aynı tarayıcıdaki son biletler; kolaylık içindir, tek yedek değildir.
4. Kaydedilmiş bağlantının “Biletim” ekranına yapıştırılması.

Sonraki yayın adımı:

- Bir işlem e-postası hizmeti ve doğrulanmış gönderici alan adı bağlamak.
- Kayıttan sonra bilet bağlantısını e-postayla iletmek.
- “Biletimi yeniden gönder” akışında her zaman aynı genel yanıtı göstermek; adresin kayıtlı olup olmadığını ifşa etmemek.
- Tek kullanımlık, süreli kurtarma bağlantısı; hız sınırı ve eski anahtarları geçersiz kılma kararı.
- İsteğe bağlı Apple Wallet / Google Wallet; sağlayıcı ve imza yapılandırması gerekir.

## Gerçek yayından önce kalanlar

- Mevcut Site ilk tasarım incelemesi için sahibine özel. Öğrencilere açık yayın yapılmadı; özel önizlemeyi açmak platform oturumu isteyebilir. Uygulamanın başvuru akışı hesap gerektirmez.
- Üyelik ve örnek etkinlikler deneme olarak etiketli. Gerçek etkinlikler yönetimde oluşturulabilir.
- E-posta teslimi ve kurtarma hizmeti henüz bağlı değil.
- Resmî içerikler: gerçek takvim, yönetim ekibi, özgün etkinlik fotoğrafları, iletişim ve veri sorumlusu bilgileri.
- Gerçek kişisel veri toplamadan önce kulübe uygun aydınlatma metni, saklama süresi ve silme süreci belirlenmeli; mevcut metin nihai hukuk metni değildir.
- Üretimde yönetim ekip rolleri / görevli yetkileri, denetim kaydı ve yüksek hacimli başvuru sayfalaması eklenmeli.
- Orta seviye gerçek Android ve iPhone üzerinde performans ve dokunma testleri yapılmalı; Lighthouse/Core Web Vitals ölçülmeden hız skoru iddia edilmemeli.

## Kalite hedefleri (ölçüm sonucu değildir)

Mobil LCP < 2.5 sn, INP < 200 ms, CLS < 0.1. Masaüstünde akıcı 3B; zayıf cihazda daha düşük kalite. 44 px dokunma hedefleri; klavye akışı, görünür odak, ekran okuyucu etiketleri. Animasyonlar içeriğin okunmasına veya form kullanımına engel olmamalı.

## Yapılan doğrulama

TypeScript kontrolü ve üretim derlemesi. Yerel sunucuda: yetkisiz yönetim erişimi, kaynak ve veri doğrulama, etkinlik oluşturma, eşzamanlı kontenjan sınırı, kalıcı bilet erişimi, bilet / giriş kodu ayrımı, eşzamanlı tek kullanımlık giriş ve gizli etkinliğe başvuru engeli. Tarayıcıda masaüstü görünümü, 390 px genişliğinde mobil yerleşim, üç hâlli sahne, başvuru → bilet akışı ve yönetim görünümü incelendi. Gerçek telefon donanımında performans ölçümü henüz yapılmadı.

## v0.3 — Etkileşim kapsamı ve sınırlar

22 Ekim 2026: Kullanıcının daha fazla animasyon ve daha güçlü etkileşim isteği üzerine sahne yeniden işlendi. Dinozorun yüzeyi daha küçük, yuvarlatılmış metal parçalardan oluşur; ilk açılışta birleşir. Model sürüklenir, klavyeyle döner; biçim, ışık ve çizim modu ayrı ayrı değiştirilebilir. Yeni Merak Laboratuvarı kendi parçacık geometrisini küre, sarmal ve dalga arasında dönüştürür. Enerji ve duraklatma gerçek sahne ayarlarıdır.

Afişlerde imlece bağlı perspektif ve ışık, kayan tipografi, kaydırmaya bağlı sabit görsel sahne, başlık maskeleri, iki yüzlü bilet, menü girişleri, büyük katılım çağrısı ve alt başlıkta ışık geçişi bulunur. Ses kendiliğinden çalmaz. Açılışı engelleyen bir yükleme ekranı yoktur.

Sistem hareket azaltma tercihi ve görünür sakin mod desteklenir. Dokunmatik ekranda imleç halkası ve afiş eğimi kapalıdır; telefon için sahne boyutu, kamera ve kontrol alanları ayrıca ayarlanır. Görünmeyen 3B ve laboratuvar sahnelerinde çizim atlanır; sekme arka plandayken sahne güncellenmez. Gerçek cihaz FPS veya Core Web Vitals sonucu iddia edilmez.

Tarayıcı kontrolü: 1280 px masaüstü, 390 ve 360 px genişliğinde gömülü mobil yerleşimler; model sürükleme, ışık / biçim / iskelet seçenekleri; laboratuvar biçimleri, enerji ve duraklatma; bilet çevirme; aramalı gezinme; sakin mod. Bunlar yerleşim ve işlev testleridir, fiziksel telefon testi değildir.

## v0.4 — İnsanlar, keşif haritası ve BMK Run

Kullanıcının üç nokta menüsü açıklaması doğrultusunda masaüstü ve mobilde ortak tam ekran keşif haritası eklendi. Menü bağlantısına odaklanmak veya üzerine gelmek, sol görselin sembolünü, renklerini ve başlığını değiştirir. Menü arka planı etkileşime kapatır; Escape kapatır, odak düğmeye döner. Aramalı hızlı gezinmeye ekip ve oyun eklenmiştir.

Ekip dizini kategori filtresi ve aramayla altı profil sayfasına bağlanır. Gerçek üyeler hakkında veri sağlanmadığı için rol başlıkları ve özgün geometrik kimlik görselleri kullanılır; bu alanlar açıkça tasarım profili olarak etiketlenir. Üye yönetimi için yeni bir admin modülü eklenmedi. Onaylı kadro ve portreler sonraki içerik adımıdır.

BMK Run özgün çizimlerden oluşan bir kampüs koşusudur. Çarpışma, tek zıplama, gittikçe artan hız, parçalar, puan, duraklatma, yeniden başlatma ve yerel rekor saklama çalışır. Oyun hesabı veya çevrimiçi liderlik tablosu yoktur. Sekme gizlenince, oyun ekran dışına çıkınca veya menü açılınca tur duraklatılır. Rekor tarayıcı verileri silinirse kaybolabilir.

Performans değişiklikleri: laboratuvar modülü görünüm alanına yaklaşınca yüklenir; ana sayfada oyun motoru yüklenmez. 3B ve laboratuvar döngüleri görünmediklerinde gerçekten durdurulur. Sakin modda laboratuvar yalnızca ayar değişikliklerinde çizilir; duraklatılmış laboratuvar biçim geçişi tamamlanınca durur. İmleç döngüsü imlece yetişince sona erer. Oyun boşta, duraklatılmış veya bitmişken sürekli çizilmez.

Doğrulama: 1440 px gömülü masaüstü ve 360/390 px mobil yerleşimler; menü odak döngüsü ve Escape; ekip kategorisi, boş arama ve profil bağlantısı; klavye/dokunma ile oyun başlangıcı, zıplama, mola, devam, çarpışma ve tekrar oynama; ana sayfa model biçimi/ışığı ve sonradan yüklenen laboratuvarın biçim/mola kontrolleri. Tüm altı profil, oyun ve mevcut başvuru/bilet rotaları 200; bilinmeyen profil 404. Oyun motoru testleri deterministiktir. Fiziksel telefon FPS/Lighthouse ölçümü yapılmadı.
