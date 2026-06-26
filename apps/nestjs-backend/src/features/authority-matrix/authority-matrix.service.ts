import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  spaceActions,
  baseActions,
  tableActions,
  viewActions,
  fieldActions,
  recordActions,
  automationActions,
  appActions,
  userActions,
  tableRecordHistoryActions,
  instanceActions,
  enterpriseActions,
  generateAuthorityMatrixId,
  generateAuthorityMatrixRoleId,
} from '@teable/core';
import type { Action } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import type {
  ICreateAuthorityMatrixRo,
  IUpdateAuthorityMatrixRo,
  ICreateAuthorityMatrixRoleRo,
  IUpdateAuthorityMatrixRoleRo,
  IAuthorityMatrixVo,
  IAuthorityMatrixRoleVo,
} from '@teable/openapi';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';

const ALL_ACTIONS: readonly string[] = [
  ...spaceActions,
  ...baseActions,
  ...tableActions,
  ...viewActions,
  ...fieldActions,
  ...recordActions,
  ...automationActions,
  ...appActions,
  ...userActions,
  ...tableRecordHistoryActions,
  ...instanceActions,
  ...enterpriseActions,
];

@Injectable()
export class AuthorityMatrixService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cls: ClsService<IClsStore>
  ) {}

  private getUserId(): string {
    return this.cls.get('user.id');
  }

  private validateActions(actions: string[]): void {
    const valid = new Set(ALL_ACTIONS);
    const bad = actions.filter((a) => !valid.has(a));
    if (bad.length > 0) {
      throw new BadRequestException(`Invalid action values: ${bad.join(', ')}`);
    }
  }

  private async assertMatrixInBase(baseId: string, matrixId: string): Promise<void> {
    const existing = await this.prismaService.txClient().authorityMatrix.findFirst({
      where: { id: matrixId, baseId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`AuthorityMatrix ${matrixId} not found in base ${baseId}`);
    }
  }

  private async assertRoleInMatrix(matrixId: string, roleId: string): Promise<void> {
    const existing = await this.prismaService.txClient().authorityMatrixRole.findFirst({
      where: { id: roleId, authorityMatrixId: matrixId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Role ${roleId} not found in matrix ${matrixId}`);
    }
  }

  async list(baseId: string): Promise<{ list: IAuthorityMatrixVo[] }> {
    const rows = await this.prismaService.txClient().authorityMatrix.findMany({
      where: { baseId },
      include: { roles: true },
      orderBy: { createdTime: 'asc' },
    });
    return { list: rows.map((r) => this.toMatrixVo(r)) };
  }

  async get(baseId: string, matrixId: string): Promise<IAuthorityMatrixVo> {
    const row = await this.prismaService.txClient().authorityMatrix.findFirst({
      where: { id: matrixId, baseId },
      include: { roles: true },
    });
    if (!row) {
      throw new NotFoundException(`AuthorityMatrix ${matrixId} not found in base ${baseId}`);
    }
    return this.toMatrixVo(row);
  }

  async create(baseId: string, ro: ICreateAuthorityMatrixRo): Promise<IAuthorityMatrixVo> {
    const userId = this.getUserId();
    const id = generateAuthorityMatrixId();
    const row = await this.prismaService.txClient().authorityMatrix.create({
      data: {
        id,
        baseId,
        name: ro.name,
        description: ro.description,
        createdBy: userId,
      },
      include: { roles: true },
    });
    return this.toMatrixVo(row);
  }

  async update(
    baseId: string,
    matrixId: string,
    ro: IUpdateAuthorityMatrixRo
  ): Promise<IAuthorityMatrixVo> {
    await this.assertMatrixInBase(baseId, matrixId);
    const userId = this.getUserId();
    const row = await this.prismaService.txClient().authorityMatrix.update({
      where: { id: matrixId },
      data: { ...ro, lastModifiedBy: userId },
      include: { roles: true },
    });
    return this.toMatrixVo(row);
  }

  async delete(baseId: string, matrixId: string): Promise<void> {
    await this.assertMatrixInBase(baseId, matrixId);
    await this.prismaService.txClient().authorityMatrix.delete({ where: { id: matrixId } });
    // roles cascade-deleted by FK
  }

  async createRole(
    baseId: string,
    matrixId: string,
    ro: ICreateAuthorityMatrixRoleRo
  ): Promise<IAuthorityMatrixRoleVo> {
    await this.assertMatrixInBase(baseId, matrixId);
    const actions = ro.actions ?? [];
    this.validateActions(actions);
    const userId = this.getUserId();
    const id = generateAuthorityMatrixRoleId();
    const row = await this.prismaService.txClient().authorityMatrixRole.create({
      data: {
        id,
        authorityMatrixId: matrixId,
        name: ro.name,
        actions: actions,
        createdBy: userId,
      },
    });
    return this.toRoleVo(row);
  }

  async updateRole(
    baseId: string,
    matrixId: string,
    roleId: string,
    ro: IUpdateAuthorityMatrixRoleRo
  ): Promise<IAuthorityMatrixRoleVo> {
    await this.assertMatrixInBase(baseId, matrixId);
    await this.assertRoleInMatrix(matrixId, roleId);
    if (ro.actions) this.validateActions(ro.actions);
    const userId = this.getUserId();
    const row = await this.prismaService.txClient().authorityMatrixRole.update({
      where: { id: roleId },
      data: {
        ...(ro.name !== undefined && { name: ro.name }),
        ...(ro.actions !== undefined && { actions: ro.actions }),
        lastModifiedBy: userId,
      },
    });
    return this.toRoleVo(row);
  }

  async deleteRole(baseId: string, matrixId: string, roleId: string): Promise<void> {
    await this.assertMatrixInBase(baseId, matrixId);
    await this.assertRoleInMatrix(matrixId, roleId);
    await this.prismaService.txClient().authorityMatrixRole.delete({ where: { id: roleId } });
  }

  // Integration point for field-delete: returns roles referencing a given field.
  // Phase 01 stub — actions store enum values, not field refs. Returns [] until
  // field-level restrictions are implemented (deferred per CONTEXT.md).
  async getByFieldReference(_fieldId: string): Promise<IAuthorityMatrixRoleVo[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toMatrixVo(row: any): IAuthorityMatrixVo {
    return {
      id: row.id,
      baseId: row.baseId,
      name: row.name,
      description: row.description ?? undefined,
      createdTime: row.createdTime.toISOString(),
      createdBy: row.createdBy,
      roles: (row.roles ?? []).map((r: any) => this.toRoleVo(r)), // eslint-disable-line @typescript-eslint/no-explicit-any
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toRoleVo(row: any): IAuthorityMatrixRoleVo {
    return {
      id: row.id,
      authorityMatrixId: row.authorityMatrixId,
      name: row.name,
      actions: Array.isArray(row.actions) ? (row.actions as string[]) : [],
      createdTime: row.createdTime.toISOString(),
      createdBy: row.createdBy,
    };
  }
}
