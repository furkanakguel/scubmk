# Chatbot alanı

Sorumlular: **@enesayd07** ve **@taylandenizdev**. Genel inceleme: **@VoskaDev**, **@IVeridisQuo**.

Bu klasör geliştirme iskeletidir; şu anda canlı chatbot sunmaz.

| Dosya / dizin       | Sorumluluk                                        |
| ------------------- | ------------------------------------------------- |
| `contracts.ts`      | İstek, cevap ve public bağlam tipleri/doğrulaması |
| `public-context.ts` | Özel alanları dışarıda bırakan saf veri seçimi    |
| `server/context.ts` | Sunucuda public içerik okuma                      |
| `server/`           | Eklenecek sağlayıcı, timeout ve cevap üretimi     |
| `ui/`               | Eklenecek konuşma bileşenleri                     |

Ayrıntılı görev ve güvenlik sınırları: [Chatbot rehberi](../../docs/CHATBOT.md).

Kontrol: `npm run test:chatbot`.
