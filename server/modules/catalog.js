import express from 'express';
import {
  assert,
  integer,
  text,
  choice,
  roles,
  storeScope,
  transaction,
  audit,
  hashPassword,
  publicUser,
} from '../core.js';
export function catalogModule(pool) {
  const r = express.Router();
  r.get('/company', async (_req, res) => {
    const [[company]] = await pool.query('SELECT * FROM companies LIMIT 1');
    res.json(company);
  });
  r.put('/company', roles('hq'), async (req, res) => {
    const name = text(req.body.name, 'Tên công ty');
    const address = text(req.body.address || '', 'Địa chỉ', 255, false);
    const phone = text(req.body.phone || '', 'Điện thoại', 30, false);
    await transaction(pool, async (c) => {
      await c.execute('UPDATE companies SET name=?,address=?,phone=? WHERE id=1', [
        name,
        address,
        phone,
      ]);
      await audit(c, req.user, 'update', 'company', 1);
    });
    res.json({ ok: true });
  });
  r.get('/stores', async (req, res) => {
    let sql = "SELECT * FROM locations WHERE kind='store'";
    if (!req.user || req.user.role !== 'hq') sql += ' AND active=1';
    const [rows] = await pool.query(sql);
    res.json(rows);
  });
  r.post('/stores', roles('hq'), async (req, res) => {
    const b = req.body;
    const code = text(b.code, 'Mã cửa hàng', 30);
    const name = text(b.name, 'Tên cửa hàng');
    const address = text(b.address || '', 'Địa chỉ', 255, false);
    const phone = text(b.phone || '', 'Điện thoại', 30, false);
    const rate = integer(b.commission_bps ?? 0, 'Tỷ lệ hoa hồng (điểm cơ bản)', 0, 10000);
    const id = await transaction(pool, async (c) => {
      const [x] = await c.execute(
        "INSERT INTO locations (code,name,kind,address,phone,commission_bps) VALUES (?,?,'store',?,?,?)",
        [code, name, address, phone, rate],
      );
      await c.execute('INSERT INTO inventory (location_id,product_id) SELECT ?,id FROM products', [
        x.insertId,
      ]);
      await audit(c, req.user, 'create', 'store', x.insertId);
      return x.insertId;
    });
    res.status(201).json({ id });
  });
  r.put('/stores/:id', roles('hq'), async (req, res) => {
    const id = integer(req.params.id);
    const b = req.body;
    const name = text(b.name, 'Tên cửa hàng');
    const rate = integer(b.commission_bps, 'Tỷ lệ hoa hồng', 0, 10000);
    assert(typeof b.active === 'boolean', 'Trạng thái không hợp lệ.');
    await transaction(pool, async (c) => {
      const [x] = await c.execute(
        "UPDATE locations SET name=?,address=?,phone=?,commission_bps=?,active=? WHERE id=? AND kind='store'",
        [
          name,
          text(b.address || '', 'Địa chỉ', 255, false),
          text(b.phone || '', 'Điện thoại', 30, false),
          rate,
          b.active,
          id,
        ],
      );
      assert(x.affectedRows, 'Không tìm thấy cửa hàng.', 404);
      await audit(c, req.user, 'update', 'store', id);
    });
    res.json({ ok: true });
  });
  for (const table of ['categories', 'brands']) {
    r.get('/' + table, async (_req, res) => {
      const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY id`);
      res.json(rows);
    });
    r.post('/' + table, roles('hq'), async (req, res) => {
      const name = text(req.body.name, 'Tên');
      const id = await transaction(pool, async (c) => {
        const cols = table === 'categories' ? '(code,name,specs)' : '(name)';
        const args =
          table === 'categories'
            ? [
                text(req.body.code, 'Mã', 30),
                name,
                text(req.body.specs || '', 'Thông số', 2000, false),
              ]
            : [name];
        const [x] = await c.execute(
          `INSERT INTO ${table} ${cols} VALUES (${args.map(() => '?').join(',')})`,
          args,
        );
        await audit(c, req.user, 'create', table, x.insertId);
        return x.insertId;
      });
      res.status(201).json({ id });
    });
    r.put('/' + table + '/:id', roles('hq'), async (req, res) => {
      const id = integer(req.params.id);
      const name = text(req.body.name, 'Tên');
      await transaction(pool, async (c) => {
        const [x] = await c.execute(`UPDATE ${table} SET name=?,status=? WHERE id=?`, [
          name,
          choice(req.body.status, ['Đang dùng', 'Tạm dừng'], 'Trạng thái'),
          id,
        ]);
        assert(x.affectedRows, 'Không tìm thấy dữ liệu.', 404);
        await audit(c, req.user, 'update', table, id);
      });
      res.json({ ok: true });
    });
  }
  r.get('/products', async (req, res) => {
    const store = req.query.store_id ? integer(req.query.store_id, 'Cửa hàng') : null;
    if (store) {
      const [[s]] = await pool.execute(
        "SELECT id FROM locations WHERE id=? AND kind='store' AND active=1",
        [store],
      );
      assert(s, 'Cửa hàng không hợp lệ.');
    }
    const staff = req.user && ['hq', 'manager', 'warehouse'].includes(req.user.role);
    const args = store ? [store] : [];
    let sql = `SELECT p.id,p.sku,p.barcode,p.name,p.category_id,p.brand_id,p.price,p.warranty_months,p.specs,p.status,p.serial_managed,
    c.name AS category,b.name AS brand,${staff ? 'p.avg_cost,' : ''} ${store ? 'COALESCE(i.quantity,0)' : '0'} AS available
    FROM products p JOIN categories c ON c.id=p.category_id JOIN brands b ON b.id=p.brand_id ${store ? 'LEFT JOIN inventory i ON i.product_id=p.id AND i.location_id=?' : ''} WHERE 1=1`;
    if (!staff)
      sql += " AND p.status='Đang kinh doanh' AND c.status='Đang dùng' AND b.status='Đang dùng'";
    if (req.query.q) {
      sql += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      const q = '%' + text(req.query.q, 'Từ khóa', 100) + '%';
      args.push(q, q);
    }
    if (req.query.category_id) {
      sql += ' AND p.category_id=?';
      args.push(integer(req.query.category_id));
    }
    if (req.query.brand_id) {
      sql += ' AND p.brand_id=?';
      args.push(integer(req.query.brand_id));
    }
    sql += ' ORDER BY p.id';
    const [rows] = await pool.execute(sql, args);
    res.json(rows);
  });
  const productFields = (b) => [
    text(b.sku, 'SKU', 60),
    text(b.barcode || '', 'Mã vạch', 60, false) || null,
    text(b.name, 'Tên sản phẩm', 255),
    integer(b.category_id, 'Loại hàng'),
    integer(b.brand_id, 'Thương hiệu'),
    integer(b.price, 'Giá bán', 0, 1e12),
    integer(b.avg_cost ?? 0, 'Giá vốn', 0, 1e12),
    integer(b.warranty_months ?? 0, 'Bảo hành', 0, 240),
    Boolean(b.serial_managed),
    choice(
      b.status || 'Đang kinh doanh',
      ['Đang kinh doanh', 'Tạm ngừng bán', 'Ngừng kinh doanh'],
      'Trạng thái',
    ),
    text(b.specs || '', 'Thông số', 4000, false),
  ];
  r.post('/products', roles('hq'), async (req, res) => {
    const vals = productFields(req.body);
    const id = await transaction(pool, async (c) => {
      const [x] = await c.execute(
        'INSERT INTO products (sku,barcode,name,category_id,brand_id,price,avg_cost,warranty_months,serial_managed,status,specs) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        vals,
      );
      await c.execute('INSERT INTO inventory (location_id,product_id) SELECT id,? FROM locations', [
        x.insertId,
      ]);
      await audit(c, req.user, 'create', 'product', x.insertId);
      return x.insertId;
    });
    res.status(201).json({ id });
  });
  r.put('/products/:id', roles('hq'), async (req, res) => {
    const id = integer(req.params.id);
    const vals = productFields(req.body);
    await transaction(pool, async (c) => {
      const [x] = await c.execute(
        'UPDATE products SET sku=?,barcode=?,name=?,category_id=?,brand_id=?,price=?,avg_cost=?,warranty_months=?,serial_managed=?,status=?,specs=? WHERE id=?',
        [...vals, id],
      );
      assert(x.affectedRows, 'Không tìm thấy sản phẩm.', 404);
      await audit(c, req.user, 'update', 'product', id);
    });
    res.json({ ok: true });
  });
  r.get('/staff', roles('hq', 'manager', 'employee'), async (req, res) => {
    let where = "u.role IN ('hq','warehouse','manager','employee')";
    const args = [];
    if (req.user.role !== 'hq') {
      where += ' AND u.store_id=?';
      args.push(req.user.store_id);
    }
    if (req.user.role === 'employee') {
      where += ' AND u.id=?';
      args.push(req.user.id);
    }
    const [rows] = await pool.execute(
      `SELECT u.id,u.username,u.name,u.role,u.store_id,u.email,u.phone,u.active,l.name AS store_name,
    COALESCE((SELECT SUM(o.total) FROM orders o WHERE o.employee_id=u.id AND o.status='finished'),0) AS sales,
    COALESCE((SELECT SUM(c.amount) FROM commissions c WHERE c.employee_id=u.id AND c.status='earned'),0) AS commission
    FROM users u LEFT JOIN locations l ON l.id=u.store_id WHERE ${where} ORDER BY u.id`,
      args,
    );
    res.json(rows);
  });
  r.post('/staff', roles('hq', 'manager'), async (req, res) => {
    const b = req.body;
    const role =
      req.user.role === 'manager'
        ? 'employee'
        : choice(b.role, ['hq', 'warehouse', 'manager', 'employee'], 'Vai trò');
    const store = ['manager', 'employee'].includes(role) ? storeScope(req.user, b.store_id) : null;
    const username = text(b.username, 'Tên đăng nhập', 80).toLowerCase();
    assert(/^[a-z0-9._@-]{3,80}$/.test(username), 'Tên đăng nhập không hợp lệ.');
    const password = text(b.password, 'Mật khẩu', 128);
    assert(password.length >= 10, 'Mật khẩu cần ít nhất 10 ký tự.');
    const id = await transaction(pool, async (c) => {
      if (store) {
        const [[s]] = await c.execute(
          "SELECT id FROM locations WHERE id=? AND kind='store' AND active=1",
          [store],
        );
        assert(s, 'Cửa hàng không hoạt động.');
      }
      const [x] = await c.execute(
        'INSERT INTO users (username,password_hash,name,role,store_id,email,phone) VALUES (?,?,?,?,?,?,?)',
        [
          username,
          hashPassword(password),
          text(b.name, 'Họ tên'),
          role,
          store,
          text(b.email || '', 'Email', 160, false),
          text(b.phone || '', 'Điện thoại', 30, false),
        ],
      );
      await audit(c, req.user, 'create', 'user', x.insertId);
      return x.insertId;
    });
    res.status(201).json({ id });
  });
  r.put('/staff/:id', roles('hq', 'manager'), async (req, res) => {
    const id = integer(req.params.id);
    const b = req.body;
    assert(id !== req.user.id, 'Không thể tự sửa tài khoản quản trị đang đăng nhập.');
    assert(typeof b.active === 'boolean', 'Trạng thái không hợp lệ.');
    await transaction(pool, async (c) => {
      const [[u]] = await c.execute(
        "SELECT * FROM users WHERE id=? AND role<>'customer' FOR UPDATE",
        [id],
      );
      assert(u, 'Không tìm thấy nhân viên.', 404);
      if (req.user.role === 'manager') {
        storeScope(req.user, u.store_id);
        assert(u.role === 'employee', 'Chỉ được sửa nhân viên cửa hàng.', 403);
      }
      await c.execute('UPDATE users SET name=?,phone=?,email=?,active=? WHERE id=?', [
        text(b.name, 'Họ tên'),
        text(b.phone || '', 'Điện thoại', 30, false),
        text(b.email || '', 'Email', 160, false),
        b.active,
        id,
      ]);
      if (b.password) {
        const pw = text(b.password, 'Mật khẩu', 128);
        assert(pw.length >= 10, 'Mật khẩu cần ít nhất 10 ký tự.');
        await c.execute('UPDATE users SET password_hash=? WHERE id=?', [hashPassword(pw), id]);
        await c.execute('DELETE FROM sessions WHERE user_id=?', [id]);
      }
      await audit(c, req.user, 'update', 'user', id);
    });
    res.json({ ok: true });
  });
  r.get('/customers', roles('hq', 'manager'), async (req, res) => {
    let where = "u.role='customer'";
    const args = [];
    if (req.user.role === 'manager') {
      where += ' AND EXISTS(SELECT 1 FROM orders o WHERE o.customer_id=u.id AND o.store_id=?)';
      args.push(req.user.store_id);
    }
    const [rows] = await pool.execute(
      `SELECT u.id,u.name,u.phone,u.email,u.membership FROM users u WHERE ${where}`,
      args,
    );
    res.json(rows);
  });
  return r;
}
