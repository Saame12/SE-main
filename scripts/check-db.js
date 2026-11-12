import mysql from 'mysql2/promise';
import { dbConfig } from '../server/db.js';
let connection;
try {
  connection = await mysql.createConnection(dbConfig());
  const [[info]] = await connection.query('SELECT VERSION() AS version, @@port AS port, DATABASE() AS name, CURRENT_USER() AS user');
  const [[counts]] = await connection.query('SELECT (SELECT COUNT(*) FROM categories) AS categories, (SELECT COUNT(*) FROM brands) AS brands, (SELECT COUNT(*) FROM products) AS products');
  console.log(JSON.stringify({ ...info, ...counts }, null, 2));
} catch (error) {
  console.error('Không kết nối được database:', error.code || error.message);
  process.exitCode = 1;
} finally { await connection?.end(); }
