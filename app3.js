/* ==========================================================================
   V0 PC STORE - JAVASCRIPT CONTROLLER (FRONTEND ONLY)
   Kiến trúc: Vanilla ES6+ Modularity & Responsive State Management
   ========================================================================== */

/* ==========================================================================
   1. KHAI BÁO HÌNH ẢNH & DANH SÁCH SẢN PHẨM (MOCK DATABASE)
   ========================================================================== */
const IMG = (() => {
  const IMG_BASE = "./IMG/";
  const F = {
    "case": "case.png",
    "cooler": "cooler.png",
    "cpu": "cpu.png",
    "keyboard": "keyboard.png",
    "mainboard": "mainboard.png",
    "monitor": "monitor.png",
    "psu": "psu.png",
    "ram": "ram.png",
    "ssd": "ssd.png",
    "vga": "vga.png",
    "logo": "apple-icon.png"
  };
  return Object.fromEntries(Object.entries(F).map(([k, v]) => [k, IMG_BASE + v]));
})();

// Dữ liệu sản phẩm phần cứng PC
const P = [
  { id: 1, cat: "CPU", b: "Intel", n: "Intel Core i9-13900K 3.0GHz", p: 13990000, o: 15490000, i: "cpu", s: ["24 nhân (8P + 16E), 32 luồng", "Xung tối đa 5.8GHz", "Socket LGA1700", "Không kèm tản nhiệt"] },
  { id: 2, cat: "Mainboard", b: "ASUS", n: "ASUS ROG Strix Z790-F Gaming WiFi", p: 10490000, i: "mainboard", s: ["Chipset Z790, DDR5", "Wi-Fi 6E, Bluetooth 5.3", "PCIe 5.0 x16, 4 khe M.2", "Hỗ trợ Intel Gen 12/13/14"] },
  { id: 3, cat: "RAM", b: "Corsair", n: "Corsair Vengeance DDR5 32GB (2x16GB) 6000MHz CL30", p: 3290000, o: 3690000, i: "ram", s: ["Dung lượng 32GB (2x16GB)", "Bus 6000MHz, CL30", "LED RGB đồng bộ iCUE", "Hỗ trợ Intel XMP 3.0 & EXPO"] },
  { id: 4, cat: "VGA", b: "MSI", n: "MSI GeForce RTX 4080 Gaming X Trio 16GB", p: 28900000, o: 30900000, i: "vga", s: ["16GB GDDR6X 256-bit", "Tản nhiệt 3 quạt TORX FAN 5.0", "Cổng 3x DisplayPort 1.4a, 1x HDMI 2.1a", "Nguồn đề xuất 750W"] },
  { id: 5, cat: "SSD", b: "Kingston", n: "Kingston KC3000 2TB PCIe 4.0 NVMe M.2", p: 3990000, i: "ssd", s: ["Dung lượng khủng 2TB", "Tốc độ đọc/ghi tới 7000MB/s", "Chuẩn M.2 2280 PCIe 4.0 x4", "Bảo hành chính hãng 5 năm"] },
  { id: 6, cat: "Nguồn", b: "EVGA", n: "EVGA SuperNOVA 850 G6 850W 80 Plus Gold", p: 3490000, i: "psu", s: ["Công suất thực 850W", "Chứng nhận 80 Plus Gold cao cấp", "Full modular toàn bộ cáp rời", "Quạt 130mm chế độ ECO êm ái"] },
  { id: 7, cat: "Vỏ case", b: "AeroFlow", n: "AeroFlow Mid Tower kính cường lực 3 quạt RGB", p: 2190000, i: "case", s: ["Chuẩn Mid Tower, hỗ trợ bo mạch ATX", "Hông kính cường lực Snap-fit", "Mặt trước lưới mesh, kèm sẵn 3 quạt RGB", "Cổng Type-C & USB 3.0 mặt trên"] },
  { id: 8, cat: "Tản nhiệt", b: "AeroFlow", n: "AeroFlow tản nhiệt khí 6 ống đồng tiếp xúc", p: 890000, o: 1090000, i: "cooler", s: ["6 ống đồng mạ niken tiếp xúc trực tiếp", "Quạt 120mm PWM tốc độ cao", "Hỗ trợ LGA1700, AM4, AM5", "Cáp bọc dù chống gãy gập"] },
  { id: 9, cat: "Màn hình", b: "Display", n: "Màn hình 27 inch 2K viền siêu mỏng chân xoay", p: 4590000, i: "monitor", s: ["Kích thước 27 inch IPS độ nét cao", "Thiết kế 3 cạnh tràn viền", "Chân đế tùy chỉnh nâng hạ, xoay dọc 90°", "Cổng kết nối HDMI, DisplayPort"] },
  { id: 10, cat: "Phím & chuột", b: "Razer", n: "Combo phím cơ và chuột gaming Razer Speed", p: 2390000, o: 2790000, i: "keyboard", s: ["Bàn phím cơ full-size đèn nền RGB", "Chuột gaming công thái học", "Kết nối USB dây dù siêu bền", "Switch độc quyền cảm giác bấm đầm tay"] }
];

const ST = ["Chờ xử lý", "Đang vận chuyển", "Giao thành công"];

/* ==========================================================================
   2. API MÔ PHỎNG LƯU TRỮ ĐƠN HÀNG (LOCALSTORAGE)
   ========================================================================== */
