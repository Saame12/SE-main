# 28 ca sử dụng của mô hình mục tiêu

Các ca sử dụng dưới đây đối chiếu với 05_Use_Case_Diagram.png. Điều kiện chung: phiên hợp lệ, tài khoản hoạt động; API kiểm tra vai trò và phạm vi cửa hàng. Mọi lỗi nghiệp vụ không để lại giao dịch dở dang. Các bước triển khai bổ sung so với báo cáo nháp tuân theo DECISIONS.md.

| UC | Mục tiêu / tác nhân | Luồng chính và hậu điều kiện | Ngoại lệ chính |
| --- | --- | --- | --- |
| 01 | Công ty/cửa hàng — HQ | Xem tổ chức; cập nhật công ty; tạo/sửa/tạm dừng cửa hàng; thêm inventory bằng 0 cho cửa hàng mới | Trùng mã, dữ liệu sai, role khác bị từ chối |
| 02 | Danh mục chung — HQ | Tạo/sửa sản phẩm, loại và thương hiệu; dùng chung mọi cửa hàng | SKU/mã trùng, liên kết không tồn tại; không xóa lịch sử |
| 03 | Nhân sự toàn công ty — HQ | Xem danh sách; tạo tài khoản nhân viên; sửa hồ sơ/khóa/đổi mật khẩu người khác | Không tự sửa/khóa tài khoản đang đăng nhập |
| 04 | Khuyến mãi trụ sở — HQ | Nhập điều kiện và phạm vi all/selected; chọn cửa hàng; bật/tạm dừng | Ngày, mức giảm, cửa hàng sai bị từ chối |
| 05 | Điều phối bổ sung — HQ | Xem submitted; duyệt hoặc từ chối; cho kho chuẩn bị xuất | Bước đã xử lý không lặp; không tự tăng tồn cửa hàng |
| 06 | Báo cáo toàn công ty — HQ | Chọn kỳ/phạm vi; xem tổng hợp và CSV | Khoảng ngày sai bị từ chối; công thức được công bố |
| 07 | Tồn kho trung tâm — warehouse/HQ | Xem sản phẩm, tồn, ngưỡng; tra biến động; HQ chọn địa điểm | Warehouse không truy cập tồn cửa hàng khác |
| 08 | Xử lý bổ sung — warehouse | Xem yêu cầu đã duyệt, kiểm tra đủ tồn và chuẩn bị xuất | Chưa duyệt hoặc thiếu hàng không xuất |
| 09 | Ghi nhận điều chuyển — warehouse/HQ | Ship trừ tồn trung tâm, ghi movements và audit; chờ cửa hàng receive | Ship lặp bị từ chối; thiếu một dòng rollback toàn bộ |
| 10 | Dashboard/báo cáo cửa hàng — manager | Xem đơn, doanh số, hiệu suất, tồn theo cửa hàng trong phiên | Không sửa store_id để xem cửa hàng khác |
| 11 | Tồn kho cửa hàng — manager | Tìm/lọc; xem khả dụng, cảnh báo; sửa ngưỡng | Không sửa tồn số lượng trực tiếp bằng quyền manager |
| 12 | Bổ sung hàng — manager | Chọn dòng/số lượng; gửi yêu cầu lên HQ; theo dõi; xác nhận nhận đủ khi shipped | Nhận sai cửa hàng/bước hoặc nhận lặp bị chặn |
| 13 | Nhân viên/hoa hồng cửa hàng — manager | Xem hiệu suất, hoa hồng; tạo/sửa/khóa employee trong phạm vi | Không tạo HQ hoặc employee cửa hàng khác |
| 14 | Xác nhận đơn online — manager | Mở new; kiểm tra prepaid; confirm nếu phù hợp | Card/QR pending không được confirm |
| 15 | Phân công đơn — manager | Chọn employee active cùng store; gắn vào new/confirmed | Không giao người khác store hoặc phân công lại người khác |
| 16 | Nhận và hoàn tất — manager | Ghi evidence để received; xác nhận thu đủ để finish; tạo commission | Thiếu employee, sai thứ tự, chưa thu tiền bị từ chối |
| 17 | Khuyến mãi cửa hàng — manager | Xem all/selected dành cho store; tạo ưu đãi riêng; tạm dừng mã do store sở hữu | Không sửa mã HQ hoặc phạm vi store khác |
| 18 | Sản phẩm/tồn — employee | Xem danh mục và lượng khả dụng tại store trong phiên | Không truy cập inventory store khác hoặc giá vốn |
| 19 | Hóa đơn offline — employee | Chọn dòng/số lượng/mã giảm; xác nhận thu; lưu finished/payment/stock/commission; in | Thiếu hàng hoặc thiếu xác nhận thu không tạo hóa đơn |
| 20 | Đơn được giao — employee | Xem chi tiết đơn đã được giao; ghi tiến độ xử lý | Không xem/sửa đơn chưa được giao; không tự verify/finish |
| 21 | Doanh số/hoa hồng cá nhân — employee | Dashboard cá nhân; lịch sử earned/reversed, kênh, tỷ lệ và tiền | Không đổi employee_id để xem đồng nghiệp |
| 22 | Sản phẩm/khuyến mãi — customer/khách vãng lai | Chọn cửa hàng; duyệt/tìm/lọc; xem ưu đãi đang hiệu lực | Ngừng bán không có trong danh mục khách |
| 23 | Tồn theo cửa hàng — customer/khách vãng lai | Đổi cửa hàng; xem available cho từng mặt hàng | Thiếu hàng khi lưu được server kiểm tra lại; gợi ý đổi cửa hàng |
| 24 | Đặt online — customer | Giỏ hàng; người nhận; chọn store/fulfillment/payment; POST idempotent; giữ hàng và tạo new | Không dùng giá client; thiếu tồn rollback; chưa login cần đăng nhập |
| 25 | Theo dõi đơn — customer | Xem danh sách/chi tiết đơn mình; trạng thái đơn và payment riêng | Không tra đơn của người khác bằng ID |
| 26 | Yêu cầu hủy — customer | New/confirmed: nhập lý do, lưu pending; manager xét riêng | Gửi yêu cầu không tự hủy; không có hai pending cùng đơn |
| 27 | Yêu cầu trả — customer | Finished: nhập lý do; manager kiểm tra và xử lý toàn bộ; xem kết quả | Chưa finished hoặc pending khác bị từ chối; refund mô phỏng |
| 28 | Hạng thành viên — customer | Mở Tài khoản; xem name/phone/membership đã lưu | Không tự thêm thuật toán tích điểm hoặc nâng hạng |
