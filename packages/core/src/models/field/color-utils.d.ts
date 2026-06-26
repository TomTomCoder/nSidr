import { Colors } from './colors';
/** A red/green/blue color object. Each property is a number from 0 to 255. */
interface IRGB {
    /** The red component. */
    r: number;
    /** The green component. */
    g: number;
    /** The blue component. */
    b: number;
}
/**
 * Utilities for working with {@link Colors} names from the {@link colors} enum.
 *
 * @docsPath UI/utils/colorUtils
 */
export interface IColorUtils {
    getHexForColor(colorString: Colors): string;
    /** */
    getHexForColor(colorString: string): null | string;
    /**
     * Given a {@link Colors}, return an {@link IRGB} object representing it, or null if the value isn't a {@link Colors}
     *
     * @param colorString
     * @example
     * ```js
     * import {colorUtils, colors} from '@teable/sdk';
     *
     * colorUtils.getRgbForColor(colors.PURPLE_DARK_1);
     * // => {r: 107, g: 28, b: 176}
     *
     * colorUtils.getRgbForColor('disgruntled pink');
     * // => null
     * ```
     */
    getRgbForColor(colorString: Colors): IRGB;
    /** */
    getRgbForColor(colorString: string): IRGB | null;
    /**
     * Given a {@link Colors} and alpha, return an string representing it, or null if the value isn't a {@link Colors}
     *
     * @param colorString
     * @param alpha
     * @example
     * ```js
     * import {colorUtils, colors} from '@teable/sdk';
     *
     * colorUtils.getRgbForColor(colors.PURPLE_DARK_1, 0.5);
     * // => rgba(107, 28, 176, 0.5)
     *
     * colorUtils.getRgbForColor('disgruntled pink');
     * // => null
     * ```
     */
    getRgbaStringForColor(colorString: string, alpha?: number): string | null;
    /**
     * Given a {@link Colors}, returns true or false to indicate whether that color should have light text on top of it when used as a background color.
     *
     * @param colorString
     * @example
     * ```js
     * import {colorUtils, colors} from '@teable/sdk';
     *
     * colorUtils.shouldUseLightTextOnColor(colors.PINK_LIGHT_1);
     * // => false
     *
     * colorUtils.shouldUseLightTextOnColor(colors.PINK_DARK_1);
     * // => true
     * ```
     */
    shouldUseLightTextOnColor(colorString: string): boolean;
    /**
     * Random color string.
     * @param exists Filter existed color
     * @param num Number of random color
     * @returns color string array
     */
    randomColor(exists?: string[], num?: number): Colors[];
    /**
     * Randomly (but consistently) pick a hex from a map based on a string
     * @param str input string
     */
    getRandomHexFromStr(str: string, theme?: 'light' | 'dark'): string;
    /**
     * Randomly (but consistently) pick a color from a map based on a string
     * @param str input string
     */
    getRandomColorFromStr(str: string): Colors;
}
export declare const ColorUtils: IColorUtils;
export declare const contractColorForTheme: (color: string, theme: string | undefined) => string;
export declare const generateColorPalette: () => Colors[][];
export declare const COLOR_PALETTE: Colors[][];
export {};
