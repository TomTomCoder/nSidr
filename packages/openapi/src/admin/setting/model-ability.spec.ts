import { describe, expect, it } from 'vitest';
import {
  getImageModelTagsFromAbility,
  modelAbilitySchema,
  modelDeclaresCapability,
  assertModelCapability,
  getMediaModelTagsFromAbility,
} from './model-ability';

const IMAGE_GENERATION_TAG = 'image-generation';
const VISION_TAG = 'vision';

describe('getImageModelTagsFromAbility', () => {
  it('derives persisted image capability tags from image test results', () => {
    expect(
      getImageModelTagsFromAbility(
        {
          generation: true,
          imageToImage: true,
        },
        ['tool-use']
      )
    ).toEqual(['tool-use', IMAGE_GENERATION_TAG, VISION_TAG]);
  });

  it('removes stale image-to-image tags when the latest result does not support it', () => {
    expect(
      getImageModelTagsFromAbility(
        {
          generation: true,
          imageToImage: false,
        },
        [IMAGE_GENERATION_TAG, VISION_TAG]
      )
    ).toEqual([IMAGE_GENERATION_TAG]);
  });
});

describe('modelAbilitySchema — audio/video generation (P0-2)', () => {
  it('parses an ability declaring audioGeneration/videoGeneration', () => {
    const parsed = modelAbilitySchema.parse({
      imageGeneration: true,
      audioGeneration: true,
      videoGeneration: true,
    });
    expect(parsed.audioGeneration).toBe(true);
    expect(parsed.videoGeneration).toBe(true);
  });

  it('is backward-compatible: omitting audio/video still parses', () => {
    const parsed = modelAbilitySchema.parse({ imageGeneration: true });
    expect(parsed.audioGeneration).toBeUndefined();
    expect(parsed.videoGeneration).toBeUndefined();
  });
});

describe('capability validation (P0-2)', () => {
  it('modelDeclaresCapability reflects the declared flag', () => {
    expect(modelDeclaresCapability({ videoGeneration: true }, 'videoGeneration')).toBe(true);
    expect(modelDeclaresCapability({ videoGeneration: true }, 'audioGeneration')).toBe(false);
    expect(modelDeclaresCapability(undefined, 'audioGeneration')).toBe(false);
  });

  it('assertModelCapability returns null when capable, actionable FR message otherwise', () => {
    expect(assertModelCapability({ audioGeneration: true }, 'audioGeneration')).toBeNull();
    const msg = assertModelCapability({}, 'videoGeneration');
    expect(msg).toContain('ne prend pas en charge');
    expect(msg).toContain('Paramètres');
  });

  it('getMediaModelTagsFromAbility maps declared capabilities to gateway tags', () => {
    const tags = getMediaModelTagsFromAbility(
      { audioGeneration: true, videoGeneration: true },
      undefined
    );
    expect(tags).toContain('audio-generation');
    expect(tags).toContain('video-generation');
  });
});
