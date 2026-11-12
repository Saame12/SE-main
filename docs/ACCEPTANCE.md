# Nghiệm thu phiên bản 2.0

## Kết quả kiểm tra

Ngày thực hiện: 12/11/2026. Môi trường: Node.js 24.20.0, MySQL Community 8.0.46; Microsoft Edge headless qua Playwright. Database kiểm thử độc lập `se_test_<timestamp>` được tạo, seed và dọn dẹp mỗi lần; database `se_store` không nhận dữ liệu đơn hàng của kiểm thử.

Bộ tự động gồm 23 bài tích hợp và 8 kịch bản trình duyệt. Chạy lại bằng `npm.cmd test`. Ảnh desktop/mobile ở `.runtime/qa/`; ảnh không chứa mật khẩu và không được đưa lên Git. Kiểm tra cú pháp bằng `npm.cmd run check`.

### Nhóm kiểm tra tích hợp

1. Health, asset tĩnh, chặn .env/server/schema, yêu cầu xác thực và header chống CSRF.
2. Đăng nhập đủ năm vai trò, cookie HttpOnly, không trả password_hash.
3. Đăng ký chỉ customer, tên trùng bị từ chối.
4. Giới hạn cửa hàng/role, không lộ giá vốn cho khách.
5. Tạo cửa hàng và khởi tạo inventory bằng 0.
6. Mã giảm giới hạn cửa hàng; manager không thể tạo phạm vi toàn công ty.
7. Giá từ server, giữ tồn, idempotency khi gửi lại.
8. Prepaid không confirm trước verify, không gán nhân viên cửa hàng khác.
9. Received/finished đúng thứ tự, hoa hồng không ghi hai lần.
10. COD không thu trước received, không finish trước thu tiền.
11. Hóa đơn offline, thanh toán, tồn kho và hoa hồng nguyên tử.
12. Một dòng thiếu hàng rollback toàn bộ các dòng và đơn.
13. Hai yêu cầu mua đơn vị cuối chỉ một yêu cầu thành công.
14. Bổ sung kho đúng người, đúng bước, nhận lặp không tăng tồn.
15. Hủy trả lượng giữ hàng một lần.
16. Trả toàn bộ hàng, refund mô phỏng, reverse commission trong một transaction.
17. Báo cáo loại đơn trả, cô lập cửa hàng/cá nhân, có audit.
18. Đăng xuất vô hiệu token phía server.
19. CRUD danh mục, trạng thái sản phẩm và tồn khởi tạo sản phẩm mới.
20. Manager không nâng quyền nhân viên hoặc đổi store, ngày báo cáo sai và Origin khác bị từ chối.

### Nhóm kiểm tra trình duyệt

1. Khách tìm sản phẩm, thêm giỏ, đăng nhập, đặt COD và xem đơn đã lưu.
2. Quản lý dùng đúng các nút để confirm → assign → received → verify COD → finish.
3. Menu quản lý, tạo bổ sung kho, tạo khuyến mãi, tạo nhân viên và dữ liệu xuất hiện sau lưu.
4. Menu HQ/kho/nhân viên; nhân viên lập hóa đơn và xem chi tiết đã lưu.
5. Desktop 1440px/mobile 390px không tràn viewport; không có lỗi JavaScript/CSP.

## Kịch bản trình diễn trực tiếp

### Chuẩn bị

Bật MySQL80, chạy `npm.cmd run db:setup`, mở http://127.0.0.1:3308. Dùng mật khẩu ở DEMO_PASSWORD trong .env. Các tài khoản seed không tự đặt lại mật khẩu khi chạy setup lần hai.

### Luồng A — Bổ sung hàng

1. Đăng nhập manager, xem Tồn kho và tạo yêu cầu bổ sung cho sản phẩm cần nhập.
2. Đăng xuất, đăng nhập hq, Điều phối bổ sung → Duyệt.
3. Đăng nhập warehouse, Xuất hàng điều chuyển → Xuất kho.
4. Đăng nhập manager, Yêu cầu bổ sung → Đã nhận đủ.
5. Xem số lượng tồn thay đổi ở đúng cửa hàng; lần bấm nhận thứ hai bị server từ chối.

