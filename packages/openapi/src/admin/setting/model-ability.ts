import { z } from 'zod';
import type { GatewayModelTag } from './gateway-model';

// Detailed ability support with URL and base64 variants
export const abilityDetailSchema = z.object({
  url: z.boolean().optional(),
  base64: z.boolean().optional(),
});

export type IAbilityDetail = z.infer<typeof abilityDetailSchema>;

// Model ability schema for test results
export const modelAbilitySchema = z.object({
  image: z.union([z.boolean(), abilityDetailSchema]).optional(), // vision/image input
  pdf: z.union([z.boolean(), abilityDetailSchema]).optional(), // PDF/file input
  webSearch: z.boolean().optional(),
  toolCall: z.boolean().optional(), // tool/function calling
  reasoning: z.boolean().optional(), // extended thinking/reasoning
  imageGeneration: z.boolean().optional(), // can generate images
  audioGeneration: z.boolean().optional(), // can generate audio (P0-2)
  videoGeneration: z.boolean().optional(), // can generate video (P0-2)
});

export type IModelAbility = z.infer<typeof modelAbilitySchema>;

// Image model ability schema
export const imageModelAbilitySchema = z.object({
  generation: z.boolean().optional(), // can generate images from text
  imageToImage: z.boolean().optional(), // can generate images from image input
});

export type IImageModelAbility = z.infer<typeof imageModelAbilitySchema>;

const IMAGE_GENERATION_TAG: GatewayModelTag = 'image-generation';
const VISION_TAG: GatewayModelTag = 'vision';
const IMAGE_ABILITY_TAGS = new Set<GatewayModelTag>([IMAGE_GENERATION_TAG, VISION_TAG]);

export const getImageModelTagsFromAbility = (
  imageAbility: IImageModelAbility | undefined,
  currentTags: readonly GatewayModelTag[] | undefined
): GatewayModelTag[] | undefined => {
  if (!imageAbility) return currentTags ? [...currentTags] : undefined;

  const nextTags = (currentTags ?? []).filter((tag) => !IMAGE_ABILITY_TAGS.has(tag));
  if (imageAbility.generation) {
    nextTags.push(IMAGE_GENERATION_TAG);
  }
  if (imageAbility.imageToImage) {
    nextTags.push(VISION_TAG);
  }

  return nextTags.length ? nextTags : undefined;
};

// P0-2: media generation capabilities a model may declare, mapped to gateway tags.
const AUDIO_GENERATION_TAG: GatewayModelTag = 'audio-generation';
const VIDEO_GENERATION_TAG: GatewayModelTag = 'video-generation';

export type MediaGenerationCapability = 'imageGeneration' | 'audioGeneration' | 'videoGeneration';

const MEDIA_CAPABILITY_TAGS: Record<MediaGenerationCapability, GatewayModelTag> = {
  imageGeneration: IMAGE_GENERATION_TAG,
  audioGeneration: AUDIO_GENERATION_TAG,
  videoGeneration: VIDEO_GENERATION_TAG,
};

const MEDIA_CAPABILITY_LABEL_FR: Record<MediaGenerationCapability, string> = {
  imageGeneration: "génération d'image",
  audioGeneration: "génération d'audio",
  videoGeneration: 'génération de vidéo',
};

// Reusable check: does model ability Y declare capability X? (P0-2)
export const modelDeclaresCapability = (
  ability: IModelAbility | undefined,
  capability: MediaGenerationCapability
): boolean => Boolean(ability?.[capability]);

/**
 * P0-2: guard to run before a media generation. Returns null when the model declares the
 * capability, otherwise a P0-1-style actionable FR error message.
 * ponytail: returns a string rather than throwing, so callers pick their own error channel.
 */
export const assertModelCapability = (
  ability: IModelAbility | undefined,
  capability: MediaGenerationCapability
): string | null => {
  if (modelDeclaresCapability(ability, capability)) return null;
  return `Le modèle IA sélectionné ne prend pas en charge la ${MEDIA_CAPABILITY_LABEL_FR[capability]} — choisissez un modèle compatible dans Paramètres ▸ IA.`;
};

// Map declared media capabilities → gateway tags (mirrors getImageModelTagsFromAbility).
export const getMediaModelTagsFromAbility = (
  ability: IModelAbility | undefined,
  currentTags: readonly GatewayModelTag[] | undefined
): GatewayModelTag[] | undefined => {
  if (!ability) return currentTags ? [...currentTags] : undefined;
  const managed = new Set<GatewayModelTag>(Object.values(MEDIA_CAPABILITY_TAGS));
  const nextTags = (currentTags ?? []).filter((tag) => !managed.has(tag));
  (Object.keys(MEDIA_CAPABILITY_TAGS) as MediaGenerationCapability[]).forEach((cap) => {
    if (ability[cap]) nextTags.push(MEDIA_CAPABILITY_TAGS[cap]);
  });
  return nextTags.length ? nextTags : undefined;
};

// chatModelAbilitySchema is same as modelAbilitySchema, for backward compatibility
export const chatModelAbilitySchema = modelAbilitySchema;

export const chatModelAbilityType = chatModelAbilitySchema.keyof();

export type IChatModelAbilityType = z.infer<typeof chatModelAbilityType>;

export type IChatModelAbility = z.infer<typeof chatModelAbilitySchema>;
