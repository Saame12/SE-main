import mysql from 'mysql2/promise';
import { dbConfig } from '../server/db.js';
let connection;
try {
  connection = await mysql.createConnection(dbConfig());
  const [[info]] = await connection.query(
    'SELECT VERSION() AS version,@@port AS port,DATABASE() AS name,CURRENT_USER() AS user',
  );
  const [[counts]] = await connection.query(
    'SELECT (SELECT COUNT(*) FROM categories) AS categories,(SELECT COUNT(*) FROM brands) AS brands,(SELECT COUNT(*) FROM products) AS products,(SELECT COUNT(*) FROM locations) AS locations,(SELECT COUNT(*) FROM users) AS users,(SELECT COUNT(*) FROM orders) AS orders',
  );
  const [[migration]] = await connection.query(
    "SELECT version FROM schema_migrations WHERE version='2.0.0'",
  );
  if (!migration) throw new Error('Chưa chạy migration v2. Chạy npm run db:setup.');
  console.log(JSON.stringify({ ...info, ...counts, schema: migration.version }, null, 2));
} catch (error) {
  console.error('Không kết nối được database:', error.code || error.message);
  process.exitCode = 1;
} finally {
  await connection?.end();
}
