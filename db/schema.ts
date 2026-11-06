import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    date: text('date').notNull(),
    location: text('location').notNull(),
    capacity: integer('capacity').notNull(),
    published: integer('published').notNull().default(1),
    question: text('question').notNull().default(''),
    createdAt: integer('created_at').notNull(),
    details: text('details').notNull().default(''),
    imageId: text('image_id').notNull().default(''),
    imageAlt: text('image_alt').notNull().default(''),
    registrationOpen: integer('registration_open').notNull().default(1),
    archived: integer('archived').notNull().default(0),
    updatedAt: integer('updated_at').notNull().default(0),
  },
  (t) => [index('events_visible_date').on(t.published, t.archived, t.date)],
);
export const registrations = sqliteTable(
  'registrations',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull(),
    eventTitle: text('event_title').notNull(),
    eventDate: text('event_date').notNull(),
    eventLocation: text('event_location').notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    department: text('department').notNull(),
    year: text('year').notNull(),
    answer: text('answer').notNull(),
    tokenHash: text('token_hash').notNull(),
    checkinHash: text('checkin_hash').notNull(),
    demo: integer('demo').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    checkedInAt: integer('checked_in_at'),
  },
  (t) => [
    uniqueIndex('registrations_event_email').on(t.eventId, t.email),
    uniqueIndex('registrations_token').on(t.tokenHash),
    uniqueIndex('registrations_checkin').on(t.checkinHash),
    index('registrations_event').on(t.eventId),
    index('registrations_created').on(t.demo, t.createdAt),
    index('registrations_event_created').on(t.demo, t.eventId, t.createdAt),
  ],
);
export const rateLimits = sqliteTable(
  'rate_limits',
  {
    key: text('key').primaryKey(),
    count: integer('count').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [index('rate_limits_expiry').on(t.expiresAt)],
);
export const members = sqliteTable(
  'members',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    role: text('role').notNull(),
    team: text('team').notNull(),
    email: text('email').notNull().default(''),
    department: text('department').notNull().default(''),
    year: text('year').notNull().default(''),
    bio: text('bio').notNull().default(''),
    photoId: text('photo_id').notNull().default(''),
    photoAlt: text('photo_alt').notNull().default(''),
    links: text('links').notNull().default('[]'),
    skills: text('skills').notNull().default('[]'),
    published: integer('published').notNull().default(0),
    archived: integer('archived').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('members_slug').on(t.slug),
    index('members_public').on(t.published, t.archived),
  ],
);
export const media = sqliteTable(
  'media',
  {
    archived: integer('archived').notNull().default(0),
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    size: integer('size').notNull(),
    createdAt: integer('created_at').notNull(),
    uploadedBy: text('uploaded_by').notNull(),
  },
  (t) => [index('media_created').on(t.createdAt)],
);
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
export const adminUsers = sqliteTable(
  'admin_users',
  {
    authVersion: integer('auth_version').notNull().default(0),
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull(),
    active: integer('active').notNull().default(1),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('admin_users_email').on(t.email)],
);
export const adminSessions = sqliteTable(
  'admin_sessions',
  {
    authVersion: integer('auth_version').notNull().default(0),
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id').notNull(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('admin_sessions_user').on(t.userId),
    index('admin_sessions_expiry').on(t.expiresAt),
  ],
);
export const adminInvites = sqliteTable(
  'admin_invites',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull(),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('admin_invites_token').on(t.tokenHash),
    index('admin_invites_expiry').on(t.expiresAt),
  ],
);
export const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').notNull(),
    actorName: text('actor_name').notNull(),
    action: text('action').notNull(),
    target: text('target').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('audit_created').on(t.createdAt)],
);
// Membership is separate from both public team biographies and CMS permissions.
export const clubAccounts = sqliteTable(
  'club_accounts',
  {
    authVersion: integer('auth_version').notNull().default(0),
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    department: text('department').notNull().default(''),
    clubRole: text('club_role').notNull().default('member'),
    cardStyle: text('card_style').notNull().default('forest'),
    memberNo: text('member_no').notNull(),
    cardCode: text('card_code').notNull(),
    recoveryHash: text('recovery_hash').notNull(),
    resetHash: text('reset_hash'),
    resetExpires: integer('reset_expires'),
    active: integer('active').notNull().default(1),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('club_email').on(t.email),
    uniqueIndex('club_member_no').on(t.memberNo),
    uniqueIndex('club_card_code').on(t.cardCode),
    index('club_role_created').on(t.clubRole, t.createdAt),
  ],
);
export const clubSessions = sqliteTable(
  'club_sessions',
  {
    authVersion: integer('auth_version').notNull().default(0),
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id').notNull(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('club_sessions_user').on(t.userId), index('club_sessions_expiry').on(t.expiresAt)],
);
export const clubPasswordResets = sqliteTable(
  'club_password_resets',
  {
    challengeHash: text('challenge_hash').primaryKey(),
    userId: text('user_id'),
    credentialHash: text('credential_hash').notNull(),
    codeHash: text('code_hash').notNull(),
    deliveryStatus: text('delivery_status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: integer('expires_at').notNull(),
    verifiedHash: text('verified_hash'),
    verifiedExpiresAt: integer('verified_expires_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('club_reset_verified').on(t.verifiedHash),
    index('club_reset_user').on(t.userId),
    index('club_reset_expiry').on(t.expiresAt),
  ],
);
// Daily BMK Run: server-issued runs and one best score per browser/day.
export const gameRuns = sqliteTable(
  'game_runs',
  {
    id: text('id').primaryKey(),
    playerHash: text('player_hash').notNull(),
    day: text('day').notNull(),
    seed: integer('seed').notNull(),
    version: integer('version').notNull(),
    startedAt: integer('started_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at'),
    verifiedTick: integer('verified_tick').notNull().default(0),
    checkpoint: text('checkpoint'),
    checkpointHash: text('checkpoint_hash'),
  },
  (t) => [index('game_runs_expiry').on(t.expiresAt)],
);
export const gameScores = sqliteTable(
  'game_scores',
  {
    hidden: integer('hidden').notNull().default(0),
    id: text('id').primaryKey(),
    playerHash: text('player_hash').notNull(),
    day: text('day').notNull(),
    version: integer('version').notNull().default(2),
    nickname: text('nickname').notNull(),
    score: integer('score').notNull(),
    ticks: integer('ticks').notNull(),
    bits: integer('bits').notNull(),
    chain: integer('chain').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('game_daily_player').on(t.day, t.version, t.playerHash),
    index('game_daily_score').on(t.day, t.version, t.score),
  ],
);
