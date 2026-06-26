import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@teable/db-main-prisma';
import { AgentService } from '../src/features/agent/agent.service';
import { AgentToolRegistryService } from '../src/features/agent/agent-tool-registry.service';
import { AgentMemoryService } from '../src/features/agent/agent-memory.service';
import { AgentModule } from '../src/features/agent/agent.module';

describe('AgentService (e2e)', () => {
  let module: TestingModule;
  let agentService: AgentService;
  let toolRegistry: AgentToolRegistryService;
  let memoryService: AgentMemoryService;
  let prisma: PrismaService;

  let agentId: string;
  const baseId = globalThis.testConfig?.baseId || 'test-base-123';
  const userId = 'test-user-123';

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AgentModule],
    }).compile();

    agentService = module.get(AgentService);
    toolRegistry = module.get(AgentToolRegistryService);
    memoryService = module.get(AgentMemoryService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('AgentService should be defined', () => {
    expect(agentService).toBeDefined();
  });

  it('should get all built-in tools', async () => {
    const tools = await toolRegistry.getBuiltInTools();
    expect(tools).toHaveLength(5);
    expect(tools.map((t) => t.function.name)).toEqual([
      'search_records',
      'get_records',
      'get_record',
      'create_comment',
      'get_record_activity',
    ]);
  });

  it('should create an agent', async () => {
    const agent = await agentService.create(
      {
        name: 'E2E Test Agent',
        instructions: 'You are a helpful assistant.',
        baseId,
      },
      userId
    );

    expect(agent).toHaveProperty('id');
    expect(agent.name).toBe('E2E Test Agent');
    expect(agent.baseId).toBe(baseId);
    expect(agent.createdBy).toBe(userId);

    agentId = agent.id;
  });

  it('should retrieve the agent by ID', async () => {
    const agent = await agentService.findOne(agentId);
    expect(agent).toBeDefined();
    expect(agent.id).toBe(agentId);
    expect(agent.name).toBe('E2E Test Agent');
  });

  it('should list agents for a base', async () => {
    const agents = await agentService.findAll(baseId);
    expect(Array.isArray(agents)).toBe(true);
    const found = agents.find((a) => a.id === agentId);
    expect(found).toBeDefined();
  });

  it('should update the agent', async () => {
    const updated = await agentService.update(
      agentId,
      {
        name: 'E2E Test Agent Updated',
        instructions: 'Updated instructions',
      },
      userId
    );

    expect(updated.name).toBe('E2E Test Agent Updated');
    expect(updated.instructions).toBe('Updated instructions');
  });

  it('should save and retrieve agent memory', async () => {
    await memoryService.saveRecent(agentId, 'Test memory context');
    const memories = await memoryService.getRecent(agentId);
    expect(memories).toContain('Test memory context');
  });

  it('should get tools for agent', async () => {
    const tools = await toolRegistry.getToolsForAgent(agentId);
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  it('should delete the agent', async () => {
    const result = await agentService.remove(agentId);
    expect(result).toBeDefined();
  });

  it('should return null or inactive after deletion', async () => {
    const agent = await agentService.findOne(agentId);
    // Either hard deleted (null) or soft deleted (isActive: false)
    expect(agent === null || agent.isActive === false).toBe(true);
  });
});
