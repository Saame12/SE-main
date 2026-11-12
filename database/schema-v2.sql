CREATE TABLE IF NOT EXISTS companies (
 id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT, name VARCHAR(160) NOT NULL, address VARCHAR(255) NOT NULL DEFAULT '', phone VARCHAR(30) NOT NULL DEFAULT ''
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS locations (
 id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT, code VARCHAR(30) UNIQUE NOT NULL, name VARCHAR(160) NOT NULL,
 kind ENUM('warehouse','store') NOT NULL DEFAULT 'store', address VARCHAR(255) NOT NULL DEFAULT '', phone VARCHAR(30) NOT NULL DEFAULT '',
 active BOOLEAN NOT NULL DEFAULT TRUE, commission_bps INT UNSIGNED NOT NULL DEFAULT 0, CHECK (commission_bps<=10000)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS users (
 id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT, username VARCHAR(80) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
 name VARCHAR(160) NOT NULL, role ENUM('hq','warehouse','manager','employee','customer') NOT NULL,
 store_id INT UNSIGNED NULL, email VARCHAR(160) NOT NULL DEFAULT '', phone VARCHAR(30) NOT NULL DEFAULT '',
 membership VARCHAR(60) NOT NULL DEFAULT 'Thành viên', active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(store_id) REFERENCES locations(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS sessions (
 token_hash CHAR(64) PRIMARY KEY, user_id INT UNSIGNED NOT NULL, expires_at DATETIME NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, INDEX(expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS inventory (
 location_id INT UNSIGNED NOT NULL, product_id INT UNSIGNED NOT NULL, quantity INT UNSIGNED NOT NULL DEFAULT 0,
 min_quantity INT UNSIGNED NOT NULL DEFAULT 5, PRIMARY KEY(location_id,product_id),
 FOREIGN KEY(location_id) REFERENCES locations(id), FOREIGN KEY(product_id) REFERENCES products(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS promotions (
 id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT, code VARCHAR(40) NOT NULL UNIQUE, name VARCHAR(160) NOT NULL,
 kind ENUM('percent','fixed') NOT NULL, value INT UNSIGNED NOT NULL, min_total BIGINT UNSIGNED NOT NULL DEFAULT 0,
 max_discount BIGINT UNSIGNED NULL, starts_at DATETIME NOT NULL, ends_at DATETIME NOT NULL,
 scope ENUM('all','selected') NOT NULL, channel ENUM('all','online','offline') NOT NULL DEFAULT 'all',
 owner_store_id INT UNSIGNED NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_by INT UNSIGNED NOT NULL,
 FOREIGN KEY(owner_store_id) REFERENCES locations(id), FOREIGN KEY(created_by) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS promotion_stores (
 promotion_id INT UNSIGNED NOT NULL, store_id INT UNSIGNED NOT NULL, PRIMARY KEY(promotion_id,store_id),
 FOREIGN KEY(promotion_id) REFERENCES promotions(id), FOREIGN KEY(store_id) REFERENCES locations(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS orders (
 id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT, code VARCHAR(40) NOT NULL UNIQUE, store_id INT UNSIGNED NOT NULL,
 customer_id INT UNSIGNED NULL, employee_id INT UNSIGNED NULL, created_by INT UNSIGNED NOT NULL,
 customer_name VARCHAR(160) NOT NULL, phone VARCHAR(30) NOT NULL, address VARCHAR(255) NOT NULL DEFAULT '',
 channel ENUM('online','offline') NOT NULL, fulfillment ENUM('pickup','delivery') NOT NULL,
 status ENUM('new','confirmed','received','finished','cancelled','returned') NOT NULL DEFAULT 'new',
 payment_method ENUM('card','qr','cod','cash') NOT NULL,
 subtotal BIGINT UNSIGNED NOT NULL, discount BIGINT UNSIGNED NOT NULL DEFAULT 0, total BIGINT UNSIGNED NOT NULL,
 promotion_id INT UNSIGNED NULL, commission_bps INT UNSIGNED NOT NULL DEFAULT 0,
 idempotency_key VARCHAR(80) NOT NULL, note VARCHAR(500) NOT NULL DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, finished_at DATETIME NULL,
 UNIQUE(created_by,idempotency_key), INDEX(store_id,status,created_at),
 FOREIGN KEY(store_id) REFERENCES locations(id), FOREIGN KEY(customer_id) REFERENCES users(id),
 FOREIGN KEY(employee_id) REFERENCES users(id), FOREIGN KEY(created_by) REFERENCES users(id), FOREIGN KEY(promotion_id) REFERENCES promotions(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS order_items (
 id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT, order_id INT UNSIGNED NOT NULL, product_id INT UNSIGNED NOT NULL,
 name VARCHAR(255) NOT NULL, sku VARCHAR(60) NOT NULL, quantity INT UNSIGNED NOT NULL, unit_price BIGINT UNSIGNED NOT NULL,
 unit_cost BIGINT UNSIGNED NOT NULL, FOREIGN KEY(order_id) REFERENCES orders(id), FOREIGN KEY(product_id) REFERENCES products(id), CHECK(quantity>0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS payments (
 order_id INT UNSIGNED PRIMARY KEY, method ENUM('card','qr','cod','cash') NOT NULL,
 status ENUM('pending','verified','refunded') NOT NULL DEFAULT 'pending', amount BIGINT UNSIGNED NOT NULL,
 reference VARCHAR(160) NOT NULL DEFAULT '', verified_by INT UNSIGNED NULL, verified_at DATETIME NULL,
 FOREIGN KEY(order_id) REFERENCES orders(id), FOREIGN KEY(verified_by) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS commissions (
 id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT, order_id INT UNSIGNED NOT NULL UNIQUE, employee_id INT UNSIGNED NOT NULL,
 store_id INT UNSIGNED NOT NULL, rate_bps INT UNSIGNED NOT NULL, amount BIGINT UNSIGNED NOT NULL,
 status ENUM('earned','reversed') NOT NULL DEFAULT 'earned', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(order_id) REFERENCES orders(id), FOREIGN KEY(employee_id) REFERENCES users(id), FOREIGN KEY(store_id) REFERENCES locations(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS restock_requests (
 id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT, code VARCHAR(40) UNIQUE NOT NULL, store_id INT UNSIGNED NOT NULL,
 status ENUM('submitted','approved','shipped','received','rejected') NOT NULL DEFAULT 'submitted',
 note VARCHAR(500) NOT NULL DEFAULT '', created_by INT UNSIGNED NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(store_id) REFERENCES locations(id), FOREIGN KEY(created_by) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS restock_items (
 request_id INT UNSIGNED NOT NULL, product_id INT UNSIGNED NOT NULL, quantity INT UNSIGNED NOT NULL,
 PRIMARY KEY(request_id,product_id), FOREIGN KEY(request_id) REFERENCES restock_requests(id), FOREIGN KEY(product_id) REFERENCES products(id), CHECK(quantity>0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS stock_movements (
 id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT, location_id INT UNSIGNED NOT NULL, product_id INT UNSIGNED NOT NULL,
 delta INT NOT NULL, reason VARCHAR(60) NOT NULL, reference_id INT UNSIGNED NULL, actor_id INT UNSIGNED NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(location_id) REFERENCES locations(id),
 FOREIGN KEY(product_id) REFERENCES products(id), FOREIGN KEY(actor_id) REFERENCES users(id), INDEX(location_id,created_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS order_requests (
 id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT, order_id INT UNSIGNED NOT NULL, kind ENUM('cancel','return') NOT NULL,
 reason VARCHAR(500) NOT NULL, status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
 created_by INT UNSIGNED NOT NULL, resolved_by INT UNSIGNED NULL, resolution VARCHAR(500) NOT NULL DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(order_id) REFERENCES orders(id),
 FOREIGN KEY(created_by) REFERENCES users(id), FOREIGN KEY(resolved_by) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS audit_logs (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, actor_id INT UNSIGNED NOT NULL, action VARCHAR(80) NOT NULL,
 entity VARCHAR(60) NOT NULL, entity_id INT UNSIGNED NULL, details JSON NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(actor_id) REFERENCES users(id), INDEX(created_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS schema_migrations (
 version VARCHAR(60) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