const api = {
  load() { try { return JSON.parse(localStorage.getItem("v0orders") || "[]") } catch(e) { return [] } },
  save(o) { try { localStorage.setItem("v0orders", JSON.stringify(o)) } catch(e) {} },
  create(d) {
    const l = api.load(), o = { id: "DH" + Date.now().toString().slice(-6), ...d, status: 0, log: [Date.now()] };
    l.push(o); api.save(l); return o;
  },
  find(k) {
    k = k.trim().toLowerCase();
    return api.load().filter(x => x.id.toLowerCase() == k || x.phone == k).reverse();
  },
  mine(u) { return api.load().filter(x => x.uid ? x.uid == u.id : x.phone == u.phone).reverse(); },
  next(id) {
    const l = api.load(), o = l.find(x => x.id == id);
    if (o && o.status < 2) { o.status++; o.log[o.status] = Date.now(); api.save(l); }
  },
  cancel(id) {
    const l = api.load(), o = l.find(x => x.id == id);
    if (o && o.status == 0) { o.status = 3; o.cancelAt = Date.now(); api.save(l); }
  }
};

/* ==========================================================================
   3. TIỆN ÍCH CHUNG & TRẠNG THÁI ỨNG DỤNG
   ========================================================================== */
const $ = s => document.querySelector(s);
const vnd = n => (n || 0).toLocaleString("vi-VN") + "₫";

// Khởi tạo Logo
const logoEl = $("#lg");
if (logoEl) logoEl.src = IMG.logo;

let cat = "Tất cả", cart = {}, sort = "";
try { cart = JSON.parse(localStorage.getItem("v0cart") || "{}") } catch(e) {}

const save = () => { try { localStorage.setItem("v0cart", JSON.stringify(cart)) } catch(e) {} };
const cats = ["Tất cả", ...new Set(P.map(p => p.cat))];

/* Theme Controller (Chế độ Sáng / Tối) */
const themeBtn = $("#theme-btn");
function initTheme() {
  const savedTheme = localStorage.getItem("v0theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
}
if (themeBtn) {
  themeBtn.onclick = () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("v0theme", next);
    toast(next === "dark" ? "Đã bật Dark Mode" : "Đã bật Light Mode");
  };
}
initTheme();

/* ==========================================================================
   4. HIỂN THỊ DANH MỤC, SẮP XẾP VÀ LƯỚI SẢN PHẨM
   ========================================================================== */
function chips() {
  const catsContainer = $("#cats");
  if (!catsContainer) return;

  const countForCat = c => c === "Tất cả" ? P.length : P.filter(p => p.cat === c).length;

  catsContainer.innerHTML = cats.map(c => `
    <button class="chip" aria-pressed="${c == cat}" data-c="${c}">
      <span>${c}</span>
      <span class="chip-count">${countForCat(c)}</span>
    </button>
  `).join("") + `
    <select id="so" aria-label="Sắp xếp sản phẩm">
      <option value="">Sắp xếp: Mặc định</option>
      <option value="a">Giá: Thấp đến cao</option>
      <option value="d">Giá: Cao đến thấp</option>
    </select>
  `;

  const soEl = $("#so");
  if (soEl) {
    soEl.value = sort;
    soEl.onchange = e => { sort = e.target.value; list(); };
  }

  document.querySelectorAll(".chip").forEach(b => {
    b.onclick = () => { cat = b.dataset.c; chips(); list(); };
  });
}

function list() {
  const grid = $("#g");
  if (!grid) return;

  const k = $("#q") ? $("#q").value.trim().toLowerCase() : "";
  let a = P.filter(p => (cat == "Tất cả" || p.cat == cat) && (p.n + " " + p.b + " " + p.cat).toLowerCase().includes(k));

  if (sort) a.sort((x, y) => sort == "a" ? x.p - y.p : y.p - x.p);

  grid.innerHTML = a.length ? a.map(p => {
    const discount = p.o ? Math.round((1 - p.p / p.o) * 100) : 0;
    const teaserSpecs = p.s ? p.s.slice(0, 2) : [];

    return `
      <article class="card">
        <button class="im" data-v="${p.id}" aria-label="Xem chi tiết ${p.n}">
          ${discount > 0 ? `<span class="sale-badge">-${discount}%</span>` : ""}
          <span class="cat-badge">${p.cat}</span>
          <img src="${IMG[p.i]}" alt="${p.n}" loading="lazy" onerror="this.src='https://api.iconify.design/lucide:cpu.svg?color=%233b82f6'">
        </button>
        <div class="bd">
          <div class="brand-meta">
            <span class="brand-name-tag">${p.b}</span>
            <span style="color:var(--accent-success);font-size:11px;font-weight:700">● Còn hàng</span>
          </div>
          <button class="view" data-v="${p.id}" title="${p.n}">${p.n}</button>

          <ul class="specs-teaser">
            ${teaserSpecs.map(s => `<li>${s}</li>`).join("")}
          </ul>

          <div class="price-block">
            <div class="price">${vnd(p.p)}</div>
            ${p.o ? `<div class="old">${vnd(p.o)}</div>` : ""}
          </div>
          <button class="add" data-a="${p.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span>Thêm vào giỏ</span>
          </button>
        </div>
      </article>
    `;
  }).join("") : `
    <div class="empty-state">
      <h3>Không tìm thấy sản phẩm phù hợp</h3>
      <p>Thử tìm với từ khóa khác (ví dụ: RTX, i9, RAM) hoặc bấm chọn danh mục “Tất cả”.</p>
    </div>
  `;

  document.querySelectorAll("[data-v]").forEach(b => b.onclick = () => detail(+b.dataset.v));
  document.querySelectorAll("[data-a]").forEach(b => b.onclick = () => add(+b.dataset.a));
}

