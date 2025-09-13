-- Create uuid extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table (predefined tenants only)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  subscription_plan VARCHAR(10) DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro')),
  domain VARCHAR(100) UNIQUE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'member')),
  tenant_slug VARCHAR(50) NOT NULL REFERENCES tenants(slug) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  content TEXT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_slug VARCHAR(50) NOT NULL REFERENCES tenants(slug) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tenant Invitations for admin to invite users
CREATE TABLE IF NOT EXISTS tenant_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_slug VARCHAR(50) NOT NULL REFERENCES tenants(slug),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(10) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID NOT NULL REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert predefined tenants (assignment requirement)
INSERT INTO tenants (name, slug, subscription_plan, domain) VALUES
('Acme Corporation', 'acme', 'free', 'acme.com')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tenants (name, slug, subscription_plan, domain) VALUES
('Globex Corporation', 'globex', 'free', 'globex.com')
ON CONFLICT (slug) DO NOTHING;

-- Insert mandatory test accounts (password: "password")
-- Hash generated using bcrypt with salt rounds 10
INSERT INTO users (email, password, role, tenant_slug) VALUES
('admin@acme.test', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8r6P.ZcOlQb2FgvS8xv4G3r.YO5FfS', 'admin', 'acme')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password, role, tenant_slug) VALUES
('user@acme.test', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8r6P.ZcOlQb2FgvS8xv4G3r.YO5FfS', 'member', 'acme')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password, role, tenant_slug) VALUES
('admin@globex.test', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8r6P.ZcOlQb2FgvS8xv4G3r.YO5FfS', 'admin', 'globex')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password, role, tenant_slug) VALUES
('user@globex.test', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8r6P.ZcOlQb2FgvS8xv4G3r.YO5FfS', 'member', 'globex')
ON CONFLICT (email) DO NOTHING;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant_slug ON users(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_notes_tenant_slug ON notes(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON tenant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON tenant_invitations(email);
