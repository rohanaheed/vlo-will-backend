require('dotenv').config();

module.exports = {
  dialect: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: {
    migrationFolder: './src/db/migrations',
  },
  seeds: {
    seedFolder: './src/db/seeds',
  },
};
