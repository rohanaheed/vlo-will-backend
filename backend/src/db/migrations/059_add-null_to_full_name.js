const up = async (db) => {
    await db.schema
    .alterTable('executors')
    .alterColumn("full_name", (col) => col.dropNotNull())
    .execute()
}

const down = async (db) => {
    await db.schema
    .alterTable('executors')
    .alterColumn("full_name", (col) => col.setNotNull())
    .execute()
}

module.exports = { up, down }