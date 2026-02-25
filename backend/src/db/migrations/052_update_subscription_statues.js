const { sql } = require('kysely');

const up = async (db) => {
  await sql`ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'canceled'`.execute(db);
  await sql`ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trialing'`.execute(db);
  await sql`ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'incomplete'`.execute(db);
  await sql`ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'incomplete_expired'`.execute(db);
  await sql`ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'unpaid'`.execute(db);
  await sql`ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'paused'`.execute(db);
};

const down = async (db) => {
  await sql`ALTER TYPE subscription_status RENAME TO subscription_status_old`.execute(db);
  await sql`CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'expired')`.execute(db);
  await sql`
    ALTER TABLE subscriptions 
    ALTER COLUMN status TYPE subscription_status 
    USING (
      CASE 
        WHEN status::text IN ('active', 'cancelled', 'past_due', 'expired') 
          THEN status::text::subscription_status
        ELSE 'active'::subscription_status
      END
    )
  `.execute(db);

  await sql`DROP TYPE subscription_status_old`.execute(db);
};

module.exports = { up, down };