/* eslint-disable sonarjs/no-duplicate-string */
import { assertSelectOnly } from './statement-filter';

describe('assertSelectOnly', () => {
  // ── Passing cases ─────────────────────────────────────────────────────────

  it('passes a plain SELECT', () => {
    expect(() => assertSelectOnly('SELECT * FROM users')).not.toThrow();
  });

  it('passes SELECT with WHERE clause', () => {
    expect(() => assertSelectOnly('SELECT id, name FROM users WHERE active = true')).not.toThrow();
  });

  it('passes a CTE that ends in SELECT', () => {
    expect(() => assertSelectOnly('WITH cte AS (SELECT 1) SELECT * FROM cte')).not.toThrow();
  });

  it('passes SELECT 1 (healthcheck)', () => {
    expect(() => assertSelectOnly('SELECT 1')).not.toThrow();
  });

  it('passes with leading whitespace', () => {
    expect(() => assertSelectOnly('   SELECT id FROM t')).not.toThrow();
  });

  it('passes with leading single-line comment', () => {
    expect(() => assertSelectOnly('-- get all users\nSELECT * FROM users')).not.toThrow();
  });

  it('passes with leading block comment', () => {
    expect(() => assertSelectOnly('/* admin query */\nSELECT count(*) FROM orders')).not.toThrow();
  });

  it('passes case-insensitive SELECT', () => {
    expect(() => assertSelectOnly('select id from t')).not.toThrow();
  });

  it('passes WITH (no write keyword) CTE', () => {
    expect(() =>
      assertSelectOnly(
        'WITH ranked AS (SELECT row_number() OVER (ORDER BY id) rn, * FROM t) SELECT * FROM ranked WHERE rn < 10'
      )
    ).not.toThrow();
  });

  // ── DML rejection ─────────────────────────────────────────────────────────

  it('rejects INSERT', () => {
    expect(() => assertSelectOnly("INSERT INTO users (name) VALUES ('evil')")).toThrow(
      /read-only/i
    );
  });

  it('rejects UPDATE', () => {
    expect(() => assertSelectOnly("UPDATE users SET name='x' WHERE id=1")).toThrow(/read-only/i);
  });

  it('rejects DELETE', () => {
    expect(() => assertSelectOnly('DELETE FROM users WHERE id=1')).toThrow(/read-only/i);
  });

  it('rejects TRUNCATE', () => {
    expect(() => assertSelectOnly('TRUNCATE TABLE users')).toThrow(/read-only/i);
  });

  // ── DDL rejection ─────────────────────────────────────────────────────────

  it('rejects DROP', () => {
    expect(() => assertSelectOnly('DROP TABLE users')).toThrow(/read-only/i);
  });

  it('rejects ALTER', () => {
    expect(() => assertSelectOnly('ALTER TABLE users ADD COLUMN foo text')).toThrow(/read-only/i);
  });

  it('rejects CREATE', () => {
    expect(() => assertSelectOnly('CREATE TABLE foo (id serial)')).toThrow(/read-only/i);
  });

  it('rejects GRANT', () => {
    expect(() => assertSelectOnly('GRANT SELECT ON users TO attacker')).toThrow(/read-only/i);
  });

  it('rejects REVOKE', () => {
    expect(() => assertSelectOnly('REVOKE ALL ON users FROM user1')).toThrow(/read-only/i);
  });

  it('rejects COPY', () => {
    expect(() => assertSelectOnly("COPY users TO '/tmp/out.csv'")).toThrow(/read-only/i);
  });

  it('rejects CALL', () => {
    expect(() => assertSelectOnly('CALL do_evil()')).toThrow(/read-only/i);
  });

  // ── Multi-statement / chaining rejection ─────────────────────────────────

  it('rejects SELECT followed by INSERT via semicolon', () => {
    expect(() => assertSelectOnly("SELECT 1; INSERT INTO users (name) VALUES ('x')")).toThrow(
      /read-only|multi-statement/i
    );
  });

  it('rejects two SELECTs chained (multi-statement)', () => {
    expect(() => assertSelectOnly('SELECT 1; SELECT 2')).toThrow(/multi-statement/i);
  });

  // ── CTE-to-write rejection ────────────────────────────────────────────────

  it('rejects a CTE that ends in INSERT', () => {
    expect(() => assertSelectOnly('WITH x AS (SELECT 1) INSERT INTO t SELECT * FROM x')).toThrow(
      /read-only/i
    );
  });

  it('rejects a CTE that ends in UPDATE', () => {
    expect(() => assertSelectOnly('WITH x AS (SELECT 1) UPDATE t SET col=1')).toThrow(/read-only/i);
  });

  it('rejects a CTE that ends in DELETE', () => {
    expect(() =>
      assertSelectOnly('WITH x AS (SELECT 1) DELETE FROM t WHERE id IN (SELECT id FROM x)')
    ).toThrow(/read-only/i);
  });

  // ── Empty / blank rejection ───────────────────────────────────────────────

  it('rejects an empty string', () => {
    expect(() => assertSelectOnly('')).toThrow(/read-only|empty/i);
  });

  it('rejects a blank/whitespace-only string', () => {
    expect(() => assertSelectOnly('   ')).toThrow(/read-only|empty/i);
  });
});
