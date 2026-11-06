import { ticketDate } from './ticket-format';
type ImageTicket = {
  id: string;
  title: string;
  name: string;
  date: string;
  location: string;
  demo: number;
  checkedInAt: number | null;
};
export async function createTicketImage(ticket: ImageTicket, qr: string): Promise<Blob> {
  const canvas = document.createElement('canvas'),
    c = canvas.getContext('2d');
  if (!c) throw Error('Canvas unavailable');
  const lines = (text: string, max: number, font: string) => {
    c.font = font;
    const result: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
      if (c.measureText((line ? line + ' ' : '') + word).width > max && line) {
        result.push(line);
        line = '';
      }
      for (const letter of word) {
        if (c.measureText(line + letter).width > max) {
          result.push(line);
          line = '';
        }
        line += letter;
      }
      line += ' ';
    }
    if (line.trim()) result.push(line.trim());
    return result;
  };
  const title = lines(ticket.title, 714, '500 52px sans-serif'),
    place = lines(ticket.location, 714, '25px sans-serif'),
    name = lines(ticket.name, 640, '500 34px sans-serif');
  const split = 550 + title.length * 60 + place.length * 34 + name.length * 42;
  canvas.width = 850;
  canvas.height = split + 900;
  c.fillStyle = '#fffef7';
  c.fillRect(0, 0, 850, canvas.height);
  c.fillStyle = '#163824';
  c.fillRect(0, 0, 850, split);
  const dino = (x: number, y: number, size: number, color: string) => {
    c.save();
    c.translate(x, y);
    c.scale(size / 24, size / 24);
    c.fillStyle = color;
    c.fill(
      new Path2D(
        'M2 8h2v4h2v2h5v-2h2v6H8v-2H4v-2H2zM12 8h4v10h-3v2h-3v-3H8v1H6v-4h4v-2h2zM13 2h9v8h-7v2h-3V4h1zM14 12h5v2h-1v-1h-4zM6 17h2v5H5v-2h1zM11 17h2v4h1v1h-4v-2h1z',
      ),
    );
    c.fillStyle = '#163824';
    c.fillRect(16, 4, 2, 2);
    c.restore();
  };
  dino(65, 55, 46, '#cbb77f');
  c.fillStyle = '#fffef1';
  c.font = '600 29px sans-serif';
  c.fillText('SCÜ BMK', 128, 89);
  c.fillStyle = '#cbb77f';
  c.font = '16px monospace';
  c.textAlign = 'right';
  c.fillText('ETKİNLİK BİLETİ', 782, 84);
  c.textAlign = 'left';
  c.fillStyle = '#b5c4ae';
  c.font = '16px monospace';
  c.fillText('BİRLİKTE, AYNI YERDE.', 68, 156);
  let y = 220;
  c.fillStyle = '#fffef1';
  c.font = '500 52px sans-serif';
  for (const line of title) {
    c.fillText(line, 68, y);
    y += 60;
  }
  y += 24;
  c.fillStyle = '#b5c4ae';
  c.font = '18px sans-serif';
  c.fillText('TARİH VE SAAT', 68, y);
  y += 36;
  c.fillStyle = '#fffef1';
  c.font = '25px sans-serif';
  c.fillText(ticketDate(ticket.date), 68, y, 714);
  y += 53;
  c.fillStyle = '#b5c4ae';
  c.font = '18px sans-serif';
  c.fillText('BULUŞMA YERİ', 68, y);
  y += 36;
  c.fillStyle = '#fffef1';
  c.font = '25px sans-serif';
  for (const line of place) {
    c.fillText(line, 68, y);
    y += 34;
  }
  y += 15;
  c.strokeStyle = '#c5d6b640';
  c.beginPath();
  c.moveTo(68, y);
  c.lineTo(782, y);
  c.stroke();
  y += 38;
  c.fillStyle = '#b5c4ae';
  c.font = '16px monospace';
  c.fillText('KATILIMCI', 68, y);
  y += 43;
  c.font = '500 34px sans-serif';
  c.fillStyle = '#fffef1';
  for (const line of name) {
    c.fillText(line, 68, y);
    y += 42;
  }
  dino(710, y - 58, 62, '#cbb77f');
  c.fillStyle = '#b5c4ae';
  c.font = '15px sans-serif';
  c.fillText('Sivas Cumhuriyet Üniversitesi · Bilgisayar Mühendisliği Kulübü', 68, split - 37, 714);
  c.setLineDash([9, 9]);
  c.strokeStyle = '#b9baa6';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(0, split);
  c.lineTo(850, split);
  c.stroke();
  c.setLineDash([]);
  for (const x of [0, 850]) {
    c.beginPath();
    c.arc(x, split, 17, 0, Math.PI * 2);
    c.fillStyle = '#e9ebdf';
    c.fill();
  }
  c.textAlign = 'center';
  c.fillStyle = '#365b35';
  c.font = '500 20px sans-serif';
  c.fillText(
    ticket.checkedInAt ? 'GİRİŞ YAPILDI' : ticket.demo ? 'DENEME BİLETİ' : 'GİRİŞE HAZIR',
    425,
    split + 61,
  );
  const image = new Image();
  image.src = qr;
  await image.decode();
  c.imageSmoothingEnabled = false;
  c.drawImage(image, 150, split + 85, 550, 550);
  c.fillStyle = '#163824';
  c.font = '500 31px sans-serif';
  c.fillText('Kapıda görüşürüz.', 425, split + 672);
  c.fillStyle = '#6f7b65';
  c.font = '21px sans-serif';
  c.fillText(
    'QR kodunu görevliye göster. Her bilet tek giriş için geçerli.',
    425,
    split + 712,
    714,
  );
  c.strokeStyle = '#dfe2d2';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(68, split + 756);
  c.lineTo(782, split + 756);
  c.stroke();
  c.font = '16px monospace';
  c.fillText('BİLET NO', 425, split + 790);
  c.fillStyle = '#163824';
  c.font = '23px monospace';
  c.fillText('BMK–' + ticket.id.slice(0, 8).toUpperCase(), 425, split + 828);
  if (ticket.demo) {
    c.font = '14px sans-serif';
    c.fillText('Deneme bileti · Resmî etkinliğe katılım hakkı sağlamaz.', 425, split + 872);
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(Error('Image could not be created'))),
      'image/png',
    ),
  );
}
