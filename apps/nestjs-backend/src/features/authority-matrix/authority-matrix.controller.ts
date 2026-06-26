import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  createAuthorityMatrixRoSchema,
  updateAuthorityMatrixRoSchema,
  createAuthorityMatrixRoleRoSchema,
  updateAuthorityMatrixRoleRoSchema,
  type ICreateAuthorityMatrixRo,
  type IUpdateAuthorityMatrixRo,
  type ICreateAuthorityMatrixRoleRo,
  type IUpdateAuthorityMatrixRoleRo,
} from '@teable/openapi';
import { ZodValidationPipe } from '../../zod.validation.pipe';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ResourceMeta } from '../auth/decorators/resource_meta.decorator';
import { AuthorityMatrixService } from './authority-matrix.service';

@Controller('api/base/')
export class AuthorityMatrixController {
  constructor(private readonly service: AuthorityMatrixService) {}

  @Get(':baseId/authority-matrix')
  @Permissions('base|authority_matrix_config')
  @ResourceMeta('baseId', 'params')
  async list(@Param('baseId') baseId: string) {
    return this.service.list(baseId);
  }

  @Get(':baseId/authority-matrix/:matrixId')
  @Permissions('base|authority_matrix_config')
  @ResourceMeta('baseId', 'params')
  async get(@Param('baseId') baseId: string, @Param('matrixId') matrixId: string) {
    return this.service.get(baseId, matrixId);
  }

  @Post(':baseId/authority-matrix')
  @Permissions('base|authority_matrix_config')
  @ResourceMeta('baseId', 'params')
  async create(
    @Param('baseId') baseId: string,
    @Body(new ZodValidationPipe(createAuthorityMatrixRoSchema)) ro: ICreateAuthorityMatrixRo
  ) {
    return this.service.create(baseId, ro);
  }

  @Patch(':baseId/authority-matrix/:matrixId')
  @Permissions('base|authority_matrix_config')
  @ResourceMeta('baseId', 'params')
  async update(
    @Param('baseId') baseId: string,
    @Param('matrixId') matrixId: string,
    @Body(new ZodValidationPipe(updateAuthorityMatrixRoSchema)) ro: IUpdateAuthorityMatrixRo
  ) {
    return this.service.update(baseId, matrixId, ro);
  }

  @Delete(':baseId/authority-matrix/:matrixId')
  @HttpCode(204)
  @Permissions('base|authority_matrix_config')
  @ResourceMeta('baseId', 'params')
  async delete(@Param('baseId') baseId: string, @Param('matrixId') matrixId: string) {
    await this.service.delete(baseId, matrixId);
  }

  @Post(':baseId/authority-matrix/:matrixId/role')
  @Permissions('base|authority_matrix_config')
  @ResourceMeta('baseId', 'params')
  async createRole(
    @Param('baseId') baseId: string,
    @Param('matrixId') matrixId: string,
    @Body(new ZodValidationPipe(createAuthorityMatrixRoleRoSchema)) ro: ICreateAuthorityMatrixRoleRo
  ) {
    return this.service.createRole(baseId, matrixId, ro);
  }

  @Patch(':baseId/authority-matrix/:matrixId/role/:roleId')
  @Permissions('base|authority_matrix_config')
  @ResourceMeta('baseId', 'params')
  async updateRole(
    @Param('baseId') baseId: string,
    @Param('matrixId') matrixId: string,
    @Param('roleId') roleId: string,
    @Body(new ZodValidationPipe(updateAuthorityMatrixRoleRoSchema)) ro: IUpdateAuthorityMatrixRoleRo
  ) {
    return this.service.updateRole(baseId, matrixId, roleId, ro);
  }

  @Delete(':baseId/authority-matrix/:matrixId/role/:roleId')
  @HttpCode(204)
  @Permissions('base|authority_matrix_config')
  @ResourceMeta('baseId', 'params')
  async deleteRole(
    @Param('baseId') baseId: string,
    @Param('matrixId') matrixId: string,
    @Param('roleId') roleId: string
  ) {
    await this.service.deleteRole(baseId, matrixId, roleId);
  }
}
