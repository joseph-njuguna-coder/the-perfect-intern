/** Phase 8: record when an account was erased at the user's request (the row is kept, anonymised, for payment/audit integrity). */
export async function up(knex) {
  await knex.raw('ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ');
}
export async function down(knex) {
  await knex.raw('ALTER TABLE users DROP COLUMN IF EXISTS deleted_at');
}
