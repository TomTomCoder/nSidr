"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANONYMOUS_USER = exports.isAnonymous = exports.ANONYMOUS_USER_ID = void 0;
exports.ANONYMOUS_USER_ID = 'anonymous';
const isAnonymous = (userId) => userId === exports.ANONYMOUS_USER_ID;
exports.isAnonymous = isAnonymous;
// eslint-disable-next-line @typescript-eslint/naming-convention
exports.ANONYMOUS_USER = {
    id: exports.ANONYMOUS_USER_ID,
    name: 'Anonymous',
    email: 'anonymous@system.teable.ai',
};
