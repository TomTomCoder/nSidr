import { z } from '../../../zod';

export const pluginViewOptionSchema = z
  .object({
    pluginId: z.string().meta({ description: 'The plugin id' }),
    pluginInstallId: z.string().meta({ description: 'The plugin install id' }),
    pluginLogo: z.string().meta({ description: 'The plugin logo' }),
  })
  .strip();

export type IPluginViewOptions = z.infer<typeof pluginViewOptionSchema>;
