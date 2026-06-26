/**
 * Path constants for Playwright authentication storage.
 *
 * This module is intentionally separate from auth.ts (the setup script) so
 * that feature test files can import `authFile` without Playwright thinking
 * they are importing another test file.
 */

import path from 'path';

/** Absolute path to the saved session JSON produced by the auth setup project. */
export const authFile = path.join(__dirname, '.auth.json');
