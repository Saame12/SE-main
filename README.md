# SE / V0 TECH — môi trường phát triển

## Chạy dự án trên Windows

Đã kiểm tra với Node.js 24.20.0, npm 11.14.1, MySQL Community 8.0.46.
MySQL dùng dịch vụ Windows `MySQL80`, cổng `3306`.

```powershell
cd C:\Users\sangl\source\repos\SE-main
npm.cmd install
npm.cmd run db:check
npm.cmd run dev
```

- Cửa hàng: http://127.0.0.1:3308/
- Quản trị: http://127.0.0.1:3308/admin.html
- Quản lý: http://127.0.0.1:3308/manager.html
- Kho/sản phẩm: http://127.0.0.1:3308/index1.html
- Kiểm tra MySQL: http://127.0.0.1:3308/api/health
- Danh sách sản phẩm từ MySQL: http://127.0.0.1:3308/api/products

Dùng `npm.cmd` nếu PowerShell chặn `npm.ps1`. Dừng server trong terminal bằng Ctrl+C.
Server chỉ lắng nghe trên máy cục bộ (`127.0.0.1`).

## Database

File `.env` chứa thông tin kết nối, được loại khỏi Git. Không chia sẻ file này.
Database mặc định: `se_store`; tài khoản ứng dụng: `se_app`.
Mật khẩu ứng dụng được tạo ngẫu nhiên và lưu ở `DB_PASSWORD`.
Kết nối Workbench: Standard TCP/IP, hostname `127.0.0.1`, port `3306`,
username `se_app`, password lấy trong `.env`, schema `se_store`.

Các bảng khởi đầu: `categories`, `brands`, `products`, có khóa ngoại và utf8mb4.
Dữ liệu mẫu lấy từ danh mục của `admin.js`, lưu trong `database/seed.json`.
Đây là schema ban đầu; chưa có các bảng tài khoản, hóa đơn, đơn hàng, nhập kho.

Thiết lập lại trên máy khác:

```powershell
Copy-Item .env.example .env
# Điền DB_PASSWORD (mật khẩu riêng cho ứng dụng) và DB_ADMIN_PASSWORD trong .env.
npm.cmd install
npm.cmd run db:setup
npm.cmd run db:check
```

`db:setup` dùng tài khoản quản trị để tạo database, bảng, tài khoản ứng dụng,
và nạp mẫu. Script giữ nguyên bản ghi đã có, không đặt lại mật khẩu tài khoản đã tồn tại.
Tài khoản ứng dụng chỉ được SELECT/INSERT/UPDATE/DELETE trên database này.
Chạy server thường ngày không cần `DB_ADMIN_PASSWORD`; có thể xóa giá trị này
khỏi `.env` sau khi thiết lập. Khi cần chạy lại `db:setup`, điền lại mật khẩu quản trị.

## Phạm vi hiện tại

Backend Node.js phục vụ giao diện gốc và cung cấp API đọc sản phẩm, kiểm tra database.
Các trang HTML/JS gốc vẫn dùng dữ liệu trong bộ nhớ/localStorage; các thao tác trên
giao diện chưa ghi vào MySQL. Chưa có API đăng nhập hoặc API sửa dữ liệu.
Các trang quản trị hiện là bản demo, chưa xác thực người dùng phía server.

## Kiểm tra

```powershell
npm.cmd run check
npm.cmd run db:check
```

Tài liệu MySQL về cấu hình và khởi tạo database:
https://dev.mysql.com/doc/mysql-installation-excerpt/8.0/en/data-directory-initialization.html
