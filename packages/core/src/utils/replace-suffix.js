"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceSuffix = void 0;
const replaceSuffix = (originalUrl, storagePrefix) => {
    const original = new URL(originalUrl);
    const suffix = new URL(storagePrefix);
    const suffixPath = suffix.pathname.endsWith('/') ? suffix.pathname : suffix.pathname + '/';
    const originalPath = original.pathname.startsWith('/')
        ? original.pathname.slice(1)
        : original.pathname;
    return `${suffix.origin}${suffixPath}${originalPath}${original.search}${original.hash}`;
};
exports.replaceSuffix = replaceSuffix;
