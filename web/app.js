import { PORTALS, portalForPath } from './portals.js';
import {
  $,
  esc,
  money,
  date,
  label,
  badge,
  btn,
  empty,
  table,
  card,
  toolbar,
  field,
  area,
  select,
  check,
  metric,
  csv,
} from './ui.js';
const state = {
  user: null,
  stores: [],
  categories: [],
  brands: [],
  products: [],
  cart: loadCart(),
  store: Number(sessionStorage.getItem('se_store') || 2),
  page: '',
  report: null,
  reportFilter: {},
  generation: 0,
};
const modal = $('#modal');
let modalSubmit = null;
let toastTimer;
function loadCart() {
  try {
    return JSON.parse(sessionStorage.getItem('se_cart') || '{}');
  } catch {
    return {};
  }
}
function saveCart() {
  sessionStorage.setItem('se_cart', JSON.stringify(state.cart));
}
async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'SE', ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401 && state.user) {
      state.user = null;
      await render();
    }
    const error = new Error(data.message || 'Không thể xử lý yêu cầu.');
    error.portalUrl = Object.values(PORTALS).some((p) => p.path === data.portal_url)
      ? data.portal_url
      : null;
    throw error;
  }
  return data;
}
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 5000);
}
function dialog(title, body, submit = null, wide = false) {
  modal.className = wide ? 'wide' : '';
  modal.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2>${btn('✕', 'close', '', 'ghost small')}</div><div class="dialog-body">${submit ? '<form id="dialog-form">' : ''}${body}${submit ? '<p class="form-error" role="alert"></p><div class="form-actions">' + btn('Đóng', 'close') + '<button class="btn primary" type="submit">Lưu thông tin</button></div></form>' : ''}</div>`;
  modalSubmit = submit;
  if (!modal.open) modal.showModal();
}
const options = () => state.stores.map((s) => [s.id, s.name]);
const storeName = () => state.stores.find((s) => s.id === state.store)?.name || 'Cửa hàng';
const roles = {
  hq: [
    ['dashboard', '◫', 'Tổng quan'],
    ['company', '◇', 'Công ty & cửa hàng'],
    ['catalog', '▦', 'Danh mục sản phẩm'],
    ['inventory', '▧', 'Tồn kho hệ thống'],
    ['movements', '≡', 'Biến động tồn kho'],
    ['staff', '♧', 'Nhân viên'],
    ['promotions', '⊙', 'Khuyến mãi'],
    ['restocks', '⇄', 'Điều phối bổ sung'],
    ['orders', '▤', 'Đơn hàng'],
    ['reports', '▥', 'Báo cáo'],
    ['audit', '≡', 'Nhật ký hệ thống'],
  ],
  warehouse: [
    ['inventory', '▦', 'Tồn kho trung tâm'],
    ['restocks', '⇄', 'Xuất hàng điều chuyển'],
    ['movements', '≡', 'Lịch sử biến động'],
  ],
  manager: [
    ['dashboard', '◫', 'Tổng quan cửa hàng'],
    ['orders', '▤', 'Đơn hàng'],
    ['requests', '↶', 'Hủy & trả hàng'],
    ['inventory', '▦', 'Tồn kho'],
    ['restocks', '⇄', 'Yêu cầu bổ sung'],
    ['staff', '♧', 'Nhân viên'],
    ['promotions', '⊙', 'Khuyến mãi'],
    ['reports', '▥', 'Báo cáo'],
    ['audit', '≡', 'Nhật ký'],
  ],
  employee: [
    ['dashboard', '◫', 'Hiệu suất cá nhân'],
    ['sale', '＋', 'Lập hóa đơn'],
    ['orders', '▤', 'Đơn được phân công'],
    ['inventory', '▦', 'Tồn kho cửa hàng'],
    ['commissions', '◈', 'Hoa hồng cá nhân'],
  ],
};
function isStaff() {
  return state.user && state.user.role !== 'customer';
}
function selectedStore() {
  return state.user && ['manager', 'employee'].includes(state.user.role)
    ? state.user.store_id
    : state.store;
}
function head(title, description, tools = '') {
  return `<div class="page-head"><div><div class="eyebrow">${isStaff() ? esc(label(state.user.role)) : 'V0 TECH · PC & Hardware'}</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="head-tools">${tools}</div></div>`;
}
function staffShell(content) {
  const menu = roles[state.user.role];
  const name = menu.find((x) => x[0] === state.page)?.[2] || '';
  return `<div class="shell"><aside class="sidebar"><a href="#${menu[0][0]}" class="brand">V0 TECH<span>.</span></a><div class="workspace-tag">Retail operating system</div><nav class="nav">${menu.map(([id, icon, title]) => `<a href="#${id}" class="${id === state.page ? 'active' : ''}"><span class="icon" aria-hidden="true">${icon}</span>${esc(title)}</a>`).join('')}</nav><div class="side-bottom"><span class="pill blue">PHIÊN BẢN 2.0</span><p>Dữ liệu tập trung<br>Phân quyền theo cửa hàng</p><button class="btn small" type="button" data-action="logout">Đổi tài khoản</button></div></aside><div><header class="topbar"><span class="crumb">Không gian làm việc / ${esc(name)}</span><div class="top-actions">${
    state.user.role === 'hq'
      ? `<select data-store aria-label="Chọn cửa hàng">${options()
          .map(
            ([id, n]) =>
              `<option value="${id}" ${id === state.store ? 'selected' : ''}>${esc(n)}</option>`,
          )
          .join('')}</select>`
      : `<span class="pill blue">${state.user.role === 'warehouse' ? 'Kho trung tâm' : esc(storeName())}</span>`
  }<span class="user-dot">${esc(state.user.name.slice(0, 1))}</span><span class="user-info"><b>${esc(state.user.name)}</b><small>${esc(label(state.user.role))}</small></span>${btn('Đăng xuất', 'logout', '', 'small')}</div></header><main class="main">${content}</main></div></div>`;
}
function shopShell(content) {
  const user = state.user;
  const count = Object.values(state.cart).reduce((s, n) => s + Number(n), 0);
  return `<header class="shop-header"><a href="#shop" class="brand">V0 TECH<span>.</span></a><div class="store-picker"><span>Cửa hàng</span><select data-store aria-label="Cửa hàng xử lý đơn hàng">${options()
    .map(
      ([id, n]) =>
        `<option value="${id}" ${id === state.store ? 'selected' : ''}>${esc(n)}</option>`,
    )
    .join(
      '',
    )}</select></div><nav><a href="#shop" class="btn ghost small">Sản phẩm</a>${user ? '<a href="#orders" class="btn ghost small">Đơn của tôi</a><a href="#account" class="btn ghost small">Tài khoản</a>' + btn('Thoát', 'logout', '', 'ghost small') : btn('Đăng nhập', 'login', '', 'ghost small')}${btn('Giỏ hàng · ' + count, 'cart', '', 'primary small')}</nav></header><main class="shop-main">${content}</main><footer class="shop-footer"><span class="brand">V0 TECH<span>.</span></span><span>Danh mục chung · Tồn kho theo cửa hàng · Giao dịch đồng bộ</span><span>Bản đồ án · Thanh toán mô phỏng</span></footer>`;
}
async function refreshBase() {
  [state.stores, state.categories, state.brands] = await Promise.all([
    api('/stores'),
    api('/categories'),
    api('/brands'),
  ]);
  if (state.user?.store_id) state.store = state.user.store_id;
  if (!state.stores.some((s) => s.id === state.store)) state.store = state.stores[0]?.id || 2;
}
function portalLinks(currentRole) {
  return Object.values(PORTALS)
    .filter((p) => p.role !== currentRole)
    .map((p) => `<a href="${p.path}">${esc(p.title)} ↗</a>`)
    .join('');
}
function portalFrame(portal, heading, intro, body) {
  return `<main class="portal-page portal-${portal.role}"><section class="portal-intro"><a href="/shop" class="brand">V0 TECH<span>.</span></a><div><div class="eyebrow">Không gian làm việc</div><span class="portal-symbol" aria-hidden="true">${portal.icon}</span><h1>${esc(portal.title)}</h1><p>${esc(portal.description)}</p><span class="pill">Chỉ dành cho tài khoản ${esc(label(portal.role))}</span></div><small>V0 TECH · Hệ thống bán lẻ đa cửa hàng</small></section><section class="portal-entry"><div class="portal-form"><div class="eyebrow">Đăng nhập đúng vai trò</div><h2>${esc(heading)}</h2><p>${esc(intro)}</p>${body}<div class="portal-switch"><h3>Bạn cần cổng khác?</h3>${portalLinks(portal.role)}</div></div></section></main>`;
}
function portalLoginPage(portal) {
  document.title = 'Đăng nhập ' + portal.title + ' · V0 TECH';
  return portalFrame(
    portal,
    'Đăng nhập ' + portal.title,
    'Dùng tài khoản được cấp cho vai trò này để tiếp tục.',
    `<form id="portal-login-form">${field('username', 'Tên đăng nhập', 'text', '', 'required autocomplete="username" maxlength="80"')}${field('password', 'Mật khẩu', 'password', '', 'required autocomplete="current-password" maxlength="128"')}<p class="form-error" role="alert"></p><button class="btn primary" type="submit">Đăng nhập</button></form>`,
  );
}
function portalMismatchPage(portal, user) {
  const correct = PORTALS[user.role];
  document.title = 'Cần mở đúng cổng đăng nhập · V0 TECH';
  return portalFrame(
    portal,
    'Cần mở đúng cổng đăng nhập',
    'Bạn vẫn ở trang đã mở. Vui lòng chọn cổng phù hợp hoặc đăng xuất để đổi tài khoản.',
    `<div class="notice warning" role="alert">Bạn đang đăng nhập bằng tài khoản <strong>${esc(user.username)}</strong> với vai trò <strong>${esc(label(user.role))}</strong>. Trang này dành cho vai trò ${esc(label(portal.role))}. Vui lòng mở đúng trang <strong>${esc(correct.title)}</strong>.</div><div class="actions"><a class="btn primary" href="${correct.path}">Mở cổng ${esc(correct.title)} →</a>${btn('Đăng xuất để đổi tài khoản', 'logout')}</div>`,
  );
}
function showFormError(box, error) {
  box.textContent = error.message;
  if (error.portalUrl) {
    const link = document.createElement('a');
    link.href = error.portalUrl;
    link.textContent = 'Mở cổng đăng nhập phù hợp →';
    link.className = 'portal-error-link';
    box.append(document.createElement('br'), link);
  }
}
async function render() {
  const generation = ++state.generation;
  let staff = false;
  try {
    const current = await api('/auth/me');
    if (generation !== state.generation) return;
    if (current?.id !== state.user?.id) {
      state.user = current;
      await refreshBase();
    } else state.user = current;
    const portal = portalForPath(location.pathname);
    if (state.user && state.user.role !== portal.role) {
      if (modal.open) modal.close();
      $('#app').innerHTML = portalMismatchPage(portal, state.user);
      return;
    }
    if (portal.role !== 'customer' && !state.user) {
      if (modal.open) modal.close();
      $('#app').innerHTML = portalLoginPage(portal);
      return;
    }
    staff = isStaff();
    const available = staff
      ? roles[state.user.role].map((x) => x[0])
      : ['shop', 'orders', 'account'];
    state.page = location.hash.slice(1) || available[0];
    if (!available.includes(state.page)) state.page = available[0];
    const content = await views[state.page]();
    if (generation !== state.generation) return;
    $('#app').innerHTML = staff ? staffShell(content) : shopShell(content);
    document.title = `${staff ? roles[state.user.role].find((x) => x[0] === state.page)?.[2] : 'Cửa hàng'} · V0 TECH`;
  } catch (e) {
    if (generation !== state.generation) return;
    $('#app').innerHTML = (staff ? staffShell : shopShell)(
      head('Không tải được dữ liệu', e.message, btn('Thử lại', 'refresh')),
    );
  }
}

const views = {
  async shop() {
    state.products = await api('/products?store_id=' + state.store);
    const promos = await api('/promotions?store_id=' + state.store);
    return `<section class="hero"><div><div class="eyebrow">Công nghệ cho điều bạn muốn làm</div><h1>Sức mạnh mới.<br>Khởi đầu của bạn.</h1><p>Linh kiện chính hãng, thông số rõ ràng. Chọn cửa hàng gần bạn và xây dựng chiếc máy theo cách của riêng mình.</p><span class="pill">${esc(storeName())} · Tồn kho cập nhật từ hệ thống</span></div><img src="/IMG/vga.png" alt="Card đồ họa cho máy tính hiệu năng cao"></section>${promos.length ? `<div class="notice">Ưu đãi tại cửa hàng: ${promos.map((p) => `<b>${esc(p.code)}</b> · ${esc(p.name)}`).join(' &nbsp; / &nbsp; ')}</div>` : ''}<div class="section-title"><h2>Linh kiện nổi bật</h2><small>${state.products.length} sản phẩm</small></div><div class="catalog-filters"><input type="search" data-product-filter placeholder="Tìm theo tên, SKU hoặc thương hiệu…" aria-label="Tìm sản phẩm"><select data-category-filter aria-label="Lọc loại hàng"><option value="">Tất cả ngành hàng</option>${state.categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div><div class="products">${state.products.map((p) => productCard(p)).join('') || empty('Chưa có sản phẩm', 'Vui lòng chọn cửa hàng khác.')}</div>`;
  },
  async dashboard() {
    const report = await api('/reports?store_id=' + selectedStore());
    state.report = report;
    const orders = await api('/orders?store_id=' + selectedStore());
    return (
      head(
        state.user.role === 'employee' ? 'Hiệu suất của bạn' : 'Tổng quan kinh doanh',
        `${storeName()} · Số liệu từ ngày ${report.from} đến ${report.to}`,
        badge('finished'),
      ) +
      reportCards(report) +
      `<div class="grid2">${card('Doanh số đã hoàn tất', `<div class="card-body">${chart(report.daily)}</div>`, '<a href="#reports" class="btn small ghost">Xem báo cáo ↗</a>')}${card('Trạng thái đơn hàng', `<div class="card-body status-list">${report.statuses.map((s) => `<div class="status-line">${badge(s.status)}<b>${s.count}</b></div>`).join('') || empty('Chưa có đơn hàng')}</div>`)}</div>` +
      card(
        'Giao dịch gần đây',
        orderTable(orders.slice(0, 7)),
        `<a class="btn small" href="#orders">Tất cả đơn hàng</a>`,
      )
    );
  },
  async orders() {
    if (!state.user)
      return head(
        'Đơn hàng của bạn',
        'Đăng nhập để theo dõi đơn hàng đã lưu trong hệ thống.',
        btn('Đăng nhập', 'login', '', 'primary'),
      );
    const rows = await api('/orders?store_id=' + selectedStore());
    return (
      head(
        isStaff() ? 'Quản lý đơn hàng' : 'Đơn hàng của tôi',
        isStaff()
          ? 'Theo dõi trạng thái xử lý và thanh toán riêng biệt.'
          : 'Theo dõi tiến độ, thanh toán và gửi yêu cầu hỗ trợ.',
      ) +
      card('Danh sách đơn hàng', toolbar('Tìm mã đơn, khách hàng, trạng thái…') + orderTable(rows))
    );
  },
  async inventory() {
    const location =
      state.user.role === 'warehouse'
        ? 1
        : state.user.role === 'hq'
          ? state.inventoryLocation || 1
          : selectedStore();
    const rows = await api('/inventory?store_id=' + location);
    state.inventory = rows;
    return (
      head(
        state.user.role === 'warehouse' ? 'Tồn kho trung tâm' : 'Tồn kho cửa hàng',
        'Theo dõi lượng khả dụng và ngưỡng cần bổ sung.',
        ['hq', 'warehouse'].includes(state.user.role)
          ? btn('Điều chỉnh tồn kho', 'adjust', '', 'primary')
          : state.user.role === 'manager'
            ? btn('＋ Yêu cầu bổ sung', 'new-restock', '', 'primary')
            : '',
      ) +
      `<div class="metrics">${metric('Tổng sản phẩm', rows.length, 'Danh mục dùng chung', '▦')}${metric(
        'Đơn vị khả dụng',
        rows.reduce((s, r) => s + r.quantity, 0),
        'Đã trừ lượng giữ cho đơn hàng',
        '◫',
      )}${metric('Cần bổ sung', rows.filter((r) => r.low_stock).length, 'Tồn khả dụng ≤ ngưỡng cảnh báo', '↓')}${metric('Hết hàng', rows.filter((r) => !r.quantity).length, 'Không thể tạo đơn mới', '!')}</div>` +
      card(
        'Chi tiết tồn kho',
        (state.user.role === 'hq'
          ? '<div class="toolbar"><select data-inventory-location aria-label="Địa điểm tồn kho">' +
            [[1, 'Kho trung tâm'], ...options()]
              .map(
                ([id, name]) =>
                  '<option value="' +
                  id +
                  '" ' +
                  (id === location ? 'selected' : '') +
                  '>' +
                  esc(name) +
                  '</option>',
              )
              .join('') +
            '</select></div>'
          : '') +
          toolbar() +
          table(
            ['Sản phẩm', 'Loại / Hãng', 'Khả dụng', 'Ngưỡng', 'Tình trạng', ''],
            rows.map((r) => [
              `<b>${esc(r.name)}</b><span class="sub">${esc(r.sku)}</span>`,
              `${esc(r.category)}<span class="sub">${esc(r.brand)}</span>`,
              `<b>${r.quantity}</b>`,
              r.min_quantity,
              r.low_stock
                ? '<span class="pill amber">Cần bổ sung</span>'
                : '<span class="pill green">Sẵn sàng</span>',
              ['hq', 'manager'].includes(state.user.role)
                ? btn('Đổi ngưỡng', 'threshold', r.product_id, 'small')
                : '',
            ]),
          ),
      )
    );
  },
  async restocks() {
    const rows = await api('/restocks');
    state.restocks = rows;
    return (
      head(
        state.user.role === 'warehouse' ? 'Điều chuyển từ kho trung tâm' : 'Bổ sung hàng hóa',
        'Gửi yêu cầu → Trụ sở duyệt → Kho xuất → Cửa hàng nhận.',
        state.user.role === 'manager' ? btn('＋ Tạo yêu cầu', 'new-restock', '', 'primary') : '',
      ) +
      card(
        'Yêu cầu bổ sung',
        toolbar() +
          table(
            ['Mã yêu cầu', 'Cửa hàng / Ngày tạo', 'Sản phẩm', 'Trạng thái', ''],
            rows.map((r) => [
              `<b>${esc(r.code)}</b>`,
              `${esc(r.store_name)}<span class="sub">${date(r.created_at)}</span>`,
              r.items.map((i) => `${esc(i.name)} × ${i.quantity}`).join('<br>'),
              badge(r.status),
              `<div class="actions">${state.user.role === 'hq' && r.status === 'submitted' ? btn('Duyệt', 'restock-approve', r.id, 'small primary') + btn('Từ chối', 'restock-reject', r.id, 'small') : ''}${['hq', 'warehouse'].includes(state.user.role) && r.status === 'approved' ? btn('Xuất kho', 'restock-ship', r.id, 'small primary') : ''}${state.user.role === 'manager' && r.status === 'shipped' ? btn('Đã nhận đủ', 'restock-receive', r.id, 'small primary') : ''}</div>`,
            ]),
          ),
      )
    );
  },
  async staff() {
    const rows = await api('/staff');
    state.staff = rows;
    return (
      head(
        'Nhân viên & hiệu suất',
        'Thông tin nhân viên, doanh số hoàn tất và hoa hồng đã ghi nhận.',
        btn('＋ Thêm nhân viên', 'new-staff', '', 'primary'),
      ) +
      card(
        'Đội ngũ vận hành',
        toolbar() +
          table(
            ['Nhân viên', 'Vai trò / Cửa hàng', 'Doanh số', 'Hoa hồng', 'Trạng thái', ''],
            rows.map((u) => [
              `<b>${esc(u.name)}</b><span class="sub">${esc(u.username)} · ${esc(u.phone)}</span>`,
              `${esc(label(u.role))}<span class="sub">${esc(u.store_name || 'Toàn hệ thống')}</span>`,
              money(u.sales),
              money(u.commission),
              u.active
                ? '<span class="pill green">Hoạt động</span>'
                : '<span class="pill red">Đã khóa</span>',
              u.id !== state.user.id && (state.user.role === 'hq' || u.role === 'employee')
                ? btn('Chỉnh sửa', 'edit-staff', u.id, 'small')
                : '',
            ]),
          ),
      )
    );
  },
  async promotions() {
    const rows = await api('/promotions?store_id=' + selectedStore());
    state.promotions = rows;
    return (
      head(
        'Khuyến mãi & ưu đãi',
        'Mỗi giao dịch áp dụng tối đa một mã. Phạm vi và điều kiện được kiểm tra ở server.',
        btn('＋ Tạo chương trình', 'new-promo', '', 'primary'),
      ) +
      card(
        'Chương trình khuyến mãi',
        toolbar() +
          table(
            ['Chương trình', 'Ưu đãi / Điều kiện', 'Hiệu lực', 'Phạm vi', ''],
            rows.map((p) => [
              `<b>${esc(p.code)}</b><span class="sub">${esc(p.name)}</span>`,
              `${p.kind === 'percent' ? p.value + '%' : money(p.value)}<span class="sub">Đơn từ ${money(p.min_total)} · ${esc(label(p.channel))}</span>`,
              `${date(p.starts_at)}<span class="sub">đến ${date(p.ends_at)}</span>`,
              `${
                p.scope === 'all'
                  ? 'Toàn hệ thống'
                  : p.store_ids
                      .map((id) => state.stores.find((s) => s.id === id)?.name || id)
                      .map(esc)
                      .join(', ')
              }<span class="sub">${p.active ? 'Đang bật' : 'Đã tắt'}</span>`,
              state.user.role === 'hq' || p.owner_store_id === state.user.store_id
                ? btn(p.active ? 'Tạm dừng' : 'Bật lại', 'toggle-promo', p.id, 'small')
                : 'Từ trụ sở',
            ]),
          ),
      )
    );
  },
  async commissions() {
    const rows = await api('/commissions');
    return (
      head(
        'Hoa hồng của bạn',
        'Chỉ ghi nhận khi đơn hoàn tất; bản ghi được giữ lại khi đảo hoa hồng.',
      ) +
      `<div class="metrics">${metric('Tổng được ghi nhận', money(rows.filter((r) => r.status === 'earned').reduce((s, r) => s + Number(r.amount), 0)), 'Số liệu của tối đa 200 bản ghi gần nhất', '◈')}${metric('Giao dịch đủ điều kiện', rows.filter((r) => r.status === 'earned').length, 'Online và tại cửa hàng', '▤')}</div>` +
      card(
        'Lịch sử hoa hồng',
        table(
          ['Đơn hàng', 'Kênh bán', 'Tỷ lệ', 'Hoa hồng', 'Trạng thái', 'Ngày'],
          rows.map((r) => [
            btn(r.code, 'order-detail', r.order_id, 'small ghost'),
            esc(label(r.channel)),
            r.rate_bps / 100 + '%',
            money(r.amount),
            badge(r.status),
            date(r.created_at),
          ]),
        ),
      )
    );
  },
  async reports() {
    const q = new URLSearchParams({
      ...state.reportFilter,
      ...(state.user.role === 'hq' ? {} : { store_id: selectedStore() }),
    });
    if (state.user.role === 'hq' && state.reportFilter.store_id)
      q.set('store_id', state.reportFilter.store_id);
    const r = await api('/reports?' + q);
    state.report = r;
    return (
      head('Báo cáo kinh doanh', r.definition, btn('↓ Xuất CSV', 'export-report')) +
      `<form id="report-filter" class="report-filter">${state.user.role === 'hq' ? select('store_id', 'Phạm vi', [['', 'Toàn công ty'], ...options()], state.reportFilter.store_id || '') : ''}${field('from', 'Từ ngày', 'date', r.from, 'required')}${field('to', 'Đến ngày', 'date', r.to, 'required')}<button class="btn primary">Áp dụng</button></form>` +
      reportCards(r) +
      card('Doanh số theo ngày', `<div class="card-body">${chart(r.daily)}</div>`) +
      card(
        'Hiệu suất nhân viên',
        table(
          ['Nhân viên', 'Đơn hoàn tất', 'Doanh số', 'Hoa hồng'],
          r.staff.map((s) => [esc(s.name), s.orders, money(s.sales), money(s.commission)]),
        ),
      ) +
      card(
        'Lượt sử dụng khuyến mãi',
        table(
          ['Mã', 'Số lượt', 'Tổng giảm'],
          r.promotions.map((p) => [esc(p.code), p.uses, money(p.discount)]),
        ),
      )
    );
  },
  async requests() {
    const rows = await api('/order-requests');
    state.requests = rows;
    return (
      head(
        'Yêu cầu hủy & trả hàng',
        'Quản lý xem xét từng yêu cầu. Hoàn tiền được mô phỏng, không kết nối ngân hàng.',
      ) +
      card(
        'Yêu cầu của khách hàng',
        toolbar() +
          table(
            ['Đơn hàng', 'Loại yêu cầu', 'Lý do', 'Trạng thái', ''],
            rows.map((r) => [
              btn(r.code, 'order-detail', r.order_id, 'ghost small'),
              esc(label(r.kind)),
              esc(r.reason),
              badge(r.status),
              r.status === 'pending'
                ? `<div class="actions">${btn('Chấp thuận', 'request-approve', r.id, 'small primary')}${btn('Từ chối', 'request-reject', r.id, 'small')}</div>`
                : esc(r.resolution),
            ]),
          ),
      )
    );
  },
  async catalog() {
    state.products = await api('/products?store_id=' + selectedStore());
    return (
      head(
        'Danh mục sản phẩm chung',
        'Giá và thông tin thống nhất cho mọi cửa hàng; số lượng được theo dõi riêng.',
        btn('＋ Thêm sản phẩm', 'new-product', '', 'primary'),
      ) +
      card(
        'Sản phẩm',
        toolbar() +
          table(
            ['Sản phẩm / SKU', 'Loại / Hãng', 'Giá bán', 'Giá vốn', 'Trạng thái', ''],
            state.products.map((p) => [
              `<b>${esc(p.name)}</b><span class="sub">${esc(p.sku)}</span>`,
              `${esc(p.category)}<span class="sub">${esc(p.brand)}</span>`,
              money(p.price),
              money(p.avg_cost),
              badge(p.status),
              btn('Chỉnh sửa', 'edit-product', p.id, 'small'),
            ]),
          ),
      ) +
      `<div class="grid-equal">${card(
        'Loại hàng',
        table(
          ['Mã', 'Tên', ''],
          state.categories.map((c) => [
            esc(c.code),
            `${esc(c.name)}<span class="sub">${esc(c.status)}</span>`,
            btn('Sửa', 'edit-category', c.id, 'small'),
          ]),
        ),
        btn('＋ Thêm', 'new-category', '', 'small'),
      )}${card(
        'Thương hiệu',
        table(
          ['Tên', 'Trạng thái', ''],
          state.brands.map((b) => [
            esc(b.name),
            badge(b.status),
            btn('Sửa', 'edit-brand', b.id, 'small'),
          ]),
        ),
        btn('＋ Thêm', 'new-brand', '', 'small'),
      )}</div>`
    );
  },
  async company() {
    const c = await api('/company');
    state.company = c;
    return (
      head(
        'Công ty & hệ thống cửa hàng',
        'Quản lý thông tin tập trung và cấu hình hoa hồng theo từng cửa hàng.',
        btn('＋ Thêm cửa hàng', 'new-store', '', 'primary'),
      ) +
      card(
        c.name,
        `<div class="card-body"><p>${esc(c.address)} · ${esc(c.phone)}</p>${btn('Cập nhật công ty', 'edit-company')}</div>`,
      ) +
      card(
        'Cửa hàng bán lẻ',
        table(
          ['Mã', 'Tên / Địa chỉ', 'Hoa hồng cấu hình', 'Trạng thái', ''],
          state.stores.map((s) => [
            esc(s.code),
            `<b>${esc(s.name)}</b><span class="sub">${esc(s.address)}</span>`,
            s.commission_bps / 100 + '%',
            s.active
              ? '<span class="pill green">Hoạt động</span>'
              : '<span class="pill red">Tạm dừng</span>',
            btn('Chỉnh sửa', 'edit-store', s.id, 'small'),
          ]),
        ),
      )
    );
  },
  async movements() {
    const rows = await api('/movements');
    return (
      head(
        'Biến động tồn kho',
        'Mỗi lần giữ hàng, xuất, nhận và trả hàng đều có bản ghi truy vết.',
      ) +
      card(
        'Lịch sử',
        toolbar() +
          table(
            ['Thời gian', 'Sản phẩm', 'Địa điểm', 'Thay đổi', 'Nghiệp vụ', 'Người thực hiện'],
            rows.map((r) => [
              date(r.created_at),
              esc(r.product_name),
              esc(r.location),
              (r.delta > 0 ? '+' : '') + r.delta,
              esc(r.reason),
              esc(r.actor),
            ]),
          ),
      )
    );
  },
  async audit() {
    const rows = await api('/audit');
    return (
      head(
        'Nhật ký hệ thống',
        'Các thao tác quan trọng được ghi cùng giao dịch nghiệp vụ; hiển thị 200 bản ghi gần nhất.',
      ) +
      card(
        'Lịch sử thao tác',
        toolbar() +
          table(
            ['Thời gian', 'Người thực hiện', 'Thao tác', 'Đối tượng', 'Chi tiết'],
            rows.map((r) => [
              date(r.created_at),
              esc(r.actor),
              esc(r.action),
              esc(r.entity) + ' #' + r.entity_id,
              esc(typeof r.details === 'string' ? r.details : JSON.stringify(r.details)),
            ]),
          ),
      )
    );
  },
  async sale() {
    state.products = await api('/products?store_id=' + selectedStore());
    return (
      head(
        'Lập hóa đơn tại cửa hàng',
        'Chọn sản phẩm thực có, áp dụng một mã ưu đãi và xác nhận đã thu tiền.',
      ) +
      card(
        'Hóa đơn mới',
        `<div class="card-body"><form id="sale-form">${lineEditor()}<div class="form-grid">${field('customer_name', 'Tên khách hàng', 'text', '', 'required maxlength="160"')}${field('phone', 'Số điện thoại', 'tel', '', 'maxlength="30"')}${field('promo_code', 'Mã khuyến mãi', 'text', '', 'maxlength="40"')}${select('payment_method', 'Phương thức thanh toán', ['cash', 'card', 'qr'])}${check('payment_confirmed', 'Tôi xác nhận đã thu đủ tiền (thẻ/QR là mô phỏng trong bản đồ án).')}</div><p class="form-error" role="alert"></p><div class="form-actions"><button class="btn primary">Lập hóa đơn & hoàn tất</button></div></form></div>`,
      )
    );
  },
  async account() {
    if (!state.user)
      return head(
        'Tài khoản khách hàng',
        'Đăng nhập hoặc đăng ký để đặt hàng và xem lịch sử.',
        btn('Đăng nhập', 'login', '', 'primary'),
      );
    return (
      head('Tài khoản của bạn', 'Thông tin thành viên được lưu trong cơ sở dữ liệu.') +
      card(
        'Thông tin thành viên',
        `<div class="card-body profile"><span class="user-dot">${esc(state.user.name.slice(0, 1))}</span><div><h2>${esc(state.user.name)}</h2><p>${esc(state.user.phone || 'Chưa có số điện thoại')}</p><span class="pill blue">${esc(state.user.membership)}</span></div></div>`,
      )
    );
  },
};
function reportCards(r) {
  return `<div class="metrics">${metric('Doanh số hoàn tất', money(r.revenue), r.finished_orders + ' giao dịch đủ điều kiện', '↗')}${metric('Bán hàng trực tuyến', money(r.online), 'Theo ngày hoàn tất đơn', '▤')}${metric('Bán tại cửa hàng', money(r.offline), 'Hóa đơn đã xác nhận thu tiền', '▦')}${metric('Hoa hồng đã ghi nhận', money(r.commission), 'Loại trừ hoa hồng đã đảo', '◈')}</div>`;
}
function chart(rows) {
  if (!rows.length)
    return empty('Chưa có doanh số hoàn tất', 'Hoàn tất đơn hàng hoặc lập hóa đơn để xem biểu đồ.');
  const max = Math.max(...rows.map((r) => Number(r.revenue)), 1);
  return `<div class="bars">${rows.map((r) => `<div class="bar-row"><span>${esc(r.day)}</span><meter min="0" max="${max}" value="${Number(r.revenue)}" aria-label="Doanh số ngày ${esc(r.day)}"></meter><b>${money(r.revenue)}</b></div>`).join('')}</div>`;
}
function orderTable(rows) {
  return table(
    ['Mã đơn / Ngày', 'Khách hàng', 'Cửa hàng / Kênh', 'Tổng tiền', 'Đơn hàng', 'Thanh toán', ''],
    rows.map((o) => [
      `<b>${esc(o.code)}</b><span class="sub">${date(o.created_at)}</span>`,
      `${esc(o.customer_name)}<span class="sub">${esc(o.phone)}</span>`,
      `${esc(o.store_name)}<span class="sub">${esc(label(o.channel))}</span>`,
      money(o.total),
      badge(o.status),
      badge(o.payment_status),
      btn('Chi tiết', 'order-detail', o.id, 'small'),
    ]),
  );
}
function productImage(p) {
  const key = p.category.toLowerCase();
  return key.includes('cpu')
    ? 'cpu'
    : key.includes('ram')
      ? 'ram'
      : key.includes('vga')
        ? 'vga'
        : key.includes('main')
          ? 'mainboard'
          : key.includes('ssd') || key.includes('hdd')
            ? 'ssd'
            : key.includes('nguồn')
              ? 'psu'
              : key.includes('case')
                ? 'case'
                : key.includes('tản')
                  ? 'cooler'
                  : key.includes('màn')
                    ? 'monitor'
                    : 'keyboard';
}
function productCard(p) {
  return `<article class="product" data-product-id="${p.id}" data-category="${p.category_id}" data-text="${esc((p.name + ' ' + p.sku + ' ' + p.brand).toLowerCase())}"><div class="product-image"><span class="pill blue">${esc(p.category)}</span><img loading="lazy" src="/IMG/${productImage(p)}.png" alt="Ảnh minh họa ${esc(p.category)}"></div><div class="product-info"><small>${esc(p.brand)} · ${esc(p.sku)}</small><h3>${esc(p.name)}</h3><p>${esc(p.specs || '')}<br>Bảo hành ${p.warranty_months} tháng · Ảnh minh họa</p><div class="product-bottom"><div class="price">${money(p.price)}</div>${p.available > 0 ? btn('＋ Thêm', 'add-cart', p.id, 'primary small') : '<span class="pill">Hết hàng</span>'}</div><div class="stock-note">${p.available > 0 ? 'Có sẵn ' + p.available + ' tại cửa hàng' : 'Vui lòng chọn cửa hàng khác'}</div></div></article>`;
}
function lineEditor() {
  return `<div id="lines">${lineRow()}</div>${btn('＋ Thêm dòng sản phẩm', 'add-line', '', 'small')}<p class="muted">Đơn giá và tồn kho được server kiểm tra khi lưu.</p>`;
}
function lineRow() {
  const products = state.products;
  return `<div class="line-item"><select name="product_id" aria-label="Sản phẩm">${products.map((p) => `<option value="${p.id}">${esc(p.name)} · ${money(p.price)}</option>`).join('')}</select><input name="quantity" type="number" min="1" max="10000" value="1" required aria-label="Số lượng">${btn('✕', 'remove-line', '', 'small ghost')}</div>`;
}
function readLines(form) {
  return [...form.querySelectorAll('.line-item')].map((r) => ({
    product_id: Number($('[name=product_id]', r).value),
    quantity: Number($('[name=quantity]', r).value),
  }));
}
function loginDialog(register = false) {
  const body = `<div class="login-box"><span class="brand">V0 TECH<span>.</span></span><p>${register ? 'Tạo tài khoản khách hàng để đặt hàng và theo dõi đơn.' : 'Đăng nhập để tiếp tục công việc hoặc theo dõi đơn hàng.'}</p>${register ? field('name', 'Họ tên', 'text', '', 'required maxlength="160"') + field('phone', 'Số điện thoại', 'tel', '', 'required maxlength="30"') : ''}${field('username', 'Tên đăng nhập', 'text', '', 'required autocomplete="username" maxlength="80"')}${field('password', 'Mật khẩu', 'password', '', 'required minlength="' + (register ? 10 : 1) + '" maxlength="128" autocomplete="' + (register ? 'new-password' : 'current-password') + '"')}<p>${register ? 'Đã có tài khoản?' : 'Khách hàng mới?'} ${btn(register ? 'Đăng nhập' : 'Đăng ký', register ? 'login' : 'register', '', 'ghost small')}</p></div>`;
  dialog(register ? 'Tạo tài khoản khách hàng' : 'Đăng nhập khách hàng', body, async (data) => {
    state.user = await api('/auth/' + (register ? 'register' : 'login'), {
      method: 'POST',
      body: { ...Object.fromEntries(data), ...(!register ? { portal_role: 'customer' } : {}) },
    });
    await refreshBase();
    location.hash = isStaff() ? roles[state.user.role][0][0] : 'shop';

    toast('Đăng nhập thành công.');
  });
  $('#dialog-form button[type=submit]', modal).textContent = register
    ? 'Tạo tài khoản'
    : 'Đăng nhập';
}
async function productForm(id) {
  const p = id ? state.products.find((x) => x.id === Number(id)) : {};
  dialog(
    id ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm',
    `<div class="form-grid">${field('sku', 'SKU', 'text', p.sku || '', 'required maxlength="60"')}${field('barcode', 'Mã vạch', 'text', p.barcode || '', 'maxlength="60"')}${field('name', 'Tên sản phẩm', 'text', p.name || '', 'required maxlength="255"')}${select(
      'category_id',
      'Ngành hàng',
      state.categories.map((c) => [c.id, c.name]),
      p.category_id,
    )}${select(
      'brand_id',
      'Thương hiệu',
      state.brands.map((b) => [b.id, b.name]),
      p.brand_id,
    )}${field('price', 'Giá bán (₫)', 'number', p.price || 0, 'required min="0" max="1000000000000" step="1"')}${field('avg_cost', 'Giá vốn (₫)', 'number', p.avg_cost || 0, 'required min="0" max="1000000000000" step="1"')}${field('warranty_months', 'Bảo hành (tháng)', 'number', p.warranty_months || 0, 'required min="0" max="240"')}${select('status', 'Trạng thái', ['Đang kinh doanh', 'Tạm ngừng bán', 'Ngừng kinh doanh'], p.status || 'Đang kinh doanh')}${area('specs', 'Thông số', p.specs || '')}${check('serial_managed', 'Sản phẩm có quản lý serial (thuộc tính danh mục)', p.serial_managed)}</div>`,
    async (data) => {
      const b = Object.fromEntries(data);
      b.serial_managed = data.has('serial_managed');
      await api('/products' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body: b });
      await refreshBase();
      toast('Đã lưu sản phẩm.');
    },
    true,
  );
}
function storeForm(id) {
  const s = id ? state.stores.find((x) => x.id === Number(id)) : {};
  dialog(
    id ? 'Cấu hình cửa hàng' : 'Thêm cửa hàng',
    `<div class="notice">Tỷ lệ hoa hồng do trụ sở cấu hình. 100 điểm cơ bản = 1%. Thay đổi chỉ áp dụng cho đơn tạo sau thời điểm lưu.</div><div class="form-grid">${id ? '' : field('code', 'Mã cửa hàng', 'text', '', 'required maxlength="30"')}${field('name', 'Tên cửa hàng', 'text', s.name || '', 'required maxlength="160"')}${field('address', 'Địa chỉ', 'text', s.address || '', 'maxlength="255"')}${field('phone', 'Điện thoại', 'tel', s.phone || '', 'maxlength="30"')}${field('commission_bps', 'Hoa hồng (điểm cơ bản)', 'number', s.commission_bps ?? 0, 'required min="0" max="10000"')}${id ? check('active', 'Cửa hàng đang hoạt động', s.active) : ''}</div>`,
    async (data) => {
      const b = Object.fromEntries(data);
      b.active = data.has('active');
      await api('/stores' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body: b });
      await refreshBase();
      toast('Đã lưu cửa hàng.');
    },
  );
}
function staffForm(id) {
  const u = id ? state.staff.find((x) => x.id === Number(id)) : {};
  dialog(
    id ? 'Cập nhật nhân viên' : 'Tạo tài khoản nhân viên',
    `<div class="form-grid">${id ? '' : field('username', 'Tên đăng nhập', 'text', '', 'required minlength="3" maxlength="80"')}${field('name', 'Họ tên', 'text', u.name || '', 'required maxlength="160"')}${field('phone', 'Điện thoại', 'tel', u.phone || '', 'maxlength="30"')}${field('email', 'Email', 'email', u.email || '', 'maxlength="160"')}${field('password', id ? 'Mật khẩu mới (để trống để giữ nguyên)' : 'Mật khẩu', 'password', '', (id ? '' : 'required ') + 'minlength="10" maxlength="128" autocomplete="new-password"')}${!id && state.user.role === 'hq' ? select('role', 'Vai trò', ['employee', 'manager', 'warehouse', 'hq'], 'employee') + select('store_id', 'Cửa hàng (cho quản lý/nhân viên)', options(), selectedStore()) : ''}${id ? check('active', 'Tài khoản đang hoạt động', u.active) : ''}</div>`,
    async (data) => {
      const b = Object.fromEntries(data);
      b.active = data.has('active');
      if (!b.store_id) b.store_id = selectedStore();
      await api('/staff' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body: b });
      toast('Đã lưu nhân viên.');
    },
  );
}
function promoForm() {
  const today = new Date();
  const end = new Date(today.getTime() + 30 * 86400000);
  dialog(
    'Tạo chương trình khuyến mãi',
    `<div class="form-grid">${field('code', 'Mã ưu đãi', 'text', '', 'required maxlength="40"')}${field('name', 'Tên chương trình', 'text', '', 'required maxlength="160"')}${select(
      'kind',
      'Loại giảm',
      [
        ['percent', 'Phần trăm'],
        ['fixed', 'Số tiền cố định'],
      ],
      'percent',
    )}${field('value', 'Giá trị giảm', 'number', 10, 'required min="1"')}${field('min_total', 'Đơn tối thiểu (₫)', 'number', 0, 'required min="0"')}${field('max_discount', 'Giảm tối đa (₫), tùy chọn', 'number', '', 'min="1"')}${field('starts_at', 'Bắt đầu', 'datetime-local', today.toISOString().slice(0, 16), 'required')}${field('ends_at', 'Kết thúc', 'datetime-local', end.toISOString().slice(0, 16), 'required')}${select('channel', 'Kênh bán', ['all', 'online', 'offline'], 'all')}${state.user.role === 'hq' ? select('scope', 'Phạm vi', ['all', 'selected'], 'all') + '<div class="full"><p>Áp dụng tại cửa hàng được chọn:</p>' + state.stores.map((s) => check('store_ids', s.name, false).replace('type="checkbox"', `type="checkbox" value="${s.id}"`)).join('') + '</div>' : '<div class="notice">Chỉ áp dụng trong cửa hàng được phân quyền.</div>'}</div>`,
    async (data) => {
      const b = Object.fromEntries(data);
      b.store_ids = data.getAll('store_ids').map(Number);
      await api('/promotions', { method: 'POST', body: b });
      toast('Đã tạo khuyến mãi.');
    },
    true,
  );
}
async function newRestock() {
  state.products = await api('/products?store_id=' + selectedStore());
  dialog(
    'Yêu cầu bổ sung hàng',
    lineEditor() + area('note', 'Ghi chú'),
    async (data, form) => {
      await api('/restocks', {
        method: 'POST',
        body: { store_id: selectedStore(), items: readLines(form), note: data.get('note') },
      });
      toast('Đã gửi yêu cầu lên trụ sở.');
    },
    true,
  );
}
async function orderDetail(id) {
  const o = await api('/orders/' + id);
  const role = state.user.role;
  let tools = '';
  if (role === 'manager' && o.channel === 'online') {
    if (['new', 'confirmed'].includes(o.status) && !o.employee_id)
      tools += btn('Phân công nhân viên', 'assign', o.id, 'primary small');
    if (
      o.payment.status === 'pending' &&
      (o.payment_method !== 'cod' || o.status === 'received') &&
      !['finished', 'returned', 'cancelled'].includes(o.status)
    )
      tools += btn('Xác minh thu tiền', 'verify-payment', o.id, 'small');
    if (o.status === 'new') tools += btn('Xác nhận đơn', 'confirm-order', o.id, 'small primary');
    if (o.status === 'confirmed')
      tools += btn('Khách đã nhận hàng', 'receive-order', o.id, 'small primary');
    if (o.status === 'received')
      tools += btn('Hoàn tất đơn', 'finish-order', o.id, 'small primary');
  }
  if (role === 'employee' && o.channel === 'online' && ['confirmed', 'received'].includes(o.status))
    tools += btn('Ghi tiến độ xử lý', 'process-order', o.id, 'small primary');
  if (['customer', 'manager'].includes(role)) {
    if (['new', 'confirmed'].includes(o.status))
      tools += btn('Yêu cầu hủy', 'cancel-request', o.id, 'small danger');
    if (o.status === 'finished') tools += btn('Yêu cầu trả hàng', 'return-request', o.id, 'small');
  }
  dialog(
    'Chi tiết ' + o.code,
    `<div class="detail-grid"><div><small>Khách hàng</small><b>${esc(o.customer_name)}</b><p>${esc(o.phone)}</p></div><div><small>Ngày tạo / Kênh</small><b>${date(o.created_at)}</b><p>${esc(label(o.channel))}</p></div><div><small>Trạng thái đơn</small>${badge(o.status)}</div><div><small>Thanh toán · ${esc(label(o.payment_method))}</small>${badge(o.payment.status)}</div><div><small>Nhận hàng</small><b>${esc(label(o.fulfillment))}</b><p>${esc(o.address)}</p></div><div><small>Nhân viên phụ trách</small><b>${o.employee_id ? '#' + o.employee_id : 'Chưa phân công'}</b></div></div>${table(
      ['Sản phẩm', 'Số lượng', 'Đơn giá', 'Thành tiền'],
      o.items.map((i) => [
        `${esc(i.name)}<span class="sub">${esc(i.sku)}</span>`,
        i.quantity,
        money(i.unit_price),
        money(i.quantity * i.unit_price),
      ]),
    )}<div class="order-total"><span>Tạm tính</span><b>${money(o.subtotal)}</b></div><div class="order-total"><span>Giảm giá</span><b>− ${money(o.discount)}</b></div><div class="order-total final"><span>Tổng thanh toán</span><b>${money(o.total)}</b></div>${
      o.requests.length
        ? '<h3>Yêu cầu hỗ trợ</h3>' +
          table(
            ['Loại', 'Lý do', 'Trạng thái'],
            o.requests.map((r) => [esc(label(r.kind)), esc(r.reason), badge(r.status)]),
          )
        : ''
    }<div class="notice warning no-print">Bản đồ án dùng xác minh thanh toán và hoàn tiền mô phỏng, không thu tiền thật.</div><div class="actions no-print">${tools}${btn('In hóa đơn', 'print', '', 'small')}</div>`,
    null,
    true,
  );
}
async function cartDialog() {
  state.products = await api('/products?store_id=' + state.store);
  const entries = Object.entries(state.cart).filter(([, qty]) => qty > 0);
  const total = entries.reduce(
    (s, [id, qty]) => s + Number(state.products.find((p) => p.id === Number(id))?.price || 0) * qty,
    0,
  );
  dialog(
    'Giỏ hàng của bạn',
    entries.length
      ? `<div class="notice">Cửa hàng xử lý: <b>${esc(storeName())}</b>. Giá và số lượng được kiểm tra lại khi tạo đơn.</div>${entries
          .map(([id, qty]) => {
            const p = state.products.find((p) => p.id === Number(id));
            return `<div class="cart-line"><div><b>${esc(p?.name || 'Sản phẩm hiện không khả dụng')}</b><span class="sub">${p ? money(p.price) + ' · Khả dụng ' + p.available : ''}</span></div><input type="number" min="1" max="10000" value="${Number(qty)}" data-cart-qty="${id}" aria-label="Số lượng"><b class="cart-price">${money((p?.price || 0) * qty)}</b>${btn('✕', 'remove-cart', id, 'ghost small')}</div>`;
          })
          .join(
            '',
          )}<div class="order-total final"><span>Tạm tính</span><b>${money(total)}</b></div><div class="form-actions">${btn('Tiếp tục mua', 'close')}${btn('Đặt hàng', 'checkout', '', 'primary')}</div>`
      : empty('Giỏ hàng đang trống', 'Thêm sản phẩm từ danh mục để bắt đầu mua sắm.'),
  );
}
function checkoutDialog() {
  if (!state.user) return loginDialog();
  if (state.user.role !== 'customer') {
    toast('Vui lòng dùng tài khoản khách hàng để đặt hàng online.');
    return;
  }
  const entries = Object.entries(state.cart).filter(([, qty]) => qty > 0);
  if (!entries.length) {
    toast('Giỏ hàng đang trống.');
    return;
  }
  for (const [id, qty] of entries) {
    const p = state.products.find((p) => p.id === Number(id));
    if (!p || qty > p.available) {
      toast('Có sản phẩm không đủ tồn kho. Chọn cửa hàng khác hoặc giảm số lượng.');
      return;
    }
  }
  const key = crypto.randomUUID();
  dialog(
    'Đặt hàng tại ' + storeName(),
    `<div class="notice">Thẻ và QR được quản lý xác minh bằng thao tác mô phỏng. Không nhập số thẻ hoặc thông tin ngân hàng thật.</div><div class="form-grid">${field('customer_name', 'Họ tên người nhận', 'text', state.user.name, 'required maxlength="160"')}${field('phone', 'Số điện thoại', 'tel', state.user.phone, 'required maxlength="30"')}${select('fulfillment', 'Hình thức nhận', ['pickup', 'delivery'], 'pickup')}${select('payment_method', 'Thanh toán', ['cod', 'qr', 'card'], 'cod')}${field('address', 'Địa chỉ (bắt buộc nếu giao tận nơi)', 'text', '', 'maxlength="255"')}${field('promo_code', 'Mã khuyến mãi', 'text', '', 'maxlength="40"')}${area('note', 'Ghi chú')}</div>`,
    async (data) => {
      const order = await api('/orders', {
        method: 'POST',
        body: {
          ...Object.fromEntries(data),
          store_id: state.store,
          items: entries.map(([id, quantity]) => ({ product_id: Number(id), quantity })),
          idempotency_key: key,
        },
      });
      state.cart = {};
      saveCart();
      toast('Đã tạo đơn ' + order.code);
      location.hash = 'orders';
      await orderDetail(order.id);
      return false;
    },
    true,
  );
}
async function simpleAction(title, body, path, payload) {
  dialog(title, body, async (data) => {
    await api(path, { method: 'POST', body: { ...payload, ...Object.fromEntries(data) } });
    toast('Đã cập nhật thành công.');
  });
}
async function dispatch(action, id, target) {
  switch (action) {
    case 'close':
      modal.close();
      break;
    case 'refresh':
      await render();
      break;
    case 'login':
      loginDialog();
      break;
    case 'register':
      loginDialog(true);
      break;
    case 'logout':
      await api('/auth/logout', { method: 'POST', body: {} });
      state.user = null;
      history.replaceState(null, '', location.pathname);
      if (modal.open) modal.close();
      await refreshBase();
      await render();
      break;
    case 'add-cart': {
      const p = state.products.find((p) => p.id === Number(id));
      const next = Number(state.cart[id] || 0) + 1;
      if (next > p.available) {
        toast('Không đủ tồn kho tại cửa hàng này.');
        break;
      }
      state.cart[id] = next;
      saveCart();
      toast('Đã thêm ' + p.name);
      await render();
      break;
    }
    case 'cart':
      await cartDialog();
      break;
    case 'remove-cart':
      delete state.cart[id];
      saveCart();
      await cartDialog();
      await render();
      break;
    case 'checkout':
      checkoutDialog();
      break;
    case 'new-product':
      await productForm();
      break;
    case 'edit-product':
      await productForm(id);
      break;
    case 'new-store':
      storeForm();
      break;
    case 'edit-store':
      storeForm(id);
      break;
    case 'edit-company': {
      const c = state.company;
      dialog(
        'Thông tin công ty',
        `<div class="form-grid">${field('name', 'Tên công ty', 'text', c.name, 'required')}${field('phone', 'Điện thoại', 'tel', c.phone)}${field('address', 'Địa chỉ', 'text', c.address)}</div>`,
        async (data) => {
          await api('/company', { method: 'PUT', body: Object.fromEntries(data) });
          toast('Đã cập nhật công ty.');
        },
      );
      break;
    }
    case 'new-category':
    case 'edit-category':
    case 'new-brand':
    case 'edit-brand': {
      const category = action.includes('category'),
        edit = action.startsWith('edit');
      const list = category ? state.categories : state.brands;
      const item = edit ? list.find((x) => x.id === Number(id)) : {};
      dialog(
        (edit ? 'Cập nhật ' : 'Thêm ') + (category ? 'loại hàng' : 'thương hiệu'),
        `<div class="form-grid">${category && !edit ? field('code', 'Mã loại', 'text', '', 'required maxlength="30"') : ''}${field('name', 'Tên', 'text', item.name || '', 'required maxlength="150"')}${edit ? select('status', 'Trạng thái', ['Đang dùng', 'Tạm dừng'], item.status) : ''}</div>`,
        async (data) => {
          await api('/' + (category ? 'categories' : 'brands') + (edit ? '/' + id : ''), {
            method: edit ? 'PUT' : 'POST',
            body: Object.fromEntries(data),
          });
          await refreshBase();
          toast('Đã lưu danh mục.');
        },
      );
      break;
    }
    case 'new-staff':
      staffForm();
      break;
    case 'edit-staff':
      staffForm(id);
      break;
    case 'new-promo':
      promoForm();
      break;
    case 'toggle-promo': {
      const p = state.promotions.find((x) => x.id === Number(id));
      await api('/promotions/' + id, { method: 'PUT', body: { active: !p.active } });
      toast('Đã cập nhật khuyến mãi.');
      await render();
      break;
    }
    case 'new-restock':
      await newRestock();
      break;
    case 'add-line':
      $('#lines', target.closest('form')).insertAdjacentHTML('beforeend', lineRow());
      break;
    case 'remove-line': {
      const form = target.closest('form');
      if (form.querySelectorAll('.line-item').length > 1) target.closest('.line-item').remove();
      break;
    }
    case 'restock-approve':
    case 'restock-reject':
    case 'restock-ship':
    case 'restock-receive': {
      const act = action.split('-')[1];
      await simpleAction(
        {
          approve: 'Duyệt yêu cầu bổ sung',
          reject: 'Từ chối yêu cầu',
          ship: 'Xác nhận xuất kho',
          receive: 'Xác nhận nhận đủ hàng',
        }[act],
        '<div class="notice">Thao tác thay đổi trạng thái và tồn kho được lưu trong một giao dịch. Không thực hiện lại bước đã hoàn thành.</div>',
        '/restocks/' + id + '/action',
        { action: act },
      );
      break;
    }
    case 'threshold': {
      const item = state.inventory.find((i) => i.product_id === Number(id));
      dialog(
        'Ngưỡng bổ sung · ' + item.name,
        field(
          'min_quantity',
          'Cảnh báo khi tồn khả dụng ≤',
          'number',
          item.min_quantity,
          'required min="0"',
        ),
        async (data) => {
          await api('/inventory/' + id + '/threshold', {
            method: 'PUT',
            body: {
              store_id: state.inventory[0]?.location_id || selectedStore(),
              min_quantity: Number(data.get('min_quantity')),
            },
          });
          toast('Đã cập nhật ngưỡng.');
        },
      );
      break;
    }
    case 'adjust':
      dialog(
        'Điều chỉnh tồn kho',
        `<div class="notice warning">Dùng để nạp hoặc đối soát tồn kho trong bản đồ án. Bắt buộc nhập lý do; mọi thay đổi đều được ghi nhật ký.</div><div class="form-grid">${select(
          'product_id',
          'Sản phẩm',
          state.inventory.map((p) => [p.product_id, p.name]),
        )}${field('quantity', 'Số lượng mới', 'number', 0, 'required min="0" max="1000000"')}${area('reason', 'Lý do điều chỉnh', '', true)}</div>`,
        async (data) => {
          await api('/inventory/adjust', {
            method: 'POST',
            body: {
              ...Object.fromEntries(data),
              location_id:
                state.user.role === 'warehouse'
                  ? 1
                  : state.inventory[0]?.location_id || selectedStore(),
            },
          });
          toast('Đã ghi nhận điều chỉnh tồn kho.');
        },
      );
      break;
    case 'order-detail':
      await orderDetail(id);
      break;
    case 'assign': {
      const staff = await api('/staff');
      await simpleAction(
        'Phân công nhân viên',
        select(
          'employee_id',
          'Nhân viên cùng cửa hàng',
          staff.filter((u) => u.role === 'employee' && u.active).map((u) => [u.id, u.name]),
        ),
        '/orders/' + id + '/action',
        { action: 'assign' },
      );
      break;
    }
    case 'verify-payment':
      await simpleAction(
        'Xác minh thu tiền · Mô phỏng',
        '<div class="notice warning">Đây là thao tác mô phỏng. Chỉ xác nhận sau khi kiểm tra bằng chứng nhận tiền trong kịch bản đồ án.</div>' +
          field(
            'reference',
            'Tham chiếu xác minh / ghi chú',
            'text',
            '',
            'required maxlength="160"',
          ),
        '/orders/' + id + '/payment',
        {},
      );
      break;
    case 'confirm-order':
      await simpleAction(
        'Xác nhận tiếp nhận đơn',
        '<p>Server sẽ kiểm tra điều kiện thanh toán trước khi xác nhận.</p>',
        '/orders/' + id + '/action',
        { action: 'confirm' },
      );
      break;
    case 'receive-order':
      await simpleAction(
        'Ghi nhận khách đã nhận hàng',
        area('evidence', 'Bằng chứng nhận hàng / ghi chú mô phỏng', '', true),
        '/orders/' + id + '/action',
        { action: 'received' },
      );
      break;
    case 'finish-order':
      await simpleAction(
        'Hoàn tất giao dịch',
        '<p>Đơn chỉ hoàn tất khi đã nhận hàng, thu đủ tiền và có nhân viên phụ trách. Hoa hồng sẽ được ghi nhận một lần.</p>',
        '/orders/' + id + '/action',
        { action: 'finish' },
      );
      break;
    case 'process-order':
      await simpleAction(
        'Ghi tiến độ xử lý',
        area('note', 'Nội dung tiến độ', '', true),
        '/orders/' + id + '/action',
        { action: 'process' },
      );
      break;
    case 'cancel-request':
    case 'return-request':
      await simpleAction(
        action === 'cancel-request' ? 'Gửi yêu cầu hủy đơn' : 'Gửi yêu cầu trả hàng',
        area('reason', 'Lý do yêu cầu', '', true),
        '/orders/' + id + '/requests',
        { kind: action === 'cancel-request' ? 'cancel' : 'return' },
      );
      break;
    case 'request-approve':
    case 'request-reject': {
      const request = state.requests.find((r) => r.id === Number(id));
      const approve = action === 'request-approve';
      dialog(
        approve ? 'Chấp thuận yêu cầu' : 'Từ chối yêu cầu',
        `<div class="notice warning">${approve ? 'Hoàn tiền là mô phỏng. Khi chấp thuận, hệ thống trả tồn kho và đảo hoa hồng nếu có.' : 'Ghi rõ lý do từ chối để khách hàng theo dõi.'}</div>${area('resolution', 'Ghi chú xử lý', '', true)}${approve && request.kind === 'return' ? check('restock_confirmed', 'Tôi xác nhận đã kiểm tra và nhận lại toàn bộ hàng có thể bán.') : ''}`,
        async (data) => {
          await api('/order-requests/' + id + '/resolve', {
            method: 'POST',
            body: {
              decision: approve ? 'approve' : 'reject',
              resolution: data.get('resolution'),
              restock_confirmed: data.has('restock_confirmed'),
            },
          });
          toast('Đã xử lý yêu cầu.');
        },
      );
      break;
    }
    case 'print':
      window.print();
      break;
    case 'export-report': {
      const r = state.report;
      csv(
        'bao-cao-' + r.from + '_' + r.to + '.csv',
        ['Chỉ số', 'Giá trị'],
        [
          ['Từ ngày', r.from],
          ['Đến ngày', r.to],
          ['Doanh số hoàn tất', r.revenue],
          ['Online', r.online],
          ['Offline', r.offline],
          ['Số đơn hoàn tất', r.finished_orders],
          ['Hoa hồng', r.commission],
          ...r.staff.map((s) => ['Doanh số ' + s.name, s.sales]),
        ],
      );
      toast('Đã xuất báo cáo CSV.');
      break;
    }
  }
}
document.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  event.preventDefault();
  try {
    await dispatch(target.dataset.action, target.dataset.id, target);
  } catch (error) {
    const box = modal.open ? $('.form-error', modal) : null;
    if (box) showFormError(box, error);
    else toast(error.message);
  }
});
let saleKey = crypto.randomUUID();
document.addEventListener('submit', async (event) => {
  const form = event.target;
  event.preventDefault();
  const submit =
    form.querySelector('button[type=submit]') || form.querySelector('button:not([type])');
  if (submit?.disabled) return;
  if (submit) submit.disabled = true;
  const error = $('.form-error', form);
  if (error) error.textContent = '';
  try {
    const data = new FormData(form);
    if (form.id === 'portal-login-form') {
      state.user = await api('/auth/login', {
        method: 'POST',
        body: { ...Object.fromEntries(data), portal_role: portalForPath(location.pathname).role },
      });
      await refreshBase();
      toast('Đăng nhập thành công.');
      await render();
    }
    if (form.id === 'dialog-form' && modalSubmit) {
      const current = modalSubmit;
      const keep = await current(data, form);
      if (keep !== false && modalSubmit === current) modal.close();
      await render();
    }
    if (form.id === 'report-filter') {
      state.reportFilter = Object.fromEntries(data);
      await render();
    }
    if (form.id === 'sale-form') {
      const o = await api('/orders', {
        method: 'POST',
        body: {
          ...Object.fromEntries(data),
          store_id: selectedStore(),
          items: readLines(form),
          payment_confirmed: data.has('payment_confirmed'),
          idempotency_key: saleKey,
        },
      });
      saleKey = crypto.randomUUID();
      toast('Đã lập hóa đơn ' + o.code);
      await render();
      await orderDetail(o.id);
    }
  } catch (e) {
    if (error && error.isConnected) showFormError(error, e);
    else toast(e.message);
  } finally {
    if (submit?.isConnected) submit.disabled = false;
  }
});
document.addEventListener('change', async (event) => {
  const el = event.target;
  try {
    if (el.matches('[data-inventory-location]')) {
      state.inventoryLocation = Number(el.value);
      await render();
    }
    if (el.matches('[data-store]')) {
      state.store = Number(el.value);
      sessionStorage.setItem('se_store', state.store);
      await render();
    }
    if (el.matches('[data-cart-qty]')) {
      if (!el.checkValidity()) {
        el.reportValidity();
        return;
      }
      state.cart[el.dataset.cartQty] = Number(el.value);
      saveCart();
      await cartDialog();
      await render();
    }
    if (el.matches('[data-category-filter]')) filterProducts();
  } catch (e) {
    toast(e.message);
  }
});
function filterProducts() {
  const q = $('[data-product-filter]')?.value.toLowerCase() || '';
  const cat = $('[data-category-filter]')?.value || '';
  document
    .querySelectorAll('[data-product-id]')
    .forEach(
      (el) => (el.hidden = !(el.dataset.text.includes(q) && (!cat || el.dataset.category === cat))),
    );
}
document.addEventListener('input', (event) => {
  const el = event.target;
  if (el.matches('[data-search]')) {
    const q = el.value.toLowerCase();
    el.closest('.card')
      .querySelectorAll('tbody tr')
      .forEach((row) => (row.hidden = !row.textContent.toLowerCase().includes(q)));
  }
  if (el.matches('[data-product-filter]')) filterProducts();
});
window.addEventListener('hashchange', () => render());
async function syncSession() {
  if (document.visibilityState !== 'visible') return;
  try {
    const user = await api('/auth/me');
    if (user?.id !== state.user?.id || user?.role !== state.user?.role) {
      state.user = user;
      if (modal.open) modal.close();
      await refreshBase();
      await render();
    }
  } catch {
    /* Keep the current form intact during a transient network failure. */
  }
}
window.addEventListener('focus', syncSession);
document.addEventListener('visibilitychange', syncSession);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) syncSession();
});
async function boot() {
  try {
    state.user = await api('/auth/me');
    await refreshBase();
    await render();
    if (location.pathname === '/login' && !state.user) loginDialog();
  } catch (e) {
    $('#app').innerHTML =
      `<main class="boot"><span class="brand">V0 TECH<span>.</span></span><h1>Chưa kết nối được hệ thống</h1><p>${esc(e.message)}</p>${btn('Thử lại', 'refresh')}</main>`;
  }
}
await boot();
