import express from 'express';
import { assert, integer, text, choice, roles, storeScope, transaction, audit } from '../core.js';
export async function calculatePromotion(c, code, store, channel, subtotal) {
  if (!code) return { id: null, discount: 0 };
  const [[p]] = await c.execute(
    `SELECT * FROM promotions WHERE code=? AND active=1 AND starts_at<=NOW() AND ends_at>=NOW()`,
    [text(code, 'Mã khuyến mãi', 40).toUpperCase()],
  );
  assert(p, 'Khuyến mãi không tồn tại hoặc đã hết hạn.', 409);
  assert(
    p.channel === 'all' || p.channel === channel,
    'Khuyến mãi không áp dụng cho kênh bán này.',
  );
  if (p.scope === 'selected') {
    const [[s]] = await c.execute(
      'SELECT store_id FROM promotion_stores WHERE promotion_id=? AND store_id=?',
      [p.id, store],
    );
    assert(s, 'Khuyến mãi không áp dụng tại cửa hàng này.');
  }
  assert(subtotal >= Number(p.min_total), 'Đơn hàng chưa đạt giá trị tối thiểu của khuyến mãi.');
  let discount = p.kind === 'percent' ? Math.floor((subtotal * p.value) / 100) : p.value;
  if (p.max_discount !== null) discount = Math.min(discount, Number(p.max_discount));
  return { id: p.id, discount: Math.min(subtotal, discount) };
}
export function promotionsModule(pool) {
  const r = express.Router();
  r.get('/promotions', async (req, res) => {
    const args = [];
    let where = '1=1';
    const admin = req.user && ['hq', 'manager'].includes(req.user.role);
    if (!admin) where += ' AND p.active=1 AND p.starts_at<=NOW() AND p.ends_at>=NOW()';
    const store =
      req.user?.role === 'manager'
        ? req.user.store_id
        : req.query.store_id
          ? integer(req.query.store_id)
          : null;
    if (store) {
      where +=
        " AND (p.scope='all' OR EXISTS(SELECT 1 FROM promotion_stores ps WHERE ps.promotion_id=p.id AND ps.store_id=?))";
      args.push(store);
    }
    const [rows] = await pool.execute(
      `SELECT p.* FROM promotions p WHERE ${where} ORDER BY p.id DESC`,
      args,
    );
    for (const row of rows) {
      const [ss] = await pool.execute(
        'SELECT store_id FROM promotion_stores WHERE promotion_id=?',
        [row.id],
      );
      row.store_ids = ss.map((s) => s.store_id);
    }
    res.json(rows);
  });
  r.post('/promotions', roles('hq', 'manager'), async (req, res) => {
    const b = req.body;
    const code = text(b.code, 'Mã khuyến mãi', 40).toUpperCase();
    assert(/^[A-Z0-9_-]{2,40}$/.test(code), 'Mã khuyến mãi chỉ gồm chữ A-Z, số, _ và -.');
    const kind = choice(b.kind, ['percent', 'fixed'], 'Kiểu giảm');
    const value = integer(b.value, 'Mức giảm', 1, kind === 'percent' ? 100 : 1e12);
    const start = new Date(b.starts_at),
      end = new Date(b.ends_at);
    assert(
      Number.isFinite(+start) && Number.isFinite(+end) && end > start,
      'Khoảng thời gian khuyến mãi không hợp lệ.',
    );
    const scope =
      req.user.role === 'manager' ? 'selected' : choice(b.scope, ['all', 'selected'], 'Phạm vi');
    const stores =
      req.user.role === 'manager'
        ? [req.user.store_id]
        : [...new Set((b.store_ids || []).map((x) => integer(x, 'Cửa hàng')))];
    assert(scope !== 'selected' || stores.length > 0, 'Chọn cửa hàng áp dụng.');
    const id = await transaction(pool, async (c) => {
      for (const store of stores) {
        const [[s]] = await c.execute(
          "SELECT id FROM locations WHERE id=? AND kind='store' AND active=1",
          [store],
        );
        assert(s, 'Cửa hàng không hoạt động.');
      }
      const [x] = await c.execute(
        'INSERT INTO promotions (code,name,kind,value,min_total,max_discount,starts_at,ends_at,scope,channel,owner_store_id,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [
          code,
          text(b.name, 'Tên chương trình'),
          kind,
          value,
          integer(b.min_total || 0, 'Đơn tối thiểu', 0, 1e12),
          b.max_discount ? integer(b.max_discount, 'Giảm tối đa', 1, 1e12) : null,
          start,
          end,
          scope,
          choice(b.channel || 'all', ['all', 'online', 'offline'], 'Kênh bán'),
          req.user.role === 'manager' ? req.user.store_id : null,
          req.user.id,
        ],
      );
      if (scope === 'selected')
        for (const store of stores)
          await c.execute('INSERT INTO promotion_stores VALUES (?,?)', [x.insertId, store]);
      await audit(c, req.user, 'create', 'promotion', x.insertId);
      return x.insertId;
    });
    res.status(201).json({ id });
  });
  r.put('/promotions/:id', roles('hq', 'manager'), async (req, res) => {
    const id = integer(req.params.id);
    assert(typeof req.body.active === 'boolean', 'Trạng thái không hợp lệ.');
    await transaction(pool, async (c) => {
      const [[p]] = await c.execute('SELECT * FROM promotions WHERE id=? FOR UPDATE', [id]);
      assert(p, 'Không tìm thấy khuyến mãi.', 404);
      if (req.user.role === 'manager')
        assert(
          p.owner_store_id === req.user.store_id,
          'Không được sửa khuyến mãi của trụ sở hoặc cửa hàng khác.',
          403,
        );
      await c.execute('UPDATE promotions SET active=? WHERE id=?', [req.body.active, id]);
      await audit(c, req.user, 'toggle', 'promotion', id, { active: req.body.active });
    });
    res.json({ ok: true });
  });
  return r;
}
