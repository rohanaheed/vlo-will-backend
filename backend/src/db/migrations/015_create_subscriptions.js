/**
 * Migration: Create subscriptions and payments tables
 */

const { sql } = require('kysely');

const createEnumIfNotExists = async (db, typeName, values) => {
  const valuesStr = values.map(v => `'${v}'`).join(', ');
  await sql`
    DO $$ BEGIN
      CREATE TYPE ${sql.raw(typeName)} AS ENUM (${sql.raw(valuesStr)});
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `.execute(db);
};

const up = async (db) => {
  // Create enums
  await createEnumIfNotExists(db, 'subscription_plan', ['basic', 'premium', 'professional']);
  await createEnumIfNotExists(db, 'subscription_status', ['active', 'cancelled', 'past_due', 'expired']);
  await createEnumIfNotExists(db, 'payment_status', ['pending', 'succeeded', 'failed', 'refunded']);

  // Create subscriptions table
  await db.schema
    .createTable('subscriptions')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => 
      col.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('stripe_customer_id', 'varchar(255)')
    .addColumn('stripe_subscription_id', 'varchar(255)')
    .addColumn('plan_type', sql`subscription_plan`, (col) => col.notNull())
    .addColumn('status', sql`subscription_status`, (col) => col.notNull())
    .addColumn('current_period_start', 'timestamptz')
    .addColumn('current_period_end', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create payments table
  await db.schema
    .createTable('payments')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => 
      col.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('subscription_id', 'uuid', (col) => 
      col.references('subscriptions.id').onDelete('set null')
    )
    .addColumn('stripe_payment_intent_id', 'varchar(255)')
    .addColumn('amount', sql`decimal(10,2)`, (col) => col.notNull())
    .addColumn('currency', 'varchar(3)', (col) => col.defaultTo('GBP').notNull())
    .addColumn('status', sql`payment_status`, (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create indexes
  await db.schema
    .createIndex('idx_subscriptions_user_id')
    .ifNotExists()
    .on('subscriptions')
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_subscriptions_stripe_subscription_id')
    .ifNotExists()
    .on('subscriptions')
    .column('stripe_subscription_id')
    .execute();

  await db.schema
    .createIndex('idx_payments_user_id')
    .ifNotExists()
    .on('payments')
    .column('user_id')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('payments').ifExists().execute();
  await db.schema.dropTable('subscriptions').ifExists().execute();
  await db.schema.dropType('payment_status').ifExists().execute();
  await db.schema.dropType('subscription_status').ifExists().execute();
  await db.schema.dropType('subscription_plan').ifExists().execute();
};

module.exports = { up, down };
