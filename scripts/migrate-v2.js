import fs from 'node:fs/promises';
import { hashPassword } from '../server/core.js';
export async function migrateV2(c, password) {
  const schema = await fs.readFile(new URL('../database/schema-v2.sql', import.meta.url), 'utf8');
  for (const statement of schema
    .replace(/^\uFEFF/, '')
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean))
    await c.query(statement);
  const [[done]] = await c.execute("SELECT version FROM schema_migrations WHERE version='2.0.0'");
  if (done) return;
  await c.beginTransaction();
  try {
    await c.execute(
      "INSERT INTO companies (id,name,address,phone) VALUES (1,'V0 TECH','TP. Hồ Chí Minh','028 1234 5678') ON DUPLICATE KEY UPDATE id=id",
    );
    for (const loc of [
      [1, 'WH', 'Kho trung tâm', 'warehouse', 'Thủ Đức, TP. Hồ Chí Minh', 0],
      [2, 'HCM', 'V0 TECH · Sài Gòn', 'store', 'Quận 3, TP. Hồ Chí Minh', 100],
      [3, 'HN', 'V0 TECH · Hà Nội', 'store', 'Cầu Giấy, Hà Nội', 100],
    ])
      await c.execute(
        'INSERT INTO locations (id,code,name,kind,address,commission_bps) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id',
        loc,
      );
    const users = [
      ['hq', 'Trụ sở chính', 'hq', null],
      ['warehouse', 'Nhân viên kho', 'warehouse', null],
      ['manager', 'Trần Thu Lan', 'manager', 2],
      ['employee', 'Bùi Anh Tuấn', 'employee', 2],
      ['manager2', 'Quản lý Hà Nội', 'manager', 3],
      ['employee2', 'Nhân viên Hà Nội', 'employee', 3],
      ['customer', 'Khách hàng demo', 'customer', null],
    ];
    const hash = hashPassword(password);
    for (const [username, name, role, store] of users)
      await c.execute(
        'INSERT INTO users (username,password_hash,name,role,store_id,phone) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id',
        [username, hash, name, role, store, '0901234567'],
      );
    await c.execute(
      'INSERT IGNORE INTO inventory (location_id,product_id,quantity,min_quantity) SELECT l.id,p.id,CASE WHEN l.id=1 THEN 100 WHEN l.id=2 THEN p.stock ELSE 6 END,p.min_stock FROM locations l CROSS JOIN products p',
    );
    await c.execute("INSERT INTO schema_migrations (version) VALUES ('2.0.0')");
    await c.commit();
  } catch (error) {
    await c.rollback();
    throw error;
  }
}
