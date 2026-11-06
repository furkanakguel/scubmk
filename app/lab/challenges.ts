export type Challenge = {
  id: string;
  file: string;
  language: 'JavaScript' | 'Python' | 'SQL';
  level: 'Orta' | 'Zor' | 'Usta';
  prompt: string;
  code: string;
  options: string[];
  correct: string;
  explanation: string;
  expected: string;
  topic: string;
};
export type Track = {
  id: string;
  title: string;
  short: string;
  description: string;
  error: { code: string; module: string; title: string; message: string; steps: string[] };
  questions: Challenge[];
};
export const TRACKS: Track[] = [
  {
    id: 'web',
    title: 'Yazılım & Web',
    short: 'Web',
    description: 'Asenkron akışlar, veri ve arayüz.',
    error: {
      code: 'UNHANDLED_RUNTIME_EXCEPTION',
      module: 'bmk.web.runtime',
      title: 'Uygulama yanıt vermiyor',
      message: 'Beklenen çıktı ile seçilen ifade eşleşmedi.',
      steps: [
        'Olay döngüsü durduruldu.',
        'Son sağlam durum geri yükleniyor.',
        'Arayüz yeniden bağlanıyor.',
      ],
    },
    questions: [
      {
        id: 'nullish',
        file: 'kontenjan.js',
        language: 'JavaScript',
        level: 'Orta',
        topic: 'Nullish coalescing',
        prompt:
          '0 geçerli bir kontenjan. Yalnızca null veya undefined için 25 kullan. Hangi operatör?',
        code: 'const kontenjanlar = [0, undefined, null];\nconst sonuc = kontenjanlar.map(n => n ___ 25);\nconsole.log(sonuc.join(","));',
        options: ['||', '??', '&&'],
        correct: '??',
        explanation:
          '?? yalnızca null ve undefined için yedek değer kullanır. && bu örnekte 0 verse de undefined için 25 vermez; || ise 0 değerini de değiştirir.',
        expected: '0,25,25',
      },
      {
        id: 'sort',
        file: 'liderlik.js',
        language: 'JavaScript',
        level: 'Orta',
        topic: 'Sayısal sıralama',
        prompt: 'Kaynak diziyi değiştirmeden büyükten küçüğe sırala. Karşılaştırıcı ne döndürmeli?',
        code: 'const skorlar = [8, 100, 30];\nconst sirali = [...skorlar].sort((a, b) => ___);\nconsole.log(sirali.join(","));\nconsole.log(skorlar.join(","));',
        options: ['a - b', 'b - a', 'a + b'],
        correct: 'b - a',
        explanation:
          'b - a azalan sayısal sıra verir. Kopya üzerinde sort kullandığımız için ilk dizi değişmez.',
        expected: '100,30,8\n8,100,30',
      },
      {
        id: 'parallel',
        file: 'kaynaklar.js',
        language: 'JavaScript',
        level: 'Zor',
        topic: 'Promise koordinasyonu',
        prompt:
          'İki sonucu giriş sırasıyla tek dizide bekle. Herhangi biri reddedilirse bütün işlem reddedilsin.',
        code: 'const kaynaklar = [\n  Promise.resolve("etkinlikler"),\n  Promise.resolve("ekip")\n];\nPromise.___(kaynaklar).then(sonuclar => {\n  console.log(JSON.stringify(sonuclar));\n});',
        options: ['race', 'allSettled', 'all'],
        correct: 'all',
        explanation:
          'Promise.all bütün sonuçları giriş sırasıyla toplar; bir ret olduğunda reddedilir. allSettled retleri de sonuç nesnelerine çevirir.',
        expected: '["etkinlikler","ekip"]',
      },
      {
        id: 'closure',
        file: 'gorevler.js',
        language: 'JavaScript',
        level: 'Zor',
        topic: 'Blok kapsamı / closure',
        prompt:
          'Sonradan çalıştırılan üç fonksiyon sırasıyla 0, 1, 2 döndürsün. Değişkeni nasıl tanımlarsın?',
        code: 'const gorevler = [];\nfor (___ i = 0; i < 3; i++) {\n  gorevler.push(() => i);\n}\nconsole.log(gorevler.map(fn => fn()).join(","));',
        options: ['var', 'let', 'const'],
        correct: 'let',
        explanation:
          'let her döngü turu için ayrı bağ oluşturur. var ile üç fonksiyon aynı i değerini görür; const ise i++ işlemine izin vermez.',
        expected: '0,1,2',
      },
      {
        id: 'immutable',
        file: 'profil.js',
        language: 'JavaScript',
        level: 'Zor',
        topic: 'İç içe nesne kopyalama',
        prompt: 'Yeni seviyeyi 2 yaparken eski profili ve ad alanını koru. Eksik alanı tamamla.',
        code: 'const uye = { profil: { ad: "Ece", seviye: 1 } };\nconst yeni = {\n  ...uye,\n  profil: { ___, seviye: 2 }\n};\nconsole.log(yeni.profil.ad, uye.profil.seviye);',
        options: ['...uye', '...uye.profil', '...{ seviye: 1 }'],
        correct: '...uye.profil',
        explanation:
          'İçteki profil nesnesi de kopyalanmalı. Böylece ad korunur ve eski profilin seviyesi 1 olarak kalır.',
        expected: 'Ece 1',
      },
      {
        id: 'dedupe',
        file: 'katilimcilar.js',
        language: 'JavaScript',
        level: 'Zor',
        topic: 'Map / tekilleştirme',
        prompt:
          'Aynı id için son kaydı tutup üye nesnelerini elde et. Map üzerinden neyi almalısın?',
        code: 'const uyeler = [{ id: 1, ad: "Ece" },\n  { id: 1, ad: "Ece Y." }, { id: 2, ad: "Can" }];\nconst kayitlar = new Map(uyeler.map(u => [u.id, u]));\nconst tekil = Array.from(kayitlar.___());\nconsole.log(tekil.map(u => u.ad).join(","));',
        options: ['keys', 'values', 'entries'],
        correct: 'values',
        explanation:
          'Map aynı anahtarın son değerini saklar. values üye nesnelerini döndürür; keys id’leri, entries anahtar-değer çiftlerini verir.',
        expected: 'Ece Y.,Can',
      },
      {
        id: 'microtask',
        file: 'olay-dongusu.js',
        language: 'JavaScript',
        level: 'Usta',
        topic: 'Microtask sırası',
        prompt:
          'Konsola true yazdıracak sıra hangisi? Promise geri çağrısı senkron kodun ardından çalışır.',
        code: 'const sira = [];\nPromise.resolve().then(() => sira.push("B"));\nsira.push("A");\nqueueMicrotask(() => {\n  console.log(sira.join("") === "___");\n});',
        options: ['BA', 'AB', 'A'],
        correct: 'AB',
        explanation:
          'A senkron eklenir. Önce kuyruğa alınan Promise microtask’ı B’yi ekler; ardından queueMicrotask sonucu okur.',
        expected: 'true',
      },
      {
        id: 'async-map',
        file: 'asenkron-liste.js',
        language: 'JavaScript',
        level: 'Usta',
        topic: 'async map tuzağı',
        prompt:
          'async map bir Promise dizisi üretir. Ekrana 2,4,6 basmak için eksik await ifadesi hangisi?',
        code: 'async function hesapla() {\n  const isler = [1, 2, 3].map(async n => n * 2);\n  const sonuc = await ___;\n  console.log(sonuc.join(","));\n}\nhesapla();',
        options: ['isler', 'Promise.all(isler)', 'Promise.race(isler)'],
        correct: 'Promise.all(isler)',
        explanation:
          'Diziyi await etmek içindeki Promise’leri çözmez. Promise.all her birini bekleyerek sayı dizisini oluşturur.',
        expected: '2,4,6',
      },
    ],
  },
  {
    id: 'veri',
    title: 'Veri & Algoritmalar',
    short: 'Algoritma',
    description: 'Arama, pencere ve veri yapıları.',
    error: {
      code: 'DATA_INVARIANT_VIOLATION',
      module: 'bmk.data.engine',
      title: 'Veri doğrulaması başarısız',
      message: 'Algoritmanın ürettiği sonuç beklenen koşulu sağlamadı.',
      steps: [
        'Geçici veri kümesi temizlendi.',
        'Başlangıç indisleri geri yükleniyor.',
        'Algoritma çalışma alanı onarılıyor.',
      ],
    },
    questions: [
      {
        id: 'frequency',
        file: 'frekans.py',
        language: 'Python',
        level: 'Orta',
        topic: 'Frekans tablosu',
        prompt: 'İlk görülen etiketi 1’den saymaya başla. get için varsayılan değer ne olmalı?',
        code: 'sayac = {}\nfor alan in ["web", "oyun", "web"]:\n    sayac[alan] = sayac.get(alan, ___) + 1\nprint(sayac["web"], sayac["oyun"])',
        options: ['1', '-1', '0'],
        correct: '0',
        explanation:
          'İlk kez görülen anahtar 0 ile başlar ve 1 eklenir. Sonuç web için 2, oyun için 1 olur.',
        expected: '2 1',
      },
      {
        id: 'intersection',
        file: 'ortak_alanlar.py',
        language: 'Python',
        level: 'Orta',
        topic: 'Küme kesişimi',
        prompt: 'İki ekibin yalnızca ortak ilgi alanlarını bul. Hangi küme işlemi gerekir?',
        code: 'a = {"web", "oyun", "veri"}\nb = {"web", "guvenlik", "veri"}\nortak = a ___ b\nprint(",".join(sorted(ortak)))',
        options: ['|', '&', '^'],
        correct: '&',
        explanation:
          '& kesişimi alır. | birleşimi, ^ ise yalnızca bir kümede bulunan elemanları verir.',
        expected: 'veri,web',
      },
      {
        id: 'median',
        file: 'medyan.py',
        language: 'Python',
        level: 'Zor',
        topic: 'Medyan / indis',
        prompt:
          'Tek sayıda elemanın sıralı orta değerini bul. İndis için hangi bölme kullanılmalı?',
        code: 'veri = [7, 2, 9, 4, 1]\nsirali = sorted(veri)\norta = len(sirali) ___ 2\nprint(sirali[orta])',
        options: ['/', '//', '%'],
        correct: '//',
        explanation:
          '// tam sayı bölmesidir: 5 // 2 = 2. Sıfır tabanlı dizide 2. indis medyan olan 4’ü verir.',
        expected: '4',
      },
      {
        id: 'prefix',
        file: 'aralik_toplami.py',
        language: 'Python',
        level: 'Zor',
        topic: 'Prefix sum',
        prompt:
          '[sol, sag) aralığının toplamını O(1) zamanda bul. Ön toplamları nasıl birleştirirsin?',
        code: 'veri = [3, 1, 4, 2]\nprefix = [0]\nfor x in veri:\n    prefix.append(prefix[-1] + x)\nsol, sag = 1, 4\nprint(prefix[sag] ___ prefix[sol])',
        options: ['+', '-', '/'],
        correct: '-',
        explanation:
          'Başlangıca kadar olan toplamı bitişe kadar olandan çıkarırız: 10 - 3 = 7. Sağ sınır aralığa dahil değildir.',
        expected: '7',
      },
      {
        id: 'bfs',
        file: 'kuyruk.py',
        language: 'Python',
        level: 'Zor',
        topic: 'BFS / FIFO',
        prompt: 'Kuyruğa ilk giren önce çıksın. BFS ziyaret sırasını koruyan indis hangisi?',
        code: 'graf = {"A": ["B", "C"], "B": ["D"], "C": [], "D": []}\nkuyruk, ziyaret = ["A"], []\nwhile kuyruk:\n    dugum = kuyruk.pop(___)\n    ziyaret.append(dugum)\n    kuyruk.extend(graf[dugum])\nprint("".join(ziyaret))',
        options: ['-1', '0', '1'],
        correct: '0',
        explanation:
          'FIFO için baştan çıkarırız. Bu küçük örnekte liste kullanıldı; büyük kuyruklarda deque.popleft daha uygundur.',
        expected: 'ABCD',
      },
      {
        id: 'ranking',
        file: 'esitlik.py',
        language: 'Python',
        level: 'Zor',
        topic: 'Çok ölçütlü sıralama',
        prompt: 'Puan azalan; puanlar eşitse süre artan olsun. Sıralama anahtarı hangisi?',
        code: 'oyuncular = [(100, 40), (120, 50), (100, 30)]\nsirali = sorted(oyuncular, key=lambda p: ___)\nprint(sirali)',
        options: ['(p[0], p[1])', '(-p[0], -p[1])', '(-p[0], p[1])'],
        correct: '(-p[0], p[1])',
        explanation:
          'Negatif puan yüksek puanı öne taşır. Pozitif süre ise eşit puanlarda küçük süreyi önce getirir.',
        expected: '[(120, 50), (100, 30), (100, 40)]',
      },
      {
        id: 'lower-bound',
        file: 'ikili_arama.py',
        language: 'Python',
        level: 'Usta',
        topic: 'Lower bound',
        prompt:
          'Hedeften küçük değerlerde sol sınırı ilerlet. Sonsuz döngüye düşmeden ilk uygun indisi bul.',
        code: 'a, hedef = [2, 4, 4, 9], 4\nsol, sag = 0, len(a)\nwhile sol < sag:\n    orta = (sol + sag) // 2\n    if a[orta] < hedef: sol = orta ___ 1\n    else: sag = orta\nprint(sol)',
        options: ['-', '+', '*'],
        correct: '+',
        explanation:
          'Ortadaki değer küçükse onu ve solunu eleriz: sol = orta + 1. Eşitlikte sağ sınırı daraltarak ilk 4’ün indisini buluruz.',
        expected: '1',
      },
      {
        id: 'window',
        file: 'kayan_pencere.py',
        language: 'Python',
        level: 'Usta',
        topic: 'Sliding window',
        prompt: 'k uzunluklu pencereyi bir adım kaydırırken hangi eski eleman çıkmalı?',
        code: 'veri, k = [2, 7, 1, 8, 2], 3\npencere = sum(veri[:k])\nen_iyi = pencere\nfor i in range(k, len(veri)):\n    pencere += veri[i] - veri[i - ___]\n    en_iyi = max(en_iyi, pencere)\nprint(en_iyi)',
        options: ['1', 'k', 'k - 1'],
        correct: 'k',
        explanation:
          'Yeni eleman i’de gelir; pencereden çıkan i-k’dadır. Böylece her toplamı yeniden hesaplamadan en büyük 3’lü toplam 16 bulunur.',
        expected: '16',
      },
    ],
  },
  {
    id: 'guvenlik',
    title: 'Siber Güvenlik',
    short: 'Güvenlik',
    description: 'Yetki sınırları ve güvenli varsayımlar.',
    error: {
      code: 'POLICY_CHECK_FAILED',
      module: 'bmk.security.policy',
      title: 'İzin kuralı reddedildi',
      message: 'Seçilen kural güvenlik koşulunu karşılamadı. Erişim verilmedi.',
      steps: [
        'Örnek oturum sonlandırıldı.',
        'Varsayılan ret politikası yükleniyor.',
        'İzin denetimi yeniden hazırlanıyor.',
      ],
    },
    questions: [
      {
        id: 'deny-default',
        file: 'izin.js',
        language: 'JavaScript',
        level: 'Orta',
        topic: 'Varsayılan ret',
        prompt: 'Yalnızca admin rolünü kabul et. member ve eksik rol için erişim reddedilmeli.',
        code: 'const roller = ["admin", "member", undefined, "Admin"];\nconst izinler = roller.map(rol => rol ___ "admin");\nconsole.log(JSON.stringify(izinler));',
        options: ['!==', '===', '<='],
        correct: '===',
        explanation:
          'Sıkı eşitlik yalnızca admin değerini kabul eder. Gerçek sistemde bu kontrol istemcide değil, doğrulanmış oturumla sunucuda yapılır.',
        expected: '[true,false,false,false]',
      },
      {
        id: 'expiry',
        file: 'oturum.js',
        language: 'JavaScript',
        level: 'Orta',
        topic: 'Süre sonu',
        prompt: 'Tam bitiş anında da oturum geçersiz sayılsın. Hangi karşılaştırma doğru?',
        code: 'const simdi = 1000;\nconst sureler = [999, 1000, 1001];\nconsole.log(JSON.stringify(\n  sureler.map(bitis => bitis ___ simdi)\n));',
        options: ['>=', '>', '<'],
        correct: '>',
        explanation:
          'Yalnızca bitişi gelecekte olan oturum geçerlidir. Eşitlik anında süre dolmuştur.',
        expected: '[false,false,true]',
      },
      {
        id: 'allowlist',
        file: 'yonlendirme.js',
        language: 'JavaScript',
        level: 'Zor',
        topic: 'İzin listesi',
        prompt:
          'Yönlendirme hedefini listeyi değiştirmeden denetle. Boolean üyelik kontrolü hangisi?',
        code: 'const izinli = new Set(["/ekip", "/etkinlikler"]);\nconst hedefler = ["/ekip", "https://ornek.invalid"];\nconsole.log(JSON.stringify(\n  hedefler.map(hedef => izinli.___(hedef))\n));\nconsole.log(izinli.size);',
        options: ['add', 'has', 'delete'],
        correct: 'has',
        explanation:
          'has kümeyi değiştirmeden true/false döndürür. Dış adres izin listesinde olmadığı için reddedilir.',
        expected: '[true,false]\n2',
      },
      {
        id: 'origin',
        file: 'origin.js',
        language: 'JavaScript',
        level: 'Zor',
        topic: 'Tam origin karşılaştırması',
        prompt:
          'Protokol, alan adı ve port birlikte eşleşsin. URL’nin hangi alanını karşılaştırırsın?',
        code: 'const izinli = "https://bmk.test";\nconst adresler = ["https://bmk.test/form",\n  "https://bmk.test.sahte.invalid/form"];\nconst sonuc = adresler.map(adres =>\n  new URL(adres).___ === izinli);\nconsole.log(JSON.stringify(sonuc));',
        options: ['hostname', 'pathname', 'origin'],
        correct: 'origin',
        explanation:
          'origin protokol, alan adı ve gerekli portu birlikte verir. Benzer görünen alt alan adı aynı origin değildir. Bu, tek başına bütün CSRF savunması değildir.',
        expected: '[true,false]',
      },
      {
        id: 'own-property',
        file: 'yetki-nesnesi.js',
        language: 'JavaScript',
        level: 'Zor',
        topic: 'Kendi özellikleri',
        prompt:
          'Prototipten miras gelen admin alanı sayılmasın. Yalnızca nesnenin kendi alanlarını denetle.',
        code: 'const izinler = Object.create({ admin: true });\nizinler.member = true;\nconst kontrol = ___;\nconsole.log(kontrol(izinler, "admin"));\nconsole.log(kontrol(izinler, "member"));',
        options: ['Reflect.has', 'Object.hasOwn', 'Object.is'],
        correct: 'Object.hasOwn',
        explanation:
          'Object.hasOwn prototip zincirini izlemez. Reflect.has miras alınan admin alanını da bulur. Yetkiyi istemciden gelen nesneye güvenerek vermemeliyiz.',
        expected: 'false\ntrue',
      },
      {
        id: 'schemes',
        file: 'profil-linki.js',
        language: 'JavaScript',
        level: 'Zor',
        topic: 'Bağlantı protokolü',
        prompt: 'Yalnızca https: bağlantıları kabul et. URL’nin hangi parçası protokolü verir?',
        code: 'const adresler = ["https://example.com",\n  "javascript:alert(1)"];\nconst guvenli = adresler.map(adres =>\n  new URL(adres).___ === "https:");\nconsole.log(JSON.stringify(guvenli));',
        options: ['host', 'protocol', 'pathname'],
        correct: 'protocol',
        explanation:
          'protocol şemayı iki noktasıyla verir. javascript: bu izin listesine girmez. URL metni bu atölyede hiçbir zaman çalıştırılmaz.',
        expected: '[true,false]',
      },
      {
        id: 'atomic-ticket',
        file: 'tek-gecis.sql',
        language: 'SQL',
        level: 'Usta',
        topic: 'Atomik bilet kullanımı',
        prompt:
          'Eşzamanlı iki girişte yalnızca ilk işlem bileti kullanabilsin. UPDATE koşulunu tamamla.',
        code: '-- ? parametresi bağlanır; metne eklenmez.\nUPDATE tickets\nSET used = 1\nWHERE id = ? ___\nRETURNING id;\n-- İkinci işlem 0 satır döndürmeli.',
        options: ['OR used = 0', 'AND used = 0', 'AND used = 1'],
        correct: 'AND used = 0',
        explanation:
          'Koşul ve güncelleme tek atomik işlemde birleşir. İlk işlem used alanını 1 yapar; ikincisi koşula uyan satır bulamaz. Sonuç satırı ayrıca kontrol edilmelidir.',
        expected: 'ilk: 1 satır\nikinci: 0 satır',
      },
      {
        id: 'bound-query',
        file: 'parametre.sql',
        language: 'SQL',
        level: 'Usta',
        topic: 'Parametreli sorgu',
        prompt: 'E-posta değerini ayrı bağla; SQL metnine birleştirme. Doğru yer tutucu hangisi?',
        code: '-- Girdi ayrı bind edilir.\nSELECT id FROM users\nWHERE email = ___;\n-- Bind: ["ece@example.test"]',
        options: ["'?'", '?', "'email'"],
        correct: '?',
        explanation:
          "Tırnaksız ? bir parametredir. '?' ise soru işareti karakterini içeren sabit metindir. Kullanıcı girdisi SQL metnine eklenmez.",
        expected: 'ece',
      },
    ],
  },
  {
    id: 'oyun',
    title: 'Oyun & Tasarım',
    short: 'Oyun',
    description: 'Fizik, çarpışma ve hareket hissi.',
    error: {
      code: 'PHYSICS_STATE_DIVERGED',
      module: 'bmk.run.physics',
      title: 'Fizik motoru durduruldu',
      message: 'Hareket hesabı beklenen dünya durumunun dışına çıktı.',
      steps: [
        'Oyun döngüsü donduruldu.',
        'Dinozor son güvenli konuma alınıyor.',
        'Fizik adımı yeniden başlatılıyor.',
      ],
    },
    questions: [
      {
        id: 'delta',
        file: 'hareket.js',
        language: 'JavaScript',
        level: 'Orta',
        topic: 'Kare hızından bağımsız hareket',
        prompt:
          'Hız saniyede 120 piksel. dt saniye cinsinden. 16 ms’lik karede yer değiştirme nasıl hesaplanır?',
        code: 'const hiz = 120, dt = 0.016;\nlet x = 0;\nx += hiz ___ dt;\nconsole.log(x.toFixed(2));',
        options: ['/', '*', '+'],
        correct: '*',
        explanation:
          'Mesafe = hız × zaman. Böylece yüksek veya düşük kare hızında aynı süre için aynı yol alınır.',
        expected: '1.92',
      },
      {
        id: 'cooldown',
        file: 'bekleme.js',
        language: 'JavaScript',
        level: 'Orta',
        topic: 'Sıfırda sınırlama',
        prompt: 'Bekleme süresi asla negatif olmasın. Eksik Math fonksiyonu hangisi?',
        code: 'let bekleme = 0.1;\nconst dt = 0.16;\nbekleme = Math.___(0, bekleme - dt);\nconsole.log(bekleme);',
        options: ['min', 'max', 'pow'],
        correct: 'max',
        explanation:
          'Math.max(0, değer) alt sınırı sıfırda tutar. min negatif değeri seçer; pow üs alma işlemidir ve bu sınırı uygulamaz.',
        expected: '0',
      },
      {
        id: 'diagonal',
        file: 'yon.js',
        language: 'JavaScript',
        level: 'Zor',
        topic: 'Vektör normalizasyonu',
        prompt: 'Çapraz harekette hız artmasın. Vektörün Öklid uzunluğunu hangi fonksiyon verir?',
        code: 'let dx = 1, dy = 1;\nconst uzunluk = Math.___(dx, dy);\ndx /= uzunluk; dy /= uzunluk;\nconsole.log(dx.toFixed(3), dy.toFixed(3));',
        options: ['max', 'hypot', 'pow'],
        correct: 'hypot',
        explanation:
          'hypot kareler toplamının karekökünü hesaplar. İki bileşen de yaklaşık 0.707 olur ve toplam hareket uzunluğu 1 kalır.',
        expected: '0.707 0.707',
      },
      {
        id: 'lerp',
        file: 'kamera.js',
        language: 'JavaScript',
        level: 'Zor',
        topic: 'Doğrusal interpolasyon',
        prompt: 'Kamera 20’den 100’e yolun %25’i kadar ilerlesin. t hangi terimle çarpılmalı?',
        code: 'const baslangic = 20, hedef = 100, t = 0.25;\nconst kamera = baslangic + ___ * t;\nconsole.log(kamera);',
        options: ['hedef', '(hedef - baslangic)', '(hedef + baslangic)'],
        correct: '(hedef - baslangic)',
        explanation: 'Lerp başlangıca farkın t kadarını ekler: 20 + 80 × 0.25 = 40.',
        expected: '40',
      },
      {
        id: 'edge-input',
        file: 'tus.js',
        language: 'JavaScript',
        level: 'Zor',
        topic: 'Tuşun ilk basıldığı kare',
        prompt: 'Basılı tutmak her karede zıplatmasın. Yalnızca false → true geçişi tetiklensin.',
        code: 'const kareler = [false, true, true, false, true];\nlet onceki = false, ziplama = 0;\nfor (const simdi of kareler) {\n  if (simdi ___ !onceki) ziplama++;\n  onceki = simdi;\n}\nconsole.log(ziplama);',
        options: ['||', '&&', '==='],
        correct: '&&',
        explanation:
          'Tuş şimdi basılı, önceki karede basılı değilse yeni bir basış vardır. Dizide bu geçiş iki kez olur.',
        expected: '2',
      },
      {
        id: 'aabb',
        file: 'carpisma.js',
        language: 'JavaScript',
        level: 'Zor',
        topic: 'AABB / iki eksen',
        prompt: 'İki eksende de örtüşme varsa çarpışma olsun. Koşulları nasıl birleştirirsin?',
        code: 'function carpisir(a, b) {\n  const x = a.x < b.x + b.w && a.x + a.w > b.x;\n  const y = a.y < b.y + b.h && a.y + a.h > b.y;\n  return x ___ y;\n}\nconsole.log(carpisir({x:0,y:0,w:4,h:4},\n  {x:2,y:8,w:4,h:4}));',
        options: ['||', '&&', '!=='],
        correct: '&&',
        explanation:
          'Yalnızca yatay örtüşme yeterli değildir. Bu örnekte dikey aralıklar ayrı olduğundan çarpışma false olmalıdır.',
        expected: 'false',
      },
      {
        id: 'swept',
        file: 'hizli-engel.js',
        language: 'JavaScript',
        level: 'Usta',
        topic: 'Tünelleme / geçiş denetimi',
        prompt:
          'Sağ kenar bir karede engelin çizgisini geçiyor. Önce soldayken şimdi sağa ulaştığını hangi koşul söyler?',
        code: 'const oncekiSag = 40, sonrakiSag = 90;\nconst engelX = 60;\nconst gecti = oncekiSag <= engelX && ___;\nconsole.log(gecti);',
        options: ['sonrakiSag <= engelX', 'sonrakiSag >= engelX', 'sonrakiSag === oncekiSag'],
        correct: 'sonrakiSag >= engelX',
        explanation:
          'Önceki ve sonraki konumu birlikte incelemek çizginin atlanmasını yakalar. Bu 1B örnekte dikey örtüşme varsayılır; tam oyun çarpışması daha fazla kontrol ister.',
        expected: 'true',
      },
      {
        id: 'fixed-step',
        file: 'fizik-adimi.js',
        language: 'JavaScript',
        level: 'Usta',
        topic: 'Sabit zaman adımı',
        prompt: 'Biriken süre kadar sabit fizik adımı çalışsın. Tek if yerine hangi döngü gerekir?',
        code: 'let biriken = 0.05, adim = 0;\nconst dt = 1 / 60;\n___ (biriken >= dt) {\n  biriken -= dt;\n  adim++;\n}\nconsole.log(adim);',
        options: ['if', 'while', 'switch'],
        correct: 'while',
        explanation:
          'Bir kare birden fazla fizik adımı gerektirebilir. while biriken süreyi tüketir. Gerçek oyunda aşırı birikmeye karşı adım sayısı da sınırlandırılır.',
        expected: '3',
      },
    ],
  },
];
export const QUESTION_COUNT = TRACKS.reduce((n, t) => n + t.questions.length, 0);
