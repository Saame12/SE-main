import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from './db.js';
import { AppError } from './core.js';
import { authModule, authenticate } from './modules/auth.js';
import { catalogModule } from './modules/catalog.js';
import { inventoryModule } from './modules/inventory.js';
import { promotionsModule } from './modules/promotions.js';
import { salesModule } from './modules/sales.js';
import { reportingModule } from './modules/reporting.js';
export function createApp(pool) {
  const app = express();
  const root = fileURLToPath(new URL('../', import.meta.url));
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (req.get('X-Requested-With') !== 'SE')
        return res.status(403).json({ message: 'Yêu cầu không hợp lệ.' });
      const origin = req.get('Origin');
      if (origin && origin !== `${req.protocol}://${req.get('host')}`)
        return res.status(403).json({ message: 'Nguồn yêu cầu không hợp lệ.' });
    }
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  app.get('/api/health', async (_req, res) => {
    try {
      const [[db]] = await pool.query('SELECT DATABASE() AS name,@@port AS port');
      const [[migration]] = await pool.query(
        "SELECT version FROM schema_migrations WHERE version='2.0.0'",
      );
      res
        .status(migration ? 200 : 503)
        .json({ status: migration ? 'ok' : 'migration_required', version: '2.0.0', database: db });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: 'Không kết nối được MySQL hoặc thiếu migration. Chạy npm run db:setup.',
      });
    }
  });
  app.use('/api', authenticate(pool));
  app.use('/api/auth', authModule(pool));
  for (const module of [
    catalogModule,
    inventoryModule,
    promotionsModule,
    salesModule,
    reportingModule,
  ])
    app.use('/api', module(pool));
  app.use('/api', (_req, res) => res.status(404).json({ message: 'API không tồn tại.' }));
  for (const route of [
    '/',
    '/index3.html',
    '/admin.html',
    '/manager.html',
    '/employee.html',
    '/warehouse.html',
    '/login',
    '/shop',
  ])
    app.get(route, (_req, res) => res.sendFile(path.join(root, 'web/index.html')));
  app.use('/assets', express.static(path.join(root, 'web'), { index: false, dotfiles: 'deny' }));
  app.use('/IMG', express.static(path.join(root, 'IMG'), { index: false, dotfiles: 'deny' }));
  app.use((error, _req, res, _next) => {
    if (error instanceof AppError) return res.status(error.status).json({ message: error.message });
    if (error.type === 'entity.parse.failed')
      return res.status(400).json({ message: 'JSON không hợp lệ.' });
    if (error.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: 'Mã hoặc tên đăng nhập đã tồn tại.' });
    if (error.code === 'ER_NO_REFERENCED_ROW_2')
      return res.status(400).json({ message: 'Dữ liệu liên kết không tồn tại.' });
    if (['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.code))
      return res
        .status(409)
        .json({ message: 'Dữ liệu đang được xử lý đồng thời. Vui lòng thử lại.' });
    if (['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_NO_SUCH_TABLE'].includes(error.code))
      return res
        .status(503)
        .json({ message: 'MySQL chưa sẵn sàng. Kiểm tra dịch vụ và chạy npm run db:setup.' });
    if (error.status === 413) return res.status(413).json({ message: 'Dữ liệu gửi lên quá lớn.' });
    console.error(error);
    res.status(500).json({ message: 'Không thể xử lý yêu cầu. Vui lòng thử lại.' });
  });
  return app;
}
export function startServer() {
  const pool = createPool();
  const app = createApp(pool);
  const host = process.env.HOST || '127.0.0.1',
    port = Number(process.env.PORT || 3308);
  const server = app.listen(port, host, () => console.log(`V0 TECH v2: http://${host}:${port}`));
  server.on('error', async (error) => {
    console.error(error.code === 'EADDRINUSE' ? `Cổng ${port} đang được sử dụng.` : error.message);
    await pool.end();
    process.exitCode = 1;
  });
  const stop = () =>
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  startServer();
