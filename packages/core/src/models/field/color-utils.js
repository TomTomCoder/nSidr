"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLOR_PALETTE = exports.generateColorPalette = exports.contractColorForTheme = exports.ColorUtils = void 0;
/** @module @teable/sdk: colorUtils */ /** */
const color_1 = __importDefault(require("color"));
const enum_1 = require("../../utils/enum");
const colors_1 = require("./colors");
// eslint-disable-next-line @typescript-eslint/naming-convention
exports.ColorUtils = {
    getHexForColor: ((colorString) => {
        const color = (0, enum_1.getEnumValueIfExists)(colors_1.Colors, colorString);
        if (!color) {
            return null;
        }
        const rgbTuple = colors_1.rgbTuplesByColor[color];
        const hexNumber = (rgbTuple[0] << 16) | (rgbTuple[1] << 8) | rgbTuple[2];
        return `#${hexNumber.toString(16).padStart(6, '0')}`;
    }),
    getRgbForColor: ((colorString) => {
        const color = (0, enum_1.getEnumValueIfExists)(colors_1.Colors, colorString);
        if (!color) {
            return null;
        }
        const rgbTuple = colors_1.rgbTuplesByColor[color];
        return { r: rgbTuple[0], g: rgbTuple[1], b: rgbTuple[2] };
    }),
    getRgbaStringForColor: ((colorString, alpha = 1) => {
        const { r, g, b } = exports.ColorUtils.getRgbForColor(colorString) || {};
        if (r == null || g == null || b == null)
            return null;
        return `rgba(${+r},${+g},${+b},${alpha})`;
    }),
    shouldUseLightTextOnColor: (colorString) => {
        if (!(0, enum_1.has)(colors_1.rgbTuplesByColor, colorString)) {
            return false;
        }
        const shouldUseDarkText = colorString.endsWith('Light1') || colorString.endsWith('Light2');
        return !shouldUseDarkText;
    },
    randomColor(exists, num = 1) {
        const allColors = Object.values(colors_1.Colors);
        let availableColors = [...allColors];
        if (exists) {
            availableColors = availableColors.filter((color) => !exists.includes(color));
        }
        const result = [];
        for (let i = 0; i < num; i++) {
            const colorsToChooseFrom = availableColors.length > 0 ? availableColors : allColors;
            const randomIndex = Math.floor(Math.random() * colorsToChooseFrom.length);
            result.push(colorsToChooseFrom[randomIndex]);
            if (availableColors.length > 0) {
                availableColors.splice(randomIndex, 1);
            }
        }
        return result;
    },
    getRandomColorFromStr(str) {
        const seed = getSeed(str);
        const values = Object.values(colors_1.Colors);
        return values[seed % values.length];
    },
    getRandomHexFromStr(str) {
        const seed = getSeed(str);
        const values = Object.values(colors_1.Colors);
        const value = values[seed % values.length];
        return exports.ColorUtils.getHexForColor(value);
    },
};
const contractColorForTheme = (color, theme) => {
    const colorRegular = (0, color_1.default)(color).alpha(1);
    return theme === 'light' ? colorRegular.darken(0.5).hex() : colorRegular.lighten(0.5).hex();
};
exports.contractColorForTheme = contractColorForTheme;
// Function to generate a seed from a string
function getSeed(str) {
    let seed = 0;
    for (let i = 0; i < str.length; i++) {
        seed = (seed << 5) - seed + str.charCodeAt(i);
        seed |= 0; // Convert seed to a 32-bit integer
    }
    return Math.abs(seed);
}
const generateColorPalette = () => {
    const colors = Object.values(colors_1.Colors);
    const colorCount = colors.length;
    const groupCount = 5;
    const result = Array.from({ length: groupCount }, () => []);
    for (let i = 0; i < colorCount; i++) {
        const groupIndex = i % groupCount;
        const indexInGroup = Math.floor(i / groupCount);
        result[groupIndex][indexInGroup] = colors[i];
    }
    return result;
};
exports.generateColorPalette = generateColorPalette;
exports.COLOR_PALETTE = (0, exports.generateColorPalette)();
