/* app1.js - toàn bộ xử lý của cửa hàng linh kiện PC */
/* TOÀN BỘ CHƯƠNG TRÌNH nằm trong một hàm tự chạy (IIFE) để các biến không lọt ra ngoài trang.
   'use strict' bật chế độ chặt chẽ, báo lỗi sớm khi viết sai.
   Trình tự: (1) hàm tiện ích -> (2) dữ liệu mẫu -> (3) hàm vẽ giao diện -> (4) ngăn kéo/hộp thoại -> (5) mục 3.2 -> (6) lắng nghe sự kiện -> (7) chạy lần đầu. */
(function(){
'use strict';
/* DAY = số mili giây của 1 ngày. NOW = thời điểm mở trang, dùng để tính ngày tồn kho và hạn bảo hành. */
var DAY=86400000, NOW=new Date();
/* daysAgo(n): trả về ngày cách đây n ngày (dùng để tạo dữ liệu mẫu có ngày hợp lý). */
function daysAgo(n){return new Date(NOW.getTime()-n*DAY)}
/* pad(n): thêm số 0 phía trước cho đủ 2 chữ số (5 -> "05"). */
function pad(n){return String(n).padStart(2,'0')}
/* fmtDate(d): định dạng ngày kiểu Việt Nam dd/mm/yyyy. */
function fmtDate(d){d=new Date(d);return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()}
/* fmtTime(d): ngày + giờ phút, dùng trong nhật ký điều chỉnh tồn. */
function fmtTime(d){d=new Date(d);return fmtDate(d)+' '+pad(d.getHours())+':'+pad(d.getMinutes())}
/* money(n): hiển thị tiền kiểu Việt Nam, ví dụ 4590000 -> "4.590.000 đ". */
function money(n){return new Intl.NumberFormat('vi-VN').format(Math.round(n))+' đ'}
/* esc(s): chuyển ký tự đặc biệt (<, >, &, ") thành mã an toàn trước khi chèn vào HTML. Mọi dữ liệu người dùng nhập đều phải qua hàm này để tránh lỗi hiển thị và chèn mã độc. */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
/* $(id): viết tắt của document.getElementById. */
function $(id){return document.getElementById(id)}

/* ===== DỮ LIỆU 3.2 =====
   CATS: cây loại (mảng phẳng). BRANDS: danh sách thương hiệu. nextCat/nextBrand: id cấp cho mục mới.
   Dữ liệu chỉ nằm trong bộ nhớ trang, tải lại sẽ về dữ liệu mẫu bên dưới. */
var CATS=[],BRANDS=[],nextCat=100,nextBrand=100;
(function(){
 function mk(id,code,name,parent,desc,specs){CATS.push({id:id,code:code,name:name,parent:parent,desc:desc,active:true,specs:specs})}
 mk(1,'CPU','CPU',null,'Bộ vi xử lý trung tâm',['Socket','Số nhân / luồng','Xung nhịp']);
 mk(2,'MAIN','Bo mạch chủ',null,'Mainboard các chuẩn kích thước',['Socket','Chipset','Loại RAM hỗ trợ','Kích thước']);
 mk(3,'RAM','RAM',null,'Bộ nhớ trong cho PC',['Dung lượng','Tốc độ (Bus)','Chuẩn RAM']);
 mk(4,'DRIVE','Ổ cứng',null,'Nhóm lưu trữ: SSD và HDD',['Dung lượng','Chuẩn kết nối']);
 mk(5,'SSD','Ổ cứng SSD',4,'Ổ thể rắn SATA và NVMe',['Tốc độ đọc']);
 mk(6,'HDD','Ổ cứng HDD',4,'Ổ cứng cơ học',['Tốc độ quay']);
 mk(7,'VGA','Card đồ họa (VGA)',null,'Card màn hình rời',['Bộ nhớ','Chuẩn kết nối','Nguồn khuyến nghị']);
 mk(8,'PSU','Nguồn máy tính',null,'Bộ nguồn ATX',['Công suất','Chuẩn hiệu suất','Kiểu dây']);
 mk(9,'CASE','Vỏ case',null,'Thùng máy các cỡ',['Kích thước','Hỗ trợ mainboard','Số quạt kèm theo']);
 mk(10,'COOL','Tản nhiệt',null,'Tản khí và tản nước',['Loại tản','Socket hỗ trợ','Chiều cao']);
 mk(11,'LCD','Màn hình',null,'Màn hình máy tính',['Kích thước','Độ phân giải','Tần số quét']);
 mk(12,'ACC','Phụ kiện',null,'Phụ kiện và thiết bị ngoại vi',['Chuẩn kết nối','Chiều dài']);
 mk(13,'MOUSE','Chuột',12,'Chuột có dây và không dây',[]);
 mk(14,'CABLE','Cáp - Dây nối',12,'Cáp dữ liệu, cáp nguồn',[]);
 ['Intel','AMD','Nvidia','ASUS','MSI','Gigabyte','Kingston','Corsair','Samsung','Western Digital','Deepcool','NZXT','LG','Logitech','Ugreen'].forEach(function(n,i){BRANDS.push({id:i+1,name:n})});
})();
/* STATUSES: 3 trạng thái người dùng được đặt tay. Trạng thái 'Hết hàng' không nằm ở đây vì tự suy ra khi tồn kho bằng 0 (xem hàm eff). */
var STATUSES=['Đang kinh doanh','Tạm ngừng bán','Ngừng kinh doanh'];

/* P(...): hàm dựng một sản phẩm mẫu. Mỗi sản phẩm có: id, tên, SKU, mã vạch, loại, hãng, giá bán, bảo hành (tháng), thông số [[tên, giá trị]], serial (có quản lý theo Serial không), min (mức cảnh báo tồn), stock (tồn), status, hasData (đã có giao dịch chưa; nếu có thì không được xóa) và hist (lịch sử đổi giá). */
function P(id,name,sku,bar,type,brand,price,warranty,specs,serial,min,stock,status,hasData){
  return {id:id,name:name,sku:sku,barcode:bar,type:type,brand:brand,price:price,img:'',warranty:warranty,specs:specs,serial:serial,min:min,stock:stock,status:status||'Đang kinh doanh',hasData:hasData!==false,
    hist:hasData===false?[]:[{d:daysAgo(60+id*7).getTime(),from:Math.round(price*1.04/1000)*1000,to:price}]};
}
/* DANH SÁCH SẢN PHẨM MẪU. Đây là "cơ sở dữ liệu" tạm trong bộ nhớ; tải lại trang sẽ trở về dữ liệu này. */
var products=[
 P(1,'Intel Core i5-14400F','CPU-I514400F','8935001200011','CPU','Intel',4590000,36,[['Socket','LGA1700'],['Số nhân / luồng','10 nhân / 16 luồng'],['Xung nhịp','Tối đa 4.7 GHz']],true,5,12),
 P(2,'AMD Ryzen 5 7600X','CPU-R57600X','8935001200028','CPU','AMD',5890000,36,[['Socket','AM5'],['Số nhân / luồng','6 nhân / 12 luồng'],['Xung nhịp','Tối đa 5.3 GHz']],true,5,3),
 P(3,'ASUS PRIME B760M-A WIFI D4','MB-B760MA-D4','8935001200035','Bo mạch chủ','ASUS',3290000,36,[['Socket','LGA1700'],['Chipset','B760'],['Loại RAM hỗ trợ','DDR4'],['Kích thước','Micro-ATX']],true,4,8),
 P(4,'Kingston Fury Beast 16GB DDR4 3200','RAM-KF16-3200','8935001200042','RAM','Kingston',790000,36,[['Dung lượng','16GB (1 thanh)'],['Tốc độ (Bus)','3200 MHz'],['Chuẩn RAM','DDR4']],false,15,40),
 P(5,'Samsung 980 PRO 1TB NVMe','SSD-980P-1T','8935001200059','Ổ cứng SSD','Samsung',2690000,60,[['Dung lượng','1TB'],['Chuẩn kết nối','M.2 NVMe PCIe 4.0'],['Tốc độ đọc','7000 MB/s']],true,5,6),
 P(6,'Western Digital Blue 2TB','HDD-WDB-2T','8935001200066','Ổ cứng HDD','Western Digital',1490000,24,[['Dung lượng','2TB'],['Chuẩn kết nối','SATA III'],['Tốc độ quay','5400 vòng/phút']],true,4,0),
 P(7,'MSI GeForce RTX 4060 Ventus 2X 8GB','VGA-4060-V2X','8935001200073','Card đồ họa (VGA)','MSI',8990000,36,[['Bộ nhớ','8GB GDDR6'],['Chuẩn kết nối','PCIe 4.0 x8'],['Nguồn khuyến nghị','550W']],true,3,4),
 P(8,'Corsair RM750e 750W 80 Plus Gold','PSU-RM750E','8935001200080','Nguồn máy tính','Corsair',2590000,84,[['Công suất','750W'],['Chuẩn hiệu suất','80 Plus Gold'],['Kiểu dây','Full modular']],true,4,9),
 P(9,'Deepcool AK400 tản nhiệt khí','FAN-AK400','8935001200097','Tản nhiệt','Deepcool',450000,12,[['Loại tản','Tản khí 1 tháp'],['Socket hỗ trợ','LGA1700, AM5, AM4'],['Chiều cao','155 mm']],false,10,22),
 P(10,'NZXT H5 Flow','CASE-H5FLOW','8935001200103','Vỏ case','NZXT',1890000,12,[['Kích thước','Mid Tower'],['Hỗ trợ mainboard','ATX, Micro-ATX, Mini-ITX'],['Số quạt kèm theo','2 quạt 120mm']],false,3,7),
 P(11,'LG UltraGear 24GN600 24 inch 144Hz','LCD-LG24GN600','8935001200110','Màn hình','LG',3490000,24,[['Kích thước','24 inch'],['Độ phân giải','Full HD 1920x1080'],['Tần số quét','144 Hz']],true,3,5),
 P(12,'Chuột Logitech G102','ACC-LG-G102','8935001200127','Chuột','Logitech',390000,12,[['Chuẩn kết nối','USB có dây'],['Chiều dài','1.8 m']],true,10,30,'Tạm ngừng bán'),
 P(13,'Intel Core i7-12700K','CPU-I712700K','8935001200134','CPU','Intel',7290000,36,[['Socket','LGA1700'],['Số nhân / luồng','12 nhân / 20 luồng']],true,0,2,'Ngừng kinh doanh'),
 P(14,'Cáp SATA 3 dài 50cm','ACC-SATA-50','8935001200141','Cáp - Dây nối','Ugreen',35000,3,[['Chuẩn kết nối','SATA III'],['Chiều dài','50 cm']],false,20,0,'Đang kinh doanh',false)
];
var nextId=100;
/* Đổi sản phẩm mẫu từ "tên loại" sang "id loại" để sau này đổi tên loại không làm hỏng liên kết. */
products.forEach(function(p){p.cat=CATS.filter(function(c){return c.name===p.type})[0].id;delete p.type});

/* Nhà cung cấp và khách hàng mẫu, dùng để tạo dữ liệu Serial giả. */
var suppliers=['Nhà phân phối Việt Tiến','Công ty Thành Đạt','Nhà phân phối Minh Long'];
var customers=['Nguyễn Văn An','Trần Thị Bích','Lê Hoàng Nam','Phạm Quốc Huy','Võ Thị Lan','Đặng Minh Tuấn'];
/* SERIAL MẪU: vòng lặp bên dưới sinh số Serial cho mọi sản phẩm có bật quản lý Serial. Số đã bán có hóa đơn, ngày bán, khách hàng; số còn trong kho thì không. Dùng cho tab Tra cứu Serial. */
var serials=[];
(function(){
  var n=0, soldAgo=[15,120,400];
  products.forEach(function(p){
    if(!p.serial) return;
    var prefix=p.brand.replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase();
    var sold=p.hasData?3:0, total=p.stock+sold;
    for(var i=0;i<total;i++){
      n++;
      var isSold=i>=p.stock, sa=isSold?soldAgo[i-p.stock]:0;
      var ra=isSold?sa+20+(n%30):5+((n*11)%60);
      serials.push({sn:prefix+'-'+String(260000+n*7919).padStart(8,'0'),pid:p.id,
        receipt:'PN-'+String(1040+((n*7)%40)).padStart(4,'0'),receiptDate:daysAgo(ra).getTime(),supplier:suppliers[n%3],
        invoice:isSold?'HD-'+String(2000+n*3):null,soldDate:isSold?daysAgo(sa).getTime():null,customer:isSold?customers[n%customers.length]:null});
    }
  });
})();
/* NHẬT KÝ ĐIỀU CHỈNH TỒN KHO mẫu: thời gian, sản phẩm, tồn cũ -> mới, lý do, người làm. */
var adjustLog=[
 {t:daysAgo(3).getTime(),pid:5,from:7,to:6,reason:'Kiểm kê cuối tuần: thiếu 1 ổ, đã đối chiếu với hóa đơn',by:'Quản lý kho'},
 {t:daysAgo(9).getTime(),pid:4,from:38,to:40,reason:'Nhập sai số lượng trên phiếu nhập, đếm lại thực tế được 40',by:'Quản lý kho'}
];

/* S = trạng thái bộ lọc và tab của màn hình Sản phẩm: tab đang mở, từ khóa (q), loại (type, lưu id), hãng, tình trạng, khoảng giá (min/max). */
var S={tab:'products',q:'',type:'',brand:'',status:'',min:'',max:''};

/* TÌNH TRẠNG SẢN PHẨM: quy đổi dữ liệu thành nhãn hiển thị và các điều kiện cảnh báo. */
/* eff(p): tình trạng HIỂN THỊ. Ngừng kinh doanh / Tạm ngừng bán giữ nguyên; còn lại, tồn = 0 thì là 'Hết hàng', ngược lại 'Đang kinh doanh'. */
function eff(p){
  if(p.status==='Ngừng kinh doanh') return 'Ngừng kinh doanh';
  if(p.status==='Tạm ngừng bán') return 'Tạm ngừng bán';
  return p.stock===0?'Hết hàng':'Đang kinh doanh';
}
/* isLow(p): sản phẩm đang bán, còn hàng nhưng tồn đã chạm hoặc thấp hơn mức cảnh báo -> hiện nhãn "Sắp hết". */
function isLow(p){return p.status==='Đang kinh doanh'&&p.stock>0&&p.min>0&&p.stock<=p.min}
/* needsOrder(p): giống isLow nhưng tính cả khi hết hẳn (tồn = 0). Dùng cho khung "Cần nhập thêm hàng" và số đỏ trên tab Tồn kho. */
function needsOrder(p){return p.status==='Đang kinh doanh'&&p.min>0&&p.stock<=p.min}
/* pillFor(p): tạo nhãn màu cho tình trạng (xanh/vàng/đỏ/xám). */
function pillFor(p){
  var e=eff(p),c={'Đang kinh doanh':'ok','Tạm ngừng bán':'warn','Ngừng kinh doanh':'off','Hết hàng':'bad'}[e];
  return '<span class="pill '+c+'">'+e+'</span>';
}
/* byId(id): tìm sản phẩm theo id. */
function byId(id){return products.filter(function(p){return p.id===id})[0]}

/* LỌC VÀ VẼ DANH SÁCH SẢN PHẨM. */
/* matches(p): sản phẩm p có khớp mọi bộ lọc không. Từ khóa tách thành nhiều từ và phải khớp TẤT CẢ (tìm trong tên, SKU, mã vạch, hãng, đường dẫn loại, thông số). Lọc loại tính cả loại con (subIds). Lọc giá theo khoảng. Lọc tình trạng có thêm mục "Sắp hết hàng". */
function matches(p){
  var q=S.q.trim().toLowerCase();
  if(q){
    var hay=[p.name,p.sku,p.barcode,p.brand,catPath(p.cat)].concat(p.specs.map(function(s){return s[0]+' '+s[1]})).join(' ').toLowerCase();
    if(!q.split(/\s+/).every(function(w){return hay.indexOf(w)>-1})) return false;
  }
  if(S.type&&subIds(Number(S.type)).indexOf(p.cat)<0) return false;
  if(S.brand&&p.brand!==S.brand) return false;
  if(S.min!==''&&p.price<Number(S.min)) return false;
  if(S.max!==''&&p.price>Number(S.max)) return false;
  if(S.status){
    if(S.status==='Sắp hết hàng'){ if(!isLow(p)) return false; }
    else if(eff(p)!==S.status) return false;
  }
  return true;
}

/* renderFilters(): đổ lại các ô chọn Loại (có thụt lề theo cây), Hãng (từ danh sách thương hiệu), Tình trạng, và giữ giá trị đang chọn. */
function renderFilters(){
  var brands=bnames();
  $('ftype').innerHTML='<option value="">Tất cả loại</option>'+catOptions(Number(S.type)||null,false);
  $('fbrand').innerHTML='<option value="">Tất cả thương hiệu</option>'+brands.map(function(b){return '<option'+(S.brand===b?' selected':'')+'>'+esc(b)+'</option>'}).join('');
  var st=['Đang kinh doanh','Sắp hết hàng','Hết hàng','Tạm ngừng bán','Ngừng kinh doanh'];
  $('fstatus').innerHTML='<option value="">Tất cả tình trạng</option>'+st.map(function(t){return '<option'+(S.status===t?' selected':'')+'>'+t+'</option>'}).join('');
}
/* renderStats(): vẽ 4 ô thống kê nhanh và cập nhật số đỏ trên tab Tồn kho. */
function renderStats(){
  var all=products.length;
  var sell=products.filter(function(p){return eff(p)==='Đang kinh doanh'}).length;
  var low=products.filter(isLow).length;
  var out=products.filter(function(p){return eff(p)==='Hết hàng'}).length;
  var items=[['','Tất cả',all,''],['Đang kinh doanh','Đang bán',sell,''],['Sắp hết hàng','Sắp hết hàng',low,'warn'],['Hết hàng','Hết hàng',out,'bad']];
  $('stats').innerHTML=items.map(function(i){
    return '<button class="stat '+i[3]+'" data-stat="'+esc(i[0])+'" aria-pressed="'+(S.status===i[0])+'"><b>'+i[2]+'</b><span>'+i[1]+'</span></button>';
  }).join('');
  var n=products.filter(needsOrder).length;
  var el=$('tabAlertN'); el.hidden=!n; el.textContent=n;
}

/* renderList(): vẽ bảng sản phẩm theo bộ lọc hiện tại. Mỗi dòng có data-id để các nút Sửa / Ngừng KD / Bán lại biết sản phẩm nào. Chưa có kết quả thì báo "Không tìm thấy". */
function renderList(){
  var rows=products.filter(matches);
  $('count').textContent='Hiển thị '+rows.length+' / '+products.length+' sản phẩm';
  if(!rows.length){ $('list').innerHTML='<div class="empty">Không tìm thấy sản phẩm nào. Thử bỏ bớt bộ lọc hoặc gõ từ khóa khác.</div>'; return; }
  var head='<div class="row head"><div>Sản phẩm</div><div>Loại / Hãng</div><div>Giá bán</div><div>Tồn kho</div><div>Bảo hành</div><div>Trạng thái</div><div style="min-width:130px"></div></div>';
  $('list').innerHTML=head+rows.map(function(p){
    var e=eff(p), stopped=p.status==='Ngừng kinh doanh';
    var thumb=p.img?'<img src="'+p.img+'" alt="">':esc(abbrC(p.cat));
    var spec=p.specs.slice(0,2).map(function(s){return esc(s[1])}).join(' · ');
    return '<div class="row'+(stopped?' off':'')+'" data-id="'+p.id+'">'+
      '<div class="cell cname"><div class="thumb">'+thumb+'</div><div class="nm"><b>'+esc(p.name)+(p.serial?'<span class="tag">Serial</span>':'')+'</b><span class="mono">'+esc(p.sku)+' · '+esc(p.barcode)+'</span><span class="specs">'+spec+'</span></div></div>'+
      '<div class="cell"><span class="l">Loại / Hãng</span>'+'<span title="'+esc(catPath(p.cat))+'">'+esc(cname(p))+'</span><div class="muted">'+esc(p.brand)+'</div></div>'+
      '<div class="cell price"><span class="l">Giá bán</span>'+money(p.price)+'</div>'+
      '<div class="cell"><span class="l">Tồn kho</span><span class="num"><b>'+p.stock+'</b></span>'+(isLow(p)?' <span class="pill warn" style="margin-left:4px">Sắp hết</span>':'')+'</div>'+
      '<div class="cell"><span class="l">Bảo hành</span>'+p.warranty+' tháng</div>'+
      '<div class="cell"><span class="l">Trạng thái</span>'+pillFor(p)+'</div>'+
      '<div class="cell cact"><button class="btn sm" data-act="edit">Sửa</button>'+(stopped?'<button class="btn sm" data-act="reopen">Bán lại</button>':'<button class="btn sm danger" data-act="stop">Ngừng KD</button>')+'</div>'+
    '</div>';
  }).join('');
}

/* TAB TỒN KHO. */
/* renderStock(): vẽ 3 phần: (1) khung cảnh báo cần nhập hàng, (2) bảng tồn kèm thanh mức tồn (đỏ khi hết, vàng khi chạm ngưỡng), (3) nhật ký điều chỉnh mới nhất lên trước. Sản phẩm ngừng kinh doanh mà hết hàng thì không hiện. */
function renderStock(){
  var need=products.filter(needsOrder).sort(function(a,b){return a.stock-b.stock});
  var al=$('alerts');
  if(need.length){
    al.innerHTML='<div class="alerts"><h3>Cần nhập thêm hàng: '+need.length+' sản phẩm đang chạm hoặc dưới mức tồn tối thiểu</h3><div class="chips">'+
      need.map(function(p){return '<button class="chip" data-adj="'+p.id+'">'+esc(p.name)+' · còn '+p.stock+'/'+p.min+'</button>'}).join('')+'</div></div>';
  } else al.innerHTML='<div class="alerts none"><h3>Tồn kho ổn, chưa có sản phẩm nào dưới mức tối thiểu</h3></div>';
  var head='<div class="srow head"><div>Sản phẩm</div><div>Tồn hiện tại</div><div>Mức tối thiểu</div><div>Mức tồn</div><div style="min-width:110px"></div></div>';
  var rows=products.filter(function(p){return p.status!=='Ngừng kinh doanh'||p.stock>0}).map(function(p){
    var cls=p.stock===0&&p.status==='Đang kinh doanh'?'bad':(isLow(p)?'warn':'');
    var ref=Math.max(p.min*2,p.stock,1), pct=Math.min(100,Math.round(p.stock/ref*100));
    var label=p.min>0?(p.stock===0?'Đã hết hàng':(p.stock<=p.min?'Chạm ngưỡng cảnh báo':'Còn đủ hàng')):'Chưa đặt ngưỡng cảnh báo';
    var thumb=p.img?'<img src="'+p.img+'" alt="">':esc(abbrC(p.cat));
    return '<div class="srow" data-id="'+p.id+'">'+
      '<div class="cell cname"><div class="thumb">'+thumb+'</div><div class="nm"><b>'+esc(p.name)+'</b><span class="mono">'+esc(p.sku)+'</span></div></div>'+
      '<div class="cell"><span class="l">Tồn hiện tại</span><span class="num"><b>'+p.stock+'</b></span></div>'+
      '<div class="cell"><span class="l">Mức tối thiểu</span><span class="num">'+(p.min||'–')+'</span></div>'+
      '<div class="cell barwrap"><div class="bar '+cls+'"><i style="width:'+pct+'%"></i></div><small>'+label+'</small></div>'+
      '<div class="cell cact"><button class="btn sm" data-adj="'+p.id+'">Kiểm kê / Điều chỉnh</button></div></div>';
  }).join('');
  $('stocklist').innerHTML=head+rows;
  var lg=adjustLog.slice().sort(function(a,b){return b.t-a.t});
  $('log').innerHTML=lg.length?lg.map(function(l){
    var p=byId(l.pid), d=l.to-l.from;
    return '<div class="logrow"><div class="mono muted">'+fmtTime(l.t)+'</div><div><b>'+esc(p?p.name:'(đã xóa)')+'</b><div class="muted">'+esc(l.by)+'</div></div>'+
      '<div class="diff '+(d>0?'up':'down')+'">'+l.from+' → '+l.to+' ('+(d>0?'+':'')+d+')</div><div>'+esc(l.reason)+'</div></div>';
  }).join(''):'<div class="empty">Chưa có lần điều chỉnh nào.</div>';
}

/* TAB TRA CỨU SERIAL. */
/* addMonths(ts,m): cộng m tháng vào một ngày, dùng tính ngày hết bảo hành. */
function addMonths(ts,m){var d=new Date(ts);d.setMonth(d.getMonth()+m);return d}
/* renderSamples(): tạo 3 nút Serial mẫu (đã bán, còn trong kho, hết bảo hành) để thử nhanh. */
function renderSamples(){
  var picks=[];
  var s1=serials.filter(function(s){return s.pid===1&&s.invoice})[0];
  var s2=serials.filter(function(s){return s.pid===5&&!s.invoice})[0];
  var s3=serials.filter(function(s){return s.pid===12&&s.invoice}).slice(-1)[0];
  [s1,s2,s3].forEach(function(s){if(s)picks.push(s)});
  $('snSamples').innerHTML=picks.map(function(s){return '<button class="chip mono" data-sn="'+esc(s.sn)+'">'+esc(s.sn)+'</button>'}).join('');
}
/* lookupSerial(): tra Serial người dùng nhập. Không thấy thì gợi ý các Serial gần giống. Thấy thì hiện: trạng thái (đã bán / trong kho), phiếu nhập + nhà cung cấp, hóa đơn + khách hàng, và bảo hành. Bảo hành tính từ NGÀY BÁN cộng số tháng của sản phẩm; chưa bán thì chưa kích hoạt bảo hành. */
function lookupSerial(){
  var q=$('sn').value.trim().toUpperCase(), out=$('snResult');
  if(!q){out.innerHTML='';return}
  var s=serials.filter(function(x){return x.sn.toUpperCase()===q})[0];
  if(!s){
    var near=serials.filter(function(x){return x.sn.toUpperCase().indexOf(q)>-1}).slice(0,6);
    out.innerHTML='<div class="result"><div class="notfound"><b>Không tìm thấy Serial "'+esc(q)+'"</b><span class="muted">Kiểm tra lại số Serial in trên tem sản phẩm. Chỉ sản phẩm được đánh dấu quản lý theo Serial mới có số Serial trong hệ thống.</span>'+
      (near.length?'<div class="lbl">Có phải bạn muốn tìm:</div><div class="chips">'+near.map(function(x){return '<button class="chip mono" data-sn="'+esc(x.sn)+'">'+esc(x.sn)+'</button>'}).join('')+'</div>':'')+'</div></div>';
    return;
  }
  var p=byId(s.pid), wm=p?p.warranty:0, sold=!!s.invoice, warr='';
  if(sold){
    var end=addMonths(s.soldDate,wm), left=Math.ceil((end.getTime()-NOW.getTime())/DAY), total=Math.max(1,Math.round((end.getTime()-s.soldDate)/DAY));
    var used=Math.min(100,Math.max(0,Math.round((total-left)/total*100)));
    var okw=left>0, cls=okw?(left<=60?'warn':''):'bad';
    var txt=okw?('Còn bảo hành '+left+' ngày (khoảng '+Math.floor(left/30)+' tháng '+(left%30)+' ngày)'):('Đã hết bảo hành '+Math.abs(left)+' ngày trước');
    warr='<div class="warr"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>'+txt+'</b><span class="muted">Bảo hành '+wm+' tháng · từ '+fmtDate(s.soldDate)+' đến '+fmtDate(end)+'</span></div><div class="bar '+cls+'"><i style="width:'+used+'%"></i></div></div>';
  } else {
    warr='<div class="warr"><b>Chưa kích hoạt bảo hành</b><span class="muted">Hàng đang nằm trong kho. Thời gian bảo hành '+wm+' tháng sẽ tính từ ngày bán trên hóa đơn.</span></div>';
  }
  out.innerHTML='<div class="result"><div class="hd"><div><div class="sn">'+esc(s.sn)+'</div><div class="muted">'+esc(p?p.name:'')+'</div></div>'+
    '<span class="pill '+(sold?'off':'ok')+'" style="margin-left:auto">'+(sold?'Đã bán':'Đang trong kho')+'</span></div>'+
    '<div class="steps">'+
    '<div class="step"><h4>Nhập kho</h4><div class="big mono">'+esc(s.receipt)+'</div><dl><dt>Ngày nhập</dt><dd>'+fmtDate(s.receiptDate)+'</dd><dt>Nhà cung cấp</dt><dd>'+esc(s.supplier)+'</dd></dl></div>'+
    '<div class="step"><h4>Bán hàng</h4>'+(sold?'<div class="big mono">'+esc(s.invoice)+'</div><dl><dt>Ngày bán</dt><dd>'+fmtDate(s.soldDate)+'</dd><dt>Khách hàng</dt><dd>'+esc(s.customer)+'</dd></dl>':'<div class="big muted">Chưa bán</div><span class="muted">Chưa có hóa đơn nào gắn với số Serial này.</span>')+'</div>'+
    '</div>'+warr+'</div>';
}

/* NGĂN KÉO THÊM / SỬA SẢN PHẨM. */
/* EDIT = bản nháp sản phẩm đang sửa trong ngăn kéo: id (rỗng nếu thêm mới), ảnh, danh sách thông số, nS (số dòng thông số cố định theo loại). null nghĩa là ngăn kéo đang đóng. */
var EDIT=null;
/* openDrawer(id): mở ngăn kéo. Có id = sửa sản phẩm đó (nạp dữ liệu cũ); không có id = thêm mới với giá trị mặc định (loại id 1, bảo hành 36 tháng). Ngăn kéo gồm 4 nhóm: thông tin chung, giá và bảo hành, thông số kỹ thuật, kho và trạng thái. Giá nhập KHÔNG nhập ở đây (ghi theo phiếu nhập). Sản phẩm đã có giao dịch thì không có nút Xóa. */
function openDrawer(id){
  var p=id?byId(id):null;
  EDIT={id:id||null,img:p?p.img:'',specs:p?p.specs.map(function(s){return s.slice()}):[]};
  var d=p||{name:'',sku:'',barcode:'',cat:1,brand:'',price:'',warranty:36,serial:true,min:0,stock:0,status:'Đang kinh doanh',hasData:false,hist:[]};
  var h='<div class="scrim" id="scrim"><form class="drawer" id="pform" novalidate role="dialog" aria-modal="true" aria-labelledby="dttl">'+
   '<div class="dhead"><h3 id="dttl">'+(p?'Sửa sản phẩm':'Thêm sản phẩm mới')+'</h3><button type="button" class="btn sm" data-close>Đóng</button></div>'+
   '<div class="dbody"><div id="ferr"></div>'+
   '<fieldset><legend>Thông tin chung</legend>'+
    '<div class="field"><label for="f_name">Tên sản phẩm *</label><input class="inp" id="f_name" value="'+esc(d.name)+'" placeholder="Vd: Intel Core i5-14400F"></div>'+
    '<div class="g2"><div class="field"><label for="f_sku">Mã SKU *</label><input class="inp mono" id="f_sku" value="'+esc(d.sku)+'" placeholder="CPU-I514400F"></div>'+
    '<div class="field"><label for="f_bar">Mã vạch</label><input class="inp mono" id="f_bar" inputmode="numeric" value="'+esc(d.barcode)+'" placeholder="Quét hoặc nhập mã vạch"></div></div>'+
    '<div class="g2"><div class="field"><label for="f_type">Loại sản phẩm *</label><select id="f_type">'+catOptions(d.cat,true)+'</select></div>'+
    '<div class="field"><label for="f_brand">Thương hiệu *</label><select id="f_brand"><option value="">Chọn thương hiệu</option>'+bnames().map(function(b){return '<option'+(d.brand===b?' selected':'')+'>'+esc(b)+'</option>'}).join('')+'</select></div></div>'+
    '<div class="field"><span class="lbl">Hình ảnh</span><div class="imgbox"><div class="thumb" id="f_thumb"></div><div><input type="file" id="f_img" accept="image/*" aria-label="Chọn hình ảnh"> <button type="button" class="btn sm ghost" id="f_imgx">Bỏ ảnh</button></div></div></div>'+
   '</fieldset>'+
   '<fieldset><legend>Giá bán và bảo hành</legend>'+
    '<div class="g2"><div class="field"><label for="f_price">Giá bán niêm yết (đồng) *</label><input class="inp" id="f_price" type="number" min="0" step="1000" value="'+esc(d.price)+'"></div>'+
    '<div class="field"><label for="f_war">Bảo hành (tháng)</label><input class="inp" id="f_war" type="number" min="0" value="'+esc(d.warranty)+'"></div></div>'+
    '<div class="note">Giá nhập không nhập ở đây. Giá nhập được ghi theo từng phiếu nhập hàng và dùng để tính giá vốn.</div>'+
    (p&&p.hist.length?'<div><div class="lbl" style="margin-bottom:6px">Lịch sử đổi giá bán</div><div class="hist">'+p.hist.slice().sort(function(a,b){return b.d-a.d}).map(function(h){return '<div><span class="muted">'+fmtDate(h.d)+'</span><span class="num">'+money(h.from)+' → <b>'+money(h.to)+'</b></span></div>'}).join('')+'</div></div>':'')+
   '</fieldset>'+
   '<fieldset><legend>Thông số kỹ thuật</legend><div class="hint">Các trường bên dưới lấy theo loại sản phẩm đã chọn (định nghĩa ở mục Loại sản phẩm). Bạn vẫn có thể thêm thông số riêng cho sản phẩm này.</div><div id="specs" style="display:grid;gap:8px"></div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn sm" id="specAdd">+ Thêm thông số</button></div></fieldset>'+
   '<fieldset><legend>Kho và trạng thái</legend>'+
    '<label class="check"><input type="checkbox" id="f_serial"'+(d.serial?' checked':'')+'><span><b>Quản lý theo số Serial</b><br><span class="hint">Bật cho hàng có tem Serial (CPU, VGA, SSD, màn hình...). Mỗi chiếc sẽ được theo dõi từ lúc nhập đến lúc bảo hành.</span></span></label>'+
    '<div class="g2"><div class="field"><label for="f_min">Cảnh báo khi tồn còn từ (cái)</label><input class="inp" id="f_min" type="number" min="0" value="'+esc(d.min)+'"><span class="hint">Để 0 nếu không cần cảnh báo.</span></div>'+
    '<div class="field"><label for="f_status">Trạng thái</label><select id="f_status">'+STATUSES.map(function(s){return '<option'+(d.status===s?' selected':'')+'>'+s+'</option>'}).join('')+'</select><span class="hint">"Hết hàng" tự hiện khi tồn kho bằng 0.</span></div></div>'+
    (p?'<div class="note">Tồn kho hiện tại: <b>'+p.stock+'</b>. Số này tự thay đổi khi nhập hàng hoặc bán hàng. Nếu kiểm kê bị lệch, dùng mục "Tồn kho" để điều chỉnh.</div>':'')+
   '</fieldset></div>'+
   '<div class="dfoot">'+(p?(p.hasData?'<span class="hint">Sản phẩm đã có giao dịch nên không thể xóa, chỉ có thể ngừng kinh doanh.</span>':'<button type="button" class="btn danger" id="btnDel">Xóa sản phẩm</button>'):'')+'<span class="sp"></span><button type="button" class="btn" data-close>Hủy</button><button type="submit" class="btn primary">'+(p?'Lưu thay đổi':'Thêm sản phẩm')+'</button></div>'+
   '</form></div>';
  $('drawerHost').innerHTML=h;
  document.body.style.overflow='hidden';
  syncSpecs(Number($('f_type').value)); drawThumb(); drawSpecs();
  $('f_name').focus();
}
/* closeDrawer(): đóng ngăn kéo, trả cuộn trang và bỏ bản nháp. */
function closeDrawer(){$('drawerHost').innerHTML='';document.body.style.overflow='';EDIT=null}
/* drawThumb(): vẽ ô xem trước ảnh trong ngăn kéo (không có ảnh thì hiện mã viết tắt của loại). */
function drawThumb(){
  var t=$('f_thumb'); if(!t) return;
  t.innerHTML=EDIT.img?'<img src="'+EDIT.img+'" alt="">':esc(abbrC(Number($('f_type').value)));
}
/* syncSpecs(cid): làm cho các dòng thông số trong biểu mẫu khớp với loại cid.
   Bước 1: lấy danh sách thông số của loại (allSpecs) làm các dòng cố định (EDIT.nS = số dòng cố định).
   Bước 2: giá trị đã nhập trùng tên thông số thì giữ lại, nên đổi loại không mất dữ liệu.
   Bước 3: thông số cũ không thuộc loại mới được giữ thành dòng "thêm riêng" (có nút Xóa). */
function syncSpecs(cid){
  var names=allSpecs(cid), old=EDIT.specs.filter(function(s){return s[0]||s[1]}), out=[];
  names.forEach(function(n){var f=old.filter(function(s){return s[0].toLowerCase()===n.toLowerCase()})[0];out.push([n,f?f[1]:''])});
  EDIT.nS=out.length;
  old.forEach(function(s){if(names.every(function(n){return n.toLowerCase()!==s[0].toLowerCase()}))out.push(s)});
  EDIT.specs=out;
}
/* drawSpecs(): vẽ các dòng thông số. Dòng cố định (i < EDIT.nS) khóa tên, chỉ nhập giá trị; dòng thêm riêng thì sửa tên và xóa được. */
function drawSpecs(){
  var box=$('specs');
  if(!EDIT.specs.length){box.innerHTML='<div class="hint">Loại này chưa có thông số định nghĩa sẵn. Bấm "Thêm thông số" nếu cần.</div>';return}
  box.innerHTML=EDIT.specs.map(function(s,i){
    var fixed=i<EDIT.nS;
    return '<div class="specrow"><input class="inp" id="sk'+i+'" data-sk="'+i+'" value="'+esc(s[0])+'" placeholder="Tên (vd: Socket)" aria-label="Tên thông số"'+(fixed?' readonly style="background:var(--surface2)"':'')+'><input class="inp" id="sv'+i+'" data-sv="'+i+'" value="'+esc(s[1])+'" placeholder="Giá trị (vd: LGA1700)" aria-label="Giá trị">'+(fixed?'<span></span>':'<button type="button" class="btn sm" data-sx="'+i+'" aria-label="Xóa thông số">Xóa</button>')+'</div>';
  }).join('');
}
/* resizeImage(file,cb): đọc ảnh người dùng chọn, thu nhỏ còn tối đa 360px rồi nén JPEG để nhẹ bộ nhớ, sau đó trả về qua cb. */
function resizeImage(file,cb){
  var fr=new FileReader();
  fr.onload=function(){
    var im=new Image();
    im.onload=function(){
      var m=360,r=Math.min(1,m/Math.max(im.width,im.height)),c=document.createElement('canvas');
      c.width=Math.round(im.width*r);c.height=Math.round(im.height*r);
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      cb(c.toDataURL('image/jpeg',0.82));
    };
    im.onerror=function(){cb('')};
    im.src=fr.result;
  };
  fr.readAsDataURL(file);
}
/* saveProduct(): kiểm tra (tên, SKU/mã vạch không trùng, bắt buộc chọn thương hiệu, giá) rồi lưu. Sản phẩm lưu loại bằng id (cat) và thương hiệu bằng tên (brand). */
function saveProduct(){
  var name=$('f_name').value.trim(), sku=$('f_sku').value.trim(), brand=$('f_brand').value.trim(), price=$('f_price').value;
  var errs=[];
  if(!name) errs.push('Nhập tên sản phẩm.');
  if(!sku) errs.push('Nhập mã SKU.');
  else if(products.some(function(x){return x.sku.toLowerCase()===sku.toLowerCase()&&x.id!==EDIT.id})) errs.push('Mã SKU "'+sku+'" đã có ở sản phẩm khác. Hãy dùng mã khác.');
  var bar=$('f_bar').value.trim();
  if(bar&&products.some(function(x){return x.barcode&&x.barcode===bar&&x.id!==EDIT.id})) errs.push('Mã vạch này đã gắn với sản phẩm khác.');
  if(!brand) errs.push('Chọn thương hiệu.');
  if(price===''||Number(price)<0) errs.push('Nhập giá bán (từ 0 trở lên).');
  if(errs.length){ $('ferr').innerHTML='<div class="err">'+errs.map(esc).join('<br>')+'</div>'; $('ferr').scrollIntoView({block:'nearest'}); return }
  var specs=EDIT.specs.filter(function(s){return s[0].trim()&&s[1].trim()}).map(function(s){return [s[0].trim(),s[1].trim()]});
  var data={name:name,sku:sku,barcode:bar,cat:Number($('f_type').value),brand:brand,price:Number(price),warranty:Number($('f_war').value)||0,img:EDIT.img,specs:specs,serial:$('f_serial').checked,min:Number($('f_min').value)||0,status:$('f_status').value};
  if(EDIT.id){
    var p=byId(EDIT.id);
    if(p.price!==data.price) p.hist.push({d:Date.now(),from:p.price,to:data.price});
    Object.keys(data).forEach(function(k){p[k]=data[k]});
    toast('Đã lưu thay đổi cho '+p.name);
  } else {
    data.id=nextId++; data.stock=0; data.hasData=false; data.hist=[];
    products.unshift(data);
    toast('Đã thêm sản phẩm '+data.name);
  }
  closeDrawer(); refresh();
}

/* HỘP THOẠI XÁC NHẬN VÀ ĐIỀU CHỈNH TỒN. */
/* dialog(html): hiện hộp thoại ở giữa màn hình với nội dung html. closeDialog() đóng lại. */
function dialog(html){$('dialogHost').innerHTML='<div class="scrim center" id="dscrim"><div class="dialog" role="dialog" aria-modal="true">'+html+'</div></div>'}
function closeDialog(){$('dialogHost').innerHTML=''}
/* confirmStop(id): hỏi xác nhận ngừng kinh doanh. Lịch sử nhập/bán/bảo hành vẫn giữ, có thể bán lại sau. */
function confirmStop(id){
  var p=byId(id);
  dialog('<h3>Ngừng kinh doanh sản phẩm này?</h3><p><b>'+esc(p.name)+'</b> sẽ chuyển sang trạng thái "Ngừng kinh doanh" và không còn được bán. Lịch sử nhập, bán và bảo hành vẫn được giữ nguyên. Bạn có thể bán lại sau.</p>'+
   '<div class="acts"><button class="btn" data-dclose>Giữ nguyên</button><button class="btn danger solid" data-dstop="'+id+'">Ngừng kinh doanh</button></div>');
}
/* confirmDelete(id): hỏi xác nhận xóa hẳn. Chỉ gọi được cho sản phẩm mới tạo, chưa có dữ liệu phát sinh (hasData = false). */
function confirmDelete(id){
  var p=byId(id);
  dialog('<h3>Xóa hẳn sản phẩm này?</h3><p><b>'+esc(p.name)+'</b> mới tạo và chưa có dữ liệu phát sinh nên được phép xóa. Sau khi xóa không thể khôi phục.</p>'+
   '<div class="acts"><button class="btn" data-dclose>Không xóa</button><button class="btn danger solid" data-ddel="'+id+'">Xóa sản phẩm</button></div>');
}
/* ADJ = id sản phẩm đang được điều chỉnh tồn. REASONS = các lý do gợi ý nhanh. */
var ADJ=null;
var REASONS=['Kiểm kê thiếu hàng','Kiểm kê thừa hàng','Hàng lỗi, hỏng','Nhập sai số lượng'];
/* openAdjust(id): hộp thoại kiểm kê. Nhập số đếm thực tế, hệ thống tự tính chênh lệch và BẮT BUỘC ghi lý do. */
function openAdjust(id){
  var p=byId(id); ADJ=id;
  dialog('<h3>Điều chỉnh tồn kho</h3><div><b>'+esc(p.name)+'</b><div class="muted mono">'+esc(p.sku)+'</div></div>'+
   '<div class="diffbox"><span>Tồn trên hệ thống</span><b class="num">'+p.stock+'</b></div>'+
   '<div class="field"><label for="a_qty">Số đếm thực tế</label><input class="inp" id="a_qty" type="number" min="0" value="'+p.stock+'"></div>'+
   '<div class="diffbox" id="a_diff"><span>Chênh lệch</span><b class="num">0</b></div>'+
   '<div class="field"><label for="a_reason">Lý do điều chỉnh *</label><textarea id="a_reason" placeholder="Vd: Kiểm kê tháng 10, thiếu 1 cái so với sổ"></textarea><div class="chips" style="margin-top:6px">'+REASONS.map(function(r){return '<button type="button" class="chip" data-reason="'+esc(r)+'">'+r+'</button>'}).join('')+'</div></div>'+
   '<div id="a_err"></div>'+
   '<div class="acts"><button class="btn" data-dclose>Hủy</button><button class="btn primary" id="a_save">Lưu điều chỉnh</button></div>');
  $('a_qty').focus(); $('a_qty').select();
}
/* updAdjDiff(): cập nhật ô "Chênh lệch" (xanh khi dư, đỏ khi thiếu) mỗi lần gõ số đếm. */
function updAdjDiff(){
  var p=byId(ADJ), v=Number($('a_qty').value), d=(isNaN(v)?p.stock:v)-p.stock;
  $('a_diff').innerHTML='<span>Chênh lệch</span><b class="num diff '+(d>0?'up':d<0?'down':'')+'">'+(d>0?'+':'')+d+'</b>';
}
/* saveAdjust(): kiểm tra (số nguyên >= 0, khác tồn hiện tại, có lý do) rồi ghi vào nhật ký và đổi tồn. Sau đó sản phẩm được coi là đã có dữ liệu (hasData = true) nên không còn xóa được. */
function saveAdjust(){
  var p=byId(ADJ), v=$('a_qty').value, reason=$('a_reason').value.trim();
  if(v===''||Number(v)<0||Math.floor(Number(v))!==Number(v)){$('a_err').innerHTML='<div class="err">Nhập số lượng thực tế là số nguyên từ 0 trở lên.</div>';return}
  if(Number(v)===p.stock){$('a_err').innerHTML='<div class="err">Số đếm bằng số trên hệ thống, không cần điều chỉnh.</div>';return}
  if(!reason){$('a_err').innerHTML='<div class="err">Bắt buộc ghi lý do để sau này đối chiếu.</div>';return}
  adjustLog.push({t:Date.now(),pid:p.id,from:p.stock,to:Number(v),reason:reason,by:'Bạn (Quản lý)'});
  p.stock=Number(v); p.hasData=true;
  closeDialog(); refresh(); toast('Đã điều chỉnh tồn kho '+p.name+' về '+p.stock);
}
/* toast(msg): hiện thông báo nổi ở đáy màn hình và tự tắt sau khoảng 3 giây. */
function toast(msg){
  var h=$('toastHost'); h.innerHTML='<div class="toast" role="status">'+esc(msg)+'</div>';
  clearTimeout(toast.t); toast.t=setTimeout(function(){h.innerHTML=''},3200);
}

/* ---------- 3.2 Loại sản phẩm & thương hiệu ---------- */
/* CS = trạng thái màn hình Loại sản phẩm: sub (ngăn đang xem), sel (id loại đang chọn), q (từ khóa), brand (lọc hãng).
   CE / BE / HC = loại, thương hiệu đang sửa và loại đang định ẩn (dùng khi hộp thoại mở). */
var CS={sub:'cats',sel:1,q:'',brand:''}, CE=null, BE=null, HC=null;
/* ===== CÁC HÀM TIỆN ÍCH CỦA CÂY LOẠI =====
   Mỗi loại là 1 object: {id, code, name, parent, desc, active, specs}
   - parent = null  -> danh mục chính (cấp 1); parent = id của loại khác -> phân loại (con)
   - active = false -> loại đã ẩn (ngừng sử dụng)
   - specs = danh sách TÊN thông số riêng của loại này (chưa gồm phần thừa hưởng)
   Cả cây chỉ là một mảng phẳng CATS, các hàm dưới đây dựng quan hệ cha - con từ trường parent.
   cat(id): lấy 1 loại theo id. */
function cat(id){return CATS.filter(function(c){return c.id===id})[0]}
/* kids(id): các loại con TRỰC TIẾP của loại id. kids(null) = danh sách danh mục chính. */
function kids(id){return CATS.filter(function(c){return c.parent===id})}
/* flat(): duyệt cây theo thứ tự cha trước, con sau; dùng để vẽ cây và các ô chọn có thụt lề. */
function flat(){var o=[];(function w(p){kids(p).forEach(function(c){o.push(c);w(c.id)})})(null);return o}
/* depth(id): độ sâu của loại (0 = danh mục chính, 1 = phân loại, ...). Dùng để thụt lề. */
function depth(id){var d=0,c=cat(id);while(c&&c.parent!=null){d++;c=cat(c.parent)}return d}
/* catPath(id): đường dẫn đầy đủ, ví dụ "Ổ cứng › Ổ cứng SSD". */
function catPath(id){var a=[],c=cat(id);while(c){a.unshift(c.name);c=c.parent==null?null:cat(c.parent)}return a.join(' › ')}
/* subIds(id): id của loại đó VÀ toàn bộ loại con cháu. Dùng để đếm và lọc "gồm cả loại con". */
function subIds(id){var r=[id];kids(id).forEach(function(k){r=r.concat(subIds(k.id))});return r}
/* cnt(id,deep): đếm sản phẩm. deep=true tính cả loại con; deep=false chỉ tính trực tiếp. */
function cnt(id,deep){var ids=deep?subIds(id):[id];return products.filter(function(p){return ids.indexOf(p.cat)>-1}).length}
/* allSpecs(id): danh sách thông số ĐẦY ĐỦ của loại = thông số của loại cha (đi ngược lên gốc) + của chính nó.
   Đây là cơ chế "thừa hưởng": SSD có Dung lượng, Chuẩn kết nối (từ Ổ cứng) + Tốc độ đọc (riêng). */
function allSpecs(id){var a=[],c=cat(id);while(c){a=c.specs.concat(a);c=c.parent==null?null:cat(c.parent)}return a}
/* cname(p): tên loại của sản phẩm p. Sản phẩm chỉ lưu p.cat (id loại), tên được tra từ CATS nên đổi tên loại là tự cập nhật khắp nơi. */
function cname(p){var c=cat(p.cat);return c?c.name:'(không rõ)'}
/* abbrC(id): chữ viết tắt hiện trong ô ảnh nhỏ khi sản phẩm chưa có hình (lấy từ mã loại, tối đa 5 ký tự). */
function abbrC(id){var c=cat(id);return c?c.code.slice(0,5):'SP'}
/* bnames(): tên thương hiệu đã sắp xếp theo bảng chữ cái tiếng Việt, dùng cho các ô chọn. */
function bnames(){return BRANDS.map(function(b){return b.name}).sort(function(a,b){return a.localeCompare(b,'vi')})}
/* bcount(n): số sản phẩm đang dùng thương hiệu tên n (quyết định thương hiệu có xóa được không). */
function bcount(n){return products.filter(function(p){return p.brand===n}).length}
/* catOptions(sel,form): tạo các thẻ <option> của cây loại, thụt lề theo cấp.
   form=true (biểu mẫu sản phẩm): loại đã ẩn bị khóa, trừ loại mà sản phẩm đang dùng.
   form=false (bộ lọc): hiện tất cả, loại ẩn có ghi "(đã ẩn)". */
function catOptions(sel,form){
  return flat().map(function(c){
    var dis=form&&!c.active&&c.id!==sel;
    return '<option value="'+c.id+'"'+(c.id===sel?' selected':'')+(dis?' disabled':'')+'>'+'\u00a0\u00a0\u00a0'.repeat(depth(c.id))+esc(c.name)+(c.active?'':' (đã ẩn)')+'</option>';
  }).join('');
}
/* renderSub(): chuyển giữa hai ngăn "Loại sản phẩm" và "Thương hiệu" (biến CS.sub quyết định ngăn nào đang hiện). */
function renderSub(){
  $('catsPane').hidden=CS.sub!=='cats';$('brandsPane').hidden=CS.sub!=='brands';
  document.querySelectorAll('[data-csub]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.csub===CS.sub))});
}
/* renderCats(): vẽ ngăn Loại sản phẩm gồm 2 cột.
   Cột trái: cây loại, mỗi dòng kèm số sản phẩm (đã cộng loại con). Bấm vào dòng thì đặt CS.sel = loại đó.
   Cột phải: chi tiết loại đang chọn (mô tả, thông số, nút thao tác) + danh sách sản phẩm thuộc loại.
   Nút Xóa chỉ bật khi loại không có sản phẩm (canDel) và không có loại con. */
function renderCats(){
  var all=flat(), c=cat(CS.sel)||all[0]; CS.sel=c.id;
  var tree='<div class="tree"><div class="th"><span>Các loại sản phẩm</span><button class="btn sm" data-ca="root" data-cid="0">+ Thêm danh mục chính</button></div>'+all.map(function(x){
    return '<button class="node'+(x.id===c.id?' sel':'')+(x.active?'':' off')+'" style="padding-left:'+(12+depth(x.id)*20)+'px" data-csel="'+x.id+'"><span class="nn">'+esc(x.name)+(x.active?'':'<span class="tag">Đã ẩn</span>')+'</span><span class="num muted" title="Số sản phẩm (gồm loại con)">'+cnt(x.id,true)+'</span></button>';
  }).join('')+'</div>';
  var inh=allSpecs(c.parent), own=c.specs, direct=cnt(c.id,false), deep=cnt(c.id,true), nk=kids(c.id).length, sibs=kids(c.parent), i=sibs.indexOf(c), canDel=deep===0&&!nk, id=c.id;
  var bs={};products.forEach(function(p){if(subIds(id).indexOf(p.cat)>-1)bs[p.brand]=(bs[p.brand]||0)+1});
  if(CS.brand&&!bs[CS.brand])CS.brand='';
  var det='<div class="cdetail"><div class="card"><div><div class="crumb">'+esc(catPath(id))+'</div><h3>'+esc(c.name)+' <span class="tag mono">'+esc(c.code)+'</span> '+(c.active?'<span class="pill ok">Đang sử dụng</span>':'<span class="pill off">Đã ẩn</span>')+'</h3></div>'+
   '<div>'+(c.desc?esc(c.desc):'<span class="muted">Chưa có mô tả.</span>')+'</div>'+
   '<div><div class="lbl" style="margin-bottom:6px">Thông số kỹ thuật dùng cho biểu mẫu thêm sản phẩm</div><div class="chips">'+(inh.length+own.length?inh.map(function(s){return '<span class="tag" title="Thừa hưởng từ loại cha">'+esc(s)+' · từ loại cha</span>'}).join('')+own.map(function(s){return '<span class="chip" style="cursor:default">'+esc(s)+'</span>'}).join(''):'<span class="muted">Chưa định nghĩa thông số nào.</span>')+'</div></div>'+
   '<div class="acts"><button class="btn sm" data-ca="edit" data-cid="'+id+'">Sửa</button><button class="btn sm" data-ca="child" data-cid="'+id+'">+ Thêm phân loại</button>'+
   '<button class="btn sm" data-ca="up" data-cid="'+id+'"'+(i<1?' disabled':'')+' aria-label="Đưa lên trên">Lên</button><button class="btn sm" data-ca="down" data-cid="'+id+'"'+(i>=sibs.length-1?' disabled':'')+' aria-label="Đưa xuống dưới">Xuống</button>'+
   (c.active?'<button class="btn sm" data-ca="hide" data-cid="'+id+'">Ẩn (ngừng sử dụng)</button>':'<button class="btn sm" data-ca="show" data-cid="'+id+'">Hiện lại</button>')+
   '<button class="btn sm danger" data-ca="del" data-cid="'+id+'"'+(canDel?'':' disabled')+'>Xóa</button></div>'+
   (canDel?'':'<div class="hint">Không thể xóa: '+(deep?'còn '+deep+' sản phẩm thuộc loại này':'loại này còn loại con')+'. Hãy chuyển sản phẩm sang loại khác hoặc chỉ ẩn loại này.</div>')+'</div>'+
   '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><b>'+deep+' sản phẩm'+(nk?' <span class="muted" style="font-weight:400">('+direct+' thuộc trực tiếp loại này)</span>':'')+'</b><button class="btn sm" data-ca="open" data-cid="'+id+'">Mở trong mục Sản phẩm</button></div>'+
   '<div class="frow first"><div class="field"><label for="cq">Tìm trong loại này</label><input class="inp" id="cq" type="search" value="'+esc(CS.q)+'" placeholder="Tên, SKU hoặc thông số"></div>'+
   '<div class="field"><label for="cbrand">Thương hiệu</label><select id="cbrand"><option value="">Tất cả</option>'+Object.keys(bs).sort().map(function(b){return '<option value="'+esc(b)+'"'+(CS.brand===b?' selected':'')+'>'+esc(b)+' ('+bs[b]+')</option>'}).join('')+'</select></div></div>'+
   '<div class="list" id="cplist"></div></div></div>';
  $('catsPane').innerHTML='<div class="cgrid">'+tree+det+'</div>';
  renderCatProducts();
}
/* renderCatProducts(): chỉ vẽ lại danh sách sản phẩm trong cột phải (mục 3.2.3).
   Lấy sản phẩm của loại đang chọn + loại con, rồi lọc theo ô tìm kiếm (CS.q) và thương hiệu (CS.brand).
   Tách riêng để gõ tìm kiếm không làm mất con trỏ ở ô nhập. */
function renderCatProducts(){
  var ids=subIds(CS.sel), q=CS.q.trim().toLowerCase();
  var rows=products.filter(function(p){
    if(ids.indexOf(p.cat)<0||(CS.brand&&p.brand!==CS.brand)) return false;
    return !q||q.split(/\s+/).every(function(w){return [p.name,p.sku,p.brand].concat(p.specs.map(function(s){return s[1]})).join(' ').toLowerCase().indexOf(w)>-1});
  });
  var el=$('cplist'); if(!el) return;
  el.innerHTML=rows.length?'<div class="prow head"><div>Sản phẩm</div><div>Loại</div><div>Hãng</div><div>Giá bán</div><div>Tồn</div></div>'+rows.map(function(p){
    return '<div class="prow"><div class="nm"><b>'+esc(p.name)+'</b><span class="mono">'+esc(p.sku)+'</span></div><div>'+esc(cname(p))+'</div><div>'+esc(p.brand)+'</div><div class="price">'+money(p.price)+'</div><div class="num"><b>'+p.stock+'</b></div></div>';
  }).join(''):'<div class="empty">Chưa có sản phẩm nào khớp trong loại này.</div>';
}
/* renderBrands(): vẽ bảng thương hiệu, mỗi dòng có số sản phẩm và các loại hàng của hãng đó.
   Nút Xóa bị khóa nếu thương hiệu còn sản phẩm. */
function renderBrands(){
  var rows=bnames().map(function(n){
    var b=BRANDS.filter(function(x){return x.name===n})[0], c=bcount(n);
    var cs=Array.from(new Set(products.filter(function(p){return p.brand===n}).map(cname)));
    return '<div class="brow"><div class="nm"><b>'+esc(n)+'</b><span class="specs">'+(cs.length?esc(cs.join(', ')):'Chưa có sản phẩm')+'</span></div><div class="num">'+c+' sản phẩm</div><div class="acts">'+
      (c?'<button class="btn sm" data-ba="open" data-bid="'+b.id+'">Xem sản phẩm</button>':'')+'<button class="btn sm" data-ba="edit" data-bid="'+b.id+'">Đổi tên</button><button class="btn sm danger" data-ba="del" data-bid="'+b.id+'"'+(c?' disabled title="Thương hiệu đang gắn với sản phẩm nên không thể xóa"':'')+'>Xóa</button></div></div>';
  }).join('');
  $('brandsPane').innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap"><span class="count" style="margin:0">'+BRANDS.length+' thương hiệu. Thương hiệu đang gắn với sản phẩm thì không xóa được.</span><button class="btn primary" data-ba="add" data-bid="0">+ Thêm thương hiệu</button></div><div class="list"><div class="brow head"><div>Thương hiệu</div><div>Số sản phẩm</div><div style="min-width:200px"></div></div>'+rows+'</div>';
}
/* catForm(id,par): mở hộp thoại thêm/sửa loại.
   - id có giá trị = sửa loại đó; id rỗng = thêm mới.
   - par = id loại cha chọn sẵn (nút "+ Thêm phân loại" truyền id loại đang chọn; nút "+ Thêm danh mục chính" truyền null).
   - Ô "loại cha" không cho chọn chính nó hoặc loại con của nó (tránh vòng lặp) và chỉ cho tối đa 4 cấp (depth<=2). */
function catForm(id,par){
  var c=id?cat(id):{code:'',name:'',desc:'',parent:par==null?null:par,specs:[]}; CE={id:id||null};
  var ex=id?subIds(id):[];
  var po='<option value="">Không có (loại gốc)</option>'+flat().filter(function(x){return ex.indexOf(x.id)<0&&depth(x.id)<=2}).map(function(x){return '<option value="'+x.id+'"'+(c.parent===x.id?' selected':'')+'>'+'\u00a0\u00a0\u00a0'.repeat(depth(x.id))+esc(x.name)+'</option>'}).join('');
  dialog('<h3>'+(id?'Sửa loại sản phẩm':(par?'Thêm phân loại':'Thêm danh mục chính'))+'</h3>'+
   '<div class="g2"><div class="field"><label for="c_code">Mã loại *</label><input class="inp mono" id="c_code" value="'+esc(c.code)+'" placeholder="Vd: PSU"></div><div class="field"><label for="c_name">Tên loại *</label><input class="inp" id="c_name" value="'+esc(c.name)+'" placeholder="Vd: Nguồn máy tính"></div></div>'+
   '<div class="field"><label for="c_parent">Vị trí: thuộc loại cha</label><select id="c_parent">'+po+'</select></div>'+
   '<div class="field"><label for="c_desc">Mô tả</label><textarea id="c_desc" style="min-height:56px">'+esc(c.desc)+'</textarea></div>'+
   '<div class="field"><label for="c_specs">Thông số kỹ thuật riêng của loại (mỗi dòng một thông số)</label><textarea id="c_specs" placeholder="Socket&#10;Số nhân&#10;Số luồng">'+esc(c.specs.join('\n'))+'</textarea><span class="hint">Loại con tự thừa hưởng thông số của loại cha. Đổi tên thông số không làm đổi dữ liệu của sản phẩm đã nhập.</span></div>'+
   '<div id="c_err"></div><div class="acts" style="justify-content:flex-end"><button class="btn" data-dclose>Hủy</button><button class="btn primary" id="c_save">'+(id?'Lưu':'Thêm loại')+'</button></div>');
  $('c_code').focus();
}
/* saveCat(): kiểm tra rồi lưu loại: mã loại không trùng, tên không trùng trong cùng nhánh.
   Thông số riêng lấy từ ô văn bản, mỗi dòng một thông số, tự bỏ dòng trống và dòng trùng.
   Đổi loại cha chính là "đổi vị trí trong cây". */
function saveCat(){
  var code=$('c_code').value.trim(), name=$('c_name').value.trim(), pv=$('c_parent').value, par=pv===''?null:Number(pv), errs=[];
  if(!code) errs.push('Nhập mã loại.'); else if(CATS.some(function(x){return x.code.toLowerCase()===code.toLowerCase()&&x.id!==CE.id})) errs.push('Mã loại "'+code+'" đã được dùng.');
  if(!name) errs.push('Nhập tên loại.'); else if(CATS.some(function(x){return x.parent===par&&x.id!==CE.id&&x.name.toLowerCase()===name.toLowerCase()})) errs.push('Đã có loại cùng tên trong nhánh này.');
  if(errs.length){$('c_err').innerHTML='<div class="err">'+errs.map(esc).join('<br>')+'</div>';return}
  var specs=$('c_specs').value.split('\n').map(function(s){return s.trim()}).filter(function(s,i,a){return s&&a.indexOf(s)===i});
  var o={code:code,name:name,desc:$('c_desc').value.trim(),parent:par,specs:specs};
  if(CE.id){var c=cat(CE.id);Object.keys(o).forEach(function(k){c[k]=o[k]});toast('Đã lưu loại '+name)}
  else{o.id=nextCat++;o.active=true;CATS.push(o);CS.sel=o.id;toast('Đã thêm loại '+name)}
  closeDialog();refresh();
}
/* hideCat(id): ngừng sử dụng (ẩn) loại.
   - Loại không có sản phẩm: ẩn ngay, ẩn luôn các loại con.
   - Loại đang có sản phẩm: hiện hộp thoại cho chọn "Chuyển sản phẩm sang loại khác rồi ẩn" hoặc "Chỉ ẩn, giữ sản phẩm". */
function hideCat(id){
  var ids=subIds(id), n=products.filter(function(p){return ids.indexOf(p.cat)>-1}).length, c=cat(id); HC=id;
  if(!n){ids.forEach(function(i){cat(i).active=false});refresh();toast('Đã ẩn loại '+c.name);return}
  var opts=flat().filter(function(x){return x.active&&ids.indexOf(x.id)<0}).map(function(x){return '<option value="'+x.id+'">'+'\u00a0\u00a0\u00a0'.repeat(depth(x.id))+esc(x.name)+'</option>'}).join('');
  dialog('<h3>Ngừng sử dụng loại "'+esc(c.name)+'"?</h3><p>Loại này'+(ids.length>1?' và các loại con':'')+' đang có <b>'+n+' sản phẩm</b>. Loại bị ẩn sẽ không còn xuất hiện khi thêm sản phẩm mới. Bạn có thể chuyển sản phẩm sang loại khác trước, hoặc chỉ ẩn và giữ nguyên sản phẩm.</p>'+
   (opts?'<div class="field"><label for="h_to">Chuyển sản phẩm sang loại</label><select id="h_to">'+opts+'</select></div>':'')+
   '<div class="acts" style="justify-content:flex-end"><button class="btn" data-dclose>Hủy</button><button class="btn" id="h_keep">Chỉ ẩn, giữ sản phẩm</button>'+(opts?'<button class="btn primary" id="h_move">Chuyển rồi ẩn</button>':'')+'</div>');
}
/* doHide(move): thực hiện ẩn. move=true thì chuyển toàn bộ sản phẩm của nhánh sang loại đã chọn (p.cat = đích) trước khi ẩn. */
function doHide(move){
  var ids=subIds(HC), c=cat(HC), msg='Đã ẩn loại '+c.name;
  if(move){var to=Number($('h_to').value),k=0;products.forEach(function(p){if(ids.indexOf(p.cat)>-1){p.cat=to;k++}});msg='Đã chuyển '+k+' sản phẩm sang "'+cat(to).name+'" và ẩn loại '+c.name}
  ids.forEach(function(i){cat(i).active=false});closeDialog();refresh();toast(msg);
}
/* moveCat(id,dir): nút Lên/Xuống, đổi chỗ với loại anh em liền kề (dir=-1 lên, +1 xuống) bằng cách hoán đổi vị trí trong mảng CATS. */
function moveCat(id,dir){
  var c=cat(id), s=kids(c.parent), j=s.indexOf(c)+dir; if(j<0||j>=s.length) return;
  var a=CATS.indexOf(c), b=CATS.indexOf(s[j]), t=CATS[a]; CATS[a]=CATS[b]; CATS[b]=t; refresh();
}
/* catAct(a,id): điều phối mọi nút thao tác của loại (root, child, edit, hide, show, del, up, down, open). Nút "open" chuyển sang tab Sản phẩm với bộ lọc loại đã đặt sẵn. */
function catAct(a,id){
  var c=cat(id);
  if(a==='root') return catForm(null,null);
  if(a==='child') return catForm(null,id);
  if(a==='edit') return catForm(id);
  if(a==='hide') return hideCat(id);
  if(a==='show'){ if(c.parent!=null&&!cat(c.parent).active){toast('Hãy hiện lại loại cha "'+cat(c.parent).name+'" trước.');return} c.active=true;refresh();toast('Đã hiện lại loại '+c.name);return}
  if(a==='del') return dialog('<h3>Xóa loại "'+esc(c.name)+'"?</h3><p>Loại này không có sản phẩm và không có loại con nên được phép xóa. Không thể khôi phục sau khi xóa.</p><div class="acts" style="justify-content:flex-end"><button class="btn" data-dclose>Không xóa</button><button class="btn danger solid" data-cdel="'+id+'">Xóa loại</button></div>');
  if(a==='up'||a==='down') return moveCat(id,a==='up'?-1:1);
  if(a==='open'){S.type=String(id);S.status='';setTab('products');refresh()}
}
/* brandForm(id): hộp thoại thêm / đổi tên thương hiệu. */
function brandForm(id){
  var b=id?BRANDS.filter(function(x){return x.id===id})[0]:{name:''}; BE={id:id||null};
  dialog('<h3>'+(id?'Đổi tên thương hiệu':'Thêm thương hiệu')+'</h3><div class="field"><label for="b_name">Tên thương hiệu *</label><input class="inp" id="b_name" value="'+esc(b.name)+'" placeholder="Vd: Gigabyte"></div>'+(id?'<div class="note">Các sản phẩm đang dùng thương hiệu này sẽ được cập nhật theo tên mới.</div>':'')+'<div id="b_err"></div><div class="acts" style="justify-content:flex-end"><button class="btn" data-dclose>Hủy</button><button class="btn primary" id="b_save">Lưu</button></div>');
  $('b_name').focus();$('b_name').select();
}
/* saveBrand(): lưu thương hiệu, không cho trùng tên. Đổi tên thì cập nhật luôn p.brand của các sản phẩm đang dùng. */
function saveBrand(){
  var n=$('b_name').value.trim();
  if(!n){$('b_err').innerHTML='<div class="err">Nhập tên thương hiệu.</div>';return}
  if(BRANDS.some(function(x){return x.name.toLowerCase()===n.toLowerCase()&&x.id!==BE.id})){$('b_err').innerHTML='<div class="err">Thương hiệu này đã có trong danh sách.</div>';return}
  if(BE.id){var b=BRANDS.filter(function(x){return x.id===BE.id})[0];products.forEach(function(p){if(p.brand===b.name)p.brand=n});if(CS.brand===b.name)CS.brand=n;if(S.brand===b.name)S.brand=n;b.name=n}
  else BRANDS.push({id:nextBrand++,name:n});
  closeDialog();refresh();toast('Đã lưu thương hiệu '+n);
}
/* brandAct(a,id): điều phối nút của thương hiệu (add, edit, open, del). */
function brandAct(a,id){
  var b=BRANDS.filter(function(x){return x.id===id})[0];
  if(a==='add') return brandForm(null);
  if(a==='edit') return brandForm(id);
  if(a==='open'){S.brand=b.name;S.status='';setTab('products');refresh();return}
  if(a==='del'){ if(bcount(b.name)){toast('Thương hiệu đang gắn với sản phẩm nên không thể xóa.');return}
    dialog('<h3>Xóa thương hiệu "'+esc(b.name)+'"?</h3><p>Chưa có sản phẩm nào dùng thương hiệu này.</p><div class="acts" style="justify-content:flex-end"><button class="btn" data-dclose>Không xóa</button><button class="btn danger solid" data-bdel="'+id+'">Xóa</button></div>') }
}

/* ---------- Điều khiển chung ---------- */
/* refresh(): vẽ lại toàn bộ giao diện. Mọi thao tác thay đổi dữ liệu đều gọi hàm này cuối cùng. */
function refresh(){renderFilters();renderStats();renderList();renderStock();renderSub();renderCats();renderBrands()}
/* setTab(t): chuyển tab chính (Sản phẩm / Loại sản phẩm / Tồn kho / Tra cứu Serial). */
function setTab(t){
  S.tab=t;
  ['products','cats','stock','serial'].forEach(function(k){
    $('view-'+k).hidden=k!==t;
    $('tab-'+k).setAttribute('aria-selected',String(k===t));
  });
}
/* Mọi nút bấm dùng 1 bộ lắng nghe chung (event delegation): nút gắn data-ca / data-ba / data-csel / data-csub,
   hàm này tìm thuộc tính đó rồi gọi hàm xử lý tương ứng. Thêm nút mới chỉ cần gắn thuộc tính và thêm 1 dòng ở đây. */
document.addEventListener('click',function(e){
  var t=e.target;
  /* Từ đây trở xuống: mỗi nhánh kiểm tra bấm trúng nút nào (qua thuộc tính data-*) rồi return sớm.
     Chuyển tab chính. */
  var tab=t.closest('[data-tab]'); if(tab){setTab(tab.dataset.tab);return}
  /* Chuyển ngăn Loại / Thương hiệu. */
  var sb=t.closest('[data-csub]'); if(sb){CS.sub=sb.dataset.csub;renderSub();return}
  /* Nút thao tác của loại (sửa, thêm con, ẩn, xóa...). */
  var ca=t.closest('[data-ca]'); if(ca){catAct(ca.dataset.ca,Number(ca.dataset.cid));return}
  /* Bấm vào một dòng của cây loại: chọn loại đó và xóa từ khóa tìm cũ. */
  var cs=t.closest('[data-csel]'); if(cs){CS.sel=Number(cs.dataset.csel);CS.q='';CS.brand='';renderCats();return}
  /* Nút thao tác của thương hiệu. */
  var ba=t.closest('[data-ba]'); if(ba){brandAct(ba.dataset.ba,Number(ba.dataset.bid));return}
  /* Xác nhận xóa loại: bỏ khỏi CATS, chọn lại loại cha. */
  var cd=t.closest('[data-cdel]'); if(cd){var cid=Number(cd.dataset.cdel),cc=cat(cid);CATS=CATS.filter(function(x){return x.id!==cid});CS.sel=cc.parent!=null?cc.parent:0;closeDialog();refresh();toast('Đã xóa loại '+cc.name);return}
  /* Xác nhận xóa thương hiệu. */
  var bd=t.closest('[data-bdel]'); if(bd){var bid=Number(bd.dataset.bdel);BRANDS=BRANDS.filter(function(x){return x.id!==bid});closeDialog();refresh();toast('Đã xóa thương hiệu');return}
  /* Các nút trong hộp thoại loại / thương hiệu / ẩn loại. */
  if(t.id==='c_save'){saveCat();return}
  if(t.id==='b_save'){saveBrand();return}
  if(t.id==='h_keep'){doHide(false);return}
  if(t.id==='h_move'){doHide(true);return}
  /* Bấm ô thống kê: bật/tắt lọc theo tình trạng. */
  var st=t.closest('[data-stat]'); if(st){S.status=S.status===st.dataset.stat?'':st.dataset.stat;refresh();return}
  /* Nút trên dòng sản phẩm: Sửa, Ngừng KD, Bán lại. */
  var row=t.closest('.row[data-id]'), act=t.closest('[data-act]');
  if(act&&row){
    var id=Number(row.dataset.id);
    if(act.dataset.act==='edit') openDrawer(id);
    if(act.dataset.act==='stop') confirmStop(id);
    if(act.dataset.act==='reopen'){var p=byId(id);p.status='Đang kinh doanh';refresh();toast('Đã mở bán lại '+p.name)}
    return;
  }
  /* Mở hộp thoại điều chỉnh tồn kho. */
  var adj=t.closest('[data-adj]'); if(adj){openAdjust(Number(adj.dataset.adj));return}
  /* Bấm Serial mẫu / gợi ý: điền vào ô và tra cứu. */
  var sn=t.closest('[data-sn]'); if(sn){$('sn').value=sn.dataset.sn;lookupSerial();return}
  /* Bấm chip lý do: điền vào ô lý do điều chỉnh. */
  var rs=t.closest('[data-reason]'); if(rs){var ta=$('a_reason');ta.value=rs.dataset.reason;ta.focus();return}
  /* Đóng ngăn kéo (nút Đóng / Hủy hoặc bấm nền mờ). */
  if(t.closest('[data-close]')||t.id==='scrim'){closeDrawer();return}
  /* Đóng hộp thoại (nút Hủy hoặc bấm nền mờ). */
  if(t.closest('[data-dclose]')||t.id==='dscrim'){closeDialog();return}
  /* Xác nhận ngừng kinh doanh. */
  var ds=t.closest('[data-dstop]'); if(ds){var p2=byId(Number(ds.dataset.dstop));p2.status='Ngừng kinh doanh';closeDialog();refresh();toast('Đã ngừng kinh doanh '+p2.name);return}
  /* Xác nhận xóa sản phẩm. */
  var dd=t.closest('[data-ddel]'); if(dd){var id3=Number(dd.dataset.ddel),pp=byId(id3);products=products.filter(function(x){return x.id!==id3});closeDialog();closeDrawer();refresh();toast('Đã xóa sản phẩm '+pp.name);return}
  /* Nút + Thêm sản phẩm; nút Xóa sản phẩm trong ngăn kéo; nút Xóa bộ lọc. */
  if(t.id==='btnAdd'){openDrawer();return}
  if(t.id==='btnDel'){confirmDelete(EDIT.id);return}
  if(t.id==='fclear'){S={tab:S.tab,q:'',type:'',brand:'',status:'',min:'',max:''};$('fq').value='';$('fmin').value='';$('fmax').value='';refresh();return}
  if(t.id==='snGo'){lookupSerial();return}
  if(t.id==='a_save'){saveAdjust();return}
  /* Thêm dòng thông số riêng; bỏ ảnh; xóa dòng thông số riêng. */
  if(t.id==='specAdd'){EDIT.specs.push(['','']);drawSpecs();var k=$('sk'+(EDIT.specs.length-1));if(k)k.focus();return}
  if(t.id==='f_imgx'){EDIT.img='';$('f_img').value='';drawThumb();return}
  var sx=t.closest('[data-sx]'); if(sx){EDIT.specs.splice(Number(sx.dataset.sx),1);drawSpecs();return}
});
/* LẮNG NGHE NHẬP LIỆU: gõ ô tìm kiếm / giá thì lọc lại ngay (không cần bấm nút); sửa thông số trong ngăn kéo thì cập nhật vào bản nháp EDIT.specs. */
document.addEventListener('input',function(e){
  var t=e.target;
  if(t.id==='fq'){S.q=t.value;renderList();return}
  if(t.id==='cq'){CS.q=t.value;renderCatProducts();return}
  if(t.id==='fmin'){S.min=t.value;renderList();return}
  if(t.id==='fmax'){S.max=t.value;renderList();return}
  if(t.id==='a_qty'){updAdjDiff();return}
  if(t.dataset&&t.dataset.sk!==undefined){EDIT.specs[Number(t.dataset.sk)][0]=t.value;return}
  if(t.dataset&&t.dataset.sv!==undefined){EDIT.specs[Number(t.dataset.sv)][1]=t.value;return}
});
/* LẮNG NGHE THAY ĐỔI Ô CHỌN: đổi bộ lọc loại/hãng/tình trạng; đổi loại sản phẩm trong ngăn kéo thì tự đổi bộ thông số (syncSpecs); chọn ảnh thì thu nhỏ rồi xem trước. */
document.addEventListener('change',function(e){
  var t=e.target;
  if(t.id==='ftype'){S.type=t.value;renderList();return}
  if(t.id==='cbrand'){CS.brand=t.value;renderCatProducts();return}
  if(t.id==='fbrand'){S.brand=t.value;renderList();return}
  if(t.id==='fstatus'){S.status=t.value;renderStats();renderList();return}
  if(t.id==='f_type'){syncSpecs(Number(t.value));drawSpecs();drawThumb();return}
  if(t.id==='f_img'&&t.files[0]){resizeImage(t.files[0],function(u){EDIT.img=u;drawThumb()});return}
});
/* Bấm nút Lưu của biểu mẫu sản phẩm: chặn tải lại trang và gọi saveProduct(). */
document.addEventListener('submit',function(e){
  if(e.target.id==='pform'){e.preventDefault();saveProduct()}
});
/* PHÍM TẮT: Esc đóng hộp thoại (hoặc ngăn kéo nếu không có hộp thoại); Enter trong ô Serial thì tra cứu, trong ô tên thương hiệu thì lưu. */
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){ if($('dialogHost').firstChild) closeDialog(); else if(EDIT) closeDrawer(); }
  if(e.key==='Enter'&&e.target.id==='b_name'){e.preventDefault();saveBrand()}
  if(e.key==='Enter'&&e.target.id==='sn'){e.preventDefault();lookupSerial()}
});

/* KHỞI ĐỘNG: vẽ các nút Serial mẫu rồi vẽ toàn bộ giao diện lần đầu. */
renderSamples();
refresh();
})();
