// Authored nudges, separate from solutions. No code or answer is executed here.
export const CHALLENGE_HINTS: Record<string, string> = {
  nullish:
    'Eksik değer ile sıfır aynı şey değil. Her seçeneği önce 0, sonra undefined için düşün; yalnızca bu iki deneme bile farkı gösterecek.',
  sort: 'a=8 ve b=100 olsun. Büyük olanın öne gelmesi için karşılaştırıcının işareti ne olmalı? İşaret tersine dönünce sıralama da değişir.',
  parallel:
    'İki ayrı beklenti var: bütün işleri beklemek ve bir iş reddedildiğinde toplam işlemi de reddetmek. Her seçeneğin bu ikisini birden sağlayıp sağlamadığını düşün.',
  closure:
    'Fonksiyonlar döngü bittikten sonra çalışıyor. Her turun kendi değişkenine ihtiyacı var; ayrıca sayaç her turda değişebilmeli.',
  immutable:
    'Dış nesneyi kopyalamak içindeki nesneyi kopyalamaz. Boşluğun bulunduğu nesnenin hangi alanları taşıması gerektiğine bak.',
  dedupe:
    'Sonraki satır u.ad okuyor. Elindeki eleman bir anahtar mı, üye nesnesi mi, yoksa ikili bir dizi mi olmalı?',
  microtask:
    'Önce hiçbir kuyruğa girmeyen satırları çalıştır. Sonra microtask kuyruğunu, eklendikleri sırayla boşalt.',
  'async-map':
    'Bir diziyi beklemek ile içindeki işlerin bitmesini beklemek farklı. Sonuç satırında Promise nesneleri değil sayılar gerekiyor.',
  frequency:
    'Etiket sözlükte yokken daha hiç sayılmadı. Döngüde zaten bir artırma yapıldığına dikkat et.',
  intersection:
    'Bir elemanı sonuca eklemeden önce her iki ekipte de bulunduğunu kontrol etmek istiyoruz. Sadece birinde bulunanlar dışarıda kalmalı.',
  median:
    'Ortadaki elemanın indisi tam sayı olmalı. Beş elemanı sıfırdan numaralandırıp ortadakinin numarasına bak.',
  prefix:
    'Sağ sınıra kadarki toplam, istemediğin sol bölümü de içeriyor. O sol bölümü sonuçtan nasıl ayırabilirsin?',
  bfs: 'Bir gişe sırası düşün. En son geleni değil, sırada en uzun süredir bekleyeni çıkarıyoruz.',
  ranking:
    'İki ölçütü ayrı düşün: puanda büyük iyi, sürede küçük iyi. sorted, anahtarları küçükten büyüğe karşılaştırır.',
  'lower-bound':
    'Ortadaki elemanın uygun olmadığını zaten öğrendin. Yeni aralıkta onu tekrar incelememelisin; aralık her turda küçülmeli.',
  window:
    'Pencere üç elemanlıyken yeni eleman 3. indisten giriyor. İlk eleman hangi indisten çıkar? Bu ilişkiyi k ile ifade et.',
  'deny-default':
    'İznin verilmesi için rolün tam olarak beklenen metin olması gerekiyor. Büyük harfli veya eksik değerler bu denemeyi geçmemeli.',
  expiry:
    'Sınır durumunu ayrı dene: bitiş zamanı ile şimdiki zaman eşit. Bu anda oturumun artık geçersiz olması isteniyor.',
  allowlist:
    'Listenin son boyutu değişmemeli. Bir şey ekleyen veya silen yöntemi kullanırsan kontrol işleminin kendisi listeyi değiştirmiş olur.',
  origin:
    'Aynı alan adı, farklı protokol veya portla farklı bir kaynak olabilir. URL alanlarından hangisi üçünü birlikte temsil eder?',
  'own-property':
    'admin alanı nesnenin kendisinde değil, prototipinde. Arama yaparken bu zincirde yukarı çıkmayan bir kontrol gerekiyor.',
  schemes: 'İstenen bilgi, adresin başındaki şema. Alan adı ve yol bu bilgiyi tek başına vermez.',
  'atomic-ticket':
    'İki koşulun aynı anda sağlanması gerekiyor: doğru bilet ve henüz kullanılmamış olması. İkinci işlem geldiğinde koşullardan biri artık sağlanmamalı.',
  'bound-query':
    'Sorgudaki yer tutucu ile soru işareti içeren sabit metin farklı şeyler. Tırnakların bir değeri nasıl değiştirdiğini düşün.',
  delta:
    'Birimleri kontrol et: hız piksel/saniye, zaman saniye. Sonucun birimi yalnızca piksel olmalı.',
  cooldown:
    'İki adayın var: sıfır ve hesaplanan süre. Süre negatif çıktığında sıfırın seçilmesini istiyoruz.',
  diagonal:
    '(1,1) vektörünü bir dik üçgenin iki kenarı gibi düşün. İkisini de vektörün uzunluğuna bölünce yön değişmez, uzunluk bire iner.',
  lerp: 'Başlangıç noktası zaten başta ekleniyor. Çarpılan terim, başlangıç ile hedef arasındaki mesafeyi temsil etmeli.',
  'edge-input':
    'Şimdi basılı olması tek başına yetmez; önceki karede basılı olmaması da gerekir. İki koşulun birlikte sağlanmasını arıyorsun.',
  aabb: 'Örnekte dikey aralıklar birbirinden uzak. Yatayda örtüşseler bile çarpışma sayılmamalı; her iki ekseni birlikte düşün.',
  swept:
    'Engelin çizgisini önceki ve sonraki konum arasında bırakmak istiyoruz. İlk koşul önceki konumu denetliyor; ikinci koşul geçişin öbür tarafını denetlemeli.',
  'fixed-step':
    'Bir karede birden fazla fizik adımı birikmiş olabilir. Gövde çalıştıktan sonra koşulu tekrar kontrol etmek gerekiyor.',
};
