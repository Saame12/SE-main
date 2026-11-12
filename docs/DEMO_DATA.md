# Dữ liệu mẫu để thử ứng dụng

Bộ dữ liệu được nạp bằng `npm.cmd run db:seed` sau `npm.cmd run db:setup`. Tất cả sản phẩm mới có SKU `DEMO-`, tên có `[DEMO]`; mã đơn/yêu cầu cũng có `DEMO-`. Không có giao dịch hoặc thông tin thanh toán thật.

## Tài khoản

Các tài khoản hq, warehouse, manager, employee, manager2, employee2, customer giữ nguyên. Mật khẩu của tài khoản cũ không bị đặt lại. Ba tài khoản khách mới `demo.an`, `demo.binh`, `demo.chi` dùng giá trị `DEMO_PASSWORD` trong `.env` tại lúc nạp seed; không đưa mật khẩu lên Git. Hạng thành viên của ba khách được gán sẵn để minh họa, không có thuật toán tự nâng hạng.

| Cổng | Tài khoản | Dữ liệu nên thử |
| --- | --- | --- |
| /admin.html | hq | Danh mục có nhãn DEMO, báo cáo hai cửa hàng, duyệt DEMO-BS-001 |
| /warehouse.html | warehouse | Xuất yêu cầu DEMO-BS-002 đã được duyệt; xem lịch sử biến động |
| /manager.html | manager | Đơn Sài Gòn, xác minh QR, phân công, COD, yêu cầu hủy/trả |
| /employee.html | employee | Đơn DEMO-DH-003 và DEMO-DH-004 đã phân công, hóa đơn và hoa hồng |
| /manager.html | manager2 | Đơn/khuyến mãi/dữ liệu riêng Hà Nội |
| /employee.html | employee2 | DEMO-DH-011 được giao và hóa đơn DEMO-HD-012 |
| /shop | customer | Đơn của tôi có new/received/finished và yêu cầu hỗ trợ |

## Đơn hàng mẫu

| Mã | Cửa hàng | Trạng thái / Thanh toán | Cách thử tiếp |
| --- | --- | --- | --- |
| DEMO-DH-001 | Sài Gòn | Mới tạo / COD chưa thu | Manager xác nhận, phân công employee rồi xử lý |
| DEMO-DH-002 | Sài Gòn | Mới tạo / QR chờ xác minh | Thử xác nhận sẽ bị chặn; xác minh tiền trước khi xác nhận |
| DEMO-DH-003 | Sài Gòn | Đã xác nhận / Card đã thu | Employee ghi tiến độ; manager ghi nhận nhận hàng và hoàn tất |
| DEMO-DH-004 | Sài Gòn | Đã nhận hàng / COD chưa thu | Thử hoàn tất bị chặn; xác minh COD rồi hoàn tất |
| DEMO-DH-005 | Sài Gòn | Hoàn tất / Đã thu, mã DEMO10 | Xem báo cáo và hoa hồng |
| DEMO-HD-006 | Sài Gòn | Offline hoàn tất / Tiền mặt | Employee mở chi tiết và in hóa đơn |
| DEMO-DH-007 | Sài Gòn | Mới tạo / Có yêu cầu hủy chờ xử lý | Manager mở Hủy & trả hàng, duyệt/từ chối |
| DEMO-DH-008 | Sài Gòn | Hoàn tất / Có yêu cầu trả chờ xử lý | Manager kiểm tra nhận hàng trả và xử lý |
| DEMO-DH-009 | Sài Gòn | Đã hủy | Kiểm tra lịch sử, tồn đã được trả lại |
| DEMO-DH-010 | Sài Gòn | Đã trả / Hoàn tiền mô phỏng | Xem commission reversed; đơn bị loại khỏi doanh số hoàn tất |
| DEMO-DH-011 | Hà Nội | Đã xác nhận / COD chưa thu | Employee2 xử lý, manager2 nhận/thu/hoàn tất |
| DEMO-HD-012 | Hà Nội | Offline hoàn tất / Tiền mặt | Xem báo cáo riêng Hà Nội và hoa hồng employee2 |

Dữ liệu hoàn tất được đặt vào vài ngày gần nhất để biểu đồ có số liệu. Doanh số/hoa hồng còn phụ thuộc tỷ lệ cấu hình của cửa hàng tại thời điểm nạp. Script không thay đổi tỷ lệ đang dùng.

## Bổ sung kho

| Mã | Trạng thái khởi tạo | Vai trò thao tác tiếp |
| --- | --- | --- |
| DEMO-BS-001 | Đã gửi | HQ duyệt hoặc từ chối |
| DEMO-BS-002 | Đã duyệt | Warehouse xuất hàng |
| DEMO-BS-003 | Đã xuất kho | Manager Sài Gòn xác nhận nhận đủ |
| DEMO-BS-004 | Đã nhận đủ | Xem lịch sử, thử nhận lặp sẽ bị chặn |
| DEMO-BS-005 | Từ chối | Manager2 xem yêu cầu kết thúc |

## Khuyến mãi và tồn kho

- `DEMO10`: mọi cửa hàng, online/offline; giảm 10%, đơn từ 100.000đ, tối đa 500.000đ.
- `DEMOHCM200`: riêng Sài Gòn, giảm 200.000đ cho đơn từ 2.000.000đ.
- `DEMOHN5`: riêng Hà Nội, chỉ online, giảm 5%, đơn từ 1.000.000đ, tối đa 300.000đ.
- `DEMO-RAM16` tại Sài Gòn có tồn thấp; `DEMO-SSD512` tại Sài Gòn hết hàng; `DEMO-GPU4060` tại Hà Nội hết hàng. Có thể thử cảnh báo/bổ sung/chọn cửa hàng khác.
- Tồn ban đầu, giữ hàng, hủy/trả và điều chuyển đều có stock_movements tương ứng. Chỉ sản phẩm mới trong bộ DEMO nhận các biến động này; sản phẩm có sẵn không bị sửa.

## Chạy lại và bảo toàn dữ liệu

Toàn bộ bộ seed chạy trong một transaction, có khóa chống chạy đồng thời và marker `demo-data-v1` trong schema_migrations. Chạy lại giữ nguyên dữ liệu và các bước bạn đã thử, không tạo thêm đơn hoặc reset trạng thái. Nếu có mã DEMO trùng trước lần nạp đầu, script từ chối thay vì ghi đè.

Không tự xóa marker để reset. Muốn thử lại bộ dữ liệu từ đầu, nên dùng một database riêng với `.env` tương ứng, chạy setup và seed tại đó. Bộ kiểm thử tích hợp đã kiểm tra số lượng bản ghi, tính khớp tồn kho/biến động, trạng thái thanh toán/hoa hồng, tính lặp an toàn và việc giữ nguyên dữ liệu cũ.
