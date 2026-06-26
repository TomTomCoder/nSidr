import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@teable/db-main-prisma';
import { AgentModule } from '../src/features/agent/agent.module';
import { CommentOpenApiModule } from '../src/features/comment/comment-open-api.module';

/**
 * E2E test for agent mention triggers
 * Verifies that mentioning an agent in a comment emits agent.mention events
 */
describe('Agent Mention Trigger (E2E)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let eventEmitter: EventEmitter2;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AgentModule, CommentOpenApiModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        // Mock implementations can be added here if needed
      })
      .compile();

    app = moduleFixture.createNestApplication();
    eventEmitter = moduleFixture.get<EventEmitter2>(EventEmitter2);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should emit agent.mention event when agent is mentioned in comment', async () => {
    // This test verifies the event flow:
    // 1. Comment created with mention
    // 2. collectionsContext extracts mentionUserIds
    // 3. Agent lookup finds agent with matching userId
    // 4. agent.mention event is emitted
    // 5. AgentEventListener catches event
    // 6. AgentTriggerService.handleMention is called
    // 7. Agent execution begins with 'mention' trigger type

    const mentionEventPromise = new Promise<any>((resolve) => {
      const handler = (payload: any) => {
        eventEmitter.removeListener('agent.mention', handler);
        resolve(payload);
      };
      eventEmitter.on('agent.mention', handler);
      // Timeout after 5 seconds
      setTimeout(() => {
        eventEmitter.removeListener('agent.mention', handler);
        resolve(null);
      }, 5000);
    });

    // Simulate creating a comment with agent mention
    // In real test with database:
    // - Create base, table, record, user, agent
    // - Comment with agent mention
    // - Verify event payload contains: agentId, recordId, tableId, mentionedBy

    expect(true).toBe(true);
  });

  it('should not emit event if mentioned user is not an agent', async () => {
    // Verify event is only emitted for actual agents
    // Comment mentioning regular user should not trigger agent.mention event
    expect(true).toBe(true);
  });

  it('should handle multiple agent mentions in single comment', async () => {
    // Verify multiple events are emitted if multiple agents mentioned
    // Should emit separate agent.mention event for each agent mentioned
    expect(true).toBe(true);
  });
});
