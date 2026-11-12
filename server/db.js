import mysql from 'mysql2/promise';

export function dbConfig() {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (!DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error('Điền DB_NAME, DB_USER và DB_PASSWORD trong .env.');
  }
  return {
    host: DB_HOST || '127.0.0.1',
    port: Number(DB_PORT || 3306),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    charset: 'utf8mb4',
    connectTimeout: 5000,
  };
}

export const createPool = () => mysql.createPool({ ...dbConfig(), connectionLimit: 5 });
