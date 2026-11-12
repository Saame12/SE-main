# Kiến trúc và thiết kế phiên bản 2.0

## Kiến trúc ứng dụng

```mermaid
flowchart TD
  UI[5 không gian giao diện web] --> API[Express API]
  API --> AUTH[Xác thực phiên và RBAC theo cửa hàng]
  AUTH --> CAT[Catalog và tổ chức]
  AUTH --> INV[Tồn kho và điều chuyển]
  AUTH --> SALE[Bán hàng và thanh toán]
  AUTH --> PROMO[Khuyến mãi]
  AUTH --> REPORT[Báo cáo]
  CAT & INV & SALE & PROMO & REPORT --> DB[(MySQL tập trung)]
  SALE --> TX[Transaction và khóa dòng]
  INV --> TX
  TX --> DB
```

Backend không tin giá, tổng tiền, role hoặc store_id của nhân viên do client tự khai. Role và phạm vi được tải từ session; các tuyến nhạy cảm kiểm tra lại quyền trên đối tượng. API chỉ cho khách xem đơn của họ, nhân viên xem đơn được phân công, quản lý xem cửa hàng được cấp quyền, HQ xem tổng thể. Nhà kho chỉ có nghiệp vụ kho trung tâm.

## ERD cốt lõi

```mermaid
erDiagram
 LOCATIONS ||--o{ INVENTORY : owns
 PRODUCTS ||--o{ INVENTORY : stocked
 CATEGORIES ||--o{ PRODUCTS : contains
 BRANDS ||--o{ PRODUCTS : manufactures
 LOCATIONS ||--o{ USERS : employs
 USERS ||--o{ SESSIONS : authenticates
 USERS ||--o{ ORDERS : customer_or_employee
 LOCATIONS ||--o{ ORDERS : handles
 ORDERS ||--|{ ORDER_ITEMS : contains
 PRODUCTS ||--o{ ORDER_ITEMS : snapshot
 ORDERS ||--|| PAYMENTS : paid_by
 ORDERS ||--o| COMMISSIONS : earns
 USERS ||--o{ COMMISSIONS : receives
 PROMOTIONS ||--o{ ORDERS : discounts
 PROMOTIONS ||--o{ PROMOTION_STORES : targets
 LOCATIONS ||--o{ PROMOTION_STORES : eligible
 LOCATIONS ||--o{ RESTOCK_REQUESTS : requests
 RESTOCK_REQUESTS ||--|{ RESTOCK_ITEMS : contains
 PRODUCTS ||--o{ RESTOCK_ITEMS : requested
 LOCATIONS ||--o{ STOCK_MOVEMENTS : tracks
 PRODUCTS ||--o{ STOCK_MOVEMENTS : changes
 ORDERS ||--o{ ORDER_REQUESTS : cancellation_or_return
 USERS ||--o{ AUDIT_LOGS : acts
```

Một hóa đơn offline được biểu diễn bằng order.channel=offline, code HD, status finished, payment verified. Đơn online code DH dùng cùng cấu trúc line items; không tạo hai nguồn doanh số. Tồn kho và biến động tách theo location. Thanh toán tách khỏi trạng thái đơn. UNIQUE(order_id) ở commissions ngăn ghi hoa hồng lặp. UNIQUE(created_by,idempotency_key) ở orders ngăn tạo đơn lặp.

Lược đồ vật lý đầy đủ: `database/schema.sql` và `database/schema-v2.sql`. `schema_migrations` đánh dấu khởi tạo v2. Các cột stock/min_stock cũ trong products chỉ làm nguồn seed lần đầu, không cập nhật khi vận hành.

## Máy trạng thái đơn và thanh toán

```mermaid
stateDiagram-v2
 [*] --> new: Khách tạo online và giữ hàng
 new --> confirmed: Quản lý xác nhận và kiểm tra prepaid
 confirmed --> received: Có nhân viên và bằng chứng nhận hàng
 received --> finished: Payment verified và ghi hoa hồng
 new --> cancelled: Duyệt yêu cầu hủy
 confirmed --> cancelled: Duyệt yêu cầu hủy
 finished --> returned: Duyệt trả toàn bộ
 finished --> [*]
```

