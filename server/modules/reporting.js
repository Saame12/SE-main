import express from 'express';
import { assert, roles, integer, storeScope } from '../core.js';
function dateRange(query) {
  const now = new Date();
  const from = query.from || `${now.getFullYear()}-01-01`;
  const to = query.to || now.toISOString().slice(0, 10);
  for (const d of [from, to])
    assert(
      /^\d{4}-\d{2}-\d{2}$/.test(d) &&
        Number.isFinite(+new Date(d)) &&
        new Date(d).toISOString().slice(0, 10) === d,
      'Ngày lọc báo cáo không hợp lệ.',
    );
  assert(from <= to, 'Ngày bắt đầu phải trước ngày kết thúc.');
  return { from, to };
}
export function reportingModule(pool) {
  const r = express.Router();
  r.get('/commissions', roles('hq', 'manager', 'employee'), async (req, res) => {
    const args = [];
    let where = '1=1';
    if (req.user.role !== 'hq') {
      where += ' AND c.store_id=?';
      args.push(req.user.store_id);
    }
    if (req.user.role === 'employee') {
      where += ' AND c.employee_id=?';
      args.push(req.user.id);
    }
    const [rows] = await pool.execute(
      `SELECT c.*,o.code,o.channel,o.total,u.name AS employee_name FROM commissions c JOIN orders o ON o.id=c.order_id JOIN users u ON u.id=c.employee_id WHERE ${where} ORDER BY c.id DESC LIMIT 200`,
      args,
    );
    res.json(rows);
  });
  r.get('/reports', roles('hq', 'manager', 'employee'), async (req, res) => {
    const { from, to } = dateRange(req.query);
    const args = [];
    let where = '1=1';
    let stockWhere = "l.kind='store'";
    const stockArgs = [];
    if (req.user.role !== 'hq' || req.query.store_id) {
      const store = storeScope(req.user, req.query.store_id ?? req.user.store_id);
      where += ' AND o.store_id=?';
      args.push(store);
      stockWhere += ' AND i.location_id=?';
      stockArgs.push(store);
    }
    if (req.user.role === 'employee') {
      where += ' AND o.employee_id=?';
      args.push(req.user.id);
    }
    const range = 'o.finished_at>=? AND o.finished_at<DATE_ADD(?, INTERVAL 1 DAY)';
    const values = [...args, from, to];
    const [[sales]] = await pool.execute(
      `SELECT COUNT(*) AS finished_orders,COALESCE(SUM(o.subtotal),0) AS subtotal,COALESCE(SUM(o.discount),0) AS discounts,COALESCE(SUM(o.total),0) AS revenue,COALESCE(SUM(CASE WHEN o.channel='online' THEN o.total ELSE 0 END),0) AS online,COALESCE(SUM(CASE WHEN o.channel='offline' THEN o.total ELSE 0 END),0) AS offline FROM orders o WHERE ${where} AND o.status='finished' AND ${range}`,
      values,
    );
    const [statuses] = await pool.execute(
      `SELECT o.status,COUNT(*) AS count FROM orders o WHERE ${where} AND o.created_at>=? AND o.created_at<DATE_ADD(?,INTERVAL 1 DAY) GROUP BY o.status`,
      values,
    );
    const [daily] = await pool.execute(
      `SELECT DATE_FORMAT(o.finished_at,'%Y-%m-%d') AS day,SUM(o.total) AS revenue FROM orders o WHERE ${where} AND o.status='finished' AND ${range} GROUP BY day ORDER BY day`,
      values,
    );
    const [staff] = await pool.execute(
      `SELECT u.id,u.name,COUNT(o.id) AS orders,SUM(o.total) AS sales,COALESCE(SUM(c.amount),0) AS commission FROM orders o JOIN users u ON u.id=o.employee_id LEFT JOIN commissions c ON c.order_id=o.id AND c.status='earned' WHERE ${where} AND o.status='finished' AND ${range} GROUP BY u.id,u.name ORDER BY sales DESC`,
      values,
    );
    const [promotions] = await pool.execute(
      `SELECT p.code,COUNT(o.id) AS uses,SUM(o.discount) AS discount FROM orders o JOIN promotions p ON p.id=o.promotion_id WHERE ${where} AND o.status='finished' AND ${range} GROUP BY p.id,p.code`,
      values,
    );
    const [[stock]] = await pool.execute(
      `SELECT COALESCE(SUM(i.quantity),0) AS stock_units,COALESCE(SUM(i.quantity<=i.min_quantity),0) AS low_stock FROM inventory i JOIN locations l ON l.id=i.location_id WHERE ${stockWhere}`,
      stockArgs,
    );
    res.json({
      from,
      to,
      ...sales,
      ...stock,
      statuses,
      daily,
      staff,
      promotions,
      commission: staff.reduce((n, s) => n + Number(s.commission), 0),
      definition:
        'Doanh số = tổng tiền sau giảm giá của đơn đang Hoàn tất, lọc theo ngày hoàn tất. Đơn hủy/trả bị loại; đây không phải báo cáo kế toán.',
    });
  });
  r.get('/audit', roles('hq', 'manager'), async (req, res) => {
    let where = '1=1';
    const args = [];
    if (req.user.role === 'manager') {
      where =
        "(u.store_id=? OR (a.entity='order' AND EXISTS(SELECT 1 FROM orders o WHERE o.id=a.entity_id AND o.store_id=?)))";
      args.push(req.user.store_id, req.user.store_id);
    }
    const [rows] = await pool.execute(
      `SELECT a.*,u.name AS actor FROM audit_logs a JOIN users u ON u.id=a.actor_id WHERE ${where} ORDER BY a.id DESC LIMIT 200`,
      args,
    );
    res.json(rows);
  });
  return r;
}
