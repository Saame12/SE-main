import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from './db.js';

const app = express();
const pool = createPool();
const root = fileURLToPath(new URL('../', import.meta.url));
app.disable('x-powered-by');
app.get('/api/health', async (_req, res) => {
  try {
    const [[db]] = await pool.query('SELECT DATABASE() AS name, @@port AS port');
    res.json({ status: 'ok', database: db });
  } catch (error) {
    console.error('MySQL:', error.code || error.message);
    res.status(503).json({ status: 'error', message: 'Không kết nối được MySQL. Chạy npm run db:check.' });
  }
});
app.get('/api/products', async (_req, res) => {
  const [rows] = await pool.query(`SELECT p.*, c.name AS category, b.name AS brand
    FROM products p JOIN categories c ON c.id=p.category_id
    JOIN brands b ON b.id=p.brand_id ORDER BY p.id`);
  res.json(rows);
});
app.use('/api', (_req, res) => res.status(404).json({ message: 'API không tồn tại.' }));
app.get('/', (_req, res) => res.sendFile(path.join(root, 'index3.html')));
// Serve only the existing public assets, keeping server code and credentials private.
for (const name of ['index1.html', 'index3.html', 'admin.html', 'manager.html',
  'app1.js', 'app3.js', 'admin.js', 'style1.css', 'style3.css', 'admin.css']) {
  app.get('/' + name, (_req, res) => res.sendFile(path.join(root, name)));
}
app.use('/IMG', express.static(path.join(root, 'IMG')));
app.use((error, _req, res, _next) => {
  console.error(error.code || error.message);
  res.status(500).json({ message: 'Lỗi máy chủ.' });
});
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3308);
const server = app.listen(port, host, () => console.log(`SE: http://${host}:${port}`));
server.on('error', async error => {
  console.error(error.code === 'EADDRINUSE' ? `Cổng ${port} đang được sử dụng. Đổi PORT trong .env.` : error.message);
  await pool.end();
  process.exitCode = 1;
});
async function stop() {
  server.close(async () => { await pool.end(); process.exit(0); });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
