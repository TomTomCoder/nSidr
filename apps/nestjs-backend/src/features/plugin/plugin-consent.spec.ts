import { HttpErrorCode } from '@teable/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PluginService } from './plugin.service';

// ── Isolated unit tests for consentExtension + revokeConsent ─────────────────

describe('PluginService — consent flow (unit)', () => {
  let service: PluginService;

  const mockPrismaPlugin = {
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  };

  const mockPrismaService = {
    plugin: mockPrismaPlugin,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Construct the service with minimal deps — consent methods only need prismaService
    service = new PluginService(
      mockPrismaService as unknown as ConstructorParameters<typeof PluginService>[0],
      null as unknown as ConstructorParameters<typeof PluginService>[1],
      null as unknown as ConstructorParameters<typeof PluginService>[2],
      null as unknown as ConstructorParameters<typeof PluginService>[3]
    );
  });

  it('consentExtension: sets consentedAt to a Date for a valid extension plugin', async () => {
    const pluginId = 'plugin-ext-001';
    mockPrismaPlugin.findUniqueOrThrow.mockResolvedValueOnce({
      id: pluginId,
      isExtension: true,
    });
    mockPrismaPlugin.update.mockResolvedValueOnce({ id: pluginId });

    await service.consentExtension(pluginId);

    expect(mockPrismaPlugin.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: pluginId },
        data: expect.objectContaining({ consentedAt: expect.any(Date) }),
      })
    );
  });

  it('consentExtension: throws VALIDATION_ERROR for a non-extension plugin', async () => {
    const pluginId = 'plugin-regular-001';
    mockPrismaPlugin.findUniqueOrThrow.mockResolvedValueOnce({
      id: pluginId,
      isExtension: false,
    });

    await expect(service.consentExtension(pluginId)).rejects.toMatchObject({
      message: 'Not an extension plugin',
    });

    expect(mockPrismaPlugin.update).not.toHaveBeenCalled();
  });

  it('revokeConsent: sets consentedAt back to null', async () => {
    const pluginId = 'plugin-ext-001';
    mockPrismaPlugin.updateMany.mockResolvedValueOnce({ count: 1 });

    await service.revokeConsent(pluginId);

    expect(mockPrismaPlugin.updateMany).toHaveBeenCalledWith({
      where: { id: pluginId, isExtension: true },
      data: { consentedAt: null },
    });
  });
});
