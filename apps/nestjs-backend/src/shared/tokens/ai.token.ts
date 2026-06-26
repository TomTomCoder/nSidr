/**
 * Dependency Injection Tokens
 *
 * These tokens decouple modules from direct imports.
 * Multiple modules can provide/inject services via tokens
 * without creating circular dependencies.
 */

// Token for AiService to break circular dependency with Agent module
export const AI_SERVICE = Symbol('AiService');
