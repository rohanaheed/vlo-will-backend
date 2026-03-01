const up = async (db) => {
    await db.schema
    .alterTable("wills")
    .addColumn("pdf_path", "text")
    .execute();
};

const down = async (db) => {
    await db.schema
    .alterTable("wills")
    .dropColumn("pdf_path")
    .execute();
};

module.exports = { up, down };  