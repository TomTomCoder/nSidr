/* eslint-disable sonarjs/no-duplicate-string */
import { Injectable } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  generatePluginId,
  generatePluginUserId,
  getPluginEmail,
  nullsToUndefined,
  HttpErrorCode,
} from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import { UploadType, PluginStatus } from '@teable/openapi';
import type {
  IGetPluginCenterListVo,
  ICreatePluginRo,
  ICreatePluginVo,
  IGetPluginsVo,
  IGetPluginVo,
  IPluginI18n,
  IPluginRegenerateSecretVo,
  IUpdatePluginRo,
  IUpdatePluginVo,
  PluginPosition,
  IPluginConfig,
} from '@teable/openapi';
import { omit } from 'lodash';
import { ClsService } from 'nestjs-cls';
import { CustomHttpException } from '../../custom.exception';
import type { IClsStore } from '../../types/cls';
import StorageAdapter from '../attachments/plugins/adapter';
import { getPublicFullStorageUrl } from '../attachments/plugins/utils';
import { SsrfGuardService } from '../external-connection/ssrf-guard.service';
import { UserService } from '../user/user.service';
import { generateSecret } from './utils';

/** Whitelisted shape of a single MCP tool entry (T-19-02). */
interface ManifestTool {
  name: string;
  description?: string;
  inputSchema: { type: string; properties?: Record<string, unknown>; required?: string[] };
}

