# Đối chiếu tài liệu yêu cầu và phiên bản 2.0

## Đánh giá thư mục báo cáo

Đã đọc `Project_Report.docx`, `Diagram_Notes.txt` và kiểm tra 5 hình PNG: kiến trúc, BFD mức 2, DFD mức 0, DFD mức 1, use case. Thư mục đủ để xác định phạm vi chức năng cấp cửa hàng và kiến trúc đích. Tài liệu **chưa phải đặc tả hoàn chỉnh đã chốt**: báo cáo có trạng thái Bản nháp 1.0; mục 11 và ghi chú sơ đồ liệt kê nhiều quyết định tạm hoãn.

Trong thư mục gốc chưa có ERD vật lý, sơ đồ lớp, activity/sequence, đặc tả chi tiết ca sử dụng, tiêu chí nghiệm thu định lượng hay kết quả kiểm thử. Phiên bản này bổ sung tài liệu thiết kế và nghiệm thu trong `docs/`, đồng thời lưu các quy ước cần thiết ở `DECISIONS.md`. Không sửa nội dung báo cáo Word hoặc các sơ đồ gốc.

## Ma trận chức năng chính

| Yêu cầu | Hiện thực | Bằng chứng kiểm tra |
| --- | --- | --- |
| FR-01 Dashboard cửa hàng | Dashboard theo store_id từ phiên; doanh số hoàn tất, đơn, tồn kho, hiệu suất; khuyến mãi ở màn hình riêng | API reports; kiểm thử phạm vi; UI manager |
| FR-02 Tồn kho | inventory theo địa điểm, tìm/lọc, số lượng khả dụng, ngưỡng, cảnh báo và tạo bổ sung | UI inventory; kiểm thử tranh chấp và rollback |
| FR-03 Bổ sung hàng | submitted → approved → shipped → received; trụ sở duyệt, kho xuất, cửa hàng nhận | Integration restock; UI tạo yêu cầu |
| FR-04 Nhân viên | Tạo/sửa/khóa nhân viên theo phạm vi, xem doanh số và hoa hồng | Integration RBAC; UI tạo nhân viên |
| FR-05 Đơn online | Danh sách/chi tiết, xác nhận, phân công cùng cửa hàng, tiến độ, nhận, thanh toán và hoàn tất | Integration prepaid/COD; UI COD toàn trình |
| FR-06 Khuyến mãi | Trụ sở all/selected; quản lý chỉ cửa hàng mình; hiệu lực, điều kiện, kênh | Integration scope; UI tạo chương trình |
| FR-07 Hóa đơn offline | Chọn hàng, giá server, kiểm tra tồn, xác nhận thu tiền, hoàn tất, in | Integration atomic invoice; UI lập hóa đơn |
| FR-08 Hoa hồng | Snapshot tỷ lệ; một bản ghi/đơn hoàn tất; cá nhân chỉ xem chính mình; giữ lịch sử đảo | Integration commission; màn hình commissions |
| FR-09 Báo cáo | Theo cửa hàng/toàn công ty/cá nhân; online/offline, đơn hoàn tất, tồn, nhân viên, hoa hồng, mã giảm; CSV | Integration reports; UI report/filter |

## Quy tắc nghiệp vụ

| Nhóm | Quy tắc được thực thi |
| --- | --- |
| BR-001–006 | Một kho trung tâm, nhiều cửa hàng, danh mục chung, tồn riêng, trụ sở quản lý toàn công ty, quản lý giới hạn cửa hàng |
| BR-007–012 | Nguồn bổ sung từ kho trung tâm, quản lý tạo yêu cầu, trụ sở duyệt/điều phối, chỉ xuất sau duyệt, kiểm tra đủ tồn khi khách đặt |
| BR-013–016 | Hóa đơn offline gắn cửa hàng và người tạo; hoa hồng phát sinh sau hoàn tất |
| BR-017–025 | Khách đăng nhập đặt online, chọn cửa hàng/nhận hàng, quản lý nhận và phân công; nhân viên cùng cửa hàng gắn giao dịch |
| BR-026–031 | Card/QR/COD; thanh toán lưu riêng; prepaid xác minh trước confirm; COD phải received và thu tiền trước finished |
| BR-032–037 | Phạm vi toàn bộ/cửa hàng chọn/cửa hàng riêng; kiểm tra hiệu lực và kênh cả online/offline |
| BR-038–042 | Hoa hồng offline/online theo người phụ trách; một lần sau finished; nhân viên chỉ xem cá nhân |
| BR-043–044 | Yêu cầu hủy/trả được quản lý xét; trạng thái yêu cầu riêng với trạng thái đơn; hoàn tiền mô phỏng và đảo tác động trong giao dịch |

Các chi tiết chưa chốt trong nguồn như thời điểm giữ hàng, phê duyệt, trả hàng và công thức báo cáo dùng quy ước demo được công bố riêng. Ma trận này không biến các quy ước đó thành yêu cầu đã xác nhận.

## Ca sử dụng và năm nhóm giao diện

| Mã UC | Giao diện/hiện thực |
| --- | --- |
| UC01–03 | HQ: Công ty & cửa hàng, Danh mục sản phẩm, Nhân viên |
| UC04–06 | HQ: Khuyến mãi, Điều phối bổ sung, Báo cáo toàn công ty |
| UC07–09 | Kho: Tồn kho trung tâm, Xuất hàng điều chuyển, Biến động tồn kho |
| UC10–13 | Quản lý: Tổng quan/Báo cáo, Tồn kho, Yêu cầu bổ sung, Nhân viên & hoa hồng |
| UC14–17 | Quản lý: Đơn hàng, phân công, nhận/hoàn tất, thanh toán, Khuyến mãi |
| UC18–21 | Nhân viên: Tồn kho, Lập hóa đơn, Đơn được phân công, Hiệu suất/Hoa hồng cá nhân |
| UC22–25 | Khách: Sản phẩm/khuyến mãi theo cửa hàng, Giỏ hàng/Đặt hàng, Đơn của tôi |
| UC26–28 | Khách: Yêu cầu hủy, Yêu cầu trả, Tài khoản/hạng thành viên đã lưu |

## Yêu cầu phi chức năng

- Xác thực và quyền được kiểm tra ở API, không phụ thuộc menu hay role gửi từ trình duyệt.
- Bán hàng/điều chuyển/hủy-trả dùng transaction InnoDB; khóa dòng theo thứ tự product_id và kiểm tra tồn trước cập nhật.
- Bản ghi audit nằm trong cùng giao dịch với thay đổi nghiệp vụ. Gửi lặp đơn sử dụng idempotency key; các bước trạng thái kiểm tra lại trong khóa.
- Mật khẩu scrypt có salt, token ngẫu nhiên lưu dạng hash trong database, cookie HttpOnly/SameSite Strict, chặn CSRF và CSP.
- Kiểm thử tích hợp/database tạm và Edge headless có thể chạy lại; kiểm tra desktop 1440px và mobile 390px.
- Không tuyên bố SLA/hiệu năng định lượng hoặc sẵn sàng vận hành công khai vì nguồn chưa có tiêu chí đó.
