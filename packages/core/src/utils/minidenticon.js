"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minidenticon = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const COLORS_NB = 9;
const DEFAULT_SATURATION = 95;
const DEFAULT_LIGHTNESS = 45;
const MAGIC_NUMBER = 5;
function simpleHash(str) {
    return (str
        .split('')
        .reduce((hash, char) => (hash ^ char.charCodeAt(0)) * -MAGIC_NUMBER, MAGIC_NUMBER) >>> 2);
}
const minidenticon = function (seed = '', saturation = DEFAULT_SATURATION, lightness = DEFAULT_LIGHTNESS, hashFn = simpleHash) {
    const hash = hashFn(seed);
    const hue = (hash % COLORS_NB) * (360 / COLORS_NB);
    return ([...Array(seed ? 25 : 0)].reduce((acc, _, i) => hash & (1 << i % 15)
        ? acc +
            `<rect x="${i > 14 ? 7 - ~~(i / 5) : ~~(i / 5)}" y="${i % 5}" width="1" height="1"/>`
        : acc, `<svg viewBox="-1.5 -1.5 8 8" xmlns="http://www.w3.org/2000/svg" fill="hsl(${hue} ${saturation}% ${lightness}%)">`) + '</svg>');
};
exports.minidenticon = minidenticon;
