# V0 TECH 2.0 — Quản lý bán lẻ công nghệ đa cửa hàng

Ứng dụng Node.js/Express và MySQL triển khai chín yêu cầu FR-01–FR-09 trong `bản báo cáo cho Đồ án/Project_Report.docx`. Năm nhóm người dùng dùng chung API, danh mục và cơ sở dữ liệu; giao diện mới nằm trong `web/`.

## Chạy trên Windows

Yêu cầu: Node.js 24 LTS, MySQL 8.0+, dịch vụ MySQL đang chạy.

```powershell
cd C:\Users\sangl\source\repos\SE-main
npm.cmd ci
# Máy mới: Copy-Item .env.example .env, sau đó điền mật khẩu vào .env.
npm.cmd run db:setup
npm.cmd run db:check
npm.cmd start
```

Web: **http://127.0.0.1:3308**. MySQL: **127.0.0.1:3306**, database `se_store`.
Dùng `npm.cmd run dev` để tự tải lại backend khi sửa mã. Ctrl+C dừng server.
Nếu MySQL dừng, mở PowerShell bằng quyền Administrator và chạy `Start-Service MySQL80`.
Nếu cổng web bị chiếm, kiểm tra tiến trình đang dùng cổng trước khi dừng; không dừng chương trình của dự án khác.

`db:setup` tạo bảng nếu thiếu và chạy migration v2; giữ nguyên danh mục và dữ liệu đã tồn tại. Tồn kho khởi tạo lần đầu từ dữ liệu mẫu cũ; về sau chỉ dùng bảng `inventory`, không dùng `products.stock`. Không chạy thao tác xóa/reset database.

## Đăng nhập demo

| Tên đăng nhập | Vai trò | Phạm vi |
| --- | --- | --- |
| `hq` | Quản trị trụ sở | Toàn công ty |
| `warehouse` | Nhân viên kho | Kho trung tâm |
| `manager` | Quản lý | Sài Gòn |
| `employee` | Nhân viên | Sài Gòn |
| `manager2` | Quản lý | Hà Nội |
| `employee2` | Nhân viên | Hà Nội |
| `customer` | Khách hàng | Đơn hàng của chính mình |

Mật khẩu demo được tạo ngẫu nhiên khi chạy migration và lưu tại **`DEMO_PASSWORD` trong `.env`**. Không ghi mật khẩu vào README hoặc Git. Nếu tự đặt `DEMO_PASSWORD` trước lần setup đầu tiên, dùng ít nhất 10 ký tự. Thay đổi biến này sau migration không đặt lại mật khẩu tài khoản đã tồn tại. Trụ sở có thể sửa mật khẩu của các tài khoản nhân viên khác trong màn hình Nhân viên.

Khách hàng cũng có thể đăng ký tài khoản mới. Nhấn Đăng nhập trên trang chủ, sau khi đăng nhập hệ thống mở đúng không gian theo vai trò. `/shop` mở cửa hàng, `/login` mở đăng nhập. Các đường dẫn `/admin.html`, `/manager.html`, `/employee.html`, `/warehouse.html` dùng cùng giao diện và quyền do backend xác định; đường dẫn không cấp quyền.

## Các luồng đã triển khai

- Công ty, cửa hàng, danh mục, ngành hàng, thương hiệu, nhân viên theo phạm vi; tạo/sửa/tạm dừng thay vì xóa lịch sử.
- Tồn kho theo địa điểm, tìm/lọc, ngưỡng cảnh báo, yêu cầu bổ sung, phê duyệt tại trụ sở, xuất kho trung tâm và cửa hàng xác nhận nhận đủ.
- Khách chọn cửa hàng, giỏ hàng, nhận tại cửa hàng/giao tận nơi, COD/thẻ/QR, theo dõi đơn và hạng thành viên đã lưu.
- Quản lý xác minh thanh toán, xác nhận đơn, phân công nhân viên cùng cửa hàng, ghi nhận nhận hàng và hoàn tất đúng điều kiện.
- Nhân viên xem đơn được phân công, ghi tiến độ, lập/in hóa đơn offline, xem hiệu suất và hoa hồng cá nhân.
- Khuyến mãi toàn hệ thống/cửa hàng được chọn/cửa hàng riêng, khoảng hiệu lực, mức giảm, giá trị tối thiểu, mức trần và kênh bán.
- Hủy đơn, trả toàn bộ hàng, hoàn tiền mô phỏng, trả tồn kho và đảo hoa hồng có lịch sử.
- Dashboard và báo cáo theo khoảng ngày, phạm vi cửa hàng/toàn công ty, xuất CSV, lịch sử thao tác.

