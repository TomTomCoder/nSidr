import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpService } from '@nestjs/axios';
import { GmailOAuthService } from './gmail-oauth.service';

// Hand-rolled prisma mock following the pattern from agent-conversation.service.spec.ts
const mockFindFirst = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

const mockPrismaService = {
  agentConnection: {
    findFirst: mockFindFirst,
    findUnique: mockFindUnique,
    update: mockUpdate,
    upsert: vi.fn(),
  },
} as any;

const mockHttpService = {} as HttpService;

// A valid encrypted token produced by the same encrypt/decrypt roundtrip
// We'll stub decryptToken via a real token so we can control the output
function makeEncryptedToken(service: GmailOAuthService, token: object): string {
  // Access private method via any cast — test-only
  return (service as any).encryptToken(token);
}

describe('GmailOAuthService.getValidToken', () => {
  let service: GmailOAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENCRYPTION_KEY = '0'.repeat(64); // 32 bytes hex
    service = new GmailOAuthService(mockHttpService, mockPrismaService);
  });

  it('Test 1: returns user-scoped token when user row exists', async () => {
    const userToken = {
      access_token: 'user-access-token',
      expires_in: 3600,
      token_type: 'Bearer',
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
    };
    const encrypted = makeEncryptedToken(service, userToken);

    mockFindFirst.mockResolvedValue({ encryptedToken: encrypted });
    mockFindUnique.mockResolvedValue(null);

    const result = await service.getValidToken('agent-1', 'user-1');

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { agentId: 'agent-1', provider: 'gmail', userId: 'user-1' },
    });
    expect(result.access_token).toBe('user-access-token');
    // Agent-level lookup should NOT be called when user-scoped row found
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('Test 2: falls back to agent-level token when no user-scoped row exists', async () => {
    const agentToken = {
      access_token: 'agent-access-token',
      expires_in: 3600,
      token_type: 'Bearer',
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
    const encrypted = makeEncryptedToken(service, agentToken);

    mockFindFirst.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue({ encryptedToken: encrypted });

    const result = await service.getValidToken('agent-1', 'user-1');

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { agentId: 'agent-1', provider: 'gmail', userId: 'user-1' },
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { agentId_provider: { agentId: 'agent-1', provider: 'gmail' } },
    });
    expect(result.access_token).toBe('agent-access-token');
  });

  it('Test 3: no userId arg behaves as legacy agent-level lookup only', async () => {
    const agentToken = {
      access_token: 'legacy-agent-token',
      expires_in: 3600,
      token_type: 'Bearer',
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
    const encrypted = makeEncryptedToken(service, agentToken);

    mockFindUnique.mockResolvedValue({ encryptedToken: encrypted });

    const result = await service.getValidToken('agent-1');

    // findFirst should not be called when userId is absent
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { agentId_provider: { agentId: 'agent-1', provider: 'gmail' } },
    });
    expect(result.access_token).toBe('legacy-agent-token');
  });

  it('Test 4: throws when neither user-scoped nor agent-level token exists', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue(null);

    await expect(service.getValidToken('agent-1', 'user-1')).rejects.toThrow(
      'No Gmail connection found for agent agent-1'
    );
  });
});
