"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conjunctionSchema = exports.or = exports.and = void 0;
const zod_1 = require("zod");
exports.and = zod_1.z.literal('and');
exports.or = zod_1.z.literal('or');
exports.conjunctionSchema = zod_1.z.union([exports.and, exports.or]);