Payment dùng pending/verified/refunded. COD có thể confirmed khi pending, nhưng verify chỉ sau received. Card/QR phải verified trước confirmed. Hóa đơn offline tạo thẳng finished và verified sau xác nhận thu đủ. Đơn trả hàng giữ lịch sử, không xóa giao dịch.

## Sequence bán hàng online

```mermaid
sequenceDiagram
 actor C as Khách hàng
 participant W as Web
 participant A as Sales API
 participant D as MySQL
 actor M as Quản lý
 C->>W: Chọn cửa hàng, sản phẩm, hình thức nhận
 W->>A: POST orders với idempotency_key
 A->>D: BEGIN, khóa người tạo, tra key cũ
 A->>D: Đọc giá, kiểm tra promotion
 A->>D: Khóa inventory theo product_id, trừ khả dụng
 A->>D: Ghi orders, items, payment pending, audit
 A->>D: COMMIT
 A-->>W: Mã đơn
 M->>A: Xác minh prepaid hoặc xác nhận COD
 M->>A: Phân công nhân viên cùng cửa hàng
 M->>A: Ghi nhận received với bằng chứng
 M->>A: Xác minh COD nếu cần, finish
 A->>D: Khóa order/payment, kiểm tra trạng thái
 A->>D: Ghi commission một lần, finish, audit, COMMIT
```

## Activity bổ sung kho

```mermaid
flowchart TD
 A[Quản lý tạo yêu cầu] --> B[Submitted]
 B --> C{HQ quyết định}
 C -->|Từ chối| D[Rejected]
 C -->|Duyệt| E[Approved]
 E --> F{Kho đủ tồn?}
 F -->|Không| G[Rollback và giữ Approved]
 F -->|Có| H[Khóa tồn, trừ kho trung tâm, Shipped]
 H --> I[Quản lý cửa hàng xác nhận nhận đủ]
 I --> J[Tăng tồn cửa hàng, Received]
```

## Đặc tả ca sử dụng trọng tâm

| Ca sử dụng | Tiền điều kiện | Luồng thành công | Ngoại lệ/hậu điều kiện |
| --- | --- | --- | --- |
| UC12 Bổ sung | Manager đã đăng nhập | Chọn dòng/số lượng; gửi; theo dõi trạng thái | Dòng không tồn tại/số lượng sai bị từ chối; không tăng tồn khi mới gửi |
| UC14 Xác nhận online | Manager đúng store; đơn new | Kiểm tra phương thức; verify prepaid; confirm | Không verify prepaid → 409; không thay đổi trạng thái |
| UC15 Phân công | Manager đúng store; new/confirmed | Chọn employee active cùng store | Khác store hoặc gán lại người khác → từ chối |
| UC16 Hoàn tất | Received; payment verified; có employee | Khóa order; ghi commission; finished; audit | Chưa thu COD → 409; thao tác lặp không tạo commission thêm |
| UC19 Hóa đơn offline | Employee/manager đã đăng nhập | Chọn hàng; confirm thu tiền; server tính giá/promo; stock+payment+commission cùng transaction | Bất kỳ dòng thiếu tồn → rollback toàn bộ |
| UC24 Đặt online | Customer đã đăng nhập; store active | Nhập thông tin; server giữ tồn và tạo order new/payment pending | Thiếu tồn → chọn cửa hàng khác; gửi lại cùng key trả đơn cũ |
| UC26 Hủy | Chính khách hoặc manager đúng store; new/confirmed | Tạo yêu cầu; manager approve/reject | Approve trả tồn; refund mô phỏng nếu đã verified; không xử lý hai lần |
| UC27 Trả | Đơn finished; quyền trên đơn | Tạo yêu cầu; manager kiểm tra toàn bộ hàng; approve | Transaction đổi status, trả tồn, refund mô phỏng, reverse commission |

## Tài liệu kỹ thuật tham khảo

- [MySQL locking reads](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html).
- [Playwright browser channels](https://playwright.dev/docs/browsers).
