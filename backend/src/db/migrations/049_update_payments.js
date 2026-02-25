const { sql } = require("kysely");

const up = async (db) => {
  await db.schema
    .alterTable("payments")
    .dropColumn("subscription_id")
    
    .addColumn("invoice_id", 'varchar(255)')
    .addColumn("payment_method", "varchar(50)")
    .addColumn("notes", "text")
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable("payments").execute();
};

module.exports = { up, down };
