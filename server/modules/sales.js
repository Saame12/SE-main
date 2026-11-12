import express from 'express';
import { randomUUID } from 'node:crypto';
import {
  assert,
  integer,
  text,
  choice,
  roles,
  storeScope,
  orderScope,
  normalizeItems,
  transaction,
  moveStock,
  audit,
} from '../core.js';
import { calculatePromotion } from './promotions.js';
export async function earnCommission(c, order) {
  assert(order.employee_id, 'Cần phân công nhân viên trước khi hoàn tất.', 409);
  const amount = Math.floor((Number(order.total) * order.commission_bps) / 10000);
  await c.execute(
    'INSERT INTO commissions (order_id,employee_id,store_id,rate_bps,amount) VALUES (?,?,?,?,?)',
    [order.id, order.employee_id, order.store_id, order.commission_bps, amount],
  );
}
export function salesModule(pool) {
  const r = express.Router();
  r.get('/orders', roles('hq', 'manager', 'employee', 'customer'), async (req, res) => {
    const args = [];
    let where = '1=1';
    if (req.user.role === 'customer') {
      where += ' AND o.customer_id=?';
      args.push(req.user.id);
    } else if (req.user.role !== 'hq') {
      where += ' AND o.store_id=?';
      args.push(req.user.store_id);
      if (req.user.role === 'employee') {
        where += ' AND o.employee_id=?';
        args.push(req.user.id);
      }
    } else if (req.query.store_id) {
      where += ' AND o.store_id=?';
      args.push(integer(req.query.store_id));
    }
    if (req.query.status) {
      where += ' AND o.status=?';
      args.push(
        choice(
          req.query.status,
          ['new', 'confirmed', 'received', 'finished', 'cancelled', 'returned'],
          'Trạng thái',
        ),
      );
    }
    const [rows] = await pool.execute(
      `SELECT o.*,p.status AS payment_status,l.name AS store_name,u.name AS employee_name FROM orders o JOIN payments p ON p.order_id=o.id JOIN locations l ON l.id=o.store_id LEFT JOIN users u ON u.id=o.employee_id WHERE ${where} ORDER BY o.id DESC LIMIT 200`,
      args,
    );
    res.json(rows);
  });
  r.get('/orders/:id', roles('hq', 'manager', 'employee', 'customer'), async (req, res) => {
    const o = await orderScope(pool, req.user, req.params.id);
    const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id=?', [o.id]);
    const [[payment]] = await pool.execute('SELECT * FROM payments WHERE order_id=?', [o.id]);
    const [requests] = await pool.execute(
      'SELECT * FROM order_requests WHERE order_id=? ORDER BY id DESC',
      [o.id],
    );
    if (req.user.role === 'customer' || req.user.role === 'employee')
      for (const item of items) delete item.unit_cost;
    res.json({ ...o, items, payment, requests });
  });
  r.post('/orders', roles('customer', 'employee', 'manager'), async (req, res) => {
    const user = req.user,
      b = req.body;
    const online = user.role === 'customer';
    const channel = online ? 'online' : 'offline';
    const store = online ? integer(b.store_id, 'Cửa hàng') : storeScope(user, b.store_id);
    const items = normalizeItems(b.items);
    const key = text(b.idempotency_key, 'Mã chống gửi lặp', 80);
    assert(/^[a-zA-Z0-9_-]{10,80}$/.test(key), 'Mã chống gửi lặp không hợp lệ.');
    const fulfillment = online
      ? choice(b.fulfillment, ['pickup', 'delivery'], 'Hình thức nhận')
      : 'pickup';
    const method = choice(
      b.payment_method,
      online ? ['card', 'qr', 'cod'] : ['cash', 'card', 'qr'],
      'Phương thức thanh toán',
    );
    const name = text(b.customer_name || user.name, 'Tên khách hàng');
    const phone = text(b.phone || user.phone || '', 'Số điện thoại', 30, online);
    const address = text(b.address || '', 'Địa chỉ giao hàng', 255, fulfillment === 'delivery');
    if (!online)
      assert(
        b.payment_confirmed === true,
        'Nhân viên phải xác nhận đã thu tiền trước khi lập hóa đơn.',
      );
    const result = await transaction(pool, async (c) => {
      // Serialize retries by the same actor before checking the unique idempotency key.
      await c.execute('SELECT id FROM users WHERE id=? FOR UPDATE', [user.id]);
      const [[existing]] = await c.execute(
        'SELECT id,code FROM orders WHERE created_by=? AND idempotency_key=?',
        [user.id, key],
      );
      if (existing) return { ...existing, replayed: true };
      const [[s]] = await c.execute(
        "SELECT * FROM locations WHERE id=? AND kind='store' AND active=1",
        [store],
      );
      assert(s, 'Cửa hàng không hoạt động.');
      let subtotal = 0;
      const lines = [];
      for (const item of items) {
        const [[p]] = await c.execute(
          "SELECT p.* FROM products p JOIN categories c ON c.id=p.category_id JOIN brands b ON b.id=p.brand_id WHERE p.id=? AND p.status='Đang kinh doanh' AND c.status='Đang dùng' AND b.status='Đang dùng'",
          [item.product_id],
        );
        assert(p, 'Sản phẩm không còn được bán.', 409);
        const price = integer(p.price, 'Giá sản phẩm', 0, 1e12);
        subtotal += price * item.quantity;
        assert(
          Number.isSafeInteger(subtotal) && subtotal <= 1e12,
          'Giá trị đơn hàng vượt giới hạn.',
        );
        lines.push({
          ...item,
          name: p.name,
          sku: p.sku,
          price,
          cost: Math.round(Number(p.avg_cost)),
        });
      }
      const promo = await calculatePromotion(c, b.promo_code, store, channel, subtotal);
      const total = subtotal - promo.discount;
      const code = (online ? 'DH-' : 'HD-') + randomUUID().slice(0, 8).toUpperCase();
      const [x] = await c.execute(
        'INSERT INTO orders (code,store_id,customer_id,employee_id,created_by,customer_name,phone,address,channel,fulfillment,status,payment_method,subtotal,discount,total,promotion_id,commission_bps,idempotency_key,note,finished_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [
          code,
          store,
          online ? user.id : null,
          online ? null : user.id,
          user.id,
          name,
          phone,
          address,
          channel,
          fulfillment,
          online ? 'new' : 'finished',
          method,
          subtotal,
          promo.discount,
          total,
          promo.id,
          s.commission_bps,
          key,
          text(b.note || '', 'Ghi chú', 500, false),
          online ? null : new Date(),
        ],
      );
      for (const line of lines) {
        await moveStock(
          c,
          user,
          store,
          line.product_id,
          -line.quantity,
          'sale_reservation',
          x.insertId,
        );
        await c.execute(
          'INSERT INTO order_items (order_id,product_id,name,sku,quantity,unit_price,unit_cost) VALUES (?,?,?,?,?,?,?)',
          [x.insertId, line.product_id, line.name, line.sku, line.quantity, line.price, line.cost],
        );
      }
      await c.execute(
        'INSERT INTO payments (order_id,method,status,amount,verified_by,verified_at,reference) VALUES (?,?,?,?,?,?,?)',
        [
          x.insertId,
          method,
          online ? 'pending' : 'verified',
          total,
          online ? null : user.id,
          online ? null : new Date(),
          online ? '' : 'Xác nhận thu tại quầy (mô phỏng)',
        ],
      );
      if (!online)
        await earnCommission(c, {
          id: x.insertId,
          employee_id: user.id,
          store_id: store,
          total,
          commission_bps: s.commission_bps,
        });
      await audit(c, user, 'create', 'order', x.insertId, { channel, store, total });
      return { id: x.insertId, code };
    });
    res.status(result.replayed ? 200 : 201).json(result);
  });
  r.post('/orders/:id/action', roles('manager', 'employee'), async (req, res) => {
    const action = choice(
      req.body.action,
      ['assign', 'confirm', 'received', 'finish', 'process'],
      'Thao tác',
    );
    await transaction(pool, async (c) => {
      const o = await orderScope(c, req.user, req.params.id, true);
      assert(o.channel === 'online', 'Thao tác này chỉ dành cho đơn trực tuyến.');
      if (action === 'process') {
        assert(req.user.role === 'employee', 'Nhân viên được phân công ghi tiến độ xử lý.', 403);
        assert(
          ['confirmed', 'received'].includes(o.status),
          'Đơn hàng chưa được xác nhận hoặc đã kết thúc.',
          409,
        );
        await audit(c, req.user, 'process', 'order', o.id, {
          note: text(req.body.note, 'Tiến độ', 500),
        });
        return;
      }
      assert(req.user.role === 'manager', 'Quản lý cửa hàng thực hiện thao tác này.', 403);
      const [[payment]] = await c.execute('SELECT * FROM payments WHERE order_id=? FOR UPDATE', [
        o.id,
      ]);
      if (action === 'assign') {
        assert(
          ['new', 'confirmed'].includes(o.status),
          'Không thể phân công đơn đã nhận hàng hoặc kết thúc.',
          409,
        );
        const employee = integer(req.body.employee_id, 'Nhân viên');
        const [[u]] = await c.execute(
          "SELECT * FROM users WHERE id=? AND store_id=? AND active=1 AND role='employee'",
          [employee, o.store_id],
        );
        assert(u, 'Nhân viên phải đang hoạt động tại cùng cửa hàng.');
        assert(
          !o.employee_id || o.employee_id === employee,
          'Bản đồ án không hỗ trợ phân công lại nhân viên.',
          409,
        );
        await c.execute('UPDATE orders SET employee_id=? WHERE id=?', [employee, o.id]);
      }
      if (action === 'confirm') {
        assert(o.status === 'new', 'Chỉ xác nhận đơn mới.', 409);
        assert(
          o.payment_method === 'cod' || payment.status === 'verified',
          'Cần xác minh thanh toán thẻ/QR trước khi xác nhận.',
          409,
        );
        await c.execute("UPDATE orders SET status='confirmed' WHERE id=?", [o.id]);
      }
      if (action === 'received') {
        assert(
          o.status === 'confirmed',
          'Đơn phải được xác nhận trước khi ghi nhận khách nhận hàng.',
          409,
        );
        assert(o.employee_id, 'Cần phân công nhân viên.', 409);
        text(req.body.evidence, 'Bằng chứng nhận hàng (mô phỏng)', 500);
        await c.execute("UPDATE orders SET status='received' WHERE id=?", [o.id]);
      }
      if (action === 'finish') {
        assert(o.status === 'received', 'Cần ghi nhận khách đã nhận hàng trước khi hoàn tất.', 409);
        assert(payment.status === 'verified', 'Chưa xác nhận thu tiền thành công.', 409);
        await earnCommission(c, o);
        await c.execute("UPDATE orders SET status='finished',finished_at=NOW() WHERE id=?", [o.id]);
      }
      await audit(c, req.user, action, 'order', o.id, {
        employee_id: req.body.employee_id || null,
        evidence: req.body.evidence || null,
      });
    });
    res.json({ ok: true });
  });
  r.post('/orders/:id/payment', roles('manager'), async (req, res) => {
    const reference = text(req.body.reference, 'Tham chiếu xác minh (mô phỏng)', 160);
    await transaction(pool, async (c) => {
      const o = await orderScope(c, req.user, req.params.id, true);
      assert(
        !['cancelled', 'returned', 'finished'].includes(o.status),
        'Đơn hàng đã kết thúc.',
        409,
      );
      if (o.payment_method === 'cod')
        assert(o.status === 'received', 'Chỉ xác nhận thu hộ COD khi khách đã nhận hàng.', 409);
      const [[p]] = await c.execute('SELECT * FROM payments WHERE order_id=? FOR UPDATE', [o.id]);
      assert(p.status === 'pending', 'Thanh toán đã được xử lý.', 409);
      await c.execute(
        "UPDATE payments SET status='verified',reference=?,verified_by=?,verified_at=NOW() WHERE order_id=?",
        [reference, req.user.id, o.id],
      );
      await audit(c, req.user, 'verify_payment', 'order', o.id, { reference, mode: 'simulation' });
    });
    res.json({ ok: true });
  });
  r.post('/orders/:id/requests', roles('customer', 'manager'), async (req, res) => {
    const kind = choice(req.body.kind, ['cancel', 'return'], 'Loại yêu cầu');
    const reason = text(req.body.reason, 'Lý do', 500);
    const id = await transaction(pool, async (c) => {
      const o = await orderScope(c, req.user, req.params.id, true);
      assert(
        kind === 'cancel' ? ['new', 'confirmed'].includes(o.status) : o.status === 'finished',
        kind === 'cancel' ? 'Chỉ yêu cầu hủy đơn chưa giao.' : 'Chỉ yêu cầu trả đơn đã hoàn tất.',
        409,
      );
      const [[pending]] = await c.execute(
        "SELECT id FROM order_requests WHERE order_id=? AND status='pending'",
        [o.id],
      );
      assert(!pending, 'Đơn đã có yêu cầu đang chờ xử lý.', 409);
      const [x] = await c.execute(
        'INSERT INTO order_requests (order_id,kind,reason,created_by) VALUES (?,?,?,?)',
        [o.id, kind, reason, req.user.id],
      );
      await audit(c, req.user, 'request_' + kind, 'order', o.id);
      return x.insertId;
    });
    res.status(201).json({ id });
  });
  r.get('/order-requests', roles('hq', 'manager'), async (req, res) => {
    const args = [];
    let where = '1=1';
    if (req.user.role === 'manager') {
      where += ' AND o.store_id=?';
      args.push(req.user.store_id);
    }
    const [rows] = await pool.execute(
      `SELECT r.*,o.code,o.store_id,o.total,o.customer_name,o.status AS order_status FROM order_requests r JOIN orders o ON o.id=r.order_id WHERE ${where} ORDER BY r.id DESC LIMIT 200`,
      args,
    );
    res.json(rows);
  });
  r.post('/order-requests/:id/resolve', roles('manager'), async (req, res) => {
    const id = integer(req.params.id);
    const decision = choice(req.body.decision, ['approve', 'reject'], 'Quyết định');
    const resolution = text(req.body.resolution, 'Ghi chú xử lý', 500);
    await transaction(pool, async (c) => {
      // Lock the order before its request to keep all sale/refund operations in one lock order.
      const [[pointer]] = await c.execute('SELECT order_id FROM order_requests WHERE id=?', [id]);
      assert(pointer, 'Không tìm thấy yêu cầu.', 404);
      const o = await orderScope(c, req.user, pointer.order_id, true);
      const [[request]] = await c.execute('SELECT * FROM order_requests WHERE id=? FOR UPDATE', [
        id,
      ]);
      assert(request.status === 'pending', 'Yêu cầu đã được xử lý.', 409);
      if (decision === 'approve') {
        assert(
          request.kind === 'cancel'
            ? ['new', 'confirmed'].includes(o.status)
            : o.status === 'finished',
          'Trạng thái đơn không còn phù hợp để xử lý.',
          409,
        );
        if (request.kind === 'return')
          assert(
            req.body.restock_confirmed === true,
            'Cần xác nhận đã kiểm tra và nhận lại toàn bộ hàng có thể bán.',
          );
        const [items] = await c.execute(
          'SELECT * FROM order_items WHERE order_id=? ORDER BY product_id',
          [o.id],
        );
        for (const item of items)
          await moveStock(
            c,
            req.user,
            o.store_id,
            item.product_id,
            item.quantity,
            request.kind === 'cancel' ? 'cancel_release' : 'return_restock',
            o.id,
          );
        await c.execute('UPDATE orders SET status=? WHERE id=?', [
          request.kind === 'cancel' ? 'cancelled' : 'returned',
          o.id,
        ]);
        await c.execute(
          "UPDATE payments SET status='refunded' WHERE order_id=? AND status='verified'",
          [o.id],
        );
        await c.execute("UPDATE commissions SET status='reversed' WHERE order_id=?", [o.id]);
      }
      await c.execute('UPDATE order_requests SET status=?,resolved_by=?,resolution=? WHERE id=?', [
        decision === 'approve' ? 'approved' : 'rejected',
        req.user.id,
        resolution,
        id,
      ]);
      await audit(c, req.user, 'resolve_' + request.kind, 'order', o.id, {
        decision,
        resolution,
        refund: 'simulation',
      });
    });
    res.json({ ok: true });
  });
  return r;
}
