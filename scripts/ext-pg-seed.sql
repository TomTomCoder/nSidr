-- Phase 18 external Postgres seed data
-- Used by 18-04 / 18-05 schema introspection + virtual-table tests.
-- Connection: postgresql://extuser:extpass@localhost:5433/extdb

-- Schema: sales
CREATE SCHEMA IF NOT EXISTS sales;

-- Table 1: customers
CREATE TABLE sales.customers (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  country     TEXT NOT NULL DEFAULT 'US',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 2: orders
CREATE TABLE sales.orders (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES sales.customers(id),
  amount      NUMERIC(12,2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'USD',
  status      TEXT NOT NULL DEFAULT 'pending',
  placed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed rows
INSERT INTO sales.customers (name, email, country) VALUES
  ('Alice Martin',  'alice@example.com',  'US'),
  ('Bob Tanaka',    'bob@example.com',    'JP'),
  ('Clara Santos',  'clara@example.com',  'BR');

INSERT INTO sales.orders (customer_id, amount, currency, status) VALUES
  (1, 149.99, 'USD', 'completed'),
  (1,  89.00, 'USD', 'pending'),
  (2, 320.50, 'JPY', 'completed'),
  (3,  75.00, 'BRL', 'shipped');
