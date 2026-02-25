const up = async (db) => {
  await db.schema
    .alterTable("invoices")
    .dropColumn("package_id")
    .addColumn("package_id", "uuid", (col) =>
      col.references("packages.id").onDelete("set null"),
    )
    .execute();

  await db.schema
    .alterTable("subscriptions")
    .dropColumn("package_id")
    .addColumn("package_id", "uuid", (col) =>
      col.references("packages.id").onDelete("set null"),
    )
    .execute();
};

const down = async (db) => {
  await db.schema.alterTable("invoices").dropColumn("package_id").execute();

  await db.schema
    .alterTable("subscriptions")
    .dropColumn("package_id")
    .addColumn("package_id", "varchar(255)", (col) => col.notNull())
    .execute();
};

module.exports = { up, down };
