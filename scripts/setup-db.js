import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import { migrateV2 } from './migrate-v2.js';
import { dbConfig } from '../server/db.js';

let admin;
try {
  const config = dbConfig();
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(config.database))
    throw new Error('DB_NAME không hợp lệ.');
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(config.user)) throw new Error('DB_USER không hợp lệ.');
  if (!process.env.DB_ADMIN_PASSWORD) throw new Error('Điền DB_ADMIN_PASSWORD trong .env trước.');
  admin = await mysql.createConnection({
    ...config,
    database: undefined,
    user: process.env.DB_ADMIN_USER || 'root',
    password: process.env.DB_ADMIN_PASSWORD,
  });
  const db = mysql.escapeId(config.database);
  await admin.query(
    `CREATE DATABASE IF NOT EXISTS ${db} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  // Do not reset an existing account's password on subsequent runs.
  await admin.query('CREATE USER IF NOT EXISTS ?@? IDENTIFIED BY ?', [
    config.user,
    'localhost',
    config.password,
  ]);
  await admin.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${db}.* TO ?@?`, [
    config.user,
    'localhost',
  ]);
  await admin.query(`USE ${db}`);
  const schema = await fs.readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
  for (const statement of schema
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean))
    await admin.query(statement);
  const seed = JSON.parse(
    await fs.readFile(new URL('../database/seed.json', import.meta.url), 'utf8'),
  );
  await admin.beginTransaction();
  for (const c of seed.categories)
    await admin.execute(
      'INSERT INTO categories (code,name,specs,status) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE id=id',
      [c.code, c.name, c.specs, c.status],
    );
  for (const b of seed.brands)
    await admin.execute(
      'INSERT INTO brands (name,status) VALUES (?,?) ON DUPLICATE KEY UPDATE id=id',
      [b.name, b.status],
    );
  for (const p of seed.products)
    await admin.execute(
      `INSERT INTO products
    (sku,barcode,name,category_id,brand_id,price,avg_cost,stock,min_stock,warranty_months,serial_managed,status,specs)
    SELECT ?,?,?,c.id,b.id,?,?,?,?,?,?,?,? FROM categories c CROSS JOIN brands b WHERE c.name=? AND b.name=?
    ON DUPLICATE KEY UPDATE products.id=products.id`,
      [
        p.sku,
        p.barcode,
        p.name,
        p.price,
        p.avgCost,
        p.stock,
        p.min,
        p.warranty,
        p.serial,
        p.status,
        p.spec,
        p.cat,
        p.brand,
      ],
    );
  await admin.commit();
  let demoPassword = process.env.DEMO_PASSWORD;
  if (!demoPassword) {
    demoPassword = randomBytes(15).toString('base64url');
    await fs.appendFile(
      new URL('../.env', import.meta.url),
      '\nDEMO_PASSWORD=' + demoPassword + '\n',
    );
    process.env.DEMO_PASSWORD = demoPassword;
  }
  await migrateV2(admin, demoPassword);
  console.log(
    `Đã chuẩn bị database ${config.database}; giữ nguyên dữ liệu đã tồn tại. Chạy npm run db:check.`,
  );
} catch (error) {
  await admin?.rollback();
  console.error('Không thiết lập được database:', error.code || error.message);
  process.exitCode = 1;
} finally {
  await admin?.end();
}
