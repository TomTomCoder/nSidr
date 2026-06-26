import { Injectable } from '@nestjs/common';
import { PrismaService } from '@teable/db-main-prisma';
import { randomUUID } from 'crypto';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';
import { PermissionService } from '../auth/permission.service';

export type FieldAction = 'field|read' | 'field|update';

export interface FieldPermissionRow {
  id: string;
  fieldId: string;
  principal: string; // 'role:<role>' | 'user:<userId>'
  action: FieldAction;
  allowed: boolean;
}

/**
 * Field-level permission overrides. Deny-list semantics: a row with
 * allowed=false explicitly denies the action for that principal even if
 * the table-level grant would allow it. Absence of a row = inherit
 * table-level (no opinion).
 */
@Injectable()
export class FieldPermissionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly cls: ClsService<IClsStore>
  ) {}

  async check(fieldId: string, action: FieldAction, baseId: string): Promise<boolean> {
    const overrides = await this.prismaService.fieldPermission.findMany({
      where: { fieldId, action },
      select: { principal: true, allowed: true },
    });
    if (overrides.length === 0) return true;

    const role = await this.permissionService.getEffectiveBaseRole(baseId);
    const userId = this.cls.get('user')?.id;

    const principals = new Set<string>();
    if (role) principals.add(`role:${role}`);
    if (userId) principals.add(`user:${userId}`);

    // Explicit deny wins
    for (const o of overrides) {
      if (principals.has(o.principal) && o.allowed === false) return false;
    }
    return true;
  }

  async list(fieldId: string): Promise<FieldPermissionRow[]> {
    const rows = await this.prismaService.fieldPermission.findMany({ where: { fieldId } });
    return rows.map((r) => ({
      id: r.id,
      fieldId: r.fieldId,
      principal: r.principal,
      action: r.action as FieldAction,
      allowed: r.allowed,
    }));
  }

  async set(
    fieldId: string,
    principal: string,
    action: FieldAction,
    allowed: boolean,
    createdBy: string
  ): Promise<FieldPermissionRow> {
    const row = await this.prismaService.fieldPermission.upsert({
      where: { fieldId_principal_action: { fieldId, principal, action } },
      update: { allowed },
      create: { id: randomUUID(), fieldId, principal, action, allowed, createdBy },
    });
    return {
      id: row.id,
      fieldId: row.fieldId,
      principal: row.principal,
      action: row.action as FieldAction,
      allowed: row.allowed,
    };
  }

  async remove(id: string): Promise<void> {
    await this.prismaService.fieldPermission.delete({ where: { id } }).catch(() => undefined);
  }
}
