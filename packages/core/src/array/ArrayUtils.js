"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayUtils = void 0;
const utils_1 = require("../utils");
class ArrayUtils {
    static getRandom(items) {
        return items[(0, utils_1.getRandomInt)(0, items.length - 1)];
    }
    static removeItem(arr, item) {
        const index = arr.indexOf(item);
        if (index > -1) {
            arr.splice(index, 1);
        }
        return arr;
    }
}
exports.ArrayUtils = ArrayUtils;
