export const schemaSql = `
CREATE TABLE IF NOT EXISTS staff (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sign_in_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  email TEXT NOT NULL,
  buyer_name TEXT,
  square_customer_id TEXT,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_zip_toggles (
  code TEXT PRIMARY KEY,
  open INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  buyer_email TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  season_name TEXT NOT NULL,
  season_ends_at TEXT NOT NULL,
  fulfillment TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  scheduled_local TEXT NOT NULL,
  confirmation TEXT NOT NULL,
  step TEXT NOT NULL,
  delivery_charge_cents INTEGER,
  street TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  delivery_note TEXT,
  placed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_lines (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  sku_id TEXT NOT NULL,
  style_id TEXT NOT NULL,
  style_name TEXT NOT NULL,
  style_description TEXT NOT NULL,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reservations (
  order_id TEXT NOT NULL,
  sku_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  PRIMARY KEY (order_id, sku_id)
);

CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  decided_at TEXT
);

CREATE INDEX IF NOT EXISTS orders_buyer ON orders (buyer_email);
CREATE INDEX IF NOT EXISTS lines_order ON order_lines (order_id);
CREATE INDEX IF NOT EXISTS changes_order ON change_requests (order_id, status);
`.trim()
