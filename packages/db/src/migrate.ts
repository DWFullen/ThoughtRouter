import postgres from 'postgres';
import { readFile } from 'node:fs/promises';

const run = async () => {
  const connection = process.env.DATABASE_URL ?? 'postgresql://postgres@localhost:5432/thoughtrouter';
  const client = postgres(connection, { max: 1 });
  const sql = await readFile(new URL('./migrations/0000_init.sql', import.meta.url), 'utf8');
  await client.unsafe(sql);
  await client.end();
};

run();
