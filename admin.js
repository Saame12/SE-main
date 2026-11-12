/* V0 TECH – Trang quản trị (admin.html) & quản lý (manager.html). Dữ liệu demo lưu localStorage (tiền tố v0c_). */
const ROLE=document.body.dataset.role,IS_ADMIN=ROLE==='admin',RN=IS_ADMIN?'Quản trị viên':'Quản lý cửa hàng';
const $=(s,e=document)=>e.querySelector(s),TODAY='2026-11-09',PX='v0c_';
const ld=(k,d)=>{try{return JSON.parse(localStorage.getItem(PX+k))||d}catch(e){return d}};
const sv=(k,v)=>{try{localStorage.setItem(PX+k,JSON.stringify(v))}catch(e){}};
const vnd=n=>Number(n||0).toLocaleString('vi-VN')+'đ';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const toast=m=>{const t=$('#ts');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2800)};
const nid=a=>a.reduce((m,x)=>Math.max(m,x.id),0)+1;
const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
const TAGS={ok:['Đang kinh doanh','Đang dùng','Đang áp dụng','Đang hợp tác','Chính thức','Hoạt động','Hoàn tất','Đã thanh toán','Đã xác nhận','Hiệu lực','Trong kho'],bad:['Hết hàng','Ngừng kinh doanh','Đã thôi việc','Đã khóa','Đã hủy','Hết hạn','Đã ngừng','Ngừng hợp tác','Trả NCC'],warn:['Tạm ngừng bán','Tạm dừng','Chờ hàng','Mới tạo','Nháp','Chưa thanh toán','Chưa chạy','Đang thử việc','Tạm nghỉ phép','Chờ duyệt hủy','Ẩn'],info:['Đang giao','Đã bán']};
const tag=v=>`<span class="tag ${Object.keys(TAGS).find(k=>TAGS[k].includes(v))||''}">${esc(v)}</span>`;

/* ===== Vai trò & ma trận phân quyền (0 = không, 1 = xem, 2 = xem & sửa) ===== */
const ROLES=['Quản trị viên','Quản lý cửa hàng','Nhân viên bán hàng','Nhân viên kho','Nhân viên kế toán'];
const MODS=['products','categories','accounts','promos','customers','staff','orders','invoices','imports','suppliers','reports','cost'];
const TT={products:'Quản lý sản phẩm',categories:'Quản lý loại sản phẩm',accounts:'Quản lý tài khoản & phân quyền',promos:'Quản lý khuyến mãi',customers:'Quản lý khách hàng',staff:'Quản lý nhân viên',orders:'Quản lý đơn đặt hàng',invoices:'Quản lý hóa đơn',imports:'Quản lý nhập hàng',suppliers:'Quản lý nhà cung cấp',reports:'Báo cáo thống kê',cost:'Xem giá nhập, giá vốn, lợi nhuận'};
const SUB={accounts:'Tài khoản',perm:'Phân quyền',categories:'Loại sản phẩm',brands:'Thương hiệu',products:'Sản phẩm',invoices:'Hóa đơn',pending:'Yêu cầu chờ duyệt',imports:'Phiếu nhập',stock:'Tồn kho & cảnh báo',serials:'Số Serial',orders:'Đơn hàng',customers:'Khách hàng'};
/* PG: [tiêu đề, khóa quyền, [tab]] – mỗi trang chỉ có các nhóm chức năng của mình */
const PG=IS_ADMIN?{users:['Tài khoản & phân quyền','accounts',['accounts','perm']],staff:['Quản lý nhân viên','staff'],suppliers:['Quản lý nhà cung cấp','suppliers'],catalog:['Danh mục & sản phẩm','categories',['categories','brands','products']],logs:['Nhật ký hệ thống','accounts']}
:{invoices:['Duyệt hủy hóa đơn & trả hàng','invoices',['invoices','pending']],promos:['Khuyến mãi & voucher','promos'],purchasing:['Nhập hàng & kho bãi','imports',['imports','stock','serials']],orders:['Đơn hàng & khách hàng','orders',['orders','customers']],reports:['Báo cáo thống kê','reports']};
const NAV=Object.keys(PG),TABS=Object.fromEntries(NAV.filter(k=>PG[k][2]).map(k=>[k,PG[k][2]]));
const P0=()=>{const g=['222222222222','220222222222','110120220000','210000102200','110110121122'];return Object.fromEntries(ROLES.map((r,i)=>[r,Object.fromEntries(MODS.map((m,j)=>[m,+g[i][j]]))]))};

/* ===== Dữ liệu mẫu ===== */
const mk=(ks,rows)=>rows.map((r,i)=>Object.fromEntries([['id',i+1],...ks.map((k,j)=>[k,r[j]])]));
const L=(sku,qty,price)=>({sku,qty,price,cost:price});
const SEED=()=>({
 categories:mk(['code','name','parent','specs','status'],[['CPU','CPU','','Socket, Số nhân, Số luồng','Đang dùng'],['MB','Mainboard','','Socket, Chipset, Kích thước','Đang dùng'],['RAM','RAM','','Dung lượng, Thế hệ, Bus','Đang dùng'],['VGA','VGA','','Chip đồ họa, VRAM','Đang dùng'],['SSD','SSD/HDD','','Dung lượng, Chuẩn kết nối','Đang dùng'],['PK','Phụ kiện','','Kiểu kết nối','Đang dùng']]),
 brands:mk(['name','status'],['Intel','AMD','Nvidia','ASUS','MSI','Gigabyte','Kingston','Corsair','Samsung','Razer'].map(n=>[n,'Đang dùng'])),
 products:mk(['sku','barcode','name','cat','brand','price','warranty','serial','min','stock','avgCost','status','spec'],[
  ['CPU-I9K','8935001001','Intel Core i9-13900K','CPU','Intel',13500000,36,true,5,8,11800000,'Đang kinh doanh','LGA1700 · 24 nhân 32 luồng'],
  ['CPU-R78','8935001002','AMD Ryzen 7 7800X3D','CPU','AMD',10900000,36,true,5,5,9600000,'Đang kinh doanh','AM5 · 8 nhân 16 luồng'],
  ['VGA-4080S','8935001003','Nvidia RTX 4080 Super 16GB','VGA','Nvidia',28900000,36,true,3,12,25600000,'Đang kinh doanh','16GB GDDR6X'],
  ['RAM-K32','8935001004','Kingston Fury 32GB DDR5 6000','RAM','Kingston',3200000,36,false,10,40,2600000,'Đang kinh doanh','32GB · DDR5 · 6000MHz'],
  ['SSD-990P','8935001005','Samsung 990 Pro 1TB NVMe','SSD/HDD','Samsung',3890000,60,true,10,0,3100000,'Đang kinh doanh','1TB · PCIe 4.0'],
  ['PK-RZ','8935001006','Combo phím chuột Razer Speed','Phụ kiện','Razer',2390000,12,false,5,22,1900000,'Đang kinh doanh','Phím cơ + chuột không dây']]).map(p=>({...p,hist:[]})),
 customers:mk(['code','name','taxId','phone','email','addr','group','note'],[['KH001','Phạm Hoàng Nam','','0903112233','nam.pham@mail.com','Q.1, TP.HCM','Thân thiết','Hay build PC gaming'],['KH002','Võ Thanh Hà','','0987445566','ha.vo@mail.com','Q.7, TP.HCM','Cá nhân',''],['KH003','Công ty Đặng Gia','0312345678','0912778899','huy@dangia.vn','Thủ Đức, TP.HCM','Doanh nghiệp','Cần xuất hóa đơn VAT']]),
 staff:mk(['code','name','dob','gender','phone','email','addr','pos','start','status'],[['NV001','Trần Thu Lan','1990-04-12','Nữ','0901000111','lan@v0tech.vn','Q.3, TP.HCM','Quản lý cửa hàng','2023-03-01','Chính thức'],['NV002','Lê Minh Khoa','1995-08-20','Nam','0902000222','khoa@v0tech.vn','Q.10, TP.HCM','Nhân viên kho','2024-06-15','Chính thức'],['NV003','Bùi Anh Tuấn','2000-01-05','Nam','0903000333','tuan@v0tech.vn','Q.5, TP.HCM','Nhân viên bán hàng','2025-01-10','Đang thử việc']]),
 suppliers:mk(['code','name','addr','phone','email','tax','contact','status'],[['NCC01','Synnex FPT','Q.3, TP.HCM','02838110000','sales@synnex.vn','0301234567','Hoàng Văn Đức','Đang hợp tác'],['NCC02','An Phát Computer','Cầu Giấy, Hà Nội','02436321111','b2b@anphat.vn','0107654321','Mai Thị Hoa','Đang hợp tác']]),
 promos:mk(['code','name','type','value','min','minQty','limit','start','end','group','stack','status','scope','gift'],[['V0GIAM15','Giảm 15% đơn từ 5 triệu','%',15,5000000,1,100,'2026-10-01','2026-12-31','Tất cả',false,'Đang áp dụng','Tất cả',''],['NEWBIE5','Chào bạn mới giảm 500k','VNĐ',500000,3000000,1,50,'2026-11-01','2026-12-15','Cá nhân',false,'Đang áp dụng','Tất cả',''],['BLACKFRIDAY','Black Friday giảm 20%','%',20,10000000,1,30,'2026-11-25','2026-11-30','Tất cả',false,'Đang áp dụng','Tất cả','']]),
 orders:mk(['code','cust','date','staff','items','promo','discount','total','paid','method','status','stocked','note'],[
  ['DH1001','Phạm Hoàng Nam','2026-09-12','Bùi Anh Tuấn',[{sku:'VGA-4080S',qty:1,price:28900000}],'',0,28900000,28900000,'Chuyển khoản','Hoàn tất',true,''],
  ['DH1002','Võ Thanh Hà','2026-10-03','Bùi Anh Tuấn',[{sku:'CPU-I9K',qty:1,price:13500000}],'',0,13500000,13500000,'Thẻ','Hoàn tất',true,''],
  ['DH1003','Công ty Đặng Gia','2026-10-21','Trần Thu Lan',[{sku:'RAM-K32',qty:2,price:3200000}],'',0,6400000,6400000,'Chuyển khoản','Hoàn tất',true,''],
  ['DH1004','Phạm Hoàng Nam','2026-11-05','Bùi Anh Tuấn',[{sku:'CPU-R78',qty:1,price:10900000}],'V0GIAM15',1635000,9265000,0,'Tiền mặt','Đang giao',true,''],
  ['DH1005','Võ Thanh Hà','2026-11-08','Bùi Anh Tuấn',[{sku:'PK-RZ',qty:1,price:2390000}],'',0,2390000,0,'Tiền mặt','Mới tạo',false,'']]),
 invoices:mk(['code','order','date','staff','cust','lines','discount','total','method','type','status','reason'],[
  ['HD1001','DH1001','2026-09-12','Bùi Anh Tuấn','Phạm Hoàng Nam',[{sku:'VGA-4080S',name:'Nvidia RTX 4080 Super 16GB',qty:1,price:28900000,cogs:25600000}],0,28900000,'Chuyển khoản','Bán lẻ','Hiệu lực',''],
  ['HD1002','DH1002','2026-10-03','Bùi Anh Tuấn','Võ Thanh Hà',[{sku:'CPU-I9K',name:'Intel Core i9-13900K',qty:1,price:13500000,cogs:11800000}],0,13500000,'Thẻ','Bán lẻ','Hiệu lực',''],
  ['HD1003','DH1003','2026-10-21','Trần Thu Lan','Công ty Đặng Gia',[{sku:'RAM-K32',name:'Kingston Fury 32GB DDR5 6000',qty:2,price:3200000,cogs:2600000}],0,6400000,'Chuyển khoản','VAT','Hiệu lực','']]),
 imports:mk(['code','date','sup','lines','total','pay','status','note'],[['PN1001','2026-11-06','Synnex FPT',[L('SSD-990P',30,3100000)],93000000,'Chưa thanh toán','Nháp',''],['PN1002','2026-10-18','An Phát Computer',[L('RAM-K32',40,2600000)],104000000,'Đã thanh toán','Đã xác nhận','']]),
 accounts:mk(['username','email','staff','role','status'],[['admin','admin@v0tech.vn','NV001','Quản trị viên','Hoạt động'],['lan.quanly','lan@v0tech.vn','NV001','Quản lý cửa hàng','Hoạt động'],['tuan.banhang','tuan@v0tech.vn','NV003','Nhân viên bán hàng','Hoạt động'],['khoa.kho','khoa@v0tech.vn','NV002','Nhân viên kho','Hoạt động']]),
 perm:P0(),
 logs:mk(['t','who','type','act'],[['09/11/2026, 08:02','Quản trị viên','Đăng nhập','Đăng nhập thành công'],['08/11/2026, 16:40','Quản lý cửa hàng','Khác','Tạo đơn hàng DH1005'],['08/11/2026, 09:15','Nhân viên kho','Đăng nhập','Đăng nhập thất bại (sai mật khẩu) – tài khoản khoa.kho'],['07/11/2026, 17:30','Quản lý cửa hàng','Sửa giá bán','Sửa giá CPU-I9K: 13.800.000đ → 13.500.000đ'],['06/11/2026, 11:05','Nhân viên bán hàng','Hủy đơn hàng','Hủy đơn DH0999: khách đổi ý']])});
