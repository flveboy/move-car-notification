-- 创建车辆表
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    plate_number TEXT NOT NULL,
    model TEXT,
    color TEXT,
    phone_number TEXT,
    owner_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建通知配置表
CREATE TABLE IF NOT EXISTS notification_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    enabled BOOLEAN DEFAULT 0,
    webhook_url TEXT,
    keyword TEXT,
    sign_enabled BOOLEAN DEFAULT 0,
    sign_secret TEXT,
    email_address TEXT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE
);

-- 创建通知记录表（可选）
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    message TEXT,
    status TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
);

-- 创建用户表（用于登录）
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认管理员用户（密码为admin123）
INSERT INTO users (username, password_hash) 
VALUES ('admin', '$2a$10$rL.8Q3L.4L.2L.1L.0L.OeL.4L.3L.2L.1L.0L.OeL.4L.3L.2L.1L.0L.O')
ON CONFLICT(username) DO NOTHING;
