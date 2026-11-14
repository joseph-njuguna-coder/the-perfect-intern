import 'dotenv/config';

export default {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 1, max: 10 },
  migrations: { directory: './src/database/migrations' },
  seeds: { directory: './src/database/seeds' },
};