function toast(t, ms = 2000) {
  const e = $("#ts");
  if (!e) return;
  e.textContent = t;
  e.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => e.classList.remove("on"), ms);
}

function add(id, n = 1) {
  cart[id] = (cart[id] || 0) + n;
  save();
  badge();
  const p = P.find(x => x.id == id);
  toast(`Đã thêm "${p ? p.n : 'Sản phẩm'}" vào giỏ hàng`);
}

function badge() {
  const cc = $("#cc");
  if (cc) cc.textContent = Object.values(cart).reduce((a, b) => a + b, 0);
}

/* ==========================================================================
   5. POPUP XEM CHI TIẾT SẢN PHẨM (MODAL DIALOG)
   ========================================================================== */
function detail(id) {
  const p = P.find(x => x.id == id);
  if (!p) return;
  const o = $("#ov");
  const discount = p.o ? Math.round((1 - p.p / p.o) * 100) : 0;
  const savedPrice = p.o ? p.o - p.p : 0;

  o.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-img-col">
        <img src="${IMG[p.i]}" alt="${p.n}" onerror="this.src='https://api.iconify.design/lucide:cpu.svg?color=%233b82f6'">
      </div>
      <div class="modal-content-col">
        <div class="modal-top">
          <div class="brand-meta">
            <span class="brand-name-tag">${p.cat} · ${p.b}</span>
          </div>
          <button class="close-btn" id="xx" aria-label="Đóng popup">×</button>
        </div>

        <h2 style="font-size:20px;line-height:1.3;font-weight:800;color:var(--text-main);">${p.n}</h2>

        <div style="display:flex;align-items:baseline;gap:10px;padding:6px 0;">
          <div class="price" style="font-size:24px;">${vnd(p.p)}</div>
          ${p.o ? `<span class="old" style="font-size:15px">${vnd(p.o)}</span>` : ""}
          ${discount > 0 ? `<span class="sale-badge" style="position:static">Tiết kiệm ${vnd(savedPrice)} (-${discount}%)</span>` : ""}
        </div>

        <div style="font-size:13px;color:var(--text-dim);font-weight:600">THÔNG SỐ KỸ THUẬT NỔI BẬT:</div>
        <ul class="modal-specs-list">
          ${p.s.map(s => `
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>${s}</span>
            </li>
          `).join("")}
        </ul>

        <div class="modal-actions">
          <button class="add" id="ad">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span>Thêm vào giỏ hàng ngay</span>
          </button>
        </div>
      </div>
    </div>
  `;

  o.classList.add("on");
  $("#xx").onclick = () => o.classList.remove("on");
  $("#ad").onclick = () => { add(id); o.classList.remove("on"); };
  $("#xx").focus();
}

$("#ov").onclick = e => { if (e.target.id == "ov") e.target.classList.remove("on"); };

/* ==========================================================================
   6. TRA CỨU & HIỂN THỊ TRẠNG THÁI ĐƠN HÀNG
   ========================================================================== */
const fd = t => new Date(t).toLocaleString("vi-VN");

function ordHTML(x) {
  const st = ST.map((s, i) => `
    <li class="${x.status != 3 && i <= x.status ? "on" : ""}">
      <span>${s}</span>
      <small>${x.log[i] ? fd(x.log[i]) : "Đang chờ"}</small>
    </li>
  `).join("");

  return `
    <div class="ord">
      <div class="oh">
        <b>Mã đơn: <span style="color:var(--brand-primary)">${x.id}</span></b>
        <span class="tag s${x.status}">${x.status == 3 ? "Đã hủy" : ST[x.status]}</span>
      </div>
      <ol class="steps">${x.status == 3 ? `<li class="bad on"><span>Đã hủy đơn hàng</span><small>${fd(x.cancelAt)}</small></li>` : st}</ol>
      <div style="font-size:13px;color:var(--text-muted);border-top:1px solid var(--border-subtle);padding-top:8px">
        Đặt lúc: ${fd(x.log[0])} · Khách hàng: <b>${x.name}</b> (${x.phone})<br>
        Địa chỉ giao: ${x.addr}
      </div>
      <ul style="padding-left:18px;font-size:13px;color:var(--text-main);margin:4px 0">${x.items.map(i => `<li>${i.n} <b>×${i.q}</b></li>`).join("")}</ul>
      ${x.promo ? `<div class="oh" style="font-size:13px;color:var(--accent-success)"><span>Voucher áp dụng (${x.promo.code})</span><span>-${vnd(x.promo.disc)}</span></div>` : ""}
      <div class="oh" style="font-size:16px;font-weight:800;border-top:1px solid var(--border-subtle);padding-top:8px">
        <span>Tổng thanh toán</span>
        <span style="color:var(--brand-primary)">${vnd(x.total)}</span>
      </div>
    </div>
  `;
}

function track(q = "") {
  const o = $("#ov"), r = q ? api.find(q) : [];

  o.innerHTML = `
    <div class="modal tk" role="dialog" aria-modal="true">
      <div class="modal-top">
        <h2 style="font-size:20px;font-weight:800">Tra cứu trạng thái đơn hàng</h2>
        <button class="close-btn" id="xx">×</button>
      </div>
      <p style="font-size:13.5px;color:var(--text-muted);margin-top:6px">Nhập mã đơn hàng (ví dụ: DH123456) hoặc số điện thoại người nhận để kiểm tra lộ trình.</p>
      <form id="tf">
        <input id="tq" value="${q}" placeholder="Mã đơn (DH123456) hoặc Số điện thoại...">
        <button type="submit">Kiểm tra ngay</button>
      </form>
      ${q ? (r.length ? r.map(ordHTML).join("") : `<div class="empty-state" style="padding:30px 10px"><p>Không tìm thấy đơn hàng nào với “${q}”. Vui lòng kiểm tra lại thông tin.</p></div>`) : ""}
    </div>
  `;

  o.classList.add("on");
  $("#xx").onclick = () => o.classList.remove("on");
  $("#tf").onsubmit = e => { e.preventDefault(); track($("#tq").value.trim()); };
}

$("#tb").onclick = () => AU.cur() ? showAcct("hist") : track();

/* ==========================================================================
   7. XỬ LÝ TÀI KHOẢN (AUTH & USER ACCOUNT)
   ========================================================================== */
const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const AU = {
  users() {
    try {
      const l = JSON.parse(localStorage.getItem("v0users") || "[]");
      let ch = false;
      l.forEach(u => { if (!u.id) { u.id = "U" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); ch = true; } });
      if (ch) AU.saveU(l);
      return l;
    } catch(e) { return [] }
  },
  saveU(u) { try { localStorage.setItem("v0users", JSON.stringify(u)) } catch(e) {} },
  cur() { try { const e = localStorage.getItem("v0session"); return AU.users().find(u => u.id == e || u.email == e) || null; } catch(e) { return null; } },
  setCur(e) { try { e ? localStorage.setItem("v0session", e) : localStorage.removeItem("v0session"); } catch(x) {} },
  hash(s) { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return String(h); }
};

function hdr() {
  const u = AU.cur();
  const ub = $("#ub");
  if (!ub) return;
  const label = ub.querySelector(".btn-label") || ub;
  label.textContent = u ? u.name.split(" ").pop() : "Đăng nhập";
}

$("#ub").onclick = () => {
  if (AU.cur()) {
    showAcct("info");
  } else {
    showAuth("login");
  }
};

function showShop() {
  $("#shop").hidden = false;
  $("#auth").hidden = true;
  $("#acct").hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function afterAuth() {
  hdr();
  showShop();
  if (Object.values(cart).some(q => q > 0)) {
    drawer();
    $("#dr").classList.add("on");
  } else {
    toast("Đăng nhập thành công!");
  }
}

function needLogin() {
  const o = $("#ov");
  o.innerHTML = `
    <div class="modal tk" style="max-width:440px" role="dialog" aria-modal="true">
      <h2 style="font-size:20px;font-weight:800;margin-bottom:8px">Đăng nhập để đặt hàng</h2>
      <p style="font-size:14px;color:var(--text-muted)">Vui lòng đăng nhập để lưu trữ bảo hành và theo dõi hành trình đơn hàng. Giỏ hàng của bạn sẽ được giữ nguyên.</p>
      <div style="display:flex;gap:10px;margin-top:20px">
        <button class="btn-primary" id="n1" style="flex:1;justify-content:center">Đăng nhập</button>
        <button class="btn-secondary" id="n2" style="flex:1;justify-content:center">Đăng ký mới</button>
      </div>
    </div>
  `;
  o.classList.add("on");

  const go = m => { o.classList.remove("on"); $("#dr").classList.remove("on"); showAuth(m); };
  $("#n1").onclick = () => go("login");
  $("#n2").onclick = () => go("reg");
}

function showAuth(mode) {
  $("#ov").classList.remove("on");
  $("#dr").classList.remove("on");
  $("#shop").hidden = true;
  $("#acct").hidden = true;
  const a = $("#auth");
  a.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });

  const reg = mode == "reg";
  const f = (id, l, ty, ac) => `<label class="fl">${l}<input id="${id}" type="${ty}" autocomplete="${ac}"></label>`;

  a.innerHTML = `
    <div class="acard">
      <h1>${reg ? "Đăng ký thành viên" : "Đăng nhập tài khoản"}</h1>
      <p style="font-size:14px;color:var(--text-muted)">${reg ? "Tạo tài khoản để theo dõi đơn hàng và nhận ưu đãi tích điểm." : "Chào mừng bạn quay lại hệ thống V0 PC Store."}</p>
      <form id="af" novalidate>
        ${reg ? f("rn","Họ và tên","text","name") + f("re","Email liên hệ","email","email") + f("rp","Số điện thoại","tel","tel") + f("r1","Mật khẩu","password","new-password") + f("r2","Xác nhận lại mật khẩu","password","new-password") : f("le","Email hoặc số điện thoại","text","username") + f("l1","Mật khẩu","password","current-password")}
        <div class="err" id="er" role="alert"></div>
        <button class="btn-primary" style="width:100%;justify-content:center;margin-top:6px">${reg ? "Hoàn tất đăng ký" : "Đăng nhập ngay"}</button>
      </form>
      <p style="font-size:14px;color:var(--text-muted);text-align:center">${reg ? "Đã có tài khoản?" : "Chưa có tài khoản?"} <button id="sw" style="color:var(--brand-primary);font-weight:700">${reg ? "Đăng nhập tại đây" : "Đăng ký tài khoản"}</button></p>
      <button class="btn-secondary" id="bk" style="width:100%;justify-content:center">Quay lại cửa hàng</button>
    </div>
  `;

  $("#sw").onclick = () => showAuth(reg ? "login" : "reg");
  $("#bk").onclick = showShop;

  $("#af").onsubmit = ev => {
    ev.preventDefault();
    const e = m => { $("#er").textContent = m; }, v = i => $("#" + i).value.trim();

    if (reg) {
      const n = v("rn"), em = v("re").toLowerCase(), ph = normPhone(v("rp")), p1 = $("#r1").value, p2 = $("#r2").value;
      if (!n || !em || !ph || !p1 || !p2) return e("Vui lòng điền đầy đủ các thông tin.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return e("Địa chỉ Email chưa đúng định dạng.");
      if (!/^(0|\+84)\d{9}$/.test(ph)) return e("Số điện thoại cần đủ 10 số (bắt đầu bằng 0 hoặc +84).");
      if (p1.length < 6) return e("Mật khẩu tối thiểu 6 ký tự.");
      if (p1 !== p2) return e("Mật khẩu xác nhận không trùng khớp.");

      const us = AU.users();
      if (us.some(u => u.email == em)) return e("Email này đã được sử dụng.");
      if (us.some(u => u.phone == ph)) return e("Số điện thoại này đã được đăng ký.");

      const nu = { id: "U" + Date.now().toString(36), name: n, email: em, phone: ph, addr: "", pw: AU.hash(p1) };
      us.push(nu);
      AU.saveU(us);
      AU.setCur(nu.id);
      afterAuth();
    } else {
      const id = v("le").toLowerCase().replace(/\s/g, "").replace(/^\+84/, "0"), pw = $("#l1").value;
      if (!id || !pw) return e("Vui lòng nhập tài khoản và mật khẩu.");

      const u = AU.users().find(x => (x.email == id || x.phone == id) && x.pw == AU.hash(pw));
      if (!u) return e("Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại.");

      AU.setCur(u.id);
      afterAuth();
    }
  };
}

/* ==========================================================================
   7A. TRANG THÔNG TIN TÀI KHOẢN CÁ NHÂN
   ========================================================================== */
const normPhone = s => String(s).replace(/\s/g, "").replace(/^\+84/, "0");
const fld = (id, l, ty, ac, val = "") => `<label class="fl">${l}<input id="${id}" type="${ty}" autocomplete="${ac}" value="${esc(val)}"></label>`;

function showAcct(tab = "info") {
  const u = AU.cur();
  if (!u) { showAuth("login"); return; }
  $("#ov").classList.remove("on");
  $("#dr").classList.remove("on");
  $("#shop").hidden = true;
  $("#auth").hidden = true;
  const a = $("#acct");
  a.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });

  const tabs = [["info", "Thông tin cá nhân"], ["pw", "Đổi mật khẩu"], ["hist", "Lịch sử mua hàng"]];
  let body = "";
  if (tab == "info") {
    body = `
      <form id="pf" novalidate>
        ${fld("an", "Họ và tên", "text", "name", u.name)}
        ${fld("ae", "Email", "email", "email", u.email)}
        ${fld("ap", "Số điện thoại", "tel", "tel", u.phone)}
        ${fld("aa", "Địa chỉ giao hàng mặc định", "text", "street-address", u.addr || "")}
        <div class="err" id="er" role="alert"></div>
        <button class="btn-primary" style="width:100%;justify-content:center">Lưu thông tin</button>
      </form>`;
  } else if (tab == "pw") {
    body = `
      <form id="pwf" novalidate>
        ${fld("pw0", "Mật khẩu hiện tại", "password", "current-password")}
        ${fld("pw1", "Mật khẩu mới", "password", "new-password")}
        ${fld("pw2", "Xác nhận mật khẩu mới", "password", "new-password")}
        <div class="err" id="er" role="alert"></div>
        <button class="btn-primary" style="width:100%;justify-content:center">Cập nhật mật khẩu</button>
      </form>`;
  } else {
    const L = api.mine(u);
    body = L.length ? `
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:12px">Bạn có <b>${L.length}</b> đơn hàng đã thực hiện.</p>
      ${L.map(x => ordHTML(x)).join("")}
    ` : `<div class="empty-state" style="padding:30px 10px"><p>Bạn chưa có đơn hàng nào tại V0 PC Store.</p></div>`;
  }

  a.innerHTML = `
    <div class="acard" style="max-width:680px;margin:auto">
      <h1>Trung tâm tài khoản</h1>
      <p style="color:var(--text-muted);font-size:14px">Xin chào, <b>${esc(u.name)}</b> (${esc(u.email)})</p>
      <div class="tabs">${tabs.map(t => `<button class="chip" aria-pressed="${t[0] == tab}" data-t="${t[0]}">${t[1]}</button>`).join("")}</div>
      ${body}
      <div style="display:flex;gap:10px;margin-top:16px;border-top:1px solid var(--border-subtle);padding-top:16px">
        <button class="btn-secondary" id="ab" style="flex:1;justify-content:center">Quay lại mua sắm</button>
        <button class="btn-secondary" id="al" style="flex:1;justify-content:center;color:var(--accent-sale)">Đăng xuất</button>
      </div>
    </div>`;

  a.querySelectorAll("[data-t]").forEach(b => b.onclick = () => showAcct(b.dataset.t));
  $("#ab").onclick = showShop;
  $("#al").onclick = () => { AU.setCur(null); hdr(); showShop(); toast("Đã đăng xuất tài khoản"); };

  const e = m => { $("#er").textContent = m; }, v = i => $("#" + i).value.trim();

  if (tab == "info") {
    $("#pf").onsubmit = ev => {
      ev.preventDefault();
      const n = v("an"), em = v("ae").toLowerCase(), ph = normPhone(v("ap")), ad = v("aa");
      if (!n || !em || !ph) return e("Họ tên, email và số điện thoại không được để trống.");
      const us = AU.users(), me = us.find(x => x.id == u.id);
      Object.assign(me, { name: n, email: em, phone: ph, addr: ad });
      AU.saveU(us);
      hdr();
      showAcct("info");
      toast("Đã lưu cập nhật thông tin cá nhân");
    };
  } else if (tab == "pw") {
    $("#pwf").onsubmit = ev => {
      ev.preventDefault();
      const c = $("#pw0").value, n1 = $("#pw1").value, n2 = $("#pw2").value;
      if (!c || !n1 || !n2) return e("Vui lòng nhập đủ các trường.");
      const us = AU.users(), me = us.find(x => x.id == u.id);
      if (AU.hash(c) !== me.pw) return e("Mật khẩu hiện tại chưa chính xác.");
      if (n1.length < 6) return e("Mật khẩu mới cần tối thiểu 6 ký tự.");
      if (n1 !== n2) return e("Xác nhận mật khẩu mới chưa khớp.");
      me.pw = AU.hash(n1);
      AU.saveU(us);
      showAcct("pw");
      toast("Đã thay đổi mật khẩu thành công");
    };
  }
}

/* ==========================================================================
   7B. MÃ KHUYẾN MÃI (PROMO VOUCHERS)
   ========================================================================== */
const PROMOS = [
  { code: "WELCOME10", title: "Chào mừng khách mới", pct: 10, max: 500000, min: 5000000, cat: null, exp: "2026-12-31" },
  { code: "BUILDPC5", title: "Build PC tiết kiệm", pct: 5, max: 2000000, min: 30000000, cat: null, exp: "2026-12-31" },
  { code: "RAM15", title: "Ưu đãi RAM DDR5", pct: 15, max: 300000, min: 2000000, cat: "RAM", exp: "2026-11-30" },
  { code: "VGA3", title: "Nâng cấp Card đồ họa", pct: 3, max: 1500000, min: 20000000, cat: "VGA", exp: "2026-11-30" },
  { code: "SSD10", title: "Ưu đãi ổ cứng SSD", pct: 10, max: 400000, min: 3000000, cat: "SSD", exp: "2026-11-15" }
];

let promo = "", draft = {};
try { promo = localStorage.getItem("v0promo") || ""; } catch(e) {}
const setPromo = c => { promo = c; try { c ? localStorage.setItem("v0promo", c) : localStorage.removeItem("v0promo"); } catch(e) {} };
const promoOK = p => new Date(p.exp + "T23:59:59") >= new Date();
const fdate = s => s.split("-").reverse().join("/");
const promoCond = p => p.cat ? `Giá trị sản phẩm ${p.cat} từ ${vnd(p.min)}` : `Tổng đơn hàng từ ${vnd(p.min)}`;

function promoCalc(pr) {
  const base = Object.keys(cart).filter(k => cart[k] > 0).map(k => ({ p: P.find(x => x.id == k), q: cart[k] }))
    .filter(l => !pr.cat || l.p.cat == pr.cat).reduce((s, l) => s + l.p.p * l.q, 0);
  if (pr.cat && !base) return { ok: false, why: `Giỏ hàng chưa có linh kiện thuộc mục ${pr.cat}.`, disc: 0 };
  if (base < pr.min) return { ok: false, why: `Cần thêm ${vnd(pr.min - base)} để đủ điều kiện (${promoCond(pr)}).`, disc: 0 };
  return { ok: true, disc: Math.min(Math.round(base * pr.pct / 100), pr.max) };
}

function applyPromo(raw) {
  const c = String(raw || "").trim().toUpperCase();
  if (!c) { toast("Vui lòng nhập mã ưu đãi"); return; }
  const pr = PROMOS.find(x => x.code == c);
  if (!pr) { toast("Mã ưu đãi không tồn tại"); return; }
  if (!promoOK(pr)) { toast("Mã ưu đãi này đã hết hạn sử dụng"); return; }
  const has = Object.values(cart).some(q => q > 0), r = promoCalc(pr);
  setPromo(c);
  $("#ov").classList.remove("on");
  drawer();
  $("#dr").classList.add("on");
  if (!has) toast(`Đã lưu mã ${c}. Hãy chọn thêm linh kiện để được giảm giá.`);
  else if (r.ok) toast(`Đã áp dụng mã ${c}: Giảm ${vnd(r.disc)}`);
  else toast(`Đã chọn mã ${c}: ${r.why}`, 3500);
}

function promoList() {
  const o = $("#ov"), L = PROMOS.filter(promoOK), has = Object.values(cart).some(q => q > 0);
  o.innerHTML = `
    <div class="modal tk" role="dialog" aria-modal="true">
      <div class="modal-top">
        <h2 style="font-size:20px;font-weight:800">Kho Voucher Ưu Đãi</h2>
        <button class="close-btn" id="xx">×</button>
      </div>
      <p style="font-size:13.5px;color:var(--text-muted);margin:8px 0 16px">Chọn mã phù hợp nhất với cấu hình PC bạn đang lựa chọn.</p>
      ${L.map(pr => {
        const r = promoCalc(pr);
        return `
        <div style="background:var(--bg-surface-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:14px;margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-weight:800;color:var(--brand-primary);background:rgba(59,130,246,0.15);padding:3px 10px;border-radius:6px;border:1px dashed var(--brand-primary)">${pr.code}</span>
            <span style="font-weight:800;color:var(--accent-success)">Giảm ${pr.pct}% (tối đa ${vnd(pr.max)})</span>
          </div>
          <div style="font-weight:700;font-size:14px;color:var(--text-main);margin-bottom:4px">${pr.title}</div>
          <div style="font-size:12.5px;color:var(--text-muted)">Điều kiện: ${promoCond(pr)} · Hạn dùng: ${fdate(pr.exp)}</div>
          ${has ? (r.ok ? `<div style="font-size:12.5px;color:var(--accent-success);margin-top:6px;font-weight:600">✓ Giỏ hàng đủ điều kiện: Tiết kiệm ${vnd(r.disc)}</div>` : `<div style="font-size:12.5px;color:var(--accent-sale);margin-top:6px">${r.why}</div>`) : ""}
          <button class="btn-primary" style="width:100%;justify-content:center;margin-top:10px;padding:8px" data-pc="${pr.code}">Áp dụng ngay</button>
        </div>`;
      }).join("")}
    </div>`;
  o.classList.add("on");
  $("#xx").onclick = () => o.classList.remove("on");
  o.querySelectorAll("[data-pc]").forEach(b => b.onclick = () => applyPromo(b.dataset.pc));
}

$("#pb").onclick = promoList;

/* ==========================================================================
   8. GIỎ HÀNG THƯỜNG TRỰC & THANH TOÁN (DRAWER)
   ========================================================================== */
function drawer(msg, code) {
  const dv = id => { const e = $("#" + id); return e ? e.value : null; };
  if (dv("nm") !== null) draft = { nm: dv("nm"), ph: dv("ph"), ad: dv("ad2") };

  const ids = Object.keys(cart).filter(k => cart[k] > 0);
  const sub = ids.reduce((s, k) => s + P.find(p => p.id == k).p * cart[k], 0);
  let pr = PROMOS.find(x => x.code == promo);
  if (pr && !promoOK(pr)) { pr = null; setPromo(""); }
  const pres = pr ? promoCalc(pr) : null;
  const disc = pres && pres.ok ? pres.disc : 0;
  const t = sub - disc;

  const drEl = $("#dr");
  if (!drEl) return;

  drEl.innerHTML = `
    <div class="drawer-header">
      <div class="drawer-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        <span>Giỏ Hàng (${ids.reduce((a, b) => a + cart[b], 0)})</span>
      </div>
      <button class="close-btn" id="dx">×</button>
    </div>
  ` + (msg ? `
    <div class="items-list" style="justify-content:center;text-align:center;padding:40px 10px;">
      <div style="width:60px;height:60px;background:var(--accent-success-bg);color:var(--accent-success);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
      <h3 style="font-size:18px;margin-bottom:8px;font-weight:800">Đặt hàng thành công!</h3>
      <p style="color:var(--text-muted);font-size:14px;line-height:1.5">${msg}</p>
      ${code ? `<button class="btn-primary" id="gt" style="margin-top:20px;justify-content:center;width:100%">Xem lộ trình đơn hàng</button>` : ""}
    </div>
  ` : ids.length ? `
    <div class="items-list">
      ${ids.map(k => {
        const p = P.find(x => x.id == k);
        return `
          <div class="cart-item">
            <img src="${IMG[p.i]}" alt="${p.n}" onerror="this.src='https://api.iconify.design/lucide:cpu.svg?color=%233b82f6'">
            <div class="item-details">
              <h4>${p.n}</h4>
              <div class="item-price">${vnd(p.p)}</div>
              <div class="quantity-controls">
                <button class="qty-btn" data-m="${k}" aria-label="Giảm số lượng">−</button>
                <span style="font-weight:700;font-size:13.5px;min-width:20px;text-align:center">${cart[k]}</span>
                <button class="qty-btn" data-p="${k}" aria-label="Tăng số lượng">+</button>
              </div>
            </div>
            <button class="remove-btn" data-r="${k}" title="Xóa món này">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        `;
      }).join("")}
    </div>

    <!-- Voucher Box -->
    <div class="promo-box">
      ${pr ? `
        <div class="applied-promo-badge">
          <span><b>${pr.code}</b> (-${pr.pct}%, tối đa ${vnd(pr.max)})</span>
          <button style="color:var(--accent-sale);font-weight:700;font-size:12.5px" id="pr">Gỡ bỏ</button>
        </div>
        ${pres.ok ? "" : `<div style="color:var(--accent-sale);font-size:12px;margin-top:6px">${pres.why}</div>`}
      ` : `
        <div class="promo-input-row">
          <input id="pc" placeholder="Nhập mã voucher" autocomplete="off">
          <button id="pa">Áp dụng</button>
        </div>
      `}
      <button id="pl" style="margin-top:8px;font-size:12.5px;color:var(--brand-primary);font-weight:600">Xem danh sách mã voucher có sẵn</button>
    </div>

    <!-- Tóm tắt chi phí -->
    <div class="summary-row">
      <span>Tạm tính</span>
      <span>${vnd(sub)}</span>
    </div>
    ${disc ? `
      <div class="summary-row discount">
        <span>Voucher giảm giá (${pr.code})</span>
        <span>-${vnd(disc)}</span>
      </div>
    ` : ""}
    <div class="total-row">
      <span>Tổng thanh toán</span>
      <span class="total-amount">${vnd(t)}</span>
    </div>

    <!-- Thông tin người nhận -->
    <div class="checkout-form">
      <input id="nm" placeholder="Họ và tên người nhận *" value="${esc(draft.nm ?? ((AU.cur() || {}).name || ""))}">
      <input id="ph" type="tel" placeholder="Số điện thoại nhận hàng *" value="${esc(draft.ph ?? ((AU.cur() || {}).phone || ""))}">
      <input id="ad2" placeholder="Địa chỉ giao hàng chi tiết *" value="${esc(draft.ad ?? ((AU.cur() || {}).addr || ""))}">
      <button class="btn-checkout" id="ck">Xác Nhận Đặt Hàng Ngay</button>
    </div>
  ` : `
    <div class="items-list" style="justify-content:center;text-align:center;padding:50px 10px;">
      <div style="color:var(--text-dim);margin-bottom:12px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
      </div>
      <h4 style="font-size:16px;font-weight:700;margin-bottom:4px">Giỏ hàng đang trống</h4>
      <p style="font-size:13.5px;color:var(--text-muted)">Hãy lựa chọn linh kiện để xây dựng bộ PC mơ ước của bạn.</p>
    </div>
  `);

  $("#dx").onclick = () => $("#dr").classList.remove("on");

  document.querySelectorAll("[data-m]").forEach(b => b.onclick = () => {
    cart[b.dataset.m]--;
    if (cart[b.dataset.m] <= 0) delete cart[b.dataset.m];
    save(); badge(); drawer();
  });
  document.querySelectorAll("[data-p]").forEach(b => b.onclick = () => {
    cart[b.dataset.p]++;
    save(); badge(); drawer();
  });
  document.querySelectorAll("[data-r]").forEach(b => b.onclick = () => {
    delete cart[b.dataset.r];
    save(); badge(); drawer();
  });

  const pa = $("#pa");
  if (pa) {
    pa.onclick = () => applyPromo($("#pc").value);
    $("#pc").onkeydown = e => { if (e.key == "Enter") { e.preventDefault(); applyPromo($("#pc").value); } };
  }
  const prm = $("#pr");
  if (prm) prm.onclick = () => { setPromo(""); drawer(); };
  const pl = $("#pl");
  if (pl) pl.onclick = promoList;

  const gt = $("#gt");
  if (gt) gt.onclick = () => { $("#dr").classList.remove("on"); track(code); };

  const ck = $("#ck");
  if (ck) {
    ck.onclick = () => {
      if (!AU.cur()) { needLogin(); return; }

      const nmEl = $("#nm"), phEl = $("#ph"), adEl = $("#ad2");
      if (!nmEl || !phEl || !adEl || !nmEl.value.trim() || !phEl.value.trim() || !adEl.value.trim()) {
        toast("Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận hàng.");
        return;
      }

      const od = api.create({
        uid: AU.cur().id,
        name: nmEl.value.trim(),
        phone: phEl.value.trim(),
        addr: adEl.value.trim(),
        total: t,
        sub: sub,
        promo: disc ? { code: pr.code, disc: disc } : null,
        items: ids.map(k => { const p = P.find(x => x.id == k); return { n: p.n, q: cart[k], p: p.p }; })
      });

      cart = {};
      save();
      badge();
      setPromo(""); draft = {};
      drawer(`Mã đơn: ${od.id}. Nhân viên sẽ liên hệ xác nhận trong vòng 15 phút.`, od.id);
    };
  }
}

/* ==========================================================================
   9. KHỞI CHẠY ỨNG DỤNG (INITIALIZATION)
   ========================================================================== */
$("#cb").onclick = () => { drawer(); $("#dr").classList.add("on"); };
if ($("#q")) $("#q").oninput = list;

// Render các thành phần giao diện ban đầu
chips();
list();
badge();
hdr();
