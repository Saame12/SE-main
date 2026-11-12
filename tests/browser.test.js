import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { chromium } from '@playwright/test';
import { createApp } from '../server/index.js';
import { dbConfig, createPool } from '../server/db.js';
let admin, pool, server, base, browser;
const tmp = 'se_test_' + Date.now();
const original = { ...process.env };
const problems = [];
before(async () => {
  admin = await mysql.createConnection({
    ...dbConfig(),
    database: undefined,
    user: original.DB_ADMIN_USER || 'root',
    password: original.DB_ADMIN_PASSWORD,
  });
  process.env.DB_NAME = tmp;
  process.env.DB_USER = tmp;
  process.env.DB_PASSWORD = randomBytes(20).toString('hex');
  execFileSync(process.execPath, ['--env-file=.env', 'scripts/setup-db.js'], {
    env: process.env,
    stdio: 'pipe',
  });
  pool = createPool();
  server = createApp(pool).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  await fs.mkdir('.runtime/qa', { recursive: true });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  await pool?.end();
  if (admin) {
    if (/^se_test_\d+$/.test(tmp)) {
      await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(tmp));
      await admin.query('DROP USER IF EXISTS ?@?', [tmp, 'localhost']);
    }
    await admin.end();
  }
  for (const key of ['DB_NAME', 'DB_USER', 'DB_PASSWORD']) process.env[key] = original[key];
});
async function pageFor(role, width = 1440) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('404')) problems.push(m.text());
  });
  await page.goto(base);
  await page.getByRole('heading', { name: 'Linh kiện nổi bật' }).waitFor();
  if (role) {
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByLabel('Tên đăng nhập').fill(role);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(original.DEMO_PASSWORD);
    await page.locator('#dialog-form button[type=submit]').click();
    await page.locator('.sidebar').waitFor();
  }
  return { context, page };
}
async function noOverflow(page) {
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
    'Page has horizontal overflow',
  );
}
test('Desktop storefront filters, cart, login, checkout and customer tracking', async () => {
  const { page, context } = await pageFor(null);
  await noOverflow(page);
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map(async (img) => {
        img.loading = 'eager';
        try {
          await img.decode();
        } catch {}
      }),
    );
  });
  await page.screenshot({ path: '.runtime/qa/store-desktop.png', fullPage: true });
  const input = page.getByRole('searchbox', { name: 'Tìm sản phẩm' });
  await input.fill('Intel');
  assert.equal(await page.locator('.product:visible').count(), 1);
  await input.fill('');
  await page.getByRole('button', { name: '＋ Thêm', exact: true }).first().click();
  await page.getByRole('button', { name: /Giỏ hàng · 1/ }).click();
  await page.getByRole('button', { name: 'Đặt hàng', exact: true }).click();
  await page.getByLabel('Tên đăng nhập').fill('customer');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(original.DEMO_PASSWORD);
  await page.locator('#dialog-form button[type=submit]').click();
  await page.locator('#modal').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: /Giỏ hàng · 1/ }).click();
  await page.getByRole('button', { name: 'Đặt hàng', exact: true }).click();
  await page.getByLabel('Số điện thoại', { exact: true }).fill('0901234567');
  await page.locator('#dialog-form button[type=submit]').click();
  await page.getByRole('heading', { name: /Chi tiết DH-/ }).waitFor();
  await page.getByRole('button', { name: '✕', exact: true }).click();
  await page.getByRole('link', { name: 'Đơn của tôi', exact: true }).click();
  await page.locator('.shop-main tbody tr').first().waitFor();
  assert.match(await page.locator('.shop-main tbody').innerText(), /Mới tạo/);
  await context.close();
});
test('Manager completes customer COD through real UI controls', async () => {
  const { page, context } = await pageFor('manager');
  await page.getByRole('link', { name: 'Đơn hàng', exact: true }).click();
  async function action(name, fill) {
    await page
      .locator('.main')
      .getByRole('button', { name: 'Chi tiết', exact: true })
      .first()
      .click();
    await page.getByRole('button', { name, exact: true }).click();
    if (fill) await fill();
    await page.locator('#dialog-form button[type=submit]').click();
    await page.locator('#modal').waitFor({ state: 'hidden' });
  }
  await action('Xác nhận đơn');
  await action('Phân công nhân viên');
  await action('Khách đã nhận hàng', () =>
    page.getByLabel('Bằng chứng nhận hàng / ghi chú mô phỏng').fill('UI: khách nhận tại cửa hàng'),
  );
  await action('Xác minh thu tiền', () =>
    page.getByLabel('Tham chiếu xác minh / ghi chú').fill('UI: quản lý xác nhận COD mô phỏng'),
  );
  await action('Hoàn tất đơn');
  assert.match(await page.locator('.main tbody').innerText(), /Hoàn tất/);
  await context.close();
});
test('Manager navigation, stock request, promotion and employee management forms', async () => {
  const { page, context } = await pageFor('manager');
  await page.getByRole('heading', { name: 'Tổng quan kinh doanh' }).waitFor();
  await noOverflow(page);
  await page.screenshot({ path: '.runtime/qa/manager-desktop.png', fullPage: true });
  for (const name of [
    'Đơn hàng',
    'Hủy & trả hàng',
    'Tồn kho',
    'Yêu cầu bổ sung',
    'Nhân viên',
    'Khuyến mãi',
    'Báo cáo',
    'Nhật ký',
  ]) {
    await page.getByRole('link', { name, exact: true }).click();
    await page.waitForTimeout(100);
    assert(!(await page.getByRole('heading', { name: 'Không tải được dữ liệu' }).count()), name);
  }
  await page.getByRole('link', { name: 'Yêu cầu bổ sung', exact: true }).click();
  await page.getByRole('button', { name: '＋ Tạo yêu cầu' }).click();
  await page.getByRole('spinbutton', { name: 'Số lượng', exact: true }).fill('3');
  await page.locator('#dialog-form button[type=submit]').click();
  await page
    .getByRole('heading', { name: 'Yêu cầu bổ sung hàng', exact: true })
    .waitFor({ state: 'hidden' });
  await page.locator('tbody tr').waitFor();
  assert.match(await page.locator('tbody').innerText(), /Đã gửi/);
  await page.getByRole('link', { name: 'Khuyến mãi', exact: true }).click();
  await page.getByRole('button', { name: '＋ Tạo chương trình' }).click();
  await page.getByLabel('Mã ưu đãi').fill('UI10');
  await page.getByLabel('Tên chương trình').fill('Ưu đãi từ UI');
  await page.locator('#dialog-form button[type=submit]').click();
  await page.getByText('Ưu đãi từ UI', { exact: true }).waitFor();
  await page.getByRole('link', { name: 'Nhân viên', exact: true }).click();
  await page.getByRole('button', { name: '＋ Thêm nhân viên' }).click();
  await page.getByLabel('Tên đăng nhập').fill('ui_employee');
  await page.getByLabel('Họ tên', { exact: true }).fill('Nhân viên UI');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('TestEmployee!123');
  await page.locator('#dialog-form button[type=submit]').click();
  await page.getByText('Nhân viên UI', { exact: true }).waitFor();
  await context.close();
});
test('HQ and warehouse and employee workspaces load; offline sale creates persisted invoice', async () => {
  for (const role of ['hq', 'warehouse', 'employee']) {
    const { page, context } = await pageFor(role);
    await noOverflow(page);
    if (role === 'hq') {
      for (const name of [
        'Công ty & cửa hàng',
        'Danh mục sản phẩm',
        'Nhân viên',
        'Khuyến mãi',
        'Điều phối bổ sung',
        'Đơn hàng',
        'Báo cáo',
        'Nhật ký hệ thống',
      ]) {
        await page.getByRole('link', { name, exact: true }).click();
        await page.waitForTimeout(90);
        assert(
          !(await page.getByRole('heading', { name: 'Không tải được dữ liệu' }).count()),
          name,
        );
      }
    }
    if (role === 'warehouse') {
      await page.getByRole('heading', { name: 'Tồn kho trung tâm', exact: true }).waitFor();
      await page.getByRole('link', { name: 'Xuất hàng điều chuyển' }).click();
      await page.getByRole('link', { name: 'Lịch sử biến động' }).click();
    }
    if (role === 'employee') {
      await page.getByRole('link', { name: 'Lập hóa đơn', exact: true }).click();
      await page.getByLabel('Tên khách hàng', { exact: true }).fill('Khách mua trực tiếp UI');
      await page.getByLabel('Tôi xác nhận đã thu đủ tiền', { exact: false }).check();
      await page.getByRole('button', { name: 'Lập hóa đơn & hoàn tất' }).click();
      await page.getByRole('heading', { name: /Chi tiết HD-/ }).waitFor();
      await page.screenshot({ path: '.runtime/qa/invoice-desktop.png', fullPage: true });
    }
    await context.close();
  }
});
test('Mobile storefront and manager stay within viewport; no JavaScript/CSP errors', async () => {
  const { page, context } = await pageFor(null, 390);
  await noOverflow(page);
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map(async (img) => {
        img.loading = 'eager';
        try {
          await img.decode();
        } catch {}
      }),
    );
  });
  await page.screenshot({ path: '.runtime/qa/store-mobile.png', fullPage: true });
  await context.close();
  const m = await pageFor('manager', 390);
  await m.page.getByRole('heading', { name: 'Tổng quan kinh doanh' }).waitFor();
  await noOverflow(m.page);
  await m.page.screenshot({ path: '.runtime/qa/manager-mobile.png', fullPage: true });
  await m.context.close();
  assert.deepEqual(problems, []);
});
