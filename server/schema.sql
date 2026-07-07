-- Drop tables if they exist to start fresh
CREATE DATABASE IF NOT EXISTS salonsupply;
USE salonsupply;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS salesman_salons;
DROP TABLE IF EXISTS salon_favorites;
DROP TABLE IF EXISTS inventory_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS brands;
DROP TABLE IF EXISTS salesmen;
DROP TABLE IF EXISTS salons;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS distributors;
SET FOREIGN_KEY_CHECKS = 1;

-- DISTRIBUTORS TABLE
CREATE TABLE distributors (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    business_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    gst_number VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USERS TABLE
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role ENUM('super_admin', 'distributor', 'salesman', 'salon') NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    distributor_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE SET NULL
);

-- SALONS TABLE
CREATE TABLE salons (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    distributor_id BIGINT,
    salon_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 50000.00,
    user_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- SALESMEN TABLE
CREATE TABLE salesmen (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    distributor_id BIGINT,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    user_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- BRANDS TABLE
CREATE TABLE brands (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    logo VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CATEGORIES TABLE
CREATE TABLE categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PRODUCTS TABLE
CREATE TABLE products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    distributor_id BIGINT,
    brand_id BIGINT,
    category_id BIGINT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image VARCHAR(255),
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 10,
    sku VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ORDERS TABLE
CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    distributor_id BIGINT,
    salon_id BIGINT,
    salesman_id BIGINT NULL,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'processing', 'delivered') DEFAULT 'pending',
    payment_status ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE SET NULL,
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE SET NULL,
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE SET NULL
);

-- ORDER ITEMS TABLE
CREATE TABLE order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT,
    product_id BIGINT,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- PAYMENTS TABLE
CREATE TABLE payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash', 'upi', 'bank_transfer') NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- INVENTORY LOGS TABLE
CREATE TABLE inventory_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT,
    type ENUM('in', 'out') NOT NULL,
    quantity INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'general',
    channel VARCHAR(20) DEFAULT 'in_app',
    delivery_status ENUM('pending', 'sent', 'failed') DEFAULT 'sent',
    meta JSON NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE salon_favorites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    salon_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_salon_product (salon_id, product_id),
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE salesman_salons (
    salesman_id BIGINT NOT NULL,
    salon_id BIGINT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (salesman_id, salon_id),
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE CASCADE,
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NULL,
    user_role VARCHAR(32) NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NULL,
    entity_id BIGINT NULL,
    details JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
