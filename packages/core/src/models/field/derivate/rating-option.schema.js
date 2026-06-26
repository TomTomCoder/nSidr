"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ratingFieldOptionsSchema = exports.ratingColorsSchema = exports.RATING_ICON_COLORS = exports.RatingIcon = void 0;
const zod_1 = require("../../../zod");
const colors_1 = require("../colors");
var RatingIcon;
(function (RatingIcon) {
    RatingIcon["Star"] = "star";
    RatingIcon["Moon"] = "moon";
    RatingIcon["Sun"] = "sun";
    RatingIcon["Zap"] = "zap";
    RatingIcon["Flame"] = "flame";
    RatingIcon["Heart"] = "heart";
    RatingIcon["Apple"] = "apple";
    RatingIcon["ThumbUp"] = "thumb-up";
})(RatingIcon || (exports.RatingIcon = RatingIcon = {}));
exports.RATING_ICON_COLORS = [
    colors_1.Colors.YellowBright,
    colors_1.Colors.RedBright,
    colors_1.Colors.TealBright,
];
exports.ratingColorsSchema = zod_1.z.enum(exports.RATING_ICON_COLORS);
exports.ratingFieldOptionsSchema = zod_1.z.object({
    icon: zod_1.z.enum(RatingIcon),
    color: exports.ratingColorsSchema,
    max: zod_1.z.number().int().max(10).min(1),
});
