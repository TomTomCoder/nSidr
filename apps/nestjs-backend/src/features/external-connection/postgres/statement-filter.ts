/**
 * SELECT-only statement filter for external Postgres connections.
 *
 * Defense-in-depth alongside a read-only DB role: any query must be a single
 * read-only statement (SELECT or WITH...SELECT CTE) before it reaches the wire.
 *
 * T-18-04-T: prevents writes/DDL even if the DB role were misconfigured.
 */

/**
 * Write/DDL keywords that are never allowed as the leading statement type
 * (after stripping comments and trimming whitespace).
 */
const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'TRUNCATE',
  'DROP',
  'ALTER',
  'CREATE',
  'GRANT',
  'REVOKE',
  'COPY',
  'CALL',
  'EXECUTE',
  'MERGE',
  'DO',
  'SET',
  'RESET',
  'VACUUM',
  'ANALYZE',
  'COMMENT',
  'NOTIFY',
  'LISTEN',
  'UNLISTEN',
  'LOAD',
  'CLUSTER',
  'REINDEX',
  'REFRESH',
];

/**
 * Strip SQL comments (single-line "--" and block "/ * * /") and normalize
 * surrounding whitespace so that the first real token is easy to identify.
 */
function stripComments(sql: string): string {
  // Remove block comments (non-greedy)
  let result = sql.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // Remove single-line comments
  result = result.replace(/--[^\n]*/g, ' ');
  return result.trim();
}

/**
 * Assert that `sql` is a single, read-only SQL statement (SELECT or CTE
 * ending in SELECT). Throws a descriptive Error on any violation.
 *
 * Rules:
 * 1. Empty / blank: rejected.
 * 2. Multi-statement (contains ";" with content after it): rejected.
 * 3. Leading keyword is a forbidden write/DDL keyword: rejected.
 * 4. Starts with WITH (CTE): the terminal keyword after the CTE body must be
 *    SELECT; INSERT/UPDATE/DELETE CTEs are rejected.
 * 5. Leading keyword is not SELECT (and not WITH): rejected.
 */
export function assertSelectOnly(sql: string): void {
  const stripped = stripComments(sql);

  if (!stripped) {
    throw new Error(
      'read-only violation: empty or blank SQL statement is not allowed on external connections'
    );
  }

  // Multi-statement check:
  // A semicolon followed by non-whitespace content means a second statement.
  // Strip trailing semicolons first (common style), then check for internal ones.
  const withoutTrailingSemi = stripped.replace(/;\s*$/, '');
  if (withoutTrailingSemi.includes(';')) {
    throw new Error(
      'read-only violation: multi-statement SQL is not allowed on external connections'
    );
  }

  // Extract the first meaningful keyword
  const firstTokenMatch = withoutTrailingSemi.match(/^\s*(\w+)/);
  const firstKeyword = firstTokenMatch ? firstTokenMatch[1].toUpperCase() : '';

  // Forbidden write/DDL check
  if (FORBIDDEN_KEYWORDS.includes(firstKeyword)) {
    throw new Error(
      `read-only violation: "${firstKeyword}" is not allowed on external connections (read-only)`
    );
  }

  // WITH (CTE) check
  if (firstKeyword === 'WITH') {
    // Find the terminal statement keyword after all CTE definitions.
    const terminalKeyword = extractCteTerminalKeyword(withoutTrailingSemi);
    if (!terminalKeyword || terminalKeyword.toUpperCase() !== 'SELECT') {
      throw new Error(
        `read-only violation: CTE terminal statement "${terminalKeyword ?? 'unknown'}" is not SELECT, not allowed on external connections`
      );
    }
    return; // CTE ending in SELECT is allowed
  }

  // Plain SELECT check
  if (firstKeyword !== 'SELECT') {
    throw new Error(
      `read-only violation: statement starting with "${firstKeyword}" is not allowed on external connections (only SELECT is permitted)`
    );
  }
}

/**
 * Given a WITH...SELECT (CTE) SQL string, extract the keyword that starts the
 * final (outer) query after all CTE definitions.
 *
 * Approach: scan through the string tracking paren depth. Everything inside
 * balanced parens belongs to a CTE body. The first keyword encountered at
 * depth 0 after the last closing paren is the terminal keyword.
 */
function extractCteTerminalKeyword(sql: string): string | undefined {
  let depth = 0;
  let i = 0;

  // Skip the leading WITH keyword
  const withMatch = sql.toUpperCase().match(/^\s*WITH\s+/);
  if (!withMatch) return undefined;
  i = withMatch[0].length;

  let lastDepthZeroPos = -1;

  while (i < sql.length) {
    const ch = sql[i];
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        lastDepthZeroPos = i + 1;
      }
    }
    i++;
  }

  if (lastDepthZeroPos < 0) return undefined;

  // Extract the text after the last closing paren and find the first keyword
  const after = sql.slice(lastDepthZeroPos).trim();
  const terminalMatch = after.match(/^\s*(\w+)/);
  return terminalMatch ? terminalMatch[1] : undefined;
}
