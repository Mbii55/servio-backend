// src/config/database.ts
import dotenv from 'dotenv';
dotenv.config(); 

import { Pool } from 'pg';

if (!process.env.DB_PASSWORD) {
  console.warn('⚠️ DB_PASSWORD is not set in .env');
}

// Optional: debug log to see the type
console.log('DB_PASSWORD type:', typeof process.env.DB_PASSWORD);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'servio_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Simple connection test
export const testDbConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database connected successfully');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
  }
};

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

export default pool;