### Luồng B — Đơn online COD

1. Đăng nhập customer, chọn cửa hàng Sài Gòn, thêm sản phẩm còn hàng; chọn pickup hoặc delivery, COD.
2. Đăng nhập manager, mở đơn mới; xác nhận và phân công employee.
3. Đăng nhập employee, xem Đơn được phân công và ghi tiến độ.
4. Manager ghi khách đã nhận hàng với bằng chứng mô phỏng.
5. Thử Hoàn tất trước xác minh thanh toán: bị từ chối.
6. Xác minh thu COD với tham chiếu, rồi Hoàn tất.
7. Employee xem Hoa hồng, manager xem Báo cáo.

### Luồng C — Trả trước bằng thẻ/QR

1. Customer tạo đơn card/qr.
2. Manager thử xác nhận trước thanh toán: bị từ chối.
3. Manager xác minh thanh toán mô phỏng rồi xử lý như luồng B.

### Luồng D — Offline và hủy/trả

1. Employee lập hóa đơn với số lượng còn hàng; tick xác nhận thu đủ tiền; xem/in hóa đơn.
2. Customer gửi yêu cầu trả cho đơn online đã finished, nhập lý do.
3. Manager mở Hủy & trả hàng, chấp thuận sau khi xác nhận đã kiểm tra và nhận đủ hàng có thể bán.
4. Kiểm tra order returned, payment refunded, inventory tăng và commission reversed; báo cáo loại doanh số đơn đã trả.
5. Với đơn new/confirmed, tạo yêu cầu hủy và xử lý; kiểm tra lượng giữ hàng được trả một lần.

## Giới hạn đánh giá

Các kiểm tra xác nhận chức năng bản đồ án cục bộ, không thay thế chứng nhận bảo mật hay kiểm thử tải. Nguồn chưa có SLA, bộ test chấp nhận của giảng viên hoặc quy tắc tích hợp thật. Các quy ước ở DECISIONS.md cần được rà soát trước khi sử dụng nghiệp vụ thật.

## Hồi quy đăng nhập theo cổng

- API kiểm tra role trước khi cấp phiên, mật khẩu sai không tiết lộ cổng tài khoản.
- Đăng nhập thành công thay thế phiên cũ, không để token cũ tiếp tục hoạt động.
- Bốn cổng nhân sự có tiêu đề/form riêng, không hiện giao diện khách khi chưa đăng nhập; kiểm tra cả mobile.
- Sai role hiển thị lỗi và liên kết đúng; đã có phiên mà mở nhầm URL giữ nguyên địa chỉ, hiển thị thông báo cần mở đúng cổng. Chỉ chuyển trang khi người dùng bấm liên kết.
- Đăng xuất/hết phiên trở về form tại URL đang mở; đổi phiên ở tab khác được phát hiện khi quay lại tab và chỉ hiển thị thông báo nếu sai vai trò, không tự chuyển trang.
- Toàn bộ 30 kiểm thử đạt sau thay đổi; các luồng bán hàng hiện có tiếp tục đạt.

## Kiểm tra bộ dữ liệu demo

Kiểm thử tích hợp bổ sung cho seed DEMO xác nhận 10 sản phẩm/12 đơn/3 ưu đãi/5 bổ sung, tồn kho bằng tổng stock_movements, commission và payment hợp lệ, chạy lại không tạo trùng hoặc reset thao tác thử và sản phẩm cũ không bị ảnh hưởng. Toàn bộ 23 kiểm thử tích hợp đạt sau khi thêm seed.

## Hồi quy không tự chuyển cổng

8 kiểm thử trình duyệt đã đạt sau thay đổi: sai mật khẩu/role không điều hướng; mở sai cổng khi đã đăng nhập hoặc đổi tài khoản ở tab khác vẫn giữ URL và chỉ hiện thông báo/liên kết; tải lại không tự chuyển; người dùng chủ động mở liên kết hoặc đăng xuất để đổi tài khoản.
