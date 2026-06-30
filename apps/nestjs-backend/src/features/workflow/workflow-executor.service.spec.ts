import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { PrismaService } from '@teable/db-main-prisma';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MailSenderService } from '../mail-sender/mail-sender.service';
import type { RecordOpenApiService } from '../record/open-api/record-open-api.service';
import type { WorkflowAiService } from './workflow-ai.service';
import { WorkflowExecutorService } from './workflow-executor.service';

const mockEventEmitter = {
  emit: vi.fn(),
};

describe('WorkflowExecutorService — agent_run step', () => {
  let service: WorkflowExecutorService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorkflowExecutorService(
      {} as unknown as PrismaService,
      {} as unknown as RecordOpenApiService,
      {} as unknown as MailSenderService,
      {} as unknown as WorkflowAiService,
      mockEventEmitter as unknown as EventEmitter2
    );
  });

  it('emits agent.run.requested with the interpolated prompt and reports success', async () => {
    const results = await service.executeSteps(
      [
        {
          type: 'agent_run',
          config: { agentId: 'agt1', prompt: 'Summarize {{record.fields.Title}}' },
        },
      ],
      { record: { fields: { Title: 'Le Petit Prince' } } }
    );

    expect(results).toEqual([
      { type: 'agent_run', status: 'success', note: 'Agent agt1 déclenché' },
    ]);
    // `executeSteps` shares a single mutable ctx object across steps (appending each step's
    // output to ctx.steps as it goes) — by the time we inspect the recorded call, that same
    // object reference has the post-run `steps` array on it too, hence the objectContaining.
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'agent.run.requested',
      expect.objectContaining({
        agentId: 'agt1',
        prompt: 'Summarize Le Petit Prince',
        triggerData: expect.objectContaining({
          record: { fields: { Title: 'Le Petit Prince' } },
        }),
      })
    );
  });

  it('dry run never emits the event', async () => {
    const results = await service.executeSteps(
      [{ type: 'agent_run', config: { agentId: 'agt1', prompt: 'Do something' } }],
      {},
      true
    );

    expect(results[0]).toMatchObject({ type: 'agent_run', status: 'success' });
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('missing agentId → error, no event emitted', async () => {
    const results = await service.executeSteps([
      { type: 'agent_run', config: { prompt: 'Do something' } },
    ]);

    expect(results).toEqual([{ type: 'agent_run', status: 'error', note: 'agentId manquant' }]);
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('missing prompt → error, no event emitted', async () => {
    const results = await service.executeSteps([
      { type: 'agent_run', config: { agentId: 'agt1' } },
    ]);

    expect(results).toEqual([{ type: 'agent_run', status: 'error', note: 'prompt manquant' }]);
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });
});
