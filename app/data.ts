export type ClubEvent = {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  location: string;
  capacity: number;
  published: number;
  question: string;
  demo?: boolean;
  count?: number;
  details?: string;
  image_id?: string;
  image_alt?: string;
  registration_open?: number;
  archived?: number;
};
export const demoEvents: ClubEvent[] = [
  {
    id: 'demo-hello',
    title: 'Hello, BMK!',
    description:
      'Yeni dönemin ilk satırını birlikte yazıyoruz. Toplulukla tanış, ekipleri keşfet ve kendi yolculuğuna başla.',
    category: 'Buluşma',
    date: '2026-11-06T18:00:00+03:00',
    location: 'Mühendislik Fakültesi · örnek mekân',
    capacity: 120,
    published: 1,
    question: 'En çok hangi alanda üretmek istiyorsun?',
    demo: true,
  },
  {
    id: 'demo-web',
    title: 'Fikirden ilk deploy’a.',
    description:
      'Bir fikri tarayıcıda yaşayan bir ürüne dönüştür. Tasarımdan geliştirmeye uygulamalı bir web atölyesi.',
    category: 'Atölye',
    date: '2026-11-13T17:00:00+03:00',
    location: 'Bilgisayar Laboratuvarı · örnek mekân',
    capacity: 40,
    published: 1,
    question: 'Daha önce bir web projesi geliştirdin mi?',
    demo: true,
  },
  {
    id: 'demo-build',
    title: 'Build together.',
    description:
      'Bilgisayarını ve merakını getir. Küçük ekipler, açık fikirler ve birlikte üretmeye ayrılmış bir gün.',
    category: 'Hackathon',
    date: '2026-11-21T10:00:00+03:00',
    location: 'Kampüs · örnek mekân',
    capacity: 80,
    published: 1,
    question: 'Üzerinde çalışmak istediğin bir fikir var mı?',
    demo: true,
  },
];
export const membership: ClubEvent = {
  id: 'membership',
  title: 'BMK topluluğuna katıl',
  description: 'Kulübe katılmak için aşağıdaki formu doldurabilirsin.',
  category: 'Üyelik',
  date: '',
  location: 'Sivas Cumhuriyet Üniversitesi',
  capacity: 10000,
  published: 1,
  question: 'Hangi konularla ilgileniyorsun?',
  demo: false,
};
export function dateLabel(date: string) {
  return date
    ? new Date(date).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Istanbul',
      })
    : 'Kulüp üyeliği';
}
