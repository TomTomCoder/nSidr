import type { ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@teable/db-main-prisma';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';
import { PermissionService } from '../auth/permission.service';
import { PermissionGuard } from '../auth/guard/permission.guard';

/**
 * Extends PermissionGuard to resolve the base-scoped permission for AgentController routes.
 *
 * Routes in AgentController only carry an `:id` param (agentId), not a `:baseId`.
 * This guard looks up the agent record to find its `baseId`, then threads that into
 * the parent guard's permission check — mirroring BaseNodePermissionGuard's pattern.
 *
 * For routes without an `:id` param (e.g. `GET /` list which receives `baseId` via query
 * or `oauth/callback` which carries agentId in the state string) the guard falls back to
 * `super.getResourceId(context)` / `defaultResourceId(context)` which reads `req.params.baseId`.
 */
@Injectable()
export class AgentPermissionGuard extends PermissionGuard {
  constructor(
    private readonly reflectorInner: Reflector,
    private readonly clsInner: ClsService<IClsStore>,
    private readonly permissionServiceInner: PermissionService,
    private readonly prismaService: PrismaService
  ) {
    super(reflectorInner, clsInner, permissionServiceInner);
  }

  /**
   * Returns the cached baseId resolved from the agent record (set during canActivate),
   * or falls back to the parent's resource-id resolution (query param, path param baseId, etc.)
   */
  protected override getResourceId(context: ExecutionContext): string | undefined {
    const req = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (
      (req as any)._resolvedBaseId ??
      (req.query?.baseId as string | undefined) ??
      super.getResourceId(context) ??
      this.defaultResourceId(context)
    );
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const agentId: string | undefined = req.params?.id;

    // Resolve baseId from the agent record and cache on the request object so that
    // getResourceId() can return it synchronously (parent class calls getResourceId sync).
    if (agentId) {
      const agent = await this.prismaService.agent.findUnique({
        where: { id: agentId },
        select: { baseId: true },
      });
      if (agent?.baseId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any)._resolvedBaseId = agent.baseId;
      }
    }

    return super.canActivate(context);
  }
}
