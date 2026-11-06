import { env } from 'cloudflare:workers';

export function recoveryMailConfigured() {
  const from = env.BMK_MAIL_FROM?.trim() || '';
  return !!env.RESEND_API_KEY?.trim() && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from);
}

function template(title: string, content: string) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#eeede6;color:#23382d;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:40px 16px"><table role="presentation" width="520" style="width:100%;max-width:520px;background:#fffef8;border:1px solid #d6dbcf" cellspacing="0" cellpadding="0"><tr><td style="padding:28px 32px;background:#162c23;color:#e6ebdc;font-size:24px;font-weight:bold;letter-spacing:-1px">SCÜ BMK</td></tr><tr><td style="padding:36px 32px"><h1 style="font-size:28px;font-weight:500;letter-spacing:-1px;margin:0 0 24px">${title}</h1>${content}<p style="font-size:12px;line-height:1.8;color:#798373;border-top:1px solid #e1e4d9;padding-top:24px;margin-top:32px">Sivas Cumhuriyet Üniversitesi<br>Bilgisayar Mühendisliği Kulübü</p></td></tr></table></td></tr></table></body></html>`;
}

async function send(to: string, subject: string, html: string, text: string, key: string) {
  if (!recoveryMailConfigured()) throw Error('Mail unavailable');
  const payload = JSON.stringify({
    from: `SCÜ BMK <${env.BMK_MAIL_FROM!.trim()}>`,
    to: [to],
    subject,
    html,
    text,
  });
  // The same key and payload prevent duplicate messages during a transient retry.
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY!.trim()}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        body: payload,
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      if (attempt === 0) continue;
      throw Error('Mail delivery failed');
    }
    if (response.ok) {
      const result = (await response.json()) as { id?: string };
      if (result.id) return;
      throw Error('Invalid mail response');
    }
    if (attempt === 0 && (response.status === 429 || response.status >= 500)) continue;
    throw Error('Mail delivery rejected');
  }
}

export function sendRecoveryCode(to: string, code: string, key: string) {
  const html = template(
    'Şifreni yenile.',
    `<p style="font-size:15px;line-height:1.8">Hesabına yeniden ulaşmak için bu kodu şifre yenileme ekranına yaz:</p><p style="padding:24px 12px;background:#eff1e8;border:1px solid #d7dfca;text-align:center;font:32px monospace;letter-spacing:10px;color:#203b2b">${code}</p><p style="font-size:14px;line-height:1.8">Kodun <strong>10 dakika</strong> geçerli ve yalnızca bir kez kullanılabilir. Kodunu kimseyle paylaşma.</p><p style="font-size:13px;line-height:1.8;color:#77816f">Bu isteği sen yapmadıysan e-postayı dikkate alma. Hesabında bir değişiklik yapılmadı.</p>`,
  );
  return send(
    to,
    'SCÜ BMK · Şifre yenileme kodun',
    html,
    `SCÜ BMK şifre yenileme kodun: ${code}\n\nKod 10 dakika geçerlidir ve tek kullanımlıktır. Kimseyle paylaşma.\nBu isteği sen yapmadıysan e-postayı dikkate alma; hesabında bir değişiklik yapılmadı.`,
    key,
  );
}

export function sendPasswordChanged(to: string, key: string) {
  return send(
    to,
    'SCÜ BMK · Şifren yenilendi',
    template(
      'Şifren yenilendi.',
      `<p style="font-size:15px;line-height:1.8">Kulüp hesabının şifresi başarıyla değiştirildi. Güvenliğin için açık oturumların kapatıldı. Yeni şifrenle tekrar giriş yapabilirsin.</p><p style="font-size:14px;line-height:1.8">Bu işlemi sen yapmadıysan kulüp yönetimine hemen ulaş.</p>`,
    ),
    'SCÜ BMK hesabının şifresi değiştirildi. Tüm açık oturumların kapatıldı. Yeni şifrenle giriş yapabilirsin. Bu işlemi sen yapmadıysan kulüp yönetimine hemen ulaş.',
    key,
  );
}