Thanh toán thẻ/QR, thu hộ COD, bằng chứng giao hàng và hoàn tiền là **mô phỏng phục vụ đồ án**. Không nhập số thẻ, không có kết nối ngân hàng hoặc đơn vị vận chuyển. Các quyết định còn bỏ ngỏ trong báo cáo được ghi ở [docs/DECISIONS.md](docs/DECISIONS.md), không được coi là yêu cầu nghiệp vụ đã được chủ nhiệm đồ án phê duyệt.

## Kiểm tra

```powershell
npm.cmd run check
npm.cmd run test:integration
npm.cmd run test:browser
# Hoặc chạy toàn bộ:
npm.cmd test
```

Kiểm thử cần `DB_ADMIN_PASSWORD` để tạo database và tài khoản MySQL tạm có tên `se_test_<timestamp>`, sau đó tự xóa đúng tài nguyên tạm đó. Không chạy test trên dữ liệu nghiệp vụ thật. Kiểm thử trình duyệt dùng Microsoft Edge đã cài sẵn (`channel: msedge`); không yêu cầu tải Chromium. Ảnh kiểm tra ở `.runtime/qa/`, không đưa lên Git.

## Tài liệu bàn giao

- [Đối chiếu yêu cầu và đánh giá tài liệu nguồn](docs/REQUIREMENTS.md).
- [Các quyết định triển khai tạm cho bản đồ án](docs/DECISIONS.md).
- [Kiến trúc, ERD, hoạt động, tuần tự và ca sử dụng](docs/DESIGN.md).
- [Kịch bản trình diễn và kết quả kiểm thử](docs/ACCEPTANCE.md).
- [Danh sách API và phân quyền](docs/API.md).
- [Đặc tả 28 ca sử dụng](docs/USE_CASES.md).

## Cấu trúc

```text
server/core.js              Validation, RBAC, giao dịch và ghi nhật ký
server/modules/auth.js      Đăng nhập, đăng ký, phiên phía server
server/modules/catalog.js   Công ty, cửa hàng, danh mục, nhân viên
server/modules/inventory.js Tồn kho, yêu cầu bổ sung, điều chuyển
server/modules/sales.js     Đơn, hóa đơn, thanh toán, hoa hồng, hủy/trả
server/modules/promotions.js Khuyến mãi và kiểm tra điều kiện
server/modules/reporting.js Dashboard, báo cáo, hoa hồng, nhật ký
web/                        Giao diện chạy thực tế
scripts/                    Setup, migration, kiểm tra
schema.sql + schema-v2.sql  Lược đồ MySQL
```

Các file HTML/JS/CSS demo cũ ở thư mục gốc được giữ để tham khảo, không được phục vụ bởi server v2. `index1.html` đã bị xóa trước đợt cập nhật này và không được khôi phục. `sessionStorage` chỉ lưu giỏ nháp và lựa chọn cửa hàng; phiên đăng nhập, đơn hàng, tồn kho, thanh toán và quyền đều do backend quản lý.

## Vận hành và giới hạn

Ứng dụng hiện dành cho chạy đồ án cục bộ. Dùng `DB_USER=se_app` với quyền dữ liệu riêng database; chỉ `db:setup` cần tài khoản quản trị. `.env` bị chặn truy cập qua HTTP và được Git bỏ qua. Phiên dùng cookie HttpOnly/SameSite Strict, mật khẩu băm scrypt, câu SQL có tham số, API ghi kiểm tra nguồn và `X-Requested-With: SE`, giao diện escape dữ liệu và có CSP.

Trước khi triển khai công khai cần cấu hình HTTPS và `COOKIE_SECURE=true`, chính sách tài khoản thực, sao lưu/khôi phục, giám sát, hạn mức và tiêu chí hiệu năng. Chưa có tích hợp thanh toán/vận chuyển thật, hoàn tiền một phần, điểm thưởng/tự xếp hạng, lương, đối soát kế toán, serial từng thiết bị hoặc mua hàng nhà cung cấp. Các danh sách nghiệp vụ hiển thị tối đa 200 bản ghi gần nhất; báo cáo tổng hợp tính trên toàn bộ dữ liệu trong khoảng ngày.