const D={};const genSN=()=>{let id=0;return D.products.filter(p=>p.serial).flatMap(p=>Array.from({length:p.stock},(_,i)=>({id:++id,sku:p.sku,sn:p.sku+'-'+String(i+1).padStart(4,'0'),imp:'—',inv:'',status:'Trong kho'})))};
const loadAll=()=>{Object.entries(SEED()).forEach(([k,v])=>D[k]=ld(k,null)||v);D.serials=ld('serials',null)||genSN()};loadAll();
const saveAll=()=>Object.keys(D).forEach(k=>sv(k,D[k]));
const log=(a,ty='Khác')=>{D.logs.push({id:nid(D.logs),t:new Date().toLocaleString('vi-VN'),who:RN,type:ty,act:a});if(D.logs.length>300)D.logs.shift()};
const can=(k,l)=>IS_ADMIN||((D.perm[RN]||{})[k]||0)>=l;
const P=s=>D.products.find(p=>p.sku===s),PN=s=>(P(s)||{}).name||s;
const stk=(s,d)=>{const p=P(s);if(p)p.stock=Math.max(0,p.stock+d)};
const pst=p=>p.stock<=0&&p.status==='Đang kinh doanh'?'Hết hàng':p.status;
const prs=p=>p.status!=='Đang áp dụng'?p.status:TODAY<p.start?'Chưa chạy':TODAY>p.end?'Hết hạn':p.status;
const pUsed=c=>D.orders.filter(o=>o.promo===c&&o.status!=='Đã hủy');
const grp=(a,kf,vf)=>{const o={};a.forEach(x=>{const k=kf(x);o[k]=(o[k]||0)+vf(x)});return o};
const mo=k=>r=>vnd(r[k]);

/* ===== Hộp thoại, biểu mẫu ===== */
const lineRow=(f,l={})=>{const ps=f.po();return`<div class="lr"><select class="ls" aria-label="Sản phẩm">${ps.map(p=>`<option value="${p.sku}" ${p.sku===l.sku?'selected':''}>${esc(p.sku+' – '+p.name)}</option>`).join('')}</select><input class="lq" type="number" min="1" value="${l.qty||1}" aria-label="Số lượng"><input class="lp" type="number" min="0" value="${l[f.pk]??(ps[0]?f.pd(ps[0]):0)}" aria-label="Đơn giá"><button type="button" class="btn sm del rm" aria-label="Xóa dòng">✕</button></div>`};
const fieldHtml=(f,v={})=>{const t=f.t||'text',x=v[f.k]??f.d??'';let h;
 if(t==='select')h=`<select name="${f.k}">${(typeof f.o==='function'?f.o():f.o).map(o=>{const[a,b]=Array.isArray(o)?o:[o,o];return`<option value="${esc(a)}" ${a==x?'selected':''}>${esc(b)}</option>`}).join('')}</select>`;
 else if(t==='area')h=`<textarea name="${f.k}" rows="2">${esc(x)}</textarea>`;
 else if(t==='bool')h=`<label class="ck"><input type="checkbox" name="${f.k}" ${x?'checked':''}>${f.c||'Có'}</label>`;
 else if(t==='lines')h=`<div class="ln" data-k="${f.k}">${((v[f.k]&&v[f.k].length)?v[f.k]:[{}]).map(l=>lineRow(f,l)).join('')}</div><button type="button" class="btn sm al" data-k="${f.k}">+ Thêm dòng</button>`;
 else h=`<input name="${f.k}" type="${t}" value="${esc(x)}" ${f.req?'required':''} ${t==='number'?'min="0"':''}>`;
 return`<div class="fld ${f.w?'full':''}"><label>${f.l}</label>${h}</div>`};
const readForm=(fm,fs)=>{const o={};fs.forEach(f=>{const t=f.t||'text';if(t==='lines')o[f.k]=[...fm.querySelectorAll('.lr')].map(r=>({sku:$('.ls',r).value,qty:+$('.lq',r).value,[f.pk]:+$('.lp',r).value}));else if(t==='bool')o[f.k]=fm.elements[f.k].checked;else if(t==='number')o[f.k]=+fm.elements[f.k].value;else o[f.k]=fm.elements[f.k].value.trim()});return o};
const wire=(d,fs)=>{d.onclick=e=>{const b=e.target.closest('button');if(!b)return;const f=fs.find(f=>f.k===b.dataset.k);if(b.classList.contains('al'))$('.ln[data-k="'+f.k+'"]',d).insertAdjacentHTML('beforeend',lineRow(f));if(b.classList.contains('rm')&&d.querySelectorAll('.lr').length>1)b.closest('.lr').remove()};
 d.onchange=e=>{if(e.target.classList.contains('ls')){const f=fs.find(f=>f.t==='lines'),p=P(e.target.value);if(p)$('.lp',e.target.closest('.lr')).value=f.pd(p)}}};
