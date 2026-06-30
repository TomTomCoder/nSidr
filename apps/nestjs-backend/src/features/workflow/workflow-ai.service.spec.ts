import type { PrismaService } from '@teable/db-main-prisma';
import { generateObject, generateText } from 'ai';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AiOutputValidationService } from '../ai/ai-output-validation.service';
import type { AiService } from '../ai/ai.service';
import { WorkflowAiService } from './workflow-ai.service';

vi.mock('ai', () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
}));

interface IMockAiService {
  getChatModelInstance: ReturnType<typeof vi.fn>;
}

interface IMockPrismaService {
  tableMeta: { findMany: ReturnType<typeof vi.fn> };
  agent: { findMany: ReturnType<typeof vi.fn> };
}

interface IMockAiOutputValidationService {
  stripFences: ReturnType<typeof vi.fn>;
  tryJsonParse: ReturnType<typeof vi.fn>;
}

const fencePattern = /^```(?:json)?\n?([\s\S]*)```$/m;

const mockAiService: IMockAiService = {
  getChatModelInstance: vi.fn(),
};

const mockPrismaService: IMockPrismaService = {
  tableMeta: {
    findMany: vi.fn(),
  },
  agent: {
    findMany: vi.fn(),
  },
};

const mockAiOutputValidationService: IMockAiOutputValidationService = {
  stripFences: vi.fn((text: string) => {
    const m = text.trim().match(fencePattern);
    return m ? m[1].trim() : text;
  }),
  tryJsonParse: vi.fn((text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }),
};

const sampleWorkflowConfig = {
  name: 'Test',
  trigger: { type: 'record_created', config: { tableId: 'tbl1' } },
  steps: [{ type: 'send_email', config: { to: 'a@b.com', subject: 's', body: 'b' } }],
};
const samplePrompt = 'notify on new task';

describe('WorkflowAiService.generateWorkflowFromPrompt', () => {
  let service: WorkflowAiService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAiService.getChatModelInstance.mockResolvedValue({ lg: { modelId: 'gpt-4o' } });
    mockPrismaService.tableMeta.findMany.mockResolvedValue([{ id: 'tbl1', name: 'Tasks' }]);
    mockPrismaService.agent.findMany.mockResolvedValue([{ id: 'agt1', name: 'Assistant' }]);
    mockAiOutputValidationService.stripFences.mockClear();
    mockAiOutputValidationService.tryJsonParse.mockClear();
    service = new WorkflowAiService(
      mockAiService as unknown as AiService,
      mockPrismaService as unknown as PrismaService,
      mockAiOutputValidationService as unknown as AiOutputValidationService
    );
  });

  it('generateObject succeeds → returns the object directly, never falls back to text', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: sampleWorkflowConfig,
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const result = await service.generateWorkflowFromPrompt('base-1', samplePrompt);

    expect(result).toEqual(sampleWorkflowConfig);
    expect(generateText).not.toHaveBeenCalled();
  });

  it('generateObject fails → falls back to generateText, reusing AiOutputValidationService to strip a markdown fence before parsing', async () => {
    vi.mocked(generateObject).mockRejectedValue(new Error('provider does not support tools'));
    vi.mocked(generateText).mockResolvedValue({
      text: '```json\n' + JSON.stringify(sampleWorkflowConfig) + '\n```',
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    const result = await service.generateWorkflowFromPrompt('base-1', samplePrompt);

    expect(result).toEqual(sampleWorkflowConfig);
    expect(mockAiOutputValidationService.stripFences).toHaveBeenCalled();
    expect(mockAiOutputValidationService.tryJsonParse).toHaveBeenCalled();
  });

  it('generateObject fails, text fallback has no JSON object at all → throws a clear error', async () => {
    vi.mocked(generateObject).mockRejectedValue(new Error('boom'));
    vi.mocked(generateText).mockResolvedValue({
      text: 'Sorry, I cannot do that.',
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    await expect(service.generateWorkflowFromPrompt('base-1', samplePrompt)).rejects.toThrow(
      'AI did not return a valid JSON workflow config'
    );
  });
});
