import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Vercel AI SDK — reformatDocument uses generateText only.
vi.mock('ai', () => ({
  generateText: vi.fn(),
  generateObject: vi.fn(),
  tool: vi.fn((def) => def),
  jsonSchema: vi.fn((schema) => schema),
  zodSchema: vi.fn((schema) => schema),
  stepCountIs: vi.fn((n) => n),
}));

import { generateText } from 'ai';
import { UnifiedAiService } from './unified-ai.service';

const mockAiService = {
  getAIConfig: vi.fn(),
  getAIConfigBySpaceId: vi.fn(),
  getModelInstance: vi.fn(),
  embed: vi.fn(),
};

const mockPrismaService = {
  base: { findFirst: vi.fn() },
};

const createService = () =>
  new UnifiedAiService(
    mockPrismaService as never,
    {} as never,
    {} as never,
    {} as never,
    mockAiService as never
  );

describe('UnifiedAiService.reformatDocument (P1-11)', () => {
  let service: UnifiedAiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createService();
    mockPrismaService.base.findFirst.mockResolvedValue({ id: 'base-1' });
    mockAiService.getAIConfig.mockResolvedValue({
      llmProviders: [{ type: 'openai' }],
      chatModel: { lg: 'openai@gpt-4o@p' },
    });
    mockAiService.getModelInstance.mockResolvedValue('mock-model');
  });

  it('builds a preservation-constrained prompt embedding the raw content, and returns the model output', async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: '# Structured\n\nAll the info is still here, reformatted.',
    } as never);

    const input = 'flat unstructured notes about alpha beta gamma facts';
    const result = await service.reformatDocument('space-1', input);

    // (a) prompt is preservation-constrained and contains the raw content
    const promptArg = vi.mocked(generateText).mock.calls[0][0].prompt as string;
    expect(promptArg).toContain('PRESERVE 100%');
    expect(promptArg).toMatch(/NOT summariz/i);
    expect(promptArg).toContain(input);

    // returns the (trimmed) model output
    expect(result.reformatted).toBe('# Structured\n\nAll the info is still here, reformatted.');
    expect(result.possibleLoss).toBe(false);
  });

  it('flags possibleLoss when the output is shorter than 0.6x the input (completeness guard)', async () => {
    const input = 'x'.repeat(1000);
    vi.mocked(generateText).mockResolvedValue({ text: 'y'.repeat(100) } as never); // 10% -> loss

    const result = await service.reformatDocument('space-1', input);

    expect(result.originalLength).toBe(1000);
    expect(result.reformattedLength).toBe(100);
    expect(result.possibleLoss).toBe(true);
  });

  it('does NOT flag possibleLoss when output stays above the threshold', async () => {
    const input = 'x'.repeat(1000);
    vi.mocked(generateText).mockResolvedValue({ text: 'y'.repeat(800) } as never); // 80%

    const result = await service.reformatDocument('space-1', input);
    expect(result.possibleLoss).toBe(false);
  });
});
