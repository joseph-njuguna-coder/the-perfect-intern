import knex from 'knex';
import pg from 'pg';
import { env } from './env.js';

// Return DATE columns as plain 'YYYY-MM-DD' strings (avoids timezone shifts from JS Date parsing).
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({ connectionString: env.databaseUrl, max: 10 });
export const db = knex({ client: 'pg', connection: env.databaseUrl, pool: { min: 1, max: 10 } });