function ask(title,fs,cb,ok='Xác nhận',cls=''){const d=$('#dlg');d.className=cls;d.innerHTML=`<form id="fm"><h2>${title}</h2>${fs.map(f=>fieldHtml(f)).join('')}<div class="dact"><button type="button" class="btn" id="cx">Hủy</button><button class="btn pri">${ok}</button></div></form>`;d.showModal();$('#cx').onclick=()=>d.close();$('#fm').onsubmit=e=>{e.preventDefault();const v=readForm(e.target,fs),r=cb(v);if(typeof r==='string')return toast(r);d.close()}}
function info(title,html,cls='wide'){const d=$('#dlg');d.className=cls;d.onclick=d.onchange=null;d.innerHTML=`<h2>${title}</h2>${html}<div class="dact"><button class="btn" id="cx">Đóng</button></div>`;d.showModal();$('#cx').onclick=()=>d.close()}
const done=m=>{saveAll();render();m&&toast(m)};
const tbl=(h,rows)=>`<div class="card"><table><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const dup=(k,f,o,r)=>o[f]&&D[k].some(x=>String(x[f]).toLowerCase()===o[f].toLowerCase()&&(!r||x.id!==r.id));

/* ===== Khuyến mãi áp vào đơn ===== */
const inScope=(p,i)=>{const s=p.scope||'Tất cả',x=P(i.sku)||{};return s==='Tất cả'||s==='Loại: '+x.cat||s==='Hãng: '+x.brand||s==='SP: '+i.sku};
function calcPromo(code,sub,qty,cust,items){const p=D.promos.find(p=>p.code.toLowerCase()===code.toLowerCase());if(!p)return{err:'Mã khuyến mãi không tồn tại'};
 const c=D.customers.find(c=>c.name===cust),s=prs(p),base=sum(items.filter(i=>inScope(p,i)),i=>i.qty*i.price);
 if(s!=='Đang áp dụng')return{err:`Chương trình ${p.code} đang ở trạng thái "${s}"`};
 if(sub<p.min)return{err:`Đơn cần tối thiểu ${vnd(p.min)} để dùng ${p.code}`};
 if(qty<p.minQty)return{err:`Cần mua tối thiểu ${p.minQty} sản phẩm để dùng ${p.code}`};
 if(p.limit&&pUsed(p.code).length>=p.limit)return{err:`Mã ${p.code} đã hết lượt sử dụng`};
 if(p.group!=='Tất cả'&&(!c||c.group!==p.group))return{err:`Mã ${p.code} chỉ áp dụng cho nhóm khách "${p.group}"`};
 if(!base)return{err:`Mã ${p.code} không áp dụng cho sản phẩm trong đơn (${p.scope})`};
 return{p,disc:p.type==='%'?Math.round(base*p.value/100):p.type==='VNĐ'?Math.min(p.value,base):0}}
const mkInv=o=>{const c=D.customers.find(c=>c.name===o.cust);D.invoices.push({id:nid(D.invoices),code:'HD'+o.code.slice(2),order:o.code,date:TODAY,staff:o.staff,cust:o.cust,lines:o.items.map(i=>({sku:i.sku,name:PN(i.sku),qty:i.qty,price:i.price,cogs:(P(i.sku)||{}).avgCost||0})),discount:o.discount,total:o.total,method:o.method,type:c&&c.taxId?'VAT':'Bán lẻ',status:'Hiệu lực',reason:''});o.items.forEach(i=>{if((P(i.sku)||{}).serial)D.serials.filter(s=>s.sku===i.sku&&s.status==='Trong kho').slice(0,i.qty).forEach(s=>{s.status='Đã bán';s.inv='HD'+o.code.slice(2)})})};
const activeP=()=>D.products.filter(p=>p.status==='Đang kinh doanh'),importP=()=>D.products.filter(p=>p.status!=='Ngừng kinh doanh');

/* ===== Cấu hình các phân hệ ===== */
const M={
products:{t:'Quản lý sản phẩm',n:'sản phẩm',nav:'products',
 f:[{k:'sku',l:'Mã SKU',req:1},{k:'barcode',l:'Mã vạch'},{k:'name',l:'Tên sản phẩm',req:1,w:1},{k:'cat',l:'Loại sản phẩm',t:'select',o:()=>D.categories.filter(c=>c.status==='Đang dùng').map(c=>c.name)},{k:'brand',l:'Thương hiệu',t:'select',o:()=>D.brands.filter(b=>b.status==='Đang dùng').map(b=>b.name)},{k:'price',l:'Giá bán niêm yết (đ)',t:'number',req:1},{k:'warranty',l:'Bảo hành (tháng)',t:'number'},{k:'min',l:'Ngưỡng tồn tối thiểu',t:'number'},{k:'serial',l:'Quản lý Serial',t:'bool',c:'Quản lý theo số Serial'},{k:'status',l:'Trạng thái',t:'select',o:['Đang kinh doanh','Tạm ngừng bán','Ngừng kinh doanh']},{k:'spec',l:'Thông số kỹ thuật (theo loại)',t:'area',w:1}],
 def:()=>({status:'Đang kinh doanh',stock:0,avgCost:0,min:5,warranty:12,hist:[]}),
 flt:{l:'Tất cả loại',g:r=>r.cat,o:()=>D.categories.map(c=>c.name)},
 cols:[['SKU','sku'],['Tên sản phẩm','name'],['Loại','cat'],['Hãng','brand'],['Giá bán',mo('price'),'r'],['Giá vốn',mo('avgCost'),'r',()=>can('cost',1)],['Tồn',r=>r.stock<=r.min&&r.status==='Đang kinh doanh'?`<b style="color:var(--warn)">${r.stock}</b> / ${r.min}`:r.stock,'r'],['Trạng thái',r=>tag(pst(r))]],
 pre:(o,n,r)=>dup('products','sku',o,r)?'Mã SKU đã tồn tại':null,
 post:(rec,n,old)=>{if(!n&&old.price!==rec.price){(rec.hist=rec.hist||[]).push({d:TODAY,o:old.price,n:rec.price});log(`Sửa giá ${rec.sku}: ${vnd(old.price)} → ${vnd(rec.price)}`,'Sửa giá bán')}log((n?'Thêm':'Sửa')+' sản phẩm '+rec.sku)},
 del:p=>D.orders.some(o=>o.items.some(i=>i.sku===p.sku))||D.imports.some(i=>i.lines.some(l=>l.sku===p.sku))?'Sản phẩm đã phát sinh giao dịch, không thể xóa. Hãy chuyển sang "Ngừng kinh doanh".':null,
 banner:()=>{const low=D.products.filter(p=>p.status==='Đang kinh doanh'&&p.stock<=p.min);return low.length?`<div class="alert"><span><b>${low.length} sản phẩm</b> chạm ngưỡng tồn tối thiểu: ${low.map(p=>esc(p.sku)).join(', ')}</span>${can('imports',2)&&PG.purchasing?'<button class="btn sm" id="qi">Lập phiếu nhập nhanh</button>':''}</div>`:''},
 bind:()=>{const b=$('#qi');if(b)b.onclick=()=>{const low=D.products.filter(p=>p.status==='Đang kinh doanh'&&p.stock<=p.min),s=D.suppliers.find(s=>s.status==='Đang hợp tác');const lines=low.map(p=>({sku:p.sku,qty:Math.max(p.min*2-p.stock,1),cost:p.avgCost||Math.round(p.price*.85)}));D.imports.push({id:nid(D.imports),code:'PN'+(1000+nid(D.imports)),date:TODAY,sup:s?s.name:'',lines,total:sum(lines,l=>l.qty*l.cost),pay:'Chưa thanh toán',status:'Nháp',note:'Lập nhanh từ cảnh báo tồn thấp'});log('Lập phiếu nhập nháp từ cảnh báo tồn thấp');go('purchasing');done('Đã tạo phiếu nhập nháp – kiểm tra rồi bấm Xác nhận')}},
 x:[{l:'Điều chỉnh tồn',fn:p=>ask('Điều chỉnh tồn kho – '+esc(p.sku),[{k:'q',l:'Số lượng tồn thực tế (kiểm kê)',t:'number',d:p.stock,req:1},{k:'why',l:'Lý do điều chỉnh',t:'area',req:1}],v=>{log(`Điều chỉnh tồn ${p.sku}: ${p.stock} → ${v.q}. Lý do: ${v.why}`,'Điều chỉnh tồn');p.stock=v.q;done('Đã điều chỉnh và lưu vết')})},
  {l:'Lịch sử giá',any:1,fn:p=>info('Lịch sử giá bán – '+esc(p.name),(p.hist||[]).length?tbl(['Ngày','Giá cũ','Giá mới'],p.hist.map(h=>[h.d,vnd(h.o),vnd(h.n)])):'<p class="mu">Chưa có thay đổi giá.</p>','')}]},
categories:{t:'Loại sản phẩm',n:'loại sản phẩm',nav:'categories',
 f:[{k:'code',l:'Mã loại',req:1},{k:'name',l:'Tên loại',req:1},{k:'parent',l:'Thuộc loại cha',t:'select',o:()=>['',...D.categories.map(c=>c.name)]},{k:'status',l:'Trạng thái',t:'select',o:['Đang dùng','Ẩn']},{k:'specs',l:'Bộ thông số kỹ thuật của loại (phân cách bằng dấu phẩy)',t:'area',w:1}],
 def:()=>({status:'Đang dùng'}),cols:[['Mã','code'],['Tên loại','name'],['Loại cha','parent'],['Thông số','specs'],['Số sản phẩm',r=>D.products.filter(p=>p.cat===r.name).length,'r'],['Trạng thái',r=>tag(r.status)]],
 pre:(o,n,r)=>dup('categories','code',o,r)?'Mã loại đã tồn tại':o.parent===o.name?'Loại không thể là cha của chính nó':o.status==='Ẩn'&&D.products.some(p=>p.cat===o.name)?'Loại đang có sản phẩm – hãy chuyển sản phẩm sang loại khác trước khi ẩn':null,
 post:(r,n)=>log((n?'Thêm':'Sửa')+' loại '+r.name),del:c=>D.products.some(p=>p.cat===c.name)?'Loại đang có sản phẩm, không thể xóa.':null},
brands:{t:'Thương hiệu',n:'thương hiệu',nav:'categories',f:[{k:'name',l:'Tên thương hiệu',req:1},{k:'status',l:'Trạng thái',t:'select',o:['Đang dùng','Ẩn']}],def:()=>({status:'Đang dùng'}),
 cols:[['Thương hiệu','name'],['Số sản phẩm',r=>D.products.filter(p=>p.brand===r.name).length,'r'],['Trạng thái',r=>tag(r.status)]],pre:(o,n,r)=>dup('brands','name',o,r)?'Thương hiệu đã tồn tại':null,del:b=>D.products.some(p=>p.brand===b.name)?'Thương hiệu đang có sản phẩm, không thể xóa.':null},
accounts:{t:'Tài khoản',n:'tài khoản',nav:'accounts',
 f:[{k:'username',l:'Tên đăng nhập',req:1},{k:'email',l:'Email',t:'email',req:1},{k:'staff',l:'Nhân viên',t:'select',o:()=>D.staff.map(s=>[s.code,s.code+' – '+s.name])},{k:'role',l:'Vai trò',t:'select',o:ROLES},{k:'status',l:'Trạng thái',t:'select',o:['Hoạt động','Đã khóa']},{k:'pw',l:'Mật khẩu ban đầu (≥ 8 ký tự)',t:'password',nw:1}],
 def:()=>({status:'Hoạt động',role:'Nhân viên bán hàng'}),flt:{l:'Tất cả vai trò',g:r=>r.role,o:()=>ROLES},
 cols:[['Tên đăng nhập','username'],['Email','email'],['Nhân viên',r=>esc((D.staff.find(s=>s.code===r.staff)||{}).name||r.staff)],['Vai trò','role'],['Trạng thái',r=>tag(r.status)+(r.mustChange?' <span class="mu">cần đổi MK</span>':'')]],
 pre:(o,n,r)=>{if(dup('accounts','username',o,r))return'Tên đăng nhập đã tồn tại';const s=D.staff.find(s=>s.code===o.staff);if(s&&s.status==='Đã thôi việc'&&o.status==='Hoạt động')return'Nhân viên đã thôi việc – tài khoản phải ở trạng thái khóa';if(n){if((o.pw||'').length<8)return'Mật khẩu ban đầu tối thiểu 8 ký tự';o.mustChange=true}delete o.pw},
 post:(r,n)=>log((n?'Tạo':'Sửa')+' tài khoản '+r.username),
 x:[{l:'Đặt lại MK',fn:a=>ask('Đặt lại mật khẩu – '+esc(a.username),[{k:'pw',l:'Mật khẩu tạm (≥ 8 ký tự)',t:'password',req:1}],v=>{if(v.pw.length<8)return'Mật khẩu tối thiểu 8 ký tự';a.mustChange=true;log('Đặt lại mật khẩu '+a.username);done('Đã đặt lại – người dùng phải đổi mật khẩu khi đăng nhập')})},
  {l:'Khóa / Mở',fn:a=>{const s=D.staff.find(s=>s.code===a.staff);if(a.status==='Đã khóa'&&s&&s.status==='Đã thôi việc')return'Nhân viên đã thôi việc, không thể mở khóa.';a.status=a.status==='Đã khóa'?'Hoạt động':'Đã khóa';log(a.status+' tài khoản '+a.username)}}]},
logs:{t:'Nhật ký hoạt động',n:'nhật ký',nav:'accounts',rev:1,noAdd:1,noEdit:1,flt:{l:'Tất cả loại thao tác',g:r=>r.type,o:['Đăng nhập','Hủy đơn hàng','Hủy hóa đơn','Sửa giá bán','Điều chỉnh tồn','Khác']},cols:[['Thời gian','t'],['Người thực hiện','who'],['Loại thao tác','type'],['Nội dung','act']]},
promos:{t:'Quản lý khuyến mãi',n:'chương trình',nav:'promos',
 f:[{k:'code',l:'Mã chương trình / coupon',req:1},{k:'name',l:'Tên chương trình',req:1},{k:'type',l:'Hình thức',t:'select',o:['%','VNĐ','Tặng quà']},{k:'value',l:'Giá trị (% hoặc đ)',t:'number'},{k:'min',l:'Đơn tối thiểu (đ)',t:'number'},{k:'minQty',l:'Số lượng SP tối thiểu',t:'number'},{k:'limit',l:'Giới hạn lượt dùng (0 = không giới hạn)',t:'number'},{k:'group',l:'Nhóm khách áp dụng',t:'select',o:['Tất cả','Cá nhân','Doanh nghiệp','Thân thiết']},{k:'scope',l:'Phạm vi áp dụng (loại / thương hiệu / sản phẩm)',t:'select',o:()=>['Tất cả',...D.categories.map(c=>'Loại: '+c.name),...D.brands.map(b=>'Hãng: '+b.name),...D.products.map(p=>'SP: '+p.sku)]},{k:'gift',l:'Quà tặng (nếu hình thức Tặng quà)'},{k:'start',l:'Bắt đầu',t:'date',req:1},{k:'end',l:'Kết thúc',t:'date',req:1},{k:'status',l:'Trạng thái',t:'select',o:['Đang áp dụng','Tạm dừng','Đã ngừng']},{k:'stack',l:'Cộng dồn',t:'bool',c:'Cho phép cộng dồn chương trình khác'}],
 def:()=>({scope:'Tất cả',type:'%',minQty:1,limit:0,group:'Tất cả',status:'Đang áp dụng',start:TODAY}),flt:{l:'Tất cả trạng thái',g:r=>prs(r),o:['Đang áp dụng','Chưa chạy','Tạm dừng','Hết hạn','Đã ngừng']},
 cols:[['Mã','code'],['Chương trình','name'],['Ưu đãi',r=>r.type==='%'?r.value+'%':r.type==='VNĐ'?vnd(r.value):'Quà: '+esc(r.gift||'')],['Điều kiện',r=>`≥ ${vnd(r.min)} · ${esc(r.group)} · ${esc(r.scope||'Tất cả')}`],['Thời gian',r=>r.start+' → '+r.end],['Lượt dùng',r=>pUsed(r.code).length+(r.limit?' / '+r.limit:''),'r'],['Tổng giảm',r=>vnd(sum(pUsed(r.code),o=>o.discount)),'r'],['Trạng thái',r=>tag(prs(r))]],
 pre:(o,n,r)=>dup('promos','code',o,r)?'Mã chương trình đã tồn tại':o.end<o.start?'Ngày kết thúc phải sau ngày bắt đầu':null,post:(r,n)=>log((n?'Tạo':'Sửa')+' khuyến mãi '+r.code),
 del:p=>pUsed(p.code).length?'Chương trình đã được dùng – hãy chuyển sang "Đã ngừng".':null,
 x:[{l:'Tạm dừng / Tiếp tục',fn:p=>{p.status=p.status==='Đang áp dụng'?'Tạm dừng':'Đang áp dụng';log(p.status+' '+p.code)}},{l:'Kết thúc',show:p=>p.status!=='Đã ngừng',fn:p=>{p.status='Đã ngừng';log('Kết thúc '+p.code)}}]},
customers:{t:'Quản lý khách hàng',n:'khách hàng',nav:'customers',pfx:'KH',
 f:[{k:'name',l:'Họ tên / Tên doanh nghiệp',req:1},{k:'group',l:'Nhóm khách hàng',t:'select',o:['Cá nhân','Doanh nghiệp','Thân thiết']},{k:'phone',l:'Số điện thoại'},{k:'email',l:'Email',t:'email'},{k:'taxId',l:'Mã số thuế (nếu xuất VAT)'},{k:'addr',l:'Địa chỉ'},{k:'note',l:'Ghi chú chăm sóc',t:'area',w:1}],def:()=>({group:'Cá nhân'}),
 flt:{l:'Tất cả nhóm',g:r=>r.group,o:['Cá nhân','Doanh nghiệp','Thân thiết']},
 cols:[['Mã','code'],['Khách hàng','name'],['Nhóm','group'],['Điện thoại','phone'],['MST','taxId'],['Số đơn',r=>D.orders.filter(o=>o.cust===r.name&&o.status!=='Đã hủy').length,'r'],['Tổng giao dịch',r=>vnd(sum(D.orders.filter(o=>o.cust===r.name&&o.status==='Hoàn tất'),o=>o.total)),'r']],
 pre:(o,n,r)=>dup('customers','phone',o,r)?'Số điện thoại đã có hồ sơ':dup('customers','email',o,r)?'Email đã có hồ sơ':dup('customers','taxId',o,r)?'Mã số thuế đã có hồ sơ':null,post:(r,n)=>log((n?'Thêm':'Sửa')+' khách hàng '+r.name),
 del:c=>D.orders.some(o=>o.cust===c.name)?'Khách đã có đơn hàng, không thể xóa hồ sơ.':null,
 x:[{l:'Lịch sử mua',any:1,fn:c=>info('Lịch sử mua – '+esc(c.name),tbl(['Đơn','Hóa đơn','Ngày','Sản phẩm','Tổng tiền','Trạng thái'],D.orders.filter(o=>o.cust===c.name).map(o=>[o.code,(D.invoices.find(i=>i.order===o.code)||{}).code||'—',o.date,esc(o.items.map(i=>PN(i.sku)+' ×'+i.qty).join(', ')),vnd(o.total),tag(o.status)])))}]},
staff:{t:'Quản lý nhân viên',n:'nhân viên',nav:'staff',pfx:'NV',
 f:[{k:'name',l:'Họ tên',req:1},{k:'dob',l:'Ngày sinh',t:'date'},{k:'gender',l:'Giới tính',t:'select',o:['Nữ','Nam','Khác']},{k:'phone',l:'Số điện thoại'},{k:'email',l:'Email',t:'email'},{k:'pos',l:'Chức vụ',t:'select',o:['Quản lý cửa hàng','Nhân viên bán hàng','Nhân viên kho','Nhân viên kế toán','Kỹ thuật viên']},{k:'start',l:'Ngày vào làm',t:'date'},{k:'status',l:'Trạng thái làm việc',t:'select',o:['Đang thử việc','Chính thức','Tạm nghỉ phép','Đã thôi việc']},{k:'addr',l:'Địa chỉ',w:1}],def:()=>({status:'Đang thử việc',start:TODAY,gender:'Nữ'}),
 flt:{l:'Tất cả trạng thái',g:r=>r.status,o:['Đang thử việc','Chính thức','Tạm nghỉ phép','Đã thôi việc']},
 cols:[['Mã','code'],['Họ tên','name'],['Chức vụ','pos'],['Điện thoại','phone'],['Vào làm','start'],['Số đơn',r=>D.orders.filter(o=>o.staff===r.name&&o.status!=='Đã hủy').length,'r'],['Số hóa đơn',r=>D.invoices.filter(i=>i.staff===r.name&&i.status!=='Đã hủy').length,'r'],['Doanh số',r=>vnd(sum(D.invoices.filter(i=>i.staff===r.name&&i.status!=='Đã hủy'),i=>i.total)),'r'],['Trạng thái',r=>tag(r.status)]],
 pre:(o,n,r)=>dup('staff','email',o,r)?'Email đã có hồ sơ':null,
 post:(r,n)=>{log((n?'Thêm':'Sửa')+' nhân viên '+r.name);if(r.status==='Đã thôi việc')D.accounts.filter(a=>a.staff===r.code).forEach(a=>{if(a.status!=='Đã khóa'){a.status='Đã khóa';log('Tự khóa tài khoản '+a.username+' (nhân viên thôi việc)')}})}},
orders:{t:'Quản lý đơn đặt hàng',n:'đơn hàng',nav:'orders',pfx:'DH',
 f:[{k:'cust',l:'Khách hàng',t:'select',o:()=>['Khách lẻ',...D.customers.map(c=>c.name)]},{k:'staff',l:'Nhân viên lập đơn',t:'select',o:()=>D.staff.filter(s=>s.status!=='Đã thôi việc').map(s=>s.name)},{k:'items',l:'Sản phẩm (đơn giá có thể chỉnh)',t:'lines',pk:'price',po:activeP,pd:p=>p.price,w:1},{k:'promo',l:'Mã khuyến mãi'},{k:'method',l:'Thanh toán',t:'select',o:['Tiền mặt','Chuyển khoản','Thẻ','Trả góp','COD']},{k:'note',l:'Ghi chú / địa chỉ nhận',t:'area',w:1}],
 def:()=>({status:'Mới tạo',date:TODAY,paid:0,discount:0,total:0,stocked:false,staff:'Trần Thu Lan'}),canEdit:r=>['Mới tạo','Chờ hàng'].includes(r.status),
 flt:{l:'Tất cả trạng thái',g:r=>r.status,o:['Mới tạo','Đã xác nhận','Chờ hàng','Đã thanh toán','Đang giao','Hoàn tất','Đã hủy']},
 cols:[['Mã đơn','code'],['Khách hàng','cust'],['Ngày','date'],['NV lập','staff'],['Tổng tiền',mo('total'),'r'],['Còn lại',r=>vnd(r.total-r.paid),'r'],['Trạng thái',r=>tag(r.status)]],
 pre:(o,n,r)=>{o.items=o.items.filter(i=>i.qty>0);if(!o.items.length)return'Đơn cần ít nhất 1 sản phẩm';if(new Set(o.items.map(i=>i.sku)).size<o.items.length)return'Một sản phẩm chỉ nên xuất hiện một dòng';
  const sub=sum(o.items,i=>i.qty*i.price);o.discount=0;if(o.promo){const c=calcPromo(o.promo,sub,sum(o.items,i=>i.qty),o.cust,o.items);if(c.err)return c.err;o.discount=c.disc;o.promo=c.p.code;if(c.p.type==='Tặng quà'&&!(o.note||'').includes('Quà tặng'))o.note=(o.note?o.note+' | ':'')+'Quà tặng: '+c.p.gift}o.total=sub-o.discount},
 post:(r,n)=>log((n?'Tạo':'Sửa')+' đơn hàng '+r.code),
 view:o=>info('Đơn '+o.code+' '+tag(o.status),`<p class="mu">${esc(o.cust)} · ${o.date} · NV: ${esc(o.staff)} · ${esc(o.method)}</p>`+tbl(['Sản phẩm','SL','Đơn giá','Thành tiền'],o.items.map(i=>[esc(PN(i.sku)),i.qty,vnd(i.price),vnd(i.qty*i.price)]))+`<p>Khuyến mãi ${esc(o.promo||'—')}: −${vnd(o.discount)}<br><b>Tổng ${vnd(o.total)}</b> · Đã thu ${vnd(o.paid)} · Còn lại ${vnd(o.total-o.paid)}</p>`+(o.ship?`<p>Vận chuyển: ${esc(o.ship)} · phí ${vnd(o.fee)}</p>`:'')+(o.note?`<p class="mu">Ghi chú: ${esc(o.note)}</p>`:'')),
 x:[{l:'Xác nhận',show:r=>['Mới tạo','Chờ hàng'].includes(r.status),fn:r=>{const lack=r.items.filter(i=>(P(i.sku)||{stock:0}).stock<i.qty);if(lack.length){r.status='Chờ hàng';toast('Thiếu hàng: '+lack.map(i=>i.sku).join(', ')+' – đơn chuyển sang Chờ hàng; hãy báo khách')}else{r.status='Đã xác nhận';toast('Đã xác nhận đơn '+r.code)}log('Xác nhận đơn '+r.code+' → '+r.status)}},
  {l:'Thu tiền',show:r=>['Đã xác nhận','Chờ hàng','Đang giao'].includes(r.status)&&r.paid<r.total,fn:r=>ask('Thu tiền đơn '+r.code,[{k:'a',l:'Số tiền thu (đ) – hỗ trợ đặt cọc / nhiều lần',t:'number',d:r.total-r.paid,req:1}],v=>{r.paid=Math.min(r.total,r.paid+v.a);if(r.paid>=r.total&&r.status==='Đã xác nhận')r.status='Đã thanh toán';log(`Thu ${vnd(v.a)} đơn ${r.code}`);done('Đã ghi nhận thanh toán')})},
  {l:'Giao hàng',show:r=>['Đã xác nhận','Đã thanh toán'].includes(r.status),fn:r=>{const lack=r.items.filter(i=>(P(i.sku)||{stock:0}).stock<i.qty);if(lack.length)return'Không đủ tồn kho: '+lack.map(i=>i.sku).join(', ');ask('Giao hàng đơn '+r.code,[{k:'ship',l:'Đơn vị vận chuyển',d:'Tự giao'},{k:'fee',l:'Phí vận chuyển (đ)',t:'number',d:0}],v=>{r.items.forEach(i=>stk(i.sku,-i.qty));r.stocked=true;r.ship=v.ship;r.fee=v.fee;r.status='Đang giao';log('Giao đơn '+r.code);done('Đã xuất kho và chuyển sang Đang giao')})}},
  {l:'Hoàn tất',show:r=>r.status==='Đang giao',fn:r=>{r.paid=r.total;r.status='Hoàn tất';mkInv(r);log('Hoàn tất đơn '+r.code+', tự lập hóa đơn HD'+r.code.slice(2));toast('Đơn hoàn tất – đã tự lập hóa đơn HD'+r.code.slice(2))}},
  {l:'Hủy đơn',c:'del',show:r=>!['Hoàn tất','Đã hủy'].includes(r.status),fn:r=>ask('Hủy đơn '+r.code,[{k:'why',l:'Lý do hủy (bắt buộc)',t:'area',req:1}],v=>{if(r.stocked)r.items.forEach(i=>stk(i.sku,i.qty));r.status='Đã hủy';r.note=(r.note?r.note+' | ':'')+'Hủy: '+v.why;log(`Hủy đơn ${r.code}: ${v.why}`,'Hủy đơn hàng');done(r.paid?'Đã hủy đơn – nhớ hoàn lại '+vnd(r.paid)+' đã thu':'Đã hủy đơn, tồn kho được hoàn lại')})}]},
invoices:{t:'Hóa đơn',n:'hóa đơn',nav:'invoices',noAdd:1,noEdit:1,
 flt:{l:'Tất cả trạng thái',g:r=>r.status,o:['Hiệu lực','Chờ duyệt hủy','Đã hủy']},
 cols:[['Hóa đơn','code'],['Đơn','order'],['Ngày','date'],['Khách hàng','cust'],['NV lập','staff'],['Giá trị',mo('total'),'r'],['Trạng thái',r=>tag(r.status)],['Yêu cầu',r=>r.kind?esc(r.kind+' · '+r.reqBy+': '+r.reason)+(r.refund?' · hoàn '+vnd(r.refund):''):'—']],
 view:i=>info('Hóa đơn '+i.code+' '+tag(i.status),`<div id="inv"><p class="mu">${i.type==='VAT'?'Hóa đơn VAT':'Hóa đơn bán lẻ'} · Đơn ${i.order} · ${i.date}<br>Khách: ${esc(i.cust)} · NV lập: ${esc(i.staff)} · ${esc(i.method)}</p>`+tbl(['Sản phẩm','SL','Đơn giá','Thành tiền','Bảo hành'],i.lines.map(l=>[esc(l.name),l.qty,vnd(l.price),vnd(l.qty*l.price),((P(l.sku)||{}).warranty||0)+' tháng']))+`<p>Giảm giá: −${vnd(i.discount)}<br><b>Tổng thanh toán: ${vnd(i.total)}</b></p>${i.kind?`<p class="mu">${esc(i.kind)} (${esc(i.reqBy)}): ${esc(i.reason)}</p>`:''}</div><div class="dact"><button class="btn pri" onclick="window.print()">In hóa đơn</button></div>`),
 x:[{l:'Ghi nhận yêu cầu',c:'del',show:i=>i.status==='Hiệu lực',fn:i=>ask('Tiếp nhận yêu cầu cho '+i.code,[{k:'kind',l:'Loại yêu cầu',t:'select',o:['Hủy hóa đơn','Khách trả hàng']},{k:'by',l:'Nhân viên bán hàng gửi yêu cầu',t:'select',o:D.staff.filter(s=>s.status!=='Đã thôi việc').map(s=>s.name),d:i.staff},{k:'why',l:'Lý do (bắt buộc)',t:'area',req:1}],v=>{i.status='Chờ duyệt hủy';i.kind=v.kind;i.reqBy=v.by;i.reason=v.why;log(`${v.kind} ${i.code} do ${v.by} đề nghị: ${v.why}`);done('Đã chuyển vào tab "Yêu cầu chờ duyệt"')})},
  {l:'Duyệt',show:i=>i.status==='Chờ duyệt hủy',fn:i=>ask('Duyệt '+(i.kind||'yêu cầu').toLowerCase()+' '+i.code,[{k:'refund',l:'Số tiền hoàn cho khách (đ)',t:'number',d:i.total}],v=>{i.lines.forEach(l=>stk(l.sku,l.qty));D.serials.filter(s=>s.inv===i.code).forEach(s=>{s.status='Trong kho';s.inv=''});i.status='Đã hủy';i.refund=v.refund;log(`Duyệt ${i.kind} ${i.code}: hoàn tồn kho, hoàn tiền ${vnd(v.refund)}`,'Hủy hóa đơn');done('Đã hủy hóa đơn, hoàn tồn kho và ghi nhận hoàn tiền '+vnd(v.refund))},'Duyệt')},
  {l:'Từ chối',show:i=>i.status==='Chờ duyệt hủy',fn:i=>{i.status='Hiệu lực';log(`Từ chối ${i.kind} ${i.code}`);delete i.kind;delete i.reqBy}}]},
imports:{t:'Quản lý nhập hàng',n:'phiếu nhập',nav:'imports',pfx:'PN',
 f:[{k:'sup',l:'Nhà cung cấp',t:'select',o:()=>D.suppliers.filter(s=>s.status==='Đang hợp tác').map(s=>s.name)},{k:'date',l:'Ngày nhập',t:'date'},{k:'lines',l:'Sản phẩm nhập (số lượng thực nhận, đơn giá nhập)',t:'lines',pk:'cost',po:importP,pd:p=>p.avgCost||Math.round(p.price*.85),w:1},{k:'pay',l:'Thanh toán',t:'select',o:['Chưa thanh toán','Đã thanh toán']},{k:'note',l:'Ghi chú / số Serial',t:'area',w:1}],
 def:()=>({status:'Nháp',date:TODAY,total:0}),canEdit:r=>r.status==='Nháp',flt:{l:'Tất cả trạng thái',g:r=>r.status,o:['Nháp','Đã xác nhận','Đã hủy']},
 cols:[['Phiếu','code'],['Ngày','date'],['Nhà cung cấp','sup'],['Sản phẩm',r=>esc(r.lines.map(l=>l.sku+' ×'+l.qty).join(', '))],['Tổng tiền',mo('total'),'r',()=>can('cost',1)],['Thanh toán',r=>tag(r.pay)],['Trạng thái',r=>tag(r.status)]],
 pre:(o,n,r)=>{o.lines=o.lines.filter(l=>l.qty>0);if(!o.lines.length)return'Phiếu cần ít nhất 1 sản phẩm';o.total=sum(o.lines,l=>l.qty*l.cost)},post:(r,n)=>log((n?'Lập':'Sửa')+' phiếu nhập '+r.code),
 view:r=>info('Phiếu '+r.code+' '+tag(r.status),`<p class="mu">${esc(r.sup)} · ${r.date} · ${esc(r.pay)}</p>`+tbl(['Sản phẩm','SL','Đơn giá nhập','Thành tiền'],r.lines.map(l=>[esc(PN(l.sku)),l.qty,can('cost',1)?vnd(l.cost):'—',can('cost',1)?vnd(l.qty*l.cost):'—']))+(r.note?`<p class="mu">${esc(r.note)}</p>`:'')+(r.returns?`<p>Đã trả NCC: ${r.returns.map(x=>x.sku+' ×'+x.qty).join(', ')}</p>`:'')),
 x:[{l:'Đối soát & nhập kho',show:r=>r.status==='Nháp',fn:r=>{const fs=r.lines.flatMap((l,i)=>[{k:'q'+i,l:`${l.sku} – Số lượng thực nhận (phiếu ghi ${l.qty})`,t:'number',d:l.qty,req:1},...((P(l.sku)||{}).serial?[{k:'s'+i,l:`Số Serial ${l.sku} – mỗi dòng 1 số, đủ số lượng thực nhận`,t:'area'}]:[])]);
  ask('Đối soát phiếu '+r.code,fs,v=>{const sn=[];for(let i=0;i<r.lines.length;i++){const l=r.lines[i],p=P(l.sku),q=v['q'+i];if(p&&p.serial){const a=[...new Set((v['s'+i]||'').split('\n').map(x=>x.trim()).filter(Boolean))];if(a.length!==q)return`${l.sku}: cần đúng ${q} số Serial khác nhau (đang có ${a.length})`;if(a.some(x=>D.serials.some(y=>y.sn===x)))return'Có số Serial đã tồn tại trong hệ thống';a.forEach(x=>sn.push({sku:l.sku,sn:x}))}}
   r.lines.forEach((l,i)=>{const p=P(l.sku),q=v['q'+i];l.ord=l.qty;l.qty=q;if(!p)return;const t=p.stock+q;p.avgCost=t?Math.round((p.stock*p.avgCost+q*l.cost)/t):l.cost;p.stock=t});
   r.total=sum(r.lines,l=>l.qty*l.cost);sn.forEach(x=>D.serials.push({id:nid(D.serials),sku:x.sku,sn:x.sn,imp:r.code,inv:'',status:'Trong kho'}));r.status='Đã xác nhận';log('Xác nhận phiếu nhập '+r.code+' – tăng tồn kho, cập nhật giá vốn bình quân, ghi nhận '+sn.length+' Serial');done('Đã nhập kho, cập nhật giá vốn bình quân')},'Xác nhận nhập kho','wide')}},
  {l:'Hủy phiếu',c:'del',show:r=>r.status==='Nháp',fn:r=>{r.status='Đã hủy';log('Hủy phiếu nhập '+r.code)}},
  {l:'Trả hàng NCC',show:r=>r.status==='Đã xác nhận',fn:r=>ask('Trả hàng lỗi cho '+esc(r.sup),[{k:'sku',l:'Sản phẩm',t:'select',o:r.lines.map(l=>[l.sku,l.sku+' – '+PN(l.sku)])},{k:'qty',l:'Số lượng trả',t:'number',d:1,req:1}],v=>{const p=P(v.sku);if(!p||v.qty<1||v.qty>p.stock)return'Số lượng trả vượt tồn kho';stk(v.sku,-v.qty);D.serials.filter(s=>s.sku===v.sku&&s.status==='Trong kho').slice(0,v.qty).forEach(s=>s.status='Trả NCC');(r.returns=r.returns||[]).push({sku:v.sku,qty:v.qty});log(`Trả NCC ${v.sku} ×${v.qty} (${r.code})`);done('Đã tạo phiếu trả và trừ tồn kho')})}]},
suppliers:{t:'Quản lý nhà cung cấp',n:'nhà cung cấp',nav:'suppliers',pfx:'NCC',
 f:[{k:'name',l:'Tên công ty',req:1},{k:'contact',l:'Người đại diện liên hệ'},{k:'phone',l:'Số điện thoại'},{k:'email',l:'Email',t:'email'},{k:'tax',l:'Mã số thuế'},{k:'status',l:'Trạng thái',t:'select',o:['Đang hợp tác','Ngừng hợp tác']},{k:'addr',l:'Địa chỉ',w:1}],def:()=>({status:'Đang hợp tác'}),
 flt:{l:'Tất cả trạng thái',g:r=>r.status,o:['Đang hợp tác','Ngừng hợp tác']},
 cols:[['Mã','code'],['Công ty','name'],['Liên hệ','contact'],['Điện thoại','phone'],['Số phiếu nhập',r=>D.imports.filter(i=>i.sup===r.name&&i.status==='Đã xác nhận').length,'r'],['Trạng thái',r=>tag(r.status)]],
 pre:(o,n,r)=>dup('suppliers','tax',o,r)?'Mã số thuế đã có hồ sơ':null,post:(r,n)=>log((n?'Thêm':'Sửa')+' nhà cung cấp '+r.name),del:s=>D.imports.some(i=>i.sup===s.name)?'Nhà cung cấp đã có phiếu nhập – hãy chuyển sang "Ngừng hợp tác".':null,
 x:[{l:'Lịch sử & so sánh giá',any:1,fn:s=>{const all=D.imports.filter(i=>i.status==='Đã xác nhận'),mine=all.filter(i=>i.sup===s.name),cost=can('cost',1);
  const cmp=[...new Set(mine.flatMap(i=>i.lines.map(l=>l.sku)))].map(k=>{const by={};all.forEach(i=>i.lines.filter(l=>l.sku===k).forEach(l=>by[i.sup]=l.cost));const mn=Object.entries(by).sort((a,b)=>a[1]-b[1])[0];return[esc(PN(k)),cost?vnd(by[s.name]):'—',cost?esc(mn[0])+' – '+vnd(mn[1]):'—']});
  info('Lịch sử cung ứng – '+esc(s.name),tbl(['Phiếu','Ngày','Sản phẩm','Tổng tiền'],mine.map(i=>[i.code,i.date,esc(i.lines.map(l=>PN(l.sku)+' ×'+l.qty).join(', ')),cost?vnd(i.total):'—']))+'<h3>So sánh giá nhập gần nhất</h3>'+tbl(['Sản phẩm','NCC này','Giá thấp nhất'],cmp))}}]}};
M.stock={...M.products,t:'Tồn kho',src:'products',noAdd:1,noEdit:1,del:null};
M.pending={...M.invoices,t:'Yêu cầu chờ duyệt',src:'invoices',base:i=>i.status==='Chờ duyệt hủy',flt:null};
M.serials={t:'Số Serial',n:'số Serial',nav:'imports',src:'serials',noAdd:1,noEdit:1,flt:{l:'Tất cả trạng thái',g:r=>r.status,o:['Trong kho','Đã bán','Trả NCC']},
 cols:[['Số Serial','sn'],['Sản phẩm',r=>esc(PN(r.sku))],['Phiếu nhập','imp'],['Hóa đơn bán',r=>esc(r.inv||'—')],['Bảo hành',r=>{const i=D.invoices.find(i=>i.code===r.inv);if(!i)return'—';const e=new Date(i.date);e.setMonth(e.getMonth()+((P(r.sku)||{}).warranty||0));const d=Math.ceil((e-new Date(TODAY))/864e5);return d>0?'còn '+d+' ngày':'Hết hạn'}],['Trạng thái',r=>tag(r.status)]]};
const vis=k=>can(PG[k][1],1);

/* ===== Khung hiển thị ===== */
let cur=(location.hash||'').slice(1),sub=null,q='',fl={},H=null;
const MY=()=>NAV.filter(vis);
function go(k){cur=k;sub=null;q='';history.replaceState(null,'','#'+k);render()}
function render(){const my=MY();if(!my.includes(cur))cur=my[0];const tabs=TABS[cur];if(!tabs)sub=cur;else if(!tabs.includes(sub))sub=tabs[0];
 $('#nav').innerHTML=my.map(k=>`<a data-k="${k}" class="${k===cur?'on':''}" tabindex="0">${PG[k][0]}</a>`).join('');$('#ttl').textContent=PG[cur][0];document.title='V0 TECH – '+PG[cur][0];
 $('#view').innerHTML=(tabs?`<div class="tabs">${tabs.map(t=>`<button class="tab ${t===sub?'on':''}" data-s="${t}">${SUB[t]}</button>`).join('')}</div>`:'')+'<div id="tb"></div>';
 H=null;sub==='reports'?report():sub==='perm'?permView():list(sub)}
$('#nav').onclick=e=>{const a=e.target.closest('a');a&&go(a.dataset.k)};
$('#nav').onkeydown=e=>{if(e.key==='Enter'){const a=e.target.closest('a');a&&go(a.dataset.k)}};
$('#view').onclick=e=>{const t=e.target.closest('.tab');if(t){sub=t.dataset.s;q='';fl={};return render()}H&&H(e)};

function list(k){const m=M[k],ed=can(m.nav,2),tb=$('#tb');const src=m.src||k;let rows=D[src].slice();if(m.base)rows=rows.filter(m.base);if(m.rev)rows.reverse();
 if(m.flt&&fl[k])rows=rows.filter(r=>m.flt.g(r)===fl[k]);const qq=q.toLowerCase();if(qq)rows=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(qq));
 const cols=m.cols.filter(c=>!c[3]||c[3]()),cell=(r,c)=>typeof c[1]==='function'?c[1](r):esc(r[c[1]]);
 const acts=r=>{const xs=(m.x||[]).map((x,i)=>[x,i]).filter(([x])=>(!x.show||x.show(r))&&(x.any||ed));let h=m.view?`<button class="btn sm" data-v="${r.id}">Chi tiết</button>`:'';
  h+=xs.map(([x,i])=>`<button class="btn sm ${x.c||''}" data-x="${i}" data-id="${r.id}">${x.l}</button>`).join('');
  if(ed&&!m.noEdit&&(!m.canEdit||m.canEdit(r)))h+=`<button class="btn sm" data-e="${r.id}">Sửa</button>`;if(ed&&m.del)h+=`<button class="btn sm del" data-d="${r.id}">Xóa</button>`;return h};
 tb.innerHTML=(m.banner?m.banner():'')+`<div class="bar"><input id="q" type="search" placeholder="Tìm ${m.n}..." value="${esc(q)}" aria-label="Tìm kiếm">${m.flt?`<select id="fl" aria-label="Lọc"><option value="">${m.flt.l}</option>${(typeof m.flt.o==='function'?m.flt.o():m.flt.o).map(o=>`<option ${fl[k]===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`:''}<span class="sp"></span>${ed&&!m.noAdd&&m.f?`<button class="btn pri" id="add">+ Thêm ${m.n}</button>`:''}</div>
 <div class="card"><table><thead><tr>${cols.map(c=>`<th class="${c[2]||''}">${c[0]}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td class="${c[2]||''}">${cell(r,c)}</td>`).join('')}<td><div class="acts">${acts(r)}</div></td></tr>`).join('')}</tbody></table>${rows.length?'':`<div class="empty">${q||fl[k]?'Không có kết quả phù hợp.':'Chưa có '+m.n+'.'+(ed&&m.f?' Bấm “Thêm '+m.n+'” để tạo mới.':'')}</div>`}</div>`;
 if(m.bind)m.bind();const qi=$('#q');qi.oninput=()=>{q=qi.value;const p=qi.selectionStart;list(k);const n=$('#q');n.focus();n.setSelectionRange(p,p)};
 const fe=$('#fl');if(fe)fe.onchange=()=>{fl[k]=fe.value;list(k)};const ad=$('#add');if(ad)ad.onclick=()=>form(k);
 H=e=>{const b=e.target.closest('button');if(!b)return;const f=id=>D[src].find(x=>x.id===+id);
  if(b.dataset.e)form(k,f(b.dataset.e));else if(b.dataset.v)m.view(f(b.dataset.v));else if(b.dataset.d){const r=f(b.dataset.d),er=m.del(r);if(er)return toast(er);ask('Xóa '+m.n+'?',[],()=>{D[src]=D[src].filter(x=>x.id!==r.id);log('Xóa '+m.n+' #'+r.id);done('Đã xóa '+m.n)},'Xóa','')}
  else if(b.dataset.x){const err=m.x[b.dataset.x].fn(f(b.dataset.id));if(typeof err==='string')toast(err);else done()}}}

function form(k,r){const m=M[k],d=$('#dlg'),n=!r,v=r||m.def(),fs=m.f.filter(f=>!(f.nw&&!n));
 d.className='wide';d.innerHTML=`<form id="fm"><h2>${n?'Thêm':'Sửa'} ${m.n}</h2><div class="fg">${fs.map(f=>fieldHtml(f,v)).join('')}</div><div class="dact"><button type="button" class="btn" id="cx">Hủy</button><button class="btn pri">Lưu</button></div></form>`;
 d.showModal();wire(d,fs);$('#cx').onclick=()=>d.close();
 if(k==='products'){const c=$('[name=cat]',d),sp=$('[name=spec]',d),h=()=>{const x=D.categories.find(x=>x.name===c.value);sp.placeholder=x&&x.specs?'Nhập: '+x.specs:''};c.onchange=h;h()}
 $('#fm').onsubmit=e=>{e.preventDefault();const o=readForm(e.target,fs),err=m.pre&&m.pre(o,n,r);if(err)return toast(err);
  const old=r?{...r}:null,rec=r||{...m.def(),id:nid(D[k])};Object.assign(rec,o);if(n){if(m.pfx)rec.code=m.pfx+String(1000+rec.id).slice(m.pfx==='NCC'?2:0);D[k].push(rec)}
  m.post&&m.post(rec,n,old);d.close();done(n?'Đã thêm '+m.n:'Đã lưu thay đổi')}}

function permView(){const tb=$('#tb');
 tb.innerHTML=`<p class="mu">Chọn mức truy cập cho từng vai trò. Trang <b>manager.html</b> áp dụng đúng ma trận này cho vai trò "Quản lý cửa hàng". Quản trị viên luôn có toàn quyền; tài khoản & phân quyền chỉ dành cho quản trị viên.</p>`+tbl(['Chức năng',...ROLES],MODS.map(mm=>[TT[mm],...ROLES.map((r,i)=>`<select data-r="${r}" data-m="${mm}" aria-label="${TT[mm]} – ${r}" ${i===0||mm==='accounts'?'disabled':''}>${['Không','Xem','Xem & sửa'].map((o,j)=>`<option value="${j}" ${D.perm[r][mm]===j?'selected':''}>${o}</option>`).join('')}</select>`)]));
 tb.onchange=e=>{const s=e.target;D.perm[s.dataset.r][s.dataset.m]=+s.value;log(`Phân quyền: ${s.dataset.r} – ${TT[s.dataset.m]} = ${s.options[s.selectedIndex].text}`);saveAll();toast('Đã cập nhật phân quyền')}}

/* ===== Báo cáo thống kê ===== */
let RF='2026-01-01',RT=TODAY,RG='month';
const GL={day:'ngày',week:'tuần',month:'tháng',quarter:'quý'};
const wk=d=>{const t=new Date(d);t.setHours(0,0,0,0);t.setDate(t.getDate()+3-(t.getDay()+6)%7);const y=t.getFullYear(),j=new Date(y,0,4);return y+'-T'+String(1+Math.round(((t-j)/864e5-3+(j.getDay()+6)%7)/7)).padStart(2,'0')};
const gk={day:d=>d,week:wk,month:d=>d.slice(0,7),quarter:d=>d.slice(0,4)+' Q'+(Math.floor((+d.slice(5,7)-1)/3)+1)};
function report(){const tb=$('#tb');if(!can('reports',1)){tb.innerHTML='<div class="empty">Bạn không có quyền xem báo cáo.</div>';return}
 const cost=can('cost',1),inR=d=>d>=RF&&d<=RT,inv=D.invoices.filter(i=>i.status!=='Đã hủy'&&inR(i.date)),canc=D.invoices.filter(i=>i.status==='Đã hủy'&&inR(i.date)).length;
 const rev=sum(inv,i=>i.total),dis=sum(inv,i=>i.discount||0),cg=sum(inv,i=>sum(i.lines,l=>l.qty*l.cogs)),ln=inv.flatMap(i=>i.lines.map(l=>({...l,cat:(P(l.sku)||{}).cat||'—',brand:(P(l.sku)||{}).brand||'—'})));
 const bars=(o,fmt,asc)=>{const all=Object.keys(o).sort((a,b)=>asc?a.localeCompare(b):o[b]-o[a]),ks=asc?all.slice(-8):all.slice(0,6),mx=Math.max(1,...ks.map(k=>o[k]));return ks.map(k=>`<div class="hb"><span title="${esc(k)}">${esc(k)}</span><i style="width:${o[k]/mx*100}%"></i><span>${fmt(o[k])}</span></div>`).join('')||'<div class="empty">Chưa có dữ liệu trong kỳ</div>'};
 const imps=D.imports.filter(i=>i.status==='Đã xác nhận'&&inR(i.date)),sold=new Set(ln.map(l=>l.sku)),slow=D.products.filter(p=>p.stock>0&&!sold.has(p.sku));
 const promo=Object.fromEntries(D.promos.map(p=>{const u=pUsed(p.code).filter(o=>inR(o.date));return[p.code,[u.length,sum(u,o=>o.discount)]]}).filter(x=>x[1][0]));
 const kp=(l,v)=>`<div class="kpi"><small>${l}</small><b>${v}</b></div>`,pan=(t,h)=>`<div class="pan"><h3>${t}</h3>${h}</div>`;
 tb.innerHTML=`<div class="bar"><label class="mu">Từ <input type="date" id="rf" value="${RF}" style="width:auto"></label><label class="mu">đến <input type="date" id="rt" value="${RT}" style="width:auto"></label><label class="mu">Xem theo <select id="rg" style="width:auto">${Object.entries(GL).map(([k,v])=>`<option value="${k}" ${k===RG?'selected':''}>${v}</option>`).join('')}</select></label><span class="sp"></span><button class="btn" id="xls">Xuất Excel</button><button class="btn" id="csv">Xuất CSV</button><button class="btn" id="pdf">In / lưu PDF</button></div>
 <div class="kpis">${kp('Doanh thu thuần',vnd(rev))}${cost?kp('Giá vốn hàng bán',vnd(cg))+kp('Lợi nhuận gộp',vnd(rev-cg)):''}${kp('Giảm giá đã áp dụng',vnd(dis))}${kp('Hóa đơn hiệu lực / đã hủy',inv.length+' / '+canc)}${cost?kp('Vòng quay tồn kho',(sum(D.products,p=>p.stock*p.avgCost)?(cg/sum(D.products,p=>p.stock*p.avgCost)).toFixed(2):'0')+' vòng'):''}</div>
 <div class="grid2">${pan('Doanh thu theo '+GL[RG],bars(grp(inv,i=>gk[RG](i.date),i=>i.total),vnd,1))}${cost?pan('Lợi nhuận gộp theo '+GL[RG],bars(grp(inv,i=>gk[RG](i.date),i=>i.total-sum(i.lines,l=>l.qty*l.cogs)),vnd,1)):''}${pan('Sản phẩm bán chạy (số lượng)',bars(grp(ln,l=>l.name,l=>l.qty),n=>n+' cái'))}${pan('Doanh số theo loại sản phẩm',bars(grp(ln,l=>l.cat,l=>l.qty*l.price),vnd))}${pan('Doanh số theo thương hiệu',bars(grp(ln,l=>l.brand,l=>l.qty*l.price),vnd))}${pan('Doanh số theo nhân viên',bars(grp(inv,i=>i.staff,i=>i.total),vnd))}${cost?pan('Giá trị nhập theo nhà cung cấp',bars(grp(imps,i=>i.sup,i=>i.total),vnd))+`<p class="mu">Giá trị tồn kho (theo giá vốn): <b>${vnd(sum(D.products,p=>p.stock*p.avgCost))}</b></p>`:''}${pan('Hiệu quả khuyến mãi',Object.keys(promo).length?bars(Object.fromEntries(Object.entries(promo).map(([k,v])=>[k,v[1]])),vnd)+`<p class="mu">Lượt dùng: ${Object.entries(promo).map(([k,v])=>k+' ('+v[0]+')').join(', ')}</p>`:'<div class="empty">Chưa có lượt dùng trong kỳ</div>')}${pan('Hàng tồn lâu (không bán được trong kỳ)',slow.length?slow.map(p=>`<div class="hb" style="grid-template-columns:1fr auto"><span>${esc(p.name)}</span><span>${p.stock} cái</span></div>`).join(''):'<div class="empty">Không có</div>')}</div>`;
 $('#rf').onchange=e=>{RF=e.target.value||RF;report()};$('#rt').onchange=e=>{RT=e.target.value||RT;report()};
 $('#rg').onchange=e=>{RG=e.target.value;report()};
 const rows=[['Mã hóa đơn','Ngày','Khách hàng','Nhân viên','Giảm giá','Doanh thu',...(cost?['Giá vốn','Lợi nhuận']:[])],...inv.map(i=>{const c=sum(i.lines,l=>l.qty*l.cogs);return[i.code,i.date,i.cust,i.staff,i.discount||0,i.total,...(cost?[c,i.total-c]:[])]})];
 const dl=(n,t,c,l)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([c],{type:t}));a.download=n;a.click();log(`Xuất báo cáo ${l} (${RF} → ${RT})`);saveAll();toast('Đã xuất báo cáo '+l)};
 $('#csv').onclick=()=>dl(`bao-cao-${RF}_${RT}.csv`,'text/csv','\ufeff'+rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n'),'CSV');
 $('#xls').onclick=()=>dl(`bao-cao-${RF}_${RT}.xls`,'application/vnd.ms-excel','\ufeff<table border="1">'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</table>','Excel');
 $('#pdf').onclick=()=>{log(`Xuất báo cáo PDF ${RF} → ${RT}`);saveAll();window.print()}}

$('#rs').onclick=()=>{[...Object.keys(SEED()),'serials'].forEach(k=>{try{localStorage.removeItem(PX+k)}catch(e){}});loadAll();toast('Đã nạp lại dữ liệu mẫu');render()};
try{if(!sessionStorage.getItem('v0c_s')){sessionStorage.setItem('v0c_s',1);log('Đăng nhập trang '+(IS_ADMIN?'quản trị':'quản lý'),'Đăng nhập');saveAll()}}catch(e){}
render();