@Injectable()
export class PluginService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cls: ClsService<IClsStore>,
    private readonly userService: UserService,
    private readonly ssrfGuardService: SsrfGuardService
  ) {}

  private logoToVoValue(logo: string) {
    return getPublicFullStorageUrl(logo);
  }

  private convertToVo<
    T extends {
      positions: string;
      i18n?: string | null;
      status: string;
      config?: string | null;
      logo: string;
      createdTime?: Date | null;
      lastModifiedTime?: Date | null;
    },
  >(ro: T) {
    return nullsToUndefined({
      ...ro,
      logo: this.logoToVoValue(ro.logo),
      status: ro.status as PluginStatus,
      positions: JSON.parse(ro.positions) as PluginPosition[],
      i18n: ro.i18n ? (JSON.parse(ro.i18n) as IPluginI18n) : undefined,
      config: ro.config ? (JSON.parse(ro.config) as IPluginConfig) : undefined,
      createdTime: ro.createdTime?.toISOString(),
      lastModifiedTime: ro.lastModifiedTime?.toISOString(),
    });
  }

  private async getUserMap(userIds: string[]) {
    const users = await this.prismaService.txClient().user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
    });
    const systemUser = userIds.find((id) => id === 'system')
      ? {
          id: 'system',
          name: 'Teable',
          email: 'support@teable.ai',
          avatar: undefined,
        }
      : undefined;

    const userMap = users.reduce(
      (acc, user) => {
        if (user.id === 'system') {
          acc[user.id] = {
            id: user.id,
            name: 'Teable',
            email: 'support@teable.ai',
            avatar: undefined,
          };
          return acc;
        }
        acc[user.id] = {
          ...user,
          avatar: user.avatar ? getPublicFullStorageUrl(user.avatar) : undefined,
        };
        return acc;
      },
      {} as Record<string, { id: string; name: string; email: string; avatar?: string }>
    );

    return systemUser
      ? {
          ...userMap,
          system: systemUser,
        }
      : userMap;
  }

  async createPlugin(createPluginRo: ICreatePluginRo): Promise<ICreatePluginVo> {
    const userId = this.cls.get('user.id');
    const {
      name,
      description,
      detailDesc,
      helpUrl,
      logo,
      i18n,
      positions,
      url,
      autoCreateMember,
      config,
    } = createPluginRo;
    const { secret, hashedSecret, maskedSecret } = await generateSecret();
    const res = await this.prismaService.$tx(async (prisma) => {
      const pluginId = generatePluginId();
      const user = autoCreateMember
        ? await this.userService.createSystemUser({
            id: generatePluginUserId(),
            name,
            email: getPluginEmail(pluginId),
          })
        : null;
      const plugin = await prisma.plugin.create({
        select: {
          id: true,
          name: true,
          description: true,
          detailDesc: true,
          positions: true,
          helpUrl: true,
          logo: true,
          url: true,
          status: true,
          config: true,
          i18n: true,
          secret: true,
          mcpUrl: true,
          toolManifest: true,
          createdTime: true,
        },
        data: {
          id: pluginId,
          name,
          description,
          detailDesc,
          positions: JSON.stringify(positions),
          helpUrl,
          url,
          logo,
          config: JSON.stringify(config),
          status: PluginStatus.Developing,
          i18n: JSON.stringify(i18n),
          secret: hashedSecret,
          maskedSecret,
          pluginUser: user?.id,
          createdBy: userId,
        },
      });
      return {
        ...plugin,
        secret,
        pluginUser: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              avatar: user.avatar ? getPublicFullStorageUrl(user.avatar) : undefined,
            }
          : undefined,
      };
    });
    return this.convertToVo(res);
  }

  async updatePlugin(id: string, updatePluginRo: IUpdatePluginRo): Promise<IUpdatePluginVo> {
    const userId = this.cls.get('user.id');
    const isAdmin = this.cls.get('user.isAdmin');
    const { name, description, detailDesc, helpUrl, i18n, positions, url, config, logo } =
      updatePluginRo;
    const logoPath = logo?.startsWith('http')
      ? `/${StorageAdapter.getDir(UploadType.Plugin)}/${logo.split('/').pop()}`
      : logo;
    const res = await this.prismaService.$tx(async (prisma) => {
      const res = await prisma.plugin
        .update({
          select: {
            id: true,
            name: true,
            description: true,
            detailDesc: true,
            positions: true,
            helpUrl: true,
            logo: true,
            url: true,
            config: true,
            status: true,
            i18n: true,
            secret: true,
            mcpUrl: true,
            toolManifest: true,
            pluginUser: true,
            createdTime: true,
            lastModifiedTime: true,
          },
          where: { id, createdBy: isAdmin ? { in: ['system', userId] } : userId },
          data: {
            name,
            description,
            detailDesc,
            positions: JSON.stringify(positions),
            helpUrl,
            url,
            logo: logoPath,
            config: JSON.stringify(config),
            i18n: JSON.stringify(i18n),
            lastModifiedBy: userId,
          },
        })
        .catch(() => {
          throw new CustomHttpException('Plugin not found', HttpErrorCode.NOT_FOUND, {
            localization: {
              i18nKey: 'httpErrors.plugin.notFound',
            },
          });
        });

      if (name && res.pluginUser) {
        await this.userService.updateUserName(res.pluginUser, name);
      }
      return res;
    });
    const userMap = res.pluginUser ? await this.getUserMap([res.pluginUser]) : {};
    return this.convertToVo({
      ...res,
      pluginUser: res.pluginUser ? userMap[res.pluginUser] : undefined,
    });
  }

  async getPlugin(id: string): Promise<IGetPluginVo> {
    const userId = this.cls.get('user.id');
    const isAdmin = this.cls.get('user.isAdmin');
    const res = await this.prismaService.plugin
      .findUniqueOrThrow({
        select: {
          id: true,
          name: true,
          description: true,
          detailDesc: true,
          positions: true,
          helpUrl: true,
          logo: true,
          url: true,
          status: true,
          config: true,
          i18n: true,
          maskedSecret: true,
          mcpUrl: true,
          toolManifest: true,
          pluginUser: true,
          createdTime: true,
          lastModifiedTime: true,
        },
        where: { id, createdBy: isAdmin ? { in: ['system', userId] } : userId },
      })
      .catch(() => {
        throw new CustomHttpException('Plugin not found', HttpErrorCode.NOT_FOUND, {
          localization: {
            i18nKey: 'httpErrors.plugin.notFound',
          },
        });
      });
    const userMap = res.pluginUser ? await this.getUserMap([res.pluginUser]) : {};
    return this.convertToVo({
      ...omit(res, 'maskedSecret'),
      secret: res.maskedSecret,
      pluginUser: res.pluginUser ? userMap[res.pluginUser] : undefined,
    });
  }

  async getPlugins(): Promise<IGetPluginsVo> {
    const userId = this.cls.get('user.id');
    const isAdmin = this.cls.get('user.isAdmin');

    const res = await this.prismaService.plugin.findMany({
      where: { createdBy: isAdmin ? { in: ['system', userId] } : userId },
      select: {
        id: true,
        name: true,
        description: true,
        detailDesc: true,
        positions: true,
        helpUrl: true,
        logo: true,
        url: true,
        status: true,
        i18n: true,
        secret: true,
        mcpUrl: true,
        toolManifest: true,
        pluginUser: true,
        createdTime: true,
        lastModifiedTime: true,
      },
    });
    const userIds = res.map((r) => r.pluginUser).filter((r) => r !== null) as string[];
    const userMap = await this.getUserMap(userIds);
    return res.map((r) =>
      this.convertToVo({
        ...r,
        pluginUser: r.pluginUser ? userMap[r.pluginUser] : undefined,
      })
    );
  }

  async delete(id: string) {
    await this.prismaService.$tx(async (prisma) => {
      const res = await prisma.plugin.delete({ where: { id } });
      if (res.pluginUser) {
        await prisma.user.delete({ where: { id: res.pluginUser } });
      }
    });
  }

  async regenerateSecret(id: string): Promise<IPluginRegenerateSecretVo> {
    const { secret, hashedSecret, maskedSecret } = await generateSecret();
    await this.prismaService.plugin.update({
      select: {
        id: true,
        secret: true,
      },
      where: { id },
      data: {
        secret: hashedSecret,
        maskedSecret,
      },
    });
    return { secret, id };
  }

  async getPluginCenterList(
    positions?: PluginPosition[],
    ids?: string[]
  ): Promise<IGetPluginCenterListVo> {
    const res = await this.prismaService.plugin.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        detailDesc: true,
        logo: true,
        status: true,
        url: true,
        helpUrl: true,
        i18n: true,
        createdTime: true,
        lastModifiedTime: true,
        createdBy: true,
      },
      where: {
        ...(ids?.length
          ? {
              id: { in: ids },
            }
          : {}),
        AND: [
          {
            OR: [
              {
                status: PluginStatus.Published,
              },
              {
                status: { not: PluginStatus.Published },
                createdBy: this.cls.get('user.id'),
              },
            ],
          },
          ...(positions?.length
            ? [
                {
                  OR: positions.map((position) => ({ positions: { contains: position } })),
                },
              ]
            : []),
        ],
      },
    });
    const userIds = res.map((r) => r.createdBy);
    const userMap = await this.getUserMap(userIds);
    return res.map((r) =>
      nullsToUndefined({
        ...r,
        status: r.status as PluginStatus,
        logo: this.logoToVoValue(r.logo),
        i18n: r.i18n ? (JSON.parse(r.i18n) as IPluginI18n) : undefined,
        createdBy: userMap[r.createdBy],
        createdTime: r.createdTime?.toISOString(),
        lastModifiedTime: r.lastModifiedTime?.toISOString(),
      })
    );
  }

  async submitPlugin(id: string) {
    const userId = this.cls.get('user.id');
    await this.prismaService.plugin.update({
      where: { id, createdBy: userId },
      data: { status: PluginStatus.Reviewing },
    });
  }

  async unpublishPlugin(id: string) {
    await this.prismaService.plugin.update({
      where: { id, status: PluginStatus.Published },
      data: { status: PluginStatus.Developing },
    });
  }

  /**
   * Install a third-party MCP extension by URL (EXT-02).
   *
   * 1. SSRF-guards the host (T-19-01).
   * 2. Fetches the MCP manifest via tools/list.
   * 3. Whitelists tool fields — drops unknown keys (T-19-02).
   * 4. Creates Plugin (isExtension=true, consentedAt=null) + PluginInstall for the space.
   *
   * @param spaceId - The space to install the extension into.
   * @param mcpUrl  - The MCP server endpoint URL (user-supplied; SSRF-guarded).
   */
  async installByUrl(
    spaceId: string,
    mcpUrl: string
  ): Promise<{ id: string; name: string; requestedScopes: string[] }> {
    const installedBy = this.cls.get('user.id');
    // Step 1 — SSRF guard (T-19-01): block private/loopback/cloud-metadata hosts.
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(mcpUrl);
    } catch {
      throw new CustomHttpException(`Invalid MCP URL: ${mcpUrl}`, HttpErrorCode.VALIDATION_ERROR);
    }
    await this.ssrfGuardService.assertHostAllowed(parsedUrl.hostname);

    // Step 2 — Fetch MCP manifest (tools/list).
    const manifest = await this.fetchMcpManifest(mcpUrl);

    // Step 3 — Register Plugin + PluginInstall in a single transaction.
    const { secret, hashedSecret, maskedSecret } = await generateSecret();
    const pluginId = generatePluginId();

    const plugin = await this.prismaService.$tx(async (prisma) => {
      const record = await prisma.plugin.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: {
          id: pluginId,
          name: new URL(mcpUrl).hostname,
          logo: '',
          status: PluginStatus.Published,
          positions: '[]',
          secret: hashedSecret,
          maskedSecret,
          mcpUrl,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          toolManifest: manifest.tools as any,
          isExtension: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          requestedScopes: manifest.tools.map((t) => t.name) as any,
          consentedAt: null,
          createdBy: installedBy,
        } as Parameters<typeof prisma.plugin.create>[0]['data'],
      });

      await prisma.pluginInstall.create({
        data: {
          pluginId: record.id,
          baseId: spaceId,
          name: record.name,
          positionId: spaceId,
          position: 'extension',
          createdBy: installedBy,
        },
      });

      return record;
    });

    return {
      id: plugin.id,
      name: plugin.name,
      requestedScopes: Array.isArray(plugin.requestedScopes)
        ? (plugin.requestedScopes as string[])
        : [],
    };
  }

  /**
   * Fetch the MCP manifest from the given server URL using the official MCP SDK.
   * The SDK handles the full initialize → initialized → tools/list handshake, which
   * is required by Streamable HTTP servers (e.g. context7) that reject plain JSON-RPC
   * calls sent without prior initialization (HTTP 400).
   *
   * Whitelists only known fields per T-19-02 (prototype pollution mitigation).
   */
  private async fetchMcpManifest(mcpUrl: string): Promise<{ tools: ManifestTool[] }> {
    let client: Client | null = null;
    try {
      const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
      client = new Client({ name: 'teable-install', version: '1.0.0' }, { capabilities: {} });

      await Promise.race([
        client.connect(transport),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout connecting to MCP server')), 8000)
        ),
      ]);

      const { tools: rawTools } = await client.listTools();

      // T-19-02: whitelist known fields only; discard everything else.
      const tools = (rawTools ?? [])
        .map((t) => ({
          name: String(t.name ?? ''),
          description: t.description ? String(t.description) : undefined,
          inputSchema:
            t.inputSchema && typeof t.inputSchema === 'object'
              ? (t.inputSchema as ManifestTool['inputSchema'])
              : { type: 'object', properties: {} },
        }))
        .filter((t) => t.name);

      return { tools };
    } catch (e) {
      throw new CustomHttpException(
        `Cannot reach MCP server at ${mcpUrl}: ${(e as Error).message}`,
        HttpErrorCode.VALIDATION_ERROR
      );
    } finally {
      await client?.close().catch(() => undefined);
    }
  }

  async consentExtension(pluginId: string): Promise<void> {
    const plugin = await this.prismaService.plugin
      .findUniqueOrThrow({ where: { id: pluginId } })
      .catch(() => {
        throw new CustomHttpException('Plugin not found', HttpErrorCode.NOT_FOUND, {
          localization: { i18nKey: 'httpErrors.plugin.notFound' },
        });
      });
    if (!plugin.isExtension) {
      throw new CustomHttpException('Not an extension plugin', HttpErrorCode.VALIDATION_ERROR);
    }
    await this.prismaService.plugin.update({
      where: { id: pluginId },
      data: { consentedAt: new Date() },
    });
  }

  async revokeConsent(pluginId: string): Promise<void> {
    await this.prismaService.plugin.updateMany({
      where: { id: pluginId, isExtension: true },
      data: { consentedAt: null },
    });
  }

  /**
   * Return all extension-type plugins installed for a given space (EXT-02).
   * Used by GET /api/plugin/extensions?spaceId=... to populate the registry UI.
   */
  async getExtensionsForSpace(spaceId: string): Promise<
    Array<{
      id: string;
      name: string;
      mcpUrl: string | null;
      requestedScopes: string[];
      consentedAt: string | null;
    }>
  > {
    const rows = await this.prismaService.plugin.findMany({
      where: {
        isExtension: true,
        pluginInstall: {
          some: { baseId: spaceId },
        },
      },
      select: {
        id: true,
        name: true,
        mcpUrl: true,
        requestedScopes: true,
        consentedAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      mcpUrl: r.mcpUrl ?? null,
      requestedScopes: Array.isArray(r.requestedScopes) ? (r.requestedScopes as string[]) : [],
      consentedAt: r.consentedAt ? r.consentedAt.toISOString() : null,
    }));
  }
}
