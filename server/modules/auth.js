import { PORTALS } from '../../shared/portals.js';
import express from 'express';
import { randomBytes } from 'node:crypto';
import {
  assert,
  text,
  hashPassword,
  verifyPassword,
  hashToken,
  publicUser,
  transaction,
  audit,
} from '../core.js';
export function authModule(pool) {
  const router = express.Router();
  const attempts = new Map();
  const cookie = (token) =>
    `se_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`;
  async function session(c, user, res) {
    const token = randomBytes(32).toString('hex');
    await c.execute(
      'INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 1 DAY))',
      [hashToken(token), user.id],
    );
    res.setHeader('Set-Cookie', cookie(token));
    return publicUser(user);
  }
  router.post('/login', async (req, res) => {
    const username = text(req.body.username, 'Tên đăng nhập', 80).toLowerCase();
    const password = text(req.body.password, 'Mật khẩu', 128);
    const requestedRole = req.body.portal_role;
    assert(
      requestedRole === undefined || Object.hasOwn(PORTALS, requestedRole),
      'Cổng đăng nhập không hợp lệ.',
    );
    const key = `${req.ip}:${username}`;
    const now = Date.now();
    let a = attempts.get(key);
    if (!a || a.until < now) {
      a = { count: 0, until: now + 900000 };
      attempts.set(key, a);
    }
    assert(a.count < 8, 'Đăng nhập sai quá nhiều lần. Thử lại sau 15 phút.', 429);
    a.count++;
    if (attempts.size > 5000) for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
    const [[user]] = await pool.execute('SELECT * FROM users WHERE username=?', [username]);
    assert(
      user && user.active && verifyPassword(password, user.password_hash),
      'Tên đăng nhập hoặc mật khẩu không đúng.',
      401,
    );
    attempts.delete(key);
    if (requestedRole && requestedRole !== user.role) {
      const portal = PORTALS[user.role];
      return res.status(403).json({
        message: `Tài khoản này thuộc cổng ${portal.title}. Vui lòng đăng nhập tại đúng cổng.`,
        portal_url: portal.path,
      });
    }
    const result = await transaction(pool, async (c) => {
      if (req.sessionHash)
        await c.execute('DELETE FROM sessions WHERE token_hash=?', [req.sessionHash]);
      await audit(c, user, 'login', 'user', user.id);
      return session(c, user, res);
    });
    attempts.delete(key);
    res.json(result);
  });
  router.post('/register', async (req, res) => {
    const username = text(req.body.username, 'Tên đăng nhập', 80).toLowerCase();
    assert(
      /^[a-z0-9._@-]{3,80}$/.test(username),
      'Tên đăng nhập cần ít nhất 3 ký tự a-z, 0-9, . _ @ - .',
    );
    const password = text(req.body.password, 'Mật khẩu', 128);
    assert(password.length >= 10, 'Mật khẩu cần ít nhất 10 ký tự.');
    const name = text(req.body.name, 'Họ tên');
    const phone = text(req.body.phone || '', 'Số điện thoại', 30, false);
    const result = await transaction(pool, async (c) => {
      const [r] = await c.execute(
        "INSERT INTO users (username,password_hash,name,role,phone) VALUES (?,?,?,'customer',?)",
        [username, hashPassword(password), name, phone],
      );
      const [[user]] = await c.execute('SELECT * FROM users WHERE id=?', [r.insertId]);
      await audit(c, user, 'register', 'user', user.id);
      return session(c, user, res);
    });
    res.status(201).json(result);
  });
  router.get('/me', (req, res) => res.json(req.user ? publicUser(req.user) : null));
  router.post('/logout', async (req, res) => {
    if (req.sessionHash)
      await pool.execute('DELETE FROM sessions WHERE token_hash=?', [req.sessionHash]);
    res.setHeader('Set-Cookie', 'se_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    res.json({ ok: true });
  });
  return router;
}
export function authenticate(pool) {
  return async (req, _res, next) => {
    const token = String(req.headers.cookie || '')
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('se_session='))
      ?.slice(11);
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      const hash = hashToken(token);
      const [[user]] = await pool.execute(
        'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>NOW() AND u.active=1',
        [hash],
      );
      if (user) {
        req.user = user;
        req.sessionHash = hash;
      }
    }
    next();
  };
}
