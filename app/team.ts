export type TeamProfile = {
  slug: string;
  role: string;
  group: string;
  index: string;
  symbol: string;
  accent: string;
  headline: string;
  description: string;
  tags: string[];
};
// Design slots, not a published member roster. Replace only with approved member information.
export const teamProfiles: TeamProfile[] = [
  {
    slug: 'baskanlik',
    role: 'Kulüp Başkanı',
    group: 'Yönetim',
    index: '01',
    symbol: '✳',
    accent: '#c8f58c',
    headline: 'Bir fikir.\nBir ekip.\nBir başlangıç.',
    description:
      'Kulübün ortak yönünü belirleyen, insanları ve fikirleri bir araya getiren başkanlık profili.',
    tags: ['Topluluk', 'Koordinasyon', 'Birlikte üretmek'],
  },
  {
    slug: 'koordinasyon',
    role: 'Genel Koordinasyon',
    group: 'Yönetim',
    index: '02',
    symbol: '↗',
    accent: '#c3c9f3',
    headline: 'Her parçayı\nbir araya\ngetirmek.',
    description:
      'Ekipler arasındaki iletişimi ve kulübün çalışma düzenini tanıtmak için hazırlanan profil alanı.',
    tags: ['Planlama', 'Ekip çalışması', 'İletişim'],
  },
  {
    slug: 'yazilim',
    role: 'Yazılım Ekibi',
    group: 'Teknik',
    index: '03',
    symbol: '⌘',
    accent: '#a9d9d7',
    headline: 'İlk satırdan\nçalışan\nbir fikre.',
    description:
      'Kod, ürün geliştirme ve teknik projelerin arkasındaki ekip üyelerine ayrılan profil alanı.',
    tags: ['Web', 'Açık kaynak', 'Ürün geliştirme'],
  },
  {
    slug: 'tasarim',
    role: 'Tasarım & Medya',
    group: 'Yaratıcı',
    index: '04',
    symbol: '✴',
    accent: '#e4b5a0',
    headline: 'Fikirlerin\ngörünür\nhâli.',
    description:
      'Kulübün görsel dünyasını, hikâyelerini ve iletişimini üreten üyeler için hazırlanan profil alanı.',
    tags: ['Görsel iletişim', 'Tasarım', 'Hikâye anlatımı'],
  },
  {
    slug: 'etkinlik',
    role: 'Etkinlik Ekibi',
    group: 'Topluluk',
    index: '05',
    symbol: '◎',
    accent: '#e4d799',
    headline: 'Bir merhaba.\nBin yeni\nihtimal.',
    description:
      'Buluşmaları, atölyeleri ve kampüsteki karşılaşmaları düzenleyen üyelerin tanıtım alanı.',
    tags: ['Etkinlik', 'Atölye', 'Organizasyon'],
  },
  {
    slug: 'topluluk',
    role: 'Topluluk İlişkileri',
    group: 'Topluluk',
    index: '06',
    symbol: '⤴',
    accent: '#b7cba0',
    headline: 'Bağ kur.\nPaylaş.\nBirlikte büyü.',
    description:
      'Üyeler, diğer topluluklar ve iş birlikleri arasındaki bağları tanıtmak için hazırlanan profil alanı.',
    tags: ['İş birliği', 'İletişim', 'Paylaşım'],
  },
];
