# Quyết định triển khai cho bản đồ án

Các quyết định dưới đây được chọn để phiên bản học thuật chạy trọn luồng. Chúng bổ sung các chỗ còn bỏ ngỏ ở mục 11 báo cáo và mục 3 Diagram_Notes.txt, chưa phải quyết định nghiệp vụ đã được chủ nhiệm đồ án phê duyệt.

| Nội dung | Quy ước triển khai 2.0 |
| --- | --- |
| Stack | Node.js 24, Express 5, MySQL 8; modular monolith, một API và DB tập trung; web 3308, MySQL 3306 |
| Tổ chức | Một công ty, một kho trung tâm (location 1), hai cửa hàng seed; thêm cửa hàng được tạo tồn kho ban đầu bằng 0 |
| Tồn khả dụng | Bảng inventory lưu lượng có thể bán. Khi tạo đơn online, trừ khả dụng ngay như giữ hàng; khi bán offline trừ và hoàn tất cùng transaction. Không trừ lại lúc confirm/finish. Hủy/trả được duyệt trả lượng này một lần |
| Đơn bỏ dở | Đơn mới được giữ hàng cho đến khi quản lý xử lý/hủy; chưa có timeout tự động. Không tự giải phóng trong khi khách có thể đang chuyển tiền |
| Bổ sung | Quản lý tạo; HQ approve/reject; kho/HQ ship; quản lý đúng cửa hàng receive. Ship trừ kho trung tâm, receive tăng cửa hàng. Số lượng đang vận chuyển nằm trong restock_items với trạng thái shipped |
| Thiếu hàng | Từ chối toàn bộ giao dịch; chưa có chia đợt, xuất thiếu hoặc thay thế mặt hàng |
| Nhận hàng | Cả pickup/delivery phải qua confirmed → received → finished; received yêu cầu ghi chú bằng chứng mô phỏng của quản lý |
| Offline | Nhân viên/quản lý phải tick xác nhận đã thu đủ tiền; hóa đơn tạo trực tiếp ở finished với payment verified |
| Thanh toán | Không tích hợp thật; quản lý ghi tham chiếu xác minh card/QR; COD chỉ xác nhận thu sau received. Không lưu số thẻ/thông tin ngân hàng |
| Hoa hồng | Tỷ lệ theo cửa hàng, do HQ cấu hình bằng basis points; seed 100 bps = 1% là dữ liệu demo. Cửa hàng mới mặc định 0. Snapshot khi tạo đơn; amount = floor(total × bps / 10000). Không tính lương/chi trả |
| Phân công lại | Không hỗ trợ chuyển nhân viên sau lần gán đầu; gán lại chính người đó được coi là không đổi |
| Khuyến mãi | Một mã/đơn, không stacking; percent/fixed, thời gian hiệu lực, min_total, max_discount, channel, store scope. Giảm không vượt subtotal; làm tròn xuống VND. Không có hạn mức lượt dùng trong phiên bản này |
| Hủy | Khách hoặc quản lý tạo yêu cầu khi new/confirmed; quản lý cùng cửa hàng approve/reject. Không tự coi yêu cầu là đơn đã hủy |
| Trả | Chỉ yêu cầu sau finished; chỉ trả toàn bộ đơn; quản lý xác nhận đã nhận/kiểm tra hàng có thể bán. Duyệt cập nhật order returned, restock toàn bộ, payment verified→refunded (mô phỏng), commission earned→reversed. Không có hoàn tiền một phần, hàng hỏng hoặc quy trình bảo hành |
| Báo cáo | Doanh số là tổng total sau giảm của các đơn hiện ở finished, lọc theo finished_at. Đơn đã trả bị loại cả ở kỳ gốc; không phải sổ kế toán hoặc báo cáo hoàn tiền theo ngày phát sinh. Số đơn theo trạng thái lọc created_at; tồn kho là ảnh chụp hiện tại |
| Hạng thành viên | Hiển thị trường membership có sẵn; không tự tính hạng hay điểm thưởng |
| Nhân sự | HQ tạo mọi vai trò nhân viên; manager chỉ tạo/sửa/khóa employee cùng cửa hàng. Không tự sửa/khóa tài khoản đang đăng nhập; không chuyển nhân viên giữa cửa hàng trong phiên bản này |
| Phạm vi sản phẩm | Metadata có cờ serial nhưng chưa quản lý từng số serial hoặc bảo hành thiết bị. Mua hàng nhà cung cấp/đối soát kho chi tiết thuộc phần hoãn trong báo cáo |

Nếu các quyết định trên được thay đổi sau buổi rà soát, cần cập nhật đồng thời máy trạng thái, schema/API, kiểm thử và tài liệu đối chiếu.
