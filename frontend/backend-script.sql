-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fullname VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(fullname)) >= 2 AND LENGTH(fullname) <= 255),
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' AND LENGTH(email) <= 255),
    password_hash VARCHAR(255) NOT NULL CHECK (LENGTH(password_hash) >= 8),
    phone VARCHAR(20) CHECK (phone IS NULL OR (phone ~ '^(\+84|0)[1-9][0-9]{8,9}$' AND LENGTH(phone) <= 20)),
    avatar TEXT,
    location TEXT CHECK (location IS NULL OR LENGTH(location) <= 500),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User settings (1:1 with users)
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    general JSONB DEFAULT '{"language":"vi","timezone":"Asia/Ho_Chi_Minh","dateFormat":"DD/MM/YYYY","timeFormat":"24h"}',
    notifications JSONB DEFAULT '{"emailNotifications":true,"pushNotifications":true,"taskReminders":true,"goalUpdates":true,"eventReminders":true}',
    security JSONB DEFAULT '{"twoFactorAuth":false,"loginAlerts":true}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Active devices / sessions
CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(device_name)) >= 1 AND LENGTH(device_name) <= 255),
    ip_address INET,
    token TEXT NOT NULL CHECK (LENGTH(token) >= 32),
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- Daily Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL CHECK (LENGTH(TRIM(text)) >= 1 AND LENGTH(text) <= 1000),
    description TEXT CHECK (description IS NULL OR LENGTH(description) <= 5000),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    tags TEXT[],
    due_date DATE CHECK (due_date IS NULL OR due_date >= CURRENT_DATE),
    reminder_time TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_date ON tasks(user_id, due_date);
CREATE INDEX idx_tasks_completed ON tasks(user_id, completed);

-- Main Goal (one per user per date)
CREATE TABLE main_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL CHECK (LENGTH(TRIM(text)) >= 1 AND LENGTH(text) <= 500),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Goals
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(title)) >= 1 AND LENGTH(title) <= 255),
    description TEXT CHECK (description IS NULL OR LENGTH(description) <= 5000),
    category VARCHAR(100) CHECK (category IS NULL OR (LENGTH(TRIM(category)) >= 1 AND LENGTH(category) <= 100)),
    due_date DATE CHECK (due_date IS NULL OR due_date >= CURRENT_DATE),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    icon VARCHAR(100) CHECK (icon IS NULL OR LENGTH(icon) <= 100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_user_status ON goals(user_id, status);

-- Goal Milestones
CREATE TABLE goal_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(title)) >= 1 AND LENGTH(title) <= 255),
    date DATE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Goal Tasks
CREATE TABLE goal_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    text TEXT NOT NULL CHECK (LENGTH(TRIM(text)) >= 1 AND LENGTH(text) <= 1000),
    date DATE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Calendar Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(title)) >= 1 AND LENGTH(title) <= 255),
    date DATE NOT NULL,
    time_from TIME CHECK (time_from IS NULL OR time_from ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'),
    time_to TIME CHECK (time_to IS NULL OR time_to ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'),
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    color VARCHAR(50) CHECK (color IS NULL OR LENGTH(color) <= 50),
    location_type VARCHAR(20) CHECK (location_type IN ('online', 'offline')),
    platform VARCHAR(50) CHECK (platform IS NULL OR LENGTH(platform) <= 50),
    address TEXT CHECK (address IS NULL OR LENGTH(address) <= 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_user_date ON events(user_id, date);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('task', 'goal', 'event', 'system', 'settings', 'security')),
    title VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(title)) >= 1 AND LENGTH(title) <= 255),
    message TEXT NOT NULL CHECK (LENGTH(TRIM(message)) >= 1 AND LENGTH(message) <= 1000),
    unread BOOLEAN NOT NULL DEFAULT TRUE,
    icon VARCHAR(100) CHECK (icon IS NULL OR LENGTH(icon) <= 100),
    icon_bg VARCHAR(50) CHECK (icon_bg IS NULL OR LENGTH(icon_bg) <= 50),
    icon_color VARCHAR(50) CHECK (icon_color IS NULL OR LENGTH(icon_color) <= 50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, unread DESC, created_at DESC);

-- Contact form submissions
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(name)) >= 2 AND LENGTH(name) <= 255),
    email VARCHAR(255) NOT NULL CHECK (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' AND LENGTH(email) <= 255),
    message TEXT NOT NULL CHECK (LENGTH(TRIM(message)) >= 10 AND LENGTH(message) <= 5000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);