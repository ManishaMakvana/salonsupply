-- SalonSupply Phase 1 migration (run on existing DB)
USE salonsupply;

-- Credit limit per salon (udhar)
ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 50000.00;

-- Low-stock threshold per product
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS low_stock_threshold INT NOT NULL DEFAULT 10;

-- Salon favorites / reorder
CREATE TABLE IF NOT EXISTS salon_favorites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    salon_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_salon_product (salon_id, product_id),
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Salesman ↔ salon territory
CREATE TABLE IF NOT EXISTS salesman_salons (
    salesman_id BIGINT NOT NULL,
    salon_id BIGINT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (salesman_id, salon_id),
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE CASCADE,
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- Audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NULL,
    user_role VARCHAR(32) NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NULL,
    entity_id BIGINT NULL,
    details JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at)
);

-- Extend notifications for SMS/WhatsApp channels
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'in_app',
  ADD COLUMN IF NOT EXISTS delivery_status ENUM('pending', 'sent', 'failed') DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS meta JSON NULL;
