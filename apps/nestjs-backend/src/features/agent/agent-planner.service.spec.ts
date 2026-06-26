import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as aiModule from 'ai';
import { AgentPlannerService } from './agent-planner.service';

vi.mock('ai', () => ({ generateText: vi.fn() }));

const buildPlanner = () => {
  const aiService = {
    getAIConfig: vi.fn().mockResolvedValue({ chatModel: { lg: 'k' }, llmProviders: {} }),
    getModelInstance: vi.fn().mockResolvedValue({}),
  };
  return { planner: new AgentPlannerService(aiService as never), aiService };
};

const mockGenerate = (text: string) =>
  (aiModule.generateText as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    text,
  } as never);

describe('AgentPlannerService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createPlan', () => {
    it('parses a JSON steps array into ordered pending steps', async () => {
      const { planner } = buildPlanner();
      mockGenerate('{"steps":["Find the table","Create the field","Verify"]}');
      const plan = await planner.createPlan({
        baseId: 'b',
        modelKey: 'k',
        goal: 'do it',
        instructions: 'agent',
        toolNames: ['create_field'],
      });
      expect(plan).toHaveLength(3);
      expect(plan[0]).toEqual({ id: 1, description: 'Find the table', status: 'pending' });
      expect(plan[2].id).toBe(3);
    });

    it('tolerates code fences and surrounding prose', async () => {
      const { planner } = buildPlanner();
      mockGenerate('Sure!\n```json\n{"steps":["A","B"]}\n```\nDone.');
      const plan = await planner.createPlan({
        baseId: 'b',
        modelKey: 'k',
        goal: 'g',
        instructions: '',
        toolNames: [],
      });
      expect(plan.map((s) => s.description)).toEqual(['A', 'B']);
    });

    it('fails open to [] on unparseable output', async () => {
      const { planner } = buildPlanner();
      mockGenerate('I cannot plan this.');
      const plan = await planner.createPlan({
        baseId: 'b',
        modelKey: 'k',
        goal: 'g',
        instructions: '',
        toolNames: [],
      });
      expect(plan).toEqual([]);
    });

    it('fails open to [] when the model throws', async () => {
      const { planner } = buildPlanner();
      (aiModule.generateText as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('boom') as never
      );
      const plan = await planner.createPlan({
        baseId: 'b',
        modelKey: 'k',
        goal: 'g',
        instructions: '',
        toolNames: [],
      });
      expect(plan).toEqual([]);
    });
  });

  describe('reflect', () => {
    it('parses a verdict', async () => {
      const { planner } = buildPlanner();
      mockGenerate('{"goalAchieved":false,"critique":"records not created yet"}');
      const v = await planner.reflect({ baseId: 'b', modelKey: 'k', goal: 'g', transcript: 't' });
      expect(v.goalAchieved).toBe(false);
      expect(v.critique).toContain('records');
    });

    it('fails open to goalAchieved=true on unparseable/erroring output (no infinite loop)', async () => {
      const { planner } = buildPlanner();
      mockGenerate('not json');
      expect(
        (await planner.reflect({ baseId: 'b', modelKey: 'k', goal: 'g', transcript: 't' }))
          .goalAchieved
      ).toBe(true);
      (aiModule.generateText as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('x') as never
      );
      expect(
        (await planner.reflect({ baseId: 'b', modelKey: 'k', goal: 'g', transcript: 't' }))
          .goalAchieved
      ).toBe(true);
    });
  });

  describe('renderPlan', () => {
    it('renders a markdown checklist with done/pending state', () => {
      const { planner } = buildPlanner();
      const md = planner.renderPlan([
        { id: 1, description: 'A', status: 'done' },
        { id: 2, description: 'B', status: 'pending' },
      ]);
      expect(md).toBe('- [x] 1. A\n- [ ] 2. B');
    });
  });
});
