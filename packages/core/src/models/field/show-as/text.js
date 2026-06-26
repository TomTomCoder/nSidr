"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.singleLineTextShowAsSchema = exports.SingleLineTextDisplayType = void 0;
const zod_1 = require("zod");
var SingleLineTextDisplayType;
(function (SingleLineTextDisplayType) {
    SingleLineTextDisplayType["Url"] = "url";
    SingleLineTextDisplayType["Email"] = "email";
    SingleLineTextDisplayType["Phone"] = "phone";
})(SingleLineTextDisplayType || (exports.SingleLineTextDisplayType = SingleLineTextDisplayType = {}));
exports.singleLineTextShowAsSchema = zod_1.z
    .object({
    type: zod_1.z.enum(SingleLineTextDisplayType).meta({
        description: 'can display as url, email or phone in string field with a button to perform the corresponding action, start a phone call, send an email, or open a link in a new tab',
    }),
})
    .describe('Only be used in single line text field or formula / rollup field with cellValueType equals String and isMultipleCellValue is not true');
