export const $ = (s, root = document) => root.querySelector(s);
export const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const money = (n) => Number(n || 0).toLocaleString('vi-VN') + ' ₫';
export const date = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '—');
export const labels = {
  new: 'Mới tạo',
  confirmed: 'Đã xác nhận',
  received: 'Đã nhận hàng',
  finished: 'Hoàn tất',
  cancelled: 'Đã hủy',
  returned: 'Đã trả hàng',
  pending: 'Chờ xác minh',
  verified: 'Đã thu tiền',
  refunded: 'Đã hoàn tiền (mô phỏng)',
  submitted: 'Đã gửi',
  approved: 'Đã duyệt',
  shipped: 'Đã xuất kho',
  rejected: 'Từ chối',
  earned: 'Đã ghi nhận',
  reversed: 'Đã đảo hoa hồng',
  hq: 'Trụ sở chính',
  warehouse: 'Nhân viên kho',
  manager: 'Quản lý cửa hàng',
  employee: 'Nhân viên cửa hàng',
  customer: 'Khách hàng',
  online: 'Trực tuyến',
  offline: 'Tại cửa hàng',
  pickup: 'Nhận tại cửa hàng',
  delivery: 'Giao tận nơi',
  card: 'Thẻ (mô phỏng)',
  qr: 'QR (mô phỏng)',
  cod: 'COD',
  cash: 'Tiền mặt',
  cancel: 'Hủy đơn',
  return: 'Trả hàng',
  all: 'Tất cả',
  selected: 'Cửa hàng được chọn',
};
export const label = (v) => labels[v] || v;
export const badge = (v) =>
  `<span class="pill ${['finished', 'verified', 'received', 'earned', 'Đang kinh doanh', 'Đang dùng'].includes(v) ? 'green' : ['confirmed', 'shipped'].includes(v) ? 'blue' : ['pending', 'new', 'submitted', 'approved'].includes(v) ? 'amber' : ['cancelled', 'returned', 'rejected', 'reversed', 'refunded', 'Ngừng kinh doanh'].includes(v) ? 'red' : ''}">${esc(label(v))}</span>`;
export const btn = (title, action, id = '', kind = '') =>
  `<button class="btn ${kind}" type="button" data-action="${esc(action)}" data-id="${esc(id)}">${esc(title)}</button>`;
export const empty = (
  title = 'Chưa có dữ liệu',
  description = 'Dữ liệu sẽ xuất hiện sau khi phát sinh giao dịch.',
) => `<div class="empty"><strong>${esc(title)}</strong>${esc(description)}</div>`;
export const table = (headers, rows) =>
  rows.length
    ? `<div class="scroll"><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    : empty();
export const card = (title, content, tools = '') =>
  `<section class="card"><div class="card-head"><h2>${esc(title)}</h2>${tools}</div>${content}</section>`;
export const toolbar = (placeholder = 'Tìm kiếm trong danh sách…') =>
  `<div class="toolbar"><input type="search" data-search placeholder="${esc(placeholder)}" aria-label="Tìm kiếm"></div>`;
export const field = (name, title, type = 'text', value = '', extra = '') =>
  `<label class="field">${esc(title)}<input name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra}></label>`;
export const area = (name, title, value = '', required = false) =>
  `<label class="field full">${esc(title)}<textarea name="${name}" maxlength="500" ${required ? 'required' : ''}>${esc(value)}</textarea></label>`;
export const select = (name, title, options, value = '', extra = '') =>
  `<label class="field">${esc(title)}<select name="${esc(name)}" ${extra}>${options
    .map((o) => {
      const [v, t] = Array.isArray(o) ? o : [o, label(o)];
      return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(t)}</option>`;
    })
    .join('')}</select></label>`;
export const check = (name, title, checked = false) =>
  `<label class="check full"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}>${esc(title)}</label>`;
export const metric = (title, value, note, icon = '↗') =>
  `<div class="metric"><small>${esc(title)}</small><span class="metric-icon">${icon}</span><b>${esc(value)}</b><p>${esc(note)}</p></div>`;
export function csv(name, headers, rows) {
  const text =
    '\uFEFF' +
    [headers, ...rows]
      .map((r) =>
        r
          .map(
            (v) =>
              '"' +
              String(v ?? '')
                .replace(/"/g, '""')
                .replace(/^[=+@-]/, "'$&") +
              '"',
          )
          .join(','),
      )
      .join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
