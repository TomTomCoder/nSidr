"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMeTag = exports.Me = void 0;
// eslint-disable-next-line @typescript-eslint/naming-convention
exports.Me = 'Me';
const isMeTag = (str) => str === exports.Me;
exports.isMeTag = isMeTag;
