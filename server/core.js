import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const fail = (status, message) => {
  throw new AppError(status, message);
};
export const assert = (ok, message, status = 400) => {
  if (!ok) fail(status, message);
};
export function integer(value, label = 'Giá trị', min = 1, max = 2147483647) {
  const n = Number(value);
  assert(Number.isSafeInteger(n) && n >= min && n <= max, `${label} không hợp lệ.`);
  return n;
}
export function text(value, label, max = 160, required = true) {
  assert(typeof value === 'string', `${label} không hợp lệ.`);
  const s = value.trim();
  assert(
    (!required || s.length > 0) && s.length <= max,
    `${label} cần từ ${required ? 1 : 0} đến ${max} ký tự.`,
  );
  return s;
}
export function choice(value, values, label) {
  assert(values.includes(value), `${label} không hợp lệ.`);
  return value;
}
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, saved) {
  const [salt, hex] = saved.split(':');
  const expected = Buffer.from(hex, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  name: u.name,
  role: u.role,
  store_id: u.store_id,
  email: u.email,
  phone: u.phone,
  membership: u.membership,
});
export async function transaction(pool, fn) {
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const result = await fn(c);
    await c.commit();
    return result;
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    c.release();
  }
}
export const audit = (c, user, action, entity, id, details = {}) =>
  c.execute(
    'INSERT INTO audit_logs (actor_id,action,entity,entity_id,details) VALUES (?,?,?,?,?)',
    [user.id, action, entity, id || null, JSON.stringify(details)],
  );
export function roles(...allowed) {
  return (req, _res, next) => {
    assert(req.user, 'Vui lòng đăng nhập.', 401);
    assert(allowed.includes(req.user.role), 'Bạn không có quyền thực hiện thao tác này.', 403);
    next();
  };
}
export function storeScope(user, requested) {
  const store = integer(requested ?? user.store_id, 'Cửa hàng');
  assert(
    user.role === 'hq' || Number(user.store_id) === store,
    'Ngoài phạm vi cửa hàng được cấp quyền.',
    403,
  );
  return store;
}
export async function orderScope(c, user, id, lock = false) {
  const [[order]] = await c.execute(`SELECT * FROM orders WHERE id=?${lock ? ' FOR UPDATE' : ''}`, [
    integer(id, 'Đơn hàng'),
  ]);
  assert(order, 'Không tìm thấy đơn hàng.', 404);
  if (user.role === 'customer')
    assert(order.customer_id === user.id, 'Không có quyền xem đơn hàng.', 403);
  else {
    storeScope(user, order.store_id);
    if (user.role === 'employee')
      assert(order.employee_id === user.id, 'Đơn hàng chưa được phân công cho bạn.', 403);
  }
  return order;
}
export function normalizeItems(items) {
  assert(
    Array.isArray(items) && items.length > 0 && items.length <= 50,
    'Chọn từ 1 đến 50 sản phẩm.',
  );
  const map = new Map();
  for (const item of items) {
    const id = integer(item.product_id, 'Sản phẩm');
    const qty = integer(item.quantity, 'Số lượng', 1, 10000);
    map.set(id, integer((map.get(id) || 0) + qty, 'Số lượng', 1, 10000));
  }
  return [...map]
    .sort((a, b) => a[0] - b[0])
    .map(([product_id, quantity]) => ({ product_id, quantity }));
}
export async function moveStock(c, user, location, product, delta, reason, reference) {
  const [[stock]] = await c.execute(
    'SELECT quantity FROM inventory WHERE location_id=? AND product_id=? FOR UPDATE',
    [location, product],
  );
  assert(
    stock && Number(stock.quantity) + delta >= 0,
    'Không đủ tồn kho khả dụng; vui lòng chọn cửa hàng khác.',
    409,
  );
  await c.execute('UPDATE inventory SET quantity=quantity+? WHERE location_id=? AND product_id=?', [
    delta,
    location,
    product,
  ]);
  await c.execute(
    'INSERT INTO stock_movements (location_id,product_id,delta,reason,reference_id,actor_id) VALUES (?,?,?,?,?,?)',
    [location, product, delta, reason, reference, user.id],
  );
}
