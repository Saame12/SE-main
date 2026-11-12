import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createPool } from '../server/db.js';
import { assert, hashPassword, hashToken, moveStock, audit } from '../server/core.js';
import { earnCommission } from '../server/modules/sales.js';

const VERSION = 'demo-data-v1';
const daysAgo = (days) => new Date(Date.now() - days * 86400000);

export async function seedDemo(pool, password) {
  assert(
    typeof password === 'string' && password.length >= 10,
    'Cần DEMO_PASSWORD ít nhất 10 ký tự trong .env.',
  );
  const c = await pool.getConnection();
  let locked = false;
  const lock = 'se_demo_' + hashToken(process.env.DB_NAME || 'se_store').slice(0, 48);
  try {
    const [[result]] = await c.execute('SELECT GET_LOCK(?,10) AS acquired', [lock]);
    assert(result.acquired === 1, 'Một tiến trình khác đang nạp dữ liệu demo.', 409);
    locked = true;
    await c.beginTransaction();
    const [[done]] = await c.execute('SELECT version FROM schema_migrations WHERE version=?', [
      VERSION,
    ]);
    if (done) {
      await c.commit();
      return {
        created: false,
        message: 'Bộ dữ liệu demo đã được nạp; giữ nguyên các thao tác thử nghiệm của bạn.',
      };
    }
    const accounts = {};
    for (const [username, role] of [
      ['hq', 'hq'],
      ['manager', 'manager'],
      ['employee', 'employee'],
      ['manager2', 'manager'],
      ['employee2', 'employee'],
      ['customer', 'customer'],
      ['warehouse', 'warehouse'],
    ]) {
      const [[user]] = await c.execute(
        'SELECT * FROM users WHERE username=? AND role=? AND active=1',
        [username, role],
      );
      assert(
        user,
        `Không tìm thấy tài khoản seed ${username}; chạy db:setup hoặc kiểm tra tài khoản.`,
      );
      accounts[username] = user;
    }
    const hcm = accounts.manager.store_id,
      hn = accounts.manager2.store_id;
    assert(hcm && hn && hcm !== hn, 'Hai tài khoản quản lý demo cần thuộc hai cửa hàng khác nhau.');
    assert(
      accounts.employee.store_id === hcm && accounts.employee2.store_id === hn,
      'Nhân viên demo không thuộc đúng cửa hàng.',
    );
    const [[warehouse]] = await c.query(
      "SELECT * FROM locations WHERE kind='warehouse' ORDER BY id LIMIT 1",
    );
    assert(warehouse, 'Chưa có kho trung tâm.');
    const [locations] = await c.query('SELECT * FROM locations');
    const storeMap = new Map(locations.map((l) => [l.id, l]));
    const customers = [accounts.customer];
    for (const [username, name, membership] of [
      ['demo.an', '[DEMO] Nguyễn Minh An', 'Thân thiết'],
      ['demo.binh', '[DEMO] Trần Thanh Bình', 'Thành viên'],
      ['demo.chi', '[DEMO] Lê Ngọc Chi', 'VIP'],
    ]) {
      const [[exists]] = await c.execute('SELECT id FROM users WHERE username=?', [username]);
      assert(!exists, `Tài khoản ${username} đã tồn tại ngoài bộ seed. Không ghi đè.`);
      const [r] = await c.execute(
        "INSERT INTO users (username,password_hash,name,role,phone,email,membership) VALUES (?,?,?,'customer',?,?,?)",
        [
          username,
          hashPassword(password),
          name,
          '0900000000',
          username + '@example.test',
          membership,
        ],
      );
      const [[user]] = await c.execute('SELECT * FROM users WHERE id=?', [r.insertId]);
      customers.push(user);
    }
    const definitions = [
      ['CPU-I5', 'Intel Core i5-14400F', 'CPU', 'Intel', 4500000, 3800000, 36],
      ['CPU-R5', 'AMD Ryzen 5 7600', 'CPU', 'AMD', 4900000, 4100000, 36],
      ['MB-B760', 'ASUS PRIME B760M', 'MB', 'ASUS', 2900000, 2300000, 36],
      ['RAM16', 'Kingston Fury 16GB DDR5', 'RAM', 'Kingston', 1200000, 900000, 36],
      ['RAM32', 'Corsair Vengeance 32GB DDR5', 'RAM', 'Corsair', 2400000, 1900000, 36],
      ['SSD512', 'Samsung NVMe SSD 512GB', 'SSD', 'Samsung', 1000000, 750000, 36],
      ['SSD1T', 'Samsung NVMe SSD 1TB', 'SSD', 'Samsung', 1900000, 1500000, 60],
      ['GPU4060', 'GeForce RTX 4060 8GB', 'VGA', 'Nvidia', 7900000, 6600000, 36],
      ['MOUSE', 'Razer Gaming Mouse', 'PK', 'Razer', 500000, 350000, 12],
      ['KEYBOARD', 'Razer Mechanical Keyboard', 'PK', 'Razer', 1500000, 1100000, 24],
    ];
    const products = [];
    for (const [suffix, name, category, brand, price, cost, warranty] of definitions) {
      const sku = 'DEMO-' + suffix;
      const [[existing]] = await c.execute('SELECT id FROM products WHERE sku=?', [sku]);
      assert(!existing, `SKU ${sku} đã tồn tại ngoài bộ seed. Không ghi đè.`);
      const [[cat]] = await c.execute('SELECT id FROM categories WHERE code=?', [category]);
      const [[b]] = await c.execute('SELECT id FROM brands WHERE name=?', [brand]);
      assert(cat && b, `Thiếu loại ${category} hoặc thương hiệu ${brand}.`);
      const [r] = await c.execute(
        'INSERT INTO products (sku,name,category_id,brand_id,price,avg_cost,warranty_months,specs) VALUES (?,?,?,?,?,?,?,?)',
        [
          sku,
          '[DEMO] ' + name,
          cat.id,
          b.id,
          price,
          cost,
          warranty,
          'Dữ liệu thử nghiệm; giá và hình ảnh chỉ để minh họa.',
        ],
      );
      const product = { id: r.insertId, sku, name: '[DEMO] ' + name, price, cost };
      products.push(product);
      for (const location of locations) {
        let quantity =
          location.id === warehouse.id ? 80 : location.id === hcm ? 12 : location.id === hn ? 8 : 0;
        if (suffix === 'RAM16' && location.id === hcm) quantity = 3;
        if (suffix === 'SSD512' && location.id === hcm) quantity = 0;
        if (suffix === 'GPU4060' && location.id === hn) quantity = 0;
        await c.execute(
          'INSERT INTO inventory (location_id,product_id,quantity,min_quantity) VALUES (?,?,?,?)',
          [location.id, product.id, quantity, 5],
        );
        if (quantity)
          await c.execute(
            'INSERT INTO stock_movements (location_id,product_id,delta,reason,actor_id) VALUES (?,?,?,?,?)',
            [location.id, product.id, quantity, 'demo_opening', accounts.hq.id],
          );
      }
    }
    const promos = {};
    for (const p of [
      {
        code: 'DEMO10',
        name: '[DEMO] Giảm 10% toàn hệ thống',
        kind: 'percent',
        value: 10,
        min: 100000,
        max: 500000,
        scope: 'all',
        channel: 'all',
        stores: [],
        owner: null,
      },
      {
        code: 'DEMOHCM200',
        name: '[DEMO] Sài Gòn giảm 200.000đ',
        kind: 'fixed',
        value: 200000,
        min: 2000000,
        max: null,
        scope: 'selected',
        channel: 'all',
        stores: [hcm],
        owner: hcm,
      },
      {
        code: 'DEMOHN5',
        name: '[DEMO] Hà Nội online giảm 5%',
        kind: 'percent',
        value: 5,
        min: 1000000,
        max: 300000,
        scope: 'selected',
        channel: 'online',
        stores: [hn],
        owner: null,
      },
    ]) {
      const [r] = await c.execute(
        "INSERT INTO promotions (code,name,kind,value,min_total,max_discount,starts_at,ends_at,scope,channel,owner_store_id,created_by) VALUES (?,?,?,?,?,?,'2020-01-01','2099-12-31',?,?,?,?)",
        [
          p.code,
          p.name,
          p.kind,
          p.value,
          p.min,
          p.max,
          p.scope,
          p.channel,
          p.owner,
          p.owner ? accounts.manager.id : accounts.hq.id,
        ],
      );
      for (const store of p.stores)
        await c.execute('INSERT INTO promotion_stores VALUES (?,?)', [r.insertId, store]);
      promos[p.code] = r.insertId;
    }
    const scenarios = [
      {
        code: 'DEMO-DH-001',
        status: 'new',
        method: 'cod',
        product: 0,
        customer: 0,
        assigned: false,
        days: 0,
      },
      {
        code: 'DEMO-DH-002',
        status: 'new',
        method: 'qr',
        product: 4,
        customer: 0,
        assigned: false,
        days: 0,
      },
      {
        code: 'DEMO-DH-003',
        status: 'confirmed',
        method: 'card',
        product: 2,
        customer: 1,
        days: 1,
      },
      { code: 'DEMO-DH-004', status: 'received', method: 'cod', product: 6, customer: 0, days: 1 },
      {
        code: 'DEMO-DH-005',
        status: 'finished',
        method: 'card',
        product: 7,
        customer: 0,
        days: 2,
        promo: true,
      },
      {
        code: 'DEMO-HD-006',
        status: 'finished',
        method: 'cash',
        product: 8,
        quantity: 2,
        offline: true,
        days: 1,
      },
      {
        code: 'DEMO-DH-007',
        status: 'new',
        method: 'cod',
        product: 9,
        customer: 0,
        assigned: false,
        days: 0,
        request: 'cancel',
      },
      {
        code: 'DEMO-DH-008',
        status: 'finished',
        method: 'qr',
        product: 1,
        customer: 0,
        days: 3,
        request: 'return',
      },
      {
        code: 'DEMO-DH-009',
        status: 'cancelled',
        method: 'cod',
        product: 0,
        customer: 2,
        assigned: false,
        days: 5,
      },
      { code: 'DEMO-DH-010', status: 'returned', method: 'qr', product: 6, customer: 3, days: 6 },
      {
        code: 'DEMO-DH-011',
        status: 'confirmed',
        method: 'cod',
        product: 0,
        customer: 1,
        hanoi: true,
        days: 0,
      },
      {
        code: 'DEMO-HD-012',
        status: 'finished',
        method: 'cash',
        product: 4,
        quantity: 2,
        offline: true,
        hanoi: true,
        days: 0,
      },
    ];
    for (const s of scenarios) {
      const store = s.hanoi ? hn : hcm,
        manager = s.hanoi ? accounts.manager2 : accounts.manager,
        employee = s.hanoi ? accounts.employee2 : accounts.employee;
      const product = products[s.product],
        qty = s.quantity || 1,
        customer = customers[s.customer || 0];
      const subtotal = product.price * qty,
        discount = s.promo ? Math.min(500000, Math.floor(subtotal * 0.1)) : 0,
        total = subtotal - discount;
      const finished = ['finished', 'returned'].includes(s.status);
      const payment =
        s.status === 'returned'
          ? 'refunded'
          : finished || (['confirmed', 'received'].includes(s.status) && s.method !== 'cod')
            ? 'verified'
            : 'pending';
      const created = daysAgo(s.days),
        rate = storeMap.get(store).commission_bps;
      const [r] = await c.execute(
        'INSERT INTO orders (code,store_id,customer_id,employee_id,created_by,customer_name,phone,address,channel,fulfillment,status,payment_method,subtotal,discount,total,promotion_id,commission_bps,idempotency_key,note,created_at,finished_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [
          s.code,
          store,
          s.offline ? null : customer.id,
          s.assigned === false ? null : employee.id,
          s.offline ? employee.id : customer.id,
          s.offline ? '[DEMO] Khách mua tại quầy' : customer.name,
          '0900000000',
          s.offline ? '' : '[DEMO] Địa chỉ giao hàng minh họa',
          s.offline ? 'offline' : 'online',
          s.offline ? 'pickup' : 'delivery',
          s.status,
          s.method,
          subtotal,
          discount,
          total,
          s.promo ? promos.DEMO10 : null,
          rate,
          s.code,
          '[DEMO] Kịch bản thử nghiệm; không phải giao dịch thật.',
          created,
          finished ? created : null,
        ],
      );
      await c.execute(
        'INSERT INTO order_items (order_id,product_id,name,sku,quantity,unit_price,unit_cost) VALUES (?,?,?,?,?,?,?)',
        [r.insertId, product.id, product.name, product.sku, qty, product.price, product.cost],
      );
      await moveStock(c, accounts.hq, store, product.id, -qty, 'demo_sale_reservation', r.insertId);
      if (['cancelled', 'returned'].includes(s.status))
        await moveStock(
          c,
          accounts.hq,
          store,
          product.id,
          qty,
          'demo_' + s.status + '_release',
          r.insertId,
        );
      await c.execute(
        'INSERT INTO payments (order_id,method,status,amount,reference,verified_by,verified_at) VALUES (?,?,?,?,?,?,?)',
        [
          r.insertId,
          s.method,
          payment,
          total,
          payment === 'pending' ? '' : '[DEMO] Xác minh/hoàn tiền mô phỏng',
          payment === 'pending' ? null : manager.id,
          payment === 'pending' ? null : created,
        ],
      );
      if (finished) {
        await earnCommission(c, {
          id: r.insertId,
          employee_id: employee.id,
          store_id: store,
          total,
          commission_bps: rate,
        });
        await c.execute('UPDATE commissions SET created_at=?,status=? WHERE order_id=?', [
          created,
          s.status === 'returned' ? 'reversed' : 'earned',
          r.insertId,
        ]);
      }
      if (s.request || ['cancelled', 'returned'].includes(s.status)) {
        const kind = s.request || (s.status === 'cancelled' ? 'cancel' : 'return'),
          resolved = !s.request;
        await c.execute(
          'INSERT INTO order_requests (order_id,kind,reason,status,created_by,resolved_by,resolution) VALUES (?,?,?,?,?,?,?)',
          [
            r.insertId,
            kind,
            '[DEMO] ' +
              (kind === 'cancel' ? 'Khách đề nghị hủy đơn' : 'Khách đề nghị trả toàn bộ hàng'),
            resolved ? 'approved' : 'pending',
            customer.id,
            resolved ? manager.id : null,
            resolved ? '[DEMO] Đã xử lý theo kịch bản' : '',
          ],
        );
      }
      await audit(c, accounts.hq, 'seed_demo', 'order', r.insertId, { code: s.code, demo: true });
    }
    for (const [i, status] of [
      'submitted',
      'approved',
      'shipped',
      'received',
      'rejected',
    ].entries()) {
      const store = i === 4 ? hn : hcm,
        product = products[i === 1 ? 5 : i === 3 ? 8 : 3],
        qty = i === 3 ? 5 : 10;
      const [r] = await c.execute(
        'INSERT INTO restock_requests (code,store_id,status,note,created_by) VALUES (?,?,?,?,?)',
        [
          'DEMO-BS-' + String(i + 1).padStart(3, '0'),
          store,
          status,
          '[DEMO] Bổ sung để thử luồng phê duyệt và điều chuyển',
          store === hn ? accounts.manager2.id : accounts.manager.id,
        ],
      );
      await c.execute('INSERT INTO restock_items (request_id,product_id,quantity) VALUES (?,?,?)', [
        r.insertId,
        product.id,
        qty,
      ]);
      if (['shipped', 'received'].includes(status))
        await moveStock(
          c,
          accounts.hq,
          warehouse.id,
          product.id,
          -qty,
          'demo_transfer_out',
          r.insertId,
        );
      if (status === 'received')
        await moveStock(c, accounts.hq, store, product.id, qty, 'demo_transfer_in', r.insertId);
      await audit(c, accounts.hq, 'seed_demo', 'restock', r.insertId, { status, demo: true });
    }
    await c.execute('INSERT INTO schema_migrations (version) VALUES (?)', [VERSION]);
    await c.commit();
    return {
      created: true,
      products: products.length,
      orders: scenarios.length,
      promotions: 3,
      customers: 3,
      restocks: 5,
      message:
        'Đã nạp bộ demo. Tài khoản demo.an/demo.binh/demo.chi dùng DEMO_PASSWORD trong .env.',
    };
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    if (locked) await c.execute('SELECT RELEASE_LOCK(?)', [lock]);
    c.release();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pool = createPool();
  try {
    console.log(JSON.stringify(await seedDemo(pool, process.env.DEMO_PASSWORD), null, 2));
  } catch (error) {
    console.error('Không nạp được dữ liệu demo:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
