declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
declare namespace Cloudflare {
  interface Env {
    BMK_ADMIN_EMAIL?: string;
  }
}
declare namespace Cloudflare {
  interface Env {
    RESEND_API_KEY?: string;
    BMK_MAIL_FROM?: string;
  }
}
