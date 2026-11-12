# API và phân quyền

Mọi API ghi yêu cầu JSON và header `X-Requested-With: SE`. Trình duyệt gửi cookie phiên cùng origin; backend từ chối Origin khác. API trả JSON `{message}` khi có lỗi. HTTP 400: dữ liệu không hợp lệ; 401: chưa đăng nhập; 403: sai quyền/phạm vi; 404: đối tượng không tồn tại; 409: trùng mã hoặc xung đột trạng thái/tồn kho; 429: quá nhiều lần đăng nhập sai; 503: DB chưa sẵn sàng.

## Tuyến API

| Method / path | Quyền | Nội dung |
| --- | --- | --- |
| GET /api/health | Công khai | Kiểm tra DB và migration 2.0 |
| POST /api/auth/register | Công khai | name, username, password, phone; chỉ tạo customer |
| POST /api/auth/login | Công khai | username/password; cookie phiên HttpOnly |
| GET /api/auth/me | Công khai | User hiện tại, không có password_hash |
| POST /api/auth/logout | Phiên hiện tại | Thu hồi token phía server |
| GET /api/company, /stores, /categories, /brands | Công khai | Thông tin danh mục và cửa hàng |
| PUT /api/company | HQ | name/address/phone |
| POST /api/stores | HQ | code/name/address/phone/commission_bps |
| PUT /api/stores/:id | HQ | name/address/phone/active/commission_bps |
| POST /api/categories, /brands | HQ | Tạo loại/nhãn hiệu |
| PUT /api/categories/:id, /brands/:id | HQ | Tên và trạng thái |
| GET /api/products | Công khai | q, store_id, category_id, brand_id; khách không nhận avg_cost |
| POST /api/products | HQ | SKU, barcode, name, category_id, brand_id, price, avg_cost, warranty_months, status, specs, serial_managed |
| PUT /api/products/:id | HQ | Cùng trường với tạo; không chỉnh tồn kho ở đây |
| GET /api/staff | HQ/manager/employee | Toàn công ty/cùng store/chính mình |
| POST /api/staff | HQ/manager | Manager chỉ tạo employee cùng store |
| PUT /api/staff/:id | HQ/manager | name, phone, email, active, password tùy chọn; không tự sửa tài khoản hiện tại |
| GET /api/customers | HQ/manager | Manager chỉ thấy khách đã có đơn tại store mình |
| GET /api/inventory | HQ/warehouse/manager/employee | store_id; warehouse chỉ kho trung tâm |
| PUT /api/inventory/:productId/threshold | HQ/manager | store_id, min_quantity |
| POST /api/inventory/adjust | HQ/warehouse | location_id, product_id, quantity mới, reason |
| GET /api/movements | HQ/warehouse/manager | Biến động theo phạm vi |
| GET /api/restocks | HQ/warehouse/manager | Yêu cầu và các dòng hàng |
| POST /api/restocks | Manager | items[{product_id,quantity}], note; cửa hàng từ phiên |
| POST /api/restocks/:id/action | Theo bước | HQ approve/reject, warehouse/HQ ship, manager đúng store receive |
| GET /api/promotions | Công khai | store_id; khách chỉ nhận mã đang hiệu lực |
| POST /api/promotions | HQ/manager | code/name/kind/value/min_total/max_discount/starts_at/ends_at/scope/store_ids/channel |
| PUT /api/promotions/:id | HQ/manager sở hữu | active boolean |
| GET /api/orders | HQ/manager/employee/customer | Theo quyền trên đơn; hq có thể lọc store_id; status |
| GET /api/orders/:id | Cùng quyền | Chi tiết items/payment/requests; không lộ unit_cost cho khách/nhân viên |
| POST /api/orders | Customer/employee/manager | Khách tạo online, employee/manager tạo offline |
| POST /api/orders/:id/action | Manager/employee | Manager assign/confirm/received/finish; employee được giao process |
| POST /api/orders/:id/payment | Manager cùng store | reference xác minh mô phỏng; COD sau received |
| POST /api/orders/:id/requests | Customer sở hữu/manager cùng store | kind cancel/return, reason |
| GET /api/order-requests | HQ/manager | Theo phạm vi |
| POST /api/order-requests/:id/resolve | Manager cùng store | decision approve/reject, resolution, restock_confirmed cho return |
| GET /api/commissions | HQ/manager/employee | Toàn công ty/cùng store/cá nhân |
| GET /api/reports | HQ/manager/employee | from/to YYYY-MM-DD, store_id; employee chỉ doanh số cá nhân |
| GET /api/audit | HQ/manager | Theo phạm vi; 200 dòng gần nhất |

## Tạo đơn online

```json
{
  "store_id": 2,
  "customer_name": "Khách demo",
  "phone": "0901234567",
  "fulfillment": "pickup",
  "payment_method": "cod",
  "items": [{"product_id": 1, "quantity": 1}],
  "idempotency_key": "uuid-tao-o-client-va-giu-cho-lan-thu-lai",
  "promo_code": "",
  "note": ""
}
```

Đơn giao tận nơi yêu cầu address. Giá/chiết khấu/tổng tiền được tính lại hoàn toàn ở backend. Gửi lại cùng created_by và idempotency_key trả về đơn đã tạo với `replayed: true`. Khi tạo đơn offline phải có `payment_confirmed: true`; cửa hàng và người bán lấy từ phiên, không nhận phân công tùy ý từ client.

Các tuyến ghi trả `{ok:true}` hoặc `{id}`; tạo đơn trả `{id,code}`. Dữ liệu lịch sử được giữ và đổi trạng thái thay vì xóa.
