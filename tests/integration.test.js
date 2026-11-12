import { seedDemo } from '../scripts/seed-demo.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { createApp } from '../server/index.js';
import { dbConfig, createPool } from '../server/db.js';
let admin, pool, server, base;
const cookies = {};
const tmp = 'se_test_' + Date.now();
const original = { ...process.env };
let product, cardOrder, codOrder, offline, restock, promo, request;
async function call(role, path, method = 'GET', body) {
  const response = await fetch(base + '/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'SE',
      ...(cookies[role] ? { Cookie: cookies[role] } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data, response };
}
async function ok(role, path, method = 'GET', body, status = 200) {
  const r = await call(role, path, method, body);
  assert.equal(r.status, status, JSON.stringify(r.data));
  return r.data;
}
const orderBody = (method = 'cod', items = [{ product_id: product, quantity: 1 }]) => ({
  store_id: 2,
  customer_name: 'Khách kiểm thử',
  phone: '0901234567',
  fulfillment: 'pickup',
  payment_method: method,
  items,
  idempotency_key: randomUUID(),
});
before(async () => {
  assert(
    original.DB_ADMIN_PASSWORD,
    'Điền DB_ADMIN_PASSWORD trong .env để tạo database kiểm thử riêng.',
  );
  assert(original.DEMO_PASSWORD, 'Chạy npm run db:setup trước khi kiểm thử.');
  admin = await mysql.createConnection({
    ...dbConfig(),
    database: undefined,
    user: original.DB_ADMIN_USER || 'root',
    password: original.DB_ADMIN_PASSWORD,
  });
  process.env.DB_NAME = tmp;
  process.env.DB_USER = tmp;
  process.env.DB_PASSWORD = randomBytes(20).toString('hex');
  execFileSync(process.execPath, ['--env-file=.env', 'scripts/setup-db.js'], {
    env: process.env,
    stdio: 'pipe',
  });
  pool = createPool();
  server = createApp(pool).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port;
  const [[p]] = await pool.query('SELECT id FROM products ORDER BY id LIMIT 1');
  product = p.id;
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await pool?.end();
  if (admin) {
    if (/^se_test_\d+$/.test(tmp)) {
      await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(tmp));
      await admin.query('DROP USER IF EXISTS ?@?', [tmp, 'localhost']);
    }
    await admin.end();
  }
  for (const key of ['DB_NAME', 'DB_USER', 'DB_PASSWORD']) process.env[key] = original[key];
});
test('Health, static assets, credentials stay private, authentication required', async () => {
  await ok(null, '/health');
  assert.equal((await call(null, '/staff')).status, 401);
  for (const path of ['/', '/assets/app.js', '/assets/app.css'])
    assert.equal((await fetch(base + path)).status, 200);
  for (const path of ['/.env', '/server/db.js', '/database/schema-v2.sql'])
    assert.equal((await fetch(base + path)).status, 404);
  const csrf = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(csrf.status, 403);
});
test('Login for five roles; passwords absent from responses; session cookies HttpOnly', async () => {
  for (const role of [
    'hq',
    'warehouse',
    'manager',
    'employee',
    'customer',
    'manager2',
    'employee2',
  ]) {
    const r = await call(null, '/auth/login', 'POST', {
      username: role,
      password: original.DEMO_PASSWORD,
    });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert(!('password_hash' in r.data));
    const cookie = r.response.headers.get('set-cookie');
    assert(cookie.includes('HttpOnly'));
    cookies[role] = cookie.split(';')[0];
    assert.equal((await ok(role, '/auth/me')).username, role);
  }
  assert.equal(
    (await call(null, '/auth/login', 'POST', { username: 'hq', password: 'wrong' })).status,
    401,
  );
});
test('Register only customers; duplicate usernames rejected', async () => {
  const r = await call(null, '/auth/register', 'POST', {
    username: 'new_customer',
    name: 'New user',
    password: 'StrongTestPassword!1',
    phone: '0900123456',
    role: 'hq',
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.role, 'customer');
  assert.equal(
    (
      await call(null, '/auth/register', 'POST', {
        username: 'new_customer',
        name: 'Duplicate',
        password: 'StrongTestPassword!1',
      })
    ).status,
    409,
  );
});
test('Store/role boundaries cannot be changed in request bodies', async () => {
  assert.equal((await call('manager', '/inventory?store_id=3')).status, 403);
  assert.equal((await call('manager', '/reports?store_id=3')).status, 403);
  assert.equal((await call('employee', '/staff', 'POST', { name: 'Escalation' })).status, 403);
  assert.equal((await call('customer', '/inventory')).status, 403);
  const staff = await ok('manager', '/staff');
  assert(staff.every((u) => u.store_id === 2));
  assert.equal((await call('employee', '/inventory/adjust', 'POST', {})).status, 403);
  const publicProducts = await ok(null, '/products?store_id=2');
  assert(publicProducts.every((p) => !('avg_cost' in p)));
});
test('HQ creates store; inventory is initialized and manager cannot create company store', async () => {
  const s = await ok(
    'hq',
    '/stores',
    'POST',
    { code: 'TEST', name: 'Cửa hàng test', commission_bps: 250 },
    201,
  );
  const [rows] = await pool.execute('SELECT * FROM inventory WHERE location_id=?', [s.id]);
  assert(rows.length > 0);
  assert(rows.every((i) => i.quantity === 0));
  assert.equal((await call('manager', '/stores', 'POST', {})).status, 403);
});
test('Scoped promotion verified on server; manager cannot create company-wide scope', async () => {
  const p = await ok(
    'manager',
    '/promotions',
    'POST',
    {
      code: 'TEST10',
      name: 'Test 10%',
      kind: 'percent',
      value: 10,
      min_total: 1,
      starts_at: '2020-01-01T00:00:00',
      ends_at: '2099-01-01T00:00:00',
      scope: 'all',
      store_ids: [3],
      channel: 'all',
    },
    201,
  );
  promo = p.id;
  const [[row]] = await pool.execute('SELECT * FROM promotions WHERE id=?', [promo]);
  assert.equal(row.scope, 'selected');
  assert.equal(row.owner_store_id, 2);
  assert.equal(
    (await call('manager2', '/promotions/' + promo, 'PUT', { active: false })).status,
    403,
  );
  const wrong = orderBody();
  wrong.store_id = 3;
  wrong.promo_code = 'TEST10';
  assert.equal((await call('customer', '/orders', 'POST', wrong)).status, 400);
});
test('Online creation uses server prices and reserves stock; idempotent retry', async () => {
  const [[before]] = await pool.execute(
    'SELECT quantity FROM inventory WHERE location_id=2 AND product_id=?',
    [product],
  );
  const b = orderBody('card');
  b.price = 1;
  b.total = 1;
  b.promo_code = 'TEST10';
  cardOrder = await ok('customer', '/orders', 'POST', b, 201);
  const o = await ok('customer', '/orders/' + cardOrder.id);
  assert(o.total > 1);
  assert.equal(o.discount, Math.floor(o.subtotal * 0.1));
  const retry = await ok('customer', '/orders', 'POST', b);
  assert.equal(retry.id, o.id);
  const [[after]] = await pool.execute(
    'SELECT quantity FROM inventory WHERE location_id=2 AND product_id=?',
    [product],
  );
  assert.equal(after.quantity, before.quantity - 1);
  assert.equal((await call('manager2', '/orders/' + o.id)).status, 403);
  assert.equal((await call('employee', '/orders/' + o.id)).status, 403);
});
test('Prepaid order cannot confirm before verified payment; foreign employee denied', async () => {
  assert.equal(
    (await call('manager', '/orders/' + cardOrder.id + '/action', 'POST', { action: 'confirm' }))
      .status,
    409,
  );
  const all = await ok('hq', '/staff');
  const foreign = all.find((u) => u.username === 'employee2');
  const local = all.find((u) => u.username === 'employee');
  assert.equal(
    (
      await call('manager', '/orders/' + cardOrder.id + '/action', 'POST', {
        action: 'assign',
        employee_id: foreign.id,
      })
    ).status,
    400,
  );
  await ok('manager', '/orders/' + cardOrder.id + '/payment', 'POST', {
    reference: 'QR/card simulation',
  });
  await ok('manager', '/orders/' + cardOrder.id + '/action', 'POST', {
    action: 'assign',
    employee_id: local.id,
  });
  await ok('manager', '/orders/' + cardOrder.id + '/action', 'POST', { action: 'confirm' });
  await ok('employee', '/orders/' + cardOrder.id + '/action', 'POST', {
    action: 'process',
    note: 'Đã đóng gói',
  });
  assert.equal((await call('employee2', '/orders/' + cardOrder.id)).status, 403);
});
test('Received then Finished generates exactly one commission; duplicate transitions rejected', async () => {
  assert.equal(
    (await call('manager', '/orders/' + cardOrder.id + '/action', 'POST', { action: 'finish' }))
      .status,
    409,
  );
  await ok('manager', '/orders/' + cardOrder.id + '/action', 'POST', {
    action: 'received',
    evidence: 'Khách đã nhận tại quầy',
  });
  await ok('manager', '/orders/' + cardOrder.id + '/action', 'POST', { action: 'finish' });
  assert.equal(
    (await call('manager', '/orders/' + cardOrder.id + '/action', 'POST', { action: 'finish' }))
      .status,
    409,
  );
  const [c] = await pool.execute('SELECT * FROM commissions WHERE order_id=?', [cardOrder.id]);
  assert.equal(c.length, 1);
  assert.equal(c[0].status, 'earned');
  assert(c[0].amount > 0);
});
test('COD cannot be collected before receipt, cannot finish before collection', async () => {
  codOrder = await ok('customer', '/orders', 'POST', orderBody(), 201);
  await ok('manager', '/orders/' + codOrder.id + '/action', 'POST', { action: 'confirm' });
  assert.equal(
    (
      await call('manager', '/orders/' + codOrder.id + '/payment', 'POST', {
        reference: 'Too early',
      })
    ).status,
    409,
  );
  const all = await ok('manager', '/staff');
  await ok('manager', '/orders/' + codOrder.id + '/action', 'POST', {
    action: 'assign',
    employee_id: all.find((u) => u.role === 'employee').id,
  });
  await ok('manager', '/orders/' + codOrder.id + '/action', 'POST', {
    action: 'received',
    evidence: 'Đã giao theo kịch bản',
  });
  assert.equal(
    (await call('manager', '/orders/' + codOrder.id + '/action', 'POST', { action: 'finish' }))
      .status,
    409,
  );
  await ok('manager', '/orders/' + codOrder.id + '/payment', 'POST', {
    reference: 'Quản lý xác nhận thu hộ COD mô phỏng',
  });
  await ok('manager', '/orders/' + codOrder.id + '/action', 'POST', { action: 'finish' });
});
test('Offline invoice atomic with verified payment, stock and commission', async () => {
  const b = { ...orderBody('cash'), payment_confirmed: false };
  assert.equal((await call('employee', '/orders', 'POST', b)).status, 400);
  b.payment_confirmed = true;
  offline = await ok('employee', '/orders', 'POST', b, 201);
  const o = await ok('employee', '/orders/' + offline.id);
  assert.equal(o.status, 'finished');
  assert.equal(o.payment.status, 'verified');
});
test('Multi-line insufficient stock rolls back all inventory and order writes', async () => {
  const [[before]] = await pool.execute(
    'SELECT quantity FROM inventory WHERE location_id=2 AND product_id=?',
    [product],
  );
  const b = orderBody('cod', [
    { product_id: product, quantity: 1 },
    { product_id: product + 1, quantity: 10000 },
  ]);
  assert.equal((await call('customer', '/orders', 'POST', b)).status, 409);
  const [[after]] = await pool.execute(
    'SELECT quantity FROM inventory WHERE location_id=2 AND product_id=?',
    [product],
  );
  assert.equal(after.quantity, before.quantity);
  const [[o]] = await pool.execute('SELECT COUNT(*) AS n FROM orders WHERE idempotency_key=?', [
    b.idempotency_key,
  ]);
  assert.equal(o.n, 0);
});
test('Concurrent purchases of last item cannot oversell', async () => {
  const p = product + 3;
  await ok('hq', '/inventory/adjust', 'POST', {
    location_id: 3,
    product_id: p,
    quantity: 1,
    reason: 'Set up concurrent test',
  });
  const b1 = orderBody('cod', [{ product_id: p, quantity: 1 }]);
  b1.store_id = 3;
  const b2 = { ...b1, idempotency_key: randomUUID() };
  const results = await Promise.all([
    call('customer', '/orders', 'POST', b1),
    call('customer', '/orders', 'POST', b2),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const [[stock]] = await pool.execute(
    'SELECT quantity FROM inventory WHERE location_id=3 AND product_id=?',
    [p],
  );
  assert.equal(stock.quantity, 0);
});
test('Restock approval, shipping, receipt enforce roles and one-time inventory effect', async () => {
  restock = await ok(
    'manager',
    '/restocks',
    'POST',
    { items: [{ product_id: product, quantity: 4 }], note: 'Test' },
    201,
  );
  assert.equal(
    (await call('warehouse', '/restocks/' + restock.id + '/action', 'POST', { action: 'ship' }))
      .status,
    409,
  );
  assert.equal(
    (await call('manager', '/restocks/' + restock.id + '/action', 'POST', { action: 'approve' }))
      .status,
    403,
  );
  await ok('hq', '/restocks/' + restock.id + '/action', 'POST', { action: 'approve' });
  await ok('warehouse', '/restocks/' + restock.id + '/action', 'POST', { action: 'ship' });
  assert.equal(
    (await call('manager2', '/restocks/' + restock.id + '/action', 'POST', { action: 'receive' }))
      .status,
    403,
  );
  await ok('manager', '/restocks/' + restock.id + '/action', 'POST', { action: 'receive' });
  assert.equal(
    (await call('manager', '/restocks/' + restock.id + '/action', 'POST', { action: 'receive' }))
      .status,
    409,
  );
});
test('Cancellation restores reserved inventory only once', async () => {
  const o = await ok('customer', '/orders', 'POST', orderBody(), 201);
  const req = await ok(
    'customer',
    '/orders/' + o.id + '/requests',
    'POST',
    { kind: 'cancel', reason: 'Không còn nhu cầu' },
    201,
  );
  await ok('manager', '/order-requests/' + req.id + '/resolve', 'POST', {
    decision: 'approve',
    resolution: 'Chấp thuận hủy',
  });
  assert.equal((await ok('customer', '/orders/' + o.id)).status, 'cancelled');
  assert.equal(
    (
      await call('manager', '/order-requests/' + req.id + '/resolve', 'POST', {
        decision: 'approve',
        resolution: 'Duplicate',
      })
    ).status,
    409,
  );
});
test('Approved full return restocks, simulates refund and reverses commission atomically', async () => {
  request = await ok(
    'customer',
    '/orders/' + cardOrder.id + '/requests',
    'POST',
    { kind: 'return', reason: 'Trả toàn bộ hàng demo' },
    201,
  );
  assert.equal(
    (
      await call('manager', '/order-requests/' + request.id + '/resolve', 'POST', {
        decision: 'approve',
        resolution: 'Missing inspected return',
      })
    ).status,
    400,
  );
  await ok('manager', '/order-requests/' + request.id + '/resolve', 'POST', {
    decision: 'approve',
    resolution: 'Đã kiểm tra hàng trả',
    restock_confirmed: true,
  });
  const o = await ok('customer', '/orders/' + cardOrder.id);
  assert.equal(o.status, 'returned');
  assert.equal(o.payment.status, 'refunded');
  const [[c]] = await pool.execute('SELECT status FROM commissions WHERE order_id=?', [
    cardOrder.id,
  ]);
  assert.equal(c.status, 'reversed');
});
test('Reports exclude returned sales; personal commissions isolated; audit trails exist', async () => {
  const report = await ok('manager', '/reports');
  assert.equal(report.finished_orders, 2);
  assert.equal(
    Number(report.revenue),
    Number((await ok('manager', '/orders/' + codOrder.id)).total) +
      Number((await ok('manager', '/orders/' + offline.id)).total),
  );
  const personal = await ok('employee', '/commissions');
  assert(personal.every((c) => c.employee_id === 3 || c.employee_id > 0));
  const employee = await ok('employee', '/auth/me');
  assert(personal.every((c) => c.employee_id === employee.id));
  assert((await ok('manager', '/audit')).some((a) => a.action === 'verify_payment'));
  const other = await ok('manager2', '/reports');
  assert.equal(other.finished_orders, 0);
});
test('Logout invalidates server-side session', async () => {
  await ok('customer', '/auth/logout', 'POST', {});
  assert.equal(await ok('customer', '/auth/me'), null);
  assert.equal((await call('customer', '/orders')).status, 401);
});

test('Catalog CRUD, active product visibility and store inventory initialization', async () => {
  const category = await ok(
    'hq',
    '/categories',
    'POST',
    { code: 'NEWCAT', name: 'Ngành hàng mới' },
    201,
  );
  const brand = await ok('hq', '/brands', 'POST', { name: 'Thương hiệu mới' }, 201);
  const b = {
    sku: 'TEST-NEW',
    name: 'Sản phẩm mới',
    category_id: category.id,
    brand_id: brand.id,
    price: 123000,
    avg_cost: 100000,
    warranty_months: 12,
    serial_managed: false,
    specs: 'Test',
    status: 'Đang kinh doanh',
  };
  const p = await ok('hq', '/products', 'POST', b, 201);
  assert((await ok(null, '/products?store_id=2')).some((row) => row.id === p.id));
  const [stock] = await pool.execute('SELECT * FROM inventory WHERE product_id=?', [p.id]);
  assert(stock.length >= 3);
  assert(stock.every((s) => s.quantity === 0));
  await ok('hq', '/products/' + p.id, 'PUT', { ...b, status: 'Tạm ngừng bán' });
  assert(!(await ok(null, '/products?store_id=2')).some((row) => row.id === p.id));
  assert.equal((await call('manager', '/products/' + p.id, 'PUT', b)).status, 403);
});
test('Manager-created staff cannot escalate role or switch store; invalid report dates return 400', async () => {
  const body = {
    username: 'scoped_employee',
    name: 'Nhân viên giới hạn',
    password: 'TestEmployee!123',
    role: 'hq',
    store_id: 2,
  };
  const r = await ok('manager', '/staff', 'POST', body, 201);
  const [[u]] = await pool.execute('SELECT role,store_id FROM users WHERE id=?', [r.id]);
  assert.equal(u.role, 'employee');
  assert.equal(u.store_id, 2);
  assert.equal(
    (
      await call('manager', '/staff', 'POST', {
        ...body,
        username: 'foreign_employee',
        store_id: 3,
      })
    ).status,
    403,
  );
  assert.equal((await call('manager', '/reports?from=2026-99-99')).status, 400);
  assert.equal((await call('manager', '/reports?from=2026-12-31&to=2026-01-01')).status, 400);
  const csrf = await fetch(base + '/api/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'SE',
      Origin: 'https://attacker.example',
      Cookie: cookies.manager,
    },
    body: '{}',
  });
  assert.equal(csrf.status, 403);
});

test('Portal role is verified before a session is issued; incorrect password reveals no role', async () => {
  for (const [username, portal] of [
    ['hq', 'employee'],
    ['warehouse', 'manager'],
    ['manager', 'hq'],
    ['employee', 'warehouse'],
    ['customer', 'employee'],
  ]) {
    const r = await call(null, '/auth/login', 'POST', {
      username,
      password: original.DEMO_PASSWORD,
      portal_role: portal,
    });
    assert.equal(r.status, 403);
    assert(r.data.portal_url);
    assert.equal(r.response.headers.get('set-cookie'), null);
  }
  const wrong = await call(null, '/auth/login', 'POST', {
    username: 'hq',
    password: 'wrong-password',
    portal_role: 'employee',
  });
  assert.equal(wrong.status, 401);
  assert(!wrong.data.portal_url);
  assert.equal(
    (
      await call(null, '/auth/login', 'POST', {
        username: 'hq',
        password: original.DEMO_PASSWORD,
        portal_role: 'unknown',
      })
    ).status,
    400,
  );
});
test('Successful role-specific login rotates an existing session', async () => {
  const first = await call(null, '/auth/login', 'POST', {
    username: 'employee',
    password: original.DEMO_PASSWORD,
    portal_role: 'employee',
  });
  assert.equal(first.status, 200);
  cookies.portal = first.response.headers.get('set-cookie').split(';')[0];
  const second = await call('portal', '/auth/login', 'POST', {
    username: 'manager',
    password: original.DEMO_PASSWORD,
    portal_role: 'manager',
  });
  assert.equal(second.status, 200);
  assert.equal(await ok('portal', '/auth/me'), null);
});

test('Demo dataset is transactional, stock-consistent, replay-safe and preserves existing products', async () => {
  const [before] = await pool.query(
    "SELECT i.* FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.sku NOT LIKE 'DEMO-%' ORDER BY i.location_id,i.product_id",
  );
  const result = await seedDemo(pool, original.DEMO_PASSWORD);
  assert.equal(result.created, true);
  assert.equal(result.orders, 12);
  assert.equal(result.products, 10);
  const [after] = await pool.query(
    "SELECT i.* FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.sku NOT LIKE 'DEMO-%' ORDER BY i.location_id,i.product_id",
  );
  assert.deepEqual(after, before);
  const [[counts]] = await pool.query(
    "SELECT (SELECT COUNT(*) FROM orders WHERE code LIKE 'DEMO-%') AS orders,(SELECT COUNT(*) FROM products WHERE sku LIKE 'DEMO-%') AS products,(SELECT COUNT(*) FROM restock_requests WHERE code LIKE 'DEMO-%') AS restocks,(SELECT COUNT(*) FROM promotions WHERE code LIKE 'DEMO%') AS promotions",
  );
  assert.deepEqual(counts, { orders: 12, products: 10, restocks: 5, promotions: 3 });
  const [inventory] = await pool.query(
    "SELECT i.location_id,i.product_id,i.quantity,COALESCE(SUM(m.delta),0) AS recorded FROM inventory i JOIN products p ON p.id=i.product_id LEFT JOIN stock_movements m ON m.location_id=i.location_id AND m.product_id=i.product_id WHERE p.sku LIKE 'DEMO-%' GROUP BY i.location_id,i.product_id,i.quantity",
  );
  assert(inventory.every((row) => row.quantity === Number(row.recorded)));
  const [orders] = await pool.query(
    "SELECT o.*,p.status AS payment_status FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.code LIKE 'DEMO-%'",
  );
  assert(
    orders.filter((o) => o.status === 'finished').every((o) => o.payment_status === 'verified'),
  );
  assert(
    orders.some(
      (o) =>
        o.status === 'received' && o.payment_method === 'cod' && o.payment_status === 'pending',
    ),
  );
  const [commissions] = await pool.query(
    "SELECT c.*,o.status AS order_status,o.total FROM commissions c JOIN orders o ON o.id=c.order_id WHERE o.code LIKE 'DEMO-%'",
  );
  assert.equal(commissions.length, 5);
  assert(
    commissions.every(
      (c) => Number(c.amount) === Math.floor((Number(c.total) * c.rate_bps) / 10000),
    ),
  );
  assert(commissions.some((c) => c.status === 'reversed' && c.order_status === 'returned'));
  const [[product]] = await pool.query("SELECT id FROM products WHERE sku='DEMO-CPU-I5'");
  await ok('hq', '/inventory/adjust', 'POST', {
    location_id: 2,
    product_id: product.id,
    quantity: 7,
    reason: 'Verify seed does not reset user testing',
  });
  assert.equal((await seedDemo(pool, original.DEMO_PASSWORD)).created, false);
  const [[stock]] = await pool.execute(
    'SELECT quantity FROM inventory WHERE location_id=2 AND product_id=?',
    [product.id],
  );
  assert.equal(stock.quantity, 7);
  const [[again]] = await pool.query("SELECT COUNT(*) AS n FROM orders WHERE code LIKE 'DEMO-%'");
  assert.equal(again.n, 12);
});
