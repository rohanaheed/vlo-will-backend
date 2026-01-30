/**
 * Database Migration Runner
 * 
 * Usage:
 *   node src/db/migrate.js up     - Run all pending migrations
 *   node src/db/migrate.js down   - Rollback last migration
 *   node src/db/migrate.js reset  - Rollback all and re-run migrations
 */

const path = require('path');

// Load .env from backend folder
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const fs = require('fs');
const { Pool } = require('pg');
const { Kysely, PostgresDialect, sql } = require('kysely');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = new Kysely({
  dialect: new PostgresDialect({ pool }),
});

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Create migrations table if it doesn't exist
 */
const ensureMigrationsTable = async () => {
  await db.schema
    .createTable('kysely_migration')
    .ifNotExists()
    .addColumn('name', 'varchar(255)', (col) => col.primaryKey())
    .addColumn('timestamp', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();
};

/**
 * Get list of migration files
 */
const getMigrationFiles = () => {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  return files
    .filter((f) => f.endsWith('.js') && !f.startsWith('index'))
    .sort();
};

/**
 * Get applied migrations
 */
const getAppliedMigrations = async () => {
  const applied = await db
    .selectFrom('kysely_migration')
    .select('name')
    .orderBy('name')
    .execute();
  return applied.map((m) => m.name);
};

/**
 * Run pending migrations
 */
const migrateUp = async () => {
  await ensureMigrationsTable();

  const files = getMigrationFiles();
  const applied = await getAppliedMigrations();
  const pending = files.filter((f) => !applied.includes(f));

  if (pending.length === 0) {
    console.log('No pending migrations.');
    return;
  }

  console.log(`Running ${pending.length} migration(s)...\n`);

  for (const file of pending) {
    console.log(`Migrating: ${file}`);
    try {
      const migration = require(path.join(MIGRATIONS_DIR, file));
      await migration.up(db);

      await db
        .insertInto('kysely_migration')
        .values({ name: file })
        .execute();

      console.log(`✓ Completed: ${file}\n`);
    } catch (error) {
      console.error(`✗ Failed: ${file}`);
      console.error(error);
      throw error;
    }
  }

  console.log('All migrations completed successfully!');
};

/**
 * Rollback last migration
 */
const migrateDown = async () => {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();

  if (applied.length === 0) {
    console.log('No migrations to rollback.');
    return;
  }

  const lastMigration = applied[applied.length - 1];
  console.log(`Rolling back: ${lastMigration}`);

  try {
    const migration = require(path.join(MIGRATIONS_DIR, lastMigration));
    await migration.down(db);

    await db
      .deleteFrom('kysely_migration')
      .where('name', '=', lastMigration)
      .execute();

    console.log(`✓ Rolled back: ${lastMigration}`);
  } catch (error) {
    console.error(`✗ Rollback failed: ${lastMigration}`);
    console.error(error);
    throw error;
  }
};

/**
 * Reset database (rollback all and re-run)
 */
const migrateReset = async () => {
  console.log('Resetting database...\n');

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  // Rollback all in reverse order
  for (let i = applied.length - 1; i >= 0; i--) {
    const file = applied[i];
    console.log(`Rolling back: ${file}`);
    try {
      const migration = require(path.join(MIGRATIONS_DIR, file));
      await migration.down(db);

      await db
        .deleteFrom('kysely_migration')
        .where('name', '=', file)
        .execute();

      console.log(`✓ Rolled back: ${file}\n`);
    } catch (error) {
      console.error(`✗ Rollback failed: ${file}`);
      console.error(error);
      throw error;
    }
  }

  // Run all migrations
  await migrateUp();
};

/**
 * Main
 */
const main = async () => {
  const command = process.argv[2] || 'up';

  try {
    switch (command) {
      case 'up':
        await migrateUp();
        break;
      case 'down':
        await migrateDown();
        break;
      case 'reset':
        await migrateReset();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Usage: node migrate.js [up|down|reset]');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
    // Note: db.destroy() already closes the pool, no need to call pool.end()
  }
};

main();
