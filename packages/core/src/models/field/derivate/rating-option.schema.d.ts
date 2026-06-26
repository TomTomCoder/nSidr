import { z } from '../../../zod';
import { Colors } from '../colors';
export declare enum RatingIcon {
    Star = "star",
    Moon = "moon",
    Sun = "sun",
    Zap = "zap",
    Flame = "flame",
    Heart = "heart",
    Apple = "apple",
    ThumbUp = "thumb-up"
}
export declare const RATING_ICON_COLORS: readonly [Colors.YellowBright, Colors.RedBright, Colors.TealBright];
export declare const ratingColorsSchema: z.ZodEnum<{
    redBright: Colors.RedBright;
    tealBright: Colors.TealBright;
    yellowBright: Colors.YellowBright;
}>;
export type IRatingColors = z.infer<typeof ratingColorsSchema>;
export declare const ratingFieldOptionsSchema: z.ZodObject<{
    icon: z.ZodEnum<typeof RatingIcon>;
    color: z.ZodEnum<{
        redBright: Colors.RedBright;
        tealBright: Colors.TealBright;
        yellowBright: Colors.YellowBright;
    }>;
    max: z.ZodNumber;
}, z.core.$strip>;
export type IRatingFieldOptions = z.infer<typeof ratingFieldOptionsSchema>;
