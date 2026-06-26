import { z } from '../../../zod';
export declare const pluginViewOptionSchema: z.ZodObject<{
    pluginId: z.ZodString;
    pluginInstallId: z.ZodString;
    pluginLogo: z.ZodString;
}, z.core.$strict>;
export type IPluginViewOptions = z.infer<typeof pluginViewOptionSchema>;
