// Local synthetic fixtures only. Never accepts a remote URL or a production DB path.
import { cpSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const target = 'outputs/stress-state-v21';
if (existsSync(target))
  throw Error('Use a fresh stress directory; existing data will not be overwritten.');
cpSync('outputs/team-state', target, { recursive: true });
writeFileSync(target + '/LOCAL-QA-ONLY', 'Synthetic local load test. Do not deploy.\n');
const dir = target + '/v3/d1/miniflare-D1DatabaseObject',
  files = readdirSync(dir).filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
if (files.length !== 1) throw Error('Ambiguous QA database');
const db = new DatabaseSync(dir + '/' + files[0]),
  now = Date.now();
db.exec('BEGIN');
try {
  const event = db.prepare(
    "INSERT INTO events (id,title,description,category,date,location,capacity,published,registration_open,created_at,updated_at) VALUES(?,?,?,'Atölye',?,'Yerel test salonu',10000,?,1,?,?)",
  );
  for (let i = 0; i < 1000; i++)
    event.run(
      'stress-event-' + i,
      'Yük Testi ' + i,
      'Tamamen sentetik test etkinliği.',
      new Date(now + (i + 1) * 86400000).toISOString(),
      i < 20 ? 1 : 0,
      now,
      now,
    );
  const account = db.prepare(
    "INSERT INTO club_accounts (id,email,name,password_hash,member_no,card_code,recovery_hash,active,created_at,updated_at) VALUES(?,?,?,'disabled-test-credential',?,?,?,0,?,?)",
  );
  for (let i = 0; i < 10000; i++)
    account.run(
      'stress-account-' + i,
      'load' + i + '@example.test',
      'Sentetik Üye ' + i,
      'LOAD-' + i,
      'stress-card-' + i,
      'not-a-secret-' + i,
      now - i,
      now - i,
    );
  const reg = db.prepare(
    "INSERT INTO registrations (id,event_id,event_title,event_date,event_location,name,email,department,year,answer,token_hash,checkin_hash,created_at) VALUES(?,?,?,'2027-01-01T12:00:00Z','Yerel','Sentetik Katılımcı',?,'Test','1. sınıf','Sentetik veri',?,?,?)",
  );
  for (let i = 0; i < 30000; i++)
    reg.run(
      'stress-registration-' + i,
      'stress-event-' + (i % 1000),
      'Yük Testi ' + (i % 1000),
      'load' + i + '@example.test',
      'stress-token-hash-' + i,
      'stress-checkin-hash-' + i,
      now - i,
    );
  const member = db.prepare(
    "INSERT INTO members(id,name,slug,role,team,published,created_at,updated_at) VALUES(?,?,?,'Üye','Test',0,?,?)",
  );
  for (let i = 0; i < 1000; i++)
    member.run('stress-profile-' + i, 'Test Profili ' + i, 'stress-profile-' + i, now, now);
  db.exec('COMMIT');
  console.log(
    'Seeded 1,000 events, 10,000 accounts, 30,000 registrations and 1,000 profiles in isolated local storage.',
  );
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
} finally {
  db.close();
}
