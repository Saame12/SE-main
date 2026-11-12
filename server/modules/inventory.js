import express from 'express';
import { randomUUID } from 'node:crypto';
import {
  assert,
  integer,
  text,
  choice,
  roles,
  storeScope,
  normalizeItems,
  transaction,
  moveStock,
  audit,
} from '../core.js';
export function inventoryModule(pool) {
  const r = express.Router();
  r.get('/inventory', roles('hq', 'warehouse', 'manager', 'employee'), async (req, res) => {
    let location =
      req.user.role === 'warehouse'
        ? 1
        : storeScope(req.user, req.query.store_id ?? req.user.store_id ?? 1);
    if (req.user.role === 'hq') location = integer(req.query.store_id || 1);
    const [rows] = await pool.execute(
      `SELECT i.*,p.sku,p.name,p.price,c.name AS category,b.name AS brand,l.name AS location_name,
   i.quantity<=i.min_quantity AS low_stock FROM inventory i JOIN products p ON p.id=i.product_id JOIN categories c ON c.id=p.category_id JOIN brands b ON b.id=p.brand_id JOIN locations l ON l.id=i.location_id WHERE i.location_id=? ORDER BY p.id`,
      [location],
    );
    res.json(rows);
  });
  r.put('/inventory/:productId/threshold', roles('hq', 'manager'), async (req, res) => {
    const store = storeScope(req.user, req.body.store_id);
    const id = integer(req.params.productId);
    const min = integer(req.body.min_quantity, 'Ngưỡng tồn kho', 0);
    await transaction(pool, async (c) => {
      const [x] = await c.execute(
        'UPDATE inventory SET min_quantity=? WHERE location_id=? AND product_id=?',
        [min, store, id],
      );
      assert(x.affectedRows, 'Không tìm thấy tồn kho.', 404);
      await audit(c, req.user, 'threshold', 'inventory', id, { store, min });
    });
    res.json({ ok: true });
  });
  r.post('/inventory/adjust', roles('hq', 'warehouse'), async (req, res) => {
    const location = req.user.role === 'warehouse' ? 1 : integer(req.body.location_id);
    const product = integer(req.body.product_id);
    const quantity = integer(req.body.quantity, 'Số lượng', 0, 1000000);
    const reason = text(req.body.reason, 'Lý do điều chỉnh', 500);
    await transaction(pool, async (c) => {
      const [[s]] = await c.execute(
        'SELECT quantity FROM inventory WHERE location_id=? AND product_id=? FOR UPDATE',
        [location, product],
      );
      assert(s, 'Không tìm thấy tồn kho.', 404);
      await moveStock(c, req.user, location, product, quantity - s.quantity, 'adjustment', null);
      await audit(c, req.user, 'adjust', 'inventory', product, {
        location,
        from: s.quantity,
        to: quantity,
        reason,
      });
    });
    res.json({ ok: true });
  });
  r.get('/movements', roles('hq', 'warehouse', 'manager'), async (req, res) => {
    const args = [];
    let where = '1=1';
    if (req.user.role === 'warehouse') {
      where += ' AND m.location_id=1';
    } else if (req.user.role === 'manager') {
      where += ' AND m.location_id=?';
      args.push(req.user.store_id);
    }
    const [rows] = await pool.execute(
      `SELECT m.*,p.name AS product_name,u.name AS actor,l.name AS location FROM stock_movements m JOIN products p ON p.id=m.product_id JOIN users u ON u.id=m.actor_id JOIN locations l ON l.id=m.location_id WHERE ${where} ORDER BY m.id DESC LIMIT 200`,
      args,
    );
    res.json(rows);
  });
  r.get('/restocks', roles('hq', 'warehouse', 'manager'), async (req, res) => {
    const args = [];
    let where = '1=1';
    if (req.user.role === 'manager') {
      where += ' AND r.store_id=?';
      args.push(req.user.store_id);
    }
    const [rows] = await pool.execute(
      `SELECT r.*,l.name AS store_name,u.name AS creator FROM restock_requests r JOIN locations l ON l.id=r.store_id JOIN users u ON u.id=r.created_by WHERE ${where} ORDER BY r.id DESC LIMIT 200`,
      args,
    );
    for (const row of rows) {
      [row.items] = await pool.execute(
        'SELECT ri.*,p.name,p.sku FROM restock_items ri JOIN products p ON p.id=ri.product_id WHERE request_id=?',
        [row.id],
      );
    }
    res.json(rows);
  });
  r.post('/restocks', roles('manager'), async (req, res) => {
    const store = storeScope(req.user, req.body.store_id);
    const items = normalizeItems(req.body.items);
    const note = text(req.body.note || '', 'Ghi chú', 500, false);
    const id = await transaction(pool, async (c) => {
      const [x] = await c.execute(
        'INSERT INTO restock_requests (code,store_id,note,created_by) VALUES (?,?,?,?)',
        ['BS-' + randomUUID().slice(0, 8).toUpperCase(), store, note, req.user.id],
      );
      for (const item of items)
        await c.execute(
          'INSERT INTO restock_items (request_id,product_id,quantity) VALUES (?,?,?)',
          [x.insertId, item.product_id, item.quantity],
        );
      await audit(c, req.user, 'create', 'restock', x.insertId);
      return x.insertId;
    });
    res.status(201).json({ id });
  });
  r.post('/restocks/:id/action', roles('hq', 'warehouse', 'manager'), async (req, res) => {
    const id = integer(req.params.id);
    const action = choice(req.body.action, ['approve', 'reject', 'ship', 'receive'], 'Thao tác');
    await transaction(pool, async (c) => {
      const [[row]] = await c.execute('SELECT * FROM restock_requests WHERE id=? FOR UPDATE', [id]);
      assert(row, 'Không tìm thấy yêu cầu.', 404);
      if (['approve', 'reject'].includes(action)) {
        assert(req.user.role === 'hq', 'Chỉ trụ sở được duyệt yêu cầu.', 403);
        assert(row.status === 'submitted', 'Yêu cầu đã được xử lý.', 409);
        await c.execute('UPDATE restock_requests SET status=? WHERE id=?', [
          action === 'approve' ? 'approved' : 'rejected',
          id,
        ]);
      }
      if (action === 'ship') {
        assert(
          ['hq', 'warehouse'].includes(req.user.role),
          'Chỉ kho trung tâm được xuất hàng.',
          403,
        );
        assert(row.status === 'approved', 'Chỉ xuất yêu cầu đã duyệt.', 409);
        const [items] = await c.execute(
          'SELECT * FROM restock_items WHERE request_id=? ORDER BY product_id',
          [id],
        );
        for (const item of items)
          await moveStock(c, req.user, 1, item.product_id, -item.quantity, 'transfer_out', id);
        await c.execute("UPDATE restock_requests SET status='shipped' WHERE id=?", [id]);
      }
      if (action === 'receive') {
        assert(req.user.role === 'manager', 'Quản lý cửa hàng xác nhận nhận hàng.', 403);
        storeScope(req.user, row.store_id);
        assert(row.status === 'shipped', 'Chỉ nhận yêu cầu đã xuất kho.', 409);
        const [items] = await c.execute(
          'SELECT * FROM restock_items WHERE request_id=? ORDER BY product_id',
          [id],
        );
        for (const item of items)
          await moveStock(
            c,
            req.user,
            row.store_id,
            item.product_id,
            item.quantity,
            'transfer_in',
            id,
          );
        await c.execute("UPDATE restock_requests SET status='received' WHERE id=?", [id]);
      }
      await audit(c, req.user, action, 'restock', id);
    });
    res.json({ ok: true });
  });
  return r;
}
